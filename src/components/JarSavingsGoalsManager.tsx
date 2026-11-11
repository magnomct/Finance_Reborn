import React, { useState, useMemo } from 'react';
import { 
  Target, PiggyBank, Edit3, Check, X, Sparkles, TrendingUp, 
  CheckCircle2, AlertTriangle, Layers, Home, Wallet, BookOpen, 
  Smile, Plane, HelpCircle, Info, ChevronRight, Sliders
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { formatBRL, formatNumber } from '../utils/finance';
import { 
  calculateJarSavingsGoalsSummary, 
  suggestJarSavingsTargets, 
  JarSavingsGoalsSummary,
  JarSavingsGoalItem,
  MAIN_6_JARS 
} from '../utils/jarSavingsGoals';
import { DEFAULT_JAR_SAVINGS_TARGETS, saveJarSavingsTargets } from '../utils/budgetAlerts';

interface JarSavingsGoalsManagerProps {
  transactions: Transaction[];
  effectiveIncomeBase: number;
  jarLimits?: Record<JarType, number>;
  jarSavingsTargets?: Record<JarType, number>;
  onSaveSavingsTargets?: (targets: Record<JarType, number>) => void;
  themeCardClass?: string;
  onFilterJarInAgenda?: (jar: JarType) => void;
}

export const JarSavingsGoalsManager: React.FC<JarSavingsGoalsManagerProps> = ({
  transactions,
  effectiveIncomeBase,
  jarLimits,
  jarSavingsTargets = DEFAULT_JAR_SAVINGS_TARGETS,
  onSaveSavingsTargets,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onFilterJarInAgenda
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTargets, setEditedTargets] = useState<Record<JarType, number>>(() => ({
    ...DEFAULT_JAR_SAVINGS_TARGETS,
    ...jarSavingsTargets
  }));
  const [saveSuccessNotification, setSaveSuccessNotification] = useState(false);

  // Compute live calculations
  const activeTargets = isEditing ? editedTargets : (jarSavingsTargets || DEFAULT_JAR_SAVINGS_TARGETS);

  const summary: JarSavingsGoalsSummary = useMemo(() => {
    return calculateJarSavingsGoalsSummary({
      transactions,
      limits: jarLimits,
      targets: activeTargets,
      effectiveIncomeBase
    });
  }, [transactions, jarLimits, activeTargets, effectiveIncomeBase]);

  const handleStartEdit = () => {
    setEditedTargets({
      ...DEFAULT_JAR_SAVINGS_TARGETS,
      ...jarSavingsTargets
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTargets({
      ...DEFAULT_JAR_SAVINGS_TARGETS,
      ...jarSavingsTargets
    });
    setIsEditing(false);
  };

  const handleTargetChange = (jarId: JarType, val: number) => {
    setEditedTargets(prev => ({
      ...prev,
      [jarId]: Math.max(0, val)
    }));
  };

  const handleQuickAdjust = (jarId: JarType, delta: number) => {
    setEditedTargets(prev => {
      const current = prev[jarId] || 0;
      return {
        ...prev,
        [jarId]: Math.max(0, current + delta)
      };
    });
  };

  const handleApplySuggestions = () => {
    const suggested = suggestJarSavingsTargets(effectiveIncomeBase);
    setEditedTargets(suggested);
  };

  const handleSave = () => {
    if (onSaveSavingsTargets) {
      onSaveSavingsTargets(editedTargets);
    } else {
      saveJarSavingsTargets(editedTargets);
    }
    setIsEditing(false);
    setSaveSuccessNotification(true);
    setTimeout(() => setSaveSuccessNotification(false), 3000);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Home': return Home;
      case 'Wallet': return Wallet;
      case 'PiggyBank': return PiggyBank;
      case 'BookOpen': return BookOpen;
      case 'Smile': return Smile;
      case 'Plane': return Plane;
      default: return PiggyBank;
    }
  };

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-6 shadow-sm relative overflow-hidden`}
      data-testid="jar-savings-goals-manager"
    >
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-gradient-to-bl from-indigo-500/10 via-emerald-500/5 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Metas de Economia dos 6 Potes
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Poupança Mensal
              </span>
              {saveSuccessNotification && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-in fade-in">
                  Metas salvas com sucesso! ✅
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina metas específicas para cada pote e visualize o percentual de alcance individual e a fatia de contribuição no total economizado mensalmente.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleApplySuggestions}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                title="Sugerir metas proporcionais com base na sua renda atual"
                data-testid="btn-sugerir-metas"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sugerir pela Renda</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                data-testid="btn-cancelar-edicao"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                data-testid="btn-salvar-metas"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Metas</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              data-testid="btn-editar-metas"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Definir / Ajustar Metas</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Overview of Monthly Savings and Goals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        
        {/* 1. Total Economizado Mensalmente */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              Total Economizado no Mês
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100" data-testid="kpi-total-monthly-savings">
            {formatBRL(summary.totalMonthlySavings)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Sobra acumulada nos 6 potes
          </div>
        </div>

        {/* 2. Total de Metas Planejadas */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              Meta Global Definida
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100" data-testid="kpi-total-savings-targets">
            {formatBRL(summary.totalSavingsTargets)}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            Soma dos 6 objetivos
          </div>
        </div>

        {/* 3. Taxa de Alcance Geral */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alcance da Meta Geral
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
              summary.overallTargetProgressPct >= 100 
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
            }`}>
              {summary.overallTargetProgressPct >= 100 ? 'Meta Batida' : 'Em Curso'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white" data-testid="kpi-overall-progress">
            {summary.overallTargetProgressPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium truncate">
            {summary.jarsMeetingTargetCount} de 6 potes com meta atingida
          </div>
        </div>

        {/* 4. Pote Destaque */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Maior Contribuição
            </span>
            <span className="text-[10px] font-bold text-indigo-500">
              {summary.bestPerformingJar.shortName}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-100 truncate">
            {summary.bestPerformingJar.shareOfTotalMonthlySavingsPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
            {formatBRL(summary.bestPerformingJar.currentSavings)} economizados
          </div>
        </div>

      </div>

      {/* Stacked Proportional Bar: Share of Total Monthly Savings Across Jars */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Fatia de Cada Pote no Total Economizado Mensalmente</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Base: {formatBRL(summary.totalMonthlySavings)} economizados no mês
          </span>
        </div>

        {/* Stacked bar */}
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex" data-testid="stacked-savings-bar">
          {summary.items.map(item => {
            const widthPct = item.shareOfTotalMonthlySavingsPct;
            if (widthPct <= 0) return null;
            return (
              <div
                key={item.jarId}
                style={{ width: `${widthPct}%`, backgroundColor: item.colorHex }}
                className="h-full transition-all duration-500 relative group cursor-pointer"
                title={`${item.shortName}: ${formatBRL(item.currentSavings)} (${widthPct}% do total economizado)`}
              />
            );
          })}
        </div>

        {/* Stacked Bar Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-[11px]">
          {summary.items.map(item => (
            <div key={item.jarId} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.colorHex }} />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {item.shortName}:
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {item.shareOfTotalMonthlySavingsPct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of the 6 Jars with Targets, Real Savings, Goal Progress and Share of Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10" data-testid="jar-savings-goals-grid">
        {summary.items.map((item) => {
          const Icon = getIcon(item.iconName);
          const isOverBudget = item.spent > item.budgetCap;

          return (
            <div 
              key={item.jarId}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                item.isTargetReached
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                  : isOverBudget
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              data-testid={`goal-card-${item.jarId}`}
            >
              <div className="space-y-3">
                
                {/* Header: Icon, Name and Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="p-2 rounded-xl shrink-0"
                      style={{ backgroundColor: `${item.colorHex}20`, color: item.colorHex }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {(item.pctOfIncome * 100).toFixed(0)}% da Renda ({item.shortName})
                      </span>
                    </div>
                  </div>

                  {item.isTargetReached ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Meta Batida 🎉
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                      Faltam {formatBRL(item.remainingToTarget)}
                    </span>
                  )}
                </div>

                {/* Values Row: Meta Definida vs Economia Real */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  
                  {/* Meta Definida */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Meta de Economia
                    </span>
                    {isEditing ? (
                      <div className="space-y-1 mt-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={editedTargets[item.jarId] || 0}
                            onChange={(e) => handleTargetChange(item.jarId, parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            data-testid={`input-target-${item.jarId}`}
                          />
                        </div>
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(item.jarId, 50)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(item.jarId, 100)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                          >
                            +100
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5 block" data-testid={`target-val-${item.jarId}`}>
                        {formatBRL(item.savingsTarget)}
                      </span>
                    )}
                  </div>

                  {/* Economia Real do Mês */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Economizado Real
                    </span>
                    <span className={`text-sm font-black font-mono mt-0.5 block ${
                      item.currentSavings > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                    }`} data-testid={`real-savings-val-${item.jarId}`}>
                      {formatBRL(item.currentSavings)}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      Gasto: {formatBRL(item.spent)}
                    </span>
                  </div>

                </div>

                {/* Progress Bar 1: Porcentagem de Alcance da Meta do Pote */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Alcance da Meta:</span>
                    <span className={`font-mono font-bold ${
                      item.targetProgressPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`} data-testid={`progress-pct-${item.jarId}`}>
                      {item.targetProgressPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${Math.min(100, Math.max(0, item.targetProgressPct))}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* Destaque Solicitado: % de Contribuição em Relação ao Total Economizado Mensalmente */}
              <div 
                className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs"
                data-testid={`total-savings-share-${item.jarId}`}
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    No Total Economizado do Mês:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400" data-testid={`share-pct-${item.jarId}`}>
                      {item.shareOfTotalMonthlySavingsPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({formatBRL(item.currentSavings)} de {formatBRL(summary.totalMonthlySavings)})
                    </span>
                  </div>
                </div>

                {onFilterJarInAgenda && (
                  <button
                    type="button"
                    onClick={() => onFilterJarInAgenda(item.jarId)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={`Ver lançamentos de ${item.shortName} na Agenda`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
