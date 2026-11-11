import { NextResponse } from "next/server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import {
  auditarItensBarema,
  CandidatoRankingInput,
  gerarRankingConsolidado,
} from "@/domain/banca/painel-banca";
import { projetarItemRankingPorFase } from "@/domain/recurso/homologacao-recurso";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const processoSeletivoId = url.searchParams.get("processoSeletivoId");
    const trilhaId = url.searchParams.get("trilhaId") || undefined;
    const statusClassificacao =
      url.searchParams.get("statusClassificacao") || undefined;
    const notaMinimaParam = url.searchParams.get("notaMinima");
    const notaMinima =
      notaMinimaParam && notaMinimaParam.trim() !== ""
        ? Number(notaMinimaParam)
        : undefined;

    if (!processoSeletivoId) {
      return NextResponse.json(
        { error: "O parâmetro processoSeletivoId é obrigatório." },
        { status: 400 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const candRepo = getCandidatoRepository();
    const subRepo = getSubmissaoRepository();

    const [inscricoes, submissoes] = await Promise.all([
      candRepo.buscarInscricoesPorProcesso(processoSeletivoId),
      subRepo.findAll({ processoSeletivoId }),
    ]);

    const submissoesPorInscricao = new Map<string, typeof submissoes>();
    for (const s of submissoes) {
      const lista = submissoesPorInscricao.get(s.inscricaoId) ?? [];
      lista.push(s);
      submissoesPorInscricao.set(s.inscricaoId, lista);
    }

    const entradasRanking: CandidatoRankingInput[] = inscricoes.map((insc) => {
      const subsCandidato = submissoesPorInscricao.get(insc.id) ?? [];
      const submissaoPrincipal = subsCandidato[0];

      const qtd = subsCandidato.length;
      const notaTecnicaTotal =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaTecnicaTotal, 0) /
                qtd
              ).toFixed(2)
            )
          : 0;
      const notaCorretude =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaCorretude, 0) / qtd
              ).toFixed(2)
            )
          : 0;
      const notaQualidade =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaQualidade, 0) / qtd
              ).toFixed(2)
            )
          : 0;
      const notaDesempenho =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaDesempenho, 0) /
                qtd
              ).toFixed(2)
            )
          : 0;
      const atendeNotaCorte =
        qtd > 0 ? notaTecnicaTotal >= processo.notaCorteMinima : false;
      const statusClassificacao =
        qtd === 0
          ? "SEM_SUBMISSAO"
          : atendeNotaCorte
          ? "CLASSIFICADO"
          : "DESCLASSIFICADO_NOTA_CORTE";

      // Se ainda não foi auditado, monta os itens para auditoria como PENDENTE
      const itensBaremaAuditados =
        insc.auditoriaBarema && insc.auditoriaBarema.length > 0
          ? insc.auditoriaBarema
          : auditarItensBarema(processo.barema, insc.itensBarema, [])
              .itensAuditados;

      return {
        inscricaoId: insc.id,
        codigoAnonimo: insc.codigoAnonimo,
        candidatoId: insc.candidatoId,
        candidatoNome: insc.candidatoNome,
        candidatoEmail: insc.candidatoEmail,
        candidatoCpf: insc.candidatoCpf,
        trilhaId: insc.trilhaId,
        trilhaNome: insc.trilhaNome,
        notaTecnicaTotal,
        notaCorretude,
        notaQualidade,
        notaDesempenho,
        atendeNotaCorte,
        statusClassificacao,
        pontuacaoProvisoriaBarema: insc.pontuacaoProvisoriaBarema,
        pontuacaoHomologadaBarema: insc.pontuacaoHomologadaBarema ?? null,
        statusAuditoriaBarema: insc.statusAuditoriaBarema ?? "PENDENTE",
        linguagem: submissaoPrincipal?.linguagem,
        codigoFonte: submissaoPrincipal?.codigoFonte,
        relatorioExecucao: submissaoPrincipal?.relatorioExecucao ?? null,
        submissoesDesafios: subsCandidato.map((s) => ({
          submissaoId: s.id,
          desafioId: s.desafioId,
          linguagem: s.linguagem,
          codigoFonte: s.codigoFonte,
          notaTecnicaTotal: s.notaTecnicaTotal,
          notaCorretude: s.notaCorretude,
          notaQualidade: s.notaQualidade,
          notaDesempenho: s.notaDesempenho,
          atendeNotaCorte: s.atendeNotaCorte,
          statusClassificacao: s.statusClassificacao,
          relatorioExecucao: s.relatorioExecucao ?? null,
        })),
        itensBaremaAuditados,
      };
    });

    const rankingConsolidado = gerarRankingConsolidado(
      entradasRanking,
      {
        pesoProvaTecnica: processo.pesoProvaTecnica,
        pesoBaremaCurricular: processo.pesoBaremaCurricular,
      },
      {
        trilhaId,
        statusClassificacao,
        notaMinima,
      }
    );

    const etapaAnonimaEncerrada = Boolean(processo.etapaAnonimaEncerrada);
    const rankingProjetado = rankingConsolidado.map((item) =>
      projetarItemRankingPorFase(item, etapaAnonimaEncerrada)
    );

    return NextResponse.json({
      processoSeletivo: {
        id: processo.id,
        titulo: processo.titulo,
        edital: processo.edital,
        pesos: {
          pesoProvaTecnica: processo.pesoProvaTecnica,
          pesoBaremaCurricular: processo.pesoBaremaCurricular,
        },
        notaCorteMinima: processo.notaCorteMinima,
        etapaAnonimaEncerrada,
        janelaRecursosAberta: Boolean(processo.janelaRecursosAberta),
        trilhas: processo.trilhas,
      },
      modoCorrecaoCega: !etapaAnonimaEncerrada,
      ranking: rankingProjetado,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao gerar o ranking consolidado da banca.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
