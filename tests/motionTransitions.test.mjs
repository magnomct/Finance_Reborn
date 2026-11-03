import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  SCREEN_TRANSITION_VARIANTS, 
  TAB_INDICATOR_TRANSITION,
  getScreenTransitionConfig 
} from '../src/utils/motionTransitions.ts';

test('SCREEN_TRANSITION_VARIANTS has valid initial, animate, and exit states', () => {
  assert.equal(SCREEN_TRANSITION_VARIANTS.initial.opacity, 0);
  assert.ok(SCREEN_TRANSITION_VARIANTS.initial.y > 0);
  assert.ok(SCREEN_TRANSITION_VARIANTS.initial.scale && SCREEN_TRANSITION_VARIANTS.initial.scale < 1);

  assert.equal(SCREEN_TRANSITION_VARIANTS.animate.opacity, 1);
  assert.equal(SCREEN_TRANSITION_VARIANTS.animate.y, 0);
  assert.equal(SCREEN_TRANSITION_VARIANTS.animate.scale, 1);
  assert.ok(SCREEN_TRANSITION_VARIANTS.animate.transition.duration <= 0.35);

  assert.equal(SCREEN_TRANSITION_VARIANTS.exit.opacity, 0);
  assert.ok(SCREEN_TRANSITION_VARIANTS.exit.y < 0);
  assert.ok(SCREEN_TRANSITION_VARIANTS.exit.transition.duration <= 0.25);
});

test('TAB_INDICATOR_TRANSITION specifies responsive spring parameters', () => {
  assert.equal(TAB_INDICATOR_TRANSITION.type, 'spring');
  assert.ok(TAB_INDICATOR_TRANSITION.stiffness >= 300);
  assert.ok(TAB_INDICATOR_TRANSITION.damping >= 25);
});

test('getScreenTransitionConfig returns structured configuration with unique key', () => {
  const dashConfig = getScreenTransitionConfig('dashboard');
  assert.equal(dashConfig.key, 'screen-dashboard');
  assert.equal(dashConfig.initial, 'initial');
  assert.equal(dashConfig.animate, 'animate');
  assert.equal(dashConfig.exit, 'exit');
  assert.deepEqual(dashConfig.variants, SCREEN_TRANSITION_VARIANTS);

  const potesConfig = getScreenTransitionConfig('potes');
  assert.equal(potesConfig.key, 'screen-potes');
});
