import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { PATCH as PATCH_AUDITORIA } from "../inscricoes/[id]/auditoria-barema/route";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  getCandidatoRepository,
  resetCandidatoRepository,
} from "@/infrastructure/repositories/candidato-repository";
import {
  getDesafioRepository,
  resetDesafioRepository,
} from "@/infrastructure/repositories/desafio-repository";
import {
  getSubmissaoRepository,
  resetSubmissaoRepository,
} from "@/infrastructure/repositories/submissao-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

describe("APIs do Painel da Banca (/api/banca/ranking e /api/banca/inscricoes/[id]/auditoria-barema)", () => {
  let processoId = "";
  let trilhaBackendId = "";
  let criterioExpId = "";
  let criterioPosId = "";
  let desafioId = "";
  let inscricao1Id = "";
  let inscricao2Id = "";
  let inscricaoReprovadoId = "";

  beforeEach(async () => {
    await resetSubmissaoRepository();
    await resetDesafioRepository();
    await resetCandidatoRepository();
    const psRepo = getProcessoSeletivoRepository();
    await psRepo.reset();
    const ps = await psRepo.create({
      titulo: "Seletivo DevTest 2026",
      edital: "Edital 01/2026",
      inicioInscricoes: "2026-01-01T00:00:00.000Z",
      fimInscricoes: "2026-12-01T00:00:00.000Z",
      inicioProvas: "2026-01-01T00:00:00.000Z",
      fimProvas: "2026-12-31T23:59:59.000Z",
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      notaCorteMinima: 60,
      trilhas: [{ nome: "Engenharia Backend", descricao: "APIs" }],
      barema: [
        {
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Experiência Backend",
          pontuacaoUnitaria: 20,
          pontuacaoMaxima: 60,
          permiteMultiplos: true,
          exigeComprovante: true,
        },
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização ou Mestrado",
          pontuacaoUnitaria: 40,
          pontuacaoMaxima: 40,
          permiteMultiplos: false,
          exigeComprovante: true,
        },
      ],
    });

    processoId = ps.id;
    trilhaBackendId = ps.trilhas[0].id;
    criterioExpId = ps.barema[0].id;
    criterioPosId = ps.barema[1].id;

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.create({
      processoSeletivoId: processoId,
      trilhaId: trilhaBackendId,
      titulo: "Soma Simples",
      enunciadoMarkdown: "Some dois números",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate: "export function somar(a: number, b: number) { return 0; }",
      suiteTestesPublicos: "if (somar(2,2)!==4) process.exit(1);",
      suiteTestesOcultos: "if (somar(10,5)!==15) process.exit(1);",
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });
    desafioId = desafio.id;

    const candRepo = getCandidatoRepository();
    const cand1 = await candRepo.criarCandidato({
      nome: "Candidato Secreto Um",
      email: "secreto1@devtest.com",
      cpf: "52998224725",
      senha: "password123",
    });
    const cand2 = await candRepo.criarCandidato({
      nome: "Candidato Secreto Dois",
      email: "secreto2@devtest.com",
      cpf: "11144477735",
      senha: "password123",
    });
    const cand3 = await candRepo.criarCandidato({
      nome: "Candidato Reprovado Três",
      email: "secreto3@devtest.com",
      cpf: "12345678909",
      senha: "password123",
    });

    // Inscrição 1: Técnica 80, Barema Provisório 80 (Exp 40 + Pós 40) -> Final = 80*0.7 + 80*0.3 = 80.0
    const insc1 = await candRepo.criarInscricao({
      candidatoId: cand1.id,
      candidatoNome: cand1.nome,
      candidatoEmail: cand1.email,
      candidatoCpf: cand1.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId: trilhaBackendId,
      trilhaNome: "Engenharia Backend",
      itensBarema: [
        {
          criterioId: criterioExpId,
          quantidadeOuAnos: 2,
          arquivoComprovanteNome: "ctps_cand1.pdf",
          arquivoComprovanteBase64: "JVBERi0xLjQK",
        },
        {
          criterioId: criterioPosId,
          quantidadeOuAnos: 1,
          arquivoComprovanteNome: "diploma_cand1.pdf",
          arquivoComprovanteBase64: "JVBERi0xLjQK",
        },
      ],
      pontuacaoProvisoriaBarema: 80,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 80,
        itensDetalhados: [],
      },
    });
    inscricao1Id = insc1.id;

    // Inscrição 2: Técnica 85, Barema Provisório 60 -> Final = 85*0.7 + 60*0.3 = 59.5 + 18 = 77.5
    const insc2 = await candRepo.criarInscricao({
      candidatoId: cand2.id,
      candidatoNome: cand2.nome,
      candidatoEmail: cand2.email,
      candidatoCpf: cand2.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId: trilhaBackendId,
      trilhaNome: "Engenharia Backend",
      itensBarema: [
        {
          criterioId: criterioExpId,
          quantidadeOuAnos: 3,
          arquivoComprovanteNome: "ctps_cand2.pdf",
          arquivoComprovanteBase64: "JVBERi0xLjQK",
        },
      ],
      pontuacaoProvisoriaBarema: 60,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 60,
        itensDetalhados: [],
      },
    });
    inscricao2Id = insc2.id;

    // Inscrição 3: Técnica 40 (Reprovado no corte < 60), Barema 100
    const insc3 = await candRepo.criarInscricao({
      candidatoId: cand3.id,
      candidatoNome: cand3.nome,
      candidatoEmail: cand3.email,
      candidatoCpf: cand3.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId: trilhaBackendId,
      trilhaNome: "Engenharia Backend",
      itensBarema: [],
      pontuacaoProvisoriaBarema: 100,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 100,
        itensDetalhados: [],
      },
    });
    inscricaoReprovadoId = insc3.id;

    const subRepo = getSubmissaoRepository();
    await subRepo.create({
      inscricaoId: inscricao1Id,
      processoSeletivoId: processoId,
      desafioId,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export function somar(a: number, b: number) { return a + b; }",
      statusExecucao: "SUCCESS",
      notaCorretude: 60,
      notaQualidade: 10,
      notaDesempenho: 10,
      notaTecnicaTotal: 80,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 42,
        memoryPeakKb: 18400,
        testResults: [
          { testName: "Public 1", status: "PASSED", durationMs: 12, isHidden: false },
          { testName: "Hidden 1", status: "PASSED", durationMs: 15, isHidden: true },
        ],
        linterScore: 95,
        linterViolations: [],
      },
    });

    await subRepo.create({
      inscricaoId: inscricao2Id,
      processoSeletivoId: processoId,
      desafioId,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export const somar = (a: number, b: number): number => a + b;",
      statusExecucao: "SUCCESS",
      notaCorretude: 65,
      notaQualidade: 10,
      notaDesempenho: 10,
      notaTecnicaTotal: 85,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 35,
        memoryPeakKb: 16200,
        testResults: [
          { testName: "Public 1", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "Hidden 1", status: "PASSED", durationMs: 11, isHidden: true },
        ],
        linterScore: 100,
        linterViolations: [],
      },
    });

    await subRepo.create({
      inscricaoId: inscricaoReprovadoId,
      processoSeletivoId: processoId,
      desafioId,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export function somar() { return 4; }",
      statusExecucao: "TEST_FAILURE",
      notaCorretude: 21,
      notaQualidade: 10,
      notaDesempenho: 9,
      notaTecnicaTotal: 40,
      atendeNotaCorte: false,
      statusClassificacao: "DESCLASSIFICADO_NOTA_CORTE",
      relatorioExecucao: {
        status: "TEST_FAILURE",
        executionTimeMs: 50,
        memoryPeakKb: 19000,
        testResults: [
          { testName: "Public 1", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "Hidden 1", status: "FAILED", durationMs: 15, isHidden: true },
        ],
        linterScore: 90,
        linterViolations: [],
      },
    });
  });

  it("retorna o ranking consolidado em Correção Cega sem vazar nome, e-mail ou CPF dos candidatos", async () => {
    const req = new Request(
      `http://localhost:3000/api/banca/ranking?processoSeletivoId=${processoId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const rawJson = JSON.stringify(body);

    // Zero vazamento de PII
    expect(rawJson).not.toContain("Candidato Secreto Um");
    expect(rawJson).not.toContain("secreto1@devtest.com");
    expect(rawJson).not.toContain("52998224725");
    expect(rawJson).not.toContain("Candidato Secreto Dois");
    expect(rawJson).not.toContain("secreto2@devtest.com");
    expect(rawJson).not.toContain("11144477735");

    expect(body.ranking).toHaveLength(3);

    // 1º lugar provisório: Inscrição 1 (Nota Final 80.0 vs 77.5)
    expect(body.ranking[0].inscricaoId).toBe(inscricao1Id);
    expect(body.ranking[0].posicaoRanking).toBe(1);
    expect(body.ranking[0].notaFinalConsolidada).toBe(80);
    expect(body.ranking[0].codigoAnonimo).toMatch(/^CAND-\d+$/);

    // 2º lugar provisório: Inscrição 2 (Nota Final 77.5)
    expect(body.ranking[1].inscricaoId).toBe(inscricao2Id);
    expect(body.ranking[1].posicaoRanking).toBe(2);
    expect(body.ranking[1].notaFinalConsolidada).toBe(77.5);

    // Reprovado no corte: sem posição e sem nota final consolidada
    expect(body.ranking[2].inscricaoId).toBe(inscricaoReprovadoId);
    expect(body.ranking[2].posicaoRanking).toBeNull();
    expect(body.ranking[2].notaFinalConsolidada).toBeNull();
  });

  it("permite auditar (validar/glosar) anexos PDF do Barema e recalcula o ranking consolidado", async () => {
    // Banca glosa a Pós-Graduação (40 pts) do Candidato 1 e valida a Experiência (40 pts)
    // Nova Nota Barema Homologada = 40 -> Nova Nota Final = (80*70 + 40*30)/100 = 68.0
    // Com isso, Candidato 2 (77.5) passa para 1º lugar!
    const patchReq = new Request(
      `http://localhost:3000/api/banca/inscricoes/${inscricao1Id}/auditoria-barema`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisoes: [
            {
              criterioId: criterioExpId,
              statusAuditoria: "VALIDADO",
            },
            {
              criterioId: criterioPosId,
              statusAuditoria: "GLOSADO",
              motivoGlosa: "Documento PDF ilegível e sem assinatura digital válida.",
            },
          ],
        }),
      }
    );

    const patchRes = await PATCH_AUDITORIA(patchReq, {
      params: Promise.resolve({ id: inscricao1Id }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.pontuacaoHomologadaBarema).toBe(40);
    expect(patchBody.statusAuditoriaBarema).toBe("AUDITADO");

    // Consultar novamente o ranking consolidado
    const rankReq = new Request(
      `http://localhost:3000/api/banca/ranking?processoSeletivoId=${processoId}`
    );
    const rankRes = await GET(rankReq);
    const rankBody = await rankRes.json();

    // Agora Inscrição 2 (77.5) é 1º lugar e Inscrição 1 (68.0) caiu para 2º lugar!
    expect(rankBody.ranking[0].inscricaoId).toBe(inscricao2Id);
    expect(rankBody.ranking[0].posicaoRanking).toBe(1);
    expect(rankBody.ranking[0].notaFinalConsolidada).toBe(77.5);

    expect(rankBody.ranking[1].inscricaoId).toBe(inscricao1Id);
    expect(rankBody.ranking[1].posicaoRanking).toBe(2);
    expect(rankBody.ranking[1].notaFinalConsolidada).toBe(68);
    expect(rankBody.ranking[1].statusAuditoriaBarema).toBe("AUDITADO");
  });
});
