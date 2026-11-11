import { NextResponse } from "next/server";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import { z } from "zod";
import { calcularPontuacaoBarema } from "@/domain/candidato/candidato-barema";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getRepository as getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

const ItemInscricaoBaremaSchema = z.object({
  criterioId: z.string().min(1, "O ID do critério é obrigatório."),
  quantidadeOuAnos: z.number().min(0, "A quantidade deve ser zero ou positiva."),
  arquivoComprovanteNome: z.string().optional(),
  arquivoComprovanteBase64: z.string().optional(),
});

const CriarInscricaoSchema = z.object({
  candidatoId: z.string().min(1, "Identificação do candidato é obrigatória."),
  processoSeletivoId: z.string().min(1, "Identificação do Processo Seletivo é obrigatória."),
  trilhaId: z.string().min(1, "Identificação da Trilha técnica é obrigatória."),
  itensBarema: z.array(ItemInscricaoBaremaSchema).default([]),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const candidatoId = searchParams.get("candidatoId");
    const negado = await negarAcessoAoCandidato(request, candidatoId);
    if (negado) return negado;

    const repo = getCandidatoRepository();
    if (candidatoId) {
      const inscricoes = await repo.buscarInscricoesPorCandidato(candidatoId);
      return NextResponse.json({ sucesso: true, inscricoes });
    }

    return NextResponse.json(
      { sucesso: false, erro: "Parâmetro 'candidatoId' é obrigatório para listagem." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro ao consultar inscrições." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parse = CriarInscricaoSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: parse.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { candidatoId, processoSeletivoId, trilhaId, itensBarema } = parse.data;
    const negado = await negarAcessoAoCandidato(request, candidatoId);
    if (negado) return negado;

    const candRepo = getCandidatoRepository();
    const candidato = await candRepo.buscarCandidatoPorId(candidatoId);
    if (!candidato) {
      return NextResponse.json(
        { sucesso: false, erro: "Candidato não encontrado." },
        { status: 404 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { sucesso: false, erro: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    // Validação do período de inscrição por timestamp
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

    if (agoraMs < inicioMs) {
      return NextResponse.json(
        { sucesso: false, erro: "O período de inscrições para este Processo Seletivo ainda não iniciou." },
        { status: 400 }
      );
    }
    if (agoraMs > fimMs) {
      return NextResponse.json(
        { sucesso: false, erro: "O período de inscrições para este Processo Seletivo já se encerrou." },
        { status: 400 }
      );
    }

    const trilha = processo.trilhas.find((t) => t.id === trilhaId);
    if (!trilha) {
      return NextResponse.json(
        { sucesso: false, erro: "Trilha técnica não pertence a este Processo Seletivo." },
        { status: 400 }
      );
    }

    // Verificar se já está inscrito nesta trilha deste Processo Seletivo (par processo/trilha único)
    const inscricaoTrilhaExistente = await candRepo.buscarInscricaoPorCandidatoProcessoETrilha(
      candidatoId,
      processoSeletivoId,
      trilhaId
    );
    if (inscricaoTrilhaExistente) {
      return NextResponse.json(
        { sucesso: false, erro: "O candidato já está inscrito nesta trilha deste Processo Seletivo." },
        { status: 409 }
      );
    }

    // Cálculo da pontuação do Barema
    const extratoBarema = calcularPontuacaoBarema(processo.barema, itensBarema);

    const inscricao = await candRepo.criarInscricao({
      candidatoId: candidato.id,
      candidatoNome: candidato.nome,
      candidatoEmail: candidato.email,
      candidatoCpf: candidato.cpf,
      processoSeletivoId: processo.id,
      processoSeletivoTitulo: processo.titulo,
      trilhaId: trilha.id,
      trilhaNome: trilha.nome,
      itensBarema,
      pontuacaoProvisoriaBarema: extratoBarema.pontuacaoProvisoriaBarema,
      extratoBarema,
    });

    return NextResponse.json(
      {
        sucesso: true,
        inscricao,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro interno ao realizar inscrição." },
      { status: 500 }
    );
  }
}
