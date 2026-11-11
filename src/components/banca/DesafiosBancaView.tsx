"use client";

import React, { useState } from "react";
import {
  LinguagemDesafio,
  DesafioInput,
  DesafioEntity,
  validarDesafio,
} from "@/domain/desafio/desafio";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";

interface DesafiosBancaViewProps {
  processosSeletivos?: ProcessoSeletivoEntity[];
  desafiosIniciais?: DesafioEntity[];
  onCriarDesafio?: (
    dados: DesafioInput
  ) => Promise<{ sucesso: boolean; desafio?: DesafioEntity; erros?: string[] }>;
  onAtualizarDesafio?: (
    id: string,
    dados: DesafioInput
  ) => Promise<{ sucesso: boolean; desafio?: DesafioEntity; erros?: string[] }>;
}

function renderizarMarkdownSimples(markdown: string): React.ReactNode {
  const linhas = markdown.split("\n");
  return linhas.map((linha, idx) => {
    const trimmed = linha.trim();
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-base font-bold text-slate-800 mt-3 mb-1">
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-lg font-bold text-slate-900 mt-4 mb-1.5">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-xl font-extrabold text-slate-900 mt-4 mb-2">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
    }
    if (!trimmed) {
      return <div key={idx} className="h-2" />;
    }

    const partesNegrito = linha.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={idx} className="text-sm text-slate-700 leading-relaxed">
        {partesNegrito.map((parte, pIdx) =>
          pIdx % 2 === 1 ? (
            <strong key={pIdx} className="font-semibold text-slate-900">
              {parte}
            </strong>
          ) : (
            parte
          )
        )}
      </p>
    );
  });
}

