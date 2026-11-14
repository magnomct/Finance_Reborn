import React, { useEffect, useMemo, useState } from 'react';
import {
  Wand2,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  TrendingUp,
  RotateCcw,
  Wallet,
  Scale,
  Clock,
} from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  AutoFillAllocationMode,
  DEFAULT_COMPOUND_YIELD_MONTHLY_PCT,
  calculateSmartAutoFill,
  estimateMonthlyFreeCashFlow,
  estimateMonthsWithYield,
  formatProjectedCompletion,
  round2,
} from '../utils/smartGoalAutoFill';

export interface SmartGoalAutoFillApplyPayload {
  updates: {
    dreamId: string;
    monthlyDeposit: number;
    yieldRateMonthlyPct?: number;
  }[];
  mode: AutoFillAllocationMode;
  useCompoundYield: boolean;
  totalAppliedMonthly: number;
}

interface SmartGoalAutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dreams: DreamGoal[];
  transactions: Transaction[];
  onApply: (payload: SmartGoalAutoFillApplyPayload) => void;
  initialFocusDreamId?: string | null;
}

export const SmartGoalAutoFillModal: React.FC<SmartGoalAutoFillModalProps> = ({
  isOpen,
  onClose,
  dreams,
  transactions,
  onApply,
  initialFocusDreamId,
}) => {
  const cashFlowEstimate = useMemo(
    () => estimateMonthlyFreeCashFlow(transactions, true),
    [transactions]
  );

  const [mode, setMode] = useState<AutoFillAllocationMode>('rigid_deadline');
  const [useCompoundYield, setUseCompoundYield] = useState<boolean>(false);
  const [budgetInput, setBudgetInput] = useState<string>(() =>
    cashFlowEstimate.estimatedSurplus > 0 ? String(cashFlowEstimate.estimatedSurplus) : '0'
  );
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});

  // Sync defaults cleanly whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setBudgetInput(
      cashFlowEstimate.estimatedSurplus > 0 ? String(cashFlowEstimate.estimatedSurplus) : '0'
    );
    const initialSelected: Record<string, boolean> = {};
    dreams.forEach(d => {
      if (d.target > d.current) {
        initialSelected[d.id] = true;
      }
    });
    setSelectedIds(initialSelected);
    setManualOverrides({});
  }, [isOpen, dreams, cashFlowEstimate.estimatedSurplus]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parsedBudget = useMemo(() => {
    const val = parseFloat(budgetInput.replace(',', '.'));
    return Number.isFinite(val) && val >= 0 ? round2(val) : 0;
  }, [budgetInput]);

  const activeYieldPct = useCompoundYield ? DEFAULT_COMPOUND_YIELD_MONTHLY_PCT : 0;

  const autoFillResult = useMemo(
    () =>
      calculateSmartAutoFill({
        dreams,
        availableSurplus: parsedBudget,
        mode,
        yieldRateMonthlyPct: activeYieldPct,
      }),
    [dreams, parsedBudget, mode, activeYieldPct]
  );

  const effectiveItems = useMemo(() => {
    return autoFillResult.items.map(item => {
      const isSelected = selectedIds[item.dreamId] ?? true;
      const hasOverride = Object.prototype.hasOwnProperty.call(manualOverrides, item.dreamId);
      const effectiveAmount = hasOverride
        ? Math.max(0, round2(manualOverrides[item.dreamId]))
        : item.suggestedMonthlyContribution;

      const projMonths = hasOverride
        ? estimateMonthsWithYield(
            item.currentAmount,
            item.targetAmount,
            effectiveAmount,
            item.yieldRateMonthlyPct
          )
        : item.projectedMonths;

      const formattedProj = hasOverride
        ? formatProjectedCompletion(projMonths)
        : {
            projectedCompletionLabel: item.projectedCompletionLabel,
            projectedCompletionShortLabel: item.projectedCompletionShortLabel,
          };

      const extensionMonths = Number.isFinite(projMonths)
        ? Math.max(0, projMonths - item.remainingMonths)
        : 999;

      return {
        ...item,
        isSelected,
        hasOverride,
        effectiveAmount,
        effectiveProjectedMonths: projMonths,
        effectiveProjectedLabel: formattedProj.projectedCompletionLabel,
        effectiveProjectedShortLabel: formattedProj.projectedCompletionShortLabel,
        effectiveExtensionMonths: extensionMonths,
      };
    });
  }, [autoFillResult.items, selectedIds, manualOverrides]);

  const selectedItems = useMemo(
    () => effectiveItems.filter(i => i.isSelected),
    [effectiveItems]
  );

  const selectedTotalMonthly = useMemo(
    () => round2(selectedItems.reduce((acc, item) => acc + item.effectiveAmount, 0)),
    [selectedItems]
  );

  const effectiveOverBudget = selectedTotalMonthly > parsedBudget + 0.01;
  const effectiveAdjustedForBudget =
    !effectiveOverBudget &&
    mode === 'fit_budget' &&
    autoFillResult.totalIdealMonthly > parsedBudget + 0.01;
  const effectiveDeficit = round2(Math.max(0, selectedTotalMonthly - parsedBudget));
  const effectiveRemaining = round2(Math.max(0, parsedBudget - selectedTotalMonthly));

  const handleModeChange = (nextMode: AutoFillAllocationMode) => {
    setMode(nextMode);
    setManualOverrides({});
  };

  const handleYieldToggle = () => {
    setUseCompoundYield(prev => !prev);
    setManualOverrides({});
  };

  const handleBudgetInputChange = (value: string) => {
    setBudgetInput(value);
    setManualOverrides({});
  };

  const handleToggleAll = (selectAll: boolean) => {
    const next: Record<string, boolean> = {};
    effectiveItems.forEach(item => {
      next[item.dreamId] = selectAll;
    });
    setSelectedIds(next);
  };

  const handleApplyBatch = () => {
    if (selectedItems.length === 0) return;
    onApply({
      updates: selectedItems.map(item => ({
        dreamId: item.dreamId,
        monthlyDeposit: item.effectiveAmount,
        yieldRateMonthlyPct: useCompoundYield ? DEFAULT_COMPOUND_YIELD_MONTHLY_PCT : undefined,
      })),
      mode,
      useCompoundYield,
      totalAppliedMonthly: selectedTotalMonthly,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="smart-autofill-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-autofill-title"
        data-testid="smart-autofill-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="smart-autofill-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight"
              >
                Autopreenchimento Inteligente de Aportes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calcula o aporte mensal ideal de cada pote pelo saldo restante, prazo final e viabilidade no seu caixa mensal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar autopreenchimento inteligente"
            data-testid="btn-close-smart-autofill"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-5">
          {/* Top Summary Bento Strip */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            data-testid="autofill-summary-bar"
          >
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total de Potes Ativos
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-xl font-black text-slate-900 dark:text-white tabular-nums"
                  data-testid="autofill-active-jars-count"
                >
                  {autoFillResult.activeJarsCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {autoFillResult.activeJarsCount === 1 ? 'pote em andamento' : 'potes em andamento'}
                </span>
              </div>
              {autoFillResult.completedJarsCount > 0 && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                  +{autoFillResult.completedJarsCount} já concluído(s)
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Soma dos Aportes Sugeridos
              </span>
              <div
                className="mt-1 text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums"
                data-testid="autofill-total-suggested"
              >
                {formatBRL(selectedTotalMonthly)}
                <span className="text-xs font-bold text-slate-400 ml-0.5">/mês</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block tabular-nums">
                Ideal 100% prazo: {formatBRL(autoFillResult.totalIdealMonthly)}/mês
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
              <div className="flex items-center justify-between gap-1">
                <label
                  htmlFor="input-autofill-budget"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Orçamento Mensal p/ Metas (R$)
                </label>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    id="input-autofill-budget"
                    data-testid="input-autofill-budget"
                    type="number"
                    min="0"
                    step="50"
                    value={budgetInput}
                    onChange={e => handleBudgetInputChange(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleBudgetInputChange(String(cashFlowEstimate.estimatedSurplus))}
                  title={`Usar sobra mensal estimada do fluxo PF/PJ (${formatBRL(cashFlowEstimate.estimatedSurplus)})`}
                  data-testid="btn-reset-surplus"
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block tabular-nums">
                Sobra estimada do fluxo: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(cashFlowEstimate.estimatedSurplus)}</strong>
              </span>
            </div>

            {/* Budget Health Status Card */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                effectiveOverBudget
                  ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70'
                  : effectiveAdjustedForBudget
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70'
              }`}
              data-testid="autofill-health-card"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Viabilidade de Caixa
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {effectiveOverBudget ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span
                      className="text-sm font-black text-rose-800 dark:text-rose-200"
                      data-testid="autofill-health-badge"
                    >
                      Acima da Sobra Mensal
                    </span>
                  </>
                ) : effectiveAdjustedForBudget ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span
                      className="text-sm font-black text-amber-800 dark:text-amber-200"
                      data-testid="autofill-health-badge"
                    >
                      Ajustado ao Orçamento
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span
                      className="text-sm font-black text-emerald-800 dark:text-emerald-200"
                      data-testid="autofill-health-badge"
                    >
                      Cabe no Orçamento
                    </span>
                  </>
                )}
              </div>
              <p
                className={`text-[11px] font-bold mt-1 tabular-nums ${
                  effectiveOverBudget
                    ? 'text-rose-700 dark:text-rose-300'
                    : effectiveAdjustedForBudget
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
                data-testid="autofill-health-detail"
              >
                {effectiveOverBudget
                  ? `Faltam ${formatBRL(effectiveDeficit)}/mês no orçamento`
                  : effectiveAdjustedForBudget
                  ? `Limitado a ${formatBRL(parsedBudget)}/mês • Prazos estendidos`
                  : `Folga de ${formatBRL(effectiveRemaining)}/mês disponíveis`}
              </p>
            </div>
          </div>

          {/* Allocation Mode Switcher & Compound Yield Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-500" />
                Modo de Alocação:
              </span>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 max-w-2xl"
                role="radiogroup"
                aria-label="Modo de alocação de aportes"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'rigid_deadline'}
                  onClick={() => handleModeChange('rigid_deadline')}
                  data-testid="btn-mode-rigid"
                  className={`px-3 py-2 rounded-xl text-left border transition cursor-pointer ${
                    mode === 'rigid_deadline'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between gap-1">
                    <span>Prazo Rígido (100% da Meta)</span>
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      mode === 'rigid_deadline' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Valor exato para bater cada data limite
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'fit_budget'}
                  onClick={() => handleModeChange('fit_budget')}
                  data-testid="btn-mode-fit-budget"
                  className={`px-3 py-2 rounded-xl text-left border transition cursor-pointer ${
                    mode === 'fit_budget'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between gap-1">
                    <span>Caber no Bolso (Por Urgência)</span>
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      mode === 'fit_budget' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Limita à sobra mensal e recalcula previsões
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCompoundYield}
                  onChange={handleYieldToggle}
                  data-testid="checkbox-compound-yield"
                  className="w-4 h-4 rounded-sm accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Considerar rendimento (0,85% a.m.)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Empty State if all goals completed */}
          {effectiveItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Todos os seus sonhos já atingiram 100% da meta!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre um novo sonho para calcular sugestões automáticas de aporte.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* List Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Comparativo por Pote ({selectedItems.length} de {effectiveItems.length} selecionados)
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="font-bold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {/* Jar-by-Jar Comparison Rows */}
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {effectiveItems.map(item => {
                  const pct =
                    item.targetAmount > 0
                      ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
                      : 0;
                  const sliderMax = Math.max(
                    100,
                    Math.ceil(Math.max(item.idealMonthlyContribution * 1.4, item.effectiveAmount * 1.2, item.currentMonthlyDeposit * 1.2) / 50) * 50
                  );
                  const isFocused = initialFocusDreamId === item.dreamId;
                  const delta = round2(item.effectiveAmount - item.currentMonthlyDeposit);

                  return (
                    <li
                      key={item.dreamId}
                      data-testid={`autofill-row-${item.dreamId}`}
                      className={`p-4 transition ${
                        !item.isSelected
                          ? 'opacity-55 bg-slate-50/70 dark:bg-slate-950/40'
                          : isFocused
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Checkbox + Jar Metadata + Progress */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={e =>
                              setSelectedIds(prev => ({
                                ...prev,
                                [item.dreamId]: e.target.checked,
                              }))
                            }
                            aria-label={`Incluir ${item.title} no autopreenchimento`}
                            data-testid={`checkbox-autofill-jar-${item.dreamId}`}
                            className="mt-1 w-4 h-4 rounded-sm accent-indigo-600 cursor-pointer shrink-0"
                          />

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                                {item.title}
                              </span>
                              {item.yieldRateMonthlyPct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md tabular-nums">
                                  +{item.yieldRateMonthlyPct.toFixed(2).replace('.', ',')}% a.m.
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  item.priority === 'alta'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                                    : item.priority === 'baixa'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                                }`}
                              >
                                Prioridade {item.priority === 'alta' ? 'Alta' : item.priority === 'baixa' ? 'Baixa' : 'Média'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-indigo-500" />
                                {item.hasTargetDate
                                  ? item.isPastDue
                                    ? 'Prazo expirado (urgente)'
                                    : `Faltam ${item.remainingMonths} ${item.remainingMonths === 1 ? 'mês' : 'meses'}`
                                  : 'Sem prazo (base 12 meses)'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums flex-wrap">
                              <span>
                                Saldo: <strong className="text-slate-900 dark:text-white">{formatBRL(item.currentAmount)}</strong> de {formatBRL(item.targetAmount)} ({pct}%)
                              </span>
                              <span className="text-slate-400">•</span>
                              <span>
                                Falta acumular: <strong className="text-indigo-600 dark:text-indigo-400">{formatBRL(item.remainingGap)}</strong>
                              </span>
                            </div>

                            <div className="w-full max-w-md h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(2, pct)}%` }}
                              />
                            </div>

                            {/* Projected Completion Callout */}
                            <div className="flex items-center gap-2 text-[11px] flex-wrap pt-0.5">
                              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                Conclusão prevista:{' '}
                                <strong
                                  className={
                                    item.effectiveExtensionMonths > 0 && item.hasTargetDate
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }
                                  data-testid={`autofill-projected-${item.dreamId}`}
                                >
                                  {item.effectiveProjectedLabel}
                                </strong>
                              </span>
                              {item.hasTargetDate && item.effectiveExtensionMonths > 0 && Number.isFinite(item.effectiveProjectedMonths) && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                                  +{item.effectiveExtensionMonths} {item.effectiveExtensionMonths === 1 ? 'mês' : 'meses'} além do prazo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Current vs Suggested Editable Input & Slider */}
                        <div className="lg:w-72 shrink-0 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            <span>
                              Atual: <strong className="text-slate-700 dark:text-slate-200">{formatBRL(item.currentMonthlyDeposit)}</strong>
                            </span>
                            <span
                              className={`font-bold ${
                                delta > 0
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : delta < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {delta > 0 ? `+${formatBRL(delta)}` : delta < 0 ? formatBRL(delta) : 'Sem alteração'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                R$
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                disabled={!item.isSelected}
                                value={item.effectiveAmount}
                                onChange={e => {
                                  const nextVal = parseFloat(e.target.value);
                                  setManualOverrides(prev => ({
                                    ...prev,
                                    [item.dreamId]: Number.isFinite(nextVal) && nextVal >= 0 ? round2(nextVal) : 0,
                                  }));
                                }}
                                aria-label={`Aporte sugerido para ${item.title}`}
                                data-testid={`input-autofill-amount-${item.dreamId}`}
                                className="w-full pl-8 pr-10 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                /mês
                              </span>
                            </div>

                            {item.hasOverride && (
                              <button
                                type="button"
                                onClick={() =>
                                  setManualOverrides(prev => {
                                    const copy = { ...prev };
                                    delete copy[item.dreamId];
                                    return copy;
                                  })
                                }
                                title="Restaurar sugestão automática"
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={sliderMax}
                            step="10"
                            disabled={!item.isSelected}
                            value={Math.min(sliderMax, item.effectiveAmount)}
                            onChange={e => {
                              const nextVal = parseFloat(e.target.value);
                              setManualOverrides(prev => ({
                                ...prev,
                                [item.dreamId]: Number.isFinite(nextVal) ? round2(nextVal) : 0,
                              }));
                            }}
                            aria-label={`Ajuste rápido do aporte mensal de ${item.title}`}
                            className="w-full accent-indigo-600 cursor-pointer disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            <Wallet className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>{selectedItems.length}</strong> {selectedItems.length === 1 ? 'pote selecionado' : 'potes selecionados'} • Total:{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{formatBRL(selectedTotalMonthly)}/mês</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              disabled={selectedItems.length === 0}
              data-testid="btn-apply-smart-autofill"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aplicar Aportes Sugeridos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
