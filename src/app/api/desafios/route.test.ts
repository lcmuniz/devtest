import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { PUT } from "./[id]/route";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import {
  getRepository as getPsRepository,
  resetRepository as resetPsRepository,
} from "@/infrastructure/repositories/processo-seletivo-repository";
import { resetDesafioRepository } from "@/infrastructure/repositories/desafio-repository";

describe("API Desafios - Criação, Edição e Sanitização de Testes Ocultos (Seam 2)", () => {
  let psId: string;
  let trilhaId: string;

  beforeEach(async () => {
    await resetDesafioRepository();
    await resetPsRepository();

    const psRepo = getPsRepository();
    const ps = await psRepo.create({
      titulo: "PSS 2026 - DevTest",
      edital: "Edital 02/2026",
      descricao: "Seleção de Auditores de Sistemas",
      inicioInscricoes: "2026-04-01T08:00:00Z",
      fimInscricoes: "2026-04-15T23:59:59Z",
      inicioProvas: "2026-04-20T08:00:00Z",
      fimProvas: "2026-04-25T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Backend Java", descricao: "Java 21" }],
      barema: [
        {
          tipo: TipoCriterioBarema.DOUTORADO,
          descricao: "Doutorado",
          pontuacaoUnitaria: 100,
          pontuacaoMaxima: 100,
          permiteMultiplos: false,
          exigeComprovante: true,
        },
      ],
    });

    psId = ps.id;
    trilhaId = ps.trilhas[0].id;
  });

  it("deve criar um Desafio vinculado à Trilha e separar estritamente visão pública (sem testes ocultos) da visão da banca", async () => {
    const payloadDesafio = {
      processoSeletivoId: psId,
      trilhaId,
      titulo: "Validador de LRF Municipal",
      enunciadoMarkdown:
        "## Problema\nImplemente o validador de despesas com pessoal segundo a Lei de Responsabilidade Fiscal.",
      linguagem: LinguagemDesafio.JAVA,
      codigoTemplate: "public class ValidadorLRF {\n  public boolean validar(double receita, double despesa) {\n    return false;\n  }\n}",
      suiteTestesPublicos: "@Test void deveAprovarDentroDoLimite() { assertTrue(true); }",
      suiteTestesOcultos: "@Test void deveRejeitarCasoDeBordaZeroNegativo() { assertFalse(false); }",
      timeoutSeconds: 15,
      memoryLimitMb: 512,
    };

    const postReq = new Request("http://localhost:3000/api/desafios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadDesafio),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.sucesso).toBe(true);
    expect(postData.desafio.id).toBeDefined();
    expect(postData.desafio.suiteTestesOcultos).toBe(payloadDesafio.suiteTestesOcultos);

    // Consulta padrão (Candidato / Pública) NUNCA deve retornar suiteTestesOcultos
    const getCandidatoReq = new Request(
      `http://localhost:3000/api/desafios?trilhaId=${trilhaId}`,
      { method: "GET" }
    );
    const getCandidatoRes = await GET(getCandidatoReq);
    expect(getCandidatoRes.status).toBe(200);
    const getCandidatoData = await getCandidatoRes.json();
    expect(getCandidatoData.sucesso).toBe(true);
    expect(getCandidatoData.desafios).toHaveLength(1);
    expect(getCandidatoData.desafios[0].suiteTestesPublicos).toBe(
      payloadDesafio.suiteTestesPublicos
    );
    expect("suiteTestesOcultos" in getCandidatoData.desafios[0]).toBe(false);
    expect(getCandidatoData.desafios[0].suiteTestesOcultos).toBeUndefined();

    // Consulta da Banca (visao=banca) DEVE retornar suiteTestesOcultos para edição
    const getBancaReq = new Request(
      `http://localhost:3000/api/desafios?trilhaId=${trilhaId}&visao=banca`,
      { method: "GET" }
    );
    const getBancaRes = await GET(getBancaReq);
    const getBancaData = await getBancaRes.json();
    expect(getBancaData.desafios[0].suiteTestesOcultos).toBe(
      payloadDesafio.suiteTestesOcultos
    );
  });

  it("deve permitir atualizar um Desafio existente via PUT /api/desafios/[id]", async () => {
    const postReq = new Request("http://localhost:3000/api/desafios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        processoSeletivoId: psId,
        trilhaId,
        titulo: "Desafio Inicial",
        enunciadoMarkdown: "# Enunciado original com mais de dez caracteres",
        linguagem: LinguagemDesafio.PYTHON,
        codigoTemplate: "def resolver(x):\n    pass",
        suiteTestesPublicos: "def test_publico(): assert True",
        suiteTestesOcultos: "def test_oculto(): assert True",
        timeoutSeconds: 10,
        memoryLimitMb: 256,
      }),
    });

    const postRes = await POST(postReq);
    const { desafio } = await postRes.json();

    const putReq = new Request(`http://localhost:3000/api/desafios/${desafio.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        processoSeletivoId: psId,
        trilhaId,
        titulo: "Desafio Atualizado DevTest",
        enunciadoMarkdown: "# Enunciado atualizado com novas restrições de memória",
        linguagem: LinguagemDesafio.PYTHON,
        codigoTemplate: "def resolver(x: int) -> int:\n    return x",
        suiteTestesPublicos: "def test_publico_v2(): assert resolver(1) == 1",
        suiteTestesOcultos: "def test_oculto_borda(): assert resolver(-999) == -999",
        timeoutSeconds: 20,
        memoryLimitMb: 1024,
      }),
    });

    const putRes = await PUT(putReq, { params: Promise.resolve({ id: desafio.id }) });
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.sucesso).toBe(true);
    expect(putData.desafio.titulo).toBe("Desafio Atualizado DevTest");
    expect(putData.desafio.timeoutSeconds).toBe(20);
    expect(putData.desafio.memoryLimitMb).toBe(1024);
    expect(putData.desafio.suiteTestesOcultos).toBe(
      "def test_oculto_borda(): assert resolver(-999) == -999"
    );
  });

  it("deve permitir sortear da base, vincular e desvincular desafios via /api/processos-seletivos/[id]/desafios", async () => {
    const {
      GET: getPsDesafios,
      POST: postPsDesafios,
      DELETE: deletePsDesafios,
    } = await import("../processos-seletivos/[id]/desafios/route");

    // Cadastra 2 desafios no banco global (sem processo nem trilha)
    const d1Req = new Request("http://localhost:3000/api/desafios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: "Desafio Global Java",
        enunciadoMarkdown: "# Enunciado Global Java Completo",
        linguagem: LinguagemDesafio.JAVA,
        codigoTemplate: "public class S {}",
        suiteTestesPublicos: "@Test void t1() {}",
        suiteTestesOcultos: "@Test void t2() {}",
        timeoutSeconds: 10,
        memoryLimitMb: 512,
      }),
    });
    const d1Res = await POST(d1Req);
    const { desafio: d1 } = await d1Res.json();

    const d2Req = new Request("http://localhost:3000/api/desafios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: "Desafio Global Python",
        enunciadoMarkdown: "# Enunciado Global Python Completo",
        linguagem: LinguagemDesafio.PYTHON,
        codigoTemplate: "def f(): pass",
        suiteTestesPublicos: "def test_1(): pass",
        suiteTestesOcultos: "def test_2(): pass",
        timeoutSeconds: 10,
        memoryLimitMb: 512,
      }),
    });
    const d2Res = await POST(d2Req);
    const { desafio: d2 } = await d2Res.json();

    // 1. Vincula d1 ao processo
    const bindReq = new Request(
      `http://localhost:3000/api/processos-seletivos/${psId}/desafios`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: d1.id }),
      }
    );
    const bindRes = await postPsDesafios(bindReq, {
      params: Promise.resolve({ id: psId }),
    });
    expect(bindRes.status).toBe(200);

    // 2. Sorteia 1 de Python para o processo
    const sorteioReq = new Request(
      `http://localhost:3000/api/processos-seletivos/${psId}/desafios`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sorteio: { python: 1 } }),
      }
    );
    const sorteioRes = await postPsDesafios(sorteioReq, {
      params: Promise.resolve({ id: psId }),
    });
    expect(sorteioRes.status).toBe(200);
    const sorteioData = await sorteioRes.json();
    expect(sorteioData.desafios.map((d: any) => d.id)).toContain(d2.id);

    // 3. Lista desafios vinculados ao processo
    const listReq = new Request(
      `http://localhost:3000/api/processos-seletivos/${psId}/desafios`
    );
    const listRes = await getPsDesafios(listReq, {
      params: Promise.resolve({ id: psId }),
    });
    const listData = await listRes.json();
    expect(listData.desafios.length).toBeGreaterThanOrEqual(2);

    // 4. Remove d1 do processo
    const delReq = new Request(
      `http://localhost:3000/api/processos-seletivos/${psId}/desafios?desafioId=${d1.id}`,
      { method: "DELETE" }
    );
    const delRes = await deletePsDesafios(delReq, {
      params: Promise.resolve({ id: psId }),
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.desafios.map((d: any) => d.id)).not.toContain(d1.id);
  });
});
