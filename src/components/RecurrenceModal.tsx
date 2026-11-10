import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  X, 
  Calendar, 
  CalendarDays, 
  CalendarRange, 
  Ban, 
  Check, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  RecurrenceOption, 
  RECURRENCE_OPTIONS, 
  RECURRENCE_CONFIGS, 
  getTransactionRecurrence 
} from '../utils/recurrenceManager';

interface RecurrenceModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (option: RecurrenceOption, syncWithRecurringList: boolean) => void;
}

export const RecurrenceModal: React.FC<RecurrenceModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onConfirm,
}) => {
  const [selectedOption, setSelectedOption] = useState<RecurrenceOption>('mensal');
  const [syncWithAutomations, setSyncWithAutomations] = useState(true);

  useEffect(() => {
    if (transaction) {
      setSelectedOption(getTransactionRecurrence(transaction));
      setSyncWithAutomations(true);
    }
  }, [transaction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const currentRecurrence = getTransactionRecurrence(transaction);
  const isPositive = transaction.type === 'receita' || transaction.type === 'reembolso';
  const formattedAmount = `${isPositive ? '+' : '-'} R$ ${Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getOptionIcon = (opt: RecurrenceOption) => {
    switch (opt) {
      case 'diaria':
        return <CalendarDays className="w-5 h-5 text-emerald-500" />;
      case 'semanal':
        return <CalendarRange className="w-5 h-5 text-blue-500" />;
      case 'quinzenal':
        return <Repeat className="w-5 h-5 text-amber-500" />;
      case 'mensal':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'nenhuma':
      default:
        return <Ban className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleSave = () => {
    onConfirm(selectedOption, syncWithAutomations);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurrence-modal-title"
      data-testid="recurrence-modal-backdrop"
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="recurrence-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 id="recurrence-modal-title" className="font-bold text-base text-slate-900 dark:text-white">
                Definir Recorrência da Despesa
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Altere a frequência de repetição na Agenda Diária
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
            aria-label="Fechar"
            data-testid="btn-close-recurrence-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Lançamento Selecionado
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {transaction.description}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{transaction.date}</span>
              <span>•</span>
              <span>{transaction.account}</span>
              <span>•</span>
              <span className="capitalize">{transaction.type}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
              {formattedAmount}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              Atual: {RECURRENCE_CONFIGS[currentRecurrence].shortLabel}
            </span>
          </div>
        </div>

        {/* Frequency Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Escolha a frequência da recorrência:
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {RECURRENCE_OPTIONS.map((opt) => {
              const cfg = RECURRENCE_CONFIGS[opt];
              const isSelected = selectedOption === opt;
              const isCurrent = currentRecurrence === opt;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  data-testid={`opt-rec-${opt}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getOptionIcon(opt)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                          {cfg.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-[340px]">
                        {cfg.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sync checkbox */}
        {selectedOption !== 'nenhuma' && (
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncWithAutomations}
              onChange={(e) => setSyncWithAutomations(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              data-testid="checkbox-sync-automations"
            />
            <span className="text-[11px] leading-tight">
              <strong>Sincronizar com o Controle Automático:</strong> Mantém este lançamento cadastrado na lista de recorrências fixas para previsão nos próximos meses.
            </span>
          </label>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            data-testid="btn-cancel-recurrence"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            data-testid="btn-save-recurrence"
          >
            <span>Salvar Recorrência</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
