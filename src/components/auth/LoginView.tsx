"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PerfilUsuario } from "@/domain/auth/autenticacao-rbac";

export interface LoginViewProps {
  redirectInicial?: string;
  erroInicial?: string;
}

export function LoginView({
  redirectInicial,
  erroInicial,
}: LoginViewProps) {
  const perfilPadrao: PerfilUsuario = redirectInicial?.startsWith("/banca")
    ? "BANCA_AVALIADORA"
    : "CANDIDATO";

  const [perfil, setPerfil] = useState<PerfilUsuario>(perfilPadrao);
  const [modoCadastro, setModoCadastro] = useState(false);

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");

  // Campos de novo cadastro de candidato
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [cpfCadastro, setCpfCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(
    erroInicial === "acesso_restrito_banca"
      ? "Acesso restrito à Banca Avaliadora. Autentique-se com uma conta institucional da Banca."
      : erroInicial === "acesso_restrito_candidato"
      ? "Acesso restrito a Candidatos. Autentique-se com sua conta de Candidato."
      : null
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador,
          senha,
          perfil,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.sucesso) {
        setErro(data.erro || "Falha ao autenticar. Verifique suas credenciais.");
        return;
      }

      const destino =
        redirectInicial &&
        ((perfil === "BANCA_AVALIADORA" &&
          redirectInicial.startsWith("/banca")) ||
          (perfil === "CANDIDATO" && redirectInicial.startsWith("/candidato")))
          ? redirectInicial
          : perfil === "BANCA_AVALIADORA"
          ? "/banca/avaliacao"
          : "/candidato/prova";

      if (typeof window !== "undefined") {
        window.location.href = destino;
      }
    } catch (err: any) {
      setErro(err?.message || "Erro de conexão ao autenticar.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleCadastrarCandidato(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const resCad = await fetch("/api/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeCadastro,
          email: emailCadastro,
          cpf: cpfCadastro,
          senha: senhaCadastro,
        }),
      });
      const dataCad = await resCad.json();

      if (!resCad.ok || !dataCad.sucesso) {
        const msg =
          (dataCad.erros && dataCad.erros.join(" ")) ||
          dataCad.erro ||
          "Erro ao criar conta de candidato.";
        setErro(msg);
        return;
      }

      // Faz login automático após cadastro
      const resLogin = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador: emailCadastro,
          senha: senhaCadastro,
          perfil: "CANDIDATO",
        }),
      });
      if (resLogin.ok && typeof window !== "undefined") {
        window.location.href = redirectInicial?.startsWith("/candidato")
          ? redirectInicial
          : "/candidato/inscricao";
      }
    } catch (err: any) {
      setErro(err?.message || "Erro ao cadastrar candidato.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase">
            DevTest • Controle de Acesso
          </span>
          <h1 className="text-2xl font-bold text-white">
            Autenticação na Plataforma
          </h1>
          <p className="text-xs text-slate-400">
            Acesse com seu e-mail e senha de Candidato ou da Banca Avaliadora.
          </p>
        </div>

        {/* Seletor de Perfil */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setPerfil("CANDIDATO");
              setErro(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              perfil === "CANDIDATO"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sou Candidato
          </button>
          <button
            type="button"
            onClick={() => {
              setPerfil("BANCA_AVALIADORA");
              setModoCadastro(false);
              setErro(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              perfil === "BANCA_AVALIADORA"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Banca Avaliadora
          </button>
        </div>

        {erro && (
          <div
            role="alert"
            className="rounded-xl bg-rose-950/60 border border-rose-500/40 p-3.5 text-xs text-rose-200"
          >
            {erro}
          </div>
        )}

        {!modoCadastro ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="input-identificador"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {perfil === "BANCA_AVALIADORA"
                  ? "E-mail Institucional da Banca"
                  : "E-mail ou CPF do Candidato"}
              </label>
              <input
                id="input-identificador"
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder={
                  perfil === "BANCA_AVALIADORA"
                    ? "banca@devtest.com"
                    : "seu.email@exemplo.com ou CPF"
                }
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="input-senha"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Senha
              </label>
              <input
                id="input-senha"
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold text-white transition cursor-pointer ${
                perfil === "BANCA_AVALIADORA"
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              } disabled:opacity-50`}
            >
              {carregando ? "Autenticando..." : "Entrar no Sistema"}
            </button>

            {perfil === "CANDIDATO" && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModoCadastro(true);
                    setErro(null);
                  }}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Primeiro acesso? Cadastre sua conta de Candidato
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleCadastrarCandidato} className="space-y-3.5">
            <div>
              <label
                htmlFor="cad-nome"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Nome Completo
              </label>
              <input
                id="cad-nome"
                type="text"
                required
                value={nomeCadastro}
                onChange={(e) => setNomeCadastro(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cad-email"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                E-mail
              </label>
              <input
                id="cad-email"
                type="email"
                required
                value={emailCadastro}
                onChange={(e) => setEmailCadastro(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cad-cpf"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                CPF (somente números)
              </label>
              <input
                id="cad-cpf"
                type="text"
                required
                value={cpfCadastro}
                onChange={(e) => setCpfCadastro(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label
                htmlFor="cad-senha"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Senha (mínimo 6 caracteres)
              </label>
              <input
                id="cad-senha"
                type="password"
                required
                value={senhaCadastro}
                onChange={(e) => setSenhaCadastro(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition cursor-pointer"
            >
              {carregando ? "Criando Conta..." : "Criar Conta e Entrar"}
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setModoCadastro(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ← Voltar para Login
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            ← Voltar à Página Inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
