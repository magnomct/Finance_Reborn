import { DreamGoal, DreamPriority, Transaction } from '../types';
import { calculateRemainingMonths } from './dreamCalculations';
import { calculateFinancialMetrics } from './finance';

export type AutoFillAllocationMode = 'rigid_deadline' | 'fit_budget';

export const DEFAULT_COMPOUND_YIELD_MONTHLY_PCT = 0.85;

const MONTH_NAMES_PT_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES_PT_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getPriorityWeight(priority?: DreamPriority): number {
  if (priority === 'alta') return 1.45;
  if (priority === 'baixa') return 0.75;
  return 1.0;
}

export function getPriorityLabelPt(priority?: DreamPriority): string {
  if (priority === 'alta') return 'Alta';
  if (priority === 'baixa') return 'Baixa';
  return 'Média';
}

export function diffInMonths(
  referenceDateInput?: Date | string,
  targetDateStr?: string
): {
  remainingMonths: number;
  hasTargetDate: boolean;
  isPastDue: boolean;
} {
  if (!targetDateStr) {
    return {
      remainingMonths: 12,
      hasTargetDate: false,
      isPastDue: false,
    };
  }

  const rawMonths = calculateRemainingMonths(targetDateStr, referenceDateInput);
  if (rawMonths <= 0) {
    return {
      remainingMonths: 1,
      hasTargetDate: true,
      isPastDue: true,
    };
  }

  return {
    remainingMonths: Math.max(1, rawMonths),
    hasTargetDate: true,
    isPastDue: false,
  };
}

/**
 * Computes ideal monthly deposit to reach `targetAmount` from `currentAmount`
 * within `remainingMonths`, optionally accounting for monthly compound yield (% a.m.).
 */
export function calculateIdealMonthlyContribution(
  targetAmount: number,
  currentAmount: number,
  remainingMonths: number,
  monthlyYieldRatePct: number = 0
): number {
  const remainingGap = Math.max(0, targetAmount - currentAmount);
  if (remainingGap <= 0) return 0;

  const n = Math.max(1, Math.round(remainingMonths));
  const r = Math.max(0, monthlyYieldRatePct) / 100;

  if (r > 0 && n > 1) {
    const compoundFactor = Math.pow(1 + r, n);
    const futureValueCurrent = currentAmount * compoundFactor;
    const effectiveGapAtDeadline = Math.max(0, targetAmount - futureValueCurrent);
    if (effectiveGapAtDeadline <= 0) return 0;
    const denominator = compoundFactor - 1;
    if (denominator > 0) {
      return round2((effectiveGapAtDeadline * r) / denominator);
    }
  }

  return round2(remainingGap / n);
}

/**
 * Estimates number of months required to reach `targetAmount` starting from `currentAmount`
 * with recurring `monthlyContribution` and optional `monthlyYieldRatePct` (% a.m.).
 * Returns Infinity if impossible within 600 months (50 years).
 */
export function estimateMonthsWithYield(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  monthlyYieldRatePct: number = 0
): number {
  if (currentAmount >= targetAmount) return 0;

  const r = Math.max(0, monthlyYieldRatePct) / 100;
  const pmt = Math.max(0, monthlyContribution);

  if (pmt <= 0 && (r <= 0 || currentAmount <= 0)) {
    return Infinity;
  }

  if (r === 0) {
    return Math.ceil((targetAmount - currentAmount) / pmt);
  }

  let balance = currentAmount;
  const maxMonths = 600;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + r) + pmt;
    if (balance >= targetAmount - 0.01) {
      return m;
    }
  }

  return Infinity;
}

export function formatProjectedCompletion(
  monthsNeeded: number,
  referenceDateInput?: Date | string
): {
  projectedCompletionDateStr: string;
  projectedCompletionLabel: string;
  projectedCompletionShortLabel: string;
} {
  if (!Number.isFinite(monthsNeeded)) {
    return {
      projectedCompletionDateStr: '',
      projectedCompletionLabel: 'Sem previsão (aporte zero)',
      projectedCompletionShortLabel: 'Sem previsão',
    };
  }

  if (monthsNeeded <= 0) {
    return {
      projectedCompletionDateStr: '',
      projectedCompletionLabel: 'Meta já concluída',
      projectedCompletionShortLabel: 'Concluída',
    };
  }

  const ref = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : new Date(referenceDateInput))
    : new Date();

  const offset = Math.max(0, monthsNeeded - 1);
  const totalMonthsFromEpoch = ref.getFullYear() * 12 + ref.getMonth() + offset;
  const targetYear = Math.floor(totalMonthsFromEpoch / 12);
  const targetMonthIdx = totalMonthsFromEpoch % 12;

  return {
    projectedCompletionDateStr: `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}-28`,
    projectedCompletionLabel: `${MONTH_NAMES_PT_FULL[targetMonthIdx]} de ${targetYear}`,
    projectedCompletionShortLabel: `${MONTH_NAMES_PT_SHORT[targetMonthIdx]}/${targetYear}`,
  };
}

