import crypto from "crypto";

export interface EmailMessage {
  id?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  tipo?: "CONVOCACAO" | "PARECER_RECURSO" | "SISTEMA";
  metadata?: Record<string, any>;
  sentAt?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId: string;
}

export interface IEmailService {
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
  getSentEmails(filter?: { to?: string; tipo?: string }): EmailMessage[];
  clearSentEmails(): void;
}

export class InMemoryEmailService implements IEmailService {
  private sentMessages: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const id = message.id || `msg-${crypto.randomUUID()}`;
    const sentAt = new Date().toISOString();

    const storedMessage: EmailMessage = {
      ...message,
      id,
      sentAt,
    };

    this.sentMessages.push(storedMessage);

    // Registra log para fins de observabilidade/depuração
    console.log(
      `[EmailService] E-mail enviado para "${message.to}" | Assunto: "${message.subject}" | Tipo: "${message.tipo ?? "N/A"}"`
    );

    return {
      success: true,
      messageId: id,
    };
  }

  getSentEmails(filter?: { to?: string; tipo?: string }): EmailMessage[] {
    return this.sentMessages.filter((msg) => {
      if (filter?.to && msg.to.toLowerCase() !== filter.to.toLowerCase()) {
        return false;
      }
      if (filter?.tipo && msg.tipo !== filter.tipo) {
        return false;
      }
      return true;
    });
  }

  clearSentEmails(): void {
    this.sentMessages = [];
  }
}

let emailServiceInstance: IEmailService | null = null;

export function getEmailService(): IEmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new InMemoryEmailService();
  }
  return emailServiceInstance;
}

export function resetEmailService(): void {
  emailServiceInstance = new InMemoryEmailService();
}
