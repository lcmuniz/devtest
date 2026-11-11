import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ProvaWebIdeView } from "./ProvaWebIdeView";
import { LinguagemDesafio, DesafioPublicoCandidato } from "@/domain/desafio/desafio";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("Interface Web IDE do Candidato - Resolução do Desafio (Seam 3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const processoMock: ProcessoSeletivoEntity = {
    id: "ps-1",
    titulo: "PSS DevTest 2026",
    edital: "Edital 01/2026",
    descricao: "Seleção Técnica",
    inicioInscricoes: "2026-01-01T00:00:00Z",
    fimInscricoes: "2026-01-10T00:00:00Z",
    inicioProvas: "2026-01-15T00:00:00Z",
    fimProvas: "2099-12-31T23:59:59Z",
    pesoProvaTecnica: 60,
    pesoBaremaCurricular: 40,
    notaCorteMinima: 50,
    status: "PUBLICADO",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    trilhas: [{ id: "trilha-1", nome: "Fullstack TypeScript", descricao: "TS" }],
    barema: [
      {
        id: "b-1",
        tipo: TipoCriterioBarema.DOUTORADO,
        descricao: "Doutorado",
        pontuacaoUnitaria: 100,
        pontuacaoMaxima: 100,
        permiteMultiplos: false,
        exigeComprovante: true,
      },
    ],
  };

  const desafiosPublicosMock: DesafioPublicoCandidato[] = [
    {
      id: "desafio-10",
      processoSeletivoId: "ps-1",
      trilhaId: "trilha-1",
      titulo: "Auditoria de Limite de Despesa com Pessoal (LRF)",
      enunciadoMarkdown:
        "# Auditoria LRF\nImplemente a função **classificarSituacaoFiscal**.",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate:
        "export function classificarSituacaoFiscal(rcl: number, despesa: number) {\n  return 'REGULAR';\n}",
      suiteTestesPublicos:
        "describe('Testes Públicos', () => { it('40% é REGULAR', () => {}); });",
      timeoutSeconds: 10,
      memoryLimitMb: 512,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  it("deve renderizar o enunciado formatado, o código template no Web IDE, o cronômetro regressivo e salvar rascunho automaticamente no localStorage", () => {
    render(
      <ProvaWebIdeView
        inscricaoId="insc-101"
        processoSeletivo={processoMock}
        desafios={desafiosPublicosMock}
      />
    );

    expect(
      screen.getByText("Auditoria de Limite de Despesa com Pessoal (LRF)")
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/classificarSituacaoFiscal/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("cronometro-prova")).toBeInTheDocument();

    const editor = screen.getByLabelText(/editor de código web ide/i) as HTMLTextAreaElement;
    expect(editor.value).toContain("export function classificarSituacaoFiscal");

    fireEvent.change(editor, {
      target: {
        value: "export function classificarSituacaoFiscal() { return 'ALERTA'; }",
      },
    });

    const salvoNoStorage = window.localStorage.getItem(
      "devtest:rascunho:insc-101:desafio-10"
    );
    expect(salvoNoStorage).toBe(
      "export function classificarSituacaoFiscal() { return 'ALERTA'; }"
    );
  });

  it("deve acionar 'Testar Solução' e exibir no painel de saída os testes públicos aprovados, os que falharam com diff e o tempo de execução", async () => {
    const mockOnTestarSolucao = vi.fn().mockResolvedValue({
      status: "TEST_FAILURE",
      executionTimeMs: 42,
      memoryPeakKb: 18400,
      linterScore: 95,
      testResults: [
        {
          testName: "Testes Públicos > 40% é REGULAR",
          status: "PASSED",
          durationMs: 12,
        },
        {
          testName: "Testes Públicos > 50% é ALERTA",
          status: "FAILED",
          durationMs: 30,
          failureMessage: 'Esperado "ALERTA", recebido "REGULAR"',
        },
      ],
    });

    render(
      <ProvaWebIdeView
        inscricaoId="insc-101"
        processoSeletivo={processoMock}
        desafios={desafiosPublicosMock}
        onTestarSolucao={mockOnTestarSolucao}
      />
    );

    const btnTestar = screen.getByRole("button", { name: /testar solução/i });
    fireEvent.click(btnTestar);

    await waitFor(() => {
      expect(mockOnTestarSolucao).toHaveBeenCalledWith(
        "desafio-10",
        expect.stringContaining("classificarSituacaoFiscal")
      );
    });

    expect(
      await screen.findByText(/Testes Públicos > 40% é REGULAR/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Testes Públicos > 50% é ALERTA/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Esperado "ALERTA", recebido "REGULAR"/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/42 ms/i)).toBeInTheDocument();
  });

  it("deve abrir modal de confirmação ao clicar em 'Submissão Definitiva', submeter a solução, exibir nota da Autoavaliação Técnica e bloquear edições posteriores", async () => {
    const mockOnSubmeterDefinitivo = vi.fn().mockResolvedValue({
      sucesso: true,
      submissao: {
        id: "sub-900",
        inscricaoId: "insc-101",
        processoSeletivoId: "ps-1",
        desafioId: "desafio-10",
        linguagem: LinguagemDesafio.TYPESCRIPT,
        codigoFonte: "export function classificarSituacaoFiscal() { return 'REGULAR'; }",
        statusExecucao: "SUCCESS",
        notaCorretude: 70,
        notaQualidade: 15,
        notaDesempenho: 15,
        notaTecnicaTotal: 100,
        atendeNotaCorte: true,
        statusClassificacao: "CLASSIFICADO",
        createdAt: "2026-11-10T14:50:00.000Z",
        relatorioExecucao: {
          status: "SUCCESS",
          executionTimeMs: 25,
          memoryPeakKb: 12000,
          linterScore: 100,
          testResults: [],
        },
      },
    });

    render(
      <ProvaWebIdeView
        inscricaoId="insc-101"
        processoSeletivo={processoMock}
        desafios={desafiosPublicosMock}
        onSubmeterDefinitivo={mockOnSubmeterDefinitivo}
      />
    );

    const btnAbrirModal = screen.getByRole("button", {
      name: /submissão definitiva/i,
    });
    fireEvent.click(btnAbrirModal);

    expect(
      screen.getByText(/confirmar submissão definitiva/i)
    ).toBeInTheDocument();

    const btnConfirmar = screen.getByRole("button", {
      name: /confirmar e enviar solução/i,
    });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(mockOnSubmeterDefinitivo).toHaveBeenCalledWith(
        "desafio-10",
        expect.stringContaining("classificarSituacaoFiscal")
      );
    });

    expect(
      await screen.findByText(/submissão definitiva registrada/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/100 \/ 100 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/CLASSIFICADO/i)).toBeInTheDocument();

    const editor = screen.getByLabelText(
      /editor de código web ide/i
    ) as HTMLTextAreaElement;
    expect(editor.readOnly).toBe(true);
  });
});

