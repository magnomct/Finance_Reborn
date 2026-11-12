import { Transaction } from '../types';
import { REALISTIC_12M_PJ_DATA } from './pjMarginMetrics';

export const MEI_ANNUAL_CEILING = 81000.00; // Teto Anual MEI: R$ 81.000,00
export const MEI_TOLERANCE_20PCT_CEILING = 97200.00; // Tolerância 20%: R$ 97.200,00
export const MEI_MONTHLY_SAFE_PACE = 6750.00; // Média Segura: R$ 6.750,00 / mês
export const SALARIO_MINIMO_2026 = 1518.00; // Salário mínimo de referência

export type MEIActivityType = 'servicos' | 'comercio' | 'ambos';
export type MEIIRPFMode = 'presuncao_32' | 'livro_caixa_100';

export interface MEIDasPresetConfig {
  id: MEIActivityType;
  name: string;
  amount: number;
  description: string;
}

export const MEI_DAS_PRESETS: Record<MEIActivityType, MEIDasPresetConfig> = {
  servicos: {
    id: 'servicos',
    name: 'Serviços (ISS)',
    amount: 80.90,
    description: 'INSS (5% SM) + R$ 5,00 ISS municipal',
  },
  comercio: {
    id: 'comercio',
    name: 'Comércio (ICMS)',
    amount: 76.90,
    description: 'INSS (5% SM) + R$ 1,00 ICMS estadual',
  },
  ambos: {
    id: 'ambos',
    name: 'Comércio & Serviços',
    amount: 81.90,
    description: 'INSS (5% SM) + R$ 1 ICMS + R$ 5 ISS',
  },
};

export interface MEIMonthlySummary {
  month: string; // YYYY-MM
  monthShort: string;
  revenue: number;
  costs: number;
  das: number;
  netProfit: number;
}

export interface MEIMetrics {
  year: number;
  referenceMonth: string; // YYYY-MM
  // Monitor de Teto Anual
  annualCeiling: number;
  annualToleranceCeiling: number;
  ytdRevenue: number;
  remainingAnnualQuota: number;
  consumedPct: number;
  monthsElapsed: number;
  monthsRemaining: number;
  recommendedMonthlyQuota: number;
  projectedAnnualTotal: number;
  exceedStatus: 'safe' | 'warning_projection' | 'in_tolerance' | 'exceeded_tolerance';
  statusBadge: {
    label: string;
    color: 'emerald' | 'amber' | 'rose';
    description: string;
  };
  
  // DAS Fixo
  dasConfig: MEIDasPresetConfig;
  dasAmount: number;
  isDasPaidThisMonth: boolean;
  dasDueDate: string;
  
  // Operação do Mês Atual
  currentMonthRevenue: number;
  currentMonthOperatingCosts: number;
  pjReservePct: number;
  pjReserveAmount: number;
  totalNetProfitTransferable: number;
  
  // Divisão IRPF
  irpfMode: MEIIRPFMode;
  baseWithdrawal: number; // 1. Retirada Base / Pró-labore
  exemptProfitDistribution: number; // 2. Parcela Isenta de IRPF
  totalPayoutPF: number; // baseWithdrawal + exemptProfitDistribution
  
  // Histórico de Meses do Ano Corrente
  months: MEIMonthlySummary[];
  
  // Status de Lançamento no Extrato PF
  isAlreadyLoggedThisMonth: boolean;
  loggedBaseTxId?: string;
  loggedExemptTxId?: string;
}

export interface CalculateMEIOptions {
  referenceMonth?: string; // e.g. '2026-10'
  activityType?: MEIActivityType;
  pjReservePct?: number; // 0 to 30%
  irpfMode?: MEIIRPFMode;
  customBaseWithdrawal?: number; // Optional custom pró-labore base
}

/**
 * Checks if the MEI transfer for the given month has already been logged into PF transactions.
 */
export function isMEITransferLoggedForMonth(
  transactions: Transaction[] = [],
  referenceMonth: string = '2026-10'
): { isLogged: boolean; baseTx?: Transaction; exemptTx?: Transaction } {
  const matchingTxs = transactions.filter(t => {
    if (!t.date || !t.date.startsWith(referenceMonth)) return false;
    if (t.type !== 'receita') return false;
    const desc = (t.description || '').toLowerCase();
    return desc.includes('transferência mei') || desc.includes('transferencia mei') || desc.includes('retirada mei');
  });

  const baseTx = matchingTxs.find(t => t.description.toLowerCase().includes('retirada base'));
  const exemptTx = matchingTxs.find(t => t.description.toLowerCase().includes('lucro isento'));

  return {
    isLogged: matchingTxs.length >= 2 || Boolean(baseTx && exemptTx),
    baseTx,
    exemptTx,
  };
}

