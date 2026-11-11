import { describe, it, expect } from 'bun:test';
import { calculateTopRecurringExpenseCategories } from '../src/utils/recurringCategories.ts';

describe('calculateTopRecurringExpenseCategories', () => {
  it('correctly ranks top 3 recurring expense categories descending by monthly contribution', () => {
    const mockList = [
      {
        id: '1',
        description: 'Financiamento Habitacional',
        amount: -1290,
        amountPlanned: 1290,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Moradia',
        isActive: true,
      },
      {
        id: '2',
        description: 'Fatura C6 Contas',
        amount: -2000,
        amountPlanned: 2000,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Cartão de Crédito',
        isActive: true,
      },
      {
        id: '3',
        description: 'Convênio Médico',
        amount: -1296.45,
        amountPlanned: 1296.45,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Saúde',
        isActive: true,
      },
      {
        id: '4',
        description: 'Condução Semanal',
        amount: -120,
        amountPlanned: 120,
        type: 'despesa',
        frequency: 'semanal', // 120 * 4 = 480 / month
        category: 'Transporte',
        isActive: true,
      },
      {
        id: '5',
        description: 'Salário CLT',
        amount: 2060,
        amountPlanned: 2060,
        type: 'receita', // Should be ignored
        frequency: 'mensal',
        category: 'Salário',
        isActive: true,
      },
      {
        id: '6',
        description: 'Streaming inativo',
        amount: -50,
        amountPlanned: 50,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Lazer',
        isActive: false, // Inactive should be ignored
      }
    ];

    const result = calculateTopRecurringExpenseCategories(mockList, 3);

    // Categories in descending order:
    // 1. Cartão de Crédito: 2000
    // 2. Saúde: 1296.45
    // 3. Moradia: 1290
    // (Transporte: 480 is #4)
    expect(result.topCategories.length).toBe(3);

    expect(result.topCategories[0].category).toBe('Cartão de Crédito');
    expect(result.topCategories[0].monthlyAmount).toBe(2000);
    expect(result.topCategories[0].barWidthPct).toBe(100);

    expect(result.topCategories[1].category).toBe('Saúde');
    expect(result.topCategories[1].monthlyAmount).toBe(1296.45);

    expect(result.topCategories[2].category).toBe('Moradia');
    expect(result.topCategories[2].monthlyAmount).toBe(1290);

    // Total expenses: 2000 + 1296.45 + 1290 + 480 = 5066.45
    expect(result.totalMonthlyRecurringExpenses).toBe(5066.45);

    // Top 3 total: 2000 + 1296.45 + 1290 = 4586.45
    expect(result.top3TotalAmount).toBe(4586.45);
    expect(result.top3PercentageOfTotal).toBeCloseTo(90.5, 1);
  });

  it('aggregates multiple recurring items under the same category', () => {
    const mockList = [
      {
        id: '1',
        description: 'Almoço Diário',
        amount: -20,
        amountPlanned: 20,
        type: 'despesa',
        frequency: 'diaria', // 20 * 30 = 600 / month
        category: 'Alimentação',
        isActive: true,
      },
      {
        id: '2',
        description: 'Supermercado Semanal',
        amount: -250,
        amountPlanned: 250,
        type: 'despesa',
        frequency: 'semanal', // 250 * 4 = 1000 / month
        category: 'Alimentação',
        isActive: true,
      },
      {
        id: '3',
        description: 'Internet Fibra',
        amount: -120,
        amountPlanned: 120,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Moradia',
        isActive: true,
      }
    ];

    const result = calculateTopRecurringExpenseCategories(mockList, 3);
    expect(result.topCategories[0].category).toBe('Alimentação');
    expect(result.topCategories[0].monthlyAmount).toBe(1600); // 600 + 1000
    expect(result.topCategories[0].itemsCount).toBe(2);
    expect(result.topCategories[0].sampleItems).toContain('Almoço Diário');
    expect(result.topCategories[0].sampleItems).toContain('Supermercado Semanal');
  });

  it('handles empty or all-income lists gracefully without NaN', () => {
    const emptyResult = calculateTopRecurringExpenseCategories([]);
    expect(emptyResult.topCategories.length).toBe(0);
    expect(emptyResult.totalMonthlyRecurringExpenses).toBe(0);
    expect(emptyResult.top3TotalAmount).toBe(0);
    expect(emptyResult.top3PercentageOfTotal).toBe(0);

    const onlyIncome = [
      {
        id: '1',
        description: 'Salário CLT',
        amount: 3000,
        amountPlanned: 3000,
        type: 'receita',
        frequency: 'mensal',
        category: 'Salário',
        isActive: true,
      }
    ];
    const incomeResult = calculateTopRecurringExpenseCategories(onlyIncome);
    expect(incomeResult.topCategories.length).toBe(0);
    expect(incomeResult.totalMonthlyRecurringExpenses).toBe(0);
  });

  it('handles fewer than 3 categories gracefully', () => {
    const single = [
      {
        id: '1',
        description: 'Aluguel',
        amount: -1500,
        amountPlanned: 1500,
        type: 'despesa',
        frequency: 'mensal',
        category: 'Moradia',
        isActive: true,
      }
    ];
    const res = calculateTopRecurringExpenseCategories(single, 3);
    expect(res.topCategories.length).toBe(1);
    expect(res.topCategories[0].percentageOfTotal).toBe(100);
    expect(res.top3PercentageOfTotal).toBe(100);
  });
});
