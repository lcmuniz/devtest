"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessaoUsuario } from "@/domain/auth/autenticacao-rbac";

export function BarraSessaoGlobal({
  sessaoInicial,
}: {
  sessaoInicial: SessaoUsuario | null;
}) {
  const [sessao, setSessao] = useState<SessaoUsuario | null>(sessaoInicial);
  const pathname = usePathname();

  useEffect(() => {
    setSessao(sessaoInicial);
  }, [sessaoInicial]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessao(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  const itensMenuBanca = [
    { href: "/banca/processos-seletivos", label: "Processos Seletivos" },
    { href: "/banca/desafios", label: "Banco de Desafios" },
    { href: "/banca/avaliacao", label: "Classificação & Auditoria" },
  ];

  const itensMenuCandidato = [
    { href: "/candidato/inscricao", label: "Minhas Inscrições" },
    { href: "/candidato/prova", label: "Ambiente de Prova (Web IDE)" },
    { href: "/candidato/resultados", label: "Espelho & Recursos" },
  ];

  const itensMenu =
    sessao?.perfil === "BANCA_AVALIADORA"
      ? itensMenuBanca
      : sessao?.perfil === "CANDIDATO"
      ? itensMenuCandidato
      : [];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-300 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-extrabold text-white hover:text-indigo-300 tracking-wide flex items-center gap-2"
          >
            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
              DevTest
            </span>
            <span>Avaliação Técnica</span>
          </Link>

          {sessao ? (
            <span
              className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                sessao.perfil === "BANCA_AVALIADORA"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {sessao.perfil === "BANCA_AVALIADORA"
                ? "Banca Avaliadora"
                : "Candidato"}
            </span>
          ) : (
            <span className="text-slate-400">Não autenticado</span>
          )}
        </div>

        {/* Menu Dinâmico por Perfil */}
        {itensMenu.length > 0 && (
          <nav aria-label="Menu do Perfil" className="flex items-center gap-1 sm:gap-2">
            {itensMenu.map((item) => {
              const ativo = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    ativo
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {sessao ? (
            <>
              <span className="text-slate-300 hidden md:inline">
                Logado como:{" "}
                <strong className="text-white">{sessao.nome}</strong> (
                <span className="font-mono">{sessao.email}</span>)
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-200 transition cursor-pointer"
              >
                Sair / Trocar Conta
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-semibold text-white transition"
            >
              Entrar no Sistema
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