/**
 * Calculates MEI financial indicators, annual ceiling consumption, fixed DAS, and PF payout split.
 */
export function calculateMEIMetrics(
  transactions: Transaction[] = [],
  options: CalculateMEIOptions = {}
): MEIMetrics {
  const {
    referenceMonth = '2026-10',
    activityType = 'servicos',
    pjReservePct = 10,
    irpfMode = 'presuncao_32',
    customBaseWithdrawal,
  } = options;

  const [yearStr, monthStr] = referenceMonth.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const currentMonthNum = parseInt(monthStr, 10) || 10;

  const dasConfig = MEI_DAS_PRESETS[activityType] || MEI_DAS_PRESETS.servicos;

  // 1. Group PJ transactions by month for the current year
  const pjTxByMonth: Record<string, { revenue: number; costs: number; dasPaid: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const k = `${year}-${String(m).padStart(2, '0')}`;
    pjTxByMonth[k] = { revenue: 0, costs: 0, dasPaid: 0 };
  }

  transactions.forEach(t => {
    if (t.costCenter !== 'PJ' || !t.date || !t.date.startsWith(`${year}-`)) return;
    const k = t.date.slice(0, 7);
    if (!pjTxByMonth[k]) return;

    const amount = Math.abs(t.amount);
    if (t.type === 'receita') {
      pjTxByMonth[k].revenue += amount;
    } else if (t.type === 'despesa') {
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const isDas = desc.includes('das') || desc.includes('simples') || desc.includes('tributo') || cat.includes('imposto');
      if (isDas) {
        pjTxByMonth[k].dasPaid += amount;
      } else {
        pjTxByMonth[k].costs += amount;
      }
    }
  });

  // 2. Build 12-month data with fallback to realistic data if prior months have 0 raw records
  const months: MEIMonthlySummary[] = [];
  let ytdRevenue = 0;

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  for (let m = 1; m <= 12; m++) {
    const k = `${year}-${String(m).padStart(2, '0')}`;
    const real = pjTxByMonth[k];
    const mock = REALISTIC_12M_PJ_DATA.find(item => item.month === k);

    let rev = real.revenue;
    let costs = real.costs;
    let das = real.dasPaid > 0 ? real.dasPaid : (rev > 0 ? dasConfig.amount : 0);

    // If historical month prior to current month is completely empty in real txs, blend mock data
    if (rev === 0 && m <= currentMonthNum && mock) {
      rev = mock.grossRevenue;
      costs = mock.operatingCosts;
      das = dasConfig.amount;
    }

    if (m <= currentMonthNum) {
      ytdRevenue += rev;
    }

    const netProfit = Math.max(0, rev - costs - das);

    months.push({
      month: k,
      monthShort: `${monthNames[m - 1]}/${String(year).slice(2)}`,
      revenue: rev,
      costs,
      das,
      netProfit,
    });
  }

  // Current month metrics
  const currentMonthData = months[currentMonthNum - 1] || {
    month: referenceMonth,
    monthShort: `${monthNames[currentMonthNum - 1]}/${String(year).slice(2)}`,
    revenue: 0,
    costs: 0,
    das: dasConfig.amount,
    netProfit: 0,
  };

  const currentMonthRevenue = currentMonthData.revenue;
  const currentMonthOperatingCosts = currentMonthData.costs;

  // Check if DAS was paid in current month
  const rawDasPaid = pjTxByMonth[referenceMonth]?.dasPaid || 0;
  const isDasPaidThisMonth = rawDasPaid > 0;
  const dasAmount = isDasPaidThisMonth ? rawDasPaid : dasConfig.amount;
  const dasDueDate = `${referenceMonth}-20`;

  // Annual Ceiling Monitor
  const remainingAnnualQuota = Math.max(0, MEI_ANNUAL_CEILING - ytdRevenue);
  const consumedPct = MEI_ANNUAL_CEILING > 0
    ? Math.min(100, parseFloat(((ytdRevenue / MEI_ANNUAL_CEILING) * 100).toFixed(1)))
    : 0;

  const monthsElapsed = currentMonthNum;
  const monthsRemaining = Math.max(0, 12 - monthsElapsed);
  const recommendedMonthlyQuota = monthsRemaining > 0 ? remainingAnnualQuota / monthsRemaining : 0;
  const projectedAnnualTotal = monthsElapsed > 0 ? (ytdRevenue / monthsElapsed) * 12 : ytdRevenue;

  let exceedStatus: 'safe' | 'warning_projection' | 'in_tolerance' | 'exceeded_tolerance' = 'safe';
  let statusBadge: MEIMetrics['statusBadge'] = {
    label: 'Dentro do Teto MEI',
    color: 'emerald',
    description: `Faturamento seguro. Restam ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingAnnualQuota)} em notas até dezembro.`,
  };

  if (ytdRevenue > MEI_TOLERANCE_20PCT_CEILING) {
    exceedStatus = 'exceeded_tolerance';
    statusBadge = {
      label: 'Excedeu Tolerância (> 20%)',
      color: 'rose',
      description: 'Ultrapassou R$ 97.200,00. Desenquadramento imediato e retroativo para o Simples Nacional.',
    };
  } else if (ytdRevenue > MEI_ANNUAL_CEILING) {
    exceedStatus = 'in_tolerance';
    statusBadge = {
      label: 'Faixa de Tolerância (Até +20%)',
      color: 'amber',
      description: 'Ultrapassou R$ 81.000,00. Desenquadra a partir de janeiro do próximo ano (recolhe DAS complementar sobre o excesso).',
    };
  } else if (projectedAnnualTotal > MEI_ANNUAL_CEILING) {
    exceedStatus = 'warning_projection';
    statusBadge = {
      label: 'Atenção à Projeção Anual',
      color: 'amber',
      description: `Ritmo anual projeta faturar ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedAnnualTotal)}, acima do limite de R$ 81.000.`,
    };
  }

  // Reserve & Net Profit Transferable
  const clampedReservePct = Math.max(0, Math.min(30, pjReservePct));
  const pjReserveAmount = currentMonthRevenue * (clampedReservePct / 100);

  const totalNetProfitTransferable = Math.max(
    0,
    currentMonthRevenue - dasAmount - currentMonthOperatingCosts - pjReserveAmount
  );

  // IRPF Division Modes
  let baseWithdrawal = 0;
  let exemptProfitDistribution = 0;

  if (irpfMode === 'presuncao_32') {
    // Mode 1: Regra Padrão (Presunção de 32% para Serviços)
    // Parcela Isenta = 32% do Faturamento Bruto (limitado ao lucro transferível)
    exemptProfitDistribution = Math.min(totalNetProfitTransferable, currentMonthRevenue * 0.32);
    // Retirada Base (Tributável para IRPF) = saldo restante
    baseWithdrawal = Math.max(0, totalNetProfitTransferable - exemptProfitDistribution);
  } else {
    // Mode 2: Livro Caixa / Contabilidade (100% Lucro Líquido Isento)
    // Retirada base definida (ex: 1 salário mínimo ou customizado)
    const targetBase = customBaseWithdrawal !== undefined ? customBaseWithdrawal : SALARIO_MINIMO_2026;
    baseWithdrawal = Math.min(totalNetProfitTransferable, targetBase);
    exemptProfitDistribution = Math.max(0, totalNetProfitTransferable - baseWithdrawal);
  }

  const roundedTransferable = parseFloat(totalNetProfitTransferable.toFixed(2));
  const roundedExempt = parseFloat(exemptProfitDistribution.toFixed(2));
  const roundedBase = parseFloat(Math.max(0, roundedTransferable - roundedExempt).toFixed(2));
  const totalPayoutPF = parseFloat((roundedBase + roundedExempt).toFixed(2));

  // Check if already logged this month
  const logCheck = isMEITransferLoggedForMonth(transactions, referenceMonth);

  return {
    year,
    referenceMonth,
    annualCeiling: MEI_ANNUAL_CEILING,
    annualToleranceCeiling: MEI_TOLERANCE_20PCT_CEILING,
    ytdRevenue: parseFloat(ytdRevenue.toFixed(2)),
    remainingAnnualQuota: parseFloat(remainingAnnualQuota.toFixed(2)),
    consumedPct,
    monthsElapsed,
    monthsRemaining,
    recommendedMonthlyQuota: parseFloat(recommendedMonthlyQuota.toFixed(2)),
    projectedAnnualTotal: parseFloat(projectedAnnualTotal.toFixed(2)),
    exceedStatus,
    statusBadge,
    dasConfig,
    dasAmount,
    isDasPaidThisMonth,
    dasDueDate,
    currentMonthRevenue,
    currentMonthOperatingCosts,
    pjReservePct: clampedReservePct,
    pjReserveAmount: parseFloat(pjReserveAmount.toFixed(2)),
    totalNetProfitTransferable: roundedTransferable,
    irpfMode,
    baseWithdrawal: roundedBase,
    exemptProfitDistribution: roundedExempt,
    totalPayoutPF,
    months,
    isAlreadyLoggedThisMonth: logCheck.isLogged,
    loggedBaseTxId: logCheck.baseTx?.id,
    loggedExemptTxId: logCheck.exemptTx?.id,
  };
}
