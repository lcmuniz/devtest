import React from "react";
import { getRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";
import { ProcessosSeletivosBanca } from "@/components/banca/ProcessosSeletivosBanca";

export const dynamic = "force-dynamic";

export default async function ProcessosSeletivosBancaPage() {
  const repository = getRepository();
  const desafioRepo = getDesafioRepository();

  const [processosIniciais, desafiosBanco] = await Promise.all([
    repository.findAll(),
    desafioRepo.findAll(),
  ]);

  return (
    <ProcessosSeletivosBanca
      processosIniciais={processosIniciais}
      desafiosBanco={desafiosBanco}
    />
  );
}
