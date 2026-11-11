import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EspelhoAvaliacaoCandidatoView } from "./EspelhoAvaliacaoCandidatoView";
import { EspelhoAvaliacaoCandidato } from "@/domain/recurso/homologacao-recurso";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("EspelhoAvaliacaoCandidatoView (Espelho Individual e Interposição de Recurso)", () => {
  const espelhoMock: EspelhoAvaliacaoCandidato = {
    inscricaoId: "insc-100",
    codigoAnonimo: "CAND-4096",
    candidatoNome: "Helena Martins",
    candidatoCpf: "52998224725",
    trilhaNome: "Engenharia Backend",
    posicaoRanking: 2,
    statusClassificacao: "CLASSIFICADO",
    atendeNotaCorte: true,
    notaCorteMinima: 60,
    pesos: { pesoProvaTecnica: 70, pesoBaremaCurricular: 30 },
    provaPratica: {
      notaTecnicaTotal: 80,
      notaCorretude: 60,
      notaQualidade: 10,
      notaDesempenho: 10,
      linguagem: "TYPESCRIPT",
    },
    barema: {
      pontuacaoProvisoria: 40,
      pontuacaoHomologada: 0,
      statusAuditoria: "AUDITADO",
      itens: [
        {
          criterioId: "crit-pos",
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização em Engenharia de Software",
          quantidadeOuAnos: 1,
          pontuacaoUnitaria: 40,
          pontuacaoMaxima: 40,
          pontosProvisorios: 40,
          pontosHomologados: 0,
          statusAuditoria: "GLOSADO",
          motivoGlosa: "Assinatura digital não localizada na página 1.",
          arquivoComprovanteNome: "pos_helena.pdf",
        },
      ],
    },
    notaFinalConsolidada: 56,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe o Espelho de Avaliação detalhado do candidato e permite submeter recurso dentro do prazo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: "rec-1",
        inscricaoId: "insc-100",
        alvoContestacao: "BAREMA",
        fundamentacao:
          "A assinatura digital consta na página 2 do certificado enviado.",
        status: "EM_ANALISE",
        createdAt: new Date().toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EspelhoAvaliacaoCandidatoView
        candidatoIdInicial="cand-100"
        inscricaoIdInicial="insc-100"
        espelhoInicial={espelhoMock}
        janelaRecursosAbertaInicial={true}
        recursosIniciais={[]}
      />
    );

    // Verifica dados do espelho
    expect(screen.getByText(/Helena Martins/i)).toBeInTheDocument();
    expect(screen.getByText(/CAND-4096/i)).toBeInTheDocument();
    expect(screen.getByText("56.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Assinatura digital não localizada na página 1/i)
    ).toBeInTheDocument();

    // Preencher e enviar recurso
    const selectAlvo = screen.getByLabelText(/Etapa Contestada/i);
    fireEvent.change(selectAlvo, { target: { value: "BAREMA" } });

    const textareaFundamentacao = screen.getByPlaceholderText(
      /Fundamente tecnicamente seu pedido de revisão/i
    );
    fireEvent.change(textareaFundamentacao, {
      target: {
        value: "A assinatura digital consta na página 2 do certificado enviado.",
      },
    });

    const btnSubmeter = screen.getByRole("button", {
      name: /Protocolar Recurso Oficial/i,
    });
    fireEvent.click(btnSubmeter);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/recursos",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Recurso protocolado com sucesso/i)
      ).toBeInTheDocument();
    });
  });
});
