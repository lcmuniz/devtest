import type { Metadata } from "next";
import "./globals.css";
import { obterSessaoServidor } from "@/infrastructure/auth/session-server";
import { BarraSessaoGlobal } from "@/components/auth/BarraSessaoGlobal";

export const metadata: Metadata = {
  title: "DevTest • Plataforma de Avaliação Técnica",
  description:
    "DevTest - Plataforma de Avaliação Técnica Prática e Gestão de Processos Seletivos",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessaoServidor();

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 antialiased min-h-screen text-slate-800">
        <BarraSessaoGlobal sessaoInicial={sessao} />
        {children}
      </body>
    </html>
  );
}
