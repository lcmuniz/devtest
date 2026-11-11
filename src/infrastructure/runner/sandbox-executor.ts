import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import ts from "typescript";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import {
  RunnerPayload,
  RunnerResult,
  RunnerTestResult,
  avaliarQualidadeCodigoEstatico,
  construirComandoDockerSandbox,
} from "@/domain/runner/runner-contract";

interface SubprocessOutcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outOfMemory: boolean;
  durationMs: number;
}

const VARIAVEIS_PERMITIDAS_SANDBOX = [
  "PATH",
  "LANG",
  "LC_ALL",
  "JAVA_HOME",
];

export function ambienteSandbox(workspaceDir: string): NodeJS.ProcessEnv {
  const env: Record<string, string> = {
    PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
    HOME: workspaceDir,
    TMPDIR: workspaceDir,
  };
  for (const nome of VARIAVEIS_PERMITIDAS_SANDBOX) {
    const valor = process.env[nome];
    if (valor) env[nome] = valor;
  }
  return env as NodeJS.ProcessEnv;
}

/** Mata o processo e todos os filhos que ele criou (o filho é líder do próprio grupo). */
function matarGrupo(pid: number | undefined): void {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // Grupo já terminou
  }
}

function runSubprocess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  aoExpirar?: () => void,
  env: NodeJS.ProcessEnv = ambienteSandbox(cwd)
): Promise<SubprocessOutcome> {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      // Env mínimo: o código do candidato não pode herdar DATABASE_URL, AUTH_SECRET etc.
      env,
      // Grupo próprio para matar também processos em segundo plano criados pelo candidato
      detached: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      matarGrupo(child.pid);
      aoExpirar?.();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    // Nada do candidato pode sobreviver à execução e espionar a próxima.
    // No "exit": o "close" esperaria os filhos que herdaram o stdout.
    child.on("exit", () => matarGrupo(child.pid));

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const outOfMemory =
        code === 137 &&
        !timedOut ||
        /JavaScript heap out of memory|MemoryError|OutOfMemoryError/i.test(
          stderr + stdout
        );

      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut: timedOut || signal === "SIGKILL" && durationMs >= timeoutMs,
        outOfMemory,
        durationMs,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + "\n" + err.message,
        timedOut: false,
        outOfMemory: false,
        durationMs: Date.now() - start,
      });
    });
  });
}

