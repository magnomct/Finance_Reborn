import { Transaction, JarType, AutoCategoryRule, RecurringExpense, RecurrenceFrequency } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export interface JarMetric {
  id: JarType;
  name: string;
  shortName: string;
  desc: string;
  pct: number;
  budget: number;
  spent: number;
  remaining: number;
  usageRatio: number;
  isOver: boolean;
  colorHex: string;
  bgClass: string;
  textClass: string;
  iconName: string;
}

export interface CashflowDayPoint {
  day: number;
  dateStr: string;
  income: number;
  expense: number;
  netDay: number;
  accumulatedBalance: number;
  accumulatedSpent: number;
  idealBudgetSpent: number;
  hasOverdraftRisk: boolean;
  transactions: Transaction[];
}

export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function calculateFinancialMetrics(
  transactions: Transaction[],
  usePjProfitInPf: boolean = true
) {
  // 1. Entradas PF
  const cltIncome = transactions
    .filter(t => t.type === 'receita' && t.costCenter === 'Magno')
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Faturamento PJ
  const pjServiceIncome = transactions
    .filter(t => t.type === 'receita' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + t.amount, 0);

  // 3. Custos Operacionais PJ
  const pjExpenses = transactions
    .filter(t => t.type === 'despesa' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const pjNetProfit = pjServiceIncome - pjExpenses;

  // 4. Financiamento Habitacional & Reembolso & Juros
  const aptoBaseParcel = transactions
    .filter(t => t.description.toLowerCase().includes('parcela habitacional') && t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const overdraftInterest = transactions
    .filter(t => (t.description.toLowerCase().includes('cheque especial') || t.category === 'Juros / Tarifas') && t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const nathanRefund = transactions
    .filter(t => t.type === 'reembolso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalAptoDebit = aptoBaseParcel + overdraftInterest;
  const magnoTotalNetApto = totalAptoDebit - nathanRefund;
  const magnoPureMortgage = magnoTotalNetApto - overdraftInterest;

  // 5. Cartão C6 Total
  const c6Total = transactions
    .filter(t => t.account === 'C6' && t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // 6. Base Orçamentária dos Potes
  const effectiveIncomeBase = usePjProfitInPf && pjNetProfit > 0 
    ? cltIncome + pjNetProfit 
    : cltIncome;

  // 7. Gastos Líquidos por Pote
  const calcExpenseForJar = (jarId: JarType): number => {
    const expenses = transactions
      .filter(t => t.jar === jarId && t.type === 'despesa')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const refunds = transactions
      .filter(t => t.jar === jarId && t.type === 'reembolso')
      .reduce((acc, t) => acc + t.amount, 0);

    return Math.max(0, expenses - refunds);
  };

  const jarKeys: JarType[] = ['NEC_55', 'LIF_10', 'PLP_10', 'EDU_10', 'DIV_10', 'FER_5'];
  const jars: Record<string, JarMetric> = {};

  let totalSpentPF = 0;

  jarKeys.forEach(key => {
    const def = JAR_DEFINITIONS[key];
    const spent = calcExpenseForJar(key);
    const budget = effectiveIncomeBase * def.pct;
    const remaining = budget - spent;
    const usageRatio = budget > 0 ? (spent / budget) * 100 : 0;
    const isOver = spent > budget;

    totalSpentPF += spent;

    jars[key] = {
      id: key,
      name: def.name,
      shortName: def.shortName,
      desc: def.desc,
      pct: def.pct,
      budget,
      spent,
      remaining,
      usageRatio,
      isOver,
      colorHex: def.colorHex,
      bgClass: def.bgClass,
      textClass: def.textClass,
      iconName: def.iconName,
    };
  });

  // Totais Brutos da Agenda
  const totalReceipts = transactions
    .filter(t => t.type === 'receita' || t.type === 'reembolso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalPayments = transactions
    .filter(t => t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netBalanceConsolidated = (cltIncome + (pjNetProfit > 0 ? pjNetProfit : 0)) - totalSpentPF;
  const netBalancePFIsolated = cltIncome - totalSpentPF;

  return {
    cltIncome,
    pjServiceIncome,
    totalGrossIncome: cltIncome + pjServiceIncome,
    pjExpenses,
    pjNetProfit,
    pjProfitMargin: pjServiceIncome > 0 ? (pjNetProfit / pjServiceIncome) * 100 : 0,
    nathanRefund,
    totalAptoDebit,
    magnoTotalNetApto,
    magnoPureMortgage,
    overdraftInterest,
    c6Total,
    effectiveIncomeBase,
    totalSpentPF,
    totalReceipts,
    totalPayments,
    netBalanceConsolidated,
    netBalancePFIsolated,
    jars,
  };
}

/**
 * Simulates daily cashflow progression across all days of the month (1 to 31)
 */
export function simulateDailyCashflow(
  transactions: Transaction[],
  monthBudget: number,
  startingBalance: number = 0,
  daysInMonth: number = 31
): {
  days: CashflowDayPoint[];
  minBalance: number;
  minBalanceDay: number;
  hasOverdraftRisk: boolean;
  recommendedCushion: number;
} {
  const dayMap = new Map<number, Transaction[]>();
  for (let d = 1; d <= daysInMonth; d++) {
    dayMap.set(d, []);
  }

  transactions.forEach(tx => {
    const day = parseInt(tx.date.split('-')[2], 10);
    if (!isNaN(day) && day >= 1 && day <= daysInMonth) {
      const arr = dayMap.get(day) || [];
      arr.push(tx);
      dayMap.set(day, arr);
    }
  });

  const points: CashflowDayPoint[] = [];
  let currentBalance = startingBalance;
  let cumulativeSpent = 0;
  let minBalance = startingBalance;
  let minBalanceDay = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayTxs = dayMap.get(d) || [];
    let dayIncome = 0;
    let dayExpense = 0;

    dayTxs.forEach(tx => {
      if (tx.type === 'receita' || tx.type === 'reembolso') {
        dayIncome += tx.amount;
      } else if (tx.type === 'despesa') {
        dayExpense += Math.abs(tx.amount);
      }
    });

    const netDay = dayIncome - dayExpense;
    currentBalance += netDay;
    cumulativeSpent += dayExpense;

    if (currentBalance < minBalance) {
      minBalance = currentBalance;
      minBalanceDay = d;
    }

    const idealBudgetSpent = (monthBudget / daysInMonth) * d;

    points.push({
      day: d,
      dateStr: `Dia ${d}`,
      income: dayIncome,
      expense: dayExpense,
      netDay,
      accumulatedBalance: currentBalance,
      accumulatedSpent: cumulativeSpent,
      idealBudgetSpent,
      hasOverdraftRisk: currentBalance < 0,
      transactions: dayTxs,
    });
  }

  const hasOverdraftRisk = minBalance < 0;
  const recommendedCushion = hasOverdraftRisk ? Math.ceil(Math.abs(minBalance) + 200) : 0;

  return {
    days: points,
    minBalance,
    minBalanceDay,
    hasOverdraftRisk,
    recommendedCushion,
  };
}

/**
 * Calculates safe daily spend limit for remaining days in month
 */
export function calculateDailySafeSpend(
  totalBudget: number,
  totalSpent: number,
  currentDay: number = 27,
  daysInMonth: number = 31
) {
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
  const safePerDay = remainingBudget / remainingDays;
  const isExceeded = totalSpent > totalBudget;

  return {
    remainingBudget,
    remainingDays,
    safePerDay,
    isExceeded,
    overspentAmount: isExceeded ? totalSpent - totalBudget : 0,
  };
}

/**
 * Applies automatic categorization rules to a description
 */
export function applyAutoRules(
  description: string,
  rules: AutoCategoryRule[]
): Partial<Transaction> | null {
  const lower = description.toLowerCase().trim();
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return {
        jar: rule.jar,
        category: rule.category,
        costCenter: rule.costCenter,
        account: rule.account,
      };
    }
  }
  return null;
}


/**
 * Calculates monthly projected amount based on recurrence frequency
 */
export function getMonthlyProjection(amount: number, frequency: RecurrenceFrequency = 'mensal'): number {
  const abs = Math.abs(amount);
  switch (frequency) {
    case 'diaria':
      return abs * 30; // base mensal 30 dias
    case 'semanal':
      return abs * 4;  // 4 semanas no mês
    case 'quinzenal':
      return abs * 2;  // 2 quinzenas no mês
    case 'mensal':
    default:
      return abs;
  }
}

/**
 * Calculates Planned vs Realized variance (Desvio)
 */
export function calculateRecurringVariance(
  planned: number, 
  realized: number, 
  type: 'receita' | 'despesa' | 'reembolso'
) {
  const p = Math.abs(planned);
  const r = Math.abs(realized);
  const diff = r - p; // positivo significa realizado maior que previsto
  const pct = p > 0 ? (diff / p) * 100 : 0;

  // Para despesa: gastar mais que o previsto é desfavorável (estouro)
  // Para receita/reembolso: receber mais que o previsto é favorável (superávit)
  const isFavorable = type === 'despesa' ? diff <= 0 : diff >= 0;

  return {
    diff,
    percentage: pct,
    isFavorable,
    isEqual: Math.abs(diff) < 0.01,
    statusText: type === 'despesa' 
      ? (diff > 0.01 ? 'Estouro orçamentário' : diff < -0.01 ? 'Economia realizada' : '100% no teto')
      : (diff > 0.01 ? 'Superávit acima da meta' : diff < -0.01 ? 'Abaixo do previsto' : '100% atingido')
  };
}

/**
 * Propagate recurring expenses to a specific Year-Month string (e.g. "2026-11")
 */
export function generateRecurringTransactions(
  recurringList: RecurringExpense[],
  targetYearMonth: string // e.g. "2026-11"
): Transaction[] {
  const result: Transaction[] = [];

  recurringList
    .filter(r => r.isActive)
    .forEach(r => {
      const frequency = r.frequency || 'mensal';
      const baseAmount = r.amountRealized !== undefined ? r.amountRealized : r.amountPlanned || r.amount;
      const signedAmount = r.type === 'despesa' ? -Math.abs(baseAmount) : Math.abs(baseAmount);
      const plannedAbs = Math.abs(r.amountPlanned || r.amount);
      const realizedAbs = r.amountRealized !== undefined ? Math.abs(r.amountRealized) : undefined;

      if (frequency === 'semanal') {
        // Gera 4 ocorrências semanais (dias 7, 14, 21, 28)
        [7, 14, 21, 28].forEach((d, idx) => {
          const dayPad = String(d).padStart(2, '0');
          result.push({
            id: `gen-${r.id}-${targetYearMonth}-w${idx + 1}`,
            date: `${targetYearMonth}-${dayPad}`,
            description: `${r.description} (Semana ${idx + 1})`,
            amount: r.type === 'despesa' ? -(Math.abs(signedAmount) / 4) : Math.abs(signedAmount) / 4,
            amountPlanned: plannedAbs / 4,
            amountRealized: realizedAbs ? realizedAbs / 4 : undefined,
            type: r.type,
            jar: r.jar,
            account: r.account,
            costCenter: r.costCenter,
            status: 'agendado',
            isRecurring: true,
            recurringId: r.id,
            category: r.category,
          });
        });
      } else if (frequency === 'quinzenal') {
        // Gera 2 ocorrências quinzenais (dias 5 e 20)
        const d1 = r.dayOfMonth || 5;
        const d2 = Math.min(28, d1 + 15);
        [d1, d2].forEach((d, idx) => {
          const dayPad = String(d).padStart(2, '0');
          result.push({
            id: `gen-${r.id}-${targetYearMonth}-q${idx + 1}`,
            date: `${targetYearMonth}-${dayPad}`,
            description: `${r.description} (${idx === 0 ? '1ª Quinzena' : '2ª Quinzena'})`,
            amount: r.type === 'despesa' ? -(Math.abs(signedAmount) / 2) : Math.abs(signedAmount) / 2,
            amountPlanned: plannedAbs / 2,
            amountRealized: realizedAbs ? realizedAbs / 2 : undefined,
            type: r.type,
            jar: r.jar,
            account: r.account,
            costCenter: r.costCenter,
            status: 'agendado',
            isRecurring: true,
            recurringId: r.id,
            category: r.category,
          });
        });
      } else {
        // Mensal ou Diária consolidada
        const day = r.dayOfMonth || 10;
        const dayPad = String(Math.min(28, Math.max(1, day))).padStart(2, '0');
        result.push({
          id: `gen-${r.id}-${targetYearMonth}`,
          date: `${targetYearMonth}-${dayPad}`,
          description: r.description,
          amount: signedAmount,
          amountPlanned: plannedAbs,
          amountRealized: realizedAbs,
          type: r.type,
          jar: r.jar,
          account: r.account,
          costCenter: r.costCenter,
          status: 'agendado',
          isRecurring: true,
          recurringId: r.id,
          category: r.category,
        });
      }
    });

  return result;
}
