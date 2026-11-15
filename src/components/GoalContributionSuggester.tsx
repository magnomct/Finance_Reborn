import React, { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Edit3,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { DreamGoal, RecurringExpense, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  calculateRequiredGoalContribution,
  GoalContributionSuggestion,
} from '../utils/goalContributionSuggester';

export interface GoalContributionSuggesterProps {
  dream: DreamGoal;
  recurringList?: RecurringExpense[];
  transactions?: Transaction[];
  availableMonthlySurplus?: number;
  effectiveIncomeBase?: number;
  onApplyToBudget: (dreamId: string, overrideAmount?: number) => void;
  compact?: boolean;
  className?: string;
}

export const GoalContributionSuggester: React.FC<GoalContributionSuggesterProps> = ({
  dream,
  recurringList = [],
  transactions = [],
  availableMonthlySurplus,
  effectiveIncomeBase,
  onApplyToBudget,
  compact = false,
  className = '',
}) => {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState('');

  const suggestion: GoalContributionSuggestion = useMemo(() => {
    return calculateRequiredGoalContribution(dream, {
      recurringList,
      transactions,
      availableMonthlySurplus,
      effectiveIncomeBase,
    });
  }, [dream, recurringList, transactions, availableMonthlySurplus, effectiveIncomeBase]);

  const formattedCashFlowImpact = useMemo(() => {
    if (suggestion.requiredMonthlyContribution <= 0) return '0,0%';
    if (suggestion.availableMonthlySurplus <= 0) {
      return suggestion.incomeSharePct > 0
        ? `100%+ (${suggestion.incomeSharePct.toFixed(1).replace('.', ',')}% da renda)`
        : '100%+ (sem sobra livre)';
    }
    if (suggestion.cashFlowImpactPct > 999) {
      return `>999% (${suggestion.incomeSharePct.toFixed(1).replace('.', ',')}% da renda)`;
    }
    return `${suggestion.cashFlowImpactPct.toFixed(1).replace('.', ',')}%`;
  }, [suggestion]);

  const handleOpenEdit = () => {
    setCustomAmountInput(
      String(
        suggestion.plannedMonthlyContribution > 0
          ? suggestion.plannedMonthlyContribution
          : suggestion.requiredMonthlyContribution
      )
    );
    setIsEditingAmount(true);
  };

  const handleSaveCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customAmountInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onApplyToBudget(dream.id, parsed);
    setIsEditingAmount(false);
  };

  return (
    <div
      className={`mt-3.5 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs ${className}`}
      data-testid={`goal-contribution-suggester-${dream.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
              Sugestão de Aporte Ideal
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span>{suggestion.jarShortName}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                suggestion.isCompleted
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : Math.abs(suggestion.deltaVsCurrentPlan) < 0.01
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : suggestion.deltaVsCurrentPlan > 0
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-indigo-600 dark:text-indigo-400 font-semibold'
              }
              data-testid={`suggester-delta-label-${dream.id}`}
            >
              {suggestion.deltaLabel}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-tight"
            data-testid={`suggester-required-amount-${dream.id}`}
          >
            {suggestion.isCompleted
              ? 'Meta Concluída'
              : `${formatBRL(suggestion.requiredMonthlyContribution)} / mês`}
          </div>
          {!suggestion.isCompleted && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
              Aporte Necessário
              {suggestion.yieldRatePct > 0
                ? ` (${suggestion.yieldRatePct.toFixed(2).replace('.', ',')}% a.m.)`
                : ''}
            </span>
          )}
        </div>
      </div>

      {/* 3 Key Metrics: Saldo Faltante, Prazo Restante, Comprometimento */}
      {!suggestion.isCompleted && (
        <>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                Saldo Faltante
              </span>
              <span
                className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-[11px] sm:text-xs"
                data-testid={`suggester-remaining-amount-${dream.id}`}
              >
                {formatBRL(suggestion.remainingAmount)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                Prazo Restante
              </span>
              <span
                className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-[11px] sm:text-xs"
                data-testid={`suggester-months-remaining-${dream.id}`}
              >
                {suggestion.monthsRemaining}{' '}
                {suggestion.monthsRemaining === 1 ? 'mês' : 'meses'}
                {!suggestion.hasTargetDate && (
                  <span className="text-[10px] font-normal text-slate-400"> (est.)</span>
                )}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">
                Planejado Atual
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums text-[11px] sm:text-xs">
                {formatBRL(suggestion.plannedMonthlyContribution)}/mês
              </span>
            </div>
          </div>

          {/* Gap Highlight when required !== planned */}
          {suggestion.needsAdjustment && (
            <div
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-[11px] font-semibold flex items-center gap-1.5"
              data-testid={`suggester-adjustment-gap-${dream.id}`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="tabular-nums">
                Ajuste sugerido: de {formatBRL(suggestion.plannedMonthlyContribution)} para{' '}
                <strong>{formatBRL(suggestion.requiredMonthlyContribution)}/mês</strong>
              </span>
            </div>
          )}

          {/* Budget Impact Preview + Action Button */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div
              className={`text-[11px] font-medium flex items-center gap-1.5 min-w-0 ${
                suggestion.isOverMonthlySurplus
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
              data-testid={`suggester-cashflow-impact-${dream.id}`}
            >
              <span className="tabular-nums leading-snug">
                Comprometimento da Sobra Mensal:{' '}
                <strong className="font-bold">{formattedCashFlowImpact}</strong>
              </span>
            </div>

            {!isEditingAmount ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {suggestion.isSyncedWithBudget ? (
                  <>
                    <span
                      data-testid={`btn-synced-budget-${dream.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Sincronizado no Orçamento ✓</span>
                    </span>
                    {!compact && (
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        data-testid={`btn-edit-synced-budget-${dream.id}`}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition cursor-pointer"
                        title="Editar valor sincronizado no orçamento"
                        aria-label={`Editar aporte orçamentário de ${dream.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onApplyToBudget(dream.id)}
                    data-testid={`btn-apply-to-budget-${dream.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[11px] shadow-xs transition cursor-pointer whitespace-nowrap"
                    title={`Atualizar meta e criar/atualizar recorrência mensal de ${formatBRL(suggestion.requiredMonthlyContribution)} em ${suggestion.jarName}`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Aplicar ao Orçamento</span>
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSaveCustomApply}
                className="flex items-center gap-1.5 shrink-0"
              >
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customAmountInput}
                  onChange={e => setCustomAmountInput(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Novo valor mensal recorrente"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                  title="Salvar e sincronizar no orçamento"
                  aria-label="Salvar aporte no orçamento"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAmount(false)}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer"
                  title="Cancelar edição"
                  aria-label="Cancelar edição"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};
