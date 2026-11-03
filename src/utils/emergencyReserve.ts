import { MONTH_NAMES } from '../data/annualDashboardData';

export type ReserveHealthStatus = 'CRITICAL' | 'BUILDING' | 'SOLID' | 'COMPLETE';

export interface MonthExpenseItem {
  monthName: string;
  monthIndex: number;
  totalExpense: number;
}

export interface Recent3MonthsExpensesResult {
  months: MonthExpenseItem[];
  averageMonthlyExpense: number;
  totalExpenses3Months: number;
}

export interface EmergencyReserveCalculation {
  currentReserve: number;
  idealReserve: number;
  averageMonthlyExpense: number;
  targetMonths: number;
  completionPercentage: number;
  monthsCovered: number;
  shortfall: number;
  status: ReserveHealthStatus;
  statusLabel: string;
  monthsToGoal: number | null;
}

/**
 * Pure function: Calculates total monthly expenses across all expense categories
 * in annualData for a specific month index (0 to 11).
 */
export function calculateMonthExpenseFromAnnualData(
  annualDataDespesas: Record<string, Array<{ values: number[] }>>,
  monthIdx: number
): number {
  let total = 0;
  for (const group of Object.values(annualDataDespesas)) {
    if (Array.isArray(group)) {
      for (const row of group) {
        if (row && Array.isArray(row.values) && typeof row.values[monthIdx] === 'number') {
          total += row.values[monthIdx];
        }
      }
    }
  }
  return total;
}

/**
 * Pure function: Computes expenses for the last 3 months leading up to referenceMonthIndex.
 * If some months have 0 recorded expenses, checks preceding months or uses reasonable fallbacks.
 */
export function calculateRecent3MonthsExpenses(
  annualDataDespesas: Record<string, Array<{ values: number[] }>>,
  referenceMonthIndex: number = 9 // Default October (index 9)
): Recent3MonthsExpensesResult {
  const safeIdx = Math.max(0, Math.min(11, referenceMonthIndex));
  
  // Pick reference month and 2 preceding months
  const indices: number[] = [];
  for (let i = 2; i >= 0; i--) {
    const idx = (safeIdx - i + 12) % 12;
    indices.push(idx);
  }

  let months: MonthExpenseItem[] = indices.map(idx => ({
    monthName: MONTH_NAMES[idx] || `Mês ${idx + 1}`,
    monthIndex: idx,
    totalExpense: calculateMonthExpenseFromAnnualData(annualDataDespesas, idx)
  }));

  // If the selected months have zero expenses (e.g. unpopulated months in spreadsheet),
  // search for months that have positive spending data (like Jan, Out, Nov, etc.)
  const totalSum = months.reduce((acc, m) => acc + m.totalExpense, 0);
  if (totalSum <= 0) {
    // Collect all months with positive spending
    const positiveMonths: MonthExpenseItem[] = [];
    for (let m = 0; m < 12; m++) {
      const exp = calculateMonthExpenseFromAnnualData(annualDataDespesas, m);
      if (exp > 0) {
        positiveMonths.push({
          monthName: MONTH_NAMES[m] || `Mês ${m + 1}`,
          monthIndex: m,
          totalExpense: exp
        });
      }
    }

    if (positiveMonths.length > 0) {
      // Use up to 3 most recent populated months
      months = positiveMonths.slice(-3);
    }
  }

  const totalExpenses3Months = months.reduce((acc, m) => acc + m.totalExpense, 0);
  const count = months.length > 0 ? months.length : 1;
  const averageMonthlyExpense = totalExpenses3Months / count;

  return {
    months,
    averageMonthlyExpense,
    totalExpenses3Months
  };
}

/**
 * Pure function: Calculates ideal emergency fund target, progress percentage,
 * coverage in months, and status.
 */
export function calculateEmergencyReserveGoal(
  averageMonthlyExpense: number,
  targetMonths: number = 6,
  currentReserve: number = 1200,
  monthlyContribution: number = 350
): EmergencyReserveCalculation {
  const safeAverage = Math.max(0, averageMonthlyExpense);
  const safeMonths = Math.max(1, targetMonths);
  const safeCurrent = Math.max(0, currentReserve);

  const idealReserve = safeAverage * safeMonths;
  const completionPercentage = idealReserve > 0 
    ? (safeCurrent / idealReserve) * 100 
    : 0;

  const monthsCovered = safeAverage > 0 
    ? (safeCurrent / safeAverage) 
    : 0;

  const shortfall = Math.max(0, idealReserve - safeCurrent);

  let status: ReserveHealthStatus = 'CRITICAL';
  let statusLabel = 'Em Formação Inicial';

  if (completionPercentage >= 100) {
    status = 'COMPLETE';
    statusLabel = 'Reserva Completa 🎉';
  } else if (completionPercentage >= 70) {
    status = 'SOLID';
    statusLabel = 'Nível Confortável';
  } else if (completionPercentage >= 35) {
    status = 'BUILDING';
    statusLabel = 'Em Construção Consistente';
  }

  const monthsToGoal = shortfall > 0 && monthlyContribution > 0
    ? Math.ceil(shortfall / monthlyContribution)
    : 0;

  return {
    currentReserve: safeCurrent,
    idealReserve,
    averageMonthlyExpense: safeAverage,
    targetMonths: safeMonths,
    completionPercentage,
    monthsCovered,
    shortfall,
    status,
    statusLabel,
    monthsToGoal: shortfall > 0 ? monthsToGoal : null
  };
}

/**
 * Persistence helpers for emergency reserve
 */
export function loadStoredReserveBalance(defaultBalance: number = 1200): number {
  try {
    const saved = localStorage.getItem('yupee_emergency_reserve_balance');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {
    // fallback
  }
  return defaultBalance;
}

export function saveStoredReserveBalance(balance: number): void {
  try {
    localStorage.setItem('yupee_emergency_reserve_balance', balance.toString());
  } catch (e) {
    console.error('Failed to save reserve balance:', e);
  }
}

export function loadStoredTargetMonths(defaultMonths: number = 6): number {
  try {
    const saved = localStorage.getItem('yupee_emergency_reserve_target_months');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 24) return parsed;
    }
  } catch {
    // fallback
  }
  return defaultMonths;
}

export function saveStoredTargetMonths(months: number): void {
  try {
    localStorage.setItem('yupee_emergency_reserve_target_months', months.toString());
  } catch (e) {
    console.error('Failed to save target months:', e);
  }
}
