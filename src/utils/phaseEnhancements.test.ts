import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMA_VERSION_KEY,
  CURRENT_SCHEMA_VERSION,
  safeGetStorage,
  safeSetStorage,
  ensureStorageSchemaVersion,
  isValidTransactionArray,
} from './storage';
import {
  calculatePJFiscalMetrics,
  suggestCategoryFromHistory,
  calculateCategoryExpenseVariability,
  normalizePtBrText,
} from './finance';
import {
  buildNetWorthProjectionPoints,
  projectScopedNetWorthSeries,
} from '../components/MonthlyNetWorthD3Chart';
import { formatMonthKeyLabels } from './monthlyNetWorth';
import { Transaction } from '../types';

function createMemoryStorage(options?: { throwOnSet?: boolean }): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (options?.throwOnSet) {
        throw new Error('QuotaExceededError');
      }
      store.set(key, String(value));
    },
  };
}

function withMockLocalStorage(mockStorage: Storage, fn: () => void) {
  const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  try {
    fn();
  } finally {
    if (prevDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', prevDescriptor);
    } else {
      delete (globalThis as Record<string, unknown>).localStorage;
    }
  }
}

// ============================================================================
// 1. SCHEMA-SAFE STORAGE TESTS
// ============================================================================

test('safeGetStorage returns fallback on corrupted JSON and non-finite numeric payloads', () => {
  const mockStorage = createMemoryStorage();
  mockStorage.setItem('bad_json', '{invalid-json');
  mockStorage.setItem('bad_validator', JSON.stringify([{ id: '1' }]));

  withMockLocalStorage(mockStorage, () => {
    const fallback = [{ id: 'ok' }];
    assert.deepEqual(safeGetStorage('bad_json', fallback), fallback);
    assert.deepEqual(
      safeGetStorage('bad_validator', [], isValidTransactionArray),
      []
    );
  });
});

test('safeSetStorage sanitizes NaN/Infinity and absorbs QuotaExceededError', () => {
  const okStorage = createMemoryStorage();
  withMockLocalStorage(okStorage, () => {
    safeSetStorage('metrics', { amount: Number.NaN, valid: 120.5 });
    const loaded = safeGetStorage<{ amount: number; valid: number }>('metrics', {
      amount: -1,
      valid: 0,
    });
    assert.equal(loaded.amount, 0);
    assert.equal(loaded.valid, 120.5);

    // Reject root NaN write cleanly
    safeSetStorage('bad_num', Number.NaN);
    assert.equal(okStorage.getItem('bad_num'), null);
  });

  const fullStorage = createMemoryStorage({ throwOnSet: true });
  withMockLocalStorage(fullStorage, () => {
    assert.doesNotThrow(() => {
      safeSetStorage('any_key', { ok: true });
    });
  });
});

test('ensureStorageSchemaVersion stamps v1.0 and prunes malformed legacy entries', () => {
  const mockStorage = createMemoryStorage();
  mockStorage.setItem(
    'yupee_transactions_v2',
    JSON.stringify([
      {
        id: 'tx-valid',
        date: '2026-10-10',
        description: 'Salário',
        amount: 3500,
        type: 'receita',
      },
      {
        id: '',
        amount: 'not-a-number',
      },
      null,
    ])
  );
  mockStorage.setItem(
    'yupee_jar_limits_v1',
    JSON.stringify({ NEC_55: 2000, DIV_10: -50, CORRUPTED: 'abc' })
  );

  withMockLocalStorage(mockStorage, () => {
    const version = ensureStorageSchemaVersion();
    assert.equal(version, CURRENT_SCHEMA_VERSION);
    assert.equal(mockStorage.getItem(SCHEMA_VERSION_KEY), CURRENT_SCHEMA_VERSION);

    const txs = safeGetStorage<Transaction[]>('yupee_transactions_v2', [], isValidTransactionArray);
    assert.equal(txs.length, 1);
    assert.equal(txs[0].id, 'tx-valid');

    const limits = safeGetStorage<Record<string, number>>('yupee_jar_limits_v1', {});
    assert.equal(limits.NEC_55, 2000);
    assert.equal(limits.DIV_10, undefined);
    assert.equal(limits.CORRUPTED, undefined);
  });
});

