import React, { useState } from 'react';
import { 
  X, Calendar, Clock, Sparkles, Check, ArrowRight, 
  TrendingUp, AlertCircle, DollarSign, Target
} from 'lucide-react';
import { DreamGoal } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateRemainingMonths, 
  calculateSuggestedMonthlyDeposit 
} from '../utils/dreamCalculations';

interface DeadlineSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dream: DreamGoal | null;
  onSave: (updatedDream: DreamGoal) => void;
}

export const DeadlineSimulatorModal: React.FC<DeadlineSimulatorModalProps> = ({
  isOpen,
  onClose,
  dream,
  onSave
}) => {
  if (!isOpen || !dream) return null;

  const [targetDate, setTargetDate] = useState<string>(dream.targetDate || '');
  const [customDeposit, setCustomDeposit] = useState<string>(String(dream.monthlyDeposit || ''));

  const remainingAmount = Math.max(0, dream.target - dream.current);

  const {
    remainingMonths,
    suggestedMonthlyDeposit,
    isCompleted,
    isPastDeadline
  } = calculateSuggestedMonthlyDeposit(dream.target, dream.current, targetDate);

  // Quick preset helper
  const applyPresetMonths = (monthsToAdd: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    // Last day of that target month
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const formatted = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setTargetDate(formatted);
  };

  const handleApplySuggested = () => {
    if (suggestedMonthlyDeposit > 0) {
      setCustomDeposit(String(suggestedMonthlyDeposit));
    }
  };

  const handleConfirm = (applySuggestedToDeposit: boolean) => {
    const depositToSave = applySuggestedToDeposit && suggestedMonthlyDeposit > 0
      ? suggestedMonthlyDeposit
      : parseFloat(customDeposit) || dream.monthlyDeposit;

    onSave({
      ...dream,
      targetDate: targetDate || undefined,
      monthlyDeposit: depositToSave
    });
    onClose();
  };

  const currentDepositNum = parseFloat(customDeposit) || 0;
  const difference = currentDepositNum - suggestedMonthlyDeposit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Simulador de Data Limite & Aportes
              </h3>
              <p className="text-xs text-slate-400">
                {dream.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Acumulado</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatBRL(dream.current)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Meta Final</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {formatBRL(dream.target)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Saldo Restante</span>
              <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                {formatBRL(remainingAmount)}
              </span>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Data Limite Desejada (Prazo Final)
            </label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Atalhos Rápidos de Prazo:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '3 Meses', months: 3 },
                { label: '6 Meses', months: 6 },
                { label: '1 Ano', months: 12 },
                { label: '2 Anos', months: 24 },
                { label: 'Dezembro / 2026', months: 2 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPresetMonths(preset.months)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-[11px] text-slate-600 dark:text-slate-300 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Contribution Calculation Result */}
          {targetDate ? (
            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isPastDeadline 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-200'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-xs">
                    {isPastDeadline ? 'Prazo expirado ou no mês atual' : 'Cálculo de Aporte Recomendado'}
                  </span>
                </div>
                {!isPastDeadline && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    {remainingMonths} meses restantes
                  </span>
                )}
              </div>

              {!isPastDeadline ? (
                <>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Aporte Mensal Necessário:
                    </span>
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                      {formatBRL(suggestedMonthlyDeposit)}/mês
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Guardando esse valor todos os meses, você atinge o objetivo exatamente até <strong>{targetDate.split('-').reverse().join('/')}</strong>.
                  </p>

                  {/* Comparison with current deposit */}
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-[11px]">
                    <span>Aporte atual: <strong>{formatBRL(currentDepositNum)}/mês</strong></span>
                    {difference < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Déficit de {formatBRL(Math.abs(difference))}/mês
                      </span>
                    ) : difference > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Superávit de +{formatBRL(difference)}/mês
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Alinhado perfeitamente!
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs">
                  A data limite selecionada já passou ou é para este mês. Selecione uma data futura para calcular os aportes mensais.
                </p>
              )}
            </div>
          ) : null}

          {/* Custom Deposit Field */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Aporte Mensal a Definir (R$)
              </label>
              {suggestedMonthlyDeposit > 0 && (
                <button
                  type="button"
                  onClick={handleApplySuggested}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Usar Sugerido ({formatBRL(suggestedMonthlyDeposit)})</span>
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                value={customDeposit}
                onChange={e => setCustomDeposit(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleConfirm(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs transition cursor-pointer"
            >
              Salvar Prazo
            </button>

            {suggestedMonthlyDeposit > 0 && (
              <button
                onClick={() => handleConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm hover:shadow transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Aporte Sugerido</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
