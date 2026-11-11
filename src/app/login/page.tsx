import React from "react";
import { LoginView } from "@/components/auth/LoginView";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erro?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginView
      redirectInicial={params.redirect}
      erroInicial={params.erro}
    />
  );
}
