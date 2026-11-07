import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTransactionsCSV } from '../src/utils/csvExport.ts';

const mockTransactions = [
  {
    id: 'tx-1',
    date: '2026-10-01',
    description: 'Salário CLT',
    amount: 5000,
    type: 'receita',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Salário',
    notes: 'Trabalho fixo'
  },
  {
    id: 'tx-2',
    date: '2026-10-05',
    description: 'Supermercado Mensal',
    amount: -650,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'PF',
    account: 'Inter PF',
    status: 'liquidado',
    category: 'Alimentação',
    notes: 'Compras do mês'
  },
  {
    id: 'tx-3',
    date: '2026-10-10',
    description: 'Faturamento Consultoria Web',
    amount: 8000,
    type: 'receita',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'liquidado',
    category: 'Serviços Prestados',
    notes: 'NF 104'
  },
  {
    id: 'tx-4',
    date: '2026-10-12',
    description: 'Servidor AWS Cloud',
    amount: -450,
    type: 'despesa',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'liquidado',
    category: 'Infraestrutura',
    notes: 'Fatura corporativa'
  }
];

function filterTransactions(transactions, { search = '', scopeFilter = 'ALL', jarFilter = 'ALL' } = {}) {
  return transactions.filter(t => {
    // Scope filter (PF vs PJ vs Consolidado)
    if (scopeFilter === 'PF') {
      const isPJ = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
      if (isPJ) return false;
    } else if (scopeFilter === 'PJ') {
      const isPJ = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
      if (!isPJ) return false;
    }

    if (jarFilter !== 'ALL' && t.jar !== jarFilter) return false;

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchAcc = t.account.toLowerCase().includes(q);
      const matchCost = t.costCenter.toLowerCase().includes(q);
      const matchCat = t.category ? t.category.toLowerCase().includes(q) : false;
      const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
      if (!matchDesc && !matchAcc && !matchCost && !matchCat && !matchNotes) return false;
    }

    return true;
  });
}

test('filterTransactions applies scopeFilter correctly', () => {
  const pfOnly = filterTransactions(mockTransactions, { scopeFilter: 'PF' });
  assert.equal(pfOnly.length, 2);
  assert.ok(pfOnly.every(t => t.costCenter !== 'PJ' && t.account !== 'Inter PJ'));

  const pjOnly = filterTransactions(mockTransactions, { scopeFilter: 'PJ' });
  assert.equal(pjOnly.length, 2);
  assert.ok(pjOnly.every(t => t.costCenter === 'PJ' || t.account === 'Inter PJ'));

  const all = filterTransactions(mockTransactions, { scopeFilter: 'ALL' });
  assert.equal(all.length, 4);
});

test('filterTransactions applies search filter combined with scopeFilter', () => {
  const filtered = filterTransactions(mockTransactions, { 
    scopeFilter: 'PJ', 
    search: 'AWS' 
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].description, 'Servidor AWS Cloud');
});

test('generateTransactionsCSV outputs filtered transactions correctly for external spreadsheet', () => {
  const filtered = filterTransactions(mockTransactions, { scopeFilter: 'PF' });
  const csv = generateTransactionsCSV(filtered, { includeBOM: true });
  
  assert.ok(csv.startsWith('\uFEFFData;Descrição;Tipo'));
  assert.ok(csv.includes('Salário CLT'));
  assert.ok(csv.includes('Supermercado Mensal'));
  assert.ok(!csv.includes('Faturamento Consultoria Web'));
  assert.ok(!csv.includes('Servidor AWS Cloud'));
});
