import { describe, it, expect } from 'bun:test';
import { 
  DEFAULT_CATEGORY_HIERARCHY,
  parseHierarchicalCategory,
  applyCascadeRename,
  applyCascadeMerge,
  applyCascadeMoveSubcategory,
  applyGroupInParentCategory,
  matchTransactionWithHierarchy,
  calculateHierarchyStats,
  resolveNatureForHierarchy
} from '../src/utils/categoryHierarchy.ts';

describe('categoryHierarchy utilities and cascading operations', () => {
  const sampleTransactions = [
    {
      id: 'tx-1',
      date: '2026-10-10',
      description: 'iFood burguer almoço',
      amount: -85.5,
      type: 'despesa',
      category: 'Alimentação > Delivery & Lanches',
      parentCategory: 'Alimentação',
      subcategory: 'Delivery & Lanches',
      nature: 'variable'
    },
    {
      id: 'tx-2',
      date: '2026-10-11',
      description: 'Supermercado Pão de Açúcar',
      amount: -450.0,
      type: 'despesa',
      category: 'Alimentação',
      parentCategory: 'Alimentação',
      subcategory: 'Supermercado',
      nature: 'fixed'
    },
    {
      id: 'tx-3',
      date: '2026-10-12',
      description: 'Corrida 99POP reunião',
      amount: -32.0,
      type: 'despesa',
      category: 'Transporte',
      parentCategory: 'Transporte',
      subcategory: 'Aplicativos & Táxi',
      nature: 'variable'
    },
    {
      id: 'tx-4',
      date: '2026-10-15',
      description: 'Aluguel apto',
      amount: -2200.0,
      type: 'despesa',
      category: 'Moradia > Aluguel & Condomínio',
      parentCategory: 'Moradia',
      subcategory: 'Aluguel & Condomínio',
      nature: 'fixed'
    }
  ];

  it('parses hierarchical category string correctly', () => {
    const parsed1 = parseHierarchicalCategory('Alimentação > Supermercado');
    expect(parsed1.parentCategory).toBe('Alimentação');
    expect(parsed1.subcategory).toBe('Supermercado');
    expect(parsed1.formatted).toBe('Alimentação > Supermercado');

    const parsed2 = parseHierarchicalCategory('Aluguel');
    expect(parsed2.parentCategory).toBe('Moradia');
    expect(parsed2.subcategory).toBe('Aluguel & Financiamento');
  });

  it('resolves nature (fixed vs variable) according to hierarchy defaults', () => {
    expect(resolveNatureForHierarchy('Moradia')).toBe('fixed');
    expect(resolveNatureForHierarchy('Alimentação > Delivery & Lanches')).toBe('variable');
    expect(resolveNatureForHierarchy('Transporte > Aplicativos & Táxi')).toBe('variable');
  });

  it('cascades parent category rename across historical transactions', () => {
    const { updatedTransactions, affectedCount } = applyCascadeRename(
      sampleTransactions,
      'Alimentação',
      'Gastronomia & Nutrição',
      true
    );

    expect(affectedCount).toBe(2);
    const tx1 = updatedTransactions.find(t => t.id === 'tx-1');
    expect(tx1.parentCategory).toBe('Gastronomia & Nutrição');
    expect(tx1.category).toContain('Gastronomia & Nutrição > Delivery & Lanches');

    const tx4 = updatedTransactions.find(t => t.id === 'tx-4');
    expect(tx4.parentCategory).toBe('Moradia'); // Untouched
  });

  it('cascades subcategory rename across historical transactions', () => {
    const { updatedTransactions, affectedCount } = applyCascadeRename(
      sampleTransactions,
      'Delivery & Lanches',
      'Delivery Express',
      false,
      'Alimentação'
    );

    expect(affectedCount).toBe(1);
    const tx1 = updatedTransactions.find(t => t.id === 'tx-1');
    expect(tx1.subcategory).toBe('Delivery Express');
    expect(tx1.category).toBe('Alimentação > Delivery Express');
  });

  it('cascades merge of two subcategories retroactively', () => {
    const extraTxs = [
      ...sampleTransactions,
      {
        id: 'tx-5',
        date: '2026-10-18',
        description: 'Restaurante Por Quilo',
        amount: -45,
        type: 'despesa',
        category: 'Alimentação > Restaurantes',
        parentCategory: 'Alimentação',
        subcategory: 'Restaurantes',
        nature: 'variable'
      }
    ];

    const { updatedTransactions, affectedCount } = applyCascadeMerge(
      extraTxs,
      'Restaurantes',
      'Delivery & Lanches',
      'Alimentação'
    );

    expect(affectedCount).toBe(1);
    const tx5 = updatedTransactions.find(t => t.id === 'tx-5');
    expect(tx5.subcategory).toBe('Delivery & Lanches');
    expect(tx5.category).toBe('Alimentação > Delivery & Lanches');
  });

  it('moves subcategory to a new parent category in cascade', () => {
    const { updatedTransactions, affectedCount } = applyCascadeMoveSubcategory(
      sampleTransactions,
      'Delivery & Lanches',
      'Alimentação',
      'Lazer & Estilo',
      'variable'
    );

    expect(affectedCount).toBe(1);
    const tx1 = updatedTransactions.find(t => t.id === 'tx-1');
    expect(tx1.parentCategory).toBe('Lazer & Estilo');
    expect(tx1.category).toBe('Lazer & Estilo > Delivery & Lanches');
  });

  it('batch groups loose transaction categories into a parent category', () => {
    const looseTxs = [
      { id: 'l1', description: 'Cafeteria', amount: -22, type: 'despesa', category: 'Cafeteria' },
      { id: 'l2', description: 'Padaria da Esquina', amount: -35, type: 'despesa', category: 'Padaria' }
    ];

    const { updatedTransactions, affectedCount } = applyGroupInParentCategory(
      looseTxs,
      ['Cafeteria', 'Padaria'],
      'Alimentação',
      'variable'
    );

    expect(affectedCount).toBe(2);
    expect(updatedTransactions[0].parentCategory).toBe('Alimentação');
    expect(updatedTransactions[0].subcategory).toBe('Cafeteria');
    expect(updatedTransactions[0].category).toBe('Alimentação > Cafeteria');
  });

  it('matches transaction keywords like IFOOD and 99APP automatically', () => {
    const matchIfood = matchTransactionWithHierarchy('Pedido 4932 IFOOD almoço', DEFAULT_CATEGORY_HIERARCHY);
    expect(matchIfood).not.toBeNull();
    expect(matchIfood?.parentCategory.name).toBe('Alimentação');
    expect(matchIfood?.subcategory.name).toBe('Delivery & Lanches');

    const match99 = matchTransactionWithHierarchy('Corrida 99APP Centro', DEFAULT_CATEGORY_HIERARCHY);
    expect(match99).not.toBeNull();
    expect(match99?.parentCategory.name).toBe('Transporte');
  });

  it('calculates hierarchy stats accurately', () => {
    const stats = calculateHierarchyStats(sampleTransactions, DEFAULT_CATEGORY_HIERARCHY);
    expect(stats.totalSpent).toBeGreaterThan(0);
    expect(stats.byParent['Alimentação']).toBeDefined();
    expect(stats.byParent['Alimentação'].count).toBe(2);
    expect(stats.byParent['Moradia'].total).toBe(2200);
  });
});
