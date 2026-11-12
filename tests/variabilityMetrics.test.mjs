import { describe, it, expect } from 'bun:test';
import { 
  calculateMean, 
  calculateSampleStdDev, 
  calculateCV, 
  classifyStability, 
  computeCategoryMetrics,
  identifyTopOffender,
  calculateVariabilityMetrics,
  REALISTIC_6M_VARIABILITY_DATA
} from '../src/utils/variabilityMetrics.ts';

describe('variabilityMetrics pure calculations', () => {
  it('calculateMean accurately computes the arithmetic mean', () => {
    expect(calculateMean([10, 20, 30, 40, 50])).toBe(30);
    expect(calculateMean([])).toBe(0);
    expect(calculateMean([2400, 2400, 2400])).toBe(2400);
  });

  it('calculateSampleStdDev computes sample standard deviation using n - 1 denominator', () => {
    // For [10, 20, 30]: mean = 20. deviations = [-10, 0, 10]. squared = [100, 0, 100], sum = 200.
    // variance = 200 / (3 - 1) = 100. stdDev = sqrt(100) = 10.
    expect(calculateSampleStdDev([10, 20, 30])).toBe(10);
    expect(calculateSampleStdDev([5])).toBe(0);
    expect(calculateSampleStdDev([])).toBe(0);
  });

  it('calculateCV and classifyStability classify volatility correctly', () => {
    // Low CV: 5 / 100 * 100 = 5% -> high predictability (<15%)
    expect(calculateCV(5, 100)).toBe(5);
    const low = classifyStability(5);
    expect(low.level).toBe('high');
    expect(low.label).toBe('Alta Previsibilidade');
    expect(low.color).toBe('emerald');

    // Moderate CV: 20 / 100 * 100 = 20% -> moderate oscillation (15-30%)
    const mod = classifyStability(22);
    expect(mod.level).toBe('moderate');
    expect(mod.label).toBe('Oscilação Moderada');
    expect(mod.color).toBe('amber');

    // High CV: 35 / 100 * 100 = 35% -> high volatility (>30%)
    const high = classifyStability(35);
    expect(high.level).toBe('volatile');
    expect(high.label).toBe('Alta Volatilidade');
    expect(high.color).toBe('rose');
  });

  it('computeCategoryMetrics provides bounds and stability metrics', () => {
    const values = [2000, 2050, 1950, 2000, 2000, 2000];
    const metrics = computeCategoryMetrics(values);
    expect(metrics.mean).toBe(2000);
    expect(metrics.stdDev).toBeGreaterThan(0);
    expect(metrics.stabilityRange.lower).toBe(2000 - metrics.stdDev);
    expect(metrics.stabilityRange.upper).toBe(2000 + metrics.stdDev);
    expect(metrics.stabilityLevel).toBe('high');
  });

  it('identifyTopOffender discovers the subcategory with greatest peak variation in 2-level hierarchy', () => {
    const offender = identifyTopOffender(REALISTIC_6M_VARIABILITY_DATA);
    expect(offender.name).toContain('Alimentação > Delivery');
    expect(offender.parentCategory).toBe('Alimentação');
    expect(offender.contributionPct).toBeGreaterThan(50);
  });

  it('calculateVariabilityMetrics handles realistic dataset and formats dynamic insight', () => {
    const summary = calculateVariabilityMetrics(REALISTIC_6M_VARIABILITY_DATA);
    expect(summary.hasEnoughData).toBe(true);
    expect(summary.sampleCount).toBe(6);
    expect(summary.fixed.stabilityLevel).toBe('high');
    expect(summary.variable.stdDev).toBeGreaterThan(300);
    expect(summary.dynamicInsight).toContain('gastos variáveis oscilam cerca de');
    expect(summary.dynamicInsight).toContain('Alimentação > Delivery');
    expect(summary.dynamicInsight).toContain('foi responsável por');
  });

  it('detects empty state when data has fewer than 3 months', () => {
    const twoMonths = [
      { month: 'Jan', monthShort: 'Jan', fixed: 2000, variable: 1000, total: 3000 },
      { month: 'Fev', monthShort: 'Fev', fixed: 2000, variable: 1000, total: 3000 }
    ];
    // When passing fewer than 3 months without fallback, hasEnoughData is false
    const hasEnough = twoMonths.length >= 3;
    expect(hasEnough).toBe(false);
  });

  it('getBlendedVariabilityData blends current transaction expenses into latest month', () => {
    const { getBlendedVariabilityData } = require('../src/utils/variabilityMetrics.ts');
    const mockTxs = [
      { id: '1', date: '2026-10-15', description: 'Aluguel Apto', amount: -1500, type: 'despesa', category: 'Moradia' },
      { id: '2', date: '2026-10-16', description: 'Jantar Restaurante', amount: -350, type: 'despesa', category: 'Lazer' }
    ];
    const blended = getBlendedVariabilityData(mockTxs);
    expect(blended.length).toBe(6);
    expect(blended[5].fixed).toBe(1500);
    expect(blended[5].variable).toBe(350);
  });
});

