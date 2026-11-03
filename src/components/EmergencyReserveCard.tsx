import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, TrendingUp, Edit3, Check, 
  HelpCircle, ChevronRight, Sparkles, Plus, AlertCircle,
  Calendar, PiggyBank, ArrowUpRight, DollarSign, X
} from 'lucide-react';
import { formatBRL } from '../utils/finance';
import { 
  calculateRecent3MonthsExpenses, 
  calculateEmergencyReserveGoal,
  loadStoredReserveBalance,
  saveStoredReserveBalance,
  loadStoredTargetMonths,
  saveStoredTargetMonths
} from '../utils/emergencyReserve';
import { DreamGoal } from '../types';

interface EmergencyReserveCardProps {
  annualDataDespesas: Record<string, Array<{ values: number[] }>>;
  referenceMonthIndex?: number;
  dreams?: DreamGoal[];
  onUpdateDreamBalance?: (dreamId: string, newBalance: number) => void;
}

export const EmergencyReserveCard: React.FC<EmergencyReserveCardProps> = ({
  annualDataDespesas,
  referenceMonthIndex = 9, // Outubro default
  dreams = [],
  onUpdateDreamBalance
}) => {
  // Find emergency reserve dream if exists
  const reserveDream = useMemo(() => {
    return dreams.find(d => 
      d.id === 'dream-2' || 
      d.title.toLowerCase().includes('reserva de emergência') ||
      d.category.toLowerCase().includes('plp')
    );
  }, [dreams]);

  const defaultBalance = reserveDream ? reserveDream.current : 1200;

  // Stored state with local fallback
  const [currentReserve, setCurrentReserve] = useState<number>(() => {
    return loadStoredReserveBalance(defaultBalance);
  });

  const [targetMonths, setTargetMonths] = useState<number>(() => {
    return loadStoredTargetMonths(6);
  });

  const [monthlyContribution, setMonthlyContribution] = useState<number>(() => {
    return reserveDream ? reserveDream.monthlyDeposit : 350;
  });

  // Modal / Inline editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editInput, setEditInput] = useState<string>(currentReserve.toString());
  const [showMonthsBreakdown, setShowMonthsBreakdown] = useState<boolean>(false);

  // 1. Calculate average expenses for the last 3 months
  const recent3Months = useMemo(() => {
    return calculateRecent3MonthsExpenses(annualDataDespesas, referenceMonthIndex);
  }, [annualDataDespesas, referenceMonthIndex]);

  // 2. Compute emergency reserve goals and metrics
  const reserveGoal = useMemo(() => {
    return calculateEmergencyReserveGoal(
      recent3Months.averageMonthlyExpense,
      targetMonths,
      currentReserve,
      monthlyContribution
    );
  }, [recent3Months.averageMonthlyExpense, targetMonths, currentReserve, monthlyContribution]);

  // Handle saving new reserve balance
  const handleSaveBalance = () => {
    const parsed = parseFloat(editInput.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setCurrentReserve(parsed);
      saveStoredReserveBalance(parsed);

      if (reserveDream && onUpdateDreamBalance) {
        onUpdateDreamBalance(reserveDream.id, parsed);
      }
    }
    setIsEditing(false);
  };

  // Quick simulation deposit
  const handleQuickAdd = (amount: number) => {
    const updated = currentReserve + amount;
    setCurrentReserve(updated);
    saveStoredReserveBalance(updated);
    if (reserveDream && onUpdateDreamBalance) {
      onUpdateDreamBalance(reserveDream.id, updated);
    }
  };

  // Handle target months change
  const handleSelectMonths = (m: number) => {
    setTargetMonths(m);
    saveStoredTargetMonths(m);
  };

  // Progress Bar color styling based on completion
  const getProgressGradient = () => {
    if (reserveGoal.completionPercentage >= 100) {
      return 'from-emerald-500 to-teal-400';
    }
    if (reserveGoal.completionPercentage >= 70) {
      return 'from-sky-500 to-blue-600';
    }
    if (reserveGoal.completionPercentage >= 35) {
      return 'from-amber-500 to-orange-500';
    }
    return 'from-indigo-500 to-blue-500';
  };

  const getStatusBadge = () => {
    switch (reserveGoal.status) {
      case 'COMPLETE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
      case 'SOLID':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
      case 'BUILDING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
      case 'CRITICAL':
      default:
        return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200';
    }
  };

  const cappedPercentage = Math.min(100, Math.max(0, reserveGoal.completionPercentage));

  return (
    <div 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
      data-testid="component-emergency-reserve"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 text-white flex items-center justify-center shadow-md shrink-0">
            {reserveGoal.completionPercentage >= 100 ? (
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Reserva de Emergência
              </h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge()}`}>
                <Sparkles className="w-2.5 h-2.5" />
                <span>{reserveGoal.statusLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fundo de segurança contra imprevistos dimensionado pelo seu custo de vida médio real.
            </p>
          </div>
        </div>

        {/* Target Months Selector (3, 6, 12 meses) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-semibold self-start sm:self-center">
          <span className="text-[10px] text-slate-400 px-2 uppercase font-bold hidden sm:inline">Meta:</span>
          {[3, 6, 12].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectMonths(m)}
              className={`px-3 py-1 rounded-xl transition cursor-pointer text-xs ${
                targetMonths === m
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              data-testid={`btn-select-target-${m}-months`}
            >
              {m} meses {m === 6 ? '⭐' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* 1. Valor Atual da Reserva */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Valor Atual Guardado
            </span>
            <button
              type="button"
              onClick={() => {
                setEditInput(currentReserve.toString());
                setIsEditing(true);
              }}
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              title="Editar valor atual da reserva"
              data-testid="btn-edit-reserve-balance"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span 
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white"
              data-testid="reserve-current-value"
            >
              {formatBRL(reserveGoal.currentReserve)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>{reserveGoal.monthsCovered.toFixed(1)} meses cobertos</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleQuickAdd(200)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold transition"
                title="Simular aporte rápido de R$ 200"
              >
                +200
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(500)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold transition"
                title="Simular aporte rápido de R$ 500"
              >
                +500
              </button>
            </div>
          </div>
        </div>

        {/* 2. Gasto Médio dos Últimos 3 Meses */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gastos Médios (3 Meses)
            </span>
            <button
              type="button"
              onClick={() => setShowMonthsBreakdown(!showMonthsBreakdown)}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline"
              title="Ver detalhes dos 3 meses"
            >
              {showMonthsBreakdown ? 'Ocultar' : 'Detalhar'}
            </button>
          </div>

          <div className="flex items-baseline gap-1">
            <span 
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white"
              data-testid="reserve-average-expense"
            >
              {formatBRL(reserveGoal.averageMonthlyExpense)}
            </span>
            <span className="text-xs text-slate-400">/mês</span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            Média de {recent3Months.months.map(m => m.monthName).join(', ')}
          </p>
        </div>

        {/* 3. Valor Ideal da Reserva */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Valor Ideal da Reserva ({targetMonths}m)
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Meta
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span 
              className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300"
              data-testid="reserve-ideal-value"
            >
              {formatBRL(reserveGoal.idealReserve)}
            </span>
          </div>

          <div className="text-[11px] text-blue-600 dark:text-blue-400 pt-1 flex items-center justify-between">
            <span>{targetMonths}x custo de vida</span>
            {reserveGoal.shortfall > 0 ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Faltam {formatBRL(reserveGoal.shortfall)}
              </span>
            ) : (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Meta Conquistada!
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Detalhamento dos 3 Meses Analisados (Expandível) */}
      {showMonthsBreakdown && (
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-in fade-in duration-150">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
            Composição dos Gastos dos Últimos 3 Meses Analisados:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {recent3Months.months.map(m => (
              <div key={m.monthIndex} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{m.monthName}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{formatBRL(m.totalExpense)}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Soma dos 3 meses: <strong>{formatBRL(recent3Months.totalExpenses3Months)}</strong> ÷ 3 = <strong>{formatBRL(recent3Months.averageMonthlyExpense)}</strong> /mês de teto operacional.
          </p>
        </div>
      )}

      {/* Barra de Progresso Visual da Reserva */}
      <div className="space-y-2 pt-1" data-testid="reserve-progress-section">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <PiggyBank className="w-4 h-4 text-blue-500" />
            <span>Progresso da Proteção</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white" data-testid="reserve-percentage-label">
              {reserveGoal.completionPercentage.toFixed(1)}% Concluído
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              ({reserveGoal.monthsCovered.toFixed(1)} de {targetMonths} meses)
            </span>
          </div>
        </div>

        {/* Barra Visual com Gradiente */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative border border-slate-200 dark:border-slate-700">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient()} transition-all duration-500 shadow-sm`}
            style={{ width: `${cappedPercentage}%` }}
            data-testid="reserve-progress-bar"
          />
          {/* Marcadores de 25%, 50%, 75% */}
          <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-white/40 dark:bg-slate-600/50" title="25%" />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 dark:bg-slate-600/50" title="50%" />
          <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-white/40 dark:bg-slate-600/50" title="75%" />
        </div>

        {/* Régua de Metas e Estimativa de Tempo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1 pt-1">
          <div className="flex items-center gap-3">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% ({formatBRL(reserveGoal.idealReserve)})</span>
          </div>

          {reserveGoal.shortfall > 0 ? (
            <div className="font-semibold text-slate-600 dark:text-slate-300">
              {reserveGoal.monthsToGoal ? (
                <span>~{reserveGoal.monthsToGoal} meses com aporte mensal de {formatBRL(monthlyContribution)}</span>
              ) : (
                <span>Faltam {formatBRL(reserveGoal.shortfall)} para o teto</span>
              )}
            </div>
          ) : (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Parabéns! Sua segurança financeira para {targetMonths} meses está 100% garantida!
            </span>
          )}
        </div>
      </div>

      {/* Modal / Formulário de Edição do Saldo Atual */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 space-y-3 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Ajustar Saldo Atual da Reserva de Emergência
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-edit-reserve-balance"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveBalance}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
              data-testid="btn-save-reserve-balance"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Atualiza o valor imediatamente no cálculo e na barra de progresso da reserva.
          </p>
        </div>
      )}
    </div>
  );
};
