import { NextResponse } from "next/server";
import { COOKIE_SESSAO_NOME } from "@/domain/auth/autenticacao-rbac";

export async function POST() {
  const response = NextResponse.json({ sucesso: true });
  response.cookies.set(COOKIE_SESSAO_NOME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
