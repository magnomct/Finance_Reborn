import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Transaction } from '../types';
import { INITIAL_TRANSACTIONS } from '../data/initialData';
import { calculateSixJarsMetrics } from './sixJarsMetrics';

describe('sixJarsMetrics — 6 Potes Ideal vs Real Engine', () => {
  it('computes net monthly income, jar limits, spending percentages, and estourado alerts on INITIAL_TRANSACTIONS', () => {
    const result = calculateSixJarsMetrics(INITIAL_TRANSACTIONS, {
      monthKey: '2026-10',
      usePjProfitInPf: true,
    });

    // CLT (2060) + PJ net profit (3060.86 - 1296.45 - 172.10 = 1592.31) = 3652.31
    assert.equal(result.cltIncomeBRL, 2060);
    assert.equal(result.pjRepasseLiquidoBRL, 1592.31);
    assert.equal(result.rendaLiquidaMensal, 3652.31);
    assert.equal(result.isUsingCustomIncomeBase, false);

    const nec = result.jars.find(j => j.id === 'NEC_55')!;
    assert.equal(nec.limiteMetaPct, 55);
    assert.equal(nec.limiteMetaBRL, 2008.77);
    assert.equal(nec.gastoRealBRL, 3050);
    assert.equal(nec.status, 'estourado');
    assert.equal(nec.valorExcedidoBRL, 1041.23);

    const div = result.jars.find(j => j.id === 'DIV_10')!;
    assert.equal(div.limiteMetaPct, 10);
    assert.equal(div.limiteMetaBRL, 365.23);
    assert.equal(div.gastoRealBRL, 600);
    assert.equal(div.status, 'estourado');
    assert.equal(div.valorExcedidoBRL, 234.77);

    assert.equal(result.overBudgetJars.length, 2);
    assert.ok(result.bestDonorJar !== null);
    assert.equal(result.bestDonorJar!.saldoLivreBRL, 365.23);

    // Rebalance alert matches required Portuguese phrasing and excess amount
    const necAlert = result.rebalanceAlerts.find(a => a.overBudgetJar.id === 'NEC_55')!;
    assert.ok(necAlert.message.includes('Limite Ultrapassado:'));
    assert.ok(necAlert.message.includes('Necessidades Básicas'));
    assert.ok(necAlert.message.includes('55%'));
    assert.ok(necAlert.message.includes('1.041,23'));

    // Inner ring sums to 100%
    const innerSum = result.innerRingData.reduce((acc, s) => acc + s.limiteMetaPct, 0);
    assert.equal(innerSum, 100);
  });

  it('supports editable customIncomeBase when a month has zero recorded income', () => {
    const emptyMonthTxs: Transaction[] = [
      {
        id: 'tx-nov-1',
        date: '2026-11-10',
        description: 'Curso Online',
        amount: -450,
        type: 'despesa',
        jar: 'EDU_10',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
      {
        id: 'tx-nov-2',
        date: '2026-11-12',
        description: 'Supermercado',
        amount: -2400,
        type: 'despesa',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
    ];

    const result = calculateSixJarsMetrics(emptyMonthTxs, {
      monthKey: '2026-11',
      customIncomeBase: 5000,
    });

    assert.equal(result.computedRendaLiquidaMensal, 0);
    assert.equal(result.rendaLiquidaMensal, 5000);
    assert.equal(result.isUsingCustomIncomeBase, true);

    const edu = result.jars.find(j => j.id === 'EDU_10')!;
    // Limit = 10% of 5000 = 500. Spent = 450 => 90% => 'atencao' (85%..100%)
    assert.equal(edu.limiteMetaBRL, 500);
    assert.equal(edu.percentualConsumoDoPote, 90);
    assert.equal(edu.status, 'atencao');

    const nec = result.jars.find(j => j.id === 'NEC_55')!;
    // Limit = 55% of 5000 = 2750. Spent = 2400 => 87.3% => 'atencao'
    assert.equal(nec.limiteMetaBRL, 2750);
    assert.equal(nec.status, 'atencao');

    // Total spent = 2850 out of 5000 => Saldo Livre = 2150
    assert.equal(result.saldoLivreRendaBRL, 2150);
    const freeSlice = result.outerRingData.find(s => s.isFreeBalance)!;
    assert.equal(freeSlice.value, 2150);
  });

  it('classifies ok (<85%), atencao (85%..100%), and estourado (>100%) thresholds accurately', () => {
    const txs: Transaction[] = [
      {
        id: 'inc-1',
        date: '2026-11-01',
        description: 'Salário',
        amount: 10000,
        type: 'receita',
        jar: 'NEC_55',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
      {
        id: 'exp-ok',
        date: '2026-11-02',
        description: 'Aporte Férias',
        amount: -400, // FER_5 limit = 500 -> 80% -> ok
        type: 'despesa',
        jar: 'FER_5',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
      {
        id: 'exp-warn',
        date: '2026-11-03',
        description: 'Pós-graduação',
        amount: -850, // EDU_10 limit = 1000 -> 85% -> atencao
        type: 'despesa',
        jar: 'EDU_10',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
      {
        id: 'exp-boundary',
        date: '2026-11-04',
        description: 'Lazer completo',
        amount: -1000, // DIV_10 limit = 1000 -> 100% -> atencao
        type: 'despesa',
        jar: 'DIV_10',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
      {
        id: 'exp-over',
        date: '2026-11-05',
        description: 'Reserva + extra',
        amount: -1150, // PLP_10 limit = 1000 -> 115% -> estourado
        type: 'despesa',
        jar: 'PLP_10',
        account: 'Inter PF',
        costCenter: 'Magno',
        status: 'liquidado',
      },
    ];

    const result = calculateSixJarsMetrics(txs, { monthKey: '2026-11' });

    assert.equal(result.jars.find(j => j.id === 'FER_5')!.status, 'ok');
    assert.equal(result.jars.find(j => j.id === 'EDU_10')!.status, 'atencao');
    assert.equal(result.jars.find(j => j.id === 'DIV_10')!.status, 'atencao');
    assert.equal(result.jars.find(j => j.id === 'PLP_10')!.status, 'estourado');
    assert.equal(result.rebalanceAlerts.length, 1);
    assert.equal(result.rebalanceAlerts[0].bestDonorJar?.id, 'NEC_55');
  });
});
