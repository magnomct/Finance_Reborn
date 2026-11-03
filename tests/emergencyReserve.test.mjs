import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMonthExpenseFromAnnualData,
  calculateRecent3MonthsExpenses,
  calculateEmergencyReserveGoal
} from '../src/utils/emergencyReserve.ts';

const mockDespesas = {
  habitacao: [
    { values: [370, 0, 0, 0, 0, 0, 0, 500, 500, 699, 699, 699] }
  ],
  transporte: [
    { values: [600, 0, 0, 0, 0, 0, 0, 300, 300, 330, 330, 330] }
  ],
  bancos: [
    { values: [450, 0, 0, 0, 0, 0, 0, 900, 950, 1010, 1010, 1010] }
  ],
  cartoes: [
    { values: [3250, 0, 0, 0, 0, 0, 0, 1500, 1600, 1700, 1700, 1700] }
  ]
};

test('calculateMonthExpenseFromAnnualData sums all category lines for a month', () => {
  // Outubro (index 9): 699 + 330 + 1010 + 1700 = 3739
  const totalOut = calculateMonthExpenseFromAnnualData(mockDespesas, 9);
  assert.equal(totalOut, 3739);

  // Janeiro (index 0): 370 + 600 + 450 + 3250 = 4670
  const totalJan = calculateMonthExpenseFromAnnualData(mockDespesas, 0);
  assert.equal(totalJan, 4670);
});

test('calculateRecent3MonthsExpenses averages expenses over last 3 months', () => {
  // Months 7 (Ago: 500+300+900+1500 = 3200), 8 (Set: 500+300+950+1600 = 3350), 9 (Out: 3739)
  const result = calculateRecent3MonthsExpenses(mockDespesas, 9);
  assert.equal(result.months.length, 3);
  assert.equal(result.months[0].totalExpense, 3200); // Ago
  assert.equal(result.months[1].totalExpense, 3350); // Set
  assert.equal(result.months[2].totalExpense, 3739); // Out

  const expectedAvg = (3200 + 3350 + 3739) / 3;
  assert.equal(result.averageMonthlyExpense, expectedAvg);
  assert.equal(result.totalExpenses3Months, 10289);
});

test('calculateRecent3MonthsExpenses handles unpopulated months gracefully', () => {
  const emptyDespesas = {
    habitacao: [{ values: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    cartoes: [{ values: [2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]
  };

  // Referencing month 5 (Junho, which is 0) falls back to populated months (Janeiro: 3000)
  const result = calculateRecent3MonthsExpenses(emptyDespesas, 5);
  assert.ok(result.averageMonthlyExpense > 0);
  assert.equal(result.averageMonthlyExpense, 3000);
});

test('calculateEmergencyReserveGoal calculates 6 months ideal target and progress', () => {
  const avgExpense = 3000;
  const current = 6000;
  const goal = calculateEmergencyReserveGoal(avgExpense, 6, current, 500);

  assert.equal(goal.idealReserve, 18000); // 3000 * 6
  assert.equal(goal.completionPercentage, (6000 / 18000) * 100); // 33.33%
  assert.equal(goal.monthsCovered, 2); // 6000 / 3000
  assert.equal(goal.shortfall, 12000); // 18000 - 6000
  assert.equal(goal.status, 'CRITICAL');
  assert.equal(goal.monthsToGoal, 24); // 12000 / 500
});

test('calculateEmergencyReserveGoal identifies COMPLETE and SOLID tiers', () => {
  const avgExpense = 2000;

  // 100% complete
  const completeGoal = calculateEmergencyReserveGoal(avgExpense, 6, 12000);
  assert.equal(completeGoal.completionPercentage, 100);
  assert.equal(completeGoal.status, 'COMPLETE');
  assert.equal(completeGoal.shortfall, 0);
  assert.equal(completeGoal.monthsToGoal, null);

  // 80% solid
  const solidGoal = calculateEmergencyReserveGoal(avgExpense, 6, 9600);
  assert.equal(solidGoal.status, 'SOLID');
  assert.equal(solidGoal.monthsCovered, 4.8);
});

test('calculateEmergencyReserveGoal handles zero or negative values safely', () => {
  const zeroGoal = calculateEmergencyReserveGoal(0, 6, 0);
  assert.equal(zeroGoal.idealReserve, 0);
  assert.equal(zeroGoal.completionPercentage, 0);
  assert.equal(zeroGoal.monthsCovered, 0);
  assert.equal(zeroGoal.shortfall, 0);
});
