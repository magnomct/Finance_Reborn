import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateJarSavingsGoalsSummary,
  calculateJarShareOfTotalSavings,
  suggestJarSavingsTargets
} from '../src/utils/jarSavingsGoals.ts';

test('calculateJarSavingsGoalsSummary: correctly computes individual progress and share of total savings', () => {
  const transactions = [
    // NEC_55: spent 1800 (cap is 2000 -> savings = 200)
    { id: '1', date: '2026-10-01', description: 'Aluguel', amount: -1800, type: 'despesa', jar: 'NEC_55' },
    // DIV_10: spent 300 (cap is 350 -> savings = 50)
    { id: '2', date: '2026-10-02', description: 'Cinema & Jantar', amount: -300, type: 'despesa', jar: 'DIV_10' },
    // PLP_10: spent 0 (cap is 360 -> savings = 360)
    // LIF_10: spent 0 (cap is 360 -> savings = 360)
    // EDU_10: spent 310 (cap is 360 -> savings = 50)
    { id: '3', date: '2026-10-03', description: 'Livro Técnico', amount: -310, type: 'despesa', jar: 'EDU_10' },
    // FER_5: spent 100 (cap is 180 -> savings = 80)
    { id: '4', date: '2026-10-04', description: 'Presente', amount: -100, type: 'despesa', jar: 'FER_5' }
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
    NEC_55: 200, // exact 200 saved -> 100% progress
    DIV_10: 100, // 50 saved -> 50% progress
    PLP_10: 360, // 360 saved -> 100% progress
    LIF_10: 360, // 360 saved -> 100% progress
    EDU_10: 100, // 50 saved -> 50% progress
    FER_5: 80,   // 80 saved -> 100% progress
    PJ_EXCLUIDO: 0
  };

  const summary = calculateJarSavingsGoalsSummary({
    transactions,
    limits,
    targets,
    effectiveIncomeBase: 3652.31
  });

  // Total monthly savings = 200 + 50 + 360 + 360 + 50 + 80 = 1100
  assert.equal(summary.totalMonthlySavings, 1100);
  // Total targets = 200 + 100 + 360 + 360 + 100 + 80 = 1200
  assert.equal(summary.totalSavingsTargets, 1200);

  // Check NEC_55
  const nec = summary.items.find(i => i.jarId === 'NEC_55');
  assert.ok(nec);
  assert.equal(nec.spent, 1800);
  assert.equal(nec.currentSavings, 200);
  assert.equal(nec.targetProgressPct, 100);
  assert.equal(nec.isTargetReached, true);
  // Share of total monthly savings: 200 / 1100 = 18.2%
  assert.equal(nec.shareOfTotalMonthlySavingsPct, 18.2);

  // Check PLP_10
  const plp = summary.items.find(i => i.jarId === 'PLP_10');
  assert.ok(plp);
  assert.equal(plp.spent, 0);
  assert.equal(plp.currentSavings, 360);
  assert.equal(plp.targetProgressPct, 100);
  assert.equal(plp.isTargetReached, true);
  // Share of total monthly savings: 360 / 1100 = 32.7%
  assert.equal(plp.shareOfTotalMonthlySavingsPct, 32.7);

  // Check DIV_10 (50 saved of 100 target)
  const div = summary.items.find(i => i.jarId === 'DIV_10');
  assert.ok(div);
  assert.equal(div.currentSavings, 50);
  assert.equal(div.targetProgressPct, 50);
  assert.equal(div.isTargetReached, false);
  assert.equal(div.remainingToTarget, 50);
  // Share of total monthly savings: 50 / 1100 = 4.5%
  assert.equal(div.shareOfTotalMonthlySavingsPct, 4.5);

  // Check count of jars meeting target (NEC, PLP, LIF, FER = 4)
  assert.equal(summary.jarsMeetingTargetCount, 4);
});

test('calculateJarShareOfTotalSavings: handles zero total savings safely without NaN', () => {
  assert.equal(calculateJarShareOfTotalSavings(100, 0), 0);
  assert.equal(calculateJarShareOfTotalSavings(0, 0), 0);
  assert.equal(calculateJarShareOfTotalSavings(250, 1000), 25.0);
});

test('suggestJarSavingsTargets: produces proportional targets aligned with 6 potes income', () => {
  const suggestions = suggestJarSavingsTargets(4000);
  assert.equal(suggestions.NEC_55, 200); // 5%
  assert.equal(suggestions.DIV_10, 120); // 3%
  assert.equal(suggestions.PLP_10, 400); // 10%
  assert.equal(suggestions.LIF_10, 200); // 5%
  assert.equal(suggestions.EDU_10, 200); // 5%
  assert.equal(suggestions.FER_5, 120);  // 3%
});
