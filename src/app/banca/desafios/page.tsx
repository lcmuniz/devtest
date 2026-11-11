import React from "react";
import { getDesafioRepository } from "@/infrastructure/repositories/desafio-repository";
import { DesafiosBancaView } from "@/components/banca/DesafiosBancaView";

export const dynamic = "force-dynamic";

export default async function DesafiosBancaPage() {
  const desafioRepo = getDesafioRepository();
  const desafiosIniciais = await desafioRepo.findAll();

  return <DesafiosBancaView desafiosIniciais={desafiosIniciais} />;
}
