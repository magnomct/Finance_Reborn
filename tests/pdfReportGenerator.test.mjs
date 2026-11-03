import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAccountingSummary } from '../src/utils/pdfReportGenerator.ts';

test('Accounting Report Summary: properly computes totals, net balance, and breakdown', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      date: '2026-10-01',
      description: 'Salário Consultoria',
      amount: 5000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 'tx-2',
      date: '2026-10-05',
      description: 'Aluguel Escritório',
      amount: -1200,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
      category: 'Habitação',
    },
    {
      id: 'tx-3',
      date: '2026-10-10',
      description: 'Curso Avançado',
      amount: -300,
      type: 'despesa',
      jar: 'EDU_10',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado',
      category: 'Educação',
    },
    {
      id: 'tx-4',
      date: '2026-10-15',
      description: 'Jantar Restaurante',
      amount: -150,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Suzy',
      account: 'C6',
      status: 'liquidado',
      category: 'Lazer',
    },
    {
      id: 'tx-5',
      date: '2026-10-20',
      description: 'Reembolso Despesa',
      amount: 150,
      type: 'reembolso',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    }
  ];

  const summary = computeAccountingSummary(mockTransactions);

  // Income: 5000 + 150 = 5150
  assert.equal(summary.totalIncome, 5150);

  // Expenses: 1200 + 300 + 150 = 1650
  assert.equal(summary.totalExpenses, 1650);

  // Net Balance: 5150 - 1650 = 3500
  assert.equal(summary.netBalance, 3500);

  // Counts: 4 liquidado, 1 agendado, total 5
  assert.equal(summary.totalCount, 5);
  assert.equal(summary.liquidatedCount, 4);
  assert.equal(summary.scheduledCount, 1);

  // Jar Breakdown check
  assert.ok(summary.jarBreakdown['NEC_55']);
  assert.equal(summary.jarBreakdown['NEC_55'].amount, 1200);
  assert.equal(summary.jarBreakdown['EDU_10'].amount, 300);
  assert.equal(summary.jarBreakdown['DIV_10'].amount, 150);

  // Percentage calculations
  const necPct = (1200 / 1650) * 100;
  assert.ok(Math.abs(summary.jarBreakdown['NEC_55'].pctOfExpense - necPct) < 0.01);

  // Category Breakdown check
  assert.equal(summary.categoryBreakdown['Habitação'].amount, 1200);
  assert.equal(summary.categoryBreakdown['Educação'].amount, 300);
  assert.equal(summary.categoryBreakdown['Lazer'].amount, 150);
});

test('Accounting Report Summary: handles empty transactions gracefully', () => {
  const summary = computeAccountingSummary([]);
  assert.equal(summary.totalIncome, 0);
  assert.equal(summary.totalExpenses, 0);
  assert.equal(summary.netBalance, 0);
  assert.equal(summary.totalCount, 0);
  assert.equal(Object.keys(summary.jarBreakdown).length, 0);
});

test('Accounting PDF Document: builds complete PDF instance with tables and signatures', async () => {
  const { generateAccountingPDF } = await import('../src/utils/pdfReportGenerator.ts');
  const mockTransactions = [
    {
      id: 'tx-1',
      date: '2026-10-01',
      description: 'Salário Consultoria',
      amount: 5000,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
    },
    {
      id: 'tx-2',
      date: '2026-10-05',
      description: 'Aluguel Escritório',
      amount: -1200,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
      category: 'Habitação',
    }
  ];

  const config = {
    reportTitle: 'Prestação de Contas Outubro 2026',
    entityName: 'Magno Silva',
    documentNumber: '123.456.789-00',
    periodLabel: '01/10/2026 a 31/10/2026',
    notes: 'Documento contábil para encerramento fiscal',
    accountantName: 'João Contador',
    accountantCrc: 'CRC-SP 999999/O',
    includeSignatures: true,
  };

  const doc = generateAccountingPDF(mockTransactions, config);
  assert.ok(doc, 'PDF doc should be returned');
  const pageCount = doc.internal.getNumberOfPages();
  assert.ok(pageCount >= 1, 'Should have at least 1 page');

  const pdfOutput = doc.output();
  assert.ok(typeof pdfOutput === 'string' && pdfOutput.length > 0, 'PDF output string should not be empty');
});
