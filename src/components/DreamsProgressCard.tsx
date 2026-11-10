import React from 'react';
import { Target, Sparkles, ArrowRight, CheckCircle2, TrendingUp, Cloud } from 'lucide-react';
import { DreamGoal } from '../types';
import { calculateDreamsDashboardSummary, DreamsDashboardSummary } from '../utils/dreamsSummary';
import { formatBRL } from '../utils/finance';

interface DreamsProgressCardProps {
  dreams?: DreamGoal[];
  onNavigateToDreams?: () => void;
  className?: string;
}

export const DreamsProgressCard: React.FC<DreamsProgressCardProps> = ({
  dreams = [],
  onNavigateToDreams,
  className = ''
}) => {
  const summary: DreamsDashboardSummary = calculateDreamsDashboardSummary(dreams);

  const {
    totalCount,
    totalAccumulated,
    totalTarget,
    totalRemaining,
    overallPercentage,
    formattedPercentage,
    statusHeadline,
    completedCount
  } = summary;

  return (
    <div 
      className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-sky-300 dark:hover:border-sky-800 transition min-w-0 ${className}`}
      data-testid="card-dreams-summary"
    >
      {/* Top subtle gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-teal-400 to-indigo-500" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider truncate">
              Sonhos & Metas
            </span>
          </div>

          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 shrink-0"
            data-testid="badge-dreams-status"
          >
            {statusHeadline}
          </span>
        </div>

        {/* Big Percentage & Target numbers */}
        <div className="flex items-baseline justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-1.5">
            <span 
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white"
              data-testid="text-dreams-percentage"
            >
              {formattedPercentage}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              concluído
            </span>
          </div>

          <span className="text-[10px] font-semibold text-slate-400 text-right truncate">
            {formatBRL(totalAccumulated)} de {formatBRL(totalTarget)}
          </span>
        </div>

        {/* Progress Bar with markers */}
        <div className="mt-2.5">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-500 transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, Math.max(overallPercentage, totalCount > 0 ? 3 : 0))}%` }}
              data-testid="progress-bar-dreams-cumulative"
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1">
            <span>{totalCount} {totalCount === 1 ? 'meta ativa' : 'metas ativas'}</span>
            <span>
              {overallPercentage >= 100 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Todas Concluídas
                </span>
              ) : (
                `Faltam ${formatBRL(totalRemaining)}`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Footer navigation link */}
      {onNavigateToDreams && (
        <button
          type="button"
          onClick={onNavigateToDreams}
          className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition w-full cursor-pointer"
          data-testid="btn-view-dreams-from-dashboard"
        >
          <span>Ver Sonhos & Aportes</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
