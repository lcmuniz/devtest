import { describe, it, expect } from "vitest";
import {
  gerarEmailConvocacao,
  gerarEmailParecerRecurso,
  TemplateConvocacaoInput,
  TemplateParecerRecursoInput,
} from "./notificacao";

describe("Domínio de Comunicação e Notificações Oficiais", () => {
  it("deve gerar mensagem formal de convocação de candidato aprovado", () => {
    const input: TemplateConvocacaoInput = {
      candidatoNome: "Mariana Souza",
      candidatoEmail: "mariana.souza@email.com",
      posicaoRanking: 1,
      notaFinal: 92.4,
      processoTitulo: "Processo Seletivo PSS TI 2026",
      edital: "02/2026",
      trilhaNome: "Fullstack TypeScript",
      prazoEnvioDocumentos: "18/11/2026 às 18:00",
    };

    const email = gerarEmailConvocacao(input);

    expect(email.destinatario).toBe("mariana.souza@email.com");
    expect(email.assunto).toContain("Convocação");
    expect(email.assunto).toContain("PSS TI 2026");
    expect(email.corpoTexto).toContain("Prezada(o) Mariana Souza");
    expect(email.corpoTexto).toContain("1º lugar");
    expect(email.corpoTexto).toContain("Fullstack TypeScript");
    expect(email.corpoTexto).toContain("92.40");
    expect(email.corpoTexto).toContain("18/11/2026 às 18:00");
    expect(email.corpoHtml).toContain("<strong>1º lugar</strong>");
    expect(email.corpoHtml).toContain("Fullstack TypeScript");
  });

  it("deve gerar mensagem formal de parecer de recurso deferido", () => {
    const input: TemplateParecerRecursoInput = {
      candidatoNome: "Carlos Mendes",
      candidatoEmail: "carlos@email.com",
      codigoAnonimo: "CAND-042",
      processoTitulo: "Processo Seletivo PSS TI 2026",
      edital: "02/2026",
      alvoContestacao: "PROVA_PRATICA",
      decisao: "DEFERIDO",
      parecerBanca: "Após revisão técnica dos logs do sandbox, a pontuação de qualidade foi ajustada.",
      novaPontuacao: 88.5,
    };

    const email = gerarEmailParecerRecurso(input);

    expect(email.destinatario).toBe("carlos@email.com");
    expect(email.assunto).toContain("Julgamento de Recurso");
    expect(email.assunto).toContain("DEFERIDO");
    expect(email.corpoTexto).toContain("Carlos Mendes");
    expect(email.corpoTexto).toContain("DEFERIDO");
    expect(email.corpoTexto).toContain("88.50");
    expect(email.corpoTexto).toContain("Após revisão técnica dos logs");
  });

  it("deve gerar mensagem formal de parecer de recurso indeferido sem menção de nova pontuação", () => {
    const input: TemplateParecerRecursoInput = {
      candidatoNome: "Lucas Andrade",
      candidatoEmail: "lucas@email.com",
      codigoAnonimo: "CAND-077",
      processoTitulo: "Processo Seletivo PSS TI 2026",
      edital: "02/2026",
      alvoContestacao: "BAREMA",
      decisao: "INDEFERIDO",
      parecerBanca: "O certificado apresentado não atende aos requisitos do edital.",
    };

    const email = gerarEmailParecerRecurso(input);

    expect(email.assunto).toContain("INDEFERIDO");
    expect(email.corpoTexto).toContain("INDEFERIDO");
    expect(email.corpoTexto).toContain("O certificado apresentado");
    expect(email.corpoTexto).not.toContain("Nova pontuação ajustada:");
  });
});
