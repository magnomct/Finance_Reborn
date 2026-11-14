import React, { useEffect } from 'react';
import { X, Clock, Target, Hourglass } from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { calculateDreamCountdown, getPriorityConfig } from '../utils/dreamCountdown';
import { GoalTrajectoryChart } from './GoalTrajectoryChart';

interface GoalDetailModalProps {
  isOpen: boolean;
  dream: DreamGoal | null;
  transactions?: Transaction[];
  onClose: () => void;
  onRecordContribution: (dreamId: string, amount: number, date: string, note?: string) => void;
  onOpenSimulator?: (dream: DreamGoal) => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  isOpen,
  dream,
  transactions = [],
  onClose,
  onRecordContribution,
  onOpenSimulator,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dream) return null;

  const pct = Math.min(100, (dream.current / (dream.target || 1)) * 100);
  const remaining = Math.max(0, dream.target - dream.current);
  const countdown = calculateDreamCountdown(dream.targetDate);
  const priorityInfo = getPriorityConfig(dream.priority);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`goal-detail-modal-title-${dream.id}`}
      data-testid={`goal-detail-modal-${dream.id}`}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span>{dream.category}</span>
              <span aria-hidden="true">·</span>
              <span>{priorityInfo.label}</span>
              <span aria-hidden="true">·</span>
              <span>Prazo: {countdown.hasDeadline ? countdown.formattedTargetDate : 'Sem prazo'}</span>
            </div>
            <h3
              id={`goal-detail-modal-title-${dream.id}`}
              className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate"
            >
              {dream.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dream.impact}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes da meta"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            data-testid="btn-close-goal-detail-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Progress Bar + Side-by-Side Countdown */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Progresso da Meta:
                </span>
                <span className="font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold" data-testid={`modal-goal-current-${dream.id}`}>
                  Acumulado: {formatBRL(dream.current)}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-700 dark:text-slate-200 font-bold">
                  Alvo: {formatBRL(dream.target)}
                </span>
                <span className="text-slate-400 hidden sm:inline">·</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold hidden sm:inline">
                  {remaining === 0 ? 'Concluída' : `Faltam ${formatBRL(remaining)}`}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="flex-1 min-w-0 bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${dream.gradient} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
                />
              </div>

              <div
                className={`shrink-0 px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 text-[11px] font-black whitespace-nowrap ${countdown.badgeColorClass}`}
              >
                <Hourglass className="w-3.5 h-3.5 shrink-0" />
                <span>{countdown.hasDeadline ? countdown.countdownLabel : 'Sem prazo'}</span>
              </div>
            </div>
          </div>

          {/* Interactive Goal Trajectory Chart */}
          <GoalTrajectoryChart
            dream={dream}
            transactions={transactions}
            onRecordContribution={onRecordContribution}
            compact
          />
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {onOpenSimulator ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSimulator(dream);
              }}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:border-indigo-400 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Simular Prazo &amp; Aportes</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
