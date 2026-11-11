import React from "react";
import Link from "next/link";
import { obterSessaoServidor } from "@/infrastructure/auth/session-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessao = await obterSessaoServidor();

  // Caso 1: Usuário não autenticado
  if (!sessao) {
    return (
      <main className="min-h-[calc(100vh-45px)] flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
          <div>
            <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded tracking-wider uppercase">
              DevTest
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-3">
              DevTest • Seleção e Avaliação Técnica
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Plataforma oficial de processos seletivos e avaliação técnica prática de desenvolvedores.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
            >
              🔐 Acessar Sistema (Login)
            </Link>
            <p className="text-xs text-slate-500">
              Entre com suas credenciais de <strong>Candidato</strong> ou <strong>Banca Avaliadora</strong> para acessar o painel correspondente ao seu perfil.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Caso 2: Perfil Banca Avaliadora
  if (sessao.perfil === "BANCA_AVALIADORA") {
    return (
      <main className="min-h-[calc(100vh-45px)] bg-slate-50 text-slate-800 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header de Boas-Vindas da Banca */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-900 text-indigo-100 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Painel da Banca
              </span>
              <span className="text-xs text-slate-500 font-medium">Plataforma DevTest</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
              Bem-vindo(a), {sessao.nome}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Selecione o módulo de gestão técnica que deseja gerenciar:
            </p>
          </div>

          {/* Cards de Opções da Banca */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/banca/processos-seletivos"
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-400 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  🏛️
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Processos Seletivos
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configuração de editais, definição de prazos oficiais, distribuição de pesos de prova técnica/barema e parâmetros eliminatórios.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Gerenciar Processos →
              </div>
            </Link>

            <Link
              href="/banca/desafios"
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-400 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  💻
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Banco Global de Desafios
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Repositório central de desafios técnicos por linguagem (Java 21, Python 3.12 e TypeScript), com suítes de testes públicos e ocultos.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Acessar Banco de Desafios →
              </div>
            </Link>

            <Link
              href="/banca/avaliacao"
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-400 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                  📊
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Classificação, Auditoria & Recursos
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ranking em Correção Cega com notas ponderadas, auditoria documental de títulos PDF com validação/glosa e julgamento de recursos.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Acessar Painel de Avaliação →
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Caso 3: Perfil Candidato
  return (
    <main className="min-h-[calc(100vh-45px)] bg-slate-50 text-slate-800 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header de Boas-Vindas do Candidato */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-900 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
              Área do Candidato
            </span>
            <span className="text-xs text-slate-500 font-medium">Plataforma DevTest</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
            Bem-vindo(a), {sessao.nome}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Acompanhe suas etapas, realize a prova técnica prática ou consulte seus resultados oficiais:
          </p>
        </div>

        {/* Cards de Opções do Candidato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/candidato/inscricao"
            className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                📝
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Minhas Inscrições
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consulte suas inscrições ativas, prazos e códigos anônimos, ou inscreva-se em processos e trilhas com barema curricular.
              </p>
            </div>
            <div className="pt-6 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              Ir para Minhas Inscrições →
            </div>
          </Link>

          <Link
            href="/candidato/prova"
            className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Ambiente de Prova (Web IDE)
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Acesse o ambiente prático de resolução de desafios, execute testes unitários em tempo real e faça a submissão definitiva da sua prova.
              </p>
            </div>
            <div className="pt-6 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              Acessar Prova Prática →
            </div>
          </Link>

          <Link
            href="/candidato/resultados"
            className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                📋
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Espelho de Avaliação & Recursos
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consulte o espelho detalhado das suas notas (prova técnica e barema), veja pareceres da banca e registre recursos administrativos.
              </p>
            </div>
            <div className="pt-6 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              Ver Resultados & Recursos →
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
