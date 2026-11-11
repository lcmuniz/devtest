import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ProcessosSeletivosBanca, CRITERIOS_PADRAO } from "./ProcessosSeletivosBanca";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import { DesafioEntity, LinguagemDesafio } from "@/domain/desafio/desafio";

describe("Interface da Banca Avaliadora - Processos Seletivos (Seam 3)", () => {
  const processosIniciais: ProcessoSeletivoEntity[] = [
    {
      id: "ps-1",
      titulo: "PSS DevTest 2026/1",
      edital: "Edital 01/2026",
      descricao: "Seleção técnica para contratação temporária",
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
        { id: "trilha-2", nome: "Frontend React", descricao: "React Next" },
      ],
      barema: [
        {
          id: "barema-1",
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Anos de experiência comprovada",
          pontuacaoUnitaria: 2.0,
          pontuacaoMaxima: 100.0,
          permiteMultiplos: true,
          exigeComprovante: true,
        },
      ],
    },
  ];

  it("deve renderizar a listagem de processos seletivos existentes", () => {
    render(<ProcessosSeletivosBanca processosIniciais={processosIniciais} />);

    expect(screen.getByText("Processos Seletivos")).toBeInTheDocument();
    expect(screen.getByText("PSS DevTest 2026/1")).toBeInTheDocument();
    expect(screen.getByText("Edital 01/2026")).toBeInTheDocument();
    expect(screen.getByText("Backend Java")).toBeInTheDocument();
    expect(screen.getByText("Frontend React")).toBeInTheDocument();
  });

  it("deve exibir validação visual quando a soma dos pesos for diferente de 100", async () => {
    render(<ProcessosSeletivosBanca processosIniciais={[]} />);

    const btnNovo = screen.getByRole("button", { name: /novo processo seletivo/i });
    fireEvent.click(btnNovo);

    const inputPesoTecnico = screen.getByLabelText(/peso da prova técnica/i);
    const inputPesoBarema = screen.getByLabelText(/peso do barema curricular/i);

    fireEvent.change(inputPesoTecnico, { target: { value: "50" } });
    fireEvent.change(inputPesoBarema, { target: { value: "30" } });

    expect(
      screen.getByText(/a soma dos pesos deve totalizar 100%/i)
    ).toBeInTheDocument();
  });

  it("deve permitir adicionar nova trilha técnica dinamicamente", async () => {
    render(<ProcessosSeletivosBanca processosIniciais={[]} />);

    const btnNovo = screen.getByRole("button", { name: /novo processo seletivo/i });
    fireEvent.click(btnNovo);

    const inputTrilha = screen.getByPlaceholderText(/nome da trilha/i);
    const btnAdicionarTrilha = screen.getByRole("button", { name: /adicionar trilha/i });

    fireEvent.change(inputTrilha, { target: { value: "Engenharia de Dados Python" } });
    fireEvent.click(btnAdicionarTrilha);

    expect(screen.getByText("Engenharia de Dados Python")).toBeInTheDocument();
  });

  it("deve criar um novo processo seletivo e atualizar a listagem após submissão com sucesso", async () => {
    const mockOnSalvar = vi.fn().mockResolvedValue({
      sucesso: true,
      processoSeletivo: {
        id: "ps-novo-123",
        titulo: "PSS DevTest 2026/2 - Novos Talentos",
        edital: "Edital 02/2026",
        descricao: "Seleção para residentes",
        inicioInscricoes: "2026-05-01T08:00:00Z",
        fimInscricoes: "2026-05-15T23:59:59Z",
        inicioProvas: "2026-05-20T08:00:00Z",
        fimProvas: "2026-05-25T23:59:59Z",
        pesoProvaTecnica: 60,
        pesoBaremaCurricular: 40,
        notaCorteMinima: 50,
        status: "PUBLICADO",
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        trilhas: [{ id: "t-1", nome: "Backend Java", descricao: "" }],
        barema: CRITERIOS_PADRAO.map((c, i) => ({ ...c, id: `b-${i}` })),
      },
    });

    render(<ProcessosSeletivosBanca processosIniciais={[]} onSalvar={mockOnSalvar} />);

    fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

    fireEvent.change(screen.getByLabelText(/título do processo seletivo/i), {
      target: { value: "PSS DevTest 2026/2 - Novos Talentos" },
    });
    fireEvent.change(screen.getByLabelText(/número do edital/i), {
      target: { value: "Edital 02/2026" },
    });
    fireEvent.change(screen.getByLabelText(/início das inscrições/i), {
      target: { value: "2026-05-01T08:00" },
    });
    fireEvent.change(screen.getByLabelText(/término das inscrições/i), {
      target: { value: "2026-05-15T23:59" },
    });
    fireEvent.change(screen.getByLabelText(/início das provas/i), {
      target: { value: "2026-05-20T08:00" },
    });
    fireEvent.change(screen.getByLabelText(/término das provas/i), {
      target: { value: "2026-05-25T23:59" },
    });

    const btnSalvar = screen.getByRole("button", { name: /salvar processo seletivo/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockOnSalvar).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("PSS DevTest 2026/2 - Novos Talentos")).toBeInTheDocument();
    });
  });

  it("deve permitir editar um processo seletivo existente (cronograma, título e pesos)", async () => {
    const mockOnAtualizar = vi.fn().mockImplementation(async (id, dados) => ({
      sucesso: true,
      processoSeletivo: {
        ...processosIniciais[0],
        ...dados,
        id,
      },
    }));

    render(
      <ProcessosSeletivosBanca
        processosIniciais={processosIniciais}
        onAtualizar={mockOnAtualizar}
      />
    );

    const btnEditar = screen.getByRole("button", {
      name: /editar processo seletivo/i,
    });
    fireEvent.click(btnEditar);

    const inputTitulo = screen.getByLabelText(/título do processo seletivo/i);
    fireEvent.change(inputTitulo, {
      target: { value: "PSS DevTest 2026/1 - Prorrogado" },
    });

    const btnSalvar = screen.getByRole("button", {
      name: /salvar alterações/i,
    });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockOnAtualizar).toHaveBeenCalledWith(
        "ps-1",
        expect.objectContaining({
          titulo: "PSS DevTest 2026/1 - Prorrogado",
        })
      );
    });

    expect(
      await screen.findByText("PSS DevTest 2026/1 - Prorrogado")
    ).toBeInTheDocument();
  });

  describe("Composição com Banco Global de Desafios (Issue 10)", () => {
    const desafiosMock: DesafioEntity[] = [
      {
        id: "d-java-1",
        titulo: "Validador CNPJ Java",
        linguagem: LinguagemDesafio.JAVA,
        categoria: "junior",
        processoSeletivoId: "",
        trilhaId: "",
        enunciadoMarkdown: "Enunciado",
        codigoTemplate: "public class CNPJ {}",
        suiteTestesPublicos: "test",
        suiteTestesOcultos: "test",
        timeoutSeconds: 5,
        memoryLimitMb: 512,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
      {
        id: "d-python-1",
        titulo: "Parser de LRF Python",
        linguagem: LinguagemDesafio.PYTHON,
        categoria: "pleno",
        processoSeletivoId: "",
        trilhaId: "",
        enunciadoMarkdown: "Enunciado",
        codigoTemplate: "def parse(): pass",
        suiteTestesPublicos: "test",
        suiteTestesOcultos: "test",
        timeoutSeconds: 5,
        memoryLimitMb: 512,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
      {
        id: "d-ts-1",
        titulo: "Auditoria Contratos TS",
        linguagem: LinguagemDesafio.TYPESCRIPT,
        categoria: "senior",
        processoSeletivoId: "",
        trilhaId: "",
        enunciadoMarkdown: "Enunciado",
        codigoTemplate: "export function audit() {}",
        suiteTestesPublicos: "test",
        suiteTestesOcultos: "test",
        timeoutSeconds: 5,
        memoryLimitMb: 512,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ];

    it("deve permitir sortear desafios da base respeitando cotas por linguagem", async () => {
      render(
        <ProcessosSeletivosBanca
          processosIniciais={[]}
          desafiosBanco={desafiosMock}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

      const inputJava = screen.getByLabelText(/java \(junit 5\)/i);
      const inputPython = screen.getByLabelText(/python \(pytest\)/i);

      fireEvent.change(inputJava, { target: { value: "1" } });
      fireEvent.change(inputPython, { target: { value: "1" } });

      const btnSortear = screen.getByRole("button", { name: /sortear e adicionar/i });
      fireEvent.click(btnSortear);

      expect(screen.getByText("Validador CNPJ Java")).toBeInTheDocument();
      expect(screen.getByText("Parser de LRF Python")).toBeInTheDocument();
      expect(screen.getByText("2 desafio(s) selecionado(s)")).toBeInTheDocument();
    });

    it("deve desabilitar o botão de sorteio e avisar se nenhuma categoria for selecionada", async () => {
      render(
        <ProcessosSeletivosBanca
          processosIniciais={[]}
          desafiosBanco={desafiosMock}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

      // Desmarca as 3 categorias do sorteio
      const checkJunior = screen.getAllByRole("checkbox", { name: /júnior/i })[0];
      const checkPleno = screen.getAllByRole("checkbox", { name: /pleno/i })[0];
      const checkSenior = screen.getAllByRole("checkbox", { name: /sênior/i })[0];

      fireEvent.click(checkJunior);
      fireEvent.click(checkPleno);
      fireEvent.click(checkSenior);

      expect(screen.getByText(/selecione ao menos uma categoria para habilitar o sorteio/i)).toBeInTheDocument();

      const btnSortear = screen.getByRole("button", { name: /sortear e adicionar/i });
      expect(btnSortear).toBeDisabled();
    });

    it("não deve listar desafios na busca se todas as categorias forem desmarcadas", async () => {
      render(
        <ProcessosSeletivosBanca
          processosIniciais={[]}
          desafiosBanco={desafiosMock}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

      // Na busca, desmarca as categorias (são os segundos checkboxes na tela)
      const checkboxesJunior = screen.getAllByRole("checkbox", { name: /júnior/i });
      const checkboxesPleno = screen.getAllByRole("checkbox", { name: /pleno/i });
      const checkboxesSenior = screen.getAllByRole("checkbox", { name: /sênior/i });

      // Clica nos checkboxes da busca (índice 1)
      fireEvent.click(checkboxesJunior[1]);
      fireEvent.click(checkboxesPleno[1]);
      fireEvent.click(checkboxesSenior[1]);

      expect(
        screen.getByText(/nenhuma categoria selecionada\. marque ao menos uma categoria para exibir desafios\./i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Validador CNPJ Java")).not.toBeInTheDocument();
      expect(screen.queryByText("Parser de LRF Python")).not.toBeInTheDocument();
      expect(screen.queryByText("Auditoria Contratos TS")).not.toBeInTheDocument();
    });

    it("deve permitir buscar desafios por texto e vincular/desvincular da composição", async () => {
      render(
        <ProcessosSeletivosBanca
          processosIniciais={[]}
          desafiosBanco={desafiosMock}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

      // Busca por texto
      const inputBusca = screen.getByLabelText(/buscar desafios na base/i);
      fireEvent.change(inputBusca, { target: { value: "Auditoria" } });

      // Deve listar apenas o desafio de Auditoria nos resultados
      expect(screen.getByText("Auditoria Contratos TS")).toBeInTheDocument();
      expect(screen.queryByText("Validador CNPJ Java")).not.toBeInTheDocument();

      // Clica no botão Vincular
      const btnVincular = screen.getByRole("button", { name: /\+ vincular/i });
      fireEvent.click(btnVincular);

      expect(screen.getByText("1 desafio(s) selecionado(s)")).toBeInTheDocument();

      // Já vinculado: não deve mais aparecer na busca
      expect(screen.getByText("Nenhum desafio encontrado para os filtros informados.")).toBeInTheDocument();

      // Aparece na lista de desafios anexados embaixo com botão Remover
      const btnRemover = screen.getByRole("button", { name: /remover/i });
      fireEvent.click(btnRemover);

      expect(screen.getByText("0 desafio(s) selecionado(s)")).toBeInTheDocument();
      // Ao remover do processo, volta a aparecer na busca
      expect(screen.getByText("Auditoria Contratos TS")).toBeInTheDocument();
    });

    it("deve incluir os desafios selecionados no payload de criação do processo seletivo", async () => {
      const mockOnSalvar = vi.fn().mockResolvedValue({
        sucesso: true,
        processoSeletivo: {
          id: "ps-novo-desafios",
          titulo: "PSS com Desafios",
          edital: "03/2026",
          descricao: "",
          inicioInscricoes: "2026-06-01T08:00:00Z",
          fimInscricoes: "2026-06-15T23:59:59Z",
          inicioProvas: "2026-06-20T08:00:00Z",
          fimProvas: "2026-06-25T23:59:59Z",
          pesoProvaTecnica: 60,
          pesoBaremaCurricular: 40,
          notaCorteMinima: 50,
          status: "PUBLICADO",
          createdAt: "2026-06-01T00:00:00Z",
          updatedAt: "2026-06-01T00:00:00Z",
          trilhas: [{ id: "t-1", nome: "Backend Java", descricao: "" }],
          barema: CRITERIOS_PADRAO.map((c, i) => ({ ...c, id: `b-${i}` })),
        },
      });

      render(
        <ProcessosSeletivosBanca
          processosIniciais={[]}
          desafiosBanco={desafiosMock}
          onSalvar={mockOnSalvar}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /novo processo seletivo/i }));

      fireEvent.change(screen.getByLabelText(/título do processo seletivo/i), {
        target: { value: "PSS com Desafios" },
      });
      fireEvent.change(screen.getByLabelText(/número do edital/i), {
        target: { value: "03/2026" },
      });
      fireEvent.change(screen.getByLabelText(/início das inscrições/i), {
        target: { value: "2026-06-01T08:00" },
      });
      fireEvent.change(screen.getByLabelText(/término das inscrições/i), {
        target: { value: "2026-06-15T23:59" },
      });
      fireEvent.change(screen.getByLabelText(/início das provas/i), {
        target: { value: "2026-06-20T08:00" },
      });
      fireEvent.change(screen.getByLabelText(/término das provas/i), {
        target: { value: "2026-06-25T23:59" },
      });

      // Busca e vincula um desafio
      const inputBusca = screen.getByLabelText(/buscar desafios na base/i);
      fireEvent.change(inputBusca, { target: { value: "Validador" } });

      const btnVincular = screen.getByRole("button", { name: /\+ vincular/i });
      fireEvent.click(btnVincular);

      fireEvent.click(screen.getByRole("button", { name: /salvar processo seletivo/i }));

      await waitFor(() => {
        expect(mockOnSalvar).toHaveBeenCalledWith(
          expect.objectContaining({
            desafiosIds: ["d-java-1"],
          })
        );
      });
    });
  });
});

