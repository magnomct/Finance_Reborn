import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateJarReallocationInsights,
  filterLast30DaysTransactions
} from '../src/utils/quickReallocationInsights.ts';

test('filterLast30DaysTransactions: filters transactions strictly within a 30-day window', () => {
  const transactions = [
    { id: '1', date: '2026-10-25', description: 'Habitação', amount: -1290, type: 'despesa', jar: 'NEC_55' },
    { id: '2', date: '2026-10-10', description: 'Salário', amount: 2060, type: 'receita', jar: 'NEC_55' },
    { id: '3', date: '2026-08-01', description: 'Gasto Antigo', amount: -500, type: 'despesa', jar: 'DIV_10' }, // 85+ days ago
  ];

  const filtered = filterLast30DaysTransactions(transactions, '2026-10-25');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.some(t => t.id === '1'));
  assert.ok(filtered.some(t => t.id === '2'));
  assert.ok(!filtered.some(t => t.id === '3'));
});

test('generateJarReallocationInsights: detects underutilized and overspent jars', () => {
  const transactions = [
    // NEC_55 is heavily spent
    { id: '1', date: '2026-10-22', description: 'Fatura C6 Contas', amount: -2000, type: 'despesa', jar: 'NEC_55' },
    { id: '2', date: '2026-10-25', description: 'Habitação', amount: -1290, type: 'despesa', jar: 'NEC_55' },
    // DIV_10 is spent
    { id: '3', date: '2026-10-22', description: 'Fatura C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10' },
    // EDU_10 has 0 spent
    // FER_5 has 0 spent
    // PLP_10 has 0 spent
    // LIF_10 has 0 spent
    { id: '4', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', costCenter: 'Magno' },
  ];

  const limits = {
    NEC_55: 2000,
    DIV_10: 350,
    PLP_10: 360,
    LIF_10: 360,
    EDU_10: 360,
    FER_5: 180,
    PJ_EXCLUIDO: 0,
  };

  const summary = generateJarReallocationInsights({
    transactions,
    jarLimits: limits,
    usePjProfitInPf: false,
    referenceDateStr: '2026-10-25'
  });

  // Verify underutilized jars include EDU_10 and FER_5
  const underutilizedIds = summary.underutilizedJars.map(j => j.jarId);
  assert.ok(underutilizedIds.includes('EDU_10'), 'EDU_10 must be underutilized');
  assert.ok(underutilizedIds.includes('FER_5'), 'FER_5 must be underutilized');

  // Verify surplus is available
  assert.ok(summary.totalSurplusAvailable > 0);

  // Verify overspent jars include NEC_55
  const overspentIds = summary.overspentJars.map(j => j.jarId);
  assert.ok(overspentIds.includes('NEC_55'), 'NEC_55 must be overspent');
});

test('generateJarReallocationInsights: creates actionable proposals with balanced proposed limits', () => {
  const transactions = [
    { id: '1', date: '2026-10-22', description: 'Fatura C6 Contas', amount: -2000, type: 'despesa', jar: 'NEC_55' },
    { id: '2', date: '2026-10-22', description: 'Fatura C6 Lazer', amount: -600, type: 'despesa', jar: 'DIV_10' },
    { id: '3', date: '2026-10-10', description: 'Salário CLT', amount: 2060, type: 'receita', jar: 'NEC_55', costCenter: 'Magno' },
  ];

  const summary = generateJarReallocationInsights({
    transactions,
    referenceDateStr: '2026-10-25'
  });

  assert.ok(summary.proposals.length >= 3);
  assert.ok(summary.bestProposal);

  // Proposal 1: Reserva de Emergência
  const prop1 = summary.proposals.find(p => p.id === 'prop-reserva-emergencia');
  assert.ok(prop1);
  assert.ok(prop1.totalTransferred > 0);
  assert.ok(prop1.transfers.length > 0);
  assert.ok(prop1.proposedLimits.PLP_10 > DEFAULT_LIMIT_PLP);

  // Verify sum of proposed limits matches budget without arbitrary inflation
  const initialSum = 2000 + 350 + 360 + 360 + 360 + 180;
  const prop1Sum = 
    prop1.proposedLimits.NEC_55 +
    prop1.proposedLimits.DIV_10 +
    prop1.proposedLimits.PLP_10 +
    prop1.proposedLimits.LIF_10 +
    prop1.proposedLimits.EDU_10 +
    prop1.proposedLimits.FER_5;
  assert.equal(prop1Sum, initialSum, 'Sum of limits must remain conserved');
});

const DEFAULT_LIMIT_PLP = 360;
