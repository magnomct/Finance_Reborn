import { MONTH_NAMES } from '../data/annualDashboardData';
import { Transaction } from '../types';

export interface MonthTrendPoint {
  monthIndex: number;
  monthName: string; // e.g. "Outubro"
  shortName: string; // e.g. "Out"
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number; // % of income saved (netBalance / totalIncome * 100)
  isPositiveBalance: boolean;
  varianceVsPrevious?: number; // % difference in net balance vs previous month
}

export interface SavingsTrendsSummary {
  months: MonthTrendPoint[];
  referenceMonthIndex: number;
  averageIncome: number;
  averageExpenses: number;
  averageBalance: number;
  averageSavingsRate: number;
  totalSavingsPeriod: number;
  bestMonth: MonthTrendPoint;
  lowestMonth: MonthTrendPoint;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number; // Variação do saldo do último mês vs média dos meses anteriores
  trendLabel: string;
  trendDescription: string;
  positiveMonthsCount: number;
  isConsistentSaver: boolean;
}

/**
 * Computes the last 6 months comparative series (Income, Expenses, Net Balance)
 * and evaluates savings trends and momentum.
 */
export function calculateSavingsTrends(
  annualReceitas: number[],
  annualDespesas: number[],
  referenceMonthIndex: number = 9, // default Outubro (index 9)
  year: number = 2026
): SavingsTrendsSummary {
  // Ensure array has 12 items
  const receitas = Array.isArray(annualReceitas) && annualReceitas.length === 12
    ? annualReceitas
    : Array(12).fill(0);
  const despesas = Array.isArray(annualDespesas) && annualDespesas.length === 12
    ? annualDespesas
    : Array(12).fill(0);

  // Calculate 6-month window up to referenceMonthIndex (inclusive)
  const windowLength = 6;
  const monthIndices: number[] = [];

  for (let i = windowLength - 1; i >= 0; i--) {
    let idx = referenceMonthIndex - i;
    while (idx < 0) idx += 12;
    monthIndices.push(idx);
  }

  const shortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const monthPoints: MonthTrendPoint[] = monthIndices.map((mIdx, i) => {
    const inc = receitas[mIdx] || 0;
    const exp = despesas[mIdx] || 0;
    const balance = inc - exp;
    const rate = inc > 0 ? (balance / inc) * 100 : 0;

    let varianceVsPrevious: number | undefined = undefined;
    if (i > 0) {
      const prevIdx = monthIndices[i - 1];
      const prevBal = (receitas[prevIdx] || 0) - (despesas[prevIdx] || 0);
      if (prevBal !== 0) {
        varianceVsPrevious = Math.round(((balance - prevBal) / Math.abs(prevBal)) * 1000) / 10;
      }
    }

    return {
      monthIndex: mIdx,
      monthName: MONTH_NAMES[mIdx] || `Mês ${mIdx + 1}`,
      shortName: shortNames[mIdx] || `M${mIdx + 1}`,
      year,
      totalIncome: Math.round(inc * 100) / 100,
      totalExpenses: Math.round(exp * 100) / 100,
      netBalance: Math.round(balance * 100) / 100,
      savingsRate: Math.round(rate * 10) / 10,
      isPositiveBalance: balance >= 0,
      varianceVsPrevious
    };
  });

  // Calculate Averages and Totals
  const sumIncome = monthPoints.reduce((acc, m) => acc + m.totalIncome, 0);
  const sumExpenses = monthPoints.reduce((acc, m) => acc + m.totalExpenses, 0);
  const sumBalance = monthPoints.reduce((acc, m) => acc + m.netBalance, 0);
  const sumSavingsRate = monthPoints.reduce((acc, m) => acc + m.savingsRate, 0);

  const averageIncome = Math.round((sumIncome / windowLength) * 100) / 100;
  const averageExpenses = Math.round((sumExpenses / windowLength) * 100) / 100;
  const averageBalance = Math.round((sumBalance / windowLength) * 100) / 100;
  const averageSavingsRate = Math.round((sumSavingsRate / windowLength) * 10) / 10;

  // Best and lowest months
  let bestMonth = monthPoints[0];
  let lowestMonth = monthPoints[0];

  monthPoints.forEach(m => {
    if (m.netBalance > bestMonth.netBalance) {
      bestMonth = m;
    }
    if (m.netBalance < lowestMonth.netBalance) {
      lowestMonth = m;
    }
  });

  // Count positive months
  const positiveMonthsCount = monthPoints.filter(m => m.isPositiveBalance).length;
  const isConsistentSaver = positiveMonthsCount >= 4;

  // Trend direction: Compare last month's balance with the average of preceding 5 months
  const preceding5 = monthPoints.slice(0, 5);
  const precedingAvgBalance = preceding5.length > 0 
    ? preceding5.reduce((acc, m) => acc + m.netBalance, 0) / preceding5.length 
    : 0;

  const lastMonth = monthPoints[monthPoints.length - 1];
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  let trendPercent = 0;

  if (precedingAvgBalance !== 0) {
    trendPercent = Math.round(((lastMonth.netBalance - precedingAvgBalance) / Math.abs(precedingAvgBalance)) * 1000) / 10;
  }

  if (trendPercent > 5) {
    trendDirection = 'up';
  } else if (trendPercent < -5) {
    trendDirection = 'down';
  } else {
    trendDirection = 'stable';
  }

  let trendLabel = 'Estabilidade na Economia';
  let trendDescription = '';

  if (trendDirection === 'up') {
    trendLabel = `Tendência de Alta (+${trendPercent.toFixed(1)}%)`;
    trendDescription = `A capacidade de poupança está crescendo. O saldo do último mês superou a média anterior em ${trendPercent.toFixed(1)}%, acumulando ${formatCurrency(sumBalance)} no semestre.`;
  } else if (trendDirection === 'down') {
    trendLabel = `Atenção: Queda Recente (${trendPercent.toFixed(1)}%)`;
    trendDescription = `O saldo recente reduziu em relação à média dos meses anteriores. Vale revisar gastos com cartões e moradia para manter a consistência de aportes.`;
  } else {
    trendLabel = 'Economia Consistente e Estável';
    trendDescription = `O fluxo de caixa semestral mantém um patamar previsível com taxa média de poupança de ${averageSavingsRate.toFixed(1)}% e superávit acumulado de ${formatCurrency(sumBalance)}.`;
  }

  return {
    months: monthPoints,
    referenceMonthIndex,
    averageIncome,
    averageExpenses,
    averageBalance,
    averageSavingsRate,
    totalSavingsPeriod: Math.round(sumBalance * 100) / 100,
    bestMonth,
    lowestMonth,
    trendDirection,
    trendPercent,
    trendLabel,
    trendDescription,
    positiveMonthsCount,
    isConsistentSaver
  };
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
