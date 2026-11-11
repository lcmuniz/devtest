"use client";

import React, { useEffect, useState } from "react";
import { DesafioPublicoCandidato } from "@/domain/desafio/desafio";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import { RunnerResult } from "@/domain/runner/runner-contract";
import { SubmissaoEntity } from "@/infrastructure/repositories/submissao-repository";
import {
  calcularTempoRestanteProva,
  construirChaveRascunhoCodigo,
} from "@/domain/prova/ambiente-prova";

interface ProvaWebIdeViewProps {
  inscricaoId: string;
  processoSeletivo: ProcessoSeletivoEntity;
  desafios: DesafioPublicoCandidato[];
  submissoesIniciais?: SubmissaoEntity[];
  onTestarSolucao?: (
    desafioId: string,
    codigoFonte: string
  ) => Promise<RunnerResult>;
  onSubmeterDefinitivo?: (
    desafioId: string,
    codigoFonte: string
  ) => Promise<{
    sucesso: boolean;
    submissao?: SubmissaoEntity;
    erros?: string[];
  }>;
}

function renderizarMarkdownEnunciado(markdown: string): React.ReactNode {
  const linhas = markdown.split("\n");
  return linhas.map((linha, idx) => {
    const trimmed = linha.trim();
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-slate-800 mt-3 mb-1">
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-base font-bold text-slate-900 mt-4 mb-1.5">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={idx} className="text-lg font-extrabold text-slate-900 mt-2 mb-2">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
    }
    if (!trimmed) {
      return <div key={idx} className="h-2" />;
    }
    const partes = linha.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={idx} className="text-sm text-slate-700 leading-relaxed">
        {partes.map((p, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-slate-900">
              {p}
            </strong>
          ) : (
            p
          )
        )}
      </p>
    );
  });
}

