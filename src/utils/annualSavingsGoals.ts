import { MONTH_NAMES } from '../data/annualDashboardData';

export interface MonthSavingsTarget {
  monthIndex: number; // 0 to 11
  monthName: string;
  monthShortName: string;
  targetMonthly: number;
  realizedMonthly: number;
  cumulativeTarget: number;
  cumulativeRealized: number;
  cumulativeVariance: number; // cumulativeRealized - cumulativeTarget
  monthlyVariance: number; // realizedMonthly - targetMonthly
  monthlyProgressPct: number; // (realizedMonthly / targetMonthly) * 100
  cumulativeProgressPct: number; // (cumulativeRealized / cumulativeTarget) * 100
  isGoalMet: boolean;
  isPastOrCurrentMonth: boolean;
}

export interface AnnualSavingsGoalsSummary {
  year: number;
  months: MonthSavingsTarget[];
  totalAnnualTarget: number;
  totalAnnualRealized: number;
  cumulativeTargetToDate: number; // Sum of targets from Jan to current month
  cumulativeRealizedToDate: number; // Sum of realized from Jan to current month
  cumulativeVarianceToDate: number; // cumulativeRealizedToDate - cumulativeTargetToDate
  progressToDatePct: number;
  overallAnnualProgressPct: number;
  monthsMetCount: number;
  currentMonthIndex: number;
  projectedYearEndSavings: number;
  statusHeadline: string;
  diagnosis: string;
  recommendation: string;
}

export const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const DEFAULT_ANNUAL_SAVINGS_TARGETS: number[] = [
  500, // Jan
  600, // Fev
  600, // Mar
  600, // Abr
  650, // Mai
  650, // Jun
  600, // Jul
  600, // Ago
  650, // Set
  700, // Out
  800, // Nov
  1000 // Dez (13º e fim de ano)
];

const STORAGE_KEY = 'yupee_annual_global_savings_targets_v1';

/**
 * Loads custom annual monthly savings targets from localStorage or defaults
 */
export function loadAnnualSavingsTargets(): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_ANNUAL_SAVINGS_TARGETS];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return parsed.map(v => (typeof v === 'number' && !isNaN(v) ? Math.max(0, v) : 600));
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar metas anuais de economia do localStorage:', e);
  }
  return [...DEFAULT_ANNUAL_SAVINGS_TARGETS];
}

/**
 * Saves annual monthly savings targets to localStorage
 */
export function saveAnnualSavingsTargets(targets: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  } catch (e) {
    console.warn('Erro ao salvar metas anuais de economia no localStorage:', e);
  }
}

/**
 * Suggests proportional monthly savings targets based on monthly income projections
 * (~15% baseline, with higher target in December for 13th salary)
 */
export function suggestAnnualSavingsTargets(monthlyIncomes: number[]): number[] {
  return monthlyIncomes.map((inc, idx) => {
    const baseIncome = inc > 0 ? inc : 4400;
    const rate = idx === 11 ? 0.22 : 0.15; // 22% in December, 15% other months
    const rounded = Math.round((baseIncome * rate) / 50) * 50;
    return Math.max(300, rounded);
  });
}

/**
 * Pure function: Calculates month-by-month and cumulative savings vs targets for the full year.
 */
