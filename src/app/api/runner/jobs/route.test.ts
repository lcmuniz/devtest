import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { GET } from "./[jobId]/route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import { resetRunnerQueue } from "@/infrastructure/runner/runner-queue";
import { resetGlobalRateLimiters } from "@/domain/seguranca/rate-limit";

describe("API Runner Jobs & Fila Assíncrona (Seam 3)", () => {
  beforeEach(async () => {
    resetGlobalRateLimiters();
    await resetRunnerQueue();
  });

  it("deve enfileirar um job de execução, processar no worker e ocultar detalhes de falha de testes ocultos na visão do candidato", async () => {
    const bancaHeaders = await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA");
    const postReq = new Request("http://localhost:3000/api/runner/jobs", {
      method: "POST",
      headers: bancaHeaders,
      body: JSON.stringify({
        language: LinguagemDesafio.TYPESCRIPT,
        sourceCode: `
          export function validarEmpenho(valor: number): boolean {
            return valor > 0;
          }
        `,
        testHarness: `
          describe("Público", () => {
            it("aprova valor positivo", () => {
              expect(validarEmpenho(100)).toBe(true);
            });
          });
        `,
        hiddenTestHarness: `
          describe("Oculto Borda", () => {
            it("rejeita valor acima do teto constitucional secreto", () => {
              expect(validarEmpenho(999999999)).toBe(false);
            });
          });
        `,
        limits: {
          timeoutSeconds: 5,
          memoryLimitMb: 256,
          cpuQuota: 1.0,
          network: "none",
        },
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(202);
    const postData = await postRes.json();
    expect(postData.sucesso).toBe(true);
    expect(postData.jobId).toBeDefined();

    // Candidato que não é dono do job não lê o resultado
    const resAlheio = await GET(
      new Request(`http://localhost:3000/api/runner/jobs/${postData.jobId}?wait=true`, {
        headers: await cabecalhosSessao("cand-alheio"),
      }),
      { params: Promise.resolve({ jobId: postData.jobId }) }
    );
    expect(resAlheio.status).toBe(403);

    // Aguarda conclusão do processamento assíncrono na fila (sem visao=banca o resultado é sanitizado)
    const getCandidatoReq = new Request(
      `http://localhost:3000/api/runner/jobs/${postData.jobId}?wait=true`,
      { method: "GET", headers: bancaHeaders }
    );
    const getCandidatoRes = await GET(getCandidatoReq, {
      params: Promise.resolve({ jobId: postData.jobId }),
    });
    expect(getCandidatoRes.status).toBe(200);
    const candidatoData = await getCandidatoRes.json();

    expect(candidatoData.sucesso).toBe(true);
    expect(candidatoData.job.state).toBe("completed");
    expect(candidatoData.job.result.status).toBe("TEST_FAILURE");

    // Na visão do candidato, o teste oculto que falhou não pode expor nome real nem failureMessage
    const hiddenResultCandidato = candidatoData.job.result.testResults.find(
      (t: any) => t.isHidden
    );
    expect(hiddenResultCandidato).toBeDefined();
    expect(hiddenResultCandidato.status).toBe("FAILED");
    expect(hiddenResultCandidato.testName).toBe("Teste Oculto da Banca");
    expect(hiddenResultCandidato.failureMessage).toBeUndefined();

    // Na visão da banca (visao=banca), a falha detalhada do teste oculto está disponível
    const getBancaReq = new Request(
      `http://localhost:3000/api/runner/jobs/${postData.jobId}?visao=banca`,
      { method: "GET", headers: bancaHeaders }
    );
    const getBancaRes = await GET(getBancaReq, {
      params: Promise.resolve({ jobId: postData.jobId }),
    });
    const bancaData = await getBancaRes.json();
    const hiddenResultBanca = bancaData.job.result.testResults.find(
      (t: any) => t.isHidden
    );
    expect(hiddenResultBanca.testName).toContain("teto constitucional secreto");
    expect(hiddenResultBanca.failureMessage).toBeDefined();
  });

  it("deve limitar taxa de requisições de compilação no sandbox e retornar 429 após 10 execuções por minuto", async () => {
    const payload = {
      language: LinguagemDesafio.TYPESCRIPT,
      sourceCode: "export function f() { return 1; }",
      testHarness: "describe('t', () => it('ok', () => {}));",
      limits: { timeoutSeconds: 5, memoryLimitMb: 128 },
    };

    // 10 requisições permitidas
    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost:3000/api/runner/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "10.0.0.55",
        },
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      expect(res.status).toBe(202);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    }

    // 11ª requisição deve receber 429
    const reqBloqueada = new Request("http://localhost:3000/api/runner/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": "10.0.0.55",
      },
      body: JSON.stringify(payload),
    });

    const resBloqueada = await POST(reqBloqueada);
    expect(resBloqueada.status).toBe(429);
    expect(resBloqueada.headers.get("Retry-After")).toBeDefined();
    expect(resBloqueada.headers.get("X-RateLimit-Remaining")).toBe("0");

    const data = await resBloqueada.json();
    expect(data.sucesso).toBe(false);
    expect(data.erros[0]).toContain("Limite de execuções simultâneas");
  });
});
