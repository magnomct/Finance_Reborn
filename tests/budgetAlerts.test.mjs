import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJarExpense,
  calculateJarBudgetAlerts,
  suggestLimitsFromIncome,
  suggestSavingsTargetsFromIncome,
  calculateJarSavingsProgress,
  DEFAULT_JAR_LIMITS,
  DEFAULT_JAR_SAVINGS_TARGETS
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

test('suggestSavingsTargetsFromIncome: generates proportional savings goals', () => {
  const income = 4000;
  const suggested = suggestSavingsTargetsFromIncome(income);

  assert.equal(suggested.NEC_55, 200); // 5%
  assert.equal(suggested.DIV_10, 120); // 3%
  assert.equal(suggested.PLP_10, 400); // 10%
  assert.equal(suggested.LIF_10, 200); // 5%
  assert.equal(suggested.EDU_10, 200); // 5%
  assert.equal(suggested.FER_5, 120);  // 3%
});

test('calculateJarSavingsProgress: accurately computes progress and remaining amount to target', () => {
  // Case 1: Partial progress towards target
  // Limit = 500, Spent = 300 -> Current savings = 200. Target = 400 -> Faltam 200 (50%)
  const prog1 = calculateJarSavingsProgress('DIV_10', 300, 500, 400);
  assert.equal(prog1.currentSavings, 200);
  assert.equal(prog1.remainingToTarget, 200);
  assert.equal(prog1.progressPercent, 50);
  assert.equal(prog1.isTargetReached, false);

  // Case 2: Target reached / exceeded
  // Limit = 400, Spent = 40 -> Current savings = 360. Target = 300 -> Faltam 0 (100%), reached!
  const prog2 = calculateJarSavingsProgress('PLP_10', 40, 400, 300);
  assert.equal(prog2.currentSavings, 360);
  assert.equal(prog2.remainingToTarget, 0);
  assert.equal(prog2.progressPercent, 100);
  assert.equal(prog2.isTargetReached, true);

  // Case 3: Overspent (gasto excedeu o limite)
  // Limit = 2000, Spent = 2200 -> Current savings = 0. Target = 200 -> Faltam 200 (0%)
  const prog3 = calculateJarSavingsProgress('NEC_55', 2200, 2000, 200);
  assert.equal(prog3.currentSavings, 0);
  assert.equal(prog3.remainingToTarget, 200);
  assert.equal(prog3.progressPercent, 0);
  assert.equal(prog3.isTargetReached, false);

  // Case 4: No custom limit, falls back to jarBudget
  // Limit = 0, jarBudget = 365, Spent = 165 -> Current savings = 200. Target = 200 -> reached!
  const prog4 = calculateJarSavingsProgress('LIF_10', 165, 0, 200, 365);
  assert.equal(prog4.currentSavings, 200);
  assert.equal(prog4.remainingToTarget, 0);
  assert.equal(prog4.progressPercent, 100);
  assert.equal(prog4.isTargetReached, true);
});

