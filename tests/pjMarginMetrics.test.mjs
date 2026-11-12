import { describe, it, expect } from 'bun:test';
import { 
  calculatePJMarginMetrics, 
  classifyQuarterlyTrend, 
  REALISTIC_12M_PJ_DATA 
} from '../src/utils/pjMarginMetrics.ts';

describe('PJ Margin Metrics Calculations', () => {
  it('correctly calculates 12-month margin summary with realistic data fallback', () => {
    const summary = calculatePJMarginMetrics([], '2026-10', 12);
    expect(summary.selectedWindowMonths.length).toBe(12);
    expect(summary.totalGrossRevenue).toBeGreaterThan(30000);
    expect(summary.totalNetProfit).toBeGreaterThan(15000);
    expect(summary.averageMarginPct).toBeGreaterThan(45);
    expect(summary.averageMarginPct).toBeLessThan(75);
  });

  it('correctly calculates 6-month window slice', () => {
    const summary6M = calculatePJMarginMetrics([], '2026-10', 6);
    expect(summary6M.selectedWindowMonths.length).toBe(6);
    expect(summary6M.selectedWindowMonths[summary6M.selectedWindowMonths.length - 1].month).toBe('2026-10');
  });

  it('calculates Month-over-Month (MoM) difference in percentage points accurately', () => {
    const summary = calculatePJMarginMetrics([], '2026-10', 12);
    const months = summary.selectedWindowMonths;
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      const curr = months[i];
      const diff = parseFloat((curr.netMarginPct - prev.netMarginPct).toFixed(1));
      expect(curr.momMarginDiffPoints).toBe(diff);
    }
  });

  it('classifies quarterly trend correctly (growth, stable, retraction)', () => {
    // 3M avg > 12M avg by >= 1.0 p.p. => growth
    const growth = classifyQuarterlyTrend(55, 52);
    expect(growth.trend).toBe('Em Alta');
    expect(growth.badgeColor).toBe('emerald');

    // 3M avg < 12M avg by <= -1.0 p.p. => retraction
    const retraction = classifyQuarterlyTrend(50, 52);
    expect(retraction.trend).toBe('Em Retração');
    expect(retraction.badgeColor).toBe('rose');

    // Within ±1.0 p.p. => stable
    const stable = classifyQuarterlyTrend(52.2, 52);
    expect(stable.trend).toBe('Estável');
    expect(stable.badgeColor).toBe('amber');
  });

  it('generates strategic diagnostic insight', () => {
    const summary = calculatePJMarginMetrics([], '2026-10', 12);
    expect(summary.diagnosticInsight).toBeDefined();
    expect(summary.diagnosticInsight.length).toBeGreaterThan(30);
    expect(summary.currentMonth.grossRevenue).toBeGreaterThan(0);
  });
});
