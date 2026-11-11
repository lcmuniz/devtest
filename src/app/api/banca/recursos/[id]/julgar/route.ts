import { NextResponse } from "next/server";
import { getRecursoRepository } from "@/infrastructure/repositories/recurso-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import { aplicarJulgamentoRecurso } from "@/domain/recurso/homologacao-recurso";
import { getEmailService } from "@/infrastructure/services/email-service";
import { gerarEmailParecerRecurso } from "@/domain/notificacao/notificacao";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recursoId } = await context.params;
    const body = await request.json();

    const decisao = body?.decisao as "DEFERIDO" | "INDEFERIDO";
    const parecerBanca = String(body?.parecerBanca || "");
    const novaPontuacaoAlvo =
      body?.novaPontuacaoAlvo !== undefined &&
      body?.novaPontuacaoAlvo !== null &&
      String(body?.novaPontuacaoAlvo).trim() !== ""
        ? Number(body.novaPontuacaoAlvo)
        : undefined;

    const recRepo = getRecursoRepository();
    const recurso = await recRepo.findById(recursoId);
    if (!recurso) {
      return NextResponse.json(
        { error: "Recurso não encontrado." },
        { status: 404 }
      );
    }

    const candRepo = getCandidatoRepository();
    const inscricao = await candRepo.buscarInscricaoPorId(recurso.inscricaoId);
    if (!inscricao) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(recurso.processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const subRepo = getSubmissaoRepository();
    const submissoes = await subRepo.findAll({
      inscricaoId: inscricao.id,
    });
    const submissao = submissoes[0];

    const notaTecnicaAtual = submissao ? submissao.notaTecnicaTotal : 0;
    const notaBaremaAtual =
      inscricao.statusAuditoriaBarema === "AUDITADO" &&
      inscricao.pontuacaoHomologadaBarema !== null &&
      inscricao.pontuacaoHomologadaBarema !== undefined
        ? inscricao.pontuacaoHomologadaBarema
        : inscricao.pontuacaoProvisoriaBarema;

    const resultado = aplicarJulgamentoRecurso({
      alvoContestacao: recurso.alvoContestacao,
      decisao,
      parecerBanca,
      novaPontuacaoAlvo,
      notaTecnicaAtual,
      notaBaremaAtual,
      notaCorteMinima: processo.notaCorteMinima,
    });

    if (!resultado.valido) {
      return NextResponse.json({ error: resultado.erro }, { status: 400 });
    }

    const recursoJulgado = await recRepo.registrarJulgamento(recursoId, {
      status: decisao,
      parecerBanca: parecerBanca.trim(),
      novaPontuacaoAlvo: decisao === "DEFERIDO" ? novaPontuacaoAlvo : null,
    });

    // Se DEFERIDO, atualiza a nota correspondente (Barema ou Prova Prática) para recalcular o ranking
    if (decisao === "DEFERIDO") {
      if (recurso.alvoContestacao === "BAREMA") {
        await candRepo.atualizarAuditoriaBarema(inscricao.id, {
          pontuacaoHomologadaBarema: resultado.notaBaremaAjustada,
          statusAuditoriaBarema: "AUDITADO",
          auditoriaBarema: inscricao.auditoriaBarema ?? [],
        });
      } else if (recurso.alvoContestacao === "PROVA_PRATICA" && submissao) {
        await subRepo.updateNotaTecnica(inscricao.id, {
          notaTecnicaTotal: resultado.notaTecnicaAjustada,
          atendeNotaCorte: resultado.atendeNotaCorteAjustado,
          statusClassificacao: resultado.atendeNotaCorteAjustado
            ? "CLASSIFICADO"
            : "DESCLASSIFICADO_NOTA_CORTE",
        });
      }
    }

    if (inscricao.candidatoEmail) {
      try {
        const emailContent = gerarEmailParecerRecurso({
          candidatoNome: inscricao.candidatoNome || "Candidato",
          candidatoEmail: inscricao.candidatoEmail,
          codigoAnonimo: recurso.codigoAnonimo,
          processoTitulo: processo.titulo,
          edital: processo.edital,
          alvoContestacao: recurso.alvoContestacao,
          decisao,
          parecerBanca: parecerBanca.trim(),
          novaPontuacao:
            decisao === "DEFERIDO"
              ? recurso.alvoContestacao === "PROVA_PRATICA"
                ? resultado.notaTecnicaAjustada
                : resultado.notaBaremaAjustada
              : undefined,
        });

        const emailService = getEmailService();
        await emailService.sendEmail({
          to: emailContent.destinatario,
          subject: emailContent.assunto,
          text: emailContent.corpoTexto,
          html: emailContent.corpoHtml,
          tipo: "PARECER_RECURSO",
          metadata: {
            recursoId,
            processoSeletivoId: processo.id,
            inscricaoId: inscricao.id,
            decisao,
          },
        });
      } catch (err) {
        console.error("Erro ao enviar e-mail de notificação de recurso:", err);
      }
    }

    return NextResponse.json({
      recurso: recursoJulgado,
      notaTecnicaAjustada: resultado.notaTecnicaAjustada,
      notaBaremaAjustada: resultado.notaBaremaAjustada,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro interno ao julgar o recurso.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
