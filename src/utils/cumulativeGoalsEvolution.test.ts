import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DREAMS } from '../data/initialData';
import { DreamGoal } from '../types';
import { recordGoalContribution } from './goalTrajectory';
import { calculateCumulativeEvolution } from './cumulativeGoalsEvolution';

const REF_DATE = '2026-11-15';

describe('calculateCumulativeEvolution', () => {
  it('computes consolidated evolution across INITIAL_DREAMS and cuts off actualCumulative at future months', () => {
    const result = calculateCumulativeEvolution(INITIAL_DREAMS, {
      selectedDreamId: 'ALL',
      referenceDate: REF_DATE,
    });

    assert.equal(result.hasData, true);
    assert.equal(result.goalsCount, INITIAL_DREAMS.length);
    assert.equal(result.currentMonthKey, '2026-11');
    assert.equal(result.currentMonthLabel, 'Nov/26');

    const expectedCurrentTotal = INITIAL_DREAMS.reduce((s, d) => s + d.current, 0);
    const expectedTargetTotal = INITIAL_DREAMS.reduce((s, d) => s + d.target, 0);
    assert.equal(result.totalCurrentAmount, expectedCurrentTotal);
    assert.equal(result.actualAtCurrentMonth, expectedCurrentTotal);
    assert.equal(result.totalTargetAmount, expectedTargetTotal);

    const pastOrCurrent = result.points.filter(p => !p.isFutureMonth);
    const futurePoints = result.points.filter(p => p.isFutureMonth);

    assert.ok(pastOrCurrent.length >= 6, 'Expected at least 6 elapsed/current months');
    assert.ok(futurePoints.length > 0, 'Expected future months up to final deadline');

    for (const pt of pastOrCurrent) {
      assert.equal(typeof pt.actualCumulative, 'number');
      assert.equal(typeof pt.monthlyVarianceBRL, 'number');
      assert.ok(pt.status === 'ahead' || pt.status === 'behind');
    }

    for (const pt of futurePoints) {
      assert.equal(pt.actualCumulative, null);
      assert.equal(pt.monthlyVarianceBRL, null);
      assert.equal(pt.monthlyVariancePct, null);
      assert.equal(pt.status, null);
    }

    const finalPoint = result.points[result.points.length - 1];
    assert.equal(finalPoint.plannedCumulative, expectedTargetTotal);
  });

  it('correctly classifies individual goal as ahead or behind planned trajectory', () => {
    const aheadGoal: DreamGoal = {
      id: 'goal-ahead',
      title: 'Meta Adiantada',
      target: 1200,
      current: 1100,
      monthlyDeposit: 200,
      category: 'Reserva',
      impact: 'Segurança',
      startDate: '2026-06-01',
      targetDate: '2026-12-31',
      iconName: 'ShieldAlert',
      gradient: 'from-emerald-500 to-teal-500',
      contributionsHistory: [
        { id: 'c1', date: '2026-07-10', amount: 300 },
        { id: 'c2', date: '2026-08-10', amount: 250 },
        { id: 'c3', date: '2026-09-10', amount: 300 },
        { id: 'c4', date: '2026-10-10', amount: 150 },
        { id: 'c5', date: '2026-11-10', amount: 100 },
      ],
    };

    const behindGoal: DreamGoal = {
      id: 'goal-behind',
      title: 'Meta Atrasada',
      target: 1200,
      current: 500,
      monthlyDeposit: 200,
      category: 'Viagem',
      impact: 'Lazer',
      startDate: '2026-06-01',
      targetDate: '2026-12-31',
      iconName: 'Plane',
      gradient: 'from-blue-500 to-indigo-500',
      contributionsHistory: [
        { id: 'b1', date: '2026-07-10', amount: 250 }, // ahead in Jul (250 vs 200)
        { id: 'b2', date: '2026-08-10', amount: 100 }, // behind in Aug (350 vs 400)
        { id: 'b3', date: '2026-11-10', amount: 150 }, // behind in Nov (500 vs 1000)
      ],
    };

    const resAhead = calculateCumulativeEvolution([aheadGoal, behindGoal], {
      selectedDreamId: 'goal-ahead',
      referenceDate: REF_DATE,
    });

    assert.equal(resAhead.goalsCount, 1);
    assert.equal(resAhead.selectedDreamTitle, 'Meta Adiantada');
    assert.equal(resAhead.actualAtCurrentMonth, 1100);
    assert.equal(resAhead.plannedAtCurrentMonth, 1000);
    assert.equal(resAhead.currentVarianceBRL, 100);
    assert.equal(resAhead.currentVariancePct, 10);
    assert.equal(resAhead.currentStatus, 'ahead');

    const resBehind = calculateCumulativeEvolution([aheadGoal, behindGoal], {
      selectedDreamId: 'goal-behind',
      referenceDate: REF_DATE,
    });

    assert.equal(resBehind.actualAtCurrentMonth, 500);
    assert.equal(resBehind.plannedAtCurrentMonth, 1000);
    assert.equal(resBehind.currentVarianceBRL, -500);
    assert.equal(resBehind.currentVariancePct, -50);
    assert.equal(resBehind.currentStatus, 'behind');

    // Mixed dot states: Jul/26 was ahead, Nov/26 is behind
    const julPt = resBehind.points.find(p => p.monthKey === '2026-07');
    const novPt = resBehind.points.find(p => p.monthKey === '2026-11');
    assert.equal(julPt?.status, 'ahead');
    assert.equal(novPt?.status, 'behind');
  });

  it('recalculates variance immediately when a new contribution or yield update is applied', () => {
    const baseDream: DreamGoal = {
      ...INITIAL_DREAMS[0], // target: 1000, current: 450, targetDate: 2026-12-31
      startDate: '2026-06-01',
    };

    const before = calculateCumulativeEvolution([baseDream], {
      selectedDreamId: baseDream.id,
      referenceDate: REF_DATE,
    });

    const updatedDream = recordGoalContribution(
      baseDream,
      450,
      '2026-11-15',
      'Aporte extra',
      [],
      REF_DATE
    );

    const after = calculateCumulativeEvolution([updatedDream], {
      selectedDreamId: updatedDream.id,
      referenceDate: REF_DATE,
    });

    assert.equal(after.actualAtCurrentMonth, before.actualAtCurrentMonth + 450);
    assert.ok(after.currentVarianceBRL > before.currentVarianceBRL);
    assert.equal(after.currentStatus, 'ahead');
  });

  it('handles empty dreams gracefully without NaN or crashes', () => {
    const emptyRes = calculateCumulativeEvolution([], {
      selectedDreamId: 'ALL',
      referenceDate: REF_DATE,
    });

    assert.equal(emptyRes.hasData, false);
    assert.equal(emptyRes.goalsCount, 0);
    assert.equal(emptyRes.currentVarianceBRL, 0);
    assert.ok(emptyRes.points.length > 0);
    const future = emptyRes.points.filter(p => p.isFutureMonth);
    assert.ok(future.every(p => p.actualCumulative === null));
  });
});
