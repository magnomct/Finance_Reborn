import React, { useState } from 'react';
import { 
  Home, Wallet, PiggyBank, BookOpen, Smile, Plane, 
  HelpCircle, Info, ChevronRight, Filter, AlertTriangle, CheckCircle2,
  Target, Sparkles
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { calculateFinancialMetrics, formatBRL } from '../utils/finance';
import { Sliders, AlertOctagon } from 'lucide-react';
import { PotesDonutChart } from './PotesDonutChart';
import { AnimatedCurrencyCounter } from './AnimatedCurrencyCounter';
import { 
  DEFAULT_JAR_SAVINGS_TARGETS, 
  calculateJarSavingsProgress 
} from '../utils/budgetAlerts';

interface PotesViewProps {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  setUsePjProfitInPf: (val: boolean) => void;
  onFilterJarInAgenda: (jar: JarType) => void;
  jarLimits?: Record<JarType, number>;
  jarSavingsTargets?: Record<JarType, number>;
  onOpenLimitsModal?: () => void;
}

export const PotesView: React.FC<PotesViewProps> = ({
  transactions,
  usePjProfitInPf,
  setUsePjProfitInPf,
  onFilterJarInAgenda,
  jarLimits,
  jarSavingsTargets,
  onOpenLimitsModal
}) => {
  const [selectedJarKey, setSelectedJarKey] = useState<JarType | null>('NEC_55');


  const metrics = calculateFinancialMetrics(transactions, usePjProfitInPf);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Home': return Home;
      case 'Wallet': return Wallet;
      case 'PiggyBank': return PiggyBank;
      case 'BookOpen': return BookOpen;
      case 'Smile': return Smile;
      case 'Plane': return Plane;
      default: return Home;
    }
  };

  const selectedJarData = selectedJarKey ? metrics.jars[selectedJarKey] : null;

  const selectedJarTransactions = selectedJarKey
    ? transactions.filter(t => t.jar === selectedJarKey)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header com Switch de Base */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-indigo-500 text-white">
              <Home className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              Metodologia dos 6 Potes (T. Harv Eker)
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Divisão Inteligente de Gastos
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span>Base Orçamentária Atual:</span>
            <AnimatedCurrencyCounter
              value={metrics.effectiveIncomeBase}
              showDirectionBadge={true}
              className="font-black text-slate-900 dark:text-white"
            />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {onOpenLimitsModal && (
            <button
              onClick={onOpenLimitsModal}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-2xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Definir teto máximo por pote e receber alertas visuais aos 80%"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Configurar Limites & Alertas</span>
            </button>
          )}

          {/* Toggle de Inclusão do Lucro PJ */}
          <button
            onClick={() => setUsePjProfitInPf(!usePjProfitInPf)}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-2 shadow-sm whitespace-nowrap ${
              usePjProfitInPf
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${usePjProfitInPf ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{usePjProfitInPf ? 'Lucro PJ Integrado (+R$ 1.592) ✅' : 'Somente Salário CLT (R$ 2.060)'}</span>
          </button>
        </div>
      </div>

      {/* Gráfico de Rosca Interativo de Consumo vs Limite */}
      <PotesDonutChart
        jars={metrics.jars}
        jarLimits={jarLimits}
        selectedJarKey={selectedJarKey}
        onSelectJar={setSelectedJarKey}
        onOpenLimitsModal={onOpenLimitsModal}
      />

      {/* Grid dos 6 Potes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(metrics.jars).map(jar => {
          const Icon = getIcon(jar.iconName);
          const isSelected = selectedJarKey === jar.id;
          
          const customLimit = jarLimits && jarLimits[jar.id] !== undefined && jarLimits[jar.id] > 0
            ? jarLimits[jar.id]
            : jar.budget;
          
          const usagePercent = customLimit > 0 ? (jar.spent / customLimit) * 100 : 0;
          const isExceeded = usagePercent > 100;
          const isWarning = usagePercent >= 80 && !isExceeded;

          const savingsTarget = jarSavingsTargets && jarSavingsTargets[jar.id] !== undefined
            ? jarSavingsTargets[jar.id]
            : DEFAULT_JAR_SAVINGS_TARGETS[jar.id] || 0;

          const savingsProgress = calculateJarSavingsProgress(jar.id, jar.spent, customLimit, savingsTarget, jar.budget);

          return (
            <div
              key={jar.id}
              onClick={() => setSelectedJarKey(jar.id)}
              className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                isExceeded 
                  ? 'ring-2 ring-rose-500/30 border-rose-300 dark:border-rose-900/80 shadow-xs'
                  : isWarning
                  ? 'ring-2 ring-amber-500/30 border-amber-300 dark:border-amber-900/80 shadow-xs'
                  : isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-sm'
              }`}
              data-testid={`jar-card-${jar.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="p-2.5 rounded-2xl shrink-0" 
                      style={{ backgroundColor: `${jar.colorHex}20`, color: jar.colorHex }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {jar.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {(jar.pct * 100).toFixed(0)}% da Renda
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span 
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${jar.colorHex}15`, color: jar.colorHex }}
                    >
                      {jar.shortName}
                    </span>

                    {isExceeded ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        Estourado
                      </span>
                    ) : isWarning ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        80%+ Alerta
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-baseline text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Gasto Líquido</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        <AnimatedCurrencyCounter value={jar.spent} showDirectionBadge={true} />
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Teto de Gastos</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        <AnimatedCurrencyCounter value={customLimit} />
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {jar.desc}
                  </p>
                </div>
              </div>

              {/* Seção 1: Barra de consumo do teto de gastos */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                  <span>Consumo do Teto</span>
                  <span className={isExceeded ? 'text-rose-600 font-bold' : isWarning ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                    <AnimatedCurrencyCounter value={usagePercent} isPercent={true} percentDecimals={0} /> (alerta em 80%)
                  </span>
                </div>

                <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" 
                    style={{ left: '80%' }}
                    title="Marca de 80%"
                  />
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : jar.colorHex,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium mt-1">
                  <span className="text-slate-400">
                    Limite: {formatBRL(customLimit)}
                  </span>
                  <span className={customLimit - jar.spent < 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-200 font-bold'}>
                    {customLimit - jar.spent < 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        Excedido: <AnimatedCurrencyCounter value={jar.spent - customLimit} showDirectionBadge={true} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        Sobra do Teto: <AnimatedCurrencyCounter value={customLimit - jar.spent} showDirectionBadge={true} />
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Seção 2: Meta de Economia Personalizada & Progresso Visual */}
              <div 
                className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 bg-emerald-50/40 dark:bg-emerald-950/20 -mx-5 -mb-5 px-5 py-3 rounded-b-3xl"
                data-testid={`savings-goal-section-${jar.id}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px]">Meta de Economia</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {savingsProgress.isTargetReached ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Meta Atingida! 🎉
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Meta: <strong>{formatBRL(savingsTarget)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso da Meta de Economia */}
                <div className="relative w-full bg-emerald-100/70 dark:bg-emerald-950/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-xs"
                    style={{ width: `${Math.min(100, savingsProgress.progressPercent)}%` }}
                    data-testid={`savings-progress-bar-${jar.id}`}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium pt-0.5">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Guardado: {formatBRL(savingsProgress.currentSavings)} ({savingsProgress.progressPercent.toFixed(0)}%)
                  </span>

                  <span className={savingsProgress.isTargetReached ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold'}>
                    {savingsProgress.isTargetReached ? (
                      <span>+{formatBRL(savingsProgress.currentSavings - savingsTarget)} acima da meta</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-bold">
                        Faltam {formatBRL(savingsProgress.remainingToTarget)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Detalhes do Pote Selecionado */}
      {selectedJarData && (() => {
        const selectedLimit = jarLimits && jarLimits[selectedJarData.id] !== undefined && jarLimits[selectedJarData.id] > 0
          ? jarLimits[selectedJarData.id]
          : selectedJarData.budget;
        const selectedTarget = jarSavingsTargets && jarSavingsTargets[selectedJarData.id] !== undefined
          ? jarSavingsTargets[selectedJarData.id]
          : DEFAULT_JAR_SAVINGS_TARGETS[selectedJarData.id] || 0;
        const selectedSavings = calculateJarSavingsProgress(
          selectedJarData.id,
          selectedJarData.spent,
          selectedLimit,
          selectedTarget,
          selectedJarData.budget
        );

        return (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Detalhamento dos Lançamentos & Metas</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedJarData.colorHex }} />
                  {selectedJarData.name} ({selectedJarTransactions.length} lançamentos)
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onOpenLimitsModal && (
                  <button
                    onClick={onOpenLimitsModal}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Ajustar Teto ou Meta</span>
                  </button>
                )}
                <button
                  onClick={() => onFilterJarInAgenda(selectedJarData.id)}
                  className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver na Agenda</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Banner de Metas e Economia do Pote Selecionado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Gasto Líquido no Mês</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{formatBRL(selectedJarData.spent)}</span>
                <span className="text-[10px] text-slate-500 block">Teto Máximo: {formatBRL(selectedLimit)}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">Meta de Economia</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(selectedTarget)}</span>
                <span className="text-[10px] text-slate-500 block">Economia Real: {formatBRL(selectedSavings.currentSavings)}</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Progresso da Meta</span>
                  <span className={selectedSavings.isTargetReached ? 'text-emerald-600 font-black' : 'text-amber-600 font-bold'}>
                    {selectedSavings.isTargetReached ? 'Meta Batida 🎉' : `Faltam ${formatBRL(selectedSavings.remainingToTarget)}`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${Math.min(100, selectedSavings.progressPercent)}%` }}
                  />
                </div>
              </div>
            </div>


          {/* Lançamentos do Pote */}
          {selectedJarTransactions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhum gasto registrado neste pote ainda este mês.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedJarTransactions.map(tx => {
                const isPositive = tx.type === 'receita' || tx.type === 'reembolso';
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 text-[11px]">{tx.date}</span>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{tx.description}</span>
                        <div className="text-[10px] text-slate-400">
                          {tx.account} • {tx.costCenter}
                        </div>
                      </div>
                    </div>
                    <span className={`font-black ${isPositive ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
                      {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })()}

    </div>
  );
};
