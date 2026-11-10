import { describe, it, expect } from 'bun:test';
import { calculateEarlyPayoff, DEFAULT_DEBT_PRESETS } from '../src/utils/debtEarlyPayoff.ts';

describe('calculateEarlyPayoff', () => {
  it('correctly calculates total without prepay as remainingInstallments * installmentAmount', () => {
    const result = calculateEarlyPayoff({
      installmentAmount: 320,
      remainingInstallments: 8,
      installmentsToPrepay: 3,
      monthlyInterestRatePct: 1.5
    });

    expect(result.totalWithoutPrepay).toBe(2560);
    expect(result.prepaidInstallmentsNominal).toBe(960);
  });

  it('calculates discounted amount and net savings when interest/discount rate is positive', () => {
    const result = calculateEarlyPayoff({
      installmentAmount: 320,
      remainingInstallments: 8,
      installmentsToPrepay: 3,
      monthlyInterestRatePct: 1.5
    });

    // Nominal of 3 parcels = 960. With discount at 1.5% a.m., prepaidDiscountedAmount should be < 960
    expect(result.prepaidDiscountedAmount).toBeLessThan(960);
    expect(result.discountSaved).toBeGreaterThan(0);
    expect(result.totalNetSavings).toBe(result.discountSaved);
    expect(result.totalWithPrepay).toBeLessThan(result.totalWithoutPrepay);
    expect(result.discountPercentage).toBeGreaterThan(0);
    expect(result.monthsSaved).toBe(3);
  });

  it('handles 0% interest rate gracefully with zero savings', () => {
    const result = calculateEarlyPayoff({
      installmentAmount: 100,
      remainingInstallments: 10,
      installmentsToPrepay: 2,
      monthlyInterestRatePct: 0
    });

    expect(result.totalWithoutPrepay).toBe(1000);
    expect(result.prepaidInstallmentsNominal).toBe(200);
    expect(result.prepaidDiscountedAmount).toBe(200);
    expect(result.discountSaved).toBe(0);
    expect(result.totalNetSavings).toBe(0);
    expect(result.totalWithPrepay).toBe(1000);
  });

  it('calculates high-interest loan payoff with significant compound savings', () => {
    // R$ 450/month loan with 9 remaining installments at 3.8% a.m.
    const result = calculateEarlyPayoff({
      installmentAmount: 450,
      remainingInstallments: 9,
      installmentsToPrepay: 5,
      monthlyInterestRatePct: 3.8
    });

    expect(result.totalWithoutPrepay).toBe(4050);
    expect(result.prepaidInstallmentsNominal).toBe(2250);
    expect(result.prepaidDiscountedAmount).toBeLessThan(1800);
    expect(result.discountSaved).toBeGreaterThan(450);
    expect(result.totalWithPrepay).toBe(result.prepaidDiscountedAmount + 4 * 450);
    expect(result.totalNetSavings).toBeCloseTo(result.totalWithoutPrepay - result.totalWithPrepay, 2);
  });

  it('caps prepay installments to remaining installments if exceeded', () => {
    const result = calculateEarlyPayoff({
      installmentAmount: 500,
      remainingInstallments: 5,
      installmentsToPrepay: 10, // exceeds 5
      monthlyInterestRatePct: 2.0
    });

    expect(result.installmentsToPrepay).toBe(5);
    expect(result.newRemainingInstallments).toBe(0);
    expect(result.futureRemainingAmount).toBe(0);
    expect(result.totalWithPrepay).toBe(result.prepaidDiscountedAmount);
  });

  it('has valid default debt presets for Cartão C6 and Habitação', () => {
    expect(DEFAULT_DEBT_PRESETS.length).toBeGreaterThanOrEqual(3);
    const c6Preset = DEFAULT_DEBT_PRESETS.find(p => p.id === 'c6_parcelas');
    expect(c6Preset).toBeDefined();
    expect(c6Preset?.installmentAmount).toBe(320);

    const habPreset = DEFAULT_DEBT_PRESETS.find(p => p.id === 'habitacional_apto');
    expect(habPreset).toBeDefined();
    expect(habPreset?.installmentAmount).toBe(1290);
  });
});
