import { MONTH_NAMES } from '../data/annualDashboardData';

export interface MonthlyCashFlowPoint {
  monthIndex: number;
  monthName: string;
  monthShort: string;
  receitas: number;
  despesas: number;
  investimentos: number;
  netCashFlow: number; // receitas - despesas
  savingsRate: number; // % poupada
  isAtypical: boolean; // se é um mês de gasto atípico
  atypicalSeverity: 'none' | 'moderate' | 'high';
  deviationPct: number; // % em relação à média de gastos
  atypicalReasons: string[];
  liquidityRisk: 'LOW' | 'MODERATE' | 'HIGH';
  primaryExpenseCategory?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

export interface SeasonalSummaryMetrics {
  totalReceitasAno: number;
  totalDespesasAno: number;
  totalNetCashFlowAno: number;
  meanMonthlyReceita: number;
  meanMonthlyDespesa: number;
  meanMonthlyNet: number;
  maxExpenseMonth: { monthIndex: number; monthName: string; amount: number };
  minExpenseMonth: { monthIndex: number; monthName: string; amount: number };
  tightestCashMonth: { monthIndex: number; monthName: string; netAmount: number };
  highestSurplusMonth: { monthIndex: number; monthName: string; netAmount: number };
  atypicalMonthsCount: number;
  recommendedSeasonalBuffer: number;
  forecastAdvice: string;
}

export interface SeasonalSimulationScenario {
  id: string;
  label: string;
  monthIndex: number; // 0 to 11
  extraExpense: number;
  description: string;
}

export const DEFAULT_SEASONAL_SCENARIOS: SeasonalSimulationScenario[] = [
  {
    id: 'jan_school_ipva',
    label: 'Janeiro: IPVA + IPTU + Matrículas',
    monthIndex: 0,
    extraExpense: 1400,
    description: 'Concentração típica de tributos e despesas escolares no começo do ano.'
  },
  {
    id: 'jul_vacation',
    label: 'Julho: Férias e Passeios',
    monthIndex: 6,
    extraExpense: 850,
    description: 'Passeios de meio de ano e consumo de lazer sazonal.'
  },
  {
    id: 'dec_holidays',
    label: 'Dezembro: Festas & Fim de Ano',
    monthIndex: 11,
    extraExpense: 1200,
    description: 'Ceia, confraternizações e compras de fim de ano.'
  }
];

/**
 * Helper to compute month-by-month cash flow and identify seasonal anomalies
 */
export function analyzeSeasonalCashFlow(
  totalReceitas: number[],
  totalDespesas: number[],
  investimentos: number[] = Array(12).fill(0),
  categoryBreakdownPerMonth?: Record<string, number[]>
): {
  monthlyData: MonthlyCashFlowPoint[];
  metrics: SeasonalSummaryMetrics;
} {
  const monthsCount = 12;
  const safeReceitas = totalReceitas.length === 12 ? totalReceitas : Array(12).fill(0);
  const safeDespesas = totalDespesas.length === 12 ? totalDespesas : Array(12).fill(0);
  const safeInvest = investimentos.length === 12 ? investimentos : Array(12).fill(0);

  // Consider non-zero expense months for realistic average, or fallback to all 12
  const activeExpenseMonths = safeDespesas.filter(d => d > 0);
  const meanActiveDespesa = activeExpenseMonths.length > 0
    ? activeExpenseMonths.reduce((a, b) => a + b, 0) / activeExpenseMonths.length
    : 1;

  const totalDespesasAno = safeDespesas.reduce((a, b) => a + b, 0);
  const totalReceitasAno = safeReceitas.reduce((a, b) => a + b, 0);
  const overallMeanDespesa = totalDespesasAno / monthsCount;
  const overallMeanReceita = totalReceitasAno / monthsCount;

  // Determine baseline expense for anomaly comparison:
  // In annual budgets, months like Jan or Oct can be massive peaks compared to typical months.
  // We compare against the weighted blend of active average and overall annual average.
  const baselineComparison = activeExpenseMonths.length >= 8
    ? meanActiveDespesa
    : Math.max(overallMeanDespesa * 1.25, Math.min(meanActiveDespesa, overallMeanDespesa * 2.5));

  const atypicalThreshold = Math.min(
    Math.max(overallMeanDespesa * 1.4, 600),
    Math.max(meanActiveDespesa * 1.05, overallMeanDespesa * 1.5)
  );

  const quarters: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = [
    'Q1', 'Q1', 'Q1',
    'Q2', 'Q2', 'Q2',
    'Q3', 'Q3', 'Q3',
    'Q4', 'Q4', 'Q4'
  ];

  let maxExpIdx = 0;
  let minExpIdx = 0;
  let minNetIdx = 0;
  let maxNetIdx = 0;

  const monthlyData: MonthlyCashFlowPoint[] = [];

  for (let i = 0; i < monthsCount; i++) {
    const rec = safeReceitas[i] || 0;
    const desp = safeDespesas[i] || 0;
    const inv = safeInvest[i] || 0;
    const net = rec - desp;
    const savings = rec > 0 ? ((rec - desp) / rec) * 100 : 0;

    // Track min/max
    if (desp > (safeDespesas[maxExpIdx] || 0)) maxExpIdx = i;
    if (desp < (safeDespesas[minExpIdx] || 0) && desp > 0) minExpIdx = i;
    if (net < (safeReceitas[minNetIdx] - safeDespesas[minNetIdx])) minNetIdx = i;
    if (net > (safeReceitas[maxNetIdx] - safeDespesas[maxNetIdx])) maxNetIdx = i;

    // Atypical check
    const isAboveThreshold = desp >= atypicalThreshold && desp > 500;
    const deviation = meanActiveDespesa > 0 ? ((desp - meanActiveDespesa) / meanActiveDespesa) * 100 : 0;
    
    let severity: 'none' | 'moderate' | 'high' = 'none';
    if (isAboveThreshold) {
      severity = desp >= meanActiveDespesa * 1.5 ? 'high' : 'moderate';
    }

    const reasons: string[] = [];
    if (isAboveThreshold) {
      reasons.push(`Gasto ${Math.round(deviation)}% acima da média dos meses ativos`);
      if (i === 0) reasons.push('Sazonalidade de início de ano (tributos / início de ciclo)');
      if (i === 9) reasons.push('Pico de cartões e encargos financeiros acumulados');
    }

    // Determine top category in this month if breakdown provided
    let topCategory: string | undefined;
    if (categoryBreakdownPerMonth) {
      let maxCatAmount = 0;
      for (const [catName, monthVals] of Object.entries(categoryBreakdownPerMonth)) {
        if (monthVals[i] > maxCatAmount) {
          maxCatAmount = monthVals[i];
          topCategory = catName;
        }
      }
    }

    // Liquidity risk for cash flow
    let risk: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (net < 800) {
      risk = 'HIGH';
    } else if (net < 1500) {
      risk = 'MODERATE';
    }

    monthlyData.push({
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      monthShort: MONTH_NAMES[i].slice(0, 3),
      receitas: rec,
      despesas: desp,
      investimentos: inv,
      netCashFlow: net,
      savingsRate: Math.max(0, savings),
      isAtypical: isAboveThreshold,
      atypicalSeverity: severity,
      deviationPct: Math.round(deviation * 10) / 10,
      atypicalReasons: reasons,
      liquidityRisk: risk,
      primaryExpenseCategory: topCategory,
      quarter: quarters[i]
    });
  }

  const atypicalCount = monthlyData.filter(m => m.isAtypical).length;
  const maxExpenseVal = safeDespesas[maxExpIdx] || 0;
  
  // Suggested seasonal buffer: difference between peak month expense and monthly average
  const recommendedSeasonalBuffer = Math.max(0, maxExpenseVal - overallMeanDespesa);

  // Generate automated financial forecast advice
  let advice = '';
  if (atypicalCount > 0) {
    advice = `Identificados ${atypicalCount} meses com despesas atípicas (destaque para ${MONTH_NAMES[maxExpIdx]}). Mantenha um colchão preventivo de ao menos R$ ${Math.round(recommendedSeasonalBuffer).toLocaleString('pt-BR')} provisionado para evitar uso de limite de conta.`;
  } else {
    advice = 'Fluxo de despesas estável ao longo do ano. Mantenha os aportes regulares de investimento previstos.';
  }

  const metrics: SeasonalSummaryMetrics = {
    totalReceitasAno,
    totalDespesasAno,
    totalNetCashFlowAno: totalReceitasAno - totalDespesasAno,
    meanMonthlyReceita: Math.round(overallMeanReceita),
    meanMonthlyDespesa: Math.round(overallMeanDespesa),
    meanMonthlyNet: Math.round((totalReceitasAno - totalDespesasAno) / monthsCount),
    maxExpenseMonth: {
      monthIndex: maxExpIdx,
      monthName: MONTH_NAMES[maxExpIdx],
      amount: safeDespesas[maxExpIdx] || 0
    },
    minExpenseMonth: {
      monthIndex: minExpIdx,
      monthName: MONTH_NAMES[minExpIdx],
      amount: safeDespesas[minExpIdx] || 0
    },
    tightestCashMonth: {
      monthIndex: minNetIdx,
      monthName: MONTH_NAMES[minNetIdx],
      netAmount: safeReceitas[minNetIdx] - safeDespesas[minNetIdx]
    },
    highestSurplusMonth: {
      monthIndex: maxNetIdx,
      monthName: MONTH_NAMES[maxNetIdx],
      netAmount: safeReceitas[maxNetIdx] - safeDespesas[maxNetIdx]
    },
    atypicalMonthsCount: atypicalCount,
    recommendedSeasonalBuffer: Math.round(recommendedSeasonalBuffer),
    forecastAdvice: advice
  };

  return { monthlyData, metrics };
}

/**
 * Apply seasonal simulation scenario to test cash flow resistance
 */
export function simulateSeasonalExpense(
  baseMonthlyDespesas: number[],
  extraAmount: number,
  targetMonthIndex: number
): number[] {
  const simulated = [...baseMonthlyDespesas];
  if (targetMonthIndex >= 0 && targetMonthIndex < simulated.length) {
    simulated[targetMonthIndex] = (simulated[targetMonthIndex] || 0) + extraAmount;
  }
  return simulated;
}
