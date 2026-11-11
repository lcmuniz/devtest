import { describe, it, expect } from "vitest";
import {
  validarRunnerPayload,
  construirComandoDockerSandbox,
  avaliarQualidadeCodigoEstatico,
  RunnerPayload,
} from "./runner-contract";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

describe("Domínio Runner: Contrato, Segurança Docker e Análise Estática (Seam 1)", () => {
  const payloadValido: RunnerPayload = {
    language: LinguagemDesafio.TYPESCRIPT,
    sourceCode: "export function somar(a: number, b: number): number {\n  return a + b;\n}",
    testHarness:
      "import { describe, it, expect } from 'vitest';\nimport { somar } from './solution';\ndescribe('Soma', () => { it('2+3=5', () => { expect(somar(2,3)).toBe(5); }); });",
    limits: {
      timeoutSeconds: 10,
      memoryLimitMb: 512,
      cpuQuota: 1.0,
      network: "none",
    },
  };

  it("deve validar um payload de execução do Runner com limites seguros e rede 'none'", () => {
    const res = validarRunnerPayload(payloadValido);
    expect(res.valido).toBe(true);
    expect(res.dados?.limits.network).toBe("none");
    expect(res.dados?.limits.memoryLimitMb).toBe(512);
  });

  it("deve construir argumentos de container Docker efêmero com isolamento estrito (--rm, --network none, --read-only, --user 1000:1000, limites de RAM e CPU)", () => {
    const cmd = construirComandoDockerSandbox(payloadValido, "/tmp/sandbox-job-123");

    expect(cmd.executable).toBe("docker");
    expect(cmd.args).toContain("run");
    expect(cmd.args).toContain("--rm");
    expect(cmd.args).toContain("--network");
    expect(cmd.args).toContain("none");
    expect(cmd.args).toContain("--read-only");
    expect(cmd.args).toContain("--user");
    expect(cmd.args).toContain("1000:1000");
    expect(cmd.args).toContain("--memory");
    expect(cmd.args).toContain("512m");
    expect(cmd.args).toContain("--cpus");
    expect(cmd.args).toContain("1");
    expect(cmd.args).toContain("--pids-limit");
    expect(cmd.args).toContain("64");
    expect(cmd.args.some((arg) => arg.includes("/tmp/sandbox-job-123:/workspace:ro"))).toBe(
      true
    );
    expect(cmd.args).toContain(cmd.nomeContainer);
    expect(cmd.args.at(-1)).toContain("node runner.cjs");

    const cmdPython = construirComandoDockerSandbox(
      { ...payloadValido, language: LinguagemDesafio.PYTHON },
      "/tmp/sandbox-job-123"
    );
    expect(cmdPython.args.at(-1)).toContain("python3 test_runner.py");
  });

  it("deve calcular linterScore alto para código limpo e penalizar código com más práticas e alta complexidade", () => {
    const scoreLimpo = avaliarQualidadeCodigoEstatico(
      LinguagemDesafio.TYPESCRIPT,
      "export function calcularTaxa(valor: number): number {\n  if (valor <= 0) return 0;\n  return valor * 0.15;\n}\n"
    );

    const codigoRuim = `
      export function processar(x: any) {
        var resultado: any = eval("x + 1");
        if (x > 1) { if (x > 2) { if (x > 3) { if (x > 4) { if (x > 5) { if (x > 6) {
          console.log(resultado);
        }}}}}}
        return resultado;
      }
    `;
    const scoreRuim = avaliarQualidadeCodigoEstatico(
      LinguagemDesafio.TYPESCRIPT,
      codigoRuim
    );

    expect(scoreLimpo.linterScore).toBe(100);
    expect(scoreLimpo.violations).toHaveLength(0);
    expect(scoreRuim.linterScore).toBeLessThan(75);
    expect(scoreRuim.violations.length).toBeGreaterThanOrEqual(3);
  });
});