// ============================================================================
// 2. PJ / MEI STRATEGIC FISCAL METRICS TESTS
// ============================================================================

test('calculatePJFiscalMetrics computes Fator R >= 28% (Anexo III) vs < 28% (Anexo V)', () => {
  const optimized = calculatePJFiscalMetrics({
    grossRevenue12m: 60000,
    monthlyGrossRevenue: 5000,
    monthlyExpenses: 1000,
    payroll12m: 18000, // 30%
    dasReserveBalance: 200,
    monthlyDASProvision: 75.9,
    targetProLabore: 1500,
  });

  assert.equal(optimized.fatorRPercent, 30);
  assert.equal(optimized.isAnexoIIIOptimized, true);
  assert.equal(optimized.fatorRStatus, 'ANEXO_III_OTIMIZADO');
  assert.equal(optimized.payrollGap12m, 0);

  const attention = calculatePJFiscalMetrics({
    grossRevenue12m: 60000,
    monthlyGrossRevenue: 5000,
    monthlyExpenses: 1000,
    payroll12m: 12000, // 20%
    dasReserveBalance: 50,
    monthlyDASProvision: 75.9,
  });

  assert.equal(attention.fatorRPercent, 20);
  assert.equal(attention.isAnexoIIIOptimized, false);
  assert.equal(attention.fatorRStatus, 'ATENCAO_ANEXO_V');
  assert.equal(attention.payrollNeededFor28Pct12m, 16800);
  assert.equal(attention.payrollGap12m, 4800);
});

test('calculatePJFiscalMetrics checks MEI R$ 81k ceiling alerts, 11% INSS split, and DAS reserve health', () => {
  const safe = calculatePJFiscalMetrics({
    grossRevenue12m: 48000,
    monthlyGrossRevenue: 4000,
    monthlyExpenses: 500,
    payroll12m: 13440,
    dasReserveBalance: 151.8,
    monthlyDASProvision: 75.9,
    targetProLabore: 1000,
  });
  assert.equal(safe.meiCapAlertLevel, 'SAFE');
  assert.equal(safe.meiRemainingCapBRL, 33000);
  assert.equal(safe.netMonthlyProfitBRL, 3424.1);
  assert.equal(safe.proLaboreGrossBRL, 1000);
  assert.equal(safe.proLaboreINSSBRL, 110);
  assert.equal(safe.proLaboreNetBRL, 890);
  assert.equal(safe.exemptProfitDistributionBRL, 2424.1);
  assert.equal(safe.isDasReserveHealthy, true);
  assert.equal(safe.dasMonthsCovered, 2);

  const warning80 = calculatePJFiscalMetrics({
    grossRevenue12m: 70000,
    monthlyGrossRevenue: 5833.33,
    monthlyExpenses: 0,
    payroll12m: 0,
    dasReserveBalance: 40,
    monthlyDASProvision: 75.9,
  });
  assert.equal(warning80.meiCapAlertLevel, 'WARNING_80');
  assert.equal(warning80.isDasReserveHealthy, false);
  assert.equal(warning80.dasReserveDeficitBRL, 35.9);

  const exceeded100 = calculatePJFiscalMetrics({
    grossRevenue12m: 90000,
    monthlyGrossRevenue: 7500,
    monthlyExpenses: 0,
    payroll12m: 0,
    dasReserveBalance: 100,
  });
  assert.equal(exceeded100.meiCapAlertLevel, 'EXCEEDED_100');
  assert.equal(exceeded100.meiRemainingCapBRL, 0);
});

// ============================================================================
// 3. HISTORY-BASED SMART CATEGORY SUGGESTION TESTS
// ============================================================================

