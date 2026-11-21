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
  usePjProfitInPf: boolean = true,
  customIncomeBase?: number,
  customPercentages?: Partial<Record<JarType, number>>
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
  const realizedIncomeBase = usePjProfitInPf && pjNetProfit > 0 
    ? cltIncome + pjNetProfit 
    : cltIncome;
  const effectiveIncomeBase =
    typeof customIncomeBase === 'number' && Number.isFinite(customIncomeBase) && customIncomeBase >= 0
      ? customIncomeBase
      : realizedIncomeBase;

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
    const customPct = customPercentages?.[key];
    const effectivePct =
      typeof customPct === 'number' && Number.isFinite(customPct) && customPct >= 0
        ? customPct / 100
        : def.pct;
    const budget = effectiveIncomeBase * effectivePct;
    const remaining = budget - spent;
    const usageRatio = budget > 0 ? (spent / budget) * 100 : 0;
    const isOver = spent > budget;

    totalSpentPF += spent;

    jars[key] = {
      id: key,
      name: def.name,
      shortName: def.shortName,
      desc: def.desc,
      pct: effectivePct,
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

export interface MonthlyNetWorthPoint {
  month: string; // YYYY-MM
  pfBalance: number;
  meiBalance: number;
  goalsBalance: number;
  totalNetWorth?: number;
}

export interface ConsolidatedNetWorthBestMonth {
  month: string;
  deltaBRL: number;
  deltaPct: number;
  totalNetWorth: number;
}

export interface ConsolidatedNetWorthKPIs {
  currentNetWorth: number;
  breakdown: {
    pf: number;
    mei: number;
    goals: number;
  };
  breakdownWeights: {
    pfPct: number;
    meiPct: number;
    goalsPct: number;
  };
  periodGrowthBRL: number;
  periodGrowthPct: number;
  monthlyAvgEvolutionBRL: number;
  isPositive: boolean;
  analyzedMonths: number;
  monthsCount: number;
  intervalsCount: number;
  bestMonth: ConsolidatedNetWorthBestMonth | null;
}

function roundNetWorthCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateConsolidatedNetWorthKPIs(
  monthlySeries: MonthlyNetWorthPoint[]
): ConsolidatedNetWorthKPIs {
  if (!Array.isArray(monthlySeries) || monthlySeries.length === 0) {
    return {
      currentNetWorth: 0,
      breakdown: { pf: 0, mei: 0, goals: 0 },
      breakdownWeights: { pfPct: 0, meiPct: 0, goalsPct: 0 },
      periodGrowthBRL: 0,
      periodGrowthPct: 0,
      monthlyAvgEvolutionBRL: 0,
      isPositive: true,
      analyzedMonths: 0,
      monthsCount: 0,
      intervalsCount: 1,
      bestMonth: null,
    };
  }

  const sortedSeries = [...monthlySeries].sort((a, b) => a.month.localeCompare(b.month));

  const normalized = sortedSeries.map(item => {
    const rawPf = Number(item.pfBalance);
    const rawMei = Number(item.meiBalance);
    const rawGoals = Number(item.goalsBalance);
    const pf = Number.isFinite(rawPf) ? roundNetWorthCurrency(rawPf) : 0;
    const mei = Number.isFinite(rawMei) ? roundNetWorthCurrency(rawMei) : 0;
    const goals = Number.isFinite(rawGoals) ? roundNetWorthCurrency(rawGoals) : 0;
    const rawExplicitTotal = item.totalNetWorth !== undefined ? Number(item.totalNetWorth) : NaN;
    const total = Number.isFinite(rawExplicitTotal)
      ? roundNetWorthCurrency(rawExplicitTotal)
      : roundNetWorthCurrency(pf + mei + goals);
    return {
      month: item.month,
      pf,
      mei,
      goals,
      total,
    };
  });

  const firstMonth = normalized[0];
  const lastMonth = normalized[normalized.length - 1];

  const currentNetWorth = lastMonth.total;
  const breakdown = {
    pf: lastMonth.pf,
    mei: lastMonth.mei,
    goals: lastMonth.goals,
  };

  const posPf = Math.max(0, breakdown.pf);
  const posMei = Math.max(0, breakdown.mei);
  const posGoals = Math.max(0, breakdown.goals);
  const positiveSum = posPf + posMei + posGoals;

  const breakdownWeights =
    positiveSum > 0
      ? {
          pfPct: roundNetWorthCurrency((posPf / positiveSum) * 100),
          meiPct: roundNetWorthCurrency((posMei / positiveSum) * 100),
          goalsPct: roundNetWorthCurrency((posGoals / positiveSum) * 100),
        }
      : { pfPct: 0, meiPct: 0, goalsPct: 0 };

  const periodGrowthBRL =
    normalized.length > 1
      ? roundNetWorthCurrency(lastMonth.total - firstMonth.total)
      : 0;

  let rawGrowthPct = 0;
  if (normalized.length > 1) {
    if (firstMonth.total !== 0) {
      rawGrowthPct = (periodGrowthBRL / Math.abs(firstMonth.total)) * 100;
    } else {
      rawGrowthPct = lastMonth.total > 0 ? 100 : lastMonth.total < 0 ? -100 : 0;
    }
  }
  const periodGrowthPct = Number.isFinite(rawGrowthPct) ? roundNetWorthCurrency(rawGrowthPct) : 0;

  const intervalsCount = Math.max(1, normalized.length - 1);
  const monthlyAvgEvolutionBRL = roundNetWorthCurrency(periodGrowthBRL / intervalsCount);

  let bestMonth: ConsolidatedNetWorthBestMonth | null = null;
  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const curr = normalized[i];
    const deltaBRL = roundNetWorthCurrency(curr.total - prev.total);
    if (deltaBRL > 0 && (!bestMonth || deltaBRL > bestMonth.deltaBRL)) {
      const deltaPct =
        prev.total > 0
          ? roundNetWorthCurrency((deltaBRL / prev.total) * 100)
          : prev.total === 0
            ? 100
            : roundNetWorthCurrency((deltaBRL / Math.abs(prev.total)) * 100);
      bestMonth = {
        month: curr.month,
        deltaBRL,
        deltaPct,
        totalNetWorth: curr.total,
      };
    }
  }

  return {
    currentNetWorth,
    breakdown,
    breakdownWeights,
    periodGrowthBRL,
    periodGrowthPct,
    monthlyAvgEvolutionBRL,
    isPositive: periodGrowthBRL >= 0,
    analyzedMonths: normalized.length,
    monthsCount: normalized.length,
    intervalsCount,
    bestMonth,
  };
}

export interface NetWorthTransactionInput {
  date: string;
  amount: number;
  type: 'receita' | 'despesa' | 'reembolso' | 'income' | 'expense' | string;
  jar?: string;
  costCenter?: string;
  account?: string;
  scope?: 'PF' | 'PJ' | 'MEI' | string;
  category?: string;
  description?: string;
}

export interface NetWorthGoalInput {
  id?: string;
  current?: number;
  currentAmount?: number;
  monthlyDeposit?: number;
  startDate?: string;
  createdAt?: string;
  contributionsHistory?: Array<{
    id?: string;
    date: string;
    amount: number;
  }>;
}

function shiftMonthKeyYYYYMM(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr) || 2026;
  const monthIdx = (Number(mStr) || 1) - 1;
  const shifted = new Date(year, monthIdx + deltaMonths, 1);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const DEFAULT_HISTORICAL_WEIGHT_CURVE = [
  0.34, 0.41, 0.44, 0.50, 0.57, 0.63, 0.69, 0.76, 0.79, 0.87, 0.94, 1.0,
];

