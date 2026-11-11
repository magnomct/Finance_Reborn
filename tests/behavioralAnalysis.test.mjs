import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLeisureExpense,
  extractTransactionHour,
  getTimePeriodFromHour,
  calculateBehavioralAnalysis
} from '../src/utils/behavioralAnalysis.ts';

test('isLeisureExpense classifies leisure and discretionary fun expenses', () => {
  // Lazer category
  assert.equal(isLeisureExpense({
    id: '1', date: '2026-10-22', description: 'Cinema & Pipoca', amount: -80, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
  }), true);

  // Jar DIV_10 even with generic category
  assert.equal(isLeisureExpense({
    id: '2', date: '2026-10-22', description: 'Fatura Cartão C6 (Lazer & Estilo)', amount: -600, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), true);

  // Description matching delivery or bar
  assert.equal(isLeisureExpense({
    id: '3', date: '2026-10-23', description: 'Delivery iFood Burger', amount: -65, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), true);

  // Essential expense should NOT be leisure
  assert.equal(isLeisureExpense({
    id: '4', date: '2026-10-25', description: 'Financiamento Apto', amount: -1290, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Moradia'
  }), false);

  // Income should NOT be leisure expense
  assert.equal(isLeisureExpense({
    id: '5', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado'
  }), false);
});

test('extractTransactionHour correctly extracts and infers hour', () => {
  // Explicit time field
  assert.equal(extractTransactionHour({
    id: 't1', date: '2026-10-22', time: '21:30', description: 'Bar com amigos', amount: -100, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 21);

  // Morning explicit time
  assert.equal(extractTransactionHour({
    id: 't2', date: '2026-10-22', time: '09:15', description: 'Café da manhã', amount: -25, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 9);

  // Date with ISO timestamp
  assert.equal(extractTransactionHour({
    id: 't3', date: '2026-10-22T14:45:00', description: 'Lanche da tarde', amount: -35, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 14);

  // Description time hint
  assert.equal(extractTransactionHour({
    id: 't4', date: '2026-10-22', description: 'Happy hour às 20h', amount: -90, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 20);

  // Contextual fallback: almoço -> 14h
  assert.equal(extractTransactionHour({
    id: 't5', date: '2026-10-22', description: 'Almoço restaurante', amount: -75, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 14);

  // Contextual fallback: delivery / ifood -> 21h
  assert.equal(extractTransactionHour({
    id: 't6', date: '2026-10-22', description: 'iFood pizza', amount: -60, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado'
  }), 21);
});

test('getTimePeriodFromHour correctly classifies manha, tarde, noite', () => {
  assert.equal(getTimePeriodFromHour(6), 'manha');
  assert.equal(getTimePeriodFromHour(11), 'manha');
  assert.equal(getTimePeriodFromHour(12), 'tarde');
  assert.equal(getTimePeriodFromHour(17), 'tarde');
  assert.equal(getTimePeriodFromHour(18), 'noite');
  assert.equal(getTimePeriodFromHour(22), 'noite');
  assert.equal(getTimePeriodFromHour(23), 'noite');
  assert.equal(getTimePeriodFromHour(0), 'noite');
  assert.equal(getTimePeriodFromHour(5), 'noite');
});

test('calculateBehavioralAnalysis aggregates periods and generates mental lockout', () => {
  const transactions = [
    // Manhã: 50
    {
      id: 'tx-1', date: '2026-10-20', time: '09:00', description: 'Padaria café gourmet', amount: -50, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
    },
    // Tarde: 150
    {
      id: 'tx-2', date: '2026-10-21', time: '15:30', description: 'Cafeteria e sobremesa', amount: -150, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
    },
    // Noite: 800 (Pico)
    {
      id: 'tx-3', date: '2026-10-22', time: '21:00', description: 'Fatura Cartão C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
    },
    {
      id: 'tx-4', date: '2026-10-23', time: '22:30', description: 'Delivery iFood', amount: -200, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
    }
  ];

  const result = calculateBehavioralAnalysis(transactions);

  assert.equal(result.hasData, true);
  assert.equal(result.totalLeisureSpent, 1000);
  assert.equal(result.transactionCount, 4);

  // Period stats
  assert.equal(result.periods.manha.totalAmount, 50);
  assert.equal(result.periods.manha.percentage, 5);

  assert.equal(result.periods.tarde.totalAmount, 150);
  assert.equal(result.periods.tarde.percentage, 15);

  assert.equal(result.periods.noite.totalAmount, 800);
  assert.equal(result.periods.noite.percentage, 80);
  assert.equal(result.periods.noite.isPeak, true);

  // Peak period is Noite
  assert.equal(result.peakPeriod.period, 'noite');
  assert.equal(result.peakPeriod.label, 'Noite');

  // Mental Lockout recommendation
  assert.equal(result.mentalLockout.recommendedWindow, '20:00 às 23:59');
  assert.equal(result.mentalLockout.startHour, 20);
  assert.equal(result.mentalLockout.endHour, 24);
  assert.equal(result.mentalLockout.potentialMonthlySavings, 320); // 40% of 800
  assert.equal(result.mentalLockout.guardrails.length >= 3, true);
  assert.equal(result.behavioralInsights.length >= 3, true);
});

test('calculateBehavioralAnalysis handles empty transactions smoothly', () => {
  const result = calculateBehavioralAnalysis([]);
  assert.equal(result.hasData, false);
  assert.equal(result.totalLeisureSpent, 0);
  assert.equal(result.transactionCount, 0);
  assert.equal(result.periods.noite.isPeak, false);
  assert.equal(result.periods.manha.isPeak, false);
});
