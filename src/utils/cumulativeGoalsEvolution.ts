import { DreamGoal, GoalContribution, Transaction } from '../types';
import {
  addMonthsToKey,
  compareMonthKeys,
  formatMonthFullPtBr,
  formatMonthShortPtBr,
  formatTargetDateDisplay,
  listMonthKeysBetween,
  parseDateToLocal,
  resolveGoalContributions,
  toMonthKey,
} from './goalTrajectory';

export type CumulativeEvolutionStatus = 'ahead' | 'behind';

export interface CumulativeEvolutionPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. Nov/26
  monthFullLabel: string; // e.g. Novembro de 2026
  plannedCumulative: number; // Linha de Meta Ideal
  actualCumulative: number | null; // Saldo Acumulado Real (null para meses futuros)
  monthlyDeposit: number; // Aporte real do mês (0 para meses futuros)
  monthlyVarianceBRL: number | null; // actualCumulative - plannedCumulative
  monthlyVariancePct: number | null; // ((actual - planned) / planned) * 100
  status: CumulativeEvolutionStatus | null; // 'ahead' | 'behind' | null (futuro)
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

export interface CalculateCumulativeEvolutionOptions {
  selectedDreamId?: string | 'ALL';
  transactions?: Transaction[];
  referenceDate?: Date | string;
  minPastMonths?: number; // Default 6 (current month + 5 previous months)
  maxTimelineMonths?: number; // Guard against ultra-far deadlines breaking SVG ticks
}

