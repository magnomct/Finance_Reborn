import { DreamGoal, Transaction } from '../types';

export type NetWorthPeriodFilter = '3M' | '6M' | '12M' | 'ALL';

export interface MonthlyNetWorthPoint {
  index: number;
  month: string; // YYYY-MM
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g., "Out/26"
  fullMonthLabel: string; // e.g., "Outubro de 2026"
  date: Date;
  pfBalance: number;
  meiBalance: number;
  goalsBalance: number;
  totalNetWorth: number;
  pfCumulativeBalance: number;
  meiCumulativeReserve: number;
  goalsCumulativeBalance: number;
  totalNetWorthBRL: number;
  monthlyDeltaBRL: number;
  monthlyDeltaPct: number;
  isSimulated: boolean;
}

export interface MonthlyNetWorthSummary {
  points: MonthlyNetWorthPoint[];
  allPointsCount: number;
  period: NetWorthPeriodFilter;
  currentNetWorthBRL: number;
  currentBreakdown: {
    pfBalance: number;
    meiReserve: number;
    goalsBalance: number;
  };
  periodGrowthBRL: number;
  periodGrowthPct: number;
  averageMonthlyEvolutionBRL: number;
  bestMonth: MonthlyNetWorthPoint | null;
  worstMonth: MonthlyNetWorthPoint | null;
  isPositiveTrend: boolean;
  isUsingFallbackDataset: boolean;
}

const PT_BR_MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const PT_BR_MONTH_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function formatMonthKeyLabels(monthKey: string): {
  monthLabel: string;
  fullMonthLabel: string;
  date: Date;
} {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr) || 2026;
  const monthIdx = Math.max(0, Math.min(11, (Number(monthStr) || 1) - 1));
  const shortYear = String(year).slice(-2);
  return {
    monthLabel: `${PT_BR_MONTH_SHORT[monthIdx]}/${shortYear}`,
    fullMonthLabel: `${PT_BR_MONTH_FULL[monthIdx]} de ${year}`,
    date: new Date(year, monthIdx, 1),
  };
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr) || 2026;
  const monthIdx = (Number(monthStr) || 1) - 1;
  const shifted = new Date(year, monthIdx + deltaMonths, 1);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatCompactAxisBRL(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const num = abs / 1_000_000;
    const formatted = Number.isInteger(num) ? String(num) : num.toFixed(1).replace('.', ',');
    return `${sign}R$ ${formatted}M`;
  }
  if (abs >= 1000) {
    const num = abs / 1000;
    const formatted = Math.abs(num - Math.round(num)) < 0.05
      ? String(Math.round(num))
      : num.toFixed(1).replace('.', ',');
    return `${sign}R$ ${formatted}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatSignedPercentPtBR(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe > 0 ? '+' : safe < 0 ? '-' : '';
  const absFormatted = Math.abs(safe).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${absFormatted}%`;
}

export interface NetWorthMonthlySeriesItem {
  monthKey?: string;
  saldoPF?: number;
  caixaMEI?: number;
  saldoMetas?: number;
  pfCumulativeBalance?: number;
  meiCumulativeReserve?: number;
  goalsCumulativeBalance?: number;
}

export interface ConsolidatedNetWorthKPIs {
  currentNetWorth: number;
  breakdown: {
    pf: number;
    mei: number;
    goals: number;
  };
  breakdownWeights: {
    pfPct: number;
    meiPct: number;
    goalsPct: number;
  };
  periodGrowthBRL: number;
  periodGrowthPct: number;
  monthlyAvgEvolutionBRL: number;
  isPositive: boolean;
  monthsCount: number;
  intervalsCount: number;
}

