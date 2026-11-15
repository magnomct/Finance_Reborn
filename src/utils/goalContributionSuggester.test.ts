import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DREAMS, INITIAL_RECURRING } from '../data/initialData';
import { DreamGoal } from '../types';
import {
  applyAllGoalsToBudget,
  applyGoalToBudget,
  calculateRequiredGoalContribution,
  mapGoalToBudgetJar,
} from './goalContributionSuggester';

const REF_DATE = '2026-11-15';

describe('goalContributionSuggester — Per-Goal Calculation & Cross-Module Sync', () => {
  it('computes requiredMonthlyContribution linearly and guards past-due or same-month deadlines to >= 1 month', () => {
    const dreamDec: DreamGoal = {
      id: 'dream-dec',
      title: 'Eliminar Juros de Cheque Especial',
      target: 1000,
      current: 450,
      monthlyDeposit: 250,
      category: 'Reserva / Dívida',
      impact: 'Zerar juros',
      targetDate: '2026-12-31',
      iconName: 'ShieldAlert',
      gradient: 'from-rose-500 to-orange-500',
    };

    const res = calculateRequiredGoalContribution(dreamDec, {
      availableMonthlySurplus: 1100,
      effectiveIncomeBase: 4000,
      recurringList: [],
      referenceDate: REF_DATE,
    });

    // Nov + Dec = 2 months remaining, remainingAmount = 550 => 275/month
    assert.equal(res.remainingAmount, 550);
    assert.equal(res.monthsRemaining, 2);
    assert.equal(res.requiredMonthlyContribution, 275);
    assert.equal(res.deltaVsCurrentPlan, 25);
    assert.equal(res.needsAdjustment, true);
    assert.equal(res.cashFlowImpactPct, 25); // 275 / 1100 = 25%
    assert.equal(res.isSyncedWithBudget, false);
    assert.equal(res.targetJar, 'PLP_10');

    // Past-due deadline must safely clamp monthsRemaining to 1 (no division by 0)
    const pastDueDream: DreamGoal = {
      ...dreamDec,
      id: 'dream-past',
      targetDate: '2026-09-01',
    };
    const pastRes = calculateRequiredGoalContribution(pastDueDream, {
      availableMonthlySurplus: 1000,
      referenceDate: REF_DATE,
    });
    assert.equal(pastRes.monthsRemaining, 1);
    assert.equal(pastRes.isPastDue, true);
    assert.equal(pastRes.requiredMonthlyContribution, 550);
  });

  it('applies compound PMT reduction when yieldRateMonthlyPct is configured and maps liberty goals to LIF_10', () => {
    const libertyDream: DreamGoal = {
      id: 'dream-lif',
      title: 'Carteira de Liberdade Financeira',
      target: 10000,
      current: 1000,
      monthlyDeposit: 200,
      category: 'Liberdade (LIF 10%)',
      impact: 'Renda passiva',
      targetDate: '2027-10-31', // 12 months
      yieldRateMonthlyPct: 0.85,
      iconName: 'TrendingUp',
      gradient: 'from-violet-500 to-purple-500',
    };

    const jar = mapGoalToBudgetJar(libertyDream.category, libertyDream.title);
    assert.equal(jar.jar, 'LIF_10');

    const withYield = calculateRequiredGoalContribution(libertyDream, {
      availableMonthlySurplus: 2000,
      referenceDate: REF_DATE,
    });

    const withoutYield = calculateRequiredGoalContribution(
      { ...libertyDream, yieldRateMonthlyPct: 0 },
      { availableMonthlySurplus: 2000, referenceDate: REF_DATE }
    );

    assert.equal(withYield.targetJar, 'LIF_10');
    assert.ok(
      withYield.requiredMonthlyContribution < withoutYield.requiredMonthlyContribution,
      'Compound yield should lower required monthly contribution'
    );
  });

  it('applyGoalToBudget atomically updates dream and idempotently upserts recurring commitment without duplication', () => {
    const targetDream = INITIAL_DREAMS[0]; // dream-1: target 1000, current 450, targetDate 2026-12-31

    const firstApply = applyGoalToBudget({
      dream: targetDream,
      dreams: INITIAL_DREAMS,
      recurringList: INITIAL_RECURRING,
      availableMonthlySurplus: 1100,
      effectiveIncomeBase: 3652.31,
      referenceDate: REF_DATE,
    });

    assert.equal(firstApply.actionType, 'created');
    assert.equal(firstApply.appliedAmount, 275);
    assert.equal(
      firstApply.updatedDreams.find(d => d.id === targetDream.id)?.monthlyDeposit,
      275
    );
    assert.equal(firstApply.updatedRecurringList.length, INITIAL_RECURRING.length + 1);
    assert.equal(firstApply.recurrence.goalId, targetDream.id);
    assert.equal(firstApply.recurrence.description, `Aporte Recorrente: ${targetDream.title}`);
    assert.equal(firstApply.recurrence.category, `Investimentos / Metas > ${targetDream.title}`);
    assert.equal(firstApply.recurrence.frequency, 'mensal');
    assert.equal(firstApply.recurrence.type, 'despesa');
    assert.equal(firstApply.recurrence.amountPlanned, 275);
    assert.equal(firstApply.recurrence.amount, -275);
    assert.equal(firstApply.suggestion.isSyncedWithBudget, true);

    // Second apply with a modified override amount must update in place without duplicating
    const updatedDreamRef = firstApply.updatedDreams.find(d => d.id === targetDream.id)!;
    const secondApply = applyGoalToBudget({
      dream: updatedDreamRef,
      dreams: firstApply.updatedDreams,
      recurringList: firstApply.updatedRecurringList,
      overrideAmount: 300,
      availableMonthlySurplus: 1100,
      referenceDate: REF_DATE,
    });

    assert.equal(secondApply.actionType, 'updated');
    assert.equal(
      secondApply.updatedRecurringList.length,
      firstApply.updatedRecurringList.length,
      'Must never create duplicate recurrences for the same goalId'
    );
    const syncedRec = secondApply.updatedRecurringList.find(r => r.goalId === targetDream.id);
    assert.equal(syncedRec?.amountPlanned, 300);
    assert.equal(syncedRec?.amount, -300);
  });

  it('applyAllGoalsToBudget syncs all active goals and skips completed goals', () => {
    const completedGoal: DreamGoal = {
      id: 'dream-done',
      title: 'Meta Já Atingida',
      target: 500,
      current: 500,
      monthlyDeposit: 100,
      category: 'Reserva',
      impact: 'Concluída',
      iconName: 'CheckCircle2',
      gradient: 'from-emerald-500 to-teal-500',
    };

    const allDreams = [...INITIAL_DREAMS, completedGoal];
    const bulkRes = applyAllGoalsToBudget({
      dreams: allDreams,
      recurringList: INITIAL_RECURRING,
      availableMonthlySurplus: 3000,
      effectiveIncomeBase: 4500,
      referenceDate: REF_DATE,
    });

    assert.equal(bulkRes.syncedCount, INITIAL_DREAMS.length);
    assert.equal(bulkRes.createdCount, INITIAL_DREAMS.length);
    assert.equal(bulkRes.updatedCount, 0);
    assert.equal(
      bulkRes.updatedRecurringList.length,
      INITIAL_RECURRING.length + INITIAL_DREAMS.length
    );
    assert.equal(
      bulkRes.updatedRecurringList.some(r => r.goalId === 'dream-done'),
      false,
      'Completed goal should not create a recurring outflow'
    );

    // Every synced incomplete goal should report isSyncedWithBudget = true
    for (const dream of INITIAL_DREAMS) {
      const updatedDream = bulkRes.updatedDreams.find(d => d.id === dream.id)!;
      const check = calculateRequiredGoalContribution(updatedDream, {
        recurringList: bulkRes.updatedRecurringList,
        availableMonthlySurplus: 3000,
        referenceDate: REF_DATE,
      });
      assert.equal(check.isSyncedWithBudget, true);
    }
  });
});
