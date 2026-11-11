import { NextResponse } from "next/server";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import { getRecursoRepository } from "@/infrastructure/repositories/recurso-repository";
import { getCandidatoRepository } from "@/infrastructure/repositories/candidato-repository";
import {
  gerarCsvAtaRecursos,
  gerarHtmlAtaRecursos,
  ItemRecursoRelatorio,
} from "@/domain/relatorio/relatorio";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const processoSeletivoId = url.searchParams.get("processoSeletivoId");
    const formato = url.searchParams.get("formato") || "csv";

    if (!processoSeletivoId) {
      return NextResponse.json(
        { error: "O parâmetro processoSeletivoId é obrigatório." },
        { status: 400 }
      );
    }

    const psRepo = getProcessoSeletivoRepository();
    const processo = await psRepo.findById(processoSeletivoId);
    if (!processo) {
      return NextResponse.json(
        { error: "Processo Seletivo não encontrado." },
        { status: 404 }
      );
    }

    const recRepo = getRecursoRepository();
    const candRepo = getCandidatoRepository();

    const [recursos, inscricoes] = await Promise.all([
      recRepo.findAll({ processoSeletivoId }),
      candRepo.buscarInscricoesPorProcesso(processoSeletivoId),
    ]);

    const inscricoesMap = new Map<string, (typeof inscricoes)[0]>();
    for (const i of inscricoes) {
      inscricoesMap.set(i.id, i);
    }

    const itensRelatorio: ItemRecursoRelatorio[] = recursos.map((rec) => {
      const insc = inscricoesMap.get(rec.inscricaoId);
      return {
        id: rec.id,
        codigoAnonimo: rec.codigoAnonimo,
        candidatoNome:
          processo.etapaAnonimaEncerrada && insc?.candidatoNome
            ? insc.candidatoNome
            : undefined,
        alvoContestacao: rec.alvoContestacao,
        fundamentacao: rec.fundamentacao,
        status: rec.status,
        parecerBanca: rec.parecerBanca,
        novaPontuacaoAlvo: rec.novaPontuacaoAlvo,
        dataSubmissao: rec.createdAt,
      };
    });

    if (formato === "html") {
      const html = gerarHtmlAtaRecursos({
        processoTitulo: processo.titulo,
        edital: processo.edital,
        recursos: itensRelatorio,
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const csv = gerarCsvAtaRecursos({
      processoTitulo: processo.titulo,
      edital: processo.edital,
      recursos: itensRelatorio,
    });

    const safeEdital = processo.edital.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="devtest-ata-recursos-${safeEdital}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao gerar relatório de recursos." },
      { status: 500 }
    );
  }
}
