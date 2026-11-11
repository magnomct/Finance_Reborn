import { Transaction } from '../types';
import { formatBRL } from './finance';

export interface LeisureVariableCutScenario {
  percent: number;
  label: string;
  badge: string;
  dailyCut: number;
  monthlySavings: number;
  annualSavings: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentOfTotal: number;
}

export interface LeisureVariableAnalysisResult {
  hasData: boolean;
  totalSpent: number;
  dailyAverage: number;
  transactionCount: number;
  transactions: Transaction[];
  startDateStr: string;
  endDateStr: string;
  windowDays: number;
  selectedCutPercent: number;
  suggestedDailyCut: number;
  suggestedMonthlySavings: number;
  suggestedAnnualSavings: number;
  scenarios: LeisureVariableCutScenario[];
  categoriesBreakdown: CategoryBreakdown[];
  topExpense?: {
    description: string;
    amount: number;
    date: string;
    category?: string;
  };
  adviceMessage: string;
}

/**
 * Checks if a transaction belongs to 'Lazer' or 'Variável' / 'DIV_10'
 */
export function isLeisureOrVariable(tx: Transaction): boolean {
  // Only expenses
  if (tx.type !== 'despesa' && tx.amount >= 0) {
    return false;
  }

  // Check 6-Potes jar for leisure
  if (tx.jar === 'DIV_10') {
    return true;
  }

  const category = (tx.category || '').toLowerCase().trim();
  const description = (tx.description || '').toLowerCase().trim();

  // Primary categories explicitly matching user prompt
  if (
    category.includes('lazer') ||
    category.includes('variável') ||
    category.includes('variavel') ||
    category.includes('diversão') ||
    category.includes('diversao') ||
    category.includes('entretenimento') ||
    category.includes('estilo')
  ) {
    return true;
  }

  // Discretionary variable spending keywords in description
  if (
    description.includes('lazer') ||
    description.includes('cinema') ||
    description.includes('restaurante') ||
    description.includes('bar ') ||
    description.includes('balada') ||
    description.includes('delivery') ||
    description.includes('ifood') ||
    description.includes('uber eats') ||
    description.includes('churrasco') ||
    description.includes('streaming')
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves the 30-day date window.
 * If referenceDate is provided, uses it. If not, checks today.
 * If today has no transactions in the window but past transactions exist,
 * automatically falls back to the latest transaction date as the reference point
 * so that simulated historical datasets always have meaningful calculations.
 */
export function resolveAnalysisDateRange(
  transactions: Transaction[],
  referenceDateInput?: Date | string,
  windowDays: number = 30
): { startDate: Date; endDate: Date } {
  let refDate: Date;

  if (referenceDateInput) {
    refDate = new Date(referenceDateInput);
  } else {
    // Check if any leisure/variable transaction falls in the last 30 days from now
    const now = new Date();
    const potentialStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    
    const matchingInCurrentWindow = transactions.some(tx => {
      if (!isLeisureOrVariable(tx)) return false;
      const d = new Date(tx.date);
      return !isNaN(d.getTime()) && d >= potentialStart && d <= now;
    });

    if (matchingInCurrentWindow) {
      refDate = now;
    } else {
      // Find latest leisure/variable transaction date, or latest transaction date overall
      const relevantDates = transactions
        .filter(tx => isLeisureOrVariable(tx))
        .map(tx => new Date(tx.date).getTime())
        .filter(t => !isNaN(t));

      if (relevantDates.length > 0) {
        refDate = new Date(Math.max(...relevantDates));
      } else {
        const allDates = transactions
          .map(tx => new Date(tx.date).getTime())
          .filter(t => !isNaN(t));
        refDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : now;
      }
    }
  }

  // End of the day for the reference date
  const endDate = new Date(refDate);
  endDate.setHours(23, 59, 59, 999);

  // Start is 30 days prior (start of that day)
  const startDate = new Date(endDate.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Analyzes expenses categorized as 'Lazer' or 'Variável' in the last 30 days,
 * calculates daily average spending, suggests specific cuts and computes savings in BRL.
 */
export function calculateLeisureVariableAnalysis(
  transactions: Transaction[],
  selectedCutPercent: number = 20,
  referenceDateInput?: Date | string,
  windowDays: number = 30
): LeisureVariableAnalysisResult {
  const { startDate, endDate } = resolveAnalysisDateRange(transactions, referenceDateInput, windowDays);

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  // Filter transactions in window
  const matchingTx = (transactions || []).filter(tx => {
    if (!isLeisureOrVariable(tx)) return false;
    const d = new Date(tx.date + 'T12:00:00');
    const t = d.getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  const totalSpent = matchingTx.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  const transactionCount = matchingTx.length;
  const hasData = totalSpent > 0;

  // Daily average over the 30-day window
  const safeWindowDays = Math.max(1, windowDays);
  const dailyAverage = totalSpent / safeWindowDays;

  // Cut calculation for the chosen percentage
  const safePercent = Math.min(100, Math.max(0, selectedCutPercent));
  const suggestedDailyCut = dailyAverage * (safePercent / 100);
  const suggestedMonthlySavings = suggestedDailyCut * safeWindowDays;
  const suggestedAnnualSavings = suggestedMonthlySavings * 12;

  // Preset scenarios: 10% (Leve), 20% (Recomendado), 30% (Moderado), 50% (Agressivo)
  const presetPercents = [
    { percent: 10, label: 'Econômico', badge: '10% de corte' },
    { percent: 20, label: 'Recomendado ⭐', badge: '20% de corte' },
    { percent: 30, label: 'Moderado', badge: '30% de corte' },
    { percent: 50, label: 'Acelerador', badge: '50% de corte' }
  ];

  const scenarios: LeisureVariableCutScenario[] = presetPercents.map(p => {
    const dCut = dailyAverage * (p.percent / 100);
    const mSavings = dCut * safeWindowDays;
    return {
      percent: p.percent,
      label: p.label,
      badge: p.badge,
      dailyCut: dCut,
      monthlySavings: mSavings,
      annualSavings: mSavings * 12
    };
  });

  // Top single expense
  let topExpense: { description: string; amount: number; date: string; category?: string } | undefined;
  if (matchingTx.length > 0) {
    const sorted = [...matchingTx].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    topExpense = {
      description: sorted[0].description,
      amount: Math.abs(sorted[0].amount),
      date: sorted[0].date,
      category: sorted[0].category || 'Lazer / Variável'
    };
  }

  // Categories breakdown
  const categoryMap = new Map<string, { total: number; count: number }>();
  matchingTx.forEach(tx => {
    const cat = tx.category || (tx.jar === 'DIV_10' ? 'Lazer & Estilo (DIV_10)' : 'Gastos Variáveis');
    const existing = categoryMap.get(cat) || { total: 0, count: 0 };
    existing.total += Math.abs(tx.amount);
    existing.count += 1;
    categoryMap.set(cat, existing);
  });

  const categoriesBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, val]) => ({
      category,
      total: val.total,
      count: val.count,
      percentOfTotal: totalSpent > 0 ? (val.total / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  // Advice synthesis
  let adviceMessage = '';
  if (!hasData) {
    adviceMessage = 'Nenhum gasto de Lazer ou Variável identificado nos últimos 30 dias. Excelente controle discricionário!';
  } else {
    adviceMessage = `Cortando ${formatBRL(suggestedDailyCut)}/dia (${safePercent}% da média diária de ${formatBRL(dailyAverage)}), você poupa ${formatBRL(suggestedMonthlySavings)} no mês e ${formatBRL(suggestedAnnualSavings)} no ano.`;
  }

  return {
    hasData,
    totalSpent,
    dailyAverage,
    transactionCount,
    transactions: matchingTx,
    startDateStr: startDate.toLocaleDateString('pt-BR'),
    endDateStr: endDate.toLocaleDateString('pt-BR'),
    windowDays: safeWindowDays,
    selectedCutPercent: safePercent,
    suggestedDailyCut,
    suggestedMonthlySavings,
    suggestedAnnualSavings,
    scenarios,
    categoriesBreakdown,
    topExpense,
    adviceMessage
  };
}
