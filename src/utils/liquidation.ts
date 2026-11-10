import { Transaction, PaymentMethodType } from '../types';

export const PAYMENT_METHOD_OPTIONS: {
  id: PaymentMethodType;
  label: string;
  description: string;
  colorHex: string;
  badgeClass: string;
}[] = [
  {
    id: 'Dinheiro',
    label: 'Dinheiro',
    description: 'Pagamento em espécie / dinheiro físico',
    colorHex: '#10B981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    id: 'Cartão de Crédito',
    label: 'Cartão de Crédito',
    description: 'Débito na fatura (ex: C6, Nubank, etc.)',
    colorHex: '#8B5CF6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800'
  },
  {
    id: 'Conta Corrente',
    label: 'Conta Corrente',
    description: 'Débito em conta, PIX ou TED bancário',
    colorHex: '#0EA5E9',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800'
  }
];

/**
 * Liquidates an agendado transaction and assigns the selected payment method.
 * Updates account appropriately:
 * - 'Cartão de Crédito': switches account to 'C6' (or preserves existing card account)
 * - 'Conta Corrente': switches account to 'Inter PF' / 'Inter PJ' (or preserves checking account)
 * - 'Dinheiro': switches account to 'Dinheiro'
 */
export function liquidateTransaction(
  transaction: Transaction,
  paymentMethod: PaymentMethodType
): Transaction {
  let targetAccount = transaction.account;

  if (paymentMethod === 'Cartão de Crédito') {
    const isCard = ['C6', 'NUBANK', 'CARTÃO', 'NEXT', 'CARREFOUR', 'MAGALU'].some(c =>
      (targetAccount || '').toUpperCase().includes(c)
    );
    if (!isCard) {
      targetAccount = 'C6';
    }
  } else if (paymentMethod === 'Dinheiro') {
    targetAccount = 'Dinheiro';
  } else if (paymentMethod === 'Conta Corrente') {
    const isCard = ['C6', 'NUBANK', 'CARTÃO', 'NEXT', 'CARREFOUR', 'MAGALU'].some(c =>
      (targetAccount || '').toUpperCase().includes(c)
    );
    if (isCard) {
      targetAccount = transaction.costCenter === 'PJ' ? 'Inter PJ' : 'Inter PF';
    }
  }

  return {
    ...transaction,
    status: 'liquidado',
    paymentMethod,
    account: targetAccount
  };
}

export function applyTransactionLiquidation(
  transactions: Transaction[],
  id: string,
  paymentMethod: PaymentMethodType
): Transaction[] {
  return transactions.map(t => {
    if (t.id === id) {
      return liquidateTransaction(t, paymentMethod);
    }
    return t;
  });
}
