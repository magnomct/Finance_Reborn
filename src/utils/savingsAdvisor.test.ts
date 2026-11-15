import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_TRANSACTIONS } from '../data/initialData';
import { Transaction } from '../types';
import {
  buildDeterministicSavingsPlan,
  extractSixJarsSavingsSnapshot,
  sanitizeSavingsAdvisorPlan,
} from './savingsAdvisor';

describe('savingsAdvisor — Context Extraction & Deterministic Plan', () => {
  it('extracts primary offender jar, top 3 subcategories, top 5 transactions, and donor jars from INITIAL_TRANSACTIONS', () => {
    const snapshot = extractSixJarsSavingsSnapshot(INITIAL_TRANSACTIONS, {
      monthKey: '2026-10',
      usePjProfitInPf: true,
    });

    assert.equal(snapshot.monthKey, '2026-10');
    assert.equal(snapshot.rendaLiquidaMensal, 3652.31);
    assert.equal(snapshot.hasAnyOverrun, true);
    assert.equal(snapshot.primaryOffenderJar.jarId, 'NEC_55');
    assert.ok(snapshot.primaryOffenderJar.excessBRL > 1000);
    assert.ok(snapshot.topSubcategories.length >= 2 && snapshot.topSubcategories.length <= 3);
    assert.ok(snapshot.topTransactions.length >= 2 && snapshot.topTransactions.length <= 5);
    assert.equal(snapshot.topTransactions[0].amountBRL, 2000);
    assert.ok(snapshot.donorJars.some(d => d.jarId === 'LIF_10'));
  });

  it('builds a valid deterministic fallback plan in pt-BR with 3 actionable steps', () => {
    const snapshot = extractSixJarsSavingsSnapshot(INITIAL_TRANSACTIONS, {
      monthKey: '2026-10',
      usePjProfitInPf: true,
    });

    const plan = buildDeterministicSavingsPlan(snapshot);
    assert.ok(plan.headline.includes('Necessidades'));
    assert.ok(plan.estimatedMonthlySavingsBRL > 0);
    assert.equal(plan.actionableSteps.length, 3);
    assert.ok(plan.rebalanceSuggestion.includes('Liberdade Financeira'));
  });

  it('handles healthy budgets with zero overruns and redirects savings to Liberdade Financeira', () => {
    const healthyTxs: Transaction[] = [
      {
        id: 't-inc',
        date: '2026-11-05',
        description: 'Salário Mensal',
        amount: 10000,
        type: 'receita',
        jar: 'NEC_55',
        costCenter: 'Magno',
        account: 'Inter PF',
        status: 'liquidado',
      },
      {
        id: 't-deliv',
        date: '2026-11-08',
        description: 'iFood Jantar',
        amount: -420,
        type: 'despesa',
        jar: 'DIV_10',
        costCenter: 'Magno',
        account: 'C6',
        status: 'liquidado',
        parentCategory: 'Alimentação',
        subcategory: 'Delivery',
        nature: 'variable',
      },
    ];

    const snapshot = extractSixJarsSavingsSnapshot(healthyTxs, {
      monthKey: '2026-11',
      usePjProfitInPf: true,
    });

    assert.equal(snapshot.hasAnyOverrun, false);
    assert.equal(snapshot.primaryOffenderJar.jarId, 'DIV_10');
    assert.equal(snapshot.topSubcategories[0].categoryPath, 'Alimentação > Delivery');
    assert.equal(snapshot.topSubcategories[0].nature, 'Variável');

    const plan = buildDeterministicSavingsPlan(snapshot);
    assert.ok(plan.rebalanceSuggestion.includes('Liberdade Financeira'));
    assert.equal(plan.actionableSteps.length, 3);
  });

  it('sanitizes partial or malformed Gemini JSON responses safely using fallback values', () => {
    const snapshot = extractSixJarsSavingsSnapshot(INITIAL_TRANSACTIONS, {
      monthKey: '2026-10',
      usePjProfitInPf: true,
    });

    const sanitized = sanitizeSavingsAdvisorPlan(
      {
        headline: 'Corte imediato em Cartão C6',
        estimatedMonthlySavingsBRL: 450,
        actionableSteps: [{ title: 'Limitar C6', description: 'Aplicar trava semanal', potentialSavingBRL: 300 }],
      },
      snapshot
    );

    assert.equal(sanitized.headline, 'Corte imediato em Cartão C6');
    assert.equal(sanitized.estimatedMonthlySavingsBRL, 450);
    assert.equal(sanitized.actionableSteps.length, 3);
    assert.equal(sanitized.actionableSteps[0].title, 'Limitar C6');
  });
});
