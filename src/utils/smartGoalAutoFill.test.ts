import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DreamGoal } from '../types';
import { INITIAL_TRANSACTIONS } from '../data/initialData';
import {
  diffInMonths,
  calculateIdealMonthlyContribution,
  estimateMonthsWithYield,
  estimateMonthlyFreeCashFlow,
  calculateSingleGoalQuickFill,
  calculateSmartAutoFill,
} from './smartGoalAutoFill';

const REF_DATE = new Date('2026-06-15T12:00:00');

const sampleDreams: DreamGoal[] = [
  {
    id: 'goal-urgent',
    title: 'Reserva de Emergência',
    target: 12000,
    current: 6000,
    monthlyDeposit: 400,
    category: 'Reserva (PLP 10%)',
    impact: 'Segurança familiar',
    targetDate: '2026-11-30', // Jun..Nov = 6 months
    priority: 'alta',
    iconName: 'ShieldAlert',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'goal-medium',
    title: 'Viagem em Família',
    target: 10000,
    current: 2000,
    monthlyDeposit: 300,
    category: 'Férias (FER 5%)',
    impact: 'Lazer planejado',
    targetDate: '2027-05-31', // Jun 2026..May 2027 = 12 months
    priority: 'media',
    iconName: 'Plane',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'goal-done',
    title: 'Notebook Novo',
    target: 4000,
    current: 4000,
    monthlyDeposit: 200,
    category: 'Equipamentos',
    impact: 'Trabalho',
    targetDate: '2026-12-31',
    priority: 'baixa',
    iconName: 'Zap',
    gradient: 'from-amber-500 to-orange-600',
  },
];

describe('smartGoalAutoFill — Math & Budget Capacity Engine', () => {
  it('computes diffInMonths safely for future, past-due, and missing deadlines', () => {
    const future = diffInMonths(REF_DATE, '2026-11-30');
    assert.equal(future.hasTargetDate, true);
    assert.equal(future.isPastDue, false);
    assert.equal(future.remainingMonths, 6);

    const pastDue = diffInMonths(REF_DATE, '2026-01-15');
    assert.equal(pastDue.hasTargetDate, true);
    assert.equal(pastDue.isPastDue, true);
    assert.equal(pastDue.remainingMonths, 1);

    const missing = diffInMonths(REF_DATE, undefined);
    assert.equal(missing.hasTargetDate, false);
    assert.equal(missing.isPastDue, false);
    assert.equal(missing.remainingMonths, 12);
  });

  it('calculates linear and compound-yield (0.85% a.m.) ideal monthly contributions accurately', () => {
    const linear = calculateIdealMonthlyContribution(12000, 6000, 6, 0);
    assert.equal(linear, 1000);

    const withYield = calculateIdealMonthlyContribution(12000, 6000, 6, 0.85);
    assert.ok(withYield < linear, `Compound yield (${withYield}) should require less monthly deposit than linear (${linear})`);
    assert.ok(withYield > 900 && withYield < 950);

    // Verify accumulated balance with yield meets or exceeds target in 6 months
    const months = estimateMonthsWithYield(6000, 12000, withYield + 0.05, 0.85);
    assert.ok(months <= 6);
  });

  it('reports rigid_deadline deficit when total ideal exceeds available surplus', () => {
    // Urgent goal: 6000 / 6 = 1000/mo
    // Medium goal: 8000 / 12 = 666.67/mo
    // Total ideal = 1666.67/mo
    const result = calculateSmartAutoFill({
      dreams: sampleDreams,
      availableSurplus: 1200,
      mode: 'rigid_deadline',
      yieldRateMonthlyPct: 0,
      referenceDate: REF_DATE,
    });

    assert.equal(result.activeJarsCount, 2);
    assert.equal(result.completedJarsCount, 1);
    assert.equal(result.budgetHealth, 'over_budget');
    assert.equal(result.totalIdealMonthly, 1666.67);
    assert.equal(result.totalSuggestedMonthly, 1666.67);
    assert.equal(result.budgetDeficit, 466.67);
    assert.equal(result.items[0].dreamId, 'goal-urgent'); // Urgent high-priority goal ranked first
    assert.equal(result.items[0].suggestedMonthlyContribution, 1000);
    assert.equal(result.items[1].suggestedMonthlyContribution, 666.67);
  });

  it('reports fits_budget health when available surplus covers all ideal contributions', () => {
    const result = calculateSmartAutoFill({
      dreams: sampleDreams,
      availableSurplus: 2000,
      mode: 'rigid_deadline',
      yieldRateMonthlyPct: 0,
      referenceDate: REF_DATE,
    });

    assert.equal(result.budgetHealth, 'fits_budget');
    assert.equal(result.budgetDeficit, 0);
    assert.equal(result.budgetRemaining, 333.33);
  });

  it('enforces fit_budget cap <= availableSurplus, prioritizes nearest deadlines, and projects extended dates', () => {
    const result = calculateSmartAutoFill({
      dreams: sampleDreams,
      availableSurplus: 1000,
      mode: 'fit_budget',
      yieldRateMonthlyPct: 0,
      referenceDate: REF_DATE,
    });

    assert.equal(result.budgetHealth, 'over_budget');
    assert.ok(
      result.totalSuggestedMonthly <= 1000.001,
      `Total suggested (${result.totalSuggestedMonthly}) must not exceed surplus (1000)`
    );
    assert.equal(result.totalSuggestedMonthly, 1000);

    const urgentItem = result.items.find(i => i.dreamId === 'goal-urgent')!;
    const mediumItem = result.items.find(i => i.dreamId === 'goal-medium')!;

    // Urgent goal gets proportionally larger share of its ideal deposit than lower priority / longer deadline
    const urgentRatio = urgentItem.suggestedMonthlyContribution / urgentItem.idealMonthlyContribution;
    const mediumRatio = mediumItem.suggestedMonthlyContribution / mediumItem.idealMonthlyContribution;
    assert.ok(urgentRatio > mediumRatio, `Urgent ratio (${urgentRatio}) should beat medium ratio (${mediumRatio})`);

    assert.equal(urgentItem.isCappedByBudget, true);
    assert.ok(urgentItem.projectedMonths > urgentItem.remainingMonths);
    assert.ok(urgentItem.extensionMonths > 0);
  });

  it('handles zero surplus gracefully without NaN or negative values', () => {
    const result = calculateSmartAutoFill({
      dreams: sampleDreams,
      availableSurplus: 0,
      mode: 'fit_budget',
      referenceDate: REF_DATE,
    });

    assert.equal(result.totalSuggestedMonthly, 0);
    assert.ok(result.items.every(i => i.suggestedMonthlyContribution === 0));
    assert.ok(result.items.every(i => i.projectedMonths === Infinity));
  });

  it('calculates single goal quick-fill and real cash flow estimate from INITIAL_TRANSACTIONS', () => {
    const quick = calculateSingleGoalQuickFill(sampleDreams[0], {
      yieldRateMonthlyPct: 0,
      referenceDate: REF_DATE,
    });
    assert.equal(quick.remainingGap, 6000);
    assert.equal(quick.remainingMonths, 6);
    assert.equal(quick.idealMonthlyContribution, 1000);

    const cashFlow = estimateMonthlyFreeCashFlow(INITIAL_TRANSACTIONS, true);
    assert.ok(cashFlow.effectiveIncomeBase > 0);
    assert.ok(cashFlow.estimatedSurplus >= 0);
  });
});
