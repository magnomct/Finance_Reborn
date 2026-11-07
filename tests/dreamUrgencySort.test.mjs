import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimatedTimeToGoal, sortDreams } from '../src/utils/dreamCalculations.ts';

const mockGoals = [
  {
    id: 'd-1',
    title: 'Viagem de Férias',
    target: 6000,
    current: 3000,
    monthlyDeposit: 500,
    category: 'Lazer',
    impact: 'Descanso anual',
    targetDate: '2027-04-01',
    priority: 'media',
    iconName: 'Plane',
    gradient: 'from-amber-400 to-orange-500'
  },
  {
    id: 'd-2',
    title: 'Reserva de Emergência Familiar',
    target: 15000,
    current: 4000,
    monthlyDeposit: 1000,
    category: 'Segurança',
    impact: 'Proteção financeira',
    targetDate: '2026-12-15', // Close deadline (within ~38 days from 2026-11-07)
    priority: 'alta',
    iconName: 'Shield',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'd-3',
    title: 'Curso de Especialização',
    target: 2000,
    current: 2000, // Completed
    monthlyDeposit: 200,
    category: 'Educação',
    impact: 'Carreira',
    targetDate: '2026-11-30',
    priority: 'alta',
    iconName: 'Book',
    gradient: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'd-4',
    title: 'Troca de Smartphone',
    target: 3500,
    current: 500,
    monthlyDeposit: 300,
    category: 'Tecnologia',
    impact: 'Produtividade',
    targetDate: '2027-12-31',
    priority: 'baixa',
    iconName: 'Smartphone',
    gradient: 'from-purple-500 to-pink-500'
  }
];

test('calculateEstimatedTimeToGoal: calculates remaining time and completion date based on monthly economy', () => {
  // Goal: R$ 6.000 target, R$ 3.000 current = R$ 3.000 remaining.
  // User saves R$ 500/month -> 6 months.
  const refDate = '2026-11-07';
  const res = calculateEstimatedTimeToGoal(6000, 3000, 500, '2027-05-01', refDate);

  assert.equal(res.remainingAmount, 3000);
  assert.equal(res.estimatedMonths, 6);
  assert.equal(res.formattedEstimatedTime, '6 meses');
  assert.equal(res.isCompleted, false);
  assert.equal(res.hasTargetDate, true);
  // May 2027 is 6 months away -> on track
  assert.ok(res.statusVsTargetDate === 'on_track' || res.statusVsTargetDate === 'ahead');
  assert.ok(res.formattedCompletionMonthYear.includes('2027'));
});

test('calculateEstimatedTimeToGoal: detects delays and suggests required monthly savings to hit target date', () => {
  // Target R$ 10.000, current R$ 2.000 = R$ 8.000 remaining.
  // Saving R$ 400/month -> 20 months needed.
  // But targetDate is only 5 months away ('2027-04-01' from '2026-11-07')
  const refDate = '2026-11-07';
  const res = calculateEstimatedTimeToGoal(10000, 2000, 400, '2027-04-01', refDate);

  assert.equal(res.statusVsTargetDate, 'delayed');
  assert.equal(res.estimatedMonths, 20);
  assert.ok(res.delayMonths > 0);
  // Required monthly savings to hit target in ~5 months is ~1600/month
  assert.ok(res.requiredMonthlyForTargetDate > 1000);
  assert.ok(res.statusMessage.includes('Atrasará'));
});

test('calculateEstimatedTimeToGoal: handles completed goals properly', () => {
  const res = calculateEstimatedTimeToGoal(5000, 5000, 500, '2027-01-01');
  assert.equal(res.isCompleted, true);
  assert.equal(res.remainingAmount, 0);
  assert.equal(res.estimatedMonths, 0);
  assert.equal(res.statusVsTargetDate, 'completed');
});

test('calculateEstimatedTimeToGoal: handles zero monthly savings gracefully', () => {
  const res = calculateEstimatedTimeToGoal(5000, 1000, 0, '2027-01-01');
  assert.equal(res.isCompleted, false);
  assert.equal(res.monthlySavings, 0);
  assert.equal(res.formattedEstimatedTime, 'Defina uma economia mensal');
});

test('sortDreams: sorts by urgency putting critical/near-deadline high priority goals first and completed last', () => {
  const sorted = sortDreams(mockGoals, 'urgency', '2026-11-07');
  
  // d-2 is high priority with targetDate 2026-12-15 (< 60 days, critical) -> should be #1
  assert.equal(sorted[0].id, 'd-2');

  // d-3 is completed -> should be last
  assert.equal(sorted[sorted.length - 1].id, 'd-3');
});

test('sortDreams: sorts by priority (alta -> media -> baixa)', () => {
  const sorted = sortDreams(mockGoals, 'priority');
  
  const priorities = sorted.map(d => d.priority || 'media');
  assert.equal(priorities[0], 'alta');
  assert.equal(priorities[1], 'alta');
  assert.equal(priorities[2], 'media');
  assert.equal(priorities[3], 'baixa');
});

test('sortDreams: sorts by target date ascending', () => {
  const sorted = sortDreams(mockGoals, 'targetDate');
  
  assert.equal(sorted[0].id, 'd-3'); // 2026-11-30
  assert.equal(sorted[1].id, 'd-2'); // 2026-12-15
  assert.equal(sorted[2].id, 'd-1'); // 2027-04-01
  assert.equal(sorted[3].id, 'd-4'); // 2027-12-31
});
