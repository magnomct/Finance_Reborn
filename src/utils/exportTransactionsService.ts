import { ParentCategoryItem, Transaction } from '../types';
import { DEFAULT_CATEGORY_HIERARCHY, parseHierarchicalCategory } from './categoryHierarchy';

export type ExportScope = 'PF' | 'PJ/MEI' | 'Consolidado' | 'PJ' | 'ALL' | 'CONSOLIDADO';
export type ExportFormat = 'csv' | 'ofx';

export interface NormalizedScopeInfo {
  slug: 'pf' | 'pj_mei' | 'consolidado';
  label: 'PF' | 'PJ/MEI' | 'Consolidado';
  accountId: string;
}

export interface ExportFilenameOptions {
  scope: ExportScope;
  format: ExportFormat;
  date?: Date | string;
}

export interface ExportCSVOptions {
  hierarchy?: ParentCategoryItem[];
}

export interface ExportOFXOptions {
  scope?: ExportScope;
  hierarchy?: ParentCategoryItem[];
  generatedAt?: Date | string;
}

export interface ExportExecutionResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  count: number;
  netBalance: number;
  content: string;
}

/**
 * Normalizes any app scope variant ('PF', 'PJ', 'PJ/MEI', 'ALL', 'CONSOLIDADO', 'Consolidado')
 * into canonical slug, display label, and OFX account identifier.
 */
export function normalizeExportScope(scope: ExportScope): NormalizedScopeInfo {
  const upper = String(scope || 'Consolidado').trim().toUpperCase();
  if (upper === 'PF') {
    return { slug: 'pf', label: 'PF', accountId: 'YUPEE-PF' };
  }
  if (upper === 'PJ' || upper === 'PJ/MEI') {
    return { slug: 'pj_mei', label: 'PJ/MEI', accountId: 'YUPEE-PJ-MEI' };
  }
  return { slug: 'consolidado', label: 'Consolidado', accountId: 'YUPEE-CONSOLIDADO' };
}

/**
 * Determines whether a transaction belongs to the PJ/MEI operation.
 */
export function isPJTransaction(tx: Transaction): boolean {
  return tx.costCenter === 'PJ' || tx.account === 'Inter PJ' || tx.jar === 'PJ_EXCLUIDO';
}

/**
 * Resolves YYYY-MM-DD tag from a Date object, ISO string, or current date.
 */
