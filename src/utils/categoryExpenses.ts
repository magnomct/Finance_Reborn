import { Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export interface CategoryExpenseItem {
  category: string;
  totalSpent: number;
  percentage: number;
  fraction: number;
  transactionCount: number;
  colorHex: string;
  transactions: Transaction[];
  startAngle: number;
  endAngle: number;
}

export interface CategoryExpenseSummary {
  categories: CategoryExpenseItem[];
  totalExpenses: number;
  categoryCount: number;
  topCategory: CategoryExpenseItem | null;
}

export const CATEGORY_COLOR_PALETTE = [
  '#3B82F6', // Blue - Moradia
  '#EF4444', // Red - Cartão de Crédito
  '#F59E0B', // Amber - Alimentação & Mercado
  '#10B981', // Emerald - Saúde & Bem-estar
  '#8B5CF6', // Purple - Lazer & Restaurantes
  '#EC4899', // Pink - Casa & Utilidades
  '#06B6D4', // Cyan - Transporte & Combustível
  '#F97316', // Orange - Juros & Tarifas
  '#6366F1', // Indigo - Educação & Cursos
  '#14B8A6', // Teal - Impostos & Tributos
  '#E11D48', // Rose - Assinaturas & Serviços
  '#64748B', // Slate - Outros
];

const KNOWN_CATEGORY_COLORS: Record<string, string> = {
  'Moradia': '#3B82F6',
  'Habitação': '#3B82F6',
  'Cartão de Crédito': '#EF4444',
  'Cartão C6': '#EF4444',
  'Alimentação': '#F59E0B',
  'Mercado': '#F59E0B',
  'Saúde': '#10B981',
  'Saúde PJ': '#10B981',
  'Lazer': '#8B5CF6',
  'Casa & Utilidades': '#EC4899',
  'Transporte': '#06B6D4',
  'Juros / Tarifas': '#F97316',
  'Educação': '#6366F1',
  'Impostos': '#14B8A6',
  'Impostos PJ': '#14B8A6',
  'Outros': '#64748B',
};

/**
 * Pure function: Groups expense transactions by category,
 * calculates total spent, percentage distribution, angles for pie chart,
 * and maintains associated transactions for detail inspection.
 */
export function calculateCategoryExpenses(transactions: Transaction[]): CategoryExpenseSummary {
  const expenseTransactions = transactions.filter(t => t.type === 'despesa');

  if (expenseTransactions.length === 0) {
    return {
      categories: [],
      totalExpenses: 0,
      categoryCount: 0,
      topCategory: null,
    };
  }

  // Group by category
  const grouped: Record<string, { total: number; transactions: Transaction[] }> = {};

  expenseTransactions.forEach(tx => {
    let cat = (tx.category || '').trim();
    if (!cat) {
      // Fallback to jar name or 'Outros'
      if (tx.jar && JAR_DEFINITIONS[tx.jar]) {
        cat = JAR_DEFINITIONS[tx.jar].shortName;
      } else {
        cat = 'Outros';
      }
    }

    if (!grouped[cat]) {
      grouped[cat] = { total: 0, transactions: [] };
    }

    grouped[cat].total += Math.abs(tx.amount);
    grouped[cat].transactions.push(tx);
  });

  const totalExpenses = Object.values(grouped).reduce((acc, g) => acc + g.total, 0);

  if (totalExpenses === 0) {
    return {
      categories: [],
      totalExpenses: 0,
      categoryCount: 0,
      topCategory: null,
    };
  }

  // Sort descending by total spent
  const sortedEntries = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  let cumulativeAngle = 0;
  const categories: CategoryExpenseItem[] = sortedEntries.map(([catName, data], index) => {
    const fraction = data.total / totalExpenses;
    const percentage = Math.round(fraction * 1000) / 10;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const colorHex = KNOWN_CATEGORY_COLORS[catName] || CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length];

    // Sort transactions within category by date descending
    const sortedTx = [...data.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      category: catName,
      totalSpent: Math.round(data.total * 100) / 100,
      percentage,
      fraction,
      transactionCount: data.transactions.length,
      colorHex,
      transactions: sortedTx,
      startAngle,
      endAngle,
    };
  });

  return {
    categories,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    categoryCount: categories.length,
    topCategory: categories.length > 0 ? categories[0] : null,
  };
}
