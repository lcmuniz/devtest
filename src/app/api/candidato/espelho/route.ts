import { NextResponse } from "next/server";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import { getRecursoRepository } from "@/infrastructure/repositories/recurso-repository";
import {
  auditarItensBarema,
  CandidatoRankingInput,
  gerarRankingConsolidado,
} from "@/domain/banca/painel-banca";
import { gerarEspelhoAvaliacaoCandidato } from "@/domain/recurso/homologacao-recurso";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const inscricaoId = url.searchParams.get("inscricaoId");
    const candidatoId = url.searchParams.get("candidatoId");

    if (!inscricaoId || !candidatoId) {
      return NextResponse.json(
        { error: "Os parâmetros inscricaoId e candidatoId são obrigatórios." },
        { status: 400 }
      );
    }

    const negado = await negarAcessoAoCandidato(request, candidatoId);
    if (negado) return negado;

    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(inscricaoId);
    if (!inscricao) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    if (inscricao.candidatoId !== candidatoId) {
      return NextResponse.json(
        {
          error:
            "Acesso negado ao Espelho de Avaliação: você só pode consultar o espelho da sua própria inscrição.",
        },
        { status: 403 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(inscricao.processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const subRepo = getSubmissaoRepository();
    const recRepo = getRecursoRepository();

    const [inscricoesProcesso, submissoesProcesso, recursosInscricao] =
      await Promise.all([
        candRepo.buscarInscricoesPorProcesso(processo.id),
        subRepo.findAll({ processoSeletivoId: processo.id }),
        recRepo.findAll({ inscricaoId }),
      ]);

    const subPorInscricao = new Map(
      submissoesProcesso.map((s) => [s.inscricaoId, s])
    );

    const entradas: CandidatoRankingInput[] = inscricoesProcesso.map((insc) => {
      const sub = subPorInscricao.get(insc.id);
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
        notaTecnicaTotal: sub ? sub.notaTecnicaTotal : 0,
        notaCorretude: sub ? sub.notaCorretude : 0,
        notaQualidade: sub ? sub.notaQualidade : 0,
        notaDesempenho: sub ? sub.notaDesempenho : 0,
        atendeNotaCorte: sub ? sub.atendeNotaCorte : false,
        statusClassificacao: sub ? sub.statusClassificacao : "SEM_SUBMISSAO",
        pontuacaoProvisoriaBarema: insc.pontuacaoProvisoriaBarema,
        pontuacaoHomologadaBarema: insc.pontuacaoHomologadaBarema ?? null,
        statusAuditoriaBarema: insc.statusAuditoriaBarema ?? "PENDENTE",
        linguagem: sub?.linguagem,
        codigoFonte: sub?.codigoFonte,
        relatorioExecucao: sub?.relatorioExecucao ?? null,
        itensBaremaAuditados,
      };
    });

    const rankingConsolidado = gerarRankingConsolidado(entradas, {
      pesoProvaTecnica: processo.pesoProvaTecnica,
      pesoBaremaCurricular: processo.pesoBaremaCurricular,
    });

    const itemDoCandidato = rankingConsolidado.find(
      (r) => r.inscricaoId === inscricaoId
    );
    if (!itemDoCandidato) {
      return NextResponse.json(
        { error: "Item de classificação não encontrado." },
        { status: 404 }
      );
    }

    const espelho = gerarEspelhoAvaliacaoCandidato({
      candidatoSolicitanteId: candidatoId,
      itemRanking: itemDoCandidato,
      pesos: {
        pesoProvaTecnica: processo.pesoProvaTecnica,
        pesoBaremaCurricular: processo.pesoBaremaCurricular,
      },
      notaCorteMinima: processo.notaCorteMinima,
    });

    return NextResponse.json({
      processoSeletivo: {
        id: processo.id,
        titulo: processo.titulo,
        edital: processo.edital,
        etapaAnonimaEncerrada: Boolean(processo.etapaAnonimaEncerrada),
        janelaRecursosAberta: Boolean(processo.janelaRecursosAberta),
      },
      espelho,
      recursos: recursosInscricao,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao consultar o Espelho de Avaliação do candidato.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
