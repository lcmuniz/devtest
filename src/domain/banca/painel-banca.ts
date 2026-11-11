import {
  CriterioBaremaInput,
  TipoCriterioBarema,
} from "../processo-seletivo/processo-seletivo";
import {
  ItemBaremaDeclarado,
  calcularPontuacaoBarema,
} from "../candidato/candidato-barema";
import { RunnerResult } from "../runner/runner-contract";
import { StatusClassificacaoTecnica } from "../submissao/autoavaliacao-tecnica";

export type StatusAuditoriaItemBarema = "PENDENTE" | "VALIDADO" | "GLOSADO";
export type StatusAuditoriaBaremaGeral = "PENDENTE" | "AUDITADO";
export type StatusClassificacaoRanking =
  | StatusClassificacaoTecnica
  | "SEM_SUBMISSAO";

export interface DecisaoAuditoriaItemInput {
  criterioId: string;
  statusAuditoria: "VALIDADO" | "GLOSADO";
  motivoGlosa?: string;
}

export interface ItemBaremaAuditado {
  criterioId: string;
  tipo: TipoCriterioBarema;
  descricao: string;
  quantidadeOuAnos: number;
  pontuacaoUnitaria: number;
  pontuacaoMaxima: number;
  pontosProvisorios: number;
  pontosHomologados: number;
  statusAuditoria: StatusAuditoriaItemBarema;
  motivoGlosa?: string;
  arquivoComprovanteNome?: string;
  arquivoComprovanteBase64?: string;
}

export interface ResultadoAuditoriaBarema {
  pontuacaoProvisoriaBarema: number;
  pontuacaoHomologadaBarema: number;
  statusAuditoriaGeral: StatusAuditoriaBaremaGeral;
  itensAuditados: ItemBaremaAuditado[];
  errosValidacao?: string[];
}

export interface CalculoNotaConsolidadaInput {
  notaTecnicaTotal: number;
  notaBarema: number;
  pesoProvaTecnica: number;
  pesoBaremaCurricular: number;
  atendeNotaCorte: boolean;
}

export function calcularNotaFinalConsolidada(
  input: CalculoNotaConsolidadaInput
): number | null {
  if (!input.atendeNotaCorte) {
    return null;
  }

  const somaPesos = input.pesoProvaTecnica + input.pesoBaremaCurricular;
  if (somaPesos <= 0) {
    return 0;
  }

  const nota =
    (input.notaTecnicaTotal * input.pesoProvaTecnica +
      input.notaBarema * input.pesoBaremaCurricular) /
    somaPesos;

  return Number(nota.toFixed(2));
}

