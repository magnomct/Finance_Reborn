import { Transaction, JarType } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { calculateFinancialMetrics } from './finance';
import { DEFAULT_JAR_LIMITS } from './budgetAlerts';

export type JarUtilizationStatus = 'subutilizado' | 'equilibrado' | 'quase_limite' | 'estourado';

export interface Jar30DayAnalysis {
  jarId: JarType;
  name: string;
  shortName: string;
  colorHex: string;
  currentLimit: number;
  spentLast30Days: number;
  usageRatio: number; // percentage (0..100%+)
  surplus: number; // unspent budget
  deficit: number; // amount exceeding budget
  status: JarUtilizationStatus;
  statusLabel: string;
  transactionCount: number;
}

export interface ReallocationTransfer {
  fromJarId: JarType;
  fromJarName: string;
  toJarId: JarType;
  toJarName: string;
  amount: number;
  reason: string;
}

export interface ReallocationProposal {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string; // Tailwind class
  transfers: ReallocationTransfer[];
  totalTransferred: number;
  rationale: string;
  impactDescription: string;
  proposedLimits: Record<JarType, number>;
  targetPriority: 'reserva_plp' | 'necessidades_reequilibrio' | 'investimentos_lif';
}

export interface QuickReallocationSummary {
  currentBalance: number;
  effectiveIncomeBase: number;
  totalSurplusAvailable: number; // sum of surplus in underutilized jars
  totalDeficit: number; // sum of deficit in overspent jars
  jarsAnalysis: Jar30DayAnalysis[];
  underutilizedJars: Jar30DayAnalysis[];
  overspentJars: Jar30DayAnalysis[];
  proposals: ReallocationProposal[];
  bestProposal: ReallocationProposal;
  headlineInsight: string;
  referencePeriodLabel: string;
}

/**
 * Filters transactions that occurred within the last 30 days of the latest transaction date.
 */
export function filterLast30DaysTransactions(
  transactions: Transaction[],
  referenceDateStr?: string
): Transaction[] {
  if (transactions.length === 0) return [];

  // Determine reference date: use provided, or max date in transactions, or fallback to current
  let maxDate = referenceDateStr;
  if (!maxDate) {
    const dates = transactions
      .map(t => t.date)
      .filter(Boolean)
      .sort();
    maxDate = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0];
  }

  const refDateObj = new Date(maxDate);
  const thirtyDaysPrior = new Date(refDateObj);
  thirtyDaysPrior.setDate(thirtyDaysPrior.getDate() - 30);
  const cutoffStr = thirtyDaysPrior.toISOString().split('T')[0];

  return transactions.filter(t => {
    if (!t.date) return true; // include if undated to avoid omitting current cycle items
    return t.date >= cutoffStr && t.date <= maxDate;
  });
}

/**
 * Pure function: Analyzes current balance, budget limits, and 30-day spending history
 * to discover underutilized/surplus jars and generate concrete reallocation proposals.
 */
