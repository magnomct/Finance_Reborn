import React, { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Sparkles, DollarSign, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle, 
  Layers, Info, Calendar, ChevronRight
} from 'lucide-react';
import { calculateSavingsTrends, MonthTrendPoint } from '../utils/savingsTrends';
import { formatBRL } from '../utils/finance';
import { useMobileLayout } from '../context/MobileContext';

export interface SavingsTrendsBarChartProps {
  annualReceitas: number[];
  annualDespesas: number[];
  referenceMonthIndex?: number;
  onSelectMonth?: (monthIndex: number) => void;
}

export const SavingsTrendsBarChart: React.FC<SavingsTrendsBarChartProps> = ({
  annualReceitas,
  annualDespesas,
  referenceMonthIndex = 9,
  onSelectMonth
}) => {
  const { isMobile } = useMobileLayout();
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(referenceMonthIndex);
  const [viewMode, setViewMode] = useState<'grouped' | 'netOnly'>('grouped');

  // Compute 6-month trends
  const trends = useMemo(() => {
    return calculateSavingsTrends(annualReceitas, annualDespesas, referenceMonthIndex);
  }, [annualReceitas, annualDespesas, referenceMonthIndex]);

  // Selected or hovered month data
  const activeMonth = useMemo(() => {
    return trends.months.find(m => m.monthIndex === selectedMonthIdx) || trends.months[trends.months.length - 1];
  }, [trends.months, selectedMonthIdx]);

  // Find max value to scale chart bars nicely
  const maxBarValue = useMemo(() => {
    let max = 1;
    trends.months.forEach(m => {
      max = Math.max(max, m.totalIncome, m.totalExpenses, Math.abs(m.netBalance));
    });
    return Math.ceil(max * 1.15); // 15% headroom
  }, [trends.months]);

  const handleBarClick = (m: MonthTrendPoint) => {
    setSelectedMonthIdx(m.monthIndex);
    if (onSelectMonth) {
      onSelectMonth(m.monthIndex);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-150"
      data-testid="savings-trends-barchart"
    >
      {/* Header with Title and Trend Badge */}
      <div className={`flex justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 w-full stack-on-mobile ${isMobile ? 'flex-col items-start' : 'flex-col lg:flex-row items-start lg:items-center'}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-1 rounded-lg bg-emerald-500 text-white shadow-2xs shrink-0">
              <BarChart3 className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Tendências de Economia & Poupança
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shrink-0 ${
              trends.trendDirection === 'up'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : trends.trendDirection === 'down'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
            }`}>
              {trends.trendDirection === 'up' && <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />}
              {trends.trendDirection === 'down' && <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />}
              {trends.trendDirection === 'stable' && <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />}
              <span>{trends.trendLabel}</span>
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Comparativo dos Últimos 6 Meses: Saldo, Receitas & Despesas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o comportamento mensal de entradas e saídas para identificar padrões de acúmulo de riqueza e taxa de poupança.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto self-stretch sm:self-auto justify-center overflow-x-auto no-scrollbar shrink-0 max-w-full">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer text-xs ${
              viewMode === 'grouped'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="btn-mode-grouped"
          >
            Barras Comparativas (3x)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('netOnly')}
            className={`flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer text-xs ${
              viewMode === 'netOnly'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="btn-mode-net"
          >
            Foco no Saldo Líquido
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards of the 6-Month Period */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2 keep-grid-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Saldo Médio Consolidado
          </span>
          <span className={`text-base sm:text-lg font-black block ${
            trends.averageBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {trends.averageBalance >= 0 ? '+' : ''}{formatBRL(trends.averageBalance)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Média mensal dos 6 meses
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Taxa Média de Poupança
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block">
            {trends.averageSavingsRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Da renda bruta convertida em sobra
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Melhor Mês de Economia
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {trends.bestMonth.monthName}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">
              (+{formatBRL(trends.bestMonth.netBalance)})
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Taxa de poupança: {trends.bestMonth.savingsRate.toFixed(0)}%
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
            Economia Semestral Total
          </span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 block">
            {trends.totalSavingsPeriod >= 0 ? '+' : ''}{formatBRL(trends.totalSavingsPeriod)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            {trends.positiveMonthsCount} de 6 meses no azul 🎉
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
            <span>Receitas Totais</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-md bg-rose-500 shadow-2xs" />
            <span>Despesas Totais</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-md bg-blue-500 shadow-2xs" />
            <span>Saldo Consolidado</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          💡 Clique em qualquer mês para inspecionar métricas detalhadas
        </span>
      </div>

      {/* Comparative Bar Chart Visualization */}
      <div className="bg-slate-50/70 dark:bg-slate-950/40 p-3 sm:p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800/80 overflow-x-auto no-scrollbar max-w-full">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-4 items-end h-56 pt-6 pb-2 min-w-[300px] sm:min-w-0">
          {trends.months.map(m => {
            const isSelected = m.monthIndex === selectedMonthIdx;
            
            // Heights proportional to maxBarValue
            const incomeH = Math.max(6, (m.totalIncome / maxBarValue) * 100);
            const expenseH = Math.max(6, (m.totalExpenses / maxBarValue) * 100);
            const netMagnitude = Math.abs(m.netBalance);
            const netH = Math.max(6, (netMagnitude / maxBarValue) * 100);

            return (
              <div 
                key={m.monthIndex}
                onClick={() => handleBarClick(m)}
                className={`flex flex-col items-center justify-end h-full group cursor-pointer transition-all p-1.5 sm:p-2 rounded-2xl ${
                  isSelected 
                    ? 'bg-blue-500/10 ring-2 ring-blue-500 shadow-xs' 
                    : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
                title={`Clique para inspecionar ${m.monthName}`}
                data-testid={`bar-month-${m.shortName.toLowerCase()}`}
              >
                {/* Savings Rate Badge above bars */}
                <span className={`text-[10px] font-black mb-1 px-1.5 py-0.2 rounded-md ${
                  m.isPositiveBalance 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {m.savingsRate.toFixed(0)}%
                </span>

                {/* Bars Container */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-36">
                  {viewMode === 'grouped' ? (
                    <>
                      {/* Bar 1: Receitas */}
                      <div 
                        className="w-1/3 max-w-[16px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300 shadow-2xs relative group/bar"
                        style={{ height: `${incomeH}%` }}
                      >
                        <span className="hidden group-hover/bar:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-20 whitespace-nowrap">
                          {formatBRL(m.totalIncome)}
                        </span>
                      </div>

                      {/* Bar 2: Despesas */}
                      <div 
                        className="w-1/3 max-w-[16px] bg-rose-500 hover:bg-rose-600 rounded-t-md transition-all duration-300 shadow-2xs relative group/bar"
                        style={{ height: `${expenseH}%` }}
                      >
                        <span className="hidden group-hover/bar:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-20 whitespace-nowrap">
                          {formatBRL(m.totalExpenses)}
                        </span>
                      </div>

                      {/* Bar 3: Saldo Consolidado */}
                      <div 
                        className={`w-1/3 max-w-[16px] rounded-t-md transition-all duration-300 shadow-2xs relative group/bar ${
                          m.isPositiveBalance 
                            ? 'bg-blue-500 hover:bg-blue-600' 
                            : 'bg-rose-700 hover:bg-rose-800'
                        }`}
                        style={{ height: `${netH}%` }}
                      >
                        <span className="hidden group-hover/bar:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-20 whitespace-nowrap">
                          {m.isPositiveBalance ? '+' : ''}{formatBRL(m.netBalance)}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Net Only Mode */
                    <div className="w-full max-w-[36px] flex flex-col items-center justify-end h-full">
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-300 shadow-2xs relative group/bar ${
                          m.isPositiveBalance 
                            ? 'bg-gradient-to-t from-blue-600 to-sky-400' 
                            : 'bg-gradient-to-t from-rose-600 to-pink-500'
                        }`}
                        style={{ height: `${netH}%` }}
                      >
                        <span className="hidden group-hover/bar:block absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow z-20 whitespace-nowrap">
                          {m.isPositiveBalance ? '+' : ''}{formatBRL(m.netBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* X-Axis Month Label */}
                <div className="mt-2 text-center">
                  <span className={`text-[11px] font-bold block ${
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {m.shortName}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">
                    {m.isPositiveBalance ? `+${Math.round(m.netBalance)}` : `${Math.round(m.netBalance)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Month Inspection Card & Savings Momentum Analysis */}
      {activeMonth && (
        <div 
          className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-teal-50/50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800/60 border border-blue-200/70 dark:border-slate-700/80 space-y-3"
          data-testid="month-inspection-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-600 text-white font-black text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Detalhamento de {activeMonth.monthName} / {activeMonth.year}
                </h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Posição consolidada e taxa de poupança apurada
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Taxa de Poupança:
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                activeMonth.isPositiveBalance 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {activeMonth.savingsRate.toFixed(1)}% da renda
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Receitas do Mês</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                +{formatBRL(activeMonth.totalIncome)}
              </span>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Despesas do Mês</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                -{formatBRL(activeMonth.totalExpenses)}
              </span>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Saldo Consolidado</span>
              <span className={`text-sm font-black ${
                activeMonth.isPositiveBalance ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {activeMonth.isPositiveBalance ? '+' : ''}{formatBRL(activeMonth.netBalance)}
              </span>
              {activeMonth.varianceVsPrevious !== undefined && (
                <span className={`text-[9px] font-bold block ${
                  activeMonth.varianceVsPrevious >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {activeMonth.varianceVsPrevious >= 0 ? '↗' : '↘'} {activeMonth.varianceVsPrevious > 0 ? '+' : ''}{activeMonth.varianceVsPrevious}% vs mês anterior
                </span>
              )}
            </div>
          </div>

          {/* Diagnostic Note */}
          <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">
            <strong>Diagnóstico de Tendência:</strong> {trends.trendDescription}
          </p>
        </div>
      )}
    </div>
  );
};
