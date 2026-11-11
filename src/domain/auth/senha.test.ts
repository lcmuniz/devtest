import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { gerarHashSenha, verificarSenha } from "./senha";

describe("Hash de senha (scrypt com salt)", () => {
  it("gera hashes diferentes para a mesma senha e valida apenas a senha correta", async () => {
    const h1 = await gerarHashSenha("senhaSegura123");
    const h2 = await gerarHashSenha("senhaSegura123");
    expect(h1).not.toBe(h2);
    expect(h1.length).toBeLessThanOrEqual(128);
    expect(await verificarSenha("senhaSegura123", h1)).toBe(true);
    expect(await verificarSenha("senhaErrada", h1)).toBe(false);
  });

  it("rejeita hash SHA-256 legado e hashes malformados", async () => {
    const legado = crypto.createHash("sha256").update("antiga").digest("hex");
    expect(await verificarSenha("antiga", legado)).toBe(false);
    expect(await verificarSenha("antiga", "")).toBe(false);
    expect(await verificarSenha("antiga", "scrypt$abc$")).toBe(false);
  });
});
