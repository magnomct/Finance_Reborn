import { describe, it, expect } from 'bun:test';
import { 
  calculateIRRF, 
  calculatePartnerINSS, 
  calculatePJTaxOptimization,
  SIMPLES_CEILING_PRESETS
} from '../src/utils/pjTaxOptimization.ts';

describe('PJ Tax Optimization and Partner Payout Calculations', () => {
  it('calculateIRRF correctly calculates progressive brackets and exemptions', () => {
    // Isento up to R$ 2.259,20
    expect(calculateIRRF(2000)).toBe(0);
    expect(calculateIRRF(2259.20)).toBe(0);

    // 7.5% bracket (R$ 2.500 * 0.075 - 169.44 = 187.5 - 169.44 = 18.06)
    const irrf2500 = calculateIRRF(2500);
    expect(Math.round(irrf2500 * 100) / 100).toBe(18.06);

    // 15% bracket (R$ 3.500 * 0.15 - 381.44 = 525 - 381.44 = 143.56)
    const irrf3500 = calculateIRRF(3500);
    expect(Math.round(irrf3500 * 100) / 100).toBe(143.56);

    // 27.5% bracket
    const irrf6000 = calculateIRRF(6000);
    expect(irrf6000).toBeGreaterThan(600);
  });

  it('calculatePartnerINSS applies 11% rate up to ceiling', () => {
    // Under ceiling: 11% of R$ 5.000 = 550
    expect(calculatePartnerINSS(5000)).toBe(550);

    // Above ceiling R$ 7.786,02 -> capped at 7786.02 * 0.11 = 856.4622
    const capped = calculatePartnerINSS(15000);
    expect(Math.round(capped * 100) / 100).toBe(856.46);
  });

  it('calculatePJTaxOptimization determines Fator R and classifies Anexo III correctly', () => {
    const metrics = calculatePJTaxOptimization([], {
      referenceMonth: '2026-10',
      ceilingPreset: 'simples_faixa1',
      pjReservePct: 10,
      proLaborePct: 28,
    });

    expect(metrics.fatorR).toBeGreaterThanOrEqual(28);
    expect(metrics.isAnexoIII).toBe(true);
    expect(metrics.anexo).toBe('III');
    expect(metrics.effectiveTaxRatePct).toBe(6.0);
    expect(metrics.proLaboreShortfallFor28Pct).toBe(0);
  });

  it('calculatePJTaxOptimization tracks Simples ceiling consumption', () => {
    const metricsFaixa1 = calculatePJTaxOptimization([], {
      ceilingPreset: 'simples_faixa1',
    });
    expect(metricsFaixa1.ceiling.limit).toBe(180000);
    expect(metricsFaixa1.ceiling.consumedPct).toBeGreaterThan(15);
    expect(metricsFaixa1.ceiling.consumedPct).toBeLessThanOrEqual(100);
    expect(metricsFaixa1.ceiling.remainingAmount).toBe(metricsFaixa1.ceiling.limit - metricsFaixa1.rbt12);

    const metricsMEI = calculatePJTaxOptimization([], {
      ceilingPreset: 'mei',
    });
    expect(metricsMEI.ceiling.limit).toBe(81000);
    expect(metricsMEI.ceiling.consumedPct).toBeGreaterThan(40);
    expect(metricsMEI.ceiling.remainingAmount).toBe(metricsMEI.ceiling.limit - metricsMEI.rbt12);
  });

  it('calculatePJTaxOptimization divides partner payout into Pró-Labore Líquido and Lucro Isento', () => {
    const metrics = calculatePJTaxOptimization([], {
      referenceMonth: '2026-10',
      pjReservePct: 10,
      proLaborePct: 28,
    });

    const { payout } = metrics;
    expect(payout.grossRevenue).toBeGreaterThan(2500);
    expect(Math.round(payout.dasEstimated * 100) / 100).toBe(Math.round(payout.grossRevenue * 0.06 * 100) / 100);
    expect(Math.round(payout.pjReserveAmount * 100) / 100).toBe(Math.round(payout.grossRevenue * 0.10 * 100) / 100);
    expect(Math.round(payout.proLaboreGross * 100) / 100).toBe(Math.round(payout.grossRevenue * 0.28 * 100) / 100);
    expect(Math.round(payout.proLaboreNet * 100) / 100).toBe(Math.round((payout.proLaboreGross - payout.inssDeduction - payout.irrfDeduction) * 100) / 100);
    expect(payout.exemptProfitDistribution).toBeGreaterThan(0);
    expect(Math.round(payout.totalPartnerPayout * 100) / 100).toBe(Math.round((payout.proLaboreNet + payout.exemptProfitDistribution) * 100) / 100);

    // Verify destinations array contains all 5 slices
    expect(payout.destinations.length).toBe(5);
    expect(payout.destinations.map(d => d.id)).toEqual([
      'impostos_das',
      'custos_pj',
      'reserva_pj',
      'pro_labore',
      'lucro_isento',
    ]);
  });

  it('calculatePJTaxOptimization calculates real tax savings for Anexo III vs Anexo V', () => {
    const metrics = calculatePJTaxOptimization([], {
      referenceMonth: '2026-10',
    });

    const expectedMonthlySavings = metrics.currentMonthRevenue * (0.155 - 0.06);
    expect(Math.round(metrics.taxSavings.monthlySavings * 100) / 100).toBe(Math.round(expectedMonthlySavings * 100) / 100);
    expect(Math.round(metrics.taxSavings.annualProjectedSavings * 100) / 100).toBe(Math.round(metrics.taxSavings.monthlySavings * 12 * 100) / 100);
  });
});
