import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  PlusCircle,
  Target,
  Wand2,
} from 'lucide-react';
import { DreamGoal } from '../types';
import { formatBRL } from '../utils/finance';
import { DREAM_MILESTONE_THRESHOLDS } from '../utils/dreamMilestones';
import { MonthlyGoalProgressResult } from '../utils/monthlyGoalProgress';

interface MonthlyContributionTargetTrackerProps {
  dream: DreamGoal;
  progress: MonthlyGoalProgressResult;
  onUpdateTarget: (dreamId: string, monthlyTargetBRL: number, preferredDepositDay: number) => void;
  onCompleteMonthlyGoal: (dream: DreamGoal, shortfallBRL: number) => void;
  onRegisterContribution: (dream: DreamGoal) => void;
  isMounted?: boolean;
  isPulsing?: boolean;
}

export const MonthlyContributionTargetTracker: React.FC<MonthlyContributionTargetTrackerProps> = ({
  dream,
  progress,
  onUpdateTarget,
  onCompleteMonthlyGoal,
  onRegisterContribution,
  isMounted = true,
  isPulsing = false,
}) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(progress.monthlyTargetBRL || ''));
  const cancelNextBlurRef = useRef(false);

  useEffect(() => {
    if (!isEditingTarget) {
      setTargetInput(progress.monthlyTargetBRL > 0 ? String(progress.monthlyTargetBRL) : '');
    }
  }, [progress.monthlyTargetBRL, isEditingTarget]);

  const commitTargetEdit = () => {
    if (cancelNextBlurRef.current) {
      cancelNextBlurRef.current = false;
      return;
    }
    const normalized = targetInput.trim().replace(',', '.');
    const parsedTarget = parseFloat(normalized);
    if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
      const rounded = Math.round(parsedTarget * 100) / 100;
      if (Math.abs(rounded - progress.monthlyTargetBRL) >= 0.01) {
        onUpdateTarget(dream.id, rounded, progress.preferredDepositDay);
      }
    } else {
      setTargetInput(progress.monthlyTargetBRL > 0 ? String(progress.monthlyTargetBRL) : '');
    }
    setIsEditingTarget(false);
  };

  const handleTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTargetEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelNextBlurRef.current = true;
      setTargetInput(progress.monthlyTargetBRL > 0 ? String(progress.monthlyTargetBRL) : '');
      setIsEditingTarget(false);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = parseInt(e.target.value, 10);
    if (Number.isFinite(day)) {
      onUpdateTarget(dream.id, progress.monthlyTargetBRL, Math.min(28, Math.max(1, day)));
    }
  };

  const handleUseSuggested = () => {
    if (progress.suggestedIdealMonthlyBRL <= 0) return;
    onUpdateTarget(dream.id, progress.suggestedIdealMonthlyBRL, progress.preferredDepositDay);
  };

  const containerTheme =
    progress.ritmoTier === 'emerald'
      ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/60'
      : progress.ritmoTier === 'rose'
      ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/70'
      : 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/70';

  const ritmoBadgeClass =
    progress.ritmoTier === 'emerald'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
      : progress.ritmoTier === 'rose'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';

  const barFillClass =
    progress.ritmoTier === 'emerald'
      ? 'bg-emerald-500'
      : progress.ritmoTier === 'rose'
      ? 'bg-rose-500'
      : 'bg-amber-500';

  const barGlowClass =
    progress.ritmoTier === 'emerald'
      ? 'group-hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]'
      : progress.ritmoTier === 'rose'
      ? 'group-hover:shadow-[0_0_12px_rgba(244,63,94,0.45)]'
      : 'group-hover:shadow-[0_0_12px_rgba(245,158,11,0.45)]';

  const pctPillClass =
    progress.ritmoTier === 'emerald'
      ? 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
      : progress.ritmoTier === 'rose'
      ? 'bg-rose-100/90 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
      : 'bg-amber-100/90 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';

  const showUseSuggestedBtn =
    progress.remainingBalance > 0 &&
    progress.suggestedIdealMonthlyBRL > 0 &&
    Math.abs(progress.monthlyTargetBRL - progress.suggestedIdealMonthlyBRL) >= 0.01;

  const monthsUnit = progress.remainingMonths === 1 ? 'mês' : 'meses';

  return (
    <div
      className={`p-3 rounded-2xl border space-y-2.5 text-xs transition-colors ${containerTheme}`}
      data-testid={`monthly-target-tracker-${dream.id}`}
      data-pacing-status={progress.status}
      data-ritmo-tier={progress.ritmoTier}
    >
      {/* Badge Semântico de Ritmo de Aporte + Dia Preferencial */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ritmo de Aporte:
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full border inline-flex items-center gap-1 tabular-nums ${ritmoBadgeClass}`}
            data-testid={`ritmo-aporte-badge-${dream.id}`}
          >
            {progress.ritmoTier === 'emerald' ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" />
            ) : progress.ritmoTier === 'amber' ? (
              <Clock className="w-3 h-3 shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 shrink-0" />
            )}
            <span>
              {progress.ritmoBadgeLabel}
              {progress.ritmoTier === 'rose' && progress.ritmoBadgeDetail
                ? ` • ${progress.ritmoBadgeDetail}`
                : ''}
            </span>
          </span>
        </div>

        <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 px-1.5 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700/70">
          <span>Dia</span>
          <select
            value={progress.preferredDepositDay}
            onChange={handleDayChange}
            aria-label={`Dia preferencial de aporte para ${dream.title}`}
            data-testid={`select-deposit-day-${dream.id}`}
            className="bg-transparent font-black text-slate-800 dark:text-slate-100 tabular-nums cursor-pointer focus:outline-none"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day} className="bg-white dark:bg-slate-900">
                {String(day).padStart(2, '0')}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Campo Editável: Meta de Aporte Mensal */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white/75 dark:bg-slate-900/60 px-2.5 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-200">
            Meta de Aporte Mensal:
          </span>
        </div>

        {isEditingTarget ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">R$</span>
            <input
              type="number"
              step="0.01"
              min="1"
              autoFocus
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
              onBlur={commitTargetEdit}
              onKeyDown={handleTargetKeyDown}
              aria-label={`Meta de Aporte Mensal de ${dream.title}`}
              data-testid={`input-monthly-target-${dream.id}`}
              className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-400 dark:border-indigo-500 text-xs font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={commitTargetEdit}
              data-testid={`btn-save-monthly-target-${dream.id}`}
              aria-label={`Salvar meta mensal de ${dream.title}`}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-2xs"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="font-black text-slate-900 dark:text-white tabular-nums text-xs"
              data-testid={`monthly-target-values-${dream.id}`}
            >
              {formatBRL(progress.monthlyTargetBRL)}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingTarget(true)}
              data-testid={`btn-edit-monthly-target-${dream.id}`}
              aria-label={`Editar Meta de Aporte Mensal de ${dream.title}`}
              title="Editar Meta de Aporte Mensal"
              className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Pílula de Sugestão Ideal para o Prazo + Micro-botão 1-Clique */}
      {progress.remainingBalance > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-[11px]"
          data-testid={`ideal-suggestion-pill-${dream.id}`}
        >
          <div className="space-y-0.5 min-w-0">
            <p className="text-slate-700 dark:text-slate-200 leading-snug">
              Ideal p/ o prazo:{' '}
              <strong className="font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                {formatBRL(progress.suggestedIdealMonthlyBRL)}/mês
              </strong>{' '}
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                (Faltam {formatBRL(progress.remainingBalance)} em {progress.remainingMonths}{' '}
                {monthsUnit})
              </span>
            </p>
            {progress.isTargetBelowIdeal && (
              <p
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 tabular-nums"
                data-testid={`target-below-ideal-warning-${dream.id}`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  Meta atual está {formatBRL(Math.abs(progress.targetVsSuggestedGap))}/mês abaixo do
                  necessário para o prazo.
                </span>
              </p>
            )}
          </div>

          {showUseSuggestedBtn && (
            <button
              type="button"
              onClick={handleUseSuggested}
              data-testid={`btn-use-suggested-target-${dream.id}`}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
              title="Definir Meta de Aporte Mensal igual ao valor ideal para o prazo"
            >
              <Wand2 className="w-3 h-3 shrink-0" />
              <span>Usar valor sugerido</span>
            </button>
          )}
        </div>
      )}

      {/* Mini Barra de Progresso do Mês + Ação "+ Registrar Aporte" */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span
            className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums"
            data-testid={`monthly-deposited-summary-${dream.id}`}
          >
            Aportado neste mês:{' '}
            <strong className="font-black text-slate-900 dark:text-white">
              {formatBRL(progress.currentMonthDepositedBRL)}
            </strong>{' '}
            de{' '}
            <strong className="font-bold text-slate-800 dark:text-slate-100">
              {formatBRL(progress.monthlyTargetBRL)}
            </strong>{' '}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-black text-[10px] tabular-nums transition-transform duration-200 group-hover:scale-105 group-hover:font-bold ${pctPillClass}`}
              data-testid={`monthly-target-pct-${dream.id}`}
            >
              {progress.monthlyCompletionPct.toFixed(0)}%
            </span>
          </span>

          <button
            type="button"
            onClick={() => onRegisterContribution(dream)}
            data-testid={`btn-register-contribution-${dream.id}`}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-bold text-[10px] transition cursor-pointer shrink-0"
          >
            + Registrar Aporte
          </button>
        </div>

        <div className="relative w-full h-2 group-hover:h-2.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-700/80 transition-all duration-300">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden group-hover:brightness-110 ${barFillClass} ${barGlowClass} ${
              isPulsing ? 'brightness-125' : ''
            }`}
            style={{ width: isMounted ? `${progress.clampedCompletionPct}%` : '0%' }}
            data-testid={`monthly-target-bar-${dream.id}`}
          >
            <span
              aria-hidden="true"
              className={`goal-progress-shimmer ${
                progress.clampedCompletionPct >= 100 ? 'goal-progress-shimmer-active' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Marcos de Progresso Mensal (50% / 75% / 100%) */}
      <div
        className="flex items-center justify-between gap-1 pt-0.5"
        data-testid={`dream-monthly-milestone-strip-${dream.id}`}
      >
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Marcos do mês:
        </span>
        <div className="flex items-center gap-1">
          {DREAM_MILESTONE_THRESHOLDS.map(level => {
            const reached = progress.monthlyCompletionPct >= level;
            const pillColor =
              level === 100
                ? 'bg-emerald-600 text-white border-emerald-600'
                : level === 75
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-sky-600 text-white border-sky-600';
            return (
              <span
                key={level}
                data-testid={`card-milestone-pill-${dream.id}-${level}`}
                data-reached={reached ? 'true' : 'false'}
                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border transition tabular-nums ${
                  reached
                    ? pillColor
                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                {level}%{reached ? ' ✓' : ''}
              </span>
            );
          })}
        </div>
      </div>

      {/* Alerta Inline + Botão 1-Clique "+ Completar Aporte do Mês" */}
      {progress.requiresAttention && progress.shortfallBRL > 0 && (
        <div
          className={`mt-1 p-2.5 rounded-xl border space-y-2 ${
            progress.ritmoTier === 'rose'
              ? 'bg-rose-100/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              : 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
          }`}
          data-testid={`monthly-alert-box-${dream.id}`}
        >
          <div className="flex items-start gap-2 text-[11px] leading-snug">
            {progress.ritmoTier === 'rose' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <span>
              Abaixo do planejado: faltam{' '}
              <strong className="font-black tabular-nums">{formatBRL(progress.shortfallBRL)}</strong>{' '}
              para cumprir a meta deste mês.
            </span>
          </div>

          <button
            type="button"
            onClick={() => onCompleteMonthlyGoal(dream, progress.shortfallBRL)}
            data-testid={`btn-complete-monthly-goal-${dream.id}`}
            className={`w-full py-1.5 px-3 rounded-xl font-black text-[11px] text-white shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 tabular-nums ${
              progress.ritmoTier === 'rose'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>+ Completar Aporte do Mês ({formatBRL(progress.shortfallBRL)})</span>
          </button>
        </div>
      )}
    </div>
  );
};