export function buildHistoricalNetWorthSeries(
  transactions: NetWorthTransactionInput[] = [],
  goals: NetWorthGoalInput[] = [],
  anchorMonthKey: string = '2026-10'
): MonthlyNetWorthPoint[] {
  const validTxs = Array.isArray(transactions) ? transactions : [];
  const validGoals = Array.isArray(goals) ? goals : [];

  if (validTxs.length === 0 && validGoals.length === 0) {
    const fallbackWeights = DEFAULT_HISTORICAL_WEIGHT_CURVE;
    return fallbackWeights.map((w, idx) => {
      const month = shiftMonthKeyYYYYMM(anchorMonthKey, idx - (fallbackWeights.length - 1));
      const pfBalance = roundNetWorthCurrency(1800 + w * 2560);
      const meiBalance = roundNetWorthCurrency(1400 + w * 6842.31);
      const goalsBalance = roundNetWorthCurrency(600 + w * 2500);
      return {
        month,
        pfBalance,
        meiBalance,
        goalsBalance,
        totalNetWorth: roundNetWorthCurrency(pfBalance + meiBalance + goalsBalance),
      };
    });
  }

  interface MonthlyFlowBucket {
    pfIncome: number;
    pfExpense: number;
    meiIncome: number;
    meiExpense: number;
    meiTransfersToPF: number;
    goalContrib: number;
  }

  const buckets = new Map<string, MonthlyFlowBucket>();
  const ensureBucket = (mk: string): MonthlyFlowBucket => {
    const existing = buckets.get(mk);
    if (existing) return existing;
    const created: MonthlyFlowBucket = {
      pfIncome: 0,
      pfExpense: 0,
      meiIncome: 0,
      meiExpense: 0,
      meiTransfersToPF: 0,
      goalContrib: 0,
    };
    buckets.set(mk, created);
    return created;
  };

  for (const tx of validTxs) {
    if (!tx.date || tx.date.length < 7) continue;
    const monthKey = tx.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const absAmount = Number.isFinite(Number(tx.amount)) ? Math.abs(Number(tx.amount)) : 0;
    const bucket = ensureBucket(monthKey);
    const descLower = (tx.description || '').toLowerCase();
    const catLower = (tx.category || '').toLowerCase();
    const isMeiScope =
      tx.scope === 'PJ' ||
      tx.scope === 'MEI' ||
      tx.jar === 'PJ_EXCLUIDO' ||
      tx.costCenter === 'PJ' ||
      tx.account === 'Inter PJ';
    const isIncome =
      tx.type === 'receita' ||
      tx.type === 'reembolso' ||
      tx.type === 'income';
    const isTransferToPf =
      isMeiScope &&
      !isIncome &&
      (descLower.includes('pró-labore') ||
        descLower.includes('pro-labore') ||
        descLower.includes('transferencia para pf') ||
        descLower.includes('transferência para pf') ||
        catLower.includes('pró-labore') ||
        catLower.includes('transferência'));

    if (isMeiScope) {
      if (isIncome) {
        bucket.meiIncome = roundNetWorthCurrency(bucket.meiIncome + absAmount);
      } else if (isTransferToPf) {
        bucket.meiTransfersToPF = roundNetWorthCurrency(bucket.meiTransfersToPF + absAmount);
      } else {
        bucket.meiExpense = roundNetWorthCurrency(bucket.meiExpense + absAmount);
      }
    } else {
      if (isIncome) {
        bucket.pfIncome = roundNetWorthCurrency(bucket.pfIncome + absAmount);
      } else {
        bucket.pfExpense = roundNetWorthCurrency(bucket.pfExpense + absAmount);
      }
    }
  }

  let totalCurrentGoals = 0;
  let totalLoggedGoalContribs = 0;

  for (const goal of validGoals) {
    const rawCurrent = goal.currentAmount ?? goal.current ?? 0;
    const currentVal = Number.isFinite(Number(rawCurrent)) ? Math.max(0, Number(rawCurrent)) : 0;
    totalCurrentGoals = roundNetWorthCurrency(totalCurrentGoals + currentVal);

    if (Array.isArray(goal.contributionsHistory) && goal.contributionsHistory.length > 0) {
      for (const contrib of goal.contributionsHistory) {
        if (!contrib.date || contrib.date.length < 7) continue;
        const monthKey = contrib.date.slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
        const amt = Number.isFinite(Number(contrib.amount)) ? Math.max(0, Number(contrib.amount)) : 0;
        const bucket = ensureBucket(monthKey);
        bucket.goalContrib = roundNetWorthCurrency(bucket.goalContrib + amt);
        totalLoggedGoalContribs = roundNetWorthCurrency(totalLoggedGoalContribs + amt);
      }
    } else if (currentVal > 0 && (goal.createdAt || goal.startDate)) {
      const refDate = goal.createdAt || goal.startDate || '';
      const monthKey = refDate.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        const bucket = ensureBucket(monthKey);
        bucket.goalContrib = roundNetWorthCurrency(bucket.goalContrib + currentVal);
        totalLoggedGoalContribs = roundNetWorthCurrency(totalLoggedGoalContribs + currentVal);
      }
    }
  }

  const distinctMonths = Array.from(buckets.keys()).sort();
  if (distinctMonths.length === 0) {
    // Goals exist with balances but no dated transactions/contributions
    return DEFAULT_HISTORICAL_WEIGHT_CURVE.map((w, idx) => {
      const month = shiftMonthKeyYYYYMM(
        anchorMonthKey,
        idx - (DEFAULT_HISTORICAL_WEIGHT_CURVE.length - 1)
      );
      const goalsBalance = roundNetWorthCurrency(totalCurrentGoals * w);
      return {
        month,
        pfBalance: 0,
        meiBalance: 0,
        goalsBalance,
        totalNetWorth: goalsBalance,
      };
    });
  }

  // Compute cumulative real series across all distinct real months
  const unloggedGoalsBase = roundNetWorthCurrency(totalCurrentGoals - totalLoggedGoalContribs);
  let accPf = 0;
  let accMei = 0;
  let accGoals = 0;

  const realSeries: MonthlyNetWorthPoint[] = distinctMonths.map((mk, idx) => {
    const b = buckets.get(mk)!;
    accPf = roundNetWorthCurrency(accPf + (b.pfIncome - b.pfExpense));
    accMei = roundNetWorthCurrency(accMei + (b.meiIncome - b.meiExpense - b.meiTransfersToPF));
    accGoals = roundNetWorthCurrency(
      Math.max(0, accGoals + b.goalContrib + (idx === 0 ? unloggedGoalsBase : 0))
    );
    const finalGoals = idx === distinctMonths.length - 1 ? roundNetWorthCurrency(totalCurrentGoals) : accGoals;
    return {
      month: mk,
      pfBalance: accPf,
      meiBalance: accMei,
      goalsBalance: finalGoals,
      totalNetWorth: roundNetWorthCurrency(accPf + accMei + finalGoals),
    };
  });

  // If fewer than 3 distinct months exist, prepend realistic historical progression
  // leading seamlessly up to the exact real current month(s).
  if (realSeries.length < 3) {
    const targetTotalMonths = 12;
    const backfillCount = targetTotalMonths - realSeries.length;
    const firstReal = realSeries[0];
    const earliestMonth = firstReal.month;

    const backfilled: MonthlyNetWorthPoint[] = [];
    for (let i = 0; i < backfillCount; i++) {
      const offset = i - backfillCount;
      const mk = shiftMonthKeyYYYYMM(earliestMonth, offset);
      const progress = (i + 1) / (backfillCount + 1);
      // Realistic stepped organic factor (smooth growth curve with mild realistic variance)
      const weight = DEFAULT_HISTORICAL_WEIGHT_CURVE[Math.min(i, DEFAULT_HISTORICAL_WEIGHT_CURVE.length - 1)] * 0.92;
      const blend = Math.min(0.95, Math.max(0.25, (progress * 0.55) + (weight * 0.45)));

      const pfBalance =
        firstReal.pfBalance >= 0
          ? roundNetWorthCurrency(firstReal.pfBalance * blend)
          : roundNetWorthCurrency(firstReal.pfBalance * (1 - blend * 0.4));
      const meiBalance =
        firstReal.meiBalance >= 0
          ? roundNetWorthCurrency(firstReal.meiBalance * blend)
          : roundNetWorthCurrency(firstReal.meiBalance * (1 - blend * 0.4));
      const goalsBalance = roundNetWorthCurrency(Math.max(0, firstReal.goalsBalance * blend));

      backfilled.push({
        month: mk,
        pfBalance,
        meiBalance,
        goalsBalance,
        totalNetWorth: roundNetWorthCurrency(pfBalance + meiBalance + goalsBalance),
      });
    }

    return [...backfilled, ...realSeries];
  }

  return realSeries;
}

// ============================================================================
// PJ / MEI STRATEGIC FISCAL HELPERS
// ============================================================================

export const MEI_ANNUAL_CAP_BRL = 81000;
export const FATOR_R_THRESHOLD_PCT = 28;
export const INSS_PRO_LABORE_RATE = 0.11;

export type FatorRStatus = 'ANEXO_III_OTIMIZADO' | 'ATENCAO_ANEXO_V';
export type MEICapAlertLevel = 'SAFE' | 'WARNING_80' | 'EXCEEDED_100';

export interface PJFiscalMetricsInput {
  grossRevenue12m: number;
  monthlyGrossRevenue: number;
  monthlyExpenses: number;
  payroll12m: number;
  dasReserveBalance: number;
  monthlyDASProvision?: number;
  targetProLabore?: number;
}

export interface PJFiscalMetricsResult {
  grossRevenue12m: number;
  monthlyGrossRevenue: number;
  monthlyExpenses: number;
  payroll12m: number;
  dasReserveBalance: number;
  monthlyDASProvision: number;
  fatorRPercent: number;
  fatorRProgressPct: number;
  fatorRStatus: FatorRStatus;
  fatorRStatusLabel: string;
  isAnexoIIIOptimized: boolean;
  payrollNeededFor28Pct12m: number;
  payrollGap12m: number;
  meiAnnualCapBRL: number;
  meiCapUsagePct: number;
  meiCapBarPct: number;
  meiRemainingCapBRL: number;
  meiCapAlertLevel: MEICapAlertLevel;
  meiCapAlertLabel: string;
  netMonthlyProfitBRL: number;
  proLaboreGrossBRL: number;
  proLaboreINSSBRL: number;
  proLaboreNetBRL: number;
  exemptProfitDistributionBRL: number;
  dasMonthsCovered: number;
  dasReserveDeficitBRL: number;
  isDasReserveHealthy: boolean;
}

function roundFinance2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Computes strategic PJ/MEI fiscal KPIs:
 * - Fator R (12m payroll / 12m gross revenue) & Anexo III (>= 28%) optimization check
 * - MEI R$ 81.000,00 annual ceiling progress & 80% / 100% alert badges
 * - Monthly withdrawal split: Pró-Labore (11% INSS) vs. Distribuição de Lucros Isentos
 * - Virtual DAS obligation reserve coverage
 */
