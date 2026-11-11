import { NextResponse } from "next/server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const psRepo = getProcessoSeletivoRepository();

    const atualizado = await psRepo.encerrarEtapaAnonima(id);
    if (!atualizado) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: atualizado.id,
      titulo: atualizado.titulo,
      etapaAnonimaEncerrada: true,
      janelaRecursosAberta: true,
      modoCorrecaoCega: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao encerrar a etapa anônima do processo seletivo.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
