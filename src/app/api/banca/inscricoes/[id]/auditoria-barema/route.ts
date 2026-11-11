import { NextResponse } from "next/server";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  auditarItensBarema,
  DecisaoAuditoriaItemInput,
} from "@/domain/banca/painel-banca";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inscricaoId } = await context.params;
    const body = await request.json();
    const decisoes: DecisaoAuditoriaItemInput[] = Array.isArray(body?.decisoes)
      ? body.decisoes
      : [];

    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(inscricaoId);
    if (!inscricao) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
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

    const resultadoAuditoria = auditarItensBarema(
      processo.barema,
      inscricao.itensBarema,
      decisoes
    );

    if (
      resultadoAuditoria.errosValidacao &&
      resultadoAuditoria.errosValidacao.length > 0
    ) {
      return NextResponse.json(
        {
          error: resultadoAuditoria.errosValidacao[0],
          errors: resultadoAuditoria.errosValidacao,
        },
        { status: 400 }
      );
    }

    const atualizado = await candRepo.atualizarAuditoriaBarema(inscricaoId, {
      pontuacaoHomologadaBarema: resultadoAuditoria.pontuacaoHomologadaBarema,
      statusAuditoriaBarema: resultadoAuditoria.statusAuditoriaGeral,
      auditoriaBarema: resultadoAuditoria.itensAuditados,
    });

    if (!atualizado) {
      return NextResponse.json(
        { error: "Falha ao atualizar auditoria da inscrição." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inscricaoId: atualizado.id,
      codigoAnonimo: atualizado.codigoAnonimo,
      pontuacaoProvisoriaBarema: atualizado.pontuacaoProvisoriaBarema,
      pontuacaoHomologadaBarema: atualizado.pontuacaoHomologadaBarema,
      statusAuditoriaBarema: atualizado.statusAuditoriaBarema,
      itensBaremaAuditados: atualizado.auditoriaBarema,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao registrar auditoria do Barema.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
