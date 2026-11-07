import { MONTH_NAMES } from '../data/annualDashboardData';
import { Transaction } from '../types';
import { calculateFinancialMetrics } from './finance';

export interface MonthBalancePoint {
  monthIndex: number;
  monthName: string;
  shortName: string;
  year: number;
  receitas: number;
  despesas: number;
  saldo: number;
  savingsRate: number; // (saldo / receitas) * 100
  isSurplus: boolean;
  isOverspending: boolean;
  varianceVsPrev?: number;
}

export type TrendCategory = 'economia' | 'gastos_excessivos' | 'estabilidade';

export interface MonthlyEvolutionSummary {
  months: MonthBalancePoint[];
  referenceMonthIndex: number;
  averageIncome: number;
  averageExpenses: number;
  averageBalance: number;
  averageSavingsRate: number;
  totalSavingsPeriod: number;
  bestMonth: MonthBalancePoint;
  lowestMonth: MonthBalancePoint;
  trendStatus: TrendCategory;
  trendPercentage: number;
  trendHeadline: string;
  trendDiagnosis: string;
  recommendation: string;
  isConsistentSaver: boolean;
  overspendingMonthsCount: number;
}

/**
 * Pure function: Computes the 6-month monthly balance evolution (Receitas vs Despesas)
 * and analyzes spending trends to detect habits of economy or overspending.
 */
