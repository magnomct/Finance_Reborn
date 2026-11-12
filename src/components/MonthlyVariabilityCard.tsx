import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Sparkles, Activity, Layers, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ReferenceArea
} from 'recharts';
import { 
  calculateVariabilityMetrics, 
  getBlendedVariabilityData, 
  MonthSpendData, 
  VariabilitySummary,
  REALISTIC_6M_VARIABILITY_DATA
} from '../utils/variabilityMetrics';
import { formatBRL } from '../utils/finance';
import { Transaction, ParentCategoryItem } from '../types';
import { loadCategoryHierarchy } from '../utils/categoryHierarchy';

export interface MonthlyVariabilityCardProps {
  transactions?: Transaction[];
  monthlyData?: MonthSpendData[];
  hierarchy?: ParentCategoryItem[];
  className?: string;
}

export type VariabilityViewFilter = 'all' | 'variable' | 'fixed';

export const MonthlyVariabilityCard: React.FC<MonthlyVariabilityCardProps> = ({
  transactions = [],
  monthlyData,
  hierarchy,
  className = ''
}) => {
  const [filter, setFilter] = useState<VariabilityViewFilter>('all');
  const [useSimulatedFallback, setUseSimulatedFallback] = useState<boolean>(true);

  // Active category hierarchy
  const activeHierarchy = useMemo(() => {
    return hierarchy && hierarchy.length > 0 ? hierarchy : loadCategoryHierarchy();
  }, [hierarchy]);

  // Compute metrics from passed monthlyData or extract/blend from transactions
  const summary: VariabilitySummary = useMemo(() => {
    if (monthlyData && monthlyData.length >= 3) {
      return calculateVariabilityMetrics(monthlyData, activeHierarchy);
    }

    if (useSimulatedFallback) {
      const blended = getBlendedVariabilityData(transactions, REALISTIC_6M_VARIABILITY_DATA, activeHierarchy);
      return calculateVariabilityMetrics(blended, activeHierarchy);
    }

    // Explicit empty state when simulated fallback is disabled and real months < 3
    return {
      months: [],
      monthDetails: [],
      fixed: {
        mean: 0,
        stdDev: 0,
        cv: 0,
        stabilityRange: { lower: 0, upper: 0 },
        stabilityLevel: 'high',
        stabilityLabel: 'Sem dados suficientes',
        badgeColor: 'emerald',
      },
      variable: {
        mean: 0,
        stdDev: 0,
        cv: 0,
        stabilityRange: { lower: 0, upper: 0 },
        stabilityLevel: 'high',
        stabilityLabel: 'Sem dados suficientes',
        badgeColor: 'emerald',
      },
      topOffender: {
        name: 'N/A',
        parentCategory: 'N/A',
        subcategoryName: 'N/A',
        peakMonth: 'N/A',
        peakAmount: 0,
        minAmount: 0,
        variationSpread: 0,
        stdDev: 0,
        contributionPct: 0,
        description: 'Sem dados suficientes',
      },
      dynamicInsight: 'Necessário pelo menos 3 meses de histórico para calcular a variabilidade orçamentária.',
      hasEnoughData: false,
      sampleCount: 0,
    };
  }, [monthlyData, transactions, useSimulatedFallback, activeHierarchy]);

  // Color constants
  const COLOR_FIXED = '#4f46e5'; // Azul Índigo
  const COLOR_VARIABLE = '#f97316'; // Laranja

  // Prepare chart data with formatted fields
  const chartData = useMemo(() => {
    return summary.monthDetails.map(m => ({
      month: m.monthShort,
      monthFull: m.month,
      fixed: m.fixed,
      variable: m.variable,
      total: m.total,
      fixedDeviation: m.fixedDeviation,
      fixedDeviationPct: m.fixedDeviationPct,
      fixedIsOutlier: m.fixedIsOutlier,
      variableDeviation: m.variableDeviation,
      variableDeviationPct: m.variableDeviationPct,
      variableIsOutlier: m.variableIsOutlier,
      topSubcategory: m.topSubcategory,
    }));
  }, [summary.monthDetails]);


  // Max Y value for clean scale
  const maxY = useMemo(() => {
    if (chartData.length === 0) return 5000;
    const maxVal = Math.max(
      ...chartData.map(d => {
        if (filter === 'all') return Math.max(d.fixed, d.variable) * 1.3;
        if (filter === 'fixed') return d.fixed * 1.3;
        return d.variable * 1.3;
      })
    );
    return Math.ceil(maxVal / 500) * 500;
  }, [chartData, filter]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    const showFixed = filter === 'all' || filter === 'fixed';
    const showVariable = filter === 'all' || filter === 'variable';

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2.5 min-w-[230px] z-50 pointer-events-none">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span className="font-bold text-slate-800 dark:text-white">
            {dataItem.monthFull}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Total: {formatBRL(dataItem.total)}
          </span>
        </div>

        {/* Fixed Expenses Details */}
        {showFixed && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                Gastos Fixos:
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                {formatBRL(dataItem.fixed)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pl-4">
              <span>Desvio da Média:</span>
              <span className={dataItem.fixedDeviation >= 0 ? 'text-indigo-600 font-medium' : 'text-slate-500 font-medium'}>
                {dataItem.fixedDeviation >= 0 ? '+' : ''}{formatBRL(dataItem.fixedDeviation)} ({dataItem.fixedDeviationPct >= 0 ? '+' : ''}{dataItem.fixedDeviationPct.toFixed(1)}%)
              </span>
            </div>

            <div className="pl-4">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                dataItem.fixedIsOutlier
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {dataItem.fixedIsOutlier ? 'Fora do padrão (> 1 desvio padrão)' : 'Dentro do esperado'}
              </span>
            </div>
          </div>
        )}

        {/* Variable Expenses Details */}
        {showVariable && (
          <div className={`space-y-1 ${showFixed ? 'pt-1.5 border-t border-slate-100 dark:border-slate-800' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                Gastos Variáveis:
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                {formatBRL(dataItem.variable)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pl-4">
              <span>Desvio da Média:</span>
              <span className={dataItem.variableDeviation >= 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                {dataItem.variableDeviation >= 0 ? '+' : ''}{formatBRL(dataItem.variableDeviation)} ({dataItem.variableDeviationPct >= 0 ? '+' : ''}{dataItem.variableDeviationPct.toFixed(1)}%)
              </span>
            </div>

            <div className="pl-4">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                dataItem.variableIsOutlier
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {dataItem.variableIsOutlier ? 'Fora do padrão (> 1 desvio padrão)' : 'Dentro do esperado'}
              </span>
            </div>
          </div>
        )}

        {/* Hierarchical Subcategory Impact */}
        {dataItem.topSubcategory && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-0.5 bg-orange-50/60 dark:bg-orange-950/30 p-2 rounded-xl">
            <span className="text-slate-400 font-medium block">Maior oscilação do mês:</span>
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span className="text-orange-600 dark:text-orange-400 font-semibold truncate max-w-[145px]" title={dataItem.topSubcategory.name}>
                {dataItem.topSubcategory.name}
              </span>
              <span className="font-mono text-slate-900 dark:text-white shrink-0 ml-1">
                {formatBRL(dataItem.topSubcategory.amount)} ({dataItem.topSubcategory.shareOfVariablePct.toFixed(0)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. EMPTY STATE (When fewer than 3 months of data)
  if (!summary.hasEnoughData || summary.months.length < 3) {
    return (
      <div 
        className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-4 ${className}`}
        data-testid="monthly-variability-empty-state"
      >
        <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Histórico Insuficiente para Análise de Variabilidade
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            São necessários pelo menos 3 meses de despesas registradas para calcular a média amostral ($\mu$), o desvio padrão ($s$) e o coeficiente de variação ($CV$).
          </p>
        </div>
        <div>
          <button
            onClick={() => setUseSimulatedFallback(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 mx-auto cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Carregar Modelo Realista dos Últimos 6 Meses</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. MAIN COMPONENT
  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden ${className}`}
      data-testid="monthly-variability-card"
    >
      {/* Background soft glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/5 via-orange-500/5 to-transparent rounded-full pointer-events-none -mr-16 -mt-16 blur-2xl" />

      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Distribuição de Variabilidade Mensal
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Fixos vs. Variáveis
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Análise da estabilidade do orçamento nos últimos 6 meses (Gastos Fixos vs. Gastos Variáveis).
          </p>
        </div>

        {/* Filter Toggle Buttons: Ambos, Variáveis, Fixos */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            data-testid="toggle-view-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ambos</span>
          </button>

          <button
            onClick={() => setFilter('variable')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'variable'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
            data-testid="toggle-view-variable"
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Variáveis</span>
          </button>

          <button
            onClick={() => setFilter('fixed')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'fixed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
            data-testid="toggle-view-fixed"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Fixos</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs (2 Colunas - Fixos vs. Variáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10">
        
        {/* KPI 1: Gastos Fixos */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Gastos Fixos
              </span>
            </div>

            {/* Semantic Badge based on CV */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              summary.fixed.badgeColor === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : summary.fixed.badgeColor === 'amber'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              {summary.fixed.stabilityLabel} ({summary.fixed.cv.toFixed(1)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">Média Mensal (μ)</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono" data-testid="kpi-fixed-mean">
                {formatBRL(summary.fixed.mean)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Oscilação Média (s)</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono" data-testid="kpi-fixed-stddev">
                ± {formatBRL(summary.fixed.stdDev)} / mês
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Faixa de Estabilidade (μ ± s):</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {formatBRL(summary.fixed.stabilityRange.lower)} – {formatBRL(summary.fixed.stabilityRange.upper)}
            </strong>
          </div>
        </div>

        {/* KPI 2: Gastos Variáveis */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-orange-100 dark:border-orange-950/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Gastos Variáveis
              </span>
            </div>

            {/* Semantic Badge based on CV */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              summary.variable.badgeColor === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : summary.variable.badgeColor === 'amber'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              {summary.variable.stabilityLabel} ({summary.variable.cv.toFixed(1)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">Média Mensal (μ)</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono" data-testid="kpi-variable-mean">
                {formatBRL(summary.variable.mean)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Oscilação Média (s)</span>
              <span className="text-base font-black text-orange-600 dark:text-orange-400 font-mono" data-testid="kpi-variable-stddev">
                ± {formatBRL(summary.variable.stdDev)} / mês
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Faixa de Estabilidade (μ ± s):</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {formatBRL(summary.variable.stabilityRange.lower)} – {formatBRL(summary.variable.stabilityRange.upper)}
            </strong>
          </div>
        </div>

      </div>

      {/* Gráfico Principal (Recharts ComposedChart dentro de ResponsiveContainer) */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Visualização Temporal (Últimos 6 Meses)
            </span>
            <span className="text-[10px] text-slate-400">
              • Área sombreada = Zona de Estabilidade (μ ± s)
            </span>
          </div>

          <div className="flex items-center gap-3 font-semibold text-[11px]">
            {(filter === 'all' || filter === 'fixed') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-600" />
                <span className="text-indigo-600 dark:text-indigo-400">Fixos</span>
              </div>
            )}
            {(filter === 'all' || filter === 'variable') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-orange-500" />
                <span className="text-orange-600 dark:text-orange-400">Variáveis</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
              <span className="text-slate-400">Média (μ)</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-2" data-testid="variability-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              
              <YAxis 
                domain={[0, maxY]}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Reference Area for Stability Zone (μ ± s) controlled by the selector:
                  - If 'all': renders both stability bands
                  - If 'variable': renders only Variable stability band
                  - If 'fixed': renders only Fixed stability band
              */}
              {(filter === 'all' || filter === 'variable') && (
                <ReferenceArea
                  y1={summary.variable.stabilityRange.lower}
                  y2={summary.variable.stabilityRange.upper}
                  fill={COLOR_VARIABLE}
                  fillOpacity={0.12}
                  stroke={COLOR_VARIABLE}
                  strokeOpacity={0.25}
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                />
              )}

              {(filter === 'all' || filter === 'fixed') && (
                <ReferenceArea
                  y1={summary.fixed.stabilityRange.lower}
                  y2={summary.fixed.stabilityRange.upper}
                  fill={COLOR_FIXED}
                  fillOpacity={0.10}
                  stroke={COLOR_FIXED}
                  strokeOpacity={0.25}
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                />
              )}

              {/* Reference Lines for Mean */}
              {(filter === 'all' || filter === 'fixed') && (
                <ReferenceLine 
                  y={summary.fixed.mean} 
                  stroke={COLOR_FIXED} 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{
                    value: `Média Fixos: R$ ${summary.fixed.mean.toFixed(0)}`,
                    fill: COLOR_FIXED,
                    fontSize: 10,
                    position: 'insideTopLeft'
                  }} 
                />
              )}

              {(filter === 'all' || filter === 'variable') && (
                <ReferenceLine 
                  y={summary.variable.mean} 
                  stroke={COLOR_VARIABLE} 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{
                    value: `Média Variáveis: R$ ${summary.variable.mean.toFixed(0)}`,
                    fill: COLOR_VARIABLE,
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }} 
                />
              )}

              {/* Variable series as Bars */}
              {(filter === 'all' || filter === 'variable') && (
                <Bar 
                  dataKey="variable" 
                  name="Gastos Variáveis" 
                  fill={COLOR_VARIABLE} 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              )}

              {/* Fixed series as Line */}
              {(filter === 'all' || filter === 'fixed') && (
                <Line 
                  type="monotone" 
                  dataKey="fixed" 
                  name="Gastos Fixos" 
                  stroke={COLOR_FIXED} 
                  strokeWidth={3}
                  dot={{ r: 4, fill: COLOR_FIXED, strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: COLOR_FIXED }}
                />
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rodapé de Insight (Banner Dinâmico) */}
      <div 
        className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-indigo-500/5 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-slate-900 border border-orange-200/80 dark:border-orange-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        data-testid="variability-dynamic-insight-banner"
      >
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-white block">
              Diagnóstico de Volatilidade Orçamentária
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              {summary.dynamicInsight}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center text-right pl-2 sm:border-l sm:border-orange-200/60 dark:sm:border-orange-900/60">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Maior Ofensor</span>
          <strong className="text-orange-600 dark:text-orange-400 text-xs font-black">
            {summary.topOffender.name}
          </strong>
          <span className="text-[10px] text-slate-500 block">
            Pico de {formatBRL(summary.topOffender.peakAmount)} ({summary.topOffender.peakMonth})
          </span>
        </div>
      </div>

    </div>
  );
};
