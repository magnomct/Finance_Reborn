import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  isNecessityExpense, 
  calculateSavingsVsNecessities 
} from '../src/utils/savingsVsNecessities.ts';

test('isNecessityExpense identifies essential necessity expenses', () => {
  // Jar NEC_55
  assert.equal(isNecessityExpense({
    id: '1', date: '2026-10-25', description: 'Financiamento Apto', amount: -1290, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Moradia'
  }), true);

  // Grocery
  assert.equal(isNecessityExpense({
    id: '2', date: '2026-10-15', description: 'Supermercado Mensal', amount: -650, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Alimentação'
  }), true);

  // Public transport
  assert.equal(isNecessityExpense({
    id: '3', date: '2026-10-07', description: 'Condução Semanal', amount: -120, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Passe', status: 'liquidado', category: 'Transporte'
  }), true);

  // Non-necessity: Lazer / DIV_10
  assert.equal(isNecessityExpense({
    id: '4', date: '2026-10-22', description: 'Fatura C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'C6', status: 'liquidado', category: 'Lazer'
  }), false);

  // Income should not be counted as necessity expense
  assert.equal(isNecessityExpense({
    id: '5', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado', category: 'Salário'
  }), false);
});

test('calculateSavingsVsNecessities returns 6 months series and accurate totals', () => {
  const summary = calculateSavingsVsNecessities();

  assert.equal(summary.months.length, 6);
  assert.equal(summary.months[0].shortName, 'Mai');
  assert.equal(summary.months[5].shortName, 'Out');

  summary.months.forEach(m => {
    assert.equal(m.poupado, Math.round((m.receitas - m.despesas) * 100) / 100);
    assert.ok(m.necessidades > 0);
    assert.ok(typeof m.savingsRate === 'number');
    assert.ok(typeof m.ratioSavingsToNecessities === 'number');
  });

  assert.ok(summary.totalReceitas > 0);
  assert.ok(summary.totalDespesas > 0);
  assert.ok(summary.totalNecessidades > 0);
  assert.ok(summary.totalPoupado > 0);
  assert.ok(summary.overallRatio > 0);
  assert.ok(typeof summary.trendStatus === 'string');
  assert.ok(summary.trendStatus === 'positiva' || summary.trendStatus === 'negativa');
  assert.ok(summary.trendHeadline.length > 0);
  assert.ok(summary.trendExplanation.length > 0);
  assert.ok(summary.recommendation.length > 0);
});

test('calculateSavingsVsNecessities detects positive trend when savings grow vs necessities', () => {
  const customReceitas = [4500, 4600, 4700, 5000, 5200, 5500];
  const customDespesas = [4200, 4200, 4200, 4000, 3900, 3800];
  const customNecessidades = [2500, 2500, 2500, 2400, 2300, 2200];

  const summary = calculateSavingsVsNecessities({
    annualReceitas: [0, 0, 0, 0, ...customReceitas],
    annualDespesas: [0, 0, 0, 0, ...customDespesas],
    annualNecessidades: [0, 0, 0, 0, ...customNecessidades]
  });

  assert.equal(summary.trendStatus, 'positiva');
  assert.ok(summary.trendPercentage > 0);
  assert.ok(summary.trendHeadline.includes('Positiva'));
});

test('calculateSavingsVsNecessities detects negative trend when necessities rise and squeeze savings', () => {
  const customReceitas = [5000, 5000, 5000, 5000, 5000, 5000];
  // First 3 months have low expenses/necessities (high savings)
  // Last 3 months have high expenses/necessities (low savings)
  const customDespesas = [3500, 3600, 3500, 4800, 4900, 4990];
  const customNecessidades = [2000, 2000, 2000, 3200, 3300, 3400];

  const summary = calculateSavingsVsNecessities({
    annualReceitas: [0, 0, 0, 0, ...customReceitas],
    annualDespesas: [0, 0, 0, 0, ...customDespesas],
    annualNecessidades: [0, 0, 0, 0, ...customNecessidades]
  });

  assert.equal(summary.trendStatus, 'negativa');
  assert.ok(summary.trendPercentage < 0);
  assert.ok(summary.trendHeadline.includes('Negativa'));
});
