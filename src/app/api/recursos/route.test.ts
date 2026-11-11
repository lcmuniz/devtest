import { beforeEach, describe, expect, it } from "vitest";
import { POST as POST_DESMASCARAR } from "../banca/processos-seletivos/[id]/desmascarar/route";
import { GET as GET_RANKING } from "../banca/ranking/route";
import { GET as GET_ESPELHO } from "../candidato/espelho/route";
import { GET as GET_RECURSOS, POST as POST_RECURSO } from "./route";
import { cabecalhosSessao } from "@/infrastructure/auth/sessao-teste";
import { PATCH as PATCH_JULGAR } from "../banca/recursos/[id]/julgar/route";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  getCandidatoRepository,
  resetCandidatoRepository,
} from "@/infrastructure/repositories/candidato-repository";
import {
  getDesafioRepository,
  resetDesafioRepository,
} from "@/infrastructure/repositories/desafio-repository";
import {
  getSubmissaoRepository,
  resetSubmissaoRepository,
} from "@/infrastructure/repositories/submissao-repository";
import { resetRecursoRepository } from "@/infrastructure/repositories/recurso-repository";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";
import { LinguagemDesafio } from "@/domain/desafio/desafio";

describe("Fluxo de Ponta a Ponta: Desmascaramento, Espelho Individual e Julgamento de Recursos (Issue 08)", () => {
  let processoId = "";
  let trilhaId = "";
  let criterioPosId = "";
  let desafioId = "";
  let cand1Id = "";
  let cand2Id = "";
  let insc1Id = "";
  let insc2Id = "";

  beforeEach(async () => {
    await resetRecursoRepository();
    await resetSubmissaoRepository();
    await resetDesafioRepository();
    await resetCandidatoRepository();
    const psRepo = getProcessoSeletivoRepository();
    await psRepo.reset();

    const ps = await psRepo.create({
      titulo: "Seletivo DevTest Homologação 2026",
      edital: "Edital 02/2026",
      inicioInscricoes: "2026-01-01T00:00:00.000Z",
      fimInscricoes: "2026-12-01T00:00:00.000Z",
      inicioProvas: "2026-01-01T00:00:00.000Z",
      fimProvas: "2026-12-31T23:59:59.000Z",
      pesoProvaTecnica: 70,
      pesoBaremaCurricular: 30,
      notaCorteMinima: 60,
      trilhas: [{ nome: "Engenharia Backend", descricao: "APIs" }],
      barema: [
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização em Engenharia de Software",
          pontuacaoUnitaria: 40,
          pontuacaoMaxima: 40,
          permiteMultiplos: false,
          exigeComprovante: true,
        },
      ],
    });
    processoId = ps.id;
    trilhaId = ps.trilhas[0].id;
    criterioPosId = ps.barema[0].id;

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.create({
      processoSeletivoId: processoId,
      trilhaId,
      titulo: "Desafio API",
      enunciadoMarkdown: "Implemente a função",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate: "export function f() { return 1; }",
      suiteTestesPublicos: "if (f()!==1) process.exit(1);",
      suiteTestesOcultos: "if (f()!==1) process.exit(1);",
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });
    desafioId = desafio.id;

    const candRepo = getCandidatoRepository();
    const cand1 = await candRepo.criarCandidato({
      nome: "Helena Martins",
      email: "helena@devtest.com",
      cpf: "52998224725",
      senha: "password123",
    });
    const cand2 = await candRepo.criarCandidato({
      nome: "Igor Vasconcelos",
      email: "igor@devtest.com",
      cpf: "11144477735",
      senha: "password123",
    });
    cand1Id = cand1.id;
    cand2Id = cand2.id;

    // Helena: Técnica 80, Barema Homologado 0 (Glosado inicialmente) -> Final = 80*0.7 + 0*0.3 = 56.0
    const insc1 = await candRepo.criarInscricao({
      candidatoId: cand1.id,
      candidatoNome: cand1.nome,
      candidatoEmail: cand1.email,
      candidatoCpf: cand1.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId,
      trilhaNome: "Engenharia Backend",
      itensBarema: [
        {
          criterioId: criterioPosId,
          quantidadeOuAnos: 1,
          arquivoComprovanteNome: "pos_helena.pdf",
        },
      ],
      pontuacaoProvisoriaBarema: 40,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 40,
        itensDetalhados: [],
      },
    });
    insc1Id = insc1.id;
    await candRepo.atualizarAuditoriaBarema(insc1Id, {
      pontuacaoHomologadaBarema: 0,
      statusAuditoriaBarema: "AUDITADO",
      auditoriaBarema: [
        {
          criterioId: criterioPosId,
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Especialização em Engenharia de Software",
          quantidadeOuAnos: 1,
          pontuacaoUnitaria: 40,
          pontuacaoMaxima: 40,
          pontosProvisorios: 40,
          pontosHomologados: 0,
          statusAuditoria: "GLOSADO",
          motivoGlosa: "Assinatura digital não localizada na página 1.",
          arquivoComprovanteNome: "pos_helena.pdf",
        },
      ],
    });

    // Igor: Técnica 82, Barema Homologado 20 -> Final = 82*0.7 + 20*0.3 = 57.4 + 6.0 = 63.4
    const insc2 = await candRepo.criarInscricao({
      candidatoId: cand2.id,
      candidatoNome: cand2.nome,
      candidatoEmail: cand2.email,
      candidatoCpf: cand2.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId,
      trilhaNome: "Engenharia Backend",
      itensBarema: [],
      pontuacaoProvisoriaBarema: 20,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 20,
        itensDetalhados: [],
      },
    });
    insc2Id = insc2.id;

    const subRepo = getSubmissaoRepository();
    await subRepo.create({
      inscricaoId: insc1Id,
      processoSeletivoId: processoId,
      desafioId,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export function f() { return 1; }",
      statusExecucao: "SUCCESS",
      notaCorretude: 60,
      notaQualidade: 10,
      notaDesempenho: 10,
      notaTecnicaTotal: 80,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 30,
        memoryPeakKb: 16000,
        testResults: [],
        linterScore: 95,
      },
    });

    await subRepo.create({
      inscricaoId: insc2Id,
      processoSeletivoId: processoId,
      desafioId,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export function f() { return 1; }",
      statusExecucao: "SUCCESS",
      notaCorretude: 62,
      notaQualidade: 10,
      notaDesempenho: 10,
      notaTecnicaTotal: 82,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 28,
        memoryPeakKb: 15000,
        testResults: [],
        linterScore: 95,
      },
    });
  });

  it("executa o ciclo completo: desmascaramento pela banca, acesso restrito ao espelho, submissão e julgamento de recurso com recálculo do ranking", async () => {
    // 1. Antes do desmascaramento, o ranking deve estar em Correção Cega
    const resCego = await GET_RANKING(
      new Request(`http://localhost:3000/api/banca/ranking?processoSeletivoId=${processoId}`)
    );
    const bodyCego = await resCego.json();
    expect(bodyCego.modoCorrecaoCega).toBe(true);
    expect(JSON.stringify(bodyCego)).not.toContain("Helena Martins");

    // 2. Banca encerra formalmente a etapa anônima (desmascaramento) e abre janela de recursos
    const resDesmascarar = await POST_DESMASCARAR(
      new Request(
        `http://localhost:3000/api/banca/processos-seletivos/${processoId}/desmascarar`,
        { method: "POST" }
      ),
      { params: Promise.resolve({ id: processoId }) }
    );
    expect(resDesmascarar.status).toBe(200);

    // Agora o ranking revela os nomes dos candidatos aprovados
    const resRevelado = await GET_RANKING(
      new Request(`http://localhost:3000/api/banca/ranking?processoSeletivoId=${processoId}`)
    );
    const bodyRevelado = await resRevelado.json();
    expect(bodyRevelado.modoCorrecaoCega).toBe(false);
    expect(JSON.stringify(bodyRevelado)).toContain("Helena Martins");
    expect(JSON.stringify(bodyRevelado)).toContain("Igor Vasconcelos");

    // Inicialmente Igor (63.4) está em 1º e Helena (56.0) está em 2º
    expect(bodyRevelado.ranking[0].inscricaoId).toBe(insc2Id);
    expect(bodyRevelado.ranking[1].inscricaoId).toBe(insc1Id);

    // 3. Candidato Igor tenta acessar o Espelho de Avaliação de Helena -> 403 Forbidden
    const resInvasao = await GET_ESPELHO(
      new Request(
        `http://localhost:3000/api/candidato/espelho?inscricaoId=${insc1Id}&candidatoId=${cand2Id}`,
        { headers: await cabecalhosSessao(cand2Id) }
      )
    );
    expect(resInvasao.status).toBe(403);

    // 3b. Igor forja o candidatoId de Helena na query -> 403 (sessão manda)
    const resForjado = await GET_ESPELHO(
      new Request(
        `http://localhost:3000/api/candidato/espelho?inscricaoId=${insc1Id}&candidatoId=${cand1Id}`,
        { headers: await cabecalhosSessao(cand2Id) }
      )
    );
    expect(resForjado.status).toBe(403);

    // 3c. Igor tenta listar os recursos da inscrição de Helena -> 403
    const resRecursosAlheios = await GET_RECURSOS(
      new Request(`http://localhost:3000/api/recursos?inscricaoId=${insc1Id}`, {
        headers: await cabecalhosSessao(cand2Id),
      })
    );
    expect(resRecursosAlheios.status).toBe(403);

    // 4. Helena acessa seu próprio Espelho de Avaliação -> 200 OK
    const resEspelho = await GET_ESPELHO(
      new Request(
        `http://localhost:3000/api/candidato/espelho?inscricaoId=${insc1Id}&candidatoId=${cand1Id}`,
        { headers: await cabecalhosSessao(cand1Id) }
      )
    );
    expect(resEspelho.status).toBe(200);
    const espelhoBody = await resEspelho.json();
    expect(espelhoBody.espelho.candidatoNome).toBe("Helena Martins");
    expect(espelhoBody.espelho.posicaoRanking).toBe(2);
    expect(espelhoBody.espelho.notaFinalConsolidada).toBe(56);
    expect(espelhoBody.espelho.barema.itens[0].motivoGlosa).toContain(
      "Assinatura digital"
    );

    // 5. Helena interpõe recurso contra a glosa do Barema
    const resRecurso = await POST_RECURSO(
      new Request(`http://localhost:3000/api/recursos`, {
        method: "POST",
        headers: await cabecalhosSessao(cand1Id),
        body: JSON.stringify({
          inscricaoId: insc1Id,
          candidatoId: cand1Id,
          alvoContestacao: "BAREMA",
          fundamentacao:
            "A assinatura ICP-Brasil consta no manifesto anexo na página 2 do PDF enviado.",
        }),
      })
    );
    expect(resRecurso.status).toBe(201);
    const recursoCriado = await resRecurso.json();
    expect(recursoCriado.status).toBe("EM_ANALISE");

    // 6. Banca lista recursos do processo e defere o recurso de Helena ajustando Barema para 40 pts
    const resListaRecursos = await GET_RECURSOS(
      new Request(`http://localhost:3000/api/recursos?processoSeletivoId=${processoId}`, {
        headers: await cabecalhosSessao("banca-teste", "BANCA_AVALIADORA"),
      })
    );
    const listaBody = await resListaRecursos.json();
    expect(listaBody.recursos).toHaveLength(1);

    const resJulgar = await PATCH_JULGAR(
      new Request(
        `http://localhost:3000/api/banca/recursos/${recursoCriado.id}/julgar`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decisao: "DEFERIDO",
            parecerBanca:
              "Recurso deferido após validação do manifesto ICP-Brasil na página 2 do certificado.",
            novaPontuacaoAlvo: 40,
          }),
        }
      ),
      { params: Promise.resolve({ id: recursoCriado.id }) }
    );
    expect(resJulgar.status).toBe(200);

    // 7. Ranking recalculado automaticamente: Helena agora tem Barema 40 -> Final = 80*0.7 + 40*0.3 = 68.0 (1º lugar!)
    const resRankingFinal = await GET_RANKING(
      new Request(`http://localhost:3000/api/banca/ranking?processoSeletivoId=${processoId}`)
    );
    const bodyRankingFinal = await resRankingFinal.json();
    expect(bodyRankingFinal.ranking[0].inscricaoId).toBe(insc1Id);
    expect(bodyRankingFinal.ranking[0].posicaoRanking).toBe(1);
    expect(bodyRankingFinal.ranking[0].notaFinalConsolidada).toBe(68);
    expect(bodyRankingFinal.ranking[1].inscricaoId).toBe(insc2Id);
    expect(bodyRankingFinal.ranking[1].posicaoRanking).toBe(2);
  });
});
