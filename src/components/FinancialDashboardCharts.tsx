import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PieChart, TrendingUp, Layers, User, Briefcase, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import {
  AnnualBalanceMonthPoint,
  buildAnnualBalanceTimeSeries,
  buildCategoryDonutData,
  CategoryDonutSlice,
  DashboardChartScope,
  formatBRL,
} from '../utils/finance';

export interface FinancialDashboardChartsProps {
  transactions: Transaction[];
  className?: string;
}

const DONUT_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#0ea5e9', // Sky
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#64748b', // Slate ("Outros")
];

const SCOPE_OPTIONS: Array<{
  id: DashboardChartScope;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    id: 'CONSOLIDATED',
    label: 'Consolidado',
    icon: Layers,
    activeClass: 'bg-emerald-600 text-white shadow-xs',
  },
  {
    id: 'PF',
    label: 'Apenas PF',
    icon: User,
    activeClass: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'MEI',
    label: 'Apenas MEI',
    icon: Briefcase,
    activeClass: 'bg-sky-600 text-white shadow-xs',
  },
];

function getSliceColor(category: string, index: number): string {
  if (category.toLowerCase() === 'outros') {
    return '#64748b';
  }
  return DONUT_PALETTE[index % (DONUT_PALETTE.length - 1)];
}

