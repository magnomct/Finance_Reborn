import { Transaction, JarType } from '../types';
import { MONTH_NAMES, INITIAL_ANNUAL_DATA } from '../data/annualDashboardData';
import { INITIAL_RECURRING } from '../data/initialData';

export interface DayExpenseCell {
  dayOfMonth: number; // 1..31
  monthIndex: number; // 0..11
  monthName: string;
  monthShortName: string;
  dateStr: string; // 'YYYY-MM-DD'
  totalSpent: number; // Positive number representing expense magnitude
  transactionCount: number;
  intensityLevel: 0 | 1 | 2 | 3 | 4; // 0: zero, 1: leve, 2: moderado, 3: alto, 4: crítico/pico
  intensityPct: number; // 0..100% relative to maximum day in year
  isWeekend: boolean;
  dayOfWeek: number; // 0 = Dom, 6 = Sáb
  dayOfWeekName: string; // 'Dom', 'Seg', etc.
  isValidDay: boolean; // false for Feb 30, Apr 31, etc.
  topCategories: Array<{ category: string; amount: number }>;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    jar: string;
  }>;
}

export interface SeasonalDayInsight {
  dayOfMonth: number;
  totalSpentYear: number;
  avgSpentMonth: number;
  frequencyMonths: number;
  sharePctOfYear: number;
  primaryReason: string;
}

export interface SeasonalMonthInsight {
  monthIndex: number;
  monthName: string;
  monthShortName: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  totalSpent: number;
  sharePct: number;
  peakDayOfMonth: number;
  peakDayAmount: number;
  isPeakMonth: boolean;
}

export interface SeasonalPatternSummary {
  topDaysOfMonth: SeasonalDayInsight[];
  topMonths: SeasonalMonthInsight[];
  weekdayVsWeekend: {
    weekdayTotal: number;
    weekdayAvg: number;
    weekendTotal: number;
    weekendAvg: number;
    ratio: number; // weekdayAvg / weekendAvg
    primaryProfile: 'dias_uteis' | 'fim_de_semana' | 'equilibrado';
  };
  concentrationWeek: {
    weekRange: string;
    totalSpent: number;
    sharePct: number;
    description: string;
  };
  busiestDayOfYear: {
    dateStr: string;
    dayOfMonth: number;
    monthName: string;
    totalSpent: number;
    primaryDescription: string;
  };
  recommendedLiquidityBuffer: number;
  headlineInsight: string;
  diagnosisText: string;
}

export interface HeatmapFilterOptions {
  jarFilter?: JarType | 'ALL';
  categoryFilter?: string | 'ALL';
  dayTypeFilter?: 'ALL' | 'WEEKDAYS' | 'WEEKENDS';
  year?: number;
}

export interface ExpenseHeatmapResult {
  year: number;
  matrix: DayExpenseCell[][]; // 12 rows (months), 31 columns (days)
  monthsSummary: SeasonalMonthInsight[];
  totalYearExpenses: number;
  maxDailyExpense: number;
  avgDailyExpense: number;
  daysWithExpensesCount: number;
  patterns: SeasonalPatternSummary;
  availableCategories: string[];
  dayTotalsAcrossYear: Array<{ dayOfMonth: number; total: number; avg: number }>;
}

const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Returns number of days in a given year and month (0-indexed).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Maps spending amount to one of 5 visual intensity levels.
 */
export function calculateIntensityLevel(amount: number, maxAmount: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0) return 0;
  if (maxAmount <= 0) return 1;

  // Use dynamic percentile or benchmark scale
  const ratio = amount / maxAmount;
  if (ratio > 0.75 || amount >= 1200) return 4; // Pico crítico (ex: C6 ou Financiamento Apto)
  if (ratio > 0.40 || amount >= 500) return 3;  // Elevado
  if (ratio > 0.15 || amount >= 150) return 2;  // Moderado
  return 1;                                     // Leve
}

/**
 * Pure function: Builds the full 12x31 matrix of expense intensity
 * across all days of the year, incorporating transactions, recurring bills,
 * and annual data, plus discovering seasonal spending patterns.
 */
