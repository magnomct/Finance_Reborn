import { describe, it, expect } from 'bun:test';
import { 
  calculateCumulativeSavingsMetrics,
  extractMonthlyTotalsFromTransactions,
  DEFAULT_SAVINGS_HISTORY_12M
} from '../src/utils/cumulativeSavings.ts';

describe('cumulativeSavings utility calculations', () => {
  const customData = [
    { ym: '2026-05', short: 'Mai/26', full: 'Maio 2026', rec: 5000, desp: 4000 },
    { ym: '2026-06', short: 'Jun/26', full: 'Junho 2026', rec: 5000, desp: 4200 },
    { ym: '2026-07', short: 'Jul/26', full: 'Julho 2026', rec: 6000, desp: 4500 },
    { ym: '2026-08', short: 'Ago/26', full: 'Agosto 2026', rec: 5500, desp: 4300 },
    { ym: '2026-09', short: 'Set/26', full: 'Setembro 2026', rec: 5200, desp: 4100 },
    { ym: '2026-10', short: 'Out/26', full: 'Outubro 2026', rec: 5300, desp: 4400 },
  ];

  it('correctly calculates cumulative revenue, cumulative expenses and savings margin month-by-month', () => {
    const summary = calculateCumulativeSavingsMetrics({
      windowMonths: 6,
      customHistory: customData
    });

    expect(summary.months.length).toBe(6);

    // Month 1: Maio
    const m1 = summary.months[0];
    expect(m1.faturamentoAcumulado).toBe(5000);
    expect(m1.despesasAcumuladas).toBe(4000);
    expect(m1.margemPoupancaAcumulada).toBe(1000);
    expect(m1.margemPoupancaPct).toBe(20.0);
    expect(m1.poupancaMensal).toBe(1000);

    // Month 2: Junho (5000 + 5000 = 10000; 4000 + 4200 = 8200)
    const m2 = summary.months[1];
    expect(m2.faturamentoAcumulado).toBe(10000);
    expect(m2.despesasAcumuladas).toBe(8200);
    expect(m2.margemPoupancaAcumulada).toBe(1800);
    expect(m2.margemPoupancaPct).toBe(18.0);

    // Month 6: Outubro final totals
    const m6 = summary.months[5];
    const expectedTotalFaturamento = 5000 + 5000 + 6000 + 5500 + 5200 + 5300; // 32000
    const expectedTotalDespesas = 4000 + 4200 + 4500 + 4300 + 4100 + 4400; // 25500
    const expectedTotalPoupanca = 32000 - 25500; // 6500

    expect(m6.faturamentoAcumulado).toBe(expectedTotalFaturamento);
    expect(m6.despesasAcumuladas).toBe(expectedTotalDespesas);
    expect(m6.margemPoupancaAcumulada).toBe(expectedTotalPoupanca);

    expect(summary.totalFaturamento).toBe(expectedTotalFaturamento);
    expect(summary.totalDespesas).toBe(expectedTotalDespesas);
    expect(summary.totalPoupanca).toBe(expectedTotalPoupanca);
    expect(summary.margemPoupancaGeralPct).toBe(Math.round((6500 / 32000) * 1000) / 10); // 20.3%
  });

  it('correctly handles 12-month window', () => {
    const summary = calculateCumulativeSavingsMetrics({
      windowMonths: 12
    });

    expect(summary.months.length).toBe(12);
    expect(summary.totalFaturamento).toBeGreaterThan(0);
    expect(summary.totalDespesas).toBeGreaterThan(0);
    expect(summary.totalFaturamento).toBeGreaterThan(summary.totalDespesas);
    expect(summary.margemPoupancaGeralPct).toBeGreaterThan(0);
  });

  it('identifies best and lowest savings months correctly', () => {
    const summary = calculateCumulativeSavingsMetrics({
      windowMonths: 6,
      customHistory: customData
    });

    // Best month in customData is Julho (rec 6000, desp 4500 -> poupanca 1500)
    expect(summary.melhorMes.month).toBe('Jul/26');
    expect(summary.melhorMes.poupancaMensal).toBe(1500);

    // Lowest month in customData is Junho (rec 5000, desp 4200 -> poupanca 800)
    expect(summary.piorMes.month).toBe('Jun/26');
    expect(summary.piorMes.poupancaMensal).toBe(800);
  });

  it('extracts monthly totals from transactions accurately', () => {
    const txs = [
      { id: '1', date: '2026-10-05', amount: 3500, type: 'receita', jar: 'NEC_55' },
      { id: '2', date: '2026-10-10', amount: -1200, type: 'despesa', jar: 'NEC_55' },
      { id: '3', date: '2026-10-15', amount: -300, type: 'despesa', jar: 'DIV_10' },
      { id: '4', date: '2026-09-20', amount: 4000, type: 'receita', jar: 'NEC_55' },
      { id: '5', date: '2026-09-22', amount: -2100, type: 'despesa', jar: 'NEC_55' },
    ];

    const totals = extractMonthlyTotalsFromTransactions(txs);
    expect(totals['2026-10'].receita).toBe(3500);
    expect(totals['2026-10'].despesa).toBe(1500);
    expect(totals['2026-09'].receita).toBe(4000);
    expect(totals['2026-09'].despesa).toBe(2100);
  });

  it('classifies diagnosis status properly for various savings rates', () => {
    // High margin dataset
    const highMarginData = [
      { ym: '2026-05', short: 'Mai/26', full: 'Maio 2026', rec: 10000, desp: 7000 }, // 30% margin
      { ym: '2026-06', short: 'Jun/26', full: 'Junho 2026', rec: 10000, desp: 7000 },
    ];
    const highSummary = calculateCumulativeSavingsMetrics({
      windowMonths: 6,
      customHistory: highMarginData
    });
    expect(highSummary.statusDiagnostico).toBe('excelente');

    // Deficit dataset
    const deficitData = [
      { ym: '2026-05', short: 'Mai/26', full: 'Maio 2026', rec: 5000, desp: 6000 },
      { ym: '2026-06', short: 'Jun/26', full: 'Junho 2026', rec: 5000, desp: 5500 },
    ];
    const deficitSummary = calculateCumulativeSavingsMetrics({
      windowMonths: 6,
      customHistory: deficitData
    });
    expect(deficitSummary.statusDiagnostico).toBe('critico');
    expect(deficitSummary.totalPoupanca).toBeLessThan(0);
  });
});
