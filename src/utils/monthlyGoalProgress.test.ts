import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DREAMS } from '../data/initialData';
import { DreamGoal, Transaction } from '../types';
import {
  calculateCurrentMonthGoalDeposits,
  calculateGoalPacingMetrics,
  evaluateAllMonthlyGoalsProgress,
  evaluateMonthlyGoalProgress,
  resolveMonthlyTargetBRL,
} from './monthlyGoalProgress';

const makeDream = (overrides: Partial<DreamGoal> = {}): DreamGoal => ({
  id: 'dream-test',
  title: 'Reserva Teste',
  target: 6000,
  current: 3000,
  monthlyDeposit: 500,
  monthlyTargetBRL: 500,
  preferredDepositDay: 10,
  category: 'Segurança (PLP 10%)',
  impact: 'Segurança financeira',
  startDate: '2026-06-01',
  targetDate: '2027-06-01',
  iconName: 'ShieldAlert',
  gradient: 'from-blue-600 to-indigo-600',
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  date: '2026-11-12',
  description: 'Aporte Mensal: Reserva Teste',
  amount: -500,
  type: 'despesa',
  category: 'Sonhos & Poupança',
  jar: 'PLP_10',
  account: 'Inter PF',
  costCenter: 'Magno',
  status: 'liquidado',
  dreamId: 'dream-test',
  ...overrides,
});

