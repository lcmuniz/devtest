import { NextResponse } from "next/server";
import { getEmailService } from "@/infrastructure/services/email-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo") || undefined;
    const to = url.searchParams.get("to") || undefined;

    const emailService = getEmailService();
    const mensagens = emailService.getSentEmails({ tipo, to });

    return NextResponse.json({
      total: mensagens.length,
      mensagens,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar histórico de notificações." },
      { status: 500 }
    );
  }
}