export function calculatePJFiscalMetrics(
  input: PJFiscalMetricsInput
): PJFiscalMetricsResult {
  const grossRevenue12m = Math.max(0, Number.isFinite(input.grossRevenue12m) ? input.grossRevenue12m : 0);
  const monthlyGrossRevenue = Math.max(0, Number.isFinite(input.monthlyGrossRevenue) ? input.monthlyGrossRevenue : 0);
  const monthlyExpenses = Math.max(0, Number.isFinite(input.monthlyExpenses) ? input.monthlyExpenses : 0);
  const payroll12m = Math.max(0, Number.isFinite(input.payroll12m) ? input.payroll12m : 0);
  const dasReserveBalance = Math.max(0, Number.isFinite(input.dasReserveBalance) ? input.dasReserveBalance : 0);
  const monthlyDASProvision = Math.max(
    0,
    input.monthlyDASProvision !== undefined && Number.isFinite(input.monthlyDASProvision)
      ? input.monthlyDASProvision
      : 75.9
  );

  // 1. Fator R (12M)
  const fatorRPercent = roundFinance2((payroll12m / Math.max(1, grossRevenue12m)) * 100);
  const isAnexoIIIOptimized = grossRevenue12m > 0 ? fatorRPercent >= FATOR_R_THRESHOLD_PCT : false;
  const fatorRStatus: FatorRStatus = isAnexoIIIOptimized
    ? 'ANEXO_III_OTIMIZADO'
    : 'ATENCAO_ANEXO_V';
  const fatorRStatusLabel = isAnexoIIIOptimized
    ? 'Anexo III Otimizado (≥ 28%)'
    : 'Atenção: Abaixo de 28% (Anexo V)';
  const fatorRProgressPct = roundFinance2(Math.min(100, Math.max(0, fatorRPercent)));
  const payrollNeededFor28Pct12m = roundFinance2(grossRevenue12m * 0.28);
  const payrollGap12m = roundFinance2(Math.max(0, payrollNeededFor28Pct12m - payroll12m));

  // 2. MEI Annual Cap (R$ 81.000,00)
  const meiCapUsagePct = roundFinance2((grossRevenue12m / MEI_ANNUAL_CAP_BRL) * 100);
  const meiCapBarPct = roundFinance2(Math.min(100, Math.max(0, meiCapUsagePct)));
  const meiRemainingCapBRL = roundFinance2(Math.max(0, MEI_ANNUAL_CAP_BRL - grossRevenue12m));

  let meiCapAlertLevel: MEICapAlertLevel = 'SAFE';
  let meiCapAlertLabel = 'Dentro do Teto MEI';
  if (meiCapUsagePct >= 100) {
    meiCapAlertLevel = 'EXCEEDED_100';
    meiCapAlertLabel = 'Teto MEI Excedido (≥ 100%)';
  } else if (meiCapUsagePct >= 80) {
    meiCapAlertLevel = 'WARNING_80';
    meiCapAlertLabel = 'Atenção: ≥ 80% do Teto MEI';
  }

  // 3. Withdrawal Split (Pró-Labore vs Lucro Isento)
  const netMonthlyProfitBRL = roundFinance2(
    Math.max(0, monthlyGrossRevenue - monthlyExpenses - monthlyDASProvision)
  );

  const defaultProLabore =
    netMonthlyProfitBRL > 0
      ? Math.min(netMonthlyProfitBRL, roundFinance2(monthlyGrossRevenue * 0.28))
      : 0;
  const requestedProLabore =
    input.targetProLabore !== undefined && Number.isFinite(input.targetProLabore)
      ? Math.max(0, input.targetProLabore)
      : defaultProLabore;

  const proLaboreGrossBRL = roundFinance2(Math.min(netMonthlyProfitBRL, requestedProLabore));
  const proLaboreINSSBRL = roundFinance2(proLaboreGrossBRL * INSS_PRO_LABORE_RATE);
  const proLaboreNetBRL = roundFinance2(Math.max(0, proLaboreGrossBRL - proLaboreINSSBRL));
  const exemptProfitDistributionBRL = roundFinance2(
    Math.max(0, netMonthlyProfitBRL - proLaboreGrossBRL)
  );

  // 4. Virtual DAS Reserve Status
  const dasMonthsCovered =
    monthlyDASProvision > 0
      ? roundFinance2(dasReserveBalance / monthlyDASProvision)
      : dasReserveBalance > 0
        ? 12
        : 0;
  const dasReserveDeficitBRL = roundFinance2(Math.max(0, monthlyDASProvision - dasReserveBalance));
  const isDasReserveHealthy = dasReserveBalance >= monthlyDASProvision;

  return {
    grossRevenue12m: roundFinance2(grossRevenue12m),
    monthlyGrossRevenue: roundFinance2(monthlyGrossRevenue),
    monthlyExpenses: roundFinance2(monthlyExpenses),
    payroll12m: roundFinance2(payroll12m),
    dasReserveBalance: roundFinance2(dasReserveBalance),
    monthlyDASProvision: roundFinance2(monthlyDASProvision),
    fatorRPercent,
    fatorRProgressPct,
    fatorRStatus,
    fatorRStatusLabel,
    isAnexoIIIOptimized,
    payrollNeededFor28Pct12m,
    payrollGap12m,
    meiAnnualCapBRL: MEI_ANNUAL_CAP_BRL,
    meiCapUsagePct,
    meiCapBarPct,
    meiRemainingCapBRL,
    meiCapAlertLevel,
    meiCapAlertLabel,
    netMonthlyProfitBRL,
    proLaboreGrossBRL,
    proLaboreINSSBRL,
    proLaboreNetBRL,
    exemptProfitDistributionBRL,
    dasMonthsCovered,
    dasReserveDeficitBRL,
    isDasReserveHealthy,
  };
}

// ============================================================================
// HISTORY-BASED SMART CATEGORY SUGGESTION ENGINE
// ============================================================================

const PT_BR_STOPWORDS = new Set([
  'de', 'da', 'do', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'sem',
  'o', 'a', 'os', 'as', 'e',
  'um', 'uma', 'uns', 'umas',
  'ao', 'aos', 'a', 'as',
]);

export interface SuggestCategoryInput {
  description: string;
  type: 'receita' | 'despesa' | 'reembolso' | 'income' | 'expense' | string;
  scope?: 'PF' | 'PJ' | 'MEI' | string;
  transactions: Array<
    Pick<Transaction, 'description' | 'category' | 'type' | 'costCenter' | 'jar' | 'date'> & {
      scope?: string;
    }
  >;
  availableCategories: string[];
}

export interface CategorySuggestionResult {
  category: string;
  confidence: 'high' | 'medium';
  matchCount: number;
}

export function normalizePtBrText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeMeaningfulPtBr(normalized: string): string[] {
  if (!normalized) return [];
  return normalized
    .split(' ')
    .filter(token => token.length >= 2 && !PT_BR_STOPWORDS.has(token));
}

function normalizeTransactionKind(t: string): 'income' | 'expense' | 'refund' {
  const lower = (t || '').toLowerCase();
  if (lower === 'receita' || lower === 'income') return 'income';
  if (lower === 'reembolso' || lower === 'refund') return 'refund';
  return 'expense';
}

function normalizeScopeKind(scope?: string, costCenter?: string, jar?: string): 'PJ' | 'PF' {
  const s = (scope || '').toUpperCase();
  if (s === 'PJ' || s === 'MEI') return 'PJ';
  if (costCenter === 'PJ' || jar === 'PJ_EXCLUIDO') return 'PJ';
  return 'PF';
}

/**
 * Analyzes saved transactions to suggest the best matching category as the user types.
 */
export function suggestCategoryFromHistory(
  input: SuggestCategoryInput
): CategorySuggestionResult | null {
  const rawDesc = (input.description || '').trim();
  if (rawDesc.length < 3) return null;
  if (!Array.isArray(input.transactions) || input.transactions.length === 0) return null;
  if (!Array.isArray(input.availableCategories) || input.availableCategories.length === 0) return null;

  const inputNorm = normalizePtBrText(rawDesc);
  if (inputNorm.length < 3) return null;

  const inputTokens = tokenizeMeaningfulPtBr(inputNorm);
  const inputCompact = inputTokens.join(' ') || inputNorm;
  if (inputCompact.length < 2) return null;

  const targetKind = normalizeTransactionKind(input.type);
  const targetScope = input.scope ? normalizeScopeKind(input.scope, input.scope) : null;

  // Map normalized available categories -> canonical category name
  const availableMap = new Map<string, string>();
  for (const cat of input.availableCategories) {
    if (typeof cat === 'string' && cat.trim()) {
      availableMap.set(normalizePtBrText(cat), cat);
    }
  }

  interface CategoryCandidateScore {
    category: string;
    totalScore: number;
    maxSingleScore: number;
    matchCount: number;
    latestDate: string;
  }

  const candidates = new Map<string, CategoryCandidateScore>();

  for (const tx of input.transactions) {
    const txDesc = (tx.description || '').trim();
    if (txDesc.length < 3) continue;

    const txCatRaw = (tx.category || '').trim();
    if (!txCatRaw || txCatRaw.toLowerCase() === 'geral') continue;

    // Must match one of availableCategories
    const canonicalCat = availableMap.get(normalizePtBrText(txCatRaw));
    if (!canonicalCat) continue;

    // Filter by matching transaction kind
    const txKind = normalizeTransactionKind(tx.type);
    if (txKind !== targetKind) continue;

    // Filter by matching scope if provided
    if (targetScope) {
      const txScope = normalizeScopeKind(tx.scope, tx.costCenter, tx.jar);
      if (txScope !== targetScope) continue;
    }

    const histNorm = normalizePtBrText(txDesc);
    if (histNorm.length < 3) continue;
    const histTokens = tokenizeMeaningfulPtBr(histNorm);
    const histCompact = histTokens.join(' ') || histNorm;

    let score = 0;

    // 1. Exact or strong substring match
    if (histNorm === inputNorm || histCompact === inputCompact) {
      score += 12;
    } else if (
      histNorm.includes(inputNorm) ||
      inputNorm.includes(histNorm) ||
      (inputCompact.length >= 3 && (histCompact.includes(inputCompact) || inputCompact.includes(histCompact)))
    ) {
      score += 6;
    }

    // 2. Shared meaningful tokens & prefix overlap
    if (inputTokens.length > 0 && histTokens.length > 0) {
      let exactShared = 0;
      let prefixShared = 0;
      const histSet = new Set(histTokens);

      for (const tok of inputTokens) {
        if (histSet.has(tok)) {
          exactShared += 1;
        } else if (
          tok.length >= 3 &&
          histTokens.some(ht => ht.startsWith(tok) || tok.startsWith(ht))
        ) {
          prefixShared += 1;
        }
      }

      if (exactShared > 0 || prefixShared > 0) {
        const unionSize = new Set([...inputTokens, ...histTokens]).size;
        const jaccard = (exactShared + prefixShared * 0.6) / Math.max(1, unionSize);
        score += exactShared * 3.5 + prefixShared * 2 + jaccard * 4;
      }
    }

    if (score <= 0) continue;

    const existing = candidates.get(canonicalCat);
    const txDate = tx.date || '0000-00-00';
    if (!existing) {
      candidates.set(canonicalCat, {
        category: canonicalCat,
        totalScore: score,
        maxSingleScore: score,
        matchCount: 1,
        latestDate: txDate,
      });
    } else {
      existing.totalScore += score;
      existing.maxSingleScore = Math.max(existing.maxSingleScore, score);
      existing.matchCount += 1;
      if (txDate > existing.latestDate) {
        existing.latestDate = txDate;
      }
    }
  }

  if (candidates.size === 0) return null;

  const ranked = Array.from(candidates.values()).sort((a, b) => {
    const scoreDiff = b.totalScore - a.totalScore;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return b.latestDate.localeCompare(a.latestDate);
  });

  const best = ranked[0];
  const confidence: 'high' | 'medium' =
    best.matchCount >= 2 || best.maxSingleScore >= 7 ? 'high' : 'medium';

  return {
    category: best.category,
    confidence,
    matchCount: best.matchCount,
  };
}

