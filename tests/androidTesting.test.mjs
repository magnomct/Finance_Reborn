import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRecommendedAppUrl,
  getAndroidTestingSteps,
  checkPwaDiagnostics
} from '../src/utils/androidTestingUtils.js';

test('getRecommendedAppUrl maps localhost to public shared URL for mobile access', () => {
  const fallback = 'https://ais-pre-dvlvkdbcvzcuyiqx54glv3-895853390556.us-east1.run.app';
  
  assert.equal(getRecommendedAppUrl('http://localhost:3000'), fallback);
  assert.equal(getRecommendedAppUrl('http://127.0.0.1:3000/some/path'), fallback);
  assert.equal(
    getRecommendedAppUrl('https://my-domain.com/app'),
    'https://my-domain.com/app'
  );
  assert.equal(getRecommendedAppUrl(''), fallback);
});

test('getAndroidTestingSteps returns 4 structured actionable steps', () => {
  const steps = getAndroidTestingSteps();
  assert.equal(steps.length, 4);
  assert.equal(steps[0].step, 1);
  assert.match(steps[0].title, /Chrome/i);
  assert.match(steps[1].title, /WebAPK|Instale/i);
  assert.match(steps[2].title, /Standalone/i);
  assert.match(steps[3].title, /Offline/i);
});

test('checkPwaDiagnostics returns safe defaults in Node environment without throwing', () => {
  const diagnostics = checkPwaDiagnostics();
  assert.equal(typeof diagnostics.hasServiceWorkerSupport, 'boolean');
  assert.equal(typeof diagnostics.isOnline, 'boolean');
  assert.equal(typeof diagnostics.platformName, 'string');
});
