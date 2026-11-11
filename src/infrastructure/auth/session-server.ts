import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_SESSAO_NOME,
  SessaoUsuario,
  verificarTokenSessao,
} from "@/domain/auth/autenticacao-rbac";

export async function obterSessaoServidor(): Promise<SessaoUsuario | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_SESSAO_NOME)?.value;
    return await verificarTokenSessao(token);
  } catch {
    return null;
  }
}

export function extrairTokenSessao(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const partes = cookieHeader.split(";").map((p) => p.trim());
  for (const parte of partes) {
    if (parte.startsWith(`${COOKIE_SESSAO_NOME}=`)) {
      return decodeURIComponent(
        parte.substring(COOKIE_SESSAO_NOME.length + 1)
      );
    }
  }
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export function obterSessaoRequisicao(
  request: Request
): Promise<SessaoUsuario | null> {
  return verificarTokenSessao(extrairTokenSessao(request));
}

/**
 * Candidato só acessa dados do próprio candidatoId; Banca acessa todos.
 * Retorna a resposta de erro, ou null quando o acesso é permitido.
 */
export async function negarAcessoAoCandidato(
  request: Request,
  candidatoId: string | null | undefined
): Promise<NextResponse | null> {
  const sessao = await obterSessaoRequisicao(request);
  if (!sessao) {
    return NextResponse.json(
      { sucesso: false, erro: "Autenticação necessária." },
      { status: 401 }
    );
  }
  if (sessao.perfil === "BANCA_AVALIADORA") return null;
  if (!candidatoId || sessao.id !== candidatoId) {
    return NextResponse.json(
      { sucesso: false, erro: "Acesso negado: recurso de outro candidato." },
      { status: 403 }
    );
  }
  return null;
}