export function auditarItensBarema(
  matrizBarema: (CriterioBaremaInput & { id: string })[],
  itensDeclarados: ItemBaremaDeclarado[],
  decisoes: DecisaoAuditoriaItemInput[]
): ResultadoAuditoriaBarema {
  const calculoProvisorio = calcularPontuacaoBarema(matrizBarema, itensDeclarados);
  const errosValidacao: string[] = [];

  const pontosPorCategoria: Record<string, number> = {};
  const tetoPorCategoria: Record<string, number> = {};

  for (const criterio of matrizBarema) {
    tetoPorCategoria[criterio.tipo] =
      (tetoPorCategoria[criterio.tipo] || 0) + criterio.pontuacaoMaxima;
  }

  const itensAuditados: ItemBaremaAuditado[] = [];

  for (const itemCalc of calculoProvisorio.itensDetalhados) {
    const declaradoOrig = itensDeclarados.find(
      (i) => i.criterioId === itemCalc.criterioId
    );
    const decisao = decisoes.find((d) => d.criterioId === itemCalc.criterioId);

    const statusAuditoria: StatusAuditoriaItemBarema =
      decisao?.statusAuditoria ?? "PENDENTE";

    if (
      statusAuditoria === "GLOSADO" &&
      (!decisao?.motivoGlosa || decisao.motivoGlosa.trim().length < 3)
    ) {
      errosValidacao.push(
        `O motivo da glosa é obrigatório para o critério '${itemCalc.descricao}'.`
      );
    }

    let pontosHomologados = 0;
    if (statusAuditoria === "VALIDADO") {
      const pontosBrutos =
        itemCalc.quantidadeOuAnos * itemCalc.pontuacaoUnitaria;
      let pontosItem = Math.min(pontosBrutos, itemCalc.pontuacaoMaxima);

      const acumuladoCategoria = pontosPorCategoria[itemCalc.tipo] || 0;
      const tetoCat = tetoPorCategoria[itemCalc.tipo] ?? itemCalc.pontuacaoMaxima;
      if (acumuladoCategoria + pontosItem > tetoCat) {
        pontosItem = Math.max(0, tetoCat - acumuladoCategoria);
      }

      pontosPorCategoria[itemCalc.tipo] = acumuladoCategoria + pontosItem;
      pontosHomologados = Number(pontosItem.toFixed(2));
    }

    itensAuditados.push({
      criterioId: itemCalc.criterioId,
      tipo: itemCalc.tipo,
      descricao: itemCalc.descricao,
      quantidadeOuAnos: itemCalc.quantidadeOuAnos,
      pontuacaoUnitaria: itemCalc.pontuacaoUnitaria,
      pontuacaoMaxima: itemCalc.pontuacaoMaxima,
      pontosProvisorios: itemCalc.pontosCalculados,
      pontosHomologados,
      statusAuditoria,
      motivoGlosa:
        statusAuditoria === "GLOSADO" ? decisao?.motivoGlosa?.trim() : undefined,
      arquivoComprovanteNome: itemCalc.arquivoComprovanteNome,
      arquivoComprovanteBase64: declaradoOrig?.arquivoComprovanteBase64,
    });
  }

  const pontuacaoHomologadaBarema = Number(
    Object.values(pontosPorCategoria)
      .reduce((acc, v) => acc + v, 0)
      .toFixed(2)
  );

  const todosAuditados =
    itensAuditados.length === 0 ||
    itensAuditados.every((i) => i.statusAuditoria !== "PENDENTE");

  return {
    pontuacaoProvisoriaBarema: calculoProvisorio.pontuacaoProvisoriaBarema,
    pontuacaoHomologadaBarema,
    statusAuditoriaGeral: todosAuditados ? "AUDITADO" : "PENDENTE",
    itensAuditados,
    errosValidacao: errosValidacao.length > 0 ? errosValidacao : undefined,
  };
}

export interface SubmissaoDesafioBanca {
  submissaoId: string;
  desafioId: string;
  linguagem: string;
  codigoFonte: string;
  notaTecnicaTotal: number;
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  atendeNotaCorte: boolean;
  statusClassificacao: StatusClassificacaoRanking;
  relatorioExecucao?: RunnerResult | null;
}

export interface CandidatoRankingInput {
  inscricaoId: string;
  codigoAnonimo: string;
  candidatoId: string;
  candidatoNome: string;
  candidatoEmail: string;
  candidatoCpf: string;
  trilhaId: string;
  trilhaNome: string;
  notaTecnicaTotal: number;
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  atendeNotaCorte: boolean;
  statusClassificacao: StatusClassificacaoRanking;
  pontuacaoProvisoriaBarema: number;
  pontuacaoHomologadaBarema: number | null;
  statusAuditoriaBarema: StatusAuditoriaBaremaGeral;
  linguagem?: string;
  codigoFonte?: string;
  relatorioExecucao?: RunnerResult | null;
  submissoesDesafios?: SubmissaoDesafioBanca[];
  itensBaremaAuditados?: ItemBaremaAuditado[];
}

export interface CandidatoRankingConsolidado extends CandidatoRankingInput {
  posicaoRanking: number | null;
  notaBaremaUtilizada: number;
  notaFinalConsolidada: number | null;
}

export interface CandidatoRankingCego {
  inscricaoId: string;
  codigoAnonimo: string;
  posicaoRanking: number | null;
  trilhaId: string;
  trilhaNome: string;
  notaTecnicaTotal: number;
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  atendeNotaCorte: boolean;
  statusClassificacao: StatusClassificacaoRanking;
  pontuacaoProvisoriaBarema: number;
  pontuacaoHomologadaBarema: number | null;
  notaBaremaUtilizada: number;
  statusAuditoriaBarema: StatusAuditoriaBaremaGeral;
  notaFinalConsolidada: number | null;
  linguagem?: string;
  codigoFonte?: string;
  relatorioExecucao?: RunnerResult | null;
  submissoesDesafios?: SubmissaoDesafioBanca[];
  itensBaremaAuditados?: ItemBaremaAuditado[];
}

export interface FiltrosRankingInput {
  trilhaId?: string;
  statusClassificacao?: string;
  notaMinima?: number;
}

