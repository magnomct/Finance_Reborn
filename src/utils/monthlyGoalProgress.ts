import { DreamGoal, Transaction } from '../types';
import { formatBRL } from './finance';
import { calculateSuggestedMonthlyDeposit } from './dreamCalculations';
import { doesTransactionMatchDream, getCurrentMonthKey, getTransactionMonthKey } from './dreamMilestones';
import { calculateDreamGoalTrajectory, parseDateToLocal } from './goalTrajectory';
import { diffInMonths } from './smartGoalAutoFill';

export type MonthlyGoalPacingStatus = 'completed' | 'on_track' | 'warning' | 'behind';
export type RitmoAporteTier = 'emerald' | 'amber' | 'rose';

export const DEFAULT_PREFERRED_DEPOSIT_DAY = 10;

export interface GoalPacingMetrics {
  dreamId: string;
  monthlyTargetBRL: number;
  currentMonthDepositedBRL: number;
  remainingBalance: number;
  remainingMonths: number;
  suggestedIdealMonthlyBRL: number;
  monthlyCompletionPct: number;
  clampedCompletionPct: number;
  targetVsSuggestedGap: number;
  shortfallBRL: number;
  isTargetBelowIdeal: boolean;
  ritmoTier: RitmoAporteTier;
  ritmoBadgeLabel: string;
  ritmoBadgeDetail?: string;
}

export interface MonthlyGoalProgressResult extends GoalPacingMetrics {
  dreamTitle: string;
  monthKey: string;
  preferredDepositDay: number;
  monthlyProgressPct: number;
  rawProgressPct: number;
  status: MonthlyGoalPacingStatus;
  statusLabel: string;
  alertMessage: string;
  isGoalCompleted: boolean;
  isBehindTrajectory: boolean;
  isLast10Days: boolean;
  isPastTargetDate: boolean;
  isPastPreferredDay: boolean;
  requiresAttention: boolean;
  daysRemainingInMonth: number;
  scheduleVarianceBRL: number;
}

