import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCategoryExpenses } from '../src/utils/categoryExpenses.ts';

test('calculateCategoryExpenses groups expenses by category accurately', () => {
  const transactions = [
    { id: '1', date: '2026-10-01', description: 'Aluguel', amount: -1500, type: 'despesa', category: 'Moradia', jar: 'NEC_55' },
    { id: '2', date: '2026-10-02', description: 'Condomínio', amount: -500, type: 'despesa', category: 'Moradia', jar: 'NEC_55' },
    { id: '3', date: '2026-10-05', description: 'Fatura C6', amount: -800, type: 'despesa', category: 'Cartão de Crédito', jar: 'NEC_55' },
    { id: '4', date: '2026-10-10', description: 'Supermercado', amount: -600, type: 'despesa', category: 'Alimentação', jar: 'NEC_55' },
    { id: '5', date: '2026-10-15', description: 'Salário', amount: 5000, type: 'receita', category: 'Salário', jar: 'NEC_55' }, // Should be ignored
  ];

  const result = calculateCategoryExpenses(transactions);

  assert.equal(result.totalExpenses, 3400); // 1500 + 500 + 800 + 600
  assert.equal(result.categoryCount, 3);
  assert.equal(result.topCategory.category, 'Moradia');
  assert.equal(result.topCategory.totalSpent, 2000);
  assert.equal(result.topCategory.transactionCount, 2);

  // Check percentage calculation
  const moradiaSlice = result.categories.find(c => c.category === 'Moradia');
  assert.ok(moradiaSlice);
  // 2000 / 3400 = 58.8%
  assert.ok(moradiaSlice.percentage > 58 && moradiaSlice.percentage < 60);

  // Check sum of fractions is 1
  const sumFraction = result.categories.reduce((acc, c) => acc + c.fraction, 0);
  assert.ok(Math.abs(sumFraction - 1) < 0.001);
});

test('calculateCategoryExpenses associates transactions with each category slice', () => {
  const transactions = [
    { id: 'tx-1', date: '2026-10-05', description: 'Restaurante Outback', amount: -250, type: 'despesa', category: 'Lazer', jar: 'DIV_10' },
    { id: 'tx-2', date: '2026-10-12', description: 'Cinema', amount: -80, type: 'despesa', category: 'Lazer', jar: 'DIV_10' },
  ];

  const result = calculateCategoryExpenses(transactions);
  assert.equal(result.categories.length, 1);
  const lazer = result.categories[0];
  assert.equal(lazer.category, 'Lazer');
  assert.equal(lazer.totalSpent, 330);
  assert.equal(lazer.transactions.length, 2);
  assert.equal(lazer.transactions[0].id, 'tx-2'); // Sorted date descending
});

test('calculateCategoryExpenses handles empty transactions and zero expenses safely', () => {
  const emptyResult = calculateCategoryExpenses([]);
  assert.equal(emptyResult.categoryCount, 0);
  assert.equal(emptyResult.totalExpenses, 0);
  assert.equal(emptyResult.topCategory, null);

  const onlyIncome = calculateCategoryExpenses([
    { id: '1', date: '2026-10-01', description: 'Salário', amount: 5000, type: 'receita', category: 'Salário' }
  ]);
  assert.equal(onlyIncome.categoryCount, 0);
  assert.equal(onlyIncome.totalExpenses, 0);
});

test('calculateCategoryExpenses falls back when category is missing', () => {
  const transactions = [
    { id: '1', date: '2026-10-01', description: 'Sem categoria', amount: -200, type: 'despesa', jar: 'NEC_55' },
    { id: '2', date: '2026-10-02', description: 'Outro', amount: -100, type: 'despesa' }
  ];

  const result = calculateCategoryExpenses(transactions);
  assert.equal(result.totalExpenses, 300);
  assert.ok(result.categoryCount >= 1);
});
