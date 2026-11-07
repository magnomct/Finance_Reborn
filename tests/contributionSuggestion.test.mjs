import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateContributionSuggestion } from '../src/utils/dreamCalculations.ts';

test('calculateContributionSuggestion: calculates monthly suggestion based on remaining deadline', () => {
  // Goal: R$ 12.000 target, R$ 0 current = R$ 12.000 remaining.
  // Target date is in 12 months from reference date
  const refDate = '2026-11-07';
  const targetDate = '2027-10-31'; // ~12 months
  const res = calculateContributionSuggestion(12000, 0, 0, targetDate, refDate);

  assert.equal(res.remainingAmount, 12000);
  assert.equal(res.isCompleted, false);
  assert.equal(res.hasTargetDate, true);
  assert.equal(res.isPastDeadline, false);
  assert.equal(res.remainingMonths, 12);
  assert.equal(res.suggestedMonthlyDeposit, 1000); // 12000 / 12
  assert.equal(res.status, 'needs_increase');
  assert.ok(res.recommendationMessage.includes('Aporte atual está'));
});

test('calculateContributionSuggestion: calculates correct contribution when partial balance already accumulated', () => {
  // Goal: R$ 6.000 target, R$ 3.000 current = R$ 3.000 remaining.
  // 6 months remaining
  const refDate = '2026-11-07';
  const targetDate = '2027-04-30'; // 6 months
  const res = calculateContributionSuggestion(6000, 3000, 500, targetDate, refDate);

  assert.equal(res.remainingAmount, 3000);
  assert.equal(res.remainingMonths, 6);
  assert.equal(res.suggestedMonthlyDeposit, 500); // 3000 / 6
  assert.equal(res.status, 'on_track');
  assert.ok(res.recommendationMessage.includes('perfeitamente alinhado'));
});

test('calculateContributionSuggestion: detects when contribution needs to be increased', () => {
  // Goal: R$ 10.000 target, R$ 2.000 current = R$ 8.000 remaining.
  // 4 months remaining -> needs 2.000/mo. Current deposit is 500/mo.
  const refDate = '2026-11-07';
  const targetDate = '2027-02-28'; // 4 months
  const res = calculateContributionSuggestion(10000, 2000, 500, targetDate, refDate);

  assert.equal(res.remainingAmount, 8000);
  assert.equal(res.remainingMonths, 4);
  assert.equal(res.suggestedMonthlyDeposit, 2000);
  assert.equal(res.differenceVsCurrentDeposit, 1500); // 2000 - 500
  assert.equal(res.status, 'needs_increase');
  assert.ok(res.recommendationMessage.includes('1.500,00'));
});

test('calculateContributionSuggestion: detects when contribution is above the minimum required', () => {
  // Goal: R$ 5.000 target, R$ 2.000 current = R$ 3.000 remaining.
  // 10 months remaining -> needs 300/mo. Current deposit is 600/mo.
  const refDate = '2026-11-07';
  const targetDate = '2027-08-31'; // 10 months
  const res = calculateContributionSuggestion(5000, 2000, 600, targetDate, refDate);

  assert.equal(res.remainingMonths, 10);
  assert.equal(res.suggestedMonthlyDeposit, 300);
  assert.equal(res.differenceVsCurrentDeposit, -300); // 300 - 600
  assert.equal(res.status, 'can_decrease');
  assert.ok(res.recommendationMessage.includes('acima do necessário'));
});

test('calculateContributionSuggestion: handles completed goals properly', () => {
  const res = calculateContributionSuggestion(5000, 5000, 200, '2027-05-01');

  assert.equal(res.isCompleted, true);
  assert.equal(res.remainingAmount, 0);
  assert.equal(res.suggestedMonthlyDeposit, 0);
  assert.equal(res.status, 'completed');
  assert.ok(res.recommendationMessage.includes('Meta atingida'));
});

test('calculateContributionSuggestion: handles missing deadline gracefully', () => {
  const res = calculateContributionSuggestion(5000, 1000, 100, undefined);

  assert.equal(res.hasTargetDate, false);
  assert.equal(res.suggestedMonthlyDeposit, 0);
  assert.equal(res.status, 'no_deadline');
  assert.ok(res.recommendationMessage.includes('Defina uma data alvo'));
});

test('calculateContributionSuggestion: handles expired/past deadlines correctly', () => {
  const refDate = '2026-11-07';
  const targetDate = '2026-10-01'; // Expired last month
  const res = calculateContributionSuggestion(4000, 1000, 200, targetDate, refDate);

  assert.equal(res.isPastDeadline, true);
  assert.equal(res.remainingMonths, 0);
  assert.equal(res.suggestedMonthlyDeposit, 3000); // Full remaining balance
  assert.equal(res.status, 'past_deadline');
  assert.ok(res.recommendationMessage.includes('expirou'));
});
