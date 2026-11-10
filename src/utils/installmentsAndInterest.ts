import { Transaction } from '../types';

export type CommitmentType = 'parcelamento' | 'juros';

export interface DetectedCommitment {
  id: string;
  transactionId: string;
  description: string;
  amount: number; // positive value representing monthly expense drain
  type: CommitmentType;
  category: string;
  account: string;
  costCenter: string;
  matchReason: string;
  isRecurring: boolean;
  date: string;
  tags: string[];
}

export interface MonthCashFlowProjection {
  monthIndex: number; // 1, 2, 3
  monthKey: string; // '2026-11'
  monthLabel: string; // 'Novembro/2026'
  monthShortLabel: string; // 'Mês 1 (Nov/26)'
  installmentsAmount: number;
  interestAmount: number;
  monthTotal: number;
  cumulativeTotal: number;
}

export interface CashFlowDebtImpactSummary {
  detectedItems: DetectedCommitment[];
  activeItemsCount: number;
  monthlyInstallments: number;
  monthlyInterest: number;
  totalMonthlyDrain: number;
  projections: MonthCashFlowProjection[];
  cumulative3MonthsTotal: number;
  cumulative3MonthsInstallments: number;
  cumulative3MonthsInterest: number;
  interestSharePct: number;
  avoidableSavings3Months: number;
}

// Regex and keyword lists
const JUROS_KEYWORDS = [
  'juros',
  'juro',
  'cheque especial',
  'rotativo',
  'encargos',
  'encargo',
  'multa por atraso',
  'juros de mora',
  'iof',
  'tarifa atraso'
];

const PARCELAMENTO_KEYWORDS = [
  'parcelamento',
  'parcelado',
  'parcela',
  'parc',
  'prestacao',
  'financiamento',
  'emprestimo',
  'consignado',
  'renegociacao',
  'fatura parcelada',
  'crediario',
  'carne'
];

/**
 * Normalizes text removing accents, diacritics and casing for reliable keyword detection.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Checks if a transaction relates to interest or installment plans.
 */
export function identifyCommitment(t: Transaction): { isMatch: boolean; type?: CommitmentType; reason?: string } {
  // Only consider expense-type transactions (or negative amount)
  if (t.type === 'receita' || t.type === 'reembolso' || t.amount >= 0) {
    return { isMatch: false };
  }

  const descNorm = normalizeText(t.description);
  const catNorm = normalizeText(t.category || '');
  const notesNorm = normalizeText(t.notes || '');
  const combined = `${descNorm} ${catNorm} ${notesNorm}`;

  // 1. Check for Juros keywords in description first, or combined
  for (const kw of JUROS_KEYWORDS) {
    if (combined.includes(kw)) {
      return {
        isMatch: true,
        type: 'juros',
        reason: `Encargo financeiro detectado pelo termo "${kw}"`
      };
    }
  }

  // 2. Check for Parcelamento keywords
  for (const kw of PARCELAMENTO_KEYWORDS) {
    if (combined.includes(kw)) {
      return {
        isMatch: true,
        type: 'parcelamento',
        reason: `Compromisso parcelado detectado pelo termo "${kw}"`
      };
    }
  }

  return { isMatch: false };
}

/**
 * Scans a transaction list and extracts unique detected commitments.
 */
