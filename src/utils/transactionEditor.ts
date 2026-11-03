import { Transaction, JarType, CostCenter, AccountType } from '../types';

export interface TransactionInput {
  id?: string;
  date: string;
  description: string;
  amount: number | string;
  type: 'receita' | 'despesa' | 'reembolso';
  jar: JarType;
  costCenter: CostCenter;
  account: AccountType;
  status: 'liquidado' | 'agendado';
  category?: string;
  notes?: string;
  reminderDaysBefore?: number | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    description?: string;
    amount?: string;
    date?: string;
  };
}

/**
 * Validates transaction form input before saving or editing.
 */
export function validateTransactionInput(input: {
  description?: string;
  amount?: number | string;
  date?: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  if (!input.description || !input.description.trim()) {
    errors.description = 'A descrição do lançamento é obrigatória.';
  }

  const numAmount = typeof input.amount === 'string' 
    ? parseFloat(input.amount.replace(',', '.')) 
    : (input.amount ?? NaN);

  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Informe um valor maior que zero.';
  }

  if (!input.date || !input.date.trim()) {
    errors.date = 'A data do lançamento é obrigatória.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())) {
    errors.date = 'Formato de data inválido. Use AAAA-MM-DD.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Normalizes transaction input, enforcing correct signs:
 * - 'despesa': negative amount (-Math.abs)
 * - 'receita' / 'reembolso': positive amount (+Math.abs)
 */
export function normalizeTransactionData(input: TransactionInput): Transaction {
  const rawNum = typeof input.amount === 'string' 
    ? parseFloat(input.amount.replace(',', '.')) 
    : input.amount;
  
  const absValue = Math.abs(isNaN(rawNum) ? 0 : rawNum);
  const finalAmount = input.type === 'despesa' ? -absValue : absValue;

  return {
    id: input.id && input.id.trim() ? input.id.trim() : `tx-${Date.now()}`,
    date: input.date.trim(),
    description: input.description.trim() || 'Lançamento sem descrição',
    amount: Math.round(finalAmount * 100) / 100,
    type: input.type,
    jar: input.jar,
    costCenter: input.costCenter,
    account: input.account,
    status: input.status,
    category: input.category?.trim() || 'Geral',
    notes: input.notes?.trim() || undefined,
    reminderDaysBefore: typeof input.reminderDaysBefore === 'number' && !isNaN(input.reminderDaysBefore) && input.reminderDaysBefore >= 0
      ? Math.floor(input.reminderDaysBefore)
      : undefined
  };
}

/**
 * Immutably updates a transaction in an existing list.
 * If the transaction does not exist, it appends it.
 */
export function updateTransactionInList(
  transactions: Transaction[],
  updatedTx: Transaction
): Transaction[] {
  let found = false;
  const updatedList = transactions.map(item => {
    if (item.id === updatedTx.id) {
      found = true;
      return {
        ...item,
        ...updatedTx
      };
    }
    return item;
  });

  if (!found) {
    return [updatedTx, ...transactions];
  }

  return updatedList;
}

/**
 * Immutably deletes a transaction from a list.
 */
export function deleteTransactionFromList(
  transactions: Transaction[],
  id: string
): Transaction[] {
  return transactions.filter(t => t.id !== id);
}

/**
 * Filters transactions by movement type ('entradas' | 'saidas' | 'reembolsos' | 'all')
 */
export function filterTransactionsByMovementType(
  transactions: Transaction[],
  movement: 'all' | 'entradas' | 'saidas' | 'reembolsos'
): Transaction[] {
  if (movement === 'all') return transactions;
  if (movement === 'entradas') return transactions.filter(t => t.type === 'receita');
  if (movement === 'saidas') return transactions.filter(t => t.type === 'despesa');
  if (movement === 'reembolsos') return transactions.filter(t => t.type === 'reembolso');
  return transactions;
}

/**
 * Updates or clears the notes of a specific transaction immutably.
 */
export function updateTransactionNotes(
  transactions: Transaction[],
  id: string,
  notes?: string
): Transaction[] {
  const trimmed = notes ? notes.trim() : '';
  return transactions.map(t => {
    if (t.id === id) {
      return {
        ...t,
        notes: trimmed ? trimmed : undefined
      };
    }
    return t;
  });
}

