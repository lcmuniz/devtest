import { NextResponse } from "next/server";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import {
  getDesafioRepository,
  desafioPertenceAoProcesso,
} from "@/infrastructure/repositories/desafio-repository";
import { getRepository as getPsRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import { getRunnerQueue } from "@/infrastructure/runner/runner-queue";
import { verificarJanelaDeProvaAtiva } from "@/domain/prova/ambiente-prova";
import {
  calcularAutoavaliacaoTecnica,
  avaliarNotaCorteEliminatoria,
} from "@/domain/submissao/autoavaliacao-tecnica";
import { sanitizarResultadoRunnerParaCandidato } from "@/domain/runner/runner-contract";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const inscricaoId = url.searchParams.get("inscricaoId") || undefined;
    const desafioId = url.searchParams.get("desafioId") || undefined;
    const processoSeletivoId =
      url.searchParams.get("processoSeletivoId") || undefined;
    const visao = url.searchParams.get("visao");

    // Candidato só lista submissões da própria inscrição; sem inscricaoId, só a Banca.
    const donoInscricao = inscricaoId
      ? (await getCandidatoRepository().buscarInscricaoPorId(inscricaoId))?.candidatoId
      : undefined;
    const negado = await negarAcessoAoCandidato(request, donoInscricao);
    if (negado) return negado;

    const repo = getSubmissaoRepository();
    const lista = await repo.findAll({
      inscricaoId,
      desafioId,
      processoSeletivoId,
    });

    const submissoes =
      visao === "banca"
        ? lista
        : lista.map((s) => ({
            ...s,
            relatorioExecucao: sanitizarResultadoRunnerParaCandidato(
              s.relatorioExecucao
            ),
          }));

    return NextResponse.json({
      sucesso: true,
      submissoes,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro ao consultar submissões."],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inscricaoId, desafioId, codigoFonte } = body;

    if (!inscricaoId || !desafioId || !codigoFonte || !String(codigoFonte).trim()) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: [
            "Os campos inscricaoId, desafioId e codigoFonte são obrigatórios.",
          ],
        },
        { status: 400 }
      );
    }

    const inscricao = await getCandidatoRepository().buscarInscricaoPorId(
      String(inscricaoId)
    );
    const negado = await negarAcessoAoCandidato(request, inscricao?.candidatoId);
    if (negado) return negado;

    const submissaoRepo = getSubmissaoRepository();
    const jaExistente = await submissaoRepo.findByInscricaoAndDesafio(
      String(inscricaoId),
      String(desafioId)
    );

    if (jaExistente) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: [
            "O candidato já realizou a submissão definitiva para este desafio. Edições posteriores estão bloqueadas.",
          ],
        },
        { status: 409 }
      );
    }

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.findById(String(desafioId));
    if (!desafio) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Desafio não encontrado."],
        },
        { status: 404 }
      );
    }

    if (
      inscricao &&
      !(await desafioPertenceAoProcesso(desafio.id, inscricao.processoSeletivoId))
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Este desafio não pertence ao processo da sua inscrição."],
        },
        { status: 403 }
      );
    }

    const psRepo = getPsRepository();
    let psId = desafio.processoSeletivoId || "";
    if (!psId) {
      psId = inscricao?.processoSeletivoId || "";
    }

    const processoSeletivo = psId ? await psRepo.findById(psId) : null;
    if (processoSeletivo) {
      const janela = verificarJanelaDeProvaAtiva(processoSeletivo);
      if (!janela.ativa) {
        return NextResponse.json(
          {
            sucesso: false,
            erros: [janela.motivo || "Fora do horário de realização das provas."],
          },
          { status: 403 }
        );
      }
    }

    // Executa a suíte COMPLETA (testes públicos + testes ocultos de borda) no Runner
    const queue = getRunnerQueue();
    const job = await queue.enqueue({
      language: desafio.linguagem,
      sourceCode: String(codigoFonte),
      testHarness: desafio.suiteTestesPublicos,
      hiddenTestHarness: desafio.suiteTestesOcultos,
      limits: {
        timeoutSeconds: desafio.timeoutSeconds,
        memoryLimitMb: desafio.memoryLimitMb,
        cpuQuota: 1.0,
        network: "none",
      },
    }, inscricao?.candidatoId);

    const completedJob = await queue.getJob(job.id, { wait: true });
    if (!completedJob || !completedJob.result) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: [
            completedJob?.error || "Falha ao executar suíte de avaliação definitiva.",
          ],
        },
        { status: 500 }
      );
    }

    const autoavaliacao = calcularAutoavaliacaoTecnica({
      runnerResult: completedJob.result,
      limits: {
        timeoutSeconds: desafio.timeoutSeconds,
        memoryLimitMb: desafio.memoryLimitMb,
      },
    });

    const corte = avaliarNotaCorteEliminatoria(
      autoavaliacao.notaTecnicaTotal,
      processoSeletivo?.notaCorteMinima ?? 50
    );

    const submissaoSalva = await submissaoRepo.create({
      inscricaoId: String(inscricaoId),
      processoSeletivoId: processoSeletivo?.id || psId,
      desafioId: desafio.id,
      linguagem: desafio.linguagem,
      codigoFonte: String(codigoFonte),
      statusExecucao: completedJob.result.status,
      notaCorretude: autoavaliacao.notaCorretude,
      notaQualidade: autoavaliacao.notaQualidade,
      notaDesempenho: autoavaliacao.notaDesempenho,
      notaTecnicaTotal: autoavaliacao.notaTecnicaTotal,
      atendeNotaCorte: corte.atendeNotaCorte,
      statusClassificacao: corte.statusClassificacao,
      relatorioExecucao: completedJob.result,
    });

    return NextResponse.json(
      {
        sucesso: true,
        submissao: {
          ...submissaoSalva,
          relatorioExecucao: sanitizarResultadoRunnerParaCandidato(
            submissaoSalva.relatorioExecucao
          ),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro inesperado ao registrar submissão definitiva."],
      },
      { status: 500 }
    );
  }
}
