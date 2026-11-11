import { NextRequest, NextResponse } from "next/server";
import {
  avaliarAcessoApi,
  avaliarAcessoRota,
  COOKIE_SESSAO_NOME,
  verificarTokenSessao,
} from "@/domain/auth/autenticacao-rbac";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESSAO_NOME)?.value;
  const sessao = await verificarTokenSessao(token);
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const acesso = avaliarAcessoApi(
      pathname,
      request.method,
      searchParams.get("visao"),
      sessao
    );
    if (!acesso.permitido) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            acesso.status === 401
              ? "Autenticação necessária."
              : "Acesso negado para o seu perfil.",
        },
        { status: acesso.status }
      );
    }
    return NextResponse.next();
  }

  const resultado = avaliarAcessoRota(pathname, sessao);
  if (!resultado.permitido && resultado.redirecionarPara) {
    const urlDestino = new URL(resultado.redirecionarPara, request.url);
    return NextResponse.redirect(urlDestino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/banca/:path*", "/candidato/:path*", "/api/:path*"],
};
