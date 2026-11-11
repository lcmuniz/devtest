import { NextResponse } from "next/server";
import { validarProcessoSeletivo } from "@/domain/processo-seletivo/processo-seletivo";
import { getRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repository = getRepository();
    const processoSeletivo = await repository.findById(id);

    if (!processoSeletivo) {
      return NextResponse.json(
        { sucesso: false, erro: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      processoSeletivo,
    });
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, erro: "Erro ao buscar processo seletivo." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validacao = validarProcessoSeletivo(body);

    if (!validacao.valido) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: validacao.erros,
        },
        { status: 400 }
      );
    }

    const repository = getRepository();
    const atualizado = await repository.update(id, validacao.dados!);

    if (!atualizado) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Processo Seletivo não encontrado para atualização."],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      processoSeletivo: atualizado,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro inesperado ao atualizar processo seletivo."],
      },
      { status: 500 }
    );
  }
}