export function calculateConsolidatedNetWorthKPIs(
  monthlySeries: NetWorthMonthlySeriesItem[]
): ConsolidatedNetWorthKPIs {
  if (!Array.isArray(monthlySeries) || monthlySeries.length === 0) {
    return {
      currentNetWorth: 0,
      breakdown: { pf: 0, mei: 0, goals: 0 },
      breakdownWeights: { pfPct: 0, meiPct: 0, goalsPct: 0 },
      periodGrowthBRL: 0,
      periodGrowthPct: 0,
      monthlyAvgEvolutionBRL: 0,
      isPositive: true,
      monthsCount: 0,
      intervalsCount: 1,
    };
  }

  const normalized = monthlySeries.map(item => {
    const pf = roundCurrency(item.saldoPF ?? item.pfCumulativeBalance ?? 0);
    const mei = roundCurrency(item.caixaMEI ?? item.meiCumulativeReserve ?? 0);
    const goals = roundCurrency(item.saldoMetas ?? item.goalsCumulativeBalance ?? 0);
    return {
      pf,
      mei,
      goals,
      patrimonioMes: roundCurrency(pf + mei + goals),
    };
  });

  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  const currentNetWorth = last.patrimonioMes;
  const breakdown = {
    pf: last.pf,
    mei: last.mei,
    goals: last.goals,
  };

  // Proportional composition weights (clamped >= 0 for visual bar segments)
  const posPf = Math.max(0, breakdown.pf);
  const posMei = Math.max(0, breakdown.mei);
  const posGoals = Math.max(0, breakdown.goals);
  const positiveSum = posPf + posMei + posGoals;

  const breakdownWeights =
    positiveSum > 0
      ? {
          pfPct: roundCurrency((posPf / positiveSum) * 100),
          meiPct: roundCurrency((posMei / positiveSum) * 100),
          goalsPct: roundCurrency((posGoals / positiveSum) * 100),
        }
      : { pfPct: 0, meiPct: 0, goalsPct: 0 };

  const patrimonioInicial = first.patrimonioMes;
  const patrimonioFinal = last.patrimonioMes;

  const variacaoBRL =
    normalized.length > 1 ? roundCurrency(patrimonioFinal - patrimonioInicial) : 0;

  let periodGrowthPct = 0;
  if (normalized.length > 1) {
    if (patrimonioInicial > 0) {
      periodGrowthPct = roundCurrency((variacaoBRL / patrimonioInicial) * 100);
    } else if (patrimonioInicial === 0) {
      periodGrowthPct = variacaoBRL > 0 ? 100 : 0;
    } else {
      periodGrowthPct = roundCurrency((variacaoBRL / Math.abs(patrimonioInicial)) * 100);
    }
  }

  const intervalos = Math.max(1, normalized.length - 1);
  const monthlyAvgEvolutionBRL = roundCurrency(variacaoBRL / intervalos);

  return {
    currentNetWorth,
    breakdown,
    breakdownWeights,
    periodGrowthBRL: variacaoBRL,
    periodGrowthPct,
    monthlyAvgEvolutionBRL,
    isPositive: variacaoBRL >= 0,
    monthsCount: normalized.length,
    intervalsCount: intervalos,
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Realistic 12-month baseline (PF + Caixa MEI + Metas) when historical data is empty
 * or only contains a single active month.
 */
const REALISTIC_12M_MOCK_SERIES: Array<{
  pfDelta: number;
  meiDelta: number;
  goalsDelta: number;
}> = [
  { pfDelta: 350, meiDelta: 280, goalsDelta: 420 },
  { pfDelta: 520, meiDelta: 410, goalsDelta: 500 },
  { pfDelta: -180, meiDelta: 310, goalsDelta: 380 },
  { pfDelta: 410, meiDelta: 390, goalsDelta: 450 },
  { pfDelta: 620, meiDelta: 480, goalsDelta: 520 },
  { pfDelta: 380, meiDelta: 440, goalsDelta: 550 },
  { pfDelta: 290, meiDelta: 510, goalsDelta: 600 },
  { pfDelta: 460, meiDelta: 370, goalsDelta: 580 },
  { pfDelta: -120, meiDelta: 420, goalsDelta: 620 },
  { pfDelta: 580, meiDelta: 650, goalsDelta: 740 },
  { pfDelta: 490, meiDelta: 540, goalsDelta: 680 },
  { pfDelta: 610, meiDelta: 620, goalsDelta: 750 },
];

interface RawMonthFlow {
  monthKey: string;
  pfBalance: number;
  meiReserve: number;
  goalsBalance: number;
  isSimulated: boolean;
}

function buildMocked12MonthTimeline(endMonthKey = '2026-10'): RawMonthFlow[] {
  let pf = 2150;
  let mei = 1850;
  let goals = 2200;

  return REALISTIC_12M_MOCK_SERIES.map((step, idx) => {
    const offset = idx - (REALISTIC_12M_MOCK_SERIES.length - 1);
    const monthKey = shiftMonthKey(endMonthKey, offset);
    pf = roundCurrency(pf + step.pfDelta);
    mei = roundCurrency(mei + step.meiDelta);
    goals = roundCurrency(goals + step.goalsDelta);
    return {
      monthKey,
      pfBalance: pf,
      meiReserve: mei,
      goalsBalance: goals,
      isSimulated: true,
    };
  });
}

function extractTxMonths(transactions: Transaction[]): Map<string, { pfNet: number; meiNet: number }> {
  const map = new Map<string, { pfNet: number; meiNet: number }>();

  for (const tx of transactions) {
    if (!tx.date || tx.date.length < 7) continue;
    const monthKey = tx.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;

    const current = map.get(monthKey) || { pfNet: 0, meiNet: 0 };
    const signedAmount =
      tx.type === 'despesa'
        ? -Math.abs(tx.amount)
        : Math.abs(tx.amount);

    if (tx.jar === 'PJ_EXCLUIDO' || tx.costCenter === 'PJ') {
      current.meiNet = roundCurrency(current.meiNet + signedAmount);
    } else {
      current.pfNet = roundCurrency(current.pfNet + signedAmount);
    }

    map.set(monthKey, current);
  }

  return map;
}

function extractGoalContributionMonths(dreams: DreamGoal[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const dream of dreams) {
    if (!dream.contributionsHistory || dream.contributionsHistory.length === 0) continue;
    for (const contrib of dream.contributionsHistory) {
      if (!contrib.date || contrib.date.length < 7) continue;
      const monthKey = contrib.date.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
      map.set(monthKey, roundCurrency((map.get(monthKey) || 0) + Math.max(0, contrib.amount)));
    }
  }

  return map;
}

export function buildMonthlyNetWorthSeries(options: {
  transactions?: Transaction[];
  dreams?: DreamGoal[];
  period?: NetWorthPeriodFilter;
  anchorMonthKey?: string;
}): MonthlyNetWorthSummary {
  const {
    transactions = [],
    dreams = [],
    period = '12M',
    anchorMonthKey = '2026-10',
  } = options;

  const txByMonth = extractTxMonths(transactions);
  const goalContribByMonth = extractGoalContributionMonths(dreams);
  const totalCurrentGoalsBalance = roundCurrency(
    dreams.reduce((sum, d) => sum + Math.max(0, d.current || 0), 0)
  );

  let rawTimeline: RawMonthFlow[] = [];
  let isUsingFallbackDataset = false;

  if (transactions.length === 0 && dreams.length === 0) {
    isUsingFallbackDataset = true;
    rawTimeline = buildMocked12MonthTimeline(anchorMonthKey);
  } else {
    const distinctMonths = Array.from(
      new Set([...txByMonth.keys(), ...goalContribByMonth.keys()])
    ).sort();

    if (distinctMonths.length >= 2) {
      // Pure chronological consolidation directly from multi-month history
      let accPf = 0;
      let accMei = 0;
      let accGoals = 0;

      // Distribute baseline goal balance not backed by contributionsHistory onto first month
      const totalLoggedGoalContrib = Array.from(goalContribByMonth.values()).reduce((a, b) => a + b, 0);
      const unloggedGoalsBase = Math.max(0, roundCurrency(totalCurrentGoalsBalance - totalLoggedGoalContrib));

      rawTimeline = distinctMonths.map((mk, idx) => {
        const txFlow = txByMonth.get(mk) || { pfNet: 0, meiNet: 0 };
        const goalFlow = goalContribByMonth.get(mk) || 0;

        accPf = roundCurrency(accPf + txFlow.pfNet);
        accMei = roundCurrency(accMei + txFlow.meiNet);
        accGoals = roundCurrency(accGoals + goalFlow + (idx === 0 ? unloggedGoalsBase : 0));

        return {
          monthKey: mk,
          pfBalance: accPf,
          meiReserve: accMei,
          goalsBalance: accGoals,
          isSimulated: false,
        };
      });
    } else {
      // Single active month (e.g. initial Yupee workspace in 2026-10) or goals-only state:
      // Backfill 11 preceding historical months anchored smoothly to the live month's balances.
      const latestMonth = distinctMonths[0] || anchorMonthKey;
      const latestFlow = txByMonth.get(latestMonth) || { pfNet: 0, meiNet: 0 };
      const mocked = buildMocked12MonthTimeline(latestMonth);

      // Anchor historical trajectory before latest month, then apply live latestMonth net flow + live dreams total
      const prevBaseline = mocked[mocked.length - 2];
      const basePfBeforeLatest = prevBaseline ? prevBaseline.pfBalance : 5200;
      const baseMeiBeforeLatest = prevBaseline ? prevBaseline.meiReserve : 6200;
      const baseGoalsBeforeLatest = Math.max(
        0,
        roundCurrency(totalCurrentGoalsBalance - (dreams.reduce((s, d) => s + (d.monthlyDeposit || 0), 0) * 0.45))
      );

      // Rebuild preceding 11 months of goals accumulation cleanly toward baseGoalsBeforeLatest
      const goalStart = Math.max(200, roundCurrency(baseGoalsBeforeLatest * 0.32));
      const goalSpan = Math.max(0, baseGoalsBeforeLatest - goalStart);

      rawTimeline = mocked.map((m, idx) => {
        if (idx < mocked.length - 1) {
          const progress = mocked.length > 2 ? idx / (mocked.length - 2) : 1;
          const goalsAtIdx = dreams.length > 0
            ? roundCurrency(goalStart + goalSpan * progress)
            : m.goalsBalance;
          return {
            monthKey: m.monthKey,
            pfBalance: m.pfBalance,
            meiReserve: m.meiReserve,
            goalsBalance: goalsAtIdx,
            isSimulated: true,
          };
        }

        // Final (current live) month reflects real live PF + MEI flows and real Dreams balance
        return {
          monthKey: latestMonth,
          pfBalance: roundCurrency(basePfBeforeLatest + latestFlow.pfNet),
          meiReserve: roundCurrency(baseMeiBeforeLatest + latestFlow.meiNet),
          goalsBalance: dreams.length > 0 ? totalCurrentGoalsBalance : m.goalsBalance,
          isSimulated: false,
        };
      });
    }
  }

  // Compute full series with month-over-month deltas BEFORE slicing by period
  // so the first visible point in 3M/6M still knows its delta vs the previous month!
  const allPoints: MonthlyNetWorthPoint[] = rawTimeline.map((item, idx) => {
    const total = roundCurrency(item.pfBalance + item.meiReserve + item.goalsBalance);
    const prevTotal =
      idx > 0
        ? roundCurrency(
            rawTimeline[idx - 1].pfBalance +
              rawTimeline[idx - 1].meiReserve +
              rawTimeline[idx - 1].goalsBalance
          )
        : total;

    const deltaBRL = idx > 0 ? roundCurrency(total - prevTotal) : 0;
    const deltaPct =
      idx > 0 && Math.abs(prevTotal) > 0.01
        ? roundCurrency((deltaBRL / Math.abs(prevTotal)) * 100)
        : 0;

    const labels = formatMonthKeyLabels(item.monthKey);

    return {
      index: idx,
      month: item.monthKey,
      monthKey: item.monthKey,
      monthLabel: labels.monthLabel,
      fullMonthLabel: labels.fullMonthLabel,
      date: labels.date,
      pfBalance: item.pfBalance,
      meiBalance: item.meiReserve,
      goalsBalance: item.goalsBalance,
      totalNetWorth: total,
      pfCumulativeBalance: item.pfBalance,
      meiCumulativeReserve: item.meiReserve,
      goalsCumulativeBalance: item.goalsBalance,
      totalNetWorthBRL: total,
      monthlyDeltaBRL: deltaBRL,
      monthlyDeltaPct: deltaPct,
      isSimulated: item.isSimulated,
    };
  });

  // Slice according to selected period
  let visiblePoints = allPoints;
  if (period === '3M') visiblePoints = allPoints.slice(-3);
  else if (period === '6M') visiblePoints = allPoints.slice(-6);
  else if (period === '12M') visiblePoints = allPoints.slice(-12);

  // Re-index visiblePoints cleanly for D3 point indexing
  const points = visiblePoints.map((pt, idx) => ({ ...pt, index: idx }));

  const first = points[0];
  const last = points[points.length - 1];

  const currentNetWorthBRL = last ? last.totalNetWorthBRL : 0;
  const firstNetWorthBRL = first ? first.totalNetWorthBRL : 0;

  const periodGrowthBRL =
    points.length > 1 ? roundCurrency(currentNetWorthBRL - firstNetWorthBRL) : 0;
  const periodGrowthPct =
    points.length > 1 && Math.abs(firstNetWorthBRL) > 0.01
      ? roundCurrency((periodGrowthBRL / Math.abs(firstNetWorthBRL)) * 100)
      : 0;

  // Average monthly evolution across transitions in the visible period (or delta steps)
  const deltaPoints = points.length > 1 ? points.slice(1) : points;
  const averageMonthlyEvolutionBRL =
    deltaPoints.length > 0
      ? roundCurrency(
          deltaPoints.reduce((sum, p) => sum + p.monthlyDeltaBRL, 0) / deltaPoints.length
        )
      : 0;

  // Best & worst growth months within visible period (preferring points after index 0 if >= 2 points)
  const candidatesForExtremes = points.length > 1 ? points.slice(1) : points;
  let bestMonth: MonthlyNetWorthPoint | null = candidatesForExtremes[0] || null;
  let worstMonth: MonthlyNetWorthPoint | null = candidatesForExtremes[0] || null;

  for (const pt of candidatesForExtremes) {
    if (bestMonth && pt.monthlyDeltaBRL > bestMonth.monthlyDeltaBRL) {
      bestMonth = pt;
    }
    if (worstMonth && pt.monthlyDeltaBRL < worstMonth.monthlyDeltaBRL) {
      worstMonth = pt;
    }
  }

  return {
    points,
    allPointsCount: allPoints.length,
    period,
    currentNetWorthBRL,
    currentBreakdown: {
      pfBalance: last ? last.pfCumulativeBalance : 0,
      meiReserve: last ? last.meiCumulativeReserve : 0,
      goalsBalance: last ? last.goalsCumulativeBalance : 0,
    },
    periodGrowthBRL,
    periodGrowthPct,
    averageMonthlyEvolutionBRL,
    bestMonth,
    worstMonth,
    isPositiveTrend: periodGrowthBRL >= 0,
    isUsingFallbackDataset,
  };
}
