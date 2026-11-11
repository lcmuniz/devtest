import { describe, expect, it } from "vitest";
import {
  projetarItemRankingPorFase,
  gerarEspelhoAvaliacaoCandidato,
  validarInterposicaoRecurso,
  aplicarJulgamentoRecurso,
} from "./homologacao-recurso";
import { CandidatoRankingConsolidado } from "../banca/painel-banca";
import { TipoCriterioBarema } from "../processo-seletivo/processo-seletivo";

describe("Domínio de Homologação, Espelho de Avaliação e Recursos (Issue 08)", () => {
  const candidatoConsolidadoMock: CandidatoRankingConsolidado = {
    inscricaoId: "insc-100",
    codigoAnonimo: "CAND-4096",
    posicaoRanking: 1,
    candidatoId: "cand-real-100",
    candidatoNome: "Fernanda Lima",
    candidatoEmail: "fernanda@devtest.com",
    candidatoCpf: "52998224725",
    trilhaId: "trilha-back",
    trilhaNome: "Engenharia Backend",
    notaTecnicaTotal: 80,
    notaCorretude: 60,
    notaQualidade: 10,
    notaDesempenho: 10,
    atendeNotaCorte: true,
    statusClassificacao: "CLASSIFICADO",
    pontuacaoProvisoriaBarema: 80,
    pontuacaoHomologadaBarema: 40,
    notaBaremaUtilizada: 40,
    statusAuditoriaBarema: "AUDITADO",
    notaFinalConsolidada: 68, // (80*70 + 40*30)/100 = 68
    linguagem: "TYPESCRIPT",
    codigoFonte: "export const ok = true;",
    itensBaremaAuditados: [
      {
        criterioId: "crit-exp",
        tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
        descricao: "Experiência Profissional Backend",
        quantidadeOuAnos: 2,
        pontuacaoUnitaria: 20,
        pontuacaoMaxima: 60,
        pontosProvisorios: 40,
        pontosHomologados: 40,
        statusAuditoria: "VALIDADO",
        arquivoComprovanteNome: "ctps.pdf",
      },
      {
        criterioId: "crit-pos",
        tipo: TipoCriterioBarema.ESPECIALIZACAO,
        descricao: "Pós-Graduação Lato Sensu",
        quantidadeOuAnos: 1,
        pontuacaoUnitaria: 40,
        pontuacaoMaxima: 40,
        pontosProvisorios: 40,
        pontosHomologados: 0,
        statusAuditoria: "GLOSADO",
        motivoGlosa: "Faltou histórico escolar no PDF.",
        arquivoComprovanteNome: "diploma.pdf",
      },
    ],
  };

  it("oculta dados pessoais enquanto a Correção Cega estiver ativa e revela apenas após o desmascaramento formal", () => {
    const itemCego = projetarItemRankingPorFase(candidatoConsolidadoMock, false);
    const jsonCego = JSON.stringify(itemCego);
    expect(jsonCego).not.toContain("Fernanda Lima");
    expect(jsonCego).not.toContain("52998224725");
    expect(jsonCego).not.toContain("fernanda@devtest.com");
    expect(itemCego.candidatoNome).toBeUndefined();

    const itemDesmascarado = projetarItemRankingPorFase(
      candidatoConsolidadoMock,
      true
    );
    expect(itemDesmascarado.candidatoNome).toBe("Fernanda Lima");
    expect(itemDesmascarado.candidatoCpf).toBe("52998224725");
    expect(itemDesmascarado.candidatoEmail).toBe("fernanda@devtest.com");
  });

  it("gera o Espelho de Avaliação individual restrito ao próprio candidato titular da inscrição", () => {
    // Tentativa de acesso por outro candidato deve ser bloqueada
    expect(() =>
      gerarEspelhoAvaliacaoCandidato({
        candidatoSolicitanteId: "cand-invasor-999",
        itemRanking: candidatoConsolidadoMock,
        pesos: { pesoProvaTecnica: 70, pesoBaremaCurricular: 30 },
        notaCorteMinima: 60,
      })
    ).toThrow(/Acesso negado ao Espelho de Avaliação/i);

    const espelho = gerarEspelhoAvaliacaoCandidato({
      candidatoSolicitanteId: "cand-real-100",
      itemRanking: candidatoConsolidadoMock,
      pesos: { pesoProvaTecnica: 70, pesoBaremaCurricular: 30 },
      notaCorteMinima: 60,
    });

    expect(espelho.inscricaoId).toBe("insc-100");
    expect(espelho.codigoAnonimo).toBe("CAND-4096");
    expect(espelho.posicaoRanking).toBe(1);
    expect(espelho.provaPratica.notaTecnicaTotal).toBe(80);
    expect(espelho.barema.pontuacaoHomologada).toBe(40);
    expect(espelho.barema.itens).toHaveLength(2);
    expect(espelho.barema.itens[1].motivoGlosa).toContain("histórico escolar");
    expect(espelho.notaFinalConsolidada).toBe(68);
  });

  it("valida a interposição de recurso exigindo fundamentação mínima e janela de recursos aberta", () => {
    const recursoCurto = validarInterposicaoRecurso({
      inscricaoId: "insc-100",
      candidatoId: "cand-real-100",
      alvoContestacao: "BAREMA",
      fundamentacao: "Discordo",
      janelaRecursosAberta: true,
    });
    expect(recursoCurto.valido).toBe(false);
    expect(recursoCurto.erro).toMatch(/fundamentação.*mínimo 15 caracteres/i);

    const recursoForaPrazo = validarInterposicaoRecurso({
      inscricaoId: "insc-100",
      candidatoId: "cand-real-100",
      alvoContestacao: "PROVA_PRATICA",
      fundamentacao: "Solicito revisão do caso de teste oculto 2 por arredondamento.",
      janelaRecursosAberta: false,
    });
    expect(recursoForaPrazo.valido).toBe(false);
    expect(recursoForaPrazo.erro).toMatch(/prazo para interposição de recursos está encerrado/i);

    const recursoValido = validarInterposicaoRecurso({
      inscricaoId: "insc-100",
      candidatoId: "cand-real-100",
      alvoContestacao: "BAREMA",
      fundamentacao: "O histórico escolar consta na página 2 do arquivo PDF enviado.",
      janelaRecursosAberta: true,
    });
    expect(recursoValido.valido).toBe(true);
  });

  it("aplica o julgamento de recurso (Deferido/Indeferido) exigindo parecer técnico e ajustando a pontuação", () => {
    const semParecer = aplicarJulgamentoRecurso({
      alvoContestacao: "BAREMA",
      decisao: "DEFERIDO",
      parecerBanca: "ok",
      novaPontuacaoAlvo: 80,
      notaTecnicaAtual: 80,
      notaBaremaAtual: 40,
      notaCorteMinima: 60,
    });
    expect(semParecer.valido).toBe(false);
    expect(semParecer.erro).toMatch(/parecer técnico formal da banca é obrigatório/i);

    const deferidoBarema = aplicarJulgamentoRecurso({
      alvoContestacao: "BAREMA",
      decisao: "DEFERIDO",
      parecerBanca:
        "Deferido após verificação da página 2 do comprovante PDF da Pós-Graduação.",
      novaPontuacaoAlvo: 80,
      notaTecnicaAtual: 80,
      notaBaremaAtual: 40,
      notaCorteMinima: 60,
    });
    expect(deferidoBarema.valido).toBe(true);
    expect(deferidoBarema.notaBaremaAjustada).toBe(80);
    expect(deferidoBarema.notaTecnicaAjustada).toBe(80);
    expect(deferidoBarema.atendeNotaCorteAjustado).toBe(true);
  });
});
