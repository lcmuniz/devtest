import { describe, it, expect, beforeEach } from "vitest";
import { POST as cadastrarCandidato } from "@/app/api/candidatos/route";
import { POST as realizarInscricao } from "@/app/api/inscricoes/route";
import { GET as buscarInscricao, PUT as atualizarInscricao } from "@/app/api/inscricoes/[id]/route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
import { resetCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getRepository, resetRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("API Inscrições - Retificação e Edição de Documentos (PUT /api/inscricoes/[id])", () => {
  beforeEach(async () => {
    await resetCandidatoRepository();
    await resetRepository();
  });

  const candidatoValido = {
    nome: "Carlos Eduardo Silva",
    email: "carlos.silva@devtest.com",
    cpf: "529.982.247-25",
    senha: "senhaSegura123",
  };

  it("deve permitir ao candidato atualizar documentos e itens do barema enquanto as inscrições estiverem abertas", async () => {
    // 1. Cadastra candidato
    const reqCad = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    const resCad = await cadastrarCandidato(reqCad);
    const dataCad = await resCad.json();
    const candId = dataCad.candidato.id;

    // 2. Cria processo seletivo aberto
    const psRepo = getRepository();
    const ps = await psRepo.create({
      titulo: "PSS TI 2026",
      edital: "01/2026",
      descricao: "",
      inicioInscricoes: "2020-01-01T00:00:00Z",
      fimInscricoes: "2099-12-31T23:59:59Z",
      inicioProvas: "2099-12-31T23:59:59Z",
      fimProvas: "2099-12-31T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Backend Java", descricao: "" }],
      barema: [
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Pós Lato Sensu",
          pontuacaoUnitaria: 10,
          pontuacaoMaxima: 20,
          permiteMultiplos: true,
          exigeComprovante: true,
        },
      ],
    });

    const criterioId = ps.barema[0].id!;

    // 3. Realiza inscrição inicial com 1 pós (10 pontos)
    const reqInsc = new Request("http://localhost:3000/api/inscricoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await cabecalhosSessao(candId, "CANDIDATO")),
      },
      body: JSON.stringify({
        candidatoId: candId,
        processoSeletivoId: ps.id,
        trilhaId: ps.trilhas[0].id,
        itensBarema: [
          {
            criterioId,
            quantidadeOuAnos: 1,
            arquivoComprovanteNome: "pos1.pdf",
            arquivoComprovanteBase64: "base64doc1",
          },
        ],
      }),
    });
    const resInsc = await realizarInscricao(reqInsc);
    expect(resInsc.status).toBe(201);
    const dataInsc = await resInsc.json();
    const inscId = dataInsc.inscricao.id;
    expect(dataInsc.inscricao.pontuacaoProvisoriaBarema).toBe(10);

    // 4. Retifica inscrição adicionando mais uma pós (2 pós = 20 pontos)
    const reqPut = new Request(`http://localhost:3000/api/inscricoes/${inscId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await cabecalhosSessao(candId, "CANDIDATO")),
      },
      body: JSON.stringify({
        itensBarema: [
          {
            criterioId,
            quantidadeOuAnos: 2,
            arquivoComprovanteNome: "pos_atualizada.pdf",
            arquivoComprovanteBase64: "base64doc_novo",
          },
        ],
      }),
    });
    const resPut = await atualizarInscricao(reqPut, { params: Promise.resolve({ id: inscId }) });
    expect(resPut.status).toBe(200);
    const dataPut = await resPut.json();
    expect(dataPut.sucesso).toBe(true);
    expect(dataPut.inscricao.pontuacaoProvisoriaBarema).toBe(20);
    expect(dataPut.inscricao.itensBarema[0].arquivoComprovanteNome).toBe("pos_atualizada.pdf");
  });

  it("deve bloquear atualização se o período de inscrições já estiver encerrado", async () => {
    // 1. Cadastra candidato
    const reqCad = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    const resCad = await cadastrarCandidato(reqCad);
    const dataCad = await resCad.json();
    const candId = dataCad.candidato.id;

    // 2. Cria processo seletivo com inscrições passadas
    const psRepo = getRepository();
    const ps = await psRepo.create({
      titulo: "PSS Antigo",
      edital: "01/2020",
      descricao: "",
      inicioInscricoes: "2020-01-01T00:00:00Z",
      fimInscricoes: "2020-01-10T00:00:00Z", // Encerrado
      inicioProvas: "2020-01-15T00:00:00Z",
      fimProvas: "2020-01-20T00:00:00Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Backend Java", descricao: "" }],
      barema: [],
    });

    // Injeta inscrição manualmente no repo
    const candRepo = (await import("@/infrastructure/repositories/candidato-repository")).getCandidatoRepository();
    const insc = await candRepo.criarInscricao({
      candidatoId: candId,
      candidatoNome: candidatoValido.nome,
      candidatoEmail: candidatoValido.email,
      candidatoCpf: "52998224725",
      processoSeletivoId: ps.id,
      processoSeletivoTitulo: ps.titulo,
      trilhaId: ps.trilhas[0].id,
      trilhaNome: ps.trilhas[0].nome,
      itensBarema: [],
      pontuacaoProvisoriaBarema: 0,
      extratoBarema: { pontuacaoTotal: 0, itens: [] },
    });

    // 3. Tenta atualizar
    const reqPut = new Request(`http://localhost:3000/api/inscricoes/${insc.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await cabecalhosSessao(candId, "CANDIDATO")),
      },
      body: JSON.stringify({ itensBarema: [] }),
    });
    const resPut = await atualizarInscricao(reqPut, { params: Promise.resolve({ id: insc.id }) });
    expect(resPut.status).toBe(403);
    const dataPut = await resPut.json();
    expect(dataPut.erro).toMatch(/encerrado/i);
  });
});
