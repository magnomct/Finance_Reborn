import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateJarHistoricalStats, 
  calculateDeterministicJarOptimization,
  CORE_JAR_KEYS,
  STANDARD_JAR_PERCENTAGES
} from '../src/utils/jarOptimization.ts';

test('calculateJarHistoricalStats aggregates net spending and percent of income', () => {
  const mockTransactions = [
    { id: '1', jar: 'NEC_55', amount: 1500, type: 'despesa', date: '2026-10-05' },
    { id: '2', jar: 'NEC_55', amount: 100, type: 'reembolso', date: '2026-10-06' },
    { id: '3', jar: 'DIV_10', amount: 300, type: 'despesa', date: '2026-10-10' },
    { id: '4', jar: 'PLP_10', amount: 360, type: 'despesa', date: '2026-10-15' },
    { id: '5', jar: 'EDU_10', amount: 150, type: 'despesa', date: '2026-10-20' },
    { id: '6', jar: 'FER_5', amount: 80, type: 'despesa', date: '2026-10-22' },
    { id: '7', jar: 'PJ_EXCLUIDO', amount: 600, type: 'despesa', date: '2026-10-25' },
  ];

  const incomeBase = 3652.31;
  const stats = calculateJarHistoricalStats(mockTransactions, incomeBase);

  assert.equal(stats.NEC_55.netSpent, 1400); // 1500 - 100
  assert.equal(stats.DIV_10.netSpent, 300);
  assert.equal(stats.PLP_10.netSpent, 360);
  assert.equal(stats.EDU_10.netSpent, 150);
  assert.equal(stats.FER_5.netSpent, 80);

  // Percent of income for NEC_55 should be (1400 / 3652.31) * 100 = ~38.3%
  assert.ok(stats.NEC_55.percentOfIncome > 35 && stats.NEC_55.percentOfIncome < 40);
});

test('calculateDeterministicJarOptimization ensures percentages sum to exactly 100%', () => {
  const incomeBase = 4000;
  const currentLimits = {
    NEC_55: 2200,
    DIV_10: 400,
    PLP_10: 400,
    LIF_10: 400,
    EDU_10: 400,
    FER_5: 200,
    PJ_EXCLUIDO: 0,
  };

  const result = calculateDeterministicJarOptimization({
    incomeBase,
    currentLimits,
    reserveShortfall: 12000,
    averageMonthlyExpense: 2000,
  });

  const sumSuggested = CORE_JAR_KEYS.reduce((acc, k) => acc + result.optimizedJars[k].suggestedPercent, 0);
  assert.equal(sumSuggested, 100, 'Sum of suggested percentages must be exactly 100%');
  assert.equal(result.totalSuggestedPercent, 100);
});

test('calculateDeterministicJarOptimization boosts PLP_10 to maximize Emergency Reserve', () => {
  const incomeBase = 3652.31;
  const currentLimits = {
    NEC_55: 2000,
    DIV_10: 365,
    PLP_10: 365, // 10%
    LIF_10: 365,
    EDU_10: 365,
    FER_5: 182,
    PJ_EXCLUIDO: 0,
  };

  const result = calculateDeterministicJarOptimization({
    incomeBase,
    currentLimits,
    reserveShortfall: 12000,
    averageMonthlyExpense: 2000,
  });

  const plpJar = result.optimizedJars.PLP_10;
  assert.ok(plpJar.suggestedPercent >= 15, 'PLP_10 suggested percentage should be boosted to >= 15%');
  assert.ok(plpJar.suggestedLimit > plpJar.currentLimit, 'PLP_10 suggested limit should exceed current limit');
  assert.ok(result.monthlyReserveBoost > 0, 'Monthly reserve boost should be positive');
  assert.ok(result.monthsAccelerated > 0, 'Months accelerated should be positive');
});

test('calculateDeterministicJarOptimization adapts to historical stats', () => {
  const incomeBase = 4000;
  const historicalStats = {
    NEC_55: { jarId: 'NEC_55', spent: 1800, refunds: 0, netSpent: 1800, transactionCount: 10, percentOfIncome: 45 },
    DIV_10: { jarId: 'DIV_10', spent: 200, refunds: 0, netSpent: 200, transactionCount: 2, percentOfIncome: 5 },
    PLP_10: { jarId: 'PLP_10', spent: 400, refunds: 0, netSpent: 400, transactionCount: 1, percentOfIncome: 10 },
    LIF_10: { jarId: 'LIF_10', spent: 0, refunds: 0, netSpent: 0, transactionCount: 0, percentOfIncome: 0 },
    EDU_10: { jarId: 'EDU_10', spent: 160, refunds: 0, netSpent: 160, transactionCount: 1, percentOfIncome: 4 },
    FER_5: { jarId: 'FER_5', spent: 80, refunds: 0, netSpent: 80, transactionCount: 1, percentOfIncome: 2 },
    PJ_EXCLUIDO: { jarId: 'PJ_EXCLUIDO', spent: 0, refunds: 0, netSpent: 0, transactionCount: 0, percentOfIncome: 0 },
  };

  const result = calculateDeterministicJarOptimization({
    incomeBase,
    historicalStats,
    reserveShortfall: 10000,
  });

  const sumSuggested = CORE_JAR_KEYS.reduce((acc, k) => acc + result.optimizedJars[k].suggestedPercent, 0);
  assert.equal(sumSuggested, 100);
  assert.ok(result.optimizedJars.PLP_10.suggestedPercent >= 18);
  assert.ok(result.keyInsights.length >= 3);
});
