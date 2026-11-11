import { NextResponse } from "next/server";
import { getDbPool, ensureSchemaInitialized } from "@/infrastructure/database/db";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import {
  COOKIE_SESSAO_NOME,
  gerarTokenSessao,
  PerfilUsuario,
  SessaoUsuario,
} from "@/domain/auth/autenticacao-rbac";
import {
  extrairIpCliente,
  formatarHeadersRateLimit,
  getLoginRateLimiter,
} from "@/domain/seguranca/rate-limit";
import { verificarSenha } from "@/domain/auth/senha";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identificador = (
      body.identificador ||
      body.cpfOuEmail ||
      body.email ||
      ""
    )
      .toString()
      .trim();
    const senha = (body.senha || "").toString();
    const perfil: PerfilUsuario =
      body.perfil === "BANCA_AVALIADORA" ? "BANCA_AVALIADORA" : "CANDIDATO";

    if (!identificador || senha.length < 3) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Informe seu e-mail/CPF e senha para autenticar.",
        },
        { status: 400 }
      );
    }

    // Rate Limiting anti-força bruta por IP e identificador (5 tentativas por minuto)
    const ip = extrairIpCliente(request);
    const chaveLimit = `login:${ip}:${identificador.toLowerCase()}`;
    const loginLimiter = getLoginRateLimiter();
    const resRateLimit = loginLimiter.consumir(chaveLimit, {
      limiteMaximo: 5,
      janelaSegundos: 60,
    });

    const headersRateLimit = formatarHeadersRateLimit({
      limiteMaximo: 5,
      resultado: resRateLimit,
    });

    if (!resRateLimit.permitido) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: `Muitas tentativas de login consecutivas. Por favor, aguarde ${resRateLimit.tempoEsperaSegundos} segundos antes de tentar novamente.`,
        },
        { status: 429, headers: headersRateLimit }
      );
    }

    let sessao: SessaoUsuario | null = null;

    if (perfil === "BANCA_AVALIADORA") {
      await ensureSchemaInitialized();
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT * FROM usuarios_banca WHERE LOWER(email) = LOWER($1) LIMIT 1` ,
        [identificador]
      );

      if (res.rows.length === 0) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: "Credenciais inválidas. Membro da Banca não encontrado.",
          },
          { status: 401, headers: headersRateLimit }
        );
      }

      const row = res.rows[0];
      if (!(await verificarSenha(senha, row.senha_hash))) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: "Credenciais inválidas. Senha incorreta para a Banca Avaliadora.",
          },
          { status: 401, headers: headersRateLimit }
        );
      }

      sessao = {
        id: row.id,
        nome: row.nome,
        email: row.email,
        perfil: "BANCA_AVALIADORA",
        expiraEm: Date.now() + 1000 * 60 * 60 * 12, // 12h
      };
    } else {
      const repo = getCandidatoRepository();
      const candidato = await repo.buscarCandidatoPorCpfOuEmail(identificador);

      if (!candidato) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: "Credenciais inválidas. Candidato não encontrado.",
          },
          { status: 401, headers: headersRateLimit }
        );
      }

      if (!(await verificarSenha(senha, candidato.senhaHash))) {
        return NextResponse.json(
          {
            sucesso: false,
            erro: "Credenciais inválidas. Senha incorreta.",
          },
          { status: 401, headers: headersRateLimit }
        );
      }

      sessao = {
        id: candidato.id,
        nome: candidato.nome,
        email: candidato.email,
        cpf: candidato.cpf,
        perfil: "CANDIDATO",
        expiraEm: Date.now() + 1000 * 60 * 60 * 12, // 12h
      };
    }

    // Login bem-sucedido: limpa o contador de tentativas
    loginLimiter.resetarChave(chaveLimit);

    const token = await gerarTokenSessao(sessao);
    const response = NextResponse.json({
      sucesso: true,
      usuario: sessao,
      token,
    });

    response.cookies.set(COOKIE_SESSAO_NOME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: error?.message || "Erro interno ao autenticar usuário.",
      },
      { status: 500 }
    );
  }
}
