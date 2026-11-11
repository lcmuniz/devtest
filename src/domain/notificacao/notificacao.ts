export interface TemplateConvocacaoInput {
  candidatoNome: string;
  candidatoEmail: string;
  posicaoRanking: number;
  notaFinal: number;
  processoTitulo: string;
  edital: string;
  trilhaNome: string;
  prazoEnvioDocumentos?: string;
}

export interface TemplateParecerRecursoInput {
  candidatoNome: string;
  candidatoEmail: string;
  codigoAnonimo: string;
  processoTitulo: string;
  edital: string;
  alvoContestacao: string;
  decisao: "DEFERIDO" | "INDEFERIDO";
  parecerBanca: string;
  novaPontuacao?: number;
}

export interface MensagemEmailPronta {
  destinatario: string;
  assunto: string;
  corpoTexto: string;
  corpoHtml: string;
}

export function gerarEmailConvocacao(
  input: TemplateConvocacaoInput
): MensagemEmailPronta {
  const {
    candidatoNome,
    candidatoEmail,
    posicaoRanking,
    notaFinal,
    processoTitulo,
    edital,
    trilhaNome,
    prazoEnvioDocumentos = "5 (cinco) dias úteis a contar deste comunicado",
  } = input;

  const assunto = `[DevTest] Convocação de Candidato Aprovado - ${processoTitulo} (Edital ${edital})`;

  const corpoTexto = `Prezada(o) ${candidatoNome},

Parabéns! Temos a satisfação de informar que você foi classificada(o) em ${posicaoRanking}º lugar no processo seletivo "${processoTitulo}" (Edital ${edital}), na Trilha "${trilhaNome}", com Nota Final Consolidada de ${notaFinal.toFixed(
    2
  )} pontos.

Informamos que foi aberta a fase de conferência e entrega formal da documentação comprobatória.
Prazo limite para envio ou manifestação: ${prazoEnvioDocumentos}.

Por favor, acesse a plataforma DevTest com suas credenciais para verificar os detalhes da convocação e as instruções dos próximos passos.

Atenciosamente,
Banca Avaliadora - DevTest
`;

  const corpoHtml = `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <div style="background: #0284c7; padding: 20px; border-radius: 8px 8px 0 0; color: white;">
    <h2 style="margin: 0; font-size: 20px;">DevTest &bull; Convocação Oficial</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
    <p>Prezada(o) <strong>${candidatoNome}</strong>,</p>
    <p>Parabéns! Você foi classificada(o) em <strong>${posicaoRanking}º lugar</strong> no processo seletivo <em>${processoTitulo}</em> (Edital ${edital}), na trilha <strong>${trilhaNome}</strong>.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin: 18px 0;">
      <p style="margin: 0; font-size: 15px; color: #166534;">
        <strong>Nota Final Consolidada:</strong> ${notaFinal.toFixed(2)} pts<br/>
        <strong>Prazo para apresentação de documentos:</strong> ${prazoEnvioDocumentos}
      </p>
    </div>

    <p>Para consultar o espelho completo da sua avaliação e enviar as declarações complementares, acesse a plataforma com seu login e senha.</p>
    
    <p style="margin-top: 28px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 14px;">
      Banca Avaliadora &bull; Plataforma DevTest
    </p>
  </div>
</div>
`;

  return {
    destinatario: candidatoEmail,
    assunto,
    corpoTexto,
    corpoHtml,
  };
}

export function gerarEmailParecerRecurso(
  input: TemplateParecerRecursoInput
): MensagemEmailPronta {
  const {
    candidatoNome,
    candidatoEmail,
    codigoAnonimo,
    processoTitulo,
    edital,
    alvoContestacao,
    decisao,
    parecerBanca,
    novaPontuacao,
  } = input;

  const alvoLegivel =
    alvoContestacao === "PROVA_PRATICA"
      ? "Prova Prática de Programação"
      : "Barema Curricular";

  const assunto = `[DevTest] Julgamento de Recurso: ${decisao} - ${processoTitulo}`;

  const blocoNotaTexto =
    decisao === "DEFERIDO" && novaPontuacao !== undefined
      ? `\nNova pontuação ajustada: ${novaPontuacao.toFixed(2)} pontos.\n`
      : "";

  const corpoTexto = `Prezada(o) ${candidatoNome} (${codigoAnonimo}),

A Banca Avaliadora concluiu a análise do seu recurso administrativo referente a: "${alvoLegivel}" no âmbito do processo seletivo "${processoTitulo}" (Edital ${edital}).

Decisão da Banca: ${decisao}${blocoNotaTexto}
Parecer Técnico Fundamentado:
"${parecerBanca}"

O ranking e o espelho de avaliação atualizados já se encontram disponíveis na plataforma.

Atenciosamente,
Banca Avaliadora - DevTest
`;

  const corpoHtml = `
<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <div style="background: ${
    decisao === "DEFERIDO" ? "#16a34a" : "#dc2626"
  }; padding: 18px; border-radius: 8px 8px 0 0; color: white;">
    <h2 style="margin: 0; font-size: 18px;">DevTest &bull; Julgamento de Recurso: ${decisao}</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
    <p>Prezada(o) <strong>${candidatoNome}</strong> (${codigoAnonimo}),</p>
    <p>Seu recurso contra a avaliação de <strong>${alvoLegivel}</strong> no processo <em>${processoTitulo}</em> foi julgado como <strong>${decisao}</strong>.</p>

    ${
      decisao === "DEFERIDO" && novaPontuacao !== undefined
        ? `<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin: 14px 0; color: #166534;">
             <strong>Nova pontuação atribuída:</strong> ${novaPontuacao.toFixed(
               2
             )} pts
           </div>`
        : ""
    }

    <div style="background: #f8fafc; border-left: 4px solid #94a3b8; padding: 12px; margin: 16px 0; font-size: 14px;">
      <strong>Parecer Técnico da Banca:</strong><br/>
      ${parecerBanca}
    </div>

    <p style="margin-top: 24px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      Plataforma DevTest &bull; Comissão de Avaliação
    </p>
  </div>
</div>
`;

  return {
    destinatario: candidatoEmail,
    assunto,
    corpoTexto,
    corpoHtml,
  };
}
