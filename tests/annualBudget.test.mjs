import test from 'node:test';
import assert from 'node:assert/strict';

// Test the math logic for annual budget calculations
function calculateCategoryMetric(budget, spentYTD, elapsedMonths = 10) {
  const annualLimit = Math.max(0, budget.annualLimit);
  const remaining = annualLimit - spentYTD;
  const isExceeded = remaining < 0;
  const overAmount = isExceeded ? Math.abs(remaining) : 0;
  const percentUsed = annualLimit > 0 ? (spentYTD / annualLimit) * 100 : 0;
  const monthlyEquivalentLimit = annualLimit / 12;

  const validElapsed = Math.min(12, Math.max(1, elapsedMonths));
  const monthlyAverageSpent = spentYTD / validElapsed;
  const projectedYearEndSpent = monthlyAverageSpent * 12;

  let paceStatus;
  if (isExceeded) {
    paceStatus = 'exceeded';
  } else if (percentUsed >= 90 || projectedYearEndSpent > annualLimit * 1.1) {
    paceStatus = 'critical';
  } else if (percentUsed >= 75 || projectedYearEndSpent > annualLimit) {
    paceStatus = 'warning';
  } else {
    paceStatus = 'safe';
  }

  return {
    annualLimit,
    monthlyEquivalentLimit,
    spentYTD,
    remaining,
    isExceeded,
    overAmount,
    percentUsed,
    monthlyAverageSpent,
    projectedYearEndSpent,
    paceStatus
  };
}

test('annual category budget metric calculates remaining and percent accurately when within limit', () => {
  const budget = { annualLimit: 12000 };
  const spent = 8000;
  const metric = calculateCategoryMetric(budget, spent, 10);

  assert.equal(metric.remaining, 4000);
  assert.equal(metric.isExceeded, false);
  assert.equal(metric.overAmount, 0);
  assert.equal(metric.percentUsed, (8000 / 12000) * 100);
  assert.equal(metric.monthlyEquivalentLimit, 1000);
});

test('annual category budget metric flags exceeded budget when spent exceeds annual limit', () => {
  const budget = { annualLimit: 5000 };
  const spent = 6500;
  const metric = calculateCategoryMetric(budget, spent, 10);

  assert.equal(metric.remaining, -1500);
  assert.equal(metric.isExceeded, true);
  assert.equal(metric.overAmount, 1500);
  assert.equal(metric.percentUsed, 130);
  assert.equal(metric.paceStatus, 'exceeded');
});

test('pace status detects critical when approaching limit near end of year', () => {
  const budget = { annualLimit: 10000 };
  const spent = 9500; // 95% used
  const metric = calculateCategoryMetric(budget, spent, 10);

  assert.equal(metric.paceStatus, 'critical');
  assert.equal(metric.isExceeded, false);
});
