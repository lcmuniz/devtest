import {
  CandidatoRankingCego,
  CandidatoRankingConsolidado,
  ItemBaremaAuditado,
  sanitizarItemRankingParaCorrecaoCega,
} from "../banca/painel-banca";

export type AlvoContestacaoRecurso = "PROVA_PRATICA" | "BAREMA";
export type StatusRecurso = "EM_ANALISE" | "DEFERIDO" | "INDEFERIDO";

export interface CandidatoRankingProjetado extends CandidatoRankingCego {
  candidatoNome?: string;
  candidatoEmail?: string;
  candidatoCpf?: string;
}

export interface EspelhoAvaliacaoCandidato {
  inscricaoId: string;
  codigoAnonimo: string;
  candidatoNome: string;
  candidatoCpf: string;
  trilhaNome: string;
  posicaoRanking: number | null;
  statusClassificacao: string;
  atendeNotaCorte: boolean;
  notaCorteMinima: number;
  pesos: {
    pesoProvaTecnica: number;
    pesoBaremaCurricular: number;
  };
  provaPratica: {
    notaTecnicaTotal: number;
    notaCorretude: number;
    notaQualidade: number;
    notaDesempenho: number;
    linguagem?: string;
  };
  barema: {
    pontuacaoProvisoria: number;
    pontuacaoHomologada: number;
    statusAuditoria: string;
    itens: ItemBaremaAuditado[];
  };
  notaFinalConsolidada: number | null;
}

export interface ValidacaoInterposicaoRecursoInput {
  inscricaoId: string;
  candidatoId: string;
  alvoContestacao: AlvoContestacaoRecurso;
  fundamentacao: string;
  janelaRecursosAberta: boolean;
}

export interface JulgamentoRecursoInput {
  alvoContestacao: AlvoContestacaoRecurso;
  decisao: "DEFERIDO" | "INDEFERIDO";
  parecerBanca: string;
  novaPontuacaoAlvo?: number;
  notaTecnicaAtual: number;
  notaBaremaAtual: number;
  notaCorteMinima: number;
}

export interface ResultadoJulgamentoRecurso {
  valido: boolean;
  erro?: string;
  notaTecnicaAjustada: number;
  notaBaremaAjustada: number;
  atendeNotaCorteAjustado: boolean;
}

export function projetarItemRankingPorFase(
  item: CandidatoRankingConsolidado,
  etapaAnonimaEncerrada: boolean
): CandidatoRankingProjetado {
  const baseCega = sanitizarItemRankingParaCorrecaoCega(item);
  if (!etapaAnonimaEncerrada) {
    return baseCega;
  }

  return {
    ...baseCega,
    candidatoNome: item.candidatoNome,
    candidatoEmail: item.candidatoEmail,
    candidatoCpf: item.candidatoCpf,
  };
}

export function gerarEspelhoAvaliacaoCandidato(params: {
  candidatoSolicitanteId: string;
  itemRanking: CandidatoRankingConsolidado;
  pesos: { pesoProvaTecnica: number; pesoBaremaCurricular: number };
  notaCorteMinima: number;
}): EspelhoAvaliacaoCandidato {
  const { candidatoSolicitanteId, itemRanking, pesos, notaCorteMinima } = params;

  if (
    !candidatoSolicitanteId ||
    candidatoSolicitanteId !== itemRanking.candidatoId
  ) {
    throw new Error(
      "Acesso negado ao Espelho de Avaliação: o candidato autenticado não é o titular desta inscrição."
    );
  }

  return {
    inscricaoId: itemRanking.inscricaoId,
    codigoAnonimo: itemRanking.codigoAnonimo,
    candidatoNome: itemRanking.candidatoNome,
    candidatoCpf: itemRanking.candidatoCpf,
    trilhaNome: itemRanking.trilhaNome,
    posicaoRanking: itemRanking.posicaoRanking,
    statusClassificacao: itemRanking.statusClassificacao,
    atendeNotaCorte: itemRanking.atendeNotaCorte,
    notaCorteMinima,
    pesos,
    provaPratica: {
      notaTecnicaTotal: itemRanking.notaTecnicaTotal,
      notaCorretude: itemRanking.notaCorretude,
      notaQualidade: itemRanking.notaQualidade,
      notaDesempenho: itemRanking.notaDesempenho,
      linguagem: itemRanking.linguagem,
    },
    barema: {
      pontuacaoProvisoria: itemRanking.pontuacaoProvisoriaBarema,
      pontuacaoHomologada: itemRanking.notaBaremaUtilizada,
      statusAuditoria: itemRanking.statusAuditoriaBarema,
      itens: itemRanking.itensBaremaAuditados ?? [],
    },
    notaFinalConsolidada: itemRanking.notaFinalConsolidada,
  };
}

