import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCalendarDaysRemaining,
  calculateDreamCountdown,
  getPriorityConfig,
  updateDreamPriority,
  updateDreamTargetDate,
  PRIORITY_CONFIGS
} from '../src/utils/dreamCountdown.ts';

test('getCalendarDaysRemaining calculates exact day differences', () => {
  // 67 days from Oct 25, 2026 to Dec 31, 2026
  assert.equal(getCalendarDaysRemaining('2026-12-31', '2026-10-25'), 67);
  // Same day
  assert.equal(getCalendarDaysRemaining('2026-10-25', '2026-10-25'), 0);
  // 10 days in the past
  assert.equal(getCalendarDaysRemaining('2026-10-15', '2026-10-25'), -10);
});

test('calculateDreamCountdown handles missing targetDate safely', () => {
  const result = calculateDreamCountdown(undefined, '2026-10-25');
  assert.equal(result.hasDeadline, false);
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.countdownLabel, 'Sem prazo estimado');
  assert.equal(result.urgencyLevel, 'none');
});

test('calculateDreamCountdown handles overdue goals', () => {
  const result = calculateDreamCountdown('2026-10-20', '2026-10-25');
  assert.equal(result.hasDeadline, true);
  assert.equal(result.isPastDeadline, true);
  assert.equal(result.daysRemaining, -5);
  assert.equal(result.countdownLabel, 'Expirado há 5 dias');
  assert.equal(result.urgencyLevel, 'overdue');
});

test('calculateDreamCountdown handles goals due today', () => {
  const result = calculateDreamCountdown('2026-10-25', '2026-10-25');
  assert.equal(result.isToday, true);
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.countdownLabel, 'Termina Hoje!');
  assert.equal(result.urgencyLevel, 'urgent');
});

test('calculateDreamCountdown categorizes urgent deadlines (<= 30 days)', () => {
  const result = calculateDreamCountdown('2026-11-10', '2026-10-25'); // 16 days
  assert.equal(result.daysRemaining, 16);
  assert.equal(result.urgencyLevel, 'urgent');
  assert.equal(result.countdownLabel, '16 dias restantes');
});

test('calculateDreamCountdown categorizes medium deadlines (31-90 days)', () => {
  const result = calculateDreamCountdown('2026-12-25', '2026-10-25'); // 61 days
  assert.equal(result.daysRemaining, 61);
  assert.equal(result.urgencyLevel, 'warning');
  assert.equal(result.countdownLabel, '61 dias restantes');
});

test('calculateDreamCountdown formats target date in DD/MM/YYYY', () => {
  const result = calculateDreamCountdown('2027-05-15', '2026-10-25');
  assert.equal(result.formattedTargetDate, '15/05/2027');
  assert.equal(result.urgencyLevel, 'normal');
});

test('getPriorityConfig returns correct style metadata for all priorities', () => {
  const alta = getPriorityConfig('alta');
  assert.equal(alta.value, 'alta');
  assert.equal(alta.shortLabel, 'Alta');
  assert.ok(alta.badgeClass.includes('rose'));

  const media = getPriorityConfig('media');
  assert.equal(media.value, 'media');
  assert.equal(media.shortLabel, 'Média');
  assert.ok(media.badgeClass.includes('amber'));

  const baixa = getPriorityConfig('baixa');
  assert.equal(baixa.value, 'baixa');
  assert.equal(baixa.shortLabel, 'Baixa');
  assert.ok(baixa.badgeClass.includes('emerald'));

  // Default fallback for invalid or missing priority
  const fallback = getPriorityConfig(undefined);
  assert.equal(fallback.value, 'media');
});

test('updateDreamPriority updates priority immutably', () => {
  const initial = [
    { id: 'd-1', title: 'Carro', priority: 'media' },
    { id: 'd-2', title: 'Viagem', priority: 'baixa' }
  ];

  const updated = updateDreamPriority(initial, 'd-1', 'alta');
  assert.equal(updated[0].priority, 'alta');
  assert.equal(initial[0].priority, 'media'); // Immutable
  assert.equal(updated[1].priority, 'baixa');
});

test('updateDreamTargetDate updates target date immutably', () => {
  const initial = [
    { id: 'd-1', title: 'Carro', targetDate: '2026-12-31' }
  ];

  const updated = updateDreamTargetDate(initial, 'd-1', '2027-06-30');
  assert.equal(updated[0].targetDate, '2027-06-30');
  assert.equal(initial[0].targetDate, '2026-12-31');

  // Clearing target date
  const cleared = updateDreamTargetDate(initial, 'd-1', '');
  assert.equal(cleared[0].targetDate, undefined);
});
