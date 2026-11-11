import {
  COOKIE_SESSAO_NOME,
  gerarTokenSessao,
  PerfilUsuario,
} from "@/domain/auth/autenticacao-rbac";

/** Só para testes: cabeçalhos com cookie de sessão válido para chamar rotas protegidas. */
export async function cabecalhosSessao(
  id: string,
  perfil: PerfilUsuario = "CANDIDATO"
): Promise<Record<string, string>> {
  const token = await gerarTokenSessao({
    id,
    nome: "Teste",
    email: `${id}@teste.local`,
    perfil,
    expiraEm: Date.now() + 3600_000,
  });
  return {
    "Content-Type": "application/json",
    Cookie: `${COOKIE_SESSAO_NOME}=${token}`,
  };
}
