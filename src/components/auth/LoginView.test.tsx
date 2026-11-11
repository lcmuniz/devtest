import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginView } from "./LoginView";

describe("UI Seam: LoginView (Autenticação E-mail/Senha e Cadastro de Candidato)", () => {
  it("deve permitir alternar entre perfil Candidato e Banca Avaliadora e submeter login com e-mail/senha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sucesso: true,
        usuario: {
          id: "banca-01",
          nome: "Comissão Avaliadora DevTest",
          email: "banca@devtest.com",
          perfil: "BANCA_AVALIADORA",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginView redirectInicial="/banca/avaliacao" />);

    const btnBanca = screen.getByRole("button", { name: /banca avaliadora/i });
    fireEvent.click(btnBanca);

    const inputIdentificador = screen.getByLabelText(/e-mail institucional/i);
    const inputSenha = screen.getByLabelText(/senha/i);

    fireEvent.change(inputIdentificador, {
      target: { value: "banca@devtest.com" },
    });
    fireEvent.change(inputSenha, {
      target: { value: "banca123" },
    });

    const btnEntrar = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });
    fireEvent.click(btnEntrar);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("deve exibir alerta de permissão quando um perfil tenta acessar área restrita de outro perfil", () => {
    render(
      <LoginView
        erroInicial="acesso_restrito_banca"
        redirectInicial="/banca/avaliacao"
      />
    );

    expect(
      screen.getByText(/acesso restrito à banca avaliadora/i)
    ).toBeInTheDocument();
  });
});
