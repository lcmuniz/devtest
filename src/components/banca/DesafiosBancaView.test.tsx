import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { DesafiosBancaView } from "./DesafiosBancaView";
import { LinguagemDesafio, DesafioEntity } from "@/domain/desafio/desafio";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("Interface da Banca Avaliadora - Gestão de Desafios (Seam 3)", () => {
  const processosMock: ProcessoSeletivoEntity[] = [
    {
      id: "ps-1",
      titulo: "PSS DevTest 2026/1",
      edital: "Edital 01/2026",
      descricao: "Seleção de Auditores",
      inicioInscricoes: "2026-03-01T08:00:00Z",
      fimInscricoes: "2026-03-15T23:59:59Z",
      inicioProvas: "2026-03-20T08:00:00Z",
      fimProvas: "2026-03-25T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      status: "PUBLICADO",
      createdAt: "2026-02-01T10:00:00Z",
      updatedAt: "2026-02-01T10:00:00Z",
      trilhas: [
        { id: "trilha-1", nome: "Backend Java", descricao: "Java 21" },
        { id: "trilha-2", nome: "Engenharia de Dados Python", descricao: "Python 3.12" },
      ],
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
    },
  ];

  const desafiosIniciaisMock: DesafioEntity[] = [
    {
      id: "desafio-1",
      processoSeletivoId: "ps-1",
      trilhaId: "trilha-1",
      titulo: "Conciliação Bancária do Tesouro",
      enunciadoMarkdown: "# Conciliação Bancária\nImplemente a conciliação de contas públicas.",
      linguagem: LinguagemDesafio.JAVA,
      codigoTemplate: "public class Conciliador { }",
      suiteTestesPublicos: "@Test void testePublico() {}",
      suiteTestesOcultos: "@Test void testeOcultoBorda() {}",
      timeoutSeconds: 12,
      memoryLimitMb: 512,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    },
  ];

  it("deve listar desafios existentes do banco global com informações de linguagem e limites técnicos", () => {
    render(
      <DesafiosBancaView
        desafiosIniciais={desafiosIniciaisMock}
      />
    );

    expect(screen.getByText("Conciliação Bancária do Tesouro")).toBeInTheDocument();
    expect(screen.getByText(/Java 21/i)).toBeInTheDocument();
    expect(screen.getByText("Banco Global")).toBeInTheDocument();
    expect(screen.getByText(/12s/i)).toBeInTheDocument();
    expect(screen.getByText(/512 MB/i)).toBeInTheDocument();
  });

  it("deve permitir visualizar o preview formatado do Markdown do enunciado durante a criação", () => {
    render(
      <DesafiosBancaView
        desafiosIniciais={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /novo desafio/i }));

    const textareaMarkdown = screen.getByLabelText(/enunciado \(markdown\)/i);
    fireEvent.change(textareaMarkdown, {
      target: {
        value: "# Auditoria de Contratos\n\nRestrição: **Complexidade O(n log n)**",
      },
    });

    const btnPreview = screen.getByRole("button", { name: /visualizar markdown/i });
    fireEvent.click(btnPreview);

    expect(
      screen.getByRole("heading", { name: /Auditoria de Contratos/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Complexidade O\(n log n\)/i)).toBeInTheDocument();
  });

  it("deve criar e depois editar um desafio existente submetendo suítes pública, oculta e limites técnicos", async () => {
    const mockOnCriar = vi.fn().mockImplementation(async (dados) => ({
      sucesso: true,
      desafio: {
        ...dados,
        id: "desafio-novo-99",
        createdAt: "2026-03-02T10:00:00Z",
        updatedAt: "2026-03-02T10:00:00Z",
      },
    }));

    const mockOnAtualizar = vi.fn().mockImplementation(async (id, dados) => ({
      sucesso: true,
      desafio: {
        ...dados,
        id,
        createdAt: "2026-03-02T10:00:00Z",
        updatedAt: "2026-03-02T11:00:00Z",
      },
    }));

    render(
      <DesafiosBancaView
        desafiosIniciais={[]}
        onCriarDesafio={mockOnCriar}
        onAtualizarDesafio={mockOnAtualizar}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /novo desafio/i }));

    fireEvent.change(screen.getByLabelText(/título do desafio/i), {
      target: { value: "Análise de Folha de Pagamento" },
    });
    fireEvent.change(screen.getByLabelText(/linguagem de programação/i), {
      target: { value: LinguagemDesafio.PYTHON },
    });
    fireEvent.change(screen.getByLabelText(/enunciado \(markdown\)/i), {
      target: { value: "## Especificação\nDetecte acúmulo ilícito de cargos públicos." },
    });
    fireEvent.change(screen.getByLabelText(/código template inicial/i), {
      target: { value: "def detectar_acumulo(servidores: list) -> list:\n    return []" },
    });
    fireEvent.change(screen.getByLabelText(/suíte de testes unitários públicos/i), {
      target: { value: "def test_exemplo_basico():\n    assert detectar_acumulo([]) == []" },
    });
    fireEvent.change(screen.getByLabelText(/suíte de testes unitários ocultos/i), {
      target: { value: "def test_borda_homonimos():\n    assert len(detectar_acumulo([1])) == 0" },
    });
    fireEvent.change(screen.getByLabelText(/tempo máximo de execução \(segundos\)/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/limite de memória \(mb\)/i), {
      target: { value: "256" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar desafio/i }));

    await waitFor(() => {
      expect(mockOnCriar).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Análise de Folha de Pagamento")).toBeInTheDocument();

    // Agora testa a edição do desafio recém-criado
    fireEvent.click(screen.getByRole("button", { name: /editar desafio/i }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    fireEvent.change(screen.getByLabelText(/título do desafio/i), {
      target: { value: "Análise de Folha de Pagamento v2" },
    });

    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockOnAtualizar).toHaveBeenCalledWith(
        "desafio-novo-99",
        expect.objectContaining({
          titulo: "Análise de Folha de Pagamento v2",
          timeoutSeconds: 15,
          memoryLimitMb: 256,
        })
      );
    });

    expect(
      await screen.findByText("Análise de Folha de Pagamento v2")
    ).toBeInTheDocument();
  });

  it("deve fechar o formulário de edição ao clicar no botão Cancelar sem salvar alterações", async () => {
    render(
      <DesafiosBancaView
        processosSeletivos={processosMock}
        desafiosIniciais={desafiosIniciaisMock}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /editar desafio/i }));
    expect(screen.getByLabelText(/título do desafio/i)).toBeInTheDocument();

    const botoesCancelar = screen.getAllByRole("button", { name: /cancelar/i });
    expect(botoesCancelar.length).toBe(2);
    // Clica no botão Cancelar ao lado de salvar alterações (o segundo)
    fireEvent.click(botoesCancelar[1]);

    expect(screen.queryByLabelText(/título do desafio/i)).not.toBeInTheDocument();
  });
});