describe('monthlyGoalProgress', () => {
  it('marks goal as completed when currentMonthDepositedBRL >= monthlyTargetBRL', () => {
    const dream = makeDream({
      monthlyTargetBRL: 500,
      contributionsHistory: [
        { id: 'c-1', date: '2026-11-08', amount: 300, note: 'Parte 1' },
        { id: 'c-2', date: '2026-11-14', amount: 200, note: 'Parte 2' },
      ],
    });

    const res = evaluateMonthlyGoalProgress(dream, [], '2026-11-15');
    assert.equal(res.status, 'completed');
    assert.equal(res.statusLabel, 'Meta do mês batida (100%)');
    assert.equal(res.currentMonthDepositedBRL, 500);
    assert.equal(res.monthlyProgressPct, 100);
    assert.equal(res.shortfallBRL, 0);
    assert.equal(res.requiresAttention, false);
  });

  it('deduplicates paired contributionsHistory and transactions entries in the same month', () => {
    const dream = makeDream({
      monthlyTargetBRL: 600,
      contributionsHistory: [
        { id: 'fallback-dream-test-2026-11', date: '2026-11-10', amount: 1500, note: 'Histórico consolidado' },
        { id: 'contrib-real-1', date: '2026-11-15', amount: 250, note: 'Aporte novembro' },
      ],
    });
    const txs = [
      makeTx({ id: 'tx-dup', date: '2026-11-15', amount: -250 }),
      makeTx({ id: 'tx-extra', date: '2026-11-16', amount: -100 }),
    ];

    const deposited = calculateCurrentMonthGoalDeposits(dream, txs, '2026-11');
    // Fallback excluded; 250 deduplicated once; +100 unmatched tx = 350
    assert.equal(deposited, 350);
  });

  it('classifies as on_track before preferredDepositDay when cumulative trajectory is healthy', () => {
    const dream = makeDream({
      target: 6000,
      current: 4000,
      startDate: '2026-06-01',
      targetDate: '2027-06-01',
      preferredDepositDay: 15,
      contributionsHistory: [
        { id: 'c-1', date: '2026-06-10', amount: 1000 },
        { id: 'c-2', date: '2026-08-10', amount: 1500 },
        { id: 'c-3', date: '2026-10-10', amount: 1500 },
      ],
    });

    const res = evaluateMonthlyGoalProgress(dream, [], '2026-11-05');
    assert.equal(res.status, 'on_track');
    assert.equal(res.statusLabel, 'Dentro do prazo no mês');
    assert.equal(res.shortfallBRL, 500);
    assert.equal(res.requiresAttention, false);
  });

  it('classifies as warning after preferredDepositDay when < 50% deposited and not in last 10 days', () => {
    const dream = makeDream({
      target: 6000,
      current: 4000,
      startDate: '2026-06-01',
      targetDate: '2027-06-01',
      preferredDepositDay: 10,
      monthlyTargetBRL: 500,
      contributionsHistory: [
        { id: 'c-1', date: '2026-06-10', amount: 1500 },
        { id: 'c-2', date: '2026-09-10', amount: 2400 },
        { id: 'c-3', date: '2026-11-09', amount: 100 }, // 20% of 500
      ],
    });

    const res = evaluateMonthlyGoalProgress(dream, [], '2026-11-15');
    assert.equal(res.status, 'warning');
    assert.equal(res.statusLabel, 'Atenção: Aporte mensal pendente');
    assert.equal(res.monthlyProgressPct, 20);
    assert.equal(res.shortfallBRL, 400);
    assert.equal(res.requiresAttention, true);
  });

  it('classifies as behind during the last 10 days of the month with shortfall > 0', () => {
    const dream = makeDream({
      target: 6000,
      current: 4000,
      startDate: '2026-06-01',
      targetDate: '2027-06-01',
      preferredDepositDay: 10,
      monthlyTargetBRL: 500,
      contributionsHistory: [
        { id: 'c-1', date: '2026-06-10', amount: 2000 },
        { id: 'c-2', date: '2026-10-10', amount: 1800 },
        { id: 'c-3', date: '2026-11-12', amount: 200 },
      ],
    });

    const res = evaluateMonthlyGoalProgress(dream, [], '2026-11-24');
    assert.equal(res.isLast10Days, true);
    assert.equal(res.status, 'behind');
    assert.match(res.statusLabel, /Alerta: Aporte abaixo do planejado/);
    assert.equal(res.shortfallBRL, 300);
    assert.equal(res.requiresAttention, true);
  });

  it('classifies as behind when targetDate is in the past and shortfallBRL > 0', () => {
    const dream = makeDream({
      target: 5000,
      current: 2000,
      targetDate: '2026-10-31',
      preferredDepositDay: 20,
      monthlyTargetBRL: 400,
      contributionsHistory: [{ id: 'c-1', date: '2026-10-05', amount: 2000 }],
    });

    const res = evaluateMonthlyGoalProgress(dream, [], '2026-11-04');
    assert.equal(res.isPastTargetDate, true);
    assert.equal(res.status, 'behind');
    assert.equal(res.shortfallBRL, 400);
  });

  it('aggregates pending goals and totalShortfallBRL across INITIAL_DREAMS', () => {
    const summary = evaluateAllMonthlyGoalsProgress(INITIAL_DREAMS, [], '2026-11-15');
    assert.equal(summary.monthKey, '2026-11');
    assert.equal(summary.items.length, INITIAL_DREAMS.length);
    assert.ok(summary.pendingCount > 0);
    const expectedTotal = summary.pendingItems.reduce((s, i) => s + i.shortfallBRL, 0);
    assert.equal(summary.totalShortfallBRL, Math.round(expectedTotal * 100) / 100);
  });

  it('falls back to suggested deposit when monthlyTargetBRL and monthlyDeposit are missing', () => {
    const dream = makeDream({
      target: 1200,
      current: 0,
      monthlyDeposit: 0,
      monthlyTargetBRL: undefined,
      targetDate: '2027-05-15',
    });
    const resolved = resolveMonthlyTargetBRL(dream, '2026-11-15');
    assert.equal(resolved, 171.43);
  });

  it('calculateGoalPacingMetrics computes Emerald, Amber, and Rose Ritmo de Aporte tiers + guards past-due dates', () => {
    // 1. Emerald: >= 100% and monthlyTarget >= suggestedIdeal
    const emeraldDream = makeDream({
      target: 1000,
      current: 450,
      monthlyTargetBRL: 300,
      targetDate: '2026-12-31', // 2 months left -> ideal = 275
      contributionsHistory: [{ id: 'c-e', date: '2026-11-15', amount: 300 }],
    });
    const emerald = calculateGoalPacingMetrics(emeraldDream, [], '2026-11-15');
    assert.equal(emerald.remainingBalance, 550);
    assert.equal(emerald.remainingMonths, 2);
    assert.equal(emerald.suggestedIdealMonthlyBRL, 275);
    assert.equal(emerald.monthlyCompletionPct, 100);
    assert.equal(emerald.targetVsSuggestedGap, 25);
    assert.equal(emerald.isTargetBelowIdeal, false);
    assert.equal(emerald.ritmoTier, 'emerald');
    assert.equal(emerald.ritmoBadgeLabel, 'No Ritmo / Meta do Mês Atingida');

    // 2. Amber (40% <= pct < 100%)
    const amberPartial = makeDream({
      target: 1000,
      current: 450,
      monthlyTargetBRL: 300,
      targetDate: '2026-12-31',
      contributionsHistory: [{ id: 'c-a', date: '2026-11-15', amount: 150 }],
    });
    const amber = calculateGoalPacingMetrics(amberPartial, [], '2026-11-15');
    assert.equal(amber.monthlyCompletionPct, 50);
    assert.equal(amber.ritmoTier, 'amber');
    assert.equal(amber.ritmoBadgeLabel, 'Aporte Parcial / Em Andamento');

    // 3. Amber when monthlyTargetBRL < suggestedIdealMonthlyBRL even at 100% of low target
    const amberLowTarget = makeDream({
      target: 1000,
      current: 450,
      monthlyTargetBRL: 100, // < 275 ideal
      targetDate: '2026-12-31',
      contributionsHistory: [{ id: 'c-l', date: '2026-11-15', amount: 100 }],
    });
    const amberLow = calculateGoalPacingMetrics(amberLowTarget, [], '2026-11-15');
    assert.equal(amberLow.isTargetBelowIdeal, true);
    assert.equal(amberLow.targetVsSuggestedGap, -175);
    assert.equal(amberLow.ritmoTier, 'amber');

    // 4. Rose (< 40%) + past-due guard (remainingMonths = 1)
    const rosePastDue = makeDream({
      target: 1000,
      current: 600,
      monthlyTargetBRL: 200,
      targetDate: '2026-10-01', // past due
      contributionsHistory: [{ id: 'c-r', date: '2026-11-15', amount: 50 }], // 25%
    });
    const rose = calculateGoalPacingMetrics(rosePastDue, [], '2026-11-15');
    assert.equal(rose.remainingMonths, 1);
    assert.equal(rose.suggestedIdealMonthlyBRL, 400);
    assert.equal(rose.monthlyCompletionPct, 25);
    assert.equal(rose.ritmoTier, 'rose');
    assert.equal(rose.ritmoBadgeLabel, 'Abaixo da Meta Mensal');
    assert.match(rose.ritmoBadgeDetail || '', /Faltam R\$\s*150,00/);
  });
});
