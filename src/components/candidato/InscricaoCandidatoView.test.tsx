import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { InscricaoCandidatoView } from "./InscricaoCandidatoView";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";

describe("Interface do Candidato - Inscrição e Cálculo de Barema (Seam 3)", () => {
  const processosAbertos: ProcessoSeletivoEntity[] = [
    {
      id: "ps-1",
      titulo: "Processo Seletivo Simplificado DevTest 2026/1",
      edital: "Edital nº 01/2026 - DevTest",
      descricao: "Vagas temporárias de TI",
      inicioInscricoes: "2026-01-01T08:00:00Z",
      fimInscricoes: "2026-12-31T23:59:59Z",
      inicioProvas: "2027-01-10T08:00:00Z",
      fimProvas: "2027-01-20T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      status: "PUBLICADO",
      createdAt: "2026-01-01T08:00:00Z",
      updatedAt: "2026-01-01T08:00:00Z",
      trilhas: [
        { id: "trilha-backend", nome: "Backend Java", descricao: "Java 21 e Spring Boot" },
        { id: "trilha-frontend", nome: "Frontend React", descricao: "Next.js e React 19" },
      ],
      barema: [
        {
          id: "crit-exp",
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Anos de experiência comprovada",
          pontuacaoUnitaria: 2.0,
          pontuacaoMaxima: 20.0,
          permiteMultiplos: true,
          exigeComprovante: true,
        },
        {
          id: "crit-esp",
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Pós-graduação Lato Sensu",
          pontuacaoUnitaria: 10.0,
          pontuacaoMaxima: 10.0,
          permiteMultiplos: false,
          exigeComprovante: true,
        },
      ],
    },
  ];

  it("deve listar os processos seletivos abertos disponíveis para inscrição", () => {
    render(<InscricaoCandidatoView processos={processosAbertos} />);

    expect(screen.getByText("Minhas Inscrições")).toBeInTheDocument();
    expect(screen.getByText("Processos Seletivos")).toBeInTheDocument();
    expect(screen.getByText("Processo Seletivo Simplificado DevTest 2026/1")).toBeInTheDocument();
    expect(screen.getByText("Edital nº 01/2026 - DevTest")).toBeInTheDocument();
    expect(screen.getByText("Inscrever-se")).toBeInTheDocument();
  });

  it("deve abrir o formulário dinâmico de inscrição e exibir campos baseados no Barema", () => {
    render(<InscricaoCandidatoView processos={processosAbertos} />);

    fireEvent.click(screen.getByRole("button", { name: /inscrever-se/i }));

    expect(screen.getByText("Inscrição e Barema Curricular")).toBeInTheDocument();
    // Sem sessão, o formulário pede login em vez de cadastrar candidato
    expect(screen.getByText(/sessão não encontrada/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome completo/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/trilha técnica/i)).toBeInTheDocument();

    expect(screen.getByText("Anos de experiência comprovada")).toBeInTheDocument();
    expect(screen.getByText("Pós-graduação Lato Sensu")).toBeInTheDocument();
  });

  it("deve calcular a pontuação provisória do Barema em tempo real conforme preenchimento", () => {
    render(<InscricaoCandidatoView processos={processosAbertos} />);

    fireEvent.click(screen.getByRole("button", { name: /inscrever-se/i }));

    const inputExp = screen.getByLabelText(/anos de experiência comprovada/i);
    fireEvent.change(inputExp, { target: { value: "3" } });

    expect(screen.getByText(/6.00 \/ 100 pts/i)).toBeInTheDocument();
  });

  it("deve submeter a inscrição e exibir a tela de confirmação com o comprovante e número de inscrição", async () => {
    const mockOnSubmeter = vi.fn().mockResolvedValue({
      sucesso: true,
      inscricao: {
        id: "insc-123",
        numeroInscricao: "INSC-2026-1001",
        codigoAnonimo: "CAND-4091",
        candidatoNome: "Maria da Penha",
        candidatoCpf: "52998224725",
        candidatoEmail: "maria@devtest.com",
        processoSeletivoTitulo: "Processo Seletivo Simplificado DevTest 2026/1",
        trilhaNome: "Backend Java",
        pontuacaoProvisoriaBarema: 16.0,
        createdAt: "2026-03-01T10:00:00Z",
        extratoBarema: {
          pontuacaoProvisoriaBarema: 16.0,
          itensDetalhados: [
            {
              criterioId: "crit-exp",
              tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
              descricao: "Anos de experiência comprovada",
              quantidadeOuAnos: 3,
              pontosCalculados: 6.0,
              atingiuTeto: false,
              arquivoComprovanteNome: "experiencia.pdf",
            },
            {
              criterioId: "crit-esp",
              tipo: TipoCriterioBarema.ESPECIALIZACAO,
              descricao: "Pós-graduação Lato Sensu",
              quantidadeOuAnos: 1,
              pontosCalculados: 10.0,
              atingiuTeto: true,
              arquivoComprovanteNome: "pos.pdf",
            },
          ],
        },
      },
    });

    render(
      <InscricaoCandidatoView
        processos={processosAbertos}
        candidatoInicial={{ id: "cand-maria", nome: "Maria da Penha", email: "maria@devtest.com", cpf: "52998224725" }}
        onSubmeterInscricao={mockOnSubmeter}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /inscrever-se/i }));

    const btnFinalizar = screen.getByRole("button", { name: /confirmar e submeter inscrição/i });
    fireEvent.click(btnFinalizar);

    await waitFor(() => {
      expect(mockOnSubmeter).toHaveBeenCalledWith(
        expect.objectContaining({ candidatoId: "cand-maria", processoSeletivoId: "ps-1" })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Comprovante de Inscrição Oficial")).toBeInTheDocument();
      expect(screen.getByText("INSC-2026-1001")).toBeInTheDocument();
      expect(screen.getByText("CAND-4091")).toBeInTheDocument();
      expect(screen.getByText("16.00 pts")).toBeInTheDocument();
    });
  });

  it("deve exibir múltiplos processos seletivos na listagem do candidato com badge de status", () => {
    const doisProcessos: ProcessoSeletivoEntity[] = [
      ...processosAbertos,
      {
        ...processosAbertos[0],
        id: "ps-2",
        titulo: "Processo Seletivo Simplificado DevTest 2026/2",
        edital: "Edital nº 02/2026 - DevTest",
        inicioInscricoes: "2026-11-09T16:00:00.000Z",
        fimInscricoes: "2026-11-13T16:00:00.000Z",
      },
    ];

    render(<InscricaoCandidatoView processos={doisProcessos} onSubmeterInscricao={vi.fn()} />);

    expect(screen.getByText("Processo Seletivo Simplificado DevTest 2026/1")).toBeInTheDocument();
    expect(screen.getByText("Processo Seletivo Simplificado DevTest 2026/2")).toBeInTheDocument();
    expect(screen.getAllByText("Inscrições Abertas")).toHaveLength(2);
  });

  it("deve exibir a lista de processos em que o candidato já está inscrito com código anônimo e pontuação", () => {
    const inscricoesIniciais = [
      {
        id: "insc-existente-1",
        numeroInscricao: "INSC-2026-9999",
        codigoAnonimo: "CAND-7777",
        candidatoId: "cand-1",
        candidatoNome: "Ana Paula",
        candidatoEmail: "ana@devtest.com",
        candidatoCpf: "12345678901",
        processoSeletivoId: "ps-1",
        processoSeletivoTitulo: "Processo Seletivo Simplificado DevTest 2026/1",
        trilhaId: "trilha-backend",
        trilhaNome: "Backend Java",
        itensBarema: [],
        pontuacaoProvisoriaBarema: 12.0,
        extratoBarema: { pontuacaoProvisoriaBarema: 12.0, itensDetalhados: [] },
        createdAt: "2026-02-01T10:00:00Z",
      },
    ];

    render(
      <InscricaoCandidatoView
        processos={processosAbertos}
        candidatoInicial={{ id: "cand-1", nome: "Ana Paula", email: "ana@devtest.com", cpf: "12345678901" }}
        inscricoesIniciais={inscricoesIniciais as any}
      />
    );

    expect(screen.getByText("Processos em que estou Inscrito")).toBeInTheDocument();
    expect(screen.getByText("INSC-2026-9999")).toBeInTheDocument();
    expect(screen.getByText("CAND-7777")).toBeInTheDocument();
    expect(screen.getByText("12.00 pts")).toBeInTheDocument();
    expect(screen.getByText("Acessar Web IDE →")).toBeInTheDocument();

    // Na lista de processos e nas inscrições ativas, deve haver indicação visual de que já está inscrito na trilha Backend Java
    expect(screen.getAllByText(/Backend Java/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("(Inscrito)")).toBeInTheDocument();
    expect(screen.getByText(/✓ Inscrito/i)).toBeInTheDocument();
    // Como ainda resta a trilha Frontend React, o botão deve permitir inscrever-se em outra trilha
    expect(screen.getByText("Inscrever-se em Outra Trilha")).toBeInTheDocument();
  });

  it("deve desabilitar o botão de inscrever quando o usuário estiver inscrito em todas as trilhas do processo", () => {
    const inscricoesTodasTrilhas = [
      {
        id: "insc-1",
        numeroInscricao: "INSC-2026-1",
        codigoAnonimo: "CAND-1111",
        candidatoId: "cand-1",
        candidatoNome: "Ana",
        candidatoEmail: "ana@devtest.com",
        candidatoCpf: "12345678901",
        processoSeletivoId: "ps-1",
        processoSeletivoTitulo: "Processo Seletivo Simplificado DevTest 2026/1",
        trilhaId: "trilha-backend",
        trilhaNome: "Backend Java",
        itensBarema: [],
        pontuacaoProvisoriaBarema: 10,
        extratoBarema: { pontuacaoProvisoriaBarema: 10, itensDetalhados: [] },
        createdAt: "2026-02-01T10:00:00Z",
      },
      {
        id: "insc-2",
        numeroInscricao: "INSC-2026-2",
        codigoAnonimo: "CAND-2222",
        candidatoId: "cand-1",
        candidatoNome: "Ana",
        candidatoEmail: "ana@devtest.com",
        candidatoCpf: "12345678901",
        processoSeletivoId: "ps-1",
        processoSeletivoTitulo: "Processo Seletivo Simplificado DevTest 2026/1",
        trilhaId: "trilha-frontend",
        trilhaNome: "Frontend React",
        itensBarema: [],
        pontuacaoProvisoriaBarema: 8,
        extratoBarema: { pontuacaoProvisoriaBarema: 8, itensDetalhados: [] },
        createdAt: "2026-02-01T11:00:00Z",
      },
    ];

    render(
      <InscricaoCandidatoView
        processos={processosAbertos}
        candidatoInicial={{ id: "cand-1", nome: "Ana", email: "ana@devtest.com", cpf: "12345678901" }}
        inscricoesIniciais={inscricoesTodasTrilhas as any}
      />
    );

    const botaoDesabilitado = screen.getByRole("button", { name: /Já inscrito em todas as trilhas/i });
    expect(botaoDesabilitado).toBeInTheDocument();
    expect(botaoDesabilitado).toBeDisabled();
  });

  it("deve filtrar processos seletivos por padrão apenas os abertos e permitir alternar para todos", () => {
    const processosMistos: ProcessoSeletivoEntity[] = [
      ...processosAbertos, // Aberto (2026-01-01 a 2026-12-31)
      {
        ...processosAbertos[0],
        id: "ps-encerrado",
        titulo: "Processo DevTest 2024 (Encerrado)",
        edital: "Edital 99/2024",
        inicioInscricoes: "2024-01-01T08:00:00Z",
        fimInscricoes: "2024-02-01T23:59:59Z",
      },
    ];

    render(<InscricaoCandidatoView processos={processosMistos} onSubmeterInscricao={vi.fn()} />);

    // Por default, apenas o aberto deve aparecer na listagem
    expect(screen.getByText("Processo Seletivo Simplificado DevTest 2026/1")).toBeInTheDocument();
    expect(screen.queryByText("Processo DevTest 2024 (Encerrado)")).not.toBeInTheDocument();

    // Clica para exibir "Todos os Processos"
    const botaoTodos = screen.getByRole("button", { name: /Todos os Processos/i });
    fireEvent.click(botaoTodos);

    // Agora o encerrado também deve ser exibido
    expect(screen.getByText("Processo Seletivo Simplificado DevTest 2026/1")).toBeInTheDocument();
    expect(screen.getByText("Processo DevTest 2024 (Encerrado)")).toBeInTheDocument();
    expect(screen.getByText("Prazo de Inscrição Encerrado")).toBeInTheDocument();
  });

  it("deve permitir abrir o formulário em modo retificação ao clicar em Retificar Barema quando o prazo estiver aberto", () => {
    const inscricoesIniciais = [
      {
        id: "insc-edit-1",
        numeroInscricao: "INSC-2026-8888",
        codigoAnonimo: "CAND-8888",
        candidatoId: "cand-1",
        candidatoNome: "Carlos",
        candidatoEmail: "carlos@devtest.com",
        candidatoCpf: "12345678901",
        processoSeletivoId: "ps-1",
        processoSeletivoTitulo: "Processo Seletivo Simplificado DevTest 2026/1",
        trilhaId: "trilha-backend",
        trilhaNome: "Backend Java",
        itensBarema: [{ criterioId: "crit-exp", quantidade: 2, arquivoNome: "antigo.pdf" }],
        pontuacaoProvisoriaBarema: 4.0,
        extratoBarema: { pontuacaoProvisoriaBarema: 4.0, itensDetalhados: [] },
        createdAt: "2026-02-01T10:00:00Z",
      },
    ];

    render(
      <InscricaoCandidatoView
        processos={processosAbertos}
        candidatoInicial={{ id: "cand-1", nome: "Carlos", email: "carlos@devtest.com", cpf: "12345678901" }}
        inscricoesIniciais={inscricoesIniciais as any}
      />
    );

    const botaoRetificar = screen.getByRole("button", { name: /✎ Retificar Barema/i });
    expect(botaoRetificar).toBeInTheDocument();

    fireEvent.click(botaoRetificar);

    expect(screen.getByText(/Retificar Inscrição e Documentos do Barema/i)).toBeInTheDocument();
    expect(screen.getByText(/Retificando inscrição nº INSC-2026-8888/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar Retificações do Barema/i })).toBeInTheDocument();

    // O campo de quantidade deve carregar o valor anterior (2)
    const inputExp = screen.getByLabelText(/anos de experiência comprovada/i);
    expect(inputExp).toHaveValue(2);
  });
});
