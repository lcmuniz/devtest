"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import { InscricaoEntity } from "@/infrastructure/repositories/candidato-repository";
import {
  calcularPontuacaoBarema,
  ItemBaremaDeclarado,
  validarArquivoPdf,
} from "@/domain/candidato/candidato-barema";

interface CandidatoAutenticadoInfo {
  id: string;
  nome: string;
  email: string;
  cpf: string;
}

interface InscricaoCandidatoViewProps {
  processos: ProcessoSeletivoEntity[];
  candidatoInicial?: CandidatoAutenticadoInfo | null;
  inscricoesIniciais?: InscricaoEntity[];
  onSubmeterInscricao?: (payload: any) => Promise<{
    sucesso: boolean;
    inscricao?: InscricaoEntity;
    erro?: string;
    erros?: string[];
  }>;
}

export function obterStatusInscricaoProcesso(proc: ProcessoSeletivoEntity): "ABERTO" | "NAO_INICIADO" | "ENCERRADO" {
  const agoraMs = Date.now();
  const inicioMs = new Date(proc.inicioInscricoes).getTime();
  const fimDate = new Date(proc.fimInscricoes);
  if (
    fimDate.getUTCHours() === 0 &&
    fimDate.getUTCMinutes() === 0 &&
    fimDate.getUTCSeconds() === 0
  ) {
    fimDate.setUTCHours(23, 59, 59, 999);
  }
  const fimMs = fimDate.getTime();
  if (agoraMs < inicioMs) return "NAO_INICIADO";
  if (agoraMs > fimMs) return "ENCERRADO";
  return "ABERTO";
}

