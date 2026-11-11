import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
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
import { resetSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import { resetRunnerQueue } from "@/infrastructure/runner/runner-queue";

describe("API Submissões Definitivas - Autoavaliação Técnica e Bloqueio de Reenvio (Seam 2)", () => {
  let psId: string;
  let trilhaId: string;
  let desafioId: string;

  beforeEach(async () => {
    await resetRunnerQueue();
    await resetSubmissaoRepository();
    await resetDesafioRepository();
    await resetPsRepository();

    const ps = await getPsRepository().create({
      titulo: "PSS DevTest 2026 - Submissões",
      edital: "Edital 06/2026",
      descricao: "Avaliação com nota de corte 60",
      inicioInscricoes: "2020-01-01T00:00:00Z",
      fimInscricoes: "2020-01-10T00:00:00Z",
      inicioProvas: "2020-01-15T00:00:00Z",
      fimProvas: "2099-12-31T23:59:59Z",
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      notaCorteMinima: 60,
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

    psId = ps.id;
    trilhaId = ps.trilhas[0].id;

    const desafio = await getDesafioRepository().create({
      processoSeletivoId: psId,
      trilhaId,
      titulo: "Cálculo de Glosa de Auditoria",
      enunciadoMarkdown: "# Glosa de Auditoria\nImplemente o cálculo de glosa.",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate: "export function calcularGlosa(v: number) { return 0; }",
      suiteTestesPublicos: `
        describe("Públicos", () => {
          it("glosa 10% de 1000 = 100", () => {
            expect(calcularGlosa(1000)).toBe(100);
          });
        });
      `,
      suiteTestesOcultos: `
        describe("Ocultos Borda", () => {
          it("valor negativo retorna 0", () => {
            expect(calcularGlosa(-500)).toBe(0);
          });
        });
      `,
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });

    desafioId = desafio.id;
  });

  it("deve registrar submissão definitiva, executar testes públicos e ocultos, computar Autoavaliação Técnica e bloquear segunda tentativa (409)", async () => {
    const req1 = new Request("http://localhost:3000/api/submissoes", {
      method: "POST",
      headers: await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA"),
      body: JSON.stringify({
        inscricaoId: "INSC-CAND-01",
        desafioId,
        codigoFonte: `
          export function calcularGlosa(v: number): number {
            if (v <= 0) return 0;
            return v * 0.1;
          }
        `,
      }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(201);
    const data1 = await res1.json();

    expect(data1.sucesso).toBe(true);
    expect(data1.submissao.id).toBeDefined();
    expect(data1.submissao.notaCorretude).toBe(70);
    expect(data1.submissao.notaQualidade).toBe(15);
    expect(data1.submissao.notaDesempenho).toBe(15);
    expect(data1.submissao.notaTecnicaTotal).toBe(100);
    expect(data1.submissao.atendeNotaCorte).toBe(true);
    expect(data1.submissao.statusClassificacao).toBe("CLASSIFICADO");

    // Tentativa de reenvio para a mesma inscrição e desafio deve ser bloqueada com 409
    const reqDuplicada = new Request("http://localhost:3000/api/submissoes", {
      method: "POST",
      headers: await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA"),
      body: JSON.stringify({
        inscricaoId: "INSC-CAND-01",
        desafioId,
        codigoFonte: "export function calcularGlosa(v: number) { return 0; }",
      }),
    });

    const resDuplicada = await POST(reqDuplicada);
    expect(resDuplicada.status).toBe(409);
    const dataDup = await resDuplicada.json();
    expect(dataDup.sucesso).toBe(false);
    expect(dataDup.erros[0]).toMatch(/já realizou a submissão definitiva/i);

    // Consulta GET recupera a submissão registrada
    const getReq = new Request(
      `http://localhost:3000/api/submissoes?inscricaoId=INSC-CAND-01&desafioId=${desafioId}`,
      { method: "GET", headers: await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA") }
    );
    const getRes = await GET(getReq);
    const getData = await getRes.json();
    expect(getData.sucesso).toBe(true);
    expect(getData.submissoes).toHaveLength(1);
    expect(getData.submissoes[0].id).toBe(data1.submissao.id);
  });

  it("deve registrar status DESCLASSIFICADO_NOTA_CORTE quando a nota técnica ficar abaixo da nota de corte eliminatória", async () => {
    // Passa no público (30% de 70 = 21 pts), mas falha no oculto (0% de 70 = 0 pts)
    // Total: 21 (corretude) + 15 (qualidade) + 15 (desempenho) = 51 < 60 (notaCorteMinima)
    const req = new Request("http://localhost:3000/api/submissoes", {
      method: "POST",
      headers: await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA"),
      body: JSON.stringify({
        inscricaoId: "INSC-CAND-02",
        desafioId,
        codigoFonte: `
          export function calcularGlosa(v: number): number {
            return v * 0.1; // falha para negativos no teste oculto
          }
        `,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.submissao.notaCorretude).toBe(21);
    expect(data.submissao.notaQualidade).toBe(4.5);
    expect(data.submissao.notaDesempenho).toBe(4.5);
    expect(data.submissao.notaTecnicaTotal).toBe(30);
    expect(data.submissao.atendeNotaCorte).toBe(false);
    expect(data.submissao.statusClassificacao).toBe("DESCLASSIFICADO_NOTA_CORTE");
  });
});
