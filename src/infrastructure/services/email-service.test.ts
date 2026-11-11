import { describe, it, expect, beforeEach } from "vitest";
import { getEmailService, resetEmailService } from "./email-service";

describe("Serviço de Envio de E-mails e Notificações (EmailService)", () => {
  beforeEach(() => {
    resetEmailService();
  });

  it("deve enviar e-mail com sucesso e registrar no histórico em memória", async () => {
    const service = getEmailService();

    const res = await service.sendEmail({
      to: "candidato@email.com",
      subject: "Teste de Notificação",
      text: "Mensagem em texto simples",
      html: "<p>Mensagem em HTML</p>",
      tipo: "CONVOCACAO",
      metadata: { processoId: "ps-1" },
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();

    const enviados = service.getSentEmails();
    expect(enviados.length).toBe(1);
    expect(enviados[0].to).toBe("candidato@email.com");
    expect(enviados[0].subject).toBe("Teste de Notificação");
    expect(enviados[0].tipo).toBe("CONVOCACAO");
    expect(enviados[0].sentAt).toBeDefined();
  });

  it("deve permitir filtrar e-mails enviados por destinatário ou tipo", async () => {
    const service = getEmailService();

    await service.sendEmail({
      to: "user1@email.com",
      subject: "Convocação 1",
      text: "...",
      html: "...",
      tipo: "CONVOCACAO",
    });

    await service.sendEmail({
      to: "user2@email.com",
      subject: "Recurso 2",
      text: "...",
      html: "...",
      tipo: "PARECER_RECURSO",
    });

    const apenasConvocacoes = service.getSentEmails({ tipo: "CONVOCACAO" });
    expect(apenasConvocacoes.length).toBe(1);
    expect(apenasConvocacoes[0].to).toBe("user1@email.com");

    const apenasUser2 = service.getSentEmails({ to: "user2@email.com" });
    expect(apenasUser2.length).toBe(1);
    expect(apenasUser2[0].subject).toBe("Recurso 2");
  });
});
