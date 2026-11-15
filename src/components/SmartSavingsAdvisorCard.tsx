import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  Circle,
  ArrowRight,
  Target,
  Clock,
  Scale,
  AlertCircle,
} from 'lucide-react';
import { JarType, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { resolveActiveSixJarsMonth } from '../utils/sixJarsMetrics';
import {
  AppliedSavingsStepsState,
  CachedSavingsAnalysis,
  extractSixJarsSavingsSnapshot,
  fetchSmartSavingsAnalysis,
  getCachedSavingsAnalysis,
  loadAppliedStepsState,
  saveAppliedStepsState,
} from '../services/geminiSavingsService';

export interface SmartSavingsAdvisorCardProps {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  jarLimits?: Partial<Record<JarType, number>>;
  onFilterJarInAgenda?: (jarId: JarType) => void;
  onOpenLimitsModal?: () => void;
  onCreateReductionGoal?: (
    jarId: JarType,
    suggestedMonthlySavingBRL: number,
    categoryPath: string
  ) => void;
}

function formatUpdatedTimestampPtBr(isoString: string): string {
  if (!isoString) return 'Agora mesmo';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Agora mesmo';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SmartSavingsAdvisorCard: React.FC<SmartSavingsAdvisorCardProps> = ({
  transactions,
  usePjProfitInPf,
  jarLimits,
  onFilterJarInAgenda,
  onOpenLimitsModal,
  onCreateReductionGoal,
}) => {
  const activeMonthKey = useMemo(
    () => resolveActiveSixJarsMonth(transactions),
    [transactions]
  );

  const snapshot = useMemo(
    () =>
      extractSixJarsSavingsSnapshot(transactions, {
        monthKey: activeMonthKey,
        usePjProfitInPf,
        jarLimits,
      }),
    [transactions, activeMonthKey, usePjProfitInPf, jarLimits]
  );

  const [analysis, setAnalysis] = useState<CachedSavingsAnalysis | null>(() =>
    getCachedSavingsAnalysis(snapshot.monthKey, snapshot.txCount)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appliedState, setAppliedState] = useState<AppliedSavingsStepsState>(() =>
    loadAppliedStepsState(snapshot.monthKey)
  );
  const [goalActionFeedback, setGoalActionFeedback] = useState<string | null>(null);

  const lastAutoTriggeredKeyRef = useRef<string>('');

  // Sync applied state when active month changes
  useEffect(() => {
    setAppliedState(loadAppliedStepsState(snapshot.monthKey));
  }, [snapshot.monthKey]);

  const runAnalysis = useCallback(
    async (forceRefresh: boolean) => {
      if (!forceRefresh) {
        const cached = getCachedSavingsAnalysis(snapshot.monthKey, snapshot.txCount);
        if (cached) {
          setAnalysis(cached);
          return;
        }
      }

      setIsLoading(true);
      try {
        const result = await fetchSmartSavingsAnalysis(snapshot, { forceRefresh });
        setAnalysis(result);
      } finally {
        setIsLoading(false);
      }
    },
    [snapshot]
  );

  // Trigger once per uncached (monthKey, txCount) pair; never spams on re-renders
  useEffect(() => {
    const key = `${snapshot.monthKey}_${snapshot.txCount}`;
    const cached = getCachedSavingsAnalysis(snapshot.monthKey, snapshot.txCount);
    if (cached) {
      setAnalysis(cached);
      lastAutoTriggeredKeyRef.current = key;
      return;
    }

    if (lastAutoTriggeredKeyRef.current === key) return;
    lastAutoTriggeredKeyRef.current = key;
    void runAnalysis(false);
  }, [snapshot.monthKey, snapshot.txCount, runAnalysis]);

  useEffect(() => {
    if (!goalActionFeedback) return;
    const timer = setTimeout(() => setGoalActionFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [goalActionFeedback]);

  const handleToggleStep = (stepId: string) => {
    setAppliedState(prev => {
      const exists = prev.completedStepIds.includes(stepId);
      const nextIds = exists
        ? prev.completedStepIds.filter(id => id !== stepId)
        : [...prev.completedStepIds, stepId];
      const next: AppliedSavingsStepsState = {
        completedStepIds: nextIds,
        isMainTipApplied:
          nextIds.length === (analysis?.plan.actionableSteps.length || 3)
            ? true
            : prev.isMainTipApplied && nextIds.length > 0,
        updatedAt: new Date().toISOString(),
      };
      saveAppliedStepsState(snapshot.monthKey, next);
      return next;
    });
  };

  const handleMarkTipApplied = () => {
    const allIds = analysis?.plan.actionableSteps.map(s => s.id) || ['step-1', 'step-2', 'step-3'];
    setAppliedState(prev => {
      const nextApplied = !prev.isMainTipApplied;
      const next: AppliedSavingsStepsState = {
        completedStepIds: nextApplied ? allIds : [],
        isMainTipApplied: nextApplied,
        updatedAt: new Date().toISOString(),
      };
      saveAppliedStepsState(snapshot.monthKey, next);
      return next;
    });
  };

  const handleCreateGoalOrRule = () => {
    if (!analysis) return;
    if (onCreateReductionGoal) {
      onCreateReductionGoal(
        snapshot.primaryOffenderJar.jarId,
        analysis.plan.estimatedMonthlySavingsBRL,
        analysis.plan.offenderCategoryPath
      );
      setGoalActionFeedback(
        `Meta de redução de ${formatBRL(analysis.plan.estimatedMonthlySavingsBRL)}/mês registrada no pote ${snapshot.primaryOffenderJar.shortName}!`
      );
      return;
    }
    if (onOpenLimitsModal) {
      onOpenLimitsModal();
    }
  };

  const completedCount = appliedState.completedStepIds.length;
  const totalSteps = analysis?.plan.actionableSteps.length || 3;

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg p-5 sm:p-6 space-y-5"
      data-testid="smart-savings-advisor-card"
      aria-labelledby="smart-savings-advisor-title"
    >
      {/* Subtle decorative radial glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Header Row */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-black uppercase tracking-wider text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Consultor de Economia IA - Gemini</span>
            </span>

            {analysis && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  analysis.source === 'gemini'
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                }`}
                data-testid="advisor-source-badge"
              >
                {analysis.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Diagnóstico Inteligente'}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] text-slate-300/80">
              <Clock className="w-3 h-3" />
              <span data-testid="advisor-updated-at">
                {analysis
                  ? `Atualizado em ${formatUpdatedTimestampPtBr(analysis.updatedAt)}`
                  : `Referência: ${snapshot.monthLabel}`}
              </span>
            </span>
          </div>

          <h3
            id="smart-savings-advisor-title"
            className="text-base sm:text-lg font-black tracking-tight text-white"
          >
            Plano Personalizado de Redução de Custos ({snapshot.monthLabel})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => void runAnalysis(true)}
          disabled={isLoading}
          data-testid="btn-refresh-ai-advisor"
          className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 disabled:opacity-60 border border-white/15 text-xs font-black text-white transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analisando...' : 'Gerar Nova Análise IA'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="relative space-y-4 py-2" data-testid="advisor-loading-skeleton">
          <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-200">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Analisando transações e limites dos 6 Potes com Gemini...</span>
          </div>
          <div className="h-6 w-3/4 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-14 w-full rounded-2xl bg-white/10 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="h-28 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white/10 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white/10 animate-pulse" />
          </div>
        </div>
      ) : analysis ? (
        <div className="relative space-y-5">
          {/* Headline + Potential Monthly Savings Pill */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 font-bold">
                  <AlertCircle className="w-3 h-3" />
                  Foco: {analysis.plan.offenderCategoryPath}
                </span>
                {appliedState.isMainTipApplied && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 font-black"
                    data-testid="advisor-applied-badge"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Dica Aplicada
                  </span>
                )}
              </div>

              <h4
                className="text-lg sm:text-xl font-black text-white leading-snug"
                data-testid="advisor-headline"
              >
                {analysis.plan.headline}
              </h4>
            </div>

            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 shrink-0 self-start lg:self-center"
              data-testid="advisor-savings-pill"
            >
              <TrendingDown className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="text-xs sm:text-sm font-black tabular-nums whitespace-nowrap">
                Economia Potencial: {formatBRL(analysis.plan.estimatedMonthlySavingsBRL)} / mês
              </span>
            </div>
          </div>

          {/* Diagnosis & Top Offending Subcategories Snapshot */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <p
              className="text-xs sm:text-sm text-slate-200 leading-relaxed"
              data-testid="advisor-diagnosis"
            >
              {analysis.plan.diagnosis}
            </p>

            {snapshot.topSubcategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Maiores ofensores em {snapshot.primaryOffenderJar.shortName}:
                </span>
                {snapshot.topSubcategories.map(sub => (
                  <span
                    key={sub.categoryPath}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-200 tabular-nums"
                  >
                    <span>{sub.categoryPath}:</span>
                    <strong className="text-white">{formatBRL(sub.totalBRL)}</strong>
                    <span className="text-slate-400">
                      ({sub.txCount}x • {sub.nature})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3 Interactive Actionable Micro-Step Cards */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-200/90">
              <span>Plano de Ação Prático (3 Micro-Ações)</span>
              <span className="tabular-nums whitespace-nowrap">
                {completedCount} de {totalSteps} concluídas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysis.plan.actionableSteps.map((step, index) => {
                const isDone = appliedState.completedStepIds.includes(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleToggleStep(step.id)}
                    data-testid={`advisor-step-${index}`}
                    aria-pressed={isDone}
                    className={`text-left p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isDone
                        ? 'bg-emerald-500/15 border-emerald-400/50 ring-1 ring-emerald-400/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-400/40'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                          Ação {index + 1}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>

                      <h5
                        className={`text-xs sm:text-sm font-black leading-snug ${
                          isDone ? 'line-through text-emerald-200' : 'text-white'
                        }`}
                      >
                        {step.title}
                      </h5>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
                      <span className="text-slate-400 font-semibold">Economia est.</span>
                      <span className="font-black text-emerald-300">
                        +{formatBRL(step.potentialSavingBRL)}/mês
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rebalance / Liberdade Financeira Suggestion */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-400/25 flex items-start gap-2.5 text-xs">
            <Scale className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-indigo-200 uppercase text-[10px] tracking-wider block">
                Compensação & Reequilíbrio dos Potes
              </span>
              <p className="text-slate-200 mt-0.5 leading-relaxed" data-testid="advisor-rebalance">
                {analysis.plan.rebalanceSuggestion}
              </p>
            </div>
          </div>

          {/* Action Feedback Toast */}
          {goalActionFeedback && (
            <div
              className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-200 flex items-center gap-2"
              data-testid="advisor-goal-feedback"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{goalActionFeedback}</span>
            </div>
          )}

          {/* Footer Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMarkTipApplied}
                data-testid="btn-mark-tip-applied"
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  appliedState.isMainTipApplied
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {appliedState.isMainTipApplied
                    ? 'Dica Aplicada ✓'
                    : 'Marcar Dica como Aplicada'}
                </span>
              </button>

              {(onCreateReductionGoal || onOpenLimitsModal) && (
                <button
                  type="button"
                  onClick={handleCreateGoalOrRule}
                  data-testid="btn-create-reduction-goal"
                  className="px-3.5 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/50"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Criar Meta de Redução / Regra</span>
                </button>
              )}
            </div>

            {onFilterJarInAgenda && (
              <button
                type="button"
                onClick={() => onFilterJarInAgenda(snapshot.primaryOffenderJar.jarId)}
                data-testid="btn-filter-offender-agenda"
                className="px-3 py-2 rounded-2xl text-xs font-bold text-indigo-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Ver gastos de {snapshot.primaryOffenderJar.shortName}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
