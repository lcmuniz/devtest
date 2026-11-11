import { NextResponse } from "next/server";
import { sanitizarResultadoRunnerParaCandidato } from "@/domain/runner/runner-contract";
import { getRunnerQueue } from "@/infrastructure/runner/runner-queue";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const url = new URL(request.url);
    const wait = url.searchParams.get("wait") === "true";
    const visao = url.searchParams.get("visao");

    const queue = getRunnerQueue();
    const job = await queue.getJob(jobId, { wait });

    if (!job) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Job de execução não encontrado."],
        },
        { status: 404 }
      );
    }

    const negado = await negarAcessoAoCandidato(request, job.ownerId);
    if (negado) return negado;

    const resultadoSanitizado =
      job.result && visao !== "banca"
        ? sanitizarResultadoRunnerParaCandidato(job.result)
        : job.result;

    return NextResponse.json({
      sucesso: true,
      job: {
        id: job.id,
        state: job.state,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        error: job.error,
        result: resultadoSanitizado,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro ao consultar status do job no Runner."],
      },
      { status: 500 }
    );
  }
}
