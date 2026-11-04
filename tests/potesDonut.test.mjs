import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculatePotesDonutData, 
  polarToCartesian, 
  describeDonutArc 
} from '../src/utils/potesDonut.ts';

describe('6 Potes Donut Chart Calculations', () => {

  const mockJars = {
    NEC_55: { id: 'NEC_55', name: 'Necessidades', shortName: '55% NEC', pct: 0.55, budget: 2000, spent: 1500, colorHex: '#3B82F6', iconName: 'Home', desc: '' },
    DIV_10: { id: 'DIV_10', name: 'Lazer', shortName: '10% LAZ', pct: 0.10, budget: 350, spent: 300, colorHex: '#EC4899', iconName: 'Smile', desc: '' },
    PLP_10: { id: 'PLP_10', name: 'Reserva', shortName: '10% PLP', pct: 0.10, budget: 350, spent: 100, colorHex: '#10B981', iconName: 'PiggyBank', desc: '' },
    EDU_10: { id: 'EDU_10', name: 'Educação', shortName: '10% EDU', pct: 0.10, budget: 350, spent: 0, colorHex: '#8B5CF6', iconName: 'BookOpen', desc: '' },
    LIF_10: { id: 'LIF_10', name: 'Liberdade', shortName: '10% LIF', pct: 0.10, budget: 350, spent: 0, colorHex: '#F59E0B', iconName: 'Wallet', desc: '' },
    FER_5:  { id: 'FER_5',  name: 'Férias', shortName: '5% FER', pct: 0.05, budget: 175, spent: 50, colorHex: '#06B6D4', iconName: 'Plane', desc: '' },
  };

  test('calculates consumption, remaining amount and overspent accurately', () => {
    const data = calculatePotesDonutData(mockJars);

    assert.equal(data.slices.length, 6);
    assert.equal(data.totalSpent, 1950); // 1500 + 300 + 100 + 0 + 0 + 50
    assert.equal(data.totalBudgetLimit, 3575); // 2000 + 350*4 + 175

    const nec = data.slices.find(s => s.id === 'NEC_55');
    assert.ok(nec);
    assert.equal(nec.spent, 1500);
    assert.equal(nec.remaining, 500);
    assert.equal(nec.overspent, 0);
    assert.equal(nec.usagePercent, 75);
    assert.equal(nec.status, 'OK');

    const div = data.slices.find(s => s.id === 'DIV_10');
    assert.ok(div);
    assert.equal(div.spent, 300);
    assert.equal(div.budgetLimit, 350);
    assert.equal(div.remaining, 50);
    // 300 / 350 = 85.7% => ALERTA_80
    assert.equal(div.status, 'ALERTA_80');
  });

  test('respects custom jarLimits and flags EXCEDIDO when spending exceeds limit', () => {
    const customLimits = {
      NEC_55: 1200, // spent 1500, limit 1200 => EXCEDIDO
      DIV_10: 250,  // spent 300, limit 250 => EXCEDIDO
      PLP_10: 350,
      EDU_10: 350,
      LIF_10: 350,
      FER_5: 175
    };

    const data = calculatePotesDonutData(mockJars, customLimits);

    const nec = data.slices.find(s => s.id === 'NEC_55');
    assert.equal(nec.budgetLimit, 1200);
    assert.equal(nec.remaining, 0);
    assert.equal(nec.overspent, 300);
    assert.equal(nec.usagePercent, 125);
    assert.equal(nec.status, 'EXCEDIDO');

    assert.equal(data.criticalJarsCount, 2);
  });

  test('polarToCartesian computes correct trigonometric points', () => {
    // 0 degrees is right (1, 0)
    const pt0 = polarToCartesian(100, 100, 50, 0);
    assert.equal(Math.round(pt0.x), 150);
    assert.equal(Math.round(pt0.y), 100);

    // 90 degrees is down (0, 1) in SVG coords
    const pt90 = polarToCartesian(100, 100, 50, 90);
    assert.equal(Math.round(pt90.x), 100);
    assert.equal(Math.round(pt90.y), 150);
  });

  test('describeDonutArc generates valid SVG path commands', () => {
    const path = describeDonutArc(100, 100, 40, 80, -90, 0);
    assert.ok(path.startsWith('M '));
    assert.ok(path.includes('A 80 80'));
    assert.ok(path.includes('A 40 40'));
    assert.ok(path.endsWith('Z'));
  });
});
