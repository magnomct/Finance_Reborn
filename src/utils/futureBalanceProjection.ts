import { DreamGoal, JarType, RecurringExpense, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { getMonthlyProjection } from './finance';
import { mapGoalToBudgetJar } from './goalContributionSuggester';
import {
  DEFAULT_SIX_JAR_PERCENTAGES,
  SIX_JAR_KEYS,
  extractMonthKey,
  resolveActiveSixJarsMonth,
} from './sixJarsMetrics';

export type ProjectionJarId = Exclude<JarType, 'PJ_EXCLUIDO'>;

export interface JarCostDriver {
  description: string;
  monthlyAmount: number;
  source: 'recurrence' | 'fixed' | 'goal' | 'variable';
}

export interface FutureProjectionPoint {
  monthIndex: number; // 0 = M0 (Atual), 1..6 = M+1..M+6
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. 'nov/26'
  monthFullLabel: string; // e.g. 'Novembro/2026'
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  consolidatedInflow: number;
  consolidatedOutflow: number;
  consolidatedVariableAvg: number;
  consolidatedNetFlow: number;
  consolidatedBalance: number;
  jarInflows: Record<ProjectionJarId, number>;
  jarOutflows: Record<ProjectionJarId, number>;
  jarVariableAvg: Record<ProjectionJarId, number>;
  jarBalances: Record<ProjectionJarId, number>;
  negativeJars: Array<{
    jarId: ProjectionJarId;
    jarName: string;
    jarShortName: string;
    balance: number;
  }>;
  hasAnyDeficit: boolean;
}

export interface DeficitAlert {
  jarId: ProjectionJarId | 'CONSOLIDATED';
  jarName: string;
  jarShortName: string;
  monthIndex: number;
  monthKey: string;
  monthLabel: string;
  monthFullLabel: string;
  deficitAmountBRL: number; // positive magnitude
  projectedBalanceBRL: number; // negative balance
  mainCostDriver: string;
  mainCostDriverAmountBRL: number;
  suggestedMonthlyReductionBRL: number;
}

export interface FutureProjectionResult {
  startMonthKey: string;
  points: FutureProjectionPoint[]; // M0 + M+1..M+6
  futurePoints: FutureProjectionPoint[]; // M+1..M+6
  projectedMonthlyNetIncome: number;
  projectedMonthlyRecurringOutflow: number;
  projectedMonthlyVariableAvg: number;
  jarPercentages: Record<ProjectionJarId, number>;
  jarCostDrivers: Record<ProjectionJarId, JarCostDriver[]>;
  consolidatedCostDrivers: JarCostDriver[];
  deficitAlertsByJar: Partial<Record<ProjectionJarId, DeficitAlert>>;
  allJarDeficitAlerts: DeficitAlert[];
  consolidatedDeficitAlert: DeficitAlert | null;
  primaryDeficitAlert: DeficitAlert | null;
  hasAnyDeficit: boolean;
  hasConsolidatedDeficit: boolean;
  minNegativeValue: number;
  minValueAcrossAllCurves: number;
  maxValueAcrossAllCurves: number;
}

export interface CalculateFutureProjectionOptions {
  transactions: Transaction[];
  recurringList: RecurringExpense[];
  dreams?: DreamGoal[];
  jarPercentages?: Partial<Record<JarType, number>>;
  usePjProfitInPf?: boolean;
  includeVariableAvg?: boolean;
  referenceMonthKey?: string;
  customIncomeBase?: number;
}

const PT_BR_MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const PT_BR_MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const PROJECTION_JAR_IDS: ProjectionJarId[] = SIX_JAR_KEYS as ProjectionJarId[];

export const PROJECTION_JAR_COLORS: Record<ProjectionJarId, string> = {
  NEC_55: '#3B82F6',
  LIF_10: '#10B981',
  PLP_10: '#6366F1',
  EDU_10: '#F59E0B',
  DIV_10: '#A855F7',
  FER_5: '#06B6D4',
};

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addMonthsToKey(baseMonthKey: string, offset: number): string {
  const [yStr, mStr] = baseMonthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIdx)) {
    return baseMonthKey;
  }
  const d = new Date(year, monthIdx + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthShortPtBr(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${PT_BR_MONTHS_SHORT[monthIdx]}/${String(year).slice(-2)}`;
}

export function formatMonthFullPtBr(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${PT_BR_MONTHS_FULL[monthIdx]}/${year}`;
}

function createZeroJarRecord(): Record<ProjectionJarId, number> {
  return {
    NEC_55: 0,
    LIF_10: 0,
    PLP_10: 0,
    EDU_10: 0,
    DIV_10: 0,
    FER_5: 0,
  };
}

function isProjectionJar(jar: JarType): jar is ProjectionJarId {
  return jar !== 'PJ_EXCLUIDO' && PROJECTION_JAR_IDS.includes(jar as ProjectionJarId);
}

/**
 * Computes the 3-month rolling average of variable expenses per Jar from historical transactions.
 */
function computeRollingVariableAvgByJar(
  transactions: Transaction[],
  upToMonthKey: string
): Record<ProjectionJarId, number> {
  const result = createZeroJarRecord();
  const eligibleTxs = transactions.filter(t => {
    if (t.type !== 'despesa' || !isProjectionJar(t.jar)) return false;
    const ym = extractMonthKey(t.date);
    if (!ym || ym > upToMonthKey) return false;
    const isVar =
      t.nature === 'variable' ||
      (!t.isRecurring && !t.recurringId && t.nature !== 'fixed');
    return isVar;
  });

  if (eligibleTxs.length === 0) return result;

  const recentMonths = Array.from(
    new Set(
      eligibleTxs
        .map(t => extractMonthKey(t.date))
        .filter((m): m is string => m !== null)
    )
  )
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 3);

  const monthCount = Math.max(1, recentMonths.length);
  const recentSet = new Set(recentMonths);

  eligibleTxs.forEach(tx => {
    const ym = extractMonthKey(tx.date);
    if (ym && recentSet.has(ym) && isProjectionJar(tx.jar)) {
      result[tx.jar] += Math.abs(tx.amount);
    }
  });

  PROJECTION_JAR_IDS.forEach(jarId => {
    result[jarId] = round2(result[jarId] / monthCount);
  });

  return result;
}

