import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSavingsTrends } from '../src/utils/savingsTrends.js';

test('Savings Trends: accurately calculates last 6 months window up to reference month', () => {
  // Mock 12-month data: Jan to Dez
  const receitas = [5000, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 4500, 5200, 4500, 4500];
  const despesas = [4000, 2000, 2000, 2000, 2500, 2200, 2400, 2300, 2500, 3100, 2500, 2500];

  // Reference month 9 is Outubro. Window should be indices 4, 5, 6, 7, 8, 9 (Mai, Jun, Jul, Ago, Set, Out)
  const result = calculateSavingsTrends(receitas, despesas, 9, 2026);

  assert.equal(result.months.length, 6, 'Should have exactly 6 months');
  assert.equal(result.months[0].shortName, 'Mai');
  assert.equal(result.months[1].shortName, 'Jun');
  assert.equal(result.months[2].shortName, 'Jul');
  assert.equal(result.months[3].shortName, 'Ago');
  assert.equal(result.months[4].shortName, 'Set');
  assert.equal(result.months[5].shortName, 'Out');
});

test('Savings Trends: computes revenues, expenses, net balance, and savings rate correctly', () => {
  const receitas = Array(12).fill(4000);
  const despesas = Array(12).fill(3000);
  receitas[9] = 5000;
  despesas[9] = 2500; // Outubro: net balance = 2500, rate = 50%

  const result = calculateSavingsTrends(receitas, despesas, 9, 2026);
  const outMonth = result.months[5];

  assert.equal(outMonth.totalIncome, 5000);
  assert.equal(outMonth.totalExpenses, 2500);
  assert.equal(outMonth.netBalance, 2500);
  assert.equal(outMonth.savingsRate, 50.0);
  assert.equal(outMonth.isPositiveBalance, true);
});

test('Savings Trends: correctly determines best month and trend direction', () => {
  // Preceding 5 months have balance = 1000
  // Last month (Out) has balance = 2500 -> trendDirection should be 'up'
  const receitas = Array(12).fill(4000);
  const despesas = Array(12).fill(3000);
  receitas[9] = 6000;
  despesas[9] = 3500; // balance = 2500

  const result = calculateSavingsTrends(receitas, despesas, 9, 2026);

  assert.equal(result.bestMonth.monthName, 'Outubro');
  assert.equal(result.trendDirection, 'up');
  assert.ok(result.trendPercent > 0, 'Trend percent should be positive');
  assert.ok(result.trendLabel.includes('Tendência de Alta'));
});

test('Savings Trends: detects negative balances and handles deficit months', () => {
  const receitas = Array(12).fill(4000);
  const despesas = Array(12).fill(4000);
  despesas[9] = 4500; // Net balance = -500

  const result = calculateSavingsTrends(receitas, despesas, 9, 2026);
  const outMonth = result.months[5];

  assert.equal(outMonth.netBalance, -500);
  assert.equal(outMonth.isPositiveBalance, false);
  assert.equal(outMonth.savingsRate, -12.5);
  assert.equal(result.lowestMonth.monthName, 'Outubro');
});

test('Savings Trends: computes averages and streak consistency across 6 months', () => {
  const receitas = Array(12).fill(5000);
  const despesas = Array(12).fill(3000); // 2000 balance each month

  const result = calculateSavingsTrends(receitas, despesas, 9, 2026);

  assert.equal(result.averageIncome, 5000);
  assert.equal(result.averageExpenses, 3000);
  assert.equal(result.averageBalance, 2000);
  assert.equal(result.averageSavingsRate, 40);
  assert.equal(result.totalSavingsPeriod, 12000);
  assert.equal(result.positiveMonthsCount, 6);
  assert.equal(result.isConsistentSaver, true);
});