export interface MonthlyCashFlowEstimate {
  estimatedSurplus: number;
  rawNetBalance: number;
  effectiveIncomeBase: number;
  totalSpentPF: number;
}

export function estimateMonthlyFreeCashFlow(
  transactions: Transaction[],
  usePjProfitInPf: boolean = true
): MonthlyCashFlowEstimate {
  const metrics = calculateFinancialMetrics(transactions, usePjProfitInPf);
  const rawNetBalance = round2(metrics.netBalanceConsolidated);
  return {
    estimatedSurplus: Math.max(0, rawNetBalance),
    rawNetBalance,
    effectiveIncomeBase: round2(metrics.effectiveIncomeBase),
    totalSpentPF: round2(metrics.totalSpentPF),
  };
}

export interface SingleGoalQuickFillResult {
  dreamId: string;
  remainingGap: number;
  remainingMonths: number;
  hasTargetDate: boolean;
  isPastDue: boolean;
  isCompleted: boolean;
  idealMonthlyContribution: number;
  projectedCompletionLabel: string;
}

export function calculateSingleGoalQuickFill(
  dream: DreamGoal,
  options?: {
    yieldRateMonthlyPct?: number;
    referenceDate?: Date | string;
  }
): SingleGoalQuickFillResult {
  const remainingGap = round2(Math.max(0, dream.target - dream.current));
  if (remainingGap <= 0) {
    return {
      dreamId: dream.id,
      remainingGap: 0,
      remainingMonths: 0,
      hasTargetDate: !!dream.targetDate,
      isPastDue: false,
      isCompleted: true,
      idealMonthlyContribution: 0,
      projectedCompletionLabel: 'Meta já concluída',
    };
  }

  const { remainingMonths, hasTargetDate, isPastDue } = diffInMonths(
    options?.referenceDate,
    dream.targetDate
  );

  const yieldPct = options?.yieldRateMonthlyPct ?? dream.yieldRateMonthlyPct ?? 0;
  const idealMonthlyContribution = calculateIdealMonthlyContribution(
    dream.target,
    dream.current,
    remainingMonths,
    yieldPct
  );

  const projMonths = estimateMonthsWithYield(
    dream.current,
    dream.target,
    idealMonthlyContribution,
    yieldPct
  );
  const { projectedCompletionLabel } = formatProjectedCompletion(
    projMonths,
    options?.referenceDate
  );

  return {
    dreamId: dream.id,
    remainingGap,
    remainingMonths,
    hasTargetDate,
    isPastDue,
    isCompleted: false,
    idealMonthlyContribution,
    projectedCompletionLabel,
  };
}

export interface SmartAutoFillItem {
  dreamId: string;
  title: string;
  category: string;
  priority: DreamPriority;
  currentAmount: number;
  targetAmount: number;
  remainingGap: number;
  currentMonthlyDeposit: number;
  targetDate?: string;
  hasTargetDate: boolean;
  isPastDue: boolean;
  remainingMonths: number;
  urgencyScore: number;
  yieldRateMonthlyPct: number;
  idealMonthlyContribution: number;
  suggestedMonthlyContribution: number;
  deltaVsCurrentDeposit: number;
  projectedMonths: number;
  projectedCompletionDateStr: string;
  projectedCompletionLabel: string;
  projectedCompletionShortLabel: string;
  extensionMonths: number;
  isCappedByBudget: boolean;
}

export interface SmartAutoFillInput {
  dreams: DreamGoal[];
  availableSurplus: number;
  mode: AutoFillAllocationMode;
  yieldRateMonthlyPct?: number;
  referenceDate?: Date | string;
}

