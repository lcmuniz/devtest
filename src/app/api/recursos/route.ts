import { NextResponse } from "next/server";
import { negarAcessoAoCandidato } from "@/infrastructure/auth/session-server";
import { getRecursoRepository } from "@/infrastructure/repositories/recurso-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  AlvoContestacaoRecurso,
  validarInterposicaoRecurso,
} from "@/domain/recurso/homologacao-recurso";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const processoSeletivoId =
      url.searchParams.get("processoSeletivoId") || undefined;
    const inscricaoId = url.searchParams.get("inscricaoId") || undefined;

    // Candidato só lista recursos da própria inscrição; sem inscricaoId, só a Banca.
    const donoInscricao = inscricaoId
      ? (await getCandidatoRepository().buscarInscricaoPorId(inscricaoId))?.candidatoId
      : undefined;
    const negado = await negarAcessoAoCandidato(request, donoInscricao);
    if (negado) return negado;

    const repo = getRecursoRepository();
    const recursos = await repo.findAll({ processoSeletivoId, inscricaoId });

    return NextResponse.json({ recursos });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao listar recursos.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inscricaoId = String(body?.inscricaoId || "");
    const candidatoId = String(body?.candidatoId || "");
    const alvoContestacao = body?.alvoContestacao as AlvoContestacaoRecurso;
    const fundamentacao = String(body?.fundamentacao || "");

    const negado = await negarAcessoAoCandidato(request, candidatoId);
    if (negado) return negado;

    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(inscricaoId);
    if (!inscricao) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    if (inscricao.candidatoId !== candidatoId) {
      return NextResponse.json(
        {
          error:
            "Acesso negado: você só pode interpor recurso para sua própria inscrição.",
        },
        { status: 403 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(inscricao.processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const validacao = validarInterposicaoRecurso({
      inscricaoId,
      candidatoId,
      alvoContestacao,
      fundamentacao,
      janelaRecursosAberta: Boolean(processo.janelaRecursosAberta),
    });

    if (!validacao.valido) {
      return NextResponse.json({ error: validacao.erro }, { status: 400 });
    }

    const recRepo = getRecursoRepository();
    const criado = await recRepo.create({
      inscricaoId,
      processoSeletivoId: processo.id,
      candidatoId,
      codigoAnonimo: inscricao.codigoAnonimo,
      alvoContestacao,
      fundamentacao: fundamentacao.trim(),
    });

    return NextResponse.json(criado, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao registrar o recurso.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
