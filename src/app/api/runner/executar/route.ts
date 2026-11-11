import crypto from "crypto";
import { NextResponse } from "next/server";
import { validarRunnerPayload } from "@/domain/runner/runner-contract";
import { SandboxExecutor } from "@/infrastructure/runner/sandbox-executor";

function tokenValido(recebido: string, esperado: string): boolean {
  // Compara hashes para ter o mesmo tamanho no timingSafeEqual
  const a = crypto.createHash("sha256").update(recebido).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Endpoint interno do serviço de runner. Só existe na instância com
 * RUNNER_SERVICE=true, que roda sem credenciais do banco nem AUTH_SECRET.
 */
export async function POST(request: Request) {
  const esperado = process.env.RUNNER_TOKEN;
  if (process.env.RUNNER_SERVICE !== "true" || !esperado) {
    return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  }

  const auth = request.headers.get("authorization") || "";
  const recebido = auth.startsWith("Bearer ") ? auth.substring(7) : "";
  if (!tokenValido(recebido, esperado)) {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  try {
    const validacao = validarRunnerPayload(await request.json());
    if (!validacao.valido) {
      return NextResponse.json({ erros: validacao.erros }, { status: 400 });
    }
    const resultado = await new SandboxExecutor().execute(validacao.dados!);
    return NextResponse.json({ resultado });
  } catch (error: any) {
    return NextResponse.json(
      { erro: error?.message || "Falha na execução." },
      { status: 500 }
    );
  }
}