export function detectCommitmentsFromTransactions(transactions: Transaction[]): DetectedCommitment[] {
  const result: DetectedCommitment[] = [];
  const seenDescriptions = new Set<string>();

  for (const t of transactions) {
    const check = identifyCommitment(t);
    if (!check.isMatch || !check.type) continue;

    // Use normalized description to avoid duplicate entries for the same monthly recurring expense
    const normKey = `${normalizeText(t.description)}_${check.type}_${t.account}`;
    if (seenDescriptions.has(normKey)) continue;
    seenDescriptions.add(normKey);

    const amountAbs = Math.abs(t.amount);
    const tags: string[] = [];

    if (check.type === 'juros') {
      tags.push('Juros / Encargos');
      if (amountAbs >= 100) tags.push('Alto Impacto');
      tags.push('Evitável');
    } else {
      tags.push('Parcela Mensal');
      if (amountAbs >= 1000) tags.push('Compromisso Alto');
    }

    result.push({
      id: `commit-${t.id}`,
      transactionId: t.id,
      description: t.description,
      amount: amountAbs,
      type: check.type,
      category: t.category || (check.type === 'juros' ? 'Juros / Tarifas' : 'Dívidas / Parcelas'),
      account: t.account,
      costCenter: t.costCenter,
      matchReason: check.reason || 'Compromisso identificado',
      isRecurring: t.isRecurring ?? true,
      date: t.date,
      tags
    });
  }

  return result.sort((a, b) => b.amount - a.amount);
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Computes month projections for the next 3 months starting after the base date.
 */
export function generateNext3MonthLabels(baseDateStr: string = '2026-10-15'): { monthKey: string; monthLabel: string; monthShortLabel: string }[] {
  let date: Date;
  try {
    const parts = baseDateStr.split('-');
    if (parts.length >= 2) {
      date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parts[2] ? parseInt(parts[2], 10) : 1);
    } else {
      date = new Date();
    }
  } catch {
    date = new Date();
  }

  const results: { monthKey: string; monthLabel: string; monthShortLabel: string }[] = [];

  for (let i = 1; i <= 3; i++) {
    const nextDate = new Date(date.getFullYear(), date.getMonth() + i, 1);
    const year = nextDate.getFullYear();
    const monthIdx = nextDate.getMonth();
    const monthPad = String(monthIdx + 1).padStart(2, '0');
    const monthKey = `${year}-${monthPad}`;
    const yearShort = String(year).slice(-2);

    results.push({
      monthKey,
      monthLabel: `${MONTH_NAMES[monthIdx]}/${year}`,
      monthShortLabel: `Mês ${i} (${MONTH_NAMES_SHORT[monthIdx]}/${yearShort})`
    });
  }

  return results;
}

/**
 * Calculates the cumulative 3-month cash flow impact for a given set of commitments.
 * Supports toggling active/inactive items.
 */
export function calculateCashFlowDebtImpact(
  commitments: DetectedCommitment[],
  activeItemIds?: Set<string>,
  baseDateStr: string = '2026-10-15'
): CashFlowDebtImpactSummary {
  const activeItems = commitments.filter(item => 
    !activeItemIds || activeItemIds.has(item.id)
  );

  let monthlyInstallments = 0;
  let monthlyInterest = 0;

  for (const item of activeItems) {
    if (item.type === 'parcelamento') {
      monthlyInstallments += item.amount;
    } else if (item.type === 'juros') {
      monthlyInterest += item.amount;
    }
  }

  const totalMonthlyDrain = monthlyInstallments + monthlyInterest;
  const monthLabels = generateNext3MonthLabels(baseDateStr);

  let runningCumulative = 0;
  const projections: MonthCashFlowProjection[] = monthLabels.map((info, idx) => {
    const monthTotal = totalMonthlyDrain;
    runningCumulative += monthTotal;

    return {
      monthIndex: idx + 1,
      monthKey: info.monthKey,
      monthLabel: info.monthLabel,
      monthShortLabel: info.monthShortLabel,
      installmentsAmount: monthlyInstallments,
      interestAmount: monthlyInterest,
      monthTotal,
      cumulativeTotal: runningCumulative
    };
  });

  const cumulative3MonthsTotal = runningCumulative;
  const cumulative3MonthsInstallments = monthlyInstallments * 3;
  const cumulative3MonthsInterest = monthlyInterest * 3;
  const interestSharePct = cumulative3MonthsTotal > 0 
    ? (cumulative3MonthsInterest / cumulative3MonthsTotal) * 100 
    : 0;

  return {
    detectedItems: commitments,
    activeItemsCount: activeItems.length,
    monthlyInstallments,
    monthlyInterest,
    totalMonthlyDrain,
    projections,
    cumulative3MonthsTotal,
    cumulative3MonthsInstallments,
    cumulative3MonthsInterest,
    interestSharePct: parseFloat(interestSharePct.toFixed(1)),
    avoidableSavings3Months: cumulative3MonthsInterest
  };
}
