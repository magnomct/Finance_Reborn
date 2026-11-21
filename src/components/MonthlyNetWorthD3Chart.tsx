import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Wallet,
  Calendar,
  Activity,
  Layers,
  User,
  Briefcase,
  Target,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import {
  calculateConsolidatedNetWorthKPIs,
  MonthlyNetWorthPoint,
  ConsolidatedNetWorthKPIs,
} from '../utils/finance';
import {
  buildMonthlyNetWorthSeries,
  formatCompactAxisBRL,
  formatMonthKeyLabels,
  MonthlyNetWorthPoint as ChartNetWorthPoint,
  NetWorthPeriodFilter,
  shiftMonthKey,
} from '../utils/monthlyNetWorth';
import { safeGetStorage, isValidTransactionArray, isValidDreamArray } from '../utils/storage';

export type NetWorthScope = 'CONSOLIDATED' | 'PF' | 'MEI' | 'GOALS';
export type NetWorthChartMode = 'line' | 'stacked';

export interface ScopedChartNetWorthPoint extends ChartNetWorthPoint {
  consolidatedTotalNetWorthBRL: number;
  scopeSharePct: number;
  isProjected?: boolean;
  projectionStep?: number;
}

interface ScopeMetaConfig {
  id: NetWorthScope;
  label: string;
  ariaLabel: string;
  kpi1Title: string;
  tooltipTitle: string;
  positiveHex: string;
  pillActiveClass: string;
  badgeClass: string;
  barClass: string;
  kpi2CardClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SCOPE_CONFIG: Record<NetWorthScope, ScopeMetaConfig> = {
  CONSOLIDATED: {
    id: 'CONSOLIDATED',
    label: 'Consolidado',
    ariaLabel: 'Visualizar patrimônio consolidado (PF + MEI + Metas)',
    kpi1Title: 'Patrimônio Consolidado',
    tooltipTitle: 'Patrimônio Consolidado',
    positiveHex: '#10b981',
    pillActiveClass:
      'bg-emerald-600 text-white shadow-xs',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
    kpi2CardClass:
      'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/60',
    icon: Layers,
  },
  PF: {
    id: 'PF',
    label: 'Apenas PF',
    ariaLabel: 'Filtrar apenas saldo acumulado Pessoa Física',
    kpi1Title: 'Saldo Acumulado PF',
    tooltipTitle: 'Saldo Acumulado PF',
    positiveHex: '#6366f1',
    pillActiveClass:
      'bg-indigo-600 text-white shadow-xs',
    badgeClass:
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    barClass: 'bg-indigo-500',
    kpi2CardClass:
      'bg-indigo-50/45 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/60',
    icon: User,
  },
  MEI: {
    id: 'MEI',
    label: 'Apenas MEI',
    ariaLabel: 'Filtrar apenas reserva de caixa MEI / PJ',
    kpi1Title: 'Reserva Caixa MEI',
    tooltipTitle: 'Reserva Caixa MEI',
    positiveHex: '#0ea5e9',
    pillActiveClass:
      'bg-sky-600 text-white shadow-xs',
    badgeClass:
      'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    barClass: 'bg-sky-500',
    kpi2CardClass:
      'bg-sky-50/45 dark:bg-sky-950/20 border-sky-200/70 dark:border-sky-900/60',
    icon: Briefcase,
  },
  GOALS: {
    id: 'GOALS',
    label: 'Apenas Metas',
    ariaLabel: 'Filtrar apenas saldo em Metas e Potes',
    kpi1Title: 'Saldo em Metas & Potes',
    tooltipTitle: 'Saldo em Metas & Potes',
    positiveHex: '#8b5cf6',
    pillActiveClass:
      'bg-violet-600 text-white shadow-xs',
    badgeClass:
      'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
    barClass: 'bg-violet-500',
    kpi2CardClass:
      'bg-violet-50/45 dark:bg-violet-950/20 border-violet-200/70 dark:border-violet-900/60',
    icon: Target,
  },
};

const SCOPE_OPTIONS: ScopeMetaConfig[] = [
  SCOPE_CONFIG.CONSOLIDATED,
  SCOPE_CONFIG.PF,
  SCOPE_CONFIG.MEI,
  SCOPE_CONFIG.GOALS,
];

type StackedLayerKey = 'pfBalance' | 'meiBalance' | 'goalsBalance';

const STACKED_LAYERS: Array<{
  key: StackedLayerKey;
  label: string;
  color: string;
}> = [
  { key: 'pfBalance', label: 'Saldo PF', color: '#6366f1' },
  { key: 'meiBalance', label: 'Caixa MEI', color: '#0ea5e9' },
  { key: 'goalsBalance', label: 'Metas & Potes', color: '#8b5cf6' },
];

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPct = (val: number) =>
  `${val >= 0 ? '+' : ''}${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

const formatSharePct = (val: number) =>
  `${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

const roundCurrency = (val: number): number => {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
};

export function projectScopedNetWorthSeries(
  filteredSeries: ChartNetWorthPoint[],
  activeScope: NetWorthScope
): ScopedChartNetWorthPoint[] {
  return filteredSeries.map((pt, idx) => {
    const consolidatedTotal = roundCurrency(
      pt.totalNetWorth ?? pt.pfBalance + pt.meiBalance + pt.goalsBalance
    );

    const projected =
      activeScope === 'PF'
        ? {
            ...pt,
            meiBalance: 0,
            goalsBalance: 0,
            meiCumulativeReserve: 0,
            goalsCumulativeBalance: 0,
            totalNetWorth: roundCurrency(pt.pfBalance),
            totalNetWorthBRL: roundCurrency(pt.pfBalance),
          }
        : activeScope === 'MEI'
          ? {
              ...pt,
              pfBalance: 0,
              goalsBalance: 0,
              pfCumulativeBalance: 0,
              goalsCumulativeBalance: 0,
              totalNetWorth: roundCurrency(pt.meiBalance),
              totalNetWorthBRL: roundCurrency(pt.meiBalance),
            }
          : activeScope === 'GOALS'
            ? {
                ...pt,
                pfBalance: 0,
                meiBalance: 0,
                pfCumulativeBalance: 0,
                meiCumulativeReserve: 0,
                totalNetWorth: roundCurrency(pt.goalsBalance),
                totalNetWorthBRL: roundCurrency(pt.goalsBalance),
              }
            : {
                ...pt,
                totalNetWorth: consolidatedTotal,
                totalNetWorthBRL: consolidatedTotal,
              };

    const rawSharePct =
      activeScope === 'CONSOLIDATED'
        ? 100
        : Math.abs(consolidatedTotal) > 0.01
          ? roundCurrency((projected.totalNetWorthBRL / Math.abs(consolidatedTotal)) * 100)
          : 0;

    let monthlyDeltaBRL = pt.monthlyDeltaBRL;
    let monthlyDeltaPct = pt.monthlyDeltaPct;

    if (activeScope !== 'CONSOLIDATED') {
      if (idx === 0) {
        monthlyDeltaBRL = 0;
        monthlyDeltaPct = 0;
      } else {
        const prevRaw = filteredSeries[idx - 1];
        const prevTotal = roundCurrency(
          activeScope === 'PF'
            ? prevRaw.pfBalance
            : activeScope === 'MEI'
              ? prevRaw.meiBalance
              : prevRaw.goalsBalance
        );
        monthlyDeltaBRL = roundCurrency(projected.totalNetWorthBRL - prevTotal);
        if (Math.abs(prevTotal) > 0.01) {
          monthlyDeltaPct = roundCurrency((monthlyDeltaBRL / Math.abs(prevTotal)) * 100);
        } else if (monthlyDeltaBRL !== 0) {
          monthlyDeltaPct = monthlyDeltaBRL > 0 ? 100 : -100;
        } else {
          monthlyDeltaPct = 0;
        }
      }
    }

    return {
      ...projected,
      monthlyDeltaBRL,
      monthlyDeltaPct,
      consolidatedTotalNetWorthBRL: consolidatedTotal,
      scopeSharePct: Number.isFinite(rawSharePct) ? rawSharePct : 0,
      isProjected: false,
    };
  });
}

/**
 * Appends `steps` (default 3) future monthly projection points using
 * `currentNetWorth + (monthlyAvgEvolutionBRL * step)`.
 */
export function buildNetWorthProjectionPoints(
  scopedSeries: ScopedChartNetWorthPoint[],
  monthlyAvgEvolutionBRL: number,
  steps: number = 3
): ScopedChartNetWorthPoint[] {
  if (!Array.isArray(scopedSeries) || scopedSeries.length === 0 || steps <= 0) {
    return [];
  }

  const last = scopedSeries[scopedSeries.length - 1];
  const safeAvg = Number.isFinite(monthlyAvgEvolutionBRL) ? monthlyAvgEvolutionBRL : 0;
  const currentTotal = last.totalNetWorthBRL;

  // Determine layer weights so projected stacked balances sum to projectedTotal
  const baseSum = last.pfBalance + last.meiBalance + last.goalsBalance;
  const pfWeight = Math.abs(baseSum) > 0.01 ? last.pfBalance / baseSum : 1;
  const meiWeight = Math.abs(baseSum) > 0.01 ? last.meiBalance / baseSum : 0;
  const goalsWeight = Math.abs(baseSum) > 0.01 ? last.goalsBalance / baseSum : 0;

  const result: ScopedChartNetWorthPoint[] = [];
  let prevTotal = currentTotal;

  for (let step = 1; step <= steps; step++) {
    const nextMonthKey = shiftMonthKey(last.month, step);
    const labels = formatMonthKeyLabels(nextMonthKey);
    const projectedTotal = roundCurrency(currentTotal + safeAvg * step);
    const pfProj = roundCurrency(last.pfBalance + safeAvg * step * pfWeight);
    const meiProj = roundCurrency(last.meiBalance + safeAvg * step * meiWeight);
    const goalsProj = roundCurrency(projectedTotal - pfProj - meiProj);

    const deltaBRL = roundCurrency(projectedTotal - prevTotal);
    const deltaPct =
      Math.abs(prevTotal) > 0.01
        ? roundCurrency((deltaBRL / Math.abs(prevTotal)) * 100)
        : deltaBRL !== 0
          ? deltaBRL > 0
            ? 100
            : -100
          : 0;

    prevTotal = projectedTotal;

    result.push({
      index: scopedSeries.length + step - 1,
      month: nextMonthKey,
      monthKey: nextMonthKey,
      monthLabel: `${labels.monthLabel}`,
      fullMonthLabel: `${labels.fullMonthLabel} (Projeção M+${step})`,
      date: labels.date,
      pfBalance: pfProj,
      meiBalance: meiProj,
      goalsBalance: goalsProj,
      totalNetWorth: projectedTotal,
      pfCumulativeBalance: pfProj,
      meiCumulativeReserve: meiProj,
      goalsCumulativeBalance: goalsProj,
      totalNetWorthBRL: projectedTotal,
      monthlyDeltaBRL: deltaBRL,
      monthlyDeltaPct: deltaPct,
      consolidatedTotalNetWorthBRL: projectedTotal,
      scopeSharePct: last.scopeSharePct,
      isSimulated: true,
      isProjected: true,
      projectionStep: step,
    });
  }

  // Ensure weights sum cleanly on edge cases
  void goalsWeight;
  return result;
}

export interface MonthlyNetWorthD3ChartProps {
  data?: MonthlyNetWorthPoint[];
  transactions?: Transaction[];
  dreams?: DreamGoal[];
  defaultPeriod?: NetWorthPeriodFilter;
  defaultScope?: NetWorthScope;
  anchorMonthKey?: string;
  className?: string;
}

interface TooltipHoverState {
  point: ScopedChartNetWorthPoint;
  xPx: number;
  yPx: number;
  containerWidth: number;
}

const PERIOD_OPTIONS: Array<{ id: NetWorthPeriodFilter; label: string; ariaLabel: string }> = [
  { id: '3M', label: '3M', ariaLabel: 'Filtrar últimos 3 meses' },
  { id: '6M', label: '6M', ariaLabel: 'Filtrar últimos 6 meses' },
  { id: '12M', label: '12M', ariaLabel: 'Filtrar últimos 12 meses' },
  { id: 'ALL', label: 'Tudo', ariaLabel: 'Filtrar todo o histórico patrimonial' },
];

export const MonthlyNetWorthD3Chart: React.FC<MonthlyNetWorthD3ChartProps> = ({
  data,
  transactions = [],
  dreams = [],
  defaultPeriod = '12M',
  defaultScope = 'CONSOLIDATED',
  anchorMonthKey = '2026-10',
  className = '',
}) => {
  const [period, setPeriod] = useState<NetWorthPeriodFilter>(defaultPeriod);
  const [activeScope, setActiveScope] = useState<NetWorthScope>(defaultScope);
  const [chartViewMode, setChartViewMode] = useState<NetWorthChartMode>('line');
  const [showProjection, setShowProjection] = useState<boolean>(false);
  const [highlightedLayer, setHighlightedLayer] = useState<StackedLayerKey | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoveredInfo, setHoveredInfo] = useState<TooltipHoverState | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = 'netWorthGradient';

  const hasExplicitDataProp = data !== undefined;

  const resolvedData = useMemo(() => {
    let effectiveTx = transactions;
    let effectiveDreams = dreams;

    if (
      !hasExplicitDataProp &&
      effectiveTx.length === 0 &&
      effectiveDreams.length === 0
    ) {
      effectiveTx = safeGetStorage<Transaction[]>('yupee_transactions_v2', [], isValidTransactionArray);
      effectiveDreams = safeGetStorage<DreamGoal[]>('yupee_dreams_v2', [], isValidDreamArray);
    }

    return { effectiveTx, effectiveDreams };
  }, [hasExplicitDataProp, transactions, dreams]);

  const allPoints: ChartNetWorthPoint[] = useMemo(() => {
    if (hasExplicitDataProp) {
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
      return sorted.map((item, idx) => {
        const pf = roundCurrency(Number(item.pfBalance) || 0);
        const mei = roundCurrency(Number(item.meiBalance) || 0);
        const goals = roundCurrency(Number(item.goalsBalance) || 0);
        const total =
          item.totalNetWorth !== undefined && Number.isFinite(item.totalNetWorth)
            ? roundCurrency(item.totalNetWorth)
            : roundCurrency(pf + mei + goals);

        const prevItem = idx > 0 ? sorted[idx - 1] : null;
        const prevTotal = prevItem
          ? prevItem.totalNetWorth !== undefined && Number.isFinite(prevItem.totalNetWorth)
            ? roundCurrency(prevItem.totalNetWorth)
            : roundCurrency(
                (Number(prevItem.pfBalance) || 0) +
                  (Number(prevItem.meiBalance) || 0) +
                  (Number(prevItem.goalsBalance) || 0)
              )
          : total;

        const deltaBRL = idx > 0 ? roundCurrency(total - prevTotal) : 0;
        const deltaPct =
          idx > 0 && Math.abs(prevTotal) > 0.01
            ? roundCurrency((deltaBRL / Math.abs(prevTotal)) * 100)
            : idx > 0 && prevTotal === 0 && deltaBRL !== 0
              ? deltaBRL > 0
                ? 100
                : -100
              : 0;

        const labels = formatMonthKeyLabels(item.month);

        return {
          index: idx,
          month: item.month,
          monthKey: item.month,
          monthLabel: labels.monthLabel,
          fullMonthLabel: labels.fullMonthLabel,
          date: labels.date,
          pfBalance: pf,
          meiBalance: mei,
          goalsBalance: goals,
          totalNetWorth: total,
          pfCumulativeBalance: pf,
          meiCumulativeReserve: mei,
          goalsCumulativeBalance: goals,
          totalNetWorthBRL: total,
          monthlyDeltaBRL: deltaBRL,
          monthlyDeltaPct: deltaPct,
          isSimulated: false,
        };
      });
    }

    return buildMonthlyNetWorthSeries({
      transactions: resolvedData.effectiveTx,
      dreams: resolvedData.effectiveDreams,
      period: 'ALL',
      anchorMonthKey,
    }).points;
  }, [hasExplicitDataProp, data, resolvedData, anchorMonthKey]);

  const filteredSeries: ChartNetWorthPoint[] = useMemo(() => {
    const sliced =
      period === '3M'
        ? allPoints.slice(-3)
        : period === '6M'
          ? allPoints.slice(-6)
          : period === '12M'
            ? allPoints.slice(-12)
            : allPoints;
    return sliced.map((pt, idx) => ({ ...pt, index: idx }));
  }, [allPoints, period]);

  const scopedSeries: ScopedChartNetWorthPoint[] = useMemo(() => {
    return projectScopedNetWorthSeries(filteredSeries, activeScope);
  }, [filteredSeries, activeScope]);

  const kpis: ConsolidatedNetWorthKPIs = useMemo(() => {
    return calculateConsolidatedNetWorthKPIs(scopedSeries);
  }, [scopedSeries]);

  const projectionPoints: ScopedChartNetWorthPoint[] = useMemo(() => {
    if (!showProjection || scopedSeries.length === 0) return [];
    return buildNetWorthProjectionPoints(scopedSeries, kpis.monthlyAvgEvolutionBRL, 3);
  }, [showProjection, scopedSeries, kpis.monthlyAvgEvolutionBRL]);

  const combinedSeries: ScopedChartNetWorthPoint[] = useMemo(() => {
    if (projectionPoints.length === 0) return scopedSeries;
    return [...scopedSeries, ...projectionPoints];
  }, [scopedSeries, projectionPoints]);

  const effectiveStackedMode = activeScope === 'CONSOLIDATED' && chartViewMode === 'stacked';
  const scopeMeta = SCOPE_CONFIG[activeScope];
  const latestScopedPoint = scopedSeries[scopedSeries.length - 1] ?? null;

  const bestMonthDisplay = useMemo(() => {
    if (!kpis.bestMonth) return null;
    const labels = formatMonthKeyLabels(kpis.bestMonth.month);
    return {
      ...kpis.bestMonth,
      monthLabel: labels.monthLabel,
      fullMonthLabel: labels.fullMonthLabel,
    };
  }, [kpis.bestMonth]);

  // Observe container width dynamically for true D3 responsiveness
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(el.getBoundingClientRect().width);
      if (nextWidth > 0) {
        setContainerWidth(prev => (prev !== nextWidth ? nextWidth : prev));
      }
    };

    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const measured = Math.floor(entry.contentRect.width);
          if (measured > 0) {
            setContainerWidth(prev => (prev !== measured ? measured : prev));
          }
        }
      });
      observer.observe(el);
    }

    window.addEventListener('resize', updateWidth);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [scopedSeries.length]);

  // Clear hover tooltip cleanly whenever period, scope, mode, or underlying data changes
  useEffect(() => {
    setHoveredInfo(null);
  }, [period, activeScope, chartViewMode, showProjection, scopedSeries.length]);

  const activeHexColor = kpis.isPositive ? scopeMeta.positiveHex : '#f43f5e';

  // D3 rendering pass (isolated to SVG ref, handles 0-point, 1-point, line, stacked, and +3M projection)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    if (containerWidth <= 0 || scopedSeries.length === 0) {
      svg.selectAll('*').remove();
      return;
    }

    svg.selectAll('*').remove();

    const isMobile = containerWidth < 520;
    const chartHeight = isMobile ? 260 : 320;
    const margin = {
      top: 22,
      right: isMobile ? 16 : 28,
      bottom: 36,
      left: isMobile ? 58 : 70,
    };

    const innerWidth = Math.max(120, containerWidth - margin.left - margin.right);
    const innerHeight = Math.max(120, chartHeight - margin.top - margin.bottom);

    svg
      .attr('width', containerWidth)
      .attr('height', chartHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${chartHeight}`)
      .attr('role', 'img')
      .attr(
        'aria-label',
        `Gráfico patrimonial (${scopeMeta.label}) de ${combinedSeries[0].monthLabel} até ${combinedSeries[combinedSeries.length - 1].monthLabel}`
      );

    const histPoints = scopedSeries;
    const allPlotPoints = combinedSeries;
    const strokeColor = activeHexColor;

    // Gradient definition
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', strokeColor)
      .attr('stop-opacity', 0.28);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', strokeColor)
      .attr('stop-opacity', 0.0);

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (safe for 1 point by padding +/-15 days so point sits cleanly centered without NaN)
    let minDate = allPlotPoints[0].date;
    let maxDate = allPlotPoints[allPlotPoints.length - 1].date;
    if (allPlotPoints.length === 1 || minDate.getTime() === maxDate.getTime()) {
      minDate = d3.timeDay.offset(minDate, -15);
      maxDate = d3.timeDay.offset(maxDate, 15);
    }

    const xScale = d3
      .scaleTime()
      .domain([minDate, maxDate])
      .range([0, innerWidth]);

    // Stack computation if stacked mode
    const stackGenerator = d3
      .stack<ScopedChartNetWorthPoint>()
      .keys(['pfBalance', 'meiBalance', 'goalsBalance'])
      .offset(d3.stackOffsetDiverging);

    const stackedHistSeries = effectiveStackedMode ? stackGenerator(histPoints) : [];

    // Y Scale domain (covers single curve, stacked layers, and +3M projection)
    let rawMin = d3.min(allPlotPoints, d => d.totalNetWorthBRL) ?? 0;
    let rawMax = d3.max(allPlotPoints, d => d.totalNetWorthBRL) ?? 1000;

    if (effectiveStackedMode && stackedHistSeries.length > 0) {
      const stackMin = d3.min(stackedHistSeries, layer => d3.min(layer, d => d[0])) ?? 0;
      const stackMax = d3.max(stackedHistSeries, layer => d3.max(layer, d => d[1])) ?? 1000;
      rawMin = Math.min(rawMin, stackMin);
      rawMax = Math.max(rawMax, stackMax);
    }

    const yMin = rawMin < 0 ? rawMin * 1.15 : 0;
    let yMax = rawMax > 0 ? Math.max(100, rawMax * 1.12) : Math.max(100, rawMax * 0.9);
    if (!Number.isFinite(yMax) || yMax <= yMin) {
      yMax = yMin + 1000;
    }

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .nice(5)
      .range([innerHeight, 0]);

    const [niceYMin, niceYMax] = yScale.domain();
    const baselineValue = Math.max(niceYMin, Math.min(niceYMax, 0));

    // Horizontal gridlines
    const gridAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    const gridGroup = rootGroup
      .append('g')
      .attr('class', 'd3-grid-lines text-slate-200 dark:text-slate-700/70')
      .call(gridAxis);

    gridGroup.select('.domain').remove();
    gridGroup
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.85);

    // Compact Y-Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => formatCompactAxisBRL(Number(d)));

    const yAxisGroup = rootGroup
      .append('g')
      .attr('class', 'd3-y-axis text-slate-500 dark:text-slate-400')
      .call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums');

    // X-Axis labels (includes projected months when enabled)
    const stepModulo =
      containerWidth < 460 && allPlotPoints.length > 6
        ? 3
        : containerWidth < 680 && allPlotPoints.length > 8
          ? 2
          : 1;

    const tickDates = allPlotPoints
      .filter((pt, idx) => {
        if (pt.isProjected) return true;
        if (stepModulo === 1) return true;
        if (idx === histPoints.length - 1) return true;
        const distFromEnd = histPoints.length - 1 - idx;
        if (distFromEnd === 1) return false;
        return idx % stepModulo === 0;
      })
      .map(p => p.date);

    const labelByTime = new Map<number, { label: string; isProjected: boolean }>();
    for (const p of allPlotPoints) {
      labelByTime.set(p.date.getTime(), {
        label: p.isProjected ? `${p.monthLabel}*` : p.monthLabel,
        isProjected: Boolean(p.isProjected),
      });
    }

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickDates)
      .tickSize(0)
      .tickPadding(12)
      .tickFormat(d => {
        const dt = d as Date;
        return labelByTime.get(dt.getTime())?.label ?? '';
      });

    const xAxisGroup = rootGroup
      .append('g')
      .attr('class', 'd3-x-axis text-slate-500 dark:text-slate-400')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').remove();
    xAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', d => {
        const dt = d as Date;
        return labelByTime.get(dt.getTime())?.isProjected ? '700' : '600';
      })
      .style('opacity', d => {
        const dt = d as Date;
        return labelByTime.get(dt.getTime())?.isProjected ? 0.72 : 1;
      });

    // =========================================================================
    // EDGE CASE: SINGLE-POINT MILESTONE RENDERING (NO COLLAPSED AXIS / NO NaN)
    // =========================================================================
    if (histPoints.length === 1 && !effectiveStackedMode) {
      const singlePt = histPoints[0];
      const cx = xScale(singlePt.date);
      const cy = yScale(singlePt.totalNetWorthBRL);

      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        // Horizontal dashed reference line
        rootGroup
          .append('line')
          .attr('class', 'd3-single-point-refline')
          .attr('data-testid', 'd3-single-point-refline')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', cy)
          .attr('y2', cy)
          .attr('stroke', strokeColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-opacity', 0.55);

        // Soft milestone halo
        rootGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 13)
          .attr('fill', strokeColor)
          .attr('fill-opacity', 0.16);

        // Centered milestone dot
        rootGroup
          .append('circle')
          .attr('class', 'd3-resting-dot d3-single-point-dot')
          .attr('data-testid', 'd3-single-point-dot')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 6)
          .attr('fill', strokeColor)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5);

        // Milestone value label above dot
        rootGroup
          .append('text')
          .attr('data-testid', 'd3-single-point-label')
          .attr('x', cx)
          .attr('y', Math.max(14, cy - 18))
          .attr('text-anchor', 'middle')
          .attr('fill', strokeColor)
          .style('font-size', '11px')
          .style('font-weight', '800')
          .text(`${singlePt.monthLabel}: ${formatBRL(singlePt.totalNetWorthBRL)}`);
      }
    } else if (effectiveStackedMode) {
      // =======================================================================
      // STACKED AREA MODE (d3.stack: PF #6366f1, MEI #0ea5e9, Metas #8b5cf6)
      // =======================================================================
      const stackColorMap: Record<string, string> = {
        pfBalance: '#6366f1',
        meiBalance: '#0ea5e9',
        goalsBalance: '#8b5cf6',
      };

      const stackedAreaGen = d3
        .area<d3.SeriesPoint<ScopedChartNetWorthPoint>>()
        .x(d => xScale(d.data.date))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      const stackedTopLineGen = d3
        .line<d3.SeriesPoint<ScopedChartNetWorthPoint>>()
        .x(d => xScale(d.data.date))
        .y(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      for (const layer of stackedHistSeries) {
        const layerKey = layer.key as StackedLayerKey;
        const layerColor = stackColorMap[layerKey] || '#10b981';
        const isDimmed = highlightedLayer !== null && highlightedLayer !== layerKey;

        rootGroup
          .append('path')
          .datum(layer)
          .attr('class', `d3-stacked-area d3-stacked-area-${layerKey}`)
          .attr('data-testid', `d3-stacked-area-${layerKey}`)
          .attr('fill', layerColor)
          .attr('fill-opacity', isDimmed ? 0.12 : 0.42)
          .attr('d', stackedAreaGen);

        rootGroup
          .append('path')
          .datum(layer)
          .attr('class', `d3-stacked-line d3-stacked-line-${layerKey}`)
          .attr('fill', 'none')
          .attr('stroke', layerColor)
          .attr('stroke-width', isDimmed ? 1 : 2)
          .attr('stroke-opacity', isDimmed ? 0.3 : 0.9)
          .attr('d', stackedTopLineGen);
      }

      // Resting dots along total consolidated curve
      rootGroup
        .selectAll('.d3-resting-dot')
        .data(histPoints)
        .enter()
        .append('circle')
        .attr('class', 'd3-resting-dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.totalNetWorthBRL))
        .attr('r', 3)
        .attr('fill', '#ffffff')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2);
    } else {
      // =======================================================================
      // SINGLE CURVE AREA + LINE MODE
      // =======================================================================
      const areaGenerator = d3
        .area<ScopedChartNetWorthPoint>()
        .x(d => xScale(d.date))
        .y0(() => yScale(baselineValue))
        .y1(d => yScale(d.totalNetWorthBRL))
        .curve(d3.curveMonotoneX);

      rootGroup
        .append('path')
        .datum(histPoints)
        .attr('class', 'd3-networth-area')
        .attr('fill', `url(#${gradientId})`)
        .attr('d', areaGenerator);

      const lineGenerator = d3
        .line<ScopedChartNetWorthPoint>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.totalNetWorthBRL))
        .curve(d3.curveMonotoneX);

      rootGroup
        .append('path')
        .datum(histPoints)
        .attr('class', 'd3-networth-line')
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', lineGenerator);

      rootGroup
        .selectAll('.d3-resting-dot')
        .data(histPoints)
        .enter()
        .append('circle')
        .attr('class', 'd3-resting-dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.totalNetWorthBRL))
        .attr('r', 3.5)
        .attr('fill', '#ffffff')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 2);
    }

    // =========================================================================
    // 3-MONTH DASHED FUTURE PROJECTION LINE (Projetar +3M)
    // =========================================================================
    if (showProjection && projectionPoints.length > 0 && histPoints.length > 0) {
      const projectionSegment = [histPoints[histPoints.length - 1], ...projectionPoints];

      const projectionLineGen = d3
        .line<ScopedChartNetWorthPoint>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.totalNetWorthBRL))
        .curve(d3.curveMonotoneX);

      rootGroup
        .append('path')
        .datum(projectionSegment)
        .attr('class', 'd3-networth-projection-line')
        .attr('data-testid', 'd3-networth-projection-line')
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.65)
        .attr('d', projectionLineGen);

      rootGroup
        .selectAll('.d3-projection-dot')
        .data(projectionPoints)
        .enter()
        .append('circle')
        .attr('class', 'd3-projection-dot')
        .attr('data-testid', 'd3-projection-dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.totalNetWorthBRL))
        .attr('r', 4)
        .attr('fill', '#ffffff')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.75);

      const finalProj = projectionPoints[projectionPoints.length - 1];
      const finalX = xScale(finalProj.date);
      const finalY = yScale(finalProj.totalNetWorthBRL);
      if (Number.isFinite(finalX) && Number.isFinite(finalY)) {
        rootGroup
          .append('text')
          .attr('x', Math.min(innerWidth, finalX))
          .attr('y', Math.max(12, finalY - 12))
          .attr('text-anchor', 'end')
          .attr('fill', strokeColor)
          .attr('opacity', 0.85)
          .style('font-size', '10px')
          .style('font-weight', '800')
          .text(`+3M: ${formatCompactAxisBRL(finalProj.totalNetWorthBRL)}`);
      }
    }

    // Interactive Crosshair (spans historical + projected points seamlessly)
    const crosshairGroup = rootGroup
      .append('g')
      .attr('class', 'focus-group d3-crosshair-group')
      .style('display', 'none')
      .style('pointer-events', 'none');

    const crosshairLine = crosshairGroup
      .append('line')
      .attr('class', 'd3-crosshair-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    const crosshairHalo = crosshairGroup
      .append('circle')
      .attr('r', 8)
      .attr('fill', strokeColor)
      .attr('opacity', 0.25);

    const crosshairCircle = crosshairGroup
      .append('circle')
      .attr('class', 'd3-crosshair-dot')
      .attr('r', 5)
      .attr('fill', strokeColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    const bisectDate = d3.bisector<ScopedChartNetWorthPoint, Date>(d => d.date).left;

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const [pointerX] = d3.pointer(event, overlayNode);
      const clampedX = Math.max(0, Math.min(innerWidth, pointerX));
      const xDate = xScale.invert(clampedX);

      let nearestPoint: ScopedChartNetWorthPoint;
      if (allPlotPoints.length === 1) {
        nearestPoint = allPlotPoints[0];
      } else {
        const idx = bisectDate(allPlotPoints, xDate, 1);
        const d0 = allPlotPoints[Math.max(0, idx - 1)];
        const d1 = allPlotPoints[Math.min(allPlotPoints.length - 1, idx)];
        nearestPoint =
          xDate.getTime() - d0.date.getTime() > d1.date.getTime() - xDate.getTime()
            ? d1
            : d0;
      }

      const targetX = xScale(nearestPoint.date);
      const targetY = yScale(nearestPoint.totalNetWorthBRL);

      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;

      crosshairGroup.style('display', null);
      crosshairLine.attr('x1', targetX).attr('x2', targetX);
      crosshairHalo.attr('cx', targetX).attr('cy', targetY);
      crosshairCircle.attr('cx', targetX).attr('cy', targetY);

      setHoveredInfo({
        point: nearestPoint,
        xPx: margin.left + targetX,
        yPx: margin.top + targetY,
        containerWidth,
      });
    };

    const handlePointerLeave = () => {
      crosshairGroup.style('display', 'none');
      setHoveredInfo(null);
    };

    const overlaySelection = rootGroup
      .append('rect')
      .attr('class', 'd3-interaction-overlay')
      .attr('data-testid', 'd3-networth-overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const overlayNode = overlaySelection.node();
    if (overlayNode) {
      overlaySelection
        .on('mousemove', event => handlePointerMove(event as MouseEvent))
        .on('touchstart', event => handlePointerMove(event as TouchEvent))
        .on('touchmove', event => handlePointerMove(event as TouchEvent))
        .on('mouseleave', handlePointerLeave);
    }
  }, [
    containerWidth,
    scopedSeries,
    combinedSeries,
    projectionPoints,
    effectiveStackedMode,
    showProjection,
    highlightedLayer,
    activeHexColor,
    scopeMeta.label,
    gradientId,
  ]);

  const isPositive = kpis.isPositive;
  const growthSign = kpis.periodGrowthBRL > 0 ? '+' : '';
  const growthPctFormatted = formatPct(kpis.periodGrowthPct);
  const avgSign = kpis.monthlyAvgEvolutionBRL > 0 ? '+' : '';

  // Compute safe edge-aware floating HTML tooltip coordinates
  const tooltipStyle = useMemo(() => {
    if (!hoveredInfo) return undefined;
    const tooltipWidth = hoveredInfo.containerWidth < 400 ? 236 : 276;
    const flipLeft =
      hoveredInfo.xPx > hoveredInfo.containerWidth * 0.65 ||
      hoveredInfo.xPx + tooltipWidth + 20 > hoveredInfo.containerWidth;
    const rawLeft = flipLeft
      ? hoveredInfo.xPx - tooltipWidth - 14
      : hoveredInfo.xPx + 14;
    const clampedLeft = Math.max(
      8,
      Math.min(hoveredInfo.containerWidth - tooltipWidth - 8, rawLeft)
    );
    const clampedTop = Math.max(8, Math.min(155, hoveredInfo.yPx - 36));
    return {
      left: `${clampedLeft}px`,
      top: `${clampedTop}px`,
      width: `${tooltipWidth}px`,
    };
  }, [hoveredInfo]);

  const singleLayerSharePct = latestScopedPoint ? latestScopedPoint.scopeSharePct : 0;
  const singleLayerBarWidth = Math.max(0, Math.min(100, singleLayerSharePct));

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-monthly-networth-d3"
    >
      {/* Header + Scope Filter Bar + Period Controls */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`p-1.5 rounded-xl ${
                isPositive
                  ? scopeMeta.badgeClass
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {activeScope === 'CONSOLIDATED'
                ? 'Consolidado PF + Caixa MEI + Potes/Metas'
                : `Camada Selecionada: ${scopeMeta.label}`}
            </span>
          </div>
          <h3
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
            data-testid="heading-monthly-networth-d3"
          >
            Evolução Patrimonial Mensal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curva acumulada do patrimônio líquido mês a mês. Filtre por camada ou passe o cursor para inspecionar.
          </p>
        </div>

        {/* Filter Controls: Layer Scope Pills + View Mode / Projection + Timeframe Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
          {/* 4-Button Layer Scope Selector */}
          <div
            className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
            role="group"
            aria-label="Filtro de camada patrimonial"
            data-testid="networth-scope-filter-group"
          >
            {SCOPE_OPTIONS.map(opt => {
              const active = activeScope === opt.id;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveScope(opt.id)}
                  aria-label={opt.ariaLabel}
                  aria-pressed={active}
                  data-testid={`btn-networth-scope-${opt.id}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? opt.pillActiveClass
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stacked Area & +3M Projection Controls when activeScope === 'CONSOLIDATED' */}
          {activeScope === 'CONSOLIDATED' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
                role="group"
                aria-label="Modo de visualização do gráfico"
              >
                <button
                  type="button"
                  onClick={() => setChartViewMode('line')}
                  aria-pressed={chartViewMode === 'line'}
                  data-testid="btn-networth-mode-line"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    chartViewMode === 'line'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Curva Única
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('stacked')}
                  aria-pressed={chartViewMode === 'stacked'}
                  data-testid="btn-networth-mode-stacked"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    chartViewMode === 'stacked'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Camadas Empilhadas
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowProjection(prev => !prev)}
                aria-pressed={showProjection}
                data-testid="btn-networth-project-3m"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  showProjection
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Projetar +3M</span>
              </button>
            </div>
          )}

          {/* Period Filter Buttons (3M, 6M, 12M, Tudo) */}
          <div
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0"
            role="group"
            aria-label="Filtro de período da evolução patrimonial"
          >
            {PERIOD_OPTIONS.map(opt => {
              const active = period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriod(opt.id)}
                  aria-label={opt.ariaLabel}
                  aria-pressed={active}
                  data-testid={`btn-networth-period-${opt.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* KPI 1 */}
        <div
          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-2.5"
          data-testid="kpi-networth-current"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span data-testid="kpi-networth-current-title">{scopeMeta.kpi1Title}</span>
              <Wallet className="w-4 h-4" style={{ color: scopeMeta.positiveHex }} />
            </div>
            <div
              className="text-xl font-black text-slate-900 dark:text-white tabular-nums"
              data-testid="kpi-networth-current-value"
            >
              {formatBRL(kpis.currentNetWorth)}
            </div>
          </div>

          <div className="space-y-1.5">
            {activeScope === 'CONSOLIDATED' ? (
              <>
                <div
                  className="h-2 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700"
                  aria-label="Composição proporcional entre PF, MEI e Metas"
                >
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${kpis.breakdownWeights.pfPct}%` }}
                    title={`Saldo PF: ${kpis.breakdownWeights.pfPct.toFixed(1).replace('.', ',')}%`}
                  />
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${kpis.breakdownWeights.meiPct}%` }}
                    title={`Caixa MEI: ${kpis.breakdownWeights.meiPct.toFixed(1).replace('.', ',')}%`}
                  />
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${kpis.breakdownWeights.goalsPct}%` }}
                    title={`Metas/Potes: ${kpis.breakdownWeights.goalsPct.toFixed(1).replace('.', ',')}%`}
                  />
                </div>

                <div
                  className="inline-block w-full px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug tabular-nums"
                  data-testid="kpi-networth-breakdown-text"
                >
                  PF: {formatBRL(kpis.breakdown.pf)} • MEI: {formatBRL(kpis.breakdown.mei)} • Metas:{' '}
                  {formatBRL(kpis.breakdown.goals)}
                </div>
              </>
            ) : (
              <>
                <div
                  className="h-2 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700"
                  aria-label={`Participação de ${scopeMeta.label} no patrimônio consolidado`}
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      kpis.currentNetWorth < 0 ? 'bg-rose-500' : scopeMeta.barClass
                    }`}
                    style={{
                      width: `${kpis.currentNetWorth < 0 ? 100 : singleLayerBarWidth}%`,
                    }}
                  />
                </div>

                <div
                  className="inline-block w-full px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug tabular-nums"
                  data-testid="kpi-networth-breakdown-text"
                >
                  {kpis.currentNetWorth < 0 ? 'Impacto' : 'Participação'} no Consolidado:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {formatSharePct(singleLayerSharePct)}
                  </strong>{' '}
                  (de{' '}
                  {formatBRL(latestScopedPoint ? latestScopedPoint.consolidatedTotalNetWorthBRL : 0)}
                  )
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI 2 */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 ${
            isPositive
              ? scopeMeta.kpi2CardClass
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
          }`}
          data-testid="kpi-networth-growth"
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-1">
              <span
                className={
                  isPositive
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-rose-800 dark:text-rose-300'
                }
              >
                Crescimento no Período ({period === 'ALL' ? 'Tudo' : period})
              </span>
              <span
                className="px-2 py-0.5 rounded-full border text-[11px] font-black tabular-nums inline-flex items-center gap-1 shrink-0"
                style={{
                  color: activeHexColor,
                  backgroundColor: `${activeHexColor}18`,
                  borderColor: `${activeHexColor}33`,
                }}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {growthPctFormatted}
              </span>
            </div>
            <div
              className="text-xl font-black tabular-nums"
              style={{ color: activeHexColor }}
            >
              {growthSign}
              {formatBRL(kpis.periodGrowthBRL)}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {kpis.analyzedMonths}{' '}
            {activeScope === 'CONSOLIDATED'
              ? kpis.analyzedMonths === 1
                ? 'mês consolidado'
                : 'meses consolidados'
              : kpis.analyzedMonths === 1
                ? 'mês no recorte'
                : 'meses no recorte'}
          </p>
        </div>

        {/* KPI 3 */}
        <div
          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-2"
          data-testid="kpi-networth-avg"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Média de Evolução Mensal</span>
              <Activity className="w-4 h-4" style={{ color: activeHexColor }} />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {avgSign}
              {formatBRL(kpis.monthlyAvgEvolutionBRL)}
              <span className="text-xs font-bold text-slate-400 ml-1">/ mês</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Em {kpis.analyzedMonths}{' '}
            {kpis.analyzedMonths === 1 ? 'mês analisado' : 'meses analisados'}
            {showProjection && projectionPoints.length > 0 && (
              <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
                • Projeção +3M: {formatBRL(projectionPoints[projectionPoints.length - 1].totalNetWorthBRL)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 0-POINT EMPTY STATE vs RESPONSIVE D3 CHART */}
      {scopedSeries.length === 0 ? (
        <div
          className="p-8 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2.5"
          data-testid="d3-networth-empty-state"
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Nenhum histórico patrimonial registrado para o período selecionado
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Registre receitas, reservas MEI ou aportes em metas financeiras para acompanhar a evolução patrimonial mensal em tempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Interactive Stacked Legend & Projection Tag */}
          {(effectiveStackedMode || showProjection) && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-1"
              data-testid="d3-networth-legend"
            >
              {effectiveStackedMode ? (
                <div className="flex flex-wrap items-center gap-2">
                  {STACKED_LAYERS.map(layer => {
                    const isActive = highlightedLayer === layer.key;
                    return (
                      <button
                        key={layer.key}
                        type="button"
                        onClick={() =>
                          setHighlightedLayer(prev => (prev === layer.key ? null : layer.key))
                        }
                        onMouseEnter={() => setHighlightedLayer(layer.key)}
                        onMouseLeave={() => setHighlightedLayer(null)}
                        data-testid={`legend-layer-${layer.key}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition cursor-pointer ${
                          isActive
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                            : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span>{layer.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div />
              )}

              {showProjection && (
                <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                  <span
                    className="w-4 border-t-2 border-dashed inline-block"
                    style={{ borderColor: activeHexColor }}
                  />
                  <span>*Linha tracejada = Projeção linear (+3M)</span>
                </div>
              )}
            </div>
          )}

          {/* Responsive D3 Chart Canvas + Floating HTML Tooltip */}
          <div
            ref={containerRef}
            className="relative w-full select-none pt-1"
            data-testid="d3-networth-chart-container"
          >
            <svg
              ref={svgRef}
              className="block w-full overflow-visible"
              data-testid="d3-networth-svg"
            />

            {hoveredInfo && tooltipStyle && (
              <div
                role="status"
                data-testid="d3-networth-tooltip"
                style={tooltipStyle}
                className="pointer-events-none absolute z-20 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl p-3.5 text-xs space-y-2 transition-all duration-75"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 gap-2">
                  <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" style={{ color: activeHexColor }} />
                    {hoveredInfo.point.fullMonthLabel}
                  </span>
                  {hoveredInfo.point.isProjected && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                      Projeção
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    {hoveredInfo.point.isProjected
                      ? `${scopeMeta.tooltipTitle} (Estimado)`
                      : scopeMeta.tooltipTitle}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatBRL(hoveredInfo.point.totalNetWorthBRL)}
                  </span>
                </div>

                <div className="pt-1.5 text-[10px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 space-y-1 tabular-nums">
                  {activeScope === 'CONSOLIDATED' ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                      <span>
                        PF: <strong>{formatBRL(hoveredInfo.point.pfBalance)}</strong>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>
                        MEI: <strong>{formatBRL(hoveredInfo.point.meiBalance)}</strong>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>
                        Metas: <strong>{formatBRL(hoveredInfo.point.goalsBalance)}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] leading-snug">
                      {hoveredInfo.point.totalNetWorthBRL < 0 ? 'Impacto' : 'Participação'} no
                      consolidado do mês:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {formatSharePct(hoveredInfo.point.scopeSharePct)}
                      </strong>{' '}
                      <span className="text-slate-400">
                        (Total: {formatBRL(hoveredInfo.point.consolidatedTotalNetWorthBRL)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  {hoveredInfo.point.index === 0 && hoveredInfo.point.monthlyDeltaBRL === 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {scopedSeries.length === 1 ? 'Marco único registrado' : 'Início da série'}
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-black tabular-nums ${
                        hoveredInfo.point.monthlyDeltaBRL >= 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {hoveredInfo.point.monthlyDeltaBRL >= 0 ? '▲ +' : '▼ -'}
                      {formatBRL(Math.abs(hoveredInfo.point.monthlyDeltaBRL))} (
                      {formatPct(hoveredInfo.point.monthlyDeltaPct)}) vs. mês anterior
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Footer Insight Highlighting Best Growth Month */}
      {bestMonthDisplay && scopedSeries.length > 0 && (
        <div
          className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          data-testid="d3-networth-footer-insight"
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span
              className="p-1.5 rounded-lg shrink-0"
              style={{
                color: scopeMeta.positiveHex,
                backgroundColor: `${scopeMeta.positiveHex}14`,
              }}
            >
              <Award className="w-4 h-4" />
            </span>
            <p className="leading-relaxed">
              Melhor mês ({scopeMeta.label}) no período:{' '}
              <strong className="text-slate-900 dark:text-white font-black">
                {bestMonthDisplay.fullMonthLabel} ({bestMonthDisplay.monthLabel})
              </strong>{' '}
              com variação de{' '}
              <strong
                className="tabular-nums font-black"
                style={{ color: scopeMeta.positiveHex }}
              >
                +{formatBRL(bestMonthDisplay.deltaBRL)} ({formatPct(bestMonthDisplay.deltaPct)})
              </strong>
              .
            </p>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
            Total ao fim de {bestMonthDisplay.monthLabel}:{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatBRL(bestMonthDisplay.totalNetWorth)}
            </strong>
          </span>
        </div>
      )}
    </section>
  );
};
