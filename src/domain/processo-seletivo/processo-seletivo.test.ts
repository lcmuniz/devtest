import { describe, it, expect } from "vitest";
import {
  validarProcessoSeletivo,
  TipoCriterioBarema,
  type ProcessoSeletivoInput,
} from "./processo-seletivo";

describe("Processo Seletivo - Validação de Domínio & Integridade (Seam 1)", () => {
  const dadosValidos: ProcessoSeletivoInput = {
    titulo: "Processo Seletivo Simplificado DevTest 2026/1",
    edital: "Edital nº 01/2026 - DevTest",
    descricao: "Seleção técnica para contratação temporária de desenvolvedores",
    inicioInscricoes: "2026-03-01T08:00:00Z",
    fimInscricoes: "2026-03-15T23:59:59Z",
    inicioProvas: "2026-03-20T08:00:00Z",
    fimProvas: "2026-03-25T23:59:59Z",
    pesoProvaTecnica: 60,
    pesoBaremaCurricular: 40,
    notaCorteMinima: 50,
    trilhas: [
      { nome: "Backend Java", descricao: "Desenvolvimento Java 21 com Spring Boot" },
      { nome: "Frontend React", descricao: "Desenvolvimento React/TypeScript com Next.js" },
    ],
    barema: [
      {
        tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
        descricao: "Anos de experiência profissional comprovada na área",
        pontuacaoUnitaria: 2.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: true,
      },
      {
        tipo: TipoCriterioBarema.ESPECIALIZACAO,
        descricao: "Pós-graduação Lato Sensu em Computação ou áreas afins",
        pontuacaoUnitaria: 10.0,
        pontuacaoMaxima: 10.0,
        permiteMultiplos: false,
      },
      {
        tipo: TipoCriterioBarema.MESTRADO,
        descricao: "Mestrado Stricto Sensu em Computação ou áreas afins",
        pontuacaoUnitaria: 20.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: false,
      },
      {
        tipo: TipoCriterioBarema.DOUTORADO,
        descricao: "Doutorado em Ciência da Computação ou áreas afins",
        pontuacaoUnitaria: 30.0,
        pontuacaoMaxima: 30.0,
        permiteMultiplos: false,
      },
      {
        tipo: TipoCriterioBarema.CERTIFICACAO,
        descricao: "Certificações técnicas oficiais emitidas por fornecedores globais",
        pontuacaoUnitaria: 5.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: true,
      },
    ],
  };

  it("deve aprovar um processo seletivo com dados íntegros e cronograma coerente", () => {
    const resultado = validarProcessoSeletivo(dadosValidos);
    expect(resultado.valido).toBe(true);
    expect(resultado.erros).toBeUndefined();
    expect(resultado.dados).toBeDefined();
    expect(resultado.dados?.trilhas).toHaveLength(2);
    expect(resultado.dados?.barema).toHaveLength(5);
  });

  it("deve rejeitar se a data de término das inscrições for anterior ou igual ao início", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      inicioInscricoes: "2026-03-15T00:00:00Z",
      fimInscricoes: "2026-03-10T00:00:00Z",
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A data de término das inscrições deve ser posterior à data de início.");
  });

  it("deve rejeitar se o período de provas iniciar antes do fim das inscrições", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      inicioProvas: "2026-03-10T00:00:00Z",
      fimInscricoes: "2026-03-15T00:00:00Z",
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("O período de realização das provas deve iniciar após ou ao término das inscrições.");
  });

  it("deve rejeitar se a data de término das provas for anterior ao início das provas", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      inicioProvas: "2026-03-25T00:00:00Z",
      fimProvas: "2026-03-20T00:00:00Z",
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A data de término das provas deve ser posterior ou igual à data de início das provas.");
  });

  it("deve rejeitar se a soma dos pesos da prova técnica e barema curricular for diferente de 100", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 40, // 110 != 100
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A soma dos pesos da prova técnica e do barema curricular deve ser exatamente 100%.");
  });

  it("deve rejeitar se a nota de corte mínima for negativa ou superior a 100", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      notaCorteMinima: -5,
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A nota de corte mínima eliminatória deve estar entre 0 e 100.");
  });

  it("deve rejeitar se não houver ao menos uma trilha cadastrada", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      trilhas: [],
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("O Processo Seletivo deve possuir ao menos uma Trilha técnica vinculada.");
  });

  it("deve rejeitar se a soma dos tetos máximos do barema não totalizar 100 pontos", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      barema: [
        {
          tipo: TipoCriterioBarema.DOUTORADO,
          descricao: "Doutorado",
          pontuacaoUnitaria: 30.0,
          pontuacaoMaxima: 30.0,
          permiteMultiplos: false,
        },
      ], // soma 30 != 100
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A soma dos tetos máximos da matriz do Barema Curricular deve totalizar 100 pontos.");
  });

  it("deve rejeitar se a pontuação unitária do barema for menor ou igual a zero ou se o teto for inferior à pontuação unitária", () => {
    const dadosInvalidos = {
      ...dadosValidos,
      barema: [
        {
          tipo: TipoCriterioBarema.DOUTORADO,
          descricao: "Doutorado",
          pontuacaoUnitaria: 30.0,
          pontuacaoMaxima: 20.0, // Teto menor que o unitário!
          permiteMultiplos: false,
        },
        {
          tipo: TipoCriterioBarema.MESTRADO,
          descricao: "Mestrado",
          pontuacaoUnitaria: 80.0,
          pontuacaoMaxima: 80.0,
          permiteMultiplos: false,
        },
      ],
    };
    const resultado = validarProcessoSeletivo(dadosInvalidos);
    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("O teto individual de pontuação deve ser maior ou igual à pontuação unitária do critério.");
  });
});
