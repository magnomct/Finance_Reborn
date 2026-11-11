import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  isLeisureOrVariable, 
  calculateLeisureVariableAnalysis 
} from '../src/utils/leisureVariableAnalysis.ts';

test('isLeisureOrVariable accurately classifies leisure and variable expenses', () => {
  // Lazer
  assert.equal(isLeisureOrVariable({
    id: '1', date: '2026-10-20', description: 'Cinema com amigos', amount: -60, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
  }), true);

  // Variável
  assert.equal(isLeisureOrVariable({
    id: '2', date: '2026-10-21', description: 'Compras diversas', amount: -150, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Gastos Variáveis'
  }), true);

  // Jar DIV_10 even with other category name
  assert.equal(isLeisureOrVariable({
    id: '3', date: '2026-10-22', description: 'Streaming e games', amount: -45, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Assinaturas'
  }), true);

  // Should ignore essential expense
  assert.equal(isLeisureOrVariable({
    id: '4', date: '2026-10-25', description: 'Parcela Financiamento', amount: -1290, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Moradia'
  }), false);

  // Should ignore income even if labeled Lazer
  assert.equal(isLeisureOrVariable({
    id: '5', date: '2026-10-10', description: 'Reembolso Lazer', amount: 50, type: 'receita', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Lazer'
  }), false);
});

test('calculateLeisureVariableAnalysis computes daily average, suggested cut and savings in BRL', () => {
  const transactions = [
    {
      id: 'tx-1',
      date: '2026-10-20',
      description: 'Restaurante Fim de Semana',
      amount: -300,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Magno',
      account: 'C6',
      status: 'liquidado',
      category: 'Lazer'
    },
    {
      id: 'tx-2',
      date: '2026-10-25',
      description: 'Passeio Parque e Lanche',
      amount: -300,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Magno',
      account: 'C6',
      status: 'liquidado',
      category: 'Variável'
    }
  ];

  // Total = 600. Reference date: 2026-10-30
  const result = calculateLeisureVariableAnalysis(transactions, 20, '2026-10-30', 30);

  assert.equal(result.hasData, true);
  assert.equal(result.totalSpent, 600);
  assert.equal(result.dailyAverage, 20); // 600 / 30 = 20
  assert.equal(result.selectedCutPercent, 20);
  assert.equal(result.suggestedDailyCut, 4); // 20 * 0.20 = 4
  assert.equal(result.suggestedMonthlySavings, 120); // 4 * 30 = 120
  assert.equal(result.suggestedAnnualSavings, 1440); // 120 * 12 = 1440
  assert.equal(result.transactionCount, 2);
  assert.equal(result.topExpense.amount, 300);
});

test('calculateLeisureVariableAnalysis generates scenarios for 10%, 20%, 30%, and 50%', () => {
  const transactions = [
    {
      id: 'tx-1',
      date: '2026-10-15',
      description: 'Lazer C6',
      amount: -900,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Magno',
      account: 'C6',
      status: 'liquidado',
      category: 'Lazer'
    }
  ];

  // Total 900 -> Daily avg 30
  const result = calculateLeisureVariableAnalysis(transactions, 20, '2026-10-30', 30);
  assert.equal(result.dailyAverage, 30);

  const scenario10 = result.scenarios.find(s => s.percent === 10);
  assert.equal(scenario10.dailyCut, 3);
  assert.equal(scenario10.monthlySavings, 90);
  assert.equal(scenario10.annualSavings, 1080);

  const scenario20 = result.scenarios.find(s => s.percent === 20);
  assert.equal(scenario20.dailyCut, 6);
  assert.equal(scenario20.monthlySavings, 180);
  assert.equal(scenario20.annualSavings, 2160);

  const scenario50 = result.scenarios.find(s => s.percent === 50);
  assert.equal(scenario50.dailyCut, 15);
  assert.equal(scenario50.monthlySavings, 450);
  assert.equal(scenario50.annualSavings, 5400);
});

test('calculateLeisureVariableAnalysis handles empty lists gracefully without errors or NaN', () => {
  const result = calculateLeisureVariableAnalysis([], 20, '2026-10-30', 30);
  assert.equal(result.hasData, false);
  assert.equal(result.totalSpent, 0);
  assert.equal(result.dailyAverage, 0);
  assert.equal(result.suggestedDailyCut, 0);
  assert.equal(result.suggestedMonthlySavings, 0);
  assert.equal(result.suggestedAnnualSavings, 0);
  assert.ok(result.adviceMessage.includes('Nenhum gasto'));
});
