import { NextResponse } from "next/server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import {
  CandidatoRankingInput,
  gerarRankingConsolidado,
} from "@/domain/banca/painel-banca";
import { projetarItemRankingPorFase } from "@/domain/recurso/homologacao-recurso";
import {
  gerarCsvRanking,
  gerarHtmlRelatorioRanking,
  ItemRankingRelatorio,
} from "@/domain/relatorio/relatorio";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const processoSeletivoId = url.searchParams.get("processoSeletivoId");
    const formato = url.searchParams.get("formato") || "csv";
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
      let notaTecnicaTotal = 0;
      let notaCorretude = 0;
      let notaQualidade = 0;
      let notaDesempenho = 0;

      if (qtd > 0) {
        const somaTot = subsCandidato.reduce((a, s) => a + s.notaTecnicaTotal, 0);
        const somaCor = subsCandidato.reduce((a, s) => a + s.notaCorretude, 0);
        const somaQua = subsCandidato.reduce((a, s) => a + s.notaQualidade, 0);
        const somaDes = subsCandidato.reduce((a, s) => a + s.notaDesempenho, 0);

        notaTecnicaTotal = Number((somaTot / qtd).toFixed(2));
        notaCorretude = Number((somaCor / qtd).toFixed(2));
        notaQualidade = Number((somaQua).toFixed(2));
        notaDesempenho = Number((somaDes).toFixed(2));
      }

      const atendeNotaCorte =
        qtd > 0 && notaTecnicaTotal >= processo.notaCorteMinima;
      const statusClassificacaoVal =
        qtd === 0
          ? "SEM_SUBMISSAO"
          : atendeNotaCorte
          ? "CLASSIFICADO"
          : "DESCLASSIFICADO_NOTA_CORTE";

      const trilha = processo.trilhas.find((t) => t.id === insc.trilhaId);

      return {
        inscricaoId: insc.id,
        codigoAnonimo: insc.codigoAnonimo,
        candidatoId: insc.candidatoId,
        candidatoNome: insc.candidatoNome ?? "",
        candidatoEmail: insc.candidatoEmail ?? "",
        candidatoCpf: insc.candidatoCpf ?? "",
        trilhaId: insc.trilhaId,
        trilhaNome: trilha?.nome ?? "Trilha Geral",
        notaTecnicaTotal,
        notaCorretude,
        notaQualidade,
        notaDesempenho,
        atendeNotaCorte,
        statusClassificacao: statusClassificacaoVal,
        pontuacaoProvisoriaBarema: insc.pontuacaoProvisoriaBarema,
        pontuacaoHomologadaBarema: insc.pontuacaoHomologadaBarema ?? null,
        statusAuditoriaBarema: insc.statusAuditoriaBarema ?? "PENDENTE",
        linguagem: submissaoPrincipal?.linguagem,
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

    const rankingProjetado = rankingConsolidado.map((item) =>
      projetarItemRankingPorFase(item, !!processo.etapaAnonimaEncerrada)
    );

    const itensRelatorio: ItemRankingRelatorio[] = rankingProjetado.map((r) => ({
      posicaoRanking: r.posicaoRanking,
      codigoAnonimo: r.codigoAnonimo,
      candidatoNome: r.candidatoNome,
      candidatoCpf: r.candidatoCpf,
      candidatoEmail: r.candidatoEmail,
      trilhaNome: r.trilhaNome,
      notaTecnicaTotal: r.notaTecnicaTotal,
      notaCorretude: r.notaCorretude,
      notaQualidade: r.notaQualidade,
      notaDesempenho: r.notaDesempenho,
      notaBaremaUtilizada: r.notaBaremaUtilizada,
      notaFinalConsolidada: r.notaFinalConsolidada,
      statusClassificacao: r.statusClassificacao,
      statusAuditoriaBarema: r.statusAuditoriaBarema,
      atendeNotaCorte: r.atendeNotaCorte,
    }));

    const modoAnonimo = !processo.etapaAnonimaEncerrada;

    if (formato === "html") {
      const html = gerarHtmlRelatorioRanking({
        processoTitulo: processo.titulo,
        edital: processo.edital,
        pesos: {
          pesoProvaTecnica: processo.pesoProvaTecnica,
          pesoBaremaCurricular: processo.pesoBaremaCurricular,
        },
        notaCorteMinima: processo.notaCorteMinima,
        ranking: itensRelatorio,
        modoAnonimo,
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const csv = gerarCsvRanking({
      processoTitulo: processo.titulo,
      edital: processo.edital,
      ranking: itensRelatorio,
      modoAnonimo,
    });

    const safeEdital = processo.edital.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="devtest-ranking-${safeEdital}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao gerar relatório do ranking." },
      { status: 500 }
    );
  }
}
