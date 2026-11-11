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
import { embaralharDesafiosPorCandidato } from "@/domain/prova/ambiente-prova";
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

  const inscricaoId = inscricaoAtiva.id;

  const [desafiosCompletos, submissoesBrutas] = await Promise.all([
    desafioRepo.findAll({
      processoSeletivoId: processoAtivo.id,
      trilhaId: params.trilhaId,
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
