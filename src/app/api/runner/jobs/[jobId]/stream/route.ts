import { getRunnerQueue } from "@/infrastructure/runner/runner-queue";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import { sanitizarResultadoRunnerParaCandidato } from "@/domain/runner/runner-contract";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const queue = getRunnerQueue();

  const job = await queue.getJob(jobId);
  if (job) {
    const negado = await negarAcessoAoCandidato(request, job.ownerId);
    if (negado) return negado;
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const currentJob = await queue.getJob(jobId);

      if (!currentJob) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ erro: "Job não encontrado." })}\n\n`
          )
        );
        controller.close();
        return;
      }

      if (currentJob.state === "queued" || currentJob.state === "running") {
        controller.enqueue(
          encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
              id: currentJob.id,
              state: currentJob.state,
            })}\n\n`
          )
        );
      }

      const finalJob = await queue.getJob(jobId, { wait: true });
      if (finalJob) {
        const resultSanitized = finalJob.result
          ? sanitizarResultadoRunnerParaCandidato(finalJob.result)
          : undefined;

        controller.enqueue(
          encoder.encode(
            `event: ${finalJob.state}\ndata: ${JSON.stringify({
              id: finalJob.id,
              state: finalJob.state,
              result: resultSanitized,
              error: finalJob.error,
            })}\n\n`
          )
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
