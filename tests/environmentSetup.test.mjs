import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFreshEnvironment,
  calculateJarLimitsFromIncome,
  ALL_YUPPEE_STORAGE_KEYS,
  DEFAULT_JAR_PERCENTAGES,
} from '../src/utils/environmentSetup.ts';

test('calculateJarLimitsFromIncome: correctly proportions limits based on income', () => {
  const income = 6000;
  const limits = calculateJarLimitsFromIncome(income);

  // 55% of 6000 = 3300
  assert.equal(limits.NEC_55, 3300);
  // 10% of 6000 = 600
  assert.equal(limits.DIV_10, 600);
  assert.equal(limits.PLP_10, 600);
  assert.equal(limits.LIF_10, 600);
  assert.equal(limits.EDU_10, 600);
  // 5% of 6000 = 300
  assert.equal(limits.FER_5, 300);
});

test('calculateJarLimitsFromIncome: handles zero or negative income safely', () => {
  const limitsZero = calculateJarLimitsFromIncome(0);
  assert.ok(limitsZero.NEC_55 > 0);
  assert.ok(limitsZero.DIV_10 > 0);

  const limitsNegative = calculateJarLimitsFromIncome(-1500);
  assert.ok(limitsNegative.NEC_55 > 0);
});

test('buildFreshEnvironment: blank mode creates completely empty collections', () => {
  const result = buildFreshEnvironment({ mode: 'blank' });

  assert.equal(result.transactions.length, 0);
  assert.equal(result.recurringList.length, 0);
  assert.equal(result.dreams.length, 0);
  assert.equal(result.autoRules.length, 0);
  assert.equal(result.reserveBalance, 0);
  assert.equal(result.reserveTargetMonths, 6);
  assert.ok(result.jarLimits.NEC_55 > 0);
});

test('buildFreshEnvironment: custom wizard creates initial balance and monthly salary', () => {
  const result = buildFreshEnvironment({
    mode: 'custom_wizard',
    userName: 'Carlos',
    scope: 'PF',
    accountName: 'Inter PF',
    initialBalance: 2500,
    monthlyIncome: 5000,
    incomeDescription: 'Salário Líquido Mensal',
    incomeDay: 5,
    reserveInitialBalance: 1200,
    reserveTargetMonths: 6,
    referenceDate: '2026-10-25',
  });

  // Check initial balance transaction
  const balanceTx = result.transactions.find(t => t.category === 'Saldo Inicial');
  assert.ok(balanceTx, 'Devem existir transação de saldo inicial');
  assert.equal(balanceTx.amount, 2500);
  assert.equal(balanceTx.account, 'Inter PF');
  assert.equal(balanceTx.status, 'liquidado');

  // Check salary income transaction
  const salaryTx = result.transactions.find(t => t.category === 'Salário / Renda');
  assert.ok(salaryTx, 'Deve existir transação de salário do mês');
  assert.equal(salaryTx.amount, 5000);
  assert.equal(salaryTx.description, 'Salário Líquido Mensal');

  // Check recurring item
  assert.equal(result.recurringList.length, 1);
  assert.equal(result.recurringList[0].amount, 5000);
  assert.equal(result.recurringList[0].dayOfMonth, 5);

  // Check emergency reserve dream
  const emergencyGoal = result.dreams.find(d => d.title === 'Reserva de Emergência');
  assert.ok(emergencyGoal, 'Deve criar meta de reserva de emergência');
  assert.equal(emergencyGoal.current, 1200);
  assert.ok(emergencyGoal.target > 1200);

  // Check Jar Limits calculated from 5000
  assert.equal(result.jarLimits.NEC_55, 2750); // 55%
  assert.equal(result.jarLimits.DIV_10, 500);  // 10%
  assert.equal(result.jarLimits.FER_5, 250);   // 5%
});

test('buildFreshEnvironment: supports secondary custom goal', () => {
  const result = buildFreshEnvironment({
    mode: 'custom_wizard',
    monthlyIncome: 4000,
    firstGoalTitle: 'Viagem para o Chile',
    firstGoalTarget: 8000,
    referenceDate: '2026-10-25',
  });

  const tripGoal = result.dreams.find(d => d.title === 'Viagem para o Chile');
  assert.ok(tripGoal);
  assert.equal(tripGoal.target, 8000);
  assert.equal(tripGoal.current, 0);
  assert.ok(tripGoal.monthlyDeposit > 0);
});

test('ALL_YUPPEE_STORAGE_KEYS: contains all vital persistence keys', () => {
  assert.ok(ALL_YUPPEE_STORAGE_KEYS.includes('yupee_transactions_v2'));
  assert.ok(ALL_YUPPEE_STORAGE_KEYS.includes('yupee_recurring_v3'));
  assert.ok(ALL_YUPPEE_STORAGE_KEYS.includes('yupee_dreams_v2'));
  assert.ok(ALL_YUPPEE_STORAGE_KEYS.includes('yupee_budget_jar_limits'));
  assert.ok(ALL_YUPPEE_STORAGE_KEYS.includes('yupee_emergency_reserve_balance'));
});
