import { NextResponse } from "next/server";
import { z } from "zod";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import { calcularPontuacaoBarema } from "@/domain/candidato/candidato-barema";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getRepository as getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

const ItemInscricaoBaremaSchema = z.object({
  criterioId: z.string().min(1, "O ID do critério é obrigatório."),
  quantidadeOuAnos: z.number().min(0, "A quantidade deve ser zero ou positiva."),
  arquivoComprovanteNome: z.string().optional(),
  arquivoComprovanteBase64: z.string().optional(),
});

const AtualizarInscricaoSchema = z.object({
  itensBarema: z.array(ItemInscricaoBaremaSchema).default([]),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(id);

    if (!inscricao) {
      return NextResponse.json(
        { sucesso: false, erro: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    const negado = await negarAcessoAoCandidato(request, inscricao.candidatoId);
    if (negado) return negado;

    return NextResponse.json({ sucesso: true, inscricao });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao consultar inscrição." },
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
    const parse = AtualizarInscricaoSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: parse.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(id);

    if (!inscricao) {
      return NextResponse.json(
        { sucesso: false, erro: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    const negado = await negarAcessoAoCandidato(request, inscricao.candidatoId);
    if (negado) return negado;

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(inscricao.processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { sucesso: false, erro: "Processo Seletivo vinculado não encontrado." },
        { status: 404 }
      );
    }

    // Valida período de inscrições abertas
    const agoraMs = Date.now();
    const inicioMs = new Date(processo.inicioInscricoes).getTime();
    const fimDate = new Date(processo.fimInscricoes);
    if (
      fimDate.getUTCHours() === 0 &&
      fimDate.getUTCMinutes() === 0 &&
      fimDate.getUTCSeconds() === 0
    ) {
      fimDate.setUTCHours(23, 59, 59, 999);
    }
    const fimMs = fimDate.getTime();

    if (agoraMs < inicioMs || agoraMs > fimMs) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "O período de inscrições para este Processo Seletivo já está encerrado. Alterações e novos documentos bloqueados.",
        },
        { status: 403 }
      );
    }

    if (inscricao.statusAuditoriaBarema && inscricao.statusAuditoriaBarema !== "PENDENTE") {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Esta inscrição já foi avaliada/auditada pela Banca Avaliadora e não pode mais ser alterada.",
        },
        { status: 403 }
      );
    }

    const { itensBarema } = parse.data;
    const extratoBarema = calcularPontuacaoBarema(
      processo.barema,
      itensBarema
    );

    if (extratoBarema.errosValidacao && extratoBarema.errosValidacao.length > 0) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: extratoBarema.errosValidacao,
        },
        { status: 400 }
      );
    }

    const atualizada = await candRepo.atualizarItensBaremaInscricao(id, {
      itensBarema,
      pontuacaoProvisoriaBarema: extratoBarema.pontuacaoProvisoriaBarema,
      extratoBarema: extratoBarema as any,
    });

    return NextResponse.json({
      sucesso: true,
      inscricao: atualizada,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro inesperado ao atualizar inscrição." },
      { status: 500 }
    );
  }
}
