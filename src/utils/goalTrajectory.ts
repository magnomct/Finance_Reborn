import { DreamGoal, GoalContribution, Transaction } from '../types';
import { formatBRL } from './finance';
import { calculateRemainingMonths } from './dreamCalculations';
import { doesTransactionMatchDream } from './dreamMilestones';

export type GoalPacingStatus = 'ahead' | 'slight_delay' | 'behind' | 'completed';

export interface GoalTrajectoryPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. Nov/26
  monthFullLabel: string; // e.g. Novembro de 2026
  monthlyDeposit: number;
  idealCumulative: number;
  actualCumulative: number | null; // null for future months
  deltaBRL: number | null; // actualCumulative - idealCumulative, null for future
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

export interface CalculateGoalTrajectoryParams {
  targetAmount: number;
  currentAmount: number;
  startDate?: string;
  targetDate?: string;
  contributionsHistory?: GoalContribution[];
  yieldRateMonthlyPct?: number;
  monthlyDepositFallback?: number;
  goalIdSeed?: string;
  referenceDate?: Date | string;
}

export interface GoalTrajectoryResult {
  points: GoalTrajectoryPoint[];
  startMonthKey: string;
  targetMonthKey: string;
  currentMonthKey: string;
  hasTargetDate: boolean;
  isPastDeadline: boolean;
  targetAmount: number;
  currentAmount: number;
  idealAtCurrentMonth: number;
  actualAtCurrentMonth: number;
  scheduleVarianceBRL: number;
  scheduleVariancePct: number;
  pacingStatus: GoalPacingStatus;
  pacingBadgeLabel: string;
  remainingMonths: number;
  requiredMonthlyDepositNow: number;
  last3MonthsAvgDeposit: number;
  projectedCompletionMonthKey: string | null;
  projectedCompletionLabel: string;
  formattedTargetDate: string;
  effectiveHistory: GoalContribution[];
  usedFallbackHistory: boolean;
}

