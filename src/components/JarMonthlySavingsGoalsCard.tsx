import React, { useState, useMemo } from 'react';
import { 
  Target, PiggyBank, Edit3, Check, X, Sparkles, TrendingUp, 
  CheckCircle2, AlertTriangle, Layers, Home, Wallet, BookOpen, 
  Smile, Plane, HelpCircle, Info, ChevronRight, Sliders, ArrowUpRight,
  ShieldCheck, RefreshCw, Plus
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

export interface JarMonthlySavingsGoalsCardProps {
  transactions?: Transaction[];
  effectiveIncomeBase?: number;
  jarLimits?: Record<JarType, number>;
  jarSavingsTargets?: Record<JarType, number>;
  onSaveSavingsTargets?: (targets: Record<JarType, number>) => void;
  onAddDepositTransaction?: (jarId: JarType, defaultAmount?: number) => void;
  className?: string;
}

const JAR_ICONS: Record<JarType, React.FC<{ className?: string }>> = {
  NEC_55: Home,
  DIV_10: Smile,
  PLP_10: PiggyBank,
  LIF_10: TrendingUp,
  EDU_10: BookOpen,
  FER_5: Plane,
  PJ_EXCLUIDO: Wallet
};

export const JarMonthlySavingsGoalsCard: React.FC<JarMonthlySavingsGoalsCardProps> = ({
  transactions = [],
  effectiveIncomeBase = 3652.31,
  jarLimits,
  jarSavingsTargets = DEFAULT_JAR_SAVINGS_TARGETS,
  onSaveSavingsTargets,
  onAddDepositTransaction,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTargets, setEditedTargets] = useState<Record<JarType, number>>(() => ({
    ...DEFAULT_JAR_SAVINGS_TARGETS,
    ...jarSavingsTargets
  }));
  const [notification, setNotification] = useState<string | null>(null);

  // Active targets: edited while in edit mode, saved otherwise
  const activeTargets = useMemo(() => {
    return isEditing 
      ? editedTargets 
      : { ...DEFAULT_JAR_SAVINGS_TARGETS, ...(jarSavingsTargets || {}) };
  }, [isEditing, editedTargets, jarSavingsTargets]);

  // Compute live calculations
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
      ...(jarSavingsTargets || {})
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTargets({
      ...DEFAULT_JAR_SAVINGS_TARGETS,
      ...(jarSavingsTargets || {})
    });
    setIsEditing(false);
  };

  const handleTargetChange = (jarId: JarType, val: number) => {
    setEditedTargets(prev => ({
      ...prev,
      [jarId]: Math.max(0, isNaN(val) ? 0 : val)
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
    setNotification('Metas de poupança dos 6 potes atualizadas com sucesso!');
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 ${className}`}
      data-testid="card-jar-monthly-savings-goals"
    >
      
      {/* Header com Título, Subtítulo e Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Metas de Poupança por Pote
            </span>
          </div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
            Metas Mensais dos 6 Potes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Defina metas de poupança mensais para cada pote e compare com o <strong>aporte real realizado no mês</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              data-testid="btn-edit-jar-savings-targets"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Definir Metas</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplySuggestions}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Sugerir metas automáticas com base na sua renda"
                data-testid="btn-suggest-jar-targets"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Sugerir Metas</span>
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                data-testid="btn-save-jar-savings-targets"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Metas</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {notification && (
        <div 
          className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in"
          data-testid="notification-targets-saved"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid de KPIs no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Total Metas Definidas */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Meta Mensal Total
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.totalSavingsTargets)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Soma dos 6 potes
          </span>
        </div>

        {/* KPI 2: Aporte Real Realizado no Mês */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Aporte Real no Mês
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatBRL(summary.totalMonthlySavings)}
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-medium block mt-0.5">
            {summary.surplusTotal >= 0 ? `+${formatBRL(summary.surplusTotal)} acima da meta` : `Faltam ${formatBRL(Math.abs(summary.surplusTotal))}`}
          </span>
        </div>

        {/* KPI 3: Progresso Consolidado */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Progresso Geral
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
              {summary.overallTargetProgressPct}%
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              da meta total
            </span>
          </div>
          <div className="w-full bg-slate-200/60 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(summary.overallTargetProgressPct, 100)}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Potes com Meta Atingida */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Potes Batidos
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {summary.jarsMeetingTargetCount} / 6
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              summary.jarsMeetingTargetCount >= 5 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {summary.jarsMeetingTargetCount >= 5 ? 'Excelente' : 'Em Progresso'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Top: <strong>{summary.bestPerformingJar?.name}</strong>
          </span>
        </div>
      </div>

      {/* Lista Comparativa dos 6 Potes com Barra de Progresso */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-bold">
            Distribuição dos Aportes vs Metas
          </span>
          <span className="text-[11px] text-slate-400">
            Comparativo entre <strong>Aporte Real</strong> e <strong>Meta Definida</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {summary.items.map((item) => {
            const Icon = JAR_ICONS[item.jarId] || PiggyBank;
            const progress = item.targetProgressPct;
            const isReached = item.isTargetReached;
            const isSuperated = item.currentSavings > item.savingsTarget;
            const realVal = item.realAporte !== undefined ? item.realAporte : item.currentSavings;
            const targetVal = isEditing ? (editedTargets[item.jarId] || 0) : item.savingsTarget;

            return (
              <div
                key={item.jarId}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isReached
                    ? 'bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-900/60 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
                data-testid={`card-jar-goal-${item.jarId}`}
              >
                {/* Header do Pote: Ícone, Nome, Pct da Renda e Badge de Status */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: item.colorHex }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Alvo de {(item.pctOfIncome * 100).toFixed(0)}% da renda • {item.desc}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isSuperated
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : isReached
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {isSuperated ? `+${progress}% Superada!` : isReached ? '100% Batida!' : `${progress}%`}
                    </span>
                  </div>

                  {/* Barra de Progresso Comparativa Visual */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 relative">
                      {/* 100% Target Reference Line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80 dark:bg-slate-500 z-10" 
                        style={{ left: '100%' }}
                        title="Meta (100%)"
                      />

                      {/* Animated Progress Fill */}
                      <div 
                        className="h-full rounded-full transition-all duration-500 shadow-xs"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: item.colorHex
                        }}
                      />
                    </div>

                    {/* Valores Numéricos Comparativos: Aporte Real vs Meta Definida */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Aporte Real</span>
                        <strong className="text-slate-900 dark:text-white font-black text-xs sm:text-sm">
                          {formatBRL(realVal)}
                        </strong>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Meta Definida</span>
                        <span className="text-slate-600 dark:text-slate-300 font-bold text-xs">
                          {formatBRL(targetVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção Inferior: Modo de Edição ou Resumo de Faltante */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-500 shrink-0">
                          Meta (R$):
                        </label>
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-bold">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={editedTargets[item.jarId] ?? 0}
                            onChange={(e) => handleTargetChange(item.jarId, parseFloat(e.target.value))}
                            className="w-full pl-8 pr-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-400 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            data-testid={`input-target-${item.jarId}`}
                          />
                        </div>
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjust(item.jarId, 50)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          +R$ 50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjust(item.jarId, 100)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          +R$ 100
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTargetChange(item.jarId, 0)}
                          className="px-2 py-0.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] font-semibold"
                        >
                          Zerar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className={`text-[11px] font-bold ${
                        isReached
                          ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {isReached ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Meta batida no mês!</span>
                          </>
                        ) : (
                          <span>Faltam <strong>{formatBRL(item.remainingToTarget)}</strong> para a meta</span>
                        )}
                      </span>

                      {/* Botão de Aporte Rápido se a meta estiver pendente */}
                      {!isReached && onAddDepositTransaction && (
                        <button
                          type="button"
                          onClick={() => onAddDepositTransaction(item.jarId, item.remainingToTarget)}
                          className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold transition flex items-center gap-1"
                          title={`Registrar aporte para completar a meta do ${item.shortName}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Aportar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Caixa de Dica Estratégica Conectando com Sonhos */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-start gap-3 text-xs">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h5 className="font-black text-slate-900 dark:text-white">
            Como os 6 Potes Alimentam seus Sonhos & Metas
          </h5>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            Ao definir metas mensais para os potes <strong>Reserva & Sonhos (PLP 10%)</strong>, <strong>Liberdade Financeira (LIF 10%)</strong> e <strong>Educação (EDU 10%)</strong>, você garante que as sobras orçamentárias se transformem em aportes automáticos nos seus objetivos de vida de curto, médio e longo prazo.
          </p>
        </div>
      </div>

    </div>
  );
};
