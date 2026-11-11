export type PerfilUsuario = "CANDIDATO" | "BANCA_AVALIADORA";

export const COOKIE_SESSAO_NOME = "devtest_sessao";

function obterSegredo(): string {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) {
    throw new Error(
      "AUTH_SECRET não definido. Gere um com `openssl rand -hex 32`."
    );
  }
  return segredo;
}

export interface SessaoUsuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  perfil: PerfilUsuario;
  expiraEm: number;
}

export interface ResultadoAvaliacaoRota {
  permitido: boolean;
  motivo?: "NAO_AUTENTICADO" | "PERFIL_INSUFICIENTE";
  redirecionarPara?: string;
}

function codificarBase64Url(texto: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(texto, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodificarBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64 + pad, "base64").toString("utf-8");
  }
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * HMAC-SHA256 via Web Crypto: funciona no Node.js e no Edge Runtime (Middleware).
 */
function importarChave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bytesParaBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlParaBytes(b64url: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function gerarTokenSessao(
  sessao: SessaoUsuario,
  segredo: string = obterSegredo()
): Promise<string> {
  const payloadB64 = codificarBase64Url(JSON.stringify(sessao));
  const chave = await importarChave(segredo);
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(payloadB64)
  );
  return `${payloadB64}.${bytesParaBase64Url(new Uint8Array(assinatura))}`;
}

export async function verificarTokenSessao(
  token: string | undefined | null,
  segredo?: string
): Promise<SessaoUsuario | null> {
  if (!token || typeof token !== "string") return null;
  segredo ??= obterSegredo();
  const partes = token.split(".");
  if (partes.length !== 2) return null;

  const [payloadB64, assinaturaB64] = partes;
  const assinatura = base64UrlParaBytes(assinaturaB64);
  if (!assinatura) return null;

  const chave = await importarChave(segredo);
  // verify() compara em tempo constante
  const valida = await crypto.subtle.verify(
    "HMAC",
    chave,
    assinatura,
    new TextEncoder().encode(payloadB64)
  );
  if (!valida) return null;

  try {
    const json = decodificarBase64Url(payloadB64);
    const sessao = JSON.parse(json) as SessaoUsuario;
    if (
      !sessao ||
      !sessao.id ||
      !sessao.perfil ||
      typeof sessao.expiraEm !== "number"
    ) {
      return null;
    }
    if (Date.now() > sessao.expiraEm) {
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

export function avaliarAcessoRota(
  pathname: string,
  sessao: SessaoUsuario | null
): ResultadoAvaliacaoRota {
  if (pathname.startsWith("/banca")) {
    if (!sessao) {
      return {
        permitido: false,
        motivo: "NAO_AUTENTICADO",
        redirecionarPara: `/login?redirect=${encodeURIComponent(pathname)}`,
      };
    }
    if (sessao.perfil !== "BANCA_AVALIADORA") {
      return {
        permitido: false,
        motivo: "PERFIL_INSUFICIENTE",
        redirecionarPara: `/login?erro=acesso_restrito_banca&redirect=${encodeURIComponent(
          pathname
        )}`,
      };
    }
    return { permitido: true };
  }

  if (pathname.startsWith("/candidato")) {
    if (!sessao) {
      return {
        permitido: false,
        motivo: "NAO_AUTENTICADO",
        redirecionarPara: `/login?redirect=${encodeURIComponent(pathname)}`,
      };
    }
    if (sessao.perfil !== "CANDIDATO") {
      return {
        permitido: false,
        motivo: "PERFIL_INSUFICIENTE",
        redirecionarPara: `/login?erro=acesso_restrito_candidato&redirect=${encodeURIComponent(
          pathname
        )}`,
      };
    }
    return { permitido: true };
  }

  return { permitido: true };
}

export interface ResultadoAvaliacaoApi {
  permitido: boolean;
  status?: 401 | 403;
}

/**
 * Política de acesso das rotas /api/* aplicada no middleware.
 * Rotas de candidato ainda verificam no handler se o recurso pertence à sessão.
 */
export function avaliarAcessoApi(
  pathname: string,
  metodo: string,
  visao: string | null,
  sessao: SessaoUsuario | null
): ResultadoAvaliacaoApi {
  let caminho: string;
  try {
    caminho = decodeURIComponent(pathname).replace(/\/+$/, "");
  } catch {
    return { permitido: false, status: 403 };
  }

  const publica =
    caminho.startsWith("/api/auth/") ||
    caminho === "/api/runner/executar" || // autenticado por RUNNER_TOKEN na própria rota
    (caminho === "/api/candidatos" && metodo === "POST");
  if (publica) return { permitido: true };

  if (!sessao) return { permitido: false, status: 401 };

  const escrita = metodo !== "GET" && metodo !== "HEAD";
  const exigeBanca =
    caminho.startsWith("/api/banca/") ||
    visao === "banca" ||
    (caminho === "/api/runner/jobs" && metodo === "POST") ||
    /^\/api\/processos-seletivos\/[^/]+\/desafios$/.test(caminho) ||
    // Candidato recebe os desafios pela página da prova, nunca pela API
    caminho.startsWith("/api/desafios") ||
    (escrita && caminho.startsWith("/api/processos-seletivos"));

  if (exigeBanca && sessao.perfil !== "BANCA_AVALIADORA") {
    return { permitido: false, status: 403 };
  }
  return { permitido: true };
}