export interface SmartAutoFillResult {
  mode: AutoFillAllocationMode;
  activeJarsCount: number;
  completedJarsCount: number;
  availableSurplus: number;
  totalIdealMonthly: number;
  totalSuggestedMonthly: number;
  budgetHealth: 'fits_budget' | 'over_budget';
  budgetDeficit: number;
  budgetRemaining: number;
  surplusUtilizationPct: number;
  yieldRateMonthlyPct: number;
  items: SmartAutoFillItem[];
}

/**
 * Water-filling priority allocator capped at each goal's `idealMonthlyContribution`.
 * Guarantees: sum(allocated) <= budget (to the cent) and never exceeds any goal's ideal requirement.
 */
function allocateFitBudgetWithUrgency(
  items: { ideal: number; score: number }[],
  budget: number
): number[] {
  const n = items.length;
  const allocated = new Array<number>(n).fill(0);
  const safeBudget = Math.max(0, round2(budget));

  if (n === 0 || safeBudget <= 0) {
    return allocated;
  }

  let remainingBudget = safeBudget;
  const activeIndices = new Set<number>();
  items.forEach((item, idx) => {
    if (item.ideal > 0) activeIndices.add(idx);
  });

  // Water-filling passes distribute remaining budget weighted by urgency score
  // while capping every item at its ideal requirement.
  for (let pass = 0; pass < n + 2 && remainingBudget > 0.005 && activeIndices.size > 0; pass++) {
    let totalScore = 0;
    activeIndices.forEach(idx => {
      totalScore += items[idx].score;
    });

    if (totalScore <= 0) break;

    const snapshotBudget = remainingBudget;
    let distributedThisPass = 0;
    const saturated: number[] = [];

    activeIndices.forEach(idx => {
      const headroom = round2(items[idx].ideal - allocated[idx]);
      if (headroom <= 0.005) {
        saturated.push(idx);
        return;
      }
      const share = round2((snapshotBudget * items[idx].score) / totalScore);
      const grant = Math.min(headroom, share);
      allocated[idx] = round2(allocated[idx] + grant);
      distributedThisPass = round2(distributedThisPass + grant);
      if (allocated[idx] >= items[idx].ideal - 0.005) {
        saturated.push(idx);
      }
    });

    saturated.forEach(idx => activeIndices.delete(idx));
    remainingBudget = round2(Math.max(0, remainingBudget - distributedThisPass));

    if (distributedThisPass <= 0.005) break;
  }

  // Distribute leftover cents (up to available budget) strictly respecting ideal caps & highest urgency
  let remainingCents = Math.round(remainingBudget * 100);
  if (remainingCents > 0) {
    const sortedByScore = items
      .map((item, idx) => ({ idx, score: item.score, ideal: item.ideal }))
      .sort((a, b) => b.score - a.score);

    for (const entry of sortedByScore) {
      if (remainingCents <= 0) break;
      const currentVal = allocated[entry.idx];
      const maxAddCents = Math.floor(round2(entry.ideal - currentVal) * 100);
      if (maxAddCents > 0) {
        const addCents = Math.min(remainingCents, maxAddCents);
        allocated[entry.idx] = round2(currentVal + addCents / 100);
        remainingCents -= addCents;
      }
    }
  }

  return allocated;
}

