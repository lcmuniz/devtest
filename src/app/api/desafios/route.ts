import { NextResponse } from "next/server";
import {
  validarDesafio,
  sanitizarDesafioParaCandidato,
} from "@/domain/desafio/desafio";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const processoSeletivoId = url.searchParams.get("processoSeletivoId") || undefined;
    const trilhaId = url.searchParams.get("trilhaId") || undefined;
    const linguagem = url.searchParams.get("linguagem") || undefined;
    const visao = url.searchParams.get("visao");

    const repository = getDesafioRepository();
    const desafiosCompletos = await repository.findAll({
      processoSeletivoId,
      trilhaId,
      linguagem,
    });

    const desafios =
      visao === "banca"
        ? desafiosCompletos
        : desafiosCompletos.map(sanitizarDesafioParaCandidato);

    return NextResponse.json({
      sucesso: true,
      desafios,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro ao listar desafios."],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const desafio = await repository.create(validacao.dados!);

    return NextResponse.json(
      {
        sucesso: true,
        desafio,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro inesperado ao criar desafio."],
      },
      { status: 500 }
    );
  }
}
