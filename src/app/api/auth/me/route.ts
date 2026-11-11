import { NextResponse } from "next/server";
import { obterSessaoRequisicao } from "@/infrastructure/auth/session-server";

export async function GET(request: Request) {
  const sessao = await obterSessaoRequisicao(request);

  if (!sessao) {
    return NextResponse.json(
      { autenticado: false, usuario: null },
      { status: 401 }
    );
  }

  return NextResponse.json({
    autenticado: true,
    usuario: sessao,
  });
}