test('suggestCategoryFromHistory normalizes pt-BR accents/stopwords, isolates scope/type, and respects availableCategories', () => {
  const history: Transaction[] = [
    {
      id: 'h1',
      date: '2026-09-05',
      description: 'Compra no Mercadão de Bairro',
      amount: -240,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Alimentação > Mercado',
    },
    {
      id: 'h2',
      date: '2026-10-08',
      description: 'Mercado Bairro Mensal',
      amount: -310,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Alimentação > Mercado',
    },
    {
      id: 'h3',
      date: '2026-10-12',
      description: 'Fornecedor Mercado Atacado',
      amount: -900,
      type: 'despesa',
      jar: 'PJ_EXCLUIDO',
      costCenter: 'PJ',
      account: 'Inter PJ',
      status: 'liquidado',
      category: 'Insumos PJ',
    },
    {
      id: 'h4',
      date: '2026-10-15',
      description: 'Boleto Antigo Inexistente',
      amount: -120,
      type: 'despesa',
      jar: 'NEC_55',
      costCenter: 'Magno',
      account: 'Inter PF',
      status: 'liquidado',
      category: 'Categoria Removida',
    },
  ];

  const available = ['Geral', 'Alimentação > Mercado', 'Transporte > Uber', 'Insumos PJ'];

  assert.equal(normalizePtBrText('Mercadão de Bairro!'), 'mercadao de bairro');

  // Guard: < 3 chars returns null
  assert.equal(
    suggestCategoryFromHistory({
      description: 'Me',
      type: 'despesa',
      scope: 'PF',
      transactions: history,
      availableCategories: available,
    }),
    null
  );

  // Matches PF accent-normalized & stopword-filtered history
  const pfMatch = suggestCategoryFromHistory({
    description: 'Compras no Mercado do Bairro',
    type: 'despesa',
    scope: 'PF',
    transactions: history,
    availableCategories: available,
  });
  assert.ok(pfMatch !== null);
  assert.equal(pfMatch.category, 'Alimentação > Mercado');
  assert.equal(pfMatch.confidence, 'high');
  assert.equal(pfMatch.matchCount, 2);

  // Scope isolation: PJ scope matches 'Insumos PJ'
  const pjMatch = suggestCategoryFromHistory({
    description: 'Mercado Atacado',
    type: 'despesa',
    scope: 'PJ',
    transactions: history,
    availableCategories: available,
  });
  assert.ok(pjMatch !== null);
  assert.equal(pjMatch.category, 'Insumos PJ');

  // Type isolation: receita won't match despesa history
  assert.equal(
    suggestCategoryFromHistory({
      description: 'Mercado Bairro',
      type: 'receita',
      scope: 'PF',
      transactions: history,
      availableCategories: available,
    }),
    null
  );

  // Strictly ignores historical categories absent from availableCategories
  assert.equal(
    suggestCategoryFromHistory({
      description: 'Boleto Antigo',
      type: 'despesa',
      scope: 'PF',
      transactions: history,
      availableCategories: available,
    }),
    null
  );
});

// ============================================================================
// 4. EXPENSE VARIABILITY (SIGMA) & RUN-RATE TESTS
// ============================================================================

