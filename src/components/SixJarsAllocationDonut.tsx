import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  PieChart as PieChartIcon,
  RotateCcw,
  Sliders,
  ArrowRight,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { JarType, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  DEFAULT_SIX_JAR_PERCENTAGES,
  SIX_JAR_KEYS,
  SixJarMetricItem,
  SixJarsInnerRingDatum,
  SixJarsOuterRingDatum,
  calculateSixJarsMetrics,
  formatMonthLabelPtBr,
  formatPctPtBr,
  resolveActiveSixJarsMonth,
} from '../utils/sixJarsMetrics';

export interface SixJarsAllocationDonutProps {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  externalIncomeBase?: number;
  externalPercentages?: Record<string, number>;
  onExternalPercentagesChange?: (next: Record<string, number>) => void;
  selectedJarKey: JarType | null;
  onSelectJar: (jarId: JarType) => void;
  onFilterJarInAgenda?: (jarId: JarType) => void;
}

interface CustomTooltipPayloadItem {
  payload?: SixJarsInnerRingDatum | SixJarsOuterRingDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

const SixJarsTooltipContent: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  // Inner ring item has `limiteMetaPct`
  if ('limiteMetaPct' in data) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-lg text-xs backdrop-blur-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Anel Interno • Meta Ideal
        </div>
        <div className="font-black text-slate-900 dark:text-white mt-0.5">
          {data.name}
        </div>
        <div className="text-slate-600 dark:text-slate-300 tabular-nums mt-0.5">
          Meta: <strong>{formatPctPtBr(data.limiteMetaPct, 0)}%</strong> ({formatBRL(data.limiteMetaBRL)})
        </div>
      </div>
    );
  }

  // Outer ring item
  const outer = data as SixJarsOuterRingDatum;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-lg text-xs backdrop-blur-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {outer.isFreeBalance ? 'Anel Externo • Disponível' : 'Anel Externo • Gasto Real'}
      </div>
      <div className="font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: outer.colorHex }}
        />
        <span>{outer.name}</span>
      </div>
      <div className="text-slate-700 dark:text-slate-200 tabular-nums mt-0.5">
        <strong>{formatBRL(outer.value)}</strong> ({formatPctPtBr(outer.pctDaRenda)}% da renda)
      </div>
      {outer.jarItem && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
          Teto Ideal: {formatBRL(outer.jarItem.limiteMetaBRL)} ({formatPctPtBr(outer.jarItem.limiteMetaPct, 0)}%)
        </div>
      )}
    </div>
  );
};

