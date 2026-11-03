import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getCalendarDaysDiff,
  calculateReminderStatus,
  getActiveReminders,
  getReminderPresetLabel
} from '../src/utils/reminders.ts';

test('getCalendarDaysDiff accurately computes days between dates', () => {
  assert.equal(getCalendarDaysDiff('2026-10-25', '2026-10-25'), 0);
  assert.equal(getCalendarDaysDiff('2026-10-26', '2026-10-25'), 1);
  assert.equal(getCalendarDaysDiff('2026-10-30', '2026-10-25'), 5);
  assert.equal(getCalendarDaysDiff('2026-10-20', '2026-10-25'), -5);
  assert.equal(getCalendarDaysDiff('2026-11-01', '2026-10-31'), 1);
});

test('calculateReminderStatus ignores liquidated transactions', () => {
  const tx = {
    id: 'tx-1',
    date: '2026-10-25',
    description: 'Conta de Energia',
    amount: -150,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    reminderDaysBefore: 3
  };

  const status = calculateReminderStatus(tx, '2026-10-24');
  assert.equal(status.reminderActive, false);
  assert.equal(status.isDueSoon, false);
  assert.equal(status.urgency, 'none');
});

test('calculateReminderStatus triggers reminder when within threshold for scheduled expense', () => {
  const tx = {
    id: 'tx-2',
    date: '2026-10-25',
    description: 'Fatura Cartão C6',
    amount: -2000,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'C6',
    status: 'agendado',
    reminderDaysBefore: 3
  };

  // 4 days before -> not active yet
  const status4DaysBefore = calculateReminderStatus(tx, '2026-10-21');
  assert.equal(status4DaysBefore.reminderActive, false);
  assert.equal(status4DaysBefore.daysRemaining, 4);

  // Exactly 3 days before -> active!
  const status3DaysBefore = calculateReminderStatus(tx, '2026-10-22');
  assert.equal(status3DaysBefore.reminderActive, true);
  assert.equal(status3DaysBefore.isDueSoon, true);
  assert.equal(status3DaysBefore.daysRemaining, 3);
  assert.equal(status3DaysBefore.message, 'Vence em 3 dias');
  assert.equal(status3DaysBefore.urgency, 'upcoming');

  // 1 day before (tomorrow) -> active!
  const status1DayBefore = calculateReminderStatus(tx, '2026-10-24');
  assert.equal(status1DayBefore.reminderActive, true);
  assert.equal(status1DayBefore.daysRemaining, 1);
  assert.equal(status1DayBefore.message, 'Vence amanhã');
  assert.equal(status1DayBefore.urgency, 'upcoming');

  // Due today (diff = 0) -> active!
  const statusToday = calculateReminderStatus(tx, '2026-10-25');
  assert.equal(statusToday.reminderActive, true);
  assert.equal(statusToday.isDueSoon, true);
  assert.equal(statusToday.daysRemaining, 0);
  assert.equal(statusToday.message, 'Vence hoje!');
  assert.equal(statusToday.urgency, 'today');
});

test('calculateReminderStatus flags overdue scheduled expenses as active reminders', () => {
  const tx = {
    id: 'tx-overdue',
    date: '2026-10-20',
    description: 'DAS Simples Nacional',
    amount: -172.10,
    type: 'despesa',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'agendado',
    reminderDaysBefore: 2
  };

  const statusYesterday = calculateReminderStatus(tx, '2026-10-21');
  assert.equal(statusYesterday.reminderActive, true);
  assert.equal(statusYesterday.isOverdue, true);
  assert.equal(statusYesterday.daysRemaining, -1);
  assert.equal(statusYesterday.message, 'Vencido ontem');
  assert.equal(statusYesterday.urgency, 'overdue');

  const statusPast = calculateReminderStatus(tx, '2026-10-23');
  assert.equal(statusPast.reminderActive, true);
  assert.equal(statusPast.isOverdue, true);
  assert.equal(statusPast.daysRemaining, -3);
  assert.equal(statusPast.message, 'Vencido há 3 dias');
  assert.equal(statusPast.urgency, 'overdue');
});

test('calculateReminderStatus handles 0 days anticipation (on the day only)', () => {
  const tx = {
    id: 'tx-same-day',
    date: '2026-10-25',
    description: 'Financiamento Habitacional',
    amount: -1290,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'agendado',
    reminderDaysBefore: 0
  };

  // Day before: not active
  const before = calculateReminderStatus(tx, '2026-10-24');
  assert.equal(before.reminderActive, false);

  // On the day: active
  const today = calculateReminderStatus(tx, '2026-10-25');
  assert.equal(today.reminderActive, true);
  assert.equal(today.message, 'Vence hoje!');
});

test('getActiveReminders sorts correctly: overdue first, then today, then upcoming', () => {
  const transactions = [
    {
      id: 'tx-upcoming-2',
      date: '2026-10-27',
      description: 'Condomínio',
      amount: -450,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado',
      reminderDaysBefore: 5 // diff: 2
    },
    {
      id: 'tx-today',
      date: '2026-10-25',
      description: 'Internet Fibra',
      amount: -120,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado',
      reminderDaysBefore: 2 // diff: 0
    },
    {
      id: 'tx-overdue-5',
      date: '2026-10-20',
      description: 'DAS Simples',
      amount: -172,
      type: 'despesa',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'agendado',
      reminderDaysBefore: 3 // diff: -5
    },
    {
      id: 'tx-overdue-1',
      date: '2026-10-24',
      description: 'Água e Esgoto',
      amount: -80,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado',
      reminderDaysBefore: 3 // diff: -1
    },
    {
      id: 'tx-future-inactive',
      date: '2026-11-15',
      description: 'Curso Online',
      amount: -200,
      type: 'despesa',
      jar: 'EDU_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado',
      reminderDaysBefore: 2 // diff: 21, not active
    }
  ];

  const active = getActiveReminders(transactions, '2026-10-25');
  assert.equal(active.length, 4);

  // Check ordering
  assert.equal(active[0].transaction.id, 'tx-overdue-5'); // -5 days
  assert.equal(active[1].transaction.id, 'tx-overdue-1'); // -1 day
  assert.equal(active[2].transaction.id, 'tx-today');     // 0 days (today)
  assert.equal(active[3].transaction.id, 'tx-upcoming-2'); // 2 days upcoming
});

test('getReminderPresetLabel formats friendly labels', () => {
  assert.equal(getReminderPresetLabel(undefined), 'Sem lembrete');
  assert.equal(getReminderPresetLabel(null), 'Sem lembrete');
  assert.equal(getReminderPresetLabel(0), 'No dia (0d)');
  assert.equal(getReminderPresetLabel(1), '1 dia antes');
  assert.equal(getReminderPresetLabel(2), '2 dias antes');
  assert.equal(getReminderPresetLabel(3), '3 dias antes');
  assert.equal(getReminderPresetLabel(5), '5 dias antes');
  assert.equal(getReminderPresetLabel(7), '7 dias antes');
  assert.equal(getReminderPresetLabel(10), '10 dias antes');
});
