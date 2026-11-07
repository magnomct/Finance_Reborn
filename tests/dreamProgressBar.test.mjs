import test from 'node:test';
import assert from 'node:assert/strict';

function calculateDreamProgress(current, target) {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(100, Math.max(0, (current / safeTarget) * 100));
  const remaining = Math.max(0, target - current);
  const isCompleted = current >= target;

  return {
    pct,
    remaining,
    isCompleted,
    milestones: {
      passed25: pct >= 25,
      passed50: pct >= 50,
      passed75: pct >= 75,
      passed100: isCompleted
    }
  };
}

test('calculateDreamProgress calculates percentage and remaining shortfall correctly', () => {
  const res = calculateDreamProgress(3500, 10000);
  assert.equal(res.pct, 35);
  assert.equal(res.remaining, 6500);
  assert.equal(res.isCompleted, false);
  assert.equal(res.milestones.passed25, true);
  assert.equal(res.milestones.passed50, false);
});

test('calculateDreamProgress handles completed goals', () => {
  const res = calculateDreamProgress(12000, 10000);
  assert.equal(res.pct, 100);
  assert.equal(res.remaining, 0);
  assert.equal(res.isCompleted, true);
  assert.equal(res.milestones.passed100, true);
});

test('calculateDreamProgress handles zero initial balance', () => {
  const res = calculateDreamProgress(0, 5000);
  assert.equal(res.pct, 0);
  assert.equal(res.remaining, 5000);
  assert.equal(res.isCompleted, false);
  assert.equal(res.milestones.passed25, false);
});
