import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Sliders,
  TrendingUp,
  ArrowRight,
  Wallet,
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
  ReferenceArea,
} from 'recharts';
import { DreamGoal, JarType, RecurringExpense, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import {
  PROJECTION_JAR_COLORS,
  PROJECTION_JAR_IDS,
  ProjectionJarId,
  DeficitAlert,
  FutureProjectionPoint,
  calculateFutureProjection,
} from '../utils/futureBalanceProjection';

export type ProjectionScopeFilter = 'CONSOLIDATED' | 'ALL_JARS' | ProjectionJarId;

export interface FutureBalanceProjectionChartProps {
  transactions: Transaction[];
  recurringList: RecurringExpense[];
  dreams?: DreamGoal[];
  jarPercentages?: Partial<Record<JarType, number>>;
  usePjProfitInPf?: boolean;
  onNavigateToScreen?: (screen: string) => void;
  className?: string;
}

interface ChartDatum extends FutureProjectionPoint {
  activeBalance: number;
  activeInflow: number;
  activeOutflow: number;
  bal_NEC_55: number;
  bal_LIF_10: number;
  bal_PLP_10: number;
  bal_EDU_10: number;
  bal_DIV_10: number;
  bal_FER_5: number;
}

function formatAxisBRL(value: number): string {
  if (value === 0) return 'R$ 0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const kVal = abs / 1000;
    const formatted = Number.isInteger(kVal)
      ? kVal.toFixed(0)
      : kVal.toFixed(1).replace('.', ',');
    return `${sign}R$ ${formatted}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

function formatSignedBRL(value: number): string {
  const formatted = formatBRL(Math.abs(value));
  if (value > 0.005) return `+${formatted}`;
  if (value < -0.005) return `-${formatted}`;
  return formatted;
}

interface DeficitAwareDotProps {
  cx?: number;
  cy?: number;
  value?: number;
  color: string;
}

const DeficitAwareDot: React.FC<DeficitAwareDotProps> = ({
  cx,
  cy,
  value,
  color,
}) => {
  if (cx === undefined || cy === undefined || value === undefined) {
    return <g />;
  }

  const isNegative = value < -0.005;
  if (isNegative) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#f43f5e" fillOpacity={0.22} />
        <circle
          cx={cx}
          cy={cy}
          r={4.5}
          fill="#f43f5e"
          stroke="#ffffff"
          strokeWidth={2}
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={color}
      stroke="#ffffff"
      strokeWidth={1.5}
    />
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
  scope: ProjectionScopeFilter;
  includeVariableAvg: boolean;
}

const ProjectionDiagnosticTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  scope,
  includeVariableAvg,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const isAllJars = scope === 'ALL_JARS';
  const endingBalance =
    scope === 'CONSOLIDATED' || isAllJars
      ? pt.consolidatedBalance
      : pt.jarBalances[scope];
  const inflow =
    scope === 'CONSOLIDATED' || isAllJars
      ? pt.consolidatedInflow
      : pt.jarInflows[scope];
  const outflow =
    scope === 'CONSOLIDATED' || isAllJars
      ? pt.consolidatedOutflow
      : pt.jarOutflows[scope];
  const variableAvg =
    scope === 'CONSOLIDATED' || isAllJars
      ? pt.consolidatedVariableAvg
      : pt.jarVariableAvg[scope];

  const scopeLabel =
    scope === 'CONSOLIDATED'
      ? 'Saldo Consolidado Projetado'
      : isAllJars
      ? 'Saldo Consolidado (6 Potes)'
      : `Saldo Projetado (${JAR_DEFINITIONS[scope]?.shortName || scope})`;

  const isNegative = endingBalance < -0.005;

  return (
    <div
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-2 min-w-[215px] sm:min-w-[265px] max-w-[calc(100vw-44px)] sm:max-w-[320px] z-50 pointer-events-none"
      data-testid="future-projection-tooltip"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="font-bold text-slate-900 dark:text-white">
          {pt.monthFullLabel}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            pt.isCurrentMonth
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
          }`}
        >
          {pt.isCurrentMonth ? 'Mês Atual (M0)' : `Projeção M+${pt.monthIndex}`}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {scopeLabel}:
          </span>
          <strong
            className={`font-mono tabular-nums ${
              isNegative
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatSignedBRL(endingBalance)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">
            Entradas Recorrentes:
          </span>
          <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatBRL(inflow)}
          </strong>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">
            Saídas Fixas / Recorrentes:
          </span>
          <strong className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
            -{formatBRL(outflow)}
          </strong>
        </div>

        {includeVariableAvg && variableAvg > 0 && (
          <div className="flex items-center justify-between gap-4 text-[10px] text-amber-700 dark:text-amber-300">
            <span>Inclui média variável (3M):</span>
            <span className="font-mono tabular-nums font-semibold">
              -{formatBRL(variableAvg)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Potes em Déficit no Mês
        </span>
        {pt.negativeJars.length === 0 ? (
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Nenhum pote negativo neste mês</span>
          </div>
        ) : (
          <div className="space-y-1">
            {pt.negativeJars.map(j => (
              <div
                key={j.jarId}
                className="flex items-center justify-between gap-3 text-[11px] text-rose-700 dark:text-rose-300 font-semibold"
              >
                <span className="truncate">{j.jarShortName}</span>
                <span className="font-mono tabular-nums shrink-0">
                  {formatSignedBRL(j.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const FutureBalanceProjectionChart: React.FC<
  FutureBalanceProjectionChartProps
> = ({
  transactions,
  recurringList,
  dreams = [],
  jarPercentages,
  usePjProfitInPf = true,
  onNavigateToScreen,
  className = '',
}) => {
  const [scope, setScope] = useState<ProjectionScopeFilter>('CONSOLIDATED');
  const [includeVariableAvg, setIncludeVariableAvg] = useState<boolean>(false);

  const projection = useMemo(() => {
    return calculateFutureProjection({
      transactions,
      recurringList,
      dreams,
      jarPercentages,
      usePjProfitInPf,
      includeVariableAvg,
    });
  }, [
    transactions,
    recurringList,
    dreams,
    jarPercentages,
    usePjProfitInPf,
    includeVariableAvg,
  ]);

  const chartData: ChartDatum[] = useMemo(() => {
    return projection.points.map(pt => {
      const isJar = scope !== 'CONSOLIDATED' && scope !== 'ALL_JARS';
      return {
        ...pt,
        activeBalance: isJar ? pt.jarBalances[scope] : pt.consolidatedBalance,
        activeInflow: isJar ? pt.jarInflows[scope] : pt.consolidatedInflow,
        activeOutflow: isJar ? pt.jarOutflows[scope] : pt.consolidatedOutflow,
        bal_NEC_55: pt.jarBalances.NEC_55,
        bal_LIF_10: pt.jarBalances.LIF_10,
        bal_PLP_10: pt.jarBalances.PLP_10,
        bal_EDU_10: pt.jarBalances.EDU_10,
        bal_DIV_10: pt.jarBalances.DIV_10,
        bal_FER_5: pt.jarBalances.FER_5,
      };
    });
  }, [projection.points, scope]);

  // Active domain & alert tailored to selected view
  const { yMin, yMax, activeScopeAlert, activeBadgeAlert } = useMemo(() => {
    let minV = 0;
    let maxV = 0;

    chartData.forEach(d => {
      if (scope === 'ALL_JARS') {
        PROJECTION_JAR_IDS.forEach(id => {
          minV = Math.min(minV, d.jarBalances[id]);
          maxV = Math.max(maxV, d.jarBalances[id]);
        });
      } else {
        minV = Math.min(minV, d.activeBalance);
        maxV = Math.max(maxV, d.activeBalance);
      }
    });

    const paddedMin = minV < 0 ? Math.floor((minV * 1.15) / 100) * 100 : 0;
    const paddedMax =
      maxV > 0 ? Math.ceil((maxV * 1.15) / 100) * 100 : 1000;

    let scopeAlert: DeficitAlert | null = null;
    if (scope === 'CONSOLIDATED') {
      scopeAlert =
        projection.consolidatedDeficitAlert || projection.primaryDeficitAlert;
    } else if (scope === 'ALL_JARS') {
      scopeAlert = projection.primaryDeficitAlert;
    } else {
      scopeAlert =
        projection.deficitAlertsByJar[scope] || null;
    }

    const badgeAlert: DeficitAlert | null =
      scope === 'CONSOLIDATED'
        ? projection.consolidatedDeficitAlert || projection.primaryDeficitAlert
        : scope === 'ALL_JARS'
        ? projection.primaryDeficitAlert
        : projection.deficitAlertsByJar[scope] || null;

    return {
      yMin: paddedMin,
      yMax: paddedMax,
      activeScopeAlert: scopeAlert,
      activeBadgeAlert: badgeAlert,
    };
  }, [chartData, scope, projection]);

  const activeEndPoint = chartData[chartData.length - 1];
  const activeStartPoint = chartData[0];

  const summaryInflow =
    scope === 'CONSOLIDATED' || scope === 'ALL_JARS'
      ? projection.projectedMonthlyNetIncome
      : activeEndPoint?.jarInflows[scope] ?? 0;

  const summaryOutflow =
    scope === 'CONSOLIDATED' || scope === 'ALL_JARS'
      ? activeEndPoint?.consolidatedOutflow ?? 0
      : activeEndPoint?.jarOutflows[scope] ?? 0;

  const summaryEndBalance =
    scope === 'CONSOLIDATED' || scope === 'ALL_JARS'
      ? activeEndPoint?.consolidatedBalance ?? 0
      : activeEndPoint?.jarBalances[scope] ?? 0;

  const activeSeriesColor =
    scope === 'CONSOLIDATED'
      ? summaryEndBalance < 0
        ? '#f43f5e'
        : '#0d9488'
      : scope === 'ALL_JARS'
      ? '#6366f1'
      : PROJECTION_JAR_COLORS[scope];

  const activeSeriesLabel =
    scope === 'CONSOLIDATED'
      ? 'Saldo Consolidado'
      : scope === 'ALL_JARS'
      ? 'Todos os 6 Potes'
      : JAR_DEFINITIONS[scope]?.name || scope;

  const gradientId = `future-proj-fill-${scope}`;
  const footerAlert = activeScopeAlert || projection.primaryDeficitAlert;

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-5 overflow-hidden max-w-full ${className}`}
      data-testid="future-balance-projection-chart"
    >
      {/* Header & Status Badge */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Projeção de Saldo Futuro (6 Meses)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Simulação de {projection.futurePoints[0]?.monthLabel} a{' '}
            {projection.futurePoints[5]?.monthLabel} considerando recorrências ativas, despesas fixas e aportes planejados em metas.
          </p>
        </div>

        {/* Early Deficit Status Badge + Variable Spend Switch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {activeBadgeAlert ? (
            <div
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold animate-pulse"
              data-testid="badge-deficit-status"
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>
                Alerta: Déficit Projetado em {activeBadgeAlert.monthLabel}
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold"
              data-testid="badge-deficit-status"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Fluxo Positivo nos Próximos 6M</span>
            </div>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={includeVariableAvg}
            aria-label="Considerar Média de Gastos Variáveis"
            onClick={() => setIncludeVariableAvg(prev => !prev)}
            data-testid="toggle-variable-avg"
            className={`inline-flex items-center justify-between sm:justify-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              includeVariableAvg
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Incluir Média Variável (3M)</span>
            </span>
            <span
              className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                includeVariableAvg
                  ? 'bg-amber-500 justify-end'
                  : 'bg-slate-300 dark:bg-slate-600 justify-start'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
            </span>
          </button>
        </div>
      </div>

      {/* Scope Filter Controls: Consolidated, All 6 Jars, or Individual Jar Pills */}
      <div className="w-full overflow-x-auto no-scrollbar pb-0.5">
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl text-xs font-bold min-w-max"
          role="tablist"
          aria-label="Filtro de visão da projeção"
        >
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'CONSOLIDATED'}
            onClick={() => setScope('CONSOLIDATED')}
            data-testid="filter-scope-consolidated"
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 ${
              scope === 'CONSOLIDATED'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão Consolidada
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={scope === 'ALL_JARS'}
            onClick={() => setScope('ALL_JARS')}
            data-testid="filter-scope-all-jars"
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 ${
              scope === 'ALL_JARS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos os 6 Potes
          </button>

          <span
            className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0"
            aria-hidden="true"
          />

          {PROJECTION_JAR_IDS.map(jarId => {
            const def = JAR_DEFINITIONS[jarId];
            const hasDeficit = Boolean(projection.deficitAlertsByJar[jarId]);
            const isSelected = scope === jarId;

            return (
              <button
                key={jarId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setScope(jarId)}
                data-testid={`filter-scope-${jarId}`}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PROJECTION_JAR_COLORS[jarId] }}
                />
                <span>{def?.shortName || jarId}</span>
                {hasDeficit && (
                  <span
                    className="text-[10px] font-black text-rose-600 dark:text-rose-400"
                    title="Déficit projetado neste pote"
                  >
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Key Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Entrada Mensal Projetada ({activeSeriesLabel})
          </span>
          <span
            className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block"
            data-testid="projection-kpi-inflow"
          >
            +{formatBRL(summaryInflow)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Saída Comprometida / mês
            {includeVariableAvg && projection.projectedMonthlyVariableAvg > 0
              ? ' (c/ Variável 3M)'
              : ''}
          </span>
          <span
            className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5 block"
            data-testid="projection-kpi-outflow"
          >
            -{formatBRL(summaryOutflow)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Saldo Projetado em {activeEndPoint?.monthLabel} (M+6)
          </span>
          <span
            className={`text-base font-black tabular-nums mt-0.5 block ${
              summaryEndBalance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-teal-600 dark:text-teal-400'
            }`}
            data-testid="projection-kpi-ending-balance"
          >
            {formatSignedBRL(summaryEndBalance)}
          </span>
        </div>
      </div>

      {/* Recharts ComposedChart */}
      <div className="w-full h-[290px] sm:h-[330px]" data-testid="future-projection-recharts-container">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={activeSeriesColor}
                  stopOpacity={0.22}
                />
                <stop
                  offset="95%"
                  stopColor={activeSeriesColor}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#94a3b8"
              strokeOpacity={0.22}
            />

            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.5 }}
              tickLine={false}
            />

            <YAxis
              tickFormatter={formatAxisBRL}
              domain={[yMin, yMax]}
              width={72}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{ zIndex: 50, maxWidth: 'calc(100% - 12px)' }}
              content={
                <ProjectionDiagnosticTooltip
                  scope={scope}
                  includeVariableAvg={includeVariableAvg}
                />
              }
            />

            {/* Deficit Danger Zone below R$ 0,00 */}
            {yMin < 0 && (
              <ReferenceArea
                y1={yMin}
                y2={0}
                fill="#f43f5e"
                fillOpacity={0.08}
                ifOverflow="extendDomain"
              />
            )}

            {/* Zero Threshold Line */}
            <ReferenceLine
              y={0}
              stroke="#f43f5e"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Limite R$ 0,00',
                position: 'insideTopRight',
                dy: yMin < 0 ? 4 : -14,
                fill: '#f43f5e',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            {scope === 'ALL_JARS' ? (
              PROJECTION_JAR_IDS.map(jarId => (
                <Line
                  key={jarId}
                  type="monotone"
                  dataKey={`bal_${jarId}`}
                  name={JAR_DEFINITIONS[jarId]?.shortName || jarId}
                  stroke={PROJECTION_JAR_COLORS[jarId]}
                  strokeWidth={2.5}
                  dot={(dotProps: any) => (
                    <DeficitAwareDot
                      key={`dot-${jarId}-${dotProps.index}`}
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      value={dotProps.value}
                      color={PROJECTION_JAR_COLORS[jarId]}
                    />
                  )}
                  activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff' }}
                  isAnimationActive={false}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey="activeBalance"
                name={activeSeriesLabel}
                stroke={activeSeriesColor}
                strokeWidth={3}
                fill={`url(#${gradientId})`}
                dot={(dotProps: any) => (
                  <DeficitAwareDot
                    key={`dot-${scope}-${dotProps.index}`}
                    cx={dotProps.cx}
                    cy={dotProps.cy}
                    value={dotProps.value}
                    color={activeSeriesColor}
                  />
                )}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          {scope === 'ALL_JARS' ? (
            PROJECTION_JAR_IDS.map(jarId => (
              <span key={jarId} className="inline-flex items-center gap-1.5 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PROJECTION_JAR_COLORS[jarId] }}
                />
                <span>{JAR_DEFINITIONS[jarId]?.shortName}</span>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span
                className="w-3 h-1 rounded-full"
                style={{ backgroundColor: activeSeriesColor }}
              />
              <span>{activeSeriesLabel} (M0: {formatSignedBRL(activeStartPoint?.activeBalance ?? 0)})</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Ponto em Déficit (&lt; R$ 0,00)</span>
          </span>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Base: {usePjProfitInPf ? 'PF + Lucro PJ' : 'Somente PF'}
        </span>
      </div>

      {/* Early Warning Footer (Radar de Déficit Antecipado) */}
      {footerAlert ? (
        <div
          className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-900/70 space-y-3"
          data-testid="radar-deficit-footer"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs leading-relaxed text-rose-950 dark:text-rose-100">
                <span className="font-bold text-rose-700 dark:text-rose-300 block">
                  Radar de Déficit Antecipado
                </span>
                <p>
                  Atenção Antecipada:{' '}
                  {footerAlert.jarId === 'CONSOLIDATED' ? (
                    <>
                      O <strong>Fluxo Consolidado</strong>
                    </>
                  ) : (
                    <>
                      O pote <strong>{footerAlert.jarName}</strong>
                    </>
                  )}{' '}
                  entrará em déficit de{' '}
                  <strong className="tabular-nums whitespace-nowrap text-rose-700 dark:text-rose-300">
                    -{formatBRL(footerAlert.deficitAmountBRL)}
                  </strong>{' '}
                  em <strong>{footerAlert.monthFullLabel}</strong> devido ao peso de{' '}
                  <strong>{footerAlert.mainCostDriver}</strong>. Reduza{' '}
                  <strong className="tabular-nums whitespace-nowrap">
                    {formatBRL(footerAlert.suggestedMonthlyReductionBRL)}/mês
                  </strong>{' '}
                  {footerAlert.jarId === 'CONSOLIDATED'
                    ? 'nas recorrências mensais ou rebalanceie os potes para evitar saldo negativo.'
                    : 'nas recorrências deste pote ou rebalanceie a cota para evitar saldo negativo.'}
                </p>
              </div>
            </div>

            {onNavigateToScreen && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onNavigateToScreen('automacoes')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <span>Revisar Recorrências</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToScreen('potes')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Rebalancear Potes</span>
                </button>
              </div>
            )}
          </div>

          {projection.allJarDeficitAlerts.length > 1 && (
            <div className="pt-2.5 border-t border-rose-200/70 dark:border-rose-900/60 flex items-center gap-2 flex-wrap text-[11px]">
              <span className="font-semibold text-rose-800 dark:text-rose-200">
                Potes com déficit projetado:
              </span>
              {projection.allJarDeficitAlerts.map(alert => (
                <button
                  key={alert.jarId}
                  type="button"
                  onClick={() =>
                    setScope(alert.jarId as ProjectionJarId)
                  }
                  className={`px-2.5 py-1 rounded-lg border font-bold tabular-nums transition cursor-pointer ${
                    scope === alert.jarId
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white/80 dark:bg-slate-900/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                  }`}
                >
                  {alert.jarShortName}: -{formatBRL(alert.deficitAmountBRL)} ({alert.monthLabel})
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-100"
          data-testid="radar-positive-footer"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Previsão Saudável:</strong> Nenhum pote ou saldo consolidado entra no negativo nos próximos 6 meses com os compromissos atuais.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
