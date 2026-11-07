import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, 
  Calendar, Info, Sliders, Sparkles, CheckCircle2, ChevronRight,
  RefreshCw, DollarSign, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { formatBRL } from '../utils/finance';
import { useMobileLayout } from '../context/MobileContext';
import { 
  analyzeSeasonalCashFlow, 
  simulateSeasonalExpense, 
  DEFAULT_SEASONAL_SCENARIOS, 
  MonthlyCashFlowPoint, 
  SeasonalSimulationScenario 
} from '../utils/seasonalCashFlow';

interface SeasonalCashFlowChartProps {
  totalReceitas: number[];
  totalDespesas: number[];
  investimentos?: number[];
  categoryBreakdownPerMonth?: Record<string, number[]>;
  onSelectMonth?: (monthIndex: number) => void;
}

type FilterView = 'all' | 'atypical' | 'quarters';

export const SeasonalCashFlowChart: React.FC<SeasonalCashFlowChartProps> = ({
  totalReceitas,
  totalDespesas,
  investimentos = Array(12).fill(0),
  categoryBreakdownPerMonth,
  onSelectMonth
}) => {
  const { isMobile } = useMobileLayout();
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [customExtraAmount, setCustomExtraAmount] = useState<number>(0);
  const [customTargetMonth, setCustomTargetMonth] = useState<number>(0);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Apply scenario if selected
  const activeDespesas = useMemo(() => {
    if (activeScenarioId) {
      const scenario = DEFAULT_SEASONAL_SCENARIOS.find(s => s.id === activeScenarioId);
      if (scenario) {
        return simulateSeasonalExpense(totalDespesas, scenario.extraExpense, scenario.monthIndex);
      }
    } else if (customExtraAmount > 0) {
      return simulateSeasonalExpense(totalDespesas, customExtraAmount, customTargetMonth);
    }
    return totalDespesas;
  }, [totalDespesas, activeScenarioId, customExtraAmount, customTargetMonth]);

  // Compute seasonal analysis
  const { monthlyData, metrics } = useMemo(() => {
    return analyzeSeasonalCashFlow(totalReceitas, activeDespesas, investimentos, categoryBreakdownPerMonth);
  }, [totalReceitas, activeDespesas, investimentos, categoryBreakdownPerMonth]);

  // Maximum value for scaling SVG chart bars
  const maxScaleValue = useMemo(() => {
    let max = 6000;
    monthlyData.forEach(m => {
      if (m.receitas > max) max = m.receitas;
      if (m.despesas > max) max = m.despesas;
    });
    return Math.ceil(max * 1.15);
  }, [monthlyData]);

  // Filtered list based on current tab
  const displayedMonths = useMemo(() => {
    if (filterView === 'atypical') {
      const filtered = monthlyData.filter(m => m.isAtypical || m.liquidityRisk === 'HIGH');
      return filtered.length > 0 ? filtered : monthlyData;
    }
    return monthlyData;
  }, [filterView, monthlyData]);

  // Quarters aggregation
  const quarterData = useMemo(() => {
    const qMap: Record<string, { label: string; name: string; rec: number; desp: number; net: number; atypical: boolean }> = {
      Q1: { label: 'Q1', name: '1º Trimestre (Jan-Mar)', rec: 0, desp: 0, net: 0, atypical: false },
      Q2: { label: 'Q2', name: '2º Trimestre (Abr-Jun)', rec: 0, desp: 0, net: 0, atypical: false },
      Q3: { label: 'Q3', name: '3º Trimestre (Jul-Set)', rec: 0, desp: 0, net: 0, atypical: false },
      Q4: { label: 'Q4', name: '4º Trimestre (Out-Dez)', rec: 0, desp: 0, net: 0, atypical: false },
    };

    monthlyData.forEach(m => {
      const q = qMap[m.quarter];
      if (q) {
        q.rec += m.receitas;
        q.desp += m.despesas;
        q.net += m.netCashFlow;
        if (m.isAtypical) q.atypical = true;
      }
    });

    return Object.values(qMap);
  }, [monthlyData]);

  const activeSelectedMonth = selectedMonthIdx !== null ? monthlyData[selectedMonthIdx] : null;

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-6 shadow-sm space-y-6 transition-all"
      data-testid="component-seasonal-cashflow"
    >
      {/* Header & Controls */}
      <div className={`flex justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 w-full stack-on-mobile ${isMobile ? 'flex-col items-start' : 'flex-col lg:flex-row lg:items-start'}`}>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Inteligência de Caixa 12 Meses
            </span>
            {metrics.atypicalMonthsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 animate-pulse shrink-0">
                <AlertTriangle className="w-3 h-3" />
                {metrics.atypicalMonthsCount} {metrics.atypicalMonthsCount === 1 ? 'Mês Atípico' : 'Meses Atípicos'}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            Fluxo de Caixa Sazonal
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Acompanhe a flutuação histórica e projetada entre receitas e despesas, identificando meses com sobrecarga atípica para provisionar caixa preventivo.
          </p>
        </div>

        {/* View Mode Filters & Simulator Button */}
        <div className={`flex items-stretch gap-2 w-full stack-on-mobile ${isMobile ? 'flex-col' : 'flex-col sm:flex-row sm:items-center lg:w-auto'} shrink-0`}>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterView('all')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterView === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              data-testid="filter-all-months"
            >
              12 Meses
            </button>
            <button
              type="button"
              onClick={() => setFilterView('atypical')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                filterView === 'atypical'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
              data-testid="filter-atypical-months"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Picos Atípicos</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterView('quarters')}
              className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                filterView === 'quarters'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              data-testid="filter-quarter-view"
            >
              Trimestres
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition cursor-pointer shrink-0 w-full sm:w-auto ${
              isSimulatorOpen || activeScenarioId
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            data-testid="btn-toggle-simulator"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulador Sazonal</span>
            {activeScenarioId && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </button>
        </div>
      </div>

      {/* Simulator Drawer / Scenario Selector */}
      {isSimulatorOpen && (
        <div 
          className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/80 space-y-3 animate-in fade-in duration-200"
          data-testid="section-seasonal-simulator"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Simulador de Estresse Sazonal de Caixa
              </h4>
            </div>
            {activeScenarioId && (
              <button
                type="button"
                onClick={() => {
                  setActiveScenarioId(null);
                  setCustomExtraAmount(0);
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                data-testid="btn-reset-simulation"
              >
                <RefreshCw className="w-3 h-3" />
                Restaurar Cenário Original
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Selecione uma despesa atípica para simular o comportamento da liquidez e conferir se o saldo permanecerá seguro:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {DEFAULT_SEASONAL_SCENARIOS.map(sc => {
              const isActive = activeScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenarioId(isActive ? null : sc.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800'
                      : 'bg-white dark:bg-slate-800/90 border-indigo-100 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                  }`}
                  data-testid={`scenario-${sc.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{sc.label}</span>
                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      +{formatBRL(sc.extraExpense)}
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {sc.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Média de Receitas / Mês
          </span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
            {formatBRL(metrics.meanMonthlyReceita)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Total {formatBRL(metrics.totalReceitasAno)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Pico Histórico de Despesas
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-rose-600 dark:text-rose-400">
              {formatBRL(metrics.maxExpenseMonth.amount)}
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              ({metrics.maxExpenseMonth.monthName})
            </span>
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
            Mês de maior pressão financeira
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Menor Margem de Caixa
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-black ${
              metrics.tightestCashMonth.netAmount < 800 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
            }`}>
              {formatBRL(metrics.tightestCashMonth.netAmount)}
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              ({metrics.tightestCashMonth.monthName})
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Requer cautela em caixa
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-0.5">
            Colchão Preventivo Recomendado
          </span>
          <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
            {formatBRL(metrics.recommendedSeasonalBuffer)}
          </span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">
            Proteção p/ cobrir oscilações
          </span>
        </div>
      </div>

      {/* Main Chart View */}
      {filterView !== 'quarters' ? (
        <div className="space-y-3">
          {/* Legend and Instructions */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Receitas</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-rose-500" />
                <span>Despesas</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-1 bg-indigo-600 rounded-full" />
                <span>Saldo Líquido</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              💡 Clique no mês para inspecionar anomalias e histórico detalhado
            </span>
          </div>

          {/* 12-Month Responsive Comparative Columns */}
          <div className="overflow-x-auto no-scrollbar pt-2 pb-1">
            <div className="min-w-[700px] h-72 flex items-end justify-between gap-2.5 px-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              {displayedMonths.map((m) => {
                const recHeight = (m.receitas / maxScaleValue) * 220;
                const despHeight = (m.despesas / maxScaleValue) * 220;
                const isSelected = selectedMonthIdx === m.monthIndex;

                return (
                  <div
                    key={m.monthIndex}
                    onClick={() => {
                      setSelectedMonthIdx(isSelected ? null : m.monthIndex);
                      if (onSelectMonth) onSelectMonth(m.monthIndex);
                    }}
                    className={`flex-1 flex flex-col items-center justify-end group cursor-pointer transition-all rounded-2xl p-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    data-testid={`month-col-${m.monthIndex}`}
                  >
                    {/* Atypical Badge on top */}
                    {m.isAtypical && (
                      <div className="mb-2 text-center animate-bounce">
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 whitespace-nowrap shadow-xs"
                          title={m.atypicalReasons.join(' • ')}
                        >
                          ⚠️ Atípico
                        </span>
                      </div>
                    )}

                    {/* Bar pair: Receita (green) & Despesa (red/pink) */}
                    <div className="flex items-end gap-1.5 h-52 relative w-full justify-center">
                      {/* Bar 1: Receita */}
                      <div
                        className="w-3.5 sm:w-4.5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs relative"
                        style={{ height: `${Math.max(recHeight, 4)}px` }}
                        title={`Receitas em ${m.monthName}: ${formatBRL(m.receitas)}`}
                      />

                      {/* Bar 2: Despesa */}
                      <div
                        className={`w-3.5 sm:w-4.5 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs relative ${
                          m.isAtypical 
                            ? 'bg-gradient-to-t from-rose-600 to-amber-500 ring-1 ring-rose-400' 
                            : 'bg-gradient-to-t from-rose-600 to-rose-400'
                        }`}
                        style={{ height: `${Math.max(despHeight, 4)}px` }}
                        title={`Despesas em ${m.monthName}: ${formatBRL(m.despesas)}`}
                      />
                    </div>

                    {/* Month Label & Net value */}
                    <div className="text-center mt-2 w-full">
                      <span className={`text-[11px] font-bold block ${
                        isSelected 
                          ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {m.monthShort}
                      </span>
                      <span className={`text-[10px] font-mono block ${
                        m.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                      }`}>
                        {m.netCashFlow >= 0 ? '+' : ''}{Math.round(m.netCashFlow).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Trimestres (Q1-Q4) Grouped View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {quarterData.map((q) => (
            <div
              key={q.label}
              className={`p-4 rounded-2xl border transition-all ${
                q.atypical
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {q.name}
                </span>
                {q.atypical && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Sazonal
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Receitas:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatBRL(q.rec)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Despesas:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{formatBRL(q.desp)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span>Saldo Líquido:</span>
                  <span className={q.net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700'}>
                    +{formatBRL(q.net)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Month Deep-Dive Panel */}
      {activeSelectedMonth && (
        <div 
          className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2 animate-in fade-in duration-150"
          data-testid="selected-month-details"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Detalhamento de {activeSelectedMonth.monthName}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedMonthIdx(null)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Fechar detalhe ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Receitas do Mês</span>
              <span className="font-bold text-emerald-600">{formatBRL(activeSelectedMonth.receitas)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Despesas do Mês</span>
              <span className="font-bold text-rose-600">{formatBRL(activeSelectedMonth.despesas)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Saldo Líquido</span>
              <span className="font-bold text-indigo-600">{formatBRL(activeSelectedMonth.netCashFlow)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Margem / Poupança</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {Math.round(activeSelectedMonth.savingsRate)}% da renda
              </span>
            </div>
          </div>

          {activeSelectedMonth.isAtypical && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                Diagnóstico de Gasto Atípico:
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {activeSelectedMonth.atypicalReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Advisory & Liquidity Recommendation Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-teal-500/10 to-blue-500/5 dark:from-indigo-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-600 text-white">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Planejamento Preventivo de Caixa
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl">
            {metrics.forecastAdvice}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Meta de Liquidez</span>
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              Mín. {formatBRL(metrics.recommendedSeasonalBuffer)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
