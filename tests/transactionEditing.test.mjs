import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  validateTransactionInput, 
  normalizeTransactionData, 
  updateTransactionInList, 
  deleteTransactionFromList,
  filterTransactionsByMovementType,
  updateTransactionNotes
} from '../src/utils/transactionEditor.ts';

test('validateTransactionInput flags missing or invalid fields correctly', () => {
  const invalid = validateTransactionInput({
    description: '',
    amount: '',
    date: ''
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.description);
  assert.ok(invalid.errors.amount);
  assert.ok(invalid.errors.date);

  const valid = validateTransactionInput({
    description: 'Mercado Pão de Açúcar',
    amount: '150,50',
    date: '2026-10-15'
  });

  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('normalizeTransactionData enforces correct negative sign for despesas', () => {
  const tx = normalizeTransactionData({
    id: 'tx-123',
    date: '2026-10-10',
    description: 'Internet Fibra',
    amount: '120.00',
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Moradia'
  });

  assert.equal(tx.id, 'tx-123');
  assert.equal(tx.type, 'despesa');
  assert.equal(tx.amount, -120.00);
});

test('normalizeTransactionData enforces positive sign for receitas and reembolsos', () => {
  const receita = normalizeTransactionData({
    date: '2026-10-05',
    description: 'Salário CLT',
    amount: 2060.00,
    type: 'receita',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado'
  });

  assert.equal(receita.type, 'receita');
  assert.equal(receita.amount, 2060.00);

  const reembolso = normalizeTransactionData({
    date: '2026-10-15',
    description: 'Reembolso Nathan Financiamento',
    amount: '858,00',
    type: 'reembolso',
    jar: 'NEC_55',
    costCenter: 'Nathan',
    account: 'Inter PF',
    status: 'liquidado'
  });

  assert.equal(reembolso.type, 'reembolso');
  assert.equal(reembolso.amount, 858.00);
});

test('updateTransactionInList immutably replaces transaction by id', () => {
  const original = [
    {
      id: 'tx-1',
      date: '2026-10-01',
      description: 'Conta de Luz',
      amount: -150,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    },
    {
      id: 'tx-2',
      date: '2026-10-02',
      description: 'Salário CLT',
      amount: 2000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    }
  ];

  const updated = updateTransactionInList(original, {
    id: 'tx-1',
    date: '2026-10-01',
    description: 'Conta de Luz Atualizada (Enel)',
    amount: -185.40,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Habitação'
  });

  assert.equal(updated.length, 2);
  assert.equal(updated[0].description, 'Conta de Luz Atualizada (Enel)');
  assert.equal(updated[0].amount, -185.40);
  assert.equal(updated[0].category, 'Habitação');
  // Original array remains untouched
  assert.equal(original[0].description, 'Conta de Luz');
});

test('deleteTransactionFromList removes target transaction accurately', () => {
  const list = [
    { id: 'tx-1', description: 'Item 1' },
    { id: 'tx-2', description: 'Item 2' }
  ];

  const result = deleteTransactionFromList(list, 'tx-1');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'tx-2');
});

test('filterTransactionsByMovementType filters correctly by category type', () => {
  const list = [
    { id: '1', type: 'receita', amount: 500 },
    { id: '2', type: 'despesa', amount: -200 },
    { id: '3', type: 'reembolso', amount: 150 }
  ];

  assert.equal(filterTransactionsByMovementType(list, 'entradas').length, 1);
  assert.equal(filterTransactionsByMovementType(list, 'saidas').length, 1);
  assert.equal(filterTransactionsByMovementType(list, 'reembolsos').length, 1);
  assert.equal(filterTransactionsByMovementType(list, 'all').length, 3);
});

test('normalizeTransactionData preserves and trims custom notes/observações', () => {
  const txWithNote = normalizeTransactionData({
    date: '2026-10-15',
    description: 'Reembolso Financiamento Apto (Nathan)',
    amount: '858,00',
    type: 'reembolso',
    jar: 'NEC_55',
    costCenter: 'Nathan',
    account: 'Inter PF',
    status: 'liquidado',
    notes: '  Nathan 60%  '
  });

  assert.equal(txWithNote.notes, 'Nathan 60%');

  const txEmptyNote = normalizeTransactionData({
    date: '2026-10-15',
    description: 'Reembolso Financiamento Apto',
    amount: '858,00',
    type: 'reembolso',
    jar: 'NEC_55',
    costCenter: 'Nathan',
    account: 'Inter PF',
    status: 'liquidado',
    notes: '   '
  });

  assert.equal(txEmptyNote.notes, undefined);
});

test('updateTransactionNotes updates, modifies and clears notes immutably', () => {
  const transactions = [
    {
      id: 'tx-3',
      date: '2026-10-15',
      description: 'Reembolso Financiamento Apto (Nathan)',
      amount: 858,
      type: 'reembolso',
      jar: 'NEC_55',
      costCenter: 'Nathan',
      account: 'Inter PF',
      status: 'liquidado',
      notes: 'Nathan 60%'
    },
    {
      id: 'tx-4',
      date: '2026-10-25',
      description: 'Financiamento Apto',
      amount: -1290,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    }
  ];

  // 1. Edit note to 'Nathan 50%'
  const updated1 = updateTransactionNotes(transactions, 'tx-3', 'Nathan 50%');
  assert.equal(updated1[0].notes, 'Nathan 50%');
  assert.equal(transactions[0].notes, 'Nathan 60%'); // original untouched

  // 2. Clear note
  const updated2 = updateTransactionNotes(transactions, 'tx-3', '');
  assert.equal(updated2[0].notes, undefined);

  // 3. Add note to transaction that didn't have one
  const updated3 = updateTransactionNotes(transactions, 'tx-4', 'Magno 40%');
  assert.equal(updated3[1].notes, 'Magno 40%');
});

test('normalizeTransactionData preserves reminderDaysBefore for scheduled items', () => {
  const tx = normalizeTransactionData({
    date: '2026-10-25',
    description: 'Cartão C6',
    amount: '600.00',
    type: 'despesa',
    jar: 'DIV_10',
    costCenter: 'Magno',
    account: 'C6',
    status: 'agendado',
    reminderDaysBefore: 3
  });

  assert.equal(tx.reminderDaysBefore, 3);

  const txNoReminder = normalizeTransactionData({
    date: '2026-10-25',
    description: 'Cartão C6',
    amount: '600.00',
    type: 'despesa',
    jar: 'DIV_10',
    costCenter: 'Magno',
    account: 'C6',
    status: 'agendado',
    reminderDaysBefore: null
  });

  assert.equal(txNoReminder.reminderDaysBefore, undefined);
});