export function ProvaWebIdeView({
  inscricaoId,
  processoSeletivo,
  desafios = [],
  submissoesIniciais = [],
  onTestarSolucao,
  onSubmeterDefinitivo,
}: ProvaWebIdeViewProps) {
  const [desafioAtivoId, setDesafioAtivoId] = useState<string>(
    desafios[0]?.id || ""
  );

  const desafioAtivo =
    desafios.find((d) => d.id === desafioAtivoId) || desafios[0];

  const [submissoesPorDesafio, setSubmissoesPorDesafio] = useState<
    Record<string, SubmissaoEntity>
  >(() => {
    const mapa: Record<string, SubmissaoEntity> = {};
    for (const sub of submissoesIniciais) {
      mapa[sub.desafioId] = sub;
    }
    return mapa;
  });

  const submissaoAtual = desafioAtivo
    ? submissoesPorDesafio[desafioAtivo.id]
    : undefined;

  const [codigoFonte, setCodigoFonte] = useState<string>(
    submissaoAtual?.codigoFonte || desafioAtivo?.codigoTemplate || ""
  );

  const [tempoRestante, setTempoRestante] = useState(() =>
    calcularTempoRestanteProva(processoSeletivo.fimProvas)
  );
  const [executandoTeste, setExecutandoTeste] = useState(false);
  const [submetendoFinal, setSubmetendoFinal] = useState(false);
  const [exibirModalConfirmacao, setExibirModalConfirmacao] = useState(false);
  const [statusFila, setStatusFila] = useState<string | null>(null);
  const [resultadoExecucao, setResultadoExecucao] =
    useState<RunnerResult | null>(null);
  const [erroExecucao, setErroExecucao] = useState<string | null>(null);
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<string | null>(null);

  // Carrega rascunho salvo no cliente após montagem (evita Hydration Mismatch no SSR)
  useEffect(() => {
    if (!desafioAtivo) return;
    const subExistente = submissoesPorDesafio[desafioAtivo.id];
    if (subExistente) {
      setCodigoFonte(subExistente.codigoFonte);
      return;
    }
    const chave = construirChaveRascunhoCodigo(inscricaoId, desafioAtivo.id);
    const salvo = window.localStorage.getItem(chave);
    if (salvo !== null) {
      setCodigoFonte(salvo);
    } else {
      setCodigoFonte(desafioAtivo.codigoTemplate);
    }
  }, [inscricaoId, desafioAtivo, submissoesPorDesafio]);

  // Atualiza cronômetro regressivo a cada 1 segundo
  useEffect(() => {
    setTempoRestante(calcularTempoRestanteProva(processoSeletivo.fimProvas));
    const timer = setInterval(() => {
      setTempoRestante(calcularTempoRestanteProva(processoSeletivo.fimProvas));
    }, 1000);
    return () => clearInterval(timer);
  }, [processoSeletivo.fimProvas]);

  const handleSelecionarDesafio = (novoDesafio: DesafioPublicoCandidato) => {
    setDesafioAtivoId(novoDesafio.id);
    setResultadoExecucao(null);
    setErroExecucao(null);
    const subExistente = submissoesPorDesafio[novoDesafio.id];
    if (subExistente) {
      setCodigoFonte(subExistente.codigoFonte);
      return;
    }
    if (typeof window !== "undefined") {
      const chave = construirChaveRascunhoCodigo(inscricaoId, novoDesafio.id);
      const salvo = window.localStorage.getItem(chave);
      setCodigoFonte(salvo !== null ? salvo : novoDesafio.codigoTemplate);
    } else {
      setCodigoFonte(novoDesafio.codigoTemplate);
    }
  };

  const handleCodigoChange = (novoCodigo: string) => {
    if (submissaoAtual) return;
    setCodigoFonte(novoCodigo);
    if (desafioAtivo && typeof window !== "undefined") {
      const chave = construirChaveRascunhoCodigo(inscricaoId, desafioAtivo.id);
      window.localStorage.setItem(chave, novoCodigo);
      setUltimoSalvoEm(new Date().toLocaleTimeString("pt-BR"));
    }
  };

  const handleRestaurarTemplate = () => {
    if (!desafioAtivo || submissaoAtual) return;
    handleCodigoChange(desafioAtivo.codigoTemplate);
  };

  const handleKeyDownEditor = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submissaoAtual) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const atualizado =
        codigoFonte.substring(0, start) + "  " + codigoFonte.substring(end);
      handleCodigoChange(atualizado);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleTestarSolucao = async () => {
    if (!desafioAtivo) return;
    setExecutandoTeste(true);
    setErroExecucao(null);
    setStatusFila("Enfileirando no Runner...");

    try {
      if (onTestarSolucao) {
        const res = await onTestarSolucao(desafioAtivo.id, codigoFonte);
        setResultadoExecucao(res);
        setStatusFila(null);
        return;
      }

      const dispatchRes = await fetch("/api/provas/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desafioId: desafioAtivo.id,
          codigoFonte,
        }),
      });
      const dispatchData = await dispatchRes.json();

      if (!dispatchRes.ok || !dispatchData.sucesso) {
        setErroExecucao(
          (dispatchData.erros && dispatchData.erros[0]) ||
            "Falha ao disparar teste."
        );
        setStatusFila(null);
        return;
      }

      setStatusFila("Executando container efêmero...");

      const sseRes = await fetch(
        `/api/runner/jobs/${dispatchData.jobId}/stream`
      );
      const sseText = await sseRes.text();
      const dataLines = sseText
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => {
          try {
            return JSON.parse(line.replace(/^data:\s*/, ""));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const finalEvent = dataLines[dataLines.length - 1];
      if (finalEvent?.result) {
        setResultadoExecucao(finalEvent.result);
      } else if (finalEvent?.error || finalEvent?.erro) {
        setErroExecucao(finalEvent.error || finalEvent.erro);
      }
      setStatusFila(null);
    } catch (err: any) {
      setErroExecucao(err?.message || "Erro de conexão com o Runner.");
      setStatusFila(null);
    } finally {
      setExecutandoTeste(false);
    }
  };

  const handleConfirmarSubmissaoDefinitiva = async () => {
    if (!desafioAtivo || submissaoAtual) return;
    setSubmetendoFinal(true);
    setErroExecucao(null);

    try {
      let resposta;
      if (onSubmeterDefinitivo) {
        resposta = await onSubmeterDefinitivo(desafioAtivo.id, codigoFonte);
      } else {
        const res = await fetch("/api/submissoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inscricaoId,
            desafioId: desafioAtivo.id,
            codigoFonte,
          }),
        });
        resposta = await res.json();
      }

      if (resposta.sucesso && resposta.submissao) {
        setSubmissoesPorDesafio((prev) => ({
          ...prev,
          [desafioAtivo.id]: resposta.submissao!,
        }));
        if (resposta.submissao.relatorioExecucao) {
          setResultadoExecucao(resposta.submissao.relatorioExecucao);
        }
        setExibirModalConfirmacao(false);
      } else {
        setErroExecucao(
          (resposta.erros && resposta.erros[0]) ||
            "Falha ao registrar submissão definitiva."
        );
        setExibirModalConfirmacao(false);
      }
    } catch (err: any) {
      setErroExecucao(err?.message || "Erro ao enviar submissão definitiva.");
      setExibirModalConfirmacao(false);
    } finally {
      setSubmetendoFinal(false);
    }
  };

  const linhasCodigo = codigoFonte.split("\n");
  const bloqueadoParaEdicao = Boolean(submissaoAtual) || tempoRestante.expirado;

  if (!desafioAtivo) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">Nenhum Desafio Disponível</h1>
          <p className="text-sm text-slate-400">
            Não há desafios técnicos cadastrados para esta Trilha no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra Superior do Ambiente de Prova */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded uppercase tracking-wider">
            DevTest • Web IDE
          </span>
          <div>
            <h1 className="text-sm font-bold text-white">
              {processoSeletivo.titulo}
            </h1>
            <p className="text-xs text-slate-400">
              Inscrição: <span className="font-mono">{inscricaoId}</span>
            </p>
          </div>
        </div>

        {/* Seletor de Desafios da Trilha */}
        {desafios.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 max-w-3xl">
            <select
              aria-label="Selecionar Desafio"
              value={desafioAtivo.id}
              onChange={(e) => {
                const selecionado = desafios.find(
                  (d) => d.id === e.target.value
                );
                if (selecionado) handleSelecionarDesafio(selecionado);
              }}
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {desafios.map((d, idx) => {
                const jaSubmetido = Boolean(submissoesPorDesafio[d.id]);
                return (
                  <option key={d.id} value={d.id}>
                    {jaSubmetido ? "✓ " : ""}Desafio {idx + 1} (
                    {d.linguagem.toUpperCase()}): {d.titulo}
                  </option>
                );
              })}
            </select>
            <div className="flex flex-wrap items-center gap-1">
              {desafios.map((d, idx) => {
                const jaSubmetido = Boolean(submissoesPorDesafio[d.id]);
                return (
                  <button
                    key={d.id}
                    type="button"
                    title={`Desafio ${idx + 1} (${d.linguagem}): ${d.titulo}`}
                    onClick={() => handleSelecionarDesafio(d)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      d.id === desafioAtivo.id
                        ? "bg-blue-600 text-white ring-1 ring-blue-400"
                        : jaSubmetido
                        ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800/60"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {jaSubmetido ? `✓ ${idx + 1}` : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cronômetro Regressivo */}
        <div className="flex items-center gap-4">
          <div
            data-testid="cronometro-prova"
            className={`px-3.5 py-1.5 rounded-lg border font-mono text-sm font-bold flex items-center gap-2 ${
              tempoRestante.expirado
                ? "bg-red-950 border-red-700 text-red-300"
                : "bg-slate-800 border-slate-700 text-emerald-400"
            }`}
          >
            <span className="text-xs font-sans font-normal text-slate-400">
              Tempo Restante:
            </span>
            <span suppressHydrationWarning>{tempoRestante.formatado}</span>
          </div>
        </div>
      </header>

      {/* Banner de Submissão Definitiva Registrada */}
      {submissaoAtual && (
        <div className="bg-emerald-950/90 border-b border-emerald-700 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              ✓ Submissão Definitiva Registrada (Edições Bloqueadas)
            </span>
            <p className="text-xs text-emerald-100 mt-0.5">
              Protocolo: <strong className="font-mono">{submissaoAtual.id}</strong> •{" "}
              Corretude: <strong>{submissaoAtual.notaCorretude}/70</strong> •{" "}
              Qualidade: <strong>{submissaoAtual.notaQualidade}/15</strong> •{" "}
              Desempenho: <strong>{submissaoAtual.notaDesempenho}/15</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-800 text-white text-xs font-mono font-bold px-3 py-1 rounded">
              Nota Técnica: {submissaoAtual.notaTecnicaTotal} / 100 pts
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded ${
                submissaoAtual.atendeNotaCorte
                  ? "bg-blue-800 text-blue-100"
                  : "bg-red-800 text-red-100"
              }`}
            >
              {submissaoAtual.statusClassificacao}
            </span>
          </div>
        </div>
      )}

      {/* Modal de Confirmação da Submissão Definitiva */}
      {exibirModalConfirmacao && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white">
              Confirmar Submissão Definitiva
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ao confirmar o envio definitivo para o desafio{" "}
              <strong>{desafioAtivo.titulo}</strong>, seu código será avaliado
              contra a suíte completa (testes públicos e ocultos de borda) e{" "}
              <strong>não poderá ser editado posteriormente</strong>.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submetendoFinal}
                onClick={() => setExibirModalConfirmacao(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Voltar ao Editor
              </button>
              <button
                type="button"
                disabled={submetendoFinal}
                onClick={handleConfirmarSubmissaoDefinitiva}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                {submetendoFinal
                  ? "Avaliando Submissão..."
                  : "Confirmar e Enviar Solução"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corpo Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Painel Esquerdo: Enunciado e Testes Públicos */}
        <aside className="lg:col-span-5 bg-white text-slate-900 border-r border-slate-200 p-6 overflow-y-auto space-y-6">
          <div className="border-b border-slate-200 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded uppercase">
                {desafioAtivo.linguagem}
              </span>
              <span className="text-xs text-slate-500">
                Timeout: {desafioAtivo.timeoutSeconds}s • Memória:{" "}
                {desafioAtivo.memoryLimitMb} MB
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {desafioAtivo.titulo}
            </h2>
          </div>

          <div className="space-y-1">
            {renderizarMarkdownEnunciado(desafioAtivo.enunciadoMarkdown)}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Suíte de Testes Unitários Públicos (Visível ao Candidato)
            </h3>
            <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
              {desafioAtivo.suiteTestesPublicos}
            </pre>
          </div>
        </aside>

        {/* Painel Direito: Editor de Código Web IDE e Console de Resultados */}
        <section className="lg:col-span-7 flex flex-col bg-slate-950">
          {/* Toolbar do Editor */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300">
                solution.
                {desafioAtivo.linguagem === "typescript"
                  ? "ts"
                  : desafioAtivo.linguagem === "python"
                  ? "py"
                  : "java"}
              </span>
              {ultimoSalvoEm && !submissaoAtual && (
                <span className="text-[11px] text-emerald-400">
                  • Rascunho salvo às {ultimoSalvoEm}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={bloqueadoParaEdicao}
                onClick={handleRestaurarTemplate}
                className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition cursor-pointer"
              >
                Restaurar Template
              </button>
              <button
                type="button"
                disabled={executandoTeste || bloqueadoParaEdicao}
                onClick={handleTestarSolucao}
                className="px-4 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white shadow-sm transition cursor-pointer"
              >
                {executandoTeste ? "Executando Testes..." : "▶ Testar Solução"}
              </button>
              <button
                type="button"
                disabled={bloqueadoParaEdicao || submetendoFinal}
                onClick={() => setExibirModalConfirmacao(true)}
                className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white shadow-sm transition cursor-pointer"
              >
                {submissaoAtual ? "✓ Submetido" : "Submissão Definitiva"}
              </button>
            </div>
          </div>

          {/* Área do Editor de Código com Numeração de Linhas */}
          <div className="relative flex-1 flex min-h-[320px] bg-slate-950 font-mono text-sm">
            <div
              aria-hidden="true"
              className="select-none bg-slate-900/60 text-slate-600 text-right pr-3 pl-3 py-4 text-xs leading-6 border-r border-slate-800"
            >
              {linhasCodigo.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              id="editor-codigo-web-ide"
              aria-label="Editor de Código Web IDE"
              readOnly={bloqueadoParaEdicao}
              spellCheck={false}
              value={codigoFonte}
              onChange={(e) => handleCodigoChange(e.target.value)}
              onKeyDown={handleKeyDownEditor}
              className={`flex-1 bg-slate-950 text-slate-100 p-4 text-sm font-mono leading-6 focus:outline-none resize-none ${
                bloqueadoParaEdicao ? "opacity-80 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Painel de Saída / Console dos Testes */}
          <div className="h-64 bg-slate-900 border-t border-slate-800 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Console de Execução • Testes e Autoavaliação
              </h3>
              {resultadoExecucao && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-300">
                    Tempo: <strong>{resultadoExecucao.executionTimeMs} ms</strong>
                  </span>
                  <span className="text-slate-300">
                    Memória: <strong>{resultadoExecucao.memoryPeakKb} KB</strong>
                  </span>
                  <span className="text-slate-300">
                    Qualidade (Linter):{" "}
                    <strong>{resultadoExecucao.linterScore}/100</strong>
                  </span>
                </div>
              )}
            </div>

            {statusFila && (
              <div className="text-xs text-blue-400 font-mono animate-pulse">
                {statusFila}
              </div>
            )}

            {erroExecucao && (
              <div className="bg-red-950/60 border border-red-800 text-red-200 p-3 rounded text-xs font-mono">
                {erroExecucao}
              </div>
            )}

            {!resultadoExecucao && !statusFila && !erroExecucao && (
              <p className="text-xs text-slate-500 font-mono">
                Clique em &quot;Testar Solução&quot; para validar contra os testes públicos ou em &quot;Submissão Definitiva&quot; para encerrar e calcular sua nota técnica final.
              </p>
            )}

            {resultadoExecucao && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      resultadoExecucao.status === "SUCCESS"
                        ? "bg-emerald-900/80 text-emerald-200"
                        : "bg-amber-900/80 text-amber-200"
                    }`}
                  >
                    Status: {resultadoExecucao.status}
                  </span>
                </div>

                {resultadoExecucao.compilerOutput && (
                  <pre className="bg-red-950/80 border border-red-800 text-red-200 p-3 rounded text-xs font-mono whitespace-pre-wrap">
                    {resultadoExecucao.compilerOutput}
                  </pre>
                )}

                <div className="space-y-1.5">
                  {resultadoExecucao.testResults.map((tr, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border text-xs font-mono ${
                        tr.status === "PASSED"
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                          : "bg-red-950/40 border-red-800/60 text-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          {tr.status === "PASSED" ? "✓ PASSOU: " : "✕ FALHOU: "}
                          {tr.testName}
                        </span>
                        <span className="text-slate-400">{tr.durationMs} ms</span>
                      </div>
                      {tr.failureMessage && (
                        <div className="mt-1.5 pl-4 text-red-300 border-l-2 border-red-600">
                          Diff: {tr.failureMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
