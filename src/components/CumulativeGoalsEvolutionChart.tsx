import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  calculateCumulativeEvolution,
  CumulativeEvolutionPoint,
} from '../utils/cumulativeGoalsEvolution';

export interface CumulativeGoalsEvolutionChartProps {
  dreams: DreamGoal[];
  transactions?: Transaction[];
  className?: string;
}

function formatAxisBRL(value: number): string {
  if (value === 0) return 'R$ 0';
  if (Math.abs(value) >= 1000) {
    const kVal = value / 1000;
    const formatted = Number.isInteger(kVal)
      ? kVal.toFixed(0)
      : kVal.toFixed(1).replace('.', ',');
    return `R$ ${formatted}k`;
  }
  return `R$ ${Math.round(value)}`;
}

function formatSignedBRL(value: number): string {
  const absFormatted = formatBRL(Math.abs(value));
  return value >= 0 ? `+${absFormatted}` : `-${absFormatted}`;
}

function formatSignedPct(pct: number): string {
  const abs = Math.abs(pct).toFixed(1).replace('.', ',');
  return pct >= 0 ? `+${abs}%` : `-${abs}%`;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: CumulativeEvolutionPoint;
}

const CustomActualDot: React.FC<CustomDotProps> = ({ cx, cy, payload }) => {
  if (
    cx === undefined ||
    cy === undefined ||
    !payload ||
    payload.actualCumulative === null ||
    payload.status === null
  ) {
    return <g />;
  }

  const fillColor = payload.status === 'ahead' ? '#10b981' : '#f43f5e';
  const radius = payload.isCurrentMonth ? 5.5 : 4;

  return (
    <g>
      {payload.isCurrentMonth && (
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill={fillColor}
          fillOpacity={0.2}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fillColor}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CumulativeEvolutionPoint }>;
}

const DiagnosticTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const hasActual = pt.actualCumulative !== null && pt.monthlyVarianceBRL !== null;
  const isAhead = (pt.monthlyVarianceBRL ?? 0) >= 0;

  return (
    <div
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-2.5 min-w-[255px] z-50 pointer-events-none"
      data-testid="cumulative-evolution-tooltip"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="font-bold text-slate-900 dark:text-white">
          {pt.monthFullLabel}
        </span>
        {pt.isCurrentMonth ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Mês Atual
          </span>
        ) : pt.isFutureMonth ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            Projeção
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
            <span
              className={`w-2.5 h-2.5 rounded-full inline-block ${
                !hasActual
                  ? 'bg-slate-300 dark:bg-slate-600'
                  : isAhead
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            Saldo Acumulado Real:
          </span>
          <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
            {hasActual
              ? formatBRL(pt.actualCumulative as number)
              : 'Mês futuro (projeção)'}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-500 inline-block" />
            Meta Ideal até o Mês:
          </span>
          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
            {formatBRL(pt.plannedCumulative)}
          </strong>
        </div>

        {!pt.isFutureMonth && pt.monthlyDeposit > 0 && (
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500 dark:text-slate-400">
            <span>Aporte registrado no mês:</span>
            <span className="font-mono tabular-nums font-semibold">
              {formatBRL(pt.monthlyDeposit)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Diferença no Mês:
        </span>
        {hasActual ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] tabular-nums border ${
              isAhead
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {formatSignedBRL(pt.monthlyVarianceBRL as number)} (
            {formatSignedPct(pt.monthlyVariancePct ?? 0)}){' '}
            {isAhead ? 'Acima do planejado' : 'Abaixo do planejado'}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            Trajetória planejada até o prazo
          </span>
        )}
      </div>
    </div>
  );
};

export const CumulativeGoalsEvolutionChart: React.FC<CumulativeGoalsEvolutionChartProps> = ({
  dreams,
  transactions = [],
  className = '',
}) => {
  const [selectedDreamId, setSelectedDreamId] = useState<string | 'ALL'>('ALL');

  // Reset filter to ALL if selected dream was deleted
  const effectiveFilterId = useMemo(() => {
    if (selectedDreamId === 'ALL') return 'ALL';
    return dreams.some(d => d.id === selectedDreamId) ? selectedDreamId : 'ALL';
  }, [dreams, selectedDreamId]);

  const evolution = useMemo(() => {
    return calculateCumulativeEvolution(dreams, {
      selectedDreamId: effectiveFilterId,
      transactions,
    });
  }, [dreams, effectiveFilterId, transactions]);

  const maxY = useMemo(() => {
    const peak = Math.max(
      evolution.totalTargetAmount,
      ...evolution.points.map(p =>
        Math.max(p.plannedCumulative, p.actualCumulative ?? 0)
      )
    );
    if (peak <= 0) return 1000;
    return Math.ceil((peak * 1.12) / 100) * 100;
  }, [evolution]);

  const isAhead = evolution.currentStatus === 'ahead';
  const actualStrokeColor = isAhead ? '#10b981' : '#f43f5e';
  const gradientId = `cumulative-actual-fill-${isAhead ? 'ahead' : 'behind'}`;

  return (
    <section
      className={`bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 ${className}`}
      data-testid="cumulative-goals-evolution-chart"
    >
      {/* Header & Goal Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Evolução do Saldo Acumulado vs. Meta Ideal
            </h3>

            {/* Current Month Status Badge */}
            {evolution.hasData && (
              <span
                data-testid="cumulative-status-badge"
                data-status={evolution.currentStatus}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap tabular-nums ${
                  isAhead
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {isAhead ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {formatSignedBRL(evolution.currentVarianceBRL)}{' '}
                  {isAhead ? 'Acima do Planejado' : 'Abaixo do Planejado'}
                </span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo mês a mês do saldo real guardado contra a linha ideal planejada até o prazo final.
          </p>
        </div>

        {/* Selector: Consolidated vs Individual Goal */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <label
            htmlFor="cumulative-goal-select"
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Escopo:</span>
          </label>
          <select
            id="cumulative-goal-select"
            data-testid="select-cumulative-goal-filter"
            value={effectiveFilterId}
            onChange={e => setSelectedDreamId(e.target.value)}
            className="flex-1 min-w-0 sm:flex-initial sm:w-64 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Visão Consolidada (Todos os Sonhos)</option>
            {dreams.map(dream => (
              <option key={dream.id} value={dream.id}>
                {dream.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Filter Pills for 1-click Goal Switching */}
      {dreams.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedDreamId('ALL')}
            data-testid="pill-cumulative-filter-ALL"
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              effectiveFilterId === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Todos os Potes ({dreams.length})
          </button>
          {dreams.map(dream => (
            <button
              key={dream.id}
              type="button"
              onClick={() => setSelectedDreamId(dream.id)}
              data-testid={`pill-cumulative-filter-${dream.id}`}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                effectiveFilterId === dream.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dream.title}
            </button>
          ))}
        </div>
      )}

      {/* Compact Diagnostic KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saldo Acumulado Real
          </span>
          <span
            data-testid="cumulative-kpi-actual"
            className={`text-sm sm:text-base font-black tabular-nums mt-0.5 block ${
              isAhead
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatBRL(evolution.actualAtCurrentMonth)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Meta Ideal ({evolution.currentMonthLabel})
          </span>
          <span
            data-testid="cumulative-kpi-planned"
            className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5 block"
          >
            {formatBRL(evolution.plannedAtCurrentMonth)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Aporte Planejado / Mês
          </span>
          <span
            data-testid="cumulative-kpi-monthly-deposit"
            className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tabular-nums mt-0.5 block"
          >
            {formatBRL(evolution.totalPlannedMonthlyDeposit)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Target className="w-3 h-3 text-indigo-500" />
            <span>Alvo Final ({evolution.formattedDeadline})</span>
          </span>
          <span
            data-testid="cumulative-kpi-target"
            className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums mt-0.5 block"
          >
            {formatBRL(evolution.totalTargetAmount)}
          </span>
        </div>
      </div>

      {/* Main Recharts Visualization */}
      {evolution.hasData ? (
        <div
          className="w-full h-[300px] sm:h-[330px] pt-2"
          data-testid="cumulative-evolution-recharts-container"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={evolution.points}
              margin={{ top: 24, right: 24, left: 6, bottom: 6 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={actualStrokeColor} stopOpacity={0.26} />
                  <stop offset="95%" stopColor={actualStrokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
                strokeOpacity={0.6}
              />

              <XAxis
                dataKey="monthLabel"
                interval="preserveStartEnd"
                minTickGap={28}
                padding={{ left: 10, right: 14 }}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.6 }}
                tickLine={false}
                dy={6}
              />

              <YAxis
                domain={[0, maxY]}
                tickFormatter={formatAxisBRL}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={64}
              />

              <Tooltip
                content={<DiagnosticTooltip />}
                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              <ReferenceLine
                x={evolution.currentMonthLabel}
                stroke="#6366f1"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: 'Mês Atual',
                  position: 'top',
                  fill: '#6366f1',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              {/* Linha de Meta Ideal (Tracejada até o prazo final) */}
              <Line
                type="monotone"
                dataKey="plannedCumulative"
                name="Meta Ideal"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Saldo Acumulado Real (Linha contínua + preenchimento até o mês atual; null nos futuros) */}
              <Area
                type="monotone"
                dataKey="actualCumulative"
                name="Saldo Acumulado Real"
                stroke={actualStrokeColor}
                strokeWidth={3}
                fill={`url(#${gradientId})`}
                connectNulls={false}
                dot={<CustomActualDot />}
                activeDot={{
                  r: 6,
                  fill: actualStrokeColor,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
          <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma meta cadastrada para exibir a evolução
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Crie seu primeiro sonho ou pote acima para acompanhar a curva de saldo acumulado.
          </p>
        </div>
      )}

      {/* Semantic Legend & Elapsed Months Summary */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            <span
              className="w-3.5 h-1 rounded-full inline-block"
              style={{ backgroundColor: actualStrokeColor }}
            />
            Saldo Acumulado Real
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="w-4 h-0 border-t-2 border-dashed border-indigo-500 inline-block" />
            Linha de Meta Ideal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Acima do Planejado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            Abaixo do Planejado
          </span>
        </div>

        {evolution.hasData && (
          <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums">
            {isAhead ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span>
              {evolution.aheadMonthsCount}{' '}
              {evolution.aheadMonthsCount === 1 ? 'mês acima' : 'meses acima'} ·{' '}
              {evolution.behindMonthsCount}{' '}
              {evolution.behindMonthsCount === 1 ? 'mês abaixo' : 'meses abaixo'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
