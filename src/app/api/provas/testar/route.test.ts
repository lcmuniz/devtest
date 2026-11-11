import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
import { GET as GETStream } from "../../runner/jobs/[jobId]/stream/route";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import {
  getRepository as getPsRepository,
  resetRepository as resetPsRepository,
} from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  getDesafioRepository,
  resetDesafioRepository,
} from "@/infrastructure/repositories/desafio-repository";
import { resetRunnerQueue } from "@/infrastructure/runner/runner-queue";

describe("API Teste Interativo de Solução & Stream SSE (Seam 2)", () => {
  let desafioId: string;

  beforeEach(async () => {
    await resetRunnerQueue();
    await resetDesafioRepository();
    await resetPsRepository();

    const ps = await getPsRepository().create({
      titulo: "PSS 2026 - Prova Ativa",
      edital: "Edital 05/2026",
      descricao: "Provas em andamento",
      inicioInscricoes: "2020-01-01T00:00:00Z",
      fimInscricoes: "2020-01-10T00:00:00Z",
      inicioProvas: "2020-01-15T00:00:00Z",
      fimProvas: "2099-12-31T23:59:59Z",
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Fullstack TypeScript", descricao: "TS" }],
      barema: [
        {
          tipo: TipoCriterioBarema.DOUTORADO,
          descricao: "Doutorado",
          pontuacaoUnitaria: 100,
          pontuacaoMaxima: 100,
          permiteMultiplos: false,
          exigeComprovante: true,
        },
      ],
    });

    const desafio = await getDesafioRepository().create({
      processoSeletivoId: ps.id,
      trilhaId: ps.trilhas[0].id,
      titulo: "Auditoria LRF",
      enunciadoMarkdown: "# Auditoria LRF\nCalcule o limite prudencial.",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate: "export function dobrar(x: number) { return 0; }",
      suiteTestesPublicos: `
        describe("Testes Públicos", () => {
          it("dobra 5 para 10", () => {
            expect(dobrar(5)).toBe(10);
          });
        });
      `,
      suiteTestesOcultos: `
        describe("Testes Ocultos", () => {
          it("teste secreto que falharia se executado", () => {
            expect(dobrar(999)).toBe(-1);
          });
        });
      `,
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });

    desafioId = desafio.id;
  });

  it("deve executar APENAS os testes públicos ao acionar POST /api/provas/testar e transmitir resultado via SSE sem tocar nos testes ocultos", async () => {
    const corpo = JSON.stringify({
      desafioId,
      codigoFonte: "export function dobrar(x: number): number { return x * 2; }",
    });

    // Candidato sem inscrição no processo do desafio não pode testá-lo
    const resNaoInscrito = await POST(
      new Request("http://localhost:3000/api/provas/testar", {
        method: "POST",
        headers: await cabecalhosSessao("cand-sem-inscricao"),
        body: corpo,
      })
    );
    expect(resNaoInscrito.status).toBe(403);

    const bancaHeaders = await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA");
    const req = new Request("http://localhost:3000/api/provas/testar", {
      method: "POST",
      headers: bancaHeaders,
      body: corpo,
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.sucesso).toBe(true);
    expect(data.jobId).toBeDefined();

    // Consome o stream SSE (/api/runner/jobs/[jobId]/stream)
    const sseReq = new Request(
      `http://localhost:3000/api/runner/jobs/${data.jobId}/stream`,
      { method: "GET", headers: bancaHeaders }
    );
    const sseRes = await GETStream(sseReq, {
      params: Promise.resolve({ jobId: data.jobId }),
    });

    expect(sseRes.headers.get("Content-Type")).toContain("text/event-stream");
    const sseText = await sseRes.text();
    expect(sseText).toContain("event: completed");

    const dataLines = sseText
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.replace(/^data:\s*/, "")));

    const finalPayload = dataLines[dataLines.length - 1];
    expect(finalPayload.state).toBe("completed");
    expect(finalPayload.result.status).toBe("SUCCESS");
    expect(finalPayload.result.testResults).toHaveLength(1);
    expect(finalPayload.result.testResults[0].testName).toContain("dobra 5 para 10");
    expect(finalPayload.result.testResults.some((t: any) => t.isHidden)).toBe(false);
  });
});
