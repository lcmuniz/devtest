import { NextResponse } from "next/server";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";
import {
  sortearDesafiosPorLinguagem,
  CotasLinguagemSorteio,
} from "@/domain/desafio/desafio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processoSeletivoId } = await params;
    const repo = getDesafioRepository();
    const desafios = await repo.listarDesafiosDoProcesso(processoSeletivoId);
    return NextResponse.json({ sucesso: true, desafios });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error?.message || "Erro ao listar desafios do processo." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processoSeletivoId } = await params;
    const body = await request.json();
    const repo = getDesafioRepository();

    // Modo 1: Sorteio aleatório por cotas de linguagem e categorias
    if (body.sorteio && typeof body.sorteio === "object") {
      const cotas: CotasLinguagemSorteio = body.sorteio;
      const categorias: string[] | undefined = Array.isArray(body.categorias) ? body.categorias : undefined;
      const bancoCompleto = await repo.findAll();
      const sorteados = sortearDesafiosPorLinguagem(bancoCompleto, cotas, categorias);
      const idsSorteados = sorteados.map((d) => d.id);

      await repo.vincularDesafiosAoProcesso(processoSeletivoId, idsSorteados);
      const atualizados = await repo.listarDesafiosDoProcesso(processoSeletivoId);

      return NextResponse.json({
        sucesso: true,
        sorteados: idsSorteados,
        desafios: atualizados,
      });
    }

    // Modo 2: Vínculo explícito de IDs
    const desafiosIds: string[] = Array.isArray(body.desafiosIds)
      ? body.desafiosIds
      : body.desafioId
      ? [body.desafioId]
      : [];

    if (desafiosIds.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: "Nenhum desafioId ou desafiosIds fornecido." },
        { status: 400 }
      );
    }

    await repo.vincularDesafiosAoProcesso(processoSeletivoId, desafiosIds);
    const atualizados = await repo.listarDesafiosDoProcesso(processoSeletivoId);

    return NextResponse.json({
      sucesso: true,
      desafios: atualizados,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error?.message || "Erro ao vincular desafios ao processo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: processoSeletivoId } = await params;
    const url = new URL(request.url);
    const desafioId = url.searchParams.get("desafioId");

    if (!desafioId) {
      return NextResponse.json(
        { sucesso: false, erro: "Parâmetro desafioId é obrigatório na query string." },
        { status: 400 }
      );
    }

    const repo = getDesafioRepository();
    await repo.desvincularDesafioDoProcesso(processoSeletivoId, desafioId);
    const atualizados = await repo.listarDesafiosDoProcesso(processoSeletivoId);

    return NextResponse.json({
      sucesso: true,
      desafios: atualizados,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error?.message || "Erro ao desvincular desafio do processo." },
      { status: 500 }
    );
  }
}
