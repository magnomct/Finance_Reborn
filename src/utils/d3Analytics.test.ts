import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Transaction } from '../types';
import {
  buildAnnualBalanceTimeSeries,
  buildAnnualExpenseHeatmapData,
  buildCashFlowSankeyData,
  buildCategoryDonutData,
  buildDailyExpenseBalanceCorrelation,
} from './finance';
import { clampOLSTrendlineToBounds } from '../components/ExpenseBalanceScatterD3Chart';

const REAL_SCATTER_TXS: Transaction[] = [
  // Day 1: salary inflow 5000 + small expense 100
  {
    id: 's1',
    date: '2026-10-02',
    description: 'Salário PF',
    amount: 5000,
    type: 'receita',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Salário',
  },
  {
    id: 's2',
    date: '2026-10-02',
    description: 'Café & Padaria',
    amount: 400,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Alimentação',
  },
  // Day 2: high balance -> higher spend 350
  {
    id: 's3',
    date: '2026-10-08',
    description: 'Mercado Semana',
    amount: 350,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Alimentação',
  },
  // Day 3 (MEIO): medium balance -> 250
  {
    id: 's4',
    date: '2026-10-14',
    description: 'Farmácia',
    amount: 250,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Saúde',
  },
  // Day 4 (MEIO): lower balance -> 180
  {
    id: 's5',
    date: '2026-10-18',
    description: 'Combustível',
    amount: 180,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Transporte',
  },
  // Day 5 (FIM): lowest balance -> 90
  {
    id: 's6',
    date: '2026-10-25',
    description: 'Streaming',
    amount: 90,
    type: 'despesa',
    jar: 'DIV_10',
    costCenter: 'Magno',
    account: 'C6',
    status: 'liquidado',
    category: 'Lazer',
  },
  // MEI transaction to verify scope isolation
  {
    id: 's7',
    date: '2026-10-20',
    description: 'Faturamento MEI',
    amount: 4000,
    type: 'receita',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'liquidado',
    category: 'Faturamento PJ',
  },
  {
    id: 's8',
    date: '2026-10-20',
    description: 'Guia DAS',
    amount: 75.9,
    type: 'despesa',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'liquidado',
    category: 'Impostos PJ',
  },
];

