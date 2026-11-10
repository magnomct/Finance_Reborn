import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePjDreSummary } from '../src/utils/pjDre.ts';

test('calculatePjDreSummary: computes real DAS, operating expenses and net profit for October 2026', () => {
  const transactions = [
    { id: 'pj-1', date: '2026-10-05', description: 'Serviço PJ / Faturamento', amount: 3060.86, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'pj-2', date: '2026-10-20', description: 'Tributos DAS Simples Nacional', amount: -172.10, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado', category: 'Impostos PJ' },
    { id: 'pj-3', date: '2026-10-23', description: 'Convênio Médico PJ', amount: -1296.45, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado', category: 'Saúde PJ' }
  ];

  const summary = calculatePjDreSummary(transactions, '2026-10');

  assert.equal(summary.month, '2026-10');
  assert.equal(summary.grossRevenue, 3060.86);
  assert.equal(summary.dasTaxes, 172.10);
  assert.equal(summary.isDasEstimated, false);
  // Net revenue = 3060.86 - 172.10 = 2888.76
  assert.equal(Math.round(summary.netRevenue * 100) / 100, 2888.76);
  assert.equal(summary.totalOperatingExpenses, 1296.45);
  // Net profit = 2888.76 - 1296.45 = 1592.31
  assert.equal(Math.round(summary.netProfit * 100) / 100, 1592.31);
  assert.equal(Math.round(summary.availableForPfTransfer * 100) / 100, 1592.31);
  assert.equal(summary.isPositiveProfit, true);
  assert.equal(summary.steps.length, 5);
});

test('calculatePjDreSummary: calculates estimated DAS when revenue exists without explicit tax bill', () => {
  const transactions = [
    { id: 'pj-nov-1', date: '2026-11-05', description: 'Consultoria PJ Desenvolvimento', amount: 5000.00, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'pj-nov-2', date: '2026-11-23', description: 'Convênio Médico PJ', amount: -1300.00, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }
  ];

  // With default 6% tax rate
  const summary = calculatePjDreSummary(transactions, '2026-11', 6.0);

  assert.equal(summary.grossRevenue, 5000.00);
  // Estimated DAS = 5000 * 6% = 300
  assert.equal(summary.dasTaxes, 300.00);
  assert.equal(summary.isDasEstimated, true);
  assert.equal(summary.effectiveTaxRatePct, 6.0);
  // Net revenue = 5000 - 300 = 4700
  assert.equal(summary.netRevenue, 4700.00);
  assert.equal(summary.totalOperatingExpenses, 1300.00);
  // Net profit = 4700 - 1300 = 3400
  assert.equal(summary.netProfit, 3400.00);
  assert.equal(summary.availableForPfTransfer, 3400.00);
  assert.equal(summary.isPositiveProfit, true);
});

test('calculatePjDreSummary: handles zero revenue safely without NaN', () => {
  const transactions = [];
  const summary = calculatePjDreSummary(transactions, '2026-12');

  assert.equal(summary.grossRevenue, 0);
  assert.equal(summary.dasTaxes, 0);
  assert.equal(summary.netRevenue, 0);
  assert.equal(summary.netProfit, 0);
  assert.equal(summary.netMarginPct, 0);
  assert.equal(summary.availableForPfTransfer, 0);
  assert.equal(summary.isPositiveProfit, false);
});
