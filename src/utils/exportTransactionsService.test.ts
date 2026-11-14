import test from 'node:test';
import assert from 'node:assert/strict';
import { Transaction } from '../types';
import {
  buildExportFilename,
  calculateExportNetBalance,
  exportTransactionsFile,
  generateExcelPTBRCSV,
  generateOFXStatement,
  normalizeExportScope,
} from './exportTransactionsService';
import { parseOFX } from './bankFileParsers';

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-pj-1',
    date: '2026-11-10',
    description: 'Serviço "Especial"; Consultoria PJ & Análise',
    amount: 6750.0,
    type: 'receita',
    jar: 'PJ_EXCLUIDO',
    costCenter: 'PJ',
    account: 'Inter PJ',
    status: 'liquidado',
    parentCategory: 'Receitas & Entradas',
    subcategory: 'Faturamento PJ & Contratos',
    nature: 'income',
  },
  {
    id: 'tx-pf-1',
    date: '2026-11-12',
    description: 'Refeição & Café em São Paulo',
    amount: -150.9,
    type: 'despesa',
    jar: 'DIV_10',
    costCenter: 'Magno',
    account: 'C6',
    status: 'liquidado',
    parentCategory: 'Alimentação',
    subcategory: 'Restaurantes & Bares',
    nature: 'variable',
  },
  {
    id: 'tx-pf-2',
    date: '2026-11-14',
    description: 'Aluguel Residencial',
    amount: -1200.0,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'agendado',
    category: 'Moradia > Aluguel & Financiamento',
  },
];

test('normalizeExportScope and buildExportFilename generate dynamic PT-BR filenames', () => {
  assert.equal(normalizeExportScope('PJ').slug, 'pj_mei');
  assert.equal(normalizeExportScope('PJ/MEI').label, 'PJ/MEI');
  assert.equal(normalizeExportScope('ALL').slug, 'consolidado');

  assert.equal(
    buildExportFilename({ scope: 'PJ/MEI', format: 'csv', date: '2026-11-14' }),
    'extrato_pj_mei_2026-11-14.csv'
  );
  assert.equal(
    buildExportFilename({ scope: 'PF', format: 'ofx', date: '2026-11-14' }),
    'extrato_pf_2026-11-14.ofx'
  );
  assert.equal(
    buildExportFilename({ scope: 'Consolidado', format: 'csv', date: '2026-11-14' }),
    'extrato_consolidado_2026-11-14.csv'
  );
});

test('generateExcelPTBRCSV produces UTF-8 BOM, semicolon columns, comma decimals, and escapes quotes', () => {
  const csv = generateExcelPTBRCSV(SAMPLE_TRANSACTIONS);

  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');

  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines.length, 4);
  assert.equal(
    lines[0],
    'ID;Data;Escopo (PF/PJ);Tipo (Entrada/Saída);Categoria Pai;Subcategoria;Classificação (Fixo/Variável);Descrição;Valor (R$)'
  );

  // Row 1: PJ income with quotes and semicolon properly escaped, comma decimal 6750,00
  assert.equal(
    lines[1],
    'tx-pj-1;2026-11-10;PJ/MEI;Entrada;Receitas & Entradas;Faturamento PJ & Contratos;Receita;"Serviço ""Especial""; Consultoria PJ & Análise";6750,00'
  );

  // Row 2: PF variable expense with Portuguese accents & negative comma decimal -150,90
  assert.equal(
    lines[2],
    'tx-pf-1;2026-11-12;PF;Saída;Alimentação;Restaurantes & Bares;Variável;Refeição & Café em São Paulo;-150,90'
  );

  // Row 3: Fallback category resolution to Fixo
  assert.equal(
    lines[3],
    'tx-pf-2;2026-11-14;PF;Saída;Moradia;Aluguel & Financiamento;Fixo;Aluguel Residencial;-1200,00'
  );
});

test('generateOFXStatement generates valid OFX v102/200 structure with LEDGERBAL and round-trip compatibility', () => {
  const ofx = generateOFXStatement(SAMPLE_TRANSACTIONS, {
    scope: 'PJ/MEI',
    generatedAt: '2026-11-14',
  });

  assert.ok(ofx.includes('OFXHEADER:100'));
  assert.ok(ofx.includes('<OFX>'));
  assert.ok(ofx.includes('<BANKMSGSRSV1>'));
  assert.ok(ofx.includes('<STMTRS>'));
  assert.ok(ofx.includes('<CURDEF>BRL</CURDEF>'));
  assert.ok(ofx.includes('<ACCTID>YUPEE-PJ-MEI</ACCTID>'));
  assert.ok(ofx.includes('<BANKTRANLIST>'));
  assert.ok(ofx.includes('<TRNTYPE>CREDIT</TRNTYPE>'));
  assert.ok(ofx.includes('<TRNTYPE>DEBIT</TRNTYPE>'));
  assert.ok(ofx.includes('<DTPOSTED>20261110120000[-3:BRT]</DTPOSTED>'));
  assert.ok(ofx.includes('<TRNAMT>6750.00</TRNAMT>'));
  assert.ok(ofx.includes('<TRNAMT>-150.90</TRNAMT>'));
  assert.ok(ofx.includes('<FITID>tx-pj-1</FITID>'));
  assert.ok(
    ofx.includes(
      '<MEMO>[PJ/MEI] Receitas &amp; Entradas &gt; Faturamento PJ &amp; Contratos - Serviço &quot;Especial&quot;; Consultoria PJ &amp; Análise</MEMO>'
    )
  );
  assert.ok(ofx.includes('<BALAMT>5399.10</BALAMT>'));

  const expectedNet = calculateExportNetBalance(SAMPLE_TRANSACTIONS);
  assert.equal(expectedNet, 5399.1);

  // Round-trip validation via existing OFX parser
  const parsedBack = parseOFX(ofx);
  assert.equal(parsedBack.length, 3);
  assert.equal(parsedBack[0].amount, 6750);
  assert.equal(parsedBack[0].date, '2026-11-10');
  assert.equal(parsedBack[0].fitId, 'tx-pj-1');
  assert.equal(parsedBack[1].amount, -150.9);
  assert.ok(parsedBack[1].description.includes('[PF] Alimentação > Restaurantes & Bares - Refeição & Café em São Paulo'));
});

test('exportTransactionsFile respects skipBrowserDownload and empty arrays', () => {
  const res = exportTransactionsFile(SAMPLE_TRANSACTIONS.slice(0, 1), 'ofx', {
    scope: 'PJ/MEI',
    date: '2026-11-14',
    skipBrowserDownload: true,
  });

  assert.equal(res.success, true);
  assert.equal(res.filename, 'extrato_pj_mei_2026-11-14.ofx');
  assert.equal(res.count, 1);
  assert.equal(res.netBalance, 6750);

  const emptyRes = exportTransactionsFile([], 'csv', {
    scope: 'PF',
    date: '2026-11-14',
    skipBrowserDownload: true,
  });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.count, 0);
});
