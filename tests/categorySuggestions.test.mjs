import { describe, it, expect } from 'bun:test';
import {
  findCategoryRuleSuggestions,
  extractCandidateTokens
} from '../src/utils/categorySuggestions.ts';

describe('categorySuggestions utility', () => {
  const existingRules = [
    {
      id: 'rule-uber',
      keyword: 'uber',
      jar: 'NEC_55',
      category: 'Transporte',
      costCenter: 'Magno',
      account: 'C6'
    },
    {
      id: 'rule-ifood',
      keyword: 'ifood',
      jar: 'DIV_10',
      category: 'Lazer',
      costCenter: 'Magno',
      account: 'C6'
    }
  ];

  it('extractCandidateTokens strips punctuation and stop words properly', () => {
    const tokens = extractCandidateTokens('Compra no Supermercado Carrefour com cartao');
    expect(tokens).toContain('supermercado');
    expect(tokens).toContain('carrefour');
    expect(tokens).not.toContain('no');
    expect(tokens).not.toContain('com');
    expect(tokens).not.toContain('compra');
    expect(tokens).not.toContain('cartao');
  });

  it('ignores transactions that already match an existing rule', () => {
    const txs = [
      {
        id: 'tx-uber-1',
        date: '2026-10-10',
        description: 'Corrida de Uber até trabalho',
        amount: -25.5,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      },
      {
        id: 'tx-uber-2',
        date: '2026-10-12',
        description: 'Uber para consulta',
        amount: -34.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const suggestions = findCategoryRuleSuggestions(txs, existingRules);
    // Uber is already automated, should have 0 suggestions
    expect(suggestions.some(s => s.keyword === 'uber')).toBe(false);
  });

  it('detects common unautomated transactions and suggests categories and jars', () => {
    const txs = [
      {
        id: 'tx-1',
        date: '2026-10-05',
        description: 'Compras no Supermercado Assai',
        amount: -320.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-2',
        date: '2026-10-15',
        description: 'Mercado Carrefour Frutas e Legumes',
        amount: -180.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-3',
        date: '2026-10-18',
        description: 'Farmácia Drogasil Medicamentos',
        amount: -85.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      }
    ];

    const suggestions = findCategoryRuleSuggestions(txs, existingRules);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);

    const mercadoSug = suggestions.find(s => s.keyword === 'mercado');
    expect(mercadoSug).toBeDefined();
    expect(mercadoSug?.jar).toBe('NEC_55');
    expect(mercadoSug?.category).toBe('Supermercado');
    expect(mercadoSug?.frequency).toBe(2);

    const farmaciaSug = suggestions.find(s => s.keyword === 'farmácia');
    expect(farmaciaSug).toBeDefined();
    expect(farmaciaSug?.category).toBe('Saúde & Farmácia');
  });

  it('sorts suggestions by frequency so most recurring expenses appear first', () => {
    const txs = [
      {
        id: 'tx-1',
        date: '2026-10-01',
        description: 'Posto Shell Combustivel',
        amount: -150.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-2',
        date: '2026-10-08',
        description: 'Posto Ipiranga Gasolina',
        amount: -120.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-3',
        date: '2026-10-15',
        description: 'Posto Petrobras',
        amount: -110.0,
        type: 'despesa',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado'
      },
      {
        id: 'tx-4',
        date: '2026-10-20',
        description: 'Netflix Mensalidade',
        amount: -55.9,
        type: 'despesa',
        jar: 'DIV_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado'
      }
    ];

    const suggestions = findCategoryRuleSuggestions(txs, existingRules);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    // Posto has 3 txs, Netflix has 1 tx
    expect(suggestions[0].keyword).toBe('posto');
    expect(suggestions[0].frequency).toBe(3);
  });

  it('handles empty transaction list gracefully', () => {
    const suggestions = findCategoryRuleSuggestions([], existingRules);
    expect(suggestions).toEqual([]);
  });
});