test('calculateCategoryExpenseVariability distinguishes Previsíveis (CV < 0.25) vs Voláteis (CV >= 0.25) and projects Run-Rate', () => {
  const txs: Transaction[] = [
    // Aluguel: 1000, 1000, 1000 -> mu = 1000, sigma = 0, CV = 0 (PREVISIVEL)
    {
      id: 'a1', date: '2026-08-05', description: 'Aluguel', amount: -1000,
      type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Moradia',
    },
    {
      id: 'a2', date: '2026-09-05', description: 'Aluguel', amount: -1000,
      type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Moradia',
    },
    {
      id: 'a3', date: '2026-10-05', description: 'Aluguel', amount: -1000,
      type: 'despesa', jar: 'NEC_55', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Moradia',
    },
    // Lazer: 100, 600, 200 -> mu = 300, sample stdDev ~ 264.58, CV ~ 0.88 (VOLATIL)
    {
      id: 'l1', date: '2026-08-10', description: 'Cinema', amount: -100,
      type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Lazer',
    },
    {
      id: 'l2', date: '2026-09-12', description: 'Viagem curta', amount: -600,
      type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Lazer',
    },
    {
      id: 'l3', date: '2026-10-10', description: 'Restaurante', amount: -200,
      type: 'despesa', jar: 'DIV_10', costCenter: 'Magno', account: 'Inter PF',
      status: 'liquidado', category: 'Lazer',
    },
    // PJ expense should be excluded from PF variability
    {
      id: 'pj1', date: '2026-10-15', description: 'Servidor PJ', amount: -5000,
      type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ',
      status: 'liquidado', category: 'Infra PJ',
    },
  ];

  // Reference date 2026-10-15 => 15 elapsed days of 31 days in October
  const report = calculateCategoryExpenseVariability(txs, '2026-10-15');
  assert.equal(report.currentMonthKey, '2026-10');
  assert.equal(report.currentDay, 15);
  assert.equal(report.daysInMonth, 31);
  assert.equal(report.monthsAnalyzedCount, 3);
  assert.equal(report.predictableCount, 1);
  assert.equal(report.volatileCount, 1);

  const moradia = report.categories.find(c => c.category === 'Moradia')!;
  const lazer = report.categories.find(c => c.category === 'Lazer')!;
  assert.equal(moradia.classification, 'PREVISIVEL');
  assert.equal(moradia.meanBRL, 1000);
  assert.equal(moradia.stdDevBRL, 0);
  assert.equal(moradia.cv, 0);
  assert.equal(moradia.projectedRunRateBRL, Math.round((1000 / 15) * 31 * 100) / 100);

  assert.equal(lazer.classification, 'VOLATIL');
  assert.equal(lazer.meanBRL, 300);
  assert.ok(lazer.stdDevBRL > 264 && lazer.stdDevBRL < 265);
  assert.ok(lazer.cv > 0.85);
  assert.equal(lazer.projectedRunRateBRL, Math.round((200 / 15) * 31 * 100) / 100);
});

// ============================================================================
// 5. D3 +3M FUTURE PROJECTION TESTS
// ============================================================================

test('buildNetWorthProjectionPoints generates 3 future months linearly and handles empty series', () => {
  assert.deepEqual(buildNetWorthProjectionPoints([], 500, 3), []);

  const outLabels = formatMonthKeyLabels('2026-10');
  const scoped = projectScopedNetWorthSeries(
    [
      {
        index: 0,
        month: '2026-10',
        monthKey: '2026-10',
        monthLabel: outLabels.monthLabel,
        fullMonthLabel: outLabels.fullMonthLabel,
        date: outLabels.date,
        pfBalance: 6000,
        meiBalance: 2000,
        goalsBalance: 2000,
        totalNetWorth: 10000,
        pfCumulativeBalance: 6000,
        meiCumulativeReserve: 2000,
        goalsCumulativeBalance: 2000,
        totalNetWorthBRL: 10000,
        monthlyDeltaBRL: 1000,
        monthlyDeltaPct: 11.11,
        isSimulated: false,
      },
    ],
    'CONSOLIDATED'
  );

  const proj = buildNetWorthProjectionPoints(scoped, 1500, 3);
  assert.equal(proj.length, 3);
  assert.equal(proj[0].month, '2026-11');
  assert.equal(proj[1].month, '2026-12');
  assert.equal(proj[2].month, '2027-01');
  assert.equal(proj[0].totalNetWorthBRL, 11500);
  assert.equal(proj[1].totalNetWorthBRL, 13000);
  assert.equal(proj[2].totalNetWorthBRL, 14500);
  assert.equal(proj[0].isProjected, true);
  assert.equal(proj[2].projectionStep, 3);
});
