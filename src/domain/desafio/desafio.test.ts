import { describe, it, expect } from "vitest";
import {
  LinguagemDesafio,
  validarDesafio,
  sanitizarDesafioParaCandidato,
  sortearDesafiosPorLinguagem,
  adicionarDesafioAComposicao,
  removerDesafioDaComposicao,
  DesafioEntity,
} from "./desafio";

describe("Domínio: Desafio Técnico", () => {
  const desafioValido = {
    processoSeletivoId: "ps-1",
    trilhaId: "trilha-1",
    titulo: "Processador de Empenhos DevTest",
    enunciadoMarkdown:
      "# Processador de Empenhos\n\nImplemente a função que consolida os empenhos por unidade gestora.",
    linguagem: LinguagemDesafio.TYPESCRIPT,
    codigoTemplate: "export function consolidarEmpenhos(empenhos: any[]) {\n  // TODO\n}",
    suiteTestesPublicos:
      "import { describe, it, expect } from 'vitest';\ndescribe('Público', () => { it('soma simples', () => {}); });",
    suiteTestesOcultos:
      "import { describe, it, expect } from 'vitest';\ndescribe('Oculto Borda', () => { it('lista vazia e valores negativos', () => {}); });",
    timeoutSeconds: 10,
    memoryLimitMb: 512,
  };

  it("deve validar com sucesso um desafio completo com suítes pública e oculta e limites técnicos", () => {
    const resultado = validarDesafio(desafioValido);
    expect(resultado.valido).toBe(true);
    expect(resultado.dados?.titulo).toBe("Processador de Empenhos DevTest");
    expect(resultado.dados?.linguagem).toBe(LinguagemDesafio.TYPESCRIPT);
    expect(resultado.dados?.timeoutSeconds).toBe(10);
    expect(resultado.dados?.memoryLimitMb).toBe(512);
  });

  it("deve rejeitar desafio com limites técnicos inválidos ou sem suítes de testes", () => {
    const resultado = validarDesafio({
      ...desafioValido,
      suiteTestesPublicos: "   ",
      suiteTestesOcultos: "",
      timeoutSeconds: 0,
      memoryLimitMb: 32,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.erros).toContain("A suíte de testes unitários públicos é obrigatória.");
    expect(resultado.erros).toContain("A suíte de testes unitários ocultos é obrigatória.");
    expect(resultado.erros).toContain(
      "O tempo máximo de execução deve estar entre 1 e 60 segundos."
    );
    expect(resultado.erros).toContain(
      "O limite de memória deve estar entre 64 MB e 2048 MB."
    );
  });

  it("deve remover estritamente a suíte de testes ocultos ao sanitizar desafio para candidato", () => {
    const desafioCompleto = {
      id: "desafio-101",
      ...desafioValido,
      createdAt: "2026-11-10T12:00:00.000Z",
      updatedAt: "2026-11-10T12:00:00.000Z",
    };

    const desafioPublico = sanitizarDesafioParaCandidato(desafioCompleto);

    expect(desafioPublico.id).toBe("desafio-101");
    expect(desafioPublico.suiteTestesPublicos).toBe(desafioValido.suiteTestesPublicos);
    expect("suiteTestesOcultos" in desafioPublico).toBe(false);
    expect((desafioPublico as any).suiteTestesOcultos).toBeUndefined();
  });

  describe("Composição de Prova do Processo Seletivo (Banco de Questões e Sorteio)", () => {
    const bancoMock: DesafioEntity[] = [
      { id: "d-java-1", titulo: "Java 1", linguagem: LinguagemDesafio.JAVA, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
      { id: "d-java-2", titulo: "Java 2", linguagem: LinguagemDesafio.JAVA, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
      { id: "d-java-3", titulo: "Java 3", linguagem: LinguagemDesafio.JAVA, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
      { id: "d-py-1", titulo: "Python 1", linguagem: LinguagemDesafio.PYTHON, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
      { id: "d-py-2", titulo: "Python 2", linguagem: LinguagemDesafio.PYTHON, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
      { id: "d-ts-1", titulo: "TS 1", linguagem: LinguagemDesafio.TYPESCRIPT, createdAt: "", updatedAt: "", processoSeletivoId: "", trilhaId: "", enunciadoMarkdown: "e", codigoTemplate: "c", suiteTestesPublicos: "p", suiteTestesOcultos: "o", timeoutSeconds: 10, memoryLimitMb: 512 },
    ];

    it("deve sortear aleatoriamente a quantidade exata solicitada para cada linguagem", () => {
      // 2 Java, 1 Python, 1 TypeScript
      const sorteados = sortearDesafiosPorLinguagem(bancoMock, {
        java: 2,
        python: 1,
        typescript: 1,
      });

      expect(sorteados).toHaveLength(4);
      expect(sorteados.filter((d) => d.linguagem === LinguagemDesafio.JAVA)).toHaveLength(2);
      expect(sorteados.filter((d) => d.linguagem === LinguagemDesafio.PYTHON)).toHaveLength(1);
      expect(sorteados.filter((d) => d.linguagem === LinguagemDesafio.TYPESCRIPT)).toHaveLength(1);

      // IDs únicos sem duplicata
      const ids = sorteados.map((d) => d.id);
      expect(new Set(ids).size).toBe(4);
    });

    it("deve sortear respeitando filtro de categorias (junior, pleno, senior)", () => {
      const bancoComCategorias: DesafioEntity[] = [
        { ...bancoMock[0], id: "d-j1", categoria: "junior" },
        { ...bancoMock[1], id: "d-p1", categoria: "pleno" },
        { ...bancoMock[2], id: "d-s1", categoria: "senior" },
      ];

      // Sorteia apenas senior
      const sorteadosSenior = sortearDesafiosPorLinguagem(
        bancoComCategorias,
        { java: 2 },
        ["senior"]
      );
      expect(sorteadosSenior).toHaveLength(1);
      expect(sorteadosSenior[0].id).toBe("d-s1");

      // Sorteia junior e pleno
      const sorteadosJuniorPleno = sortearDesafiosPorLinguagem(
        bancoComCategorias,
        { java: 3 },
        ["junior", "pleno"]
      );
      expect(sorteadosJuniorPleno).toHaveLength(2);
      expect(sorteadosJuniorPleno.map((d) => d.id).sort()).toEqual(["d-j1", "d-p1"]);
    });

    it("não deve estourar se o número pedido for maior que o disponível na linguagem", () => {
      const sorteados = sortearDesafiosPorLinguagem(bancoMock, {
        typescript: 10,
      });
      // Só havia 1 no banco
      expect(sorteados).toHaveLength(1);
      expect(sorteados[0].id).toBe("d-ts-1");
    });

    it("deve permitir adicionar e remover desafios manualmente mantendo unicidade e ordem", () => {
      let selecionados: string[] = ["d-java-1", "d-py-1"];

      // Adiciona um novo
      selecionados = adicionarDesafioAComposicao(selecionados, "d-ts-1");
      expect(selecionados).toEqual(["d-java-1", "d-py-1", "d-ts-1"]);

      // Não duplica se já presente
      selecionados = adicionarDesafioAComposicao(selecionados, "d-java-1");
      expect(selecionados).toEqual(["d-java-1", "d-py-1", "d-ts-1"]);

      // Remove um desafio
      selecionados = removerDesafioDaComposicao(selecionados, "d-py-1");
      expect(selecionados).toEqual(["d-java-1", "d-ts-1"]);
    });
  });
});
