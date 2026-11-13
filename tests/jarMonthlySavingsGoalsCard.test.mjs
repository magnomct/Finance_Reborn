import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateJarSavingsGoalsSummary,
  suggestJarSavingsTargets,
  loadJarSavingsTargets,
  saveJarSavingsTargets
} from '../src/utils/jarSavingsGoals.ts';

test('calculateJarSavingsGoalsSummary: correctly calculates realAporte from direct deposits vs budget headroom', () => {
  const transactions = [
    // PLP_10 direct deposit / aporte
    { 
      id: 'tx-1', 
      date: '2026-10-15', 
      description: 'Aporte Poupança e Ações', 
      amount: -450, 
      type: 'despesa', 
      category: 'Sonhos & Poupança',
      jar: 'PLP_10' 
    },
    // LIF_10 regular expenses
    { 
      id: 'tx-2', 
      date: '2026-10-10', 
      description: 'Compra Mercado', 
      amount: -100, 
      type: 'despesa', 
      jar: 'LIF_10' 
    }
  ];

  const limits = {
    NEC_55: 2000,
    DIV_10: 360,
    PLP_10: 360,
    LIF_10: 360,
    EDU_10: 360,
    FER_5: 180,
    PJ_EXCLUIDO: 0
  };

  const targets = {
    NEC_55: 200,
    DIV_10: 100,
    PLP_10: 300,
    LIF_10: 250,
    EDU_10: 100,
    FER_5: 50,
    PJ_EXCLUIDO: 0
  };

  const summary = calculateJarSavingsGoalsSummary({
    transactions,
    limits,
    targets,
    effectiveIncomeBase: 3652.31
  });

  const plp = summary.items.find(i => i.jarId === 'PLP_10');
  assert.ok(plp);
  // Direct deposit of 450 exceeds the target of 300
  assert.equal(plp.realAporte, 450);
  assert.equal(plp.savingsTarget, 300);
  // Progress pct calculates exact percentage (150%)
  assert.equal(plp.targetProgressPct, 150);
  assert.equal(Math.min(100, plp.targetProgressPct), 100);
  // Target reached
  assert.equal(plp.isTargetReached, true);
  assert.equal(plp.remainingToTarget, 0);

  // LIF_10: limit is 360, spent is 100 -> budget savings is 260. Target is 250.
  const lif = summary.items.find(i => i.jarId === 'LIF_10');
  assert.ok(lif);
  assert.equal(lif.spent, 100);
  assert.equal(lif.currentSavings, 260);
  assert.equal(lif.realAporte, 260);
  assert.equal(lif.isTargetReached, true);
});

test('calculateJarSavingsGoalsSummary: calculates remaining shortfall for jars under target', () => {
  const transactions = [
    // DIV_10 spent 280 of 350 limit -> 70 saved
    { 
      id: 'tx-div', 
      date: '2026-10-12', 
      description: 'Cinema', 
      amount: -280, 
      type: 'despesa', 
      jar: 'DIV_10' 
    }
  ];

  const limits = {
    NEC_55: 2000,
    DIV_10: 350,
    PLP_10: 360,
    LIF_10: 360,
    EDU_10: 360,
    FER_5: 180,
    PJ_EXCLUIDO: 0
  };

  const targets = {
    NEC_55: 200,
    DIV_10: 150, // Saved 70, target is 150 -> remaining 80
    PLP_10: 360,
    LIF_10: 360,
    EDU_10: 100,
    FER_5: 50,
    PJ_EXCLUIDO: 0
  };

  const summary = calculateJarSavingsGoalsSummary({
    transactions,
    limits,
    targets,
    effectiveIncomeBase: 3652.31
  });

  const div = summary.items.find(i => i.jarId === 'DIV_10');
  assert.ok(div);
  assert.equal(div.currentSavings, 70);
  assert.equal(div.savingsTarget, 150);
  assert.equal(div.remainingToTarget, 80);
  assert.equal(div.targetProgressPct, 46.7); // 70 / 150 * 100 = 46.666%
  assert.equal(div.isTargetReached, false);
});

test('suggestJarSavingsTargets: suggests positive targets for all 6 core jars', () => {
  const income = 5000;
  const suggested = suggestJarSavingsTargets(income);
  
  assert.ok(suggested.NEC_55 > 0);
  assert.ok(suggested.DIV_10 > 0);
  assert.ok(suggested.PLP_10 > 0);
  assert.ok(suggested.LIF_10 > 0);
  assert.ok(suggested.EDU_10 > 0);
  assert.ok(suggested.FER_5 > 0);
  
  // Total suggested savings should be within reasonable bounds (e.g. 20-35% of income)
  const totalSuggested = Object.values(suggested).reduce((acc, val) => acc + val, 0);
  assert.ok(totalSuggested > 1000);
  assert.ok(totalSuggested <= 2000);
});
