import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDreamsDashboardSummary } from '../src/utils/dreamsSummary.ts';

describe('Dreams Cumulative Progress Dashboard Summary Tests', () => {
  test('returns safe zero defaults when dreams list is empty or undefined', () => {
    const emptyResult = calculateDreamsDashboardSummary([]);
    assert.equal(emptyResult.totalCount, 0);
    assert.equal(emptyResult.activeCount, 0);
    assert.equal(emptyResult.completedCount, 0);
    assert.equal(emptyResult.totalAccumulated, 0);
    assert.equal(emptyResult.totalTarget, 0);
    assert.equal(emptyResult.totalRemaining, 0);
    assert.equal(emptyResult.overallPercentage, 0);
    assert.equal(emptyResult.formattedPercentage, '0,0%');
    assert.equal(emptyResult.statusHeadline, 'Nenhum sonho cadastrado');

    const undefResult = calculateDreamsDashboardSummary(undefined);
    assert.equal(undefResult.totalCount, 0);
    assert.equal(undefResult.overallPercentage, 0);
  });

  test('calculates cumulative percentage and remaining values correctly for active dreams', () => {
    const dreams = [
      { id: '1', title: 'Carro Novo', target: 50000, current: 15000, monthlyDeposit: 1000 },
      { id: '2', title: 'Viagem Japão', target: 30000, current: 5000, monthlyDeposit: 800 },
      { id: '3', title: 'Reserva Emergência', target: 20000, current: 10000, monthlyDeposit: 500 }
    ];

    // Total target = 50k + 30k + 20k = 100,000
    // Total current = 15k + 5k + 10k = 30,000
    // Expected percentage = 30.0%
    // Remaining = 70,000
    // Monthly deposit sum = 1000 + 800 + 500 = 2300
    const summary = calculateDreamsDashboardSummary(dreams);

    assert.equal(summary.totalCount, 3);
    assert.equal(summary.activeCount, 3);
    assert.equal(summary.completedCount, 0);
    assert.equal(summary.totalAccumulated, 30000);
    assert.equal(summary.totalTarget, 100000);
    assert.equal(summary.totalRemaining, 70000);
    assert.equal(summary.overallPercentage, 30);
    assert.equal(summary.formattedPercentage, '30,0%');
    assert.equal(summary.monthlyDepositSum, 2300);
    assert.equal(summary.statusHeadline, 'Ritmo Consistente 🌱');
  });

  test('correctly handles completed and partially completed goals', () => {
    const dreams = [
      { id: '1', title: 'Notebook Pro', target: 10000, current: 10000, monthlyDeposit: 500 }, // Completed
      { id: '2', title: 'Curso Especialização', target: 6000, current: 6000, monthlyDeposit: 300 }, // Completed
      { id: '3', title: 'Reforma Escritório', target: 4000, current: 2000, monthlyDeposit: 200 } // Active
    ];

    // Total target = 20,000
    // Total current = 18,000
    // Expected percentage = 90.0%
    const summary = calculateDreamsDashboardSummary(dreams);

    assert.equal(summary.totalCount, 3);
    assert.equal(summary.completedCount, 2);
    assert.equal(summary.activeCount, 1);
    assert.equal(summary.totalAccumulated, 18000);
    assert.equal(summary.totalTarget, 20000);
    assert.equal(summary.totalRemaining, 2000);
    assert.equal(summary.overallPercentage, 90);
    assert.equal(summary.formattedPercentage, '90,0%');
    assert.equal(summary.statusHeadline, 'Reta Final 🚀');
  });

  test('returns 100% and congratulatory headline when all goals reached target', () => {
    const dreams = [
      { id: '1', title: 'Reserva', target: 12000, current: 12000, monthlyDeposit: 500 },
      { id: '2', title: 'Smart TV', target: 4000, current: 4500, monthlyDeposit: 200 } // Exceeded target
    ];

    // Total target = 16,000
    // Total current = 16,500
    const summary = calculateDreamsDashboardSummary(dreams);

    assert.equal(summary.totalCount, 2);
    assert.equal(summary.completedCount, 2);
    assert.equal(summary.activeCount, 0);
    assert.equal(summary.totalRemaining, 0);
    assert.ok(summary.overallPercentage >= 100);
    assert.equal(summary.statusHeadline, '100% Concluído! 🎉');
  });

  test('ignores goals with invalid or non-positive targets', () => {
    const dreams = [
      { id: '1', title: 'Vago', target: 0, current: 0 },
      { id: '2', title: 'Válido', target: 5000, current: 2500, monthlyDeposit: 250 }
    ];

    const summary = calculateDreamsDashboardSummary(dreams);
    assert.equal(summary.totalCount, 1);
    assert.equal(summary.totalTarget, 5000);
    assert.equal(summary.totalAccumulated, 2500);
    assert.equal(summary.overallPercentage, 50);
    assert.equal(summary.statusHeadline, 'Mais da Metade 🎯');
  });
});
