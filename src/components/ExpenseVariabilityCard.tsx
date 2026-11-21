import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart2,
  CalendarClock,
  CheckCircle2,
  Flame,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Transaction } from '../types';
import {
  calculateCategoryExpenseVariability,
  CategoryExpenseVariabilityItem,
  formatBRL,
} from '../utils/finance';

export interface ExpenseVariabilityCardProps {
  transactions: Transaction[];
  referenceDate?: string;
  className?: string;
}

type CategoryFilterMode = 'ALL' | 'PREDICTABLE' | 'VOLATILE';

export const ExpenseVariabilityCard: React.FC<ExpenseVariabilityCardProps> = ({
  transactions,
  referenceDate,
  className = '',
}) => {
  const [filterMode, setFilterMode] = useState<CategoryFilterMode>('ALL');

  const report = useMemo(
    () => calculateCategoryExpenseVariability(transactions, referenceDate),
    [transactions, referenceDate]
  );

  const visibleCategories: CategoryExpenseVariabilityItem[] = useMemo(() => {
    if (filterMode === 'PREDICTABLE') {
      return report.categories.filter(c => c.classification === 'PREVISIVEL');
    }
    if (filterMode === 'VOLATILE') {
      return report.categories.filter(c => c.classification === 'VOLATIL');
    }
    return report.categories;
  }, [report.categories, filterMode]);

  const progressElapsedPct = Math.min(
    100,
    Math.round((report.currentDay / Math.max(1, report.daysInMonth)) * 100)
  );

  return (
    <section
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
      data-testid="card-expense-variability"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <BarChart2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Variabilidade por Categoria (σ) &amp; Run-Rate
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Previsibilidade de Despesas &amp; Projeção de Fechamento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Compara categorias PF previsíveis (CV &lt; 25%) e voláteis (CV ≥ 25%) e projeta o ritmo até o fim do mês.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold self-start lg:self-auto"
          role="group"
          aria-label="Filtrar categorias por previsibilidade"
        >
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            data-testid="btn-variability-filter-all"
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Todas ({report.categories.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('PREDICTABLE')}
            data-testid="btn-variability-filter-predictable"
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'PREDICTABLE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Previsíveis ({report.predictableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('VOLATILE')}
            data-testid="btn-variability-filter-volatile"
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterMode === 'VOLATILE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            Voláteis ({report.volatileCount})
          </button>
        </div>
      </div>

      {/* Month-End Run-Rate Banner KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>Gasto Realizado ({report.currentMonthKey})</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div
            className="text-xl font-black text-slate-900 dark:text-white tabular-nums"
            data-testid="variability-current-spent"
          >
            {formatBRL(report.totalSpentCurrentMonthBRL)}
          </div>
          <p className="text-[11px] text-slate-500">
            Dia {report.currentDay} de {report.daysInMonth} ({progressElapsedPct}% do mês)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-violet-700 dark:text-violet-300 font-semibold">
            <span>Projeção Run-Rate Fim do Mês</span>
            <CalendarClock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div
            className="text-xl font-black text-violet-700 dark:text-violet-300 tabular-nums"
            data-testid="variability-projected-runrate"
          >
            {formatBRL(report.totalProjectedRunRateBRL)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ritmo linear: (Gasto ÷ Dia {report.currentDay}) × {report.daysInMonth} dias
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            <span>Equilíbrio de Previsibilidade</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              {report.predictableCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              previsíveis • {report.volatileCount} voláteis
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Base: {report.monthsAnalyzedCount}{' '}
            {report.monthsAnalyzedCount === 1 ? 'mês registrado' : 'meses analisados'}
          </p>
        </div>
      </div>

      {/* Category Table / Ranking */}
      {visibleCategories.length === 0 ? (
        <div
          className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400"
          data-testid="variability-categories-empty"
        >
          Nenhuma despesa PF encontrada para este filtro de variabilidade.
        </div>
      ) : (
        <div className="space-y-2.5">
          {report.monthsAnalyzedCount < 2 && (
            <div className="px-3.5 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span>
                Com apenas 1 mês de lançamentos PF no filtro atual, o desvio padrão intermensal (σ) inicia em R$ 0,00. O Run-Rate projeta o ritmo do mês corrente.
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Categoria PF</th>
                  <th className="py-2.5 px-3 text-right">Média <span className="normal-case">(μ)</span></th>
                  <th className="py-2.5 px-3 text-right">Desvio <span className="normal-case">(σ)</span></th>
                  <th className="py-2.5 px-3 text-center">Classificação (CV)</th>
                  <th className="py-2.5 px-3 text-right">Atual no Mês</th>
                  <th className="py-2.5 px-3 text-right">Run-Rate Fim Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleCategories.map(item => {
                  const badgeClass =
                    item.badgeTone === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : item.badgeTone === 'amber'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                  return (
                    <tr
                      key={item.category}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      data-testid={`variability-row-${item.category}`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {item.category}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatBRL(item.meanBRL)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        ± {formatBRL(item.stdDevBRL)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tabular-nums ${badgeClass}`}
                        >
                          {item.classification === 'PREVISIVEL' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Flame className="w-3 h-3" />
                          )}
                          <span>
                            {item.classificationLabel} ({item.cvPercent.toFixed(1).replace('.', ',')}%)
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatBRL(item.currentMonthSpentBRL)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-violet-700 dark:text-violet-300 tabular-nums">
                        {formatBRL(item.projectedRunRateBRL)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