export function InscricaoCandidatoView({
  processos,
  candidatoInicial = null,
  inscricoesIniciais = [],
  onSubmeterInscricao,
}: InscricaoCandidatoViewProps) {
  const [listaProcessos, setListaProcessos] = useState<ProcessoSeletivoEntity[]>(processos);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoSeletivoEntity | null>(null);
  const [inscricaoConcluida, setInscricaoConcluida] = useState<InscricaoEntity | null>(null);

  // Candidato Logado / Em Sessão
  const [candidatoAutenticado, setCandidatoAutenticado] = useState<CandidatoAutenticadoInfo | null>(candidatoInicial);
  const [minhasInscricoes, setMinhasInscricoes] = useState<InscricaoEntity[]>(inscricoesIniciais);

  // Filtro de Processos: "ABERTOS" (padrão) ou "TODOS"
  const [filtroPrazo, setFiltroPrazo] = useState<"ABERTOS" | "TODOS">("ABERTOS");

  // Visualização de comprovante de inscrição existente em modal/detalhe
  const [inscricaoEmVisualizacao, setInscricaoEmVisualizacao] = useState<InscricaoEntity | null>(null);
  const [inscricaoEmEdicao, setInscricaoEmEdicao] = useState<InscricaoEntity | null>(null);

  // Form State
  const [trilhaId, setTrilhaId] = useState("");
  const [itensBarema, setItensBarema] = useState<Record<string, { quantidade: number; arquivoNome: string }>>({});
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setListaProcessos(processos);
  }, [processos]);

  useEffect(() => {
    if (candidatoInicial) {
      setCandidatoAutenticado(candidatoInicial);
    }
  }, [candidatoInicial]);

  useEffect(() => {
    if (inscricoesIniciais && inscricoesIniciais.length > 0) {
      setMinhasInscricoes(inscricoesIniciais);
    }
  }, [inscricoesIniciais]);

  // Carrega processos seletivos do servidor (se não estiver em modo mock de teste)
  useEffect(() => {
    if (onSubmeterInscricao) return;
    let ativo = true;
    fetch("/api/processos-seletivos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (ativo && data?.sucesso && Array.isArray(data.processosSeletivos)) {
          setListaProcessos(data.processosSeletivos);
        }
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [onSubmeterInscricao]);

  // Busca inscrições do candidato autenticado
  const carregarInscricoesDoCandidato = async (candId: string) => {
    try {
      const res = await fetch(`/api/inscricoes?candidatoId=${encodeURIComponent(candId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sucesso && Array.isArray(data.inscricoes)) {
          setMinhasInscricoes(data.inscricoes);
        }
      }
    } catch {
      // Falha silenciosa de rede
    }
  };

  useEffect(() => {
    if (candidatoAutenticado?.id && !onSubmeterInscricao) {
      carregarInscricoesDoCandidato(candidatoAutenticado.id);
    }
  }, [candidatoAutenticado?.id, onSubmeterInscricao]);

  // Mapa de inscrições por processo seletivo: Record<processoId, Set<trilhaId>>
  const mapaInscricoesPorProcesso = useMemo(() => {
    const mapa: Record<string, { trilhasIds: Set<string>; nomesTrilhas: string[] }> = {};
    for (const insc of minhasInscricoes) {
      if (!mapa[insc.processoSeletivoId]) {
        mapa[insc.processoSeletivoId] = { trilhasIds: new Set(), nomesTrilhas: [] };
      }
      mapa[insc.processoSeletivoId].trilhasIds.add(insc.trilhaId);
      mapa[insc.processoSeletivoId].nomesTrilhas.push(insc.trilhaNome);
    }
    return mapa;
  }, [minhasInscricoes]);

  // Contagem para filtros
  const contagemAbertos = useMemo(() => {
    return listaProcessos.filter((p) => obterStatusInscricaoProcesso(p) === "ABERTO").length;
  }, [listaProcessos]);

  // Processos filtrados pela preferência de exibição
  const processosFiltrados = useMemo(() => {
    if (filtroPrazo === "TODOS") {
      return listaProcessos;
    }
    return listaProcessos.filter((proc) => obterStatusInscricaoProcesso(proc) === "ABERTO");
  }, [listaProcessos, filtroPrazo]);

  const handleSelecionarProcesso = (proc: ProcessoSeletivoEntity) => {
    setProcessoSelecionado(proc);

    // Identifica trilhas em que o candidato já está inscrito neste processo
    const trilhasJaInscritas = mapaInscricoesPorProcesso[proc.id]?.trilhasIds || new Set();

    // Seleciona a primeira trilha ainda disponível
    const primeiraDisponivel = proc.trilhas.find((t) => !trilhasJaInscritas.has(t.id));
    setTrilhaId(primeiraDisponivel?.id || proc.trilhas[0]?.id || "");

    const initialBarema: Record<string, { quantidade: number; arquivoNome: string }> = {};
    proc.barema.forEach((b) => {
      initialBarema[b.id] = { quantidade: 0, arquivoNome: "" };
    });
    setItensBarema(initialBarema);
    setMensagemErro(null);
  };

  const handleQuantidadeChange = (criterioId: string, quantidade: number) => {
    setItensBarema((prev) => ({
      ...prev,
      [criterioId]: {
        ...prev[criterioId],
        quantidade: Math.max(0, quantidade),
      },
    }));
  };

  const handleArquivoChange = (criterioId: string, arquivoNome: string) => {
    setItensBarema((prev) => ({
      ...prev,
      [criterioId]: {
        ...prev[criterioId],
        arquivoNome,
      },
    }));
  };

  const handleFileChangeInput = (criterioId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validarArquivoPdf(file.name)) {
        setMensagemErro(`O arquivo '${file.name}' não é um documento PDF válido.`);
        return;
      }
      handleArquivoChange(criterioId, file.name);
      setMensagemErro(null);
    }
  };

  // Cálculo da pontuação provisória em tempo real
  const calcularPontosAtuais = () => {
    if (!processoSelecionado) return 0;
    const declarados: ItemBaremaDeclarado[] = Object.entries(itensBarema).map(([criterioId, item]) => ({
      criterioId,
      quantidadeOuAnos: item.quantidade,
      arquivoComprovanteNome: item.arquivoNome || "documento.pdf",
    }));
    const calculo = calcularPontuacaoBarema(processoSelecionado.barema, declarados);
    return calculo.pontuacaoProvisoriaBarema;
  };

  const pontuacaoAtual = calcularPontosAtuais();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processoSelecionado) return;
    setMensagemErro(null);
    if (!candidatoAutenticado) {
      setMensagemErro("Sessão expirada. Faça login novamente para se inscrever.");
      return;
    }

    // Validação da regra: se já tiver inscrito na mesma trilha deste processo, bloqueia (apenas para nova inscrição)
    const trilhasJaInscritas = mapaInscricoesPorProcesso[processoSelecionado.id]?.trilhasIds || new Set();
    if (!inscricaoEmEdicao && trilhasJaInscritas.has(trilhaId)) {
      setMensagemErro("Você já está inscrito nesta trilha deste Processo Seletivo. Escolha outra trilha ou consulte suas inscrições ativas.");
      return;
    }

    // Validação de comprovantes para critérios que pontuam
    for (const b of processoSelecionado.barema) {
      const item = itensBarema[b.id];
      if (item && item.quantidade > 0 && b.exigeComprovante) {
        if (!validarArquivoPdf(item.arquivoNome)) {
          setMensagemErro(`É obrigatório anexar comprovante em formato PDF para o critério: "${b.descricao}".`);
          return;
        }
      }
    }

    setEnviando(true);
    try {
      const payloadItens: ItemBaremaDeclarado[] = Object.entries(itensBarema)
        .filter(([_, item]) => item.quantidade > 0)
        .map(([criterioId, item]) => ({
          criterioId,
          quantidadeOuAnos: item.quantidade,
          arquivoComprovanteNome: item.arquivoNome,
        }));

      // Caso de Edição de Inscrição Existente
      if (inscricaoEmEdicao) {
        const putRes = await fetch(`/api/inscricoes/${inscricaoEmEdicao.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itensBarema: payloadItens,
          }),
        });
        const putData = await putRes.json();
        if (!putRes.ok || !putData.sucesso) {
          setMensagemErro(putData.erro || (putData.erros ? putData.erros.join(" | ") : "Erro ao atualizar inscrição."));
          return;
        }

        setInscricaoConcluida(putData.inscricao);
        setMinhasInscricoes((prev) =>
          prev.map((i) => (i.id === putData.inscricao.id ? putData.inscricao : i))
        );
        setInscricaoEmEdicao(null);
        return;
      }

      if (onSubmeterInscricao) {
        const res = await onSubmeterInscricao({
          candidatoId: candidatoAutenticado.id,
          processoSeletivoId: processoSelecionado.id,
          trilhaId,
          itensBarema: payloadItens,
        });
        if (res.sucesso && res.inscricao) {
          setInscricaoConcluida(res.inscricao);
          setMinhasInscricoes((prev) => [res.inscricao!, ...prev]);
          return;
        }
        setMensagemErro(res.erro || (res.erros ? res.erros.join(" | ") : "Falha na inscrição."));
      } else {
        // Submete inscrição
        const inscRes = await fetch("/api/inscricoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidatoId: candidatoAutenticado.id,
            processoSeletivoId: processoSelecionado.id,
            trilhaId,
            itensBarema: payloadItens,
          }),
        });
        const inscData = await inscRes.json();
        if (!inscRes.ok) {
          setMensagemErro(inscData.erro || (inscData.erros ? inscData.erros.join(" | ") : "Erro ao submeter inscrição."));
          return;
        }

        setInscricaoConcluida(inscData.inscricao);
        setMinhasInscricoes((prev) => [inscData.inscricao, ...prev]);
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Erro de conexão com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEditarInscricao = (insc: InscricaoEntity) => {
    const proc =
      listaProcessos.find((p) => p.id === insc.processoSeletivoId) ||
      processos.find((p) => p.id === insc.processoSeletivoId);
    if (!proc) return;
    setProcessoSelecionado(proc);
    setInscricaoEmEdicao(insc);
    setTrilhaId(insc.trilhaId);
    setMensagemErro(null);

    const mapa: Record<string, { quantidade: number; arquivoNome: string }> = {};
    for (const b of proc.barema) {
      mapa[b.id] = { quantidade: 0, arquivoNome: "" };
    }
    for (const item of insc.itensBarema || []) {
      mapa[item.criterioId] = {
        quantidade: item.quantidadeOuAnos ?? (item as any).quantidade ?? 0,
        arquivoNome: item.arquivoComprovanteNome ?? (item as any).arquivoNome ?? "",
      };
    }
    setItensBarema(mapa);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Cabeçalho DevTest */}
        <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded tracking-wider uppercase">
                DevTest
              </span>
              <span className="text-xs text-slate-500 font-medium">Portal do Candidato</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
              Minhas Inscrições
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Consulte seus processos inscritos, códigos anônimos e barema curricular ou candidate-se a novos editais abertos.
            </p>
          </div>
        </div>

        {/* Modal/Detalhe de Extrato de Inscrição em Visualização */}
        {inscricaoEmVisualizacao && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detalhes da Inscrição: {inscricaoEmVisualizacao.numeroInscricao}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inscricaoEmVisualizacao.processoSeletivoTitulo} — {inscricaoEmVisualizacao.trilhaNome}
                  </p>
                </div>
                <button
                  onClick={() => setInscricaoEmVisualizacao(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Código Anônimo:</span>
                  <span className="font-mono font-bold text-blue-900">{inscricaoEmVisualizacao.codigoAnonimo}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Data de Inscrição:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(inscricaoEmVisualizacao.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Pontuação Provisória Barema:</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {Number(inscricaoEmVisualizacao.pontuacaoProvisoriaBarema).toFixed(2)} pts
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase">Status da Auditoria:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-xs inline-block ${
                      inscricaoEmVisualizacao.statusAuditoriaBarema === "AUDITADO"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {inscricaoEmVisualizacao.statusAuditoriaBarema || "PENDENTE"}
                  </span>
                </div>
                {inscricaoEmVisualizacao.statusAuditoriaBarema === "AUDITADO" && (
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase">Pontuação Homologada:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {Number(inscricaoEmVisualizacao.pontuacaoHomologadaBarema ?? inscricaoEmVisualizacao.pontuacaoProvisoriaBarema).toFixed(2)} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Tabela de Itens de Barema: prioriza auditoria_barema se houver, ou extrato_barema */}
              {inscricaoEmVisualizacao.auditoriaBarema && inscricaoEmVisualizacao.auditoriaBarema.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Itens Declarados e Parecer da Auditoria:</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {inscricaoEmVisualizacao.auditoriaBarema.length} item(ns) avaliado(s)
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-2">Critério</th>
                          <th className="p-2">Qtd / Anos</th>
                          <th className="p-2">Comprovante</th>
                          <th className="p-2">Situação</th>
                          <th className="p-2 text-right">Provisório</th>
                          <th className="p-2 text-right">Homologado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inscricaoEmVisualizacao.auditoriaBarema.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2 font-medium">
                              <div>{item.descricao}</div>
                              {item.motivoGlosa && (
                                <div className="text-[11px] text-red-600 mt-0.5">
                                  <strong>Motivo da glosa:</strong> {item.motivoGlosa}
                                </div>
                              )}
                            </td>
                            <td className="p-2">{item.quantidadeOuAnos}</td>
                            <td className="p-2 font-mono text-[11px] text-slate-600">
                              {item.arquivoComprovanteNome || "—"}
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.statusAuditoria === "VALIDADO"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.statusAuditoria === "GLOSADO"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.statusAuditoria}
                              </span>
                            </td>
                            <td className="p-2 text-right font-medium text-slate-700">
                              {Number(item.pontosProvisorios).toFixed(2)} pts
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {Number(item.pontosHomologados).toFixed(2)} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : inscricaoEmVisualizacao.extratoBarema?.itensDetalhados &&
                inscricaoEmVisualizacao.extratoBarema.itensDetalhados.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Itens Declarados de Barema:</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-2">Critério</th>
                          <th className="p-2">Qtd / Anos</th>
                          <th className="p-2">Comprovante</th>
                          <th className="p-2 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inscricaoEmVisualizacao.extratoBarema.itensDetalhados.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="p-2 font-medium">{item.descricao}</td>
                            <td className="p-2">{item.quantidadeOuAnos}</td>
                            <td className="p-2 font-mono text-[11px] text-slate-500">{item.arquivoComprovanteNome || "—"}</td>
                            <td className="p-2 text-right font-bold">{item.pontosCalculados.toFixed(2)} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs text-center">
                  Nenhum item ou comprovante de barema curricular foi pontuado ou declarado nesta inscrição.
                </div>
              )}

              <div className="pt-3 flex justify-between items-center border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {(() => {
                    const p =
                      listaProcessos.find((pr) => pr.id === inscricaoEmVisualizacao.processoSeletivoId) ||
                      processos.find((pr) => pr.id === inscricaoEmVisualizacao.processoSeletivoId);
                    if (!p) return null;
                    const agora = Date.now();
                    const inicioInsc = new Date(p.inicioInscricoes).getTime();
                    const fimInscDate = new Date(p.fimInscricoes);
                    if (
                      fimInscDate.getUTCHours() === 0 &&
                      fimInscDate.getUTCMinutes() === 0 &&
                      fimInscDate.getUTCSeconds() === 0
                    ) {
                      fimInscDate.setUTCHours(23, 59, 59, 999);
                    }
                    const fimInsc = fimInscDate.getTime();
                    const inscricaoAberta = agora >= inicioInsc && agora <= fimInsc;
                    if (inscricaoAberta) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const ins = inscricaoEmVisualizacao;
                            setInscricaoEmVisualizacao(null);
                            handleEditarInscricao(ins);
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer transition shadow-xs"
                        >
                          ✎ Retificar Barema / Documentos
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <a
                    href={`/candidato/prova?inscricaoId=${encodeURIComponent(
                      inscricaoEmVisualizacao.id
                    )}&processoSeletivoId=${encodeURIComponent(
                      inscricaoEmVisualizacao.processoSeletivoId
                    )}&trilhaId=${encodeURIComponent(inscricaoEmVisualizacao.trilhaId)}`}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold"
                  >
                    Abrir Ambiente de Prova (Web IDE) →
                  </a>
                </div>
                <button
                  onClick={() => setInscricaoEmVisualizacao(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Caso de Sucesso Imediato: Comprovante de Inscrição Oficial */}
        {inscricaoConcluida && (
          <div className="bg-white rounded-xl border border-emerald-300 shadow-md p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
                ✓
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Comprovante de Inscrição Oficial
                </h2>
                <p className="text-xs text-slate-500">
                  Sua inscrição foi confirmada e protocolada com sucesso.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-lg border border-emerald-200 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Número de Inscrição:</span>
                <span className="font-mono font-bold text-base text-blue-900">
                  {inscricaoConcluida.numeroInscricao}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Código Anônimo (Correção Cega):</span>
                <span className="font-mono font-bold text-base text-emerald-800">
                  {inscricaoConcluida.codigoAnonimo || "—"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Processo Seletivo:</span>
                <span className="font-semibold text-slate-800">{inscricaoConcluida.processoSeletivoTitulo}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block uppercase">Trilha Técnica:</span>
                <span className="font-semibold text-blue-800">{inscricaoConcluida.trilhaNome}</span>
              </div>
            </div>

            {/* Extrato Preliminar do Barema */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Extrato Preliminar de Pontuação do Barema
                </h3>
                <span className="bg-blue-100 text-blue-900 font-extrabold px-3 py-1 rounded-full text-sm">
                  {Number(inscricaoConcluida.pontuacaoProvisoriaBarema).toFixed(2)} pts
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2.5">Critério</th>
                      <th className="p-2.5">Qtd / Anos</th>
                      <th className="p-2.5">Comprovante</th>
                      <th className="p-2.5 text-right">Pontos Calculados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscricaoConcluida.extratoBarema?.itensDetalhados?.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-800">{item.descricao}</td>
                        <td className="p-2.5 text-slate-600">{item.quantidadeOuAnos}</td>
                        <td className="p-2.5 text-slate-600 font-mono text-xs">{item.arquivoComprovanteNome || "—"}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {item.pontosCalculados.toFixed(2)} pts
                          {item.atingiuTeto && <span className="text-amber-600 text-[10px] ml-1">(teto)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 italic">
                * A pontuação provisória calculada automaticamente está sujeita à homologação e conferência documental pela Banca Avaliadora.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={`/candidato/prova?inscricaoId=${encodeURIComponent(
                  inscricaoConcluida.id
                )}&processoSeletivoId=${encodeURIComponent(
                  inscricaoConcluida.processoSeletivoId
                )}&trilhaId=${encodeURIComponent(inscricaoConcluida.trilhaId)}`}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition"
              >
                Iniciar Prova Prática (Web IDE) →
              </a>
              <button
                onClick={() => {
                  setInscricaoConcluida(null);
                  setProcessoSelecionado(null);
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 transition"
              >
                Voltar à Lista de Processos
              </button>
            </div>
          </div>
        )}

        {/* SEÇÃO 1: LISTA DOS PROCESSOS EM QUE O USUÁRIO JÁ ESTÁ INSCRITO */}
        {!processoSelecionado && !inscricaoConcluida && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  Processos em que estou Inscrito
                </span>
                <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {minhasInscricoes.length}
                </span>
              </div>
              {candidatoAutenticado && (
                <span className="text-xs text-slate-500">
                  Candidato: <strong>{candidatoAutenticado.nome}</strong> (CPF: {candidatoAutenticado.cpf})
                </span>
              )}
            </div>

            {minhasInscricoes.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center text-slate-500 text-xs space-y-1">
                <p className="font-semibold text-slate-700">Você ainda não possui inscrições confirmadas.</p>
                <p>Consulte os editais abertos na lista abaixo e selecione sua trilha técnica para se inscrever.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {minhasInscricoes.map((insc) => (
                  <div
                    key={insc.id}
                    className="border border-slate-200 bg-slate-50/60 hover:bg-slate-50 rounded-xl p-4 space-y-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                          {insc.trilhaNome}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {insc.processoSeletivoTitulo}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {insc.numeroInscricao}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Código Anônimo:</span>
                        <span className="font-mono font-bold text-emerald-800">{insc.codigoAnonimo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Barema Provisório:</span>
                        <span className="font-bold text-blue-900">
                          {Number(insc.pontuacaoProvisoriaBarema).toFixed(2)} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInscricaoEmVisualizacao(insc)}
                          className="text-blue-800 hover:text-blue-950 font-semibold underline text-[11px]"
                        >
                          Ver Extrato Barema
                        </button>
                        {(() => {
                          const p = processos.find((pr) => pr.id === insc.processoSeletivoId);
                          const podeEditar = p && Date.now() <= new Date(p.fimInscricoes).getTime();
                          if (!podeEditar) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => handleEditarInscricao(insc)}
                              className="text-amber-800 hover:text-amber-950 font-semibold underline text-[11px]"
                            >
                              ✎ Retificar Barema
                            </button>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const p = processos.find((pr) => pr.id === insc.processoSeletivoId);
                          if (!p) return null;
                          const agora = Date.now();
                          const ini = new Date(p.inicioProvas).getTime();
                          const fim = new Date(p.fimProvas).getTime();
                          if (agora < ini) {
                            return (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-200">
                                ⏳ Prova em {new Date(p.inicioProvas).toLocaleDateString("pt-BR")}
                              </span>
                            );
                          }
                          if (agora > fim) {
                            return (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold border border-slate-200">
                                🔒 Encerrada
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                              🟢 Aberta
                            </span>
                          );
                        })()}
                        <a
                          href={`/candidato/prova?inscricaoId=${encodeURIComponent(
                            insc.id
                          )}&processoSeletivoId=${encodeURIComponent(
                            insc.processoSeletivoId
                          )}&trilhaId=${encodeURIComponent(insc.trilhaId)}`}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] shadow-sm"
                        >
                          Acessar Web IDE →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SEÇÃO 2: LISTAGEM DE PROCESSOS SELETIVOS DISPONÍVEIS COM FILTROS */}
        {!processoSelecionado && !inscricaoConcluida && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Processos Seletivos</h2>
                <p className="text-xs text-slate-500">
                  Selecione um processo seletivo para ingressar em uma das trilhas técnicas disponíveis.
                </p>
              </div>

              {/* Filtro: Padrão apenas prazos abertos, com opção para mostrar todos */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 p-1 rounded-lg text-xs font-semibold shadow-sm">
                <button
                  type="button"
                  onClick={() => setFiltroPrazo("ABERTOS")}
                  className={`px-3 py-1 rounded-md transition ${
                    filtroPrazo === "ABERTOS"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Prazos Abertos ({contagemAbertos})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroPrazo("TODOS")}
                  className={`px-3 py-1 rounded-md transition ${
                    filtroPrazo === "TODOS"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Todos os Processos ({listaProcessos.length})
                </button>
              </div>
            </div>

            {processosFiltrados.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                {filtroPrazo === "ABERTOS" ? (
                  <div>
                    <p className="font-semibold text-slate-700">Não há nenhum Processo Seletivo com inscrições abertas no momento.</p>
                    <button
                      onClick={() => setFiltroPrazo("TODOS")}
                      className="mt-2 text-xs text-blue-800 hover:underline font-bold"
                    >
                      Clique para visualizar todos os processos cadastrados
                    </button>
                  </div>
                ) : (
                  "Nenhum processo seletivo cadastrado no sistema."
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {processosFiltrados.map((proc) => {
                  const statusInscricao = obterStatusInscricaoProcesso(proc);
                  const inscricoesNoProcesso = mapaInscricoesPorProcesso[proc.id]?.trilhasIds || new Set();
                  const totalTrilhas = proc.trilhas.length;
                  const totalInscritas = inscricoesNoProcesso.size;
                  const inscritoEmTodasAsTrilhas = totalTrilhas > 0 && totalInscritas >= totalTrilhas;
                  const possuiAlgumaInscricao = totalInscritas > 0;

                  return (
                    <div
                      key={proc.id}
                      className={`bg-white rounded-xl border p-6 shadow-sm transition space-y-4 ${
                        inscritoEmTodasAsTrilhas
                          ? "border-slate-300 bg-slate-50/40"
                          : possuiAlgumaInscricao
                          ? "border-emerald-300 ring-1 ring-emerald-200"
                          : "border-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded uppercase">
                              {proc.edital}
                            </span>
                            {statusInscricao === "ABERTO" && (
                              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Inscrições Abertas
                              </span>
                            )}
                            {statusInscricao === "ENCERRADO" && (
                              <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Prazo de Inscrição Encerrado
                              </span>
                            )}
                            {statusInscricao === "NAO_INICIADO" && (
                              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                Inscrições em Breve
                              </span>
                            )}
                            {possuiAlgumaInscricao && (
                              <span className="text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                                ✓ Inscrito ({totalInscritas}/{totalTrilhas} trilha{totalTrilhas > 1 ? "s" : ""})
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mt-1">{proc.titulo}</h3>
                        </div>

                        <div>
                          {inscritoEmTodasAsTrilhas ? (
                            <button
                              disabled
                              title="Você já está inscrito em todas as trilhas técnicas deste Processo Seletivo"
                              className="px-4 py-2 bg-slate-200 text-slate-500 cursor-not-allowed text-xs font-bold rounded-lg"
                            >
                              Já inscrito em todas as trilhas
                            </button>
                          ) : statusInscricao === "ENCERRADO" ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-slate-200 text-slate-400 cursor-not-allowed text-xs font-bold rounded-lg"
                            >
                              Prazo Encerrado
                            </button>
                          ) : statusInscricao === "NAO_INICIADO" ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-slate-200 text-slate-400 cursor-not-allowed text-xs font-bold rounded-lg"
                            >
                              Inscrições em Breve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelecionarProcesso(proc)}
                              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-sm"
                            >
                              {possuiAlgumaInscricao ? "Inscrever-se em Outra Trilha" : "Inscrever-se"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-700 block">Período de Inscrição:</span>
                          <span className="text-slate-600">
                            {new Date(proc.inicioInscricoes).toLocaleDateString("pt-BR")} até{" "}
                            {new Date(proc.fimInscricoes).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 block">Desafios Práticos:</span>
                          <span className="text-slate-600">
                            {new Date(proc.inicioProvas).toLocaleDateString("pt-BR")} até{" "}
                            {new Date(proc.fimProvas).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 block">Pesos & Corte:</span>
                          <span className="text-slate-600">
                            Técnica {proc.pesoProvaTecnica}% | Barema {proc.pesoBaremaCurricular}% (Corte {proc.notaCorteMinima})
                          </span>
                        </div>
                      </div>

                      {/* Lista de Trilhas com indicador visual se o candidato já está inscrito */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-semibold text-slate-600">Trilhas disponíveis:</span>
                        {proc.trilhas.map((t) => {
                          const estaInscritoNestaTrilha = inscricoesNoProcesso.has(t.id);
                          return estaInscritoNestaTrilha ? (
                            <span
                              key={t.id}
                              className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-md font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <span className="text-emerald-700">✓</span> {t.nome}{" "}
                              <span className="text-[10px] text-emerald-700 font-normal">(Inscrito)</span>
                            </span>
                          ) : (
                            <span
                              key={t.id}
                              className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md font-medium"
                            >
                              {t.nome}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Formulário Dinâmico de Inscrição e Barema */}
        {processoSelecionado && !inscricaoConcluida && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6"
          >
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  {processoSelecionado.edital}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {inscricaoEmEdicao ? "Retificar Inscrição e Documentos do Barema" : "Inscrição e Barema Curricular"}
                </h2>
                <p className="text-xs text-slate-500">
                  {inscricaoEmEdicao
                    ? `Retificando inscrição nº ${inscricaoEmEdicao.numeroInscricao} (Trilha: ${inscricaoEmEdicao.trilhaNome})`
                    : "Selecione sua Trilha e informe os títulos para o cômputo da pontuação preliminar."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProcessoSelecionado(null);
                  setInscricaoEmEdicao(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Voltar à Lista
              </button>
            </div>

            {mensagemErro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md font-medium">
                {mensagemErro}
              </div>
            )}

            {!candidatoAutenticado && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                Sessão não encontrada.{" "}
                <a href="/login?redirect=%2Fcandidato%2Finscricao" className="font-semibold underline">
                  Faça login
                </a>{" "}
                para se inscrever.
              </div>
            )}

            {/* Se Candidato Autenticado */}
            {candidatoAutenticado && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs flex items-center justify-between text-blue-900">
                <div>
                  Conectado como <strong>{candidatoAutenticado.nome}</strong> (CPF: {candidatoAutenticado.cpf})
                </div>
              </div>
            )}

            {/* Seleção da Trilha Técnica */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                2. Escolha da Trilha Técnica
              </h3>
              <div>
                <label htmlFor="trilha" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Trilha Técnica de Conhecimento *
                </label>
                <select
                  id="trilha"
                  value={trilhaId}
                  disabled={!!inscricaoEmEdicao}
                  onChange={(e) => setTrilhaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-800 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
                >
                  {processoSelecionado.trilhas.map((t) => {
                    const trilhasJaInscritas = mapaInscricoesPorProcesso[processoSelecionado.id]?.trilhasIds || new Set();
                    const jaInscritoNesta = !inscricaoEmEdicao && trilhasJaInscritas.has(t.id);
                    return (
                      <option key={t.id} value={t.id} disabled={jaInscritoNesta}>
                        {t.nome} {jaInscritoNesta ? "— (Você já está inscrito nesta trilha)" : t.descricao ? `— ${t.descricao}` : ""}
                      </option>
                    );
                  })}
                </select>
                {!inscricaoEmEdicao && mapaInscricoesPorProcesso[processoSelecionado.id]?.trilhasIds.has(trilhaId) && (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    Aviso: Você já está inscrito na trilha selecionada. Selecione outra opção para prosseguir.
                  </p>
                )}
              </div>
            </div>

            {/* Matriz do Barema e Comprovantes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    3. Barema Curricular e Documentos Comprobatórios
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha a quantidade ou anos de cada critério e anexe o comprovante em PDF.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Pontuação Preliminar Estimada:</span>
                  <span className="text-base font-extrabold text-blue-900">
                    {pontuacaoAtual.toFixed(2)} / 100 pts
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {processoSelecionado.barema.map((criterio) => {
                  const item = itensBarema[criterio.id] || { quantidade: 0, arquivoNome: "" };
                  const pontosItem = Math.min(
                    item.quantidade * criterio.pontuacaoUnitaria,
                    criterio.pontuacaoMaxima
                  );

                  return (
                    <div
                      key={criterio.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase">{criterio.tipo}</span>
                          <h4 className="text-sm font-bold text-slate-900">{criterio.descricao}</h4>
                          <span className="text-xs text-slate-600">
                            Valor: {criterio.pontuacaoUnitaria} pt(s) por unidade | Teto máximo: {criterio.pontuacaoMaxima} pts
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded">
                          Item: {pontosItem.toFixed(2)} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label htmlFor={`input-${criterio.id}`} className="block text-xs font-medium text-slate-700 mb-1">
                            {criterio.permiteMultiplos ? "Quantidade ou Anos declarados:" : "Possui este título? (1 para Sim, 0 para Não):"}
                          </label>
                          <input
                            id={`input-${criterio.id}`}
                            aria-label={criterio.descricao}
                            type="number"
                            min="0"
                            max={criterio.permiteMultiplos ? 50 : 1}
                            value={item.quantidade}
                            onChange={(e) => handleQuantidadeChange(criterio.id, Number(e.target.value))}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label htmlFor={`doc-${criterio.id}`} className="block text-xs font-medium text-slate-700 mb-1">
                            Documento Comprobatório (PDF) {item.quantidade > 0 && <span className="text-red-500">*</span>}:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`doc-${criterio.id}`}
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => handleFileChangeInput(criterio.id, e)}
                              className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {item.arquivoNome && (
                              <span className="text-xs text-slate-600 font-mono truncate max-w-[150px]">
                                {item.arquivoNome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setProcessoSelecionado(null);
                  setInscricaoEmEdicao(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || (!inscricaoEmEdicao && mapaInscricoesPorProcesso[processoSelecionado.id]?.trilhasIds.has(trilhaId))}
                className="px-6 py-2.5 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition"
              >
                {enviando ? "Processando..." : (inscricaoEmEdicao ? "Salvar Retificações do Barema" : "Confirmar e Submeter Inscrição")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
