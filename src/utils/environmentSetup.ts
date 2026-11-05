import { Transaction, DreamGoal, RecurringExpense, AutoCategoryRule, JarType, AccountType, CostCenter } from '../types';
import { DEFAULT_JAR_LIMITS } from './budgetAlerts';

export interface EnvironmentWizardConfig {
  mode: 'custom_wizard' | 'blank';
  userName?: string;
  scope?: 'PF' | 'PJ' | 'CONSOLIDADO';
  accountName?: string;
  initialBalance?: number;
  monthlyIncome?: number;
  incomeDescription?: string;
  incomeDay?: number;
  reserveInitialBalance?: number;
  reserveTargetMonths?: number;
  createEmergencyGoal?: boolean;
  jarPercentages?: Partial<Record<JarType, number>>;
  customJarLimits?: Partial<Record<JarType, number>>;
  firstGoalTitle?: string;
  firstGoalTarget?: number;
  referenceDate?: string;
}

export interface EnvironmentSetupOutput {
  transactions: Transaction[];
  recurringList: RecurringExpense[];
  dreams: DreamGoal[];
  autoRules: AutoCategoryRule[];
  jarLimits: Record<JarType, number>;
  reserveBalance: number;
  reserveTargetMonths: number;
}

export const DEFAULT_JAR_PERCENTAGES: Record<JarType, number> = {
  NEC_55: 0.55,
  DIV_10: 0.10,
  PLP_10: 0.10,
  LIF_10: 0.10,
  EDU_10: 0.10,
  FER_5: 0.05,
  PJ_EXCLUIDO: 0.0,
};

/**
 * Calculates BRL spending limits for each jar based on monthly net income and allocation percentages.
 */
export function calculateJarLimitsFromIncome(
  monthlyIncome: number,
  customPercentages?: Partial<Record<JarType, number>>
): Record<JarType, number> {
  const pcts = { ...DEFAULT_JAR_PERCENTAGES, ...customPercentages };

  if (monthlyIncome <= 0) {
    return { ...DEFAULT_JAR_LIMITS };
  }

  const roundToTens = (num: number) => Math.round(num / 10) * 10;

  return {
    NEC_55: roundToTens(monthlyIncome * (pcts.NEC_55 ?? 0.55)),
    DIV_10: roundToTens(monthlyIncome * (pcts.DIV_10 ?? 0.10)),
    PLP_10: roundToTens(monthlyIncome * (pcts.PLP_10 ?? 0.10)),
    LIF_10: roundToTens(monthlyIncome * (pcts.LIF_10 ?? 0.10)),
    EDU_10: roundToTens(monthlyIncome * (pcts.EDU_10 ?? 0.10)),
    FER_5: roundToTens(monthlyIncome * (pcts.FER_5 ?? 0.05)),
    PJ_EXCLUIDO: roundToTens(monthlyIncome * 0.10), // fallback allocation for business tax/buffer if PJ is active
  };
}

/**
 * Generates initial environment entities (transactions, recurring, goals, limits) based on configuration.
 */
