import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseYearMonth,
  getMondayFirstDayOfWeek,
  getDaysInMonth,
  buildWeeklyCalendar
} from '../src/utils/agendaWeekly.ts';

test('parseYearMonth correctly extracts year, month, and ISO yearMonth string', () => {
  const r1 = parseYearMonth('Outubro / 2026');
  assert.equal(r1.year, 2026);
  assert.equal(r1.month, 10);
  assert.equal(r1.yearMonth, '2026-10');

  const r2 = parseYearMonth('2026-11');
  assert.equal(r2.year, 2026);
  assert.equal(r2.month, 11);
  assert.equal(r2.yearMonth, '2026-11');

  const r3 = parseYearMonth('Janeiro 2027');
  assert.equal(r3.year, 2027);
  assert.equal(r3.month, 1);
  assert.equal(r3.yearMonth, '2027-01');
});

test('getMondayFirstDayOfWeek correctly returns 0 for Monday through 6 for Sunday', () => {
  // 2026-10-05 is a Monday
  const monday = new Date(2026, 9, 5);
  assert.equal(getMondayFirstDayOfWeek(monday), 0);

  // 2026-10-11 is a Sunday
  const sunday = new Date(2026, 9, 11);
  assert.equal(getMondayFirstDayOfWeek(sunday), 6);

  // 2026-10-01 is a Thursday
  const thursday = new Date(2026, 9, 1);
  assert.equal(getMondayFirstDayOfWeek(thursday), 3);
});

test('getDaysInMonth returns correct days count', () => {
  assert.equal(getDaysInMonth(2026, 10), 31);
  assert.equal(getDaysInMonth(2026, 11), 30);
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2024, 2), 29); // leap year
});

test('buildWeeklyCalendar groups transactions into weeks and accumulates cash flow', () => {
  const transactions = [
    // Week 1 (01 to 04/10) - empty in this sample
    // Week 2 (05 to 11/10)
    { id: '1', date: '2026-10-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '2', date: '2026-10-07', description: 'Condução', amount: -120, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Passe', status: 'liquidado' },
    { id: '3', date: '2026-10-10', description: 'Salário CLT', amount: 2000, type: 'receita', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },

    // Week 3 (12 to 18/10)
    { id: '4', date: '2026-10-15', description: 'Reembolso Nathan', amount: 800, type: 'reembolso', jar: 'NEC_55', costCenter: 'Nathan', account: 'Inter PF', status: 'liquidado' },
    { id: '5', date: '2026-10-15', description: 'Shopee', amount: -140, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },

    // Week 4 (19 to 25/10)
    { id: '6', date: '2026-10-22', description: 'Fatura C6', amount: -2600, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'C6', status: 'liquidado' },
    { id: '7', date: '2026-10-25', description: 'Parcela Apto', amount: -1290, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'agendado' }
  ];

  const result = buildWeeklyCalendar(transactions, 'Outubro / 2026');

  assert.equal(result.yearMonth, '2026-10');
  assert.equal(result.monthName, 'Outubro');
  assert.ok(result.weeks.length >= 5);

  // Week 1 (01 to 04/10)
  const w1 = result.weeks[0];
  assert.equal(w1.weekNumber, 1);
  assert.equal(w1.income, 0);
  assert.equal(w1.expense, 0);
  assert.equal(w1.net, 0);
  assert.equal(w1.accumulatedCashFlow, 0);

  // Week 2 (05 to 11/10): Income 3000 + 2000 = 5000, Expense 120, Net = 4880
  const w2 = result.weeks[1];
  assert.equal(w2.weekNumber, 2);
  assert.equal(w2.income, 5000);
  assert.equal(w2.expense, 120);
  assert.equal(w2.net, 4880);
  assert.equal(w2.accumulatedCashFlow, 4880);
  assert.equal(w2.transactionCount, 3);

  // Check Monday (05/10) in Week 2
  const segDay = w2.days.find(d => d.dayOfWeekShort === 'Seg' && d.isInCurrentMonth);
  assert.ok(segDay);
  assert.equal(segDay.dayOfMonth, 5);
  assert.equal(segDay.transactions.length, 1);
  assert.equal(segDay.transactions[0].description, 'Serviço PJ');

  // Week 3 (12 to 18/10): Income 800, Expense 140, Net = 660, Accumulated = 4880 + 660 = 5540
  const w3 = result.weeks[2];
  assert.equal(w3.weekNumber, 3);
  assert.equal(w3.income, 800);
  assert.equal(w3.expense, 140);
  assert.equal(w3.net, 660);
  assert.equal(w3.accumulatedCashFlow, 5540);

  // Week 4 (19 to 25/10): Expense 2600 + 1290 = 3890, Net = -3890, Accumulated = 5540 - 3890 = 1650
  const w4 = result.weeks[3];
  assert.equal(w4.weekNumber, 4);
  assert.equal(w4.income, 0);
  assert.equal(w4.expense, 3890);
  assert.equal(w4.net, -3890);
  assert.equal(w4.accumulatedCashFlow, 1650);

  // Summary
  assert.equal(result.summary.totalIncome, 5800);
  assert.equal(result.summary.totalExpense, 4150);
  assert.equal(result.summary.netMonth, 1650);
  assert.equal(result.summary.totalTransactions, 7);
  assert.equal(result.summary.highestIncomeWeekNumber, 2);
  assert.equal(result.summary.highestExpenseWeekNumber, 4);
});
