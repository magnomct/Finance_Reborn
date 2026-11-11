import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Scale, PiggyBank, Home, 
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  Table as TableIcon, BarChart2, ShieldCheck, ChevronRight,
  Info
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateSavingsVsNecessities, 
  SavingsVsNecessitiesSummary, 
  MonthSavingsVsNecessitiesPoint 
} from '../utils/savingsVsNecessities';

interface SavingsVsNecessitiesCardProps {
  transactions?: Transaction[];
  annualReceitas?: number[];
  annualDespesas?: number[];
  annualNecessidades?: number[];
  referenceMonthIndex?: number;
  usePjProfitInPf?: boolean;
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
  onSelectMonth?: (monthIndex: number) => void;
}

export const SavingsVsNecessitiesCard: React.FC<SavingsVsNecessitiesCardProps> = ({
  transactions = [],
  annualReceitas,
  annualDespesas,
  annualNecessidades,
  referenceMonthIndex = 9,
  usePjProfitInPf = true,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen,
  onSelectMonth
}) => {
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);
  const [viewType, setViewType] = useState<'grafico' | 'tabela'>('grafico');

  const summary: SavingsVsNecessitiesSummary = useMemo(() => {
    return calculateSavingsVsNecessities({
      transactions,
      usePjProfitInPf,
      referenceMonthIndex,
      annualReceitas,
      annualDespesas,
      annualNecessidades
    });
  }, [transactions, usePjProfitInPf, referenceMonthIndex, annualReceitas, annualDespesas, annualNecessidades]);

  // Selected month detail or fallback to latest month
  const activeDetailMonth: MonthSavingsVsNecessitiesPoint = useMemo(() => {
    if (selectedMonthIdx !== null) {
      const found = summary.months.find(m => m.monthIndex === selectedMonthIdx);
      if (found) return found;
    }
    return summary.months[summary.months.length - 1];
  }, [selectedMonthIdx, summary.months]);

  const isPositive = summary.trendStatus === 'positiva';

  // Find max value across all months for proportional height bar scaling
  const maxBarValue = useMemo(() => {
    let max = 1;
    summary.months.forEach(m => {
      if (m.necessidades > max) max = m.necessidades;
      if (m.poupado > max) max = m.poupado;
      if (m.despesas > max) max = m.despesas;
    });
    return max;
  }, [summary.months]);

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm border border-slate-200/90 dark:border-slate-800 relative overflow-hidden`}
      data-testid="savings-vs-necessities-card"
    >
      {/* Background ambient lighting */}
      <div 
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isPositive 
            ? 'bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent' 
            : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
        }`} 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-3 rounded-2xl text-white shadow-md shrink-0 ${
            isPositive
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
              : 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-500/20'
          }`}>
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Poupança vs Gastos em 'Necessidades'</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Últimos 6 Meses
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise comparativa entre o volume poupado (Receitas - Despesas) e o custo de vida essencial (Pote 55%).
            </p>
          </div>
        </div>

        {/* Trend Badge */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <div 
            className={`px-3 py-1.5 rounded-2xl border flex items-center gap-1.5 shadow-xs font-black text-xs ${
              isPositive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
            data-testid="trend-status-badge"
          >
            {isPositive ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tendência Positiva</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 font-bold">
                  +{Math.abs(summary.trendPercentage)}%
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Tendência Negativa</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900 font-bold">
                  {summary.trendPercentage}%
                </span>
              </>
            )}
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewType('grafico')}
              className={`p-1.5 rounded-lg transition-all ${
                viewType === 'grafico'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Ver Gráfico Comparativo"
              data-testid="btn-view-chart"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewType('tabela')}
              className={`p-1.5 rounded-lg transition-all ${
                viewType === 'tabela'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Ver Tabela Comparativa"
              data-testid="btn-view-table"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (4 KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {/* Total Poupado */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              Total Poupado (6M)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black">
              {summary.averageSavingsRate}% da Renda
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100" data-testid="kpi-total-poupado">
            {formatBRL(summary.totalPoupado)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Média: {formatBRL(summary.averagePoupado)}/mês
          </div>
        </div>

        {/* Total Gasto em Necessidades */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-blue-600" />
              Gasto em Necessidades (6M)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black">
              {summary.averageNecessitiesRate}% da Renda
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100" data-testid="kpi-total-necessidades">
            {formatBRL(summary.totalNecessidades)}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            Média: {formatBRL(summary.averageNecessidades)}/mês
          </div>
        </div>

        {/* Relação Poupança / Necessidades */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Razão Poupado / Necessidades
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Semestral
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white" data-testid="kpi-overall-ratio">
            R$ {summary.overallRatio.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium truncate">
            Poupados por cada R$ 1,00 gasto
          </div>
        </div>

        {/* Diagnóstico de Tendência */}
        <div className={`p-3.5 sm:p-4 rounded-2xl space-y-1 border ${
          isPositive
            ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-900/50'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
              isPositive ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'
            }`}>
              Trajetória Semestral
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
              isPositive 
                ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300' 
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {isPositive ? 'Sólida' : 'Atenção'}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${
            isPositive ? 'text-teal-900 dark:text-teal-100' : 'text-amber-900 dark:text-amber-100'
          }`}>
            {isPositive ? 'Positiva 📈' : 'Negativa 📉'}
          </div>
          <div className={`text-[11px] font-medium truncate ${
            isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {summary.surplusMonthsCount} de 6 meses no azul
          </div>
        </div>
      </div>

      {/* Main Comparative View: Chart vs Table */}
      {viewType === 'grafico' ? (
        <div className="space-y-3 relative z-10" data-testid="savings-vs-necessities-chart-view">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-2xs" />
                <span>Poupado (Saldo)</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-md bg-blue-500 inline-block shadow-2xs" />
                <span>Necessidades (Pote 55%)</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              💡 Clique no mês para detalhar as proporções
            </span>
          </div>

          {/* Comparative Month Columns */}
          <div className="grid grid-cols-6 gap-2 sm:gap-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            {summary.months.map((month) => {
              const isSelected = activeDetailMonth.monthIndex === month.monthIndex;
              const heightPoupadoPct = Math.max(8, Math.min(100, Math.round((month.poupado / maxBarValue) * 100)));
              const heightNecPct = Math.max(8, Math.min(100, Math.round((month.necessidades / maxBarValue) * 100)));

              return (
                <button
                  key={month.monthIndex}
                  type="button"
                  onClick={() => {
                    setSelectedMonthIdx(month.monthIndex);
                    if (onSelectMonth) onSelectMonth(month.monthIndex);
                  }}
                  className={`flex flex-col items-center justify-end p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer group ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-slate-800/90 ring-2 ring-teal-500 shadow-sm' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                  data-testid={`month-col-${month.shortName.toLowerCase()}`}
                  title={`${month.name}: Poupado ${formatBRL(month.poupado)} vs Necessidades ${formatBRL(month.necessidades)}`}
                >
                  {/* Bars Area */}
                  <div className="h-32 sm:h-36 w-full flex items-end justify-center gap-1.5 sm:gap-2 mb-2">
                    {/* Bar 1: Poupado */}
                    <div className="w-1/2 flex flex-col items-center justify-end h-full">
                      <div 
                        style={{ height: `${heightPoupadoPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-2xs ${
                          month.poupado >= 0 ? 'bg-gradient-to-t from-emerald-600 to-teal-400' : 'bg-rose-500'
                        }`}
                      />
                    </div>

                    {/* Bar 2: Necessidades */}
                    <div className="w-1/2 flex flex-col items-center justify-end h-full">
                      <div 
                        style={{ height: `${heightNecPct}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Month Label & Ratio */}
                  <div className="text-center w-full">
                    <span className={`text-[11px] sm:text-xs font-bold block ${
                      isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {month.shortName}
                    </span>
                    <span className="text-[9px] font-mono font-medium text-slate-400 block truncate">
                      {month.ratioSavingsToNecessities.toFixed(2)}x
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto relative z-10" data-testid="savings-vs-necessities-table-view">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Mês</th>
                <th className="py-2.5 px-3 text-right">Receitas</th>
                <th className="py-2.5 px-3 text-right">Poupado (Saldo)</th>
                <th className="py-2.5 px-3 text-right">Necessidades</th>
                <th className="py-2.5 px-3 text-right">% Necessidades</th>
                <th className="py-2.5 px-3 text-right">Razão (Poup/Nec)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary.months.map((m) => (
                <tr 
                  key={m.monthIndex}
                  onClick={() => setSelectedMonthIdx(m.monthIndex)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    activeDetailMonth.monthIndex === m.monthIndex ? 'bg-teal-50/40 dark:bg-teal-950/20 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-slate-800 dark:text-white font-medium flex items-center gap-1.5">
                    <span>{m.name}</span>
                    {activeDetailMonth.monthIndex === m.monthIndex && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                    {formatBRL(m.receitas)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${
                    m.poupado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatBRL(m.poupado)} ({m.savingsRate}%)
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                    {formatBRL(m.necessidades)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {m.necessitiesRate}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    R$ {m.ratioSavingsToNecessities.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Month Deep Dive Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
            {activeDetailMonth.shortName}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Detalhamento de {activeDetailMonth.monthName || activeDetailMonth.name} / {activeDetailMonth.year}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeDetailMonth.poupado >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
              }`}>
                {activeDetailMonth.poupado >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Poupado: <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(activeDetailMonth.poupado)}</strong> ({activeDetailMonth.savingsRate}% da renda) • Necessidades: <strong className="text-blue-600 dark:text-blue-400">{formatBRL(activeDetailMonth.necessidades)}</strong> ({activeDetailMonth.necessitiesRate}% da renda)
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">
            Relação do Mês
          </span>
          <span className="text-sm font-black text-slate-800 dark:text-white">
            R$ {activeDetailMonth.ratioSavingsToNecessities.toFixed(2)} poupados / R$ 1,00 nec.
          </span>
        </div>
      </div>

      {/* Strategic Trend Diagnosis & Action Guidance */}
      <div className={`p-4 rounded-2xl border space-y-2 relative z-10 ${
        isPositive
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
          : 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
      }`}>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-black uppercase tracking-wider">
            {summary.trendHeadline}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {summary.trendExplanation}
        </p>

        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            💡 {summary.recommendation}
          </div>

          {onNavigateToScreen && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateToScreen('potes')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 text-[11px] transition-all flex items-center gap-1 shadow-2xs"
              >
                <span>Ver Pote 55%</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateToScreen('sonhos')}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-2xs"
              >
                <span>Aportar em Sonhos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