export function buildFreshEnvironment(config: EnvironmentWizardConfig): EnvironmentSetupOutput {
  const refDate = config.referenceDate || new Date().toISOString().slice(0, 10);
  const userCostCenter: CostCenter = config.scope === 'PJ' ? 'PJ' : 'Magno';
  const userAccount: AccountType = (config.accountName as AccountType) || (config.scope === 'PJ' ? 'Inter PJ' : 'Inter PF');

  if (config.mode === 'blank') {
    return {
      transactions: [],
      recurringList: [],
      dreams: [],
      autoRules: [],
      jarLimits: { ...DEFAULT_JAR_LIMITS },
      reserveBalance: 0,
      reserveTargetMonths: 6,
    };
  }

  const transactions: Transaction[] = [];
  const recurringList: RecurringExpense[] = [];
  const dreams: DreamGoal[] = [];

  const initialBalance = config.initialBalance ?? 0;
  if (initialBalance > 0) {
    transactions.push({
      id: `init-balance-${Date.now()}`,
      date: refDate,
      description: 'Saldo Inicial de Caixa / Abertura de Conta',
      amount: initialBalance,
      amountPlanned: initialBalance,
      amountRealized: initialBalance,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
      status: 'liquidado',
      category: 'Saldo Inicial',
      notes: 'Saldo de partida configurado no assistente inicial',
    });
  }

  const monthlyIncome = config.monthlyIncome ?? 0;
  if (monthlyIncome > 0) {
    const incomeDesc = config.incomeDescription?.trim() || 'Renda Principal / Pró-labore';
    const day = String(Math.min(Math.max(config.incomeDay || 5, 1), 28)).padStart(2, '0');
    const incomeDate = `${refDate.slice(0, 8)}${day}`;

    // Add current month realized/scheduled income transaction
    transactions.push({
      id: `income-init-${Date.now()}`,
      date: incomeDate,
      description: incomeDesc,
      amount: monthlyIncome,
      amountPlanned: monthlyIncome,
      amountRealized: monthlyIncome,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
      status: incomeDate <= refDate ? 'liquidado' : 'agendado',
      category: 'Salário / Renda',
      isRecurring: true,
      notes: 'Renda mensal base configurada',
    });

    // Add recurrence item
    recurringList.push({
      id: `rec-income-${Date.now()}`,
      description: incomeDesc,
      amount: monthlyIncome,
      amountPlanned: monthlyIncome,
      amountRealized: monthlyIncome,
      type: 'receita',
      dayOfMonth: config.incomeDay || 5,
      frequency: 'mensal',
      category: 'Salário / Renda',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
      isActive: true,
    });
  }

  // Calculate customized Jar Limits
  const calculatedLimits = calculateJarLimitsFromIncome(monthlyIncome, config.jarPercentages);
  const finalJarLimits = { ...calculatedLimits, ...config.customJarLimits };

  // Emergency Reserve setup
  const reserveBalance = config.reserveInitialBalance ?? 0;
  const reserveTargetMonths = config.reserveTargetMonths ?? 6;
  const estimatedMonthlyLivingCost = monthlyIncome > 0 ? (finalJarLimits.NEC_55 || monthlyIncome * 0.55) : 2000;
  const reserveTargetAmount = estimatedMonthlyLivingCost * reserveTargetMonths;

  if (config.createEmergencyGoal !== false) {
    dreams.push({
      id: `dream-reserve-${Date.now()}`,
      title: 'Reserva de Emergência',
      target: reserveTargetAmount,
      current: reserveBalance,
      monthlyDeposit: monthlyIncome > 0 ? Math.max(Math.round(monthlyIncome * 0.10), 100) : 300,
      category: 'Segurança & Família',
      impact: `${reserveTargetMonths} meses de custo de vida essencial coberto`,
      urgencyDaysThreshold: 60,
      iconName: 'Shield',
      gradient: 'from-blue-600 to-indigo-600',
    });
  }

  // Custom secondary goal if provided
  if (config.firstGoalTitle && config.firstGoalTarget && config.firstGoalTarget > 0) {
    dreams.push({
      id: `dream-custom-${Date.now() + 1}`,
      title: config.firstGoalTitle.trim(),
      target: config.firstGoalTarget,
      current: 0,
      monthlyDeposit: monthlyIncome > 0 ? Math.max(Math.round(monthlyIncome * 0.05), 50) : 150,
      category: 'Conquistas Pessoais',
      impact: 'Objetivo de médio prazo definido no onboarding',
      urgencyDaysThreshold: 90,
      iconName: 'Target',
      gradient: 'from-emerald-600 to-teal-600',
    });
  }

  // Basic categorization rules
  const autoRules: AutoCategoryRule[] = [
    {
      id: 'rule-salario',
      keyword: 'salario',
      category: 'Salário / Renda',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
    },
    {
      id: 'rule-mercado',
      keyword: 'mercado',
      category: 'Alimentação',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
    },
    {
      id: 'rule-moradia',
      keyword: 'aluguel',
      category: 'Habitação',
      jar: 'NEC_55',
      costCenter: userCostCenter,
      account: userAccount,
    },
    {
      id: 'rule-lazer',
      keyword: 'restaurante',
      category: 'Lazer',
      jar: 'DIV_10',
      costCenter: userCostCenter,
      account: userAccount,
    },
  ];

  return {
    transactions,
    recurringList,
    dreams,
    autoRules,
    jarLimits: finalJarLimits,
    reserveBalance,
    reserveTargetMonths,
  };
}

/**
 * List of all local storage keys used across the Yupee application.
 */
export const ALL_YUPPEE_STORAGE_KEYS = [
  'yupee_transactions_v2',
  'yupee_recurring_v3',
  'yupee_dreams_v2',
  'yupee_rules_v2',
  'yupee_dispatched_notification_tags',
  'yupee_budget_jar_limits',
  'yupee_emergency_reserve_balance',
  'yupee_emergency_reserve_target_months',
  'yupee_annual_category_budgets_v1',
  'yupee_read_article_ids',
  'yupee_bookmarked_article_ids',
  'yupee_last_tip_v2',
  'yupee_offline_sync_queue_v1',
];

/**
 * Clears all application storage keys safely.
 */
export function purgeAllApplicationStorage(): void {
  if (typeof window === 'undefined') return;

  ALL_YUPPEE_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Erro ao remover chave ${key}:`, e);
    }
  });

  // Also remove dynamic monthly checklist keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('yupee_dream_checklist_')) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('Erro ao limpar chaves dinâmicas do checklist:', err);
  }
}

/**
 * Persists a freshly configured environment directly to localStorage.
 */
export function persistFreshEnvironment(env: EnvironmentSetupOutput): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('yupee_transactions_v2', JSON.stringify(env.transactions));
    localStorage.setItem('yupee_recurring_v3', JSON.stringify(env.recurringList));
    localStorage.setItem('yupee_dreams_v2', JSON.stringify(env.dreams));
    localStorage.setItem('yupee_rules_v2', JSON.stringify(env.autoRules));
    localStorage.setItem('yupee_budget_jar_limits', JSON.stringify(env.jarLimits));
    localStorage.setItem('yupee_emergency_reserve_balance', env.reserveBalance.toString());
    localStorage.setItem('yupee_emergency_reserve_target_months', env.reserveTargetMonths.toString());
    localStorage.setItem('yupee_dispatched_notification_tags', JSON.stringify([]));
  } catch (e) {
    console.error('Erro ao salvar novo ambiente no localStorage:', e);
  }
}
