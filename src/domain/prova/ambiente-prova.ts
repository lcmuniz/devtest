export interface JanelaProvaStatus {
  ativa: boolean;
  motivo?: string;
}

export function verificarJanelaDeProvaAtiva(
  processoSeletivo: { inicioProvas: string; fimProvas: string },
  agora: Date = new Date()
): JanelaProvaStatus {
  const inicio = new Date(processoSeletivo.inicioProvas);
  const fim = new Date(processoSeletivo.fimProvas);

  if (agora < inicio) {
    return {
      ativa: false,
      motivo: "O período de realização das provas ainda não iniciou.",
    };
  }

  if (agora > fim) {
    return {
      ativa: false,
      motivo: "O período de realização das provas já está encerrado.",
    };
  }

  return { ativa: true };
}

export interface TempoRestanteProva {
  expirado: boolean;
  totalSegundos: number;
  horas: number;
  minutos: number;
  segundos: number;
  formatado: string;
}

export function calcularTempoRestanteProva(
  fimProvas: string,
  agora: Date = new Date()
): TempoRestanteProva {
  const fimMs = new Date(fimProvas).getTime();
  const agoraMs = agora.getTime();
  const diffSegundos = Math.floor((fimMs - agoraMs) / 1000);

  if (diffSegundos <= 0) {
    return {
      expirado: true,
      totalSegundos: 0,
      horas: 0,
      minutos: 0,
      segundos: 0,
      formatado: "00:00:00",
    };
  }

  const horas = Math.floor(diffSegundos / 3600);
  const minutos = Math.floor((diffSegundos % 3600) / 60);
  const segundos = diffSegundos % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    expirado: false,
    totalSegundos: diffSegundos,
    horas,
    minutos,
    segundos,
    formatado: `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`,
  };
}

export function construirChaveRascunhoCodigo(
  inscricaoId: string,
  desafioId: string
): string {
  return `devtest:rascunho:${inscricaoId}:${desafioId}`;
}

/**
 * Cria um gerador pseudo-aleatório rápido e determinístico baseado na semente (Mulberry32).
 */
function criarPrng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Embaralha a lista de desafios de forma determinística por candidato (utilizando código anônimo ou ID da inscrição).
 * Garante que:
 * 1. Dois candidatos diferentes recebam ordens distintas de desafios.
 * 2. O mesmo candidato sempre veja exatamente a mesma ordem ao recarregar a página.
 */
export function embaralharDesafiosPorCandidato<T>(
  desafios: T[],
  sementeCandidato: string
): T[] {
  if (!sementeCandidato || desafios.length <= 1) {
    return [...desafios];
  }
  const lista = [...desafios];
  const random = criarPrng(sementeCandidato);
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = lista[i];
    lista[i] = lista[j];
    lista[j] = temp;
  }
  return lista;
}
