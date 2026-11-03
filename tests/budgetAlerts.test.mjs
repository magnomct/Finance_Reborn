import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJarExpense,
  calculateJarBudgetAlerts,
  suggestLimitsFromIncome,
  DEFAULT_JAR_LIMITS
} from '../src/utils/budgetAlerts.ts';

test('calculateJarExpense: accurately sums expenses and deducts refunds', () => {
  const transactions = [
    { id: '1', date: '2026-10-01', description: 'Mercado', amount: -400, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    { id: '2', date: '2026-10-02', description: 'Farmácia', amount: -100, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    { id: '3', date: '2026-10-03', description: 'Reembolso Remédio', amount: 50, type: 'reembolso', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    { id: '4', date: '2026-10-04', description: 'Cinema', amount: -80, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
  ];

  // For NEC_55: 400 + 100 - 50 = 450
  const necSpent = calculateJarExpense(transactions, 'NEC_55');
  assert.equal(necSpent, 450);

  // For DIV_10: 80
  const divSpent = calculateJarExpense(transactions, 'DIV_10');
  assert.equal(divSpent, 80);

  // For EDU_10: 0
  const eduSpent = calculateJarExpense(transactions, 'EDU_10');
  assert.equal(eduSpent, 0);
});

test('calculateJarBudgetAlerts: triggers WARNING when gasto >= 80% and EXCEEDED when > 100%', () => {
  const customLimits = {
    ...DEFAULT_JAR_LIMITS,
    NEC_55: 1000,
    DIV_10: 500,
    EDU_10: 200,
  };

  const transactions = [
    // NEC_55: 850 spent out of 1000 (85%) -> WARNING
    { id: '1', date: '2026-10-05', description: 'Contas', amount: -850, type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    // DIV_10: 550 spent out of 500 (110%) -> EXCEEDED
    { id: '2', date: '2026-10-06', description: 'Restaurante', amount: -550, type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
    // EDU_10: 100 spent out of 200 (50%) -> OK
    { id: '3', date: '2026-10-07', description: 'Livro', amount: -100, type: 'despesa', jar: 'EDU_10', costCenter: 'Magno', account: 'Inter PF', status: 'liquidado' },
  ];

  const alerts = calculateJarBudgetAlerts(transactions, customLimits);

  const divAlert = alerts.find(a => a.jarId === 'DIV_10');
  const necAlert = alerts.find(a => a.jarId === 'NEC_55');
  const eduAlert = alerts.find(a => a.jarId === 'EDU_10');

  assert.ok(divAlert);
  assert.equal(divAlert.status, 'EXCEEDED');
  assert.equal(divAlert.usagePercent, 110);
  assert.equal(divAlert.threshold80, 400);

  assert.ok(necAlert);
  assert.equal(necAlert.status, 'WARNING');
  assert.equal(necAlert.usagePercent, 85);
  assert.equal(necAlert.threshold80, 800);

  assert.ok(eduAlert);
  assert.equal(eduAlert.status, 'OK');
  assert.equal(eduAlert.usagePercent, 50);

  // Verifies sorting: EXCEEDED first, then WARNING, then OK
  assert.equal(alerts[0].jarId, 'DIV_10');
  assert.equal(alerts[1].jarId, 'NEC_55');
});

test('suggestLimitsFromIncome: generates correct 6 pot percentage splits', () => {
  const income = 4000;
  const suggested = suggestLimitsFromIncome(income);

  assert.equal(suggested.NEC_55, 2200); // 55%
  assert.equal(suggested.DIV_10, 400);  // 10%
  assert.equal(suggested.PLP_10, 400);  // 10%
  assert.equal(suggested.LIF_10, 400);  // 10%
  assert.equal(suggested.EDU_10, 400);  // 10%
  assert.equal(suggested.FER_5, 200);   // 5%
});
