import React, { useMemo } from 'react';
import { BarChart3, TrendingDown, Layers, PieChart, Sparkles, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { RecurringExpense } from '../types';
import { calculateTopRecurringExpenseCategories, RecurringCategoryContribution } from '../utils/recurringCategories';
import { formatBRL } from '../utils/finance';

interface RecurringTopCategoriesCardProps {
  recurringList: RecurringExpense[];
  className?: string;
}

export const RecurringTopCategoriesCard: React.FC<RecurringTopCategoriesCardProps> = ({
  recurringList,
  className = ''
}) => {
  const result = useMemo(() => {
    return calculateTopRecurringExpenseCategories(recurringList, 3);
  }, [recurringList]);

  const { topCategories, totalMonthlyRecurringExpenses, top3TotalAmount, top3PercentageOfTotal, categoriesCount } = result;

  if (topCategories.length === 0) {
    return null;
  }

  // Visual medal / rank markers
  const RANK_CONFIGS = [
    {
      label: '1º Lugar',
      emoji: '🥇',
      badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      barGradient: 'from-indigo-500 to-indigo-600',
      pillBg: 'bg-indigo-600',
    },
    {
      label: '2º Lugar',
      emoji: '🥈',
      badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      barGradient: 'from-teal-500 to-emerald-600',
      pillBg: 'bg-teal-600',
    },
    {
      label: '3º Lugar',
      emoji: '🥉',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      barGradient: 'from-amber-500 to-orange-500',
      pillBg: 'bg-amber-500',
    },
  ];

  return (
    <div 
      className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden ${className}`}
      data-testid="recurring-top-categories-card"
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                Maiores Despesas Recorrentes por Categoria
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Top 3 Impactos
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identificação automática das categorias que mais pesam nos gastos fixos mensais
            </p>
          </div>
        </div>

        {/* Global Share Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span 
            className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            data-testid="top-3-share-badge"
          >
            <PieChart className="w-3.5 h-3.5 text-indigo-500" />
            <span>Top 3: <strong>{top3PercentageOfTotal}%</strong> do fixo</span>
          </span>
        </div>
      </div>

      {/* Horizontal Bar Chart Comparison */}
      <div className="space-y-3.5 relative z-10 pt-1">
        {topCategories.map((item, idx) => {
          const rankConf = RANK_CONFIGS[idx] || RANK_CONFIGS[2];

          return (
            <div 
              key={item.category} 
              className="space-y-1.5 p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
              data-testid={`top-cat-bar-${idx}`}
            >
              {/* Category Label, Rank & Values Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 shrink-0 ${rankConf.badgeBg}`}>
                    <span>{rankConf.emoji}</span>
                    <span>{rankConf.label}</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white truncate">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    ({item.itemsCount} {item.itemsCount === 1 ? 'item' : 'itens'})
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {formatBRL(item.monthlyAmount)}
                    <span className="text-[10px] text-slate-400 font-normal">/mês</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                    {item.percentageOfTotal}%
                  </span>
                </div>
              </div>

              {/* Horizontal Bar Track */}
              <div className="w-full h-3 bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${rankConf.barGradient} transition-all duration-700 shadow-xs`}
                  style={{ width: `${item.barWidthPct}%` }}
                />
              </div>

              {/* Sample items pill list */}
              {item.sampleItems && item.sampleItems.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400">Exemplos:</span>
                  {item.sampleItems.map(desc => (
                    <span 
                      key={desc}
                      className="px-2 py-0.2 rounded-md bg-white dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]"
                    >
                      {desc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Synthesis Insight Footer */}
      <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-indigo-950 dark:text-indigo-200 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            As 3 principais categorias somam <strong>{formatBRL(top3TotalAmount)}</strong> de um total fixo de <strong>{formatBRL(totalMonthlyRecurringExpenses)}/mês</strong> ({categoriesCount} categorias no total).
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Foco prioritário para corte de custos</span>
        </div>
      </div>
    </div>
  );
};
