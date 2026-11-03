import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemainingMonths,
  calculateSuggestedMonthlyDeposit,
  calculateDreamsDonutData
} from '../src/utils/dreamCalculations.ts';

const refDate = '2026-11-02';

test('calculateRemainingMonths: computes month horizon accurately', () => {
  // Same year next month (Nov to Dec = 2 months)
  const decMonths = calculateRemainingMonths('2026-12-31', refDate);
  assert.equal(decMonths, 2);

  // Next year (Nov 2026 to Dec 2027 = 14 months)
  const nextYearMonths = calculateRemainingMonths('2027-12-31', refDate);
  assert.equal(nextYearMonths, 14);

  // Past date
  const pastMonths = calculateRemainingMonths('2026-05-10', refDate);
  assert.equal(pastMonths, 0);

  // Empty string
  assert.equal(calculateRemainingMonths('', refDate), 0);
});

test('calculateSuggestedMonthlyDeposit: recommends required deposit for target date', () => {
  // Goal: R$ 1.000 target, R$ 450 current -> R$ 550 remaining.
  // Deadline: 2026-12-31 (2 months remaining) -> R$ 275,00/mês
  const result = calculateSuggestedMonthlyDeposit(1000, 450, '2026-12-31', refDate);
  assert.equal(result.remainingAmount, 550);
  assert.equal(result.remainingMonths, 2);
  assert.equal(result.suggestedMonthlyDeposit, 275);
  assert.equal(result.isCompleted, false);
  assert.equal(result.isPastDeadline, false);

  // When target is reached
  const completed = calculateSuggestedMonthlyDeposit(5000, 5000, '2026-12-31', refDate);
  assert.equal(completed.remainingAmount, 0);
  assert.equal(completed.suggestedMonthlyDeposit, 0);
  assert.equal(completed.isCompleted, true);

  // When past deadline
  const expired = calculateSuggestedMonthlyDeposit(2000, 500, '2026-08-01', refDate);
  assert.equal(expired.remainingAmount, 1500);
  assert.equal(expired.suggestedMonthlyDeposit, 1500);
  assert.equal(expired.isPastDeadline, true);
});

test('calculateDreamsDonutData: computes slice angles and completion percentages', () => {
  const dreams = [
    { id: 'd1', title: 'Meta 1', target: 1000, current: 500, monthlyDeposit: 100, category: 'Reserva', impact: '', iconName: 'Zap', gradient: 'from-blue-500' },
    { id: 'd2', title: 'Meta 2', target: 2000, current: 500, monthlyDeposit: 100, category: 'Lazer', impact: '', iconName: 'Plane', gradient: 'from-green-500' }
  ];

  const data = calculateDreamsDonutData(dreams, refDate);
  assert.equal(data.totalCurrent, 1000);
  assert.equal(data.totalTarget, 3000);
  assert.equal(data.overallCompletionPct, 33); // 1000 / 3000 = ~33%
  assert.equal(data.slices.length, 2);

  // First slice has 500/1000 = 50% of current accumulated
  assert.equal(data.slices[0].completionPct, 50); // 500/1000
  assert.equal(data.slices[0].fraction, 0.5);
  assert.equal(data.slices[0].startFraction, 0);
  assert.equal(data.slices[0].endFraction, 0.5);

  // Second slice has 500/2000 = 25% of target
  assert.equal(data.slices[1].completionPct, 25);
  assert.equal(data.slices[1].startFraction, 0.5);
  assert.equal(data.slices[1].endFraction, 1);
});
