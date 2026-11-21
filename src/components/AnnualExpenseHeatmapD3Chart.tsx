import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  CalendarDays,
  Flame,
  ShieldCheck,
  Layers,
  User,
  Briefcase,
  Calendar,
  X,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Tag,
} from 'lucide-react';
import { Transaction } from '../types';
import {
  buildAnnualExpenseHeatmapData,
  DailyHeatmapCell,
  formatBRL,
  HeatmapScope,
} from '../utils/finance';

export interface AnnualExpenseHeatmapD3ChartProps {
  transactions: Transaction[];
  className?: string;
}

const MONTH_ABBR_PT_BR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const MONTH_FULL_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_FULL_PT_BR = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const WEEKDAY_LABELS_LEFT: Record<number, string> = {
  1: 'Seg',
  3: 'Qua',
  5: 'Sex',
};

const INTENSITY_PALETTE = ['#fed7aa', '#fb923c', '#f97316', '#e11d48'];

const SCOPE_OPTIONS: Array<{
  id: HeatmapScope;
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

function isTransactionPJ(tx: Transaction): boolean {
  return tx.costCenter === 'PJ' || tx.account === 'Inter PJ' || tx.jar === 'PJ_EXCLUIDO';
}

function formatDateDDMMYYYY(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').slice(0, 10));
  if (!m) return isoDate;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatFullPortugueseDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').slice(0, 10));
  if (!m) return isoDate;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const local = new Date(year, monthIdx, day);
  const weekday = WEEKDAY_FULL_PT_BR[local.getDay()] ?? '';
  const monthName = MONTH_FULL_PT_BR[monthIdx] ?? '';
  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

interface HoveredHeatmapTooltip {
  cell: DailyHeatmapCell;
  xPx: number;
  yPx: number;
  containerWidth: number;
}

export const AnnualExpenseHeatmapD3Chart: React.FC<AnnualExpenseHeatmapD3ChartProps> = ({
  transactions,
  className = '',
}) => {
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025]);
    (transactions || []).forEach(tx => {
      if (tx?.date && /^\d{4}-/.test(tx.date)) {
        const y = Number(tx.date.slice(0, 4));
        if (Number.isFinite(y) && y >= 2020 && y <= 2035) {
          yearsSet.add(y);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || 2026);
  const [activeScope, setActiveScope] = useState<HeatmapScope>('CONSOLIDATED');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(820);
  const [hoveredCellInfo, setHoveredCellInfo] = useState<HoveredHeatmapTooltip | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const heatmapSummary = useMemo(
    () => buildAnnualExpenseHeatmapData(transactions, selectedYear, activeScope),
    [transactions, selectedYear, activeScope]
  );

  // Reset selected date whenever year or scope changes
  useEffect(() => {
    setSelectedDateStr(null);
    setHoveredCellInfo(null);
  }, [selectedYear, activeScope]);

  // Responsive ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Daily Transactions Detail Panel data
  const selectedDayDetails = useMemo(() => {
    if (!selectedDateStr) return null;

    const matching = (transactions || [])
      .filter(tx => {
        if (!tx?.date || !tx.date.startsWith(selectedDateStr)) return false;
        const pj = isTransactionPJ(tx);
        if (activeScope === 'PF' && pj) return false;
        if (activeScope === 'MEI' && !pj) return false;
        return true;
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const totalExpenses = matching
      .filter(tx => tx.type === 'despesa')
      .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

    const gridCell =
      heatmapSummary.cells.find(c => c.dateStr === selectedDateStr) || null;

    return {
      dateStr: selectedDateStr,
      formattedTitle: formatFullPortugueseDate(selectedDateStr),
      transactions: matching,
      totalExpenses,
      gridCell,
    };
  }, [selectedDateStr, transactions, activeScope, heatmapSummary.cells]);

  // Render D3 53x7 Calendar Heatmap
  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    const cells = heatmapSummary.cells;
    if (cells.length === 0) return;

    const maxWeek = d3.max(cells, d => d.weekIndex) ?? 52;
    const numCols = maxWeek + 1;
    const leftPad = 36;
    const topPad = 24;
    const rightPad = 10;
    const bottomPad = 10;
    const gap = 3;

    // On mobile (< 640px) keep legible minimum cell size inside overflow-x-auto scroll wrapper
    const availForGrid = Math.max(580, containerWidth - leftPad - rightPad);
    const cellSize = Math.max(
      11,
      Math.min(18, Math.floor((availForGrid - gap * (numCols - 1)) / numCols))
    );
    const step = cellSize + gap;
    const svgWidth = leftPad + numCols * step + rightPad;
    const svgHeight = topPad + 7 * step + bottomPad;

    svg
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    // Quantile color scale for active >0 expense days (outlier-proof)
    const positiveValues = cells
      .map(c => c.totalExpense)
      .filter(v => v > 0);

    const colorScale =
      positiveValues.length >= 4
        ? d3.scaleQuantile<string>().domain(positiveValues).range(INTENSITY_PALETTE)
        : d3
            .scaleThreshold<number, string>()
            .domain([100, 300, 600])
            .range(INTENSITY_PALETTE);

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${leftPad},${topPad})`);

    // Left weekday labels (Seg, Qua, Sex)
    [1, 3, 5].forEach(dow => {
      rootGroup
        .append('text')
        .attr('x', -8)
        .attr('y', dow * step + cellSize * 0.78)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-slate-400 dark:fill-slate-500')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .text(WEEKDAY_LABELS_LEFT[dow]);
    });

    // Top Portuguese month headers aligned with first week column of each month
    const firstWeekByMonth = new Map<number, number>();
    for (const c of cells) {
      if (!firstWeekByMonth.has(c.month)) {
        firstWeekByMonth.set(c.month, c.weekIndex);
      }
    }

    for (let m = 0; m < 12; m++) {
      const wk = firstWeekByMonth.get(m);
      if (wk !== undefined) {
        rootGroup
          .append('text')
          .attr('x', wk * step)
          .attr('y', -8)
          .attr('text-anchor', 'start')
          .attr('class', 'fill-slate-500 dark:fill-slate-400')
          .style('font-size', '10px')
          .style('font-weight', '700')
          .text(MONTH_ABBR_PT_BR[m]);
      }
    }

    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    const zeroFill = isDark ? '#1e293b' : '#ecfdf5';
    const zeroStroke = isDark ? '#334155' : '#d1fae5';

    // Day cells
    const rects = rootGroup
      .selectAll<SVGRectElement, DailyHeatmapCell>('.d3-heatmap-cell')
      .data(cells, d => d.dateStr)
      .enter()
      .append('rect')
      .attr('class', 'd3-heatmap-cell')
      .attr('data-testid', d => `heatmap-cell-${d.dateStr}`)
      .attr('data-date', d => d.dateStr)
      .attr('x', d => d.weekIndex * step)
      .attr('y', d => d.dayOfWeek * step)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', d => (d.totalExpense <= 0 ? zeroFill : colorScale(d.totalExpense)))
      .attr('stroke', d => {
        if (selectedDateStr === d.dateStr) return '#38bdf8';
        return d.totalExpense <= 0 ? zeroStroke : 'rgba(15,23,42,0.08)';
      })
      .attr('stroke-width', d => (selectedDateStr === d.dateStr ? 2.5 : 1))
      .style('cursor', 'pointer');

    rects
      .on('mouseenter', function (_event, d) {
        const isSelected = selectedDateStr === d.dateStr;
        d3.select(this)
          .raise()
          .attr('stroke', isSelected ? '#38bdf8' : isDark ? '#ffffff' : '#0f172a')
          .attr('stroke-width', isSelected ? 2.5 : 2);

        setHoveredCellInfo({
          cell: d,
          xPx: leftPad + d.weekIndex * step + cellSize / 2,
          yPx: topPad + d.dayOfWeek * step,
          containerWidth: svgWidth,
        });
      })
      .on('mouseleave', function (_event, d) {
        const isSelected = selectedDateStr === d.dateStr;
        d3.select(this)
          .attr(
            'stroke',
            isSelected
              ? '#38bdf8'
              : d.totalExpense <= 0
                ? zeroStroke
                : 'rgba(15,23,42,0.08)'
          )
          .attr('stroke-width', isSelected ? 2.5 : 1);

        setHoveredCellInfo(null);
      })
      .on('click', (_event, d) => {
        setSelectedDateStr(prev => (prev === d.dateStr ? null : d.dateStr));
      });
  }, [heatmapSummary.cells, containerWidth, selectedDateStr]);

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-annual-expense-heatmap"
    >
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <CalendarDays className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Calendário Anual de Intensidade (D3.js)
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Mapa de Calor Anual de Despesas ({selectedYear})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualize os 365 dias do ano com escala por quantis (imune a outliers). Clique em qualquer quadrado para inspecionar os lançamentos do dia.
          </p>
        </div>

        {/* Year Selector + Scope Filter */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Year Pills */}
          <div
            role="group"
            aria-label="Selecionar ano do mapa de calor"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
          >
            {availableYears.map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                data-testid={`btn-heatmap-year-${yr}`}
                aria-pressed={selectedYear === yr}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  selectedYear === yr
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Scope Selector */}
          <div
            role="group"
            aria-label="Filtrar escopo do mapa de calor"
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
                  data-testid={`btn-heatmap-scope-${opt.id}`}
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
        </div>
      </div>

      {/* 3 Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between"
          data-testid="heatmap-kpi-zero-spend"
        >
          <div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
              Dias sem Gastos (Zero-Spend)
            </span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              {heatmapSummary.zeroSpendDays} dias
            </span>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div
          className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between"
          data-testid="heatmap-kpi-peak-day"
        >
          <div>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
              Dia de Pico no Ano
            </span>
            <span className="text-xl font-black text-rose-700 dark:text-rose-300 tabular-nums">
              {heatmapSummary.peakDay
                ? formatBRL(heatmapSummary.peakDay.totalExpense)
                : formatBRL(0)}
            </span>
            {heatmapSummary.peakDay && (
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400 block font-semibold tabular-nums">
                {formatDateDDMMYYYY(heatmapSummary.peakDay.dateStr)} • {heatmapSummary.peakDay.topCategory}
              </span>
            )}
          </div>
          <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
        </div>

        <div
          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
          data-testid="heatmap-kpi-avg-day"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              Média por Dia com Gasto
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatBRL(heatmapSummary.avgActiveDayExpense)}
            </span>
            <span className="text-[10px] text-slate-400 block font-semibold tabular-nums">
              Total anual: {formatBRL(heatmapSummary.totalYearExpense)}
            </span>
          </div>
          <CalendarDays className="w-5 h-5 text-orange-500 shrink-0" />
        </div>
      </div>

      {/* Horizontal Scroll Wrapper + D3 53x7 Grid + Tooltip */}
      <div ref={containerRef} className="relative">
        <div
          className="overflow-x-auto pb-2"
          data-testid="heatmap-scroll-container"
        >
          <svg
            ref={svgRef}
            className="block select-none"
            role="img"
            aria-label={`Mapa de calor anual de despesas para ${selectedYear}`}
          />
        </div>

        {hoveredCellInfo && (
          <div
            data-testid="heatmap-hover-tooltip"
            className="pointer-events-none absolute z-20 w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl text-xs space-y-1.5"
            style={{
              left: Math.max(
                8,
                Math.min(containerWidth - 248, hoveredCellInfo.xPx - 120)
              ),
              top:
                hoveredCellInfo.yPx < 95
                  ? hoveredCellInfo.yPx + 24
                  : Math.max(4, hoveredCellInfo.yPx - 102),
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-black text-slate-900 dark:text-white tabular-nums">
                {formatDateDDMMYYYY(hoveredCellInfo.cell.dateStr)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {WEEKDAY_FULL_PT_BR[hoveredCellInfo.cell.dayOfWeek]}
              </span>
            </div>

            {hoveredCellInfo.cell.totalExpense <= 0 ? (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Nenhum gasto registrado neste dia
              </p>
            ) : (
              <div className="space-y-1 tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Gasto</span>
                  <strong className="text-rose-600 dark:text-rose-400">
                    {formatBRL(hoveredCellInfo.cell.totalExpense)}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Lançamentos</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {hoveredCellInfo.cell.txCount}x
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Principal</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                    {hoveredCellInfo.cell.topCategory}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantile Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
        <span>
          Clique em qualquer dia da grade para abrir o detalhamento completo abaixo.
          {heatmapSummary.isFallbackData ? ' · Histórico anual complementado por linha de base sazonal' : ''}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            Dia sem Gastos
          </span>
          <span
            className="w-3 h-3 rounded-xs bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 inline-block"
            title="Dia sem gastos"
          />
          <span className="text-[10px] text-slate-400 mx-1">Menos</span>
          {INTENSITY_PALETTE.map(hex => (
            <span
              key={hex}
              className="w-3 h-3 rounded-xs inline-block"
              style={{ backgroundColor: hex }}
            />
          ))}
          <span className="text-[10px] text-slate-400 ml-1">Mais</span>
        </div>
      </div>

      {/* Collapsible Daily Transactions Detail Panel */}
      {selectedDayDetails && (
        <div
          data-testid="heatmap-day-detail-panel"
          className="mt-2 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-sky-200 dark:border-sky-900/60 space-y-3.5 transition-all duration-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4
                  className="text-sm font-black text-slate-900 dark:text-white"
                  data-testid="heatmap-detail-date-heading"
                >
                  {selectedDayDetails.formattedTitle}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  <span>
                    {selectedDayDetails.transactions.length}{' '}
                    {selectedDayDetails.transactions.length === 1
                      ? 'lançamento registrado'
                      : 'lançamentos registrados'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Total Saídas: {formatBRL(selectedDayDetails.totalExpenses)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              aria-label="Fechar detalhamento do dia"
              data-testid="btn-close-heatmap-detail"
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayDetails.transactions.length === 0 ? (
            <div
              data-testid="heatmap-detail-empty-state"
              className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-black">Dia sem Gastos Registrados</strong>
                <span className="text-emerald-700/90 dark:text-emerald-300/90">
                  {selectedDayDetails.gridCell && selectedDayDetails.gridCell.totalExpense > 0
                    ? `Nenhum lançamento real no extrato para ${formatDateDDMMYYYY(selectedDayDetails.dateStr)} (intensidade estimada na linha de base anual: ${formatBRL(selectedDayDetails.gridCell.totalExpense)}).`
                    : `Parabéns! Nenhum gasto foi registrado em ${formatDateDDMMYYYY(selectedDayDetails.dateStr)} no escopo selecionado.`}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayDetails.transactions.map(tx => {
                const isExpense = tx.type === 'despesa';
                const pj = isTransactionPJ(tx);
                const categoryLabel = (tx.category || 'Geral').trim() || 'Geral';

                return (
                  <div
                    key={tx.id}
                    data-testid={`heatmap-detail-tx-${tx.id}`}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      {isExpense ? (
                        <ArrowDownCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                            <Tag className="w-2.5 h-2.5" />
                            <span>{categoryLabel}</span>
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              pj
                                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {pj ? 'MEI/PJ' : 'PF'}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Receipt className="w-2.5 h-2.5" />
                            <span>{tx.account}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-sm font-black tabular-nums shrink-0 self-end sm:self-center ${
                        isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatBRL(Math.abs(tx.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
