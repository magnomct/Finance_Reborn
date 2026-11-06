import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCSVCell,
  generateTransactionsCSV
} from '../src/utils/csvExport.ts';

test('escapeCSVCell handles plain strings without modification', () => {
  assert.equal(escapeCSVCell('Aluguel'), 'Aluguel');
  assert.equal(escapeCSVCell(123.45), '123.45');
  assert.equal(escapeCSVCell(''), '');
  assert.equal(escapeCSVCell(null), '');
  assert.equal(escapeCSVCell(undefined), '');
});

test('escapeCSVCell escapes delimiters and quotes properly', () => {
  assert.equal(escapeCSVCell('Supermercado; Pão de Açúcar', ';'), '"Supermercado; Pão de Açúcar"');
  assert.equal(escapeCSVCell('Compra "Online"', ';'), '"Compra ""Online"""');
  assert.equal(escapeCSVCell('Linha 1\nLinha 2', ';'), '"Linha 1\nLinha 2"');
});

test('generateTransactionsCSV outputs standard headers and formatted rows', () => {
  const sampleTransactions = [
    {
      id: 'tx-1',
      date: '2026-11-01',
      description: 'Salário CLT',
      amount: 4500,
      type: 'receita',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Salário',
      notes: 'Mensalidade regular'
    },
    {
      id: 'tx-2',
      date: '2026-11-03',
      description: 'Financiamento Ap; Parcela 12',
      amount: -858,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Nathan',
      account: 'Inter PF',
      status: 'agendado',
      category: 'Habitação',
      notes: 'Nathan reembolsa 60%'
    }
  ];

  const csv = generateTransactionsCSV(sampleTransactions);
  const lines = csv.split('\r\n');

  // Verify headers
  assert.equal(
    lines[0],
    'Data;Descrição;Tipo;Categoria;Pote (Código);Pote (Nome);Centro de Custo;Conta;Status;Valor (R$);Observações'
  );

  // Verify row 1
  assert.ok(lines[1].includes('2026-11-01'));
  assert.ok(lines[1].includes('Salário CLT'));
  assert.ok(lines[1].includes('Receita'));
  assert.ok(lines[1].includes('Necessidades Básicas'));
  assert.ok(lines[1].includes('Liquidado'));
  assert.ok(lines[1].includes('4500.00'));
  assert.ok(lines[1].includes('Mensalidade regular'));

  // Verify row 2 with escaped semicolon in description
  assert.ok(lines[2].includes('2026-11-03'));
  assert.ok(lines[2].includes('"Financiamento Ap; Parcela 12"'));
  assert.ok(lines[2].includes('Despesa'));
  assert.ok(lines[2].includes('Agendado'));
  assert.ok(lines[2].includes('-858.00'));
  assert.ok(lines[2].includes('Nathan reembolsa 60%'));
});

test('generateTransactionsCSV supports comma decimal formatting', () => {
  const sample = [
    {
      id: 'tx-1',
      date: '2026-11-01',
      description: 'Café',
      amount: -12.50,
      type: 'despesa',
      jar: 'DIV_10',
      costCenter: 'Magno',
      account: 'C6',
      status: 'liquidado'
    }
  ];

  const csv = generateTransactionsCSV(sample, { useCommaDecimal: true });
  assert.ok(csv.includes('-12,50'));
});

test('generateTransactionsCSV handles empty transactions list', () => {
  const csv = generateTransactionsCSV([]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith('Data;Descrição;Tipo'));
});

test('generateTransactionsCSV includes UTF-8 BOM when requested', () => {
  const csv = generateTransactionsCSV([], { includeBOM: true });
  assert.ok(csv.startsWith('\uFEFFData;Descrição;Tipo'));
});
