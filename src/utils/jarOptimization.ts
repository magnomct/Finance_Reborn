import { Transaction, JarType } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export interface JarHistoricalStat {
  jarId: JarType;
  spent: number;
  refunds: number;
  netSpent: number;
  transactionCount: number;
  percentOfIncome: number;
}

export interface JarOptimizationItem {
  jarId: JarType;
  jarName: string;
  shortName: string;
  colorHex: string;
  currentPercent: number;
  suggestedPercent: number;
  currentLimit: number;
  suggestedLimit: number;
  deltaPercent: number;
  deltaLimit: number;
  historicalNetSpent: number;
  historicalPercentSpent: number;
  rationale: string;
  isReserveFocus?: boolean;
}

export interface JarOptimizationResult {
  optimizedJars: Record<JarType, JarOptimizationItem>;
  totalCurrentPercent: number;
  totalSuggestedPercent: number;
  monthlyReserveBoost: number;
  monthsAccelerated: number;
  strategyHeadline: string;
  strategySummary: string;
  keyInsights: string[];
  source: 'gemini' | 'heuristic';
}

export const STANDARD_JAR_PERCENTAGES: Record<JarType, number> = {
  NEC_55: 55,
  DIV_10: 10,
  PLP_10: 10,
  LIF_10: 10,
  EDU_10: 10,
  FER_5: 5,
  PJ_EXCLUIDO: 0,
};

export const CORE_JAR_KEYS: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'];

/**
 * Calculates historical spending behavior per jar from transactions
 */
export function calculateJarHistoricalStats(
  transactions: Transaction[],
  incomeBase: number
): Record<JarType, JarHistoricalStat> {
  const safeIncome = incomeBase > 0 ? incomeBase : 3652.31;
  const stats: Record<JarType, JarHistoricalStat> = {} as any;

  CORE_JAR_KEYS.forEach(key => {
    stats[key] = {
      jarId: key,
      spent: 0,
      refunds: 0,
      netSpent: 0,
      transactionCount: 0,
      percentOfIncome: 0,
    };
  });

  transactions.forEach(t => {
    if (!t.jar || !stats[t.jar]) return;
    if (t.type === 'despesa') {
      stats[t.jar].spent += Math.abs(t.amount);
      stats[t.jar].transactionCount += 1;
    } else if (t.type === 'reembolso') {
      stats[t.jar].refunds += Math.abs(t.amount);
    }
  });

  CORE_JAR_KEYS.forEach(key => {
    const net = Math.max(0, stats[key].spent - stats[key].refunds);
    stats[key].netSpent = Math.round(net * 100) / 100;
    stats[key].percentOfIncome = Math.round((net / safeIncome) * 1000) / 10;
  });

  return stats;
}

/**
 * Pure function: Deterministic optimization engine that analyzes historical
 * spending behavior and reallocates budget percentages to maximize the
 * Emergency Reserve (PLP_10) while maintaining a strict 100% total.
 */
