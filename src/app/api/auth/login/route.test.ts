import { describe, it, expect, beforeEach } from "vitest";
import { POST as loginPOST } from "./route";
import { POST as logoutPOST } from "../logout/route";
import { GET as meGET } from "../me/route";
import { POST as criarCandidatoPOST } from "../../candidatos/route";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import { resetGlobalRateLimiters } from "@/domain/seguranca/rate-limit";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";
import { gerarHashSenha } from "@/domain/auth/senha";

const BANCA_EMAIL = "banca.teste@devtest.local";
const BANCA_SENHA = "senhaBancaTeste123";

describe("API Seam: Autenticação por E-mail/Senha e Sessão RBAC (/api/auth/*)", () => {
  beforeEach(async () => {
    resetGlobalRateLimiters();
    await getCandidatoRepository().reset();
    await ensureSchemaInitialized();
    await getDbPool().query(
      `INSERT INTO usuarios_banca (id, nome, email, senha_hash)
       VALUES ('banca-teste', 'Banca Teste', $1, $2)
       ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`,
      [BANCA_EMAIL, await gerarHashSenha(BANCA_SENHA)]
    );
  });

  it("deve autenticar membro da Banca Avaliadora com e-mail/senha, emitir cookie de sessão e validar em /api/auth/me", async () => {
    const reqLogin = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: BANCA_EMAIL,
        senha: BANCA_SENHA,
        perfil: "BANCA_AVALIADORA",
      }),
    });

    const resLogin = await loginPOST(reqLogin);
    expect(resLogin.status).toBe(200);
    const dataLogin = await resLogin.json();
    expect(dataLogin.sucesso).toBe(true);
    expect(dataLogin.usuario.perfil).toBe("BANCA_AVALIADORA");
    expect(dataLogin.usuario.email).toBe(BANCA_EMAIL);

    const setCookie = resLogin.headers.get("set-cookie");
    expect(setCookie).toContain("devtest_sessao=");

    const reqMe = new Request("http://localhost:3000/api/auth/me", {
      headers: { Cookie: setCookie!.split(";")[0] },
    });
    const resMe = await meGET(reqMe);
    expect(resMe.status).toBe(200);
    const dataMe = await resMe.json();
    expect(dataMe.autenticado).toBe(true);
    expect(dataMe.usuario.perfil).toBe("BANCA_AVALIADORA");
  });

  it("deve cadastrar um Candidato, autenticar por e-mail/senha, retornar 401 para senha incorreta e encerrar sessão no logout", async () => {
    const reqCadastro = new Request("http://localhost:3000/api/candidatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: "Maria Oliveira",
        email: "maria.oliveira@email.com",
        cpf: "52998224725",
        senha: "senhaSegura123",
      }),
    });
    const resCadastro = await criarCandidatoPOST(reqCadastro);
    expect(resCadastro.status).toBe(201);

    // Tentativa com senha errada
    const reqFalha = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: "maria.oliveira@email.com",
        senha: "senhaErrada",
        perfil: "CANDIDATO",
      }),
    });
    const resFalha = await loginPOST(reqFalha);
    expect(resFalha.status).toBe(401);

    // Login correto
    const reqSucesso = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identificador: "maria.oliveira@email.com",
        senha: "senhaSegura123",
        perfil: "CANDIDATO",
      }),
    });
    const resSucesso = await loginPOST(reqSucesso);
    expect(resSucesso.status).toBe(200);
    const dataSucesso = await resSucesso.json();
    expect(dataSucesso.usuario.perfil).toBe("CANDIDATO");
    expect(dataSucesso.usuario.nome).toBe("Maria Oliveira");

    // Logout
    const resLogout = await logoutPOST();
    expect(resLogout.status).toBe(200);
    expect(resLogout.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("deve bloquear com status 429 Too Many Requests após 5 tentativas consecutivas de login", async () => {
    const credenciais = {
      identificador: "hacker@devtest.com",
      senha: "senhaIncorreta",
      perfil: "CANDIDATO",
    };

    // 5 tentativas permitidas
    for (let i = 0; i < 5; i++) {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.99",
        },
        body: JSON.stringify(credenciais),
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    }

    // 6ª tentativa deve ser bloqueada com 429
    const reqBloqueada = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.99",
      },
      body: JSON.stringify(credenciais),
    });

    const resBloqueada = await loginPOST(reqBloqueada);
    expect(resBloqueada.status).toBe(429);
    expect(resBloqueada.headers.get("Retry-After")).toBeDefined();
    expect(resBloqueada.headers.get("X-RateLimit-Remaining")).toBe("0");

    const dataBloqueada = await resBloqueada.json();
    expect(dataBloqueada.sucesso).toBe(false);
    expect(dataBloqueada.erro).toContain("Muitas tentativas de login consecutivas");
  });
});