// ============================================================================
// EXPENSE VARIABILITY (SIGMA STD DEV) & MONTH-END RUN-RATE ENGINE
// ============================================================================

export type VariabilityClassification = 'PREVISIVEL' | 'VOLATIL';

export interface CategoryExpenseVariabilityItem {
  category: string;
  meanBRL: number;
  stdDevBRL: number;
  cv: number; // Coefficient of Variation = sigma / mu
  cvPercent: number;
  classification: VariabilityClassification;
  badgeTone: 'emerald' | 'amber' | 'rose';
  classificationLabel: string;
  currentMonthSpentBRL: number;
  projectedRunRateBRL: number;
  monthsActiveCount: number;
  monthlyTotals: Record<string, number>;
}

export interface ExpenseVariabilityReport {
  currentMonthKey: string;
  currentDay: number;
  daysInMonth: number;
  monthsAnalyzedCount: number;
  analyzedMonthKeys: string[];
  totalSpentCurrentMonthBRL: number;
  totalProjectedRunRateBRL: number;
  predictableCount: number;
  volatileCount: number;
  categories: CategoryExpenseVariabilityItem[];
}

/**
 * Groups PF expenses by category across available months, computes sample mean (μ),
 * sample standard deviation (σ), coefficient of variation (CV = σ / μ),
 * predictable vs volatile ranking, and current-month run-rate projection.
 */
export function calculateCategoryExpenseVariability(
  transactions: Transaction[],
  referenceDateStr?: string
): ExpenseVariabilityReport {
  const pfExpenses = (Array.isArray(transactions) ? transactions : []).filter(
    t =>
      t.type === 'despesa' &&
      t.costCenter !== 'PJ' &&
      t.jar !== 'PJ_EXCLUIDO' &&
      t.date &&
      /^\d{4}-\d{2}-\d{2}/.test(t.date)
  );

  // Determine current month & elapsed day
  const sortedDates = pfExpenses.map(t => t.date.slice(0, 10)).sort();
  const inferredRefDate =
    referenceDateStr && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateStr)
      ? referenceDateStr
      : sortedDates[sortedDates.length - 1] || new Date().toISOString().slice(0, 10);

  const currentMonthKey = inferredRefDate.slice(0, 7);
  const refYear = Number(inferredRefDate.slice(0, 4)) || 2026;
  const refMonth = Number(inferredRefDate.slice(5, 7)) || 10;
  const refDayRaw = Number(inferredRefDate.slice(8, 10)) || 15;
  const daysInMonth = new Date(refYear, refMonth, 0).getDate() || 30;
  const currentDay = Math.max(1, Math.min(daysInMonth, refDayRaw));

  const distinctMonthsSet = new Set<string>();
  const categoryMonthMap = new Map<string, Map<string, number>>();

  for (const tx of pfExpenses) {
    const mk = tx.date.slice(0, 7);
    const cat = (tx.category || 'Geral').trim() || 'Geral';
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;

    distinctMonthsSet.add(mk);
    let mMap = categoryMonthMap.get(cat);
    if (!mMap) {
      mMap = new Map<string, number>();
      categoryMonthMap.set(cat, mMap);
    }
    mMap.set(mk, roundFinance2((mMap.get(mk) || 0) + amt));
  }

  const analyzedMonthKeys = Array.from(distinctMonthsSet).sort();
  const monthsAnalyzedCount = analyzedMonthKeys.length;

  const items: CategoryExpenseVariabilityItem[] = [];
  let totalSpentCurrentMonthBRL = 0;
  let totalProjectedRunRateBRL = 0;

  for (const [category, mMap] of categoryMonthMap.entries()) {
    const monthlyTotals: Record<string, number> = {};
    const values: number[] = [];

    for (const mk of analyzedMonthKeys) {
      const val = roundFinance2(mMap.get(mk) || 0);
      monthlyTotals[mk] = val;
      values.push(val);
    }

    const n = values.length;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const meanBRL = n > 0 ? roundFinance2(sum / n) : 0;

    let stdDevBRL = 0;
    if (n > 1) {
      const squaredDiffSum = values.reduce((acc, v) => acc + Math.pow(v - meanBRL, 2), 0);
      stdDevBRL = roundFinance2(Math.sqrt(squaredDiffSum / (n - 1)));
    }

    const cv = meanBRL > 0 ? Math.round((stdDevBRL / meanBRL) * 10000) / 10000 : 0;
    const cvPercent = roundFinance2(cv * 100);

    const isVolatile = cv >= 0.25;
    const classification: VariabilityClassification = isVolatile ? 'VOLATIL' : 'PREVISIVEL';
    const badgeTone: 'emerald' | 'amber' | 'rose' = !isVolatile
      ? 'emerald'
      : cv >= 0.6
        ? 'rose'
        : 'amber';
    const classificationLabel = !isVolatile ? 'Previsível' : 'Volátil';

    const currentMonthSpentBRL = roundFinance2(mMap.get(currentMonthKey) || 0);
    const projectedRunRateBRL = roundFinance2((currentMonthSpentBRL / currentDay) * daysInMonth);

    totalSpentCurrentMonthBRL = roundFinance2(totalSpentCurrentMonthBRL + currentMonthSpentBRL);
    totalProjectedRunRateBRL = roundFinance2(totalProjectedRunRateBRL + projectedRunRateBRL);

    items.push({
      category,
      meanBRL,
      stdDevBRL,
      cv,
      cvPercent,
      classification,
      badgeTone,
      classificationLabel,
      currentMonthSpentBRL,
      projectedRunRateBRL,
      monthsActiveCount: Array.from(mMap.values()).filter(v => v > 0).length,
      monthlyTotals,
    });
  }

  // Sort predictable-then-volatile OR by CV descending? Let's keep predictable vs volatile clear and sort by highest projected/mean spend or CV
  items.sort((a, b) => b.cv - a.cv || b.meanBRL - a.meanBRL);

  const predictableCount = items.filter(i => i.classification === 'PREVISIVEL').length;
  const volatileCount = items.filter(i => i.classification === 'VOLATIL').length;

  return {
    currentMonthKey,
    currentDay,
    daysInMonth,
    monthsAnalyzedCount,
    analyzedMonthKeys,
    totalSpentCurrentMonthBRL,
    totalProjectedRunRateBRL,
    predictableCount,
    volatileCount,
    categories: items,
  };
}

// ============================================================================
// DAILY EXPENSE VS AVAILABLE BALANCE SCATTER & PEARSON CORRELATION ENGINE
// ============================================================================

export type ScatterScope = 'CONSOLIDATED' | 'PF' | 'MEI';
export type SeasonPhase = 'INICIO' | 'MEIO' | 'FIM';

export interface DailyScatterPoint {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: string;
  seasonPhase: SeasonPhase;
  availableBalance: number;
  dailyExpense: number;
  txCount: number;
  topCategory: string;
}

export interface CorrelationAnalysisResult {
  points: DailyScatterPoint[];
  pearsonR: number;
  slope: number;
  intercept: number;
  avgExpenseHighBalance: number;
  avgExpenseLowBalance: number;
  isFallbackData: boolean;
  scope: ScatterScope;
}

const PT_BR_WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function isTransactionPJScope(tx: Transaction): boolean {
  return tx.costCenter === 'PJ' || tx.account === 'Inter PJ' || tx.jar === 'PJ_EXCLUIDO';
}

function matchesAnalyticsScope(tx: Transaction, scope: ScatterScope): boolean {
  if (scope === 'CONSOLIDATED') return true;
  const pj = isTransactionPJScope(tx);
  return scope === 'MEI' ? pj : !pj;
}

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalWeekdayPtBr(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return 'Dia útil';
  const local = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return PT_BR_WEEKDAYS[local.getDay()] ?? 'Dia útil';
}

function getSeasonPhaseForDay(dayOfMonth: number): SeasonPhase {
  if (dayOfMonth <= 10) return 'INICIO';
  if (dayOfMonth <= 20) return 'MEIO';
  return 'FIM';
}

