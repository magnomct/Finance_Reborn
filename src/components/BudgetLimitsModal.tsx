import React, { useState, useEffect } from 'react';
import { 
  X, Sliders, Sparkles, Check, AlertTriangle, AlertOctagon, 
  RotateCcw, Info, Home, Smile, PiggyBank, Wallet, BookOpen, Plane,
  Target, TrendingUp
} from 'lucide-react';
import { JarType, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import { 
  DEFAULT_JAR_LIMITS, 
  DEFAULT_JAR_SAVINGS_TARGETS,
  suggestLimitsFromIncome, 
  suggestSavingsTargetsFromIncome,
  calculateJarExpense,
  calculateJarSavingsProgress
} from '../utils/budgetAlerts';

interface BudgetLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  limits: Record<JarType, number>;
  onSaveLimits: (newLimits: Record<JarType, number>) => void;
  savingsTargets?: Record<JarType, number>;
  onSaveSavingsTargets?: (newTargets: Record<JarType, number>) => void;
  transactions: Transaction[];
  effectiveIncomeBase: number;
}

export const BudgetLimitsModal: React.FC<BudgetLimitsModalProps> = ({
  isOpen,
  onClose,
  limits,
  onSaveLimits,
  savingsTargets,
  onSaveSavingsTargets,
  transactions,
  effectiveIncomeBase
}) => {
  const [tempLimits, setTempLimits] = useState<Record<JarType, number>>({ ...limits });
  const [tempSavingsTargets, setTempSavingsTargets] = useState<Record<JarType, number>>(() => ({
    ...DEFAULT_JAR_SAVINGS_TARGETS,
    ...(savingsTargets || {})
  }));
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempLimits({ ...limits });
      setTempSavingsTargets({
        ...DEFAULT_JAR_SAVINGS_TARGETS,
        ...(savingsTargets || {})
      });
    }
  }, [isOpen, limits, savingsTargets]);

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

  const handleSavingsTargetChange = (jarId: JarType, valStr: string) => {
    const num = parseFloat(valStr);
    setTempSavingsTargets(prev => ({
      ...prev,
      [jarId]: isNaN(num) || num < 0 ? 0 : num
    }));
  };

  const adjustSavingsTarget = (jarId: JarType, delta: number) => {
    setTempSavingsTargets(prev => ({
      ...prev,
      [jarId]: Math.max(0, (prev[jarId] || 0) + delta)
    }));
  };

  const handleApplySuggested = () => {
    const suggestedLimits = suggestLimitsFromIncome(effectiveIncomeBase);
    const suggestedTargets = suggestSavingsTargetsFromIncome(effectiveIncomeBase);
    setTempLimits(suggestedLimits);
    setTempSavingsTargets(suggestedTargets);
  };

  const handleResetDefaults = () => {
    setTempLimits({ ...DEFAULT_JAR_LIMITS });
    setTempSavingsTargets({ ...DEFAULT_JAR_SAVINGS_TARGETS });
  };

  const handleSave = () => {
    onSaveLimits(tempLimits);
    if (onSaveSavingsTargets) {
      onSaveSavingsTargets(tempSavingsTargets);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Limites & Metas de Economia dos Potes
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Teto & Poupança
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Defina o teto de gastos e a meta de economia para cada pote com acompanhamento visual.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Renda Base: <strong className="text-slate-800 dark:text-slate-200">{formatBRL(effectiveIncomeBase)}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleApplySuggested}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 transition cursor-pointer text-[11px]"
              title="Calcular tetos e metas automaticamente com base nos percentuais 55/10/10/10/10/5"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sugerir pela Renda</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition cursor-pointer text-[11px]"
              title="Restaurar limites e metas padrões originais"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Padrões</span>
            </button>
          </div>
        </div>

        {/* Jar Limits List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {jarKeys.map(key => {
            const def = JAR_DEFINITIONS[key] || { name: key, shortName: key, pct: 0.1, colorHex: '#3b82f6', iconName: 'Home' };
            const Icon = getJarIcon(def.iconName);
            const currentLimit = tempLimits[key] || 0;
            const currentSavingsTarget = tempSavingsTargets[key] !== undefined 
              ? tempSavingsTargets[key] 
              : DEFAULT_JAR_SAVINGS_TARGETS[key] || 0;
            const spent = calculateJarExpense(transactions, key);
            const jarBudget = effectiveIncomeBase * def.pct;
            const usagePercent = currentLimit > 0 ? (spent / currentLimit) * 100 : 0;
            const threshold80 = currentLimit * 0.8;
            const isExceeded = usagePercent > 100;
            const isWarning = usagePercent >= 80 && !isExceeded;
            
            const savingsProgress = calculateJarSavingsProgress(key, spent, currentLimit, currentSavingsTarget, jarBudget);

            return (
              <div 
                key={key}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3.5 transition hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
              >
                {/* Header do Pote */}
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
                          {Math.round(def.pct * 100)}% da Renda
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Gasto atual: <strong className="text-slate-800 dark:text-slate-200">{formatBRL(spent)}</strong>
                        {' · '}
                        Orçado pela regra: <strong>{formatBRL(jarBudget)}</strong>
                      </p>
                    </div>
                  </div>

                  <span 
                    className="text-[10px] font-black px-2 py-0.5 rounded-full self-start sm:self-center"
                    style={{ backgroundColor: `${def.colorHex}20`, color: def.colorHex }}
                  >
                    {def.shortName}
                  </span>
                </div>

                {/* Grid Duplo de Configuração: Teto de Gastos vs Meta de Economia */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  
                  {/* Bloco 1: Teto Máximo de Gastos */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Teto de Gastos (Limite)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        80%: <strong>{formatBRL(threshold80)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustLimit(key, -50)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                        title="Diminuir limite em R$ 50"
                      >
                        -50
                      </button>

                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">R$</span>
                        <input 
                          type="number"
                          min="0"
                          step="10"
                          value={currentLimit}
                          onChange={e => handleInputChange(key, e.target.value)}
                          aria-label={`Teto de gastos para ${def.name}`}
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => adjustLimit(key, 50)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                        title="Aumentar limite em R$ 50"
                      >
                        +50
                      </button>
                    </div>

                    {/* Barra de Consumo do Teto */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={isExceeded ? 'text-rose-600 font-bold' : isWarning ? 'text-amber-600 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                          {isExceeded ? 'Limite Ultrapassado' : isWarning ? 'Atenção (80%+)' : 'Consumo sob controle'} ({usagePercent.toFixed(0)}%)
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Resta: <strong className={currentLimit - spent < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}>{formatBRL(currentLimit - spent)}</strong>
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80 z-10" 
                          style={{ left: '80%' }}
                          title="Marca de Alerta 80%"
                        />
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Meta de Economia Personalizada (Poupar/Reservar) */}
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Meta de Economia</span>
                      </span>
                      <span className="text-[10px] font-bold">
                        {savingsProgress.isTargetReached ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Atingida 🎉
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Faltam {formatBRL(savingsProgress.remainingToTarget)}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjustSavingsTarget(key, -50)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-xs cursor-pointer border border-emerald-200 dark:border-emerald-800 shrink-0"
                        title="Diminuir meta de economia em R$ 50"
                      >
                        -50
                      </button>

                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-emerald-600/70 dark:text-emerald-400/70">R$</span>
                        <input 
                          type="number"
                          min="0"
                          step="10"
                          value={currentSavingsTarget}
                          onChange={e => handleSavingsTargetChange(key, e.target.value)}
                          aria-label={`Meta de economia personalizada para ${def.name}`}
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs font-black text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => adjustSavingsTarget(key, 50)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-xs cursor-pointer border border-emerald-200 dark:border-emerald-800 shrink-0"
                        title="Aumentar meta de economia em R$ 50"
                      >
                        +50
                      </button>
                    </div>

                    {/* Barra de Progresso da Meta de Economia */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Economia atual: <strong>{formatBRL(savingsProgress.currentSavings)}</strong>
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">
                          {savingsProgress.progressPercent.toFixed(0)}% da meta
                        </span>
                      </div>
                      <div className="relative h-1.5 w-full bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${Math.min(100, savingsProgress.progressPercent)}%` }}
                        />
                      </div>
                    </div>
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
                <span>Limites & Metas Salvos!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

