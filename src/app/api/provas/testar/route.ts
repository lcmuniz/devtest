import { NextResponse } from "next/server";
import {
  getDesafioRepository,
  desafioPertenceAoProcesso,
  buscarProcessosDoDesafio,
} from "@/infrastructure/repositories/desafio-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { obterSessaoRequisicao } from "@/infrastructure/auth/session-server";
import { getRepository as getPsRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { verificarJanelaDeProvaAtiva } from "@/domain/prova/ambiente-prova";
import { getRunnerQueue } from "@/infrastructure/runner/runner-queue";
import {
  extrairIpCliente,
  formatarHeadersRateLimit,
  getRunnerRateLimiter,
} from "@/domain/seguranca/rate-limit";

export async function POST(request: Request) {
  try {
    const sessao = await obterSessaoRequisicao(request);
    if (!sessao) {
      return NextResponse.json(
        { sucesso: false, erros: ["Autenticação necessária."] },
        { status: 401 }
      );
    }

    const ip = extrairIpCliente(request);
    const runnerLimiter = getRunnerRateLimiter();
    const chaveLimit = `runner:testar:${ip}`;
    const resRateLimit = runnerLimiter.consumir(chaveLimit, {
      limiteMaximo: 10,
      janelaSegundos: 60,
    });

    if (!resRateLimit.permitido) {
      const headers = formatarHeadersRateLimit({
        limiteMaximo: 10,
        resultado: resRateLimit,
      });
      return NextResponse.json(
        {
          sucesso: false,
          erros: [
            `Limite de execuções simultâneas de testes excedido. Aguarde ${resRateLimit.tempoEsperaSegundos} segundos.`,
          ],
        },
        { status: 429, headers }
      );
    }

    const body = await request.json();
    const { desafioId, codigoFonte } = body;

    if (!desafioId || !codigoFonte || ! String(codigoFonte).trim()) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["O desafio e o código-fonte são obrigatórios para testar a solução."],
        },
        { status: 400 }
      );
    }

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.findById(desafioId);

    if (!desafio) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Desafio não encontrado."],
        },
        { status: 404 }
      );
    }

    // Candidato só testa desafios de processos em que está inscrito
    let processoSeletivoId = "";
    if (sessao.perfil === "CANDIDATO") {
      const inscricoes = await getCandidatoRepository().buscarInscricoesPorCandidato(sessao.id);
      let inscrito = false;
      for (const insc of inscricoes) {
        if (await desafioPertenceAoProcesso(desafio.id, insc.processoSeletivoId)) {
          inscrito = true;
          processoSeletivoId = insc.processoSeletivoId;
          break;
        }
      }
      if (!inscrito) {
        return NextResponse.json(
          { sucesso: false, erros: ["Você não está inscrito no processo deste desafio."] },
          { status: 403 }
        );
      }
    } else {
      const processos = await buscarProcessosDoDesafio(desafio.id);
      if (processos.length > 0) {
        processoSeletivoId = processos[0];
      }
    }

    const psRepo = getPsRepository();
    const processoSeletivo = processoSeletivoId
      ? await psRepo.findById(processoSeletivoId)
      : null;
    if (processoSeletivo) {
      const janela = verificarJanelaDeProvaAtiva(processoSeletivo);
      if (!janela.ativa) {
        return NextResponse.json(
          {
            sucesso: false,
            erros: [janela.motivo || "Fora do horário de prova."],
          },
          { status: 403 }
        );
      }
    }

    const queue = getRunnerQueue();
    // Executa EXCLUSIVAMENTE a suíte de testes públicos (hiddenTestHarness omitido)
    const job = await queue.enqueue({
      language: desafio.linguagem,
      sourceCode: String(codigoFonte),
      testHarness: desafio.suiteTestesPublicos,
      hiddenTestHarness: undefined,
      limits: {
        timeoutSeconds: desafio.timeoutSeconds,
        memoryLimitMb: desafio.memoryLimitMb,
        cpuQuota: 1.0,
        network: "none",
      },
    }, sessao.id);

    return NextResponse.json(
      {
        sucesso: true,
        jobId: job.id,
        state: job.state,
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro ao disparar execução dos testes públicos."],
      },
      { status: 500 }
    );
  }
}
