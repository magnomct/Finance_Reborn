import { Transaction } from '../types';

export type GlobalExportFormat = 'pdf' | 'csv' | 'excel';
export type GlobalExportScope = 'ALL' | 'PF' | 'PJ';
export type GlobalExportDatePreset = 'THIS_MONTH' | 'LAST_30_DAYS' | 'YEAR_CURRENT' | 'CUSTOM';

export interface GlobalExportFilterOptions {
  startDate?: string;
  endDate?: string;
  scope?: GlobalExportScope;
  categories?: string[]; // Empty array means "Todas as Categorias"
}

export interface ExportPreviewStats {
  count: number;
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
}

export interface ExportFileGenerationOptions {
  startDate?: string;
  endDate?: string;
  scope?: GlobalExportScope;
  categories?: string[];
  reportTitle?: string;
  skipBrowserAction?: boolean;
}

export interface ExportFileOutput {
  success: boolean;
  filename: string;
  format: GlobalExportFormat;
  count: number;
  stats: ExportPreviewStats;
  content: string;
}

const formatBRLPtBr = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export function isTransactionPJ(tx: Transaction): boolean {
  return tx.costCenter === 'PJ' || tx.account === 'Inter PJ' || tx.jar === 'PJ_EXCLUIDO';
}

export function getTransactionScopeLabel(tx: Transaction): 'PF' | 'MEI/PJ' {
  return isTransactionPJ(tx) ? 'MEI/PJ' : 'PF';
}

export function getTransactionTypeLabel(tx: Transaction): 'Entrada' | 'Saída' {
  return tx.type === 'despesa' ? 'Saída' : 'Entrada';
}

export function getSignedAmount(tx: Transaction): number {
  const abs = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
  return round2(tx.type === 'despesa' ? -abs : abs);
}

/**
 * Formats ISO YYYY-MM-DD date string to Brazilian DD/MM/YYYY format.
 */
