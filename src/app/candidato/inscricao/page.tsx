import React from "react";
import { getRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getCandidatoRepository, InscricaoEntity } from "@/infrastructure/repositories/candidato-repository";
import { obterSessaoServidor } from "@/infrastructure/auth/session-server";
import { InscricaoCandidatoView } from "@/components/candidato/InscricaoCandidatoView";

export const dynamic = "force-dynamic";

export default async function InscricaoCandidatoPage() {
  const repository = getRepository();
  const processos = await repository.findAll();

  const sessao = await obterSessaoServidor();
  let candidatoInicial: { id: string; nome: string; email: string; cpf: string } | null = null;
  let inscricoesIniciais: InscricaoEntity[] = [];

  if (sessao && sessao.perfil === "CANDIDATO") {
    candidatoInicial = {
      id: sessao.id,
      nome: sessao.nome,
      email: sessao.email,
      cpf: sessao.cpf || "",
    };
    try {
      const candRepo = getCandidatoRepository();
      inscricoesIniciais = await candRepo.buscarInscricoesPorCandidato(sessao.id);
    } catch {
      inscricoesIniciais = [];
    }
  }

  return (
    <InscricaoCandidatoView
      processos={processos}
      candidatoInicial={candidatoInicial}
      inscricoesIniciais={inscricoesIniciais}
    />
  );
}
