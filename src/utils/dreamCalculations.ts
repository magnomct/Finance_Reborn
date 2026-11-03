import { DreamGoal } from '../types';

export interface DreamDonutSlice {
  id: string;
  title: string;
  current: number;
  target: number;
  monthlyDeposit: number;
  completionPct: number; // (current / target) * 100
  fraction: number; // share of total accumulated
  startFraction: number;
  endFraction: number;
  colorHex: string;
  category: string;
  targetDate?: string;
  suggestedDeposit: number;
  monthsRemaining: number;
}

export const DREAM_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Calculates remaining months between reference date and target date string (YYYY-MM-DD or YYYY-MM)
 */
export function calculateRemainingMonths(
  targetDateStr: string,
  referenceDateInput?: Date | string
): number {
  if (!targetDateStr) return 0;

  const ref = referenceDateInput 
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput)
    : new Date();

  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
  if (!tYear || !tMonth) return 0;

  const refYear = ref.getFullYear();
  const refMonth = ref.getMonth() + 1; // 1-12
  const refDay = ref.getDate();

  // Difference in calendar months
  const monthDiff = (tYear - refYear) * 12 + (tMonth - refMonth);

  if (monthDiff < 0) return 0;
  if (monthDiff === 0) {
    // Same month: if deadline day has passed, 0; otherwise 1 month remaining
    if (tDay && tDay < refDay) return 0;
    return 1;
  }

  // If there are future months, count current month + remaining full months
  return monthDiff + 1;
}

/**
 * Calculates suggested monthly deposit to reach target by targetDate
 */
export function calculateSuggestedMonthlyDeposit(
  target: number,
  current: number,
  targetDateStr?: string,
  referenceDateInput?: Date | string
): {
  remainingAmount: number;
  remainingMonths: number;
  suggestedMonthlyDeposit: number;
  isCompleted: boolean;
  isPastDeadline: boolean;
} {
  const remainingAmount = Math.max(0, target - current);
  const isCompleted = remainingAmount === 0;

  if (isCompleted) {
    return {
      remainingAmount: 0,
      remainingMonths: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: true,
      isPastDeadline: false,
    };
  }

  if (!targetDateStr) {
    return {
      remainingAmount,
      remainingMonths: 0,
      suggestedMonthlyDeposit: 0,
      isCompleted: false,
      isPastDeadline: false,
    };
  }

  const remainingMonths = calculateRemainingMonths(targetDateStr, referenceDateInput);

  if (remainingMonths <= 0) {
    return {
      remainingAmount,
      remainingMonths: 0,
      suggestedMonthlyDeposit: remainingAmount,
      isCompleted: false,
      isPastDeadline: true,
    };
  }

  // Recommended monthly contribution rounded to 2 decimals
  const suggestedMonthlyDeposit = Math.round((remainingAmount / remainingMonths) * 100) / 100;

  return {
    remainingAmount,
    remainingMonths,
    suggestedMonthlyDeposit,
    isCompleted: false,
    isPastDeadline: false,
  };
}

/**
 * Computes donut chart segments and summary for dreams
 */
export function calculateDreamsDonutData(
  dreams: DreamGoal[],
  referenceDateInput?: Date | string
): {
  slices: DreamDonutSlice[];
  totalCurrent: number;
  totalTarget: number;
  overallCompletionPct: number;
} {
  const totalCurrent = dreams.reduce((acc, d) => acc + d.current, 0);
  const totalTarget = dreams.reduce((acc, d) => acc + d.target, 0);
  const overallCompletionPct = totalTarget > 0 
    ? Math.round((totalCurrent / totalTarget) * 100) 
    : 0;

  // If no savings yet, distribute evenly for visualization
  const effectiveBase = totalCurrent > 0 ? totalCurrent : dreams.length;

  let cumulativeFraction = 0;
  const slices: DreamDonutSlice[] = dreams.map((dream, index) => {
    const rawVal = totalCurrent > 0 ? dream.current : 1;
    const fraction = rawVal / effectiveBase;
    const startFraction = cumulativeFraction;
    const endFraction = cumulativeFraction + fraction;
    cumulativeFraction = endFraction;

    const completionPct = dream.target > 0 
      ? Math.round((dream.current / dream.target) * 1000) / 10 
      : 0;

    const { suggestedMonthlyDeposit, remainingMonths } = calculateSuggestedMonthlyDeposit(
      dream.target,
      dream.current,
      dream.targetDate,
      referenceDateInput
    );

    return {
      id: dream.id,
      title: dream.title,
      current: dream.current,
      target: dream.target,
      monthlyDeposit: dream.monthlyDeposit,
      completionPct,
      fraction,
      startFraction,
      endFraction,
      colorHex: DREAM_COLORS[index % DREAM_COLORS.length],
      category: dream.category,
      targetDate: dream.targetDate,
      suggestedDeposit: suggestedMonthlyDeposit,
      monthsRemaining: remainingMonths,
    };
  });

  return {
    slices,
    totalCurrent,
    totalTarget,
    overallCompletionPct,
  };
}
