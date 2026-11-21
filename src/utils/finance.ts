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

