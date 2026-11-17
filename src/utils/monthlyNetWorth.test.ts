import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyNetWorthSeries,
  formatCompactAxisBRL,
  formatMonthKeyLabels,
} from './monthlyNetWorth';
import { DreamGoal, Transaction } from '../types';

test('formatCompactAxisBRL formats thousands and millions cleanly in pt-BR style', () => {
  assert.equal(formatCompactAxisBRL(10000), 'R$ 10k');
  assert.equal(formatCompactAxisBRL(25000), 'R$ 25k');
  assert.equal(formatCompactAxisBRL(12500), 'R$ 12,5k');
  assert.equal(formatCompactAxisBRL(-5000), '-R$ 5k');
  assert.equal(formatCompactAxisBRL(850), 'R$ 850');
  assert.equal(formatCompactAxisBRL(1500000), 'R$ 1,5M');
});

test('formatMonthKeyLabels returns abbreviated and full pt-BR month names', () => {
  const jan = formatMonthKeyLabels('2026-01');
  assert.equal(jan.monthLabel, 'Jan/26');
  assert.equal(jan.fullMonthLabel, 'Janeiro de 2026');

  const out = formatMonthKeyLabels('2026-10');
  assert.equal(out.monthLabel, 'Out/26');
  assert.equal(out.fullMonthLabel, 'Outubro de 2026');
});

test('uses realistic 12-month fallback dataset when transactions and dreams are empty', () => {
  const summary = buildMonthlyNetWorthSeries({
    transactions: [],
    dreams: [],
    period: '12M',
  });

  assert.equal(summary.isUsingFallbackDataset, true);
  assert.equal(summary.points.length, 12);
  assert.equal(summary.points[0].monthLabel, 'Nov/25');
  assert.equal(summary.points[11].monthLabel, 'Out/26');
  assert.equal(summary.isPositiveTrend, true);
  assert.ok(summary.currentNetWorthBRL > 15000);
  assert.ok(summary.bestMonth !== null);
});

test('filters period accurately for 3M, 6M, 12M, and ALL', () => {
  const s3 = buildMonthlyNetWorthSeries({ transactions: [], dreams: [], period: '3M' });
  const s6 = buildMonthlyNetWorthSeries({ transactions: [], dreams: [], period: '6M' });
  const s12 = buildMonthlyNetWorthSeries({ transactions: [], dreams: [], period: '12M' });
  const sAll = buildMonthlyNetWorthSeries({ transactions: [], dreams: [], period: 'ALL' });

  assert.equal(s3.points.length, 3);
  assert.equal(s6.points.length, 6);
  assert.equal(s12.points.length, 12);
  assert.equal(sAll.points.length, 12);
  assert.equal(s3.points[0].monthLabel, 'Ago/26');
  assert.equal(s3.points[2].monthLabel, 'Out/26');
});

test('consolidates multi-month PF, MEI, and Goals transactions accurately and detects best month', () => {
  const txs: Transaction[] = [
    // 2026-08: PF +2000, MEI +1000 => total +3000
    {
      id: 't1',
      date: '2026-08-05',
      description: 'Salário Agosto',
      amount: 2000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 't2',
      date: '2026-08-10',
      description: 'MEI Agosto',
      amount: 1000,
      type: 'receita',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
    },
    // 2026-09: PF +4000 -1000 = +3000, MEI +2000 => delta +5000 (best tx month)
    {
      id: 't3',
      date: '2026-09-05',
      description: 'Salário Setembro',
      amount: 4000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 't4',
      date: '2026-09-12',
      description: 'Aluguel Setembro',
      amount: -1000,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 't5',
      date: '2026-09-15',
      description: 'MEI Setembro',
      amount: 2000,
      type: 'receita',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
    },
    // 2026-10: PF +1000 -500 = +500 => delta +500
    {
      id: 't6',
      date: '2026-10-05',
      description: 'Salário Outubro',
      amount: 1000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 't7',
      date: '2026-10-18',
      description: 'Despesa Outubro',
      amount: -500,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
  ];

  const dreams: DreamGoal[] = [
    {
      id: 'd1',
      title: 'Reserva',
      target: 10000,
      current: 2000,
      monthlyDeposit: 500,
      category: 'Segurança',
      impact: 'Paz',
      iconName: 'Shield',
      gradient: 'from-blue-500 to-indigo-500',
      contributionsHistory: [
        { id: 'c1', date: '2026-08-20', amount: 1000 },
        { id: 'c2', date: '2026-09-20', amount: 500 },
        { id: 'c3', date: '2026-10-20', amount: 500 },
      ],
    },
  ];

  const summary = buildMonthlyNetWorthSeries({
    transactions: txs,
    dreams,
    period: 'ALL',
  });

  assert.equal(summary.isUsingFallbackDataset, false);
  assert.equal(summary.points.length, 3);

  // Month 1 (2026-08): PF 2000 + MEI 1000 + Goals 1000 = 4000
  assert.equal(summary.points[0].totalNetWorthBRL, 4000);
  // Month 2 (2026-09): PF 5000 + MEI 3000 + Goals 1500 = 9500 (delta +5500)
  assert.equal(summary.points[1].totalNetWorthBRL, 9500);
  assert.equal(summary.points[1].monthlyDeltaBRL, 5500);
  // Month 3 (2026-10): PF 5500 + MEI 3000 + Goals 2000 = 10500 (delta +1000)
  assert.equal(summary.points[2].totalNetWorthBRL, 10500);
  assert.equal(summary.points[2].monthlyDeltaBRL, 1000);

  assert.equal(summary.currentNetWorthBRL, 10500);
  assert.equal(summary.periodGrowthBRL, 6500); // 10500 - 4000
  assert.equal(summary.averageMonthlyEvolutionBRL, 3250); // (5500 + 1000) / 2
  assert.equal(summary.bestMonth?.monthLabel, 'Set/26');
  assert.equal(summary.isPositiveTrend, true);
});

test('detects negative cumulative trend when expenses exceed income across period', () => {
  const negativeTxs: Transaction[] = [
    {
      id: 'n1',
      date: '2026-08-05',
      description: 'Saldo Inicial',
      amount: 5000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 'n2',
      date: '2026-09-10',
      description: 'Emergência Carro',
      amount: -3000,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 'n3',
      date: '2026-10-10',
      description: 'Despesa Extra',
      amount: -1000,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
  ];

  const summary = buildMonthlyNetWorthSeries({
    transactions: negativeTxs,
    dreams: [],
    period: 'ALL',
  });

  assert.equal(summary.isPositiveTrend, false);
  assert.equal(summary.periodGrowthBRL, -4000); // 1000 - 5000
  assert.equal(summary.points[1].monthlyDeltaBRL, -3000);
  assert.equal(summary.points[1].monthlyDeltaPct, -60);
});
