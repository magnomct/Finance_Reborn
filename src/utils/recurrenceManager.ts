import { Transaction, RecurringExpense, RecurrenceFrequency } from '../types';

export type RecurrenceOption = 'nenhuma' | RecurrenceFrequency;

export interface RecurrenceConfig {
  id: RecurrenceOption;
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const RECURRENCE_CONFIGS: Record<RecurrenceOption, RecurrenceConfig> = {
  nenhuma: {
    id: 'nenhuma',
    label: 'Não recorrente (Lançamento único)',
    shortLabel: 'Única',
    description: 'Despesa pontual sem repetição automática nos próximos ciclos.',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-500 dark:text-slate-400',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  },
  diaria: {
    id: 'diaria',
    label: 'Diária (Todos os dias)',
    shortLabel: 'Diária',
    description: 'Repete diariamente (ideal para alimentação diária, condução, cafezinho).',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
  },
  semanal: {
    id: 'semanal',
    label: 'Semanal (1x por semana)',
    shortLabel: 'Semanal',
    description: 'Repete semanalmente no mesmo dia da semana (ex: feira, condução semanal).',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/80',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
  },
  quinzenal: {
    id: 'quinzenal',
    label: 'Quinzenal (A cada 15 dias)',
    shortLabel: 'Quinzenal',
    description: 'Repete a cada 15 dias ou 2x no mês (ex: adiantamentos, vales).',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
  },
  mensal: {
    id: 'mensal',
    label: 'Mensal (1x por mês)',
    shortLabel: 'Mensal',
    description: 'Repete todo mês no mesmo dia (ex: aluguel, condomínio, luz, internet).',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/80',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800',
  },
};

export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  'nenhuma',
  'diaria',
  'semanal',
  'quinzenal',
  'mensal',
];

/**
 * Determines current recurrence frequency for a transaction
 */
export function getTransactionRecurrence(tx: Transaction): RecurrenceOption {
  if (!tx.isRecurring) {
    return 'nenhuma';
  }
  if (tx.recurrenceFrequency) {
    return tx.recurrenceFrequency;
  }
  // Fallback for pre-existing isRecurring items: default to mensal
  return 'mensal';
}

/**
 * Returns the presentation config for a given transaction's recurrence
 */
export function getRecurrenceConfig(option: RecurrenceOption): RecurrenceConfig {
  return RECURRENCE_CONFIGS[option] || RECURRENCE_CONFIGS.nenhuma;
}

/**
 * Updates a transaction with new recurrence settings
 */
export function updateTransactionRecurrence(
  tx: Transaction,
  option: RecurrenceOption
): Transaction {
  if (option === 'nenhuma') {
    return {
      ...tx,
      isRecurring: false,
      recurrenceFrequency: undefined,
    };
  }

  return {
    ...tx,
    isRecurring: true,
    recurrenceFrequency: option,
  };
}

/**
 * Immutably updates the recurrence of a specific transaction in a list
 */
export function applyRecurrenceToTransactionList(
  transactions: Transaction[],
  txId: string,
  option: RecurrenceOption
): Transaction[] {
  return transactions.map((t) => (t.id === txId ? updateTransactionRecurrence(t, option) : t));
}

/**
 * Synchronizes the transaction recurrence with the master recurring list (Controle Automático)
 */
export function syncRecurringListWithTransaction(
  recurringList: RecurringExpense[],
  tx: Transaction,
  option: RecurrenceOption
): RecurringExpense[] {
  const day = parseInt(tx.date.split('-')[2] || '10', 10);
  const cleanDay = isNaN(day) || day < 1 || day > 31 ? 10 : day;
  const absAmount = Math.abs(tx.amount);

  if (option === 'nenhuma') {
    // If setting to none, deactivate any associated recurring item
    return recurringList.map((rec) => {
      if (
        (tx.recurringId && rec.id === tx.recurringId) ||
        (rec.description.toLowerCase().trim() === tx.description.toLowerCase().trim() &&
          rec.type === tx.type)
      ) {
        return { ...rec, isActive: false };
      }
      return rec;
    });
  }

  // Check if an existing recurring item matches
  const existingIndex = recurringList.findIndex(
    (rec) =>
      (tx.recurringId && rec.id === tx.recurringId) ||
      (rec.description.toLowerCase().trim() === tx.description.toLowerCase().trim() &&
        rec.type === tx.type)
  );

  if (existingIndex >= 0) {
    return recurringList.map((rec, idx) => {
      if (idx === existingIndex) {
        return {
          ...rec,
          frequency: option,
          amount: absAmount,
          amountPlanned: rec.amountPlanned || absAmount,
          amountRealized: absAmount,
          dayOfMonth: cleanDay,
          jar: tx.jar,
          account: tx.account,
          costCenter: tx.costCenter,
          category: tx.category || rec.category,
          isActive: true,
        };
      }
      return rec;
    });
  }

  // Create a new recurring item
  const newRec: RecurringExpense = {
    id: `rec-auto-${Date.now()}`,
    description: tx.description,
    amount: absAmount,
    amountPlanned: tx.amountPlanned ? Math.abs(tx.amountPlanned) : absAmount,
    amountRealized: absAmount,
    type: tx.type,
    frequency: option,
    dayOfMonth: cleanDay,
    jar: tx.jar,
    account: tx.account,
    costCenter: tx.costCenter,
    isActive: true,
    category: tx.category || 'Geral',
    notes: `Criado via Agenda Diária (${RECURRENCE_CONFIGS[option].label})`,
  };

  return [...recurringList, newRec];
}
