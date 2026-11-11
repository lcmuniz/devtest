import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { getRepository, resetRepository } from "@/infrastructure/repositories/processo-seletivo-repository";

describe("API Processos Seletivos - Criação e Listagem (Seam 2)", () => {
  beforeEach(async () => {
    await resetRepository();
  });

  const payloadValido = {
    titulo: "Processo Seletivo PSS 2026/1 - DevTest",
    edital: "Edital 01/2026",
    descricao: "Contratação temporária de auditores de TI",
    inicioInscricoes: "2026-04-01T08:00:00Z",
    fimInscricoes: "2026-04-15T23:59:59Z",
    inicioProvas: "2026-04-20T08:00:00Z",
    fimProvas: "2026-04-25T23:59:59Z",
    pesoProvaTecnica: 70,
    pesoBaremaCurricular: 30,
    notaCorteMinima: 60,
    trilhas: [
      { nome: "Backend Java", descricao: "Java 21 e ecossistema Spring" },
      { nome: "Frontend React", descricao: "React, Next.js e TypeScript" },
    ],
    barema: [
      {
        tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
        descricao: "Anos de experiência em desenvolvimento de software",
        pontuacaoUnitaria: 2.0,
        pontuacaoMaxima: 20.0,
        permiteMultiplos: true,
      },
      {
        tipo: TipoCriterioBarema.MESTRADO,
        descricao: "Mestrado em Computação",
        pontuacaoUnitaria: 30.0,
        pontuacaoMaxima: 30.0,
        permiteMultiplos: false,
      },
      {
        tipo: TipoCriterioBarema.DOUTORADO,
        descricao: "Doutorado em Computação",
        pontuacaoUnitaria: 50.0,
        pontuacaoMaxima: 50.0,
        permiteMultiplos: false,
      },
    ],
  };

  it("deve criar um Processo Seletivo com sucesso via POST e retornar status 201 com ID", async () => {
    const request = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadValido),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.sucesso).toBe(true);
    expect(data.processoSeletivo).toBeDefined();
    expect(data.processoSeletivo.id).toBeDefined();
    expect(data.processoSeletivo.titulo).toBe(payloadValido.titulo);
    expect(data.processoSeletivo.trilhas).toHaveLength(2);
    expect(data.processoSeletivo.barema).toHaveLength(3);
  });

  it("deve retornar 400 com lista de erros quando o payload for inválido", async () => {
    const payloadInvalido = {
      ...payloadValido,
      pesoProvaTecnica: 50,
      pesoBaremaCurricular: 30, // soma 80 != 100
    };

    const request = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadInvalido),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.sucesso).toBe(false);
    expect(data.erros).toBeDefined();
    expect(data.erros).toContain("A soma dos pesos da prova técnica e do barema curricular deve ser exatamente 100%.");
  });

  it("deve listar todos os processos seletivos persistidos via GET", async () => {
    // Cria um processo seletivo primeiro
    const postReq = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadValido),
    });
    await POST(postReq);

    const getReq = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "GET",
    });

    const response = await GET(getReq);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.sucesso).toBe(true);
    expect(data.processosSeletivos).toHaveLength(1);
    expect(data.processosSeletivos[0].titulo).toBe(payloadValido.titulo);
  });
});