export function validarInterposicaoRecurso(
  input: ValidacaoInterposicaoRecursoInput
): { valido: boolean; erro?: string } {
  if (!input.janelaRecursosAberta) {
    return {
      valido: false,
      erro: "O prazo para interposição de recursos está encerrado ou ainda não foi aberto pela Banca.",
    };
  }

  if (
    input.alvoContestacao !== "PROVA_PRATICA" &&
    input.alvoContestacao !== "BAREMA"
  ) {
    return {
      valido: false,
      erro: "Alvo de contestação inválido. Selecione PROVA_PRATICA ou BAREMA.",
    };
  }

  const texto = (input.fundamentacao || "").trim();
  if (texto.length < 15) {
    return {
      valido: false,
      erro: "A fundamentação do recurso deve conter no mínimo 15 caracteres.",
    };
  }

  return { valido: true };
}

export function aplicarJulgamentoRecurso(
  input: JulgamentoRecursoInput
): ResultadoJulgamentoRecurso {
  const parecer = (input.parecerBanca || "").trim();
  if (parecer.length < 10) {
    return {
      valido: false,
      erro: "O parecer técnico formal da banca é obrigatório (mínimo de 10 caracteres).",
      notaTecnicaAjustada: input.notaTecnicaAtual,
      notaBaremaAjustada: input.notaBaremaAtual,
      atendeNotaCorteAjustado: input.notaTecnicaAtual >= input.notaCorteMinima,
    };
  }

  if (input.decisao !== "DEFERIDO" && input.decisao !== "INDEFERIDO") {
    return {
      valido: false,
      erro: "Decisão inválida. Informe DEFERIDO ou INDEFERIDO.",
      notaTecnicaAjustada: input.notaTecnicaAtual,
      notaBaremaAjustada: input.notaBaremaAtual,
      atendeNotaCorteAjustado: input.notaTecnicaAtual >= input.notaCorteMinima,
    };
  }

  let notaTecnicaAjustada = input.notaTecnicaAtual;
  let notaBaremaAjustada = input.notaBaremaAtual;

  if (input.decisao === "DEFERIDO") {
    if (
      typeof input.novaPontuacaoAlvo !== "number" ||
      Number.isNaN(input.novaPontuacaoAlvo) ||
      input.novaPontuacaoAlvo < 0 ||
      input.novaPontuacaoAlvo > 100
    ) {
      return {
        valido: false,
        erro: "Ao deferir um recurso, informe a nova pontuação ajustada entre 0 e 100.",
        notaTecnicaAjustada,
        notaBaremaAjustada,
        atendeNotaCorteAjustado: notaTecnicaAjustada >= input.notaCorteMinima,
      };
    }

    if (input.alvoContestacao === "PROVA_PRATICA") {
      notaTecnicaAjustada = Number(input.novaPontuacaoAlvo.toFixed(2));
    } else {
      notaBaremaAjustada = Number(input.novaPontuacaoAlvo.toFixed(2));
    }
  }

  return {
    valido: true,
    notaTecnicaAjustada,
    notaBaremaAjustada,
    atendeNotaCorteAjustado: notaTecnicaAjustada >= input.notaCorteMinima,
  };
}