export interface MonthlyGoalsSummary {
  monthKey: string;
  items: MonthlyGoalProgressResult[];
  byDreamId: Record<string, MonthlyGoalProgressResult>;
  pendingItems: MonthlyGoalProgressResult[];
  pendingCount: number;
  totalShortfallBRL: number;
  completedCount: number;
  onTrackCount: number;
  warningCount: number;
  behindCount: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampDepositDay(day?: number): number {
  if (typeof day !== 'number' || !Number.isFinite(day)) return DEFAULT_PREFERRED_DEPOSIT_DAY;
  return Math.min(28, Math.max(1, Math.round(day)));
}

/**
 * Resolves the effective monthly contribution target (BRL) for a DreamGoal.
 */
export function resolveMonthlyTargetBRL(
  dream: DreamGoal,
  referenceDate?: Date | string
): number {
  if (typeof dream.monthlyTargetBRL === 'number' && Number.isFinite(dream.monthlyTargetBRL) && dream.monthlyTargetBRL > 0) {
    return round2(dream.monthlyTargetBRL);
  }
  if (typeof dream.monthlyDeposit === 'number' && Number.isFinite(dream.monthlyDeposit) && dream.monthlyDeposit > 0) {
    return round2(dream.monthlyDeposit);
  }
  const remaining = Math.max(0, (dream.target || 0) - (dream.current || 0));
  if (remaining <= 0) return 0;

  if (dream.targetDate) {
    const suggested = calculateSuggestedMonthlyDeposit(
      dream.target,
      dream.current,
      dream.targetDate,
      parseDateToLocal(referenceDate)
    ).suggestedMonthlyDeposit;
    if (suggested > 0) return round2(suggested);
  }
  return round2(remaining / 12);
}

/**
 * Computes current-month deposits for a goal across explicit contributionsHistory and linked transactions,
 * deduplicating paired entries created simultaneously in the same month so deposits are never double-counted.
 */
export function calculateCurrentMonthGoalDeposits(
  dream: DreamGoal,
  transactions: Transaction[] = [],
  monthKey: string
): number {
  if (!dream || !monthKey) return 0;

  const historyEntries = (dream.contributionsHistory || [])
    .filter(c => !String(c.id || '').startsWith('fallback-'))
    .filter(c => getTransactionMonthKey(c.date) === monthKey && Number.isFinite(c.amount) && c.amount > 0)
    .map(c => ({
      date: (c.date || '').slice(0, 10),
      amount: round2(c.amount),
    }));

  const txEntries = (transactions || [])
    .filter(tx => getTransactionMonthKey(tx.date) === monthKey && doesTransactionMatchDream(tx, dream))
    .map(tx => ({
      date: (tx.date || '').slice(0, 10),
      amount: round2(Math.abs(tx.amount || 0)),
    }))
    .filter(t => t.amount > 0);

  if (historyEntries.length === 0) {
    return round2(txEntries.reduce((sum, t) => sum + t.amount, 0));
  }
  if (txEntries.length === 0) {
    return round2(historyEntries.reduce((sum, h) => sum + h.amount, 0));
  }

  // Deduplicate transactions that correspond to recorded contributionsHistory items
  const remainingTxs = txEntries.map(t => ({ ...t, matched: false }));

  for (const h of historyEntries) {
    let idx = remainingTxs.findIndex(
      t => !t.matched && Math.abs(t.amount - h.amount) < 0.01 && t.date === h.date
    );
    if (idx === -1) {
      idx = remainingTxs.findIndex(t => !t.matched && Math.abs(t.amount - h.amount) < 0.01);
    }
    if (idx !== -1) {
      remainingTxs[idx].matched = true;
    }
  }

  const historySum = historyEntries.reduce((sum, h) => sum + h.amount, 0);
  const extraTxSum = remainingTxs
    .filter(t => !t.matched)
    .reduce((sum, t) => sum + t.amount, 0);

  return round2(historySum + extraTxSum);
}

/**
 * Pure pacing & ideal contribution calculator for a single DreamGoal.
 */
export function calculateGoalPacingMetrics(
  dream: DreamGoal,
  transactions: Transaction[] = [],
  referenceDate?: Date | string
): GoalPacingMetrics {
  const refDate = parseDateToLocal(referenceDate);
  const monthKey = getCurrentMonthKey(refDate);

  const monthlyTargetBRL = resolveMonthlyTargetBRL(dream, refDate);
  const currentMonthDepositedBRL = calculateCurrentMonthGoalDeposits(dream, transactions, monthKey);
  const remainingBalance = Math.max(0, round2((dream.target || 0) - (dream.current || 0)));

  const { remainingMonths: rawDiffMonths } = diffInMonths(refDate, dream.targetDate);
  const remainingMonths = Math.max(1, rawDiffMonths);

  const suggestedIdealMonthlyBRL =
    remainingBalance <= 0 ? 0 : round2(remainingBalance / remainingMonths);

  const monthlyCompletionPct =
    monthlyTargetBRL > 0
      ? round2((currentMonthDepositedBRL / monthlyTargetBRL) * 100)
      : remainingBalance === 0
      ? 100
      : 0;
  const clampedCompletionPct = Math.min(100, Math.max(0, monthlyCompletionPct));

  const targetVsSuggestedGap = round2(monthlyTargetBRL - suggestedIdealMonthlyBRL);
  const isTargetBelowIdeal = remainingBalance > 0 && targetVsSuggestedGap < -0.01;

  const shortfallBRL =
    remainingBalance <= 0 || monthlyTargetBRL <= 0
      ? 0
      : Math.max(0, round2(monthlyTargetBRL - currentMonthDepositedBRL));

  let ritmoTier: RitmoAporteTier;
  let ritmoBadgeLabel: string;
  let ritmoBadgeDetail: string | undefined;

  if (remainingBalance === 0 || (monthlyCompletionPct >= 100 && !isTargetBelowIdeal)) {
    ritmoTier = 'emerald';
    ritmoBadgeLabel = 'No Ritmo / Meta do Mês Atingida';
  } else if (monthlyCompletionPct >= 40 && monthlyCompletionPct < 100) {
    ritmoTier = 'amber';
    ritmoBadgeLabel = 'Aporte Parcial / Em Andamento';
    ritmoBadgeDetail = shortfallBRL > 0 ? `Faltam ${formatBRL(shortfallBRL)}` : undefined;
  } else if (monthlyCompletionPct >= 100 && isTargetBelowIdeal) {
    ritmoTier = 'amber';
    ritmoBadgeLabel = 'Aporte Parcial / Em Andamento';
    ritmoBadgeDetail = 'Meta abaixo do ideal p/ prazo';
  } else {
    ritmoTier = 'rose';
    ritmoBadgeLabel = 'Abaixo da Meta Mensal';
    ritmoBadgeDetail = shortfallBRL > 0 ? `Faltam ${formatBRL(shortfallBRL)}` : undefined;
  }

  return {
    dreamId: dream.id,
    monthlyTargetBRL,
    currentMonthDepositedBRL,
    remainingBalance,
    remainingMonths,
    suggestedIdealMonthlyBRL,
    monthlyCompletionPct,
    clampedCompletionPct,
    targetVsSuggestedGap,
    shortfallBRL,
    isTargetBelowIdeal,
    ritmoTier,
    ritmoBadgeLabel,
    ritmoBadgeDetail,
  };
}

/**
 * Evaluates current-month contribution pacing and alert status for a single DreamGoal.
 */
export function evaluateMonthlyGoalProgress(
  dream: DreamGoal,
  transactions: Transaction[] = [],
  referenceDate?: Date | string
): MonthlyGoalProgressResult {
  const refDate = parseDateToLocal(referenceDate);
  const monthKey = getCurrentMonthKey(refDate);
  const year = refDate.getFullYear();
  const monthIdx = refDate.getMonth();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const currentDay = refDate.getDate();
  const daysRemainingInMonth = Math.max(0, daysInMonth - currentDay);

  const preferredDepositDay = clampDepositDay(dream.preferredDepositDay);
  const pacing = calculateGoalPacingMetrics(dream, transactions, refDate);
  const {
    monthlyTargetBRL,
    currentMonthDepositedBRL,
    monthlyCompletionPct: rawProgressPct,
    clampedCompletionPct: monthlyProgressPct,
    shortfallBRL,
    remainingBalance,
  } = pacing;

  const isGoalCompleted = dream.target > 0 && remainingBalance === 0;

  // Check if deadline is in the past
  let isPastTargetDate = false;
  if (dream.targetDate && /^\d{4}-\d{2}-\d{2}/.test(dream.targetDate.trim()) && !isGoalCompleted) {
    const targetEnd = parseDateToLocal(dream.targetDate);
    targetEnd.setHours(23, 59, 59, 999);
    const refMid = new Date(year, monthIdx, currentDay, 12, 0, 0, 0);
    isPastTargetDate = refMid.getTime() > targetEnd.getTime();
  }

  // Check cumulative trajectory vs planned
  const trajectory = calculateDreamGoalTrajectory(dream, transactions, dream.yieldRateMonthlyPct, refDate);
  const scheduleVarianceBRL = trajectory.scheduleVarianceBRL;
  const isBehindTrajectory = !isGoalCompleted && scheduleVarianceBRL < -0.01;

  const isLast10Days = daysRemainingInMonth < 10;
  const isPastPreferredDay = currentDay > preferredDepositDay;
  const isPastMidMonth = currentDay >= Math.ceil(daysInMonth / 2);
  const expectedProportionalPct = round2((currentDay / daysInMonth) * 100);

  let status: MonthlyGoalPacingStatus;
  let statusLabel: string;
  let alertMessage: string;

  if (isGoalCompleted || (monthlyTargetBRL > 0 && currentMonthDepositedBRL >= monthlyTargetBRL - 0.005)) {
    status = 'completed';
    statusLabel = 'Meta do mês batida (100%)';
    alertMessage = isGoalCompleted
      ? 'Meta total concluída! Objetivo 100% alcançado.'
      : `Meta mensal concluída: ${formatBRL(currentMonthDepositedBRL)} aportados neste mês.`;
  } else if (monthlyTargetBRL <= 0 || shortfallBRL <= 0) {
    status = 'on_track';
    statusLabel = 'Dentro do prazo no mês';
    alertMessage = 'Sem pendência de aporte mensal definida.';
  } else if (isLast10Days || isPastTargetDate || isBehindTrajectory) {
    status = 'behind';
    statusLabel = `Alerta: Aporte abaixo do planejado (Faltam ${formatBRL(shortfallBRL)} neste mês)`;
    alertMessage = `Abaixo do planejado: faltam ${formatBRL(shortfallBRL)} para cumprir a meta deste mês.`;
  } else if (
    (isPastPreferredDay || isPastMidMonth) &&
    (monthlyProgressPct < 50 || monthlyProgressPct < expectedProportionalPct)
  ) {
    status = 'warning';
    statusLabel = 'Atenção: Aporte mensal pendente';
    alertMessage = `Abaixo do planejado: faltam ${formatBRL(shortfallBRL)} para cumprir a meta deste mês.`;
  } else {
    status = 'on_track';
    statusLabel = 'Dentro do prazo no mês';
    alertMessage = `Dentro do prazo: dia preferencial ${String(preferredDepositDay).padStart(2, '0')} • faltam ${formatBRL(shortfallBRL)}.`;
  }

  return {
    ...pacing,
    dreamTitle: dream.title,
    monthKey,
    preferredDepositDay,
    monthlyProgressPct,
    rawProgressPct,
    status,
    statusLabel,
    alertMessage,
    isGoalCompleted,
    isBehindTrajectory,
    isLast10Days,
    isPastTargetDate,
    isPastPreferredDay,
    requiresAttention: status === 'warning' || status === 'behind',
    daysRemainingInMonth,
    scheduleVarianceBRL,
  };
}

/**
 * Evaluates all goals and returns per-dream results plus consolidated pending summary for banner & filtering.
 */
export function evaluateAllMonthlyGoalsProgress(
  dreams: DreamGoal[],
  transactions: Transaction[] = [],
  referenceDate?: Date | string
): MonthlyGoalsSummary {
  const refDate = parseDateToLocal(referenceDate);
  const monthKey = getCurrentMonthKey(refDate);
  const items = (dreams || []).map(dream =>
    evaluateMonthlyGoalProgress(dream, transactions, refDate)
  );

  const byDreamId: Record<string, MonthlyGoalProgressResult> = {};
  let completedCount = 0;
  let onTrackCount = 0;
  let warningCount = 0;
  let behindCount = 0;

  for (const item of items) {
    byDreamId[item.dreamId] = item;
    if (item.status === 'completed') completedCount++;
    else if (item.status === 'on_track') onTrackCount++;
    else if (item.status === 'warning') warningCount++;
    else if (item.status === 'behind') behindCount++;
  }

  const pendingItems = items
    .filter(item => item.requiresAttention && item.shortfallBRL > 0)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'behind' ? -1 : 1;
      }
      return b.shortfallBRL - a.shortfallBRL;
    });

  const totalShortfallBRL = round2(
    pendingItems.reduce((sum, item) => sum + item.shortfallBRL, 0)
  );

  return {
    monthKey,
    items,
    byDreamId,
    pendingItems,
    pendingCount: pendingItems.length,
    totalShortfallBRL,
    completedCount,
    onTrackCount,
    warningCount,
    behindCount,
  };
}
