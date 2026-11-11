import { NextResponse } from "next/server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import {
  CandidatoRankingInput,
  gerarRankingConsolidado,
} from "@/domain/banca/painel-banca";
import { gerarEmailConvocacao } from "@/domain/notificacao/notificacao";
import { getEmailService } from "@/infrastructure/services/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { processoSeletivoId, inscricaoIds, limite, prazoDocumentos } = body;

    if (!processoSeletivoId) {
      return NextResponse.json(
        { error: "O campo processoSeletivoId é obrigatório." },
        { status: 400 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const candRepo = getCandidatoRepository();
    const subRepo = getSubmissaoRepository();

    const [inscricoes, submissoes] = await Promise.all([
      candRepo.buscarInscricoesPorProcesso(processoSeletivoId),
      subRepo.findAll({ processoSeletivoId }),
    ]);

    const submissoesPorInscricao = new Map<string, typeof submissoes>();
    for (const s of submissoes) {
      const lista = submissoesPorInscricao.get(s.inscricaoId) ?? [];
      lista.push(s);
      submissoesPorInscricao.set(s.inscricaoId, lista);
    }

    const entradasRanking: CandidatoRankingInput[] = inscricoes.map((insc) => {
      const subsCandidato = submissoesPorInscricao.get(insc.id) ?? [];
      const submissaoPrincipal = subsCandidato[0];

      const qtd = subsCandidato.length;
      let notaTecnicaTotal = 0;
      let notaCorretude = 0;
      let notaQualidade = 0;
      let notaDesempenho = 0;

      if (qtd > 0) {
        const somaTot = subsCandidato.reduce((a, s) => a + s.notaTecnicaTotal, 0);
        const somaCor = subsCandidato.reduce((a, s) => a + s.notaCorretude, 0);
        const somaQua = subsCandidato.reduce((a, s) => a + s.notaQualidade, 0);
        const somaDes = subsCandidato.reduce((a, s) => a + s.notaDesempenho, 0);

        notaTecnicaTotal = Number((somaTot / qtd).toFixed(2));
        notaCorretude = Number((somaCor / qtd).toFixed(2));
        notaQualidade = Number((somaQua).toFixed(2));
        notaDesempenho = Number((somaDes).toFixed(2));
      }

      const atendeNotaCorte =
        qtd > 0 && notaTecnicaTotal >= processo.notaCorteMinima;
      const statusClassificacaoVal =
        qtd === 0
          ? "SEM_SUBMISSAO"
          : atendeNotaCorte
          ? "CLASSIFICADO"
          : "DESCLASSIFICADO_NOTA_CORTE";

      const trilha = processo.trilhas.find((t) => t.id === insc.trilhaId);

      return {
        inscricaoId: insc.id,
        codigoAnonimo: insc.codigoAnonimo,
        candidatoId: insc.candidatoId,
        candidatoNome: insc.candidatoNome ?? "",
        candidatoEmail: insc.candidatoEmail ?? "",
        candidatoCpf: insc.candidatoCpf ?? "",
        trilhaId: insc.trilhaId,
        trilhaNome: trilha?.nome ?? "Trilha Geral",
        notaTecnicaTotal,
        notaCorretude,
        notaQualidade,
        notaDesempenho,
        atendeNotaCorte,
        statusClassificacao: statusClassificacaoVal,
        pontuacaoProvisoriaBarema: insc.pontuacaoProvisoriaBarema,
        pontuacaoHomologadaBarema: insc.pontuacaoHomologadaBarema ?? null,
        statusAuditoriaBarema: insc.statusAuditoriaBarema ?? "PENDENTE",
        linguagem: submissaoPrincipal?.linguagem,
      };
    });

    const rankingConsolidado = gerarRankingConsolidado(entradasRanking, {
      pesoProvaTecnica: processo.pesoProvaTecnica,
      pesoBaremaCurricular: processo.pesoBaremaCurricular,
    });

    // Filtra apenas aprovados classificados que possuem posição oficial no ranking
    let candidatosAptos = rankingConsolidado.filter(
      (c) => c.posicaoRanking !== null && c.candidatoEmail
    );

    if (Array.isArray(inscricaoIds) && inscricaoIds.length > 0) {
      candidatosAptos = candidatosAptos.filter((c) =>
        inscricaoIds.includes(c.inscricaoId)
      );
    } else if (typeof limite === "number" && limite > 0) {
      candidatosAptos = candidatosAptos.slice(0, limite);
    }

    const emailService = getEmailService();
    const convocadosEnviados: Array<{
      inscricaoId: string;
      nome: string;
      email: string;
      posicaoRanking: number;
    }> = [];

    for (const cand of candidatosAptos) {
      const emailContent = gerarEmailConvocacao({
        candidatoNome: cand.candidatoNome,
        candidatoEmail: cand.candidatoEmail,
        posicaoRanking: cand.posicaoRanking!,
        notaFinal: cand.notaFinalConsolidada ?? cand.notaTecnicaTotal,
        processoTitulo: processo.titulo,
        edital: processo.edital,
        trilhaNome: cand.trilhaNome,
        prazoEnvioDocumentos: prazoDocumentos,
      });

      await emailService.sendEmail({
        to: emailContent.destinatario,
        subject: emailContent.assunto,
        text: emailContent.corpoTexto,
        html: emailContent.corpoHtml,
        tipo: "CONVOCACAO",
        metadata: {
          processoSeletivoId: processo.id,
          inscricaoId: cand.inscricaoId,
          posicaoRanking: cand.posicaoRanking,
        },
      });

      convocadosEnviados.push({
        inscricaoId: cand.inscricaoId,
        nome: cand.candidatoNome,
        email: cand.candidatoEmail,
        posicaoRanking: cand.posicaoRanking!,
      });
    }

    return NextResponse.json({
      success: true,
      totalEnviados: convocadosEnviados.length,
      convocados: convocadosEnviados,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao convocar candidatos." },
      { status: 500 }
    );
  }
}
