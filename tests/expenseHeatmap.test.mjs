import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpenseHeatmapData,
  calculateIntensityLevel,
  getDaysInMonth
} from '../src/utils/expenseHeatmap.ts';

test('getDaysInMonth: accurately returns days for leap and non-leap years', () => {
  assert.equal(getDaysInMonth(2026, 0), 31); // Jan
  assert.equal(getDaysInMonth(2026, 1), 28); // Feb non-leap
  assert.equal(getDaysInMonth(2024, 1), 29); // Feb leap year
  assert.equal(getDaysInMonth(2026, 3), 30); // Apr
});

test('calculateIntensityLevel: maps amounts accurately across 5 visual levels', () => {
  const max = 2000;
  assert.equal(calculateIntensityLevel(0, max), 0);
  assert.equal(calculateIntensityLevel(-50, max), 0);
  assert.equal(calculateIntensityLevel(50, max), 1);   // Light
  assert.equal(calculateIntensityLevel(200, max), 2);  // Moderate
  assert.equal(calculateIntensityLevel(600, max), 3);  // Elevated
  assert.equal(calculateIntensityLevel(1600, max), 4); // Peak critical
});

test('buildExpenseHeatmapData: generates 12x31 matrix with valid/invalid day flags', () => {
  const transactions = [
    { id: 'tx-1', date: '2026-10-22', description: 'Fatura C6 Contas', amount: -2000, type: 'despesa', jar: 'NEC_55', category: 'Cartão de Crédito' },
    { id: 'tx-2', date: '2026-10-22', description: 'Fatura C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10', category: 'Lazer' },
    { id: 'tx-3', date: '2026-10-25', description: 'Parcela Financiamento Apto', amount: -1290, type: 'despesa', jar: 'NEC_55', category: 'Moradia' },
    { id: 'tx-4', date: '2026-10-15', description: 'Shopee Lar', amount: -142, type: 'despesa', jar: 'NEC_55', category: 'Casa & Utilidades' },
    { id: 'tx-5', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', category: 'Salário' } // Income ignored in heatmap
  ];

  const result = buildExpenseHeatmapData({ transactions, year: 2026 });

  // 12 months in matrix
  assert.equal(result.matrix.length, 12);

  // Each month has 31 columns
  result.matrix.forEach((monthRow, mIdx) => {
    assert.equal(monthRow.length, 31);
    const validDays = getDaysInMonth(2026, mIdx);
    for (let d = 1; d <= 31; d++) {
      const cell = monthRow[d - 1];
      assert.equal(cell.dayOfMonth, d);
      assert.equal(cell.monthIndex, mIdx);
      if (d <= validDays) {
        assert.equal(cell.isValidDay, true);
      } else {
        assert.equal(cell.isValidDay, false);
      }
    }
  });

  // Verify October 22 (mIdx = 9, day 22 -> index 21)
  const oct22 = result.matrix[9][21];
  assert.equal(oct22.dateStr, '2026-10-22');
  assert.equal(oct22.totalSpent, 2600); // 2000 + 600
  assert.equal(oct22.transactionCount, 2);
  assert.equal(oct22.intensityLevel, 4); // Peak

  // Verify October 25 (mIdx = 9, day 25 -> index 24)
  const oct25 = result.matrix[9][24];
  assert.equal(oct25.dateStr, '2026-10-25');
  assert.equal(oct25.totalSpent, 1290);
  assert.equal(oct25.intensityLevel, 4);

  // Verify October 10 (Income only -> totalSpent should be 0)
  const oct10 = result.matrix[9][9];
  assert.equal(oct10.totalSpent, 0);
  assert.equal(oct10.intensityLevel, 0);
});

test('buildExpenseHeatmapData: discovers seasonal peak days and critical concentration week', () => {
  const transactions = [
    { id: 'tx-1', date: '2026-10-22', description: 'Fatura C6 Contas', amount: -2000, type: 'despesa', jar: 'NEC_55', category: 'Cartão' },
    { id: 'tx-2', date: '2026-10-25', description: 'Parcela Financiamento Apto', amount: -1290, type: 'despesa', jar: 'NEC_55', category: 'Moradia' },
    { id: 'tx-3', date: '2026-10-07', description: 'Transporte', amount: -120, type: 'despesa', jar: 'NEC_55', category: 'Transporte' },
  ];

  const result = buildExpenseHeatmapData({ transactions, year: 2026 });

  // Top days should feature Day 22 or 25
  const topDays = result.patterns.topDaysOfMonth.map(d => d.dayOfMonth);
  assert.ok(topDays.includes(22), 'Top days must include day 22');
  assert.ok(topDays.includes(25), 'Top days must include day 25');

  // Critical week (days 20-26) should capture the largest share
  assert.ok(result.patterns.concentrationWeek.sharePct > 40, 'Days 20-26 must concentrate high expense volume');
  assert.ok(result.patterns.recommendedLiquidityBuffer >= 2000, 'Liquidity buffer must be at least R$ 2000');
  assert.ok(result.patterns.headlineInsight.length > 10);
  assert.ok(result.patterns.diagnosisText.includes('quarta semana'));
});

test('buildExpenseHeatmapData: supports category and jar filters', () => {
  const transactions = [
    { id: 'tx-1', date: '2026-10-22', description: 'C6 Necessidades', amount: -2000, type: 'despesa', jar: 'NEC_55', category: 'Cartão de Crédito' },
    { id: 'tx-2', date: '2026-10-22', description: 'C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10', category: 'Lazer' },
  ];

  // Filter only Lazer
  const lazerResult = buildExpenseHeatmapData({
    transactions,
    year: 2026,
    filters: { jarFilter: 'DIV_10' }
  });

  const oct22Lazer = lazerResult.matrix[9][21];
  assert.equal(oct22Lazer.totalSpent, 600); // Only the 600 from DIV_10

  // Filter only NEC_55
  const necResult = buildExpenseHeatmapData({
    transactions,
    year: 2026,
    filters: { jarFilter: 'NEC_55' }
  });
  const oct22Nec = necResult.matrix[9][21];
  assert.equal(oct22Nec.totalSpent, 2000);
});
