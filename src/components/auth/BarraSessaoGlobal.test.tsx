import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BarraSessaoGlobal } from "./BarraSessaoGlobal";
import { PerfilUsuario, SessaoUsuario } from "@/domain/auth/autenticacao-rbac";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("BarraSessaoGlobal (Menu Dinâmico por Perfil)", () => {
  it("deve renderizar links de entrada quando o usuário não estiver autenticado", () => {
    render(<BarraSessaoGlobal sessaoInicial={null} />);

    expect(screen.getByText(/Não autenticado/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Entrar no Sistema/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("deve renderizar exclusivamente as opções da Banca Avaliadora para perfil BANCA_AVALIADORA", () => {
    const sessaoBanca: SessaoUsuario = {
      id: "banca-1",
      email: "banca@devtest.com",
      nome: "Comissão Avaliadora",
      perfil: "BANCA_AVALIADORA",
      expiraEm: Date.now() + 3600000,
    };

    render(<BarraSessaoGlobal sessaoInicial={sessaoBanca} />);

    expect(screen.getByText("Banca Avaliadora")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Processos Seletivos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Banco de Desafios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Classificação & Auditoria/i })).toBeInTheDocument();

    // Não deve conter opções de candidato
    expect(screen.queryByRole("link", { name: /Minhas Inscrições/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ambiente de Prova/i })).not.toBeInTheDocument();
  });

  it("deve renderizar exclusivamente as opções do Candidato para perfil CANDIDATO", () => {
    const sessaoCandidato: SessaoUsuario = {
      id: "cand-1",
      email: "candidato@email.com",
      nome: "Maria Silva",
      perfil: "CANDIDATO",
      expiraEm: Date.now() + 3600000,
    };

    render(<BarraSessaoGlobal sessaoInicial={sessaoCandidato} />);

    expect(screen.getByText("Candidato")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Minhas Inscrições/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ambiente de Prova/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Espelho & Recursos/i })).toBeInTheDocument();

    // Não deve conter opções de banca
    expect(screen.queryByRole("link", { name: /Processos Seletivos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Banco de Desafios/i })).not.toBeInTheDocument();
  });
});
