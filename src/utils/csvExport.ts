import { Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export interface CSVExportOptions {
  delimiter?: string;
  includeBOM?: boolean;
  useCommaDecimal?: boolean;
}

/**
 * Escapes a single CSV cell value according to standard CSV (RFC 4180) rules.
 * If the value contains the delimiter, quotes, or newlines, it will be quoted
 * and internal double quotes will be doubled.
 */
export function escapeCSVCell(value: unknown, delimiter = ';'): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  const needsQuotes = str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');
  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates formatted CSV text for a list of transactions.
 * Delimiter defaults to ';' which is the standard delimiter for Microsoft Excel in Portuguese (pt-BR).
 */
export function generateTransactionsCSV(
  transactions: Transaction[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter ?? ';';
  const useCommaDecimal = options.useCommaDecimal ?? false;

  const headers = [
    'Data',
    'Descrição',
    'Tipo',
    'Categoria',
    'Pote (Código)',
    'Pote (Nome)',
    'Centro de Custo',
    'Conta',
    'Status',
    'Valor (R$)',
    'Observações'
  ];

  const headerRow = headers.map(h => escapeCSVCell(h, delimiter)).join(delimiter);

  const dataRows = transactions.map(tx => {
    const jarDef = JAR_DEFINITIONS[tx.jar];
    const jarName = jarDef ? jarDef.name : tx.jar;
    
    // Type label in readable Portuguese
    let typeLabel: string = tx.type;
    if (tx.type === 'despesa') typeLabel = 'Despesa';
    else if (tx.type === 'receita') typeLabel = 'Receita';
    else if (tx.type === 'reembolso') typeLabel = 'Reembolso';

    // Status label in readable Portuguese
    const statusLabel = tx.status === 'liquidado' ? 'Liquidado' : 'Agendado';

    // Numeric formatting: 2 decimal places with optional comma separator
    let amountStr = tx.amount.toFixed(2);
    if (useCommaDecimal) {
      amountStr = amountStr.replace('.', ',');
    }

    const row = [
      tx.date,
      tx.description || '',
      typeLabel,
      tx.category || '',
      tx.jar,
      jarName,
      tx.costCenter,
      tx.account,
      statusLabel,
      amountStr,
      tx.notes || ''
    ];

    return row.map(cell => escapeCSVCell(cell, delimiter)).join(delimiter);
  });

  const body = [headerRow, ...dataRows].join('\r\n');
  return options.includeBOM ? `\uFEFF${body}` : body;
}

/**
 * Downloads a list of transactions as a CSV file in the browser.
 * Uses a UTF-8 BOM so Microsoft Excel, LibreOffice, and Google Sheets open Portuguese accents correctly.
 */
export function downloadTransactionsCSV(
  transactions: Transaction[],
  filename?: string,
  options: CSVExportOptions = {}
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const defaultFilename = `extrato_yupee_${new Date().toISOString().slice(0, 10)}.csv`;
  const targetFilename = filename || defaultFilename;

  // Always include UTF-8 BOM for file download so Excel renders accents properly
  const csvContent = generateTransactionsCSV(transactions, {
    delimiter: ';',
    includeBOM: true,
    ...options
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', targetFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
