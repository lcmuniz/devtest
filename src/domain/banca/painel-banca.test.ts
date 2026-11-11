import { describe, expect, it } from "vitest";
import {
  calcularNotaFinalConsolidada,
  auditarItensBarema,
  gerarRankingConsolidado,
  sanitizarItemRankingParaCorrecaoCega,
  CandidatoRankingInput,
} from "./painel-banca";
import {
  CriterioBaremaInput,
  TipoCriterioBarema,
} from "../processo-seletivo/processo-seletivo";

describe("Domínio do Painel da Banca - Correção Cega e Ranking Consolidado", () => {
  const matrizBarema: (CriterioBaremaInput & { id: string })[] = [
    {
      id: "crit-exp",
      tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
      descricao: "Experiência em desenvolvimento backend (20 pts por ano)",
      pontuacaoUnitaria: 20,
      pontuacaoMaxima: 60,
      permiteMultiplos: true,
      exigeComprovante: true,
    },
    {
      id: "crit-pos",
      tipo: TipoCriterioBarema.ESPECIALIZACAO,
      descricao: "Especialização Lato Sensu ou Mestrado",
      pontuacaoUnitaria: 40,
      pontuacaoMaxima: 40,
      permiteMultiplos: false,
      exigeComprovante: true,
    },
  ];

  it("calcula a Nota Final Consolidada ponderada apenas para candidatos aprovados no corte", () => {
    // (80 * 70 + 50 * 30) / (70 + 30) = (5600 + 1500) / 100 = 71.00
    const notaAprovado = calcularNotaFinalConsolidada({
      notaTecnicaTotal: 80,
      notaBarema: 50,
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      atendeNotaCorte: true,
    });
    expect(notaAprovado).toBe(71);

    // Candidato reprovado no corte não tem Nota Final Consolidada
    const notaReprovado = calcularNotaFinalConsolidada({
      notaTecnicaTotal: 45,
      notaBarema: 100,
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      atendeNotaCorte: false,
    });
    expect(notaReprovado).toBeNull();
  });

  it("audita itens do Barema permitindo validar ou glosar comprovantes PDF com recálculo da nota homologada", () => {
    const resultado = auditarItensBarema(
      matrizBarema,
      [
        {
          criterioId: "crit-exp",
          quantidadeOuAnos: 2, // 40 pts declarados
          arquivoComprovanteNome: "ctps.pdf",
        },
        {
          criterioId: "crit-pos",
          quantidadeOuAnos: 1, // 40 pts declarados
          arquivoComprovanteNome: "diploma_invalido.pdf",
        },
      ],
      [
        {
          criterioId: "crit-exp",
          statusAuditoria: "VALIDADO",
        },
        {
          criterioId: "crit-pos",
          statusAuditoria: "GLOSADO",
          motivoGlosa: "Certificado sem carga horária mínima de 360h exigida no edital.",
        },
      ]
    );

    expect(resultado.errosValidacao).toBeUndefined();
    expect(resultado.pontuacaoProvisoriaBarema).toBe(80);
    expect(resultado.pontuacaoHomologadaBarema).toBe(40);
    expect(resultado.statusAuditoriaGeral).toBe("AUDITADO");

    const itemExp = resultado.itensAuditados.find((i) => i.criterioId === "crit-exp");
    const itemPos = resultado.itensAuditados.find((i) => i.criterioId === "crit-pos");
    expect(itemExp?.pontosHomologados).toBe(40);
    expect(itemPos?.pontosHomologados).toBe(0);
    expect(itemPos?.motivoGlosa).toContain("360h");
  });

  it("exige motivo de glosa ao glosar um item do Barema", () => {
    const resultado = auditarItensBarema(
      matrizBarema,
      [
        {
          criterioId: "crit-pos",
          quantidadeOuAnos: 1,
          arquivoComprovanteNome: "diploma.pdf",
        },
      ],
      [
        {
          criterioId: "crit-pos",
          statusAuditoria: "GLOSADO",
          motivoGlosa: "   ",
        },
      ]
    );

    expect(resultado.errosValidacao).toBeDefined();
    expect(resultado.errosValidacao?.[0]).toMatch(/motivo da glosa é obrigatório/i);
  });

  it("ordena o ranking pela Nota Final Consolidada e aplica critérios de desempate (maior Nota Técnica, depois Barema)", () => {
    const entradas: CandidatoRankingInput[] = [
      {
        inscricaoId: "insc-1",
        codigoAnonimo: "CAND-1001",
        candidatoId: "c-1",
        candidatoNome: "Alice Silva",
        candidatoEmail: "alice@example.com",
        candidatoCpf: "11122233344",
        trilhaId: "trilha-back",
        trilhaNome: "Engenharia Backend",
        notaTecnicaTotal: 70,
        notaCorretude: 50,
        notaQualidade: 10,
        notaDesempenho: 10,
        atendeNotaCorte: true,
        statusClassificacao: "CLASSIFICADO",
        pontuacaoProvisoriaBarema: 90, // Final = 70*0.7 + 90*0.3 = 49 + 27 = 76.0
        pontuacaoHomologadaBarema: null,
        statusAuditoriaBarema: "PENDENTE",
      },
      {
        inscricaoId: "insc-2",
        codigoAnonimo: "CAND-1002",
        candidatoId: "c-2",
        candidatoNome: "Bruno Costa",
        candidatoEmail: "bruno@example.com",
        candidatoCpf: "22233344455",
        trilhaId: "trilha-back",
        trilhaNome: "Engenharia Backend",
        notaTecnicaTotal: 85,
        notaCorretude: 65,
        notaQualidade: 10,
        notaDesempenho: 10,
        atendeNotaCorte: true,
        statusClassificacao: "CLASSIFICADO",
        pontuacaoProvisoriaBarema: 55, // Final = 85*0.7 + 55*0.3 = 59.5 + 16.5 = 76.0 (Empate na Final, vence na Técnica: 85 > 70)
        pontuacaoHomologadaBarema: null,
        statusAuditoriaBarema: "PENDENTE",
      },
      {
        inscricaoId: "insc-3",
        codigoAnonimo: "CAND-1003",
        candidatoId: "c-3",
        candidatoNome: "Carlos Souza",
        candidatoEmail: "carlos@example.com",
        candidatoCpf: "33344455566",
        trilhaId: "trilha-back",
        trilhaNome: "Engenharia Backend",
        notaTecnicaTotal: 50,
        notaCorretude: 35,
        notaQualidade: 10,
        notaDesempenho: 5,
        atendeNotaCorte: false,
        statusClassificacao: "DESCLASSIFICADO_NOTA_CORTE",
        pontuacaoProvisoriaBarema: 100,
        pontuacaoHomologadaBarema: null,
        statusAuditoriaBarema: "PENDENTE",
      },
    ];

    const ranking = gerarRankingConsolidado(entradas, {
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
    });

    expect(ranking).toHaveLength(3);
    // 1º lugar: CAND-1002 (mesma nota final 76.0, mas maior nota técnica 85 vs 70)
    expect(ranking[0].codigoAnonimo).toBe("CAND-1002");
    expect(ranking[0].posicaoRanking).toBe(1);
    expect(ranking[0].notaFinalConsolidada).toBe(76);

    // 2º lugar: CAND-1001
    expect(ranking[1].codigoAnonimo).toBe("CAND-1001");
    expect(ranking[1].posicaoRanking).toBe(2);
    expect(ranking[1].notaFinalConsolidada).toBe(76);

    // Reprovado no corte fica sem posição no ranking e sem nota final consolidada
    expect(ranking[2].codigoAnonimo).toBe("CAND-1003");
    expect(ranking[2].posicaoRanking).toBeNull();
    expect(ranking[2].notaFinalConsolidada).toBeNull();
  });

  it("remove 100% dos dados pessoais (nome, e-mail, CPF, candidatoId) na projeção de Correção Cega", () => {
    const ranking = gerarRankingConsolidado(
      [
        {
          inscricaoId: "insc-1",
          codigoAnonimo: "CAND-1024",
          candidatoId: "cand-secret-id",
          candidatoNome: "Maria Oliveira",
          candidatoEmail: "maria@secret.com",
          candidatoCpf: "99988877766",
          trilhaId: "trilha-back",
          trilhaNome: "Engenharia Backend",
          notaTecnicaTotal: 90,
          notaCorretude: 70,
          notaQualidade: 10,
          notaDesempenho: 10,
          atendeNotaCorte: true,
          statusClassificacao: "CLASSIFICADO",
          pontuacaoProvisoriaBarema: 80,
          pontuacaoHomologadaBarema: 80,
          statusAuditoriaBarema: "AUDITADO",
        },
      ],
      {
        pesoProvaTecnica: 70,
        pesoBaremaCurricular: 30,
      }
    );

    const itemCego = sanitizarItemRankingParaCorrecaoCega(ranking[0]);
    const serializado = JSON.stringify(itemCego);

    expect(itemCego.codigoAnonimo).toBe("CAND-1024");
    expect(serializado).not.toContain("Maria Oliveira");
    expect(serializado).not.toContain("maria@secret.com");
    expect(serializado).not.toContain("99988877766");
    expect(serializado).not.toContain("cand-secret-id");
  });
});