function buildFallback45DayScatterPoints(
  scope: ScatterScope,
  anchorBalance: number,
  anchorDateStr?: string
): DailyScatterPoint[] {
  const baseMatch = anchorDateStr && /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorDateStr);
  const endDate = baseMatch
    ? new Date(Number(baseMatch[1]), Number(baseMatch[2]) - 1, Number(baseMatch[3]))
    : new Date(2026, 9, 31); // 31/10/2026

  const pfCategories = ['Alimentação', 'Moradia', 'Transporte', 'Lazer & Estilo', 'Saúde'];
  const meiCategories = ['Impostos PJ', 'Software & SaaS', 'Fornecedores', 'Taxas Bancárias', 'Equipamentos'];
  const allCategories = [...pfCategories, 'Impostos PJ', 'Software & SaaS'];

  const baseAnchor =
    scope === 'MEI'
      ? Math.max(2200, Math.abs(anchorBalance) > 300 ? Math.abs(anchorBalance) * 1.4 : 3800)
      : scope === 'PF'
        ? Math.max(1800, Math.abs(anchorBalance) > 300 ? Math.abs(anchorBalance) * 1.2 : 2900)
        : Math.max(3200, Math.abs(anchorBalance) > 300 ? Math.abs(anchorBalance) * 1.5 : 4900);

  const points: DailyScatterPoint[] = [];
  let running = baseAnchor;

  for (let offset = 44; offset >= 0; offset--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - offset);
    const dayOfMonth = d.getDate();
    const dateStr = formatLocalIsoDate(d);
    const seasonPhase = getSeasonPhaseForDay(dayOfMonth);
    const dayOfWeek = PT_BR_WEEKDAYS[d.getDay()] ?? 'Segunda-feira';

    // Simulate realistic payday boosts (days 5, 10, 15, 20) and seasonal cash cycles
    if (dayOfMonth === 5 || dayOfMonth === 10) {
      running += scope === 'MEI' ? 2400 : scope === 'PF' ? 2100 : 3800;
    } else if (dayOfMonth === 15 || dayOfMonth === 20) {
      running += scope === 'MEI' ? 1450 : scope === 'PF' ? 850 : 2100;
    }

    const deterministicWave = Math.sin((offset + 3) * 0.65) * 0.5 + 0.5;
    const secondaryWave = Math.cos((offset + 7) * 0.42) * 0.5 + 0.5;

    // PF spends more noticeably when balance is high (early month); MEI operational spend is flatter
    let dailyExpense: number;
    if (scope === 'PF') {
      const balanceFactor = Math.max(0.2, Math.min(1.8, running / baseAnchor));
      dailyExpense = 55 + balanceFactor * 145 + deterministicWave * 165;
      if (dayOfMonth === 22 || dayOfMonth === 25) dailyExpense += 320;
    } else if (scope === 'MEI') {
      dailyExpense = 85 + secondaryWave * 210 + (dayOfMonth === 20 ? 175 : 0);
    } else {
      const balanceFactor = Math.max(0.25, Math.min(1.8, running / baseAnchor));
      dailyExpense = 95 + balanceFactor * 160 + deterministicWave * 220;
      if (dayOfMonth === 22 || dayOfMonth === 25) dailyExpense += 360;
    }

    dailyExpense = roundFinance2(dailyExpense);
    const availableBalance = roundFinance2(Math.max(250, running));
    running = Math.max(350, running - dailyExpense * 0.72);

    const catList =
      scope === 'MEI' ? meiCategories : scope === 'PF' ? pfCategories : allCategories;
    const topCategory = catList[(dayOfMonth + offset) % catList.length];
    const txCount = 1 + ((dayOfMonth + offset) % (scope === 'CONSOLIDATED' ? 5 : 4));

    points.push({
      date: dateStr,
      dayOfMonth,
      dayOfWeek,
      seasonPhase,
      availableBalance,
      dailyExpense,
      txCount,
      topCategory,
    });
  }

  return points;
}

function computePearsonAndOLS(points: DailyScatterPoint[]): {
  pearsonR: number;
  slope: number;
  intercept: number;
  avgExpenseHighBalance: number;
  avgExpenseLowBalance: number;
} {
  const n = points.length;
  if (n === 0) {
    return {
      pearsonR: 0,
      slope: 0,
      intercept: 0,
      avgExpenseHighBalance: 0,
      avgExpenseLowBalance: 0,
    };
  }

  const meanX = points.reduce((acc, p) => acc + p.availableBalance, 0) / n;
  const meanY = points.reduce((acc, p) => acc + p.dailyExpense, 0) / n;

  if (n < 2) {
    return {
      pearsonR: 0,
      slope: 0,
      intercept: roundFinance2(meanY),
      avgExpenseHighBalance: roundFinance2(meanY),
      avgExpenseLowBalance: roundFinance2(meanY),
    };
  }

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.availableBalance - meanX;
    const dy = p.dailyExpense - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const denomR = Math.sqrt(sxx * syy);
  const rawR = denomR === 0 ? 0 : sxy / denomR;
  const pearsonR = Math.round(Math.max(-1, Math.min(1, rawR)) * 10000) / 10000;
  const slope = sxx === 0 ? 0 : Math.round((sxy / sxx) * 1000000) / 1000000;
  const intercept = roundFinance2(meanY - slope * meanX);

  // Split points by median availableBalance to compute High vs Low Balance averages
  const sortedByBal = [...points].sort((a, b) => a.availableBalance - b.availableBalance);
  const midIdx = Math.floor(sortedByBal.length / 2);
  const medianBalance =
    sortedByBal.length % 2 === 1
      ? sortedByBal[midIdx].availableBalance
      : (sortedByBal[midIdx - 1].availableBalance + sortedByBal[midIdx].availableBalance) / 2;

  const highPoints = points.filter(p => p.availableBalance >= medianBalance);
  const lowPoints = points.filter(p => p.availableBalance < medianBalance);

  const avgExpenseHighBalance =
    highPoints.length > 0
      ? roundFinance2(highPoints.reduce((acc, p) => acc + p.dailyExpense, 0) / highPoints.length)
      : roundFinance2(meanY);
  const avgExpenseLowBalance =
    lowPoints.length > 0
      ? roundFinance2(lowPoints.reduce((acc, p) => acc + p.dailyExpense, 0) / lowPoints.length)
      : roundFinance2(meanY);

  return {
    pearsonR,
    slope,
    intercept,
    avgExpenseHighBalance,
    avgExpenseLowBalance,
  };
}

/**
 * Aggregates transactions chronologically by day, computes running available balance
 * vs daily expenses, classifies seasonal phase (INICIO/MEIO/FIM), and computes
 * Pearson correlation (r) and OLS linear regression with zero-variance protection.
 */
export function buildDailyExpenseBalanceCorrelation(
  transactions: Transaction[],
  scope: ScatterScope = 'CONSOLIDATED'
): CorrelationAnalysisResult {
  const scoped = (Array.isArray(transactions) ? transactions : []).filter(
    tx =>
      tx &&
      typeof tx.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(tx.date) &&
      matchesAnalyticsScope(tx, scope)
  );

  interface DayBucket {
    inflows: number;
    expenses: number;
    expenseTxCount: number;
    catTotals: Record<string, number>;
  }

  const dayMap = new Map<string, DayBucket>();
  for (const tx of scoped) {
    const dateStr = tx.date.slice(0, 10);
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;

    let bucket = dayMap.get(dateStr);
    if (!bucket) {
      bucket = { inflows: 0, expenses: 0, expenseTxCount: 0, catTotals: {} };
      dayMap.set(dateStr, bucket);
    }

    if (tx.type === 'despesa') {
      bucket.expenses = roundFinance2(bucket.expenses + amt);
      bucket.expenseTxCount += 1;
      const cat = (tx.category || 'Geral').trim() || 'Geral';
      bucket.catTotals[cat] = roundFinance2((bucket.catTotals[cat] || 0) + amt);
    } else {
      bucket.inflows = roundFinance2(bucket.inflows + amt);
    }
  }

  const sortedDates = Array.from(dayMap.keys()).sort((a, b) => a.localeCompare(b));
  let runningBalance = 0;
  const realPoints: DailyScatterPoint[] = [];

  for (const dateStr of sortedDates) {
    const bucket = dayMap.get(dateStr)!;
    const availableBeforeExpense = roundFinance2(runningBalance + bucket.inflows);
    runningBalance = roundFinance2(availableBeforeExpense - bucket.expenses);

    if (bucket.expenses > 0) {
      const dayOfMonth = Number(dateStr.slice(8, 10)) || 1;
      let topCategory = 'Geral';
      let topCatValue = -1;
      for (const [cat, total] of Object.entries(bucket.catTotals)) {
        if (total > topCatValue) {
          topCatValue = total;
          topCategory = cat;
        }
      }

      realPoints.push({
        date: dateStr,
        dayOfMonth,
        dayOfWeek: getLocalWeekdayPtBr(dateStr),
        seasonPhase: getSeasonPhaseForDay(dayOfMonth),
        availableBalance: availableBeforeExpense,
        dailyExpense: bucket.expenses,
        txCount: bucket.expenseTxCount,
        topCategory,
      });
    }
  }

  // Fallback check: if fewer than 5 expense days exist, synthesize a 45-day dataset anchored to current balance
  let isFallbackData = false;
  let finalPoints = realPoints;
  if (realPoints.length < 5) {
    isFallbackData = true;
    finalPoints = buildFallback45DayScatterPoints(
      scope,
      runningBalance,
      sortedDates[sortedDates.length - 1]
    );
  }

  const stats = computePearsonAndOLS(finalPoints);

  return {
    points: finalPoints,
    ...stats,
    isFallbackData,
    scope,
  };
}

// ============================================================================
// ANNUAL EXPENSE CALENDAR HEATMAP (TIMEZONE-SAFE 53x7 GRID)
// ============================================================================

export type HeatmapScope = 'CONSOLIDATED' | 'PF' | 'MEI';

export interface DailyHeatmapCell {
  dateStr: string;
  date: Date;
  weekIndex: number;
  dayOfWeek: number;
  month: number;
  totalExpense: number;
  txCount: number;
  topCategory: string;
}

export interface AnnualHeatmapSummary {
  cells: DailyHeatmapCell[];
  zeroSpendDays: number;
  peakDay: DailyHeatmapCell | null;
  avgActiveDayExpense: number;
  totalYearExpense: number;
  isFallbackData: boolean;
}

/**
 * Generates every calendar day from Jan 1 to Dec 31 of selectedYear using local Date
 * constructors (no UTC shift), aggregates expenses by day & scope, and provides
 * realistic 12-month fallback baseline values when fewer than 10 expense days exist.
 */
