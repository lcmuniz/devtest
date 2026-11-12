import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import { SandboxExecutor, ambienteSandbox } from "./sandbox-executor";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

// Compila e executa processos reais (javac, timeouts): lento em runners de CI
describe("SandboxExecutor: Execução Isolada Multi-Linguagem (Seam 2)", { timeout: 30_000 }, () => {
  const executor = new SandboxExecutor();

  it("deve executar código TypeScript válido com testes públicos e ocultos e retornar SUCCESS", async () => {
    const res = await executor.execute({
      language: LinguagemDesafio.TYPESCRIPT,
      sourceCode: `
        export function classificarGasto(rcl: number, despesa: number): string {
          const pct = (despesa / rcl) * 100;
          if (pct > 54) return "ACIMA_DO_LIMITE";
          return "REGULAR";
        }
      `,
      testHarness: `
        describe("Testes Públicos", () => {
          it("classifica gasto regular", () => {
            expect(classificarGasto(1000, 400)).toBe("REGULAR");
          });
        });
      `,
      hiddenTestHarness: `
        describe("Testes Ocultos", () => {
          it("classifica gasto acima do limite", () => {
            expect(classificarGasto(1000, 600)).toBe("ACIMA_DO_LIMITE");
          });
        });
      `,
      limits: {
        timeoutSeconds: 5,
        memoryLimitMb: 512,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(res.status).toBe("SUCCESS");
    expect(res.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(res.memoryPeakKb).toBeGreaterThan(0);
    expect(res.linterScore).toBe(100);
    expect(res.testResults).toHaveLength(2);
    expect(res.testResults.every((t) => t.status === "PASSED")).toBe(true);
    expect(res.testResults.some((t) => t.isHidden === true)).toBe(true);
  });

  it("deve executar código Python válido e detectar falha de asserção como TEST_FAILURE", async () => {
    const resSucesso = await executor.execute({
      language: LinguagemDesafio.PYTHON,
      sourceCode: `
def calcular_multa(atraso_dias: int) -> int:
    if atraso_dias <= 0:
        return 0
    return atraso_dias * 50
`,
      testHarness: `
def test_sem_atraso():
    assert calcular_multa(0) == 0

def test_com_atraso():
    assert calcular_multa(4) == 200
`,
      limits: {
        timeoutSeconds: 5,
        memoryLimitMb: 256,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resSucesso.status).toBe("SUCCESS");
    expect(resSucesso.testResults).toHaveLength(2);
    expect(resSucesso.testResults.every((t) => t.status === "PASSED")).toBe(true);

    const resFalha = await executor.execute({
      language: LinguagemDesafio.PYTHON,
      sourceCode: `
def calcular_multa(atraso_dias: int) -> int:
    return 0
`,
      testHarness: `
def test_com_atraso():
    assert calcular_multa(4) == 200
`,
      limits: {
        timeoutSeconds: 5,
        memoryLimitMb: 256,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resFalha.status).toBe("TEST_FAILURE");
    expect(resFalha.testResults[0].status).toBe("FAILED");
  });

  it("deve compilar e executar código Java válido e retornar COMPILE_ERROR para erro de sintaxe", async () => {
    const resJavaOk = await executor.execute({
      language: LinguagemDesafio.JAVA,
      sourceCode: `
public class Solution {
    public static int somarEmpenhos(int a, int b) {
        return a + b;
    }
}
`,
      testHarness: `
@Test
void deveSomarCorretamente() {
    assertEquals(150, Solution.somarEmpenhos(100, 50));
}
`,
      limits: {
        timeoutSeconds: 10,
        memoryLimitMb: 512,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resJavaOk.status).toBe("SUCCESS");
    expect(resJavaOk.testResults).toHaveLength(1);
    expect(resJavaOk.testResults[0].status).toBe("PASSED");

    const resJavaErroCompilacao = await executor.execute({
      language: LinguagemDesafio.JAVA,
      sourceCode: `
public class Solution {
    public static int somarEmpenhos(int a, int b) {
        return a + ; // erro de sintaxe
    }
}
`,
      testHarness: `
@Test
void deveSomarCorretamente() {
    assertEquals(150, Solution.somarEmpenhos(100, 50));
}
`,
      limits: {
        timeoutSeconds: 10,
        memoryLimitMb: 512,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resJavaErroCompilacao.status).toBe("COMPILE_ERROR");
    expect(resJavaErroCompilacao.compilerOutput).toBeDefined();
  });

  it("deve interromper execução com loop infinito retornando status TIMEOUT e bloquear acesso à rede externa", async () => {
    const resTimeout = await executor.execute({
      language: LinguagemDesafio.TYPESCRIPT,
      sourceCode: `
        export function loopInfinito(): number {
          while (true) {}
          return 1;
        }
      `,
      testHarness: `
        describe("Timeout", () => {
          it("trava no loop", () => {
            expect(loopInfinito()).toBe(1);
          });
        });
      `,
      limits: {
        timeoutSeconds: 1,
        memoryLimitMb: 256,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resTimeout.status).toBe("TIMEOUT");

    const resRedeBloqueada = await executor.execute({
      language: LinguagemDesafio.TYPESCRIPT,
      sourceCode: `
        export async function tentarExfiltrarDados(): Promise<string> {
          const r = await fetch("https://example.com");
          return await r.text();
        }
      `,
      testHarness: `
        describe("Isolamento de Rede", () => {
          it("deve falhar ao tentar acessar rede externa", async () => {
            await tentarExfiltrarDados();
          });
        });
      `,
      limits: {
        timeoutSeconds: 3,
        memoryLimitMb: 256,
        cpuQuota: 1.0,
        network: "none",
      },
    });

    expect(resRedeBloqueada.status).toBe("TEST_FAILURE");
    expect(resRedeBloqueada.testResults[0].status).toBe("FAILED");
    expect(resRedeBloqueada.testResults[0].failureMessage).toMatch(
      /rede|network|disabled|bloquead/i
    );
  });

  it("não repassa segredos do processo ao código do candidato", () => {
    vi.stubEnv("DATABASE_URL", "postgres://segredo");
    vi.stubEnv("AUTH_SECRET", "segredo");
    const env = ambienteSandbox("/tmp/ws");
    vi.unstubAllEnvs();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.PATH).toBeTruthy();
    expect(env.HOME).toBe("/tmp/ws");
  });

  const limitesPython = {
    timeoutSeconds: 5,
    memoryLimitMb: 256,
    cpuQuota: 1.0,
    network: "none" as const,
  };

  it("mata processos em segundo plano deixados pelo candidato ao fim da execução", async () => {
    const marcador = path.join(os.tmpdir(), `devtest-marcador-${crypto.randomUUID()}`);
    const res = await executor.execute({
      language: LinguagemDesafio.PYTHON,
      sourceCode: `
import subprocess
subprocess.Popen(["sh", "-c", "sleep 1; touch ${marcador}"])
`,
      testHarness: `
def test_ok():
    assert True
`,
      limits: limitesPython,
    });
    expect(res.status).toBe("SUCCESS");

    await new Promise((r) => setTimeout(r, 1500));
    expect(fs.existsSync(marcador)).toBe(false);
  });

  it("executa uma submissão por vez no modo sem container", async () => {
    const payload = {
      language: LinguagemDesafio.PYTHON,
      sourceCode: `
import time
time.sleep(0.8)
`,
      testHarness: `
def test_ok():
    assert True
`,
      limits: limitesPython,
    };
    const inicio = Date.now();
    const local = new SandboxExecutor({ useDockerContainer: false });
    const [a, b] = await Promise.all([local.execute(payload), local.execute(payload)]);
    expect(a.status).toBe("SUCCESS");
    expect(b.status).toBe("SUCCESS");
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(1600);
  });
});
