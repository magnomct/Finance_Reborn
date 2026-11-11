import { RecurringExpense, RecurrenceFrequency } from '../types';
import { getMonthlyProjection } from './finance';

export interface RecurringCategoryContribution {
  category: string;
  monthlyAmount: number;
  percentageOfTotal: number;
  itemsCount: number;
  sampleItems: string[];
  barWidthPct: number;
  colorHex: string;
  badgeBg: string;
}

export interface RecurringTopCategoriesResult {
  topCategories: RecurringCategoryContribution[];
  allCategories: RecurringCategoryContribution[];
  totalMonthlyRecurringExpenses: number;
  top3TotalAmount: number;
  top3PercentageOfTotal: number;
  categoriesCount: number;
}

const PALETTE = [
  { colorHex: '#4f46e5', badgeBg: 'bg-indigo-500' }, // #1 Indigo
  { colorHex: '#0d9488', badgeBg: 'bg-teal-500' },   // #2 Teal
  { colorHex: '#f59e0b', badgeBg: 'bg-amber-500' },  // #3 Amber
  { colorHex: '#ec4899', badgeBg: 'bg-pink-500' },   // #4 Pink
  { colorHex: '#8b5cf6', badgeBg: 'bg-purple-500' }, // #5 Purple
];

/**
 * Identifies expense categories that contribute most to monthly recurring costs.
 * Returns the top categories ranked by monthly projected expenditure.
 */
export function calculateTopRecurringExpenseCategories(
  recurringList: RecurringExpense[],
  limit = 3
): RecurringTopCategoriesResult {
  if (!recurringList || recurringList.length === 0) {
    return {
      topCategories: [],
      allCategories: [],
      totalMonthlyRecurringExpenses: 0,
      top3TotalAmount: 0,
      top3PercentageOfTotal: 0,
      categoriesCount: 0,
    };
  }

  // Filter only active recurring expenses
  const activeExpenses = recurringList.filter(
    item => item.isActive !== false && item.type === 'despesa'
  );

  const categoryMap = new Map<string, { total: number; count: number; items: string[] }>();
  let totalMonthlyExpenses = 0;

  for (const item of activeExpenses) {
    const rawVal = item.amountRealized !== undefined 
      ? item.amountRealized 
      : (item.amountPlanned !== undefined ? item.amountPlanned : Math.abs(item.amount));
    
    const monthlyVal = getMonthlyProjection(Math.abs(rawVal), item.frequency || 'mensal');
    if (monthlyVal <= 0) continue;

    totalMonthlyExpenses += monthlyVal;

    const cat = (item.category && item.category.trim()) || 'Outros';
    const existing = categoryMap.get(cat) || { total: 0, count: 0, items: [] };
    existing.total += monthlyVal;
    existing.count += 1;
    if (item.description && !existing.items.includes(item.description)) {
      existing.items.push(item.description);
    }
    categoryMap.set(cat, existing);
  }

  // Sort categories descending by monthly amount
  const sortedEntries = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1].total - a[1].total
  );

  const maxAmount = sortedEntries.length > 0 ? sortedEntries[0][1].total : 1;

  const allCategories: RecurringCategoryContribution[] = sortedEntries.map(([cat, data], idx) => {
    const pctOfTotal = totalMonthlyExpenses > 0 
      ? (data.total / totalMonthlyExpenses) * 100 
      : 0;
    
    const barWidthPct = maxAmount > 0 
      ? Math.max(8, Math.round((data.total / maxAmount) * 100)) 
      : 0;

    const theme = PALETTE[idx % PALETTE.length];

    return {
      category: cat,
      monthlyAmount: parseFloat(data.total.toFixed(2)),
      percentageOfTotal: parseFloat(pctOfTotal.toFixed(1)),
      itemsCount: data.count,
      sampleItems: data.items.slice(0, 3),
      barWidthPct,
      colorHex: theme.colorHex,
      badgeBg: theme.badgeBg,
    };
  });

  const topCategories = allCategories.slice(0, limit);
  const top3TotalAmount = topCategories.reduce((acc, c) => acc + c.monthlyAmount, 0);
  const top3PercentageOfTotal = totalMonthlyExpenses > 0 
    ? parseFloat(((top3TotalAmount / totalMonthlyExpenses) * 100).toFixed(1))
    : 0;

  return {
    topCategories,
    allCategories,
    totalMonthlyRecurringExpenses: parseFloat(totalMonthlyExpenses.toFixed(2)),
    top3TotalAmount: parseFloat(top3TotalAmount.toFixed(2)),
    top3PercentageOfTotal,
    categoriesCount: allCategories.length,
  };
}
