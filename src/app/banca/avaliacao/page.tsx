import React from "react";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import {
  getRecursoRepository,
  RecursoEntity,
} from "@/infrastructure/repositories/recurso-repository";
import {
  auditarItensBarema,
  CandidatoRankingInput,
  gerarRankingConsolidado,
} from "@/domain/banca/painel-banca";
import {
  CandidatoRankingProjetado,
  projetarItemRankingPorFase,
} from "@/domain/recurso/homologacao-recurso";
import {
  PainelBancaAvaliadoraView,
  ProcessoResumoBanca,
} from "@/components/banca/PainelBancaAvaliadoraView";

export const dynamic = "force-dynamic";

export default async function PainelBancaAvaliacaoPage() {
  const psRepo = getProcessoSeletivoRepository();
  const processos = await psRepo.findAll();

  const processosResumo: ProcessoResumoBanca[] = processos.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    edital: p.edital,
    pesoProvaTecnica: p.pesoProvaTecnica,
    pesoBaremaCurricular: p.pesoBaremaCurricular,
    notaCorteMinima: p.notaCorteMinima,
    etapaAnonimaEncerrada: Boolean(p.etapaAnonimaEncerrada),
    janelaRecursosAberta: Boolean(p.janelaRecursosAberta),
    trilhas: p.trilhas.map((t) => ({ id: t.id, nome: t.nome })),
  }));

  let rankingInicial: CandidatoRankingProjetado[] = [];
  let recursosIniciais: RecursoEntity[] = [];

  if (processos.length > 0) {
    const primeiro = processos[0];
    const candRepo = getCandidatoRepository();
    const subRepo = getSubmissaoRepository();
    const recRepo = getRecursoRepository();

    const [inscricoes, submissoes, recursos] = await Promise.all([
      candRepo.buscarInscricoesPorProcesso(primeiro.id),
      subRepo.findAll({ processoSeletivoId: primeiro.id }),
      recRepo.findAll({ processoSeletivoId: primeiro.id }),
    ]);

    recursosIniciais = recursos;

    const submissoesPorInscricao = new Map<string, typeof submissoes>();
    for (const s of submissoes) {
      const lista = submissoesPorInscricao.get(s.inscricaoId) ?? [];
      lista.push(s);
      submissoesPorInscricao.set(s.inscricaoId, lista);
    }

    const entradas: CandidatoRankingInput[] = inscricoes.map((insc) => {
      const subsCandidato = submissoesPorInscricao.get(insc.id) ?? [];
      const subPrincipal = subsCandidato[0];

      const qtd = subsCandidato.length;
      const notaTecnicaTotal =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaTecnicaTotal, 0) /
                qtd
              ).toFixed(2)
            )
          : 0;
      const notaCorretude =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaCorretude, 0) / qtd
              ).toFixed(2)
            )
          : 0;
      const notaQualidade =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaQualidade, 0) / qtd
              ).toFixed(2)
            )
          : 0;
      const notaDesempenho =
        qtd > 0
          ? Number(
              (
                subsCandidato.reduce((acc, s) => acc + s.notaDesempenho, 0) /
                qtd
              ).toFixed(2)
            )
          : 0;
      const atendeNotaCorte =
        qtd > 0 ? notaTecnicaTotal >= primeiro.notaCorteMinima : false;
      const statusClassificacao =
        qtd === 0
          ? "SEM_SUBMISSAO"
          : atendeNotaCorte
          ? "CLASSIFICADO"
          : "DESCLASSIFICADO_NOTA_CORTE";

      const itensBaremaAuditados =
        insc.auditoriaBarema && insc.auditoriaBarema.length > 0
          ? insc.auditoriaBarema
          : auditarItensBarema(primeiro.barema, insc.itensBarema, [])
              .itensAuditados;

      return {
        inscricaoId: insc.id,
        codigoAnonimo: insc.codigoAnonimo,
        candidatoId: insc.candidatoId,
        candidatoNome: insc.candidatoNome,
        candidatoEmail: insc.candidatoEmail,
        candidatoCpf: insc.candidatoCpf,
        trilhaId: insc.trilhaId,
        trilhaNome: insc.trilhaNome,
        notaTecnicaTotal,
        notaCorretude,
        notaQualidade,
        notaDesempenho,
        atendeNotaCorte,
        statusClassificacao,
        pontuacaoProvisoriaBarema: insc.pontuacaoProvisoriaBarema,
        pontuacaoHomologadaBarema: insc.pontuacaoHomologadaBarema ?? null,
        statusAuditoriaBarema: insc.statusAuditoriaBarema ?? "PENDENTE",
        linguagem: subPrincipal?.linguagem,
        codigoFonte: subPrincipal?.codigoFonte,
        relatorioExecucao: subPrincipal?.relatorioExecucao ?? null,
        submissoesDesafios: subsCandidato.map((s) => ({
          submissaoId: s.id,
          desafioId: s.desafioId,
          linguagem: s.linguagem,
          codigoFonte: s.codigoFonte,
          notaTecnicaTotal: s.notaTecnicaTotal,
          notaCorretude: s.notaCorretude,
          notaQualidade: s.notaQualidade,
          notaDesempenho: s.notaDesempenho,
          atendeNotaCorte: s.atendeNotaCorte,
          statusClassificacao: s.statusClassificacao,
          relatorioExecucao: s.relatorioExecucao ?? null,
        })),
        itensBaremaAuditados,
      };
    });

    const consolidado = gerarRankingConsolidado(entradas, {
      pesoProvaTecnica: primeiro.pesoProvaTecnica,
      pesoBaremaCurricular: primeiro.pesoBaremaCurricular,
    });
    const etapaAnonimaEncerrada = Boolean(primeiro.etapaAnonimaEncerrada);
    rankingInicial = consolidado.map((item) =>
      projetarItemRankingPorFase(item, etapaAnonimaEncerrada)
    );
  }

  return (
    <PainelBancaAvaliadoraView
      processosIniciais={processosResumo}
      rankingInicial={rankingInicial}
      recursosIniciais={recursosIniciais}
    />
  );
}
