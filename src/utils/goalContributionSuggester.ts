import { DreamGoal, RecurringExpense, Transaction } from '../types';
import { formatBRL } from './finance';
import {
  calculateIdealMonthlyContribution,
  diffInMonths,
  estimateMonthlyFreeCashFlow,
  round2,
} from './smartGoalAutoFill';

export type GoalBudgetJarId = 'LIF_10' | 'PLP_10';

export interface GoalBudgetJarMapping {
  jar: GoalBudgetJarId;
  jarName: string;
  jarShortName: string;
}

export interface GoalContributionSuggestion {
  dreamId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  monthsRemaining: number;
  hasTargetDate: boolean;
  isPastDue: boolean;
  isCompleted: boolean;
  yieldRatePct: number;
  requiredMonthlyContribution: number;
  plannedMonthlyContribution: number;
  deltaVsCurrentPlan: number;
  deltaLabel: string;
  needsAdjustment: boolean;
  targetJar: GoalBudgetJarId;
  jarName: string;
  jarShortName: string;
  recurrenceCategory: string;
  recurrenceDescription: string;
  linkedRecurrenceId: string | null;
  isSyncedWithBudget: boolean;
  cashFlowImpactPct: number;
  incomeSharePct: number;
  availableMonthlySurplus: number;
  isOverMonthlySurplus: boolean;
}

export interface CalculateGoalContributionOptions {
  availableMonthlySurplus?: number;
  effectiveIncomeBase?: number;
  recurringList?: RecurringExpense[];
  transactions?: Transaction[];
  referenceDate?: Date | string;
}

export interface ApplyGoalToBudgetInput {
  dream: DreamGoal;
  dreams: DreamGoal[];
  recurringList: RecurringExpense[];
  overrideAmount?: number;
  availableMonthlySurplus?: number;
  effectiveIncomeBase?: number;
  transactions?: Transaction[];
  referenceDate?: Date | string;
}

export interface ApplyGoalToBudgetResult {
  updatedDreams: DreamGoal[];
  updatedRecurringList: RecurringExpense[];
  appliedAmount: number;
  recurrence: RecurringExpense;
  actionType: 'created' | 'updated';
  suggestion: GoalContributionSuggestion;
  cashFlowImpactPct: number;
}

export interface ApplyAllGoalsToBudgetInput {
  dreams: DreamGoal[];
  recurringList: RecurringExpense[];
  availableMonthlySurplus?: number;
  effectiveIncomeBase?: number;
  transactions?: Transaction[];
  referenceDate?: Date | string;
}

export interface ApplyAllGoalsToBudgetResult {
  updatedDreams: DreamGoal[];
  updatedRecurringList: RecurringExpense[];
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  totalMonthlyCommitted: number;
  totalCashFlowImpactPct: number;
}

/**
 * Maps a DreamGoal to Liberdade Financeira (LIF_10) or Poupança de Longo Prazo (PLP_10).
 */
export function mapGoalToBudgetJar(
  category?: string,
  title?: string
): GoalBudgetJarMapping {
  const normalized = `${category || ''} ${title || ''}`.toLowerCase();
  if (
    normalized.includes('liberdade') ||
    normalized.includes('passiva') ||
    normalized.includes('independência') ||
    normalized.includes('independencia') ||
    normalized.includes('investimento') ||
    normalized.includes('carteira') ||
    normalized.includes('lif')
  ) {
    return {
      jar: 'LIF_10',
      jarName: 'Liberdade Financeira (LIF 10%)',
      jarShortName: 'Liberdade Financeira (10%)',
    };
  }

  return {
    jar: 'PLP_10',
    jarName: 'Poupança de Longo Prazo (PLP 10%)',
    jarShortName: 'Poupança Longo Prazo (10%)',
  };
}

/**
 * Resolves existing budget recurrence linked to a goal (strictly idempotent by goalId or deterministic ID).
 */
