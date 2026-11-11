import { beforeEach, describe, expect, it } from "vitest";
import { POST as POST_CONVOCAR } from "./convocar/route";
import { GET as GET_HISTORICO } from "./historico/route";
import { PATCH as PATCH_JULGAR } from "../recursos/[id]/julgar/route";
import { POST as POST_RECURSO } from "../../recursos/route";
import { getProcessoSeletivoRepository } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  getCandidatoRepository,
  resetCandidatoRepository,
} from "@/infrastructure/repositories/candidato-repository";
import {
  getSubmissaoRepository,
  resetSubmissaoRepository,
} from "@/infrastructure/repositories/submissao-repository";
import {
  getDesafioRepository,
  resetDesafioRepository,
} from "@/infrastructure/repositories/desafio-repository";
import {
  getRecursoRepository,
  resetRecursoRepository,
} from "@/infrastructure/repositories/recurso-repository";
import {
  getEmailService,
  resetEmailService,
} from "@/infrastructure/services/email-service";
import { LinguagemDesafio } from "@/domain/desafio/desafio";
import { TipoCriterioBarema } from "@/domain/processo-seletivo/processo-seletivo";

describe("API de Notificações e Comunicação da Banca (Convocação e Pareceres)", () => {
  let processoId = "";
  let trilhaId = "";
  let cand1Id = "";
  let insc1Id = "";

  beforeEach(async () => {
    resetEmailService();
    await resetRecursoRepository();
    await resetSubmissaoRepository();
    await resetDesafioRepository();
    await resetCandidatoRepository();
    const psRepo = getProcessoSeletivoRepository();
    await psRepo.reset();

    const ps = await psRepo.create({
      titulo: "Processo Seletivo DevTest Convocação 2026",
      edital: "03/2026",
      inicioInscricoes: "2026-11-01T00:00:00Z",
      fimInscricoes: "2026-11-30T23:59:59Z",
      inicioProvas: "2026-12-01T00:00:00Z",
      fimProvas: "2026-12-02T23:59:59Z",
      pesoProvaTecnica: 60,
      pesoBaremaCurricular: 40,
      notaCorteMinima: 50,
      trilhas: [{ nome: "Frontend React", descricao: "Next.js / TypeScript" }],
      barema: [
        {
          tipo: TipoCriterioBarema.ESPECIALIZACAO,
          descricao: "Pós-graduação em TI",
          pontuacaoUnitaria: 20,
          pontuacaoMaxima: 20,
        },
      ],
    });
    processoId = ps.id;
    trilhaId = ps.trilhas[0].id;

    const desafioRepo = getDesafioRepository();
    const desafio = await desafioRepo.create({
      processoSeletivoId: processoId,
      trilhaId,
      titulo: "Desafio React",
      enunciadoMarkdown: "Implemente",
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoTemplate: "export default function App() {}",
      suiteTestesPublicos: "assert true;",
      suiteTestesOcultos: "assert true;",
      timeoutSeconds: 5,
      memoryLimitMb: 256,
    });

    const candRepo = getCandidatoRepository();
    const c1 = await candRepo.criarCandidato({
      nome: "Lívia Castro",
      cpf: "12345678901",
      email: "livia.castro@devtest.org",
      senha: "password123",
    });
    cand1Id = c1.id;

    const insc1 = await candRepo.criarInscricao({
      candidatoId: c1.id,
      candidatoNome: c1.nome,
      candidatoEmail: c1.email,
      candidatoCpf: c1.cpf,
      processoSeletivoId: processoId,
      processoSeletivoTitulo: ps.titulo,
      trilhaId,
      trilhaNome: "Frontend React",
      itensBarema: [],
      pontuacaoProvisoriaBarema: 0,
      extratoBarema: {
        pontuacaoProvisoriaBarema: 0,
        itensDetalhados: [],
      },
    });
    insc1Id = insc1.id;

    const subRepo = getSubmissaoRepository();
    await subRepo.create({
      inscricaoId: insc1.id,
      processoSeletivoId: processoId,
      desafioId: desafio.id,
      linguagem: LinguagemDesafio.TYPESCRIPT,
      codigoFonte: "export default function App() {}",
      statusExecucao: "SUCCESS",
      notaTecnicaTotal: 90,
      notaCorretude: 65,
      notaQualidade: 15,
      notaDesempenho: 10,
      atendeNotaCorte: true,
      statusClassificacao: "CLASSIFICADO",
      relatorioExecucao: {
        status: "SUCCESS",
        executionTimeMs: 100,
        memoryPeakKb: 0,
        testResults: [],
        linterScore: 100,
      },
    });
  });

  it("deve convocar candidato classificado disparando e-mail formal", async () => {
    const req = new Request("http://localhost/api/banca/notificacoes/convocar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        processoSeletivoId: processoId,
        prazoDocumentos: "10/12/2026 às 18:00",
      }),
    });

    const res = await POST_CONVOCAR(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.totalEnviados).toBe(1);
    expect(data.convocados[0].email).toBe("livia.castro@devtest.org");
    expect(data.convocados[0].posicaoRanking).toBe(1);

    // Verificar histórico de e-mails
    const emailService = getEmailService();
    const sent = emailService.getSentEmails({ tipo: "CONVOCACAO" });
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe("livia.castro@devtest.org");
    expect(sent[0].subject).toContain("Convocação");
    expect(sent[0].text).toContain("10/12/2026 às 18:00");

    // Verificar endpoint GET /historico
    const reqHist = new Request("http://localhost/api/banca/notificacoes/historico");
    const resHist = await GET_HISTORICO(reqHist);
    expect(resHist.status).toBe(200);
    const dataHist = await resHist.json();
    expect(dataHist.total).toBe(1);
    expect(dataHist.mensagens[0].tipo).toBe("CONVOCACAO");
  });

  it("deve disparar e-mail automático ao julgar recurso administrativo", async () => {
    const recRepo = getRecursoRepository();
    const rec = await recRepo.create({
      inscricaoId: insc1Id,
      processoSeletivoId: processoId,
      candidatoId: cand1Id,
      codigoAnonimo: "CAND-9999",
      alvoContestacao: "PROVA_PRATICA",
      fundamentacao: "Solicito revisão dos testes públicos do desafio React.",
    });

    const reqJulgar = new Request(
      `http://localhost/api/banca/recursos/${rec.id}/julgar`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisao: "DEFERIDO",
          parecerBanca: "Revisão efetuada com sucesso pela comissão técnica.",
          novaPontuacaoAlvo: 95,
        }),
      }
    );

    const resJulgar = await PATCH_JULGAR(reqJulgar, {
      params: Promise.resolve({ id: rec.id }),
    });
    expect(resJulgar.status).toBe(200);

    const emailService = getEmailService();
    const sent = emailService.getSentEmails({ tipo: "PARECER_RECURSO" });
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe("livia.castro@devtest.org");
    expect(sent[0].subject).toContain("DEFERIDO");
    expect(sent[0].text).toContain("Revisão efetuada com sucesso");
  });
});