export function calculateDeterministicJarOptimization(params: {
  incomeBase: number;
  currentLimits?: Record<JarType, number>;
  historicalStats?: Record<JarType, JarHistoricalStat>;
  reserveShortfall?: number;
  averageMonthlyExpense?: number;
}): JarOptimizationResult {
  const {
    incomeBase,
    currentLimits = {} as Record<JarType, number>,
    historicalStats,
    reserveShortfall = 10000,
    averageMonthlyExpense = 2000,
  } = params;

  const safeIncome = incomeBase > 0 ? incomeBase : 3652.31;

  // Derive current percentages from limits or fall back to standard
  const currentPercents: Record<JarType, number> = {} as any;
  let totalCurrentLimit = 0;
  CORE_JAR_KEYS.forEach(k => {
    const limit = currentLimits[k] !== undefined && currentLimits[k] > 0
      ? currentLimits[k]
      : Math.round(safeIncome * (STANDARD_JAR_PERCENTAGES[k] / 100));
    totalCurrentLimit += limit;
  });

  CORE_JAR_KEYS.forEach(k => {
    const limit = currentLimits[k] !== undefined && currentLimits[k] > 0
      ? currentLimits[k]
      : Math.round(safeIncome * (STANDARD_JAR_PERCENTAGES[k] / 100));
    currentPercents[k] = totalCurrentLimit > 0
      ? Math.round((limit / totalCurrentLimit) * 100)
      : STANDARD_JAR_PERCENTAGES[k];
  });

  // Calculate realistic suggested adjustments based on historical behavior
  // Default reallocation strategy targeting Emergency Reserve:
  // We trim discretionary or surplus margins and funnel into PLP_10 (Reserva de Emergência)
  let suggestedPercents: Record<JarType, number> = {
    NEC_55: 50, // -5% (ou ajustado conforme gasto real)
    DIV_10: 8,  // -2%
    PLP_10: 20, // +10% (Foco Total na Reserva de Emergência)
    LIF_10: 10, // Mantém ou calibra
    EDU_10: 8,  // -2%
    FER_5: 4,   // -1%
    PJ_EXCLUIDO: 0,
  };

  // If we have real historical stats, dynamically calibrate
  if (historicalStats) {
    const necSpentPct = historicalStats['NEC_55']?.percentOfIncome || 50;
    const divSpentPct = historicalStats['DIV_10']?.percentOfIncome || 8;
    const ferSpentPct = historicalStats['FER_5']?.percentOfIncome || 2;
    const eduSpentPct = historicalStats['EDU_10']?.percentOfIncome || 5;

    // NEC: give at least historical spent + 3% buffer, capped between 45% and 53%
    const necTarget = Math.max(45, Math.min(53, Math.ceil(necSpentPct + 3)));
    
    // DIV: give historical + 2% buffer, min 6%, max 9%
    const divTarget = Math.max(6, Math.min(9, Math.ceil(divSpentPct + 2)));
    
    // FER: min 2%, max 4%
    const ferTarget = Math.max(2, Math.min(4, Math.ceil(ferSpentPct + 1)));

    // EDU: min 6%, max 8%
    const eduTarget = Math.max(6, Math.min(8, Math.ceil(eduSpentPct + 2)));

    // LIF: keep at 8-10%
    const lifTarget = 9;

    // The remainder goes to PLP_10 (Reserva)
    const otherSum = necTarget + divTarget + ferTarget + eduTarget + lifTarget;
    const plpTarget = Math.max(15, 100 - otherSum);

    suggestedPercents = {
      NEC_55: necTarget,
      DIV_10: divTarget,
      PLP_10: plpTarget,
      LIF_10: lifTarget,
      EDU_10: eduTarget,
      FER_5: ferTarget,
      PJ_EXCLUIDO: 0,
    };

    // Ensure strict sum to 100%
    const sum = CORE_JAR_KEYS.reduce((acc, k) => acc + suggestedPercents[k], 0);
    if (sum !== 100) {
      suggestedPercents.PLP_10 += (100 - sum);
    }
  }

  // Ensure strict sum of 100%
  let sumCheck = CORE_JAR_KEYS.reduce((acc, k) => acc + suggestedPercents[k], 0);
  if (sumCheck !== 100) {
    suggestedPercents.PLP_10 += (100 - sumCheck);
  }

  const optimizedJars: Record<JarType, JarOptimizationItem> = {} as any;
  const rationales: Record<JarType, string> = {
    NEC_55: `Ajustado de ${currentPercents['NEC_55']}% para ${suggestedPercents['NEC_55']}%. Otimização de contas fixas e consumo doméstico para evitar desperdícios sem perder conforto.`,
    DIV_10: `Calibrado de ${currentPercents['DIV_10']}% para ${suggestedPercents['DIV_10']}%. Preserva os momentos de lazer essenciais e transfere o excesso para o fundo de segurança.`,
    PLP_10: `Turbinado de ${currentPercents['PLP_10']}% para ${suggestedPercents['PLP_10']}%. Foco prioritário: acelerar a Reserva de Emergência para blindar sua família contra imprevistos.`,
    LIF_10: `Definido em ${suggestedPercents['LIF_10']}%. Mantém semente de investimentos para o futuro enquanto a reserva básica se consolida.`,
    EDU_10: `Ajustado em ${suggestedPercents['EDU_10']}%. Foco em cursos e livros práticos de alto impacto no curto e médio prazo.`,
    FER_5: `Ajustado para ${suggestedPercents['FER_5']}%. Mantém cota para descanso e generosidade com planejamento antecipado.`,
    PJ_EXCLUIDO: 'Não aplicável na partilha PF.',
  };

  CORE_JAR_KEYS.forEach(key => {
    const def = JAR_DEFINITIONS[key] || { name: key, shortName: key, colorHex: '#3b82f6' };
    const curLimit = currentLimits[key] !== undefined && currentLimits[key] > 0
      ? currentLimits[key]
      : Math.round(safeIncome * (currentPercents[key] / 100));
    const sugLimit = Math.round(safeIncome * (suggestedPercents[key] / 100));
    const deltaPct = suggestedPercents[key] - currentPercents[key];
    const deltaLim = sugLimit - curLimit;
    const stat = historicalStats ? historicalStats[key] : null;

    optimizedJars[key] = {
      jarId: key,
      jarName: def.name,
      shortName: def.shortName,
      colorHex: def.colorHex,
      currentPercent: currentPercents[key],
      suggestedPercent: suggestedPercents[key],
      currentLimit: curLimit,
      suggestedLimit: sugLimit,
      deltaPercent: deltaPct,
      deltaLimit: deltaLim,
      historicalNetSpent: stat ? stat.netSpent : 0,
      historicalPercentSpent: stat ? stat.percentOfIncome : 0,
      rationale: rationales[key],
      isReserveFocus: key === 'PLP_10',
    };
  });

  const curReserveLimit = optimizedJars['PLP_10'].currentLimit;
  const sugReserveLimit = optimizedJars['PLP_10'].suggestedLimit;
  const monthlyReserveBoost = Math.max(0, sugReserveLimit - curReserveLimit);

  // Calculate accelerated completion of emergency reserve
  // If reserve shortfall is X, how many months faster do we reach it with the boost?
  const curMonthlySavings = curReserveLimit > 0 ? curReserveLimit : Math.round(safeIncome * 0.1);
  const newMonthlySavings = sugReserveLimit > 0 ? sugReserveLimit : Math.round(safeIncome * 0.2);
  
  const curMonthsToGoal = curMonthlySavings > 0 ? reserveShortfall / curMonthlySavings : 24;
  const newMonthsToGoal = newMonthlySavings > 0 ? reserveShortfall / newMonthlySavings : 12;
  const monthsAccelerated = Math.max(1, Math.round(curMonthsToGoal - newMonthsToGoal));

  return {
    optimizedJars,
    totalCurrentPercent: 100,
    totalSuggestedPercent: 100,
    monthlyReserveBoost,
    monthsAccelerated,
    strategyHeadline: `Potencialize sua Reserva com +R$ ${monthlyReserveBoost.toFixed(0)}/mês`,
    strategySummary: `Redistribuindo pequenas margens ociosas de necessidades e lazer, aumentamos o Pote de Reserva & Sonhos (PLP) de ${currentPercents['PLP_10']}% para ${suggestedPercents['PLP_10']}%, antecipando sua meta de emergência em cerca de ${monthsAccelerated} meses.`,
    keyInsights: [
      `Aporte mensal na Reserva de Emergência salta de R$ ${curReserveLimit.toFixed(0)} para R$ ${sugReserveLimit.toFixed(0)} (+R$ ${monthlyReserveBoost.toFixed(0)}/mês).`,
      `Sua blindagem de emergência (6 meses de despesas) será concluída aproximadamente ${monthsAccelerated} meses mais cedo.`,
      `Ajustes suaves em Diversão (-${Math.abs(optimizedJars['DIV_10'].deltaPercent)}%) e Necessidades (-${Math.abs(optimizedJars['NEC_55'].deltaPercent)}%) sem comprometer sua rotina.`,
      `Equilíbrio rigoroso: a soma de todos os potes permanece exatamente em 100% da sua renda.`
    ],
    source: 'heuristic',
  };
}