export function findLinkedGoalRecurrence(
  dreamId: string,
  recurringList: RecurringExpense[] = []
): RecurringExpense | undefined {
  const deterministicId = `rec-dream-${dreamId}`;
  return recurringList.find(
    item => item.goalId === dreamId || item.id === deterministicId
  );
}

/**
 * Resolves available monthly free cash flow surplus and income base.
 */
export function resolveMonthlyCashFlowContext(options?: {
  availableMonthlySurplus?: number;
  effectiveIncomeBase?: number;
  transactions?: Transaction[];
  recurringList?: RecurringExpense[];
}): { availableMonthlySurplus: number; effectiveIncomeBase: number } {
  if (
    options?.availableMonthlySurplus !== undefined &&
    Number.isFinite(options.availableMonthlySurplus)
  ) {
    return {
      availableMonthlySurplus: round2(Math.max(0, options.availableMonthlySurplus)),
      effectiveIncomeBase: round2(
        Math.max(0, options.effectiveIncomeBase ?? 0)
      ),
    };
  }

  if (options?.transactions && options.transactions.length > 0) {
    const estimate = estimateMonthlyFreeCashFlow(options.transactions, true);
    return {
      availableMonthlySurplus: estimate.estimatedSurplus,
      effectiveIncomeBase: round2(
        options.effectiveIncomeBase && options.effectiveIncomeBase > 0
          ? options.effectiveIncomeBase
          : estimate.effectiveIncomeBase
      ),
    };
  }

  // Derive fallback surplus from active recurrences if transactions are unavailable
  if (options?.recurringList && options.recurringList.length > 0) {
    let income = 0;
    let expense = 0;
    for (const r of options.recurringList) {
      if (!r.isActive) continue;
      const val = Math.abs(r.amountPlanned ?? r.amount ?? 0);
      if (r.type === 'receita' || r.type === 'reembolso') {
        income += val;
      } else {
        expense += val;
      }
    }
    return {
      availableMonthlySurplus: round2(Math.max(0, income - expense)),
      effectiveIncomeBase: round2(
        options.effectiveIncomeBase && options.effectiveIncomeBase > 0
          ? options.effectiveIncomeBase
          : income
      ),
    };
  }

  return {
    availableMonthlySurplus: 0,
    effectiveIncomeBase: round2(Math.max(0, options?.effectiveIncomeBase ?? 0)),
  };
}

/**
 * Computes required monthly contribution, plan delta, budget sync status,
 * and monthly free cash flow commitment percentage for a single Goal/Dream.
 */
