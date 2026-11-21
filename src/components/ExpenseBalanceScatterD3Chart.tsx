import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  ScatterChart,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  User,
  Briefcase,
} from 'lucide-react';
import { Transaction } from '../types';
import {
  buildDailyExpenseBalanceCorrelation,
  DailyScatterPoint,
  formatBRL,
  ScatterScope,
  SeasonPhase,
} from '../utils/finance';

export interface ExpenseBalanceScatterD3ChartProps {
  transactions: Transaction[];
  className?: string;
}

interface SeasonMeta {
  id: SeasonPhase;
  label: string;
  shortLabel: string;
  color: string;
  activePillClass: string;
  dotClass: string;
  badgeClass: string;
}

const SEASON_PHASES: Record<SeasonPhase, SeasonMeta> = {
  INICIO: {
    id: 'INICIO',
    label: 'Início do Mês (Dias 1–10)',
    shortLabel: 'Início (1–10)',
    color: '#10b981',
    activePillClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  MEIO: {
    id: 'MEIO',
    label: 'Meio do Mês (Dias 11–20)',
    shortLabel: 'Meio (11–20)',
    color: '#f59e0b',
    activePillClass:
      'bg-amber-500 text-white border-amber-500 shadow-xs',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  FIM: {
    id: 'FIM',
    label: 'Fim do Mês (Dias 21–31)',
    shortLabel: 'Fim (21–31)',
    color: '#f43f5e',
    activePillClass:
      'bg-rose-600 text-white border-rose-600 shadow-xs',
    dotClass: 'bg-rose-500',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
};

const SCOPE_OPTIONS: Array<{
  id: ScatterScope;
  label: string;
  shortTag: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    id: 'CONSOLIDATED',
    label: 'Consolidado',
    shortTag: 'Consolidado',
    icon: Layers,
    activeClass: 'bg-emerald-600 text-white shadow-xs',
  },
  {
    id: 'PF',
    label: 'Apenas PF',
    shortTag: 'PF',
    icon: User,
    activeClass: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'MEI',
    label: 'Apenas MEI',
    shortTag: 'MEI',
    icon: Briefcase,
    activeClass: 'bg-sky-600 text-white shadow-xs',
  },
];

function formatCompactCurrencyAxis(val: number): string {
  if (!Number.isFinite(val)) return 'R$ 0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1000) {
    const k = abs / 1000;
    const formatted =
      k % 1 === 0
        ? k.toFixed(0)
        : k.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${sign}R$ ${formatted}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

function formatDateDDMMYYYY(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').slice(0, 10));
  if (!m) return isoDate;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatPearsonR(r: number): string {
  const sign = r > 0.004 ? '+' : '';
  return `${sign}${r.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildCorrelationInsightBadge(pearsonR: number, scope: ScatterScope): {
  title: string;
  toneClass: string;
} {
  const absR = Math.abs(pearsonR);
  const scopePrefix =
    scope === 'PF' ? 'PF' : scope === 'MEI' ? 'MEI' : 'Consolidado';
  const rText = formatPearsonR(pearsonR);

  if (absR >= 0.65) {
    if (pearsonR > 0) {
      return {
        title: `${scopePrefix} • Correlação Positiva Forte (r = ${rText}): gastos aumentam bastante em dias de saldo alto`,
        toneClass:
          'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
      };
    }
    return {
      title: `${scopePrefix} • Correlação Negativa Forte (r = ${rText}): gastos sobem quando o saldo disponível aperta`,
      toneClass:
        'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    };
  }

  if (absR >= 0.3) {
    if (pearsonR > 0) {
      return {
        title: `${scopePrefix} • Correlação Positiva Moderada (r = ${rText}): ${
          scope === 'PF'
            ? 'gastos pessoais sobem em dias de saldo alto'
            : scope === 'MEI'
              ? 'saídas operacionais acompanham entradas de caixa'
              : 'gastos tendem a subir quando o saldo está alto'
        }`,
        toneClass:
          'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
      };
    }
    return {
      title: `${scopePrefix} • Correlação Negativa Moderada (r = ${rText}): despesas concentradas no fim do ciclo de saldo`,
      toneClass:
        'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
    };
  }

  return {
    title: `${scopePrefix} • Correlação Fraca (r = ${rText}): ${
      scope === 'MEI'
        ? 'despesas operacionais independentes do caixa'
        : 'ritmo de gastos estável e independente do saldo diário'
    }`,
    toneClass:
      'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  };
}

/**
 * Clips the OLS line y = slope * x + intercept strictly inside [xMin, xMax] x [yMin, yMax]
 * using Liang-Barsky parametric clipping so the trendline never overflows outside plot bounds.
 */
export function clampOLSTrendlineToBounds(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  slope: number,
  intercept: number
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (
    !Number.isFinite(xMin) ||
    !Number.isFinite(xMax) ||
    !Number.isFinite(yMin) ||
    !Number.isFinite(yMax) ||
    !Number.isFinite(slope) ||
    !Number.isFinite(intercept) ||
    xMax <= xMin ||
    yMax <= yMin
  ) {
    return null;
  }

  const p0x = xMin;
  const p0y = slope * xMin + intercept;
  const p1x = xMax;
  const p1y = slope * xMax + intercept;

  const dx = p1x - p0x;
  const dy = p1y - p0y;

  let t0 = 0;
  let t1 = 1;

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  if (
    clip(-dx, p0x - xMin) &&
    clip(dx, xMax - p0x) &&
    clip(-dy, p0y - yMin) &&
    clip(dy, yMax - p0y)
  ) {
    return {
      x1: p0x + t0 * dx,
      y1: p0y + t0 * dy,
      x2: p0x + t1 * dx,
      y2: p0y + t1 * dy,
    };
  }

  return null;
}

interface HoveredScatterInfo {
  point: DailyScatterPoint;
  xPx: number;
  yPx: number;
}

export const ExpenseBalanceScatterD3Chart: React.FC<ExpenseBalanceScatterD3ChartProps> = ({
  transactions,
  className = '',
}) => {
  const [activeScope, setActiveScope] = useState<ScatterScope>('CONSOLIDATED');
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<SeasonPhase | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 760,
    height: 340,
  });
  const [hoveredInfo, setHoveredInfo] = useState<HoveredScatterInfo | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const correlationData = useMemo(
    () => buildDailyExpenseBalanceCorrelation(transactions, activeScope),
    [transactions, activeScope]
  );

  // ResizeObserver for responsive D3 SVG geometry
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const w = el.clientWidth;
      if (w > 0) {
        const targetH = w < 520 ? 290 : 340;
        setDimensions(prev =>
          prev.width === w && prev.height === targetH
            ? prev
            : { width: w, height: targetH }
        );
      }
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset hover tooltip when scope or season filter changes
  useEffect(() => {
    setHoveredInfo(null);
  }, [activeScope, activeSeasonFilter]);

  const insightBadge = useMemo(
    () => buildCorrelationInsightBadge(correlationData.pearsonR, activeScope),
    [correlationData.pearsonR, activeScope]
  );

  const scopeBadgeLabel =
    activeScope === 'PF' ? 'PF' : activeScope === 'MEI' ? 'MEI/PJ' : 'Consolidado';

  // D3 Scatter Plot Rendering
  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    const width = Math.max(280, dimensions.width);
    const height = Math.max(240, dimensions.height);
    const margin = {
      top: 22,
      right: 22,
      bottom: 48,
      left: width < 520 ? 58 : 72,
    };
    const innerWidth = Math.max(80, width - margin.left - margin.right);
    const innerHeight = Math.max(80, height - margin.top - margin.bottom);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const points = correlationData.points;
    if (points.length === 0) return;

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Saldo Disponível R$)
    let minX = d3.min(points, d => d.availableBalance) ?? 0;
    let maxX = d3.max(points, d => d.availableBalance) ?? 1000;
    if (minX === maxX) {
      minX -= 500;
      maxX += 500;
    } else {
      const padX = (maxX - minX) * 0.08;
      minX -= padX;
      maxX += padX;
    }

    const xScale = d3
      .scaleLinear()
      .domain([minX, maxX])
      .nice(5)
      .range([0, innerWidth]);

    // Y Scale (Despesa Diária R$)
    const rawMaxY = d3.max(points, d => d.dailyExpense) ?? 500;
    const maxY = Math.max(100, rawMaxY * 1.15);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxY])
      .nice(5)
      .range([innerHeight, 0]);

    const [niceXMin, niceXMax] = xScale.domain();
    const [niceYMin, niceYMax] = yScale.domain();

    // Dashed horizontal & vertical gridlines
    const yGrid = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    const yGridGroup = rootGroup
      .append('g')
      .attr('class', 'text-slate-200 dark:text-slate-700/70')
      .call(yGrid);
    yGridGroup.select('.domain').remove();
    yGridGroup
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.85);

    const xGrid = d3
      .axisBottom(xScale)
      .ticks(width < 520 ? 4 : 6)
      .tickSize(-innerHeight)
      .tickFormat(() => '');

    const xGridGroup = rootGroup
      .append('g')
      .attr('class', 'text-slate-200 dark:text-slate-700/60')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xGrid);
    xGridGroup.select('.domain').remove();
    xGridGroup
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.6);

    // X-Axis & Y-Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(width < 520 ? 4 : 6)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => formatCompactCurrencyAxis(Number(d)));

    const xAxisGroup = rootGroup
      .append('g')
      .attr('class', 'text-slate-500 dark:text-slate-400')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', '#cbd5e1').attr('stroke-opacity', 0.5);
    xAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums');

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => formatCompactCurrencyAxis(Number(d)));

    const yAxisGroup = rootGroup
      .append('g')
      .attr('class', 'text-slate-500 dark:text-slate-400')
      .call(yAxis);
    yAxisGroup.select('.domain').attr('stroke', '#cbd5e1').attr('stroke-opacity', 0.5);
    yAxisGroup
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('font-variant-numeric', 'tabular-nums');

    // Axis Titles
    rootGroup
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 38)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-slate-500 dark:fill-slate-400')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text('Saldo Disponível (R$)');

    rootGroup
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -(margin.left - 16))
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-slate-500 dark:fill-slate-400')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text('Despesa Diária (R$)');

    // OLS Regression Trendline clamped strictly within [niceXMin, niceXMax] x [niceYMin, niceYMax]
    const clampedLine = clampOLSTrendlineToBounds(
      niceXMin,
      niceXMax,
      niceYMin,
      niceYMax,
      correlationData.slope,
      correlationData.intercept
    );

    if (clampedLine) {
      rootGroup
        .append('line')
        .attr('data-testid', 'd3-scatter-trendline')
        .attr('x1', xScale(clampedLine.x1))
        .attr('y1', yScale(clampedLine.y1))
        .attr('x2', xScale(clampedLine.x2))
        .attr('y2', yScale(clampedLine.y2))
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-opacity', 0.9);
    }

    // Radius scale by txCount (5 to 10)
    const maxTx = Math.max(2, d3.max(points, d => d.txCount) ?? 4);
    const radiusScale = d3.scaleLinear().domain([1, maxTx]).range([5, 10]).clamp(true);

    // Scatter Circles
    const circles = rootGroup
      .selectAll<SVGCircleElement, DailyScatterPoint>('.d3-scatter-circle')
      .data(points, d => d.date)
      .enter()
      .append('circle')
      .attr('class', 'd3-scatter-circle')
      .attr('data-testid', d => `scatter-dot-${d.date}`)
      .attr('data-season', d => d.seasonPhase)
      .attr('cx', d => xScale(d.availableBalance))
      .attr('cy', d => yScale(d.dailyExpense))
      .attr('r', d => radiusScale(d.txCount))
      .attr('fill', d => SEASON_PHASES[d.seasonPhase].color)
      .attr('fill-opacity', d => {
        if (activeSeasonFilter && d.seasonPhase !== activeSeasonFilter) return 0.14;
        return 0.78;
      })
      .attr('stroke', d =>
        activeSeasonFilter === d.seasonPhase ? '#ffffff' : 'rgba(255,255,255,0.65)'
      )
      .attr('stroke-width', d => (activeSeasonFilter === d.seasonPhase ? 1.8 : 1))
      .style('cursor', 'pointer')
      .style('transition', 'r 140ms ease, fill-opacity 140ms ease, stroke-width 140ms ease');

    circles
      .on('mouseenter', function (_event, d) {
        const baseR = radiusScale(d.txCount);
        d3.select(this)
          .raise()
          .attr('r', baseR + 3)
          .attr('fill-opacity', 1)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2.5);

        setHoveredInfo({
          point: d,
          xPx: margin.left + xScale(d.availableBalance),
          yPx: margin.top + yScale(d.dailyExpense),
        });
      })
      .on('mouseleave', function (_event, d) {
        const baseR = radiusScale(d.txCount);
        d3.select(this)
          .attr('r', baseR)
          .attr(
            'fill-opacity',
            activeSeasonFilter && d.seasonPhase !== activeSeasonFilter ? 0.14 : 0.78
          )
          .attr(
            'stroke',
            activeSeasonFilter === d.seasonPhase ? '#ffffff' : 'rgba(255,255,255,0.65)'
          )
          .attr('stroke-width', activeSeasonFilter === d.seasonPhase ? 1.8 : 1);

        setHoveredInfo(null);
      });
  }, [correlationData, activeSeasonFilter, dimensions]);

  const toggleSeasonFilter = (phase: SeasonPhase) => {
    setActiveSeasonFilter(prev => (prev === phase ? null : phase));
  };

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-expense-balance-scatter"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ScatterChart className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Análise Estatística Sazonal (D3.js)
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Correlação: Saldo Disponível × Despesas Diárias
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Avalia se dias com maior saldo em conta induzem maior gasto diário, identificando padrões no início, meio e fim do mês.
          </p>

          {/* Pearson Correlation Insight Badge */}
          <div
            data-testid="scatter-pearson-badge"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${insightBadge.toneClass}`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="tabular-nums">{insightBadge.title}</span>
          </div>
        </div>

        {/* Scope Selector Pills + High/Low Balance Comparison */}
        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div
            role="group"
            aria-label="Filtrar escopo da correlação"
            data-testid="scatter-scope-selector"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 self-start sm:self-end"
          >
            {SCOPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = activeScope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveScope(opt.id)}
                  data-testid={`btn-scatter-scope-${opt.id}`}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? opt.activeClass
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto">
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
                Média em Saldo Alto
              </span>
              <span
                className="text-sm font-black text-slate-900 dark:text-white tabular-nums"
                data-testid="scatter-avg-high"
              >
                {formatBRL(correlationData.avgExpenseHighBalance)}
              </span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
                Média em Saldo Baixo
              </span>
              <span
                className="text-sm font-black text-slate-900 dark:text-white tabular-nums"
                data-testid="scatter-avg-low"
              >
                {formatBRL(correlationData.avgExpenseLowBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Seasonal Legend Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar pontos por fase sazonal do mês"
        >
          {(Object.values(SEASON_PHASES) as SeasonMeta[]).map(phase => {
            const isSelected = activeSeasonFilter === phase.id;
            const count = correlationData.points.filter(
              p => p.seasonPhase === phase.id
            ).length;
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => toggleSeasonFilter(phase.id)}
                data-testid={`btn-scatter-season-${phase.id}`}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? phase.activePillClass
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-white' : phase.dotClass
                  }`}
                />
                <span>{phase.label}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isSelected ? 'text-white/90' : 'text-slate-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}

          {activeSeasonFilter && (
            <button
              type="button"
              onClick={() => setActiveSeasonFilter(null)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 cursor-pointer"
            >
              Mostrar todas
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-slate-400 inline-block" />
            <span>Tendência Linear (OLS)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Tamanho = nº de lançamentos no dia</span>
          </span>
        </div>
      </div>

      {/* D3 Scatter Plot SVG Container + Edge-Aware Floating Tooltip */}
      <div
        ref={containerRef}
        className="relative w-full min-h-[290px] select-none"
        data-testid="scatter-chart-container"
      >
        <svg
          ref={svgRef}
          className="w-full block overflow-visible"
          role="img"
          aria-label="Gráfico de dispersão entre saldo disponível e despesas diárias"
        />

        {hoveredInfo && (
          <div
            data-testid="scatter-hover-tooltip"
            className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs space-y-1.5"
            style={{
              left:
                hoveredInfo.xPx > dimensions.width - 275
                  ? Math.max(8, hoveredInfo.xPx - 266)
                  : Math.min(dimensions.width - 264, hoveredInfo.xPx + 14),
              top:
                hoveredInfo.yPx < 130
                  ? Math.min(dimensions.height - 135, hoveredInfo.yPx + 14)
                  : Math.max(8, hoveredInfo.yPx - 125),
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{formatDateDDMMYYYY(hoveredInfo.point.date)}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {hoveredInfo.point.dayOfWeek}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                  SEASON_PHASES[hoveredInfo.point.seasonPhase].badgeClass
                }`}
              >
                {SEASON_PHASES[hoveredInfo.point.seasonPhase].shortLabel}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                Escopo: {scopeBadgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
              <div>
                <span className="text-[10px] text-slate-400 block">Saldo Disponível</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatBRL(hoveredInfo.point.availableBalance)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Despesa Diária</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatBRL(hoveredInfo.point.dailyExpense)}
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                Top: <strong className="text-slate-700 dark:text-slate-200">{hoveredInfo.point.topCategory}</strong>
              </span>
              <span className="font-mono shrink-0">{hoveredInfo.point.txCount}x</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          Amostra analisada: <strong className="text-slate-700 dark:text-slate-200">{correlationData.points.length} dias com despesas</strong> ({scopeBadgeLabel})
          {correlationData.isFallbackData ? ' · Série histórica complementar de 45 dias ativa' : ''}
        </span>
        <span className="font-mono tabular-nums">
          r = {formatPearsonR(correlationData.pearsonR)} · Inclinação = {correlationData.slope.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
        </span>
      </div>
    </section>
  );
};
