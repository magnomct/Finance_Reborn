import { Transaction, JarType, JarBudgetAlert, BudgetAlertStatus } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export const DEFAULT_JAR_LIMITS: Record<JarType, number> = {
  NEC_55: 2000,
  DIV_10: 350,
  PLP_10: 360,
  LIF_10: 360,
  EDU_10: 360,
  FER_5: 180,
  PJ_EXCLUIDO: 600,
};

const STORAGE_KEY = 'yupee_budget_jar_limits';

/**
 * Loads custom limits from localStorage, falling back to default limits
 */
export function loadJarLimits(): Record<JarType, number> {
  if (typeof window === 'undefined') return { ...DEFAULT_JAR_LIMITS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_JAR_LIMITS, ...parsed };
    }
  } catch (err) {
    console.warn('Erro ao carregar limites de potes do localStorage:', err);
  }
  return { ...DEFAULT_JAR_LIMITS };
}

/**
 * Saves custom limits to localStorage
 */
export function saveJarLimits(limits: Record<JarType, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limits));
  } catch (err) {
    console.warn('Erro ao salvar limites de potes no localStorage:', err);
  }
}

/**
 * Calculates net spending for a specific jar (expenses minus refunds)
 */
export function calculateJarExpense(transactions: Transaction[], jarId: JarType): number {
  const expenses = transactions
    .filter(t => t.jar === jarId && t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const refunds = transactions
    .filter(t => t.jar === jarId && t.type === 'reembolso')
    .reduce((acc, t) => acc + t.amount, 0);

  return Math.max(0, expenses - refunds);
}

/**
 * Evaluates budget alerts for all jars against user-defined maximum limits
 */
export function calculateJarBudgetAlerts(
  transactions: Transaction[],
  limits: Record<JarType, number>
): JarBudgetAlert[] {
  const jarKeys: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'];

  const alerts: JarBudgetAlert[] = jarKeys.map(key => {
    const def = JAR_DEFINITIONS[key] || { name: key, shortName: key, colorHex: '#3b82f6' };
    const limit = limits[key] !== undefined && limits[key] > 0 ? limits[key] : DEFAULT_JAR_LIMITS[key];
    const spent = calculateJarExpense(transactions, key);
    const remaining = limit - spent;
    const rawUsage = limit > 0 ? (spent / limit) * 100 : 0;
    const usagePercent = Math.round(rawUsage * 10) / 10;
    const threshold80 = limit * 0.8;

    let status: BudgetAlertStatus = 'OK';
    if (usagePercent > 100) {
      status = 'EXCEEDED';
    } else if (usagePercent >= 80) {
      status = 'WARNING';
    }

    return {
      jarId: key,
      jarName: def.name,
      shortName: def.shortName,
      colorHex: def.colorHex,
      limit,
      spent,
      remaining,
      usagePercent,
      threshold80,
      status,
    };
  });

  // Sort: EXCEEDED first, then WARNING, then highest usage
  return alerts.sort((a, b) => {
    const statusWeight = (s: BudgetAlertStatus) => (s === 'EXCEEDED' ? 3 : s === 'WARNING' ? 2 : 1);
    const weightDiff = statusWeight(b.status) - statusWeight(a.status);
    if (weightDiff !== 0) return weightDiff;
    return b.usagePercent - a.usagePercent;
  });
}

/**
 * Recommends limits for all jars based on the user's monthly income
 */
export function suggestLimitsFromIncome(effectiveIncomeBase: number): Record<JarType, number> {
  const base = effectiveIncomeBase > 0 ? effectiveIncomeBase : 3652.31;
  return {
    NEC_55: Math.round(base * 0.55),
    DIV_10: Math.round(base * 0.10),
    PLP_10: Math.round(base * 0.10),
    LIF_10: Math.round(base * 0.10),
    EDU_10: Math.round(base * 0.10),
    FER_5: Math.round(base * 0.05),
    PJ_EXCLUIDO: Math.round(base * 0.15),
  };
}