export function calculateSmartAutoFill({
  dreams,
  availableSurplus,
  mode,
  yieldRateMonthlyPct = 0,
  referenceDate,
}: SmartAutoFillInput): SmartAutoFillResult {
  const safeSurplus = Math.max(0, round2(availableSurplus));
  const incompleteDreams = dreams.filter(d => d.target > d.current);
  const completedJarsCount = dreams.length - incompleteDreams.length;

  const baseEntries = incompleteDreams.map(dream => {
    const remainingGap = round2(Math.max(0, dream.target - dream.current));
    const { remainingMonths, hasTargetDate, isPastDue } = diffInMonths(
      referenceDate,
      dream.targetDate
    );

    const effectiveYield = yieldRateMonthlyPct > 0
      ? yieldRateMonthlyPct
      : (dream.yieldRateMonthlyPct ?? 0);

    const idealMonthlyContribution = calculateIdealMonthlyContribution(
      dream.target,
      dream.current,
      remainingMonths,
      effectiveYield
    );

    const priority: DreamPriority = dream.priority || 'media';
    const urgencyWeight = getPriorityWeight(priority);
    const deadlineBoost = isPastDue ? 2.5 : hasTargetDate ? 1 : 0.7;
    const urgencyScore = (urgencyWeight * deadlineBoost) / Math.sqrt(remainingMonths);

    return {
      dream,
      priority,
      remainingGap,
      remainingMonths,
      hasTargetDate,
      isPastDue,
      effectiveYield,
      idealMonthlyContribution,
      urgencyScore,
    };
  });

  // Sort by urgency score descending (nearest deadline & highest priority first)
  baseEntries.sort((a, b) => {
    if (Math.abs(b.urgencyScore - a.urgencyScore) > 1e-6) {
      return b.urgencyScore - a.urgencyScore;
    }
    return a.remainingMonths - b.remainingMonths;
  });

  const totalIdealMonthly = round2(
    baseEntries.reduce((acc, item) => acc + item.idealMonthlyContribution, 0)
  );

  const budgetHealth: 'fits_budget' | 'over_budget' =
    totalIdealMonthly <= safeSurplus + 0.01 ? 'fits_budget' : 'over_budget';
  const budgetDeficit = round2(Math.max(0, totalIdealMonthly - safeSurplus));
  const budgetRemaining = round2(Math.max(0, safeSurplus - totalIdealMonthly));

  const allocatedAmounts =
    mode === 'fit_budget' && totalIdealMonthly > safeSurplus + 0.01
      ? allocateFitBudgetWithUrgency(
          baseEntries.map(e => ({
            ideal: e.idealMonthlyContribution,
            score: e.urgencyScore,
          })),
          safeSurplus
        )
      : baseEntries.map(e => e.idealMonthlyContribution);

  const items: SmartAutoFillItem[] = baseEntries.map((entry, idx) => {
    const suggested = round2(allocatedAmounts[idx] ?? 0);
    const isCappedByBudget =
      mode === 'fit_budget' &&
      suggested + 0.01 < entry.idealMonthlyContribution;

    const projectedMonths = estimateMonthsWithYield(
      entry.dream.current,
      entry.dream.target,
      suggested,
      entry.effectiveYield
    );

    const formattedProj = formatProjectedCompletion(projectedMonths, referenceDate);
    const extensionMonths = Number.isFinite(projectedMonths)
      ? Math.max(0, projectedMonths - entry.remainingMonths)
      : 999;

    return {
      dreamId: entry.dream.id,
      title: entry.dream.title,
      category: entry.dream.category,
      priority: entry.priority,
      currentAmount: entry.dream.current,
      targetAmount: entry.dream.target,
      remainingGap: entry.remainingGap,
      currentMonthlyDeposit: entry.dream.monthlyDeposit || 0,
      targetDate: entry.dream.targetDate,
      hasTargetDate: entry.hasTargetDate,
      isPastDue: entry.isPastDue,
      remainingMonths: entry.remainingMonths,
      urgencyScore: Math.round(entry.urgencyScore * 1000) / 1000,
      yieldRateMonthlyPct: entry.effectiveYield,
      idealMonthlyContribution: entry.idealMonthlyContribution,
      suggestedMonthlyContribution: suggested,
      deltaVsCurrentDeposit: round2(suggested - (entry.dream.monthlyDeposit || 0)),
      projectedMonths,
      projectedCompletionDateStr: formattedProj.projectedCompletionDateStr,
      projectedCompletionLabel: formattedProj.projectedCompletionLabel,
      projectedCompletionShortLabel: formattedProj.projectedCompletionShortLabel,
      extensionMonths,
      isCappedByBudget,
    };
  });

  const totalSuggestedMonthly = round2(
    items.reduce((acc, item) => acc + item.suggestedMonthlyContribution, 0)
  );

  const surplusUtilizationPct = safeSurplus > 0
    ? Math.round((totalSuggestedMonthly / safeSurplus) * 1000) / 10
    : totalSuggestedMonthly > 0
    ? 999
    : 0;

  return {
    mode,
    activeJarsCount: items.length,
    completedJarsCount,
    availableSurplus: safeSurplus,
    totalIdealMonthly,
    totalSuggestedMonthly,
    budgetHealth,
    budgetDeficit,
    budgetRemaining,
    surplusUtilizationPct,
    yieldRateMonthlyPct,
    items,
  };
}
