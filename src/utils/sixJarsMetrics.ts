import { JarType, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';

export type SixJarStatus = 'ok' | 'atencao' | 'estourado';

export const SIX_JAR_KEYS: JarType[] = [
  'NEC_55',
  'LIF_10',
  'PLP_10',
  'EDU_10',
  'DIV_10',
  'FER_5',
];

export const DEFAULT_SIX_JAR_PERCENTAGES: Record<Exclude<JarType, 'PJ_EXCLUIDO'>, number> = {
  NEC_55: 55,
  LIF_10: 10,
  PLP_10: 10,
  EDU_10: 10,
  DIV_10: 10,
  FER_5: 5,
};

// Keep #f43f5e strictly reserved for overspent ('estourado') alert slices
const SIX_JAR_CHART_COLORS: Record<Exclude<JarType, 'PJ_EXCLUIDO'>, string> = {
  NEC_55: '#3B82F6',
  LIF_10: '#10B981',
  PLP_10: '#6366F1',
  EDU_10: '#F59E0B',
  DIV_10: '#A855F7',
  FER_5: '#06B6D4',
};

export interface SixJarMetricItem {
  id: JarType;
  name: string;
  shortName: string;
  desc: string;
  colorHex: string;
  limiteMetaPct: number;
  limiteMetaBRL: number;
  gastoRealBRL: number;
  gastoRealPctDaRenda: number;
  percentualConsumoDoPote: number;
  saldoLivreBRL: number;
  valorExcedidoBRL: number;
  status: SixJarStatus;
}

export interface SixJarsInnerRingDatum {
  id: JarType;
  name: string;
  shortName: string;
  value: number;
  limiteMetaPct: number;
  limiteMetaBRL: number;
  colorHex: string;
}

export interface SixJarsOuterRingDatum {
  id: JarType | 'SALDO_LIVRE';
  name: string;
  shortName: string;
  value: number;
  pctDaRenda: number;
  colorHex: string;
  isOver: boolean;
  isFreeBalance: boolean;
  status: SixJarStatus | 'saldo_livre';
  jarItem: SixJarMetricItem | null;
}

export interface SixJarRebalanceAlert {
  overBudgetJar: SixJarMetricItem;
  bestDonorJar: SixJarMetricItem | null;
  excessAmountBRL: number;
  message: string;
}

export interface CalculateSixJarsMetricsOptions {
  monthKey?: string;
  usePjProfitInPf?: boolean;
  customIncomeBase?: number;
  customPercentages?: Partial<Record<JarType, number>>;
}

export interface SixJarsMetricsResult {
  monthKey: string;
  availableMonths: string[];
  computedRendaLiquidaMensal: number;
  rendaLiquidaMensal: number;
  isUsingCustomIncomeBase: boolean;
  cltIncomeBRL: number;
  pjRepasseLiquidoBRL: number;
  totalGastoBRL: number;
  totalGastoPctDaRenda: number;
  saldoLivreRendaBRL: number;
  excessoTotalRendaBRL: number;
  jars: SixJarMetricItem[];
  overBudgetJars: SixJarMetricItem[];
  warningJars: SixJarMetricItem[];
  okJars: SixJarMetricItem[];
  bestDonorJar: SixJarMetricItem | null;
  rebalanceAlerts: SixJarRebalanceAlert[];
  innerRingData: SixJarsInnerRingDatum[];
  outerRingData: SixJarsOuterRingDatum[];
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function formatPctPtBr(pct: number, decimals: number = 1): string {
  return pct.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrencyPtBr(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function extractMonthKey(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

export function getAvailableMonthsFromTransactions(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): string[] {
  const currentMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const set = new Set<string>();
  transactions.forEach(t => {
    const ym = extractMonthKey(t.date);
    if (ym) set.add(ym);
  });
  set.add(currentMonth);
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function resolveActiveSixJarsMonth(
  transactions: Transaction[],
  requestedMonthKey?: string,
  referenceDate: Date = new Date()
): string {
  if (requestedMonthKey) return requestedMonthKey;
  const currentMonth = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const hasCurrentMonthTxs = transactions.some(t => extractMonthKey(t.date) === currentMonth);
  if (hasCurrentMonthTxs) return currentMonth;

  const txMonths = transactions
    .map(t => extractMonthKey(t.date))
    .filter((m): m is string => m !== null)
    .sort((a, b) => b.localeCompare(a));

  return txMonths[0] || currentMonth;
}

export function formatMonthLabelPtBr(monthKey: string): string {
  if (monthKey === 'ALL') return 'Todos os Meses';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  if (!year || monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${names[monthIdx]} / ${year}`;
}

/**
 * Computes 6 Jars monthly allocation metrics comparing configured percentage limits
 * against real accumulated spending in the target month.
 */
export function calculateSixJarsMetrics(
  transactions: Transaction[],
  options: CalculateSixJarsMetricsOptions = {}
): SixJarsMetricsResult {
  const {
    monthKey: requestedMonthKey,
    usePjProfitInPf = true,
    customIncomeBase,
    customPercentages,
  } = options;

  const availableMonths = getAvailableMonthsFromTransactions(transactions);
  const monthKey = resolveActiveSixJarsMonth(transactions, requestedMonthKey);

  const monthTransactions =
    monthKey === 'ALL'
      ? transactions
      : transactions.filter(t => extractMonthKey(t.date) === monthKey);

  // 1. Net Monthly Income (Entradas PF + Repasses/Lucro Líquido MEI)
  const cltIncomeBRL = round2(
    monthTransactions
      .filter(t => t.type === 'receita' && t.costCenter !== 'PJ')
      .reduce((acc, t) => acc + Math.max(0, t.amount), 0)
  );

  const pjGrossIncome = monthTransactions
    .filter(t => t.type === 'receita' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + Math.max(0, t.amount), 0);

  const pjOperatingExpenses = monthTransactions
    .filter(t => t.type === 'despesa' && t.costCenter === 'PJ')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const pjNetProfit = round2(Math.max(0, pjGrossIncome - pjOperatingExpenses));
  const pjRepasseLiquidoBRL = usePjProfitInPf ? pjNetProfit : 0;

  const computedRendaLiquidaMensal = round2(cltIncomeBRL + pjRepasseLiquidoBRL);
  const hasValidCustomIncome =
    typeof customIncomeBase === 'number' &&
    Number.isFinite(customIncomeBase) &&
    customIncomeBase > 0;

  const rendaLiquidaMensal = hasValidCustomIncome
    ? round2(customIncomeBase)
    : computedRendaLiquidaMensal;

  // 2. Per-Jar calculations
  const jars: SixJarMetricItem[] = SIX_JAR_KEYS.map(key => {
    const def = JAR_DEFINITIONS[key];
    const chartColor = SIX_JAR_CHART_COLORS[key as Exclude<JarType, 'PJ_EXCLUIDO'>] || def?.colorHex || '#3B82F6';
    const defaultPct = DEFAULT_SIX_JAR_PERCENTAGES[key as Exclude<JarType, 'PJ_EXCLUIDO'>] ?? 10;
    const rawPct = customPercentages?.[key];
    const limiteMetaPct =
      typeof rawPct === 'number' && Number.isFinite(rawPct) && rawPct >= 0
        ? round1(rawPct)
        : defaultPct;

    const limiteMetaBRL = round2((limiteMetaPct / 100) * rendaLiquidaMensal);

    const expensesSum = monthTransactions
      .filter(t => t.jar === key && t.type === 'despesa')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const refundsSum = monthTransactions
      .filter(t => t.jar === key && t.type === 'reembolso')
      .reduce((acc, t) => acc + Math.max(0, t.amount), 0);

    const gastoRealBRL = round2(Math.max(0, expensesSum - refundsSum));

    const gastoRealPctDaRenda =
      rendaLiquidaMensal > 0
        ? round1((gastoRealBRL / rendaLiquidaMensal) * 100)
        : 0;

    const percentualConsumoDoPote =
      limiteMetaBRL > 0
        ? round1((gastoRealBRL / limiteMetaBRL) * 100)
        : gastoRealBRL > 0
        ? 999
        : 0;

    let status: SixJarStatus = 'ok';
    if (gastoRealBRL > limiteMetaBRL + 0.005 || percentualConsumoDoPote > 100) {
      status = 'estourado';
    } else if (percentualConsumoDoPote >= 85) {
      status = 'atencao';
    }

    const saldoLivreBRL = round2(Math.max(0, limiteMetaBRL - gastoRealBRL));
    const valorExcedidoBRL = round2(Math.max(0, gastoRealBRL - limiteMetaBRL));

    return {
      id: key,
      name: def?.name || key,
      shortName: def?.shortName || key,
      desc: def?.desc || '',
      colorHex: chartColor,
      limiteMetaPct,
      limiteMetaBRL,
      gastoRealBRL,
      gastoRealPctDaRenda,
      percentualConsumoDoPote,
      saldoLivreBRL,
      valorExcedidoBRL,
      status,
    };
  });

  const totalGastoBRL = round2(jars.reduce((acc, j) => acc + j.gastoRealBRL, 0));
  const totalGastoPctDaRenda =
    rendaLiquidaMensal > 0
      ? round1((totalGastoBRL / rendaLiquidaMensal) * 100)
      : 0;
  const saldoLivreRendaBRL = round2(Math.max(0, rendaLiquidaMensal - totalGastoBRL));
  const excessoTotalRendaBRL = round2(Math.max(0, totalGastoBRL - rendaLiquidaMensal));

  const overBudgetJars = jars
    .filter(j => j.status === 'estourado')
    .sort((a, b) => b.valorExcedidoBRL - a.valorExcedidoBRL);
  const warningJars = jars.filter(j => j.status === 'atencao');
  const okJars = jars.filter(j => j.status === 'ok');

  const donorCandidates = jars
    .filter(j => j.saldoLivreBRL > 0)
    .sort((a, b) => b.saldoLivreBRL - a.saldoLivreBRL);
  const bestDonorJar = donorCandidates[0] || null;

  // 3. Visual Over-Budget Alert & Rebalancing Suggestion
  const rebalanceAlerts: SixJarRebalanceAlert[] = overBudgetJars.map(overJar => {
    const donor =
      donorCandidates.find(d => d.id !== overJar.id) || bestDonorJar;

    const compensationClause = donor
      ? `congele novos gastos neste pote ou compense usando a folga disponível em ${donor.name} (${formatCurrencyPtBr(donor.saldoLivreBRL)} livres).`
      : 'congele novos gastos neste pote e revise o orçamento mensal para reequilibrar suas contas.';

    const message = `Limite Ultrapassado: Você consumiu ${formatPctPtBr(overJar.gastoRealPctDaRenda)}% da renda no pote ${overJar.name} (meta máxima: ${formatPctPtBr(overJar.limiteMetaPct, 0)}%, excesso de ${formatCurrencyPtBr(overJar.valorExcedidoBRL)}). Para fechar o mês no azul, ${compensationClause}`;

    return {
      overBudgetJar: overJar,
      bestDonorJar: donor,
      excessAmountBRL: overJar.valorExcedidoBRL,
      message,
    };
  });

  // 4. Concentric Donut Ring Datasets (Recharts PieChart)
  const innerRingData: SixJarsInnerRingDatum[] = jars.map(jar => ({
    id: jar.id,
    name: jar.name,
    shortName: jar.shortName,
    value: jar.limiteMetaPct > 0 ? jar.limiteMetaPct : 0.1,
    limiteMetaPct: jar.limiteMetaPct,
    limiteMetaBRL: jar.limiteMetaBRL,
    colorHex: jar.colorHex,
  }));

  const outerRingData: SixJarsOuterRingDatum[] = jars
    .filter(jar => jar.gastoRealBRL > 0)
    .map(jar => ({
      id: jar.id,
      name: jar.name,
      shortName: jar.shortName,
      value: jar.gastoRealBRL,
      pctDaRenda: jar.gastoRealPctDaRenda,
      colorHex: jar.status === 'estourado' ? '#f43f5e' : jar.colorHex,
      isOver: jar.status === 'estourado',
      isFreeBalance: false,
      status: jar.status,
      jarItem: jar,
    }));

  if (saldoLivreRendaBRL > 0 || outerRingData.length === 0) {
    const freeValue = saldoLivreRendaBRL > 0 ? saldoLivreRendaBRL : Math.max(rendaLiquidaMensal, 1);
    const freePct =
      rendaLiquidaMensal > 0
        ? round1((saldoLivreRendaBRL / rendaLiquidaMensal) * 100)
        : 100;
    outerRingData.push({
      id: 'SALDO_LIVRE',
      name: 'Saldo Livre',
      shortName: 'Saldo Livre',
      value: freeValue,
      pctDaRenda: freePct,
      colorHex: '#cbd5e1',
      isOver: false,
      isFreeBalance: true,
      status: 'saldo_livre',
      jarItem: null,
    });
  }

  return {
    monthKey,
    availableMonths,
    computedRendaLiquidaMensal,
    rendaLiquidaMensal,
    isUsingCustomIncomeBase: hasValidCustomIncome,
    cltIncomeBRL,
    pjRepasseLiquidoBRL,
    totalGastoBRL,
    totalGastoPctDaRenda,
    saldoLivreRendaBRL,
    excessoTotalRendaBRL,
    jars,
    overBudgetJars,
    warningJars,
    okJars,
    bestDonorJar,
    rebalanceAlerts,
    innerRingData,
    outerRingData,
  };
}