export function calculate6MonthBalanceEvolution(params?: {
  currentTransactions?: Transaction[];
  usePjProfitInPf?: boolean;
  referenceMonthIndex?: number;
  year?: number;
}): MonthlyEvolutionSummary {
  const {
    currentTransactions = [],
    usePjProfitInPf = true,
    referenceMonthIndex = 9, // Outubro (index 9)
    year = 2026,
  } = params || {};

  // Current month dynamic totals from transactions
  let currentMonthIncome = 5082.31;
  let currentMonthExpenses = 5080.00;

  if (currentTransactions.length > 0) {
    const metrics = calculateFinancialMetrics(currentTransactions, usePjProfitInPf);
    if (metrics.totalReceipts > 0) currentMonthIncome = metrics.totalReceipts;
    if (metrics.totalPayments > 0) currentMonthExpenses = metrics.totalPayments;
  }

  // 6 months historical data leading up to October 2026:
  // Maio (4), Junho (5), Julho (6), Agosto (7), Setembro (8), Outubro (9)
  const baseSeries = [
    { mIdx: 4, shortName: 'Mai', name: 'Maio', inc: 4800, exp: 4450 },
    { mIdx: 5, shortName: 'Jun', name: 'Junho', inc: 4900, exp: 4520 },
    { mIdx: 6, shortName: 'Jul', name: 'Julho', inc: 4850, exp: 4700 },
    { mIdx: 7, shortName: 'Ago', name: 'Agosto', inc: 4800, exp: 4650 },
    { mIdx: 8, shortName: 'Set', name: 'Setembro', inc: 5050, exp: 4820 },
    { mIdx: 9, shortName: 'Out', name: 'Outubro', inc: currentMonthIncome, exp: currentMonthExpenses },
  ];

  const months: MonthBalancePoint[] = baseSeries.map((s, idx) => {
    const balance = Math.round((s.inc - s.exp) * 100) / 100;
    const rate = s.inc > 0 ? Math.round((balance / s.inc) * 1000) / 10 : 0;
    const isSurplus = balance >= 0;
    const isOverspending = balance < 0 || (s.exp / s.inc) > 0.96;

    let varianceVsPrev: number | undefined = undefined;
    if (idx > 0) {
      const prevBal = baseSeries[idx - 1].inc - baseSeries[idx - 1].exp;
      if (prevBal !== 0) {
        varianceVsPrev = Math.round(((balance - prevBal) / Math.abs(prevBal)) * 1000) / 10;
      }
    }

    return {
      monthIndex: s.mIdx,
      monthName: s.name,
      shortName: s.shortName,
      year,
      receitas: Math.round(s.inc * 100) / 100,
      despesas: Math.round(s.exp * 100) / 100,
      saldo: balance,
      savingsRate: rate,
      isSurplus,
      isOverspending,
      varianceVsPrev,
    };
  });

  const count = months.length;
  const sumInc = months.reduce((acc, m) => acc + m.receitas, 0);
  const sumExp = months.reduce((acc, m) => acc + m.despesas, 0);
  const sumBal = months.reduce((acc, m) => acc + m.saldo, 0);
  const sumRates = months.reduce((acc, m) => acc + m.savingsRate, 0);

  const averageIncome = Math.round((sumInc / count) * 100) / 100;
  const averageExpenses = Math.round((sumExp / count) * 100) / 100;
  const averageBalance = Math.round((sumBal / count) * 100) / 100;
  const averageSavingsRate = Math.round((sumRates / count) * 10) / 10;

  let bestMonth = months[0];
  let lowestMonth = months[0];
  months.forEach(m => {
    if (m.saldo > bestMonth.saldo) bestMonth = m;
    if (m.saldo < lowestMonth.saldo) lowestMonth = m;
  });

  const overspendingMonthsCount = months.filter(m => m.isOverspending).length;
  const positiveMonthsCount = months.filter(m => m.isSurplus).length;
  const isConsistentSaver = positiveMonthsCount >= 5 && averageSavingsRate >= 3;

  // Trend analysis: Compare second half (last 3 months) vs first half (first 3 months)
  const firstHalfAvgBal = (months[0].saldo + months[1].saldo + months[2].saldo) / 3;
  const secondHalfAvgBal = (months[3].saldo + months[4].saldo + months[5].saldo) / 3;

  let trendPercentage = 0;
  if (firstHalfAvgBal !== 0) {
    trendPercentage = Math.round(((secondHalfAvgBal - firstHalfAvgBal) / Math.abs(firstHalfAvgBal)) * 1000) / 10;
  }

  let trendStatus: TrendCategory = 'estabilidade';
  let trendHeadline = 'Equilíbrio Mensal Estável';
  let trendDiagnosis = '';
  let recommendation = '';

  if (sumBal < 0 || overspendingMonthsCount >= 3 || (months[5].saldo < 0)) {
    trendStatus = 'gastos_excessivos';
    trendHeadline = 'Atenção: Pressão de Gastos Excessivos Detectada';
    trendDiagnosis = `Nos últimos 6 meses, as despesas consumiram em média ${((averageExpenses / (averageIncome || 1)) * 100).toFixed(0)}% das receitas, deixando pouca margem livre (saldo médio de R$ ${averageBalance.toFixed(0)}/mês).`;
    recommendation = 'Recomenda-se calibrar os limites dos potes de Diversão e Cartão C6 para estancar vazamentos e recuperar a taxa de poupança.';
  } else if (trendPercentage >= 5 || (averageSavingsRate >= 5 && positiveMonthsCount === 6)) {
    trendStatus = 'economia';
    trendHeadline = `Tendência de Economia em Alta (+${Math.abs(trendPercentage)}%)`;
    trendDiagnosis = `Excelente ritmo de poupança: o saldo semestral acumulado é de R$ ${sumBal.toFixed(0)}, com taxa média de economia de ${averageSavingsRate.toFixed(1)}% ao mês e todos os 6 meses com superávit.`;
    recommendation = 'Aproveite o superávit consistente para acelerar os aportes na Reserva de Emergência (PLP) ou nos Sonhos prioritários.';
  } else {
    trendStatus = 'estabilidade';
    trendHeadline = 'Fluxo de Caixa Previsível e Consistente';
    trendDiagnosis = `Receitas e despesas mantiveram uma trajetória alinhada nos últimos 6 meses, gerando um saldo médio positivo de R$ ${averageBalance.toFixed(0)}/mês (${averageSavingsRate.toFixed(1)}% de poupança).`;
    recommendation = 'Manter o monitoramento contínuo dos vencimentos concentrados no fim do mês para preservar a tranquilidade financeira.';
  }

  return {
    months,
    referenceMonthIndex,
    averageIncome,
    averageExpenses,
    averageBalance,
    averageSavingsRate,
    totalSavingsPeriod: Math.round(sumBal * 100) / 100,
    bestMonth,
    lowestMonth,
    trendStatus,
    trendPercentage,
    trendHeadline,
    trendDiagnosis,
    recommendation,
    isConsistentSaver,
    overspendingMonthsCount,
  };
}