export interface CumulativeEvolutionResult {
  points: CumulativeEvolutionPoint[];
  selectedDreamId: string | 'ALL';
  selectedDreamTitle: string;
  goalsCount: number;
  startMonthKey: string;
  endMonthKey: string;
  currentMonthKey: string;
  currentMonthLabel: string;
  formattedDeadline: string;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalPlannedMonthlyDeposit: number;
  plannedAtCurrentMonth: number;
  actualAtCurrentMonth: number;
  currentVarianceBRL: number;
  currentVariancePct: number;
  currentStatus: CumulativeEvolutionStatus;
  aheadMonthsCount: number;
  behindMonthsCount: number;
  hasData: boolean;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

interface NormalizedGoalSeries {
  dream: DreamGoal;
  startMonthKey: string;
  targetMonthKey: string;
  targetAmount: number;
  yieldRateMonthly: number;
  depositsByMonth: Map<string, number>;
}

function normalizeGoalForEvolution(
  dream: DreamGoal,
  transactions: Transaction[],
  currentMonthKey: string,
  defaultStartKey: string,
  refDate: Date
): NormalizedGoalSeries {
  const { history } = resolveGoalContributions(dream, transactions, refDate);
  const depositsByMonth = new Map<string, number>();

  for (const entry of history) {
    const mKey = toMonthKey(entry.date);
    depositsByMonth.set(mKey, round2((depositsByMonth.get(mKey) || 0) + entry.amount));
  }

  const earliestHistoryKey = history.length > 0 ? toMonthKey(history[0].date) : null;
  let startMonthKey = dream.startDate
    ? toMonthKey(dream.startDate)
    : earliestHistoryKey
    ? compareMonthKeys(earliestHistoryKey, defaultStartKey) < 0
      ? earliestHistoryKey
      : defaultStartKey
    : defaultStartKey;

  if (earliestHistoryKey && compareMonthKeys(earliestHistoryKey, startMonthKey) < 0) {
    startMonthKey = earliestHistoryKey;
  }
  if (compareMonthKeys(startMonthKey, currentMonthKey) > 0) {
    startMonthKey = currentMonthKey;
  }

  // Keep a distinct starting anchor before the first deposit if start === earliest deposit and there is room
  const targetAmount = round2(Math.max(0, dream.target || 0));
  const currentAmount = round2(Math.max(0, dream.current || 0));

  let targetMonthKey: string;
  const hasExplicitTargetDate = Boolean(
    dream.targetDate && /^\d{4}-\d{2}/.test(dream.targetDate.trim())
  );

  if (hasExplicitTargetDate && dream.targetDate) {
    targetMonthKey = toMonthKey(dream.targetDate);
  } else if (dream.monthlyDeposit > 0 && targetAmount > currentAmount) {
    const estMonths = Math.min(
      36,
      Math.max(6, Math.ceil((targetAmount - currentAmount) / dream.monthlyDeposit))
    );
    targetMonthKey = addMonthsToKey(currentMonthKey, estMonths);
  } else {
    targetMonthKey = addMonthsToKey(currentMonthKey, 12);
  }

  if (compareMonthKeys(targetMonthKey, startMonthKey) < 0) {
    targetMonthKey = currentMonthKey;
  }

  const yieldRateMonthly =
    dream.yieldRateMonthlyPct && dream.yieldRateMonthlyPct > 0
      ? dream.yieldRateMonthlyPct / 100
      : 0;

  return {
    dream,
    startMonthKey,
    targetMonthKey,
    targetAmount,
    yieldRateMonthly,
    depositsByMonth,
  };
}

function computeGoalPlannedAtMonth(
  goal: NormalizedGoalSeries,
  monthKey: string
): number {
  if (goal.targetAmount <= 0) return 0;
  if (compareMonthKeys(monthKey, goal.startMonthKey) <= 0) {
    return compareMonthKeys(goal.startMonthKey, goal.targetMonthKey) === 0
      ? goal.targetAmount
      : 0;
  }
  if (compareMonthKeys(monthKey, goal.targetMonthKey) >= 0) {
    return goal.targetAmount;
  }

  const spanKeys = listMonthKeysBetween(goal.startMonthKey, goal.targetMonthKey, 120);
  const totalSteps = Math.max(1, spanKeys.length - 1);
  const stepIndex = Math.max(0, spanKeys.indexOf(monthKey));

  if (goal.yieldRateMonthly > 0) {
    const denom = Math.pow(1 + goal.yieldRateMonthly, totalSteps) - 1;
    const num = Math.pow(1 + goal.yieldRateMonthly, stepIndex) - 1;
    if (denom > 0) {
      return round2(goal.targetAmount * (num / denom));
    }
  }

  return round2(goal.targetAmount * (stepIndex / totalSteps));
}

/**
 * Computes month-by-month cumulative evolution comparing actual accumulated savings
 * against the ideal planned trajectory for either all goals combined or a single goal.
 *
 * Future months (> currentMonthKey) strictly have `actualCumulative: null` so the
 * actual area/line chart terminates cleanly at the current month without dropping to zero.
 */
export function calculateCumulativeEvolution(
  dreams: DreamGoal[],
  options: CalculateCumulativeEvolutionOptions = {}
): CumulativeEvolutionResult {
  const {
    selectedDreamId = 'ALL',
    transactions = [],
    referenceDate,
    minPastMonths = 6,
    maxTimelineMonths = 36,
  } = options;

  const refDate = parseDateToLocal(referenceDate);
  const currentMonthKey = toMonthKey(refDate);
  const currentMonthLabel = formatMonthShortPtBr(currentMonthKey);
  const defaultStartKey = addMonthsToKey(currentMonthKey, -(Math.max(1, minPastMonths) - 1));

  const filteredDreams =
    selectedDreamId === 'ALL'
      ? dreams
      : dreams.filter(d => d.id === selectedDreamId);

  const selectedDream =
    selectedDreamId === 'ALL' ? null : filteredDreams[0] || null;
  const selectedDreamTitle =
    selectedDreamId === 'ALL'
      ? 'Visão Consolidada (Todos os Sonhos)'
      : selectedDream?.title || 'Meta Selecionada';

  if (filteredDreams.length === 0) {
    const emptyMonths = listMonthKeysBetween(
      defaultStartKey,
      addMonthsToKey(currentMonthKey, 3),
      maxTimelineMonths
    );
    const points: CumulativeEvolutionPoint[] = emptyMonths.map(monthKey => {
      const isCurrentMonth = monthKey === currentMonthKey;
      const isFutureMonth = compareMonthKeys(monthKey, currentMonthKey) > 0;
      return {
        monthKey,
        monthLabel: formatMonthShortPtBr(monthKey),
        monthFullLabel: formatMonthFullPtBr(monthKey),
        plannedCumulative: 0,
        actualCumulative: isFutureMonth ? null : 0,
        monthlyDeposit: 0,
        monthlyVarianceBRL: isFutureMonth ? null : 0,
        monthlyVariancePct: isFutureMonth ? null : 0,
        status: isFutureMonth ? null : 'ahead',
        isCurrentMonth,
        isFutureMonth,
      };
    });

    return {
      points,
      selectedDreamId,
      selectedDreamTitle,
      goalsCount: 0,
      startMonthKey: points[0]?.monthKey || defaultStartKey,
      endMonthKey: points[points.length - 1]?.monthKey || currentMonthKey,
      currentMonthKey,
      currentMonthLabel,
      formattedDeadline: 'Sem prazo definido',
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      totalPlannedMonthlyDeposit: 0,
      plannedAtCurrentMonth: 0,
      actualAtCurrentMonth: 0,
      currentVarianceBRL: 0,
      currentVariancePct: 0,
      currentStatus: 'ahead',
      aheadMonthsCount: 0,
      behindMonthsCount: 0,
      hasData: false,
    };
  }

  const normalizedGoals = filteredDreams.map(d =>
    normalizeGoalForEvolution(d, transactions, currentMonthKey, defaultStartKey, refDate)
  );

  // Start timeline at the earliest goal start OR at least `minPastMonths` back (e.g. 6 months window)
  let startMonthKey = defaultStartKey;
  let endMonthKey = currentMonthKey;

  for (const g of normalizedGoals) {
    if (compareMonthKeys(g.startMonthKey, startMonthKey) < 0) {
      startMonthKey = g.startMonthKey;
    }
    if (compareMonthKeys(g.targetMonthKey, endMonthKey) > 0) {
      endMonthKey = g.targetMonthKey;
    }
  }

  // Cap future horizon if a deadline is many years out, keeping SVG chart legible
  const rawMonthKeys = listMonthKeysBetween(startMonthKey, endMonthKey, maxTimelineMonths);
  const effectiveEndKey = rawMonthKeys[rawMonthKeys.length - 1] || endMonthKey;

  // Running actual balances per goal so deposits before startMonthKey still roll up properly
  const runningActualByGoal = new Map<string, number>();
  for (const g of normalizedGoals) {
    let preStartSum = 0;
    for (const [mKey, amt] of g.depositsByMonth.entries()) {
      if (compareMonthKeys(mKey, startMonthKey) < 0 && compareMonthKeys(mKey, currentMonthKey) <= 0) {
        preStartSum = round2(preStartSum + amt);
      }
    }
    runningActualByGoal.set(g.dream.id, preStartSum);
  }

  let plannedAtCurrentMonth = 0;
  let actualAtCurrentMonth = 0;
  let aheadMonthsCount = 0;
  let behindMonthsCount = 0;

  const points: CumulativeEvolutionPoint[] = rawMonthKeys.map(monthKey => {
    const isCurrentMonth = monthKey === currentMonthKey;
    const isFutureMonth = compareMonthKeys(monthKey, currentMonthKey) > 0;

    let plannedCumulative = 0;
    let monthlyDeposit = 0;
    let actualSum = 0;

    for (const g of normalizedGoals) {
      plannedCumulative = round2(plannedCumulative + computeGoalPlannedAtMonth(g, monthKey));

      if (!isFutureMonth) {
        const depositThisMonth = round2(g.depositsByMonth.get(monthKey) || 0);
        monthlyDeposit = round2(monthlyDeposit + depositThisMonth);
        const nextRunning = round2((runningActualByGoal.get(g.dream.id) || 0) + depositThisMonth);
        runningActualByGoal.set(g.dream.id, nextRunning);
        actualSum = round2(actualSum + nextRunning);
      }
    }

    const actualCumulative = isFutureMonth ? null : actualSum;
    const monthlyVarianceBRL =
      actualCumulative === null ? null : round2(actualCumulative - plannedCumulative);

    let monthlyVariancePct: number | null = null;
    if (monthlyVarianceBRL !== null) {
      if (plannedCumulative > 0) {
        monthlyVariancePct = round2((monthlyVarianceBRL / plannedCumulative) * 100);
      } else {
        monthlyVariancePct = actualCumulative && actualCumulative > 0 ? 100 : 0;
      }
    }

    const status: CumulativeEvolutionStatus | null =
      monthlyVarianceBRL === null
        ? null
        : monthlyVarianceBRL >= 0
        ? 'ahead'
        : 'behind';

    if (status === 'ahead') aheadMonthsCount += 1;
    if (status === 'behind') behindMonthsCount += 1;

    if (isCurrentMonth) {
      plannedAtCurrentMonth = plannedCumulative;
      actualAtCurrentMonth = actualSum;
    }

    return {
      monthKey,
      monthLabel: formatMonthShortPtBr(monthKey),
      monthFullLabel: formatMonthFullPtBr(monthKey),
      plannedCumulative,
      actualCumulative,
      monthlyDeposit,
      monthlyVarianceBRL,
      monthlyVariancePct,
      status,
      isCurrentMonth,
      isFutureMonth,
    };
  });

  // Fallback alignment if currentMonthKey wasn't reached due to maxTimelineMonths truncation
  const totalCurrentAmount = round2(
    filteredDreams.reduce((sum, d) => sum + Math.max(0, d.current || 0), 0)
  );
  const totalTargetAmount = round2(
    filteredDreams.reduce((sum, d) => sum + Math.max(0, d.target || 0), 0)
  );
  const totalPlannedMonthlyDeposit = round2(
    filteredDreams.reduce((sum, d) => sum + Math.max(0, d.monthlyDeposit || 0), 0)
  );

  const currentPoint = points.find(p => p.isCurrentMonth);
  if (!currentPoint) {
    actualAtCurrentMonth = totalCurrentAmount;
  }

  const currentVarianceBRL = round2(actualAtCurrentMonth - plannedAtCurrentMonth);
  const currentVariancePct =
    plannedAtCurrentMonth > 0
      ? round2((currentVarianceBRL / plannedAtCurrentMonth) * 100)
      : actualAtCurrentMonth > 0
      ? 100
      : 0;

  const currentStatus: CumulativeEvolutionStatus =
    currentVarianceBRL >= 0 ? 'ahead' : 'behind';

  const latestTargetDate = normalizedGoals.reduce((latest, g) => {
    return compareMonthKeys(g.targetMonthKey, latest) > 0 ? g.targetMonthKey : latest;
  }, normalizedGoals[0].targetMonthKey);

  const formattedDeadline =
    selectedDream?.targetDate
      ? formatTargetDateDisplay(selectedDream.targetDate)
      : formatTargetDateDisplay(latestTargetDate);

  return {
    points,
    selectedDreamId,
    selectedDreamTitle,
    goalsCount: filteredDreams.length,
    startMonthKey,
    endMonthKey: effectiveEndKey,
    currentMonthKey,
    currentMonthLabel,
    formattedDeadline,
    totalTargetAmount,
    totalCurrentAmount,
    totalPlannedMonthlyDeposit,
    plannedAtCurrentMonth,
    actualAtCurrentMonth,
    currentVarianceBRL,
    currentVariancePct,
    currentStatus,
    aheadMonthsCount,
    behindMonthsCount,
    hasData: true,
  };
}
