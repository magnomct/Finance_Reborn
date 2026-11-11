import React, { useState, useMemo } from 'react';
import { 
  Building2, TrendingUp, TrendingDown, Minus, Calendar, 
  ArrowUpRight, ArrowDownRight, Percent, Sparkles, 
  ShieldCheck, AlertTriangle, Layers, BarChart2, Table as TableIcon,
  ChevronDown, HelpCircle, CheckCircle2, DollarSign, Receipt
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL, formatNumber } from '../utils/finance';
import { 
  calculatePjDreComparison, 
  getAvailablePjMonths, 
  formatMonthLabel,
  PjDreComparisonResult,
  DreLineItem
} from '../utils/pjDre';

interface PjDreMarginComparisonCardProps {
  transactions: Transaction[];
  initialMonth?: string;
  themeCardClass?: string;
}

export const PjDreMarginComparisonCard: React.FC<PjDreMarginComparisonCardProps> = ({
  transactions,
  initialMonth = '2026-10',
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
}) => {
  const availableMonths = useMemo(() => getAvailablePjMonths(transactions, true), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths.includes(initialMonth) ? initialMonth : (availableMonths[0] || '2026-10');
  });

  const [activeTab, setActiveTab] = useState<'indicadores' | 'tabela'>('indicadores');
  const [showTaxNote, setShowTaxNote] = useState(false);

  // Calculate comparison data
  const comparison: PjDreComparisonResult = useMemo(() => {
    return calculatePjDreComparison(transactions, selectedMonth, 3);
  }, [transactions, selectedMonth]);

  const { marginVariance } = comparison.kpis;
  const isExpansion = marginVariance.isExpansion;
  const isNeutral = Math.abs(marginVariance.percentVariance) < 0.05;

  return (
    <div 
      className={`${themeCardClass} rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm relative overflow-hidden`}
      data-testid="pj-dre-margin-comparison"
    >
      {/* Background ambient gradient highlighting margin direction */}
      <div 
        className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isExpansion 
            ? 'bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent' 
            : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
        }`}
      />

      {/* Top Header: Title, Subtitle and Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-3 rounded-2xl text-white shadow-md shrink-0 ${
            isExpansion
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
              : 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-500/20'
          }`}>
            <Percent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Comparativo DRE PJ: Mês Atual vs Média 3 Meses
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {comparison.precedingPeriodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Confronto direto de faturamento, impostos, custos e da <strong>Margem de Lucro Líquida</strong> da Conta Inter PJ.
            </p>
          </div>
        </div>

        {/* Month Selector & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
              data-testid="select-comparison-month"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('indicadores')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'indicadores'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Visão de Indicadores e Gráficos"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Painel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tabela')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'tabela'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Tabela DRE Completa"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela DRE</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HERO BANNER: DESTAQUE DA VARIAÇÃO PERCENTUAL DA MARGEM DE LUCRO LÍQUIDA
          (EM VERDE SE EXPANSÃO OU EM VERMELHO SE COMPRESSÃO)
          ========================================================================= */}
      <div 
        className={`p-4 sm:p-6 rounded-2xl border-2 transition-all relative z-10 ${
          isExpansion
            ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border-emerald-400 dark:border-emerald-700/80 shadow-emerald-500/5'
            : 'bg-gradient-to-br from-rose-50/90 via-amber-50/50 to-white dark:from-rose-950/40 dark:via-amber-950/20 dark:to-slate-900 border-rose-400 dark:border-rose-700/80 shadow-rose-500/5'
        }`}
        data-testid="margin-highlight-banner"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Left: Main Metrics & Standout Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                isExpansion 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}>
                {marginVariance.statusLabel}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {comparison.referenceMonthLabel} vs {comparison.precedingPeriodLabel}
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              {/* Variação Percentual da Margem Destacada */}
              <div 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xl sm:text-2xl shadow-sm border ${
                  isExpansion
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
                }`}
                data-testid="net-margin-variation-badge"
              >
                {isExpansion ? (
                  <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <TrendingDown className="w-6 h-6 stroke-[2.5]" />
                )}
                <span>
                  {marginVariance.percentVariance > 0 ? '+' : ''}
                  {marginVariance.percentVariance.toFixed(1)}%
                </span>
              </div>

              {/* Difference in percentage points */}
              <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                <span className={`font-mono text-base font-black ${isExpansion ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} data-testid="margin-diff-points">
                  {marginVariance.diffPoints > 0 ? '+' : ''}{marginVariance.diffPoints.toFixed(1)} p.p.
                </span>
                <span className="text-slate-400 text-xs ml-1 font-medium">de diferença líquida</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl pt-1">
              {marginVariance.explanation}
            </p>
          </div>

          {/* Right: Side-by-Side Comparison Box */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 min-w-[260px] shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Comparativo de Margem</span>
              <span className="font-mono text-slate-500">Lucro / Faturamento</span>
            </div>

            {/* Mês Atual Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {comparison.referenceMonthLabel}:
                </span>
                <span className={`font-black font-mono text-sm ${isExpansion ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} data-testid="current-net-margin">
                  {marginVariance.currentMarginPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExpansion 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : 'bg-gradient-to-r from-rose-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, marginVariance.currentMarginPct))}%` }}
                />
              </div>
            </div>

            {/* Média 3 Meses Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Média 3 Meses:
                </span>
                <span className="font-black font-mono text-sm text-slate-700 dark:text-slate-300" data-testid="avg-net-margin">
                  {marginVariance.avgMarginPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-blue-500 dark:bg-blue-400 opacity-70 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, marginVariance.avgMarginPct))}%` }}
                />
              </div>
            </div>

            {/* Micro summary */}
            <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60">
              <span>Lucro Livre p/ PF:</span>
              <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatBRL(comparison.currentMonth.netProfit)}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4 DRE Metric Drivers (Receita, DAS, Custos, Lucro) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        
        {/* 1. Receita Operacional Bruta */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider">1. Receita Bruta</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
              comparison.kpis.revenueVariance.polarity === 'favorable'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {comparison.kpis.revenueVariance.percent > 0 ? '+' : ''}
              {comparison.kpis.revenueVariance.percent.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            {formatBRL(comparison.currentMonth.grossRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Média 3M:</span>
            <span className="font-mono">{formatBRL(comparison.avg3Months.grossRevenue)}</span>
          </div>
        </div>

        {/* 2. Deduções de Impostos DAS Simples */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider">2. Tributos (DAS)</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
              comparison.kpis.taxVariance.polarity === 'favorable'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {comparison.kpis.taxVariance.percent > 0 ? '+' : ''}
              {comparison.kpis.taxVariance.percent.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
            -{formatBRL(comparison.currentMonth.dasTaxes)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Média 3M:</span>
            <span className="font-mono">-{formatBRL(comparison.avg3Months.dasTaxes)}</span>
          </div>
        </div>

        {/* 3. Despesas Operacionais Totais */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider">3. Custos Operacionais</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
              comparison.kpis.expenseVariance.polarity === 'favorable'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {comparison.kpis.expenseVariance.percent > 0 ? '+' : ''}
              {comparison.kpis.expenseVariance.percent.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
            -{formatBRL(comparison.currentMonth.totalOperatingExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Média 3M:</span>
            <span className="font-mono">-{formatBRL(comparison.avg3Months.totalOperatingExpenses)}</span>
          </div>
        </div>

        {/* 4. Lucro Líquido Repassável */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider">4. Lucro p/ PF</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
              comparison.kpis.profitVariance.polarity === 'favorable'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {comparison.kpis.profitVariance.percent > 0 ? '+' : ''}
              {comparison.kpis.profitVariance.percent.toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
            +{formatBRL(comparison.currentMonth.netProfit)}
          </div>
          <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 flex items-center justify-between">
            <span>Média 3M:</span>
            <span className="font-mono">{formatBRL(comparison.avg3Months.netProfit)}</span>
          </div>
        </div>

      </div>

      {/* Main Tab View: Detailed Side-by-Side DRE Table when active */}
      {activeTab === 'tabela' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
          <table className="w-full text-xs text-left border-collapse" data-testid="table-dre-side-by-side">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-2.5 px-4">Linha DRE</th>
                <th className="py-2.5 px-3 text-right">{comparison.referenceMonthLabel} (Atual)</th>
                <th className="py-2.5 px-3 text-right">Média 3M</th>
                <th className="py-2.5 px-3 text-right">Var. Nominal</th>
                <th className="py-2.5 px-3 text-right">Var. Percentual</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparison.lines.map((l) => {
                const isMargin = l.id === 'margem_liquida';
                const isProfit = l.id === 'lucro_liquido';
                const isExpense = l.category === 'deducao' || l.category === 'despesa' || l.category === 'subdespesa';

                return (
                  <tr 
                    key={l.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      isMargin
                        ? isExpansion ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-bold' : 'bg-rose-50/50 dark:bg-rose-950/20 font-bold'
                        : isProfit 
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 font-bold' 
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-400">{l.code}</span>
                        <span className={l.isHighlighted ? 'font-black' : 'font-medium'}>{l.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {l.isPercentage ? `${l.currentMonthValue.toFixed(1)}%` : formatBRL(l.currentMonthValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {l.isPercentage ? `${l.avg3MonthsValue.toFixed(1)}%` : formatBRL(l.avg3MonthsValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {l.isPercentage ? (
                        <span className={l.nominalVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {l.nominalVariance >= 0 ? '+' : ''}{l.nominalVariance.toFixed(1)} p.p.
                        </span>
                      ) : (
                        <span className={l.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {l.nominalVariance > 0 ? '+' : ''}{formatBRL(l.nominalVariance)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] inline-block ${
                        l.polarity === 'favorable'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : l.polarity === 'unfavorable'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {l.percentVariance > 0 ? '+' : ''}{l.percentVariance.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {l.polarity === 'favorable' ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Favorável
                        </span>
                      ) : l.polarity === 'unfavorable' ? (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> Atenção
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Guidance & Strategic Advice */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              Estratégia Financeira & Distribuição de Lucros
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {marginVariance.actionGuidance}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
            Isento de IRPF (Lei 9.249/95)
          </span>
        </div>
      </div>

    </div>
  );
};
