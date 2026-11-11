import { describe, it, expect } from "vitest";
import {
  calcularAutoavaliacaoTecnica,
  avaliarNotaCorteEliminatoria,
} from "./autoavaliacao-tecnica";

describe("Domínio Submissão: Autoavaliação Técnica Ponderada e Nota de Corte (Seam 1)", () => {
  it("deve calcular nota máxima (100) quando todos os testes públicos e ocultos passam, linter é 100 e desempenho é rápido", () => {
    const resultado = calcularAutoavaliacaoTecnica({
      runnerResult: {
        status: "SUCCESS",
        executionTimeMs: 120,
        memoryPeakKb: 16384,
        linterScore: 100,
        testResults: [
          { testName: "pub 1", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "pub 2", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "hid 1", status: "PASSED", durationMs: 20, isHidden: true },
          { testName: "hid 2", status: "PASSED", durationMs: 20, isHidden: true },
        ],
      },
      limits: {
        timeoutSeconds: 10,
        memoryLimitMb: 512,
      },
    });

    expect(resultado.notaCorretude).toBe(70);
    expect(resultado.notaQualidade).toBe(15);
    expect(resultado.notaDesempenho).toBe(15);
    expect(resultado.notaTecnicaTotal).toBe(100);
  });

  it("deve ponderar 30% para testes públicos e 70% para testes ocultos e escalonar Qualidade e Desempenho pelo fator de corretude", () => {
    // Passou 100% dos públicos (2/2) e 50% dos ocultos (1/2)
    // Fator de corretude = 1.0 * 0.30 + 0.5 * 0.70 = 0.65
    // Nota Corretude = 0.65 * 70 = 45.5
    // Nota Qualidade Bruta = 80% de 15 = 12 -> ponderada por 0.65 = 7.8
    // Nota Desempenho Bruta = 15 -> ponderada por 0.65 = 9.75
    // Total = 45.5 + 7.8 + 9.75 = 63.05
    const resultado = calcularAutoavaliacaoTecnica({
      runnerResult: {
        status: "TEST_FAILURE",
        executionTimeMs: 100,
        memoryPeakKb: 10240,
        linterScore: 80,
        testResults: [
          { testName: "pub 1", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "pub 2", status: "PASSED", durationMs: 10, isHidden: false },
          { testName: "hid 1", status: "PASSED", durationMs: 15, isHidden: true },
          {
            testName: "hid 2",
            status: "FAILED",
            durationMs: 15,
            failureMessage: "Erro borda",
            isHidden: true,
          },
        ],
      },
      limits: {
        timeoutSeconds: 10,
        memoryLimitMb: 512,
      },
    });

    expect(resultado.notaCorretude).toBe(45.5);
    expect(resultado.notaQualidade).toBe(7.8);
    expect(resultado.notaDesempenho).toBe(9.75);
    expect(resultado.notaTecnicaTotal).toBe(63.05);
  });

  it("deve impedir que código hardcoded que só passa nos testes públicos (0% ocultos) atinja 50 pontos", () => {
    const resultado = calcularAutoavaliacaoTecnica({
      runnerResult: {
        status: "TEST_FAILURE",
        executionTimeMs: 15,
        memoryPeakKb: 12000,
        linterScore: 100,
        testResults: [
          { testName: "pub 1", status: "PASSED", durationMs: 5, isHidden: false },
          { testName: "pub 2", status: "PASSED", durationMs: 5, isHidden: false },
          { testName: "hid 1", status: "FAILED", durationMs: 5, isHidden: true },
          { testName: "hid 2", status: "FAILED", durationMs: 5, isHidden: true },
        ],
      },
      limits: {
        timeoutSeconds: 10,
        memoryLimitMb: 512,
      },
    });

    expect(resultado.notaCorretude).toBe(21);
    expect(resultado.notaQualidade).toBe(4.5);
    expect(resultado.notaDesempenho).toBe(4.5);
    expect(resultado.notaTecnicaTotal).toBe(30);

    const corte = avaliarNotaCorteEliminatoria(resultado.notaTecnicaTotal, 50);
    expect(corte.atendeNotaCorte).toBe(false);
    expect(corte.statusClassificacao).toBe("DESCLASSIFICADO_NOTA_CORTE");
  });

  it("deve classificar candidato igual ou acima da nota de corte e desclassificar abaixo da nota de corte", () => {
    const aprovado = avaliarNotaCorteEliminatoria(60, 50);
    expect(aprovado.atendeNotaCorte).toBe(true);
    expect(aprovado.statusClassificacao).toBe("CLASSIFICADO");

    const reprovado = avaliarNotaCorteEliminatoria(49.5, 50);
    expect(reprovado.atendeNotaCorte).toBe(false);
    expect(reprovado.statusClassificacao).toBe("DESCLASSIFICADO_NOTA_CORTE");
  });
});
