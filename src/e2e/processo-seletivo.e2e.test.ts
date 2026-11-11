import { describe, it, expect, beforeEach } from "vitest";
import { GET as getListagem, POST as criarProcesso } from "@/app/api/processos-seletivos/route";
import { GET as getPorId } from "@/app/api/processos-seletivos/[id]/route";
import { resetRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("E2E - Ciclo Completo de Criação, Listagem e Persistência de Processo Seletivo", () => {
  beforeEach(async () => {
    await resetRepository();
  });

  it("deve criar, persistir, listar e consultar por ID um Processo Seletivo com múltiplas Trilhas e Matriz de Barema completa", async () => {
    // 1. Criação do Processo Seletivo completo
    const payloadCompleto = {
      titulo: "Processo Seletivo Simplificado DevTest - Edital 2026/01",
      edital: "Edital nº 01/2026 - DevTest",
      descricao: "Seleção técnica de desenvolvedores de software para atuação em auditoria governamental",
      inicioInscricoes: "2026-06-01T08:00:00Z",
      fimInscricoes: "2026-06-15T23:59:59Z",
      inicioProvas: "2026-06-20T08:00:00Z",
      fimProvas: "2026-06-25T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [
        { nome: "Backend Java", descricao: "Java 21, Spring Boot 3 e arquitetura de microsserviços" },
        { nome: "Frontend React", descricao: "React 19, Next.js e TypeScript" },
        { nome: "Engenharia de Dados Python", descricao: "Python, PySpark e modelagem dimensional" },
      ],
      barema: [
        {
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Anos de experiência profissional comprovada em desenvolvimento",
          pontuacaoUnitaria: 2.0,
          pontuacaoMaxima: 20.0,
          permiteMultiplos: true,
        },
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Pós-graduação Lato Sensu em área correlata",
          pontuacaoUnitaria: 10.0,
          pontuacaoMaxima: 10.0,
          permiteMultiplos: false,
        },
        {
          tipo: TipoCriterioBarema.MESTRADO,
          descricao: "Mestrado Stricto Sensu em Ciência da Computação",
          pontuacaoUnitaria: 20.0,
          pontuacaoMaxima: 20.0,
          permiteMultiplos: false,
        },
        {
          tipo: TipoCriterioBarema.DOUTORADO,
          descricao: "Doutorado Stricto Sensu em Ciência da Computação",
          pontuacaoUnitaria: 30.0,
          pontuacaoMaxima: 30.0,
          permiteMultiplos: false,
        },
        {
          tipo: TipoCriterioBarema.CERTIFICACAO,
          descricao: "Certificações técnicas reconhecidas de fornecedores de nuvem ou tecnologias",
          pontuacaoUnitaria: 5.0,
          pontuacaoMaxima: 20.0,
          permiteMultiplos: true,
        },
      ],
    };

    const criacaoReq = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadCompleto),
    });

    const criacaoRes = await criarProcesso(criacaoReq);
    expect(criacaoRes.status).toBe(201);

    const criacaoData = await criacaoRes.json();
    expect(criacaoData.sucesso).toBe(true);
    expect(criacaoData.processoSeletivo).toBeDefined();

    const idCriado = criacaoData.processoSeletivo.id;
    expect(idCriado).toMatch(/^ps-/);
    expect(criacaoData.processoSeletivo.trilhas).toHaveLength(3);
    expect(criacaoData.processoSeletivo.barema).toHaveLength(5);
    expect(criacaoData.processoSeletivo.status).toBe("PUBLICADO");

    // 2. Consulta à Listagem
    const listagemReq = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "GET",
    });
    const listagemRes = await getListagem(listagemReq);
    expect(listagemRes.status).toBe(200);

    const listagemData = await listagemRes.json();
    expect(listagemData.sucesso).toBe(true);
    expect(listagemData.processosSeletivos).toHaveLength(1);
    expect(listagemData.processosSeletivos[0].id).toBe(idCriado);
    expect(listagemData.processosSeletivos[0].titulo).toBe(payloadCompleto.titulo);

    // 3. Consulta Específica por ID
    const porIdReq = new Request(`http://localhost:3000/api/processos-seletivos/${idCriado}`, {
      method: "GET",
    });
    const porIdRes = await getPorId(porIdReq, { params: Promise.resolve({ id: idCriado }) });
    expect(porIdRes.status).toBe(200);

    const porIdData = await porIdRes.json();
    expect(porIdData.sucesso).toBe(true);
    expect(porIdData.processoSeletivo.id).toBe(idCriado);
    expect(porIdData.processoSeletivo.pesoProvaTecnica).toBe(60);
    expect(porIdData.processoSeletivo.pesoBaremaCurricular).toBe(40);
    expect(porIdData.processoSeletivo.notaCorteMinima).toBe(50);
    expect(porIdData.processoSeletivo.trilhas.map((t: any) => t.nome)).toEqual([
      "Backend Java",
      "Frontend React",
      "Engenharia de Dados Python",
    ]);

    // 4. Tentativa de cadastro inválido não altera o repositório
    const payloadInvalido = {
      ...payloadCompleto,
      inicioInscricoes: "2026-06-20T00:00:00Z",
      fimInscricoes: "2026-06-10T00:00:00Z", // Invertido!
    };
    const reqInvalida = new Request("http://localhost:3000/api/processos-seletivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadInvalido),
    });
    const resInvalida = await criarProcesso(reqInvalida);
    expect(resInvalida.status).toBe(400);

    // Confirma que ainda há apenas 1 processo no repositório
    const resListagem2 = await getListagem(
      new Request("http://localhost:3000/api/processos-seletivos")
    );
    const dataListagem2 = await resListagem2.json();
    expect(dataListagem2.processosSeletivos).toHaveLength(1);
  });
});
