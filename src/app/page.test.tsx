import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import HomePage from "./page";
import { PerfilUsuario, SessaoUsuario } from "@/domain/auth/autenticacao-rbac";

let mockSessao: SessaoUsuario | null = null;

vi.mock("@/infrastructure/auth/session-server", () => ({
  obterSessaoServidor: vi.fn(async () => mockSessao),
}));

describe("HomePage (Portal Dinâmico por Perfil)", () => {
  beforeEach(() => {
    mockSessao = null;
  });

  it("deve renderizar tela de login para usuário não autenticado", async () => {
    const Componente = await HomePage();
    render(Componente);

    expect(screen.getByText("DevTest • Seleção e Avaliação Técnica")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Acessar Sistema \(Login\)/i })
    ).toBeInTheDocument();
  });

  it("deve renderizar opções e cards da Banca para perfil BANCA_AVALIADORA", async () => {
    mockSessao = {
      id: "banca-admin",
      email: "banca@devtest.com",
      nome: "Comissão Avaliadora",
      perfil: "BANCA_AVALIADORA",
      expiraEm: Date.now() + 3600000,
    };

    const Componente = await HomePage();
    render(Componente);

    expect(screen.getByText("Painel da Banca")).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo\(a\), Comissão Avaliadora/i)).toBeInTheDocument();

    expect(screen.getByText("Processos Seletivos")).toBeInTheDocument();
    expect(screen.getByText("Banco Global de Desafios")).toBeInTheDocument();
    expect(screen.getByText("Classificação, Auditoria & Recursos")).toBeInTheDocument();

    // Não deve exibir opções de candidato
    expect(screen.queryByText("Minhas Inscrições")).not.toBeInTheDocument();
    expect(screen.queryByText("Ambiente de Prova (Web IDE)")).not.toBeInTheDocument();
  });

  it("deve renderizar opções e cards do Candidato para perfil CANDIDATO", async () => {
    mockSessao = {
      id: "cand-123",
      email: "luiz@email.com",
      nome: "Luiz Muniz",
      perfil: "CANDIDATO",
      expiraEm: Date.now() + 3600000,
    };

    const Componente = await HomePage();
    render(Componente);

    expect(screen.getByText("Área do Candidato")).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo\(a\), Luiz Muniz/i)).toBeInTheDocument();

    expect(screen.getByText("Minhas Inscrições")).toBeInTheDocument();
    expect(screen.getByText("Ambiente de Prova (Web IDE)")).toBeInTheDocument();
    expect(screen.getByText("Espelho de Avaliação & Recursos")).toBeInTheDocument();

    // Não deve exibir opções da banca
    expect(screen.queryByText("Processos Seletivos")).not.toBeInTheDocument();
    expect(screen.queryByText("Banco Global de Desafios")).not.toBeInTheDocument();
  });
});