export function formatDateDDMMYYYY(isoDate: string): string {
  const trimmed = String(isoDate || '').trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed || '-';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Computes quick date ranges for presets using an optional anchor date (defaults to today).
 */
export function resolveDateRangeForPreset(
  preset: Exclude<GlobalExportDatePreset, 'CUSTOM'>,
  anchorIsoDate?: string
): { startDate: string; endDate: string } {
  const baseDate =
    anchorIsoDate && /^\d{4}-\d{2}-\d{2}$/.test(anchorIsoDate)
      ? new Date(`${anchorIsoDate}T12:00:00`)
      : new Date();

  const year = baseDate.getFullYear();
  const monthIdx = baseDate.getMonth();
  const monthStr = String(monthIdx + 1).padStart(2, '0');
  const todayIso = `${year}-${monthStr}-${String(baseDate.getDate()).padStart(2, '0')}`;

  if (preset === 'THIS_MONTH') {
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    return {
      startDate: `${year}-${monthStr}-01`,
      endDate: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  if (preset === 'LAST_30_DAYS') {
    const past = new Date(baseDate.getTime());
    past.setDate(past.getDate() - 30);
    const pYear = past.getFullYear();
    const pMonth = String(past.getMonth() + 1).padStart(2, '0');
    const pDay = String(past.getDate()).padStart(2, '0');
    return {
      startDate: `${pYear}-${pMonth}-${pDay}`,
      endDate: todayIso,
    };
  }

  // YEAR_CURRENT
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

/**
 * Filters transactions by date range (YYYY-MM-DD), scope (ALL | PF | PJ), and categories multi-filter.
 */
export function filterTransactionsForExport(
  transactions: Transaction[],
  options: GlobalExportFilterOptions = {}
): Transaction[] {
  const start = (options.startDate || '').trim();
  const end = (options.endDate || '').trim();
  const scope = options.scope || 'ALL';
  const selectedCats = Array.isArray(options.categories)
    ? options.categories.map(c => c.trim()).filter(Boolean)
    : [];

  return (Array.isArray(transactions) ? transactions : [])
    .filter(tx => {
      const txDate = (tx.date || '').slice(0, 10);
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;

      const pj = isTransactionPJ(tx);
      if (scope === 'PF' && pj) return false;
      if (scope === 'PJ' && !pj) return false;

      if (selectedCats.length > 0) {
        const txCategory = (tx.category || 'Geral').trim() || 'Geral';
        const txParent = (tx.parentCategory || '').trim();
        const matches = selectedCats.some(
          cat =>
            cat === txCategory ||
            cat === txParent ||
            txCategory.startsWith(`${cat} >`)
        );
        if (!matches) return false;
      }

      return true;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Computes count, inflows, outflows, and net balance for preview & export summaries.
 */
export function computeExportPreviewStats(transactions: Transaction[]): ExportPreviewStats {
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const tx of transactions) {
    const abs = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (tx.type === 'despesa') {
      totalOutflow += abs;
    } else {
      totalInflow += abs;
    }
  }

  totalInflow = round2(totalInflow);
  totalOutflow = round2(totalOutflow);
  const netBalance = round2(totalInflow - totalOutflow);

  return {
    count: transactions.length,
    totalInflow,
    totalOutflow,
    netBalance,
  };
}

/**
 * Builds contextual filename: extrato-financeiro_${startDate}_a_${endDate}.${ext}
 */
export function buildExportRangeFilename(
  transactions: Transaction[],
  ext: 'csv' | 'xls' | 'pdf',
  options: { startDate?: string; endDate?: string } = {}
): string {
  const sortedDates = transactions
    .map(t => (t.date || '').slice(0, 10))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => a.localeCompare(b));

  const fallbackDate = new Date().toISOString().slice(0, 10);
  const start =
    (options.startDate || '').trim() || sortedDates[0] || fallbackDate;
  const end =
    (options.endDate || '').trim() || sortedDates[sortedDates.length - 1] || start;

  return `extrato-financeiro_${start}_a_${end}.${ext}`;
}

function escapeCsvCell(value: unknown, delimiter = ';'): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerFileDownload(content: string, filename: string, mimeType: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// ============================================================================
// 1. CSV GENERATOR (UTF-8 BOM, ';' delimiter, pt-BR)
// ============================================================================

export function buildTransactionsCSVContent(transactions: Transaction[]): string {
  const delimiter = ';';
  const headers = [
    'Data',
    'Descrição',
    'Categoria',
    'Escopo',
    'Tipo',
    'Valor (R$)',
  ];

  const headerLine = headers.map(h => escapeCsvCell(h, delimiter)).join(delimiter);
  const rows = transactions.map(tx => {
    const signed = getSignedAmount(tx);
    const amountPtBr = signed.toFixed(2).replace('.', ',');
    const cells = [
      formatDateDDMMYYYY(tx.date),
      tx.description || '',
      (tx.category || 'Geral').trim() || 'Geral',
      getTransactionScopeLabel(tx),
      getTransactionTypeLabel(tx),
      amountPtBr,
    ];
    return cells.map(c => escapeCsvCell(c, delimiter)).join(delimiter);
  });

  return `\uFEFF${[headerLine, ...rows].join('\r\n')}`;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  options: ExportFileGenerationOptions = {}
): ExportFileOutput {
  const filename = buildExportRangeFilename(transactions, 'csv', options);
  const stats = computeExportPreviewStats(transactions);
  const content = buildTransactionsCSVContent(transactions);

  const downloaded =
    options.skipBrowserAction || transactions.length === 0
      ? false
      : triggerFileDownload(content, filename, 'text/csv;charset=utf-8;');

  return {
    success: options.skipBrowserAction ? transactions.length > 0 : downloaded,
    filename,
    format: 'csv',
    count: transactions.length,
    stats,
    content,
  };
}

// ============================================================================
// 2. EXCEL WORKBOOK GENERATOR (Styled HTML-Excel SpreadsheetML .xls)
// ============================================================================

export function buildTransactionsExcelContent(
  transactions: Transaction[],
  options: ExportFileGenerationOptions = {}
): string {
  const stats = computeExportPreviewStats(transactions);
  const periodText =
    options.startDate && options.endDate
      ? `${formatDateDDMMYYYY(options.startDate)} a ${formatDateDDMMYYYY(options.endDate)}`
      : 'Todo o Histórico';

  const scopeText =
    options.scope === 'PF'
      ? 'Apenas PF'
      : options.scope === 'PJ'
        ? 'Apenas MEI/PJ'
        : 'Todos (PF + MEI/PJ)';

  const rowsHtml = transactions
    .map((tx, idx) => {
      const signed = getSignedAmount(tx);
      const isExpense = tx.type === 'despesa';
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const valColor = isExpense ? '#be123c' : '#047857';

      return `<tr style="background-color:${bg};">
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${escapeHtml(formatDateDDMMYYYY(tx.date))}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;">${escapeHtml(tx.description || '')}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;">${escapeHtml((tx.category || 'Geral').trim() || 'Geral')}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${escapeHtml(getTransactionScopeLabel(tx))}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;">${escapeHtml(getTransactionTypeLabel(tx))}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;color:${valColor};mso-number-format:'R\\$\\ #,##0.00;[Red]-R\\$\\ #,##0.00';">${escapeHtml(formatBRLPtBr(signed))}</td>
      </tr>`;
    })
    .join('\n');

  const html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Extrato Financeiro</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #0f172a; }
    table { border-collapse: collapse; width: 100%; }
    th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #0f172a; text-align: left; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="6" style="font-size:14pt;font-weight:bold;padding:8px 10px;background-color:#f1f5f9;border:1px solid #cbd5e1;">
        Extrato Financeiro Consolidado • Período: ${escapeHtml(periodText)} • Escopo: ${escapeHtml(scopeText)}
      </td>
    </tr>
    <thead>
      <tr>
        <th style="text-align:center;">Data</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th style="text-align:center;">Escopo</th>
        <th style="text-align:center;">Tipo</th>
        <th style="text-align:right;">Valor (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr style="background-color:#ecfdf5;font-weight:bold;">
        <td colspan="5" style="padding:7px 10px;border:1px solid #cbd5e1;text-align:right;">Total Entradas (${stats.count} lançamentos)</td>
        <td style="padding:7px 10px;border:1px solid #cbd5e1;text-align:right;color:#047857;">${escapeHtml(formatBRLPtBr(stats.totalInflow))}</td>
      </tr>
      <tr style="background-color:#fff1f2;font-weight:bold;">
        <td colspan="5" style="padding:7px 10px;border:1px solid #cbd5e1;text-align:right;">Total Saídas</td>
        <td style="padding:7px 10px;border:1px solid #cbd5e1;text-align:right;color:#be123c;">-${escapeHtml(formatBRLPtBr(stats.totalOutflow))}</td>
      </tr>
      <tr style="background-color:#e2e8f0;font-weight:bold;">
        <td colspan="5" style="padding:8px 10px;border:1px solid #94a3b8;text-align:right;">Saldo Líquido</td>
        <td style="padding:8px 10px;border:1px solid #94a3b8;text-align:right;color:${stats.netBalance >= 0 ? '#047857' : '#be123c'};">${escapeHtml(formatBRLPtBr(stats.netBalance))}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  return html;
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  options: ExportFileGenerationOptions = {}
): ExportFileOutput {
  const filename = buildExportRangeFilename(transactions, 'xls', options);
  const stats = computeExportPreviewStats(transactions);
  const content = buildTransactionsExcelContent(transactions, options);

  const downloaded =
    options.skipBrowserAction || transactions.length === 0
      ? false
      : triggerFileDownload(
          content,
          filename,
          'application/vnd.ms-excel;charset=utf-8'
        );

  return {
    success: options.skipBrowserAction ? transactions.length > 0 : downloaded,
    filename,
    format: 'excel',
    count: transactions.length,
    stats,
    content,
  };
}

// ============================================================================
// 3. PRINT-READY EXECUTIVE PDF GENERATOR (Isolated Hidden Iframe + @media print)
// ============================================================================

export function buildTransactionsPDFHtml(
  transactions: Transaction[],
  options: ExportFileGenerationOptions = {}
): string {
  const stats = computeExportPreviewStats(transactions);
  const title = (options.reportTitle || 'Extrato Financeiro Consolidado').trim();
  const periodLabel =
    options.startDate && options.endDate
      ? `${formatDateDDMMYYYY(options.startDate)} a ${formatDateDDMMYYYY(options.endDate)}`
      : 'Todo o Histórico';

  const scopeLabel =
    options.scope === 'PF'
      ? 'Apenas PF'
      : options.scope === 'PJ'
        ? 'Apenas MEI/PJ'
        : 'Todos (PF + MEI/PJ)';

  const categoriesLabel =
    options.categories && options.categories.length > 0
      ? options.categories.join(', ')
      : 'Todas as Categorias';

  const generatedAt = new Date().toLocaleDateString('pt-BR');

  const tableRows = transactions
    .map(tx => {
      const signed = getSignedAmount(tx);
      const isExpense = tx.type === 'despesa';
      return `<tr>
        <td>${escapeHtml(formatDateDDMMYYYY(tx.date))}</td>
        <td><strong>${escapeHtml(tx.description || '')}</strong></td>
        <td>${escapeHtml((tx.category || 'Geral').trim() || 'Geral')}</td>
        <td><span class="pill">${escapeHtml(getTransactionScopeLabel(tx))}</span></td>
        <td>${escapeHtml(getTransactionTypeLabel(tx))}</td>
        <td class="num ${isExpense ? 'neg' : 'pos'}">${escapeHtml(formatBRLPtBr(signed))}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.45;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    .header h1 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    .meta { font-size: 10px; color: #475569; margin-top: 4px; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-val { font-size: 14px; font-weight: 800; }
    .pos { color: #047857; }
    .neg { color: #be123c; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 7px 8px;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
    .pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      font-size: 9px;
      font-weight: 700;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <strong>Período:</strong> ${escapeHtml(periodLabel)} &nbsp;•&nbsp;
        <strong>Escopo:</strong> ${escapeHtml(scopeLabel)} &nbsp;•&nbsp;
        <strong>Categorias:</strong> ${escapeHtml(categoriesLabel)}
      </div>
    </div>
    <div class="meta" style="text-align:right;">
      Emitido em ${escapeHtml(generatedAt)}
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <span class="kpi-label">Lançamentos</span>
      <span class="kpi-val">${stats.count}</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Entradas</span>
      <span class="kpi-val pos">+${escapeHtml(formatBRLPtBr(stats.totalInflow))}</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Saídas</span>
      <span class="kpi-val neg">-${escapeHtml(formatBRLPtBr(stats.totalOutflow))}</span>
    </div>
    <div class="kpi">
      <span class="kpi-label">Saldo Líquido</span>
      <span class="kpi-val ${stats.netBalance >= 0 ? 'pos' : 'neg'}">${escapeHtml(formatBRLPtBr(stats.netBalance))}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Escopo</th>
        <th>Tipo</th>
        <th style="text-align:right;">Valor (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <span>Relatório gerado localmente no navegador (pt-BR / BRL)</span>
    <span>Total de registros: ${stats.count}</span>
  </div>
</body>
</html>`;
}

export function exportTransactionsToPDF(
  transactions: Transaction[],
  options: ExportFileGenerationOptions = {}
): ExportFileOutput {
  const filename = buildExportRangeFilename(transactions, 'pdf', options);
  const stats = computeExportPreviewStats(transactions);
  const html = buildTransactionsPDFHtml(transactions, options);

  let printed = false;
  if (
    !options.skipBrowserAction &&
    transactions.length > 0 &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  ) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('data-testid', 'export-pdf-print-iframe');
    document.body.appendChild(iframe);

    const cleanup = () => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {
        // Ignore cleanup errors
      }
    };

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }

      const win = iframe.contentWindow;
      if (win) {
        const previousTitle = document.title;
        document.title = filename.replace(/\.pdf$/i, '');
        win.addEventListener(
          'afterprint',
          () => {
            document.title = previousTitle;
            cleanup();
          },
          { once: true }
        );
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch {
            // Ignore headless print block
          } finally {
            setTimeout(() => {
              document.title = previousTitle;
              cleanup();
            }, 1500);
          }
        }, 60);
        printed = true;
      } else {
        cleanup();
      }
    } catch {
      cleanup();
    }
  }

  return {
    success: options.skipBrowserAction ? transactions.length > 0 : printed,
    filename,
    format: 'pdf',
    count: transactions.length,
    stats,
    content: html,
  };
}
