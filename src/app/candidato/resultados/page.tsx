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
  EspelhoAvaliacaoCandidato,
  gerarEspelhoAvaliacaoCandidato,
} from "@/domain/recurso/homologacao-recurso";
import { EspelhoAvaliacaoCandidatoView } from "@/components/candidato/EspelhoAvaliacaoCandidatoView";
import { obterSessaoServidor } from "@/infrastructure/auth/session-server";

export const dynamic = "force-dynamic";

export default async function CandidatoResultadosPage() {
  const sessao = await obterSessaoServidor();
  const psRepo = getProcessoSeletivoRepository();
  const candRepo = getCandidatoRepository();
  const subRepo = getSubmissaoRepository();
  const recRepo = getRecursoRepository();

  const processos = await psRepo.findAll();
  let espelhoInicial: EspelhoAvaliacaoCandidato | null = null;
  let inscricaoIdInicial = "";
  let candidatoIdInicial = sessao?.id || "";
  let janelaAberta = false;
  let recursosIniciais: RecursoEntity[] = [];

  if (processos.length > 0) {
    const primeiro = processos[0];
    janelaAberta = Boolean(primeiro.janelaRecursosAberta);
    const [inscricoes, submissoes] = await Promise.all([
      candRepo.buscarInscricoesPorProcesso(primeiro.id),
      subRepo.findAll({ processoSeletivoId: primeiro.id }),
    ]);

    if (inscricoes.length > 0) {
      const inscAlvo =
        (sessao?.perfil === "CANDIDATO" &&
          inscricoes.find((i) => i.candidatoId === sessao.id)) ||
        inscricoes[0];
      inscricaoIdInicial = inscAlvo.id;
      candidatoIdInicial = inscAlvo.candidatoId;

      const subsPorInsc = new Map<string, typeof submissoes>();
      for (const s of submissoes) {
        const lista = subsPorInsc.get(s.inscricaoId) ?? [];
        lista.push(s);
        subsPorInsc.set(s.inscricaoId, lista);
      }

      const entradas: CandidatoRankingInput[] = inscricoes.map((insc) => {
        const subs = subsPorInsc.get(insc.id) ?? [];
        const subPrincipal = subs[0];
        const qtd = subs.length;
        const notaTecnicaTotal =
          qtd > 0
            ? Number(
                (
                  subs.reduce((acc, s) => acc + s.notaTecnicaTotal, 0) / qtd
                ).toFixed(2)
              )
            : 0;
        const notaCorretude =
          qtd > 0
            ? Number(
                (
                  subs.reduce((acc, s) => acc + s.notaCorretude, 0) / qtd
                ).toFixed(2)
              )
            : 0;
        const notaQualidade =
          qtd > 0
            ? Number(
                (
                  subs.reduce((acc, s) => acc + s.notaQualidade, 0) / qtd
                ).toFixed(2)
              )
            : 0;
        const notaDesempenho =
          qtd > 0
            ? Number(
                (
                  subs.reduce((acc, s) => acc + s.notaDesempenho, 0) / qtd
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
          itensBaremaAuditados,
        };
      });

      const ranking = gerarRankingConsolidado(entradas, {
        pesoProvaTecnica: primeiro.pesoProvaTecnica,
        pesoBaremaCurricular: primeiro.pesoBaremaCurricular,
      });

      const item = ranking.find((r) => r.inscricaoId === inscAlvo.id);
      if (item) {
        espelhoInicial = gerarEspelhoAvaliacaoCandidato({
          candidatoSolicitanteId: inscAlvo.candidatoId,
          itemRanking: item,
          pesos: {
            pesoProvaTecnica: primeiro.pesoProvaTecnica,
            pesoBaremaCurricular: primeiro.pesoBaremaCurricular,
          },
          notaCorteMinima: primeiro.notaCorteMinima,
        });
      }

      recursosIniciais = await recRepo.findAll({
        inscricaoId: inscAlvo.id,
      });
    }
  }

  return (
    <EspelhoAvaliacaoCandidatoView
      candidatoIdInicial={candidatoIdInicial}
      inscricaoIdInicial={inscricaoIdInicial}
      espelhoInicial={espelhoInicial}
      janelaRecursosAbertaInicial={janelaAberta}
      recursosIniciais={recursosIniciais}
    />
  );
}
