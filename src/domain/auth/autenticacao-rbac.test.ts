import { describe, it, expect } from "vitest";
import {
  gerarTokenSessao,
  verificarTokenSessao,
  avaliarAcessoRota,
  avaliarAcessoApi,
  SessaoUsuario,
} from "./autenticacao-rbac";

describe("Domínio: Autenticação por E-mail/Senha e Controle de Acesso (RBAC)", () => {
  const sessaoCandidato: SessaoUsuario = {
    id: "cand-123",
    nome: "Luiz Carlos",
    email: "candidato@exemplo.com",
    cpf: "47138505353",
    perfil: "CANDIDATO",
    expiraEm: Date.now() + 3600_000,
  };

  const sessaoBanca: SessaoUsuario = {
    id: "banca-01",
    nome: "Avaliador DevTest",
    email: "banca@devtest.com",
    perfil: "BANCA_AVALIADORA",
    expiraEm: Date.now() + 3600_000,
  };

  it("deve gerar um token assinado e recuperar a sessão íntegra na verificação", async () => {
    const token = await gerarTokenSessao(sessaoCandidato, "segredo-teste");
    const recuperada = await verificarTokenSessao(token, "segredo-teste");

    expect(recuperada).not.toBeNull();
    expect(recuperada?.id).toBe("cand-123");
    expect(recuperada?.email).toBe("candidato@exemplo.com");
    expect(recuperada?.perfil).toBe("CANDIDATO");
  });

  it("deve rejeitar token adulterado, com assinatura inválida ou expirado", async () => {
    const token = await gerarTokenSessao(sessaoBanca, "segredo-correto");
    expect(await verificarTokenSessao(token, "segredo-errado")).toBeNull();
    expect(await verificarTokenSessao(token + "adulterado", "segredo-correto")).toBeNull();

    const sessaoExpirada: SessaoUsuario = {
      ...sessaoCandidato,
      expiraEm: Date.now() - 10_000,
    };
    const tokenExpirado = await gerarTokenSessao(sessaoExpirada, "segredo-correto");
    expect(await verificarTokenSessao(tokenExpirado, "segredo-correto")).toBeNull();
  });

  it("deve bloquear acesso anônimo às rotas de /banca/* e /candidato/* redirecionando para /login", () => {
    const resBanca = avaliarAcessoRota("/banca/avaliacao", null);
    expect(resBanca.permitido).toBe(false);
    expect(resBanca.motivo).toBe("NAO_AUTENTICADO");
    expect(resBanca.redirecionarPara).toBe("/login?redirect=%2Fbanca%2Favaliacao");

    const resCandidato = avaliarAcessoRota("/candidato/prova", null);
    expect(resCandidato.permitido).toBe(false);
    expect(resCandidato.motivo).toBe("NAO_AUTENTICADO");
    expect(resCandidato.redirecionarPara).toBe("/login?redirect=%2Fcandidato%2Fprova");
  });

  it("deve impedir que CANDIDATO acesse rotas da BANCA_AVALIADORA e vice-versa", () => {
    const candidatoNaBanca = avaliarAcessoRota("/banca/avaliacao", sessaoCandidato);
    expect(candidatoNaBanca.permitido).toBe(false);
    expect(candidatoNaBanca.motivo).toBe("PERFIL_INSUFICIENTE");

    const bancaNoCandidato = avaliarAcessoRota("/candidato/prova", sessaoBanca);
    expect(bancaNoCandidato.permitido).toBe(false);
    expect(bancaNoCandidato.motivo).toBe("PERFIL_INSUFICIENTE");

    expect(avaliarAcessoRota("/banca/avaliacao", sessaoBanca).permitido).toBe(true);
    expect(avaliarAcessoRota("/candidato/prova", sessaoCandidato).permitido).toBe(true);
  });

  it("deve falhar quando AUTH_SECRET não está definido e nenhum segredo é passado", async () => {
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      await expect(gerarTokenSessao(sessaoBanca)).rejects.toThrow("AUTH_SECRET");
    } finally {
      if (original !== undefined) process.env.AUTH_SECRET = original;
    }
  });

  it("deve proteger as rotas /api/* por sessão e perfil", () => {
    // públicas
    expect(avaliarAcessoApi("/api/auth/login", "POST", null, null).permitido).toBe(true);
    expect(avaliarAcessoApi("/api/candidatos", "POST", null, null).permitido).toBe(true);
    expect(avaliarAcessoApi("/api/candidatos/login", "POST", null, null).status).toBe(401);

    // anônimo
    expect(avaliarAcessoApi("/api/desafios", "GET", null, null)).toEqual({ permitido: false, status: 401 });
    expect(avaliarAcessoApi("/api/inscricoes", "POST", null, null).status).toBe(401);

    // candidato
    expect(avaliarAcessoApi("/api/processos-seletivos", "GET", null, sessaoCandidato).permitido).toBe(true);
    expect(avaliarAcessoApi("/api/submissoes", "POST", null, sessaoCandidato).permitido).toBe(true);
    for (const [caminho, metodo, visao] of [
      ["/api/desafios", "GET", null],
      ["/api/desafios/d1", "GET", null],
      ["/api/banca/ranking", "GET", null],
      ["/api/%62anca/ranking", "GET", null],
      ["/api/banca/ranking/", "GET", null],
      ["/api/desafios", "POST", null],
      ["/api/desafios/d1", "PUT", null],
      ["/api/processos-seletivos", "POST", null],
      ["/api/processos-seletivos/ps1/desafios", "GET", null],
      ["/api/runner/jobs", "POST", null],
    ] as const) {
      expect(avaliarAcessoApi(caminho, metodo, visao, sessaoCandidato), caminho).toEqual({
        permitido: false,
        status: 403,
      });
    }

    // banca
    expect(avaliarAcessoApi("/api/desafios", "GET", "banca", sessaoBanca).permitido).toBe(true);
    expect(avaliarAcessoApi("/api/runner/jobs", "POST", null, sessaoBanca).permitido).toBe(true);
  });
});

