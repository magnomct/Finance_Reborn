import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate6MonthBalanceEvolution } from '../src/utils/monthlyEvolution.ts';

test('calculate6MonthBalanceEvolution returns exactly 6 months of comparative series', () => {
  const result = calculate6MonthBalanceEvolution();
  assert.equal(result.months.length, 6);
  assert.equal(result.months[0].shortName, 'Mai');
  assert.equal(result.months[5].shortName, 'Out');
});

test('calculate6MonthBalanceEvolution verifies saldo = receitas - despesas for all months', () => {
  const result = calculate6MonthBalanceEvolution();
  result.months.forEach(m => {
    const expectedSaldo = Math.round((m.receitas - m.despesas) * 100) / 100;
    assert.equal(m.saldo, expectedSaldo);
    if (m.receitas > 0) {
      assert.ok(typeof m.savingsRate === 'number');
    }
  });
});

test('calculate6MonthBalanceEvolution computes 6-month averages and totals', () => {
  const result = calculate6MonthBalanceEvolution();
  assert.ok(result.averageIncome > 4000);
  assert.ok(result.averageExpenses > 4000);
  assert.ok(result.bestMonth);
  assert.ok(result.lowestMonth);
  assert.ok(typeof result.trendStatus === 'string');
  assert.ok(typeof result.trendHeadline === 'string');
});

test('calculate6MonthBalanceEvolution adapts to transactions passed', () => {
  const customTransactions = [
    { id: '1', date: '2026-10-01', description: 'Salário', amount: 5500, type: 'receita', jar: 'NEC_55' },
    { id: '2', date: '2026-10-05', description: 'Despesas Gerais', amount: -4000, type: 'despesa', jar: 'NEC_55' },
  ];

  const result = calculate6MonthBalanceEvolution({ currentTransactions: customTransactions });
  assert.equal(result.months.length, 6);
  const outMonth = result.months[5];
  assert.equal(outMonth.receitas, 5500);
  assert.equal(outMonth.despesas, 4000);
  assert.equal(outMonth.saldo, 1500);
  assert.equal(outMonth.isSurplus, true);
});
