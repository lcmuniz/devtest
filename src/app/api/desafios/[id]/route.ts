import { NextResponse } from "next/server";
import {
  validarDesafio,
  sanitizarDesafioParaCandidato,
} from "@/domain/desafio/desafio";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const visao = url.searchParams.get("visao");

    const repository = getDesafioRepository();
    const desafio = await repository.findById(id);

    if (!desafio) {
      return NextResponse.json(
        { sucesso: false, erros: ["Desafio não encontrado."] },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      desafio: visao === "banca" ? desafio : sanitizarDesafioParaCandidato(desafio),
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erros: [error.message || "Erro ao buscar desafio."] },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validacao = validarDesafio(body);

    if (!validacao.valido) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: validacao.erros,
        },
        { status: 400 }
      );
    }

    const repository = getDesafioRepository();
    const atualizado = await repository.update(id, validacao.dados!);

    if (!atualizado) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: ["Desafio não encontrado para atualização."],
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      desafio: atualizado,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro inesperado ao atualizar desafio."],
      },
      { status: 500 }
    );
  }
}
