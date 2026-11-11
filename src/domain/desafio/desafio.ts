import { z } from "zod";
import { ResultadoValidacao } from "@/domain/processo-seletivo/processo-seletivo";

export enum LinguagemDesafio {
  JAVA = "java",
  TYPESCRIPT = "typescript",
  PYTHON = "python",
}

export enum CategoriaDesafio {
  JUNIOR = "junior",
  PLENO = "pleno",
  SENIOR = "senior",
}

export const DesafioSchema = z.object({
  id: z.string().optional(),
  processoSeletivoId: z.string().trim().optional().default(""),
  trilhaId: z.string().trim().optional().default(""),
  titulo: z
    .string()
    .trim()
    .min(3, "O título do Desafio deve ter no mínimo 3 caracteres."),
  categoria: z
    .enum(["junior", "pleno", "senior"], {
      errorMap: () => ({
        message: "A categoria do desafio deve ser junior, pleno ou senior.",
      }),
    })
    .default("pleno"),
  enunciadoMarkdown: z
    .string()
    .trim()
    .min(10, "O enunciado formatado em Markdown é obrigatório."),
  linguagem: z.nativeEnum(LinguagemDesafio, {
    errorMap: () => ({
      message: "A linguagem de programação deve ser java, typescript ou python.",
    }),
  }),
  codigoTemplate: z
    .string()
    .trim()
    .min(1, "O código template inicial de partida é obrigatório."),
  suiteTestesPublicos: z
    .string()
    .trim()
    .min(1, "A suíte de testes unitários públicos é obrigatória."),
  suiteTestesOcultos: z
    .string()
    .trim()
    .min(1, "A suíte de testes unitários ocultos é obrigatória."),
  timeoutSeconds: z
    .number()
    .int("O tempo máximo de execução deve ser um número inteiro.")
    .min(1, "O tempo máximo de execução deve estar entre 1 e 60 segundos.")
    .max(60, "O tempo máximo de execução deve estar entre 1 e 60 segundos."),
  memoryLimitMb: z
    .number()
    .int("O limite de memória deve ser um número inteiro.")
    .min(64, "O limite de memória deve estar entre 64 MB e 2048 MB.")
    .max(2048, "O limite de memória deve estar entre 64 MB e 2048 MB."),
});

export type DesafioInput = z.input<typeof DesafioSchema>;

export interface DesafioEntity extends DesafioInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type DesafioPublicoCandidato = Omit<DesafioEntity, "suiteTestesOcultos">;

export function validarDesafio(
  input: DesafioInput
): ResultadoValidacao<DesafioInput> {
  const result = DesafioSchema.safeParse(input);

  if (!result.success) {
    const erros = Array.from(
      new Set(result.error.errors.map((err) => err.message))
    );
    return {
      valido: false,
      erros,
    };
  }

  return {
    valido: true,
    dados: result.data,
  };
}

export function sanitizarDesafioParaCandidato(
  desafio: DesafioEntity
): DesafioPublicoCandidato {
  const { suiteTestesOcultos: _oculto, ...dadosPublicos } = desafio;
  return dadosPublicos;
}

export interface CotasLinguagemSorteio {
  java?: number;
  python?: number;
  typescript?: number;
}

function embaralharArray<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function sortearDesafiosPorLinguagem(
  bancoDesafios: DesafioEntity[],
  cotas: CotasLinguagemSorteio,
  categoriasFiltro?: string[]
): DesafioEntity[] {
  const resultado: DesafioEntity[] = [];

  const linguagens: Array<keyof CotasLinguagemSorteio> = [
    "java",
    "python",
    "typescript",
  ];

  for (const lang of linguagens) {
    const qtdDesejada = cotas[lang] ?? 0;
    if (qtdDesejada <= 0) continue;

    const doTipo = bancoDesafios.filter((d) => {
      const matchLang = d.linguagem.toLowerCase() === lang.toLowerCase();
      if (!matchLang) return false;
      if (categoriasFiltro !== undefined) {
        if (categoriasFiltro.length === 0) return false;
        const cat = (d.categoria || "pleno").toLowerCase();
        return categoriasFiltro.map((c) => c.toLowerCase()).includes(cat);
      }
      return true;
    });
    const embaralhados = embaralharArray(doTipo);
    const selecionados = embaralhados.slice(0, qtdDesejada);
    resultado.push(...selecionados);
  }

  return resultado;
}

export function adicionarDesafioAComposicao(
  selecionadosIds: string[],
  desafioId: string
): string[] {
  if (!desafioId || selecionadosIds.includes(desafioId)) {
    return selecionadosIds;
  }
  return [...selecionadosIds, desafioId];
}

export function removerDesafioDaComposicao(
  selecionadosIds: string[],
  desafioId: string
): string[] {
  return selecionadosIds.filter((id) => id !== desafioId);
}
