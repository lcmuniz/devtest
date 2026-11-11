import { NextResponse } from "next/server";
import { CandidatoSchema } from "@/domain/candidato/candidato-barema";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parse = CandidatoSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          sucesso: false,
          erros: parse.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const repo = getCandidatoRepository();

    // Validação estrita de unicidade de e-mail
    const emailExistente = await repo.buscarCandidatoPorEmail(parse.data.email);
    if (emailExistente) {
      return NextResponse.json(
        { sucesso: false, erro: "Já existe um candidato cadastrado com este e-mail." },
        { status: 409 }
      );
    }

    // Validação estrita de unicidade de CPF
    const cpfExistente = await repo.buscarCandidatoPorCpf(parse.data.cpf);
    if (cpfExistente) {
      return NextResponse.json(
        { sucesso: false, erro: "Já existe um candidato cadastrado com este CPF." },
        { status: 409 }
      );
    }

    const candidato = await repo.criarCandidato(parse.data);

    return NextResponse.json(
      {
        sucesso: true,
        candidato,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || "Erro interno ao cadastrar candidato." },
      { status: 500 }
    );
  }
}
