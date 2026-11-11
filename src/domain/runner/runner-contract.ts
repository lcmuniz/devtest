import { z } from "zod";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import { ResultadoValidacao } from "@/domain/processo-seletivo/processo-seletivo";

export type RunnerStatus =
  | "SUCCESS"
  | "TEST_FAILURE"
  | "TIMEOUT"
  | "OUT_OF_MEMORY"
  | "COMPILE_ERROR";

export interface RunnerTestResult {
  testName: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  failureMessage?: string;
  isHidden?: boolean;
}

export interface RunnerResult {
  status: RunnerStatus;
  executionTimeMs: number;
  memoryPeakKb: number;
  testResults: RunnerTestResult[];
  linterScore: number;
  linterViolations?: string[];
  compilerOutput?: string;
}

export const RunnerLimitsSchema = z.object({
  timeoutSeconds: z.number().int().min(1).max(60).default(10),
  memoryLimitMb: z.number().int().min(64).max(2048).default(512),
  cpuQuota: z.number().min(0.25).max(4.0).default(1.0),
  network: z.literal("none").default("none"),
});

export const RunnerPayloadSchema = z.object({
  language: z.nativeEnum(LinguagemDesafio),
  sourceCode: z.string().min(1, "O código-fonte submetido é obrigatório."),
  testHarness: z.string().min(1, "A suíte de testes públicos é obrigatória."),
  hiddenTestHarness: z.string().optional(),
  limits: RunnerLimitsSchema,
});

export type RunnerPayload = z.input<typeof RunnerPayloadSchema>;

export function validarRunnerPayload(
  input: RunnerPayload
): ResultadoValidacao<z.output<typeof RunnerPayloadSchema>> {
  const result = RunnerPayloadSchema.safeParse(input);
  if (!result.success) {
    return {
      valido: false,
      erros: result.error.errors.map((e) => e.message),
    };
  }
  return {
    valido: true,
    dados: result.data,
  };
}

export interface ComandoDockerSandbox {
  executable: "docker";
  args: string[];
  image: string;
  /** Nome do container, para removê-lo no timeout (matar o CLI do docker não para o container). */
  nomeContainer: string;
}

const DOCKER_IMAGES_POR_LINGUAGEM: Record<LinguagemDesafio, string> = {
  [LinguagemDesafio.TYPESCRIPT]: "node:20-alpine",
  [LinguagemDesafio.PYTHON]: "python:3.12-alpine",
  [LinguagemDesafio.JAVA]: "eclipse-temurin:21-jdk-alpine",
};

export function construirComandoDockerSandbox(
  payload: RunnerPayload,
  workspaceDir: string
): ComandoDockerSandbox {
  const image = DOCKER_IMAGES_POR_LINGUAGEM[payload.language];
  const memoryMb = payload.limits.memoryLimitMb || 512;
  const cpus = payload.limits.cpuQuota || 1.0;

  let innerCommand = "";
  if (payload.language === LinguagemDesafio.TYPESCRIPT) {
    innerCommand = "cp -r /workspace/* /tmp/ && cd /tmp && node runner.cjs";
  } else if (payload.language === LinguagemDesafio.PYTHON) {
    innerCommand = "cp -r /workspace/* /tmp/ && cd /tmp && python3 test_runner.py";
  } else {
    innerCommand = "cp -r /workspace/* /tmp/ && cd /tmp && javac Solution.java TestRunner.java && java TestRunner";
  }

  const nomeContainer = `devtest-sandbox-${crypto.randomUUID()}`;
  const args = [
    "run",
    "--rm",
    "--name",
    nomeContainer,
    "--network",
    "none",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,exec,nosuid,size=64m",
    "--user",
    "1000:1000",
    "--memory",
    `${memoryMb}m`,
    "--memory-swap",
    `${memoryMb}m`,
    "--cpus",
    String(cpus),
    "--pids-limit",
    "64",
    "--security-opt",
    "no-new-privileges",
    "-v",
    `${workspaceDir}:/workspace:ro`,
    image,
    "sh",
    "-c",
    innerCommand,
  ];

  return {
    executable: "docker",
    args,
    image,
    nomeContainer,
  };
}

export interface ResultadoAnaliseEstatica {
  linterScore: number;
  violations: string[];
}

export function avaliarQualidadeCodigoEstatico(
  language: LinguagemDesafio,
  sourceCode: string
): ResultadoAnaliseEstatica {
  let score = 100;
  const violations: string[] = [];

  // Regras de segurança / más práticas universais
  if (/\beval\s*\(/.test(sourceCode) || /\bexec\s*\(/.test(sourceCode)) {
    score -= 25;
    violations.push("Uso de avaliação dinâmica insegura (eval/exec).");
  }

  // Complexidade ciclomática aproximada por ramos de decisão
  const branches =
    sourceCode.match(/\b(if|else\s+if|for|while|case|catch)\b|&&|\|\|/g) || [];
  if (branches.length > 5) {
    const excesso = branches.length - 5;
    const penalidade = Math.min(30, excesso * 5);
    score -= penalidade;
    violations.push(
      `Complexidade ciclomática elevada (${branches.length + 1} caminhos lógicos).`
    );
  }

  // Regras específicas por linguagem
  if (language === LinguagemDesafio.TYPESCRIPT) {
    const anyMatches = sourceCode.match(/:\s*any\b/g) || [];
    if (anyMatches.length > 0) {
      score -= Math.min(20, anyMatches.length * 10);
      violations.push("Uso explícito do tipo 'any' reduz a segurança de tipos.");
    }
    if (/\bvar\s+/.test(sourceCode)) {
      score -= 10;
      violations.push("Uso de 'var' em vez de 'const' ou 'let'.");
    }
    if (/\bconsole\.log\s*\(/.test(sourceCode)) {
      score -= 5;
      violations.push("Instruções de debug 'console.log' deixadas no código.");
    }
  } else if (language === LinguagemDesafio.PYTHON) {
    if (/\bexcept\s*:/.test(sourceCode)) {
      score -= 15;
      violations.push("Uso de 'except:' genérico sem especificar a exceção.");
    }
    if (/\bglobal\s+/.test(sourceCode)) {
      score -= 10;
      violations.push("Mutação de estado global ('global').");
    }
  } else if (language === LinguagemDesafio.JAVA) {
    if (/catch\s*\([^)]+\)\s*\{\s*\}/.test(sourceCode)) {
      score -= 20;
      violations.push("Bloco 'catch' vazio silencia exceções críticas.");
    }
    if (/System\.out\.print/.test(sourceCode)) {
      score -= 5;
      violations.push("Uso direto de System.out em código de domínio.");
    }
  }

  return {
    linterScore: Math.max(0, Math.min(100, score)),
    violations,
  };
}

export function sanitizarResultadoRunnerParaCandidato(
  resultado: RunnerResult
): RunnerResult {
  return {
    ...resultado,
    testResults: resultado.testResults.map((tr) => {
      if (tr.isHidden) {
        return {
          testName: "Teste Oculto da Banca",
          status: tr.status,
          durationMs: tr.durationMs,
          isHidden: true,
        };
      }
      return tr;
    }),
  };
}
