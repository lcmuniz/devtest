"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CandidatoRankingCego,
  DecisaoAuditoriaItemInput,
} from "@/domain/banca/painel-banca";
import { CandidatoRankingProjetado } from "@/domain/recurso/homologacao-recurso";
import { RecursoEntity } from "@/infrastructure/repositories/recurso-repository";

export interface ProcessoResumoBanca {
  id: string;
  titulo: string;
  edital: string;
  pesoProvaTecnica: number;
  pesoBaremaCurricular: number;
  notaCorteMinima: number;
  etapaAnonimaEncerrada?: boolean;
  janelaRecursosAberta?: boolean;
  trilhas: { id: string; nome: string }[];
}

interface PainelBancaAvaliadoraViewProps {
  processosIniciais: ProcessoResumoBanca[];
  rankingInicial: CandidatoRankingProjetado[];
  recursosIniciais?: RecursoEntity[];
}

export function PainelBancaAvaliadoraView({
  processosIniciais,
  rankingInicial,
  recursosIniciais = [],
}: PainelBancaAvaliadoraViewProps) {
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string>(
    processosIniciais[0]?.id ?? ""
  );
  const [ranking, setRanking] =
    useState<CandidatoRankingProjetado[]>(rankingInicial);
  const [modoCorrecaoCega, setModoCorrecaoCega] = useState<boolean>(
    !processosIniciais[0]?.etapaAnonimaEncerrada
  );
  const [recursos, setRecursos] = useState<RecursoEntity[]>(recursosIniciais);
  const [carregandoRanking, setCarregandoRanking] = useState(false);

  // Estado de julgamento de recursos
  const [pareceresRecursos, setPareceresRecursos] = useState<
    Record<string, { parecerBanca: string; novaPontuacaoAlvo: string }>
  >({});
  const [erroJulgamento, setErroJulgamento] = useState<string | null>(null);

  // Filtros avançados
  const [filtroTrilhaId, setFiltroTrilhaId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroNotaMinima, setFiltroNotaMinima] = useState<string>("");

  // Inspeção de candidato e auditoria documental
  const [candidatoInspecionado, setCandidatoInspecionado] =
    useState<CandidatoRankingProjetado | null>(null);
  const [desafioInspecionadoIndex, setDesafioInspecionadoIndex] =
    useState<number>(0);
  const [decisoesAuditoria, setDecisoesAuditoria] = useState<
    Record<
      string,
      { statusAuditoria: "VALIDADO" | "GLOSADO"; motivoGlosa: string }
    >
  >({});
  const [pdfPreviewBase64, setPdfPreviewBase64] = useState<{
    nome: string;
    base64?: string;
  } | null>(null);
  const [salvandoAuditoria, setSalvandoAuditoria] = useState(false);
  const [erroAuditoria, setErroAuditoria] = useState<string | null>(null);
  const [sucessoAuditoria, setSucessoAuditoria] = useState<string | null>(null);

  // Convocação de Aprovados e Notificações
  const [modalConvocacaoAberto, setModalConvocacaoAberto] = useState(false);
  const [prazoDocumentosConvocacao, setPrazoDocumentosConvocacao] = useState(
    "5 (cinco) dias úteis a contar deste comunicado"
  );
  const [limiteConvocados, setLimiteConvocados] = useState<string>("");
  const [convocando, setConvocando] = useState(false);
  const [mensagemConvocacao, setMensagemConvocacao] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const processoAtual = useMemo(
    () =>
      processosIniciais.find((p) => p.id === processoSelecionadoId) ??
      processosIniciais[0],
    [processosIniciais, processoSelecionadoId]
  );

  async function recarregarRanking(psId: string) {
    if (!psId) return;
    setCarregandoRanking(true);
    try {
      const res = await fetch(
        `/api/banca/ranking?processoSeletivoId=${encodeURIComponent(psId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking ?? []);
        if (typeof data.modoCorrecaoCega === "boolean") {
          setModoCorrecaoCega(data.modoCorrecaoCega);
        }
        if (candidatoInspecionado) {
          const atualizado = (data.ranking ?? []).find(
            (r: CandidatoRankingCego) =>
              r.inscricaoId === candidatoInspecionado.inscricaoId
          );
          if (atualizado) {
            setCandidatoInspecionado(atualizado);
          }
        }
      }
    } finally {
      setCarregandoRanking(false);
    }
  }

  async function recarregarRecursos(psId: string) {
    if (!psId) return;
    try {
      const res = await fetch(
        `/api/recursos?processoSeletivoId=${encodeURIComponent(psId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRecursos(data.recursos ?? []);
      }
    } catch {
      // ignora erro secundário
    }
  }

  async function handleTrocarProcesso(novoId: string) {
    setProcessoSelecionadoId(novoId);
    setFiltroTrilhaId("");
    setCandidatoInspecionado(null);
    await Promise.all([recarregarRanking(novoId), recarregarRecursos(novoId)]);
  }

  async function handleDesmascararProcesso() {
    if (!processoSelecionadoId) return;
    const res = await fetch(
      `/api/banca/processos-seletivos/${encodeURIComponent(
        processoSelecionadoId
      )}/desmascarar`,
      { method: "POST" }
    );
    if (res.ok) {
      setModoCorrecaoCega(false);
      await recarregarRanking(processoSelecionadoId);
    }
  }

  async function handleJulgarRecurso(
    recursoId: string,
    decisao: "DEFERIDO" | "INDEFERIDO"
  ) {
    setErroJulgamento(null);
    const form = pareceresRecursos[recursoId] ?? {
      parecerBanca: "",
      novaPontuacaoAlvo: "",
    };

    const res = await fetch(`/api/banca/recursos/${recursoId}/julgar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisao,
        parecerBanca: form.parecerBanca,
        novaPontuacaoAlvo:
          decisao === "DEFERIDO" && form.novaPontuacaoAlvo.trim() !== ""
            ? Number(form.novaPontuacaoAlvo)
            : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErroJulgamento(data.error || "Erro ao julgar recurso.");
      return;
    }

    await Promise.all([
      recarregarRecursos(processoSelecionadoId),
      recarregarRanking(processoSelecionadoId),
    ]);
  }

  const rankingFiltrado = useMemo(() => {
    return ranking.filter((item) => {
      if (filtroTrilhaId && item.trilhaId !== filtroTrilhaId) {
        return false;
      }
      if (filtroStatus && item.statusClassificacao !== filtroStatus) {
        return false;
      }
      if (filtroNotaMinima.trim() !== "") {
        const min = Number(filtroNotaMinima);
        if (!Number.isNaN(min)) {
          const notaRef = item.notaFinalConsolidada ?? item.notaTecnicaTotal;
          if (notaRef < min) return false;
        }
      }
      return true;
    });
  }, [ranking, filtroTrilhaId, filtroStatus, filtroNotaMinima]);

  function abrirInspecao(item: CandidatoRankingProjetado) {
    setCandidatoInspecionado(item);
    setDesafioInspecionadoIndex(0);
    setErroAuditoria(null);
    setSucessoAuditoria(null);
    setPdfPreviewBase64(null);

    const estadoInicial: Record<
      string,
      { statusAuditoria: "VALIDADO" | "GLOSADO"; motivoGlosa: string }
    > = {};
    for (const b of item.itensBaremaAuditados ?? []) {
      estadoInicial[b.criterioId] = {
        statusAuditoria:
          b.statusAuditoria === "GLOSADO" ? "GLOSADO" : "VALIDADO",
        motivoGlosa: b.motivoGlosa ?? "",
      };
    }
    setDecisoesAuditoria(estadoInicial);
  }

  function atualizarDecisaoItem(
    criterioId: string,
    statusAuditoria: "VALIDADO" | "GLOSADO",
    motivoGlosa?: string
  ) {
    setDecisoesAuditoria((prev) => ({
      ...prev,
      [criterioId]: {
        statusAuditoria,
        motivoGlosa:
          motivoGlosa !== undefined
            ? motivoGlosa
            : prev[criterioId]?.motivoGlosa ?? "",
      },
    }));
  }

  async function handleSalvarAuditoria() {
    if (!candidatoInspecionado) return;
    setErroAuditoria(null);
    setSucessoAuditoria(null);
    setSalvandoAuditoria(true);

    try {
      const payloadDecisoes: DecisaoAuditoriaItemInput[] = Object.entries(
        decisoesAuditoria
      ).map(([criterioId, d]) => ({
        criterioId,
        statusAuditoria: d.statusAuditoria,
        motivoGlosa:
          d.statusAuditoria === "GLOSADO" ? d.motivoGlosa : undefined,
      }));

      const res = await fetch(
        `/api/banca/inscricoes/${candidatoInspecionado.inscricaoId}/auditoria-barema`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisoes: payloadDecisoes }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setErroAuditoria(
          data.error || "Não foi possível salvar a auditoria documental."
        );
        return;
      }

      setSucessoAuditoria(
        `Auditoria homologada! Nota Barema atualizada para ${Number(
          data.pontuacaoHomologadaBarema ?? 0
        ).toFixed(2)} pts.`
      );
      await recarregarRanking(processoSelecionadoId);
    } catch (err: any) {
      setErroAuditoria(
        err?.message || "Erro de conexão ao salvar auditoria do Barema."
      );
    } finally {
      setSalvandoAuditoria(false);
    }
  }

  async function handleDispararConvocacao() {
    if (!processoSelecionadoId) return;
    setConvocando(true);
    setMensagemConvocacao(null);
    try {
      const res = await fetch("/api/banca/notificacoes/convocar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoSeletivoId: processoSelecionadoId,
          prazoDocumentos: prazoDocumentosConvocacao,
          limite: limiteConvocados ? Number(limiteConvocados) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensagemConvocacao({
          tipo: "erro",
          texto: data.error || "Erro ao convocar candidatos.",
        });
        return;
      }

      setMensagemConvocacao({
        tipo: "sucesso",
        texto: `${data.totalEnviados} candidato(s) convocado(s) com sucesso por e-mail!`,
      });
    } catch {
      setMensagemConvocacao({
        tipo: "erro",
        texto: "Falha de conexão ao enviar convocações.",
      });
    } finally {
      setConvocando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho e Selo de Correção Cega / Homologação */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              {modoCorrecaoCega ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                    🔒 Correção Cega Ativa (Double-Blind Review)
                  </span>
                  <span className="text-xs text-slate-400">
                    Dados pessoais (Nome, CPF e E-mail) 100% ocultos
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  🔓 Etapa Anônima Encerrada • Identificação Revelada e Recursos Abertos
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
              Painel da Banca Avaliadora & Ranking Consolidado
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Classificação automática ponderada, auditoria documental de
              títulos e homologação com julgamento de recursos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {modoCorrecaoCega && (
              <button
                type="button"
                onClick={handleDesmascararProcesso}
                className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                Encerrar Etapa Anônima e Revelar Candidatos
              </button>
            )}
            <Link
              href="/banca/processos-seletivos"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Processos Seletivos
            </Link>
            <Link
              href="/banca/desafios"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Desafios Práticos
            </Link>
          </div>
        </header>

        {/* Barra de Seleção de Processo e Indicadores de Pesos */}
        {processoAtual && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="md:col-span-2">
              <label
                htmlFor="select-processo-banca"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Processo Seletivo
              </label>
              <select
                id="select-processo-banca"
                value={processoSelecionadoId}
                onChange={(e) => handleTrocarProcesso(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
              >
                {processosIniciais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} ({p.edital})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3">
              <span className="text-xs text-slate-400 block">
                Fórmula Ponderada do Edital
              </span>
              <span className="text-sm font-semibold text-indigo-300 mt-1 block">
                Prova Técnica: {processoAtual.pesoProvaTecnica}% | Barema:{" "}
                {processoAtual.pesoBaremaCurricular}%
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3">
              <span className="text-xs text-slate-400 block">
                Nota de Corte Prática
              </span>
              <span className="text-sm font-semibold text-amber-300 mt-1 block">
                Mínimo {processoAtual.notaCorteMinima} pts na Prova Técnica
              </span>
            </div>
          </section>
        )}

        {/* Barra de Ações Oficiais: Relatórios, Exportação e Comunicação */}
        {processoAtual && (
          <section className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
                Relatórios Oficiais:
              </span>
              <a
                href={`/api/banca/relatorios/ranking?processoSeletivoId=${encodeURIComponent(
                  processoSelecionadoId
                )}&formato=csv`}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-slate-800 transition-colors"
              >
                <span>📊</span> Exportar Ranking (CSV / Excel)
              </a>
              <a
                href={`/api/banca/relatorios/ranking?processoSeletivoId=${encodeURIComponent(
                  processoSelecionadoId
                )}&formato=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-slate-800 transition-colors"
              >
                <span>🖨️</span> Relatório Oficial (PDF / Impressão)
              </a>
              <a
                href={`/api/banca/relatorios/recursos?processoSeletivoId=${encodeURIComponent(
                  processoSelecionadoId
                )}&formato=csv`}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-slate-800 transition-colors"
              >
                <span>📑</span> Ata de Recursos (CSV)
              </a>
              <a
                href={`/api/banca/relatorios/recursos?processoSeletivoId=${encodeURIComponent(
                  processoSelecionadoId
                )}&formato=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-slate-800 transition-colors"
              >
                <span>📄</span> Ata de Recursos (PDF)
              </a>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setMensagemConvocacao(null);
                  setModalConvocacaoAberto(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition-colors"
              >
                <span>✉️</span> Convocar Candidatos Aprovados
              </button>
            </div>
          </section>
        )}

        {/* Filtros Avançados */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div>
            <label
              htmlFor="filtro-trilha"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Filtrar por Trilha
            </label>
            <select
              id="filtro-trilha"
              aria-label="Filtrar por Trilha"
              value={filtroTrilhaId}
              onChange={(e) => setFiltroTrilhaId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            >
              <option value="">Todas as Trilhas</option>
              {processoAtual?.trilhas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-status"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Status de Aprovação
            </label>
            <select
              id="filtro-status"
              aria-label="Status de Aprovação"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            >
              <option value="">Todos os Status</option>
              <option value="CLASSIFICADO">
                Aprovados no Corte (Classificados)
              </option>
              <option value="DESCLASSIFICADO_NOTA_CORTE">
                Eliminados no Corte Técnico
              </option>
              <option value="SEM_SUBMISSAO">Sem Submissão Final</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filtro-nota-minima"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Nota Mínima Consolidada / Técnica
            </label>
            <input
              id="filtro-nota-minima"
              type="number"
              min={0}
              max={100}
              placeholder="Ex: 70"
              value={filtroNotaMinima}
              onChange={(e) => setFiltroNotaMinima(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </section>

        {/* Tabela de Classificação Anônima */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Tabela de Classificação Anônima ({rankingFiltrado.length}{" "}
              candidatos)
            </h2>
            {carregandoRanking && (
              <span className="text-xs text-indigo-400">
                Atualizando ranking...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <th className="py-3.5 px-4">Posição</th>
                  <th className="py-3.5 px-4">Código Anônimo</th>
                  <th className="py-3.5 px-4">Trilha</th>
                  <th className="py-3.5 px-4">Nota Técnica</th>
                  <th className="py-3.5 px-4">Barema Curricular</th>
                  <th className="py-3.5 px-4">Auditoria PDF</th>
                  <th className="py-3.5 px-4">Nota Final Consolidada</th>
                  <th className="py-3.5 px-4 text-right">Ações da Banca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rankingFiltrado.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400"
                    >
                      Nenhum candidato encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  rankingFiltrado.map((item) => (
                    <tr
                      key={item.inscricaoId}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold">
                        {item.posicaoRanking !== null ? (
                          <span className="inline-flex items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 text-xs">
                            #{item.posicaoRanking}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-xs">
                            Eliminado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-emerald-300">
                          {item.codigoAnonimo}
                        </div>
                        {!modoCorrecaoCega && item.candidatoNome && (
                          <div className="text-xs text-amber-300 font-semibold mt-0.5">
                            {item.candidatoNome} ({item.candidatoCpf})
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {item.trilhaNome}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {item.notaTecnicaTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          C: {item.notaCorretude} | Q: {item.notaQualidade} | D:{" "}
                          {item.notaDesempenho}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {item.notaBaremaUtilizada.toFixed(2)} pts
                        </div>
                        <div className="text-xs text-slate-400">
                          Declarado: {item.pontuacaoProvisoriaBarema.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.statusAuditoriaBarema === "AUDITADO" ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                            Homologado
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.notaFinalConsolidada !== null ? (
                          <span className="text-base font-bold text-indigo-300">
                            {item.notaFinalConsolidada.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400">
                            Reprovado no Corte
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => abrirInspecao(item)}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Inspecionar {item.codigoAnonimo}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Painel de Inspeção de Código Anônimo, Métricas do Runner e Auditoria Documental do Barema */}
        {candidatoInspecionado && (
          <section
            aria-label={`Inspeção Anônima ${candidatoInspecionado.codigoAnonimo}`}
            className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  Inspeção Técnica & Auditoria Documental Cega
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  Candidato Anônimo: {candidatoInspecionado.codigoAnonimo} —{" "}
                  {candidatoInspecionado.trilhaNome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCandidatoInspecionado(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Fechar Inspeção
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Visualizador de Código-Fonte Anônimo e Métricas do Runner */}
              {(() => {
                const listaDesafios =
                  candidatoInspecionado.submissoesDesafios ?? [];
                const desafioAtivo =
                  listaDesafios[desafioInspecionadoIndex] ?? listaDesafios[0];
                const relatorioAtivo =
                  desafioAtivo?.relatorioExecucao ??
                  candidatoInspecionado.relatorioExecucao;
                const linguagemAtiva =
                  desafioAtivo?.linguagem ?? candidatoInspecionado.linguagem;
                const codigoAtivo =
                  desafioAtivo?.codigoFonte ?? candidatoInspecionado.codigoFonte;

                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                        1. Código-Fonte Submetido & Métricas do Runner Sandbox
                      </h4>
                      {listaDesafios.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                          {listaDesafios.map((sub, idx) => (
                            <button
                              key={sub.submissaoId}
                              type="button"
                              onClick={() => setDesafioInspecionadoIndex(idx)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                desafioInspecionadoIndex === idx
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              Desafio {idx + 1} ({sub.linguagem}) •{" "}
                              {sub.notaTecnicaTotal.toFixed(0)} pts
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {relatorioAtivo && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                          <span className="text-xs text-slate-400 block">
                            Tempo Execução
                          </span>
                          <span className="text-sm font-bold text-white">
                            {relatorioAtivo.executionTimeMs} ms
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                          <span className="text-xs text-slate-400 block">
                            Memória RAM
                          </span>
                          <span className="text-sm font-bold text-white">
                            {Math.round(
                              (relatorioAtivo.memoryPeakKb ?? 0) / 1024
                            )}{" "}
                            MB
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                          <span className="text-xs text-slate-400 block">
                            Suítes de Teste
                          </span>
                          <span className="text-xs font-semibold text-emerald-300">
                            {
                              (relatorioAtivo.testResults ?? []).filter(
                                (t) => t.status === "PASSED"
                              ).length
                            }
                            /{(relatorioAtivo.testResults ?? []).length}{" "}
                            aprovados
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                          <span className="text-xs text-slate-400 block">
                            Linter / Clean Code
                          </span>
                          <span className="text-sm font-bold text-indigo-300">
                            {relatorioAtivo.linterScore ?? 100}/100
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>
                          Linguagem:{" "}
                          <strong className="text-slate-200">
                            {linguagemAtiva ?? "N/A"}
                          </strong>
                        </span>
                        <span>Somente Leitura (Anonimizado)</span>
                      </div>
                      <pre className="text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap max-h-72">
                        {codigoAtivo ||
                          "// Candidato não realizou submissão de código."}
                      </pre>
                    </div>

                    {relatorioAtivo && (
                      <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                        <span className="text-xs font-semibold text-slate-400 block">
                          Logs de Execução da Sandbox & Casos de Teste
                        </span>
                        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {relatorioAtivo.compilerOutput ||
                            (relatorioAtivo.testResults ?? [])
                              .map(
                                (t) =>
                                  `[${t.isHidden ? "OCULTO" : "PÚBLICO"}] ${
                                    t.testName
                                  }: ${t.status} (${t.durationMs}ms)${
                                    t.failureMessage
                                      ? ` - ${t.failureMessage}`
                                      : ""
                                  }`
                              )
                              .join("\n") ||
                            "Sem saída de console."}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Coluna 2: Módulo de Auditoria Documental do Barema (PDFs) */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  2. Auditoria Documental do Barema (Anexos PDF)
                </h4>

                {(candidatoInspecionado.itensBaremaAuditados ?? []).length ===
                0 ? (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-6 text-sm text-slate-400 space-y-4">
                    <p>
                      Nenhum título ou comprovante curricular declarado por este
                      candidato (Pontuação Declarada: 0.00 pts).
                    </p>
                    {erroAuditoria && (
                      <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300">
                        {erroAuditoria}
                      </div>
                    )}
                    {sucessoAuditoria && (
                      <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                        {sucessoAuditoria}
                      </div>
                    )}
                    {candidatoInspecionado.statusAuditoriaBarema !== "AUDITADO" && (
                      <button
                        type="button"
                        disabled={salvandoAuditoria}
                        onClick={handleSalvarAuditoria}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        {salvandoAuditoria
                          ? "Homologando..."
                          : "Homologar Barema (0.00 pts)"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(candidatoInspecionado.itensBaremaAuditados ?? []).map(
                      (item) => {
                        const decisaoAtual = decisoesAuditoria[
                          item.criterioId
                        ] ?? {
                          statusAuditoria: "VALIDADO",
                          motivoGlosa: "",
                        };

                        return (
                          <div
                            key={item.criterioId}
                            className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-semibold text-white text-sm">
                                  {item.descricao}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Quantidade declarada: {item.quantidadeOuAnos}{" "}
                                  | Pontos provisórios:{" "}
                                  <strong className="text-slate-200">
                                    {item.pontosProvisorios.toFixed(2)} pts
                                  </strong>
                                </div>
                              </div>

                              {item.arquivoComprovanteNome && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPdfPreviewBase64({
                                      nome: item.arquivoComprovanteNome!,
                                      base64: item.arquivoComprovanteBase64,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                                >
                                  <span aria-hidden="true">📄</span>
                                  <span>{item.arquivoComprovanteNome}</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                aria-label={`Validar ${item.descricao}`}
                                onClick={() =>
                                  atualizarDecisaoItem(
                                    item.criterioId,
                                    "VALIDADO"
                                  )
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                                  decisaoAtual.statusAuditoria === "VALIDADO"
                                    ? "bg-emerald-600 text-white border-emerald-500"
                                    : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                                }`}
                              >
                                ✓ Validar Pontos
                              </button>

                              <button
                                type="button"
                                aria-label={`Glosar ${item.descricao}`}
                                onClick={() =>
                                  atualizarDecisaoItem(
                                    item.criterioId,
                                    "GLOSADO"
                                  )
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                                  decisaoAtual.statusAuditoria === "GLOSADO"
                                    ? "bg-rose-600 text-white border-rose-500"
                                    : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                                }`}
                              >
                                ✕ Glosar Item
                              </button>
                            </div>

                            {decisaoAtual.statusAuditoria === "GLOSADO" && (
                              <div>
                                <input
                                  type="text"
                                  placeholder="Justificativa obrigatória da glosa (ex: PDF sem assinatura ou carga horária insuficiente)"
                                  value={decisaoAtual.motivoGlosa}
                                  onChange={(e) =>
                                    atualizarDecisaoItem(
                                      item.criterioId,
                                      "GLOSADO",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg bg-slate-900 border border-rose-500/50 px-3 py-2 text-xs text-white"
                                />
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}

                    {pdfPreviewBase64 && (
                      <div className="rounded-xl bg-slate-950 border border-indigo-500/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-300">
                            Visualizador de Comprovante PDF:{" "}
                            {pdfPreviewBase64.nome}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPdfPreviewBase64(null)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Fechar PDF
                          </button>
                        </div>
                        {pdfPreviewBase64.base64 ? (
                          <iframe
                            title={`PDF ${pdfPreviewBase64.nome}`}
                            src={`data:application/pdf;base64,${pdfPreviewBase64.base64}`}
                            className="w-full h-64 rounded border border-slate-800 bg-white"
                          />
                        ) : (
                          <div className="text-xs text-slate-300 py-4 text-center bg-slate-900 rounded">
                            Documento anexado validado no armazenamento seguro (
                            {pdfPreviewBase64.nome}).
                          </div>
                        )}
                      </div>
                    )}

                    {erroAuditoria && (
                      <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300">
                        {erroAuditoria}
                      </div>
                    )}

                    {sucessoAuditoria && (
                      <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                        {sucessoAuditoria}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={salvandoAuditoria}
                      onClick={handleSalvarAuditoria}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
                    >
                      {salvandoAuditoria
                        ? "Salvando Auditoria..."
                        : "Salvar Auditoria do Barema"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Módulo de Julgamento de Recursos Administrativos */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Julgamento de Recursos Administrativos ({recursos.length})
              </h2>
              <p className="text-xs text-slate-400">
                Analise as contestações fundamentadas dos candidatos, registre o
                parecer técnico formal e defira (com ajuste de nota) ou indefira.
              </p>
            </div>
          </div>

          {erroJulgamento && (
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300">
              {erroJulgamento}
            </div>
          )}

          {recursos.length === 0 ? (
            <div className="text-sm text-slate-400 py-4 text-center">
              Nenhum recurso protocolado para este processo seletivo até o
              momento.
            </div>
          ) : (
            <div className="space-y-4">
              {recursos.map((rec) => {
                const formAtual = pareceresRecursos[rec.id] ?? {
                  parecerBanca: rec.parecerBanca ?? "",
                  novaPontuacaoAlvo:
                    rec.novaPontuacaoAlvo !== null &&
                    rec.novaPontuacaoAlvo !== undefined
                      ? String(rec.novaPontuacaoAlvo)
                      : "",
                };

                return (
                  <div
                    key={rec.id}
                    className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-semibold text-emerald-400">
                          {rec.codigoAnonimo}
                        </span>
                        <span className="ml-3 text-xs font-semibold text-indigo-300">
                          Etapa Contestada: {rec.alvoContestacao}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200">
                        {rec.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 bg-slate-900/70 rounded-lg p-3 border border-slate-800">
                      {rec.fundamentacao}
                    </p>

                    {rec.status === "EM_ANALISE" ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Registre o parecer técnico fundamentado da banca (mínimo 10 caracteres)"
                            value={formAtual.parecerBanca}
                            onChange={(e) =>
                              setPareceresRecursos((prev) => ({
                                ...prev,
                                [rec.id]: {
                                  ...formAtual,
                                  parecerBanca: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="Nova nota (0-100)"
                            value={formAtual.novaPontuacaoAlvo}
                            onChange={(e) =>
                              setPareceresRecursos((prev) => ({
                                ...prev,
                                [rec.id]: {
                                  ...formAtual,
                                  novaPontuacaoAlvo: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Deferir Recurso ${rec.id}`}
                            onClick={() =>
                              handleJulgarRecurso(rec.id, "DEFERIDO")
                            }
                            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Deferir
                          </button>
                          <button
                            type="button"
                            aria-label={`Indeferir Recurso ${rec.id}`}
                            onClick={() =>
                              handleJulgarRecurso(rec.id, "INDEFERIDO")
                            }
                            className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Indeferir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-300 bg-slate-900 border border-slate-800 rounded-lg p-3">
                        <strong>Parecer Oficial:</strong> {rec.parecerBanca}
                        {rec.novaPontuacaoAlvo !== null &&
                          rec.novaPontuacaoAlvo !== undefined && (
                            <span className="ml-2 text-indigo-300">
                              (Nova pontuação homologada:{" "}
                              {Number(rec.novaPontuacaoAlvo).toFixed(2)} pts)
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal de Convocação de Aprovados */}
        {modalConvocacaoAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>✉️</span> Convocação Oficial de Aprovados por E-mail
                </h3>
                <button
                  type="button"
                  onClick={() => setModalConvocacaoAberto(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-slate-300">
                  O sistema disparará um comunicado formal para os candidatos{" "}
                  <strong>classificados no corte técnico</strong> com suas
                  respectivas notas finais e colocação.
                </p>

                <div>
                  <label
                    htmlFor="prazo-documentos"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Prazo para Apresentação de Documentos / Manifestação
                  </label>
                  <input
                    id="prazo-documentos"
                    type="text"
                    value={prazoDocumentosConvocacao}
                    onChange={(e) =>
                      setPrazoDocumentosConvocacao(e.target.value)
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="limite-convocados"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Quantidade de Aprovados a Convocar (Deixe em branco para
                    todos os classificados)
                  </label>
                  <input
                    id="limite-convocados"
                    type="number"
                    min={1}
                    placeholder="Ex: 5"
                    value={limiteConvocados}
                    onChange={(e) => setLimiteConvocados(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </div>

                {mensagemConvocacao && (
                  <div
                    className={`rounded-lg p-3 text-xs font-medium ${
                      mensagemConvocacao.tipo === "sucesso"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {mensagemConvocacao.texto}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalConvocacaoAberto(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={convocando}
                  onClick={handleDispararConvocacao}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow"
                >
                  {convocando
                    ? "Enviando e-mails..."
                    : "Confirmar e Enviar Convocação"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
