import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompoundInterest, MARKET_BENCHMARKS } from '../src/utils/compoundInterest.ts';

test('calculateCompoundInterest: calculates zero interest correctly (principal only)', () => {
  const result = calculateCompoundInterest({
    initialAmount: 1000,
    monthlyDeposit: 100,
    annualRatePercent: 0,
    periodValue: 1,
    periodType: 'years'
  });

  // 1000 + 12 * 100 = 2200
  assert.equal(result.totalInvested, 2200);
  assert.equal(result.totalAccumulated, 2200);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalMonths, 12);
  assert.equal(result.yearlyProgression.length, 1);
});

test('calculateCompoundInterest: calculates compound growth accurately over 3 years', () => {
  const result = calculateCompoundInterest({
    initialAmount: 5000,
    monthlyDeposit: 500,
    annualRatePercent: 12, // 12% a.a.
    periodValue: 3,
    periodType: 'years'
  });

  // 5000 + 36 * 500 = 23000 invested
  assert.equal(result.totalInvested, 23000);
  // Total accumulated must be strictly greater than total invested
  assert.ok(result.totalAccumulated > 23000);
  // Total interest must be positive
  assert.ok(result.totalInterest > 3500);
  assert.equal(result.totalMonths, 36);
  assert.equal(result.yearlyProgression.length, 3);
  
  // Year 3 accumulated must exceed year 2, which exceeds year 1
  const y1 = result.yearlyProgression[0].totalAccumulated;
  const y2 = result.yearlyProgression[1].totalAccumulated;
  const y3 = result.yearlyProgression[2].totalAccumulated;
  assert.ok(y2 > y1);
  assert.ok(y3 > y2);
});

test('calculateCompoundInterest: supports periodType = "months"', () => {
  const result = calculateCompoundInterest({
    initialAmount: 2000,
    monthlyDeposit: 200,
    annualRatePercent: 10,
    periodValue: 6,
    periodType: 'months'
  });

  assert.equal(result.totalMonths, 6);
  assert.equal(result.totalInvested, 2000 + 6 * 200);
  assert.ok(result.totalAccumulated > result.totalInvested);
  assert.equal(result.monthlyProgression.length, 6);
});

test('MARKET_BENCHMARKS includes standard Brazilian fixed and variable rates', () => {
  assert.ok(MARKET_BENCHMARKS.length >= 4);
  const selic = MARKET_BENCHMARKS.find(b => b.id === 'selic');
  assert.ok(selic);
  assert.ok(selic.rateAnnual >= 10);
});