/**
 * Simulates current month (M0) + next 6 months (M+1 to M+6) per-Jar and consolidated balances
 * using active recurrences, standalone fixed expenses, planned goal commitments, and optional
 * 3-month rolling variable expense averages.
 */
export function calculateFutureProjection({
  transactions,
  recurringList,
  dreams = [],
  jarPercentages: customPercentages,
  usePjProfitInPf = true,
  includeVariableAvg = false,
  referenceMonthKey,
  customIncomeBase,
}: CalculateFutureProjectionOptions): FutureProjectionResult {
  const startMonthKey = resolveActiveSixJarsMonth(transactions, referenceMonthKey);

  // 1. Resolve Jar allocation percentages (normalized if custom provided)
  const rawPercentages: Record<ProjectionJarId, number> = {
    NEC_55: customPercentages?.NEC_55 ?? DEFAULT_SIX_JAR_PERCENTAGES.NEC_55,
    LIF_10: customPercentages?.LIF_10 ?? DEFAULT_SIX_JAR_PERCENTAGES.LIF_10,
    PLP_10: customPercentages?.PLP_10 ?? DEFAULT_SIX_JAR_PERCENTAGES.PLP_10,
    EDU_10: customPercentages?.EDU_10 ?? DEFAULT_SIX_JAR_PERCENTAGES.EDU_10,
    DIV_10: customPercentages?.DIV_10 ?? DEFAULT_SIX_JAR_PERCENTAGES.DIV_10,
    FER_5: customPercentages?.FER_5 ?? DEFAULT_SIX_JAR_PERCENTAGES.FER_5,
  };

  // 2. Compute M0 (current month) starting balances per Jar & Consolidated
  const m0Transactions = transactions.filter(
    t => extractMonthKey(t.date) === startMonthKey
  );

  const m0PfIncome = m0Transactions
    .filter(t => t.type === 'receita' && t.costCenter !== 'PJ')
    .reduce((acc, t) => acc + Math.max(0, t.amount), 0);

  const m0PjIncome = m0Transactions
    .filter(t => t.type === 'receita' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + Math.max(0, t.amount), 0);

  const m0PjExpenses = m0Transactions
    .filter(t => t.type === 'despesa' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const m0PjNet = Math.max(0, m0PjIncome - m0PjExpenses);
  const realizedM0EffectiveIncome = round2(
    m0PfIncome + (usePjProfitInPf ? m0PjNet : 0)
  );
  const hasCustomIncomeOverride =
    typeof customIncomeBase === 'number' &&
    Number.isFinite(customIncomeBase) &&
    customIncomeBase > 0;
  const m0EffectiveIncome = hasCustomIncomeOverride
    ? round2(customIncomeBase)
    : realizedM0EffectiveIncome;

  const m0JarBalances = createZeroJarRecord();
  const m0JarInflows = createZeroJarRecord();
  const m0JarOutflows = createZeroJarRecord();

  PROJECTION_JAR_IDS.forEach(jarId => {
    const pctRatio = rawPercentages[jarId] / 100;
    const budget = round2(m0EffectiveIncome * pctRatio);
    const jarExpenses = m0Transactions
      .filter(t => t.jar === jarId && t.type === 'despesa')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const jarRefunds = m0Transactions
      .filter(t => t.jar === jarId && t.type === 'reembolso')
      .reduce((acc, t) => acc + Math.max(0, t.amount), 0);
    const netSpent = round2(Math.max(0, jarExpenses - jarRefunds));

    m0JarInflows[jarId] = budget;
    m0JarOutflows[jarId] = netSpent;
    m0JarBalances[jarId] = round2(budget - netSpent);
  });

  const m0TotalOutflow = round2(
    PROJECTION_JAR_IDS.reduce((sum, id) => sum + m0JarOutflows[id], 0)
  );
  const m0ConsolidatedBalance = round2(m0EffectiveIncome - m0TotalOutflow);

  // 3. Projected Monthly Inflows from Active Recurrences (fallback to M0 income if no active income recurrences exist)
  const activeRecurrences = recurringList.filter(r => r.isActive);

  let recPfIncome = 0;
  let recPjIncome = 0;
  let recPjExpenses = 0;

  const jarRecurringRefunds = createZeroJarRecord();
  const jarRecurringGrossOutflows = createZeroJarRecord();
  const jarCostDrivers: Record<ProjectionJarId, JarCostDriver[]> = {
    NEC_55: [],
    LIF_10: [],
    PLP_10: [],
    EDU_10: [],
    DIV_10: [],
    FER_5: [],
  };

  activeRecurrences.forEach(r => {
    const baseAmt =
      r.amountPlanned && r.amountPlanned > 0 ? r.amountPlanned : r.amount;
    const monthlyAmt = round2(getMonthlyProjection(baseAmt, r.frequency));
    if (monthlyAmt <= 0) return;

    if (r.type === 'receita') {
      if (r.costCenter === 'PJ' || r.jar === 'PJ_EXCLUIDO') {
        recPjIncome += monthlyAmt;
      } else {
        recPfIncome += monthlyAmt;
      }
      return;
    }

    if (r.type === 'reembolso') {
      if (isProjectionJar(r.jar)) {
        jarRecurringRefunds[r.jar] += monthlyAmt;
      }
      return;
    }

    // Expense recurrence
    if (r.costCenter === 'PJ' || r.jar === 'PJ_EXCLUIDO') {
      recPjExpenses += monthlyAmt;
    } else if (isProjectionJar(r.jar)) {
      jarRecurringGrossOutflows[r.jar] += monthlyAmt;
      jarCostDrivers[r.jar].push({
        description: r.description,
        monthlyAmount: monthlyAmt,
        source: r.goalId ? 'goal' : 'recurrence',
      });
    }
  });

  const hasRecurringIncome = recPfIncome > 0 || recPjIncome > 0;
  const projectedMonthlyNetIncome = hasCustomIncomeOverride
    ? round2(customIncomeBase)
    : hasRecurringIncome
    ? round2(
        recPfIncome +
          (usePjProfitInPf ? Math.max(0, recPjIncome - recPjExpenses) : 0)
      )
    : m0EffectiveIncome;

  // 4. Standalone Fixed Expenses (transactions with nature === 'fixed' not already covered by an active recurrence)
  const activeRecIds = new Set(activeRecurrences.map(r => r.id));
  const activeRecDescs = activeRecurrences.map(r =>
    r.description.toLowerCase().trim()
  );

  m0Transactions.forEach(tx => {
    if (tx.type !== 'despesa' || tx.nature !== 'fixed') return;
    if (!isProjectionJar(tx.jar)) return;
    if (tx.recurringId && activeRecIds.has(tx.recurringId)) return;
    const descLower = tx.description.toLowerCase().trim();
    if (
      tx.isRecurring &&
      activeRecDescs.some(
        rd => rd === descLower || rd.includes(descLower) || descLower.includes(rd)
      )
    ) {
      return;
    }
    const amt = round2(Math.abs(tx.amount));
    if (amt <= 0) return;
    jarRecurringGrossOutflows[tx.jar] += amt;
    jarCostDrivers[tx.jar].push({
      description: tx.description,
      monthlyAmount: amt,
      source: 'fixed',
    });
  });

  // 5. Planned Goal Contributions not already synced as active recurrences
  const syncedGoalIds = new Set(
    activeRecurrences.map(r => r.goalId).filter((id): id is string => Boolean(id))
  );

  const unlinkedGoals = dreams
    .filter(
      d =>
        !syncedGoalIds.has(d.id) &&
        !activeRecurrences.some(r => r.id === `rec-dream-${d.id}`) &&
        d.target > d.current &&
        d.monthlyDeposit > 0
    )
    .map(d => {
      const mapping = mapGoalToBudgetJar(d.category, d.title);
      return {
        id: d.id,
        title: `Aporte Meta: ${d.title}`,
        jar: mapping.jar as ProjectionJarId,
        monthlyDeposit: round2(d.monthlyDeposit),
        remainingGap: round2(d.target - d.current),
      };
    });

  // Add unlinked goal drivers for visibility
  unlinkedGoals.forEach(g => {
    jarCostDrivers[g.jar].push({
      description: g.title,
      monthlyAmount: g.monthlyDeposit,
      source: 'goal',
    });
  });

  // 6. 3-Month Rolling Variable Expense Averages
  const variableAvgByJar = computeRollingVariableAvgByJar(transactions, startMonthKey);
  if (includeVariableAvg) {
    PROJECTION_JAR_IDS.forEach(jarId => {
      if (variableAvgByJar[jarId] > 0) {
        jarCostDrivers[jarId].push({
          description: 'Média de gastos variáveis (3M)',
          monthlyAmount: variableAvgByJar[jarId],
          source: 'variable',
        });
      }
    });
  }

  // Sort cost drivers descending per jar & consolidate
  const consolidatedCostDrivers: JarCostDriver[] = [];
  PROJECTION_JAR_IDS.forEach(jarId => {
    jarCostDrivers[jarId].sort((a, b) => b.monthlyAmount - a.monthlyAmount);
    consolidatedCostDrivers.push(...jarCostDrivers[jarId]);
  });
  consolidatedCostDrivers.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  // 7. Build M0 + M+1..M+6 points
  const points: FutureProjectionPoint[] = [];

  const m0NegativeJars = PROJECTION_JAR_IDS.filter(id => m0JarBalances[id] < 0).map(
    id => ({
      jarId: id,
      jarName: JAR_DEFINITIONS[id]?.name || id,
      jarShortName: JAR_DEFINITIONS[id]?.shortName || id,
      balance: m0JarBalances[id],
    })
  );

  points.push({
    monthIndex: 0,
    monthKey: startMonthKey,
    monthLabel: formatMonthShortPtBr(startMonthKey),
    monthFullLabel: formatMonthFullPtBr(startMonthKey),
    isCurrentMonth: true,
    isFutureMonth: false,
    consolidatedInflow: m0EffectiveIncome,
    consolidatedOutflow: m0TotalOutflow,
    consolidatedVariableAvg: 0,
    consolidatedNetFlow: round2(m0EffectiveIncome - m0TotalOutflow),
    consolidatedBalance: m0ConsolidatedBalance,
    jarInflows: { ...m0JarInflows },
    jarOutflows: { ...m0JarOutflows },
    jarVariableAvg: createZeroJarRecord(),
    jarBalances: { ...m0JarBalances },
    negativeJars: m0NegativeJars,
    hasAnyDeficit: m0ConsolidatedBalance < 0 || m0NegativeJars.length > 0,
  });

  const runningJarBalances = { ...m0JarBalances };
  let runningConsolidatedBalance = m0ConsolidatedBalance;
  const remainingGoalGaps = new Map<string, number>(
    unlinkedGoals.map(g => [g.id, g.remainingGap])
  );

  for (let m = 1; m <= 6; m++) {
    const monthKey = addMonthsToKey(startMonthKey, m);
    const jarInflows = createZeroJarRecord();
    const jarOutflows = createZeroJarRecord();
    const jarVarApplied = createZeroJarRecord();
    const jarBalances = createZeroJarRecord();

    // Compute unlinked goal contributions active in month m
    const jarGoalOutflows = createZeroJarRecord();
    unlinkedGoals.forEach(g => {
      const rem = remainingGoalGaps.get(g.id) ?? 0;
      if (rem <= 0) return;
      const deposit = round2(Math.min(rem, g.monthlyDeposit));
      jarGoalOutflows[g.jar] = round2(jarGoalOutflows[g.jar] + deposit);
      remainingGoalGaps.set(g.id, round2(rem - deposit));
    });

    let monthConsolidatedInflow = 0;
    let monthConsolidatedOutflow = 0;
    let monthConsolidatedVarAvg = 0;

    PROJECTION_JAR_IDS.forEach(jarId => {
      const inflow = round2(
        projectedMonthlyNetIncome * (rawPercentages[jarId] / 100)
      );
      const baseNetRecurring = Math.max(
        0,
        jarRecurringGrossOutflows[jarId] - jarRecurringRefunds[jarId]
      );
      const varAvg = includeVariableAvg ? variableAvgByJar[jarId] : 0;
      const totalOutflow = round2(
        baseNetRecurring + jarGoalOutflows[jarId] + varAvg
      );

      runningJarBalances[jarId] = round2(
        runningJarBalances[jarId] + inflow - totalOutflow
      );

      jarInflows[jarId] = inflow;
      jarOutflows[jarId] = totalOutflow;
      jarVarApplied[jarId] = varAvg;
      jarBalances[jarId] = runningJarBalances[jarId];

      monthConsolidatedInflow = round2(monthConsolidatedInflow + inflow);
      monthConsolidatedOutflow = round2(monthConsolidatedOutflow + totalOutflow);
      monthConsolidatedVarAvg = round2(monthConsolidatedVarAvg + varAvg);
    });

    runningConsolidatedBalance = round2(
      runningConsolidatedBalance +
        monthConsolidatedInflow -
        monthConsolidatedOutflow
    );

    const negativeJars = PROJECTION_JAR_IDS.filter(id => jarBalances[id] < 0).map(
      id => ({
        jarId: id,
        jarName: JAR_DEFINITIONS[id]?.name || id,
        jarShortName: JAR_DEFINITIONS[id]?.shortName || id,
        balance: jarBalances[id],
      })
    );

    points.push({
      monthIndex: m,
      monthKey,
      monthLabel: formatMonthShortPtBr(monthKey),
      monthFullLabel: formatMonthFullPtBr(monthKey),
      isCurrentMonth: false,
      isFutureMonth: true,
      consolidatedInflow: monthConsolidatedInflow,
      consolidatedOutflow: monthConsolidatedOutflow,
      consolidatedVariableAvg: monthConsolidatedVarAvg,
      consolidatedNetFlow: round2(
        monthConsolidatedInflow - monthConsolidatedOutflow
      ),
      consolidatedBalance: runningConsolidatedBalance,
      jarInflows,
      jarOutflows,
      jarVariableAvg: jarVarApplied,
      jarBalances,
      negativeJars,
      hasAnyDeficit: runningConsolidatedBalance < 0 || negativeJars.length > 0,
    });
  }

  const futurePoints = points.filter(p => p.isFutureMonth);

  // 8. Flag earliest DeficitAlert per Jar and Consolidated in M+1..M+6
  const deficitAlertsByJar: Partial<Record<ProjectionJarId, DeficitAlert>> = {};
  const allJarDeficitAlerts: DeficitAlert[] = [];

  PROJECTION_JAR_IDS.forEach(jarId => {
    const firstNeg = futurePoints.find(p => p.jarBalances[jarId] < 0);
    if (!firstNeg) return;
    const balance = firstNeg.jarBalances[jarId];
    const deficitMagnitude = round2(Math.abs(balance));
    const topDriver = jarCostDrivers[jarId][0];
    const jarDef = JAR_DEFINITIONS[jarId];

    const alert: DeficitAlert = {
      jarId,
      jarName: jarDef?.name || jarId,
      jarShortName: jarDef?.shortName || jarId,
      monthIndex: firstNeg.monthIndex,
      monthKey: firstNeg.monthKey,
      monthLabel: firstNeg.monthLabel,
      monthFullLabel: firstNeg.monthFullLabel,
      deficitAmountBRL: deficitMagnitude,
      projectedBalanceBRL: balance,
      mainCostDriver: topDriver?.description || 'Despesas recorrentes do pote',
      mainCostDriverAmountBRL: topDriver?.monthlyAmount ?? 0,
      suggestedMonthlyReductionBRL: round2(
        deficitMagnitude / Math.max(1, firstNeg.monthIndex)
      ),
    };

    deficitAlertsByJar[jarId] = alert;
    allJarDeficitAlerts.push(alert);
  });

  // Sort jar deficit alerts by earliest month then largest deficit
  allJarDeficitAlerts.sort((a, b) =>
    a.monthIndex !== b.monthIndex
      ? a.monthIndex - b.monthIndex
      : b.deficitAmountBRL - a.deficitAmountBRL
  );

  let consolidatedDeficitAlert: DeficitAlert | null = null;
  const firstNegConsolidated = futurePoints.find(p => p.consolidatedBalance < 0);
  if (firstNegConsolidated) {
    const balance = firstNegConsolidated.consolidatedBalance;
    const deficitMagnitude = round2(Math.abs(balance));
    const topDriver = consolidatedCostDrivers[0];
    consolidatedDeficitAlert = {
      jarId: 'CONSOLIDATED',
      jarName: 'Fluxo Consolidado',
      jarShortName: 'Consolidado',
      monthIndex: firstNegConsolidated.monthIndex,
      monthKey: firstNegConsolidated.monthKey,
      monthLabel: firstNegConsolidated.monthLabel,
      monthFullLabel: firstNegConsolidated.monthFullLabel,
      deficitAmountBRL: deficitMagnitude,
      projectedBalanceBRL: balance,
      mainCostDriver:
        topDriver?.description || 'Compromissos fixos e recorrentes mensais',
      mainCostDriverAmountBRL: topDriver?.monthlyAmount ?? 0,
      suggestedMonthlyReductionBRL: round2(
        deficitMagnitude / Math.max(1, firstNegConsolidated.monthIndex)
      ),
    };
  }

  const primaryDeficitAlert =
    allJarDeficitAlerts[0] || consolidatedDeficitAlert || null;

  // 9. Compute Y-axis bounds across all curves
  let minVal = 0;
  let maxVal = 0;
  points.forEach(p => {
    minVal = Math.min(minVal, p.consolidatedBalance);
    maxVal = Math.max(maxVal, p.consolidatedBalance);
    PROJECTION_JAR_IDS.forEach(id => {
      minVal = Math.min(minVal, p.jarBalances[id]);
      maxVal = Math.max(maxVal, p.jarBalances[id]);
    });
  });

  const projectedMonthlyRecurringOutflow = round2(
    PROJECTION_JAR_IDS.reduce(
      (sum, id) =>
        sum + Math.max(0, jarRecurringGrossOutflows[id] - jarRecurringRefunds[id]),
      0
    )
  );
  const projectedMonthlyVariableAvg = round2(
    PROJECTION_JAR_IDS.reduce((sum, id) => sum + variableAvgByJar[id], 0)
  );

  return {
    startMonthKey,
    points,
    futurePoints,
    projectedMonthlyNetIncome,
    projectedMonthlyRecurringOutflow,
    projectedMonthlyVariableAvg,
    jarPercentages: rawPercentages,
    jarCostDrivers,
    consolidatedCostDrivers,
    deficitAlertsByJar,
    allJarDeficitAlerts,
    consolidatedDeficitAlert,
    primaryDeficitAlert,
    hasAnyDeficit: allJarDeficitAlerts.length > 0 || consolidatedDeficitAlert !== null,
    hasConsolidatedDeficit: consolidatedDeficitAlert !== null,
    minNegativeValue: minVal < 0 ? round2(minVal) : 0,
    minValueAcrossAllCurves: round2(minVal),
    maxValueAcrossAllCurves: round2(maxVal),
  };
}
