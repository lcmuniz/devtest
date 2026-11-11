import { beforeEach, describe, expect, it } from "vitest";
import { GET as GET_RELATORIO_RANKING } from "./ranking/route";
import { GET as GET_RELATORIO_RECURSOS } from "./recursos/route";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  getCandidatoRepository,
  resetCandidatoRepository,
} from "@/infrastructure/repositories/candidato-repository";
import {
  getSubmissaoRepository,
  resetSubmissaoRepository,
} from "@/infrastructure/repositories/submissao-repository";
import {
  getRecursoRepository,
  resetRecursoRepository,
} from "@/infrastructure/repositories/recurso-repository";
import {
  getDesafioRepository,
  resetDesafioRepository,
} from "@/infrastructure/repositories/desafio-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

describe("API de Relatórios Oficiais da Banca", () => {
  let processoId = "";
  let trilhaId = "";

  beforeEach(async () => {
    await resetRecursoRepository();
    await resetSubmissaoRepository();
    await resetDesafioRepository();
    await resetCandidatoRepository();
    const psRepo = getProcessoSeletivoRepository();
    await psRepo.reset();

    const ps = await psRepo.create({
      titulo: "Processo Seletivo DevTest 2026",
      edital: "01/2026",
      inicioInscricoes: "2026-11-01T00:00:00Z",
      fimInscricoes: "2026-11-30T23:59:59Z",
      inicioProvas: "2026-12-01T00:00:00Z",
      fimProvas: "2026-12-02T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Backend Java", descricao: "Java 21 / Spring Boot" }],
      barema: [
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização / Pós-graduação",
          pontuacaoUnitaria: 10,
          pontuacaoMaxima: 20,
        },
      ],
    });

    processoId = ps.id;
    trilhaId = ps.trilhas[0].id;

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.create({
      processoSeletivoId: processoId,
      trilhaId,
      titulo: "Desafio Backend",
      enunciadoMarkdown: "Implemente",
      linguagem: LinguagemDesafio.JAVA,
      codigoTemplate: "public class Main {}",
      suiteTestesPublicos: "assert true;",
      suiteTestesOcultos: "assert true;",
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });

    const candRepo = getCandidatoRepository();
    const c1 = await candRepo.criarCandidato({
      nome: "Clarice Lispector",
      cpf: "52998224725",
      email: "clarice@devtest.org",
      senha: "hash123",
    });

    const insc1 = await candRepo.criarInscricao({
      candidatoId: c1.id,
      candidatoNome: c1.nome,
      candidatoEmail: c1.email,
      candidatoCpf: c1.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId,
      trilhaNome: "Backend Java",
      itensBarema: [],
      pontuacaoProvisoriaBarema: 0,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 0,
        itensDetalhados: [],
      },
    });

    const subRepo = getSubmissaoRepository();
    await subRepo.create({
      inscricaoId: insc1.id,
      processoSeletivoId: processoId,
      desafioId: desafio.id,
      linguagem: LinguagemDesafio.JAVA,
      codigoFonte: "public class Main {}",
      statusExecucao: "SUCCESS",
      notaTecnicaTotal: 85,
      notaCorretude: 60,
      notaQualidade: 15,
      notaDesempenho: 10,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 120,
        memoryPeakKb: 0,
        testResults: [],
        linterScore: 100,
      },
    });

    const recRepo = getRecursoRepository();
    await recRepo.create({
      inscricaoId: insc1.id,
      processoSeletivoId: processoId,
      candidatoId: c1.id,
      codigoAnonimo: insc1.codigoAnonimo,
      alvoContestacao: "PROVA_PRATICA",
      fundamentacao: "Solicito revisão dos testes unitários de borda.",
    });
  });

  it("deve exportar relatório de ranking em formato CSV compatível com Excel", async () => {
    const req = new Request(
      `http://localhost/api/banca/relatorios/ranking?processoSeletivoId=${processoId}&formato=csv`
    );
    const res = await GET_RELATORIO_RANKING(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(".csv");

    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);

    const text = buffer.toString("utf-8");
    expect(text).toContain("DevTest - Relatório Oficial de Classificação");
    expect(text).toContain("Backend Java");
  });

  it("deve exportar relatório de ranking em formato HTML pronto para impressão", async () => {
    const req = new Request(
      `http://localhost/api/banca/relatorios/ranking?processoSeletivoId=${processoId}&formato=html`
    );
    const res = await GET_RELATORIO_RANKING(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("DevTest &bull; Relatório Oficial de Classificação");
  });

  it("deve exportar ata de recursos em formato CSV e HTML", async () => {
    const reqCsv = new Request(
      `http://localhost/api/banca/relatorios/recursos?processoSeletivoId=${processoId}&formato=csv`
    );
    const resCsv = await GET_RELATORIO_RECURSOS(reqCsv);
    expect(resCsv.status).toBe(200);
    const csv = await resCsv.text();
    expect(csv).toContain("DevTest - Ata Oficial de Julgamento de Recursos");

    const reqHtml = new Request(
      `http://localhost/api/banca/relatorios/recursos?processoSeletivoId=${processoId}&formato=html`
    );
    const resHtml = await GET_RELATORIO_RECURSOS(reqHtml);
    expect(resHtml.status).toBe(200);
    const html = await resHtml.text();
    expect(html).toContain("DevTest &bull; Ata de Julgamento de Recursos");
  });
});
