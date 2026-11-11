import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PainelBancaAvaliadoraView } from "./PainelBancaAvaliadoraView";
import { CandidatoRankingCego } from "@/domain/banca/painel-banca";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("PainelBancaAvaliadoraView (Correção Cega, Ranking Consolidado e Auditoria de Barema)", () => {
  const processosMock = [
    {
      id: "ps-1",
      titulo: "Seletivo Especialista em Engenharia de Software DevTest",
      edital: "Edital nº 01/2026",
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      notaCorteMinima: 60,
      trilhas: [
        { id: "trilha-back", nome: "Engenharia Backend" },
        { id: "trilha-dados", nome: "Ciência de Dados" },
      ],
    },
  ];

  const rankingInicialMock: CandidatoRankingCego[] = [
    {
      inscricaoId: "insc-1",
      codigoAnonimo: "CAND-1024",
      posicaoRanking: 1,
      trilhaId: "trilha-back",
      trilhaNome: "Engenharia Backend",
      notaTecnicaTotal: 85,
      notaCorretude: 65,
      notaQualidade: 10,
      notaDesempenho: 10,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      pontuacaoProvisoriaBarema: 80,
      pontuacaoHomologadaBarema: null,
      notaBaremaUtilizada: 80,
      statusAuditoriaBarema: "PENDENTE",
      notaFinalConsolidada: 83.5,
      linguagem: "TYPESCRIPT",
      codigoFonte: "export function calcularImposto(v: number) { return v * 0.15; }",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 48,
        memoryPeakKb: 22400,
        testResults: [
          { testName: "Teste 1", status: "PASSED", durationMs: 20, isHidden: false },
          { testName: "Teste Oculto 1", status: "PASSED", durationMs: 28, isHidden: true },
        ],
        linterScore: 95,
        linterViolations: [],
      },
      itensBaremaAuditados: [
        {
          criterioId: "crit-exp",
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Experiência Backend Sênior",
          quantidadeOuAnos: 2,
          pontuacaoUnitaria: 20,
          pontuacaoMaxima: 60,
          pontosProvisorios: 40,
          pontosHomologados: 0,
          statusAuditoria: "PENDENTE",
          arquivoComprovanteNome: "ctps_digital.pdf",
        },
        {
          criterioId: "crit-pos",
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização em Engenharia de Software",
          quantidadeOuAnos: 1,
          pontuacaoUnitaria: 40,
          pontuacaoMaxima: 40,
          pontosProvisorios: 40,
          pontosHomologados: 0,
          statusAuditoria: "PENDENTE",
          arquivoComprovanteNome: "diploma_pos.pdf",
        },
      ],
    },
    {
      inscricaoId: "insc-2",
      codigoAnonimo: "CAND-2048",
      posicaoRanking: null,
      trilhaId: "trilha-dados",
      trilhaNome: "Ciência de Dados",
      notaTecnicaTotal: 42,
      notaCorretude: 25,
      notaQualidade: 9,
      notaDesempenho: 8,
      atendeNotaCorte: false,
      statusClassificacao: "DESCLASSIFICADO_NOTA_CORTE",
      pontuacaoProvisoriaBarema: 90,
      pontuacaoHomologadaBarema: null,
      notaBaremaUtilizada: 90,
      statusAuditoriaBarema: "PENDENTE",
      notaFinalConsolidada: null,
      linguagem: "PYTHON",
      codigoFonte: "def modelo(): return 0",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe a tabela de classificação em modo de Correção Cega com notas consolidadas e filtra por Trilha", () => {
    render(
      <PainelBancaAvaliadoraView
        processosIniciais={processosMock}
        rankingInicial={rankingInicialMock}
      />
    );

    expect(screen.getByText(/Correção Cega Ativa/i)).toBeInTheDocument();
    expect(screen.getByText("CAND-1024")).toBeInTheDocument();
    expect(screen.getByText("83.50")).toBeInTheDocument();
    expect(screen.getByText("CAND-2048")).toBeInTheDocument();

    // Filtrar por trilha Ciência de Dados
    const selectTrilha = screen.getByLabelText(/Filtrar por Trilha/i);
    fireEvent.change(selectTrilha, { target: { value: "trilha-dados" } });

    expect(screen.queryByText("CAND-1024")).not.toBeInTheDocument();
    expect(screen.getByText("CAND-2048")).toBeInTheDocument();
  });

  it("inspeciona código-fonte anônimo, métricas do Runner e realiza auditoria (validar/glosar) dos PDFs do Barema", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auditoria-barema")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            inscricaoId: "insc-1",
            codigoAnonimo: "CAND-1024",
            pontuacaoProvisoriaBarema: 80,
            pontuacaoHomologadaBarema: 40,
            statusAuditoriaBarema: "AUDITADO",
          }),
        });
      }
      // Recarregamento do ranking após auditoria
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ranking: [
            {
              ...rankingInicialMock[0],
              pontuacaoHomologadaBarema: 40,
              notaBaremaUtilizada: 40,
              statusAuditoriaBarema: "AUDITADO",
              notaFinalConsolidada: 71.5,
            },
          ],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PainelBancaAvaliadoraView
        processosIniciais={processosMock}
        rankingInicial={rankingInicialMock}
      />
    );

    const btnInspecionar = screen.getByRole("button", {
      name: /Inspecionar CAND-1024/i,
    });
    fireEvent.click(btnInspecionar);

    // Verifica exibição do código-fonte e métricas do Runner
    expect(
      screen.getByText(/export function calcularImposto/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/48 ms/i)).toBeInTheDocument();
    expect(screen.getByText(/95\/100/i)).toBeInTheDocument();

    // Verifica listagem dos comprovantes PDF do Barema
    expect(screen.getByText("ctps_digital.pdf")).toBeInTheDocument();
    expect(screen.getByText("diploma_pos.pdf")).toBeInTheDocument();

    // Validar o primeiro item e glosar o segundo item
    const btnValidarExp = screen.getByRole("button", {
      name: /Validar Experiência Backend Sênior/i,
    });
    fireEvent.click(btnValidarExp);

    const btnGlosarPos = screen.getByRole("button", {
      name: /Glosar Especialização em Engenharia de Software/i,
    });
    fireEvent.click(btnGlosarPos);

    const inputMotivo = screen.getByPlaceholderText(
      /Justificativa obrigatória da glosa/i
    );
    fireEvent.change(inputMotivo, {
      target: { value: "Certificado sem assinatura do MEC." },
    });

    const btnSalvarAuditoria = screen.getByRole("button", {
      name: /Salvar Auditoria do Barema/i,
    });
    fireEvent.click(btnSalvarAuditoria);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/banca/inscricoes/insc-1/auditoria-barema",
        expect.objectContaining({ method: "PATCH" })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("71.50")).toBeInTheDocument();
    });
  });

  it("permite encerrar a etapa anônima (desmascarar candidatos) e julgar recursos com parecer técnico", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/desmascarar")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "ps-1",
            etapaAnonimaEncerrada: true,
            janelaRecursosAberta: true,
            modoCorrecaoCega: false,
          }),
        });
      }
      if (url.includes("/julgar")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recurso: {
              id: "rec-10",
              status: "DEFERIDO",
              parecerBanca: "Deferido conforme documento anexo.",
              novaPontuacaoAlvo: 80,
            },
          }),
        });
      }
      if (url.includes("/api/recursos")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recursos: [
              {
                id: "rec-10",
                inscricaoId: "insc-1",
                processoSeletivoId: "ps-1",
                candidatoId: "c-1",
                codigoAnonimo: "CAND-1024",
                alvoContestacao: "BAREMA",
                fundamentacao: "O diploma possui assinatura digital ICP-Brasil.",
                status: "DEFERIDO",
                parecerBanca: "Deferido conforme documento anexo.",
                novaPontuacaoAlvo: 80,
                createdAt: "2026-06-01T10:00:00.000Z",
                updatedAt: "2026-06-01T11:00:00.000Z",
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          modoCorrecaoCega: false,
          ranking: [
            {
              ...rankingInicialMock[0],
              candidatoNome: "Helena Martins",
              candidatoCpf: "52998224725",
              candidatoEmail: "helena@devtest.com",
            },
          ],
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PainelBancaAvaliadoraView
        processosIniciais={processosMock}
        rankingInicial={rankingInicialMock}
        recursosIniciais={[
          {
            id: "rec-10",
            inscricaoId: "insc-1",
            processoSeletivoId: "ps-1",
            candidatoId: "c-1",
            codigoAnonimo: "CAND-1024",
            alvoContestacao: "BAREMA",
            fundamentacao: "O diploma possui assinatura digital ICP-Brasil.",
            status: "EM_ANALISE",
            createdAt: "2026-06-01T10:00:00.000Z",
            updatedAt: "2026-06-01T10:00:00.000Z",
          },
        ]}
      />
    );

    // 1. Acionar desmascaramento
    const btnDesmascarar = screen.getByRole("button", {
      name: /Encerrar Etapa Anônima e Revelar Candidatos/i,
    });
    fireEvent.click(btnDesmascarar);

    await waitFor(() => {
      expect(screen.getByText(/Helena Martins/i)).toBeInTheDocument();
    });

    // 2. Julgar recurso recebido
    expect(
      screen.getByText(/O diploma possui assinatura digital ICP-Brasil/i)
    ).toBeInTheDocument();

    const inputParecer = screen.getByPlaceholderText(
      /Registre o parecer técnico fundamentado da banca/i
    );
    fireEvent.change(inputParecer, {
      target: { value: "Deferido conforme documento anexo." },
    });

    const inputNovaNota = screen.getByPlaceholderText(/Nova nota \(0-100\)/i);
    fireEvent.change(inputNovaNota, { target: { value: "80" } });

    const btnDeferir = screen.getByRole("button", {
      name: /^Deferir Recurso rec-10$/i,
    });
    fireEvent.click(btnDeferir);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/banca/recursos/rec-10/julgar",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("exibe links de exportação oficial e permite acionar convocação de aprovados por e-mail", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/banca/notificacoes/convocar")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            totalEnviados: 1,
            convocados: [
              {
                inscricaoId: "insc-1",
                nome: "Helena Martins",
                email: "helena@devtest.com",
                posicaoRanking: 1,
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PainelBancaAvaliadoraView
        processosIniciais={processosMock}
        rankingInicial={rankingInicialMock}
      />
    );

    // Verifica botões de relatórios oficiais
    expect(screen.getByText(/Exportar Ranking \(CSV \/ Excel\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Relatório Oficial \(PDF \/ Impressão\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ata de Recursos \(CSV\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ata de Recursos \(PDF\)/i)).toBeInTheDocument();

    // Clica no botão de convocar aprovados para abrir o modal
    const btnConvocar = screen.getByRole("button", {
      name: /Convocar Candidatos Aprovados/i,
    });
    fireEvent.click(btnConvocar);

    expect(
      screen.getByText(/Convocação Oficial de Aprovados por E-mail/i)
    ).toBeInTheDocument();

    const btnConfirmar = screen.getByRole("button", {
      name: /Confirmar e Enviar Convocação/i,
    });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/banca/notificacoes/convocar",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/1 candidato\(s\) convocado\(s\) com sucesso por e-mail!/i)
      ).toBeInTheDocument();
    });
  });
});
