import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getCalendarDaysDiff, 
  calculateDreamUrgency, 
  getCriticalDreams,
  DEFAULT_URGENCY_DAYS_THRESHOLD 
} from '../src/utils/dreamUrgency.ts';

describe('Dream Urgency & Critical Recalculation Tests', () => {

  test('getCalendarDaysDiff computes exact days difference between dates', () => {
    // 2026-10-25 to 2026-12-31 is 67 days
    const diff1 = getCalendarDaysDiff('2026-12-31', '2026-10-25');
    assert.equal(diff1, 67);

    // Same day
    const diffSame = getCalendarDaysDiff('2026-10-25', '2026-10-25');
    assert.equal(diffSame, 0);

    // Past deadline
    const diffPast = getCalendarDaysDiff('2026-10-10', '2026-10-25');
    assert.equal(diffPast, -15);
  });

  test('calculateDreamUrgency recognizes completed goal', () => {
    const dream = {
      id: 'd-comp',
      title: 'Meta Paga',
      target: 1000,
      current: 1000,
      monthlyDeposit: 100,
      category: 'Reserva',
      impact: 'Feito',
      targetDate: '2026-11-05',
      iconName: 'Target',
      gradient: 'from-blue-500 to-indigo-500'
    };

    const status = calculateDreamUrgency(dream, '2026-10-25');
    assert.equal(status.isCompleted, true);
    assert.equal(status.isCritical, false);
    assert.equal(status.recalculatedMonthlyDeposit, 0);
  });

  test('calculateDreamUrgency flags critical goal within urgency threshold and recalculates deposit', () => {
    // Target: 2500, Current: 850 -> Remaining: 1650.
    // Target date: 2026-12-20. From 2026-10-25, difference is 56 days.
    // Urgency threshold: 60 days (56 <= 60 => critical!).
    // Months remaining: 2 (October + November/December = 2).
    // Recalculated deposit: 1650 / 2 = 825.00
    // Current deposit: 200.00
    // Deficit: 825 - 200 = 625.00
    const dream = {
      id: 'd-viagem',
      title: 'Viagem de Fim de Ano',
      target: 2500,
      current: 850,
      monthlyDeposit: 200,
      category: 'Lazer',
      impact: 'Viagem em família',
      targetDate: '2026-12-20',
      urgencyDaysThreshold: 60,
      iconName: 'Plane',
      gradient: 'from-emerald-500 to-teal-500'
    };

    const status = calculateDreamUrgency(dream, '2026-10-25');
    assert.equal(status.isCritical, true);
    assert.equal(status.isOverdue, false);
    assert.equal(status.daysRemaining, 56);
    assert.equal(status.remainingAmount, 1650);
    assert.equal(status.monthsRemaining, 3); // Outubro, Novembro, Dezembro
    assert.equal(status.recalculatedMonthlyDeposit, 550);
    assert.equal(status.monthlyDepositDeficit, 350);
    assert.match(status.statusLabel, /Meta Crítica|Prazo de Urgência/);
  });

  test('calculateDreamUrgency flags overdue goal if target date has passed', () => {
    const dream = {
      id: 'd-overdue',
      title: 'Meta Expirada',
      target: 2000,
      current: 500,
      monthlyDeposit: 150,
      category: 'Educação',
      impact: 'Curso',
      targetDate: '2026-10-15',
      iconName: 'Book',
      gradient: 'from-purple-500 to-indigo-500'
    };

    const status = calculateDreamUrgency(dream, '2026-10-25');
    assert.equal(status.isOverdue, true);
    assert.equal(status.daysRemaining, -10);
    assert.equal(status.remainingAmount, 1500);
    // Overdue recommends entire remaining amount immediately
    assert.equal(status.recalculatedMonthlyDeposit, 1500);
  });

  test('calculateDreamUrgency handles far future goal with normal status', () => {
    const dream = {
      id: 'd-far',
      title: 'Aposentadoria / Liberdade',
      target: 50000,
      current: 5000,
      monthlyDeposit: 500,
      category: 'LIF',
      impact: 'Longo prazo',
      targetDate: '2028-12-31',
      urgencyDaysThreshold: 60,
      iconName: 'Wallet',
      gradient: 'from-blue-500 to-indigo-500'
    };

    const status = calculateDreamUrgency(dream, '2026-10-25');
    assert.equal(status.isCritical, false);
    assert.equal(status.isOverdue, false);
    assert.equal(status.urgencyLevel, 'normal');
  });

  test('getCriticalDreams filters and sorts critical dreams by proximity', () => {
    const dreams = [
      {
        id: 'd-1',
        title: 'Meta Longe',
        target: 10000,
        current: 1000,
        monthlyDeposit: 200,
        category: 'A',
        impact: 'A',
        targetDate: '2028-01-01',
        iconName: 'A',
        gradient: 'A'
      },
      {
        id: 'd-2',
        title: 'Meta Próxima 1 (56 dias)',
        target: 2000,
        current: 500,
        monthlyDeposit: 100,
        category: 'B',
        impact: 'B',
        targetDate: '2026-12-20',
        urgencyDaysThreshold: 60,
        iconName: 'B',
        gradient: 'B'
      },
      {
        id: 'd-3',
        title: 'Meta Próxima 2 (20 dias)',
        target: 1000,
        current: 200,
        monthlyDeposit: 100,
        category: 'C',
        impact: 'C',
        targetDate: '2026-11-14',
        urgencyDaysThreshold: 60,
        iconName: 'C',
        gradient: 'C'
      }
    ];

    const criticalList = getCriticalDreams(dreams, '2026-10-25');
    assert.equal(criticalList.length, 2);
    // Closest first
    assert.equal(criticalList[0].dream.id, 'd-3');
    assert.equal(criticalList[1].dream.id, 'd-2');
  });
});