const SHORT_MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseDateToLocal(input?: Date | string): Date {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : input;
  }
  const trimmed = input.trim();
  const ymMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    return new Date(Number(ymMatch[1]), Number(ymMatch[2]) - 1, 1);
  }
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toMonthKey(input?: Date | string): string {
  if (!input) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof input === 'string') {
    const match = input.trim().match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  const d = parseDateToLocal(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonthsToKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function compareMonthKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function listMonthKeysBetween(startKey: string, endKey: string, maxMonths = 120): string[] {
  if (compareMonthKeys(startKey, endKey) > 0) return [startKey];
  const keys: string[] = [];
  let cursor = startKey;
  while (compareMonthKeys(cursor, endKey) <= 0 && keys.length < maxMonths) {
    keys.push(cursor);
    cursor = addMonthsToKey(cursor, 1);
  }
  return keys;
}

export function formatMonthShortPtBr(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return monthKey;
  return `${SHORT_MONTHS_PT[m - 1]}/${String(y).slice(-2)}`;
}

export function formatMonthFullPtBr(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return monthKey;
  return `${FULL_MONTHS_PT[m - 1]} de ${y}`;
}

export function formatTargetDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'Sem prazo definido';
  const ymd = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  const ym = dateStr.trim().match(/^(\d{4})-(\d{2})/);
  if (ym) return `${ym[2]}/${ym[1]}`;
  return dateStr;
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

const FALLBACK_WEIGHT_PROFILES: number[][] = [
  [0.18, 0.24, 0.21, 0.37],
  [0.14, 0.22, 0.19, 0.26, 0.19],
  [0.20, 0.16, 0.28, 0.21, 0.15],
  [0.15, 0.23, 0.27, 0.35],
];

/**
 * Generates deterministic, realistic monthly fallback contributions whose sum equals totalAmount exactly.
 */
export function generateFallbackContributions(
  totalAmount: number,
  seedKey: string = 'goal',
  startDate?: string,
  referenceDate?: Date | string
): GoalContribution[] {
  const cleanTotal = round2(Math.max(0, totalAmount));
  if (cleanTotal <= 0) return [];

  const currentMonthKey = toMonthKey(referenceDate);
  const profile = FALLBACK_WEIGHT_PROFILES[hashSeed(seedKey) % FALLBACK_WEIGHT_PROFILES.length];

  let monthCount = profile.length;
  if (startDate) {
    const startKey = toMonthKey(startDate);
    if (compareMonthKeys(startKey, currentMonthKey) <= 0) {
      const span = listMonthKeysBetween(startKey, currentMonthKey, 12).length;
      if (span >= 1 && span < monthCount) {
        monthCount = span;
      }
    }
  }

  const weights = profile.slice(0, monthCount);
  const weightSum = weights.reduce((acc, w) => acc + w, 0) || 1;

  const entries: GoalContribution[] = [];
  let allocated = 0;

  for (let idx = 0; idx < monthCount; idx++) {
    const offset = -(monthCount - 1 - idx);
    const mKey = addMonthsToKey(currentMonthKey, offset);
    const isLast = idx === monthCount - 1;
    const amount = isLast
      ? round2(cleanTotal - allocated)
      : round2((cleanTotal * weights[idx]) / weightSum);
    allocated = round2(allocated + amount);

    if (amount > 0) {
      entries.push({
        id: `fallback-${seedKey}-${mKey}`,
        date: `${mKey}-10`,
        amount,
        note: 'Aporte histórico consolidado',
      });
    }
  }

  return entries;
}

/**
 * Resolves effective contribution history for a DreamGoal from explicit contributionsHistory,
 * matching transactions, and deterministic fallback backfill for any uncovered current balance.
 */
export function resolveGoalContributions(
  dream: DreamGoal,
  transactions: Transaction[] = [],
  referenceDate?: Date | string
): { history: GoalContribution[]; usedFallback: boolean } {
  if (Array.isArray(dream.contributionsHistory) && dream.contributionsHistory.length > 0) {
    const sorted = [...dream.contributionsHistory]
      .filter(c => Number.isFinite(c.amount) && c.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { history: sorted, usedFallback: false };
  }

  const matchedTxs = (transactions || [])
    .filter(tx => doesTransactionMatchDream(tx, dream))
    .map(tx => ({
      id: `tx-${tx.id}`,
      date: tx.date,
      amount: round2(Math.abs(tx.amount || 0)),
      note: tx.description,
    }))
    .filter(c => c.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const txSum = round2(matchedTxs.reduce((s, c) => s + c.amount, 0));
  const currentBalance = round2(Math.max(0, dream.current || 0));

  if (matchedTxs.length > 0 && txSum >= currentBalance - 0.01) {
    return { history: matchedTxs, usedFallback: false };
  }

  if (matchedTxs.length > 0 && currentBalance > txSum) {
    const uncovered = round2(currentBalance - txSum);
    const earliestTxMonth = toMonthKey(matchedTxs[0].date);
    const fallbackRefMonth = addMonthsToKey(earliestTxMonth, -1);
    const fallbackEntries = generateFallbackContributions(
      uncovered,
      dream.id,
      dream.startDate,
      `${fallbackRefMonth}-15`
    );
    return {
      history: [...fallbackEntries, ...matchedTxs].sort((a, b) => a.date.localeCompare(b.date)),
      usedFallback: true,
    };
  }

  if (currentBalance > 0) {
    const fallbackEntries = generateFallbackContributions(
      currentBalance,
      dream.id,
      dream.startDate,
      referenceDate
    );
    return { history: fallbackEntries, usedFallback: true };
  }

  return { history: [], usedFallback: false };
}

/**
 * Immutably records a new contribution onto a DreamGoal, preserving any historical
 * fallback balance before appending the new deposit.
 */
export function recordGoalContribution(
  dream: DreamGoal,
  amount: number,
  dateStr?: string,
  note?: string,
  transactions: Transaction[] = [],
  referenceDate?: Date | string
): DreamGoal {
  const safeAmount = round2(Math.max(0, amount));
  if (safeAmount <= 0) return dream;

  const refLocal = parseDateToLocal(referenceDate);
  const defaultDate = `${refLocal.getFullYear()}-${String(refLocal.getMonth() + 1).padStart(2, '0')}-${String(refLocal.getDate()).padStart(2, '0')}`;
  const effectiveDate = dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr.slice(0, 10) : defaultDate;

  const { history } = resolveGoalContributions(dream, transactions, referenceDate);
  const newEntry: GoalContribution = {
    id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: effectiveDate,
    amount: safeAmount,
    note: note?.trim() || `Aporte em ${dream.title}`,
  };

  const nextHistory = [...history, newEntry].sort((a, b) => a.date.localeCompare(b.date));
  const nextCurrent = round2((dream.current || 0) + safeAmount);
  const earliestMonth = nextHistory[0]?.date;

  return {
    ...dream,
    current: nextCurrent,
    startDate: dream.startDate || earliestMonth,
    contributionsHistory: nextHistory,
  };
}

/**
 * Core trajectory math & pacing recalibration engine for a savings goal.
 */
export function calculateGoalTrajectory(params: CalculateGoalTrajectoryParams): GoalTrajectoryResult {
  const targetAmount = round2(Math.max(0, params.targetAmount || 0));
  const currentAmount = round2(Math.max(0, params.currentAmount || 0));
  const refDate = parseDateToLocal(params.referenceDate);
  const currentMonthKey = toMonthKey(refDate);

  let effectiveHistory: GoalContribution[];
  let usedFallbackHistory = false;

  if (params.contributionsHistory === undefined) {
    effectiveHistory = generateFallbackContributions(
      currentAmount,
      params.goalIdSeed || 'goal',
      params.startDate,
      refDate
    );
    usedFallbackHistory = effectiveHistory.length > 0;
  } else {
    effectiveHistory = [...params.contributionsHistory]
      .filter(c => Number.isFinite(c.amount) && c.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Group monthly deposits
  const depositsByMonth = new Map<string, number>();
  for (const entry of effectiveHistory) {
    const mKey = toMonthKey(entry.date);
    depositsByMonth.set(mKey, round2((depositsByMonth.get(mKey) || 0) + entry.amount));
  }

  // Determine startMonthKey
  const earliestDepositKey = effectiveHistory.length > 0 ? toMonthKey(effectiveHistory[0].date) : null;
  let startMonthKey = params.startDate ? toMonthKey(params.startDate) : (earliestDepositKey || currentMonthKey);
  if (earliestDepositKey && compareMonthKeys(earliestDepositKey, startMonthKey) < 0) {
    startMonthKey = earliestDepositKey;
  }
  if (compareMonthKeys(startMonthKey, currentMonthKey) > 0) {
    startMonthKey = currentMonthKey;
  }

  // Determine targetMonthKey
  const hasTargetDate = Boolean(params.targetDate && /^\d{4}-\d{2}/.test(params.targetDate.trim()));
  let targetMonthKey: string;
  if (hasTargetDate && params.targetDate) {
    targetMonthKey = toMonthKey(params.targetDate);
  } else if (params.monthlyDepositFallback && params.monthlyDepositFallback > 0 && targetAmount > currentAmount) {
    const estMonths = Math.min(24, Math.max(6, Math.ceil((targetAmount - currentAmount) / params.monthlyDepositFallback)));
    targetMonthKey = addMonthsToKey(currentMonthKey, estMonths);
  } else {
    targetMonthKey = addMonthsToKey(startMonthKey, 11);
  }

  // Ensure timeline includes both targetMonthKey and currentMonthKey
  const timelineEndKey = compareMonthKeys(targetMonthKey, currentMonthKey) >= 0 ? targetMonthKey : currentMonthKey;
  const monthKeys = listMonthKeysBetween(startMonthKey, timelineEndKey, 120);

  const idealEndIdx = Math.max(0, monthKeys.indexOf(targetMonthKey));
  const yieldRateMonthly = params.yieldRateMonthlyPct && params.yieldRateMonthlyPct > 0
    ? params.yieldRateMonthlyPct / 100
    : 0;

  let runningActual = 0;
  let idealAtCurrentMonth = 0;
  let actualAtCurrentMonth = currentAmount;

  const points: GoalTrajectoryPoint[] = monthKeys.map((monthKey, idx) => {
    const isCurrentMonth = monthKey === currentMonthKey;
    const isFutureMonth = compareMonthKeys(monthKey, currentMonthKey) > 0;

    // Ideal cumulative trajectory: starts at R$ 0 on startDate (idx 0) and reaches targetAmount at targetDate (idealEndIdx)
    let idealCumulative: number;
    if (compareMonthKeys(monthKey, targetMonthKey) >= 0 || idealEndIdx === 0) {
      idealCumulative = targetAmount;
    } else if (yieldRateMonthly > 0) {
      const denom = Math.pow(1 + yieldRateMonthly, idealEndIdx) - 1;
      const num = Math.pow(1 + yieldRateMonthly, idx) - 1;
      idealCumulative = denom > 0 ? round2(targetAmount * (num / denom)) : round2(targetAmount * (idx / idealEndIdx));
    } else {
      idealCumulative = round2(targetAmount * (idx / idealEndIdx));
    }

    const monthlyDeposit = isFutureMonth ? 0 : round2(depositsByMonth.get(monthKey) || 0);
    if (!isFutureMonth) {
      runningActual = round2(runningActual + monthlyDeposit);
    }

    const actualCumulative = isFutureMonth ? null : runningActual;
    const deltaBRL = actualCumulative === null ? null : round2(actualCumulative - idealCumulative);

    if (isCurrentMonth) {
      idealAtCurrentMonth = idealCumulative;
      actualAtCurrentMonth = runningActual;
    }

    return {
      monthKey,
      monthLabel: formatMonthShortPtBr(monthKey),
      monthFullLabel: formatMonthFullPtBr(monthKey),
      monthlyDeposit,
      idealCumulative,
      actualCumulative,
      deltaBRL,
      isCurrentMonth,
      isFutureMonth,
    };
  });

  // If explicit empty history was supplied while currentAmount > 0, keep actualAtCurrentMonth consistent with points
  const effectiveCurrentForPacing = effectiveHistory.length > 0 ? actualAtCurrentMonth : currentAmount;
  const scheduleVarianceBRL = round2(effectiveCurrentForPacing - idealAtCurrentMonth);
  const scheduleVariancePct = idealAtCurrentMonth > 0
    ? round2((scheduleVarianceBRL / idealAtCurrentMonth) * 100)
    : 0;

  const isCompleted = currentAmount >= targetAmount && targetAmount > 0;

  let pacingStatus: GoalPacingStatus;
  let pacingBadgeLabel: string;

  if (isCompleted) {
    pacingStatus = 'completed';
    pacingBadgeLabel = 'Meta Concluída! 🎉';
  } else if (scheduleVarianceBRL >= 0) {
    pacingStatus = 'ahead';
    pacingBadgeLabel = `No Ritmo / Adiantado (+${formatBRL(scheduleVarianceBRL)})`;
  } else if (scheduleVariancePct >= -10) {
    pacingStatus = 'slight_delay';
    pacingBadgeLabel = `Atenção: Leve Atraso (-${formatBRL(Math.abs(scheduleVarianceBRL))})`;
  } else {
    pacingStatus = 'behind';
    pacingBadgeLabel = `Fora da Trajetória (-${formatBRL(Math.abs(scheduleVarianceBRL))})`;
  }

  const remainingAmount = round2(Math.max(0, targetAmount - currentAmount));
  const rawRemainingMonths = hasTargetDate && params.targetDate
    ? calculateRemainingMonths(params.targetDate, refDate)
    : Math.max(1, monthKeys.filter(k => compareMonthKeys(k, currentMonthKey) > 0).length);

  const isPastDeadline = hasTargetDate && rawRemainingMonths <= 0 && !isCompleted;
  const remainingMonths = isCompleted ? 0 : Math.max(0, rawRemainingMonths);

  let requiredMonthlyDepositNow = 0;
  if (!isCompleted && remainingAmount > 0) {
    requiredMonthlyDepositNow = remainingMonths > 0
      ? round2(remainingAmount / remainingMonths)
      : remainingAmount;
  }

  // Average monthly deposit of the last 3 months up to and including currentMonthKey
  const pastAndCurrentPoints = points.filter(p => !p.isFutureMonth);
  const last3Points = pastAndCurrentPoints.slice(-3);
  const last3MonthsAvgDeposit = last3Points.length > 0
    ? round2(last3Points.reduce((acc, p) => acc + p.monthlyDeposit, 0) / last3Points.length)
    : 0;

  const pacingRate = last3MonthsAvgDeposit > 0
    ? last3MonthsAvgDeposit
    : (params.monthlyDepositFallback && params.monthlyDepositFallback > 0 ? params.monthlyDepositFallback : 0);

  let projectedCompletionMonthKey: string | null = null;
  let projectedCompletionLabel = 'Sem ritmo recente';

  if (isCompleted) {
    projectedCompletionMonthKey = currentMonthKey;
    projectedCompletionLabel = 'Meta já atingida';
  } else if (pacingRate > 0) {
    const monthsNeeded = Math.ceil(remainingAmount / pacingRate);
    projectedCompletionMonthKey = addMonthsToKey(currentMonthKey, monthsNeeded);
    projectedCompletionLabel = formatMonthFullPtBr(projectedCompletionMonthKey);
  }

  return {
    points,
    startMonthKey,
    targetMonthKey,
    currentMonthKey,
    hasTargetDate,
    isPastDeadline,
    targetAmount,
    currentAmount,
    idealAtCurrentMonth,
    actualAtCurrentMonth: effectiveCurrentForPacing,
    scheduleVarianceBRL,
    scheduleVariancePct,
    pacingStatus,
    pacingBadgeLabel,
    remainingMonths,
    requiredMonthlyDepositNow,
    last3MonthsAvgDeposit,
    projectedCompletionMonthKey,
    projectedCompletionLabel,
    formattedTargetDate: formatTargetDateDisplay(params.targetDate),
    effectiveHistory,
    usedFallbackHistory,
  };
}

export function calculateDreamGoalTrajectory(
  dream: DreamGoal,
  transactions: Transaction[] = [],
  yieldRateMonthlyPct?: number,
  referenceDate?: Date | string
): GoalTrajectoryResult {
  const { history, usedFallback } = resolveGoalContributions(dream, transactions, referenceDate);
  const result = calculateGoalTrajectory({
    targetAmount: dream.target,
    currentAmount: dream.current,
    startDate: dream.startDate,
    targetDate: dream.targetDate,
    contributionsHistory: history,
    yieldRateMonthlyPct: yieldRateMonthlyPct ?? dream.yieldRateMonthlyPct,
    monthlyDepositFallback: dream.monthlyDeposit,
    goalIdSeed: dream.id,
    referenceDate,
  });

  return {
    ...result,
    usedFallbackHistory: usedFallback || result.usedFallbackHistory,
  };
}
