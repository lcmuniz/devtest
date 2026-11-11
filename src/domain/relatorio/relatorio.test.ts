import { describe, it, expect } from "vitest";
import {
  gerarCsvRanking,
  gerarHtmlRelatorioRanking,
  gerarCsvAtaRecursos,
  gerarHtmlAtaRecursos,
  ItemRankingRelatorio,
  ItemRecursoRelatorio,
} from "./relatorio";

describe("Domínio de Relatórios Oficiais da Banca", () => {
  const rankingMock: ItemRankingRelatorio[] = [
    {
      posicaoRanking: 1,
      codigoAnonimo: "CAND-001",
      candidatoNome: "Ana Silva",
      candidatoCpf: "111.222.333-44",
      candidatoEmail: "ana@email.com",
      trilhaNome: "Backend Java",
      notaTecnicaTotal: 95.5,
      notaCorretude: 68.0,
      notaQualidade: 14.5,
      notaDesempenho: 13.0,
      notaBaremaUtilizada: 80.0,
      notaFinalConsolidada: 89.3,
      statusClassificacao: "CLASSIFICADO",
      statusAuditoriaBarema: "AUDITADO",
      atendeNotaCorte: true,
    },
    {
      posicaoRanking: null,
      codigoAnonimo: "CAND-002",
      candidatoNome: "Bruno Costa",
      candidatoCpf: "222.333.444-55",
      candidatoEmail: "bruno@email.com",
      trilhaNome: "Backend Java",
      notaTecnicaTotal: 45.0,
      notaCorretude: 30.0,
      notaQualidade: 10.0,
      notaDesempenho: 5.0,
      notaBaremaUtilizada: 50.0,
      notaFinalConsolidada: null,
      statusClassificacao: "DESCLASSIFICADO_NOTA_CORTE",
      statusAuditoriaBarema: "PENDENTE",
      atendeNotaCorte: false,
    },
  ];

  const recursosMock: ItemRecursoRelatorio[] = [
    {
      id: "rec-1",
      codigoAnonimo: "CAND-001",
      candidatoNome: "Ana Silva",
      alvoContestacao: "PROVA_PRATICA",
      fundamentacao: "Solicito revisão do teste de desempenho devido a latência.",
      status: "DEFERIDO",
      parecerBanca: "Recurso procedente. Teste reexecutado e aprovado integralmente.",
      novaPontuacaoAlvo: 98.0,
      dataSubmissao: "2026-11-10T14:00:00Z",
    },
    {
      id: "rec-2",
      codigoAnonimo: "CAND-002",
      candidatoNome: "Bruno Costa",
      alvoContestacao: "BAREMA",
      fundamentacao: "Comprovante de pós-graduação anexado conforme edital.",
      status: "INDEFERIDO",
      parecerBanca: "Documento ilegível sem chancela digital válida.",
      novaPontuacaoAlvo: null,
      dataSubmissao: "2026-11-10T15:00:00Z",
    },
  ];

  describe("gerarCsvRanking", () => {
    it("deve gerar CSV formatado para Excel com BOM UTF-8 e ponto-e-vírgula em modo anônimo", () => {
      const csv = gerarCsvRanking({
        processoTitulo: "Processo Seletivo PSS 2026",
        edital: "01/2026",
        ranking: rankingMock,
        modoAnonimo: true,
      });

      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("Posição;Código Anônimo;Trilha;Nota Técnica");
      expect(csv).not.toContain("Ana Silva");
      expect(csv).toContain("CAND-001");
      expect(csv).toContain("#1;CAND-001;Backend Java;95.50;80.00;89.30;CLASSIFICADO;AUDITADO");
      expect(csv).toContain("Eliminado;CAND-002;Backend Java;45.00;50.00;-;DESCLASSIFICADO_NOTA_CORTE;PENDENTE");
    });

    it("deve incluir nome, CPF e email quando modoAnonimo for false (desmascarado)", () => {
      const csv = gerarCsvRanking({
        processoTitulo: "Processo Seletivo PSS 2026",
        edital: "01/2026",
        ranking: rankingMock,
        modoAnonimo: false,
      });

      expect(csv).toContain("Posição;Código Anônimo;Nome do Candidato;CPF;E-mail;Trilha");
      expect(csv).toContain("Ana Silva");
      expect(csv).toContain("111.222.333-44");
      expect(csv).toContain("ana@email.com");
    });
  });

  describe("gerarHtmlRelatorioRanking", () => {
    it("deve gerar HTML formatado para impressão / PDF oficial com cabeçalho DevTest", () => {
      const html = gerarHtmlRelatorioRanking({
        processoTitulo: "Processo Seletivo PSS 2026",
        edital: "01/2026",
        pesos: { pesoProvaTecnica: 60, pesoBaremaCurricular: 40 },
        notaCorteMinima: 60,
        ranking: rankingMock,
        modoAnonimo: true,
        dataEmissao: "11/11/2026 10:00",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("DevTest - Relatório Oficial de Classificação");
      expect(html).toContain("Processo Seletivo PSS 2026");
      expect(html).toContain("01/2026");
      expect(html).toContain("CAND-001");
      expect(html).toContain("89.30");
      expect(html).toContain("@media print");
    });
  });

  describe("gerarCsvAtaRecursos e gerarHtmlAtaRecursos", () => {
    it("deve gerar CSV da Ata de Recursos", () => {
      const csv = gerarCsvAtaRecursos({
        processoTitulo: "Processo Seletivo PSS 2026",
        edital: "01/2026",
        recursos: recursosMock,
      });

      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("Protocolo;Código Anônimo;Candidato;Alvo;Decisão;Parecer da Banca;Nota Retificada");
      expect(csv).toContain("rec-1;CAND-001;Ana Silva;PROVA_PRATICA;DEFERIDO;");
      expect(csv).toContain("98.00");
    });

    it("deve gerar HTML da Ata de Recursos da Banca", () => {
      const html = gerarHtmlAtaRecursos({
        processoTitulo: "Processo Seletivo PSS 2026",
        edital: "01/2026",
        recursos: recursosMock,
      });

      expect(html).toContain("Ata de Julgamento de Recursos");
      expect(html).toContain("rec-1");
      expect(html).toContain("Recurso procedente");
      expect(html).toContain("DEFERIDO");
      expect(html).toContain("INDEFERIDO");
    });
  });
});