export function resolveISODateTag(date?: Date | string): string {
  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  const clean = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Builds the dynamic export filename: extrato_${scope.toLowerCase()}_${YYYY-MM-DD}.${ext}
 * Example: extrato_pj_mei_2026-11-14.csv
 */
export function buildExportFilename({ scope, format, date }: ExportFilenameOptions): string {
  const { slug } = normalizeExportScope(scope);
  const dateTag = resolveISODateTag(date);
  return `extrato_${slug}_${dateTag}.${format}`;
}

/**
 * Returns the signed numeric value of a transaction (negative for expenses, positive for income/refunds).
 */
export function getSignedTransactionAmount(tx: Transaction): number {
  const absAmount = Math.abs(Number(tx.amount) || 0);
  const signed = tx.type === 'despesa' ? -absAmount : absAmount;
  return Math.round(signed * 100) / 100;
}

/**
 * Calculates the net balance (sum of signed transaction amounts) of the exported dataset.
 */
export function calculateExportNetBalance(transactions: Transaction[]): number {
  const sum = transactions.reduce((acc, tx) => acc + getSignedTransactionAmount(tx), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Resolves hierarchical category metadata and PT-BR labels for a transaction.
 */
export function resolveTransactionExportMetadata(
  tx: Transaction,
  hierarchy: ParentCategoryItem[] = DEFAULT_CATEGORY_HIERARCHY
): {
  scopeLabel: 'PF' | 'PJ/MEI';
  typeLabel: 'Entrada' | 'Saída';
  parentCategory: string;
  subcategory: string;
  classificationLabel: 'Fixo' | 'Variável' | 'Receita';
} {
  const scopeLabel = isPJTransaction(tx) ? 'PJ/MEI' : 'PF';
  const typeLabel = tx.type === 'despesa' ? 'Saída' : 'Entrada';

  const parsed = parseHierarchicalCategory(tx.category || tx.description, hierarchy);
  const parentCategory = (tx.parentCategory || parsed.parent || 'Outros').trim();
  const subcategory = (tx.subcategory || parsed.sub || 'Diversos').trim();

  const resolvedNature = tx.nature || parsed.nature;
  let classificationLabel: 'Fixo' | 'Variável' | 'Receita' = 'Variável';
  if (tx.type === 'receita' || tx.type === 'reembolso' || resolvedNature === 'income') {
    classificationLabel = 'Receita';
  } else if (resolvedNature === 'fixed') {
    classificationLabel = 'Fixo';
  }

  return {
    scopeLabel,
    typeLabel,
    parentCategory,
    subcategory,
    classificationLabel,
  };
}

/**
 * Escapes a single CSV cell according to RFC 4180 using ';' delimiter.
 */
export function escapePTBRCsvCell(value: unknown, delimiter = ';'): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuotes =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');
  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an Excel PT-BR optimized CSV string with UTF-8 BOM, ';' delimiter,
 * exact required columns, comma-formatted decimals, and quoted escaping.
 */
export function generateExcelPTBRCSV(
  transactions: Transaction[],
  options: ExportCSVOptions = {}
): string {
  const hierarchy = options.hierarchy ?? DEFAULT_CATEGORY_HIERARCHY;
  const delimiter = ';';

  const headers = [
    'ID',
    'Data',
    'Escopo (PF/PJ)',
    'Tipo (Entrada/Saída)',
    'Categoria Pai',
    'Subcategoria',
    'Classificação (Fixo/Variável)',
    'Descrição',
    'Valor (R$)',
  ];

  const headerLine = headers.map(h => escapePTBRCsvCell(h, delimiter)).join(delimiter);

  const dataLines = transactions.map(tx => {
    const meta = resolveTransactionExportMetadata(tx, hierarchy);
    const signedAmount = getSignedTransactionAmount(tx);
    const formattedAmount = signedAmount.toFixed(2).replace('.', ',');

    const cells = [
      tx.id,
      tx.date,
      meta.scopeLabel,
      meta.typeLabel,
      meta.parentCategory,
      meta.subcategory,
      meta.classificationLabel,
      tx.description || '',
      formattedAmount,
    ];

    return cells.map(cell => escapePTBRCsvCell(cell, delimiter)).join(delimiter);
  });

  const body = [headerLine, ...dataLines].join('\r\n');
  return `\uFEFF${body}`;
}

/**
 * Escapes XML/SGML special characters for OFX tag values.
 */
function escapeOFXText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Formats YYYY-MM-DD (or fallback) into YYYYMMDD120000[-3:BRT].
 */
export function formatOFXTimestamp(dateStr: string): string {
  const iso = resolveISODateTag(dateStr);
  const compact = iso.replace(/-/g, '');
  return `${compact}120000[-3:BRT]`;
}

/**
 * Builds a deterministic, collision-free FITID for OFX `<STMTTRN>` blocks.
 */
function buildDeterministicFITID(tx: Transaction, index: number, usedIds: Set<string>): string {
  const baseRaw = (tx.id || `${tx.date}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '');
  let candidate = baseRaw || `TX-${index + 1}`;
  if (usedIds.has(candidate)) {
    candidate = `${candidate}-${index + 1}`;
  }
  usedIds.add(candidate);
  return candidate;
}

/**
 * Generates an Open Financial Exchange (OFX v102/200 SGML/XML) document
 * compliant with Brazilian banking/ERP conciliation standards.
 */
export function generateOFXStatement(
  transactions: Transaction[],
  options: ExportOFXOptions = {}
): string {
  const scopeInfo = normalizeExportScope(options.scope ?? 'Consolidado');
  const hierarchy = options.hierarchy ?? DEFAULT_CATEGORY_HIERARCHY;
  const generatedTag = resolveISODateTag(options.generatedAt);
  const serverTimestamp = formatOFXTimestamp(generatedTag);

  const sortedDates = transactions
    .map(t => resolveISODateTag(t.date))
    .sort((a, b) => a.localeCompare(b));
  const dtStart = formatOFXTimestamp(sortedDates[0] ?? generatedTag);
  const dtEnd = formatOFXTimestamp(sortedDates[sortedDates.length - 1] ?? generatedTag);

  const netBalance = calculateExportNetBalance(transactions);
  const usedFitIds = new Set<string>();

  const stmts = transactions.map((tx, idx) => {
    const meta = resolveTransactionExportMetadata(tx, hierarchy);
    const signedAmount = getSignedTransactionAmount(tx);
    const trnType = signedAmount >= 0 ? 'CREDIT' : 'DEBIT';
    const dtPosted = formatOFXTimestamp(tx.date);
    const trnAmt = signedAmount.toFixed(2);
    const fitId = buildDeterministicFITID(tx, idx, usedFitIds);
    const memoRaw = `[${meta.scopeLabel}] ${meta.parentCategory} > ${meta.subcategory} - ${tx.description || 'Sem descrição'}`;
    const memo = escapeOFXText(memoRaw);

    return [
      '          <STMTTRN>',
      `            <TRNTYPE>${trnType}</TRNTYPE>`,
      `            <DTPOSTED>${dtPosted}</DTPOSTED>`,
      `            <TRNAMT>${trnAmt}</TRNAMT>`,
      `            <FITID>${fitId}</FITID>`,
      `            <MEMO>${memo}</MEMO>`,
      '          </STMTTRN>',
    ].join('\n');
  });

  const header = [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    'SECURITY:NONE',
    'ENCODING:UTF-8',
    'CHARSET:NONE',
    'COMPRESSION:NONE',
    'OLDFILEUID:NONE',
    'NEWFILEUID:NONE',
  ].join('\n');

  const tranListBlock = stmts.length > 0 ? `\n${stmts.join('\n')}\n` : '\n';

  const body = `<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <DTSERVER>${serverTimestamp}</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1</TRNUID>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>0000</BANKID>
          <ACCTID>${scopeInfo.accountId}</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dtStart}</DTSTART>
          <DTEND>${dtEnd}</DTEND>${tranListBlock}        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>${netBalance.toFixed(2)}</BALAMT>
          <DTASOF>${serverTimestamp}</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

  return `${header}\n\n${body}\n`;
}

/**
 * Triggers a native browser Blob download for the generated text file.
 */
export function triggerBlobDownload(content: string, filename: string, mimeType: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * High-level export orchestrator that formats filtered transactions as CSV or OFX,
 * dynamically constructs the filename, and initiates native browser Blob download.
 */
export function exportTransactionsFile(
  transactions: Transaction[],
  format: ExportFormat,
  options: {
    scope: ExportScope;
    hierarchy?: ParentCategoryItem[];
    date?: Date | string;
    skipBrowserDownload?: boolean;
  }
): ExportExecutionResult {
  const filename = buildExportFilename({
    scope: options.scope,
    format,
    date: options.date,
  });

  const netBalance = calculateExportNetBalance(transactions);
  const content =
    format === 'csv'
      ? generateExcelPTBRCSV(transactions, { hierarchy: options.hierarchy })
      : generateOFXStatement(transactions, {
          scope: options.scope,
          hierarchy: options.hierarchy,
          generatedAt: options.date,
        });

  const mimeType =
    format === 'csv'
      ? 'text/csv;charset=utf-8;'
      : 'application/x-ofx;charset=utf-8;';

  const downloaded =
    options.skipBrowserDownload || transactions.length === 0
      ? false
      : triggerBlobDownload(content, filename, mimeType);

  return {
    success: options.skipBrowserDownload ? transactions.length > 0 : downloaded,
    filename,
    format,
    count: transactions.length,
    netBalance,
    content,
  };
}
