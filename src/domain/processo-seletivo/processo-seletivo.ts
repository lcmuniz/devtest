import { z } from "zod";

export enum TipoCriterioBarema {
  EXPERIENCIA_PROFISSIONAL = "EXPERIENCIA_PROFISSIONAL",
  ESPECIALIZACAO = "ESPECIALIZACAO",
  MESTRADO = "MESTRADO",
  DOUTORADO = "DOUTORADO",
  CERTIFICACAO = "CERTIFICACAO",
}

export const CriterioBaremaSchema = z.object({
  id: z.string().optional(),
  tipo: z.nativeEnum(TipoCriterioBarema, {
    errorMap: () => ({ message: "Tipo de critério de barema inválido." }),
  }),
  descricao: z.string().min(1, "A descrição do critério é obrigatória."),
  pontuacaoUnitaria: z.number().positive("A pontuação unitária deve ser maior que zero."),
  pontuacaoMaxima: z.number().positive("O teto de pontuação deve ser maior que zero."),
  permiteMultiplos: z.boolean().default(false),
  exigeComprovante: z.boolean().default(true),
});

export const TrilhaSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "O nome da trilha técnica é obrigatório."),
  descricao: z.string().optional().default(""),
});

const DataIsoSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Data em formato ISO inválida.",
  });

export const ProcessoSeletivoSchema = z.object({
  id: z.string().optional(),
  titulo: z.string().min(3, "O título do Processo Seletivo deve ter no mínimo 3 caracteres."),
  edital: z.string().min(1, "A identificação do Edital é obrigatória."),
  descricao: z.string().optional().default(""),
  inicioInscricoes: DataIsoSchema,
  fimInscricoes: DataIsoSchema,
  inicioProvas: DataIsoSchema,
  fimProvas: DataIsoSchema,
  pesoProvaTecnica: z.number().positive("O peso da prova técnica deve ser positivo."),
  pesoBaremaCurricular: z.number().positive("O peso do barema curricular deve ser positivo."),
  notaCorteMinima: z
    .number()
    .min(0, "A nota de corte mínima eliminatória deve estar entre 0 e 100.")
    .max(100, "A nota de corte mínima eliminatória deve estar entre 0 e 100."),
  trilhas: z.array(TrilhaSchema).min(1, "O Processo Seletivo deve possuir ao menos uma Trilha técnica vinculada."),
  barema: z.array(CriterioBaremaSchema).min(1, "O Processo Seletivo deve possuir ao menos um critério de Barema."),
  desafiosIds: z.array(z.string()).optional(),
  sorteio: z
    .object({
      java: z.number().optional(),
      python: z.number().optional(),
      typescript: z.number().optional(),
    })
    .optional(),
});

export type ProcessoSeletivoInput = z.input<typeof ProcessoSeletivoSchema>;
export type TrilhaInput = z.input<typeof TrilhaSchema>;
export type CriterioBaremaInput = z.input<typeof CriterioBaremaSchema>;

export interface ResultadoValidacao<T> {
  valido: boolean;
  dados?: T;
  erros?: string[];
}

export function validarCriterioBarema(criterio: CriterioBaremaInput): string[] {
  const erros: string[] = [];
  if (criterio.pontuacaoMaxima < criterio.pontuacaoUnitaria) {
    erros.push("O teto individual de pontuação deve ser maior ou igual à pontuação unitária do critério.");
  }
  return erros;
}

export function validarProcessoSeletivo(
  input: ProcessoSeletivoInput
): ResultadoValidacao<ProcessoSeletivoInput> {
  const schemaResult = ProcessoSeletivoSchema.safeParse(input);
  const erros: string[] = [];

  if (!schemaResult.success) {
    schemaResult.error.errors.forEach((err) => {
      erros.push(err.message);
    });
  }

  const dados = schemaResult.success ? schemaResult.data : input;

  if (dados.inicioInscricoes && dados.fimInscricoes) {
    const inicioInsc = new Date(dados.inicioInscricoes);
    const fimInsc = new Date(dados.fimInscricoes);
    if (fimInsc <= inicioInsc) {
      erros.push("A data de término das inscrições deve ser posterior à data de início.");
    }

    if (dados.inicioProvas) {
      const inicioProv = new Date(dados.inicioProvas);
      if (inicioProv < fimInsc) {
        erros.push("O período de realização das provas deve iniciar após ou ao término das inscrições.");
      }
    }
  }

  if (dados.inicioProvas && dados.fimProvas) {
    const inicioProv = new Date(dados.inicioProvas);
    const fimProv = new Date(dados.fimProvas);
    if (fimProv < inicioProv) {
      erros.push("A data de término das provas deve ser posterior ou igual à data de início das provas.");
    }
  }

  if (dados.pesoProvaTecnica !== undefined && dados.pesoBaremaCurricular !== undefined) {
    const somaPesos = dados.pesoProvaTecnica + dados.pesoBaremaCurricular;
    if (Math.abs(somaPesos - 100) > 0.001) {
      erros.push("A soma dos pesos da prova técnica e do barema curricular deve ser exatamente 100%.");
    }
  }

  if (dados.notaCorteMinima !== undefined) {
    if (dados.notaCorteMinima < 0 || dados.notaCorteMinima > 100) {
      if (!erros.includes("A nota de corte mínima eliminatória deve estar entre 0 e 100.")) {
        erros.push("A nota de corte mínima eliminatória deve estar entre 0 e 100.");
      }
    }
  }

  if (dados.barema && Array.isArray(dados.barema)) {
    let somaTetosBarema = 0;
    for (const criterio of dados.barema) {
      const errosCriterio = validarCriterioBarema(criterio);
      erros.push(...errosCriterio);
      somaTetosBarema += Number(criterio.pontuacaoMaxima || 0);
    }

    if (Math.abs(somaTetosBarema - 100) > 0.001) {
      erros.push("A soma dos tetos máximos da matriz do Barema Curricular deve totalizar 100 pontos.");
    }
  }

  if (erros.length > 0) {
    return { valido: false, erros };
  }

  return { valido: true, dados: schemaResult.data };
}
