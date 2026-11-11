export interface ItemRankingRelatorio {
  posicaoRanking: number | null;
  codigoAnonimo: string;
  candidatoNome?: string;
  candidatoCpf?: string;
  candidatoEmail?: string;
  trilhaNome: string;
  notaTecnicaTotal: number;
  notaCorretude: number;
  notaQualidade: number;
  notaDesempenho: number;
  notaBaremaUtilizada: number;
  notaFinalConsolidada: number | null;
  statusClassificacao: string;
  statusAuditoriaBarema: string;
  atendeNotaCorte: boolean;
}

export interface ItemRecursoRelatorio {
  id: string;
  codigoAnonimo: string;
  candidatoNome?: string;
  alvoContestacao: string;
  fundamentacao: string;
  status: string;
  parecerBanca?: string | null;
  novaPontuacaoAlvo?: number | null;
  dataSubmissao?: string;
}

function sanitizarCsvField(valor: any): string {
  if (valor === null || valor === undefined) return "";
  const str = String(valor).replace(/"/g, '""');
  if (str.includes(";") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export function gerarCsvRanking(params: {
  processoTitulo: string;
  edital: string;
  ranking: ItemRankingRelatorio[];
  modoAnonimo: boolean;
}): string {
  const { processoTitulo, edital, ranking, modoAnonimo } = params;

  const cabecalho = modoAnonimo
    ? [
        "Posição",
        "Código Anônimo",
        "Trilha",
        "Nota Técnica",
        "Barema Curricular",
        "Nota Final Consolidada",
        "Status Classificação",
        "Status Barema",
      ]
    : [
        "Posição",
        "Código Anônimo",
        "Nome do Candidato",
        "CPF",
        "E-mail",
        "Trilha",
        "Nota Técnica",
        "Barema Curricular",
        "Nota Final Consolidada",
        "Status Classificação",
        "Status Barema",
      ];

  const linhas: string[] = [];

  // Metadados do relatório
  linhas.push(`DevTest - Relatório Oficial de Classificação`);
  linhas.push(`Processo Seletivo: ${sanitizarCsvField(processoTitulo)}`);
  linhas.push(`Edital: ${sanitizarCsvField(edital)}`);
  linhas.push(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`);
  linhas.push("");
  linhas.push(cabecalho.join(";"));

  for (const item of ranking) {
    const posicao =
      item.posicaoRanking !== null ? `#${item.posicaoRanking}` : "Eliminado";
    const notaTecnica = item.notaTecnicaTotal.toFixed(2);
    const notaBarema = item.notaBaremaUtilizada.toFixed(2);
    const notaFinal =
      item.notaFinalConsolidada !== null
        ? item.notaFinalConsolidada.toFixed(2)
        : "-";

    const linha = modoAnonimo
      ? [
          posicao,
          sanitizarCsvField(item.codigoAnonimo),
          sanitizarCsvField(item.trilhaNome),
          notaTecnica,
          notaBarema,
          notaFinal,
          sanitizarCsvField(item.statusClassificacao),
          sanitizarCsvField(item.statusAuditoriaBarema),
        ]
      : [
          posicao,
          sanitizarCsvField(item.codigoAnonimo),
          sanitizarCsvField(item.candidatoNome || "-"),
          sanitizarCsvField(item.candidatoCpf || "-"),
          sanitizarCsvField(item.candidatoEmail || "-"),
          sanitizarCsvField(item.trilhaNome),
          notaTecnica,
          notaBarema,
          notaFinal,
          sanitizarCsvField(item.statusClassificacao),
          sanitizarCsvField(item.statusAuditoriaBarema),
        ];

    linhas.push(linha.join(";"));
  }

  // Adiciona BOM UTF-8 (\uFEFF) para compatibilidade nativa de acentuação no Excel
  return "\uFEFF" + linhas.join("\r\n");
}

export function gerarHtmlRelatorioRanking(params: {
  processoTitulo: string;
  edital: string;
  pesos: { pesoProvaTecnica: number; pesoBaremaCurricular: number };
  notaCorteMinima: number;
  ranking: ItemRankingRelatorio[];
  modoAnonimo: boolean;
  dataEmissao?: string;
}): string {
  const {
    processoTitulo,
    edital,
    pesos,
    notaCorteMinima,
    ranking,
    modoAnonimo,
    dataEmissao = new Date().toLocaleString("pt-BR"),
  } = params;

  const linhasTabela = ranking
    .map((item) => {
      const posicaoBadge =
        item.posicaoRanking !== null
          ? `<span class="badge badge-pos">#${item.posicaoRanking}</span>`
          : `<span class="badge badge-elim">Eliminado</span>`;

      const notaFinalStr =
        item.notaFinalConsolidada !== null
          ? `<strong>${item.notaFinalConsolidada.toFixed(2)}</strong>`
          : `<span style="color:#e11d48">-</span>`;

      return `
      <tr>
        <td style="text-align: center;">${posicaoBadge}</td>
        <td><strong>${item.codigoAnonimo}</strong></td>
        ${
          !modoAnonimo
            ? `<td>${item.candidatoNome || "-"}<br/><small style="color:#64748b">${item.candidatoCpf || ""}</small></td>`
            : ""
        }
        <td>${item.trilhaNome}</td>
        <td style="text-align: right;">${item.notaTecnicaTotal.toFixed(2)}</td>
        <td style="text-align: right;">${item.notaBaremaUtilizada.toFixed(2)}</td>
        <td style="text-align: right; font-size: 1.1em;">${notaFinalStr}</td>
        <td><small>${item.statusClassificacao}</small></td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DevTest - Relatório Oficial de Classificação - ${edital}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #0f172a;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header p {
      margin: 4px 0;
      color: #475569;
      font-size: 14px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      display: flex;
      gap: 32px;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }
    .badge-pos {
      background: #e0e7ff;
      color: #3730a3;
    }
    .badge-elim {
      background: #ffe4e6;
      color: #9f1239;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { margin: 15mm; font-size: 11px; }
      .meta-box { background: transparent; border: 1px solid #ccc; }
      th { background: #eee !important; -webkit-print-color-adjust: exact; }
      .badge-pos, .badge-elim { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DevTest &bull; Relatório Oficial de Classificação</h1>
    <p><strong>Processo Seletivo:</strong> ${processoTitulo} &bull; <strong>Edital:</strong> ${edital}</p>
    <p><strong>Modo de Exibição:</strong> ${modoAnonimo ? "Correção Cega (Anonimizada)" : "Homologado (Desmascarado)"}</p>
  </div>

  <div class="meta-box">
    <div><strong>Pesos:</strong> Prova Técnica ${pesos.pesoProvaTecnica}% | Barema ${pesos.pesoBaremaCurricular}%</div>
    <div><strong>Nota de Corte Prática:</strong> ${notaCorteMinima} pts</div>
    <div><strong>Total de Inscritos:</strong> ${ranking.length}</div>
    <div><strong>Data de Emissão:</strong> ${dataEmissao}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 70px; text-align: center;">Posição</th>
        <th>Código Anônimo</th>
        ${!modoAnonimo ? "<th>Candidato / CPF</th>" : ""}
        <th>Trilha</th>
        <th style="text-align: right;">Nota Técnica</th>
        <th style="text-align: right;">Barema</th>
        <th style="text-align: right;">Nota Final</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela}
    </tbody>
  </table>

  <div class="footer">
    <span>Documento gerado eletronicamente pela Plataforma DevTest</span>
    <span>Emissão: ${dataEmissao}</span>
  </div>
</body>
</html>`;
}

export function gerarCsvAtaRecursos(params: {
  processoTitulo: string;
  edital: string;
  recursos: ItemRecursoRelatorio[];
}): string {
  const { processoTitulo, edital, recursos } = params;

  const cabecalho = [
    "Protocolo",
    "Código Anônimo",
    "Candidato",
    "Alvo",
    "Decisão",
    "Parecer da Banca",
    "Nota Retificada",
    "Data Submissão",
  ];

  const linhas: string[] = [];
  linhas.push(`DevTest - Ata Oficial de Julgamento de Recursos`);
  linhas.push(`Processo Seletivo: ${sanitizarCsvField(processoTitulo)}`);
  linhas.push(`Edital: ${sanitizarCsvField(edital)}`);
  linhas.push(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}`);
  linhas.push("");
  linhas.push(cabecalho.join(";"));

  for (const rec of recursos) {
    const notaRetificada =
      rec.novaPontuacaoAlvo !== null && rec.novaPontuacaoAlvo !== undefined
        ? Number(rec.novaPontuacaoAlvo).toFixed(2)
        : "-";

    linhas.push(
      [
        sanitizarCsvField(rec.id),
        sanitizarCsvField(rec.codigoAnonimo),
        sanitizarCsvField(rec.candidatoNome || "-"),
        sanitizarCsvField(rec.alvoContestacao),
        sanitizarCsvField(rec.status),
        sanitizarCsvField(rec.parecerBanca || "Pendente de Análise"),
        notaRetificada,
        sanitizarCsvField(rec.dataSubmissao || "-"),
      ].join(";")
    );
  }

  return "\uFEFF" + linhas.join("\r\n");
}

export function gerarHtmlAtaRecursos(params: {
  processoTitulo: string;
  edital: string;
  recursos: ItemRecursoRelatorio[];
  dataEmissao?: string;
}): string {
  const {
    processoTitulo,
    edital,
    recursos,
    dataEmissao = new Date().toLocaleString("pt-BR"),
  } = params;

  const deferidos = recursos.filter((r) => r.status === "DEFERIDO").length;
  const indeferidos = recursos.filter((r) => r.status === "INDEFERIDO").length;
  const emAnalise = recursos.filter((r) => r.status === "EM_ANALISE").length;

  const itensHtml = recursos
    .map(
      (rec, index) => `
    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; background: #fff;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
        <span style="font-weight: bold; color: #0f172a;">#${index + 1} - Protocolo: ${rec.id} (${rec.codigoAnonimo})</span>
        <span style="font-weight: bold; color: ${
          rec.status === "DEFERIDO"
            ? "#16a34a"
            : rec.status === "INDEFERIDO"
            ? "#dc2626"
            : "#d97706"
        };">${rec.status}</span>
      </div>
      <p style="margin: 4px 0; font-size: 13px;"><strong>Alvo da Contestação:</strong> ${rec.alvoContestacao}</p>
      <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 12px; margin: 6px 0; color: #334155;">
        <strong>Fundamentação do Candidato:</strong><br/>
        ${rec.fundamentacao}
      </div>
      <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 8px; font-size: 12px; margin: 6px 0;">
        <strong>Parecer da Banca Avaliadora:</strong><br/>
        ${rec.parecerBanca || "Aguardando julgamento."}
      </div>
      ${
        rec.novaPontuacaoAlvo !== null && rec.novaPontuacaoAlvo !== undefined
          ? `<p style="margin: 4px 0; font-size: 13px; color: #15803d;"><strong>Nova Pontuação Retificada:</strong> ${Number(
              rec.novaPontuacaoAlvo
            ).toFixed(2)} pts</p>`
          : ""
      }
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DevTest - Ata de Julgamento de Recursos - ${edital}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #0f172a;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      display: flex;
      gap: 32px;
      font-size: 13px;
    }
    @media print {
      body { margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0 0 4px 0; color:#0369a1; font-size: 22px;">DevTest &bull; Ata de Julgamento de Recursos</h1>
    <p style="margin:0; color:#475569;"><strong>Processo Seletivo:</strong> ${processoTitulo} &bull; <strong>Edital:</strong> ${edital}</p>
  </div>

  <div class="meta-box">
    <div><strong>Total de Recursos:</strong> ${recursos.length}</div>
    <div><strong>Deferidos:</strong> ${deferidos}</div>
    <div><strong>Indeferidos:</strong> ${indeferidos}</div>
    <div><strong>Em Análise:</strong> ${emAnalise}</div>
    <div><strong>Emissão:</strong> ${dataEmissao}</div>
  </div>

  ${itensHtml}

  <div style="margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    Ata lavrada eletronicamente pelos membros da Banca Avaliadora &bull; DevTest
  </div>
</body>
</html>`;
}
