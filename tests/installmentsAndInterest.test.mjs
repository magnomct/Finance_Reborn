import { describe, it, expect } from 'bun:test';
import { 
  normalizeText, 
  identifyCommitment, 
  detectCommitmentsFromTransactions, 
  generateNext3MonthLabels, 
  calculateCashFlowDebtImpact 
} from '../src/utils/installmentsAndInterest.ts';

describe('installmentsAndInterest utility', () => {
  it('normalizes text stripping accents and casing', () => {
    expect(normalizeText('Parcelamento de Cartão')).toBe('parcelamento de cartao');
    expect(normalizeText('JUROS ROTATIVO & MORA')).toBe('juros rotativo & mora');
    expect(normalizeText('Crédito Habitacional')).toBe('credito habitacional');
  });

  it('correctly identifies parcelas vs juros vs non-debt transactions', () => {
    // Parcela
    const txParcela = {
      id: 'tx-4',
      date: '2026-10-25',
      description: 'Financiamento Apto - Parcela Habitacional',
      amount: -1290.00,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'agendado'
    };
    const resParcela = identifyCommitment(txParcela);
    expect(resParcela.isMatch).toBe(true);
    expect(resParcela.type).toBe('parcelamento');

    // Juros
    const txJuros = {
      id: 'tx-5',
      date: '2026-10-25',
      description: 'Juros de Cheque Especial (Apto / Conta PF)',
      amount: -140.00,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    };
    const resJuros = identifyCommitment(txJuros);
    expect(resJuros.isMatch).toBe(true);
    expect(resJuros.type).toBe('juros');

    // Income - should be excluded
    const txIncome = {
      id: 'tx-1',
      date: '2026-10-10',
      description: 'Salário CLT (Magno)',
      amount: 2060.00,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    };
    expect(identifyCommitment(txIncome).isMatch).toBe(false);

    // Regular grocery expense - should be excluded
    const txGrocery = {
      id: 'tx-7',
      date: '2026-10-15',
      description: 'Shopee / Despesas Básicas do Lar',
      amount: -142.00,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado'
    };
    expect(identifyCommitment(txGrocery).isMatch).toBe(false);
  });

  it('scans a transaction list and extracts unique commitments', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        date: '2026-10-10',
        description: 'Salário CLT (Magno)',
        amount: 2060.00,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-4',
        date: '2026-10-25',
        description: 'Financiamento Apto - Parcela Habitacional',
        amount: -1290.00,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'agendado'
      },
      {
        id: 'tx-5',
        date: '2026-10-25',
        description: 'Juros de Cheque Especial (Apto / Conta PF)',
        amount: -140.00,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      }
    ];

    const detected = detectCommitmentsFromTransactions(mockTransactions);
    expect(detected.length).toBe(2);

    const parcela = detected.find(d => d.type === 'parcelamento');
    expect(parcela).toBeDefined();
    expect(parcela.amount).toBe(1290.00);

    const juros = detected.find(d => d.type === 'juros');
    expect(juros).toBeDefined();
    expect(juros.amount).toBe(140.00);
  });

  it('generates the next 3 months chronologically', () => {
    const labels = generateNext3MonthLabels('2026-10-15');
    expect(labels.length).toBe(3);
    expect(labels[0].monthKey).toBe('2026-11');
    expect(labels[1].monthKey).toBe('2026-12');
    expect(labels[2].monthKey).toBe('2027-01');
  });

  it('calculates the cumulative 3-month impact with monthly progression', () => {
    const commitments = [
      {
        id: 'c-1',
        transactionId: 't-1',
        description: 'Parcela Financiamento',
        amount: 1000,
        type: 'parcelamento',
        category: 'Moradia',
        account: 'Inter PF',
        costCenter: 'Magno',
        matchReason: 'termo parcela',
        isRecurring: true,
        date: '2026-10-10',
        tags: ['Parcela Mensal']
      },
      {
        id: 'c-2',
        transactionId: 't-2',
        description: 'Juros Cheque Especial',
        amount: 200,
        type: 'juros',
        category: 'Juros / Tarifas',
        account: 'Inter PF',
        costCenter: 'Magno',
        matchReason: 'termo juros',
        isRecurring: true,
        date: '2026-10-10',
        tags: ['Juros', 'Evitável']
      }
    ];

    const impact = calculateCashFlowDebtImpact(commitments, undefined, '2026-10-15');

    // Monthly values
    expect(impact.monthlyInstallments).toBe(1000);
    expect(impact.monthlyInterest).toBe(200);
    expect(impact.totalMonthlyDrain).toBe(1200);

    // 3 Months cumulative progression:
    // Month 1: 1200
    // Month 2: 2400
    // Month 3: 3600
    expect(impact.projections[0].monthTotal).toBe(1200);
    expect(impact.projections[0].cumulativeTotal).toBe(1200);

    expect(impact.projections[1].monthTotal).toBe(1200);
    expect(impact.projections[1].cumulativeTotal).toBe(2400);

    expect(impact.projections[2].monthTotal).toBe(1200);
    expect(impact.projections[2].cumulativeTotal).toBe(3600);

    expect(impact.cumulative3MonthsTotal).toBe(3600);
    expect(impact.cumulative3MonthsInstallments).toBe(3000);
    expect(impact.cumulative3MonthsInterest).toBe(600);
    expect(impact.avoidableSavings3Months).toBe(600);
    expect(impact.interestSharePct).toBeCloseTo(16.7, 1);
  });

  it('supports interactive filtering by active item IDs', () => {
    const commitments = [
      {
        id: 'c-1',
        transactionId: 't-1',
        description: 'Parcela Financiamento',
        amount: 1000,
        type: 'parcelamento',
        category: 'Moradia',
        account: 'Inter PF',
        costCenter: 'Magno',
        matchReason: 'termo parcela',
        isRecurring: true,
        date: '2026-10-10',
        tags: ['Parcela Mensal']
      },
      {
        id: 'c-2',
        transactionId: 't-2',
        description: 'Juros Cheque Especial',
        amount: 200,
        type: 'juros',
        category: 'Juros / Tarifas',
        account: 'Inter PF',
        costCenter: 'Magno',
        matchReason: 'termo juros',
        isRecurring: true,
        date: '2026-10-10',
        tags: ['Juros', 'Evitável']
      }
    ];

    // Only active c-2 (juros)
    const activeSet = new Set(['c-2']);
    const impactOnlyJuros = calculateCashFlowDebtImpact(commitments, activeSet, '2026-10-15');

    expect(impactOnlyJuros.activeItemsCount).toBe(1);
    expect(impactOnlyJuros.totalMonthlyDrain).toBe(200);
    expect(impactOnlyJuros.cumulative3MonthsTotal).toBe(600);
    expect(impactOnlyJuros.cumulative3MonthsInterest).toBe(600);
    expect(impactOnlyJuros.cumulative3MonthsInstallments).toBe(0);
  });

  it('handles empty commitments gracefully without NaN', () => {
    const impactEmpty = calculateCashFlowDebtImpact([]);
    expect(impactEmpty.totalMonthlyDrain).toBe(0);
    expect(impactEmpty.cumulative3MonthsTotal).toBe(0);
    expect(impactEmpty.interestSharePct).toBe(0);
    expect(impactEmpty.projections.length).toBe(3);
    expect(impactEmpty.projections[0].cumulativeTotal).toBe(0);
  });
});
