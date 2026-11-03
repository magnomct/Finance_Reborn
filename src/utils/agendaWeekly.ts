import { Transaction } from '../types';

export interface DayColumn {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number; // 1..31
  dayOfWeek: number; // 0 = Seg, 1 = Ter, ..., 6 = Dom
  dayOfWeekShort: string; // 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'
  dayOfWeekName: string; // 'Segunda', 'Terça', etc.
  isInCurrentMonth: boolean;
  transactions: Transaction[];
  income: number;
  expense: number;
  net: number;
}

export interface WeekGroup {
  weekNumber: number; // 1, 2, 3, 4, 5, 6
  label: string; // e.g. "Semana 1 (01 a 04/10)"
  shortLabel: string; // e.g. "Semana 1"
  dateRangeLabel: string; // e.g. "01/10 a 04/10"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: DayColumn[]; // Exactly 7 days (Seg to Dom)
  income: number;
  expense: number;
  net: number;
  accumulatedCashFlow: number; // Running month cash flow through this week
  transactionCount: number;
}

export interface MonthWeeklyData {
  yearMonth: string; // YYYY-MM
  year: number;
  month: number;
  monthName: string;
  weeks: WeekGroup[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netMonth: number;
    totalTransactions: number;
    busiestWeekNumber: number;
    highestIncomeWeekNumber: number;
    highestExpenseWeekNumber: number;
  };
}

export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const WEEKDAY_NAMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

const MONTH_NAMES_MAP: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12
};

/**
 * Parses human labels like "Outubro / 2026" or YYYY-MM into year and month (1-indexed).
 */
export function parseYearMonth(label: string): { year: number; month: number; yearMonth: string } {
  if (!label) {
    return { year: 2026, month: 10, yearMonth: '2026-10' };
  }

  // Check if standard ISO format YYYY-MM
  const isoMatch = label.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    return { year, month, yearMonth: `${year}-${String(month).padStart(2, '0')}` };
  }

  // Check format "Outubro / 2026" or "Outubro 2026"
  const parts = label.toLowerCase().split(/[\s/]+/).filter(Boolean);
  let foundMonth = 10;
  let foundYear = 2026;

  for (const part of parts) {
    if (MONTH_NAMES_MAP[part]) {
      foundMonth = MONTH_NAMES_MAP[part];
    } else if (/^\d{4}$/.test(part)) {
      foundYear = parseInt(part, 10);
    }
  }

  const yearMonth = `${foundYear}-${String(foundMonth).padStart(2, '0')}`;
  return { year: foundYear, month: foundMonth, yearMonth };
}

/**
 * Returns the day of the week with Monday as 0 and Sunday as 6.
 * (Native getDay() returns 0 for Sunday, 1 for Monday...)
 */
export function getMondayFirstDayOfWeek(date: Date): number {
  const day = date.getDay();
  return (day + 6) % 7;
}

/**
 * Returns number of days in a month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Groups transactions into calendar weeks and builds the 7-day weekly grid with cash flow metrics.
 */