function formatCompactAxisBRL(val: number): string {
  if (!Number.isFinite(val)) return 'R$ 0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1000) {
    const k = abs / 1000;
    const num =
      k % 1 === 0
        ? k.toFixed(0)
        : k.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${sign}R$ ${num}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

function formatPctPtBr(pct: number): string {
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

interface HoveredLineInfo {
  point: AnnualBalanceMonthPoint;
  xPx: number;
  yPx: number;
}

export const FinancialDashboardCharts: React.FC<FinancialDashboardChartsProps> = ({
  transactions,
  className = '',
}) => {
  const availableYears = useMemo(() => {
    const years = new Set<number>([2026, 2025]);
    (transactions || []).forEach(tx => {
      if (tx?.date && /^\d{4}-/.test(tx.date)) {
        const y = Number(tx.date.slice(0, 4));
        if (Number.isFinite(y) && y >= 2020 && y <= 2035) {
          years.add(y);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const [activeScope, setActiveScope] = useState<DashboardChartScope>('CONSOLIDATED');
  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || 2026);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);

  const [donutWidth, setDonutWidth] = useState<number>(340);
  const [lineSize, setLineSize] = useState<{ width: number; height: number }>({
    width: 620,
    height: 310,
  });
  const [hoveredLineInfo, setHoveredLineInfo] = useState<HoveredLineInfo | null>(null);

  const donutContainerRef = useRef<HTMLDivElement | null>(null);
  const donutSvgRef = useRef<SVGSVGElement | null>(null);
  const lineContainerRef = useRef<HTMLDivElement | null>(null);
  const lineSvgRef = useRef<SVGSVGElement | null>(null);

  const donutData = useMemo(
    () => buildCategoryDonutData(transactions, selectedYear, activeScope),
    [transactions, selectedYear, activeScope]
  );

  const annualSeries = useMemo(
    () => buildAnnualBalanceTimeSeries(transactions, selectedYear, activeScope),
    [transactions, selectedYear, activeScope]
  );

  // Reset slice & line hover states when filters change
  useEffect(() => {
    setHoveredCategory(null);
    setPinnedCategory(null);
    setHoveredLineInfo(null);
  }, [selectedYear, activeScope]);

  // Observe Donut container width
  useEffect(() => {
    const el = donutContainerRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) {
        setDonutWidth(el.clientWidth);
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Observe Annual Line container width
  useEffect(() => {
    const el = lineContainerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        const h = w < 480 ? 260 : 310;
        setLineSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const activeCategoryName = hoveredCategory ?? pinnedCategory;
  const activeSlice = useMemo<CategoryDonutSlice | null>(
    () => donutData.items.find(i => i.category === activeCategoryName) || null,
    [donutData.items, activeCategoryName]
  );

  // --------------------------------------------------------------------------
  // D3 DONUT CHART RENDERING (d3.pie + d3.arc)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const svgNode = donutSvgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    if (donutData.items.length === 0) return;

    const size = Math.max(210, Math.min(270, donutWidth - 16));
    const radius = size / 2;
    const innerRadius = radius * 0.62;
    const outerRadius = radius * 0.92;

    svg
      .attr('width', size)
      .attr('height', size)
      .attr('viewBox', `0 0 ${size} ${size}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${size / 2},${size / 2})`);

    const pie = d3
      .pie<CategoryDonutSlice>()
      .value(d => d.amount)
      .sort(null)
      .padAngle(0.025);

    const arc = d3
      .arc<d3.PieArcDatum<CategoryDonutSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(5);

    const arcHover = d3
      .arc<d3.PieArcDatum<CategoryDonutSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius + 5)
      .cornerRadius(5);

    const arcs = g
      .selectAll<SVGPathElement, d3.PieArcDatum<CategoryDonutSlice>>('.d3-donut-slice')
      .data(pie(donutData.items), d => d.data.category)
      .enter()
      .append('path')
      .attr('class', 'd3-donut-slice')
      .attr('data-testid', d => `donut-slice-${d.data.category}`)
      .attr('d', d => {
        const isSelected = activeCategoryName === d.data.category;
        return (isSelected ? arcHover(d) : arc(d)) || '';
      })
      .attr('fill', (d, idx) => getSliceColor(d.data.category, idx))
      .attr('fill-opacity', d =>
        activeCategoryName && activeCategoryName !== d.data.category ? 0.35 : 0.95
      )
      .style('cursor', 'pointer')
      .style('transition', 'fill-opacity 150ms ease');

    arcs
      .on('mouseenter', function (_event, d) {
        setHoveredCategory(d.data.category);
      })
      .on('mouseleave', function () {
        setHoveredCategory(null);
      })
      .on('click', function (_event, d) {
        setPinnedCategory(prev => (prev === d.data.category ? null : d.data.category));
      });
  }, [donutData.items, donutWidth, activeCategoryName]);

  // --------------------------------------------------------------------------
  // D3 ANNUAL CONSOLIDATED BALANCE LINE CHART (d3.line + d3.area + d3.bisector)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const svgNode = lineSvgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    if (annualSeries.length === 0) return;

    const width = Math.max(300, lineSize.width);
    const height = Math.max(240, lineSize.height);
    const margin = {
      top: 20,
      right: 18,
      bottom: 36,
      left: width < 480 ? 54 : 68,
    };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    const gradientId = `annual-balance-area-${activeScope}`;
    const lineColor =
      activeScope === 'PF' ? '#6366f1' : activeScope === 'MEI' ? '#0ea5e9' : '#10b981';

    const grad = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    grad.append('stop').attr('offset', '0%').attr('stop-color', lineColor).attr('stop-opacity', 0.28);
    grad.append('stop').attr('offset', '100%').attr('stop-color', lineColor).attr('stop-opacity', 0.01);

    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain([annualSeries[0].date, annualSeries[annualSeries.length - 1].date])
      .range([0, innerWidth]);

    let minY = d3.min(annualSeries, d => d.runningBalance) ?? 0;
    let maxY = d3.max(annualSeries, d => d.runningBalance) ?? 0;
    if (minY === maxY) {
      minY = Math.min(0, minY - 500);
      maxY = maxY + 1000;
    } else {
      const span = maxY - minY;
      minY = Math.min(0, minY - span * 0.1);
      maxY = maxY + span * 0.14;
    }

    const yScale = d3.scaleLinear().domain([minY, maxY]).nice(5).range([innerHeight, 0]);

    // Horizontal dashed gridlines
    const yGrid = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    const yGridGroup = root
      .append('g')
      .attr('class', 'text-slate-200 dark:text-slate-700/70')
      .call(yGrid);
    yGridGroup.select('.domain').remove();
    yGridGroup
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3');

    // Zero baseline when range includes negative and positive values
    const [domMin, domMax] = yScale.domain();
    if (domMin < 0 && domMax > 0) {
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.7);
    }

    // X-Axis with Jan..Dez Portuguese labels
    const monthByTimestamp = new Map<number, string>();
    annualSeries.forEach(p => {
      monthByTimestamp.set(p.date.getTime(), p.monthLabel);
    });

    const xAxis = d3
      .axisBottom<Date>(xScale)
      .tickValues(
        width < 460
          ? annualSeries.filter((_, idx) => idx % 2 === 0).map(p => p.date)
          : annualSeries.map(p => p.date)
      )
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => monthByTimestamp.get(d.getTime()) || '');

    const xAxisGroup = root
      .append('g')
      .attr('class', 'text-slate-500 dark:text-slate-400')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', '#cbd5e1').attr('stroke-opacity', 0.5);
    xAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600');

    // Y-Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => formatCompactAxisBRL(Number(d)));

    const yAxisGroup = root
      .append('g')
      .attr('class', 'text-slate-500 dark:text-slate-400')
      .call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums');

    // Area & Smooth Line
    const areaGen = d3
      .area<AnnualBalanceMonthPoint>()
      .x(d => xScale(d.date))
      .y0(yScale(Math.max(domMin, 0)))
      .y1(d => yScale(d.runningBalance))
      .curve(d3.curveMonotoneX);

    const lineGen = d3
      .line<AnnualBalanceMonthPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.runningBalance))
      .curve(d3.curveMonotoneX);

    root
      .append('path')
      .datum(annualSeries)
      .attr('data-testid', 'annual-balance-area')
      .attr('d', areaGen)
      .attr('fill', `url(#${gradientId})`);

    root
      .append('path')
      .datum(annualSeries)
      .attr('data-testid', 'annual-balance-line')
      .attr('d', lineGen)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2.75)
      .attr('stroke-linecap', 'round');

    // Data point circles
    root
      .selectAll<SVGCircleElement, AnnualBalanceMonthPoint>('.d3-balance-point')
      .data(annualSeries)
      .enter()
      .append('circle')
      .attr('class', 'd3-balance-point')
      .attr('data-testid', d => `annual-line-point-${d.monthLabel}`)
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.runningBalance))
      .attr('r', 4)
      .attr('fill', lineColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.75);

    // Crosshair group (updated imperatively + React tooltip state)
    const crosshairLine = root
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', lineColor)
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    const focusCircle = root
      .append('circle')
      .attr('r', 6.5)
      .attr('fill', lineColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .style('opacity', 0);

    const bisectDate = d3.bisector<AnnualBalanceMonthPoint, Date>(d => d.date).center;

    const updateFocusFromPointer = (clientX: number, targetEl: SVGRectElement) => {
      const rect = targetEl.getBoundingClientRect();
      const pointerX = Math.max(0, Math.min(innerWidth, clientX - rect.left));
      const hoveredDate = xScale.invert(pointerX);
      const idx = Math.max(0, Math.min(annualSeries.length - 1, bisectDate(annualSeries, hoveredDate)));
      const pt = annualSeries[idx];
      if (!pt) return;

      const cx = xScale(pt.date);
      const cy = yScale(pt.runningBalance);

      crosshairLine.attr('x1', cx).attr('x2', cx).style('opacity', 0.85);
      focusCircle.attr('cx', cx).attr('cy', cy).style('opacity', 1);

      setHoveredLineInfo({
        point: pt,
        xPx: margin.left + cx,
        yPx: margin.top + cy,
      });
    };

    root
      .append('rect')
      .attr('data-testid', 'annual-balance-bisector-overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event: MouseEvent) {
        updateFocusFromPointer(event.clientX, this);
      })
      .on('touchmove', function (event: TouchEvent) {
        if (event.touches && event.touches[0]) {
          updateFocusFromPointer(event.touches[0].clientX, this);
        }
      })
      .on('mouseleave', () => {
        crosshairLine.style('opacity', 0);
        focusCircle.style('opacity', 0);
        setHoveredLineInfo(null);
      });
  }, [annualSeries, lineSize, activeScope]);

  const yearHasActivity = useMemo(
    () => annualSeries.some(m => m.income > 0 || m.expense > 0),
    [annualSeries]
  );

  const endBalance = annualSeries[annualSeries.length - 1]?.runningBalance ?? 0;

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 ${className}`}
      data-testid="card-financial-dashboard-charts"
    >
      {/* Shared Header Controls: Scope Pills + Year Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>Categorias &amp; Evolução Anual do Saldo</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspecione a distribuição de despesas por categoria e a trajetória acumulada de saldo ao longo de {selectedYear}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Shared Scope Segmented Selector */}
          <div
            role="group"
            aria-label="Filtrar escopo dos gráficos"
            data-testid="dashboard-charts-scope-selector"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
          >
            {SCOPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = activeScope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveScope(opt.id)}
                  data-testid={`btn-dashboard-scope-${opt.id}`}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? opt.activeClass
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Year Selector */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="sr-only">Selecionar ano</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              data-testid="select-dashboard-charts-year"
              aria-label="Selecionar ano dos gráficos"
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer tabular-nums"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Responsive 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (xl:col-span-5): Category Expense Donut Chart */}
        <div
          className="xl:col-span-5 flex flex-col gap-4 xl:pr-4 xl:border-r xl:border-slate-100 dark:xl:border-slate-800"
          data-testid="panel-category-donut-d3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Despesas por Categoria
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Top 6 categorias + Outros em {selectedYear}
              </p>
            </div>
            {pinnedCategory && (
              <button
                type="button"
                onClick={() => setPinnedCategory(null)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Limpar foco
              </button>
            )}
          </div>

          {donutData.items.length === 0 ? (
            <div
              data-testid="donut-empty-state"
              className="flex flex-col items-center justify-center text-center py-14 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
            >
              <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhuma despesa registrada em {selectedYear}
              </p>
              <p className="text-[11px] mt-1">
                Altere o ano ou o escopo acima para visualizar os gastos por categoria.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {/* Donut Ring + Reactive Center KPI Readout */}
              <div
                ref={donutContainerRef}
                className="relative w-full flex items-center justify-center min-h-[220px]"
              >
                <div className="relative flex items-center justify-center">
                  <svg
                    ref={donutSvgRef}
                    className="block overflow-visible"
                    role="img"
                    aria-label={`Gráfico de rosca de despesas por categoria em ${selectedYear}`}
                  />
                  <div
                    data-testid="donut-center-readout"
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                  >
                    {activeSlice ? (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 max-w-[125px] truncate">
                          {activeSlice.category}
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                          {formatBRL(activeSlice.amount)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatPctPtBr(activeSlice.percentage)} · {activeSlice.txCount}x
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Total Gasto
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                          {formatBRL(donutData.totalExpense)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                          {donutData.items.length}{' '}
                          {donutData.items.length === 1 ? 'categoria' : 'categorias'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Vertical Category Legend */}
              <div
                className="w-full divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800"
                data-testid="donut-legend-list"
              >
                {donutData.items.map((item, idx) => {
                  const color = getSliceColor(item.category, idx);
                  const isHighlighted = activeCategoryName === item.category;
                  return (
                    <button
                      key={item.category}
                      type="button"
                      data-testid={`donut-legend-item-${item.category}`}
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() =>
                        setPinnedCategory(prev => (prev === item.category ? null : item.category))
                      }
                      className={`w-full flex items-center justify-between gap-3 py-2.5 px-2 text-left transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-slate-50 dark:bg-slate-800/70'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                          · {item.txCount}x
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatBRL(item.amount)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-11 text-right">
                          {formatPctPtBr(item.percentage)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (xl:col-span-7): Annual Consolidated Balance Time-Series Line Chart */}
        <div
          className="xl:col-span-7 flex flex-col gap-4"
          data-testid="panel-annual-balance-line-d3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Saldo Acumulado Anual (Jan–Dez {selectedYear})</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Passe o cursor sobre a curva para inspecionar entradas, saídas e saldo acumulado mês a mês.
              </p>
            </div>

            <div className="text-right tabular-nums">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Saldo Final {selectedYear}
              </span>
              <span
                data-testid="annual-line-end-balance"
                className={`text-sm font-black ${
                  endBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {endBalance >= 0 ? `+${formatBRL(endBalance)}` : formatBRL(endBalance)}
              </span>
            </div>
          </div>

          {!yearHasActivity && (
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              Nenhuma movimentação registrada em {selectedYear} para este escopo.
            </div>
          )}

          <div
            ref={lineContainerRef}
            className="relative w-full min-h-[260px] select-none"
            data-testid="annual-balance-line-container"
          >
            <svg
              ref={lineSvgRef}
              className="w-full block overflow-visible"
              role="img"
              aria-label={`Gráfico de linha da evolução anual do saldo em ${selectedYear}`}
            />

            {hoveredLineInfo && (
              <div
                data-testid="annual-balance-tooltip"
                className="pointer-events-none absolute z-20 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs space-y-1.5"
                style={{
                  left:
                    hoveredLineInfo.xPx > lineSize.width - 240
                      ? Math.max(8, hoveredLineInfo.xPx - 234)
                      : Math.min(lineSize.width - 230, hoveredLineInfo.xPx + 14),
                  top:
                    hoveredLineInfo.yPx < 115
                      ? Math.min(lineSize.height - 120, hoveredLineInfo.yPx + 12)
                      : Math.max(8, hoveredLineInfo.yPx - 110),
                }}
              >
                <div className="font-black text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                  {hoveredLineInfo.point.monthFullLabel} / {hoveredLineInfo.point.year}
                </div>
                <div className="space-y-1 tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Entradas</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatBRL(hoveredLineInfo.point.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Saídas</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      -{formatBRL(hoveredLineInfo.point.expense)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Saldo Acumulado
                    </span>
                    <span
                      className={`font-black ${
                        hoveredLineInfo.point.runningBalance >= 0
                          ? 'text-slate-900 dark:text-white'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatBRL(hoveredLineInfo.point.runningBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
