import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAnnualSavingsProgress,
  suggestAnnualSavingsTargets,
  DEFAULT_ANNUAL_SAVINGS_TARGETS
} from '../src/utils/annualSavingsGoals.ts';

test('calculateAnnualSavingsProgress: accurately computes cumulative series and variances', () => {
  // Constant targets of 500/month
  const targets = Array(12).fill(500);
  // Realized: 600 in Jan, 400 in Feb, 700 in Mar, 500 in others
  const realized = [600, 400, 700, 500, 500, 500, 500, 500, 500, 500, 500, 500];

  const summary = calculateAnnualSavingsProgress({
    targets,
    realizedSavings: realized,
    currentMonthIndex: 2, // Março
    year: 2026
  });

  assert.equal(summary.totalAnnualTarget, 6000);
  assert.equal(summary.totalAnnualRealized, 6200);

  // Month 0 (Jan):
  // target = 500, cumTarget = 500
  // realized = 600, cumRealized = 600
  // variance = +100
  assert.equal(summary.months[0].cumulativeTarget, 500);
  assert.equal(summary.months[0].cumulativeRealized, 600);
  assert.equal(summary.months[0].cumulativeVariance, 100);
  assert.equal(summary.months[0].isGoalMet, true);

  // Month 1 (Feb):
  // target = 500, cumTarget = 1000
  // realized = 400, cumRealized = 1000
  // variance = 0
  assert.equal(summary.months[1].cumulativeTarget, 1000);
  assert.equal(summary.months[1].cumulativeRealized, 1000);
  assert.equal(summary.months[1].cumulativeVariance, 0);
  assert.equal(summary.months[1].isGoalMet, false); // 400 < 500

  // Month 2 (Mar):
  // target = 500, cumTarget = 1500
  // realized = 700, cumRealized = 1700
  // variance = +200
  assert.equal(summary.months[2].cumulativeTarget, 1500);
  assert.equal(summary.months[2].cumulativeRealized, 1700);
  assert.equal(summary.months[2].cumulativeVariance, 200);
  assert.equal(summary.months[2].isGoalMet, true);

  // Metrics to date (Month 2 = Março):
  assert.equal(summary.cumulativeTargetToDate, 1500);
  assert.equal(summary.cumulativeRealizedToDate, 1700);
  assert.equal(summary.cumulativeVarianceToDate, 200);
  assert.equal(summary.progressToDatePct, 113.3); // (1700 / 1500) * 100 = 113.33%
});

test('calculateAnnualSavingsProgress: correctly identifies deficit when realized falls below target', () => {
  const targets = Array(12).fill(1000);
  const realized = Array(12).fill(700); // 300 under per month

  const summary = calculateAnnualSavingsProgress({
    targets,
    realizedSavings: realized,
    currentMonthIndex: 3, // Abril (4 months)
    year: 2026
  });

  // Cumulative target to April = 4 * 1000 = 4000
  // Cumulative realized to April = 4 * 700 = 2800
  // Variance = 2800 - 4000 = -1200
  assert.equal(summary.cumulativeTargetToDate, 4000);
  assert.equal(summary.cumulativeRealizedToDate, 2800);
  assert.equal(summary.cumulativeVarianceToDate, -1200);
  assert.equal(summary.progressToDatePct, 70);
  assert.ok(summary.statusHeadline.includes('Abaixo'));
});

test('suggestAnnualSavingsTargets: generates reasonable 12-month projections', () => {
  const incomes = Array(12).fill(5000);
  const suggested = suggestAnnualSavingsTargets(incomes);

  assert.equal(suggested.length, 12);
  // ~15% of 5000 = 750
  assert.equal(suggested[0], 750);
  // December has higher target (22% of 5000 = 1100)
  assert.equal(suggested[11], 1100);
});
