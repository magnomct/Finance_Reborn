import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECURRENCE_OPTIONS,
  RECURRENCE_CONFIGS,
  getTransactionRecurrence,
  getRecurrenceConfig,
  updateTransactionRecurrence,
  applyRecurrenceToTransactionList,
  syncRecurringListWithTransaction,
} from '../src/utils/recurrenceManager.ts';

test('Recurrence Manager: options and configs', () => {
  assert.deepEqual(RECURRENCE_OPTIONS, ['nenhuma', 'diaria', 'semanal', 'quinzenal', 'mensal']);
  assert.ok(RECURRENCE_CONFIGS.diaria);
  assert.ok(RECURRENCE_CONFIGS.semanal);
  assert.ok(RECURRENCE_CONFIGS.quinzenal);
  assert.ok(RECURRENCE_CONFIGS.mensal);
  assert.ok(RECURRENCE_CONFIGS.nenhuma);
});

test('getTransactionRecurrence: resolves correctly for varied transactions', () => {
  const tx1 = { id: '1', isRecurring: false };
  assert.equal(getTransactionRecurrence(tx1), 'nenhuma');

  const tx2 = { id: '2', isRecurring: true, recurrenceFrequency: 'semanal' };
  assert.equal(getTransactionRecurrence(tx2), 'semanal');

  const tx3 = { id: '3', isRecurring: true }; // legacy without explicit recurrenceFrequency
  assert.equal(getTransactionRecurrence(tx3), 'mensal');

  const tx4 = { id: '4', isRecurring: true, recurrenceFrequency: 'diaria' };
  assert.equal(getTransactionRecurrence(tx4), 'diaria');
});

test('updateTransactionRecurrence: updates to recurrent or single', () => {
  const baseTx = {
    id: 'tx-1',
    description: 'Mercado Semanal',
    amount: -300,
    date: '2026-10-15',
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'agendado',
  };

  const updatedWeekly = updateTransactionRecurrence(baseTx, 'semanal');
  assert.equal(updatedWeekly.isRecurring, true);
  assert.equal(updatedWeekly.recurrenceFrequency, 'semanal');

  const updatedDaily = updateTransactionRecurrence(updatedWeekly, 'diaria');
  assert.equal(updatedDaily.isRecurring, true);
  assert.equal(updatedDaily.recurrenceFrequency, 'diaria');

  const updatedNone = updateTransactionRecurrence(updatedDaily, 'nenhuma');
  assert.equal(updatedNone.isRecurring, false);
  assert.equal(updatedNone.recurrenceFrequency, undefined);
});

test('applyRecurrenceToTransactionList: immutably updates list of transactions', () => {
  const list = [
    { id: 'tx-1', description: 'Item 1', isRecurring: false },
    { id: 'tx-2', description: 'Item 2', isRecurring: false },
  ];

  const result = applyRecurrenceToTransactionList(list, 'tx-2', 'mensal');
  assert.equal(result.length, 2);
  assert.equal(result[0].isRecurring, false);
  assert.equal(result[1].isRecurring, true);
  assert.equal(result[1].recurrenceFrequency, 'mensal');
  // Original is untouched
  assert.equal(list[1].isRecurring, false);
});

test('syncRecurringListWithTransaction: deactivates recurring item when option is nenhuma', () => {
  const recurringList = [
    {
      id: 'rec-1',
      description: 'Condomínio',
      amount: 400,
      type: 'despesa',
      frequency: 'mensal',
      isActive: true,
    },
  ];

  const tx = {
    id: 'tx-condo',
    recurringId: 'rec-1',
    description: 'Condomínio',
    amount: -400,
    date: '2026-10-10',
    type: 'despesa',
  };

  const synced = syncRecurringListWithTransaction(recurringList, tx, 'nenhuma');
  assert.equal(synced.length, 1);
  assert.equal(synced[0].isActive, false);
});

test('syncRecurringListWithTransaction: updates existing recurring item or adds new one', () => {
  const initialRecurring = [
    {
      id: 'rec-1',
      description: 'Internet Fibra',
      amount: 120,
      type: 'despesa',
      frequency: 'mensal',
      isActive: true,
    },
  ];

  // 1. Update existing by description
  const txExisting = {
    id: 'tx-net',
    description: 'Internet Fibra',
    amount: -130,
    date: '2026-10-20',
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'C6',
  };

  const updatedList = syncRecurringListWithTransaction(initialRecurring, txExisting, 'semanal');
  assert.equal(updatedList.length, 1);
  assert.equal(updatedList[0].frequency, 'semanal');
  assert.equal(updatedList[0].amount, 130);
  assert.equal(updatedList[0].dayOfMonth, 20);

  // 2. Add brand new recurring expense
  const txNew = {
    id: 'tx-academia',
    description: 'Academia Mensal',
    amount: -99.90,
    date: '2026-10-05',
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'C6',
    category: 'Saúde',
  };

  const addedList = syncRecurringListWithTransaction(updatedList, txNew, 'mensal');
  assert.equal(addedList.length, 2);
  const newRec = addedList.find((r) => r.description === 'Academia Mensal');
  assert.ok(newRec);
  assert.equal(newRec.frequency, 'mensal');
  assert.equal(newRec.amount, 99.9);
  assert.equal(newRec.dayOfMonth, 5);
  assert.equal(newRec.isActive, true);
});
