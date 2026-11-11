import { z } from "zod";
import {
  CriterioBaremaInput,
  TipoCriterioBarema,
} from "../processo-seletivo/processo-seletivo";

/**
 * Sanitiza e valida o algoritmo oficial de CPF (módulo 11)
 */
export function limparCpf(cpf: string): string {
  return cpf ? cpf.replace(/\D/g, "") : "";
}

export function validarCpf(cpf: string): boolean {
  if (!cpf) return false;
  const limpo = limparCpf(cpf);

  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

export const CandidatoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome do candidato deve ter no mínimo 3 caracteres."),
  email: z.string().email("E-mail com formato inválido."),
  cpf: z.string().refine(validarCpf, { message: "CPF inválido." }),
  senha: z.string().min(6, "A senha deve conter no mínimo 6 caracteres."),
});

export type CandidatoInput = z.infer<typeof CandidatoSchema>;

export interface ItemBaremaDeclarado {
  criterioId: string;
  quantidadeOuAnos: number;
  arquivoComprovanteNome?: string;
  arquivoComprovanteBase64?: string;
}

export interface ItemBaremaCalculado {
  criterioId: string;
  tipo: TipoCriterioBarema;
  descricao: string;
  quantidadeOuAnos: number;
  pontuacaoUnitaria: number;
  pontuacaoMaxima: number;
  pontosBrutos: number;
  pontosCalculados: number;
  atingiuTeto: boolean;
  arquivoComprovanteNome?: string;
  erro?: string;
}

export interface ResultadoCalculoBarema {
  pontuacaoProvisoriaBarema: number;
  itensDetalhados: ItemBaremaCalculado[];
  errosValidacao?: string[];
}

export function validarArquivoPdf(nomeArquivo?: string): boolean {
  if (!nomeArquivo) return false;
  return nomeArquivo.trim().toLowerCase().endsWith(".pdf");
}

export function calcularPontuacaoBarema(
  matrizBarema: (CriterioBaremaInput & { id: string })[],
  itensDeclarados: ItemBaremaDeclarado[]
): ResultadoCalculoBarema {
  const itensDetalhados: ItemBaremaCalculado[] = [];
  const errosValidacao: string[] = [];

  // Mapeia pontuações acumuladas por categoria (TipoCriterioBarema)
  const pontosPorCategoria: Record<string, number> = {};
  const tetoPorCategoria: Record<string, number> = {};

  for (const criterio of matrizBarema) {
    tetoPorCategoria[criterio.tipo] = (tetoPorCategoria[criterio.tipo] || 0) + criterio.pontuacaoMaxima;
  }

  for (const item of itensDeclarados) {
    const criterio = matrizBarema.find((c) => c.id === item.criterioId);
    if (!criterio) {
      errosValidacao.push(`Critério de Barema com ID '${item.criterioId}' não encontrado.`);
      continue;
    }

    const exigeComprovante = criterio.exigeComprovante ?? true;
    let erroArquivo: string | undefined;

    if (item.quantidadeOuAnos > 0 && exigeComprovante) {
      if (!item.arquivoComprovanteNome || item.arquivoComprovanteNome.trim() === "") {
        erroArquivo = `O comprovante em formato PDF é obrigatório para o critério '${criterio.descricao}'.`;
      } else if (!validarArquivoPdf(item.arquivoComprovanteNome)) {
        erroArquivo = `O documento anexado para '${criterio.descricao}' deve ser exclusivamente em formato PDF.`;
      }
    }

    if (erroArquivo) {
      errosValidacao.push(erroArquivo);
      itensDetalhados.push({
        criterioId: criterio.id,
        tipo: criterio.tipo,
        descricao: criterio.descricao,
        quantidadeOuAnos: item.quantidadeOuAnos,
        pontuacaoUnitaria: criterio.pontuacaoUnitaria,
        pontuacaoMaxima: criterio.pontuacaoMaxima,
        pontosBrutos: item.quantidadeOuAnos * criterio.pontuacaoUnitaria,
        pontosCalculados: 0,
        atingiuTeto: false,
        arquivoComprovanteNome: item.arquivoComprovanteNome,
        erro: erroArquivo,
      });
      continue;
    }

    const pontosBrutos = item.quantidadeOuAnos * criterio.pontuacaoUnitaria;
    const tetoItem = criterio.pontuacaoMaxima;
    
    // Teto individual do critério
    let pontosCalculados = Math.min(pontosBrutos, tetoItem);

    // Teto agregado da categoria (Tipo)
    const acumuladoCategoria = pontosPorCategoria[criterio.tipo] || 0;
    const tetoCategoria = tetoPorCategoria[criterio.tipo] ?? tetoItem;
    if (acumuladoCategoria + pontosCalculados > tetoCategoria) {
      pontosCalculados = Math.max(0, tetoCategoria - acumuladoCategoria);
    }

    pontosPorCategoria[criterio.tipo] = acumuladoCategoria + pontosCalculados;
    const atingiuTeto = pontosBrutos >= tetoItem || (acumuladoCategoria + pontosCalculados >= tetoCategoria);

    itensDetalhados.push({
      criterioId: criterio.id,
      tipo: criterio.tipo,
      descricao: criterio.descricao,
      quantidadeOuAnos: item.quantidadeOuAnos,
      pontuacaoUnitaria: criterio.pontuacaoUnitaria,
      pontuacaoMaxima: criterio.pontuacaoMaxima,
      pontosBrutos,
      pontosCalculados,
      atingiuTeto,
      arquivoComprovanteNome: item.arquivoComprovanteNome,
    });
  }

  const pontuacaoProvisoriaBarema = Object.values(pontosPorCategoria).reduce((acc, pts) => acc + pts, 0);

  return {
    pontuacaoProvisoriaBarema: Number(pontuacaoProvisoriaBarema.toFixed(2)),
    itensDetalhados,
    errosValidacao: errosValidacao.length > 0 ? errosValidacao : undefined,
  };
}