describe('D3 Analytics Engines: Scatter Correlation & Annual Expense Heatmap', () => {
  it('computes chronological balance, seasonPhase, positive Pearson r, and OLS slope/intercept for >= 5 real PF expense days', () => {
    const res = buildDailyExpenseBalanceCorrelation(REAL_SCATTER_TXS, 'PF');
    assert.equal(res.isFallbackData, false);
    assert.equal(res.points.length, 5);
    assert.equal(res.points[0].seasonPhase, 'INICIO');
    assert.equal(res.points[2].seasonPhase, 'MEIO');
    assert.equal(res.points[4].seasonPhase, 'FIM');

    // Balances monotonically decrease while expenses monotonically decrease -> strong positive correlation
    assert.ok(res.pearsonR > 0.85 && res.pearsonR <= 1);
    assert.ok(res.slope > 0);
    assert.ok(res.avgExpenseHighBalance > res.avgExpenseLowBalance);
  });

  it('guards against zero-variance division by zero when all days share identical balance or expense', () => {
    const flatTxs: Transaction[] = [1, 2, 3, 4, 5].map(day => ({
      id: `flat-${day}`,
      date: `2026-10-0${day}`,
      description: 'Despesa fixa',
      amount: 100,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Alimentação',
    }));

    // Constant expenses (Syy === 0)
    const res = buildDailyExpenseBalanceCorrelation(flatTxs, 'PF');
    assert.equal(res.isFallbackData, false);
    assert.equal(res.pearsonR, 0);
    assert.equal(res.slope, 0);
    assert.equal(res.intercept, 100);
    assert.ok(Number.isFinite(res.pearsonR));
  });

  it('triggers realistic 45-day fallback dataset when fewer than 5 expense days exist for a scope', () => {
    const resMEI = buildDailyExpenseBalanceCorrelation(REAL_SCATTER_TXS, 'MEI');
    assert.equal(resMEI.isFallbackData, true);
    assert.equal(resMEI.points.length, 45);
    assert.ok(resMEI.pearsonR >= -1 && resMEI.pearsonR <= 1);
    assert.ok(resMEI.points.some(p => p.seasonPhase === 'INICIO'));
    assert.ok(resMEI.points.some(p => p.seasonPhase === 'MEIO'));
    assert.ok(resMEI.points.some(p => p.seasonPhase === 'FIM'));
  });

  it('clamps OLS regression trendline strictly within [xMin,xMax] x [yMin,yMax] domain bounds', () => {
    const clipped = clampOLSTrendlineToBounds(0, 5000, 0, 600, 0.5, -500);
    assert.ok(clipped !== null);
    assert.ok(clipped.x1 >= 0 && clipped.x1 <= 5000);
    assert.ok(clipped.x2 >= 0 && clipped.x2 <= 5000);
    assert.ok(clipped.y1 >= 0 && clipped.y1 <= 600);
    assert.ok(clipped.y2 >= 0 && clipped.y2 <= 600);
  });

  it('generates every local calendar day of 2026 (365 days) and 2024 leap year (366 days) with zero UTC shift', () => {
    const summary2026 = buildAnnualExpenseHeatmapData(REAL_SCATTER_TXS, 2026, 'CONSOLIDATED');
    assert.equal(summary2026.cells.length, 365);
    assert.equal(summary2026.cells[0].dateStr, '2026-01-01');
    assert.equal(summary2026.cells[summary2026.cells.length - 1].dateStr, '2026-12-31');
    assert.equal(summary2026.cells[0].month, 0);
    assert.equal(summary2026.cells[summary2026.cells.length - 1].month, 11);

    // Check local Date alignment matches dateStr without off-by-one day shift
    for (const cell of [summary2026.cells[0], summary2026.cells[58], summary2026.cells[364]]) {
      const expectedY = Number(cell.dateStr.slice(0, 4));
      const expectedM = Number(cell.dateStr.slice(5, 7)) - 1;
      const expectedD = Number(cell.dateStr.slice(8, 10));
      assert.equal(cell.date.getFullYear(), expectedY);
      assert.equal(cell.date.getMonth(), expectedM);
      assert.equal(cell.date.getDate(), expectedD);
    }

    const summary2024 = buildAnnualExpenseHeatmapData([], 2024, 'PF');
    assert.equal(summary2024.cells.length, 366);
    assert.ok(summary2024.cells.some(c => c.dateStr === '2024-02-29'));
  });

  it('uses real transaction totals without fallback when >= 10 expense days exist in the selected year & scope', () => {
    const tenPlusTxs: Transaction[] = Array.from({ length: 12 }, (_, idx) => ({
      id: `hm-${idx + 1}`,
      date: `2026-${String(idx + 1).padStart(2, '0')}-10`,
      description: `Despesa Mês ${idx + 1}`,
      amount: 100 + idx * 25,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: idx === 11 ? 'Viagem' : 'Alimentação',
    }));

    const summary = buildAnnualExpenseHeatmapData(tenPlusTxs, 2026, 'PF');
    assert.equal(summary.isFallbackData, false);
    assert.equal(summary.zeroSpendDays, 365 - 12);
    assert.equal(summary.peakDay?.dateStr, '2026-12-10');
    assert.equal(summary.peakDay?.totalExpense, 375);
    assert.equal(summary.peakDay?.topCategory, 'Viagem');
  });
});