export function buildWeeklyCalendar(
  transactions: Transaction[],
  monthLabelOrYearMonth: string
): MonthWeeklyData {
  const { year, month, yearMonth } = parseYearMonth(monthLabelOrYearMonth);
  const totalDaysInMonth = getDaysInMonth(year, month);

  // Filter transactions matching this month
  const monthTransactions = transactions.filter(t => {
    return t.date && t.date.startsWith(yearMonth);
  });

  // Map transactions by YYYY-MM-DD
  const txByDate: Record<string, Transaction[]> = {};
  for (const t of monthTransactions) {
    if (!txByDate[t.date]) {
      txByDate[t.date] = [];
    }
    txByDate[t.date].push(t);
  }

  const weeks: WeekGroup[] = [];
  let currentDay = 1;
  let weekNum = 1;
  let accumulatedCashFlow = 0;

  while (currentDay <= totalDaysInMonth) {
    const weekDays: DayColumn[] = [];
    let weekIncome = 0;
    let weekExpense = 0;

    // Find the Monday of this week block
    const dateForCurrentDay = new Date(year, month - 1, currentDay);
    const dayOfWeek = getMondayFirstDayOfWeek(dateForCurrentDay); // 0 (Seg) to 6 (Dom)
    
    // Start of the week row (Monday)
    const mondayDay = currentDay - dayOfWeek;
    let startDayInMonth = Math.max(1, currentDay);
    let endDayInMonth = currentDay;

    for (let col = 0; col < 7; col++) {
      const dayNumber = mondayDay + col;
      const isInMonth = dayNumber >= 1 && dayNumber <= totalDaysInMonth;
      
      if (isInMonth) {
        endDayInMonth = dayNumber;
        const dateStr = `${yearMonth}-${String(dayNumber).padStart(2, '0')}`;
        const dayTxs = txByDate[dateStr] || [];

        let dayInc = 0;
        let dayExp = 0;
        for (const tx of dayTxs) {
          if (tx.type === 'receita' || tx.type === 'reembolso') {
            dayInc += tx.amount;
          } else if (tx.type === 'despesa') {
            dayExp += Math.abs(tx.amount);
          }
        }

        weekIncome += dayInc;
        weekExpense += dayExp;

        weekDays.push({
          dateStr,
          dayOfMonth: dayNumber,
          dayOfWeek: col,
          dayOfWeekShort: WEEKDAY_SHORT[col],
          dayOfWeekName: WEEKDAY_NAMES[col],
          isInCurrentMonth: true,
          transactions: dayTxs,
          income: dayInc,
          expense: dayExp,
          net: dayInc - dayExp
        });
      } else {
        // Outside current month (padding day)
        weekDays.push({
          dateStr: '',
          dayOfMonth: 0,
          dayOfWeek: col,
          dayOfWeekShort: WEEKDAY_SHORT[col],
          dayOfWeekName: WEEKDAY_NAMES[col],
          isInCurrentMonth: false,
          transactions: [],
          income: 0,
          expense: 0,
          net: 0
        });
      }
    }

    const weekNet = weekIncome - weekExpense;
    accumulatedCashFlow += weekNet;

    const startPad = String(startDayInMonth).padStart(2, '0');
    const endPad = String(endDayInMonth).padStart(2, '0');
    const monthPad = String(month).padStart(2, '0');
    const dateRangeLabel = `${startPad}/${monthPad} a ${endPad}/${monthPad}`;

    weeks.push({
      weekNumber: weekNum,
      label: `Semana ${weekNum} (${startPad} a ${endPad}/${monthPad})`,
      shortLabel: `Semana ${weekNum}`,
      dateRangeLabel,
      startDate: `${yearMonth}-${startPad}`,
      endDate: `${yearMonth}-${endPad}`,
      days: weekDays,
      income: weekIncome,
      expense: weekExpense,
      net: weekNet,
      accumulatedCashFlow,
      transactionCount: weekDays.reduce((acc, d) => acc + d.transactions.length, 0)
    });

    // Advance to next Monday
    currentDay = mondayDay + 7;
    weekNum++;
  }

  // Calculate overall summary metrics
  const totalIncome = weeks.reduce((sum, w) => sum + w.income, 0);
  const totalExpense = weeks.reduce((sum, w) => sum + w.expense, 0);
  const netMonth = totalIncome - totalExpense;
  const totalTransactions = monthTransactions.length;

  let busiestWeekNumber = 1;
  let maxTxs = -1;
  let highestIncomeWeekNumber = 1;
  let maxInc = -1;
  let highestExpenseWeekNumber = 1;
  let maxExp = -1;

  for (const w of weeks) {
    if (w.transactionCount > maxTxs) {
      maxTxs = w.transactionCount;
      busiestWeekNumber = w.weekNumber;
    }
    if (w.income > maxInc) {
      maxInc = w.income;
      highestIncomeWeekNumber = w.weekNumber;
    }
    if (w.expense > maxExp) {
      maxExp = w.expense;
      highestExpenseWeekNumber = w.weekNumber;
    }
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return {
    yearMonth,
    year,
    month,
    monthName: monthNames[month - 1] || 'Mês',
    weeks,
    summary: {
      totalIncome,
      totalExpense,
      netMonth,
      totalTransactions,
      busiestWeekNumber,
      highestIncomeWeekNumber,
      highestExpenseWeekNumber
    }
  };
}
