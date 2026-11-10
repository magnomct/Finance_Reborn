import { describe, it, expect } from 'bun:test';
import { analyzeC6InvoiceComparison } from '../src/utils/c6InvoiceAnalysis.ts';

describe('analyzeC6InvoiceComparison', () => {
  it('correctly calculates C6 invoice when date is after closing day', () => {
    const txs = [
      {
        id: 'c6-1',
        date: '2026-10-22',
        description: 'Fatura C6 Casa e Mercado',
        amount: -2000.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      },
      {
        id: 'c6-2',
        date: '2026-10-22',
        description: 'Fatura C6 Lazer e Restaurantes',
        amount: -600.0,
        type: 'despesa',
        jar: 'DIV_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const result = analyzeC6InvoiceComparison({
      transactions: txs,
      referenceDate: '2026-10-27',
      closingDay: 22
    });

    expect(result.isClosed).toBe(true);
    expect(result.currentInvoiceAmount).toBe(2600.0);
    expect(result.last3Months.length).toBe(3);
    // Average of 2450, 2400, 2520 = 2456.67
    expect(result.last3MonthsAverage).toBeCloseTo(2456.67, 1);
    expect(result.differenceAmount).toBeGreaterThan(0);
    expect(result.isAboveTrend).toBe(true);
    expect(result.differencePercentage).toBeGreaterThan(0);
  });

  it('triggers alert when current invoice is more than 10% above the 3-month average', () => {
    const txs = [
      {
        id: 'c6-high',
        date: '2026-10-23',
        description: 'Fatura C6 Alta com Viagem e Compras',
        amount: -3200.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const result = analyzeC6InvoiceComparison({
      transactions: txs,
      referenceDate: '2026-10-27'
    });

    expect(result.currentInvoiceAmount).toBe(3200.0);
    expect(result.trendStatus).toBe('alerta');
    expect(result.alertTitle).toContain('Acima da Média');
    expect(result.differencePercentage).toBeGreaterThan(10);
  });

  it('triggers economy/savings status when current invoice is below the 3-month average', () => {
    const txs = [
      {
        id: 'c6-low',
        date: '2026-10-23',
        description: 'Fatura C6 Econômica',
        amount: -1900.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const result = analyzeC6InvoiceComparison({
      transactions: txs,
      referenceDate: '2026-10-27'
    });

    expect(result.currentInvoiceAmount).toBe(1900.0);
    expect(result.trendStatus).toBe('abaixo_da_media');
    expect(result.isAboveTrend).toBe(false);
    expect(result.differencePercentage).toBeLessThan(0);
  });

  it('computes 3 historical months correctly with dynamic past transactions', () => {
    const txs = [
      {
        id: 'c6-set',
        date: '2026-09-20',
        description: 'Fatura C6 Setembro',
        amount: -2300.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      },
      {
        id: 'c6-ago',
        date: '2026-08-20',
        description: 'Fatura C6 Agosto',
        amount: -2200.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      },
      {
        id: 'c6-jul',
        date: '2026-07-20',
        description: 'Fatura C6 Julho',
        amount: -2100.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      },
      {
        id: 'c6-out',
        date: '2026-10-22',
        description: 'Fatura C6 Outubro',
        amount: -2500.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const result = analyzeC6InvoiceComparison({
      transactions: txs,
      referenceDate: '2026-10-27'
    });

    // Average of 2300, 2200, 2100 = 2200
    expect(result.last3MonthsAverage).toBe(2200);
    expect(result.currentInvoiceAmount).toBe(2500);
    expect(result.differenceAmount).toBe(300);
    expect(result.differencePercentage).toBeCloseTo(13.6, 1);
    expect(result.trendStatus).toBe('alerta');
  });
});