export function buildAnnualExpenseHeatmapData(
  transactions: Transaction[],
  selectedYear: number,
  activeScope: HeatmapScope = 'CONSOLIDATED'
): AnnualHeatmapSummary {
  const safeYear =
    Number.isFinite(selectedYear) && selectedYear >= 1970 && selectedYear <= 2100
      ? Math.trunc(selectedYear)
      : new Date().getFullYear();

  const yearPrefix = `${safeYear}-`;
  const scopedExpenses = (Array.isArray(transactions) ? transactions : []).filter(
    tx =>
      tx &&
      tx.type === 'despesa' &&
      typeof tx.date === 'string' &&
      tx.date.startsWith(yearPrefix) &&
      matchesAnalyticsScope(tx, activeScope)
  );

  interface DayExpenseBucket {
    totalExpense: number;
    txCount: number;
    catTotals: Record<string, number>;
  }

  const realDayMap = new Map<string, DayExpenseBucket>();
  for (const tx of scopedExpenses) {
    const dateStr = tx.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;

    let bucket = realDayMap.get(dateStr);
    if (!bucket) {
      bucket = { totalExpense: 0, txCount: 0, catTotals: {} };
      realDayMap.set(dateStr, bucket);
    }
    bucket.totalExpense = roundFinance2(bucket.totalExpense + amt);
    bucket.txCount += 1;
    const cat = (tx.category || 'Geral').trim() || 'Geral';
    bucket.catTotals[cat] = roundFinance2((bucket.catTotals[cat] || 0) + amt);
  }

  const isFallbackData = realDayMap.size < 10;

  const pfCats = ['Alimentação', 'Transporte', 'Moradia', 'Lazer & Estilo', 'Saúde'];
  const meiCats = ['Impostos PJ', 'Software & SaaS', 'Taxas Bancárias', 'Serviços Terceiros'];
  const allCats = [...pfCats, 'Impostos PJ', 'Software & SaaS'];

  const jan1 = new Date(safeYear, 0, 1);
  const jan1Weekday = jan1.getDay(); // 0 = Dom .. 6 = Sáb

  const cells: DailyHeatmapCell[] = [];
  let dayIndex = 0;

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(safeYear, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const localDate = new Date(safeYear, month, day);
      const dateStr = `${safeYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = localDate.getDay();
      const weekIndex = Math.floor((jan1Weekday + dayIndex) / 7);

      const realBucket = realDayMap.get(dateStr);
      let totalExpense = 0;
      let txCount = 0;
      let topCategory = 'Sem gastos';

      if (realBucket) {
        totalExpense = realBucket.totalExpense;
        txCount = realBucket.txCount;
        let maxVal = -1;
        for (const [cat, val] of Object.entries(realBucket.catTotals)) {
          if (val > maxVal) {
            maxVal = val;
            topCategory = cat;
          }
        }
      } else if (isFallbackData) {
        // Synthesize realistic seasonal baseline for non-recorded months so 53x7 grid is rich
        // Keep real recorded month (if any transactions exist in that month) clean or fill other days
        const hash = ((dayIndex + 1) * 37 + month * 17 + safeYear) % 100;
        const spendThreshold = activeScope === 'MEI' ? 32 : activeScope === 'PF' ? 56 : 62;
        const isPaydayOrBillDay = day === 5 || day === 10 || day === 22 || day === 25;

        if (hash < spendThreshold || isPaydayOrBillDay) {
          const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.35 : 1.0;
          const baseAmt =
            activeScope === 'MEI'
              ? 65 + (hash % 180)
              : activeScope === 'PF'
                ? 42 + (hash % 195) * weekendBoost
                : 75 + (hash % 240) * weekendBoost;
          const spikeAmt = isPaydayOrBillDay && month % 2 === 0 ? (activeScope === 'MEI' ? 280 : 480) : 0;

          totalExpense = roundFinance2(baseAmt + spikeAmt);
          txCount = 1 + (hash % (activeScope === 'CONSOLIDATED' ? 4 : 3));
          const catPool =
            activeScope === 'MEI' ? meiCats : activeScope === 'PF' ? pfCats : allCats;
          topCategory = catPool[(dayIndex + month) % catPool.length];
        }
      }

      cells.push({
        dateStr,
        date: localDate,
        weekIndex,
        dayOfWeek,
        month,
        totalExpense,
        txCount,
        topCategory,
      });

      dayIndex += 1;
    }
  }

  let zeroSpendDays = 0;
  let activeDays = 0;
  let totalYearExpense = 0;
  let peakDay: DailyHeatmapCell | null = null;

  for (const cell of cells) {
    if (cell.totalExpense <= 0) {
      zeroSpendDays += 1;
    } else {
      activeDays += 1;
      totalYearExpense = roundFinance2(totalYearExpense + cell.totalExpense);
      if (!peakDay || cell.totalExpense > peakDay.totalExpense) {
        peakDay = cell;
      }
    }
  }

  const avgActiveDayExpense =
    activeDays > 0 ? roundFinance2(totalYearExpense / activeDays) : 0;

  return {
    cells,
    zeroSpendDays,
    peakDay,
    avgActiveDayExpense,
    totalYearExpense,
    isFallbackData,
  };
}

// ============================================================================
// UNIFIED DASHBOARD CHARTS: CATEGORY DONUT & ANNUAL BALANCE TIME-SERIES
// ============================================================================

export type DashboardChartScope = 'CONSOLIDATED' | 'PF' | 'MEI';

export interface CategoryDonutSlice {
  category: string;
  amount: number;
  percentage: number;
  txCount: number;
}

export interface CategoryDonutResult {
  items: CategoryDonutSlice[];
  totalExpense: number;
}

export interface AnnualBalanceMonthPoint {
  monthIndex: number; // 0..11
  monthLabel: string; // 'Jan'..'Dez'
  monthFullLabel: string; // 'Janeiro'..'Dezembro'
  year: number;
  date: Date; // new Date(year, m, 1) local timezone-safe
  income: number;
  expense: number;
  netFlow: number;
  runningBalance: number;
  isFallbackData: boolean;
}

const PT_BR_MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const PT_BR_MONTHS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Filters expense transactions by year and scope, sums per category,
 * sorts descending, and groups categories beyond the Top 6 into "Outros".
 */
export function buildCategoryDonutData(
  transactions: Transaction[],
  year: number,
  scope: DashboardChartScope = 'CONSOLIDATED'
): CategoryDonutResult {
  const safeYear =
    Number.isFinite(year) && year >= 1970 && year <= 2100
      ? Math.trunc(year)
      : new Date().getFullYear();
  const yearPrefix = `${safeYear}-`;

  const scopedExpenses = (Array.isArray(transactions) ? transactions : []).filter(
    tx =>
      tx &&
      tx.type === 'despesa' &&
      typeof tx.date === 'string' &&
      tx.date.startsWith(yearPrefix) &&
      matchesAnalyticsScope(tx, scope)
  );

  const catMap = new Map<string, { amount: number; txCount: number }>();
  for (const tx of scopedExpenses) {
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;
    const rawCat = (tx.category || 'Outros').trim() || 'Outros';
    const existing = catMap.get(rawCat);
    if (existing) {
      existing.amount = roundFinance2(existing.amount + amt);
      existing.txCount += 1;
    } else {
      catMap.set(rawCat, { amount: roundFinance2(amt), txCount: 1 });
    }
  }

  const sorted = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      amount: stats.amount,
      txCount: stats.txCount,
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'pt-BR'));

  const totalExpense = roundFinance2(sorted.reduce((sum, item) => sum + item.amount, 0));

  if (sorted.length === 0 || totalExpense <= 0) {
    return { items: [], totalExpense: 0 };
  }

  let grouped: Array<{ category: string; amount: number; txCount: number }>;
  if (sorted.length <= 6) {
    grouped = sorted;
  } else {
    const top6 = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const restAmount = roundFinance2(rest.reduce((sum, item) => sum + item.amount, 0));
    const restCount = rest.reduce((sum, item) => sum + item.txCount, 0);

    const existingOutrosIdx = top6.findIndex(item => item.category.toLowerCase() === 'outros');
    if (existingOutrosIdx >= 0) {
      grouped = top6.map((item, idx) =>
        idx === existingOutrosIdx
          ? {
              category: item.category,
              amount: roundFinance2(item.amount + restAmount),
              txCount: item.txCount + restCount,
            }
          : item
      );
    } else {
      grouped = [
        ...top6,
        {
          category: 'Outros',
          amount: restAmount,
          txCount: restCount,
        },
      ];
    }
  }

  const items: CategoryDonutSlice[] = grouped.map(entry => ({
    category: entry.category,
    amount: entry.amount,
    percentage: Math.round((entry.amount / totalExpense) * 1000) / 10,
    txCount: entry.txCount,
  }));

  return {
    items,
    totalExpense,
  };
}

/**
 * Builds a 12-month chronological series (Jan to Dez of year, using local Date(year, m, 1)
 * to avoid -03:00 UTC timezone shifts) computing monthly income, expense, netFlow, and
 * cumulative runningBalance filtered by scope. Includes a realistic fallback dataset when
 * transactions is empty.
 */
export function buildAnnualBalanceTimeSeries(
  transactions: Transaction[],
  year: number,
  scope: DashboardChartScope = 'CONSOLIDATED'
): AnnualBalanceMonthPoint[] {
  const safeYear =
    Number.isFinite(year) && year >= 1970 && year <= 2100
      ? Math.trunc(year)
      : new Date().getFullYear();

  const validList = Array.isArray(transactions) ? transactions : [];

  if (validList.length === 0) {
    // Realistic fallback dataset when transactions array is empty
    const baseIncomes =
      scope === 'MEI'
        ? [2800, 3100, 2950, 3400, 3250, 3600, 3450, 3750, 3900, 4100, 4350, 4600]
        : scope === 'PF'
          ? [2900, 2950, 3050, 3100, 3150, 3300, 3200, 3350, 3400, 3500, 3700, 4200]
          : [5700, 6050, 6000, 6500, 6400, 6900, 6650, 7100, 7300, 7600, 8050, 8800];

    const baseExpenses =
      scope === 'MEI'
        ? [1350, 1420, 1380, 1490, 1410, 1520, 1460, 1550, 1480, 1590, 1620, 1710]
        : scope === 'PF'
          ? [2450, 2390, 2510, 2480, 2600, 2540, 2620, 2590, 2680, 2750, 2890, 3150]
          : [3800, 3810, 3890, 3970, 4010, 4060, 4080, 4140, 4160, 4340, 4510, 4860];

    let running = 0;
    return PT_BR_MONTHS_SHORT.map((monthLabel, m) => {
      const income = roundFinance2(baseIncomes[m]);
      const expense = roundFinance2(baseExpenses[m]);
      const netFlow = roundFinance2(income - expense);
      running = roundFinance2(running + netFlow);
      return {
        monthIndex: m,
        monthLabel,
        monthFullLabel: PT_BR_MONTHS_FULL[m],
        year: safeYear,
        date: new Date(safeYear, m, 1),
        income,
        expense,
        netFlow,
        runningBalance: running,
        isFallbackData: true,
      };
    });
  }

  const yearPrefix = `${safeYear}-`;
  const monthlyIncome = new Array<number>(12).fill(0);
  const monthlyExpense = new Array<number>(12).fill(0);

  for (const tx of validList) {
    if (!tx || typeof tx.date !== 'string' || !tx.date.startsWith(yearPrefix)) continue;
    if (!matchesAnalyticsScope(tx, scope)) continue;

    const match = /^\d{4}-(\d{2})-\d{2}/.exec(tx.date);
    if (!match) continue;
    const monthIdx = Number(match[1]) - 1;
    if (monthIdx < 0 || monthIdx > 11) continue;

    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;

    if (tx.type === 'despesa') {
      monthlyExpense[monthIdx] = roundFinance2(monthlyExpense[monthIdx] + amt);
    } else {
      monthlyIncome[monthIdx] = roundFinance2(monthlyIncome[monthIdx] + amt);
    }
  }

  let runningBalance = 0;
  return PT_BR_MONTHS_SHORT.map((monthLabel, m) => {
    const income = roundFinance2(monthlyIncome[m]);
    const expense = roundFinance2(monthlyExpense[m]);
    const netFlow = roundFinance2(income - expense);
    runningBalance = roundFinance2(runningBalance + netFlow);
    return {
      monthIndex: m,
      monthLabel,
      monthFullLabel: PT_BR_MONTHS_FULL[m],
      year: safeYear,
      date: new Date(safeYear, m, 1),
      income,
      expense,
      netFlow,
      runningBalance,
      isFallbackData: false,
    };
  });
}

// ============================================================================
// 3-STAGE CASH-FLOW SANKEY DATA BUILDER (100% FLOW CONSERVATION, DAG-SAFE)
// ============================================================================

export type SankeyPeriodFilter = 'MONTH' | '3M' | 'YEAR';
export type SankeyScopeFilter = 'CONSOLIDATED' | 'PF' | 'MEI';

export interface SankeyNode {
  id: string;
  stage: 0 | 1 | 2;
  label: string;
  value: number;
  percentage: number;
  color: string;
  jarId?: JarType;
}

export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  percentage: number;
  sourceLabel: string;
  targetLabel: string;
  sourceColor: string;
  targetColor: string;
}

export interface BuildCashFlowSankeyParams {
  transactions: Transaction[];
  baseMonthlyIncome: number;
  period: SankeyPeriodFilter;
  scope: SankeyScopeFilter;
  referenceMonth?: string;
}

export interface CashFlowSankeyResult {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalInflow: number;
  totalOutflow: number;
  totalExpenses: number;
  totalRetained: number;
  periodLabel: string;
  isFallbackIncome: boolean;
}

const SANKEY_SIX_JARS: Array<{
  id: JarType;
  label: string;
  pct: number;
  color: string;
}> = [
  { id: 'NEC_55', label: 'Necessidades (55%)', pct: 0.55, color: '#3b82f6' },
  { id: 'LIF_10', label: 'Liberdade Financeira (10%)', pct: 0.10, color: '#10b981' },
  { id: 'EDU_10', label: 'Educação (10%)', pct: 0.10, color: '#f59e0b' },
  { id: 'PLP_10', label: 'Longo Prazo / Sonhos (10%)', pct: 0.10, color: '#6366f1' },
  { id: 'DIV_10', label: 'Diversão (10%)', pct: 0.10, color: '#8b5cf6' },
  { id: 'FER_5', label: 'Doação / Férias (5%)', pct: 0.05, color: '#f43f5e' },
];

const SANKEY_SOURCE_COLORS = ['#0ea5e9', '#10b981', '#6366f1', '#14b8a6', '#8b5cf6'];
const SANKEY_DEST_COLORS = [
  '#f43f5e',
  '#f97316',
  '#ec4899',
  '#eab308',
  '#ef4444',
  '#fb7185',
  '#d97706',
  '#64748b',
];
const SANKEY_RETAINED_COLOR = '#10b981';

function slugifySankeyId(label: string): string {
  const cleaned = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'outros';
}

function resolveAnchorMonth(transactions: Transaction[], explicitRef?: string): string {
  if (explicitRef && /^\d{4}-\d{2}$/.test(explicitRef)) {
    return explicitRef;
  }
  let maxMonth = '';
  for (const tx of transactions) {
    if (tx && typeof tx.date === 'string' && /^\d{4}-\d{2}/.test(tx.date)) {
      const m = tx.date.slice(0, 7);
      if (m > maxMonth) maxMonth = m;
    }
  }
  if (maxMonth) return maxMonth;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthString(yearMonth: string, deltaMonths: number): string {
  const y = Number(yearMonth.slice(0, 4));
  const m = Number(yearMonth.slice(5, 7)) - 1;
  const d = new Date(y, m + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function classifyIncomeSourceLabel(tx: Transaction): string {
  if (tx.type === 'reembolso') return 'Reembolsos';
  const cat = (tx.category || '').trim();
  const catLower = cat.toLowerCase();
  if (isTransactionPJScope(tx) || catLower.includes('pj') || catLower.includes('faturamento')) {
    return 'Faturamento MEI / PJ';
  }
  if (catLower.includes('salário') || catLower.includes('salario')) {
    return 'Salário PF';
  }
  return cat || 'Outras Receitas';
}

/**
 * Builds a DAG-safe 3-stage Sankey flow:
 * Stage 0 (src_* Entradas) -> Stage 1 (jar_* 6 Potes) -> Stage 2 (dst_* Categorias + Saldo Retido / Investido)
 * Guarantees 100% flow conservation: sum(Stage 0) === sum(Stage 1) === sum(Stage 2).
 */
export function buildCashFlowSankeyData({
  transactions,
  baseMonthlyIncome,
  period,
  scope,
  referenceMonth,
}: BuildCashFlowSankeyParams): CashFlowSankeyResult {
  const safeList = Array.isArray(transactions) ? transactions : [];
  const anchorMonth = resolveAnchorMonth(safeList, referenceMonth);
  const anchorYear = anchorMonth.slice(0, 4);
  const threeMonthStart = shiftMonthString(anchorMonth, -2);

  const periodLabel =
    period === 'MONTH'
      ? `Mês ${anchorMonth.slice(5, 7)}/${anchorYear}`
      : period === '3M'
        ? `Últimos 3 meses (${threeMonthStart.slice(5, 7)}/${threeMonthStart.slice(0, 4)}–${anchorMonth.slice(5, 7)}/${anchorYear})`
        : `Ano ${anchorYear}`;

  const filtered = safeList.filter(tx => {
    if (!tx || typeof tx.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(tx.date)) return false;
    if (!matchesAnalyticsScope(tx, scope)) return false;
    const ym = tx.date.slice(0, 7);
    if (period === 'MONTH') return ym === anchorMonth;
    if (period === '3M') return ym >= threeMonthStart && ym <= anchorMonth;
    return tx.date.startsWith(`${anchorYear}-`);
  });

  // --------------------------------------------------------------------------
  // STAGE 1: Entradas (src_*)
  // --------------------------------------------------------------------------
  const sourceMap = new Map<string, number>();
  for (const tx of filtered) {
    if (tx.type !== 'receita' && tx.type !== 'reembolso') continue;
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;
    const label = classifyIncomeSourceLabel(tx);
    sourceMap.set(label, roundFinance2((sourceMap.get(label) || 0) + amt));
  }

  let isFallbackIncome = false;
  let sourceEntries = Array.from(sourceMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));

  if (sourceEntries.length === 0) {
    isFallbackIncome = true;
    const fallbackVal = Math.max(100, roundFinance2(Number.isFinite(baseMonthlyIncome) && baseMonthlyIncome > 0 ? baseMonthlyIncome : 3500));
    sourceEntries = [
      {
        label: scope === 'MEI' ? 'Faturamento Base MEI' : 'Renda Base Mensal',
        value: fallbackVal,
      },
    ];
  } else if (sourceEntries.length > 4) {
    const top4 = sourceEntries.slice(0, 4);
    const restSum = roundFinance2(sourceEntries.slice(4).reduce((acc, s) => acc + s.value, 0));
    const existingOther = top4.find(s => s.label === 'Outras Receitas');
    if (existingOther) {
      existingOther.value = roundFinance2(existingOther.value + restSum);
    } else {
      top4.push({ label: 'Outras Receitas', value: restSum });
    }
    sourceEntries = top4;
  }

  const totalInflow = roundFinance2(sourceEntries.reduce((acc, s) => acc + s.value, 0));

  const stage1Nodes: SankeyNode[] = sourceEntries.map((entry, idx) => ({
    id: `src_${slugifySankeyId(entry.label)}_${idx}`,
    stage: 0,
    label: entry.label,
    value: entry.value,
    percentage: totalInflow > 0 ? roundFinance2((entry.value / totalInflow) * 100) : 0,
    color: SANKEY_SOURCE_COLORS[idx % SANKEY_SOURCE_COLORS.length],
  }));

  // --------------------------------------------------------------------------
  // STAGE 2: 6 Potes (jar_*) + Stage 1 -> Stage 2 Links (exact conservation)
  // --------------------------------------------------------------------------
  const jarTotals = new Map<JarType, number>();
  for (const j of SANKEY_SIX_JARS) {
    jarTotals.set(j.id, 0);
  }

  const stage1To2Links: SankeyLink[] = [];
  for (const srcNode of stage1Nodes) {
    let allocatedFromSrc = 0;
    SANKEY_SIX_JARS.forEach((jar, jIdx) => {
      const isLast = jIdx === SANKEY_SIX_JARS.length - 1;
      const val = isLast
        ? roundFinance2(srcNode.value - allocatedFromSrc)
        : roundFinance2(srcNode.value * jar.pct);
      allocatedFromSrc = roundFinance2(allocatedFromSrc + val);

      jarTotals.set(jar.id, roundFinance2((jarTotals.get(jar.id) || 0) + val));

      if (val > 0) {
        stage1To2Links.push({
          id: `${srcNode.id}__jar_${jar.id}`,
          source: srcNode.id,
          target: `jar_${jar.id}`,
          value: val,
          percentage: totalInflow > 0 ? roundFinance2((val / totalInflow) * 100) : 0,
          sourceLabel: srcNode.label,
          targetLabel: jar.label,
          sourceColor: srcNode.color,
          targetColor: jar.color,
        });
      }
    });
  }

  const stage2Nodes: SankeyNode[] = SANKEY_SIX_JARS.map(jar => {
    const val = roundFinance2(jarTotals.get(jar.id) || 0);
    return {
      id: `jar_${jar.id}`,
      stage: 1,
      label: jar.label,
      value: val,
      percentage: totalInflow > 0 ? roundFinance2((val / totalInflow) * 100) : 0,
      color: jar.color,
      jarId: jar.id,
    };
  });

  // --------------------------------------------------------------------------
  // STAGE 3: Categorias de Despesa & Saldo Retido / Investido (dst_*)
  // --------------------------------------------------------------------------
  const validJarIds = new Set<JarType>(SANKEY_SIX_JARS.map(j => j.id));
  const expensesByJarCat = new Map<JarType, Map<string, number>>();
  for (const jar of SANKEY_SIX_JARS) {
    expensesByJarCat.set(jar.id, new Map<string, number>());
  }

  for (const tx of filtered) {
    if (tx.type !== 'despesa') continue;
    const amt = Math.abs(Number.isFinite(tx.amount) ? tx.amount : 0);
    if (amt <= 0) continue;
    const mappedJar: JarType = validJarIds.has(tx.jar) ? tx.jar : 'NEC_55';
    const catLabel = (tx.category || 'Outros Gastos').trim() || 'Outros Gastos';
    const jarMap = expensesByJarCat.get(mappedJar)!;
    jarMap.set(catLabel, roundFinance2((jarMap.get(catLabel) || 0) + amt));
  }

  // Track destination node totals and Stage 2 -> Stage 3 links with exact per-jar conservation
  const destTotals = new Map<string, { label: string; value: number; isRetained: boolean }>();
  const stage2To3Draft: Array<{
    jarNode: SankeyNode;
    dstKey: string;
    dstLabel: string;
    value: number;
    isRetained: boolean;
  }> = [];

  let totalExpenses = 0;
  let totalRetained = 0;

  for (const jarNode of stage2Nodes) {
    const jarId = jarNode.jarId!;
    const jarBudget = jarNode.value;
    if (jarBudget <= 0) continue;

    const catEntriesRaw = Array.from(expensesByJarCat.get(jarId)!.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));

    // Consolidate minor per-jar categories beyond top 5 into 'Outros Gastos'
    let catEntries = catEntriesRaw;
    if (catEntriesRaw.length > 5) {
      const top5 = catEntriesRaw.slice(0, 5);
      const restVal = roundFinance2(catEntriesRaw.slice(5).reduce((s, c) => s + c.value, 0));
      const existingOther = top5.find(c => c.label === 'Outros Gastos');
      if (existingOther) {
        existingOther.value = roundFinance2(existingOther.value + restVal);
      } else {
        top5.push({ label: 'Outros Gastos', value: restVal });
      }
      catEntries = top5;
    }

    const rawJarSpent = roundFinance2(catEntries.reduce((s, c) => s + c.value, 0));

    if (rawJarSpent === 0) {
      // 100% retained in this jar -> Saldo Retido / Investido
      const dstKey = 'dst_saldo_retido';
      const dstLabel = 'Saldo Retido / Investido';
      totalRetained = roundFinance2(totalRetained + jarBudget);
      const existing = destTotals.get(dstKey);
      destTotals.set(dstKey, {
        label: dstLabel,
        value: roundFinance2((existing?.value || 0) + jarBudget),
        isRetained: true,
      });
      stage2To3Draft.push({
        jarNode,
        dstKey,
        dstLabel,
        value: jarBudget,
        isRetained: true,
      });
    } else if (rawJarSpent <= jarBudget) {
      let spentSum = 0;
      for (const c of catEntries) {
        spentSum = roundFinance2(spentSum + c.value);
        totalExpenses = roundFinance2(totalExpenses + c.value);
        const dstKey = `dst_${slugifySankeyId(c.label)}`;
        const existing = destTotals.get(dstKey);
        destTotals.set(dstKey, {
          label: c.label,
          value: roundFinance2((existing?.value || 0) + c.value),
          isRetained: false,
        });
        stage2To3Draft.push({
          jarNode,
          dstKey,
          dstLabel: c.label,
          value: c.value,
          isRetained: false,
        });
      }

      const unspent = roundFinance2(jarBudget - spentSum);
      if (unspent > 0) {
        const dstKey = 'dst_saldo_retido';
        const dstLabel = 'Saldo Retido / Investido';
        totalRetained = roundFinance2(totalRetained + unspent);
        const existing = destTotals.get(dstKey);
        destTotals.set(dstKey, {
          label: dstLabel,
          value: roundFinance2((existing?.value || 0) + unspent),
          isRetained: true,
        });
        stage2To3Draft.push({
          jarNode,
          dstKey,
          dstLabel,
          value: unspent,
          isRetained: true,
        });
      }
    } else {
      // Jar overspent relative to its proportional inflow: scale flows proportionally to preserve 100% flow conservation
      const scale = jarBudget / rawJarSpent;
      let allocatedOut = 0;
      catEntries.forEach((c, idx) => {
        const isLast = idx === catEntries.length - 1;
        const scaledVal = isLast
          ? roundFinance2(jarBudget - allocatedOut)
          : roundFinance2(c.value * scale);
        allocatedOut = roundFinance2(allocatedOut + scaledVal);
        if (scaledVal <= 0) return;

        totalExpenses = roundFinance2(totalExpenses + scaledVal);
        const dstKey = `dst_${slugifySankeyId(c.label)}`;
        const existing = destTotals.get(dstKey);
        destTotals.set(dstKey, {
          label: c.label,
          value: roundFinance2((existing?.value || 0) + scaledVal),
          isRetained: false,
        });
        stage2To3Draft.push({
          jarNode,
          dstKey,
          dstLabel: c.label,
          value: scaledVal,
          isRetained: false,
        });
      });
    }
  }

  // Build Stage 3 nodes sorted by value descending, keeping Saldo Retido / Investido visible at bottom/top clearly
  const sortedDestEntries = Array.from(destTotals.entries()).sort((a, b) => {
    if (a[1].isRetained !== b[1].isRetained) return a[1].isRetained ? 1 : -1;
    return b[1].value - a[1].value || a[1].label.localeCompare(b[1].label, 'pt-BR');
  });

  const stage3ColorMap = new Map<string, string>();
  let expenseColorIdx = 0;
  for (const [key, info] of sortedDestEntries) {
    if (info.isRetained) {
      stage3ColorMap.set(key, SANKEY_RETAINED_COLOR);
    } else {
      stage3ColorMap.set(key, SANKEY_DEST_COLORS[expenseColorIdx % SANKEY_DEST_COLORS.length]);
      expenseColorIdx += 1;
    }
  }

  const stage3Nodes: SankeyNode[] = sortedDestEntries.map(([id, info]) => ({
    id,
    stage: 2,
    label: info.label,
    value: info.value,
    percentage: totalInflow > 0 ? roundFinance2((info.value / totalInflow) * 100) : 0,
    color: stage3ColorMap.get(id) || '#64748b',
  }));

  const stage2To3Links: SankeyLink[] = stage2To3Draft.map(draft => {
    const targetColor = stage3ColorMap.get(draft.dstKey) || '#64748b';
    return {
      id: `${draft.jarNode.id}__${draft.dstKey}`,
      source: draft.jarNode.id,
      target: draft.dstKey,
      value: draft.value,
      percentage: totalInflow > 0 ? roundFinance2((draft.value / totalInflow) * 100) : 0,
      sourceLabel: draft.jarNode.label,
      targetLabel: draft.dstLabel,
      sourceColor: draft.jarNode.color,
      targetColor,
    };
  });

  const totalOutflow = roundFinance2(stage3Nodes.reduce((acc, n) => acc + n.value, 0));

  return {
    nodes: [...stage1Nodes, ...stage2Nodes, ...stage3Nodes],
    links: [...stage1To2Links, ...stage2To3Links],
    totalInflow,
    totalOutflow,
    totalExpenses,
    totalRetained,
    periodLabel,
    isFallbackIncome,
  };
}

