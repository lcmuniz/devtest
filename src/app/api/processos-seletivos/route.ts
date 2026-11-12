import { NextResponse } from "next/server";
import { validarProcessoSeletivo } from "@/domain/processo-seletivo/processo-seletivo";
import { getRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

export async function GET(request: Request) {
  try {
    const repository = getRepository();
    const processosSeletivos = await repository.findAll();
    return NextResponse.json({
      sucesso: true,
      processosSeletivos,
    });
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, erro: "Erro ao buscar processos seletivos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const processoSeletivo = await repository.create(validacao.dados!);

    // Composição de Desafios opcional na criação (IDs explícitos ou sorteio por cotas)
    const { getDesafioRepository } = await import(
      "@/infrastructure/repositories/desafio-repository"
    );
    const { sortearDesafiosPorLinguagem } = await import(
      "@/domain/desafio/desafio"
    );
    const desafioRepo = getDesafioRepository();

    if (body.desafiosPorTrilha && typeof body.desafiosPorTrilha === "object") {
      for (const [trilhaId, ids] of Object.entries(body.desafiosPorTrilha)) {
        if (Array.isArray(ids) && ids.length > 0) {
          await desafioRepo.vincularDesafiosAoProcesso(
            processoSeletivo.id,
            ids as string[],
            trilhaId
          );
        }
      }
    } else if (body.sorteio && typeof body.sorteio === "object") {
      const banco = await desafioRepo.findAll();
      const sorteados = sortearDesafiosPorLinguagem(banco, body.sorteio);
      await desafioRepo.vincularDesafiosAoProcesso(
        processoSeletivo.id,
        sorteados.map((d) => d.id),
        body.trilhaId
      );
    } else if (Array.isArray(body.desafiosIds) && body.desafiosIds.length > 0) {
      await desafioRepo.vincularDesafiosAoProcesso(
        processoSeletivo.id,
        body.desafiosIds,
        body.trilhaId
      );
    }

    return NextResponse.json(
      {
        sucesso: true,
        processoSeletivo,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erros: [error.message || "Erro inesperado ao criar processo seletivo."],
      },
      { status: 500 }
    );
  }
}