export function calculateRequiredGoalContribution(
  dream: DreamGoal,
  options: CalculateGoalContributionOptions = {}
): GoalContributionSuggestion {
  const targetAmount = round2(Math.max(0, dream.target || 0));
  const currentAmount = round2(Math.max(0, dream.current || 0));
  const remainingAmount = round2(Math.max(0, targetAmount - currentAmount));
  const isCompleted = remainingAmount <= 0;

  const { remainingMonths: rawMonths, hasTargetDate, isPastDue } = diffInMonths(
    options.referenceDate,
    dream.targetDate
  );

  const monthsRemaining = isCompleted ? 0 : Math.max(1, rawMonths);
  const yieldRatePct = round2(Math.max(0, dream.yieldRateMonthlyPct ?? 0));

  const requiredMonthlyContribution = isCompleted
    ? 0
    : calculateIdealMonthlyContribution(
        targetAmount,
        currentAmount,
        monthsRemaining,
        yieldRatePct
      );

  const plannedMonthlyContribution = round2(Math.max(0, dream.monthlyDeposit || 0));
  const deltaVsCurrentPlan = round2(
    requiredMonthlyContribution - plannedMonthlyContribution
  );

  let deltaLabel: string;
  if (isCompleted) {
    deltaLabel = 'Meta concluída';
  } else if (Math.abs(deltaVsCurrentPlan) < 0.01) {
    deltaLabel = 'No ritmo exato';
  } else if (deltaVsCurrentPlan > 0) {
    deltaLabel = `+${formatBRL(deltaVsCurrentPlan)}/mês necessário`;
  } else {
    deltaLabel = `${formatBRL(Math.abs(deltaVsCurrentPlan))}/mês de folga`;
  }

  const needsAdjustment = !isCompleted && Math.abs(deltaVsCurrentPlan) >= 0.01;
  const jarMapping = mapGoalToBudgetJar(dream.category, dream.title);
  const recurrenceDescription = `Aporte Recorrente: ${dream.title}`;
  const recurrenceCategory = `Investimentos / Metas > ${dream.title}`;

  const linkedRecurrence = findLinkedGoalRecurrence(
    dream.id,
    options.recurringList || []
  );

  const isSyncedWithBudget = Boolean(
    !isCompleted &&
      requiredMonthlyContribution > 0 &&
      Math.abs(plannedMonthlyContribution - requiredMonthlyContribution) < 0.01 &&
      linkedRecurrence &&
      linkedRecurrence.isActive &&
      Math.abs(Math.abs(linkedRecurrence.amountPlanned ?? linkedRecurrence.amount) - requiredMonthlyContribution) < 0.01
  );

  const { availableMonthlySurplus, effectiveIncomeBase } = resolveMonthlyCashFlowContext({
    availableMonthlySurplus: options.availableMonthlySurplus,
    effectiveIncomeBase: options.effectiveIncomeBase,
    transactions: options.transactions,
    recurringList: options.recurringList,
  });

  const cashFlowImpactPct =
    requiredMonthlyContribution <= 0
      ? 0
      : availableMonthlySurplus > 0
      ? round2((requiredMonthlyContribution / availableMonthlySurplus) * 100)
      : 100;

  const incomeSharePct =
    requiredMonthlyContribution <= 0 || effectiveIncomeBase <= 0
      ? 0
      : round2((requiredMonthlyContribution / effectiveIncomeBase) * 100);

  const isOverMonthlySurplus =
    requiredMonthlyContribution > 0 &&
    (availableMonthlySurplus <= 0 || requiredMonthlyContribution > availableMonthlySurplus + 0.01);

  return {
    dreamId: dream.id,
    title: dream.title,
    targetAmount,
    currentAmount,
    remainingAmount,
    monthsRemaining,
    hasTargetDate,
    isPastDue,
    isCompleted,
    yieldRatePct,
    requiredMonthlyContribution,
    plannedMonthlyContribution,
    deltaVsCurrentPlan,
    deltaLabel,
    needsAdjustment,
    targetJar: jarMapping.jar,
    jarName: jarMapping.jarName,
    jarShortName: jarMapping.jarShortName,
    recurrenceCategory,
    recurrenceDescription,
    linkedRecurrenceId: linkedRecurrence?.id || null,
    isSyncedWithBudget,
    cashFlowImpactPct,
    incomeSharePct,
    availableMonthlySurplus,
    isOverMonthlySurplus,
  };
}

/**
 * Atomically updates both the Goal's plannedMonthlyContribution (monthlyDeposit)
 * and upserts (never duplicates) a monthly recurring commitment in `recurringList`.
 */
