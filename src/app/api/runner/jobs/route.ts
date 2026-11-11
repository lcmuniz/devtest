import { NextResponse } from "next/server";
import { validarRunnerPayload } from "@/domain/runner/runner-contract";
import { getRunnerQueue } from "@/infrastructure/runner/runner-queue";
import { obterSessaoRequisicao } from "@/infrastructure/auth/session-server";
import {
  extrairIpCliente,
  formatarHeadersRateLimit,
  getRunnerRateLimiter,
} from "@/domain/seguranca/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = extrairIpCliente(request);
    const runnerLimiter = getRunnerRateLimiter();
    const chaveLimit = `runner:${ip}`;
    const resRateLimit = runnerLimiter.consumir(chaveLimit, {
      limiteMaximo: 10,
      janelaSegundos: 60,
    });

    const headers = formatarHeadersRateLimit({
      limiteMaximo: 10,
      resultado: resRateLimit,
    });

    if (!resRateLimit.permitido) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: [
            `Limite de execuções simultâneas no sandbox excedido. Aguarde ${resRateLimit.tempoEsperaSegundos} segundos.`,
          ],
        },
        { status: 429, headers }
      );
    }

    const body = await request.json();
    const validacao = validarRunnerPayload(body);

    if (!validacao.valido) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: validacao.erros,
        },
        { status: 400, headers }
      );
    }

    const queue = getRunnerQueue();
    const sessao = await obterSessaoRequisicao(request);
    const job = await queue.enqueue(validacao.dados!, sessao?.id);

    return NextResponse.json(
      {
        sucesso: true,
        jobId: job.id,
        state: job.state,
      },
      { status: 202, headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro ao enfileirar execução no Runner."],
      },
      { status: 500 }
    );
  }
}
