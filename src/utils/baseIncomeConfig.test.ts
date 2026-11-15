import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TRANSACTIONS } from '../data/initialData';
import { Transaction } from '../types';
import {
  BASE_INCOME_STORAGE_KEY,
  buildSixJarsAllocationPreview,
  calculateRealizedConsolidatedIncome,
  calculateSixJarsCascadeLimits,
  createDefaultBaseIncomeConfig,
  loadBaseIncomeConfig,
  parseBRLInput,
  resolveEffectiveBaseIncome,
  saveBaseIncomeConfig,
} from './baseIncomeConfig';

describe('baseIncomeConfig — Persistence, Realized Income & 6 Jars Cascade', () => {
  it('calculates realized PF + MEI consolidated income accurately from INITIAL_TRANSACTIONS', () => {
    const realizedWithPj = calculateRealizedConsolidatedIncome(INITIAL_TRANSACTIONS, true, '2026-10');
    assert.equal(realizedWithPj.monthKey, '2026-10');
    assert.equal(realizedWithPj.pfIncomeBRL, 2060);
    assert.equal(realizedWithPj.meiNetTransferBRL, 1592.31);
    assert.equal(realizedWithPj.consolidatedIncomeBRL, 3652.31);

    const realizedPfOnly = calculateRealizedConsolidatedIncome(INITIAL_TRANSACTIONS, false, '2026-10');
    assert.equal(realizedPfOnly.consolidatedIncomeBRL, 2060);
  });

  it('resolves manual direct income and PF + MEI split income modes cleanly', () => {
    const directConfig = {
      ...createDefaultBaseIncomeConfig(),
      mode: 'manual' as const,
      useSplitInputs: false,
      manualTotalBRL: 6500,
    };
    assert.equal(resolveEffectiveBaseIncome(directConfig, 3652.31), 6500);

    const splitConfig = {
      ...createDefaultBaseIncomeConfig(),
      mode: 'manual' as const,
      useSplitInputs: true,
      pfFixedIncomeBRL: 4200,
      meiNetTransferBRL: 2800.5,
    };
    assert.equal(resolveEffectiveBaseIncome(splitConfig, 3652.31), 7000.5);

    const autoConfig = {
      ...createDefaultBaseIncomeConfig(),
      mode: 'auto_consolidated' as const,
      manualTotalBRL: 9999,
    };
    assert.equal(resolveEffectiveBaseIncome(autoConfig, 3652.31), 3652.31);
  });

  it('performs instant 6 Jars cascade calculation with default 55/10/10/10/10/5 and custom % rules', () => {
    const limits = calculateSixJarsCascadeLimits(10000);
    assert.equal(limits.NEC_55, 5500);
    assert.equal(limits.LIF_10, 1000);
    assert.equal(limits.PLP_10, 1000);
    assert.equal(limits.EDU_10, 1000);
    assert.equal(limits.DIV_10, 1000);
    assert.equal(limits.FER_5, 500);

    const customLimits = calculateSixJarsCascadeLimits(8000, {
      NEC_55: 50,
      LIF_10: 15,
      PLP_10: 10,
      EDU_10: 10,
      DIV_10: 10,
      FER_5: 5,
    });
    assert.equal(customLimits.NEC_55, 4000);
    assert.equal(customLimits.LIF_10, 1200);
    assert.equal(customLimits.FER_5, 400);

    const preview = buildSixJarsAllocationPreview(5000);
    assert.equal(preview.length, 6);
    assert.equal(preview[0].id, 'NEC_55');
    assert.equal(preview[0].amountBRL, 2750);
    assert.equal(preview[5].id, 'FER_5');
    assert.equal(preview[5].amountBRL, 250);
  });

  it('parses pt-BR and numeric BRL strings safely without NaN or negative values', () => {
    assert.equal(parseBRLInput('6500'), 6500);
    assert.equal(parseBRLInput('6.500,75'), 6500.75);
    assert.equal(parseBRLInput('R$ 3.652,31'), 3652.31);
    assert.equal(parseBRLInput('4200.50'), 4200.5);
    assert.equal(parseBRLInput(''), 0);
    assert.equal(parseBRLInput('abc'), 0);
  });

  it('persists and restores configuration in localStorage safely', () => {
    const storageMap = new Map<string, string>();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storageMap.set(k, v);
        },
        removeItem: (k: string) => {
          storageMap.delete(k);
        },
      },
    };

    try {
      const saved = saveBaseIncomeConfig({
        mode: 'manual',
        manualTotalBRL: 8250,
        pfFixedIncomeBRL: 5000,
        meiNetTransferBRL: 3250,
        useSplitInputs: true,
        updatedAt: '2026-11-15T12:00:00.000Z',
      });

      assert.equal(saved.mode, 'manual');
      assert.ok(storageMap.has(BASE_INCOME_STORAGE_KEY));

      const loaded = loadBaseIncomeConfig();
      assert.equal(loaded.mode, 'manual');
      assert.equal(loaded.pfFixedIncomeBRL, 5000);
      assert.equal(loaded.meiNetTransferBRL, 3250);
      assert.equal(loaded.useSplitInputs, true);
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = prevWindow;
      }
    }
  });

  it('handles empty transactions month gracefully without negative income', () => {
    const txsWithLoss: Transaction[] = [
      {
        id: 'pj-loss',
        date: '2026-11-10',
        description: 'Despesa PJ sem faturamento',
        amount: -500,
        type: 'despesa',
        jar: 'PJ_EXCLUIDO',
        costCenter: 'PJ',
        account: 'Inter PJ',
        status: 'liquidado',
      },
    ];
    const realized = calculateRealizedConsolidatedIncome(txsWithLoss, true, '2026-11');
    assert.equal(realized.pfIncomeBRL, 0);
    assert.equal(realized.meiNetTransferBRL, 0);
    assert.equal(realized.consolidatedIncomeBRL, 0);
  });
});
