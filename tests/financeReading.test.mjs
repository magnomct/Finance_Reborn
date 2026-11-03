import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinancialProfileSummary,
  generateSearchQueriesForProfile,
  getCuratedFallbackArticles,
  filterArticlesByTopic,
  searchArticlesByKeyword,
  parseGeminiReadingResponse
} from '../src/utils/financeReading.ts';

const mockTransactions = [
  {
    id: 'tx-1',
    description: 'Salário CLT Líquido',
    date: '2026-10-05',
    amount: 4440.00,
    type: 'receita',
    costCenter: 'Magno',
    account: 'Inter PF',
    jar: 'NEC_55',
    status: 'liquidado'
  },
  {
    id: 'tx-2',
    description: 'Cartão C6 - Supermercado',
    date: '2026-10-10',
    amount: -1200.00,
    type: 'despesa',
    costCenter: 'Magno',
    account: 'C6',
    jar: 'NEC_55',
    status: 'liquidado'
  },
  {
    id: 'tx-3',
    description: 'Cartão C6 - Restaurante e Cinema',
    date: '2026-10-12',
    amount: -900.00,
    type: 'despesa',
    costCenter: 'Magno',
    account: 'C6',
    jar: 'DIV_10',
    status: 'liquidado'
  },
  {
    id: 'tx-4',
    description: 'Financiamento Apto - Parcela Habitacional',
    date: '2026-10-25',
    amount: -1290.00,
    type: 'despesa',
    costCenter: 'Magno',
    account: 'Inter PF',
    jar: 'NEC_55',
    status: 'agendado'
  },
  {
    id: 'tx-5',
    description: 'Nathan Reembolso Habitação',
    date: '2026-10-20',
    amount: 858.00,
    type: 'reembolso',
    costCenter: 'Nathan',
    account: 'Inter PF',
    jar: 'NEC_55',
    status: 'liquidado'
  },
  {
    id: 'tx-6',
    description: 'Juros Cheque Especial Inter',
    date: '2026-10-26',
    amount: -140.00,
    type: 'despesa',
    costCenter: 'Magno',
    account: 'Inter PF',
    jar: 'NEC_55',
    status: 'liquidado'
  },
  {
    id: 'tx-7',
    description: 'Faturamento Nota Fiscal PJ',
    date: '2026-10-15',
    amount: 8000.00,
    type: 'receita',
    costCenter: 'PJ',
    account: 'Inter PJ',
    jar: 'LIF_10',
    status: 'liquidado'
  }
];

const mockJarLimits = {
  NEC_55: 2000,
  DIV_10: 350,
  EDU_10: 500,
  PLP_10: 500,
  SON_10: 500,
  DOE_5: 200,
  LIF_10: 500,
  FER_5: 200,
  PJ_EXCLUIDO: 0
};

test('buildFinancialProfileSummary extracts key metrics and detects priorities', () => {
  const summary = buildFinancialProfileSummary(mockTransactions, mockJarLimits, true);

  assert.equal(summary.cltIncome, 4440);
  assert.equal(summary.c6Total, 2100);
  assert.equal(summary.overdraftInterest, 140);
  assert.equal(summary.housingGross, 1430);
  assert.equal(summary.housingNet, 572); // 1430 - 858
  assert.ok(summary.summaryTags.length >= 3);
  assert.ok(summary.summaryTags.some(t => t.includes('Cheque Especial')));
  assert.ok(summary.summaryTags.some(t => t.includes('Fatura C6')));
  assert.ok(summary.summaryTags.some(t => t.includes('Financiamento')));
  assert.equal(summary.primaryFocus, 'Eliminação de Juros e Proteção de Fluxo de Caixa');
});

test('generateSearchQueriesForProfile creates targeted search queries', () => {
  const summary = buildFinancialProfileSummary(mockTransactions, mockJarLimits, true);
  const queries = generateSearchQueriesForProfile(summary);

  assert.ok(queries.length >= 2);
  assert.ok(queries.some(q => q.includes('cheque especial')));
  assert.ok(queries.some(q => q.includes('cartao de credito')));
});

test('getCuratedFallbackArticles returns rich, valid educational articles', () => {
  const summary = buildFinancialProfileSummary(mockTransactions, mockJarLimits, true);
  const articles = getCuratedFallbackArticles(summary);

  assert.ok(articles.length >= 4);
  for (const art of articles) {
    assert.ok(art.id, 'Article must have id');
    assert.ok(art.title, 'Article must have title');
    assert.ok(art.summary, 'Article must have summary');
    assert.ok(art.sourceName, 'Article must have sourceName');
    assert.ok(art.url.startsWith('http'), 'Article must have valid web url');
    assert.ok(Array.isArray(art.keyTakeaways) && art.keyTakeaways.length > 0);
    assert.ok(art.readingTimeMinutes > 0);
  }
});

test('filterArticlesByTopic and searchArticlesByKeyword filter properly', () => {
  const summary = buildFinancialProfileSummary(mockTransactions, mockJarLimits, true);
  const articles = getCuratedFallbackArticles(summary);

  const cartaoArticles = filterArticlesByTopic(articles, 'cartao');
  assert.ok(cartaoArticles.every(a => a.topic === 'cartao'));

  const allArticles = filterArticlesByTopic(articles, 'todos');
  assert.equal(allArticles.length, articles.length);

  const searched = searchArticlesByKeyword(articles, 'amortização');
  assert.ok(searched.length >= 1);
  assert.ok(searched[0].title.toLowerCase().includes('amortização'));
});

test('parseGeminiReadingResponse safely parses valid JSON or falls back to curated items', () => {
  const summary = buildFinancialProfileSummary(mockTransactions, mockJarLimits, true);

  const sampleJson = JSON.stringify([
    {
      id: 'gemini-1',
      title: 'Guia do Cartão Sem Dívidas',
      summary: 'Como planejar as despesas do mês e não cair no rotativo.',
      keyTakeaways: ['Pague sempre o total da fatura', 'Monitore o limite semanal'],
      sourceName: 'InfoMoney',
      url: 'https://www.infomoney.com.br/guias/cartao',
      readingTimeMinutes: 4,
      topic: 'cartao',
      relevanceReason: 'Fatura C6 expressiva no mês'
    }
  ]);

  const groundingChunks = [
    { web: { uri: 'https://www.infomoney.com.br/guias/cartao', title: 'InfoMoney Guias' } }
  ];

  const parsed = parseGeminiReadingResponse(sampleJson, groundingChunks, summary);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Guia do Cartão Sem Dívidas');
  assert.equal(parsed[0].sourceName, 'InfoMoney');

  // Test malformed JSON fallback
  const fallbackResult = parseGeminiReadingResponse('invalid json text', [], summary);
  assert.ok(fallbackResult.length >= 3);
  assert.ok(fallbackResult[0].id.startsWith('art-'));
});
