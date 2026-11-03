import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, CheckCircle2, Circle, Sparkles, Calendar, 
  ChevronLeft, ChevronRight, Filter, TrendingUp, Check, 
  Plus, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { DreamGoal, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  computeMonthlyChecklistProgress, 
  toggleDreamDeposit, 
  markAllDreamDeposits,
  loadMonthlyChecklist, 
  saveMonthlyChecklist 
} from '../utils/dreamChecklist';

interface DreamDepositChecklistProps {
  dreams: DreamGoal[];
  onDepositCustom?: (dream: DreamGoal) => void;
  onRecordDeposit?: (dream: DreamGoal, amount: number) => void;
}

export const DreamDepositChecklist: React.FC<DreamDepositChecklistProps> = ({
  dreams,
  onDepositCustom,
  onRecordDeposit
}) => {
  // Available months for tracking
  const availableMonths = [
    { key: '2026-08', label: 'Agosto / 2026' },
    { key: '2026-09', label: 'Setembro / 2026' },
    { key: '2026-10', label: 'Outubro / 2026' },
    { key: '2026-11', label: 'Novembro / 2026' },
    { key: '2026-12', label: 'Dezembro / 2026' },
  ];

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(2); // Default to Outubro/2026
  const currentMonth = availableMonths[selectedMonthIdx] || availableMonths[2];

  // Completed dream IDs for the selected month
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    return loadMonthlyChecklist(currentMonth.key);
  });

  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  // Reload checklist when month changes
  useEffect(() => {
    setCompletedIds(loadMonthlyChecklist(currentMonth.key));
  }, [currentMonth.key]);

  // Compute progress stats
  const progress = useMemo(() => {
    return computeMonthlyChecklistProgress(dreams, completedIds);
  }, [dreams, completedIds]);

  // Toggle item checkmark
  const handleToggle = (dream: DreamGoal) => {
    const isCurrentlyChecked = completedIds.includes(dream.id);
    const updated = toggleDreamDeposit(completedIds, dream.id);
    setCompletedIds(updated);
    saveMonthlyChecklist(currentMonth.key, updated);

    // If user is checking off and wants it credited to dream's current balance
    if (!isCurrentlyChecked && onRecordDeposit && dream.monthlyDeposit > 0) {
      onRecordDeposit(dream, dream.monthlyDeposit);
    }
  };

  // Mark all completed
  const handleMarkAll = () => {
    const allIds = markAllDreamDeposits(dreams);
    setCompletedIds(allIds);
    saveMonthlyChecklist(currentMonth.key, allIds);
  };

  // Clear all
  const handleClearAll = () => {
    setCompletedIds([]);
    saveMonthlyChecklist(currentMonth.key, []);
  };

  // Filtered dreams to display
  const displayedDreams = useMemo(() => {
    return dreams.filter(dream => {
      const isDone = completedIds.includes(dream.id);
      if (filterMode === 'pending') return !isDone;
      if (filterMode === 'completed') return isDone;
      return true;
    });
  }, [dreams, completedIds, filterMode]);

  const allCompleted = dreams.length > 0 && progress.completedCount === dreams.length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      
      {/* Header and Month Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-teal-500 text-white">
              <CheckSquare className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400">
              Controle de Economia Mensal
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Checklist
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Checklist de Aportes dos Sonhos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o cumprimento do aporte mensal de cada meta e mantenha a disciplina dos seus 6 potes.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setSelectedMonthIdx(prev => Math.max(0, prev - 1))}
            disabled={selectedMonthIdx === 0}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold px-2 text-slate-800 dark:text-slate-200 whitespace-nowrap min-w-[120px] text-center">
            {currentMonth.label}
          </span>

          <button
            onClick={() => setSelectedMonthIdx(prev => Math.min(availableMonths.length - 1, prev + 1))}
            disabled={selectedMonthIdx === availableMonths.length - 1}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress KPI Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-200/80 dark:border-teal-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Progresso do Mês:
            </span>
            <span className="text-sm font-black text-teal-600 dark:text-teal-400">
              {progress.completionPercent}% Realizado
            </span>
            <span className="text-xs text-slate-400">
              ({progress.completedCount} de {progress.totalCount} metas)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Aportado: <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(progress.totalCompleted)}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              Planejado: <strong className="text-slate-700 dark:text-slate-200">{formatBRL(progress.totalPlanned)}</strong>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.completionPercent}%` }}
          />
        </div>

        {allCompleted && (
          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Excelente! Todos os aportes programados para {currentMonth.label} foram concluídos!</span>
          </div>
        )}
      </div>

      {/* Filters and Batch Actions Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todas ({dreams.length})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Pendentes ({dreams.length - progress.completedCount})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Aportadas ({progress.completedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {progress.completedCount < dreams.length ? (
            <button
              onClick={handleMarkAll}
              className="text-teal-600 dark:text-teal-400 hover:underline font-bold transition cursor-pointer"
            >
              Marcar Todas como Aportadas
            </button>
          ) : (
            <button
              onClick={handleClearAll}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline font-medium transition cursor-pointer"
            >
              Desmarcar Todas
            </button>
          )}
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="space-y-2.5">
        {displayedDreams.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            {filterMode === 'pending' 
              ? 'Nenhum aporte pendente neste mês! Todos os sonhos já foram atendidos.' 
              : filterMode === 'completed'
              ? 'Nenhum aporte marcado como concluído ainda para este mês.'
              : 'Nenhum sonho cadastrado. Cadastre um sonho para iniciar o checklist.'}
          </div>
        ) : (
          displayedDreams.map(dream => {
            const isCompleted = completedIds.includes(dream.id);

            return (
              <div
                key={dream.id}
                onClick={() => handleToggle(dream)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Left: Checkbox & Dream Details */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(dream);
                    }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-teal-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-xs sm:text-sm ${
                        isCompleted 
                          ? 'text-slate-900 dark:text-white line-through opacity-80' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {dream.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                        {dream.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Meta total: {formatBRL(dream.target)} · Acumulado atual: {formatBRL(dream.current)}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Aporte Mensal</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                      {formatBRL(dream.monthlyDeposit)}
                    </span>
                  </div>

                  {isCompleted ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Aportado
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      <Circle className="w-2.5 h-2.5 text-amber-500" />
                      Pendente
                    </span>
                  )}

                  {onDepositCustom && (
                    <button
                      type="button"
                      onClick={() => onDepositCustom(dream)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition"
                      title="Fazer aporte avulso de outro valor"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
