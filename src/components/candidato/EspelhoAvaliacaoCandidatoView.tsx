"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlvoContestacaoRecurso,
  EspelhoAvaliacaoCandidato,
} from "@/domain/recurso/homologacao-recurso";
import { RecursoEntity } from "@/infrastructure/repositories/recurso-repository";

interface EspelhoAvaliacaoCandidatoViewProps {
  candidatoIdInicial: string;
  inscricaoIdInicial: string;
  espelhoInicial: EspelhoAvaliacaoCandidato | null;
  janelaRecursosAbertaInicial: boolean;
  recursosIniciais: RecursoEntity[];
}

export function EspelhoAvaliacaoCandidatoView({
  candidatoIdInicial,
  inscricaoIdInicial,
  espelhoInicial,
  janelaRecursosAbertaInicial,
  recursosIniciais,
}: EspelhoAvaliacaoCandidatoViewProps) {
  const [candidatoId, setCandidatoId] = useState(candidatoIdInicial);
  const [inscricaoId, setInscricaoId] = useState(inscricaoIdInicial);
  const [espelho, setEspelho] = useState<EspelhoAvaliacaoCandidato | null>(
    espelhoInicial
  );
  const [janelaAberta, setJanelaAberta] = useState(janelaRecursosAbertaInicial);
  const [recursos, setRecursos] = useState<RecursoEntity[]>(recursosIniciais);
  const [carregandoEspelho, setCarregandoEspelho] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  // Estado do formulário de recurso
  const [alvoContestacao, setAlvoContestacao] =
    useState<AlvoContestacaoRecurso>("BAREMA");
  const [fundamentacao, setFundamentacao] = useState("");
  const [enviandoRecurso, setEnviandoRecurso] = useState(false);
  const [erroRecurso, setErroRecurso] = useState<string | null>(null);
  const [sucessoRecurso, setSucessoRecurso] = useState<string | null>(null);

  async function handleConsultarEspelho(e: React.FormEvent) {
    e.preventDefault();
    setErroConsulta(null);
    setCarregandoEspelho(true);
    try {
      const res = await fetch(
        `/api/candidato/espelho?inscricaoId=${encodeURIComponent(
          inscricaoId
        )}&candidatoId=${encodeURIComponent(candidatoId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setErroConsulta(
          data.error || "Não foi possível carregar o Espelho de Avaliação."
        );
        setEspelho(null);
        return;
      }
      setEspelho(data.espelho);
      setJanelaAberta(Boolean(data.processoSeletivo?.janelaRecursosAberta));
      setRecursos(data.recursos ?? []);
    } catch (err: any) {
      setErroConsulta(err?.message || "Erro ao consultar espelho.");
    } finally {
      setCarregandoEspelho(false);
    }
  }

  async function handleSubmeterRecurso(e: React.FormEvent) {
    e.preventDefault();
    if (!espelho) return;
    setErroRecurso(null);
    setSucessoRecurso(null);
    setEnviandoRecurso(true);

    try {
      const res = await fetch("/api/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inscricaoId: espelho.inscricaoId,
          candidatoId,
          alvoContestacao,
          fundamentacao,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroRecurso(data.error || "Falha ao protocolar o recurso.");
        return;
      }

      setRecursos((prev) => [data, ...prev]);
      setFundamentacao("");
      setSucessoRecurso(
        "Recurso protocolado com sucesso! Acompanhe o parecer técnico da Banca abaixo."
      );
    } catch (err: any) {
      setErroRecurso(err?.message || "Erro de conexão ao enviar recurso.");
    } finally {
      setEnviandoRecurso(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Área Logada do Candidato • Transparência e Contraditório
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">
              Espelho de Avaliação Individual & Módulo de Recursos
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Consulte a discriminação oficial das suas notas na Prova Prática,
              auditoria do Barema e protocole recursos fundamentados.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/candidato/inscricao"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Minhas Inscrições
            </Link>
            <Link
              href="/candidato/prova"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Ambiente de Prova
            </Link>
          </div>
        </header>

        {/* Seletor / Autenticação de Inscrição do Candidato */}
        <form
          onSubmit={handleConsultarEspelho}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4"
        >
          <div>
            <label
              htmlFor="input-inscricao-espelho"
              className="block text-xs font-medium text-slate-400 mb-1"
            >
              ID da Inscrição
            </label>
            <input
              id="input-inscricao-espelho"
              type="text"
              value={inscricaoId}
              onChange={(e) => setInscricaoId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label
              htmlFor="input-candidato-espelho"
              className="block text-xs font-medium text-slate-400 mb-1"
            >
              ID do Candidato Titular
            </label>
            <input
              id="input-candidato-espelho"
              type="text"
              value={candidatoId}
              onChange={(e) => setCandidatoId(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={carregandoEspelho}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2 px-4 text-sm font-semibold text-white"
            >
              {carregandoEspelho
                ? "Carregando Espelho..."
                : "Carregar Meu Espelho"}
            </button>
          </div>
        </form>

        {erroConsulta && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-4 text-sm text-rose-300">
            {erroConsulta}
          </div>
        )}

        {espelho && (
          <>
            {/* Resumo Consolidado do Espelho */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div>
                <span className="text-xs text-slate-400 block">
                  Candidato Titular
                </span>
                <strong className="text-base text-white block mt-1">
                  {espelho.candidatoNome}
                </strong>
                <span className="text-xs font-mono text-emerald-400">
                  Código Cego: {espelho.codigoAnonimo}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">
                  Trilha & Classificação
                </span>
                <strong className="text-base text-white block mt-1">
                  {espelho.trilhaNome}
                </strong>
                <span className="text-xs text-indigo-300">
                  {espelho.posicaoRanking !== null
                    ? `Posição no Ranking: #${espelho.posicaoRanking}`
                    : "Reprovado no Corte Técnico"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">
                  Prova Prática ({espelho.pesos.pesoProvaTecnica}%)
                </span>
                <strong className="text-xl text-white block mt-1">
                  {espelho.provaPratica.notaTecnicaTotal.toFixed(2)} pts
                </strong>
                <span className="text-xs text-slate-400">
                  C: {espelho.provaPratica.notaCorretude} | Q:{" "}
                  {espelho.provaPratica.notaQualidade} | D:{" "}
                  {espelho.provaPratica.notaDesempenho}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">
                  Nota Final Consolidada
                </span>
                <strong className="text-2xl text-emerald-400 block mt-1">
                  {espelho.notaFinalConsolidada !== null
                    ? espelho.notaFinalConsolidada.toFixed(2)
                    : "Eliminado"}
                </strong>
                <span className="text-xs text-slate-400">
                  Barema Homologado: {espelho.barema.pontuacaoHomologada.toFixed(2)}{" "}
                  pts ({espelho.pesos.pesoBaremaCurricular}%)
                </span>
              </div>
            </section>

            {/* Detalhamento dos Itens do Barema Auditados */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">
                Detalhamento da Auditoria Curricular (Barema)
              </h2>
              {espelho.barema.itens.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum comprovante curricular declarado na inscrição.
                </p>
              ) : (
                <div className="space-y-3">
                  {espelho.barema.itens.map((item) => (
                    <div
                      key={item.criterioId}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {item.descricao}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Declarado: {item.pontosProvisorios.toFixed(2)} pts |
                          Homologado:{" "}
                          <strong className="text-slate-200">
                            {item.pontosHomologados.toFixed(2)} pts
                          </strong>
                        </div>
                        {item.motivoGlosa && (
                          <div className="text-xs text-rose-300 mt-1">
                            Motivo da Glosa: {item.motivoGlosa}
                          </div>
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.statusAuditoria === "GLOSADO"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {item.statusAuditoria}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Formulário de Interposição de Recurso */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Interposição de Recurso Administrativo
                </h2>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    janelaAberta
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {janelaAberta
                    ? "Prazo de Recursos Aberto"
                    : "Prazo de Recursos Fechado"}
                </span>
              </div>

              <form onSubmit={handleSubmeterRecurso} className="space-y-4">
                <div>
                  <label
                    htmlFor="select-alvo-recurso"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Etapa Contestada
                  </label>
                  <select
                    id="select-alvo-recurso"
                    aria-label="Etapa Contestada"
                    value={alvoContestacao}
                    onChange={(e) =>
                      setAlvoContestacao(
                        e.target.value as AlvoContestacaoRecurso
                      )
                    }
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  >
                    <option value="BAREMA">
                      Pontuação / Glosa do Barema Curricular
                    </option>
                    <option value="PROVA_PRATICA">
                      Resultado / Execução da Prova Prática
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="textarea-fundamentacao"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Fundamentação Técnica do Recurso
                  </label>
                  <textarea
                    id="textarea-fundamentacao"
                    rows={4}
                    placeholder="Fundamente tecnicamente seu pedido de revisão (mínimo de 15 caracteres)..."
                    value={fundamentacao}
                    onChange={(e) => setFundamentacao(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-sm text-white"
                  />
                </div>

                {erroRecurso && (
                  <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300">
                    {erroRecurso}
                  </div>
                )}

                {sucessoRecurso && (
                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-300">
                    {sucessoRecurso}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviandoRecurso || !janelaAberta}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {enviandoRecurso
                    ? "Protocolando..."
                    : "Protocolar Recurso Oficial"}
                </button>
              </form>

              {/* Histórico de Recursos do Candidato */}
              {recursos.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Meus Recursos Protocolados ({recursos.length})
                  </h3>
                  {recursos.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300">
                          Alvo: {rec.alvoContestacao}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-white">
                          {rec.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {rec.fundamentacao}
                      </p>
                      {rec.parecerBanca && (
                        <div className="rounded-lg bg-slate-900 border border-slate-700 p-3 text-xs text-emerald-300">
                          <strong>Parecer da Banca:</strong> {rec.parecerBanca}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
