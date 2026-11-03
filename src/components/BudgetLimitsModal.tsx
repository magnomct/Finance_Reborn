import React, { useState } from 'react';
import { 
  X, Sliders, Sparkles, Check, AlertTriangle, AlertOctagon, 
  RotateCcw, Info, Home, Smile, PiggyBank, Wallet, BookOpen, Plane
} from 'lucide-react';
import { JarType } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import { 
  DEFAULT_JAR_LIMITS, 
  suggestLimitsFromIncome, 
  calculateJarExpense 
} from '../utils/budgetAlerts';
import { Transaction } from '../types';

interface BudgetLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  limits: Record<JarType, number>;
  onSaveLimits: (newLimits: Record<JarType, number>) => void;
  transactions: Transaction[];
  effectiveIncomeBase: number;
}

export const BudgetLimitsModal: React.FC<BudgetLimitsModalProps> = ({
  isOpen,
  onClose,
  limits,
  onSaveLimits,
  transactions,
  effectiveIncomeBase
}) => {
  const [tempLimits, setTempLimits] = useState<Record<JarType, number>>({ ...limits });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const jarKeys: JarType[] = ['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'];

  const getJarIcon = (name: string) => {
    switch (name) {
      case 'Home': return Home;
      case 'Smile': return Smile;
      case 'PiggyBank': return PiggyBank;
      case 'Wallet': return Wallet;
      case 'BookOpen': return BookOpen;
      case 'Plane': return Plane;
      default: return Home;
    }
  };

  const handleInputChange = (jarId: JarType, valStr: string) => {
    const num = parseFloat(valStr);
    setTempLimits(prev => ({
      ...prev,
      [jarId]: isNaN(num) || num < 0 ? 0 : num
    }));
  };

  const adjustLimit = (jarId: JarType, delta: number) => {
    setTempLimits(prev => ({
      ...prev,
      [jarId]: Math.max(0, (prev[jarId] || 0) + delta)
    }));
  };

  const handleApplySuggested = () => {
    const suggested = suggestLimitsFromIncome(effectiveIncomeBase);
    setTempLimits(suggested);
  };

  const handleResetDefaults = () => {
    setTempLimits({ ...DEFAULT_JAR_LIMITS });
  };

  const handleSave = () => {
    onSaveLimits(tempLimits);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Configurar Limites dos Potes & Alertas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gatilho de 80%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Defina o teto máximo de gastos de cada pote. O app avisa assim que atingir 80% e 100%.
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

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span>Renda Base Atual: <strong className="text-slate-800 dark:text-slate-200">{formatBRL(effectiveIncomeBase)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplySuggested}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 transition cursor-pointer text-[11px]"
              title="Calcular automaticamente com base nos percentuais 55/10/10/10/10/5"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sugerir pela Renda (6 Potes)</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition cursor-pointer text-[11px]"
              title="Restaurar limites padrões originais"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Padrões</span>
            </button>
          </div>
        </div>

        {/* Jar Limits List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {jarKeys.map(key => {
            const def = JAR_DEFINITIONS[key] || { name: key, shortName: key, pct: 0.1, colorHex: '#3b82f6', iconName: 'Home' };
            const Icon = getJarIcon(def.iconName);
            const currentLimit = tempLimits[key] || 0;
            const spent = calculateJarExpense(transactions, key);
            const usagePercent = currentLimit > 0 ? (spent / currentLimit) * 100 : 0;
            const threshold80 = currentLimit * 0.8;
            const isExceeded = usagePercent > 100;
            const isWarning = usagePercent >= 80 && !isExceeded;

            return (
              <div 
                key={key}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 transition hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: def.colorHex }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {def.name}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {Math.round(def.pct * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Gasto atual: <strong className="text-slate-800 dark:text-slate-200">{formatBRL(spent)}</strong>
                        {' · '}
                        Aviso aos 80%: <strong>{formatBRL(threshold80)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Limit input with +/- buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => adjustLimit(key, -50)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      -50
                    </button>

                    <div className="relative w-28 sm:w-32">
                      <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">R$</span>
                      <input 
                        type="number"
                        min="0"
                        step="10"
                        value={currentLimit}
                        onChange={e => handleInputChange(key, e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustLimit(key, 50)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustLimit(key, 100)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer hidden sm:flex"
                    >
                      +100
                    </button>
                  </div>
                </div>

                {/* Progress Bar with 80% Marker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      {isExceeded ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-black">
                          <AlertOctagon className="w-3 h-3" />
                          Estourado ({usagePercent.toFixed(1)}%)
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black">
                          <AlertTriangle className="w-3 h-3" />
                          Atenção 80%+ ({usagePercent.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Saudável ({usagePercent.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400">
                      Saldo restante: <strong className={currentLimit - spent < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}>
                        {formatBRL(currentLimit - spent)}
                      </strong>
                    </span>
                  </div>

                  <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    {/* 80% tick marker line */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80 z-10" 
                      style={{ left: '80%' }}
                      title="Gatilho de Alerta: 80%"
                    />
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, usagePercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm hover:shadow transition cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Limites Salvos!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Configurações de Limite</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
