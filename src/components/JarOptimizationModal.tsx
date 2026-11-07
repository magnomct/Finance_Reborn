import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, TrendingUp, ShieldCheck, CheckCircle2, 
  AlertTriangle, RefreshCw, ArrowRight, Info, Sliders,
  Home, Smile, PiggyBank, Wallet, BookOpen, Plane, Check
} from 'lucide-react';
import { JarType, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import { 
  JarOptimizationResult, 
  CORE_JAR_KEYS, 
  calculateJarHistoricalStats, 
  calculateDeterministicJarOptimization,
  STANDARD_JAR_PERCENTAGES
} from '../utils/jarOptimization';

interface JarOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  incomeBase: number;
  currentLimits: Record<JarType, number>;
  onSaveLimits: (newLimits: Record<JarType, number>) => void;
}

export const JarOptimizationModal: React.FC<JarOptimizationModalProps> = ({
  isOpen,
  onClose,
  transactions,
  incomeBase,
  currentLimits,
  onSaveLimits,
}) => {
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState<JarOptimizationResult | null>(null);
  const [editablePercents, setEditablePercents] = useState<Record<JarType, number>>({} as any);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const fetchOptimization = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const historicalStats = calculateJarHistoricalStats(transactions, incomeBase);

      const response = await fetch('/api/otimizar-potes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeBase,
          currentLimits,
          historicalSpending: historicalStats,
          emergencyReserve: {
            currentReserve: currentLimits.PLP_10 || 360,
            targetMonths: 6,
            averageMonthlyExpense: 2000,
            shortfall: 10000,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }

      const data: JarOptimizationResult = await response.json();
      setOptimization(data);
      
      const initialPercents: Record<JarType, number> = {} as any;
      CORE_JAR_KEYS.forEach(k => {
        initialPercents[k] = data.optimizedJars[k]?.suggestedPercent ?? STANDARD_JAR_PERCENTAGES[k];
      });
      setEditablePercents(initialPercents);
    } catch (err: any) {
      console.warn('Fallback para motor local de otimização:', err?.message);
      const historicalStats = calculateJarHistoricalStats(transactions, incomeBase);
      const localResult = calculateDeterministicJarOptimization({
        incomeBase,
        currentLimits,
        historicalStats,
        reserveShortfall: 10000,
        averageMonthlyExpense: 2000,
      });
      setOptimization(localResult);

      const initialPercents: Record<JarType, number> = {} as any;
      CORE_JAR_KEYS.forEach(k => {
        initialPercents[k] = localResult.optimizedJars[k]?.suggestedPercent ?? STANDARD_JAR_PERCENTAGES[k];
      });
      setEditablePercents(initialPercents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      fetchOptimization();
    }
  }, [isOpen, incomeBase]);

  if (!isOpen) return null;

  const currentTotalPercent = CORE_JAR_KEYS.reduce((acc, k) => acc + (editablePercents[k] || 0), 0);
  const isBalanced = currentTotalPercent === 100;

  const handleAdjustPercent = (jarId: JarType, delta: number) => {
    setEditablePercents(prev => {
      const cur = prev[jarId] || 0;
      const next = Math.max(1, cur + delta);
      return { ...prev, [jarId]: next };
    });
  };

  const handleResetToStandard = () => {
    const std: Record<JarType, number> = {} as any;
    CORE_JAR_KEYS.forEach(k => {
      std[k] = STANDARD_JAR_PERCENTAGES[k];
    });
    setEditablePercents(std);
  };

  const handleApply = () => {
    const newLimits: Record<JarType, number> = { ...currentLimits };
    CORE_JAR_KEYS.forEach(k => {
      const pct = editablePercents[k] || STANDARD_JAR_PERCENTAGES[k];
      newLimits[k] = Math.round(incomeBase * (pct / 100));
    });

    onSaveLimits(newLimits);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1100);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-testid="modal-otimizacao-potes"
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 via-emerald-50/60 to-transparent dark:from-indigo-950/40 dark:via-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  Assistente IA
                </span>
                <span className="text-xs text-slate-400">
                  Base: <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatBRL(incomeBase)}</strong>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Otimização Inteligente dos 6 Potes
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
            data-testid="btn-fechar-otimizacao"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                A IA está analisando seu histórico de gastos e calculando a melhor distribuição...
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Avaliando margens ociosas em contas fixas e lazer para maximizar sua Reserva de Emergência.
              </p>
            </div>
          )}

          {!loading && optimization && (
            <>
              {/* Card de Destaque da Estratégia de Reserva */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-300/80 dark:border-emerald-800/80 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{optimization.strategyHeadline}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                      {optimization.strategySummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 shadow-2xs text-center min-w-[110px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Aporte Extra</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        +{formatBRL(optimization.monthlyReserveBoost)}
                      </span>
                      <span className="text-[9px] text-slate-400 block">/mês na reserva</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 shadow-2xs text-center min-w-[110px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Meta Antecipada</span>
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        ~{optimization.monthsAccelerated} meses
                      </span>
                      <span className="text-[9px] text-slate-400 block">mais rápido</span>
                    </div>
                  </div>
                </div>

                {/* Key insights list */}
                {optimization.keyInsights && optimization.keyInsights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-900/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    {optimization.keyInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status de Balanceamento 100% */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Distribuição dos Potes (Ajuste ou Adote a Recomendação):</span>
                </span>
                
                <div className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 text-[11px] ${
                  isBalanced 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Soma: 100% (Balanceado)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Soma: {currentTotalPercent}% (Deve somar 100%)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Grid dos 6 Potes com Comparações */}
              <div className="space-y-2.5" data-testid="lista-potes-otimizados">
                {CORE_JAR_KEYS.map(key => {
                  const item = optimization.optimizedJars[key];
                  if (!item) return null;
                  const Icon = getJarIcon(JAR_DEFINITIONS[key]?.iconName || 'Home');
                  const currentPercent = editablePercents[key] ?? item.suggestedPercent;
                  const calculatedLimit = Math.round(incomeBase * (currentPercent / 100));
                  const isReserve = key === 'PLP_10';

                  return (
                    <div 
                      key={key}
                      className={`p-3.5 rounded-2xl border transition ${
                        isReserve
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
                      }`}
                      data-testid={`card-otimizacao-${key}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Identificação do Pote */}
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div 
                            className="p-2 rounded-xl text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.colorHex }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                                {item.jarName}
                              </h4>
                              {isReserve && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[9px] tracking-wide uppercase">
                                  Reserva
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Gasto real: {formatBRL(item.historicalNetSpent)} ({item.historicalPercentSpent}% da renda)
                            </span>
                          </div>
                        </div>

                        {/* Comparativo de Percentual e Limite */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-1">
                          
                          {/* Percentual Atual vs Novo */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Percentual</span>
                            <div className="flex items-center gap-1 font-black text-xs">
                              <span className="text-slate-400 line-through text-[11px]">{item.currentPercent}%</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                              <span className={isReserve ? 'text-emerald-600 dark:text-emerald-400 text-sm' : 'text-slate-800 dark:text-slate-200'}>
                                {currentPercent}%
                              </span>
                            </div>
                          </div>

                          {/* Controles de Ajuste Fino (+ / -) */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleAdjustPercent(key, -1)}
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                              title="Diminuir 1%"
                              data-testid={`btn-dec-${key}`}
                            >
                              -
                            </button>
                            <span className="w-9 text-center font-black text-xs text-slate-800 dark:text-slate-200">
                              {currentPercent}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustPercent(key, 1)}
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                              title="Aumentar 1%"
                              data-testid={`btn-inc-${key}`}
                            >
                              +
                            </button>
                          </div>

                          {/* Novo Limite em R$ */}
                          <div className="text-right min-w-[90px]">
                            <span className="text-[10px] text-slate-400 block">Novo Limite</span>
                            <span className={`text-xs font-black block ${isReserve ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {formatBRL(calculatedLimit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Justificativa da IA */}
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 pl-9 leading-relaxed">
                        {item.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToStandard}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Restaurar Padrão (55/10/10/10/10/5)
            </button>

            <button
              type="button"
              onClick={fetchOptimization}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalcular</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !isBalanced}
              className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="btn-aplicar-otimizacao"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Limites Otimizados Salvos!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar Otimização nos Limites</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
