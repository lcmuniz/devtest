import { describe, it, expect } from "vitest";
import {
  verificarJanelaDeProvaAtiva,
  calcularTempoRestanteProva,
  construirChaveRascunhoCodigo,
  embaralharDesafiosPorCandidato,
} from "./ambiente-prova";

describe("Domínio: Ambiente de Prova, Cronômetro e Rascunho (Seam 1)", () => {
  const periodoProva = {
    inicioProvas: "2026-11-10T08:00:00.000Z",
    fimProvas: "2026-11-10T18:00:00.000Z",
  };

  it("deve permitir acesso à prova quando o horário atual estiver dentro da janela oficial e bloquear antes ou depois", () => {
    const durante = verificarJanelaDeProvaAtiva(
      periodoProva,
      new Date("2026-11-10T14:00:00.000Z")
    );
    expect(durante.ativa).toBe(true);

    const antes = verificarJanelaDeProvaAtiva(
      periodoProva,
      new Date("2026-11-10T07:00:00.000Z")
    );
    expect(antes.ativa).toBe(false);
    expect(antes.motivo).toMatch(/ainda não iniciou/i);

    const depois = verificarJanelaDeProvaAtiva(
      periodoProva,
      new Date("2026-11-10T19:00:00.000Z")
    );
    expect(depois.ativa).toBe(false);
    expect(depois.motivo).toMatch(/encerrado/i);
  });

  it("deve calcular o cronômetro regressivo exatamente em horas, minutos, segundos e string formatada", () => {
    const restante = calcularTempoRestanteProva(
      "2026-11-10T18:00:00.000Z",
      new Date("2026-11-10T16:25:30.000Z")
    );

    expect(restante.expirado).toBe(false);
    expect(restante.horas).toBe(1);
    expect(restante.minutos).toBe(34);
    expect(restante.segundos).toBe(30);
    expect(restante.formatado).toBe("01:34:30");

    const expirado = calcularTempoRestanteProva(
      "2026-11-10T18:00:00.000Z",
      new Date("2026-11-10T18:05:00.000Z")
    );
    expect(expirado.expirado).toBe(true);
    expect(expirado.formatado).toBe("00:00:00");
  });

  it("deve gerar chave determinística para salvamento automático de rascunho por inscrição e desafio", () => {
    const chave = construirChaveRascunhoCodigo("insc-901", "desafio-42");
    expect(chave).toBe("devtest:rascunho:insc-901:desafio-42");
  });

  it("deve embaralhar a ordem dos desafios de forma determinística por candidato (anti-cola)", () => {
    const listaOriginal = [
      { id: "desafio-1" },
      { id: "desafio-2" },
      { id: "desafio-3" },
      { id: "desafio-4" },
      { id: "desafio-5" },
    ];

    // Candidato A
    const ordemCandA1 = embaralharDesafiosPorCandidato(listaOriginal, "INSC-CAND-A");
    const ordemCandA2 = embaralharDesafiosPorCandidato(listaOriginal, "INSC-CAND-A");

    // 1. O mesmo candidato sempre recebe a mesma ordem (estabilidade em F5/reload)
    expect(ordemCandA1.map((d) => d.id)).toEqual(ordemCandA2.map((d) => d.id));

    // 2. Candidato B recebe uma ordem diferente da do Candidato A
    const ordemCandB = embaralharDesafiosPorCandidato(listaOriginal, "INSC-CAND-B");
    expect(ordemCandB.map((d) => d.id)).not.toEqual(ordemCandA1.map((d) => d.id));

    // 3. Todos os desafios continuam presentes sem perda ou duplicidade
    expect(new Set(ordemCandA1.map((d) => d.id))).toEqual(
      new Set(listaOriginal.map((d) => d.id))
    );
  });
});
