import React, { useState, useMemo } from 'react';
import { 
  Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Minus, Calendar, Info, Layers, Sparkles, Filter, ChevronDown, CheckCircle2,
  FileSpreadsheet, ShieldAlert, HeartPulse, Receipt, HelpCircle
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL, formatNumber } from '../utils/finance';
import { 
  calculatePjDreComparison, 
  getAvailablePjMonths, 
  DreLineItem,
  VariancePolarity 
} from '../utils/pjDre';

interface PjDreComparativeProps {
  transactions: Transaction[];
  initialMonth?: string;
}

export const PjDreComparative: React.FC<PjDreComparativeProps> = ({
  transactions,
  initialMonth = '2026-10'
}) => {
  const availableMonths = useMemo(() => getAvailablePjMonths(transactions, true), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths.includes(initialMonth) ? initialMonth : (availableMonths[0] || '2026-10');
  });

  const [viewMode, setViewMode] = useState<'analitico' | 'executivo'>('analitico');
  const [showTaxExplainer, setShowTaxExplainer] = useState(false);

  // Compute DRE comparative analysis dynamically
  const dreResult = useMemo(() => {
    return calculatePjDreComparison(transactions, selectedMonth, 3);
  }, [transactions, selectedMonth]);

  // Polarity badge helper
  const renderVarianceBadge = (item: DreLineItem) => {
    const isZero = Math.abs(item.nominalVariance) < 0.001;
    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Minus className="w-3 h-3" /> 0,0%
        </span>
      );
    }

    const isFav = item.polarity === 'favorable';
    const isPositiveVal = item.percentVariance > 0;
    const sign = isPositiveVal ? '+' : '';
    const formattedPct = item.isPercentage 
      ? `${sign}${formatNumber(item.percentVariance)} p.p.`
      : `${sign}${formatNumber(item.percentVariance)}%`;

    if (isFav) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          title="Variação financeiramente favorável"
        >
          {isPositiveVal ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          {formattedPct}
        </span>
      );
    }

    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        title="Variação desfavorável / Atenção ao custo"
      >
        {isPositiveVal ? <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
        {formattedPct}
      </span>
    );
  };

  const filteredLines = useMemo(() => {
    if (viewMode === 'executivo') {
      // Show main lines only, omitting sub-lines
      return dreResult.lines.filter(l => !l.isSubItem);
    }
    return dreResult.lines;
  }, [dreResult.lines, viewMode]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Top Header & Filters */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white shadow-sm">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-600 dark:text-amber-400">
                Demonstrativo Contábil & Análise Trimestral
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              DRE Comparativo PJ: Mês Atual vs Média 3 Meses
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Compare lado a lado o desempenho do mês selecionado com a média ponderada do trimestre anterior ({dreResult.precedingPeriodLabel}) para identificar tendências de margem e desvios de custos.
            </p>
          </div>

          {/* Action Bar & Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-semibold">Mês Base:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                data-testid="dre-month-select"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m === '2026-10' ? 'Outubro / 2026 (Atual)' : m}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('analitico')}
                className={`px-3 py-1 rounded-xl transition ${
                  viewMode === 'analitico'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Analítico
              </button>
              <button
                type="button"
                onClick={() => setViewMode('executivo')}
                className={`px-3 py-1 rounded-xl transition ${
                  viewMode === 'executivo'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sintético
              </button>
            </div>

            {/* Tax info modal trigger */}
            <button
              type="button"
              onClick={() => setShowTaxExplainer(!showTaxExplainer)}
              className="p-2 rounded-2xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              title="Informações sobre Simples Nacional e tributação"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tax Note Collapse */}
        {showTaxExplainer && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Regras Fiscais & Contábeis Aplicadas:</p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                • <strong>DAS Simples Nacional:</strong> Calculado sobre o faturamento bruto de serviços de TI / Consultoria (Anexo III - 6% inicial).<br />
                • <strong>Distribuição de Lucros Isenta:</strong> O Lucro Líquido apurado pós-impostos e despesas operacionais pode ser transferido integralmente à Pessoa Física do sócio com 100% de isenção de IRPF (art. 10 da Lei nº 9.249/1995).
              </p>
            </div>
          </div>
        )}

        {/* 4 Mini KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {/* 1. Receita Bruta */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Receita Bruta vs 3M
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatBRL(dreResult.currentMonth.grossRevenue)}
              </span>
            </div>
            <div className="mt-2 text-[11px] flex items-center justify-between text-slate-500">
              <span>Média: {formatBRL(dreResult.avg3Months.grossRevenue)}</span>
              <span className={`font-bold ${dreResult.kpis.revenueVariance.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {dreResult.kpis.revenueVariance.percent > 0 ? '+' : ''}{formatNumber(dreResult.kpis.revenueVariance.percent)}%
              </span>
            </div>
          </div>

          {/* 2. Deduções / Tributos */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              DAS Simples vs 3M
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-rose-600 dark:text-rose-400">
                {formatBRL(dreResult.currentMonth.dasTaxes)}
              </span>
            </div>
            <div className="mt-2 text-[11px] flex items-center justify-between text-slate-500">
              <span>Média: {formatBRL(dreResult.avg3Months.dasTaxes)}</span>
              <span className={`font-bold ${dreResult.kpis.taxVariance.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {dreResult.kpis.taxVariance.percent > 0 ? '+' : ''}{formatNumber(dreResult.kpis.taxVariance.percent)}%
              </span>
            </div>
          </div>

          {/* 3. Despesas Operacionais */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Despesas PJ vs 3M
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatBRL(dreResult.currentMonth.totalOperatingExpenses)}
              </span>
            </div>
            <div className="mt-2 text-[11px] flex items-center justify-between text-slate-500">
              <span>Média: {formatBRL(dreResult.avg3Months.totalOperatingExpenses)}</span>
              <span className={`font-bold ${dreResult.kpis.expenseVariance.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {dreResult.kpis.expenseVariance.percent > 0 ? '+' : ''}{formatNumber(dreResult.kpis.expenseVariance.percent)}%
              </span>
            </div>
          </div>

          {/* 4. Lucro Líquido */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
              Lucro Líquido Livre
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {formatBRL(dreResult.currentMonth.netProfit)}
              </span>
            </div>
            <div className="mt-2 text-[11px] flex items-center justify-between text-slate-500">
              <span>Média: {formatBRL(dreResult.avg3Months.netProfit)}</span>
              <span className={`font-bold ${dreResult.kpis.profitVariance.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {dreResult.kpis.profitVariance.percent > 0 ? '+' : ''}{formatNumber(dreResult.kpis.profitVariance.percent)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Side-by-Side DRE Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse" data-testid="dre-comparative-table">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <th className="py-3.5 px-5">Estrutura DRE / Linha Contábil</th>
              <th className="py-3.5 px-4 text-right">
                {dreResult.referenceMonthLabel} <span className="text-[10px] font-normal text-slate-400">(Mês Atual)</span>
              </th>
              <th className="py-3.5 px-4 text-right">
                Média 3M <span className="text-[10px] font-normal text-slate-400">({dreResult.precedingPeriodLabel})</span>
              </th>
              <th className="py-3.5 px-4 text-right">Variação (R$)</th>
              <th className="py-3.5 px-4 text-right">Variação (%)</th>
              <th className="py-3.5 px-5 text-center">Status / Sentido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLines.map(line => {
              const isSub = line.isSubItem;
              const isSubtotal = line.isSubtotal;
              const isIndicator = line.category === 'indicador';
              const isDeductionOrExpense = line.category === 'deducao' || line.category === 'despesa' || line.category === 'subdespesa';

              // Row background emphasis
              let rowBg = 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition';
              if (line.id === 'lucro_liquido') {
                rowBg = 'bg-amber-50/40 dark:bg-amber-950/20 font-black border-y-2 border-amber-300 dark:border-amber-700/60';
              } else if (isSubtotal) {
                rowBg = 'bg-slate-50/50 dark:bg-slate-800/30 font-bold';
              }

              return (
                <tr key={line.id} className={rowBg} data-testid={`dre-row-${line.id}`}>
                  {/* Linha Contábil */}
                  <td className="py-3.5 px-5">
                    <div className={`${isSub ? 'pl-6' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{line.code}</span>
                        <span className={`${isSubtotal || line.isHighlighted ? 'font-black text-slate-900 dark:text-white' : isSub ? 'text-slate-600 dark:text-slate-300 font-medium' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                          {line.title}
                        </span>
                      </div>
                      {line.note && (
                        <div className="text-[10px] text-slate-400 mt-0.5 ml-6">
                          {line.note}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Mês Atual */}
                  <td className={`py-3.5 px-4 text-right font-mono text-xs ${line.isHighlighted ? 'font-bold' : ''}`}>
                    {line.isPercentage ? (
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatNumber(line.currentMonthValue)}%
                      </span>
                    ) : (
                      <span className={isDeductionOrExpense && line.currentMonthValue > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-900 dark:text-white'}>
                        {isDeductionOrExpense && line.currentMonthValue > 0 ? '-' : ''}
                        {formatBRL(line.currentMonthValue)}
                      </span>
                    )}
                  </td>

                  {/* Média 3 Meses */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {line.isPercentage ? (
                      <span>{formatNumber(line.avg3MonthsValue)}%</span>
                    ) : (
                      <span>
                        {isDeductionOrExpense && line.avg3MonthsValue > 0 ? '-' : ''}
                        {formatBRL(line.avg3MonthsValue)}
                      </span>
                    )}
                  </td>

                  {/* Variação Nominal R$ */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs">
                    {line.isPercentage ? (
                      <span className={`font-bold ${line.nominalVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {line.nominalVariance >= 0 ? '+' : ''}{formatNumber(line.nominalVariance)} p.p.
                      </span>
                    ) : (
                      <span className={`font-semibold ${line.polarity === 'favorable' ? 'text-emerald-600 dark:text-emerald-400' : line.polarity === 'unfavorable' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                        {line.nominalVariance > 0 ? '+' : ''}{formatBRL(line.nominalVariance)}
                      </span>
                    )}
                  </td>

                  {/* Variação Percentual (%) Badge */}
                  <td className="py-3.5 px-4 text-right">
                    {renderVarianceBadge(line)}
                  </td>

                  {/* Status / Impacto */}
                  <td className="py-3.5 px-5 text-center">
                    {line.polarity === 'favorable' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Favorável
                      </span>
                    ) : line.polarity === 'unfavorable' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="w-3.5 h-3.5" /> Atenção
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Minus className="w-3.5 h-3.5" /> Em Linha
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Automated Executive Analysis & Insights Footer */}
      <div className="p-5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Parecer Executivo da Operação PJ:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              {dreResult.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