export function applyGoalToBudget({
  dream,
  dreams,
  recurringList,
  overrideAmount,
  availableMonthlySurplus,
  effectiveIncomeBase,
  transactions,
  referenceDate,
}: ApplyGoalToBudgetInput): ApplyGoalToBudgetResult {
  const suggestion = calculateRequiredGoalContribution(dream, {
    availableMonthlySurplus,
    effectiveIncomeBase,
    recurringList,
    transactions,
    referenceDate,
  });

  const appliedAmount = round2(
    Math.max(
      0,
      overrideAmount !== undefined && Number.isFinite(overrideAmount)
        ? overrideAmount
        : suggestion.requiredMonthlyContribution
    )
  );

  const updatedDreams = dreams.map(item =>
    item.id === dream.id
      ? { ...item, monthlyDeposit: appliedAmount }
      : item
  );

  const existingIdx = recurringList.findIndex(
    item => item.goalId === dream.id || item.id === `rec-dream-${dream.id}`
  );

  const existing = existingIdx >= 0 ? recurringList[existingIdx] : undefined;

  const upsertedRecurrence: RecurringExpense = {
    id: existing?.id || `rec-dream-${dream.id}`,
    goalId: dream.id,
    description: suggestion.recurrenceDescription,
    category: suggestion.recurrenceCategory,
    type: 'despesa',
    frequency: 'mensal',
    dayOfMonth: existing?.dayOfMonth ?? 10,
    jar: suggestion.targetJar,
    account: existing?.account || 'Inter PF',
    costCenter: existing?.costCenter || 'Magno',
    isActive: true,
    amount: -Math.abs(appliedAmount),
    amountPlanned: appliedAmount,
    amountRealized: existing?.amountRealized,
    notes: `Compromisso Mensal Fixo · Meta sincronizada (${suggestion.jarShortName})`,
  };

  let updatedRecurringList: RecurringExpense[];
  let actionType: 'created' | 'updated';

  if (existingIdx >= 0) {
    updatedRecurringList = recurringList.map((item, idx) =>
      idx === existingIdx ? upsertedRecurrence : item
    );
    actionType = 'updated';
  } else {
    updatedRecurringList = [...recurringList, upsertedRecurrence];
    actionType = 'created';
  }

  const nextSuggestion = calculateRequiredGoalContribution(
    { ...dream, monthlyDeposit: appliedAmount },
    {
      availableMonthlySurplus,
      effectiveIncomeBase,
      recurringList: updatedRecurringList,
      transactions,
      referenceDate,
    }
  );

  return {
    updatedDreams,
    updatedRecurringList,
    appliedAmount,
    recurrence: upsertedRecurrence,
    actionType,
    suggestion: nextSuggestion,
    cashFlowImpactPct: nextSuggestion.cashFlowImpactPct,
  };
}

/**
 * Applies required monthly contributions across all incomplete goals atomically,
 * creating/updating each goal's linked monthly recurrence without duplication.
 */
export function applyAllGoalsToBudget({
  dreams,
  recurringList,
  availableMonthlySurplus,
  effectiveIncomeBase,
  transactions,
  referenceDate,
}: ApplyAllGoalsToBudgetInput): ApplyAllGoalsToBudgetResult {
  let nextDreams = [...dreams];
  let nextRecurring = [...recurringList];
  let syncedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let totalMonthlyCommitted = 0;

  for (const dream of dreams) {
    if (dream.target <= dream.current) continue;

    const currentDream = nextDreams.find(d => d.id === dream.id) || dream;
    const res = applyGoalToBudget({
      dream: currentDream,
      dreams: nextDreams,
      recurringList: nextRecurring,
      availableMonthlySurplus,
      effectiveIncomeBase,
      transactions,
      referenceDate,
    });

    nextDreams = res.updatedDreams;
    nextRecurring = res.updatedRecurringList;
    syncedCount += 1;
    if (res.actionType === 'created') createdCount += 1;
    else updatedCount += 1;
    totalMonthlyCommitted = round2(totalMonthlyCommitted + res.appliedAmount);
  }

  const { availableMonthlySurplus: resolvedSurplus } = resolveMonthlyCashFlowContext({
    availableMonthlySurplus,
    effectiveIncomeBase,
    transactions,
    recurringList: nextRecurring,
  });

  const totalCashFlowImpactPct =
    totalMonthlyCommitted <= 0
      ? 0
      : resolvedSurplus > 0
      ? round2((totalMonthlyCommitted / resolvedSurplus) * 100)
      : 100;

  return {
    updatedDreams: nextDreams,
    updatedRecurringList: nextRecurring,
    syncedCount,
    createdCount,
    updatedCount,
    totalMonthlyCommitted,
    totalCashFlowImpactPct,
  };
}
