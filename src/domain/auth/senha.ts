import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt) as (
  senha: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const PREFIXO = "scrypt";
const TAMANHO_CHAVE = 32;

/** Formato: scrypt$<salt hex>$<hash hex> (cabe em VARCHAR(128)). */
export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(senha, salt, TAMANHO_CHAVE);
  return `${PREFIXO}$${salt}$${hash.toString("hex")}`;
}

export async function verificarSenha(
  senha: string,
  hashArmazenado: string
): Promise<boolean> {
  if (!hashArmazenado) return false;
  const [prefixo, salt, hashHex] = hashArmazenado.split("$");

  if (prefixo !== PREFIXO || !salt || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  if (esperado.length === 0) return false;
  const calculado = await scrypt(senha, salt, esperado.length);
  return crypto.timingSafeEqual(calculado, esperado);
}