export function buildExpenseHeatmapData(params?: {
  transactions?: Transaction[];
  year?: number;
  filters?: HeatmapFilterOptions;
}): ExpenseHeatmapResult {
  const {
    transactions = [],
    year = 2026,
    filters = {}
  } = params || {};

  const jarFilter = filters.jarFilter || 'ALL';
  const categoryFilter = filters.categoryFilter || 'ALL';
  const dayTypeFilter = filters.dayTypeFilter || 'ALL';

  // Build a lookup map for daily transactions: 'YYYY-MM-DD' -> list of items
  const dailyTxMap = new Map<string, Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    jar: string;
  }>>();

  // 1. Process explicit transactions passed in
  transactions.forEach((tx) => {
    // Only consider expenses (amount < 0 or type === 'despesa')
    if (tx.type !== 'despesa' && tx.amount >= 0) return;

    if (!tx.date) return;
    const [txYearStr, txMonthStr] = tx.date.split('-');
    const txYear = parseInt(txYearStr, 10);
    if (txYear !== year) return;

    // Apply jar filter
    if (jarFilter !== 'ALL' && tx.jar !== jarFilter) return;

    // Apply category filter
    const cat = tx.category || 'Outros';
    if (categoryFilter !== 'ALL' && cat.toLowerCase() !== categoryFilter.toLowerCase()) return;

    const absAmount = Math.abs(tx.amount);
    const existing = dailyTxMap.get(tx.date) || [];
    existing.push({
      id: tx.id,
      description: tx.description,
      amount: absAmount,
      category: cat,
      jar: tx.jar
    });
    dailyTxMap.set(tx.date, existing);
  });

  // 2. Synthesize baseline recurring bills for all months that don't have explicit transactions yet
  // This allows the heatmap to display the true seasonal pulse across the entire 12-month calendar
  const activeMonthsWithTx = new Set<number>();
  transactions.forEach(tx => {
    if (tx.date) {
      const parts = tx.date.split('-');
      if (parseInt(parts[0], 10) === year) {
        activeMonthsWithTx.add(parseInt(parts[1], 10) - 1);
      }
    }
  });

  // For months without direct daily records, project recurring expenses so the user can see seasonal rhythm
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    if (!activeMonthsWithTx.has(mIdx)) {
      INITIAL_RECURRING.forEach((rec) => {
        if (rec.type !== 'despesa' || !rec.isActive) return;
        if (jarFilter !== 'ALL' && rec.jar !== jarFilter) return;
        const cat = rec.category || 'Outros';
        if (categoryFilter !== 'ALL' && cat.toLowerCase() !== categoryFilter.toLowerCase()) return;

        const day = Math.min(rec.dayOfMonth || 15, getDaysInMonth(year, mIdx));
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(mIdx + 1).padStart(2, '0');
        const dateKey = `${year}-${monthStr}-${dayStr}`;

        const absAmount = Math.abs(rec.amount);
        const existing = dailyTxMap.get(dateKey) || [];
        existing.push({
          id: `synth-${rec.id}-${mIdx}`,
          description: rec.description,
          amount: absAmount,
          category: cat,
          jar: rec.jar
        });
        dailyTxMap.set(dateKey, existing);
      });
    }
  }

  // 3. Collect unique categories across all items for filtering
  const categorySet = new Set<string>();
  dailyTxMap.forEach(items => {
    items.forEach(i => {
      if (i.category) categorySet.add(i.category);
    });
  });
  const availableCategories = Array.from(categorySet).sort();

  // 4. First pass: compute totals and find maxDailyExpense for relative scaling
  let rawMaxDay = 0;
  let totalExpensesYear = 0;
  let daysWithExpensesCount = 0;

  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const daysCount = getDaysInMonth(year, mIdx);
    const monthStr = String(mIdx + 1).padStart(2, '0');

    for (let day = 1; day <= daysCount; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const items = dailyTxMap.get(dateKey) || [];
      const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);

      // Check day type filter (WEEKDAYS vs WEEKENDS)
      const dateObj = new Date(year, mIdx, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (dayTypeFilter === 'WEEKDAYS' && isWeekend) continue;
      if (dayTypeFilter === 'WEEKENDS' && !isWeekend) continue;

      if (dayTotal > 0) {
        daysWithExpensesCount++;
        totalExpensesYear += dayTotal;
        if (dayTotal > rawMaxDay) {
          rawMaxDay = dayTotal;
        }
      }
    }
  }

  const maxDailyExpense = rawMaxDay > 0 ? rawMaxDay : 2500;
  const avgDailyExpense = daysWithExpensesCount > 0 ? totalExpensesYear / daysWithExpensesCount : 0;

  // 5. Build 12x31 matrix
  const matrix: DayExpenseCell[][] = [];
  const monthTotals: number[] = Array(12).fill(0);
  const dayTotalsAcrossYear: Array<{ dayOfMonth: number; total: number; avg: number }> = Array.from(
    { length: 31 },
    (_, i) => ({ dayOfMonth: i + 1, total: 0, avg: 0 })
  );

  let busiestDayOverall: DayExpenseCell | null = null;
  let weekdayTotal = 0;
  let weekdayCount = 0;
  let weekendTotal = 0;
  let weekendCount = 0;

  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const daysInThisMonth = getDaysInMonth(year, mIdx);
    const monthStr = String(mIdx + 1).padStart(2, '0');
    const monthCells: DayExpenseCell[] = [];

    for (let day = 1; day <= 31; day++) {
      const isValidDay = day <= daysInThisMonth;
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dateObj = isValidDay ? new Date(year, mIdx, day) : new Date(year, mIdx, 1);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let items = isValidDay ? dailyTxMap.get(dateStr) || [] : [];

      // If dayTypeFilter doesn't match, zero out for this cell view
      if (dayTypeFilter === 'WEEKDAYS' && isWeekend) items = [];
      if (dayTypeFilter === 'WEEKENDS' && !isWeekend) items = [];

      const totalSpent = items.reduce((sum, item) => sum + item.amount, 0);

      // Aggregate top categories for the day
      const catMap = new Map<string, number>();
      items.forEach(it => {
        catMap.set(it.category, (catMap.get(it.category) || 0) + it.amount);
      });
      const topCategories = Array.from(catMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      const intensityLevel = isValidDay ? calculateIntensityLevel(totalSpent, maxDailyExpense) : 0;
      const intensityPct = isValidDay && maxDailyExpense > 0 
        ? Math.min(100, Math.round((totalSpent / maxDailyExpense) * 100)) 
        : 0;

      const cell: DayExpenseCell = {
        dayOfMonth: day,
        monthIndex: mIdx,
        monthName: MONTH_NAMES[mIdx],
        monthShortName: SHORT_MONTH_NAMES[mIdx],
        dateStr,
        totalSpent,
        transactionCount: items.length,
        intensityLevel,
        intensityPct,
        isWeekend,
        dayOfWeek,
        dayOfWeekName: WEEKDAY_NAMES[dayOfWeek],
        isValidDay,
        topCategories,
        transactions: items
      };

      monthCells.push(cell);

      if (isValidDay && totalSpent > 0) {
        monthTotals[mIdx] += totalSpent;
        dayTotalsAcrossYear[day - 1].total += totalSpent;

        if (isWeekend) {
          weekendTotal += totalSpent;
          weekendCount++;
        } else {
          weekdayTotal += totalSpent;
          weekdayCount++;
        }

        if (!busiestDayOverall || totalSpent > busiestDayOverall.totalSpent) {
          busiestDayOverall = cell;
        }
      }
    }

    matrix.push(monthCells);
  }

  // Calculate day-of-month averages across 12 months
  dayTotalsAcrossYear.forEach((d) => {
    d.avg = Math.round((d.total / 12) * 100) / 100;
  });

  // 6. Seasonal Months Insights
  const monthsSummary: SeasonalMonthInsight[] = monthTotals.map((tot, idx) => {
    const q: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 
      idx < 3 ? 'Q1' : idx < 6 ? 'Q2' : idx < 9 ? 'Q3' : 'Q4';

    // Find peak day in this month
    let peakDayOfMonth = 1;
    let peakDayAmount = 0;
    matrix[idx].forEach(c => {
      if (c.isValidDay && c.totalSpent > peakDayAmount) {
        peakDayAmount = c.totalSpent;
        peakDayOfMonth = c.dayOfMonth;
      }
    });

    const share = totalExpensesYear > 0 ? (tot / totalExpensesYear) * 100 : 0;

    return {
      monthIndex: idx,
      monthName: MONTH_NAMES[idx],
      monthShortName: SHORT_MONTH_NAMES[idx],
      quarter: q,
      totalSpent: Math.round(tot * 100) / 100,
      sharePct: Math.round(share * 10) / 10,
      peakDayOfMonth,
      peakDayAmount,
      isPeakMonth: false
    };
  });

  // Highlight peak month
  const highestMonthSpent = Math.max(...monthsSummary.map(m => m.totalSpent));
  monthsSummary.forEach(m => {
    if (m.totalSpent === highestMonthSpent && highestMonthSpent > 0) {
      m.isPeakMonth = true;
    }
  });

  // 7. Top Spending Days of the Month (e.g. Day 22, Day 25, Day 15)
  const sortedDays = [...dayTotalsAcrossYear]
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const topDaysOfMonth: SeasonalDayInsight[] = sortedDays.slice(0, 5).map(d => {
    const share = totalExpensesYear > 0 ? (d.total / totalExpensesYear) * 100 : 0;
    
    let reason = 'Despesas correntes e parcelamentos';
    if (d.dayOfMonth === 22) reason = 'Vencimento Fatura Cartão C6 (Lazer e Contas)';
    else if (d.dayOfMonth === 25) reason = 'Financiamento Habitacional / Caixa Apto';
    else if (d.dayOfMonth === 20) reason = 'Tributos DAS Simples Nacional';
    else if (d.dayOfMonth === 23) reason = 'Convênio Médico Empresarial PJ';
    else if (d.dayOfMonth === 15) reason = 'Reembolso Moradia / Adiantamentos de Salário';
    else if (d.dayOfMonth === 7) reason = 'Transporte e Condução Semanal';

    return {
      dayOfMonth: d.dayOfMonth,
      totalSpentYear: Math.round(d.total * 100) / 100,
      avgSpentMonth: Math.round((d.total / 12) * 100) / 100,
      frequencyMonths: matrix.filter(row => row[d.dayOfMonth - 1]?.totalSpent > 0).length,
      sharePctOfYear: Math.round(share * 10) / 10,
      primaryReason: reason
    };
  });

  // 8. Weekday vs Weekend Profile
  const weekdayAvg = weekdayCount > 0 ? Math.round((weekdayTotal / weekdayCount) * 100) / 100 : 0;
  const weekendAvg = weekendCount > 0 ? Math.round((weekendTotal / weekendCount) * 100) / 100 : 0;
  const ratio = weekendAvg > 0 ? Math.round((weekdayAvg / weekendAvg) * 100) / 100 : 1;

  let primaryProfile: 'dias_uteis' | 'fim_de_semana' | 'equilibrado' = 'equilibrado';
  if (weekdayAvg > weekendAvg * 1.3) primaryProfile = 'dias_uteis';
  else if (weekendAvg > weekdayAvg * 1.3) primaryProfile = 'fim_de_semana';

  // 9. Concentration Week (Days 20 to 26 typically concentrate 60%+ of expenses)
  const criticalWeekTotal = dayTotalsAcrossYear
    .filter(d => d.dayOfMonth >= 20 && d.dayOfMonth <= 26)
    .reduce((sum, d) => sum + d.total, 0);
  const criticalWeekShare = totalExpensesYear > 0 
    ? Math.round((criticalWeekTotal / totalExpensesYear) * 1000) / 10 
    : 0;

  // 10. Recommended Liquidity Buffer
  // Calculate average spending peak in days 20..26
  const monthlyCriticalPeak = Math.round((criticalWeekTotal / 12) * 100) / 100;
  const recommendedLiquidityBuffer = Math.max(monthlyCriticalPeak, 2000);

  // 11. Headline & Diagnosis
  const topDay1 = topDaysOfMonth[0]?.dayOfMonth || 22;
  const topDay2 = topDaysOfMonth[1]?.dayOfMonth || 25;

  const headlineInsight = `Pico sazonal concentrado entre os dias ${topDay1} e ${topDay2} (${criticalWeekShare}% dos gastos do mês).`;
  const diagnosisText = `O mapa de calor revela forte sazonalidade mensal: as contas essenciais e o cartão de crédito convergem na quarta semana do mês (dias 20 a 26). Mantenha um saldo mínimo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recommendedLiquidityBuffer)} disponível na conta até o dia 26 para blindar seu fluxo contra juros e cheque especial.`;

  const busiestDayDetails = busiestDayOverall ? {
    dateStr: busiestDayOverall.dateStr,
    dayOfMonth: busiestDayOverall.dayOfMonth,
    monthName: busiestDayOverall.monthName,
    totalSpent: busiestDayOverall.totalSpent,
    primaryDescription: busiestDayOverall.transactions[0]?.description || 'Concentração de despesas'
  } : {
    dateStr: `${year}-10-22`,
    dayOfMonth: 22,
    monthName: 'Outubro',
    totalSpent: 2600,
    primaryDescription: 'Fatura Cartão C6'
  };

  return {
    year,
    matrix,
    monthsSummary,
    totalYearExpenses: Math.round(totalExpensesYear * 100) / 100,
    maxDailyExpense,
    avgDailyExpense: Math.round(avgDailyExpense * 100) / 100,
    daysWithExpensesCount,
    patterns: {
      topDaysOfMonth,
      topMonths: monthsSummary.slice().sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3),
      weekdayVsWeekend: {
        weekdayTotal: Math.round(weekdayTotal * 100) / 100,
        weekdayAvg,
        weekendTotal: Math.round(weekendTotal * 100) / 100,
        weekendAvg,
        ratio,
        primaryProfile
      },
      concentrationWeek: {
        weekRange: 'Dias 20 a 26',
        totalSpent: Math.round(criticalWeekTotal * 100) / 100,
        sharePct: criticalWeekShare,
        description: 'Vencimentos da fatura C6, Habitação Caixa, Convênio PJ e tributos DAS'
      },
      busiestDayOfYear: busiestDayDetails,
      recommendedLiquidityBuffer,
      headlineInsight,
      diagnosisText
    },
    availableCategories,
    dayTotalsAcrossYear
  };
}
