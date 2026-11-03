import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMonthLabel,
  getPrecedingMonths,
  calculateMonthDre,
  calculatePercentVariance,
  determinePolarity,
  calculatePjDreComparison,
  getAvailablePjMonths
} from '../src/utils/pjDre.ts';

test('formatMonthLabel formats YYYY-MM correctly in Portuguese', () => {
  assert.equal(formatMonthLabel('2026-10'), 'Outubro/2026');
  assert.equal(formatMonthLabel('2026-10', true), 'Out/2026');
  assert.equal(formatMonthLabel('2026-07', true), 'Jul/2026');
  assert.equal(formatMonthLabel('invalid'), 'invalid');
});

test('getPrecedingMonths correctly calculates 3 preceding months across calendar years', () => {
  const precedingOct = getPrecedingMonths('2026-10', 3);
  assert.deepEqual(precedingOct, ['2026-07', '2026-08', '2026-09']);

  const precedingFeb = getPrecedingMonths('2027-02', 3);
  assert.deepEqual(precedingFeb, ['2026-11', '2026-12', '2027-01']);

  const precedingJan = getPrecedingMonths('2027-01', 3);
  assert.deepEqual(precedingJan, ['2026-10', '2026-11', '2026-12']);
});

test('calculateMonthDre properly categorizes revenues, taxes, health plan, and expenses', () => {
  const transactions = [
    // Non-PJ transaction (should be ignored)
    { id: 'pf-1', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    // PJ transactions for October 2026
    { id: 'pj-1', date: '2026-10-05', description: 'Serviço PJ / Faturamento', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'pj-2', date: '2026-10-20', description: 'Tributos DAS Simples Nacional', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado', category: 'Impostos PJ' },
    { id: 'pj-3', date: '2026-10-23', description: 'Convênio Médico PJ', amount: -1200, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado', category: 'Saúde PJ' },
    { id: 'pj-4', date: '2026-10-28', description: 'Tarifa Mensal Conta Inter PJ', amount: -30, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado', category: 'Tarifas' }
  ];

  const breakdown = calculateMonthDre(transactions, '2026-10');

  assert.equal(breakdown.month, '2026-10');
  assert.equal(breakdown.grossRevenue, 3000);
  assert.equal(breakdown.dasTaxes, 180);
  assert.equal(breakdown.netRevenue, 2820);
  assert.equal(breakdown.healthInsurance, 1200);
  assert.equal(breakdown.bankAndSoftwareFees, 30);
  assert.equal(breakdown.totalOperatingExpenses, 1230);
  assert.equal(breakdown.netProfit, 1590);
  // Net Margin: 1590 / 3000 = 53%
  assert.equal(Math.round(breakdown.netMarginPct * 10) / 10, 53);
  assert.equal(breakdown.transactionCount, 4);
});

test('calculatePercentVariance handles increases, decreases and zero baselines safely', () => {
  // +10%
  assert.equal(calculatePercentVariance(110, 100), 10);
  // -20%
  assert.equal(calculatePercentVariance(80, 100), -20);
  // Zero baseline
  assert.equal(calculatePercentVariance(150, 0), 100);
  assert.equal(calculatePercentVariance(-50, 0), -100);
  assert.equal(calculatePercentVariance(0, 0), 0);
});

test('determinePolarity aligns financial logic for revenues vs expenses', () => {
  // Revenues: positive variance is favorable
  assert.equal(determinePolarity('receita', 100), 'favorable');
  assert.equal(determinePolarity('receita', -50), 'unfavorable');
  assert.equal(determinePolarity('receita', 0), 'neutral');

  // Profit and Subtotals: positive variance is favorable
  assert.equal(determinePolarity('resultado', 200), 'favorable');
  assert.equal(determinePolarity('resultado', -100), 'unfavorable');

  // Expenses and Taxes: negative variance is favorable (costs dropped!)
  assert.equal(determinePolarity('despesa', -80), 'favorable');
  assert.equal(determinePolarity('despesa', 50), 'unfavorable');
  assert.equal(determinePolarity('deducao', -20), 'favorable');
  assert.equal(determinePolarity('deducao', 30), 'unfavorable');
});

test('calculatePjDreComparison performs full side-by-side DRE with 3-month rolling average', () => {
  const transactions = [
    // July 2026
    { id: 'jul-1', date: '2026-07-05', description: 'Faturamento PJ', amount: 2850, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'jul-2', date: '2026-07-20', description: 'DAS Simples Nacional', amount: -160, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'jul-3', date: '2026-07-23', description: 'Convênio Médico PJ', amount: -1210, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },

    // August 2026
    { id: 'aug-1', date: '2026-08-05', description: 'Faturamento PJ', amount: 2950, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'aug-2', date: '2026-08-20', description: 'DAS Simples Nacional', amount: -165.50, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'aug-3', date: '2026-08-23', description: 'Convênio Médico PJ', amount: -1210, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'aug-4', date: '2026-08-25', description: 'Tarifa PJ', amount: -35, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },

    // September 2026
    { id: 'sep-1', date: '2026-09-05', description: 'Faturamento PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'sep-2', date: '2026-09-20', description: 'DAS Simples Nacional', amount: -168, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'sep-3', date: '2026-09-23', description: 'Convênio Médico PJ', amount: -1296.45, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },

    // October 2026 (Current Reference Month)
    { id: 'oct-1', date: '2026-10-05', description: 'Faturamento PJ', amount: 3060.86, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'oct-2', date: '2026-10-20', description: 'DAS Simples Nacional', amount: -172.10, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: 'oct-3', date: '2026-10-23', description: 'Convênio Médico PJ', amount: -1296.45, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
  ];

  const result = calculatePjDreComparison(transactions, '2026-10', 3);

  assert.equal(result.referenceMonth, '2026-10');
  assert.equal(result.precedingMonths.length, 3);
  assert.deepEqual(result.precedingMonths, ['2026-07', '2026-08', '2026-09']);

  // Gross Revenue:
  // Current: 3060.86
  // Avg 3M: (2850 + 2950 + 3000) / 3 = 2933.33
  const revLine = result.lines.find(l => l.id === 'receita_bruta');
  assert.ok(revLine);
  assert.equal(revLine.currentMonthValue, 3060.86);
  assert.ok(Math.abs(revLine.avg3MonthsValue - 2933.33) < 0.05);
  assert.ok(revLine.nominalVariance > 127);
  assert.ok(revLine.percentVariance > 4.3);
  assert.equal(revLine.polarity, 'favorable');

  // DAS Taxes:
  // Current: 172.10
  // Avg 3M: (160 + 165.50 + 168) / 3 = 164.50
  const dasLine = result.lines.find(l => l.id === 'das_tributos');
  assert.ok(dasLine);
  assert.equal(dasLine.currentMonthValue, 172.10);
  assert.ok(Math.abs(dasLine.avg3MonthsValue - 164.50) < 0.05);
  assert.ok(dasLine.nominalVariance > 7.5);
  // Since taxes increased, polarity is unfavorable
  assert.equal(dasLine.polarity, 'unfavorable');

  // Profit Line:
  const profitLine = result.lines.find(l => l.id === 'lucro_liquido');
  assert.ok(profitLine);
  assert.ok(profitLine.currentMonthValue > 1500);
  assert.ok(profitLine.nominalVariance > 0);
  assert.equal(profitLine.polarity, 'favorable');

  // Check KPIs and Insights
  assert.ok(result.kpis.revenueVariance.percent > 0);
  assert.ok(result.insights.length >= 2);
});

test('getAvailablePjMonths extracts unique sorted months', () => {
  const transactions = [
    { id: '1', date: '2026-10-01', description: 'A', amount: 10, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '2', date: '2026-09-01', description: 'B', amount: 10, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '3', date: '2026-10-15', description: 'C', amount: 10, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
  ];

  const monthsWithoutHistory = getAvailablePjMonths(transactions, false);
  assert.deepEqual(monthsWithoutHistory, ['2026-10', '2026-09']);

  const monthsWithHistory = getAvailablePjMonths(transactions, true);
  assert.ok(monthsWithHistory.includes('2026-10'));
  assert.ok(monthsWithHistory.includes('2026-09'));
  assert.ok(monthsWithHistory.includes('2026-08'));
  assert.ok(monthsWithHistory.includes('2026-07'));
});
