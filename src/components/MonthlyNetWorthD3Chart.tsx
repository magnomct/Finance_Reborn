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
} from '../utils/monthlyNetWorth';

export type NetWorthScope = 'CONSOLIDATED' | 'PF' | 'MEI' | 'GOALS';

export interface ScopedChartNetWorthPoint extends ChartNetWorthPoint {
  consolidatedTotalNetWorthBRL: number;
  scopeSharePct: number;
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

const roundCurrency = (val: number): number => Math.round(val * 100) / 100;

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
    };
  });
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
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoveredInfo, setHoveredInfo] = useState<TooltipHoverState | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = 'netWorthGradient';

  const resolvedData = useMemo(() => {
    let effectiveTx = transactions;
    let effectiveDreams = dreams;

    if (
      (!data || data.length === 0) &&
      typeof window !== 'undefined' &&
      window.localStorage &&
      effectiveTx.length === 0 &&
      effectiveDreams.length === 0
    ) {
      try {
        const savedTx = window.localStorage.getItem('yupee_transactions_v2');
        const savedDreams = window.localStorage.getItem('yupee_dreams_v2');
        if (savedTx) effectiveTx = JSON.parse(savedTx) as Transaction[];
        if (savedDreams) effectiveDreams = JSON.parse(savedDreams) as DreamGoal[];
      } catch {
        // Safe fallback if localStorage cannot be parsed
      }
    }

    return { effectiveTx, effectiveDreams };
  }, [data, transactions, dreams]);

  const allPoints: ChartNetWorthPoint[] = useMemo(() => {
    if (data && data.length > 0) {
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
  }, [data, resolvedData, anchorMonthKey]);

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

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const measured = Math.floor(entry.contentRect.width);
          if (measured > 0) {
            setContainerWidth(prev => (prev !== measured ? measured : prev));
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Clear hover tooltip cleanly whenever period, scope, or underlying data changes
  useEffect(() => {
    setHoveredInfo(null);
  }, [period, activeScope, scopedSeries.length]);

  const activeHexColor = kpis.isPositive ? scopeMeta.positiveHex : '#f43f5e';

  // D3 rendering pass (isolated to SVG ref, zero element duplication)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth <= 0 || scopedSeries.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const isMobile = containerWidth < 520;
    const chartHeight = isMobile ? 260 : 320;
    const margin = {
      top: 18,
      right: isMobile ? 14 : 24,
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
        `Gráfico de linha e área (${scopeMeta.label}) mostrando evolução mensal de ${scopedSeries[0].monthLabel} até ${scopedSeries[scopedSeries.length - 1].monthLabel}`
      );

    const points = scopedSeries;
    const strokeColor = activeHexColor;

    // Gradient definition (0.28 top opacity to 0.0 base opacity)
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

    // X Scale (d3.scaleTime)
    let minDate = points[0].date;
    let maxDate = points[points.length - 1].date;
    if (points.length === 1) {
      minDate = d3.timeDay.offset(minDate, -15);
      maxDate = d3.timeDay.offset(maxDate, 15);
    }

    const xScale = d3
      .scaleTime()
      .domain([minDate, maxDate])
      .range([0, innerWidth]);

    // Y Scale (d3.scaleLinear with 10% top padding)
    const rawMin = d3.min(points, d => d.totalNetWorthBRL) ?? 0;
    const rawMax = d3.max(points, d => d.totalNetWorthBRL) ?? 1000;
    const yMin = rawMin < 0 ? rawMin * 1.15 : 0;
    const yMax = rawMax > 0 ? Math.max(100, rawMax * 1.1) : Math.max(0, rawMax * 0.9);

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax === yMin ? yMin + 100 : yMax])
      .nice(5)
      .range([innerHeight, 0]);

    const [niceYMin, niceYMax] = yScale.domain();
    const baselineValue = Math.max(niceYMin, Math.min(niceYMax, 0));

    // Subtle horizontal gridlines (stroke-dasharray="3,3")
    const gridAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    const gridGroup = rootGroup
      .append('g')
      .attr('class', 'd3-grid-lines text-slate-200 dark:text-slate-800')
      .call(gridAxis);

    gridGroup.select('.domain').remove();
    gridGroup
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.85);

    // Compact Y-Axis (R$ 10k, R$ 25k)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => formatCompactAxisBRL(Number(d)));

    const yAxisGroup = rootGroup
      .append('g')
      .attr('class', 'd3-y-axis text-slate-400 dark:text-slate-500')
      .call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums');

    // X-Axis with abbreviated pt-BR month labels (Jan/26, Fev/26...)
    const stepModulo =
      containerWidth < 460 && points.length > 6
        ? 3
        : containerWidth < 680 && points.length > 8
          ? 2
          : 1;
    const tickDates = points
      .filter((_, idx) => {
        if (stepModulo === 1) return true;
        if (idx === points.length - 1) return true;
        const distFromEnd = points.length - 1 - idx;
        if (distFromEnd === 1) return false;
        return idx % stepModulo === 0;
      })
      .map(p => p.date);

    const labelByTime = new Map<number, string>();
    for (const p of points) {
      labelByTime.set(p.date.getTime(), p.monthLabel);
    }

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(tickDates)
      .tickSize(0)
      .tickPadding(12)
      .tickFormat(d => {
        const dt = d as Date;
        return labelByTime.get(dt.getTime()) ?? '';
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
      .style('font-weight', '600');

    // Area Generator (gradient fill under curve)
    const areaGenerator = d3
      .area<ScopedChartNetWorthPoint>()
      .x(d => xScale(d.date))
      .y0(() => yScale(baselineValue))
      .y1(d => yScale(d.totalNetWorthBRL))
      .curve(d3.curveMonotoneX);

    rootGroup
      .append('path')
      .datum(points)
      .attr('class', 'd3-networth-area')
      .attr('fill', `url(#${gradientId})`)
      .attr('d', areaGenerator);

    // Line Generator (3px smooth curveMonotoneX)
    const lineGenerator = d3
      .line<ScopedChartNetWorthPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.totalNetWorthBRL))
      .curve(d3.curveMonotoneX);

    rootGroup
      .append('path')
      .datum(points)
      .attr('class', 'd3-networth-line')
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Resting data vertex markers
    rootGroup
      .selectAll('.d3-resting-dot')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'd3-resting-dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.totalNetWorthBRL))
      .attr('r', 3.5)
      .attr('fill', '#ffffff')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2);

    // Interactive Crosshair (dashed vertical guide line + outer glow ring + active dot)
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

    // Bisector for smooth mouse/touch snapping to nearest month
    const bisectDate = d3.bisector<ScopedChartNetWorthPoint, Date>(d => d.date).left;

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const [pointerX] = d3.pointer(event, overlayNode);
      const clampedX = Math.max(0, Math.min(innerWidth, pointerX));
      const xDate = xScale.invert(clampedX);

      let nearestPoint: ScopedChartNetWorthPoint;
      if (points.length === 1) {
        nearestPoint = points[0];
      } else {
        const idx = bisectDate(points, xDate, 1);
        const d0 = points[Math.max(0, idx - 1)];
        const d1 = points[Math.min(points.length - 1, idx)];
        nearestPoint =
          xDate.getTime() - d0.date.getTime() > d1.date.getTime() - xDate.getTime()
            ? d1
            : d0;
      }

      const targetX = xScale(nearestPoint.date);
      const targetY = yScale(nearestPoint.totalNetWorthBRL);

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
  }, [containerWidth, scopedSeries, activeHexColor, scopeMeta.label, gradientId]);

  const isPositive = kpis.isPositive;
  const growthSign = kpis.periodGrowthBRL > 0 ? '+' : '';
  const growthPctFormatted = formatPct(kpis.periodGrowthPct);
  const avgSign = kpis.monthlyAvgEvolutionBRL > 0 ? '+' : '';

  // Compute safe edge-aware floating HTML tooltip coordinates (flips left when xPx > 65% width)
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

        {/* Filter Controls: Layer Scope Pills + Timeframe Filter */}
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
        {/* KPI 1: Adaptive Title & Scoped Breakdown */}
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

        {/* KPI 2: Crescimento no Período */}
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

        {/* KPI 3: Média de Evolução Mensal */}
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
          </p>
        </div>
      </div>

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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: activeHexColor }} />
                {hoveredInfo.point.fullMonthLabel}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                {scopeMeta.tooltipTitle}
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
                  Início da série
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

      {/* Dynamic Footer Insight Highlighting Best Growth Month */}
      {bestMonthDisplay && (
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
