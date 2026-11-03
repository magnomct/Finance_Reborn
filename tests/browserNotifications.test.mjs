import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  isExpenseWithin2DaysOfDue,
  isExpenseExactly2DaysBeforeDue,
  buildNativeNotificationPayload,
  filterPendingNativeNotifications
} from '../src/utils/browserNotifications.ts';

test('isExpenseWithin2DaysOfDue flags scheduled items within 0, 1, or 2 days of due date', () => {
  const txDueIn2Days = {
    id: 'tx-1',
    date: '2026-10-27',
    description: 'Fatura C6',
    amount: -600,
    type: 'despesa',
    status: 'agendado',
    account: 'C6'
  };

  const txDueIn1Day = {
    id: 'tx-2',
    date: '2026-10-26',
    description: 'Condomínio',
    amount: -450,
    type: 'despesa',
    status: 'agendado',
    account: 'Inter PF'
  };

  const txDueToday = {
    id: 'tx-3',
    date: '2026-10-25',
    description: 'Internet',
    amount: -120,
    type: 'despesa',
    status: 'agendado',
    account: 'Inter PF'
  };

  const txDueIn3Days = {
    id: 'tx-4',
    date: '2026-10-28',
    description: 'Financiamento',
    amount: -1290,
    type: 'despesa',
    status: 'agendado',
    account: 'Inter PF'
  };

  const txLiquidatedIn2Days = {
    id: 'tx-5',
    date: '2026-10-27',
    description: 'DAS Simples',
    amount: -172,
    type: 'despesa',
    status: 'liquidado',
    account: 'Inter PJ'
  };

  const refDate = '2026-10-25';

  assert.equal(isExpenseWithin2DaysOfDue(txDueIn2Days, refDate), true);
  assert.equal(isExpenseWithin2DaysOfDue(txDueIn1Day, refDate), true);
  assert.equal(isExpenseWithin2DaysOfDue(txDueToday, refDate), true);
  assert.equal(isExpenseWithin2DaysOfDue(txDueIn3Days, refDate), false);
  assert.equal(isExpenseWithin2DaysOfDue(txLiquidatedIn2Days, refDate), false);
});

test('isExpenseExactly2DaysBeforeDue targets only transactions due in exactly 2 days', () => {
  const refDate = '2026-10-25';

  const tx2Days = {
    id: 'tx-1',
    date: '2026-10-27',
    description: 'Fatura C6',
    amount: -600,
    type: 'despesa',
    status: 'agendado',
    account: 'C6'
  };

  const tx1Day = {
    id: 'tx-2',
    date: '2026-10-26',
    description: 'Condomínio',
    amount: -450,
    type: 'despesa',
    status: 'agendado',
    account: 'Inter PF'
  };

  assert.equal(isExpenseExactly2DaysBeforeDue(tx2Days, refDate), true);
  assert.equal(isExpenseExactly2DaysBeforeDue(tx1Day, refDate), false);
});

test('buildNativeNotificationPayload formats clear, descriptive alert content with unique tag', () => {
  const tx = {
    id: 'tx-bill-99',
    date: '2026-10-27',
    description: 'Plano de Saúde Familiar',
    amount: -850.50,
    type: 'despesa',
    status: 'agendado',
    account: 'Inter PF'
  };

  const payload = buildNativeNotificationPayload(tx, '2026-10-25');

  assert.equal(payload.title, '🔔 Vencimento Próximo: Plano de Saúde Familiar');
  assert.ok(payload.body.includes('850,50'));
  assert.ok(payload.body.includes('Vence em 2 dias!'));
  assert.ok(payload.body.includes('2026-10-27'));
  assert.ok(payload.body.includes('Inter PF'));
  assert.equal(payload.tag, 'yupee-due-alert-tx-bill-99-2026-10-27');
  assert.equal(payload.data.daysRemaining, 2);
  assert.equal(payload.data.transactionId, 'tx-bill-99');
});

test('filterPendingNativeNotifications prevents duplicate notifications using dispatched tags', () => {
  const transactions = [
    {
      id: 'tx-1',
      date: '2026-10-27', // 2 days
      description: 'Cartão C6',
      amount: -500,
      type: 'despesa',
      status: 'agendado',
      account: 'C6'
    },
    {
      id: 'tx-2',
      date: '2026-10-26', // 1 day
      description: 'Luz',
      amount: -120,
      type: 'despesa',
      status: 'agendado',
      account: 'Inter PF'
    },
    {
      id: 'tx-3',
      date: '2026-10-31', // 6 days -> not within 2 days
      description: 'Aluguel',
      amount: -1500,
      type: 'despesa',
      status: 'agendado',
      account: 'Inter PF'
    }
  ];

  // Initially neither tx-1 nor tx-2 have been dispatched
  const pendingInitial = filterPendingNativeNotifications(transactions, new Set(), '2026-10-25');
  assert.equal(pendingInitial.length, 2);
  assert.equal(pendingInitial[0].transaction.id, 'tx-1');
  assert.equal(pendingInitial[1].transaction.id, 'tx-2');

  // After tx-1 is dispatched, only tx-2 is returned
  const alreadyDispatched = new Set(['yupee-due-alert-tx-1-2026-10-27']);
  const pendingSubsequent = filterPendingNativeNotifications(transactions, alreadyDispatched, '2026-10-25');
  assert.equal(pendingSubsequent.length, 1);
  assert.equal(pendingSubsequent[0].transaction.id, 'tx-2');
});
