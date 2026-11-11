import { RunnerPayload, RunnerResult } from "@/domain/runner/runner-contract";

/**
 * Executa o código do candidato num serviço de runner separado (RUNNER_URL),
 * que roda sem DATABASE_URL/AUTH_SECRET. Ver README, "Runner isolado".
 */
export class RemoteRunnerExecutor {
  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  async execute(payload: RunnerPayload): Promise<RunnerResult> {
    const res = await fetch(`${this.url.replace(/\/+$/, "")}/api/runner/executar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Serviço de runner respondeu ${res.status}.`);
    }
    const data = await res.json();
    return data.resultado as RunnerResult;
  }
}
