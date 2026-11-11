import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "./route";
import { RemoteRunnerExecutor } from "@/infrastructure/runner/remote-executor";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

const payload = {
  language: LinguagemDesafio.TYPESCRIPT,
  sourceCode: "export function dobrar(x: number): number { return x * 2; }",
  testHarness: `describe("p", () => { it("dobra", () => { expect(dobrar(2)).toBe(4); }); });`,
  limits: { timeoutSeconds: 5, memoryLimitMb: 256, cpuQuota: 1, network: "none" },
};

function req(token?: string) {
  return new Request("http://runner/api/runner/executar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

describe("Serviço de runner isolado (/api/runner/executar)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("não existe fora da instância de runner", async () => {
    vi.stubEnv("RUNNER_SERVICE", "");
    vi.stubEnv("RUNNER_TOKEN", "tok");
    expect((await POST(req("tok"))).status).toBe(404);
  });

  it("exige o RUNNER_TOKEN correto", async () => {
    vi.stubEnv("RUNNER_SERVICE", "true");
    vi.stubEnv("RUNNER_TOKEN", "tok");
    expect((await POST(req())).status).toBe(401);
    expect((await POST(req("errado"))).status).toBe(401);
  });

  it("o cliente remoto executa o código pelo serviço", async () => {
    vi.stubEnv("RUNNER_SERVICE", "true");
    vi.stubEnv("RUNNER_TOKEN", "tok");
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      POST(new Request(url, init))
    );

    const resultado = await new RemoteRunnerExecutor("http://runner/", "tok").execute(
      payload as any
    );
    expect(resultado.status).toBe("SUCCESS");

    await expect(
      new RemoteRunnerExecutor("http://runner", "errado").execute(payload as any)
    ).rejects.toThrow("401");
  });
});