export function DesafiosBancaView({
  desafiosIniciais = [],
  onCriarDesafio,
  onAtualizarDesafio,
}: DesafiosBancaViewProps) {
  const [desafios, setDesafios] = useState<DesafioEntity[]>(desafiosIniciais);
  const [exibirFormulario, setExibirFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [modoMarkdown, setModoMarkdown] = useState<"editor" | "preview">("editor");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [filtroLinguagem, setFiltroLinguagem] = useState<string>("TODAS");

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<"junior" | "pleno" | "senior">("pleno");
  const [linguagem, setLinguagem] = useState<LinguagemDesafio>(
    LinguagemDesafio.TYPESCRIPT
  );
  const [enunciadoMarkdown, setEnunciadoMarkdown] = useState("");
  const [codigoTemplate, setCodigoTemplate] = useState("");
  const [suiteTestesPublicos, setSuiteTestesPublicos] = useState("");
  const [suiteTestesOcultos, setSuiteTestesOcultos] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(10);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(512);

  const handleAbrirNovo = () => {
    setEditandoId(null);
    setTitulo("");
    setCategoria("pleno");
    setLinguagem(LinguagemDesafio.TYPESCRIPT);
    setEnunciadoMarkdown("");
    setCodigoTemplate("");
    setSuiteTestesPublicos("");
    setSuiteTestesOcultos("");
    setTimeoutSeconds(10);
    setMemoryLimitMb(512);
    setModoMarkdown("editor");
    setErros([]);
    setExibirFormulario(true);
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditarDesafio = (desafio: DesafioEntity) => {
    setEditandoId(desafio.id);
    setTitulo(desafio.titulo);
    setCategoria(desafio.categoria || "pleno");
    setLinguagem(desafio.linguagem);
    setEnunciadoMarkdown(desafio.enunciadoMarkdown);
    setCodigoTemplate(desafio.codigoTemplate);
    setSuiteTestesPublicos(desafio.suiteTestesPublicos);
    setSuiteTestesOcultos(desafio.suiteTestesOcultos);
    setTimeoutSeconds(desafio.timeoutSeconds);
    setMemoryLimitMb(desafio.memoryLimitMb);
    setModoMarkdown("editor");
    setErros([]);
    setExibirFormulario(true);
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleUploadArquivoTexto = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros([]);

    const payload: DesafioInput = {
      processoSeletivoId: "",
      trilhaId: "",
      titulo,
      categoria,
      enunciadoMarkdown,
      linguagem,
      codigoTemplate,
      suiteTestesPublicos,
      suiteTestesOcultos,
      timeoutSeconds: Number(timeoutSeconds),
      memoryLimitMb: Number(memoryLimitMb),
    };

    const validacao = validarDesafio(payload);
    if (!validacao.valido) {
      setErros(validacao.erros || ["Dados inválidos."]);
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        let resposta;
        if (onAtualizarDesafio) {
          resposta = await onAtualizarDesafio(editandoId, validacao.dados!);
        } else {
          const res = await fetch(`/api/desafios/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validacao.dados),
          });
          resposta = await res.json();
        }

        if (resposta.sucesso && resposta.desafio) {
          setDesafios((prev) =>
            prev.map((d) => (d.id === editandoId ? resposta.desafio! : d))
          );
          setExibirFormulario(false);
          setEditandoId(null);
        } else {
          setErros(resposta.erros || ["Falha ao atualizar desafio."]);
        }
      } else {
        let resposta;
        if (onCriarDesafio) {
          resposta = await onCriarDesafio(validacao.dados!);
        } else {
          const res = await fetch("/api/desafios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validacao.dados),
          });
          resposta = await res.json();
        }

        if (resposta.sucesso && resposta.desafio) {
          setDesafios((prev) => [resposta.desafio!, ...prev]);
          setExibirFormulario(false);
        } else {
          setErros(resposta.erros || ["Falha ao cadastrar desafio."]);
        }
      }
    } catch (err: any) {
      setErros([err.message || "Erro de comunicação com o servidor."]);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded tracking-wide uppercase">
                DevTest
              </span>
              <span className="text-sm font-medium text-slate-500">
                Banca Avaliadora • Gestão de Desafios
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
              Desafios de Programação e Suítes de Testes
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Banco global de desafios técnicos por linguagem de programação (Java, Python e TypeScript), reutilizáveis nos processos seletivos.
            </p>
          </div>

          {!exibirFormulario && (
            <button
              type="button"
              onClick={handleAbrirNovo}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
            >
              + Novo Desafio
            </button>
          )}
        </header>

        {exibirFormulario && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {editandoId ? "Editar Desafio Técnico" : "Cadastrar Novo Desafio Técnico"}
              </h2>
              <button
                type="button"
                onClick={() => setExibirFormulario(false)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>

            {erros.length > 0 && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm space-y-1"
              >
                {erros.map((erro, idx) => (
                  <p key={idx}>• {erro}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="select-linguagem-desafio"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Linguagem de Programação
                </label>
                <select
                  id="select-linguagem-desafio"
                  value={linguagem}
                  onChange={(e) => setLinguagem(e.target.value as LinguagemDesafio)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value={LinguagemDesafio.TYPESCRIPT}>TypeScript (Node / Vitest)</option>
                  <option value={LinguagemDesafio.JAVA}>Java 21 (JUnit 5)</option>
                  <option value={LinguagemDesafio.PYTHON}>Python 3.12 (Pytest)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-categoria-desafio"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Categoria / Nível
                </label>
                <select
                  id="select-categoria-desafio"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="junior">Júnior</option>
                  <option value="pleno">Pleno</option>
                  <option value="senior">Sênior</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="input-titulo-desafio"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Título do Desafio
                </label>
                <input
                  id="input-titulo-desafio"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: 01. Cálculo de Multa e Juros por Atraso na Prestação de Contas"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm bg-white"
                />
              </div>
            </div>

            {/* Editor e Preview de Markdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="textarea-enunciado-markdown"
                  className="block text-sm font-medium text-slate-700"
                >
                  Enunciado (Markdown)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModoMarkdown("editor")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      modoMarkdown === "editor"
                        ? "bg-blue-800 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    Editar Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoMarkdown("preview")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      modoMarkdown === "preview"
                        ? "bg-blue-800 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    Visualizar Markdown
                  </button>
                </div>
              </div>

              {modoMarkdown === "editor" ? (
                <textarea
                  id="textarea-enunciado-markdown"
                  rows={6}
                  value={enunciadoMarkdown}
                  onChange={(e) => setEnunciadoMarkdown(e.target.value)}
                  placeholder="# Título do Problema&#10;Descreva as regras de negócio, entradas, saídas e restrições..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono"
                />
              ) : (
                <div
                  data-testid="markdown-preview"
                  className="min-h-[150px] rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1"
                >
                  {renderizarMarkdownSimples(enunciadoMarkdown)}
                </div>
              )}
            </div>

            {/* Código Template Inicial */}
            <div>
              <label
                htmlFor="textarea-codigo-template"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Código Template Inicial
              </label>
              <textarea
                id="textarea-codigo-template"
                rows={5}
                value={codigoTemplate}
                onChange={(e) => setCodigoTemplate(e.target.value)}
                placeholder="Assinatura da função ou classe de partida para o candidato..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono bg-slate-900 text-slate-100"
              />
            </div>

            {/* Suítes de Testes Unitários: Públicos e Ocultos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="textarea-testes-publicos"
                    className="block text-sm font-semibold text-emerald-800"
                  >
                    Suíte de Testes Unitários Públicos
                  </label>
                  <label className="text-xs text-blue-700 hover:underline cursor-pointer">
                    Carregar arquivo
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadArquivoTexto(e, setSuiteTestesPublicos)
                      }
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Visíveis ao candidato no Web IDE para feedback imediato.
                </p>
                <textarea
                  id="textarea-testes-publicos"
                  rows={6}
                  value={suiteTestesPublicos}
                  onChange={(e) => setSuiteTestesPublicos(e.target.value)}
                  className="w-full rounded-lg border border-emerald-300 p-3 text-xs font-mono bg-slate-900 text-emerald-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="textarea-testes-ocultos"
                    className="block text-sm font-semibold text-amber-900"
                  >
                    Suíte de Testes Unitários Ocultos (Restrito à Banca)
                  </label>
                  <label className="text-xs text-blue-700 hover:underline cursor-pointer">
                    Carregar arquivo
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadArquivoTexto(e, setSuiteTestesOcultos)
                      }
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Casos de borda nunca expostos no frontend aos candidatos.
                </p>
                <textarea
                  id="textarea-testes-ocultos"
                  rows={6}
                  value={suiteTestesOcultos}
                  onChange={(e) => setSuiteTestesOcultos(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 p-3 text-xs font-mono bg-slate-900 text-amber-100"
                />
              </div>
            </div>

            {/* Limites Técnicos de Execução */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label
                  htmlFor="input-timeout-seconds"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Tempo Máximo de Execução (segundos)
                </label>
                <input
                  id="input-timeout-seconds"
                  type="number"
                  min={1}
                  max={60}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="input-memory-limit"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Limite de Memória (MB)
                </label>
                <input
                  id="input-memory-limit"
                  type="number"
                  min={64}
                  max={2048}
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setExibirFormulario(false);
                  setEditandoId(null);
                  setErros([]);
                }}
                disabled={salvando}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-6 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="bg-blue-800 hover:bg-blue-900 disabled:bg-slate-400 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar Alterações"
                  : "Salvar Desafio"}
              </button>
            </div>
          </form>
        )}

        {/* Listagem de Desafios */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              Banco de Desafios ({desafios.filter((d) => filtroLinguagem === "TODAS" || d.linguagem === filtroLinguagem).length} de {desafios.length})
            </h2>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {(
                [
                  { id: "TODAS", label: "Todas as Linguagens" },
                  { id: LinguagemDesafio.JAVA, label: "Java" },
                  { id: LinguagemDesafio.PYTHON, label: "Python" },
                  { id: LinguagemDesafio.TYPESCRIPT, label: "TypeScript" },
                ] as const
              ).map((item) => {
                const contagem =
                  item.id === "TODAS"
                    ? desafios.length
                    : desafios.filter((d) => d.linguagem === item.id).length;
                const ativo = filtroLinguagem === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroLinguagem(item.id)}
                    className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                      ativo
                        ? "bg-blue-900 border-blue-900 text-white"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label} ({contagem})
                  </button>
                );
              })}
            </div>
          </div>

          {desafios.filter((d) => filtroLinguagem === "TODAS" || d.linguagem === filtroLinguagem).length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Nenhum desafio encontrado para o filtro selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {desafios
                .filter((d) => filtroLinguagem === "TODAS" || d.linguagem === filtroLinguagem)
                .map((desafio) => (
                <div
                  key={desafio.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-blue-900 text-white text-xs font-bold px-2.5 py-0.5 rounded uppercase font-mono">
                        {desafio.linguagem === "java"
                          ? "Java 21"
                          : desafio.linguagem === "python"
                          ? "Python 3.12"
                          : "TypeScript"}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded ${
                          (desafio.categoria || "pleno").toLowerCase() === "junior"
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : (desafio.categoria || "pleno").toLowerCase() === "senior"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {desafio.categoria || "Pleno"}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                        Banco Global
                      </span>
                      <span className="text-xs text-slate-500">
                        Limite: {desafio.timeoutSeconds}s • {desafio.memoryLimitMb} MB
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {desafio.titulo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditarDesafio(desafio)}
                      className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                      Editar Desafio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