export function calculateAnnualSavingsProgress(params: {
  targets: number[];
  realizedSavings: number[];
  currentMonthIndex?: number; // 0 to 11 (e.g. 9 for Outubro)
  year?: number;
}): AnnualSavingsGoalsSummary {
  const {
    targets = DEFAULT_ANNUAL_SAVINGS_TARGETS,
    realizedSavings = [],
    currentMonthIndex = 9,
    year = 2026
  } = params;

  let cumTarget = 0;
  let cumRealized = 0;
  let monthsMetCount = 0;

  const months: MonthSavingsTarget[] = [];

  for (let i = 0; i < 12; i++) {
    const targetMonthly = Math.max(0, targets[i] ?? 600);
    const realizedMonthly = realizedSavings[i] ?? 0;

    cumTarget += targetMonthly;
    cumRealized += realizedMonthly;

    const monthlyVariance = Math.round((realizedMonthly - targetMonthly) * 100) / 100;
    const cumulativeVariance = Math.round((cumRealized - cumTarget) * 100) / 100;

    const monthlyProgressPct = targetMonthly > 0
      ? Math.round((realizedMonthly / targetMonthly) * 1000) / 10
      : (realizedMonthly > 0 ? 100 : 0);

    const cumulativeProgressPct = cumTarget > 0
      ? Math.round((cumRealized / cumTarget) * 1000) / 10
      : 0;

    const isGoalMet = realizedMonthly >= targetMonthly;
    const isPastOrCurrentMonth = i <= currentMonthIndex;

    if (isGoalMet && isPastOrCurrentMonth) {
      monthsMetCount++;
    }

    months.push({
      monthIndex: i,
      monthName: MONTH_NAMES[i] || `Mês ${i + 1}`,
      monthShortName: SHORT_MONTHS[i] || `M${i + 1}`,
      targetMonthly,
      realizedMonthly: Math.round(realizedMonthly * 100) / 100,
      cumulativeTarget: Math.round(cumTarget * 100) / 100,
      cumulativeRealized: Math.round(cumRealized * 100) / 100,
      cumulativeVariance,
      monthlyVariance,
      monthlyProgressPct,
      cumulativeProgressPct,
      isGoalMet,
      isPastOrCurrentMonth
    });
  }

  const totalAnnualTarget = cumTarget;
  const totalAnnualRealized = cumRealized;

  // Cumulative metrics up to current reference month
  const targetToDateMonth = months[Math.min(currentMonthIndex, 11)];
  const cumulativeTargetToDate = targetToDateMonth ? targetToDateMonth.cumulativeTarget : 0;
  const cumulativeRealizedToDate = targetToDateMonth ? targetToDateMonth.cumulativeRealized : 0;
  const cumulativeVarianceToDate = Math.round((cumulativeRealizedToDate - cumulativeTargetToDate) * 100) / 100;

  const progressToDatePct = cumulativeTargetToDate > 0
    ? Math.round((cumulativeRealizedToDate / cumulativeTargetToDate) * 1000) / 10
    : 0;

  const overallAnnualProgressPct = totalAnnualTarget > 0
    ? Math.round((cumulativeRealizedToDate / totalAnnualTarget) * 1000) / 10
    : 0;

  // Projection based on average monthly savings achieved to date
  const completedMonthsCount = Math.max(1, currentMonthIndex + 1);
  const avgMonthlySavings = cumulativeRealizedToDate / completedMonthsCount;
  const remainingMonths = 12 - completedMonthsCount;
  const projectedYearEndSavings = Math.round((cumulativeRealizedToDate + (avgMonthlySavings * remainingMonths)) * 100) / 100;

  let statusHeadline = 'Economia Acumulada em Superávit! 🎉';
  let diagnosis = `Você já acumulou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cumulativeRealizedToDate)} até ${MONTH_NAMES[currentMonthIndex]}, superando a meta planejada de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cumulativeTargetToDate)}.`;
  let recommendation = 'Mantenha aportes disciplinados na Reserva de Emergência (PLP) e Liberdade Financeira (LIF) para acelerar seus sonhos.';

  if (cumulativeVarianceToDate < 0) {
    statusHeadline = 'Atenção: Economia Acumulada Abaixo da Meta';
    diagnosis = `O realizado acumulado está ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(cumulativeVarianceToDate))} abaixo da meta até ${MONTH_NAMES[currentMonthIndex]}.`;
    recommendation = 'Avalie renegociar despesas fixas ou direcionar superávits de faturamento PJ para repor a meta de poupança.';
  }

  return {
    year,
    months,
    totalAnnualTarget: Math.round(totalAnnualTarget * 100) / 100,
    totalAnnualRealized: Math.round(totalAnnualRealized * 100) / 100,
    cumulativeTargetToDate: Math.round(cumulativeTargetToDate * 100) / 100,
    cumulativeRealizedToDate: Math.round(cumulativeRealizedToDate * 100) / 100,
    cumulativeVarianceToDate,
    progressToDatePct,
    overallAnnualProgressPct,
    monthsMetCount,
    currentMonthIndex,
    projectedYearEndSavings,
    statusHeadline,
    diagnosis,
    recommendation
  };
}