describe('Unified Dashboard Charts & 3-Stage Cash-Flow Sankey Builders', () => {
  it('groups categories beyond Top 6 into "Outros" sorted descending and filters by scope', () => {
    const eightCatTxs: Transaction[] = [
      'Moradia',
      'Alimentação',
      'Transporte',
      'Saúde',
      'Lazer',
      'Educação',
      'Vestuário',
      'Assinaturas',
    ].map((cat, idx) => ({
      id: `cat-${idx}`,
      date: '2026-10-12',
      description: `Gasto ${cat}`,
      amount: -(800 - idx * 80), // 800, 720, 640, 560, 480, 400, 320, 240
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: cat,
    }));

    // Add an MEI expense to ensure PF scope excludes it
    eightCatTxs.push({
      id: 'cat-mei',
      date: '2026-10-12',
      description: 'Software MEI',
      amount: -950,
      type: 'despesa',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
      category: 'Software PJ',
    });

    const pfDonut = buildCategoryDonutData(eightCatTxs, 2026, 'PF');
    assert.equal(pfDonut.items.length, 7); // Top 6 + Outros
    assert.equal(pfDonut.items[0].category, 'Moradia');
    assert.equal(pfDonut.items[0].amount, 800);
    assert.equal(pfDonut.items[6].category, 'Outros');
    assert.equal(pfDonut.items[6].amount, 320 + 240);
    assert.equal(pfDonut.items[6].txCount, 2);
    assert.equal(pfDonut.totalExpense, 4160);

    const meiDonut = buildCategoryDonutData(eightCatTxs, 2026, 'MEI');
    assert.equal(meiDonut.items.length, 1);
    assert.equal(meiDonut.items[0].category, 'Software PJ');
    assert.equal(meiDonut.totalExpense, 950);
  });

  it('builds timezone-safe 12-month Jan-Dez series with cumulative runningBalance and empty-array fallback', () => {
    const series = buildAnnualBalanceTimeSeries(REAL_SCATTER_TXS, 2026, 'PF');
    assert.equal(series.length, 12);
    assert.equal(series[0].monthLabel, 'Jan');
    assert.equal(series[9].monthLabel, 'Out');
    assert.equal(series[11].monthLabel, 'Dez');

    // Local Date check (Jan 1 and Oct 1 exact local calendar year/month/day)
    assert.equal(series[0].date.getFullYear(), 2026);
    assert.equal(series[0].date.getMonth(), 0);
    assert.equal(series[0].date.getDate(), 1);
    assert.equal(series[9].date.getMonth(), 9);

    // Real PF Oct: income 5000, expense 400+350+250+180+90 = 1270, netFlow = 3730
    assert.equal(series[9].income, 5000);
    assert.equal(series[9].expense, 1270);
    assert.equal(series[9].netFlow, 3730);
    assert.equal(series[9].runningBalance, 3730);
    assert.equal(series[11].runningBalance, 3730);

    // Empty transactions array triggers realistic fallback
    const fallbackSeries = buildAnnualBalanceTimeSeries([], 2026, 'CONSOLIDATED');
    assert.equal(fallbackSeries.length, 12);
    assert.equal(fallbackSeries[0].isFallbackData, true);
    assert.ok(fallbackSeries[11].runningBalance > 0);
  });

  it('builds DAG-safe 3-stage Sankey flow with src_/jar_/dst_ prefixes and 100% flow conservation', () => {
    const result = buildCashFlowSankeyData({
      transactions: REAL_SCATTER_TXS,
      baseMonthlyIncome: 5000,
      period: 'MONTH',
      scope: 'CONSOLIDATED',
      referenceMonth: '2026-10',
    });

    const stage0 = result.nodes.filter(n => n.stage === 0);
    const stage1 = result.nodes.filter(n => n.stage === 1);
    const stage2 = result.nodes.filter(n => n.stage === 2);

    assert.ok(stage0.every(n => n.id.startsWith('src_')));
    assert.ok(stage1.every(n => n.id.startsWith('jar_')));
    assert.ok(stage2.every(n => n.id.startsWith('dst_')));
    assert.equal(stage1.length, 6);

    const sumStage0 = Math.round(stage0.reduce((s, n) => s + n.value, 0) * 100) / 100;
    const sumStage1 = Math.round(stage1.reduce((s, n) => s + n.value, 0) * 100) / 100;
    const sumStage2 = Math.round(stage2.reduce((s, n) => s + n.value, 0) * 100) / 100;

    assert.equal(sumStage0, result.totalInflow);
    assert.equal(sumStage1, result.totalInflow);
    assert.equal(sumStage2, result.totalInflow);
    assert.equal(result.totalOutflow, result.totalInflow);
    assert.ok(stage2.some(n => n.id === 'dst_saldo_retido'));

    // Fallback income when period has no inflows
    const fallbackSankey = buildCashFlowSankeyData({
      transactions: [],
      baseMonthlyIncome: 4200,
      period: 'MONTH',
      scope: 'PF',
      referenceMonth: '2026-10',
    });
    assert.equal(fallbackSankey.isFallbackIncome, true);
    assert.equal(fallbackSankey.totalInflow, 4200);
    assert.equal(fallbackSankey.totalOutflow, 4200);
  });
});

