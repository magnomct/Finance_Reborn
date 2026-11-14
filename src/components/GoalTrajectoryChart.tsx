import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Check,
  X,
  History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  calculateDreamGoalTrajectory,
  formatTargetDateDisplay,
  GoalTrajectoryPoint,
  GoalTrajectoryResult,
} from '../utils/goalTrajectory';

export interface GoalTrajectoryChartProps {
  dream: DreamGoal;
  transactions?: Transaction[];
  onRecordContribution?: (dreamId: string, amount: number, date: string, note?: string) => void;
  compact?: boolean;
  className?: string;
}

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const GoalTrajectoryChart: React.FC<GoalTrajectoryChartProps> = ({
  dream,
  transactions = [],
  onRecordContribution,
  compact = false,
  className = '',
}) => {
  const [yieldRateMonthlyPct, setYieldRateMonthlyPct] = useState<number>(dream.yieldRateMonthlyPct ?? 0);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState<string>('');
  const [contributionDate, setContributionDate] = useState<string>(() => getTodayIsoDate());
  const [contributionNote, setContributionNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const trajectory: GoalTrajectoryResult = useMemo(() => {
    return calculateDreamGoalTrajectory(dream, transactions, yieldRateMonthlyPct);
  }, [dream, transactions, yieldRateMonthlyPct]);

  const maxY = useMemo(() => {
    const maxPointVal = Math.max(
      trajectory.targetAmount,
      ...trajectory.points.map(p =>
        Math.max(p.idealCumulative, p.actualCumulative ?? 0, p.monthlyDeposit)
      )
    );
    if (maxPointVal <= 0) return 1000;
    return Math.ceil((maxPointVal * 1.12) / 100) * 100;
  }, [trajectory]);

  const isAheadOrCompleted =
    trajectory.pacingStatus === 'ahead' || trajectory.pacingStatus === 'completed';
  const isSlightlyBehind = trajectory.pacingStatus === 'slight_delay';

  const actualColor = isAheadOrCompleted
    ? '#10b981'
    : isSlightlyBehind
    ? '#f59e0b'
    : '#f43f5e';

  const badgeStyleClass = isAheadOrCompleted
    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    : isSlightlyBehind
    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

  const safeGradientId = `goal-actual-area-${dream.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const xAxisInterval = useMemo(() => {
    const count = trajectory.points.length;
    if (count <= 12) return 0;
    if (count <= 24) return 1;
    return Math.ceil(count / 12) - 1;
  }, [trajectory.points.length]);

  const handleOpenContributionForm = () => {
    const defaultVal =
      trajectory.requiredMonthlyDepositNow > 0
        ? trajectory.requiredMonthlyDepositNow
        : dream.monthlyDeposit > 0
        ? dream.monthlyDeposit
        : 100;
    setContributionAmount(String(defaultVal));
    setContributionDate(getTodayIsoDate());
    setContributionNote('');
    setFormError(null);
    setIsContributionFormOpen(true);
  };

  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(contributionAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Informe um valor de aporte maior que R$ 0,00.');
      return;
    }
    if (!contributionDate) {
      setFormError('Selecione a data do aporte.');
      return;
    }

    if (onRecordContribution) {
      onRecordContribution(dream.id, parsed, contributionDate, contributionNote);
    }

    setFormError(null);
    setIsContributionFormOpen(false);
    setSuccessBanner(`Aporte de ${formatBRL(parsed)} registrado em ${formatTargetDateDisplay(contributionDate)}.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const recentContributions = useMemo(() => {
    return [...trajectory.effectiveHistory].reverse().slice(0, 4);
  }, [trajectory.effectiveHistory]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: GoalTrajectoryPoint }> }) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;

    const hasActual = pt.actualCumulative !== null && pt.deltaBRL !== null;
    const isPositiveDelta = (pt.deltaBRL ?? 0) >= 0;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2 min-w-[235px] z-50 pointer-events-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span className="font-bold text-slate-900 dark:text-white">
            {pt.monthFullLabel}
          </span>
          {pt.isCurrentMonth && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              Hoje
            </span>
          )}
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500/60 inline-block" />
              Aporte do Mês:
            </span>
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
              {pt.isFutureMonth ? '—' : formatBRL(pt.monthlyDeposit)}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: actualColor }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: actualColor }} />
              Acumulado Real:
            </span>
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
              {hasActual ? formatBRL(pt.actualCumulative as number) : 'Mês futuro'}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
              Meta Esperada até o Mês:
            </span>
            <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {formatBRL(pt.idealCumulative)}
            </strong>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Delta:</span>
          {hasActual ? (
            <strong
              className={`font-mono tabular-nums font-bold ${
                isPositiveDelta
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositiveDelta
                ? `+${formatBRL(pt.deltaBRL as number)} adiantado`
                : `-${formatBRL(Math.abs(pt.deltaBRL as number))} abaixo da meta`}
            </strong>
          ) : (
            <span className="text-slate-400">Projeção futura</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 ${className}`}
      data-testid={`goal-trajectory-chart-${dream.id}`}
    >
      {/* Header & Dynamic Status Pill */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Evolução de Aportes &amp; Trajetória da Meta
            </h4>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${badgeStyleClass}`}
              data-testid={`trajectory-status-badge-${dream.id}`}
            >
              {trajectory.pacingStatus === 'ahead' || trajectory.pacingStatus === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : trajectory.pacingStatus === 'slight_delay' ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="tabular-nums">{trajectory.pacingBadgeLabel}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Progresso Real vs. Trajetória Ideal
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Início {formatTargetDateDisplay(trajectory.startMonthKey)}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Prazo {trajectory.formattedTargetDate}</span>
            {trajectory.usedFallbackHistory && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="text-slate-400 dark:text-slate-500">Histórico estimado a partir do saldo</span>
              </>
            )}
          </p>
        </div>

        {/* Yield Assumption Toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start lg:self-auto shrink-0"
          role="group"
          aria-label="Modo de trajetória ideal"
        >
          <button
            type="button"
            onClick={() => setYieldRateMonthlyPct(0)}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 text-[11px] ${
              yieldRateMonthlyPct === 0
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid={`btn-trajectory-linear-${dream.id}`}
          >
            Trajetória Linear
          </button>
          <button
            type="button"
            onClick={() => setYieldRateMonthlyPct(0.8)}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 text-[11px] ${
              yieldRateMonthlyPct > 0
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid={`btn-trajectory-compound-${dream.id}`}
          >
            Com Rendimento (0,8%/mês)
          </button>
        </div>
      </div>

      {/* 4-Column Tabular Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Acumulado Real
          </span>
          <span
            className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white"
            data-testid={`trajectory-kpi-actual-${dream.id}`}
          >
            {formatBRL(trajectory.currentAmount)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Meta Esperada Hoje
          </span>
          <span
            className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-700 dark:text-slate-200"
            data-testid={`trajectory-kpi-ideal-${dream.id}`}
          >
            {formatBRL(trajectory.idealAtCurrentMonth)}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Aporte Necessário Agora
          </span>
          <span
            className="text-sm sm:text-base font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400"
            data-testid={`trajectory-kpi-required-${dream.id}`}
          >
            {trajectory.pacingStatus === 'completed'
              ? 'Concluída'
              : `${formatBRL(trajectory.requiredMonthlyDepositNow)}/mês`}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Média Últimos 3 Meses
          </span>
          <span
            className="text-sm sm:text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400"
            data-testid={`trajectory-kpi-avg3m-${dream.id}`}
          >
            {formatBRL(trajectory.last3MonthsAvgDeposit)}/mês
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Progresso Real vs. Trajetória Ideal
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500/40 border border-indigo-500/60" />
            <span>Aporte do Mês</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-slate-400" />
            <span>Trajetória Ideal</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 rounded-full" style={{ backgroundColor: actualColor }} />
            <span>Acumulado Real</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-0.5 h-3 border-l-2 border-dashed border-indigo-500" />
            <span>Hoje</span>
          </span>
        </div>
      </div>

      {/* Recharts ComposedChart */}
      <div
        className={`${compact ? 'h-60' : 'h-72'} w-full`}
        data-testid={`trajectory-composed-chart-${dream.id}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={trajectory.points}
            margin={{ top: 18, right: 16, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id={safeGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={actualColor} stopOpacity={0.28} />
                <stop offset="95%" stopColor={actualColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#94a3b8"
              strokeOpacity={0.2}
            />

            <XAxis
              dataKey="monthKey"
              tickFormatter={(val: string) => {
                const match = trajectory.points.find(p => p.monthKey === val);
                return match ? match.monthLabel : val;
              }}
              interval={xAxisInterval}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />

            <YAxis
              domain={[0, maxY]}
              tickFormatter={(val: number) =>
                val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : `R$ ${val}`
              }
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={62}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              x={trajectory.currentMonthKey}
              stroke="#6366f1"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: 'Hoje',
                position: 'top',
                fill: '#6366f1',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            <Bar
              dataKey="monthlyDeposit"
              name="Aporte do Mês"
              fill="#6366f1"
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="idealCumulative"
              name="Trajetória Ideal"
              stroke="#94a3b8"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#94a3b8' }}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey="actualCumulative"
              name="Acumulado Real"
              stroke={actualColor}
              strokeWidth={3}
              fill={`url(#${safeGradientId})`}
              connectNulls={false}
              dot={{ r: 3.5, fill: actualColor, strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: actualColor }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Actionable Pacing Recalibration Footer & Quick Inline Contribution */}
      <div
        className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3"
        data-testid={`trajectory-pacing-footer-${dream.id}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl p-3.5">
          <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed min-w-0">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p data-testid={`trajectory-recalibration-text-${dream.id}`}>
              {trajectory.pacingStatus === 'completed' ? (
                <>
                  Meta de <strong className="font-mono tabular-nums">{formatBRL(trajectory.targetAmount)}</strong> concluída! Você atingiu 100% do objetivo previsto para <strong>{trajectory.formattedTargetDate}</strong>.
                </>
              ) : trajectory.hasTargetDate ? (
                <>
                  Para atingir <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{formatBRL(trajectory.targetAmount)}</strong> até <strong>{trajectory.formattedTargetDate}</strong>, seu aporte necessário a partir de hoje é de{' '}
                  <strong className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatBRL(trajectory.requiredMonthlyDepositNow)}/mês
                  </strong>{' '}
                  (Ritmo atual projeta conclusão em <strong>{trajectory.projectedCompletionLabel}</strong>).
                </>
              ) : (
                <>
                  Para atingir <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{formatBRL(trajectory.targetAmount)}</strong>, defina um Prazo Final na meta para recalcular o aporte mensal ideal (Ritmo atual projeta conclusão em <strong>{trajectory.projectedCompletionLabel}</strong>).
                </>
              )}
            </p>
          </div>

          {onRecordContribution && !isContributionFormOpen && (
            <button
              type="button"
              onClick={handleOpenContributionForm}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              data-testid={`btn-inline-register-contribution-${dream.id}`}
            >
              <span>+ Registrar Aporte</span>
            </button>
          )}
        </div>

        {/* Inline Contribution Quick Form */}
        {isContributionFormOpen && onRecordContribution && (
          <form
            onSubmit={handleSubmitContribution}
            className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/70 space-y-3"
            data-testid={`inline-contribution-form-${dream.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-100">
                Novo Aporte em {dream.title}
              </span>
              <button
                type="button"
                onClick={() => setIsContributionFormOpen(false)}
                aria-label="Cancelar registro de aporte"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label
                  htmlFor={`contrib-amount-${dream.id}`}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1"
                >
                  Valor do Aporte (R$)
                </label>
                <input
                  id={`contrib-amount-${dream.id}`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={contributionAmount}
                  onChange={e => setContributionAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid={`input-inline-contribution-amount-${dream.id}`}
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor={`contrib-date-${dream.id}`}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1"
                >
                  Data do Aporte
                </label>
                <input
                  id={`contrib-date-${dream.id}`}
                  type="date"
                  value={contributionDate}
                  onChange={e => setContributionDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid={`input-inline-contribution-date-${dream.id}`}
                />
              </div>

              <div>
                <label
                  htmlFor={`contrib-note-${dream.id}`}
                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1"
                >
                  Descrição (Opcional)
                </label>
                <input
                  id={`contrib-note-${dream.id}`}
                  type="text"
                  value={contributionNote}
                  onChange={e => setContributionNote(e.target.value)}
                  placeholder="Ex: Aporte extra do mês"
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  data-testid={`input-inline-contribution-note-${dream.id}`}
                />
              </div>
            </div>

            {formError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsContributionFormOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                data-testid={`btn-confirm-inline-contribution-${dream.id}`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar Aporte</span>
              </button>
            </div>
          </form>
        )}

        {successBanner && (
          <div
            className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2"
            data-testid={`inline-contribution-success-${dream.id}`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Recent Contributions Strip */}
        {recentContributions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold">
                <History className="w-3.5 h-3.5" />
                <span>Últimos Aportes Registrados</span>
              </span>
              <span className="tabular-nums">
                {trajectory.effectiveHistory.length}{' '}
                {trajectory.effectiveHistory.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {recentContributions.map(item => (
                <div
                  key={item.id}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {item.note || 'Aporte registrado'}
                    </span>
                    <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatTargetDateDisplay(item.date)}
                    </span>
                  </div>
                  <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                    +{formatBRL(item.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
