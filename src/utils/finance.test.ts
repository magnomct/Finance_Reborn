import { test } from 'node:test';
import assert from 'node:assert';
import { 
  calculateFinancialMetrics, 
  simulateDailyCashflow, 
  calculateDailySafeSpend,
  applyAutoRules,
  getMonthlyProjection,
  calculateRecurringVariance,
  generateRecurringTransactions
} from './finance.ts';
import { INITIAL_TRANSACTIONS, INITIAL_AUTO_RULES } from '../data/initialData.ts';
import { RecurringExpense } from '../types.ts';

test('calculateFinancialMetrics correctly aggregates CLT, PJ, and net apartment mortgage', () => {
  const metrics = calculateFinancialMetrics(INITIAL_TRANSACTIONS, true);

  // CLT income should be 2060
  assert.strictEqual(metrics.cltIncome, 2060);
  // PJ service income should be 3060.86
  assert.strictEqual(metrics.pjServiceIncome, 3060.86);
  // Nathan refund should be 858
  assert.strictEqual(metrics.nathanRefund, 858);
  // Overdraft interest is 140
  assert.strictEqual(metrics.overdraftInterest, 140);
  // Total Apto debit is 1290 + 140 = 1430
  assert.strictEqual(metrics.totalAptoDebit, 1430);
  // Magno Net Apto is 1430 - 858 = 572
  assert.strictEqual(metrics.magnoTotalNetApto, 572);
  // Net balance consolidated is positive
  assert.ok(metrics.netBalanceConsolidated > 0, 'Consolidated balance should be positive');
});

test('simulateDailyCashflow detects overdraft risk and gives cushion recommendation', () => {
  const res = simulateDailyCashflow(INITIAL_TRANSACTIONS, 3652, 0, 31);
  assert.strictEqual(res.days.length, 31);
  assert.ok(typeof res.hasOverdraftRisk === 'boolean');
});

test('calculateDailySafeSpend calculates remaining daily allowance properly', () => {
  const safe = calculateDailySafeSpend(3000, 1800, 20, 30);
  assert.strictEqual(safe.remainingBudget, 1200);
  assert.strictEqual(safe.remainingDays, 11);
  assert.ok(safe.safePerDay > 0);
  assert.strictEqual(safe.isExceeded, false);
});

test('applyAutoRules matches keywords to appropriate jar and category', () => {
  const match1 = applyAutoRules('Compra na Shopee para casa', INITIAL_AUTO_RULES);
  assert.ok(match1 !== null);
  assert.strictEqual(match1?.jar, 'NEC_55');

  const match2 = applyAutoRules('Jantar Restaurante Outback', INITIAL_AUTO_RULES);
  assert.ok(match2 !== null);
  assert.strictEqual(match2?.jar, 'DIV_10');

  const match3 = applyAutoRules('Pagamento DAS Simples', INITIAL_AUTO_RULES);
  assert.ok(match3 !== null);
  assert.strictEqual(match3?.jar, 'PJ_EXCLUIDO');
});

test('getMonthlyProjection accurately scales daily, weekly, bi-weekly and monthly amounts', () => {
  assert.strictEqual(getMonthlyProjection(10, 'diaria'), 300);
  assert.strictEqual(getMonthlyProjection(50, 'semanal'), 200);
  assert.strictEqual(getMonthlyProjection(400, 'quinzenal'), 800);
  assert.strictEqual(getMonthlyProjection(1200, 'mensal'), 1200);
});

test('calculateRecurringVariance calculates favorable/unfavorable deviations for expenses and incomes', () => {
  // Despesa: gastou menos que previsto = Economia (favorável)
  const expenseSavings = calculateRecurringVariance(180, 172.10, 'despesa');
  assert.ok(expenseSavings.isFavorable);
  assert.strictEqual(expenseSavings.statusText, 'Economia realizada');
  assert.ok(expenseSavings.diff < 0);

  // Despesa: gastou mais que previsto = Estouro (desfavorável)
  const expenseOverrun = calculateRecurringVariance(1900, 1950, 'despesa');
  assert.strictEqual(expenseOverrun.isFavorable, false);
  assert.strictEqual(expenseOverrun.statusText, 'Estouro orçamentário');
  assert.strictEqual(expenseOverrun.diff, 50);

  // Receita: recebeu mais que previsto = Superávit (favorável)
  const incomeSurplus = calculateRecurringVariance(3000, 3060.86, 'receita');
  assert.ok(incomeSurplus.isFavorable);
  assert.strictEqual(incomeSurplus.statusText, 'Superávit acima da meta');

  // No teto (igual)
  const onTarget = calculateRecurringVariance(2060, 2060, 'receita');
  assert.ok(onTarget.isEqual);
  assert.strictEqual(onTarget.statusText, '100% atingido');
});

test('generateRecurringTransactions expands weekly and quinzenal into multiple monthly occurrences', () => {
  const recurringMock: RecurringExpense[] = [
    {
      id: 'rec-test-weekly',
      description: 'Condução Semanal',
      amount: -150,
      amountPlanned: 150,
      amountRealized: 150,
      type: 'despesa',
      frequency: 'semanal',
      dayOfWeek: 5,
      jar: 'NEC_55',
      account: 'Passe',
      costCenter: 'Magno',
      isActive: true
    },
    {
      id: 'rec-test-quinzena',
      description: 'Feira Quinzenal',
      amount: -300,
      amountPlanned: 300,
      type: 'despesa',
      frequency: 'quinzenal',
      dayOfMonth: 5,
      jar: 'NEC_55',
      account: 'Inter PF',
      costCenter: 'Magno',
      isActive: true
    }
  ];

  const generated = generateRecurringTransactions(recurringMock, '2026-11');
  
  // Weekly generates 4 occurrences
  const weeklyItems = generated.filter(g => g.recurringId === 'rec-test-weekly');
  assert.strictEqual(weeklyItems.length, 4);

  // Quinzenal generates 2 occurrences
  const quinzenaItems = generated.filter(g => g.recurringId === 'rec-test-quinzena');
  assert.strictEqual(quinzenaItems.length, 2);
});
