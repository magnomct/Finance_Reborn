import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  analyzeSeasonalCashFlow, 
  simulateSeasonalExpense,
  DEFAULT_SEASONAL_SCENARIOS 
} from '../src/utils/seasonalCashFlow.ts';

describe('Seasonal Cash Flow Analysis Utility', () => {
  const mockReceitas = [
    5345, 4440, 4440, 4440, 4440, 4440,
    4440, 4440, 4440, 4440, 4440, 4440
  ];
  
  // Typical data: Jan has atypical peak (4670), Oct has another peak (3739)
  const mockDespesas = [
    4670.81, 0, 0, 0, 0, 0,
    0, 0, 0, 3739.35, 0, 0
  ];

  it('computes 12 monthly data points with accurate net cash flow and savings rate', () => {
    const { monthlyData, metrics } = analyzeSeasonalCashFlow(mockReceitas, mockDespesas);

    assert.equal(monthlyData.length, 12);
    assert.equal(monthlyData[0].monthName, 'Janeiro');
    assert.equal(monthlyData[11].monthName, 'Dezembro');

    // Check January
    assert.equal(monthlyData[0].receitas, 5345);
    assert.equal(monthlyData[0].despesas, 4670.81);
    assert.equal(Math.round(monthlyData[0].netCashFlow), 674);

    // Check February
    assert.equal(monthlyData[1].receitas, 4440);
    assert.equal(monthlyData[1].despesas, 0);
    assert.equal(monthlyData[1].netCashFlow, 4440);
    assert.equal(monthlyData[1].savingsRate, 100);

    // Check totals in metrics
    assert.equal(metrics.totalReceitasAno, 54185);
    assert.equal(Math.round(metrics.totalDespesasAno), 8410);
    assert.equal(metrics.maxExpenseMonth.monthName, 'Janeiro');
  });

  it('detects atypical expense months and calculates percentage deviation', () => {
    const { monthlyData, metrics } = analyzeSeasonalCashFlow(mockReceitas, mockDespesas);

    // Jan and Oct should be flagged as atypical
    const jan = monthlyData[0];
    assert.equal(jan.isAtypical, true);
    assert.ok(jan.atypicalReasons.length > 0);
    assert.ok(jan.deviationPct !== 0);

    assert.ok(metrics.atypicalMonthsCount >= 1);
    assert.ok(metrics.recommendedSeasonalBuffer > 0);
  });

  it('identifies liquidity risk in tight cash flow months', () => {
    const { monthlyData, metrics } = analyzeSeasonalCashFlow(mockReceitas, mockDespesas);

    // Jan net is ~674, which should trigger HIGH risk (< 800)
    assert.equal(monthlyData[0].liquidityRisk, 'HIGH');
    // Feb net is 4440 -> LOW risk
    assert.equal(monthlyData[1].liquidityRisk, 'LOW');

    assert.equal(metrics.tightestCashMonth.monthName, 'Janeiro');
  });

  it('simulates seasonal expense shock immutably', () => {
    const original = [...mockDespesas];
    const simulated = simulateSeasonalExpense(original, 1500, 0);

    assert.equal(simulated[0], original[0] + 1500);
    assert.equal(original[0], 4670.81); // original remains unchanged
    assert.equal(simulated[1], original[1]);
  });

  it('handles empty or zero arrays gracefully without throwing', () => {
    const { monthlyData, metrics } = analyzeSeasonalCashFlow([], []);

    assert.equal(monthlyData.length, 12);
    assert.equal(metrics.totalReceitasAno, 0);
    assert.equal(metrics.totalDespesasAno, 0);
    assert.equal(metrics.atypicalMonthsCount, 0);
    assert.equal(metrics.recommendedSeasonalBuffer, 0);
  });

  it('verifies default simulation scenarios are populated', () => {
    assert.ok(DEFAULT_SEASONAL_SCENARIOS.length >= 3);
    assert.equal(DEFAULT_SEASONAL_SCENARIOS[0].monthIndex, 0);
    assert.ok(DEFAULT_SEASONAL_SCENARIOS[0].extraExpense > 0);
  });
});
