import { Transaction, JarType, JarInfo } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { calculateJarExpense, DEFAULT_JAR_LIMITS, DEFAULT_JAR_SAVINGS_TARGETS } from './budgetAlerts';

export interface JarSavingsGoalItem {
  jarId: JarType;
  name: string;
  shortName: string;
  desc: string;
  pctOfIncome: number;
  colorHex: string;
  iconName: string;
  budgetCap: number; // Teto orçado ou limite configurado
  spent: number; // Gasto líquido no mês (despesas - reembolsos)
  currentSavings: number; // Saldo poupado = max(0, budgetCap - spent)
  savingsTarget: number; // Meta específica definida pelo usuário em R$
  targetProgressPct: number; // (currentSavings / savingsTarget) * 100 (% de alcance da meta do pote)
  isTargetReached: boolean;
  remainingToTarget: number; // max(0, savingsTarget - currentSavings)
  shareOfTotalMonthlySavingsPct: number; // (currentSavings / totalMonthlySavings) * 100 (% em relação ao total economizado mensalmente)
  targetShareOfTotalSavingsPct: number; // (savingsTarget / totalSavingsTargets) * 100
}

export interface JarSavingsGoalsSummary {
  items: JarSavingsGoalItem[];
  totalMonthlySavings: number; // Total real economizado no mês em todos os potes
  totalSavingsTargets: number; // Soma de todas as metas definidas
  overallTargetProgressPct: number; // (totalMonthlySavings / totalSavingsTargets) * 100
  effectiveIncomeBase: number;
  bestPerformingJar: JarSavingsGoalItem;
  jarsMeetingTargetCount: number;
  surplusTotal: number; // totalMonthlySavings - totalSavingsTargets
}

export const MAIN_6_JARS: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'];

/**
 * Calculates percentage share safely avoiding division by zero or NaN.
 */
export function calculateJarShareOfTotalSavings(jarSavings: number, totalSavings: number): number {
  if (totalSavings <= 0 || jarSavings <= 0) return 0;
  return Math.round((jarSavings / totalSavings) * 1000) / 10;
}

/**
 * Generates smart suggestions for each jar's monthly savings target based on income.
 */
export function suggestJarSavingsTargets(effectiveIncomeBase: number): Record<JarType, number> {
  const base = effectiveIncomeBase > 0 ? effectiveIncomeBase : 3652.31;
  return {
    NEC_55: Math.round(base * 0.05), // 5% residual
    DIV_10: Math.round(base * 0.03), // 3% sobra lazer
    PLP_10: Math.round(base * 0.10), // 10% aporte integral reserva/longo prazo
    LIF_10: Math.round(base * 0.05), // 5% aporte liberdade financeira
    EDU_10: Math.round(base * 0.05), // 5% capacitação
    FER_5: Math.round(base * 0.03),  // 3% descanso / doações
    PJ_EXCLUIDO: 0,
  };
}

/**
 * Computes complete analysis of jar savings goals and relative contribution to monthly total savings.
 */
export function calculateJarSavingsGoalsSummary(params: {
  transactions: Transaction[];
  limits?: Record<JarType, number>;
  targets?: Record<JarType, number>;
  effectiveIncomeBase?: number;
  jarBudgets?: Record<JarType, number>;
}): JarSavingsGoalsSummary {
  const {
    transactions = [],
    limits = DEFAULT_JAR_LIMITS,
    targets = DEFAULT_JAR_SAVINGS_TARGETS,
    effectiveIncomeBase = 3652.31,
    jarBudgets
  } = params;

  // First pass: compute spending, cap, and savings for each jar
  const rawItems = MAIN_6_JARS.map((key) => {
    const def = JAR_DEFINITIONS[key] || {
      id: key,
      name: key,
      shortName: key,
      desc: '',
      pct: 0.1,
      colorHex: '#3b82f6',
      iconName: 'Home'
    };

    const budgetCap = limits[key] !== undefined && limits[key] > 0
      ? limits[key]
      : (jarBudgets && jarBudgets[key] !== undefined && jarBudgets[key] > 0
          ? jarBudgets[key]
          : Math.round(effectiveIncomeBase * def.pct));

    const spent = calculateJarExpense(transactions, key);
    const currentSavings = Math.max(0, budgetCap - spent);
    const savingsTarget = targets[key] !== undefined ? Math.max(0, targets[key]) : (DEFAULT_JAR_SAVINGS_TARGETS[key] || 0);

    const targetProgressPct = savingsTarget > 0
      ? Math.round((currentSavings / savingsTarget) * 1000) / 10
      : (currentSavings > 0 ? 100 : 0);

    const isTargetReached = savingsTarget > 0 ? currentSavings >= savingsTarget : true;
    const remainingToTarget = Math.max(0, savingsTarget - currentSavings);

    return {
      jarId: key,
      name: def.name,
      shortName: def.shortName,
      desc: def.desc,
      pctOfIncome: def.pct,
      colorHex: def.colorHex,
      iconName: def.iconName,
      budgetCap,
      spent,
      currentSavings,
      savingsTarget,
      targetProgressPct,
      isTargetReached,
      remainingToTarget
    };
  });

  const totalMonthlySavings = rawItems.reduce((sum, item) => sum + item.currentSavings, 0);
  const totalSavingsTargets = rawItems.reduce((sum, item) => sum + item.savingsTarget, 0);

  // Second pass: compute share of total monthly savings for each jar
  const items: JarSavingsGoalItem[] = rawItems.map((item) => {
    const shareOfTotalMonthlySavingsPct = calculateJarShareOfTotalSavings(item.currentSavings, totalMonthlySavings);
    const targetShareOfTotalSavingsPct = calculateJarShareOfTotalSavings(item.savingsTarget, totalSavingsTargets);

    return {
      ...item,
      shareOfTotalMonthlySavingsPct,
      targetShareOfTotalSavingsPct
    };
  });

  const overallTargetProgressPct = totalSavingsTargets > 0
    ? Math.round((totalMonthlySavings / totalSavingsTargets) * 1000) / 10
    : (totalMonthlySavings > 0 ? 100 : 0);

  let bestPerformingJar = items[0];
  items.forEach((item) => {
    if (item.targetProgressPct > bestPerformingJar.targetProgressPct) {
      bestPerformingJar = item;
    }
  });

  const jarsMeetingTargetCount = items.filter((i) => i.isTargetReached).length;
  const surplusTotal = totalMonthlySavings - totalSavingsTargets;

  return {
    items,
    totalMonthlySavings,
    totalSavingsTargets,
    overallTargetProgressPct,
    effectiveIncomeBase,
    bestPerformingJar,
    jarsMeetingTargetCount,
    surplusTotal
  };
}
