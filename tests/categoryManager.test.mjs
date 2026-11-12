import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  DEFAULT_CATEGORY_HIERARCHY,
  APP_CATEGORIAS_STORAGE_KEY,
  HIERARCHY_STORAGE_KEY,
  loadCategoryHierarchy,
  saveCategoryHierarchy,
  resetCategoryHierarchyToDefaults,
  isParentCategoryNameDuplicate,
  isSubcategoryNameDuplicate,
  countTransactionsUsingCategory,
  applySafeDeleteCategory,
  applyCascadeRename,
  normalizeHierarchyItems
} from '../src/utils/categoryHierarchy.ts';

// In-memory mock for localStorage in test environment
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  }
};

describe('CategoryManager and Real-Time Hierarchy Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes and saves hierarchy to @app_financas:categorias and fallback key', () => {
    const loaded = loadCategoryHierarchy();
    expect(loaded.length).toBeGreaterThan(0);
    
    // Check that items have both type and color aliases
    const moradia = loaded.find(p => p.name === 'Moradia');
    expect(moradia).toBeDefined();
    expect(moradia?.nature).toBe('fixed');
    expect(moradia?.type).toBe('fixed');
    expect(moradia?.colorHex).toBeDefined();
    expect(moradia?.color).toBeDefined();

    // Check that Receitas & Entradas exists in defaults
    const receitas = loaded.find(p => p.name === 'Receitas & Entradas');
    expect(receitas).toBeDefined();
    expect(receitas?.nature).toBe('income');
    expect(receitas?.type).toBe('income');

    // Save customized hierarchy
    const customHierarchy = [
      ...loaded,
      {
        id: 'cat-test',
        name: 'Investimentos & Cripto',
        nature: 'variable',
        type: 'variable',
        colorHex: '#6366F1',
        color: '#6366F1',
        subcategories: [
          {
            id: 'sub-test-1',
            name: 'Bitcoin & ETH',
            parentId: 'cat-test',
            parentName: 'Investimentos & Cripto',
            nature: 'variable',
            type: 'variable',
            keywords: ['BITCOIN', 'BINANCE']
          }
        ]
      }
    ];

    saveCategoryHierarchy(customHierarchy);

    // Verify localStorage has written to @app_financas:categorias
    const rawApp = localStorage.getItem(APP_CATEGORIAS_STORAGE_KEY);
    expect(rawApp).not.toBeNull();
    const parsedApp = JSON.parse(rawApp);
    expect(parsedApp.some(p => p.name === 'Investimentos & Cripto')).toBe(true);

    // Verify fallback key was also populated
    const rawLegacy = localStorage.getItem(HIERARCHY_STORAGE_KEY);
    expect(rawLegacy).not.toBeNull();

    // Verify loadCategoryHierarchy reads the custom saved tree
    const reloaded = loadCategoryHierarchy();
    expect(reloaded.some(p => p.name === 'Investimentos & Cripto')).toBe(true);
  });

  it('restores default categories when reset is triggered', () => {
    // Alter storage first
    localStorage.setItem(APP_CATEGORIAS_STORAGE_KEY, JSON.stringify([{ id: 'fake', name: 'Fake', subcategories: [] }]));
    expect(loadCategoryHierarchy().length).toBe(1);

    // Trigger restore defaults
    const restored = resetCategoryHierarchyToDefaults();
    expect(restored.length).toBe(DEFAULT_CATEGORY_HIERARCHY.length);
    expect(restored.some(p => p.name === 'Moradia')).toBe(true);
    expect(restored.some(p => p.name === 'Receitas & Entradas')).toBe(true);

    // Reload from storage confirms defaults persist
    const fromStorage = loadCategoryHierarchy();
    expect(fromStorage.length).toBe(DEFAULT_CATEGORY_HIERARCHY.length);
  });

  it('blocks duplicate parent category names (case-insensitive and trimmed)', () => {
    const hierarchy = loadCategoryHierarchy();

    expect(isParentCategoryNameDuplicate('Moradia', hierarchy)).toBe(true);
    expect(isParentCategoryNameDuplicate('  moradia  ', hierarchy)).toBe(true);
    expect(isParentCategoryNameDuplicate('MORADIA', hierarchy)).toBe(true);
    expect(isParentCategoryNameDuplicate('Alimentação', hierarchy)).toBe(true);
    expect(isParentCategoryNameDuplicate('Alimentacao', hierarchy)).toBe(true);

    // New non-existent name is allowed
    expect(isParentCategoryNameDuplicate('Academia e Treinos', hierarchy)).toBe(false);

    // Exclude own ID during edit
    const moradiaId = hierarchy.find(p => p.name === 'Moradia')?.id;
    expect(isParentCategoryNameDuplicate('Moradia', hierarchy, moradiaId)).toBe(false);
  });

  it('blocks duplicate subcategory names within a parent category', () => {
    const hierarchy = loadCategoryHierarchy();
    const alimentacao = hierarchy.find(p => p.name === 'Alimentação');
    expect(alimentacao).toBeDefined();

    expect(isSubcategoryNameDuplicate('Supermercado', alimentacao.id, hierarchy)).toBe(true);
    expect(isSubcategoryNameDuplicate('  supermercado  ', alimentacao.id, hierarchy)).toBe(true);
    expect(isSubcategoryNameDuplicate('SUPERMERCADO', alimentacao.id, hierarchy)).toBe(true);

    // Non-existent sub is allowed
    expect(isSubcategoryNameDuplicate('Feira Orgânica', alimentacao.id, hierarchy)).toBe(false);

    // Exclude own ID during rename
    const subSuper = alimentacao.subcategories.find(s => s.name === 'Supermercado')?.id;
    expect(isSubcategoryNameDuplicate('Supermercado', alimentacao.id, hierarchy, subSuper)).toBe(false);
  });

  it('counts transactions using parent and sub categories accurately', () => {
    const txs = [
      { id: '1', description: 'Mercado', category: 'Alimentação > Supermercado', parentCategory: 'Alimentação', subcategory: 'Supermercado' },
      { id: '2', description: 'iFood jantar', category: 'Alimentação > Delivery & Lanches', parentCategory: 'Alimentação', subcategory: 'Delivery & Lanches' },
      { id: '3', description: 'Aluguel', category: 'Moradia > Aluguel & Financiamento', parentCategory: 'Moradia', subcategory: 'Aluguel & Financiamento' }
    ];

    expect(countTransactionsUsingCategory(txs, 'Alimentação', true)).toBe(2);
    expect(countTransactionsUsingCategory(txs, 'Moradia', true)).toBe(1);
    expect(countTransactionsUsingCategory(txs, 'Supermercado', false)).toBe(1);
    expect(countTransactionsUsingCategory(txs, 'Delivery & Lanches', false)).toBe(1);
    expect(countTransactionsUsingCategory(txs, 'Lazer', true)).toBe(0);
  });

  it('safely deletes subcategory with linked transactions and reassigns to fallback "Outros > Diversos"', () => {
    const hierarchy = loadCategoryHierarchy();
    const alimentacao = hierarchy.find(p => p.name === 'Alimentação');
    const subDelivery = alimentacao?.subcategories.find(s => s.name === 'Delivery & Lanches');
    expect(subDelivery).toBeDefined();

    const txs = [
      { 
        id: 'tx-1', 
        description: 'Burger', 
        category: 'Alimentação > Delivery & Lanches', 
        parentCategory: 'Alimentação', 
        subcategory: 'Delivery & Lanches',
        amount: -45,
        type: 'despesa'
      },
      { 
        id: 'tx-2', 
        description: 'Mercado', 
        category: 'Alimentação > Supermercado', 
        parentCategory: 'Alimentação', 
        subcategory: 'Supermercado',
        amount: -200,
        type: 'despesa'
      }
    ];

    const { updatedTransactions, updatedHierarchy, affectedCount, deletedName } = applySafeDeleteCategory(
      txs,
      hierarchy,
      subDelivery.id,
      false
    );

    expect(deletedName).toBe('Delivery & Lanches');
    expect(affectedCount).toBe(1);

    // Verify subcategory is removed from hierarchy
    const updatedParent = updatedHierarchy.find(p => p.id === alimentacao.id);
    expect(updatedParent?.subcategories.some(s => s.name === 'Delivery & Lanches')).toBe(false);

    // Verify tx-1 was reassigned to Outros > Diversos
    const tx1 = updatedTransactions.find(t => t.id === 'tx-1');
    expect(tx1?.category).toBe('Outros > Diversos');
    expect(tx1?.parentCategory).toBe('Outros');
    expect(tx1?.subcategory).toBe('Diversos');

    // Verify tx-2 was not modified
    const tx2 = updatedTransactions.find(t => t.id === 'tx-2');
    expect(tx2?.category).toBe('Alimentação > Supermercado');
  });

  it('safely deletes parent category with linked transactions and reassigns to fallback', () => {
    const hierarchy = loadCategoryHierarchy();
    const moradia = hierarchy.find(p => p.name === 'Moradia');
    expect(moradia).toBeDefined();

    const txs = [
      { 
        id: 'tx-m1', 
        description: 'Aluguel', 
        category: 'Moradia > Aluguel & Financiamento', 
        parentCategory: 'Moradia', 
        subcategory: 'Aluguel & Financiamento',
        amount: -2500,
        type: 'despesa'
      }
    ];

    const { updatedTransactions, updatedHierarchy, affectedCount, deletedName } = applySafeDeleteCategory(
      txs,
      hierarchy,
      moradia.id,
      true
    );

    expect(deletedName).toBe('Moradia');
    expect(affectedCount).toBe(1);
    expect(updatedHierarchy.some(p => p.id === moradia.id)).toBe(false);

    const txM1 = updatedTransactions.find(t => t.id === 'tx-m1');
    expect(txM1?.category).toBe('Outros > Diversos');
    expect(txM1?.parentCategory).toBe('Outros');
  });

  it('cascades inline renaming of parent and subcategories across historical transactions', () => {
    const txs = [
      {
        id: 'tx-1',
        description: 'Supermercado',
        category: 'Alimentação > Supermercado',
        parentCategory: 'Alimentação',
        subcategory: 'Supermercado',
        amount: -150,
        type: 'despesa'
      }
    ];

    // Rename Parent: "Alimentação" -> "Gastronomia & Casa"
    const { updatedTransactions: step1, affectedCount: count1 } = applyCascadeRename(
      txs,
      'Alimentação',
      'Gastronomia & Casa',
      true
    );

    expect(count1).toBe(1);
    expect(step1[0].parentCategory).toBe('Gastronomia & Casa');
    expect(step1[0].category).toBe('Gastronomia & Casa > Supermercado');

    // Rename Subcategory: "Supermercado" -> "Mercados & Feiras"
    const { updatedTransactions: step2, affectedCount: count2 } = applyCascadeRename(
      step1,
      'Supermercado',
      'Gastronomia & Casa > Mercados & Feiras',
      false
    );

    expect(count2).toBe(1);
    expect(step2[0].subcategory).toBe('Mercados & Feiras');
    expect(step2[0].category).toBe('Gastronomia & Casa > Mercados & Feiras');
  });
});
