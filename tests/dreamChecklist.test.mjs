import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMonthlyChecklistProgress,
  toggleDreamDeposit,
  markAllDreamDeposits
} from '../src/utils/dreamChecklist.ts';

const mockDreams = [
  { id: 'd1', title: 'Reserva Emergência', target: 10000, current: 2000, monthlyDeposit: 300, category: 'Reserva', impact: 'Segurança', iconName: 'Shield', gradient: 'from-blue-500' },
  { id: 'd2', title: 'Viagem Férias', target: 5000, current: 1500, monthlyDeposit: 150, category: 'Férias', impact: 'Descanso', iconName: 'Plane', gradient: 'from-amber-500' },
  { id: 'd3', title: 'Curso Especialização', target: 2000, current: 500, monthlyDeposit: 100, category: 'Educação', impact: 'Carreira', iconName: 'Book', gradient: 'from-purple-500' },
];

test('computeMonthlyChecklistProgress: calculates planned vs completed accurately', () => {
  // Total planned = 300 + 150 + 100 = 550
  const progressEmpty = computeMonthlyChecklistProgress(mockDreams, []);
  assert.equal(progressEmpty.totalPlanned, 550);
  assert.equal(progressEmpty.totalCompleted, 0);
  assert.equal(progressEmpty.completedCount, 0);
  assert.equal(progressEmpty.totalCount, 3);
  assert.equal(progressEmpty.completionPercent, 0);

  // Mark d1 and d3 completed: 300 + 100 = 400 (400 / 550 = ~73%)
  const progressPartial = computeMonthlyChecklistProgress(mockDreams, ['d1', 'd3']);
  assert.equal(progressPartial.totalPlanned, 550);
  assert.equal(progressPartial.totalCompleted, 400);
  assert.equal(progressPartial.completedCount, 2);
  assert.equal(progressPartial.completionPercent, 73);

  // Mark all completed
  const progressFull = computeMonthlyChecklistProgress(mockDreams, ['d1', 'd2', 'd3']);
  assert.equal(progressFull.totalCompleted, 550);
  assert.equal(progressFull.completedCount, 3);
  assert.equal(progressFull.completionPercent, 100);
});

test('toggleDreamDeposit: toggles dream ID presence immutably', () => {
  const initial = ['d1'];
  const added = toggleDreamDeposit(initial, 'd2');
  assert.deepEqual(added, ['d1', 'd2']);
  assert.notEqual(initial, added);

  const removed = toggleDreamDeposit(added, 'd1');
  assert.deepEqual(removed, ['d2']);
});

test('markAllDreamDeposits: extracts all dream ids', () => {
  const allIds = markAllDreamDeposits(mockDreams);
  assert.deepEqual(allIds, ['d1', 'd2', 'd3']);
});
