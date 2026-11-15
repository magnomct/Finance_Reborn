import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFutureProjection,
  formatMonthShortPtBr,
} from './futureBalanceProjection';
import { DreamGoal, RecurringExpense, Transaction } from '../types';
import { INITIAL_DREAMS, INITIAL_RECURRING, INITIAL_TRANSACTIONS } from '../data/initialData';

test('futureBalanceProjection — Engine & Deficit Detection', async (t) => {
  await t.test('simulates M0 + 6 future months (MMM/YY pt-BR) with positive balances when inflows exceed outflows', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-10',
        description: 'Salário Mensal',
        amount: 10000,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
      {
        id: 't2',
        date: '2026-10-15',
        description: 'Aluguel Fixo',
        amount: -3000,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
        isRecurring: true,
        recurringId: 'r-aluguel',
      },
    ];

    const recs: RecurringExpense[] = [
      {
        id: 'r-sal',
        description: 'Salário Mensal',
        amount: 10000,
        amountPlanned: 10000,
        type: 'receita',
        frequency: 'mensal',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
      {
        id: 'r-aluguel',
        description: 'Aluguel Fixo',
        amount: -3000,
        amountPlanned: 3000,
        type: 'despesa',
        frequency: 'mensal',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
    ];

    const res = calculateFutureProjection({
      transactions: txs,
      recurringList: recs,
      dreams: [],
      referenceMonthKey: '2026-10',
    });

    assert.equal(res.points.length, 7);
    assert.equal(res.futurePoints.length, 6);
    assert.equal(res.points[0].monthLabel, 'out/26');
    assert.equal(res.futurePoints[0].monthLabel, 'nov/26');
    assert.equal(res.futurePoints[5].monthLabel, 'abr/27');
    assert.equal(res.hasAnyDeficit, false);
    assert.equal(res.primaryDeficitAlert, null);

    // M0 consolidated = 10000 - 3000 = 7000; each month adds +7000 -> M+6 = 49000
    assert.equal(res.points[0].consolidatedBalance, 7000);
    assert.equal(res.futurePoints[5].consolidatedBalance, 49000);
    // NEC_55: inflow = 5500/m, outflow = 3000/m -> +2500/m -> M0=2500, M+6=17500
    assert.equal(res.futurePoints[5].jarBalances.NEC_55, 17500);
  });

  await t.test('detects early Jar deficit, identifies mainCostDriver, and computes suggested monthly reduction', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        date: '2026-10-10',
        description: 'Salário',
        amount: 4000,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
    ];

    // DIV_10 gets 10% of 4000 = 400/month. Outflow = 650/month -> net -250/month.
    // M0 starts at +400 (since no DIV expense in txs), M+1 = +150, M+2 = -100!
    const recs: RecurringExpense[] = [
      {
        id: 'r1',
        description: 'Salário',
        amount: 4000,
        amountPlanned: 4000,
        type: 'receita',
        frequency: 'mensal',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
      {
        id: 'r2',
        description: 'Assinaturas & Cartão Lazer',
        amount: -650,
        amountPlanned: 650,
        type: 'despesa',
        frequency: 'mensal',
        jar: 'DIV_10',
        account: 'C6',
        costCenter: 'Magno',
        isActive: true,
      },
    ];

    const res = calculateFutureProjection({
      transactions: txs,
      recurringList: recs,
      referenceMonthKey: '2026-10',
    });

    assert.equal(res.hasAnyDeficit, true);
    const divAlert = res.deficitAlertsByJar.DIV_10;
    assert.ok(divAlert);
    assert.equal(divAlert.monthLabel, 'dez/26'); // M+2
    assert.equal(divAlert.monthIndex, 2);
    assert.equal(divAlert.deficitAmountBRL, 100);
    assert.equal(divAlert.projectedBalanceBRL, -100);
    assert.equal(divAlert.mainCostDriver, 'Assinaturas & Cartão Lazer');
    assert.equal(divAlert.suggestedMonthlyReductionBRL, 50); // 100 / 2 months
  });

  await t.test('includeVariableAvg deducts 3-month rolling average of variable expenses', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-inc',
        date: '2026-10-05',
        description: 'Salário',
        amount: 5000,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
      // 3 historical months of variable spend on EDU_10 (10% of 5000 = 500/m): 600, 750, 450 -> avg = 600/m
      {
        id: 'v1',
        date: '2026-08-12',
        description: 'Livros Técnicos',
        amount: -600,
        type: 'despesa',
        nature: 'variable',
        jar: 'EDU_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado',
      },
      {
        id: 'v2',
        date: '2026-09-12',
        description: 'Workshop Design',
        amount: -750,
        type: 'despesa',
        nature: 'variable',
        jar: 'EDU_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado',
      },
      {
        id: 'v3',
        date: '2026-10-12',
        description: 'Curso Online',
        amount: -450,
        type: 'despesa',
        nature: 'variable',
        jar: 'EDU_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado',
      },
    ];

    const recs: RecurringExpense[] = [
      {
        id: 'r-inc',
        description: 'Salário',
        amount: 5000,
        amountPlanned: 5000,
        type: 'receita',
        frequency: 'mensal',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
    ];

    const withoutVar = calculateFutureProjection({
      transactions: txs,
      recurringList: recs,
      includeVariableAvg: false,
      referenceMonthKey: '2026-10',
    });

    const withVar = calculateFutureProjection({
      transactions: txs,
      recurringList: recs,
      includeVariableAvg: true,
      referenceMonthKey: '2026-10',
    });

    assert.equal(withoutVar.deficitAlertsByJar.EDU_10, undefined);
    // M0 EDU_10 = 500 - 450 = +50. With var avg = 600 vs inflow 500 -> -100/m -> M+1 = -50!
    assert.ok(withVar.deficitAlertsByJar.EDU_10);
    assert.equal(withVar.deficitAlertsByJar.EDU_10?.monthIndex, 1);
    assert.equal(withVar.deficitAlertsByJar.EDU_10?.projectedBalanceBRL, -50);
    assert.equal(withVar.projectedMonthlyVariableAvg, 600);
  });

  await t.test('deduplicates goals already synced to recurringList and stops unlinked goals after completion', () => {
    const recs: RecurringExpense[] = [
      {
        id: 'r-sal',
        description: 'Salário',
        amount: 10000,
        amountPlanned: 10000,
        type: 'receita',
        frequency: 'mensal',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
      {
        id: 'rec-dream-d1',
        goalId: 'd1',
        description: 'Aporte Recorrente: Reserva',
        amount: -500,
        amountPlanned: 500,
        type: 'despesa',
        frequency: 'mensal',
        jar: 'PLP_10',
        account: 'Inter PF',
        costCenter: 'Magno',
        isActive: true,
      },
    ];

    const dreams: DreamGoal[] = [
      {
        id: 'd1',
        title: 'Reserva',
        target: 5000,
        current: 1000,
        monthlyDeposit: 500,
        category: 'Segurança',
        impact: 'Alta',
        iconName: 'Shield',
        gradient: 'from-blue-500 to-indigo-500',
      },
      {
        id: 'd2',
        title: 'Viagem Curta',
        target: 1000,
        current: 700,
        monthlyDeposit: 200, // needs 200 in M+1, 100 in M+2, 0 in M+3+
        category: 'Viagem',
        impact: 'Média',
        iconName: 'Plane',
        gradient: 'from-emerald-500 to-teal-500',
      },
    ];

    const res = calculateFutureProjection({
      transactions: [
        {
          id: 't1',
          date: '2026-10-05',
          description: 'Salário',
          amount: 10000,
          type: 'receita',
          jar: 'NEC_55',
          costCenter: 'Magno',
          account: 'Inter PF',
          status: 'liquidado',
        },
      ],
      recurringList: recs,
      dreams,
      referenceMonthKey: '2026-10',
    });

    // PLP_10 M+1 outflow should be 500 (synced d1, NOT 1000) + 200 (unlinked d2) = 700
    assert.equal(res.futurePoints[0].jarOutflows.PLP_10, 700);
    // M+2 outflow: 500 + 100 = 600
    assert.equal(res.futurePoints[1].jarOutflows.PLP_10, 600);
    // M+3 outflow: 500 + 0 = 500
    assert.equal(res.futurePoints[2].jarOutflows.PLP_10, 500);
  });

  await t.test('handles INITIAL_DATA and empty datasets safely without NaN', () => {
    const initialRes = calculateFutureProjection({
      transactions: INITIAL_TRANSACTIONS,
      recurringList: INITIAL_RECURRING,
      dreams: INITIAL_DREAMS,
    });
    assert.equal(initialRes.points.length, 7);
    assert.equal(initialRes.hasAnyDeficit, true);
    assert.ok(initialRes.primaryDeficitAlert);

    const emptyRes = calculateFutureProjection({
      transactions: [],
      recurringList: [],
      dreams: [],
    });
    assert.equal(emptyRes.points.length, 7);
    assert.equal(emptyRes.hasAnyDeficit, false);
    assert.equal(emptyRes.futurePoints[5].consolidatedBalance, 0);
    assert.equal(formatMonthShortPtBr('2026-11'), 'nov/26');
  });
});
