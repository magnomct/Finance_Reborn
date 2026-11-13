import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDreamMonthlyDeposits,
  detectNewlyUnlockedMilestones,
  evaluateDreamMonthlyMilestones,
  getAchievedMilestones,
  getActiveDreamMilestoneAlerts,
  getHighestMilestone,
  getNextMilestone
} from './dreamMilestones';
import { DreamGoal, Transaction } from '../types';

const sampleDreams: DreamGoal[] = [
  {
    id: 'dream-1',
    title: 'Eliminar Juros de Cheque Especial',
    target: 1000,
    current: 450,
    monthlyDeposit: 250,
    category: 'Economia Imediata',
    impact: 'Reduz juros',
    iconName: 'Zap',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'dream-2',
    title: 'Reserva de Emergência Familiar (6 meses)',
    target: 18300,
    current: 1200,
    monthlyDeposit: 400,
    category: 'Segurança (PLP 10%)',
    impact: 'Segurança familiar',
    iconName: 'ShieldAlert',
    gradient: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'dream-3',
    title: 'Sonho Sem Meta Mensal',
    target: 5000,
    current: 0,
    monthlyDeposit: 0,
    category: 'Outros',
    impact: 'Sem meta mensal definida',
    iconName: 'Target',
    gradient: 'from-slate-500 to-slate-600'
  }
];

test('milestone threshold helpers classify <50%, 50%, 75%, 100%, and >100% accurately', () => {
  assert.deepEqual(getAchievedMilestones(0), []);
  assert.deepEqual(getAchievedMilestones(49.9), []);
  assert.equal(getHighestMilestone(49.9), null);
  assert.equal(getNextMilestone(49.9), 50);

  assert.deepEqual(getAchievedMilestones(50), [50]);
  assert.equal(getHighestMilestone(50), 50);
  assert.equal(getNextMilestone(50), 75);

  assert.deepEqual(getAchievedMilestones(74.9), [50]);
  assert.deepEqual(getAchievedMilestones(75), [50, 75]);
  assert.equal(getHighestMilestone(75), 75);
  assert.equal(getNextMilestone(75), 100);

  assert.deepEqual(getAchievedMilestones(100), [50, 75, 100]);
  assert.equal(getHighestMilestone(100), 100);
  assert.equal(getNextMilestone(100), null);

  assert.deepEqual(getAchievedMilestones(140), [50, 75, 100]);
  assert.equal(getHighestMilestone(140), 100);
});

test('calculateDreamMonthlyDeposits matches by dreamId and title in target month only', () => {
  const txs: Transaction[] = [
    {
      id: 't1',
      date: '2026-11-05',
      description: 'Aporte Sonho: Eliminar Juros de Cheque Especial',
      amount: -125,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança',
      dreamId: 'dream-1'
    },
    {
      id: 't2',
      date: '2026-11-12',
      description: 'Aporte Mensal: Eliminar Juros de Cheque Especial',
      amount: -65,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança'
    },
    {
      id: 't3',
      date: '2026-10-20',
      description: 'Aporte Sonho: Eliminar Juros de Cheque Especial',
      amount: -250,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança',
      dreamId: 'dream-1'
    }
  ];

  assert.equal(calculateDreamMonthlyDeposits(sampleDreams[0], txs, '2026-11'), 190);
  assert.equal(calculateDreamMonthlyDeposits(sampleDreams[0], txs, '2026-10'), 250);
  assert.equal(calculateDreamMonthlyDeposits(sampleDreams[1], txs, '2026-11'), 0);
});

test('evaluateDreamMonthlyMilestones transitions cleanly across 50%, 75%, and 100%', () => {
  // 50% (125 of 250) on dream-1, 75% (300 of 400) on dream-2
  const txsHalfAndThreeQuarters: Transaction[] = [
    {
      id: 't-50',
      date: '2026-11-10',
      description: 'Aporte Sonho: Eliminar Juros de Cheque Especial',
      amount: -125,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança',
      dreamId: 'dream-1'
    },
    {
      id: 't-75',
      date: '2026-11-11',
      description: 'Aporte Sonho: Reserva de Emergência Familiar (6 meses)',
      amount: -300,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança',
      dreamId: 'dream-2'
    }
  ];

  const statuses = evaluateDreamMonthlyMilestones(sampleDreams, txsHalfAndThreeQuarters, '2026-11');
  const d1 = statuses.find(s => s.dreamId === 'dream-1')!;
  const d2 = statuses.find(s => s.dreamId === 'dream-2')!;
  const d3 = statuses.find(s => s.dreamId === 'dream-3')!;

  assert.equal(d1.progressPct, 50);
  assert.equal(d1.highestMilestone, 50);
  assert.equal(d1.remainingForMonth, 125);
  assert.equal(d1.tierConfig?.theme, 'info');
  assert.equal(d1.dismissKey, 'dream-1:2026-11:50');

  assert.equal(d2.progressPct, 75);
  assert.equal(d2.highestMilestone, 75);
  assert.equal(d2.remainingForMonth, 100);
  assert.equal(d2.tierConfig?.theme, 'warning');
  assert.equal(d2.dismissKey, 'dream-2:2026-11:75');

  assert.equal(d3.highestMilestone, null);
  assert.equal(d3.dismissKey, null);

  // Dismissing 50% on dream-1 hides dream-1:50, but upgrading dream-1 to 100% triggers fresh alert!
  const activeBeforeDismiss = getActiveDreamMilestoneAlerts(statuses, []);
  assert.equal(activeBeforeDismiss.length, 2);
  // Sorted highest milestone first (75 then 50)
  assert.equal(activeBeforeDismiss[0].dreamId, 'dream-2');
  assert.equal(activeBeforeDismiss[1].dreamId, 'dream-1');

  const dismissed = ['dream-1:2026-11:50'];
  const activeAfterDismiss = getActiveDreamMilestoneAlerts(statuses, dismissed);
  assert.equal(activeAfterDismiss.length, 1);
  assert.equal(activeAfterDismiss[0].dreamId, 'dream-2');

  // Now deposit +125 to dream-1 -> 250 / 250 = 100%
  const txsFull: Transaction[] = [
    ...txsHalfAndThreeQuarters,
    {
      id: 't-100',
      date: '2026-11-13',
      description: 'Aporte Sonho: Eliminar Juros de Cheque Especial',
      amount: -125,
      type: 'despesa',
      jar: 'PLP_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Sonhos & Poupança',
      dreamId: 'dream-1'
    }
  ];

  const statusesFull = evaluateDreamMonthlyMilestones(sampleDreams, txsFull, '2026-11');
  const activeFull = getActiveDreamMilestoneAlerts(statusesFull, dismissed);
  assert.equal(activeFull.length, 2);
  assert.equal(activeFull[0].dreamId, 'dream-1');
  assert.equal(activeFull[0].highestMilestone, 100);
  assert.equal(activeFull[0].tierConfig?.theme, 'success');
  assert.equal(activeFull[0].remainingForMonth, 0);

  // Toast detection identifies newly unlocked 100% milestone
  const seen = new Set<string>(['dream-1:2026-11:50', 'dream-2:2026-11:75']);
  const unlocked = detectNewlyUnlockedMilestones(statusesFull, seen);
  assert.equal(unlocked.length, 1);
  assert.equal(unlocked[0].dreamId, 'dream-1');
  assert.equal(unlocked[0].highestMilestone, 100);
});
