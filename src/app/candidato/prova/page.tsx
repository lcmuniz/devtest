import React from "react";
import Link from "next/link";
import { getRepository as getPsRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";
import { getSubmissaoRepository } from "@/infrastructure/repositories/submissao-repository";
import {
  getCandidatoRepository,
  InscricaoEntity,
} from "@/infrastructure/repositories/candidato-repository";
import { sanitizarDesafioParaCandidato } from "@/domain/desafio/desafio";
import { sanitizarResultadoRunnerParaCandidato } from "@/domain/runner/runner-contract";
import {
  embaralharDesafiosPorCandidato,
  verificarJanelaDeProvaAtiva,
} from "@/domain/prova/ambiente-prova";
import { ProvaWebIdeView } from "@/components/candidato/ProvaWebIdeView";
import { obterSessaoServidor } from "@/infrastructure/auth/session-server";

export const dynamic = "force-dynamic";

export default async function ProvaCandidatoPage({
  searchParams,
}: {
  searchParams: Promise<{ inscricaoId?: string; processoSeletivoId?: string; trilhaId?: string }>;
}) {
  const params = await searchParams;
  const sessao = await obterSessaoServidor();
  const psRepo = getPsRepository();
  const desafioRepo = getDesafioRepository();
  const submissaoRepo = getSubmissaoRepository();
  const candRepo = getCandidatoRepository();

  // Candidato só faz a prova da própria inscrição
  let inscricaoAtiva: InscricaoEntity | null = null;
  if (sessao) {
    if (params.inscricaoId) {
      const insc = await candRepo.buscarInscricaoPorId(params.inscricaoId);
      inscricaoAtiva = insc && insc.candidatoId === sessao.id ? insc : null;
    } else {
      const inscricoes = await candRepo.buscarInscricoesPorCandidato(sessao.id);
      inscricaoAtiva =
        (params.processoSeletivoId
          ? inscricoes.find((i) => i.processoSeletivoId === params.processoSeletivoId)
          : inscricoes[0]) ?? null;
    }
  }

  const processoAtivo = inscricaoAtiva
    ? await psRepo.findById(inscricaoAtiva.processoSeletivoId)
    : null;

  if (!inscricaoAtiva || !processoAtivo) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">Nenhuma inscrição encontrada</h1>
          <p className="text-sm text-slate-400">
            Inscreva-se em um Processo Seletivo para acessar a prova técnica.
          </p>
          <Link
            href="/candidato/inscricao"
            className="inline-block bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg"
          >
            Ir para Minhas Inscrições
          </Link>
        </div>
      </main>
    );
  }

  // Verifica se a janela de prova está ativa para o processo seletivo
  const janela = verificarJanelaDeProvaAtiva(processoAtivo);
  if (!janela.ativa) {
    const inicioFmt = new Date(processoAtivo.inicioProvas).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const fimFmt = new Date(processoAtivo.fimProvas).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const agora = new Date();
    const aindaNaoIniciou = agora < new Date(processoAtivo.inicioProvas);

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
            {aindaNaoIniciou ? "⏳" : "🔒"}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">
              {aindaNaoIniciou
                ? "Prova Técnica Ainda Não Iniciada"
                : "Período de Provas Encerrado"}
            </h1>
            <p className="text-xs text-slate-400">
              {processoAtivo.titulo} — Trilha{" "}
              <strong className="text-slate-200">{inscricaoAtiva.trilhaNome}</strong>
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 text-left space-y-2">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Início da Prova:</span>
              <span className="font-semibold text-emerald-400">{inicioFmt}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Término da Prova:</span>
              <span className="font-semibold text-rose-400">{fimFmt}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Status Atual:</span>
              <span className="font-semibold text-amber-400">
                {aindaNaoIniciou ? "Aguardando abertura" : "Encerrada"}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {aindaNaoIniciou
              ? "O ambiente de prova (Web IDE) e os enunciados dos desafios só ficarão disponíveis a partir da data e hora de início. Retorne ao painel para acompanhar sua inscrição."
              : "O prazo para resolução e submissão dos desafios expirou. Você pode acompanhar a homologação e notas pelo painel de inscrições."}
          </p>

          <div className="pt-2">
            <Link
              href="/candidato/inscricao"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
            >
              Voltar para Minhas Inscrições
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const inscricaoId = inscricaoAtiva.id;

  const [desafiosCompletos, submissoesBrutas] = await Promise.all([
    desafioRepo.findAll({
      processoSeletivoId: processoAtivo.id,
      trilhaId: params.trilhaId || inscricaoAtiva.trilhaId,
    }),
    submissaoRepo.findAll({
      inscricaoId,
      processoSeletivoId: processoAtivo.id,
    }),
  ]);

  const sementeEmbaralhamento = inscricaoAtiva.codigoAnonimo || inscricaoAtiva.id;

  const desafiosOrdenados = embaralharDesafiosPorCandidato(
    desafiosCompletos,
    sementeEmbaralhamento
  );

  const desafiosPublicos = desafiosOrdenados.map(sanitizarDesafioParaCandidato);
  const submissoesIniciais = submissoesBrutas.map((s) => ({
    ...s,
    relatorioExecucao: sanitizarResultadoRunnerParaCandidato(s.relatorioExecucao),
  }));

  return (
    <ProvaWebIdeView
      inscricaoId={inscricaoId}
      processoSeletivo={processoAtivo}
      desafios={desafiosPublicos}
      submissoesIniciais={submissoesIniciais}
    />
  );
}