export function generateJarReallocationInsights(params?: {
  transactions?: Transaction[];
  jarLimits?: Record<JarType, number>;
  usePjProfitInPf?: boolean;
  referenceDateStr?: string;
}): QuickReallocationSummary {
  const {
    transactions = [],
    jarLimits = { ...DEFAULT_JAR_LIMITS },
    usePjProfitInPf = true,
    referenceDateStr
  } = params || {};

  const metrics = calculateFinancialMetrics(transactions, usePjProfitInPf);
  const currentBalance = metrics.netBalanceConsolidated;
  const effectiveIncomeBase = metrics.effectiveIncomeBase;

  // Filter 30-day transactions
  const tx30Days = filterLast30DaysTransactions(transactions, referenceDateStr);

  const relevantJars: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'];

  // 1. Analyze each jar's 30-day behavior
  const jarsAnalysis: Jar30DayAnalysis[] = relevantJars.map(jarId => {
    const def = JAR_DEFINITIONS[jarId];
    const currentLimit = jarLimits[jarId] ?? DEFAULT_JAR_LIMITS[jarId] ?? 360;

    // Net spent in last 30 days
    const expenses = tx30Days
      .filter(t => t.jar === jarId && t.type === 'despesa')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const refunds = tx30Days
      .filter(t => t.jar === jarId && t.type === 'reembolso')
      .reduce((sum, t) => sum + t.amount, 0);

    const spentLast30Days = Math.max(0, Math.round((expenses - refunds) * 100) / 100);
    const count = tx30Days.filter(t => t.jar === jarId).length;

    const usageRatio = currentLimit > 0 
      ? Math.round((spentLast30Days / currentLimit) * 1000) / 10 
      : 0;

    let status: JarUtilizationStatus = 'equilibrado';
    let statusLabel = 'Consumo Equilibrado';

    if (usageRatio <= 35) {
      status = 'subutilizado';
      statusLabel = usageRatio === 0 ? 'Sem Gastos (100% Ocioso)' : 'Subutilizado';
    } else if (usageRatio > 100) {
      status = 'estourado';
      statusLabel = 'Teto Excedido';
    } else if (usageRatio >= 85) {
      status = 'quase_limite';
      statusLabel = 'Próximo do Limite';
    }

    const surplus = Math.max(0, Math.round((currentLimit - spentLast30Days) * 100) / 100);
    const deficit = Math.max(0, Math.round((spentLast30Days - currentLimit) * 100) / 100);

    return {
      jarId,
      name: def?.name || jarId,
      shortName: def?.shortName || jarId,
      colorHex: def?.colorHex || '#64748B',
      currentLimit,
      spentLast30Days,
      usageRatio,
      surplus,
      deficit,
      status,
      statusLabel,
      transactionCount: count
    };
  });

  const underutilizedJars = jarsAnalysis
    .filter(j => j.status === 'subutilizado' && j.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus);

  const overspentJars = jarsAnalysis
    .filter(j => j.status === 'estourado' && j.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);

  const totalSurplusAvailable = underutilizedJars.reduce((sum, j) => sum + j.surplus, 0);
  const totalDeficit = overspentJars.reduce((sum, j) => sum + j.deficit, 0);

  // 2. Generate Reallocation Proposals
  const proposals: ReallocationProposal[] = [];

  // Helper to clone limits
  const baseLimits = { ...jarLimits };

  // =========================================================================
  // CENÁRIO 1 (RECOMENDADO): Blindagem da Reserva de Emergência (PLP 10%)
  // Realoque sobras ociosas de Educação (R$ 150) e Férias (R$ 90) para a Reserva PLP
  // =========================================================================
  const eduJar = underutilizedJars.find(j => j.jarId === 'EDU_10');
  const ferJar = underutilizedJars.find(j => j.jarId === 'FER_5');
  const plpJar = jarsAnalysis.find(j => j.jarId === 'PLP_10');

  const eduTransferAmt = eduJar ? Math.min(150, Math.floor(eduJar.surplus * 0.5)) : 100;
  const ferTransferAmt = ferJar ? Math.min(90, Math.floor(ferJar.surplus * 0.5)) : 50;
  const totalToPlp = eduTransferAmt + ferTransferAmt;

  const limitsScenario1 = { ...baseLimits };
  if (eduTransferAmt > 0 && limitsScenario1.EDU_10) {
    limitsScenario1.EDU_10 = Math.max(100, limitsScenario1.EDU_10 - eduTransferAmt);
  }
  if (ferTransferAmt > 0 && limitsScenario1.FER_5) {
    limitsScenario1.FER_5 = Math.max(50, limitsScenario1.FER_5 - ferTransferAmt);
  }
  limitsScenario1.PLP_10 = (limitsScenario1.PLP_10 || 360) + totalToPlp;

  const transfers1: ReallocationTransfer[] = [];
  if (eduTransferAmt > 0) {
    transfers1.push({
      fromJarId: 'EDU_10',
      fromJarName: 'Educação Continuada',
      toJarId: 'PLP_10',
      toJarName: 'Reserva & Sonhos (PLP 10%)',
      amount: eduTransferAmt,
      reason: `Educação teve apenas ${eduJar?.usageRatio ?? 0}% de uso nos últimos 30 dias (${eduJar?.transactionCount ?? 0} lançamentos).`
    });
  }
  if (ferTransferAmt > 0) {
    transfers1.push({
      fromJarId: 'FER_5',
      fromJarName: 'Férias & Doações',
      toJarId: 'PLP_10',
      toJarName: 'Reserva & Sonhos (PLP 10%)',
      amount: ferTransferAmt,
      reason: `Férias teve 0% de desembolso no mês, liberando verba ociosa de segurança.`
    });
  }

  proposals.push({
    id: 'prop-reserva-emergencia',
    title: `Mover ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalToPlp)} para a Reserva de Emergência (PLP 10%)`,
    subtitle: 'Fortalece seu colchão financeiro e previne juros de cheque especial',
    badge: 'Recomendado ⭐',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
    transfers: transfers1,
    totalTransferred: totalToPlp,
    rationale: `Seus potes de Educação e Férias acumulam R$ ${totalSurplusAvailable.toFixed(2)} de margem ociosa nos últimos 30 dias. Realocar R$ ${totalToPlp.toFixed(2)} para a Reserva (PLP) eleva sua segurança para R$ ${limitsScenario1.PLP_10.toFixed(2)} sem impactar nenhum gasto essencial.`,
    impactDescription: `Teto da Reserva sobe para R$ ${limitsScenario1.PLP_10.toFixed(2)} (+R$ ${totalToPlp.toFixed(2)}). O orçamento global permanece 100% equilibrado em R$ ${effectiveIncomeBase.toFixed(2)}.`,
    proposedLimits: limitsScenario1,
    targetPriority: 'reserva_plp'
  });

  // =========================================================================
  // CENÁRIO 2: Reequilibrar Necessidades Básicas (NEC 55%)
  // Transfere folga dos potes subutilizados para aliviar o teto estourado de NEC
  // =========================================================================
  const necJar = overspentJars.find(j => j.jarId === 'NEC_55');
  const necDeficit = necJar?.deficit || 500;
  const reliefAmt = Math.min(necDeficit, Math.min(300, Math.floor(totalSurplusAvailable * 0.6)));

  const limitsScenario2 = { ...baseLimits };
  const halfRelief = Math.floor(reliefAmt / 2);
  limitsScenario2.EDU_10 = Math.max(100, (limitsScenario2.EDU_10 || 360) - halfRelief);
  limitsScenario2.FER_5 = Math.max(50, (limitsScenario2.FER_5 || 180) - (reliefAmt - halfRelief));
  limitsScenario2.NEC_55 = (limitsScenario2.NEC_55 || 2000) + reliefAmt;

  proposals.push({
    id: 'prop-reequilibrio-necessidades',
    title: `Aportar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reliefAmt)} em Necessidades Básicas (NEC 55%)`,
    subtitle: 'Alivia a pressão dos custos habitacionais e parcelas fixas',
    badge: 'Alívio de Teto 🛡️',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
    transfers: [
      {
        fromJarId: 'EDU_10',
        fromJarName: 'Educação Continuada',
        toJarId: 'NEC_55',
        toJarName: 'Necessidades Básicas (NEC 55%)',
        amount: halfRelief,
        reason: 'Compensa o volume concentrado de moradia com verba não consumida em cursos.'
      },
      {
        fromJarId: 'FER_5',
        fromJarName: 'Férias & Doações',
        toJarId: 'NEC_55',
        toJarName: 'Necessidades Básicas (NEC 55%)',
        amount: reliefAmt - halfRelief,
        reason: 'Reorienta verba de lazer futuro para cobrir gastos reais do presente.'
      }
    ],
    totalTransferred: reliefAmt,
    rationale: `Necessidades Básicas consumiu R$ ${necJar?.spentLast30Days.toFixed(2) || '3.050,00'} nos últimos 30 dias. Realocar R$ ${reliefAmt.toFixed(2)} das categorias ociosas expande o teto de NEC para R$ ${limitsScenario2.NEC_55.toFixed(2)}, trazendo a execução orçamentária para a conformidade.`,
    impactDescription: `Teto de Necessidades expandido para R$ ${limitsScenario2.NEC_55.toFixed(2)}, reduzindo o alerta de estouro sem contrair novas dívidas.`,
    proposedLimits: limitsScenario2,
    targetPriority: 'necessidades_reequilibrio'
  });

  // =========================================================================
  // CENÁRIO 3: Acelerar Liberdade Financeira (LIF 10%)
  // Direciona sobras para investimentos de renda passiva
  // =========================================================================
  const lifInvestAmt = Math.min(250, Math.floor(totalSurplusAvailable * 0.5));
  const limitsScenario3 = { ...baseLimits };
  limitsScenario3.EDU_10 = Math.max(100, (limitsScenario3.EDU_10 || 360) - Math.floor(lifInvestAmt * 0.6));
  limitsScenario3.FER_5 = Math.max(50, (limitsScenario3.FER_5 || 180) - Math.floor(lifInvestAmt * 0.4));
  limitsScenario3.LIF_10 = (limitsScenario3.LIF_10 || 360) + lifInvestAmt;

  proposals.push({
    id: 'prop-acelerar-investimentos',
    title: `Direcionar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lifInvestAmt)} para Liberdade Financeira (LIF 10%)`,
    subtitle: 'Potencializa aportes para juros compostos e dividendos',
    badge: 'Patrimônio 📈',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
    transfers: [
      {
        fromJarId: 'EDU_10',
        fromJarName: 'Educação Continuada',
        toJarId: 'LIF_10',
        toJarName: 'Liberdade Financeira (LIF 10%)',
        amount: Math.floor(lifInvestAmt * 0.6),
        reason: 'Verba ociosa de capacitação convertida em ativos geradores de renda passiva.'
      },
      {
        fromJarId: 'FER_5',
        fromJarName: 'Férias & Doações',
        toJarId: 'LIF_10',
        toJarName: 'Liberdade Financeira (LIF 10%)',
        amount: Math.floor(lifInvestAmt * 0.4),
        reason: 'Parcela de férias canalizada para acelerar a meta de independência.'
      }
    ],
    totalTransferred: lifInvestAmt,
    rationale: `Ao manter o saldo consolidado positivo em +R$ ${currentBalance.toFixed(2)}, você tem margem para antecipar aportes de Liberdade Financeira antes do fim do mês, colhendo rendimentos imediatos.`,
    impactDescription: `Teto de Liberdade Financeira atinge R$ ${limitsScenario3.LIF_10.toFixed(2)}, estimulando aportes automáticos de longo prazo.`,
    proposedLimits: limitsScenario3,
    targetPriority: 'investimentos_lif'
  });

  const bestProposal = proposals[0];

  const headlineInsight = underutilizedJars.length > 0
    ? `Identificados R$ ${totalSurplusAvailable.toFixed(2)} em ${underutilizedJars.length} potes subutilizados nos últimos 30 dias.`
    : `Orçamento dos 6 potes perfeitamente alinhado com o consumo dos últimos 30 dias.`;

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    effectiveIncomeBase: Math.round(effectiveIncomeBase * 100) / 100,
    totalSurplusAvailable: Math.round(totalSurplusAvailable * 100) / 100,
    totalDeficit: Math.round(totalDeficit * 100) / 100,
    jarsAnalysis,
    underutilizedJars,
    overspentJars,
    proposals,
    bestProposal,
    headlineInsight,
    referencePeriodLabel: 'Últimos 30 dias'
  };
}
