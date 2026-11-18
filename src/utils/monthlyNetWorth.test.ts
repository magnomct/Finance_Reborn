import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyNetWorthSeries,
  formatCompactAxisBRL,
  formatMonthKeyLabels,
} from './monthlyNetWorth';
import { calculateConsolidatedNetWorthKPIs as calculateFinanceNetWorthKPIs } from './finance';
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


test('finance.calculateConsolidatedNetWorthKPIs computes exact KPIs, composition, bestMonth, and interval average', () => {
  const kpis = calculateFinanceNetWorthKPIs([
    { month: '2026-08', pfBalance: 2000, meiBalance: 1000, goalsBalance: 1000 }, // total 4000
    { month: '2026-09', pfBalance: 3000, meiBalance: 2500, goalsBalance: 1500 }, // total 7000 (+3000)
    { month: '2026-10', pfBalance: 5000, meiBalance: 3000, goalsBalance: 2000 }, // total 10000 (+3000)
  ]);

  assert.equal(kpis.currentNetWorth, 10000);
  assert.deepEqual(kpis.breakdown, { pf: 5000, mei: 3000, goals: 2000 });
  assert.deepEqual(kpis.breakdownWeights, { pfPct: 50, meiPct: 30, goalsPct: 20 });
  assert.equal(kpis.periodGrowthBRL, 6000);
  assert.equal(kpis.periodGrowthPct, 150);
  assert.equal(kpis.intervalsCount, 2);
  assert.equal(kpis.analyzedMonths, 3);
  assert.equal(kpis.monthlyAvgEvolutionBRL, 3000);
  assert.equal(kpis.isPositive, true);
  assert.deepEqual(kpis.bestMonth, {
    month: '2026-09',
    deltaBRL: 3000,
    deltaPct: 75,
    totalNetWorth: 7000,
  });
});

test('finance.calculateConsolidatedNetWorthKPIs guards against division by zero when initial net worth is 0', () => {
  const positiveFromZero = calculateFinanceNetWorthKPIs([
    { month: '2026-09', pfBalance: 0, meiBalance: 0, goalsBalance: 0 },
    { month: '2026-10', pfBalance: 1500, meiBalance: 500, goalsBalance: 500 },
  ]);
  assert.equal(positiveFromZero.periodGrowthBRL, 2500);
  assert.equal(positiveFromZero.periodGrowthPct, 100);
  assert.equal(Number.isFinite(positiveFromZero.periodGrowthPct), true);
  assert.equal(positiveFromZero.isPositive, true);

  const flatZero = calculateFinanceNetWorthKPIs([
    { month: '2026-09', pfBalance: 0, meiBalance: 0, goalsBalance: 0 },
    { month: '2026-10', pfBalance: 0, meiBalance: 0, goalsBalance: 0 },
  ]);
  assert.equal(flatZero.periodGrowthBRL, 0);
  assert.equal(flatZero.periodGrowthPct, 0);
  assert.equal(Number.isNaN(flatZero.periodGrowthPct), false);
  assert.equal(flatZero.bestMonth, null);

  const negativeFromZero = calculateFinanceNetWorthKPIs([
    { month: '2026-09', pfBalance: 0, meiBalance: 0, goalsBalance: 0 },
    { month: '2026-10', pfBalance: -400, meiBalance: 0, goalsBalance: 0 },
  ]);
  assert.equal(negativeFromZero.periodGrowthBRL, -400);
  assert.equal(negativeFromZero.periodGrowthPct, -100);
  assert.equal(negativeFromZero.isPositive, false);

  const recoveredFromNegative = calculateFinanceNetWorthKPIs([
    { month: '2026-10', pfBalance: 1000, meiBalance: 500, goalsBalance: 0 },
    { month: '2026-09', pfBalance: -500, meiBalance: 0, goalsBalance: 0 },
  ]);
  assert.equal(recoveredFromNegative.currentNetWorth, 1500);
  assert.equal(recoveredFromNegative.periodGrowthBRL, 2000);
  assert.equal(recoveredFromNegative.periodGrowthPct, 400);
  assert.equal(recoveredFromNegative.isPositive, true);
  assert.equal(recoveredFromNegative.analyzedMonths, 2);
});

test('finance.calculateConsolidatedNetWorthKPIs handles fewer than 2 months and negative periods safely', () => {
  const single = calculateFinanceNetWorthKPIs([
    { month: '2026-10', pfBalance: 1200, meiBalance: 800, goalsBalance: 500 },
  ]);
  assert.equal(single.currentNetWorth, 2500);
  assert.equal(single.periodGrowthBRL, 0);
  assert.equal(single.periodGrowthPct, 0);
  assert.equal(single.monthlyAvgEvolutionBRL, 0);
  assert.equal(single.intervalsCount, 1);
  assert.equal(single.bestMonth, null);

  const negative = calculateFinanceNetWorthKPIs([
    { month: '2026-08', pfBalance: 5000, meiBalance: 0, goalsBalance: 0 },
    { month: '2026-09', pfBalance: 3000, meiBalance: 0, goalsBalance: 0 },
    { month: '2026-10', pfBalance: 2000, meiBalance: 0, goalsBalance: 0 },
  ]);
  assert.equal(negative.isPositive, false);
  assert.equal(negative.periodGrowthBRL, -3000);
  assert.equal(negative.periodGrowthPct, -60);
  assert.equal(negative.monthlyAvgEvolutionBRL, -1500);
  assert.equal(negative.bestMonth, null);

  const explicitTotal = calculateFinanceNetWorthKPIs([
    { month: '2026-09', pfBalance: 1000, meiBalance: 500, goalsBalance: 500, totalNetWorth: 2500 },
    { month: '2026-10', pfBalance: 1500, meiBalance: 1000, goalsBalance: 500, totalNetWorth: 3750 },
  ]);
  assert.equal(explicitTotal.currentNetWorth, 3750);
  assert.equal(explicitTotal.periodGrowthBRL, 1250);
  assert.equal(explicitTotal.periodGrowthPct, 50);
});
