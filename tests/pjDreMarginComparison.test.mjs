import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePjDreComparison } from '../src/utils/pjDre.ts';

test('calculatePjDreComparison: highlights margin expansion (green/favorable) when net margin increases', () => {
  const transactions = [
    // Preceding 3 months (Jul, Aug, Sep) with average net margin around ~50%
    { id: '1', date: '2026-07-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '2', date: '2026-07-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '3', date: '2026-07-23', description: 'Convênio', amount: -1320, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 1500 profit / 3000 = 50%

    { id: '4', date: '2026-08-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '5', date: '2026-08-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '6', date: '2026-08-23', description: 'Convênio', amount: -1320, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 50%

    { id: '7', date: '2026-09-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '8', date: '2026-09-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '9', date: '2026-09-23', description: 'Convênio', amount: -1320, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 50%

    // Current month (Oct) has higher margin: 3000 rev, 180 DAS, 1020 expenses -> 1800 profit -> 60% margin!
    { id: '10', date: '2026-10-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '11', date: '2026-10-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '12', date: '2026-10-23', description: 'Convênio', amount: -1020, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }
  ];

  const result = calculatePjDreComparison(transactions, '2026-10', 3);
  const marginVar = result.kpis.marginVariance;

  assert.ok(marginVar);
  assert.equal(marginVar.currentMarginPct, 60);
  assert.equal(marginVar.avgMarginPct, 50);
  // Diff points = 60 - 50 = +10 p.p.
  assert.equal(marginVar.diffPoints, 10);
  // Percent variance = ((60 - 50) / 50) * 100 = +20%
  assert.equal(marginVar.percentVariance, 20);
  assert.equal(marginVar.polarity, 'favorable');
  assert.equal(marginVar.isExpansion, true);
  assert.equal(marginVar.statusLabel, 'Expansão de Margem');
  assert.ok(marginVar.headline.includes('+20.0%'));
  assert.ok(marginVar.explanation.includes('60.0%'));
  assert.ok(marginVar.explanation.includes('50.0%'));
});

test('calculatePjDreComparison: highlights margin compression (red/unfavorable) when net margin decreases', () => {
  const transactions = [
    // Preceding 3 months (Jul, Aug, Sep) with average net margin around ~60%
    { id: '1', date: '2026-07-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '2', date: '2026-07-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '3', date: '2026-07-23', description: 'Convênio', amount: -1020, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 60%

    { id: '4', date: '2026-08-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '5', date: '2026-08-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '6', date: '2026-08-23', description: 'Convênio', amount: -1020, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 60%

    { id: '7', date: '2026-09-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '8', date: '2026-09-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '9', date: '2026-09-23', description: 'Convênio', amount: -1020, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }, // 60%

    // Current month (Oct) has compressed margin: 3000 rev, 180 DAS, 1620 expenses -> 1200 profit -> 40% margin!
    { id: '10', date: '2026-10-05', description: 'Serviço PJ', amount: 3000, type: 'receita', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '11', date: '2026-10-20', description: 'DAS', amount: -180, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' },
    { id: '12', date: '2026-10-23', description: 'Convênio', amount: -1620, type: 'despesa', jar: 'PJ_EXCLUIDO', costCenter: 'PJ', account: 'Inter PJ', status: 'liquidado' }
  ];

  const result = calculatePjDreComparison(transactions, '2026-10', 3);
  const marginVar = result.kpis.marginVariance;

  assert.ok(marginVar);
  assert.equal(marginVar.currentMarginPct, 40);
  assert.equal(marginVar.avgMarginPct, 60);
  // Diff points = 40 - 60 = -20 p.p.
  assert.equal(marginVar.diffPoints, -20);
  // Percent variance = ((40 - 60) / 60) * 100 = -33.33%
  assert.equal(marginVar.percentVariance, -33.33);
  assert.equal(marginVar.polarity, 'unfavorable');
  assert.equal(marginVar.isExpansion, false);
  assert.equal(marginVar.statusLabel, 'Compressão de Margem');
  assert.ok(marginVar.headline.includes('-33.3%'));
  assert.ok(marginVar.explanation.includes('40.0%'));
  assert.ok(marginVar.explanation.includes('60.0%'));
});
