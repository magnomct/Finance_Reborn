import React, { useState, useMemo } from 'react';
import { 
  PiggyBank, Target, TrendingUp, Sparkles, Plus, Minus, 
  CheckCircle2, Clock, Calendar, Zap, ArrowRight, ShieldCheck,
  ChevronRight, Award, AlertCircle
} from 'lucide-react';
import { DreamGoal, RecurringExpense } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateDreamSavingsPlannerSummary, 
  updateDreamMonthlySavingsGoal 
} from '../utils/dreamSavingsPlanner';
import { mapDreamTo6Jar } from '../utils/dreamCalculations';

interface DreamMonthlySavingsPlannerProps {
  dreams: DreamGoal[];
  setDreams: React.Dispatch<React.SetStateAction<DreamGoal[]>>;
  recurringList?: RecurringExpense[];
  setRecurringList?: React.Dispatch<React.SetStateAction<RecurringExpense[]>>;
  onDepositCustom?: (dream: DreamGoal) => void;
  onNavigateToScreen?: (screen: string) => void;
}

export const DreamMonthlySavingsPlanner: React.FC<DreamMonthlySavingsPlannerProps> = ({
  dreams,
  setDreams,
  recurringList = [],
  setRecurringList,
  onDepositCustom,
  onNavigateToScreen
}) => {
  const [selectedDreamId, setSelectedDreamId] = useState<string>(dreams[0]?.id || '');
  const [viewMode, setViewMode] = useState<'individual' | 'grid'>('individual');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const summary = useMemo(() => calculateDreamSavingsPlannerSummary(dreams), [dreams]);

  const activeItem = useMemo(() => {
    return summary.items.find(i => i.dreamId === selectedDreamId) || summary.items[0];
  }, [summary.items, selectedDreamId]);

  const handleUpdateGoal = (dreamId: string, newAmount: number) => {
    const safeAmount = Math.max(0, Math.round(newAmount));
    setDreams(prev => updateDreamMonthlySavingsGoal(prev, dreamId, safeAmount));
    setFeedbackMessage(`Meta mensal ajustada para ${formatBRL(safeAmount)}/mês!`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleIncrementGoal = (dreamId: string, delta: number) => {
    const currentGoal = dreams.find(d => d.id === dreamId)?.monthlyDeposit || 0;
    handleUpdateGoal(dreamId, currentGoal + delta);
  };

  const handleIntegrateWith6Potes = (dreamId: string) => {
    const dream = dreams.find(d => d.id === dreamId);
    if (!dream || !dream.monthlyDeposit || dream.monthlyDeposit <= 0) return;

    const jarInfo = mapDreamTo6Jar(dream.category, dream.title);

    if (setRecurringList) {
      setRecurringList(prev => {
        const existingIdx = prev.findIndex(r => r.id === `rec-dream-${dream.id}` || r.description.includes(dream.title));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            amount: -Math.abs(dream.monthlyDeposit),
            amountPlanned: dream.monthlyDeposit,
            jar: jarInfo.jar,
            isActive: true,
          };
          return updated;
        } else {
          const newRecurring: RecurringExpense = {
            id: `rec-dream-${dream.id}`,
            description: `Economia Mensal: ${dream.title}`,
            amount: -Math.abs(dream.monthlyDeposit),
            amountPlanned: dream.monthlyDeposit,
            type: 'despesa',
            frequency: 'mensal',
            dayOfMonth: 10,
            jar: jarInfo.jar,
            account: 'Inter PF',
            costCenter: 'Magno',
            isActive: true,
            category: dream.category || 'Sonhos & Poupança',
            notes: `Meta de economia mensal vinculada ao pote ${jarInfo.jarShortName}`
          };
          return [...prev, newRecurring];
        }
      });
    }

    setFeedbackMessage(`Meta de ${formatBRL(dream.monthlyDeposit)}/mês integrada ao ${jarInfo.jarName}!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  if (!dreams || dreams.length === 0) {
    return null;
  }

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6"
      data-testid="dream-monthly-savings-planner"
    >
      {/* Header com Ícone e Descrição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white shadow-md shrink-0">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Meta Mensal de Economia por Sonho</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Planejador Interativo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina a quantia mensal a ser poupada para cada sonho e acompanhe o progresso visual do saldo atual rumo ao objetivo final.
            </p>
          </div>
        </div>

        {/* Alternador de Visualização (Foco Individual vs Todos os Sonhos) */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'individual'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            data-testid="btn-view-individual"
          >
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>Foco no Sonho</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            data-testid="btn-view-grid"
          >
            <Award className="w-3.5 h-3.5 text-sky-500" />
            <span>Comparar Todos ({summary.totalCount})</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback Temporário */}
      {feedbackMessage && (
        <div 
          className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-900 dark:text-emerald-100 text-xs font-semibold animate-in fade-in"
          data-testid="savings-planner-feedback"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Cards de Métricas Consolidadas do Planejamento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Meta Mensal Total
          </span>
          <div className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300" data-testid="total-monthly-savings-goal">
            {formatBRL(summary.totalMonthlySavingsGoal)}
            <span className="text-[11px] font-bold text-indigo-500 ml-1">/mês</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Distribuída em {summary.totalCount} metas
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Saldo Atual Acumulado
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400" data-testid="total-current-savings">
            {formatBRL(summary.totalCurrent)}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            {summary.overallProgressPct.toFixed(1)}% do total
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Objetivo Final Global
          </span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white" data-testid="total-target-savings">
            {formatBRL(summary.totalTarget)}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {summary.completedCount} de {summary.totalCount} concluídas
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Falta Guardar
          </span>
          <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300" data-testid="total-remaining-savings">
            {formatBRL(summary.totalRemaining)}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {summary.totalMonthlySavingsGoal > 0 
              ? `~ ${Math.ceil(summary.totalRemaining / summary.totalMonthlySavingsGoal)} meses no ritmo atual` 
              : 'Defina as metas mensais'}
          </span>
        </div>
      </div>

      {/* Barra de Progresso Global Consolidada */}
      <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Progresso Consolidado de Todos os Sonhos:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-black text-indigo-600 dark:text-indigo-400" data-testid="overall-progress-percent">
              {summary.overallProgressPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">
              ({formatBRL(summary.totalCurrent)} de {formatBRL(summary.totalTarget)})
            </span>
          </div>
        </div>

        <div className="relative pt-1">
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden shadow-inner relative">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-700 rounded-full"
              style={{ width: `${Math.min(100, Math.max(summary.overallProgressPct, 1))}%` }}
              data-testid="overall-progress-bar"
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-1 px-0.5 select-none">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* MODO 1: FOCO INDIVIDUAL NO SONHO COM AJUSTE DE META MENSAL E BARRA VISUAL */}
      {viewMode === 'individual' && activeItem && (
        <div className="space-y-4" data-testid="planner-individual-view">
          {/* Seletor de Sonhos (Tabs / Pills) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {summary.items.map(item => {
              const isSelected = item.dreamId === activeItem.dreamId;
              return (
                <button
                  key={item.dreamId}
                  type="button"
                  onClick={() => setSelectedDreamId(item.dreamId)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                  data-testid={`tab-dream-${item.dreamId}`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.isCompleted ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                  <span>{item.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {item.progressPct.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Card Detalhado do Sonho Selecionado */}
          <div 
            className="p-5 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/80 shadow-md space-y-5"
            data-testid={`planner-card-${activeItem.dreamId}`}
          >
            {/* Linha Superior: Título, Categoria e Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {activeItem.title}
                  </h4>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {activeItem.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Saldo atual versus objetivo final com projeção de economia mensal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${activeItem.statusBadge.colorClass}`}>
                  {activeItem.statusBadge.label}
                </span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* BARRA DE PROGRESSO VISUAL: SALDO ATUAL VERSUS OBJETIVO FINAL   */}
            {/* ============================================================== */}
            <div 
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
              data-testid={`progress-box-${activeItem.dreamId}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Progresso Rumo ao Objetivo:
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm" data-testid={`dream-pct-${activeItem.dreamId}`}>
                    {activeItem.progressPct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400" data-testid={`dream-current-${activeItem.dreamId}`}>
                    Saldo Atual: {formatBRL(activeItem.current)}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-700 dark:text-slate-300" data-testid={`dream-target-${activeItem.dreamId}`}>
                    Alvo: {formatBRL(activeItem.target)}
                  </span>
                </div>
              </div>

              {/* Barra Visual Gradiente com Marcadores 25%, 50%, 75%, 100% */}
              <div className="relative pt-1">
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-4 rounded-full overflow-hidden shadow-inner relative">
                  {/* Marcadores de Etapas */}
                  <div className="absolute top-0 bottom-0 left-[25%] w-[1px] bg-slate-300 dark:bg-slate-600 z-10 opacity-70" title="25% da meta" />
                  <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-slate-300 dark:bg-slate-600 z-10 opacity-70" title="50% da meta" />
                  <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-slate-300 dark:bg-slate-600 z-10 opacity-70" title="75% da meta" />

                  {/* Preenchimento Dinâmico */}
                  <div 
                    className={`h-full bg-gradient-to-r ${activeItem.gradient} transition-all duration-700 rounded-full shadow-sm`}
                    style={{ width: `${Math.min(100, Math.max(activeItem.progressPct, 2))}%` }}
                    data-testid={`progress-bar-fill-${activeItem.dreamId}`}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-1.5 px-0.5 select-none">
                  <span>Início (0%)</span>
                  <span className={activeItem.progressPct >= 25 ? 'text-indigo-600 dark:text-indigo-400' : ''}>25%</span>
                  <span className={activeItem.progressPct >= 50 ? 'text-indigo-600 dark:text-indigo-400' : ''}>50%</span>
                  <span className={activeItem.progressPct >= 75 ? 'text-indigo-600 dark:text-indigo-400' : ''}>75%</span>
                  <span className={activeItem.progressPct >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}>100% ({formatBRL(activeItem.target)})</span>
                </div>
              </div>

              {/* Informações de Saldo Restante */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">
                  {activeItem.isCompleted ? '🎉 Objetivo 100% alcançado!' : 'Distância para a conquista:'}
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400" data-testid={`dream-remaining-${activeItem.dreamId}`}>
                  {activeItem.isCompleted ? 'Meta Concluída' : `Faltam ${formatBRL(activeItem.remainingAmount)}`}
                </span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* DEFINIR META MENSAL DE ECONOMIA (CONTROLE INTERATIVO)          */}
            {/* ============================================================== */}
            <div 
              className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-4"
              data-testid={`savings-control-${activeItem.dreamId}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-black text-sm text-indigo-950 dark:text-indigo-100">
                      Definir Meta Mensal de Economia
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300 mt-0.5">
                    Quanto você planeja guardar todo mês especificamente para este sonho?
                  </p>
                </div>

                {/* Input de Valor Mensal com Steppers */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleIncrementGoal(activeItem.dreamId, -50)}
                    disabled={activeItem.monthlyDeposit <= 0}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                    title="Diminuir R$ 50 da meta mensal"
                    data-testid={`btn-decrease-monthly-${activeItem.dreamId}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={activeItem.monthlyDeposit || ''}
                      onChange={e => handleUpdateGoal(activeItem.dreamId, parseFloat(e.target.value) || 0)}
                      className="w-32 pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 font-black text-sm text-indigo-900 dark:text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      placeholder="0,00"
                      data-testid={`input-monthly-goal-${activeItem.dreamId}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleIncrementGoal(activeItem.dreamId, 50)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
                    title="Aumentar R$ 50 na meta mensal"
                    data-testid={`btn-increase-monthly-${activeItem.dreamId}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Botões de Atalhos Rápidos (+50, +100, +250, +500) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mr-1">
                  Atalhos de Aporte:
                </span>
                {[50, 100, 250, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleIncrementGoal(activeItem.dreamId, val)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                    data-testid={`btn-quick-add-${val}-${activeItem.dreamId}`}
                  >
                    +{formatBRL(val)}
                  </button>
                ))}

                {activeItem.targetDate && (
                  <button
                    type="button"
                    onClick={() => {
                      const d = dreams.find(x => x.id === activeItem.dreamId);
                      if (d && activeItem.remainingAmount > 0) {
                        // Calcula valor sugerido aproximado baseado em 12 meses ou prazo
                        const suggested = Math.max(50, Math.ceil(activeItem.remainingAmount / 12));
                        handleUpdateGoal(activeItem.dreamId, suggested);
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs transition cursor-pointer shadow-2xs ml-auto"
                    title="Calcular meta mensal ideal baseada no prazo"
                  >
                    Sugerir pelo Prazo
                  </button>
                )}
              </div>

              {/* Simulação do Tempo Restante para o Objetivo Final */}
              <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-200/70 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {activeItem.isCompleted ? (
                      <strong className="text-emerald-600 dark:text-emerald-400">Meta concluída! Parabéns pela conquista!</strong>
                    ) : activeItem.monthlyDeposit > 0 ? (
                      <>
                        Com economia de <strong className="text-indigo-600 dark:text-indigo-400">{formatBRL(activeItem.monthlyDeposit)}/mês</strong>, você alcança o objetivo em ~
                        <strong className="text-indigo-600 dark:text-indigo-400" data-testid={`estimated-months-${activeItem.dreamId}`}> {activeItem.estimatedMonths} {activeItem.estimatedMonths === 1 ? 'mês' : 'meses'}</strong>.
                      </>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Defina um valor de economia mensal acima para calcular o prazo estimado de conquista.
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Botão de Integração com os 6 Potes */}
                  <button
                    type="button"
                    onClick={() => handleIntegrateWith6Potes(activeItem.dreamId)}
                    disabled={activeItem.monthlyDeposit <= 0}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Adicionar esta economia mensal como despesa recorrente no pote dos 6 Potes"
                    data-testid={`btn-integrate-jars-${activeItem.dreamId}`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Integrar aos 6 Potes</span>
                  </button>

                  {/* Botão de Fazer Aporte Imediato */}
                  {onDepositCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        const dream = dreams.find(d => d.id === activeItem.dreamId);
                        if (dream) onDepositCustom(dream);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800 transition cursor-pointer"
                      title="Registrar aporte de economia agora"
                      data-testid={`btn-make-deposit-${activeItem.dreamId}`}
                    >
                      + Fazer Aporte
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: GRID COMPARATIVO DE TODOS OS SONHOS */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="planner-grid-view">
          {summary.items.map(item => (
            <div 
              key={item.dreamId}
              className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
              data-testid={`grid-card-${item.dreamId}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-500">
                      {item.category}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${item.statusBadge.colorClass}`}>
                    {item.progressPct.toFixed(0)}%
                  </span>
                </div>

                {/* Barra de Progresso do Sonho */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden relative shadow-inner my-2">
                  <div 
                    className={`h-full bg-gradient-to-r ${item.gradient} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.min(100, Math.max(item.progressPct, 2))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Atual: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatBRL(item.current)}</strong></span>
                  <span>Alvo: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatBRL(item.target)}</strong></span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Faltam {formatBRL(item.remainingAmount)}</span>
                </div>
              </div>

              {/* Linha de Definição de Meta Mensal */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Meta Mensal:</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={item.monthlyDeposit || ''}
                    onChange={e => handleUpdateGoal(item.dreamId, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    data-testid={`grid-input-monthly-${item.dreamId}`}
                  />
                  <span className="text-[10px] text-slate-400">/mês</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDreamId(item.dreamId);
                      setViewMode('individual');
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Focar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
