import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSACTION_ITEM_VARIANTS,
  getTransactionItemTransition,
  SCREEN_TRANSITION_VARIANTS,
  getScreenTransitionConfig,
} from '../src/utils/motionTransitions.ts';

test('TRANSACTION_ITEM_VARIANTS adheres to fade-in and ascending slide (slide up)', () => {
  // Initial state starts invisible and shifted downwards on the y-axis
  assert.equal(TRANSACTION_ITEM_VARIANTS.initial.opacity, 0);
  assert.ok(TRANSACTION_ITEM_VARIANTS.initial.y > 0, 'initial y must be positive to slide up');

  // Animate state arrives at full opacity and natural y position
  assert.equal(TRANSACTION_ITEM_VARIANTS.animate.opacity, 1);
  assert.equal(TRANSACTION_ITEM_VARIANTS.animate.y, 0);

  // Transition parameters
  assert.ok(TRANSACTION_ITEM_VARIANTS.animate.transition.duration <= 0.35);
  assert.ok(Array.isArray(TRANSACTION_ITEM_VARIANTS.animate.transition.ease));
});

test('getTransactionItemTransition calculates staggered delay with safe capping', () => {
  const item0 = getTransactionItemTransition(0);
  assert.equal(item0.delay, 0);

  const item1 = getTransactionItemTransition(1, 0.03, 0.2);
  assert.equal(item1.delay, 0.03);

  const item5 = getTransactionItemTransition(5, 0.03, 0.2);
  assert.equal(item5.delay, 0.15);

  // Long lists must be capped at maxDelay so items don't take seconds to show up
  const item50 = getTransactionItemTransition(50, 0.03, 0.2);
  assert.equal(item50.delay, 0.2);
});

test('getScreenTransitionConfig formats screen keys cleanly', () => {
  const config = getScreenTransitionConfig('agenda');
  assert.equal(config.key, 'screen-agenda');
  assert.equal(config.initial, 'initial');
  assert.equal(config.animate, 'animate');
});
