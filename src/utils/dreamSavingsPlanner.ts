import { DreamGoal } from '../types';

export interface DreamSavingsPlanItem {
  dreamId: string;
  title: string;
  category: string;
  current: number;
  target: number;
  monthlyDeposit: number;
  progressPct: number;
  remainingAmount: number;
  isCompleted: boolean;
  estimatedMonths: number;
  suggestedMonthlyDeposit?: number;
  targetDate?: string;
  statusBadge: {
    label: string;
    colorClass: string;
  };
  gradient: string;
  iconName: string;
}

export interface DreamSavingsPlannerSummary {
  totalTarget: number;
  totalCurrent: number;
  totalRemaining: number;
  overallProgressPct: number;
  totalMonthlySavingsGoal: number;
  completedCount: number;
  totalCount: number;
  items: DreamSavingsPlanItem[];
}

/**
 * Calculates progress and metrics for a single dream savings goal.
 */
export function calculateDreamSavingsItem(dream: DreamGoal): DreamSavingsPlanItem {
  const safeTarget = Math.max(0, dream.target || 0);
  const safeCurrent = Math.max(0, dream.current || 0);
  const safeMonthly = Math.max(0, dream.monthlyDeposit || 0);

  const remainingAmount = Math.max(0, safeTarget - safeCurrent);
  const isCompleted = safeCurrent >= safeTarget && safeTarget > 0;
  const progressPct = safeTarget > 0 
    ? Math.min(100, Math.max(0, (safeCurrent / safeTarget) * 100))
    : (safeCurrent > 0 ? 100 : 0);

  let estimatedMonths = 0;
  if (!isCompleted && safeMonthly > 0) {
    estimatedMonths = Math.ceil(remainingAmount / safeMonthly);
  }

  // Determine status badge
  let statusBadge = {
    label: 'Em Andamento',
    colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  };

  if (isCompleted) {
    statusBadge = {
      label: 'Objetivo Concluído! 🎉',
      colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    };
  } else if (progressPct >= 75) {
    statusBadge = {
      label: 'Reta Final 🚀',
      colorClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800'
    };
  } else if (safeMonthly === 0) {
    statusBadge = {
      label: 'Meta Mensal Não Definida',
      colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  }

  return {
    dreamId: dream.id,
    title: dream.title,
    category: dream.category || 'Outros',
    current: safeCurrent,
    target: safeTarget,
    monthlyDeposit: safeMonthly,
    progressPct,
    remainingAmount,
    isCompleted,
    estimatedMonths,
    targetDate: dream.targetDate,
    statusBadge,
    gradient: dream.gradient || 'from-blue-500 to-indigo-600',
    iconName: dream.iconName || 'Target'
  };
}

/**
 * Calculates consolidated summary of savings goals and progress for all dreams.
 */
export function calculateDreamSavingsPlannerSummary(dreams: DreamGoal[]): DreamSavingsPlannerSummary {
  const items = (dreams || []).map(calculateDreamSavingsItem);

  const totalTarget = items.reduce((acc, item) => acc + item.target, 0);
  const totalCurrent = items.reduce((acc, item) => acc + item.current, 0);
  const totalRemaining = items.reduce((acc, item) => acc + item.remainingAmount, 0);
  const totalMonthlySavingsGoal = items.reduce((acc, item) => acc + item.monthlyDeposit, 0);
  const completedCount = items.filter(i => i.isCompleted).length;
  const totalCount = items.length;

  const overallProgressPct = totalTarget > 0 
    ? Math.min(100, Math.max(0, (totalCurrent / totalTarget) * 100))
    : 0;

  return {
    totalTarget,
    totalCurrent,
    totalRemaining,
    overallProgressPct,
    totalMonthlySavingsGoal,
    completedCount,
    totalCount,
    items
  };
}

/**
 * Immutably updates the monthly savings goal (monthlyDeposit) for a specific dream.
 */
export function updateDreamMonthlySavingsGoal(
  dreams: DreamGoal[],
  dreamId: string,
  newMonthlyGoal: number
): DreamGoal[] {
  const safeGoal = Math.max(0, isNaN(newMonthlyGoal) ? 0 : newMonthlyGoal);
  return (dreams || []).map(d => {
    if (d.id === dreamId) {
      return {
        ...d,
        monthlyDeposit: safeGoal
      };
    }
    return d;
  });
}
