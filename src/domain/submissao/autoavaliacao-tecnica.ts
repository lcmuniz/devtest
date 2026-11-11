import { RunnerResult } from "@/domain/runner/runner-contract";

export interface AutoavaliacaoTecnicaResultado {
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  notaTecnicaTotal: number;
  totalTestesPublicos: number;
  testesPublicosAprovados: number;
  totalTestesOcultos: number;
  testesOcultosAprovados: number;
}

export type StatusClassificacaoTecnica =
  | "CLASSIFICADO"
  | "DESCLASSIFICADO_NOTA_CORTE";

function arredondar2Casas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularAutoavaliacaoTecnica(input: {
  runnerResult: RunnerResult;
  limits: { timeoutSeconds: number; memoryLimitMb: number };
}): AutoavaliacaoTecnicaResultado {
  const { runnerResult, limits } = input;

  if (
    runnerResult.status === "COMPILE_ERROR" ||
    runnerResult.status === "TIMEOUT" ||
    runnerResult.status === "OUT_OF_MEMORY"
  ) {
    const notaQualidadeParcial = arredondar2Casas(
      ((runnerResult.linterScore || 0) / 100) * 15
    );
    return {
      notaCorretude: 0,
      notaQualidade: notaQualidadeParcial,
      notaDesempenho: 0,
      notaTecnicaTotal: notaQualidadeParcial,
      totalTestesPublicos: 0,
      testesPublicosAprovados: 0,
      totalTestesOcultos: 0,
      testesOcultosAprovados: 0,
    };
  }

  const testesPublicos = runnerResult.testResults.filter((t) => !t.isHidden);
  const testesOcultos = runnerResult.testResults.filter((t) => t.isHidden);

  const totalTestesPublicos = testesPublicos.length;
  const testesPublicosAprovados = testesPublicos.filter(
    (t) => t.status === "PASSED"
  ).length;

  const totalTestesOcultos = testesOcultos.length;
  const testesOcultosAprovados = testesOcultos.filter(
    (t) => t.status === "PASSED"
  ).length;

  const taxaPublicos =
    totalTestesPublicos > 0 ? testesPublicosAprovados / totalTestesPublicos : 1;
  const taxaOcultos =
    totalTestesOcultos > 0
      ? testesOcultosAprovados / totalTestesOcultos
      : taxaPublicos;

  const fatorCorretude = taxaPublicos * 0.3 + taxaOcultos * 0.7;

  // Pilar 1: Corretude Funcional (70% da nota do desafio -> 30% públicos + 70% ocultos)
  const notaCorretude = arredondar2Casas(fatorCorretude * 70);

  // Pilar 2: Qualidade de Código (15% da nota do desafio, escalonado pelo fator de corretude)
  const notaQualidadeBruta =
    (Math.max(0, Math.min(100, runnerResult.linterScore)) / 100) * 15;
  const notaQualidade = arredondar2Casas(notaQualidadeBruta * fatorCorretude);

  // Pilar 3: Desempenho (15% da nota do desafio: 7.5 pts CPU + 7.5 pts Memória, escalonado pelo fator de corretude)
  let notaDesempenho = 0;
  if (fatorCorretude > 0) {
    const timeoutMs = Math.max(1000, (limits.timeoutSeconds || 10) * 1000);
    const ratioTempo = runnerResult.executionTimeMs / timeoutMs;
    const scoreTempo = ratioTempo <= 0.5 ? 7.5 : Math.max(1.5, 7.5 * (1 - (ratioTempo - 0.5)));

    const limitKb = Math.max(65536, (limits.memoryLimitMb || 512) * 1024);
    const ratioMem = runnerResult.memoryPeakKb / limitKb;
    const scoreMem = ratioMem <= 0.5 ? 7.5 : Math.max(1.5, 7.5 * (1 - (ratioMem - 0.5)));

    notaDesempenho = arredondar2Casas(
      Math.min(15, scoreTempo + scoreMem) * fatorCorretude
    );
  }

  const notaTecnicaTotal = arredondar2Casas(
    notaCorretude + notaQualidade + notaDesempenho
  );

  return {
    notaCorretude,
    notaQualidade,
    notaDesempenho,
    notaTecnicaTotal,
    totalTestesPublicos,
    testesPublicosAprovados,
    totalTestesOcultos,
    testesOcultosAprovados,
  };
}

export function avaliarNotaCorteEliminatoria(
  notaTecnicaTotal: number,
  notaCorteMinima: number
): {
  atendeNotaCorte: boolean;
  statusClassificacao: StatusClassificacaoTecnica;
} {
  const atendeNotaCorte = notaTecnicaTotal >= notaCorteMinima;
  return {
    atendeNotaCorte,
    statusClassificacao: atendeNotaCorte
      ? "CLASSIFICADO"
      : "DESCLASSIFICADO_NOTA_CORTE",
  };
}
