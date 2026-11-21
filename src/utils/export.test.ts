import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Transaction } from '../types';
import {
  buildExportRangeFilename,
  computeExportPreviewStats,
  exportTransactionsToCSV,
  exportTransactionsToExcel,
  exportTransactionsToPDF,
  filterTransactionsForExport,
  formatDateDDMMYYYY,
  resolveDateRangeForPreset,
} from './export';

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2026-10-05',
    description: 'Salário Mensal',
    amount: 6500,
    type: 'receita',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    category: 'Salário',
    status: 'liquidado',
    paymentMethod: 'Conta Corrente',
  },
  {
    id: 'tx-2',
    date: '2026-10-12',
    description: 'Supermercado; Zona Sul "Especial"',
    amount: 820.5,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    category: 'Alimentação',
    status: 'liquidado',
    paymentMethod: 'Cartão de Crédito',
  },
  {
    id: 'tx-3',
    date: '2026-10-18',
    description: 'Consultoria Tech MEI',
    amount: 4200,
    type: 'receita',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    category: 'Serviços Prestados',
    status: 'liquidado',
    paymentMethod: 'Conta Corrente',
  },
  {
    id: 'tx-4',
    date: '2026-10-20',
    description: 'Guia DAS MEI',
    amount: 76.6,
    type: 'despesa',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    category: 'Impostos PJ',
    status: 'liquidado',
    paymentMethod: 'Conta Corrente',
  },
  {
    id: 'tx-5',
    date: '2026-09-25',
    description: 'Aluguel Setembro',
    amount: 2100,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'C6',
    category: 'Moradia',
    status: 'liquidado',
    paymentMethod: 'Conta Corrente',
  },
];

describe('export engine (pt-BR / BRL)', () => {
  it('formats ISO YYYY-MM-DD dates as DD/MM/YYYY', () => {
    assert.equal(formatDateDDMMYYYY('2026-10-15'), '15/10/2026');
    assert.equal(formatDateDDMMYYYY('2026-01-03'), '03/01/2026');
    assert.equal(formatDateDDMMYYYY(''), '-');
  });

  it('resolves date presets cleanly around an anchor date', () => {
    assert.deepEqual(resolveDateRangeForPreset('THIS_MONTH', '2026-10-31'), {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    assert.deepEqual(resolveDateRangeForPreset('YEAR_CURRENT', '2026-10-31'), {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const last30 = resolveDateRangeForPreset('LAST_30_DAYS', '2026-10-31');
    assert.equal(last30.startDate, '2026-10-01');
    assert.equal(last30.endDate, '2026-10-31');
  });

  it('filters transactions by date range, scope (PF vs PJ), and multi-categories', () => {
    const octAll = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'ALL',
    });
    assert.equal(octAll.length, 4);

    const octPF = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'PF',
    });
    assert.equal(octPF.length, 2);
    assert.ok(octPF.every(tx => tx.costCenter !== 'PJ'));

    const octPJ = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'PJ',
    });
    assert.equal(octPJ.length, 2);
    assert.ok(octPJ.every(tx => tx.costCenter === 'PJ'));

    const multiCat = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'ALL',
      categories: ['Alimentação', 'Impostos PJ'],
    });
    assert.equal(multiCat.length, 2);
    assert.deepEqual(
      multiCat.map(t => t.id),
      ['tx-4', 'tx-2']
    );
  });

  it('computes accurate inflow, outflow, and netBalance stats', () => {
    const octAll = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    const stats = computeExportPreviewStats(octAll);
    assert.equal(stats.count, 4);
    assert.equal(stats.totalInflow, 10700);
    assert.equal(stats.totalOutflow, 897.1);
    assert.equal(stats.netBalance, 9802.9);
  });

  it('builds dynamic range filenames matching extrato-financeiro_${start}_a_${end}.${ext}', () => {
    assert.equal(
      buildExportRangeFilename(SAMPLE_TRANSACTIONS, 'csv', {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
      'extrato-financeiro_2026-10-01_a_2026-10-31.csv'
    );
    assert.equal(
      buildExportRangeFilename(SAMPLE_TRANSACTIONS, 'xls', {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
      'extrato-financeiro_2026-10-01_a_2026-10-31.xls'
    );
    assert.equal(
      buildExportRangeFilename(SAMPLE_TRANSACTIONS, 'pdf', {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      }),
      'extrato-financeiro_2026-10-01_a_2026-10-31.pdf'
    );
  });

  it('generates pt-BR UTF-8 BOM semicolon-delimited CSV with RFC-4180 escaping', () => {
    const octPF = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'PF',
    });
    const result = exportTransactionsToCSV(octPF, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      skipBrowserAction: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.format, 'csv');
    assert.equal(result.filename, 'extrato-financeiro_2026-10-01_a_2026-10-31.csv');
    assert.ok(result.content.startsWith('\uFEFFData;Descrição;Categoria;Escopo;Tipo;Valor (R$)'));
    assert.ok(result.content.includes('12/10/2026;"Supermercado; Zona Sul ""Especial""";Alimentação;PF;Saída;-820,50'));
    assert.ok(result.content.includes('05/10/2026;Salário Mensal;Salário;PF;Entrada;6500,00'));
  });

  it('generates styled SpreadsheetML .xls Excel workbook with summary footer', () => {
    const octAll = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    const result = exportTransactionsToExcel(octAll, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'ALL',
      skipBrowserAction: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.format, 'excel');
    assert.equal(result.filename, 'extrato-financeiro_2026-10-01_a_2026-10-31.xls');
    assert.ok(result.content.includes('urn:schemas-microsoft-com:office:excel'));
    assert.ok(result.content.includes('Total Entradas'));
    assert.ok(result.content.includes('Total Saídas'));
    assert.ok(result.content.includes('Saldo Líquido'));
    assert.ok(result.content.includes('MEI/PJ'));
    assert.ok(result.content.includes('18/10/2026'));
  });

  it('generates print-ready A4 PDF HTML with @media print, KPI cards, and itemized table', () => {
    const octAll = filterTransactionsForExport(SAMPLE_TRANSACTIONS, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    const result = exportTransactionsToPDF(octAll, {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      scope: 'ALL',
      categories: ['Alimentação'],
      skipBrowserAction: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.format, 'pdf');
    assert.equal(result.filename, 'extrato-financeiro_2026-10-01_a_2026-10-31.pdf');
    assert.ok(result.content.includes('@page { size: A4 portrait;'));
    assert.ok(result.content.includes('@media print'));
    assert.ok(result.content.includes('Extrato Financeiro Consolidado'));
    assert.ok(result.content.includes('Saldo Líquido'));
    assert.ok(result.content.includes('Consultoria Tech MEI'));
  });
});