export function gerarRankingConsolidado(
  entradas: CandidatoRankingInput[],
  pesos: { pesoProvaTecnica: number; pesoBaremaCurricular: number },
  filtros?: FiltrosRankingInput
): CandidatoRankingConsolidado[] {
  const comNotas = entradas.map((entrada) => {
    const notaBaremaUtilizada =
      entrada.statusAuditoriaBarema === "AUDITADO" &&
      entrada.pontuacaoHomologadaBarema !== null
        ? entrada.pontuacaoHomologadaBarema
        : entrada.pontuacaoProvisoriaBarema;

    const notaFinalConsolidada = calcularNotaFinalConsolidada({
      notaTecnicaTotal: entrada.notaTecnicaTotal,
      notaBarema: notaBaremaUtilizada,
      pesoProvaTecnica: pesos.pesoProvaTecnica,
      pesoBaremaCurricular: pesos.pesoBaremaCurricular,
      atendeNotaCorte: entrada.atendeNotaCorte,
    });

    return {
      ...entrada,
      posicaoRanking: null as number | null,
      notaBaremaUtilizada,
      notaFinalConsolidada,
    };
  });

  // Ordenar: aprovados no corte primeiro, depois maior Nota Final, maior Nota Técnica, maior Nota Barema
  comNotas.sort((a, b) => {
    if (a.atendeNotaCorte !== b.atendeNotaCorte) {
      return a.atendeNotaCorte ? -1 : 1;
    }

    if (a.atendeNotaCorte && b.atendeNotaCorte) {
      const diffFinal = (b.notaFinalConsolidada ?? 0) - (a.notaFinalConsolidada ?? 0);
      if (diffFinal !== 0) return diffFinal;

      const diffTecnica = b.notaTecnicaTotal - a.notaTecnicaTotal;
      if (diffTecnica !== 0) return diffTecnica;

      const diffBarema = b.notaBaremaUtilizada - a.notaBaremaUtilizada;
      if (diffBarema !== 0) return diffBarema;
    } else {
      const diffTecnica = b.notaTecnicaTotal - a.notaTecnicaTotal;
      if (diffTecnica !== 0) return diffTecnica;
    }

    return a.codigoAnonimo.localeCompare(b.codigoAnonimo);
  });

  // Atribuir posição no ranking exclusivamente aos candidatos aprovados no corte
  let posicao = 1;
  for (const item of comNotas) {
    if (item.atendeNotaCorte) {
      item.posicaoRanking = posicao++;
    } else {
      item.posicaoRanking = null;
    }
  }

  // Aplicar filtros opcionais após cálculo da posição oficial
  return comNotas.filter((item) => {
    if (filtros?.trilhaId && item.trilhaId !== filtros.trilhaId) {
      return false;
    }
    if (
      filtros?.statusClassificacao &&
      item.statusClassificacao !== filtros.statusClassificacao
    ) {
      return false;
    }
    if (
      typeof filtros?.notaMinima === "number" &&
      !Number.isNaN(filtros.notaMinima)
    ) {
      const notaComparacao = item.notaFinalConsolidada ?? item.notaTecnicaTotal;
      if (notaComparacao < filtros.notaMinima) {
        return false;
      }
    }
    return true;
  });
}

export function sanitizarItemRankingParaCorrecaoCega(
  item: CandidatoRankingConsolidado
): CandidatoRankingCego {
  return {
    inscricaoId: item.inscricaoId,
    codigoAnonimo: item.codigoAnonimo,
    posicaoRanking: item.posicaoRanking,
    trilhaId: item.trilhaId,
    trilhaNome: item.trilhaNome,
    notaTecnicaTotal: item.notaTecnicaTotal,
    notaCorretude: item.notaCorretude,
    notaQualidade: item.notaQualidade,
    notaDesempenho: item.notaDesempenho,
    atendeNotaCorte: item.atendeNotaCorte,
    statusClassificacao: item.statusClassificacao,
    pontuacaoProvisoriaBarema: item.pontuacaoProvisoriaBarema,
    pontuacaoHomologadaBarema: item.pontuacaoHomologadaBarema,
    notaBaremaUtilizada: item.notaBaremaUtilizada,
    statusAuditoriaBarema: item.statusAuditoriaBarema,
    notaFinalConsolidada: item.notaFinalConsolidada,
    linguagem: item.linguagem,
    codigoFonte: item.codigoFonte,
    relatorioExecucao: item.relatorioExecucao,
    submissoesDesafios: item.submissoesDesafios,
    itensBaremaAuditados: item.itensBaremaAuditados,
  };
}
