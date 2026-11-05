import test from 'node:test';
import assert from 'node:assert/strict';
import {
  easeOutCubic,
  easeInOutQuad,
  calculateCounterStep,
  getCounterDirection,
  formatCounterCurrency,
  formatCounterNumber,
} from '../src/utils/animatedCounter.ts';

test('easeOutCubic clamps input between 0 and 1 and accelerates out', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(1.5), 1);

  // At t=0.5, easeOutCubic is 1 - (0.5)^3 = 0.875
  assert.equal(easeOutCubic(0.5), 0.875);
});

test('easeInOutQuad behaves symmetrically around 0.5', () => {
  assert.equal(easeInOutQuad(0), 0);
  assert.equal(easeInOutQuad(0.5), 0.5);
  assert.equal(easeInOutQuad(1), 1);
});

test('calculateCounterStep interpolates correctly across progress', () => {
  // Linear check using identity easing
  const linear = (t) => t;
  assert.equal(calculateCounterStep(100, 200, 0, linear), 100);
  assert.equal(calculateCounterStep(100, 200, 0.5, linear), 150);
  assert.equal(calculateCounterStep(100, 200, 1, linear), 200);

  // Negative step / decrementing
  assert.equal(calculateCounterStep(500, 300, 0.5, linear), 400);

  // With default easeOutCubic at t=0.5 (progress=0.5, eased=0.875)
  // 100 + (200 - 100) * 0.875 = 187.5
  assert.equal(calculateCounterStep(100, 200, 0.5), 187.5);
});

test('getCounterDirection accurately identifies upward, downward, and unchanged states', () => {
  assert.equal(getCounterDirection(100, 150), 'up');
  assert.equal(getCounterDirection(250.5, 200.2), 'down');
  assert.equal(getCounterDirection(100.001, 100.002), 'same');
  assert.equal(getCounterDirection(0, 0), 'same');
});

test('formatCounterCurrency outputs correct BRL currency formatting', () => {
  const formatted = formatCounterCurrency(1250.5);
  // Contains R$ and 1.250,50 (handling non-breaking spaces if any)
  assert.ok(formatted.includes('1.250,50'));
  assert.ok(formatted.includes('R$'));
});

test('formatCounterNumber formats with requested decimal precision', () => {
  const formatted = formatCounterNumber(45.678, 1);
  assert.equal(formatted, '45,7');

  const zeroDec = formatCounterNumber(120, 0);
  assert.equal(zeroDec, '120');
});
