import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  buildMonthlyNetWorthSeries,
  formatCompactAxisBRL,
  MonthlyNetWorthPoint,
  NetWorthPeriodFilter,
} from '../utils/monthlyNetWorth';

export interface MonthlyNetWorthD3ChartProps {
  transactions: Transaction[];
  dreams?: DreamGoal[];
  defaultPeriod?: NetWorthPeriodFilter;
  anchorMonthKey?: string;
  className?: string;
}

interface TooltipHoverState {
  point: MonthlyNetWorthPoint;
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
  transactions,
  dreams = [],
  defaultPeriod = '12M',
  anchorMonthKey = '2026-10',
  className = '',
}) => {
  const [period, setPeriod] = useState<NetWorthPeriodFilter>(defaultPeriod);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoveredInfo, setHoveredInfo] = useState<TooltipHoverState | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rawGradientId = useId();
  const gradientId = useMemo(
    () => `networth-area-grad-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [rawGradientId]
  );

  const summary = useMemo(() => {
    return buildMonthlyNetWorthSeries({
      transactions,
      dreams,
      period,
      anchorMonthKey,
    });
  }, [transactions, dreams, period, anchorMonthKey]);

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

  // Clear hover tooltip cleanly whenever period or underlying data changes
  useEffect(() => {
    setHoveredInfo(null);
  }, [period, summary.points.length]);

  // D3 rendering pass (isolated to SVG ref, zero element duplication)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth <= 0 || summary.points.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const isMobile = containerWidth < 520;
    const chartHeight = isMobile ? 250 : 300;
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
        `Gráfico de linha e área mostrando evolução patrimonial mensal de ${summary.points[0].monthLabel} até ${summary.points[summary.points.length - 1].monthLabel}`
      );

    const points = summary.points;
    const strokeColor = summary.isPositiveTrend ? '#10b981' : '#f43f5e';

    // Gradient definition (0.25 top opacity to 0.0 base opacity)
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
      .attr('stop-opacity', 0.25);

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

    // Y Scale (d3.scaleLinear)
    const rawMin = d3.min(points, d => d.totalNetWorthBRL) ?? 0;
    const rawMax = d3.max(points, d => d.totalNetWorthBRL) ?? 1000;
    const span = Math.max(500, rawMax - rawMin);
    const yMin = rawMin < 0 ? rawMin - span * 0.15 : 0;
    const yMax = rawMax + span * 0.15;

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .nice(5)
      .range([innerHeight, 0]);

    const [niceYMin] = yScale.domain();

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
      .area<MonthlyNetWorthPoint>()
      .x(d => xScale(d.date))
      .y0(() => yScale(Math.max(niceYMin, 0)))
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
      .line<MonthlyNetWorthPoint>()
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

    // Interactive Crosshair (dashed vertical guide line + highlighted point circle)
    const crosshairGroup = rootGroup
      .append('g')
      .attr('class', 'd3-crosshair-group')
      .style('display', 'none')
      .style('pointer-events', 'none');

    const crosshairLine = crosshairGroup
      .append('line')
      .attr('class', 'd3-crosshair-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', strokeColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-opacity', 0.8);

    const crosshairHalo = crosshairGroup
      .append('circle')
      .attr('r', 10)
      .attr('fill', strokeColor)
      .attr('fill-opacity', 0.18);

    const crosshairCircle = crosshairGroup
      .append('circle')
      .attr('class', 'd3-crosshair-dot')
      .attr('r', 5.5)
      .attr('fill', strokeColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);

    // Bisector for smooth mouse/touch snapping to nearest month
    const bisectDate = d3.bisector<MonthlyNetWorthPoint, Date>(d => d.date).left;

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const [pointerX] = d3.pointer(event, overlayNode);
      const clampedX = Math.max(0, Math.min(innerWidth, pointerX));
      const xDate = xScale.invert(clampedX);

      let nearestPoint: MonthlyNetWorthPoint;
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
  }, [containerWidth, summary, gradientId]);

  const isPositive = summary.isPositiveTrend;
  const growthSign = summary.periodGrowthBRL >= 0 ? '+' : '';
  const growthPctFormatted = `${summary.periodGrowthPct >= 0 ? '+' : ''}${summary.periodGrowthPct
    .toFixed(1)
    .replace('.', ',')}%`;
  const avgSign = summary.averageMonthlyEvolutionBRL >= 0 ? '+' : '';

  // Compute safe floating HTML tooltip coordinates (never clipped on left/right edges)
  const tooltipStyle = useMemo(() => {
    if (!hoveredInfo) return undefined;
    const tooltipWidth = 248;
    const preferRight = hoveredInfo.xPx + tooltipWidth + 20 <= hoveredInfo.containerWidth;
    const rawLeft = preferRight
      ? hoveredInfo.xPx + 14
      : hoveredInfo.xPx - tooltipWidth - 14;
    const clampedLeft = Math.max(
      8,
      Math.min(hoveredInfo.containerWidth - tooltipWidth - 8, rawLeft)
    );
    const clampedTop = Math.max(8, Math.min(145, hoveredInfo.yPx - 36));
    return {
      left: `${clampedLeft}px`,
      top: `${clampedTop}px`,
      width: `${tooltipWidth}px`,
    };
  }, [hoveredInfo]);

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-monthly-networth-d3"
    >
      {/* Header + Period Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`p-1.5 rounded-xl ${
                isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
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
              Consolidado PF + Caixa MEI + Potes/Metas
            </span>
          </div>
          <h3
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
            data-testid="heading-monthly-networth-d3"
          >
            Evolução Patrimonial Mensal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curva acumulada do patrimônio líquido consolidado mês a mês. Passe o cursor sobre o gráfico para inspecionar cada período.
          </p>
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

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* KPI 1: Patrimônio Atual Consolidado */}
        <div
          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
          data-testid="kpi-networth-current"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Patrimônio Atual Consolidado</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatBRL(summary.currentNetWorthBRL)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            PF {formatCompactAxisBRL(summary.currentBreakdown.pfBalance)} · MEI{' '}
            {formatCompactAxisBRL(summary.currentBreakdown.meiReserve)} · Metas{' '}
            {formatCompactAxisBRL(summary.currentBreakdown.goalsBalance)}
          </p>
        </div>

        {/* KPI 2: Crescimento no Período */}
        <div
          className={`p-4 rounded-2xl border ${
            isPositive
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
          }`}
          data-testid="kpi-networth-growth"
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span
              className={
                isPositive
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : 'text-rose-800 dark:text-rose-300'
              }
            >
              Crescimento no Período ({period === 'ALL' ? 'Tudo' : period})
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums inline-flex items-center gap-0.5 ${
                isPositive
                  ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {growthPctFormatted}
            </span>
          </div>
          <div
            className={`text-xl font-black tabular-nums ${
              isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {growthSign}
            {formatBRL(summary.periodGrowthBRL)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.points.length} {summary.points.length === 1 ? 'mês analisado' : 'meses analisados'}
          </p>
        </div>

        {/* KPI 3: Média de Evolução Mensal */}
        <div
          className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
          data-testid="kpi-networth-avg"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Média de Evolução Mensal</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
            {avgSign}
            {formatBRL(summary.averageMonthlyEvolutionBRL)}
            <span className="text-xs font-bold text-slate-400 ml-1">/mês</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.isUsingFallbackDataset
              ? 'Base demonstrativa de 12 meses ativa'
              : 'Ritmo médio líquido de acumulação'}
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
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {hoveredInfo.point.fullMonthLabel}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Patrimônio Consolidado
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                {formatBRL(hoveredInfo.point.totalNetWorthBRL)}
              </span>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                vs. mês anterior:
              </span>
              {hoveredInfo.point.index === 0 && hoveredInfo.point.monthlyDeltaBRL === 0 ? (
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Início da série
                </span>
              ) : (
                <span
                  className={`text-[11px] font-black tabular-nums ${
                    hoveredInfo.point.monthlyDeltaBRL >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {hoveredInfo.point.monthlyDeltaBRL >= 0 ? '▲ +' : '▼ -'}
                  {formatBRL(Math.abs(hoveredInfo.point.monthlyDeltaBRL))} (
                  {hoveredInfo.point.monthlyDeltaPct >= 0 ? '+' : ''}
                  {hoveredInfo.point.monthlyDeltaPct.toFixed(1).replace('.', ',')}%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 tabular-nums">
              <div>
                <span className="block text-[9px] text-slate-400">Conta PF</span>
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatCompactAxisBRL(hoveredInfo.point.pfCumulativeBalance)}
                </strong>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400">Caixa MEI</span>
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatCompactAxisBRL(hoveredInfo.point.meiCumulativeReserve)}
                </strong>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400">Metas</span>
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatCompactAxisBRL(hoveredInfo.point.goalsCumulativeBalance)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Footer Insight Highlighting Best Growth Month */}
      {summary.bestMonth && (
        <div
          className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          data-testid="d3-networth-footer-insight"
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Award className="w-4 h-4" />
            </span>
            <p className="leading-relaxed">
              Melhor mês de evolução patrimonial no período:{' '}
              <strong className="text-slate-900 dark:text-white font-black">
                {summary.bestMonth.fullMonthLabel} ({summary.bestMonth.monthLabel})
              </strong>{' '}
              com variação de{' '}
              <strong
                className={`tabular-nums font-black ${
                  summary.bestMonth.monthlyDeltaBRL >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summary.bestMonth.monthlyDeltaBRL >= 0 ? '+' : ''}
                {formatBRL(summary.bestMonth.monthlyDeltaBRL)} (
                {summary.bestMonth.monthlyDeltaPct >= 0 ? '+' : ''}
                {summary.bestMonth.monthlyDeltaPct.toFixed(1).replace('.', ',')}%)
              </strong>
              .
            </p>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
            Total ao fim de {summary.bestMonth.monthLabel}:{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatBRL(summary.bestMonth.totalNetWorthBRL)}
            </strong>
          </span>
        </div>
      )}
    </section>
  );
};
