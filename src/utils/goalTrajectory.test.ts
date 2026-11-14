import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGoalTrajectory,
  calculateDreamGoalTrajectory,
  generateFallbackContributions,
  recordGoalContribution,
} from './goalTrajectory';
import { DreamGoal } from '../types';

test('calculateGoalTrajectory builds linear idealCumulative from R$ 0 at startDate to targetAmount at targetDate', () => {
  const result = calculateGoalTrajectory({
    targetAmount: 1200,
    currentAmount: 600,
    startDate: '2026-06-01',
    targetDate: '2026-12-31',
    contributionsHistory: [
      { id: 'c1', date: '2026-06-10', amount: 150 },
      { id: 'c2', date: '2026-07-10', amount: 150 },
      { id: 'c3', date: '2026-08-10', amount: 150 },
      { id: 'c4', date: '2026-09-10', amount: 150 },
    ],
    referenceDate: '2026-09-15',
  });

  // 7 months inclusive: Jun, Jul, Aug, Sep, Oct, Nov, Dec (indices 0..6)
  assert.equal(result.points.length, 7);
  assert.equal(result.points[0].monthKey, '2026-06');
  assert.equal(result.points[0].idealCumulative, 0);
  assert.equal(result.points[6].monthKey, '2026-12');
  assert.equal(result.points[6].idealCumulative, 1200);

  // At Sep (idx 3 of 6 -> 50% of 1200 = 600)
  const sepPoint = result.points[3];
  assert.equal(sepPoint.monthKey, '2026-09');
  assert.equal(sepPoint.isCurrentMonth, true);
  assert.equal(sepPoint.idealCumulative, 600);
  assert.equal(sepPoint.actualCumulative, 600);
  assert.equal(sepPoint.deltaBRL, 0);

  // Future months (Oct, Nov, Dec) have null actualCumulative and deltaBRL
  assert.equal(result.points[4].actualCumulative, null);
  assert.equal(result.points[5].actualCumulative, null);
  assert.equal(result.points[6].actualCumulative, null);

  assert.equal(result.pacingStatus, 'ahead');
  assert.match(result.pacingBadgeLabel, /No Ritmo \/ Adiantado/);
  assert.equal(result.last3MonthsAvgDeposit, 150);
  assert.equal(result.requiredMonthlyDepositNow, 150); // 600 remaining / 4 remaining months (Sep..Dec)
});

test('calculateGoalTrajectory supports compound ideal progression when yieldRateMonthlyPct > 0', () => {
  const result = calculateGoalTrajectory({
    targetAmount: 10000,
    currentAmount: 2000,
    startDate: '2026-01-01',
    targetDate: '2026-12-31',
    yieldRateMonthlyPct: 1,
    contributionsHistory: [
      { id: 'c1', date: '2026-06-10', amount: 2000 },
    ],
    referenceDate: '2026-06-15',
  });

  assert.equal(result.points[0].idealCumulative, 0);
  assert.equal(result.points[result.points.length - 1].idealCumulative, 10000);
  // Compound midpoint should be slightly below linear midpoint (5000 at month 6 of 11 -> ~4545 linear vs lower compound)
  const juneIdeal = result.points.find(p => p.monthKey === '2026-06')!.idealCumulative;
  assert.ok(juneIdeal > 0 && juneIdeal < (10000 * 5) / 11);
});

test('calculateGoalTrajectory classifies slight_delay (-10% to 0%) vs behind (< -10%) accurately', () => {
  // Expected at 2026-09 is R$ 600.00. Actual = R$ 560.00 (-6.67% -> slight_delay)
  const slightDelay = calculateGoalTrajectory({
    targetAmount: 1200,
    currentAmount: 560,
    startDate: '2026-06-01',
    targetDate: '2026-12-31',
    contributionsHistory: [
      { id: 'c1', date: '2026-06-10', amount: 200 },
      { id: 'c2', date: '2026-07-10', amount: 180 },
      { id: 'c3', date: '2026-08-10', amount: 100 },
      { id: 'c4', date: '2026-09-10', amount: 80 },
    ],
    referenceDate: '2026-09-15',
  });

  assert.equal(slightDelay.scheduleVarianceBRL, -40);
  assert.equal(slightDelay.pacingStatus, 'slight_delay');
  assert.match(slightDelay.pacingBadgeLabel, /Atenção: Leve Atraso/);

  // Actual = R$ 300.00 (-50% -> behind)
  const behind = calculateGoalTrajectory({
    targetAmount: 1200,
    currentAmount: 300,
    startDate: '2026-06-01',
    targetDate: '2026-12-31',
    contributionsHistory: [
      { id: 'c1', date: '2026-06-10', amount: 100 },
      { id: 'c2', date: '2026-08-10', amount: 200 },
    ],
    referenceDate: '2026-09-15',
  });

  assert.equal(behind.scheduleVarianceBRL, -300);
  assert.equal(behind.pacingStatus, 'behind');
  assert.match(behind.pacingBadgeLabel, /Fora da Trajetória/);
});

test('generateFallbackContributions produces deterministic history summing exactly to flat currentAmount', () => {
  const entries = generateFallbackContributions(450, 'dream-1', undefined, '2026-11-14');
  assert.ok(entries.length >= 3);
  const total = Math.round(entries.reduce((acc, e) => acc + e.amount, 0) * 100) / 100;
  assert.equal(total, 450);

  const emptyEntries = generateFallbackContributions(0, 'dream-zero', undefined, '2026-11-14');
  assert.equal(emptyEntries.length, 0);
});

test('recordGoalContribution materializes fallback history and appends new deposit immutably', () => {
  const baseDream: DreamGoal = {
    id: 'dream-1',
    title: 'Eliminar Juros',
    target: 1000,
    current: 450,
    monthlyDeposit: 250,
    category: 'Economia',
    impact: 'Alívio mensal',
    targetDate: '2026-12-31',
    iconName: 'Zap',
    gradient: 'from-amber-500 to-orange-500',
  };

  const updated = recordGoalContribution(baseDream, 200, '2026-11-14', 'Aporte extra', [], '2026-11-14');
  assert.equal(updated.current, 650);
  assert.equal(baseDream.current, 450); // immutable
  assert.ok(Array.isArray(updated.contributionsHistory) && updated.contributionsHistory.length >= 4);

  const historySum = Math.round(updated.contributionsHistory!.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  assert.equal(historySum, 650);

  const traj = calculateDreamGoalTrajectory(updated, [], 0, '2026-11-14');
  assert.equal(traj.actualAtCurrentMonth, 650);
  assert.equal(traj.usedFallbackHistory, false);
});