function limparImportsDeTesteTS(code: string): string {
  return code
    .replace(/^\s*import\s+.*?from\s+['"]vitest['"];?\s*$/gm, "")
    .replace(/^\s*import\s+.*?from\s+['"]\.\/solution['"];?\s*$/gm, "");
}

function prepararWorkspaceTypeScript(
  workspaceDir: string,
  payload: RunnerPayload
): { compileError?: string } {
  // Verifica erros de sintaxe graves com o compilador TypeScript
  const diagnosticsSource = ts.transpileModule(payload.sourceCode, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });

  if (diagnosticsSource.diagnostics && diagnosticsSource.diagnostics.length > 0) {
    const msg = diagnosticsSource.diagnostics
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
      .join("\n");
    return { compileError: msg };
  }

  const publicTestsClean = limparImportsDeTesteTS(payload.testHarness);
  const hiddenTestsClean = payload.hiddenTestHarness
    ? limparImportsDeTesteTS(payload.hiddenTestHarness)
    : "";

  const combinedTs = `
// Bloqueio estrito de rede no sandbox
globalThis.fetch = async () => {
  throw new Error("Acesso à rede externa bloqueado no sandbox (network: none)");
};

${payload.sourceCode}

const __tests: Array<{ name: string; fn: () => any; isHidden: boolean }> = [];
let __currentSuite = "";
let __isHiddenContext = false;

function describe(suiteName: string, fn: () => void) {
  const prev = __currentSuite;
  __currentSuite = suiteName;
  fn();
  __currentSuite = prev;
}

function it(testName: string, fn: () => any) {
  __tests.push({
    name: __currentSuite ? \`\${__currentSuite} > \${testName}\` : testName,
    fn,
    isHidden: __isHiddenContext,
  });
}
const test = it;

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(\`Esperado \${JSON.stringify(expected)}, recebido \${JSON.stringify(actual)}\`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(\`Esperado \${b}, recebido \${a}\`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(\`Esperado valor truthy, recebido \${actual}\`);
    },
    toBeFalsy() {
      if (actual) throw new Error(\`Esperado valor falsy, recebido \${actual}\`);
    },
    toThrow() {
      let threw = false;
      try {
        actual();
      } catch {
        threw = true;
      }
      if (!threw) throw new Error("Esperava que a função lançasse uma exceção.");
    }
  };
}

__isHiddenContext = false;
${publicTestsClean}

__isHiddenContext = true;
${hiddenTestsClean}

(async () => {
  const results = [];
  for (const t of __tests) {
    const t0 = Date.now();
    try {
      await t.fn();
      results.push({
        testName: t.name,
        status: "PASSED",
        durationMs: Date.now() - t0,
        isHidden: t.isHidden,
      });
    } catch (err: any) {
      results.push({
        testName: t.name,
        status: "FAILED",
        durationMs: Date.now() - t0,
        failureMessage: err?.message || String(err),
        isHidden: t.isHidden,
      });
    }
  }
  const memKb = Math.round(process.memoryUsage().rss / 1024);
  console.log("__RUNNER_JSON_START__" + JSON.stringify({ results, memKb }) + "__RUNNER_JSON_END__");
})();
`;

  const transpiled = ts.transpileModule(combinedTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });

  fs.writeFileSync(path.join(workspaceDir, "runner.cjs"), transpiled.outputText, "utf-8");
  return {};
}

function prepararWorkspacePython(workspaceDir: string, payload: RunnerPayload): void {
  fs.writeFileSync(path.join(workspaceDir, "solution.py"), payload.sourceCode, "utf-8");
  fs.writeFileSync(
    path.join(workspaceDir, "public_tests.py"),
    `from solution import *\n${payload.testHarness}\n`,
    "utf-8"
  );
  if (payload.hiddenTestHarness) {
    fs.writeFileSync(
      path.join(workspaceDir, "hidden_tests.py"),
      `from solution import *\n${payload.hiddenTestHarness}\n`,
      "utf-8"
    );
  }

  const pyRunner = `
import json
import time
import resource
import socket
import urllib.request

# Bloqueio de rede externa no sandbox
def _blocked_socket(*args, **kwargs):
    raise RuntimeError("Acesso à rede externa bloqueado no sandbox (network: none)")
socket.socket = _blocked_socket

results = []

def run_module_tests(mod_name, is_hidden):
    mod = __import__(mod_name)
    for attr in dir(mod):
        if attr.startswith("test_") and callable(getattr(mod, attr)):
            fn = getattr(mod, attr)
            t0 = time.time()
            try:
                fn()
                results.append({
                    "testName": attr,
                    "status": "PASSED",
                    "durationMs": int((time.time() - t0) * 1000),
                    "isHidden": is_hidden
                })
            except Exception as e:
                results.append({
                    "testName": attr,
                    "status": "FAILED",
                    "durationMs": int((time.time() - t0) * 1000),
                    "failureMessage": str(e) or repr(e),
                    "isHidden": is_hidden
                })

run_module_tests("public_tests", False)
try:
    import os
    if os.path.exists("hidden_tests.py"):
        run_module_tests("hidden_tests", True)
except Exception as e:
    results.append({
        "testName": "hidden_suite",
        "status": "FAILED",
        "durationMs": 0,
        "failureMessage": str(e),
        "isHidden": True
    })

usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
# Em macOS ru_maxrss é em bytes, em Linux é em KB
mem_kb = int(usage / 1024) if usage > 10_000_000 else int(usage)
print("__RUNNER_JSON_START__" + json.dumps({"results": results, "memKb": max(mem_kb, 1024)}) + "__RUNNER_JSON_END__")
`;

  fs.writeFileSync(path.join(workspaceDir, "test_runner.py"), pyRunner, "utf-8");
}

function extrairMetodosTesteJava(harness: string): Array<{ name: string; body: string }> {
  const limpo = harness.replace(/@Test/g, "");
  const headerRegex = /void\s+([a-zA-Z0-9_]+)\s*\(\s*\)\s*\{/g;
  const metodos: Array<{ name: string; body: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(limpo)) !== null) {
    const nome = match[1];
    const startIndex = headerRegex.lastIndex;
    let braceCount = 1;
    let i = startIndex;
    while (i < limpo.length && braceCount > 0) {
      if (limpo[i] === "{") braceCount++;
      else if (limpo[i] === "}") braceCount--;
      i++;
    }
    if (braceCount === 0) {
      const body = limpo.substring(startIndex, i - 1);
      metodos.push({ name: nome, body });
      headerRegex.lastIndex = i;
    }
  }
  return metodos;
}

function prepararWorkspaceJava(workspaceDir: string, payload: RunnerPayload): void {
  fs.writeFileSync(path.join(workspaceDir, "Solution.java"), payload.sourceCode, "utf-8");

  const publicMethods = extrairMetodosTesteJava(payload.testHarness);
  const hiddenMethods = payload.hiddenTestHarness
    ? extrairMetodosTesteJava(payload.hiddenTestHarness)
    : [];

  const allMethods = [
    ...publicMethods.map((m) => ({ ...m, isHidden: false })),
    ...hiddenMethods.map((m) => ({ ...m, isHidden: true })),
  ];

  const methodsDeclaration = allMethods
    .map(
      (m, idx) => `
    static void __test_${idx}() throws Exception {
      ${m.body}
    }
  `
    )
    .join("\n");

  const methodsInvocation = allMethods
    .map(
      (m, idx) => `
      {
        long t0 = System.currentTimeMillis();
        try {
          __test_${idx}();
          long dur = System.currentTimeMillis() - t0;
          jsonEntries.add("{\\"testName\\":\\"${m.name}\\",\\"status\\":\\"PASSED\\",\\"durationMs\\":" + dur + ",\\"isHidden\\":" + ${m.isHidden} + "}");
        } catch (Throwable ex) {
          long dur = System.currentTimeMillis() - t0;
          String msg = ex.getMessage() != null ? ex.getMessage().replace("\\"", "'") : ex.toString().replace("\\"", "'");
          jsonEntries.add("{\\"testName\\":\\"${m.name}\\",\\"status\\":\\"FAILED\\",\\"durationMs\\":" + dur + ",\\"failureMessage\\":\\"" + msg + "\\",\\"isHidden\\":" + ${m.isHidden} + "}");
        }
      }
  `
    )
    .join("\n");

  const testRunnerJava = `
import java.util.*;

public class TestRunner {
    static void assertEquals(Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) {
            throw new AssertionError("Esperado " + expected + ", recebido " + actual);
        }
    }

    static void assertTrue(boolean cond) {
        if (!cond) throw new AssertionError("Esperado true, recebido false");
    }

    static void assertFalse(boolean cond) {
        if (cond) throw new AssertionError("Esperado false, recebido true");
    }

    ${methodsDeclaration}

    public static void main(String[] args) {
        List<String> jsonEntries = new ArrayList<>();
        ${methodsInvocation}
        Runtime rt = Runtime.getRuntime();
        long memKb = Math.max(1024L, (rt.totalMemory() - rt.freeMemory()) / 1024L);
        String resultsJson = "[" + String.join(",", jsonEntries) + "]";
        System.out.println("__RUNNER_JSON_START__{\\"results\\":" + resultsJson + ",\\"memKb\\":" + memKb + "}__RUNNER_JSON_END__");
    }
}
`;

  fs.writeFileSync(path.join(workspaceDir, "TestRunner.java"), testRunnerJava, "utf-8");
}

function extrairJsonDoStdout(stdout: string): {
  results: RunnerTestResult[];
  memKb: number;
} | null {
  const match = stdout.match(/__RUNNER_JSON_START__([\s\S]*?)__RUNNER_JSON_END__/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Sem container, execuções simultâneas rodam com o mesmo usuário e uma poderia
// ler ou matar a outra. Por isso, uma execução por vez em cada processo.
let filaLocal: Promise<unknown> = Promise.resolve();

export class SandboxExecutor {
  private useDockerContainer: boolean;

  constructor(options?: { useDockerContainer?: boolean }) {
    this.useDockerContainer =
      options?.useDockerContainer ?? process.env.RUNNER_USE_DOCKER === "true";
  }

  async execute(payload: RunnerPayload): Promise<RunnerResult> {
    if (this.useDockerContainer) return this.executarAgora(payload);
    const vez = filaLocal.then(() => this.executarAgora(payload));
    filaLocal = vez.catch(() => {});
    return vez;
  }

  private async executarAgora(payload: RunnerPayload): Promise<RunnerResult> {
    const workspaceDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `devtest-sandbox-${crypto.randomUUID()}-`)
    );

    const analiseEstatica = avaliarQualidadeCodigoEstatico(
      payload.language,
      payload.sourceCode
    );

    const timeoutMs = (payload.limits.timeoutSeconds || 10) * 1000;

    try {
      // Construímos o comando Docker para validar contrato de isolamento
      const dockerCmd = construirComandoDockerSandbox(payload, workspaceDir);
      const rodarNoDocker = () => {
        // mkdtemp cria 0700; o usuário 1000 do container precisa ler o workspace
        fs.chmodSync(workspaceDir, 0o755);
        // O CLI do docker é confiável e não repassa o env ao container (não há -e)
        return runSubprocess(
          dockerCmd.executable,
          dockerCmd.args,
          workspaceDir,
          timeoutMs,
          () =>
            spawn("docker", ["rm", "-f", dockerCmd.nomeContainer], { stdio: "ignore" }).on(
              "error",
              () => {}
            ),
          process.env
        );
      };

      if (payload.language === LinguagemDesafio.TYPESCRIPT) {
        const prep = prepararWorkspaceTypeScript(workspaceDir, payload);
        if (prep.compileError) {
          return {
            status: "COMPILE_ERROR",
            executionTimeMs: 0,
            memoryPeakKb: 0,
            testResults: [],
            linterScore: analiseEstatica.linterScore,
            linterViolations: analiseEstatica.violations,
            compilerOutput: prep.compileError,
          };
        }

        const outcome = this.useDockerContainer
          ? await rodarNoDocker()
          : await runSubprocess(
              "node",
              [
                `--max-old-space-size=${payload.limits.memoryLimitMb || 512}`,
                "runner.cjs",
              ],
              workspaceDir,
              timeoutMs
            );

        return this.processarOutcome(outcome, analiseEstatica);
      }

      if (payload.language === LinguagemDesafio.PYTHON) {
        prepararWorkspacePython(workspaceDir, payload);

        // Verifica erro de sintaxe Python antes de rodar testes
        const compileCheck = await runSubprocess(
          "python3",
          ["-m", "py_compile", "solution.py"],
          workspaceDir,
          5000
        );
        if (compileCheck.exitCode !== 0) {
          return {
            status: "COMPILE_ERROR",
            executionTimeMs: compileCheck.durationMs,
            memoryPeakKb: 0,
            testResults: [],
            linterScore: analiseEstatica.linterScore,
            linterViolations: analiseEstatica.violations,
            compilerOutput: compileCheck.stderr || compileCheck.stdout,
          };
        }

        const outcome = this.useDockerContainer
          ? await rodarNoDocker()
          : await runSubprocess("python3", ["test_runner.py"], workspaceDir, timeoutMs);

        return this.processarOutcome(outcome, analiseEstatica);
      }

      if (payload.language === LinguagemDesafio.JAVA) {
        prepararWorkspaceJava(workspaceDir, payload);

        const compileOutcome = await runSubprocess(
          "javac",
          ["Solution.java", "TestRunner.java"],
          workspaceDir,
          10000
        );

        if (compileOutcome.exitCode !== 0) {
          return {
            status: "COMPILE_ERROR",
            executionTimeMs: compileOutcome.durationMs,
            memoryPeakKb: 0,
            testResults: [],
            linterScore: analiseEstatica.linterScore,
            linterViolations: analiseEstatica.violations,
            compilerOutput: compileOutcome.stderr || compileOutcome.stdout,
          };
        }

        const outcome = this.useDockerContainer
          ? await rodarNoDocker()
          : await runSubprocess(
              "java",
              [`-Xmx${payload.limits.memoryLimitMb || 512}m`, "TestRunner"],
              workspaceDir,
              timeoutMs
            );

        return this.processarOutcome(outcome, analiseEstatica);
      }

      throw new Error(`Linguagem não suportada: ${payload.language}`);
    } finally {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // Ignora erro de limpeza de diretório temporário
      }
    }
  }

  private processarOutcome(
    outcome: SubprocessOutcome,
    analiseEstatica: { linterScore: number; violations: string[] }
  ): RunnerResult {
    if (outcome.timedOut) {
      return {
        status: "TIMEOUT",
        executionTimeMs: outcome.durationMs,
        memoryPeakKb: 0,
        testResults: [],
        linterScore: analiseEstatica.linterScore,
        linterViolations: analiseEstatica.violations,
      };
    }

    if (outcome.outOfMemory) {
      return {
        status: "OUT_OF_MEMORY",
        executionTimeMs: outcome.durationMs,
        memoryPeakKb: 0,
        testResults: [],
        linterScore: analiseEstatica.linterScore,
        linterViolations: analiseEstatica.violations,
      };
    }

    const parsed = extrairJsonDoStdout(outcome.stdout);
    if (!parsed) {
      return {
        status: "COMPILE_ERROR",
        executionTimeMs: outcome.durationMs,
        memoryPeakKb: 0,
        testResults: [],
        linterScore: analiseEstatica.linterScore,
        linterViolations: analiseEstatica.violations,
        compilerOutput: outcome.stderr || outcome.stdout || "Falha de execução no runner.",
      };
    }

    const algumFalhou = parsed.results.some((r) => r.status === "FAILED");
    return {
      status: algumFalhou ? "TEST_FAILURE" : "SUCCESS",
      executionTimeMs: outcome.durationMs,
      memoryPeakKb: parsed.memKb || 1024,
      testResults: parsed.results,
      linterScore: analiseEstatica.linterScore,
      linterViolations: analiseEstatica.violations,
    };
  }
}