export const SixJarsAllocationDonut: React.FC<SixJarsAllocationDonutProps> = ({
  transactions,
  usePjProfitInPf,
  externalIncomeBase,
  externalPercentages,
  onExternalPercentagesChange,
  selectedJarKey,
  onSelectJar,
  onFilterJarInAgenda,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    resolveActiveSixJarsMonth(transactions)
  );
  const [customIncomeInput, setCustomIncomeInput] = useState<string>('');
  const [localPercentages, setLocalPercentages] = useState<Record<string, number>>(() => ({
    ...DEFAULT_SIX_JAR_PERCENTAGES,
  }));
  const [isPctEditorOpen, setIsPctEditorOpen] = useState<boolean>(false);
  const [hoveredRingId, setHoveredRingId] = useState<JarType | 'SALDO_LIVRE' | null>(null);
  const [clickedCenterJarId, setClickedCenterJarId] = useState<JarType | 'SALDO_LIVRE' | null>(null);

  const customPercentages = externalPercentages ?? localPercentages;
  const updatePercentages = (
    updater:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => {
    const next = typeof updater === 'function' ? updater(customPercentages) : updater;
    if (onExternalPercentagesChange) {
      onExternalPercentagesChange(next);
    } else {
      setLocalPercentages(next);
    }
  };

  const parsedCustomIncome = useMemo(() => {
    const clean = customIncomeInput.replace(',', '.').trim();
    if (!clean) return undefined;
    const num = parseFloat(clean);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }, [customIncomeInput]);

  const effectiveCustomIncomeBase = useMemo(() => {
    if (parsedCustomIncome !== undefined) return parsedCustomIncome;
    if (
      typeof externalIncomeBase === 'number' &&
      Number.isFinite(externalIncomeBase) &&
      externalIncomeBase > 0
    ) {
      return externalIncomeBase;
    }
    return undefined;
  }, [parsedCustomIncome, externalIncomeBase]);

  const metrics = useMemo(
    () =>
      calculateSixJarsMetrics(transactions, {
        monthKey: selectedMonth,
        usePjProfitInPf,
        customIncomeBase: effectiveCustomIncomeBase,
        customPercentages: customPercentages as Partial<Record<JarType, number>>,
      }),
    [transactions, selectedMonth, usePjProfitInPf, effectiveCustomIncomeBase, customPercentages]
  );

  const totalConfiguredPct = useMemo(
    () =>
      SIX_JAR_KEYS.reduce(
        (acc, key) =>
          acc +
          (customPercentages[key] ??
            DEFAULT_SIX_JAR_PERCENTAGES[key as Exclude<JarType, 'PJ_EXCLUIDO'>]),
        0
      ),
    [customPercentages]
  );

  const activeFocusId = hoveredRingId ?? clickedCenterJarId ?? null;

  const activeCenterJar: SixJarMetricItem | null = useMemo(() => {
    if (!activeFocusId || activeFocusId === 'SALDO_LIVRE') return null;
    return metrics.jars.find(j => j.id === activeFocusId) || null;
  }, [activeFocusId, metrics.jars]);

  const isInspectingFreeBalance = activeFocusId === 'SALDO_LIVRE';

  const handleSelectJarRow = (jarId: JarType) => {
    setClickedCenterJarId(prev => (prev === jarId ? null : jarId));
    onSelectJar(jarId);
  };

  const getStatusVisual = (status: SixJarMetricItem['status']) => {
    if (status === 'estourado') {
      return {
        label: 'Estourado',
        dotClass: 'bg-rose-500',
        badgeClass:
          'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        barColor: '#f43f5e',
      };
    }
    if (status === 'atencao') {
      return {
        label: 'Atenção (85%+)',
        dotClass: 'bg-amber-500',
        badgeClass:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        barColor: '#f59e0b',
      };
    }
    return {
      label: 'Saudável',
      dotClass: 'bg-emerald-500',
      badgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      barColor: '#10b981',
    };
  };

  const handleResetPercentages = () => {
    updatePercentages({ ...DEFAULT_SIX_JAR_PERCENTAGES });
  };

  return (
    <section
      className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
      data-testid="six-jars-allocation-donut"
      aria-labelledby="six-jars-donut-title"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <PieChartIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              Comparativo Concêntrico de Orçamento
            </span>
          </div>
          <h3
            id="six-jars-donut-title"
            className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight"
          >
            Distribuição dos 6 Potes: Meta Ideal vs. Gasto Real
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Anel interno exibe a meta percentual ideal e o anel externo acompanha o consumo real sobre a renda líquida mensal.
          </p>
        </div>

        {/* Month Selector, Editable Base Income & Pct Config Toggle */}
        <div className="flex flex-wrap items-end gap-2.5">
          {/* Month Selector */}
          <div>
            <label
              htmlFor="select-sixjars-month"
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1"
            >
              Mês de Referência
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="select-sixjars-month"
                value={metrics.monthKey}
                onChange={e => setSelectedMonth(e.target.value)}
                data-testid="select-sixjars-month"
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {metrics.availableMonths.map(ym => (
                  <option key={ym} value={ym}>
                    {formatMonthLabelPtBr(ym)}
                  </option>
                ))}
                <option value="ALL">Todos os Meses</option>
              </select>
            </div>
          </div>

          {/* Editable Net Monthly Income Base */}
          <div>
            <label
              htmlFor="input-sixjars-income-base"
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1"
            >
              <span>Renda Líquida Base (100%)</span>
              {parsedCustomIncome !== undefined && (
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
                  • Simulada
                </span>
              )}
            </label>
            <div className="flex items-center gap-1">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  id="input-sixjars-income-base"
                  data-testid="input-sixjars-income-base"
                  type="number"
                  min="0"
                  step="50"
                  placeholder={
                    (externalIncomeBase && externalIncomeBase > 0
                      ? externalIncomeBase
                      : metrics.computedRendaLiquidaMensal) > 0
                      ? (externalIncomeBase && externalIncomeBase > 0
                          ? externalIncomeBase
                          : metrics.computedRendaLiquidaMensal
                        ).toFixed(2)
                      : 'Ex: 4000'
                  }
                  value={customIncomeInput}
                  onChange={e => setCustomIncomeInput(e.target.value)}
                  className="w-36 pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {parsedCustomIncome !== undefined && (
                <button
                  type="button"
                  onClick={() => setCustomIncomeInput('')}
                  title={`Voltar para base configurada (${formatBRL(
                    externalIncomeBase && externalIncomeBase > 0
                      ? externalIncomeBase
                      : metrics.computedRendaLiquidaMensal
                  )})`}
                  aria-label="Restaurar renda líquida automática"
                  data-testid="btn-reset-sixjars-income"
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPctEditorOpen(prev => !prev)}
            data-testid="btn-toggle-pct-editor"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isPctEditorOpen
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustar Metas (%)</span>
          </button>
        </div>
      </div>

      {/* Optional Percentage Customizer Drawer */}
      {isPctEditorOpen && (
        <div
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          data-testid="sixjars-pct-editor"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Configurar Percentuais dos 6 Potes
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Soma atual:{' '}
                <strong
                  className={
                    Math.abs(totalConfiguredPct - 100) < 0.01
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {formatPctPtBr(totalConfiguredPct, 0)}%
                </strong>{' '}
                (padrão Harv Eker: 55% / 10% / 10% / 10% / 10% / 5%)
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetPercentages}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrão 55/10/10/10/10/5</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {metrics.jars.map(jar => (
              <div key={jar.id} className="space-y-1">
                <label
                  htmlFor={`pct-input-${jar.id}`}
                  className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: jar.colorHex }}
                  />
                  <span className="truncate">{jar.shortName}</span>
                </label>
                <div className="relative">
                  <input
                    id={`pct-input-${jar.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={customPercentages[jar.id] ?? jar.limiteMetaPct}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      updatePercentages(prev => ({
                        ...prev,
                        [jar.id]: Number.isFinite(val) && val >= 0 ? Math.min(100, val) : 0,
                      }));
                    }}
                    className="w-full pl-2.5 pr-6 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income Base Strip Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Renda Líquida Base
          </span>
          <span
            className="text-base font-black text-slate-900 dark:text-white tabular-nums mt-0.5 block"
            data-testid="sixjars-income-total"
          >
            {formatBRL(metrics.rendaLiquidaMensal)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
            {metrics.isUsingCustomIncomeBase
              ? 'Base manual definida'
              : `PF ${formatBRL(metrics.cltIncomeBRL)} + MEI ${formatBRL(metrics.pjRepasseLiquidoBRL)}`}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Gasto Real no Mês
          </span>
          <span
            className="text-base font-black text-slate-900 dark:text-white tabular-nums mt-0.5 block"
            data-testid="sixjars-spent-total"
          >
            {formatBRL(metrics.totalGastoBRL)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
            {formatPctPtBr(metrics.totalGastoPctDaRenda)}% da renda líquida
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saldo Livre da Renda
          </span>
          <span
            className={`text-base font-black tabular-nums mt-0.5 block ${
              metrics.excessoTotalRendaBRL > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {metrics.excessoTotalRendaBRL > 0
              ? `-${formatBRL(metrics.excessoTotalRendaBRL)}`
              : formatBRL(metrics.saldoLivreRendaBRL)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {metrics.excessoTotalRendaBRL > 0 ? 'Acima da renda do mês' : 'Disponível não consumido'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saúde dos Potes
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {metrics.overBudgetJars.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {metrics.overBudgetJars.length}{' '}
                  {metrics.overBudgetJars.length === 1 ? 'pote estourado' : 'potes estourados'}
                </span>
              </span>
            ) : metrics.warningJars.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{metrics.warningJars.length} em atenção (85%+)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Todos dentro da meta</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {metrics.okJars.length} saudáveis • {metrics.warningJars.length} atenção
          </span>
        </div>
      </div>

      {/* Over-Budget Visual Alert Banner & Rebalancing Suggestion */}
      {metrics.rebalanceAlerts.length > 0 && (
        <div
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/45 border border-rose-300 dark:border-rose-800/80 space-y-2.5"
          data-testid="sixjars-overbudget-alert-banner"
          role="alert"
        >
          {metrics.rebalanceAlerts.map(alert => (
            <div
              key={alert.overBudgetJar.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 last:pb-0 border-b last:border-b-0 border-rose-200/80 dark:border-rose-900/60"
            >
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <p
                  className="text-xs leading-relaxed text-rose-950 dark:text-rose-100"
                  data-testid={`alert-message-${alert.overBudgetJar.id}`}
                >
                  <strong className="font-black">Limite Ultrapassado:</strong> Você consumiu{' '}
                  <strong className="font-black tabular-nums">
                    {formatPctPtBr(alert.overBudgetJar.gastoRealPctDaRenda)}%
                  </strong>{' '}
                  da renda no pote{' '}
                  <strong className="font-black">{alert.overBudgetJar.name}</strong> (meta máxima:{' '}
                  <strong className="font-black tabular-nums">
                    {formatPctPtBr(alert.overBudgetJar.limiteMetaPct, 0)}%
                  </strong>
                  , excesso de{' '}
                  <strong className="font-black tabular-nums">
                    {formatBRL(alert.overBudgetJar.valorExcedidoBRL)}
                  </strong>
                  ). Para fechar o mês no azul, congele novos gastos neste pote{' '}
                  {alert.bestDonorJar ? (
                    <>
                      ou compense usando a folga disponível em{' '}
                      <strong className="font-black text-emerald-800 dark:text-emerald-300">
                        {alert.bestDonorJar.name}
                      </strong>{' '}
                      <span className="tabular-nums font-bold">
                        ({formatBRL(alert.bestDonorJar.saldoLivreBRL)} livres)
                      </span>
                      .
                    </>
                  ) : (
                    'e revise suas despesas variáveis para reequilibrar o mês.'
                  )}
                </p>
              </div>

              {onFilterJarInAgenda && (
                <button
                  type="button"
                  onClick={() => onFilterJarInAgenda(alert.overBudgetJar.id)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950 text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer self-end sm:self-center"
                >
                  <span>Revisar gastos</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content: Concentric Double Donut + Side Comparison Panel */}
      {metrics.rendaLiquidaMensal <= 0 && metrics.totalGastoBRL <= 0 ? (
        <div
          className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-2"
          data-testid="sixjars-empty-state"
        >
          <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            Nenhuma receita ou despesa registrada em {formatMonthLabelPtBr(metrics.monthKey)}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Informe uma <strong>Renda Líquida Base (R$)</strong> no campo acima para simular e acompanhar seus limites percentuais antes mesmo das receitas caírem na conta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Recharts Concentric Donut */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full h-[310px] sm:h-[330px]" data-testid="sixjars-recharts-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Anel Interno: Meta Ideal (55 / 10 / 10 / 10 / 10 / 5) */}
                  <Pie
                    data={metrics.innerRingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={74}
                    outerRadius={94}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="transparent"
                    isAnimationActive={false}
                    onMouseEnter={(_, index) => {
                      const slice = metrics.innerRingData[index];
                      if (slice) setHoveredRingId(slice.id);
                    }}
                    onMouseLeave={() => setHoveredRingId(null)}
                    onClick={(_, index) => {
                      const slice = metrics.innerRingData[index];
                      if (slice) handleSelectJarRow(slice.id);
                    }}
                  >
                    {metrics.innerRingData.map(entry => {
                      const isFocused = activeFocusId === entry.id || selectedJarKey === entry.id;
                      return (
                        <Cell
                          key={`inner-${entry.id}`}
                          fill={entry.colorHex}
                          fillOpacity={activeFocusId ? (isFocused ? 0.92 : 0.35) : 0.65}
                          className="cursor-pointer transition-opacity duration-150"
                        />
                      );
                    })}
                  </Pie>

                  {/* Anel Externo: Gasto Real Acumulado no Mês (+ Saldo Livre neutro) */}
                  <Pie
                    data={metrics.outerRingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={102}
                    outerRadius={132}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                    onMouseEnter={(_, index) => {
                      const slice = metrics.outerRingData[index];
                      if (slice) setHoveredRingId(slice.id);
                    }}
                    onMouseLeave={() => setHoveredRingId(null)}
                    onClick={(_, index) => {
                      const slice = metrics.outerRingData[index];
                      if (!slice) return;
                      if (slice.id === 'SALDO_LIVRE') {
                        setClickedCenterJarId(prev =>
                          prev === 'SALDO_LIVRE' ? null : 'SALDO_LIVRE'
                        );
                      } else {
                        handleSelectJarRow(slice.id);
                      }
                    }}
                  >
                    {metrics.outerRingData.map(entry => {
                      const isFocused = activeFocusId === entry.id;
                      return (
                        <Cell
                          key={`outer-${entry.id}`}
                          fill={entry.isOver ? '#f43f5e' : entry.colorHex}
                          stroke={entry.isOver ? '#be123c' : 'transparent'}
                          strokeWidth={entry.isOver ? 2.5 : 0}
                          fillOpacity={
                            entry.isFreeBalance
                              ? isFocused
                                ? 0.85
                                : 0.45
                              : activeFocusId
                              ? isFocused
                                ? 1
                                : 0.45
                              : 0.92
                          }
                          className="cursor-pointer transition-opacity duration-150"
                        />
                      );
                    })}
                  </Pie>

                  <Tooltip
                    content={<SixJarsTooltipContent />}
                    wrapperStyle={{ zIndex: 30, pointerEvents: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Dynamic Center Hole Display */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                data-testid="sixjars-donut-center"
              >
                <div className="w-[136px] h-[136px] rounded-full flex flex-col items-center justify-center text-center px-2">
                  {activeCenterJar ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight line-clamp-2 max-w-[122px]">
                        {activeCenterJar.name}
                      </span>
                      <div
                        className="text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5"
                        data-testid="donut-center-ratio"
                      >
                        {formatPctPtBr(activeCenterJar.gastoRealPctDaRenda)}% /{' '}
                        {formatPctPtBr(activeCenterJar.limiteMetaPct, 0)}%
                      </div>
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatBRL(activeCenterJar.gastoRealBRL)}
                      </div>
                      <span
                        className={`mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          getStatusVisual(activeCenterJar.status).badgeClass
                        }`}
                        data-testid="donut-center-status"
                      >
                        {getStatusVisual(activeCenterJar.status).label}
                      </span>
                    </>
                  ) : isInspectingFreeBalance ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        Saldo Livre
                      </span>
                      <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                        {formatPctPtBr(
                          metrics.rendaLiquidaMensal > 0
                            ? (metrics.saldoLivreRendaBRL / metrics.rendaLiquidaMensal) * 100
                            : 100
                        )}
                        % livre
                      </div>
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatBRL(metrics.saldoLivreRendaBRL)}
                      </div>
                      <span className="mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        Disponível
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Real vs. Renda
                      </span>
                      <div
                        className="text-sm font-black text-slate-900 dark:text-white tabular-nums mt-0.5"
                        data-testid="donut-center-ratio"
                      >
                        {formatPctPtBr(metrics.totalGastoPctDaRenda)}% / 100%
                      </div>
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatBRL(metrics.totalGastoBRL)}
                      </div>
                      <span
                        className={`mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          metrics.overBudgetJars.length > 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                        data-testid="donut-center-status"
                      >
                        {metrics.overBudgetJars.length > 0
                          ? `${metrics.overBudgetJars.length} Estourado(s)`
                          : 'Equilibrado'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Legend below chart */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/60" />
                Anel Interno: Meta Ideal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Anel Externo: Gasto Real
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Estourado (&gt;100%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                Saldo Livre
              </span>
            </div>
          </div>

          {/* Right Column: Side Comparison Panel (All 6 Jars) */}
          <div className="lg:col-span-7 space-y-2.5" data-testid="sixjars-comparison-panel">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              <span>Comparação Rápida dos 6 Potes</span>
              <span className="whitespace-nowrap">Real vs. Teto do Pote</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {metrics.jars.map(jar => {
                const statusVis = getStatusVisual(jar.status);
                const isActive =
                  hoveredRingId === jar.id ||
                  clickedCenterJarId === jar.id ||
                  selectedJarKey === jar.id;

                return (
                  <button
                    key={jar.id}
                    type="button"
                    onClick={() => handleSelectJarRow(jar.id)}
                    onMouseEnter={() => setHoveredRingId(jar.id)}
                    onMouseLeave={() => setHoveredRingId(null)}
                    data-testid={`sixjars-side-row-${jar.id}`}
                    className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer space-y-2 ${
                      jar.status === 'estourado'
                        ? isActive
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-400 ring-2 ring-rose-400/30'
                          : 'bg-rose-50/40 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/70 hover:border-rose-400'
                        : isActive
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400/25'
                        : 'bg-slate-50/70 dark:bg-slate-800/45 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Color + Name + Health indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              jar.status === 'estourado' ? '#f43f5e' : jar.colorHex,
                          }}
                        />
                        <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {jar.name}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${statusVis.badgeClass}`}
                        data-testid={`sixjars-status-${jar.id}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusVis.dotClass}`} />
                        {statusVis.label}
                      </span>
                    </div>

                    {/* Gasto Real vs Teto do Pote */}
                    <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Gasto Real</span>
                        <strong className="text-slate-900 dark:text-white font-black">
                          {formatBRL(jar.gastoRealBRL)}
                        </strong>{' '}
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          ({formatPctPtBr(jar.gastoRealPctDaRenda)}%)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Teto do Pote</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">
                          {formatBRL(jar.limiteMetaBRL)}
                        </strong>{' '}
                        <span className="text-[10px] font-bold text-slate-400">
                          ({formatPctPtBr(jar.limiteMetaPct, 0)}%)
                        </span>
                      </div>
                    </div>

                    {/* Consumption Progress Bar */}
                    <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-500/70 dark:bg-slate-400/70 z-10"
                        style={{ left: '85%' }}
                        title="Marca de atenção: 85%"
                      />
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, jar.percentualConsumoDoPote)}%`,
                          backgroundColor: statusVis.barColor,
                        }}
                      />
                    </div>

                    {/* Footer: Consumption % of ceiling & Balance / Excess */}
                    <div className="flex items-center justify-between text-[11px] tabular-nums">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {formatPctPtBr(jar.percentualConsumoDoPote, 0)}% do limite
                      </span>
                      {jar.valorExcedidoBRL > 0 ? (
                        <span className="font-black text-rose-600 dark:text-rose-400">
                          Excesso: +{formatBRL(jar.valorExcedidoBRL)}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Livre: {formatBRL(jar.saldoLivreBRL)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
