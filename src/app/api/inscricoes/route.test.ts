import { describe, it, expect, beforeEach } from "vitest";
import { POST as cadastrarCandidato } from "@/app/api/candidatos/route";
import { POST as loginCandidato } from "@/app/api/auth/login/route";
import { POST as realizarInscricao } from "@/app/api/inscricoes/route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
import { resetCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { getRepository, resetRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("API Candidato & Inscrição - Rotas e Validação (Seam 2)", () => {
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

  it("deve cadastrar um candidato com sucesso e retornar status 201", async () => {
    const req = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });

    const res = await cadastrarCandidato(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.sucesso).toBe(true);
    expect(data.candidato.id).toBeDefined();
    expect(data.candidato.cpf).toBe("52998224725");
    expect(data.candidato.senha).toBeUndefined(); // Senha nunca é retornada
  });

  it("deve realizar login de candidato com CPF ou E-mail e senha válida", async () => {
    const reqCadastro = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    await cadastrarCandidato(reqCadastro);

    // Login com e-mail
    const reqLoginEmail = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpfOuEmail: "carlos.silva@devtest.com",
        senha: "senhaSegura123",
        perfil: "CANDIDATO",
      }),
    });
    const resLoginEmail = await loginCandidato(reqLoginEmail);
    expect(resLoginEmail.status).toBe(200);
    const dataEmail = await resLoginEmail.json();
    expect(dataEmail.sucesso).toBe(true);
    expect(dataEmail.usuario.nome).toBe("Carlos Eduardo Silva");

    // Login com senha errada
    const reqLoginErro = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpfOuEmail: "carlos.silva@devtest.com",
        senha: "senhaErrada",
        perfil: "CANDIDATO",
      }),
    });
    const resLoginErro = await loginCandidato(reqLoginErro);
    expect(resLoginErro.status).toBe(401);
  });

  it("deve rejeitar cadastro com e-mail duplicado ou CPF duplicado", async () => {
    const req1 = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    await cadastrarCandidato(req1);

    // Tentativa 1: mesmo e-mail
    const reqEmailDuplicado = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...candidatoValido, cpf: "11144477735" }),
    });
    const resEmail = await cadastrarCandidato(reqEmailDuplicado);
    expect(resEmail.status).toBe(409);
    const dataEmail = await resEmail.json();
    expect(dataEmail.erro).toContain("Já existe um candidato cadastrado com este e-mail.");

    // Tentativa 2: mesmo CPF
    const reqCpfDuplicado = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...candidatoValido, email: "outro@email.com" }),
    });
    const resCpf = await cadastrarCandidato(reqCpfDuplicado);
    expect(resCpf.status).toBe(409);
    const dataCpf = await resCpf.json();
    expect(dataCpf.erro).toContain("Já existe um candidato cadastrado com este CPF.");
  });

  it("deve realizar a inscrição em processo seletivo e calcular pontuação preliminar do barema com código anônimo", async () => {
    // 1. Cadastra candidato
    const candReq = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    const candRes = await cadastrarCandidato(candReq);
    const { candidato } = await candRes.json();

    // 2. Cria processo seletivo com trilha e barema
    const psRepo = getRepository();
    const processo = await psRepo.create({
      titulo: "PSS DevTest 2026/1",
      edital: "Edital 01/2026",
      inicioInscricoes: "2026-01-01T08:00:00Z",
      fimInscricoes: "2026-12-31T23:59:59Z",
      inicioProvas: "2027-01-10T08:00:00Z",
      fimProvas: "2027-01-20T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Backend Java", descricao: "" }],
      barema: [
        {
          tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
          descricao: "Experiência profissional",
          pontuacaoUnitaria: 2.0,
          pontuacaoMaxima: 100.0,
          permiteMultiplos: true,
          exigeComprovante: true,
        },
      ],
    });

    const criterioId = processo.barema[0].id;
    const trilhaId = processo.trilhas[0].id;

    // 3. Submete inscrição
    const inscricaoPayload = {
      candidatoId: candidato.id,
      processoSeletivoId: processo.id,
      trilhaId,
      itensBarema: [
        {
          criterioId,
          quantidadeOuAnos: 4, // 4 * 2 = 8 pts
          arquivoComprovanteNome: "certidao_tempo_servico.pdf",
        },
      ],
    };

    // Outro candidato não pode se inscrever em nome deste
    const resOutro = await realizarInscricao(
      new Request("http://localhost:3000/api/inscricoes", {
        method: "POST",
        headers: await cabecalhosSessao("cand-outro"),
        body: JSON.stringify(inscricaoPayload),
      })
    );
    expect(resOutro.status).toBe(403);

    const inscReq = new Request("http://localhost:3000/api/inscricoes", {
      method: "POST",
      headers: await cabecalhosSessao(candidato.id),
      body: JSON.stringify(inscricaoPayload),
    });

    const inscRes = await realizarInscricao(inscReq);
    expect(inscRes.status).toBe(201);

    const dataInsc = await inscRes.json();
    expect(dataInsc.sucesso).toBe(true);
    expect(dataInsc.inscricao.numeroInscricao).toMatch(/^INSC-\d{4}-\d+/);
    expect(dataInsc.inscricao.codigoAnonimo).toMatch(/^CAND-\d{4}/); // Correção Cega
    expect(dataInsc.inscricao.pontuacaoProvisoriaBarema).toBe(8.0);
    expect(dataInsc.inscricao.extratoBarema.itensDetalhados[0].pontosCalculados).toBe(8.0);
  });

  it("deve permitir inscrição em trilha diferente do mesmo processo, mas rejeitar duplicidade na mesma trilha", async () => {
    // 1. Cadastra candidato
    const candReq = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidatoValido),
    });
    const candRes = await cadastrarCandidato(candReq);
    const { candidato } = await candRes.json();

    // 2. Cria processo seletivo com 2 trilhas
    const psRepo = getRepository();
    const processo = await psRepo.create({
      titulo: "PSS DevTest 2026 Multi-Trilha",
      edital: "Edital 02/2026",
      inicioInscricoes: "2026-01-01T08:00:00Z",
      fimInscricoes: "2026-12-31T23:59:59Z",
      inicioProvas: "2027-01-10T08:00:00Z",
      fimProvas: "2027-01-20T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [
        { nome: "Backend Java", descricao: "" },
        { nome: "Frontend React", descricao: "" },
      ],
      barema: [],
    });

    const trilhaJava = processo.trilhas[0].id;
    const trilhaReact = processo.trilhas[1].id;

    // 3. Primeira inscrição na trilha Java -> SUCESSO 201
    const inscJavaReq = new Request("http://localhost:3000/api/inscricoes", {
      method: "POST",
      headers: await cabecalhosSessao(candidato.id),
      body: JSON.stringify({
        candidatoId: candidato.id,
        processoSeletivoId: processo.id,
        trilhaId: trilhaJava,
        itensBarema: [],
      }),
    });
    const res1 = await realizarInscricao(inscJavaReq);
    expect(res1.status).toBe(201);

    // 4. Segunda tentativa na MESMA trilha Java -> BLOQUEIO 409
    const inscDuplicadaReq = new Request("http://localhost:3000/api/inscricoes", {
      method: "POST",
      headers: await cabecalhosSessao(candidato.id),
      body: JSON.stringify({
        candidatoId: candidato.id,
        processoSeletivoId: processo.id,
        trilhaId: trilhaJava,
        itensBarema: [],
      }),
    });
    const resDuplicada = await realizarInscricao(inscDuplicadaReq);
    expect(resDuplicada.status).toBe(409);
    const dataDup = await resDuplicada.json();
    expect(dataDup.erro).toContain("já está inscrito nesta trilha deste Processo Seletivo");

    // 5. Inscrição na trilha React do MESMO processo -> SUCESSO 201
    const inscReactReq = new Request("http://localhost:3000/api/inscricoes", {
      method: "POST",
      headers: await cabecalhosSessao(candidato.id),
      body: JSON.stringify({
        candidatoId: candidato.id,
        processoSeletivoId: processo.id,
        trilhaId: trilhaReact,
        itensBarema: [],
      }),
    });
    const res2 = await realizarInscricao(inscReactReq);
    expect(res2.status).toBe(201);
    const dataReact = await res2.json();
    expect(dataReact.inscricao.trilhaId).toBe(trilhaReact);
    expect(dataReact.inscricao.codigoAnonimo).toBeDefined();
  });
});
