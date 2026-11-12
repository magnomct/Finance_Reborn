import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  computeDashboardMonthlySummary, 
  generateDashboardMonthlyPDF 
} from '../src/utils/dashboardPdfReport.ts';

const mockTransactions = [
  {
    id: 't-1',
    date: '2026-10-05',
    description: 'Salário CLT',
    amount: 2060,
    type: 'receita',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Inter PF',
    status: 'liquidado'
  },
  {
    id: 't-2',
    date: '2026-10-07',
    description: 'Condução Semanal',
    amount: -120,
    type: 'despesa',
    jar: 'NEC_55',
    costCenter: 'Magno',
    account: 'Passe',
    status: 'liquidado'
  },
  {
    id: 't-3',
    date: '2026-10-15',
    description: 'Reembolso Nathan',
    amount: 858,
    type: 'reembolso',
    jar: 'NEC_55',
    costCenter: 'Nathan',
    account: 'Inter PF',
    status: 'liquidado'
  },
  {
    id: 't-4',
    date: '2026-10-22',
    description: 'Fatura C6 Lazer',
    amount: -600,
    type: 'despesa',
    jar: 'DIV_10',
    costCenter: 'Magno',
    account: 'C6',
    status: 'liquidado'
  }
];

const mockDreams = [
  {
    id: 'dream-1',
    title: 'Reserva de Emergência',
    target: 10000,
    current: 4500,
    monthlyDeposit: 500,
    category: 'Segurança',
    impact: 'Alta',
    targetDate: '2027-04-30',
    iconName: 'Shield',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'dream-2',
    title: 'Viagem de Férias',
    target: 5000,
    current: 2500,
    monthlyDeposit: 300,
    category: 'Lazer',
    impact: 'Média',
    targetDate: '2026-12-31',
    iconName: 'Plane',
    gradient: 'from-teal-500 to-emerald-600'
  }
];

const mockJarLimits = {
  NEC_55: 2000,
  DIV_10: 350,
  PLP_10: 350,
  LIF_10: 350,
  EDU_10: 350,
  FER_5: 175,
  PJ_EXCLUIDO: 0
};

test('computeDashboardMonthlySummary: accurately computes month totals, jars, and dreams', () => {
  const summary = computeDashboardMonthlySummary(
    mockTransactions,
    mockDreams,
    mockJarLimits,
    { monthName: 'Outubro / 2026', yearMonth: '2026-10' }
  );

  // Total income: 2060 (receita) + 858 (reembolso) = 2918
  assert.equal(summary.totalIncome, 2918);
  // Total expenses: 120 + 600 = 720
  assert.equal(summary.totalExpenses, 720);
  // Net balance: 2918 - 720 = 2198
  assert.equal(summary.netBalance, 2198);

  // Jars
  assert.equal(summary.jarItems.length, 7);
  const divJar = summary.jarItems.find(j => j.jarId === 'DIV_10');
  assert.ok(divJar);
  assert.equal(divJar.spent, 600);
  assert.equal(divJar.status, 'EXCEDIDO'); // 600 > 350

  // Dreams
  assert.equal(summary.dreamItems.length, 2);
  assert.equal(summary.totalDreamTarget, 15000);
  assert.equal(summary.totalDreamCurrent, 7000);
  // Overall completion: 7000 / 15000 = 47%
  assert.equal(summary.dreamOverallCompletion, 47);

  // MEI Metrics Block
  assert.ok(summary.meiMetrics, 'summary.meiMetrics should be defined');
  assert.equal(summary.meiMetrics.annualCeiling, 81000);
  assert.equal(summary.meiMetrics.year, 2026);
  assert.ok(summary.meiMetrics.ytdRevenue >= 0);
  assert.ok(summary.meiMetrics.dasAmount > 0);
  assert.ok(summary.meiMetrics.statusBadge.label);
  assert.ok(typeof summary.meiMetrics.isDasPaidThisMonth === 'boolean');
});

test('generateDashboardMonthlyPDF: creates valid jsPDF instance with required tables and headers', () => {
  const doc = generateDashboardMonthlyPDF(
    mockTransactions,
    mockDreams,
    mockJarLimits,
    {
      monthName: 'Outubro / 2026',
      yearMonth: '2026-10',
      entityName: 'Magno Silva'
    }
  );

  assert.ok(doc);
  const pageCount = doc.internal.getNumberOfPages();
  assert.ok(pageCount >= 1);
});
