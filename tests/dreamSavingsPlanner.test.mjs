import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateDreamSavingsItem, 
  calculateDreamSavingsPlannerSummary, 
  updateDreamMonthlySavingsGoal 
} from '../src/utils/dreamSavingsPlanner.ts';

test('calculateDreamSavingsItem computes progress percentage and remaining shortfall correctly', () => {
  const dream = {
    id: 'dream-1',
    title: 'Viagem Japão',
    target: 10000,
    current: 4000,
    monthlyDeposit: 500,
    category: 'Lazer',
    impact: 'Férias',
    iconName: 'Plane',
    gradient: 'from-blue-500 to-indigo-600'
  };

  const item = calculateDreamSavingsItem(dream);
  assert.equal(item.progressPct, 40);
  assert.equal(item.remainingAmount, 6000);
  assert.equal(item.isCompleted, false);
  assert.equal(item.estimatedMonths, 12); // 6000 / 500 = 12
  assert.equal(item.statusBadge.label, 'Em Andamento');
});

test('calculateDreamSavingsItem handles completed goals correctly', () => {
  const dream = {
    id: 'dream-2',
    title: 'Reserva de Emergência',
    target: 5000,
    current: 5500,
    monthlyDeposit: 200,
    category: 'Reserva',
    impact: 'Proteção',
    iconName: 'ShieldAlert',
    gradient: 'from-emerald-500 to-teal-600'
  };

  const item = calculateDreamSavingsItem(dream);
  assert.equal(item.progressPct, 100);
  assert.equal(item.remainingAmount, 0);
  assert.equal(item.isCompleted, true);
  assert.equal(item.estimatedMonths, 0);
  assert.equal(item.statusBadge.label, 'Objetivo Concluído! 🎉');
});

test('calculateDreamSavingsItem flags missing monthly savings goal', () => {
  const dream = {
    id: 'dream-3',
    title: 'Carro Novo',
    target: 50000,
    current: 10000,
    monthlyDeposit: 0,
    category: 'Bens',
    impact: 'Mobilidade',
    iconName: 'Car',
    gradient: 'from-purple-500 to-pink-600'
  };

  const item = calculateDreamSavingsItem(dream);
  assert.equal(item.progressPct, 20);
  assert.equal(item.remainingAmount, 40000);
  assert.equal(item.estimatedMonths, 0);
  assert.equal(item.statusBadge.label, 'Meta Mensal Não Definida');
});

test('calculateDreamSavingsPlannerSummary aggregates total savings goals and progress', () => {
  const dreams = [
    { id: '1', title: 'A', target: 10000, current: 2000, monthlyDeposit: 500, category: 'A', impact: 'A', iconName: 'A', gradient: 'A' },
    { id: '2', title: 'B', target: 20000, current: 10000, monthlyDeposit: 1000, category: 'B', impact: 'B', iconName: 'B', gradient: 'B' }
  ];

  const summary = calculateDreamSavingsPlannerSummary(dreams);
  assert.equal(summary.totalTarget, 30000);
  assert.equal(summary.totalCurrent, 12000);
  assert.equal(summary.totalRemaining, 18000);
  assert.equal(summary.overallProgressPct, 40);
  assert.equal(summary.totalMonthlySavingsGoal, 1500);
  assert.equal(summary.completedCount, 0);
  assert.equal(summary.totalCount, 2);
});

test('updateDreamMonthlySavingsGoal updates goal immutably and handles negatives', () => {
  const dreams = [
    { id: '1', title: 'A', target: 10000, current: 2000, monthlyDeposit: 500, category: 'A', impact: 'A', iconName: 'A', gradient: 'A' },
    { id: '2', title: 'B', target: 20000, current: 10000, monthlyDeposit: 1000, category: 'B', impact: 'B', iconName: 'B', gradient: 'B' }
  ];

  const updated = updateDreamMonthlySavingsGoal(dreams, '1', 800);
  assert.equal(updated[0].monthlyDeposit, 800);
  assert.equal(updated[1].monthlyDeposit, 1000);

  const updatedNegative = updateDreamMonthlySavingsGoal(dreams, '2', -100);
  assert.equal(updatedNegative[1].monthlyDeposit, 0);
});
