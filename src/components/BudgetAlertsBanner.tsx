import React, { useState } from 'react';
import { 
  AlertTriangle, AlertOctagon, CheckCircle2, Sliders, 
  ChevronRight, ChevronDown, ChevronUp, ArrowRight, X, ShieldAlert
} from 'lucide-react';
import { JarBudgetAlert } from '../types';
import { formatBRL } from '../utils/finance';
import { useMobileLayout } from '../context/MobileContext';

interface BudgetAlertsBannerProps {
  alerts: JarBudgetAlert[];
  onOpenLimitsModal: () => void;
  onNavigateToPotes: () => void;
}

export const BudgetAlertsBanner: React.FC<BudgetAlertsBannerProps> = ({
  alerts,
  onOpenLimitsModal,
  onNavigateToPotes
}) => {
  const { isMobile } = useMobileLayout();
  const [isMinimized, setIsMinimized] = useState(false);

  // Filter alerts that reached 80% or exceeded 100%
  const activeAlerts = alerts.filter(a => a.status === 'WARNING' || a.status === 'EXCEEDED');
  const hasExceeded = activeAlerts.some(a => a.status === 'EXCEEDED');

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-emerald-500/10 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-600 text-white shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Orçamento Sob Controle
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block sm:inline sm:ml-1.5">
              Todos os potes estão abaixo de 80% do limite máximo definido.
            </span>
          </div>
        </div>

        <button
          onClick={onOpenLimitsModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 font-bold text-[11px] transition cursor-pointer shrink-0"
        >
          <Sliders className="w-3 h-3 text-emerald-600" />
          <span>Configurar Limites</span>
        </button>
      </div>
    );
  }

  // Minimized compact strip
  if (isMinimized) {
    return (
      <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs transition ${
        hasExceeded 
          ? 'bg-rose-500/10 border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200' 
          : 'bg-amber-500/10 border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          {hasExceeded ? (
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-black">
            {hasExceeded ? 'Limite Ultrapassado!' : 'Alerta de Orçamento (80%+):'}
          </span>
          <span className="text-[11px]">
            {activeAlerts.length} pote(s) com gastos em nível de atenção
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800 font-bold text-[10px] hover:bg-white transition cursor-pointer"
          >
            <span>Ver Alertas</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Full Expanded Banner
  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-all duration-200 ${
      hasExceeded
        ? 'bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-transparent border-rose-300 dark:border-rose-900/80'
        : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-300 dark:border-amber-900/80'
    }`}>
      {/* Banner Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
            hasExceeded ? 'bg-rose-600' : 'bg-amber-500'
          }`}>
            {hasExceeded ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`font-black text-sm sm:text-base ${
                hasExceeded ? 'text-rose-950 dark:text-rose-200' : 'text-amber-950 dark:text-amber-200'
              }`}>
                {hasExceeded 
                  ? 'Atenção Crítica: Limite de Gastos Ultrapassado!' 
                  : 'Alerta de Orçamento: Consumo Acima de 80%!'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                hasExceeded 
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
              }`}>
                {activeAlerts.length} {activeAlerts.length === 1 ? 'pote em alerta' : 'potes em alerta'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {hasExceeded
                ? 'Um ou mais potes excederam 100% do teto definido. Acompanhe os desvios para não comprometer o fechamento do mês.'
                : 'Os gastos nestes potes atingiram a faixa de segurança de 80%. Modere as despesas restantes para não estourar.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          title="Minimizar alerta temporariamente"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Alert Cards - 1 col on mobile / mobile frame */}
      <div className={`grid gap-3 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
        {activeAlerts.map(alert => {
          const isExceededItem = alert.status === 'EXCEEDED';
          return (
            <div
              key={alert.jarId}
              className={`p-3.5 rounded-2xl border bg-white/90 dark:bg-slate-900/90 space-y-2.5 transition min-w-0 ${
                isExceededItem 
                  ? 'border-rose-300 dark:border-rose-800/80 shadow-xs' 
                  : 'border-amber-300 dark:border-amber-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: alert.colorHex }} 
                  />
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {alert.jarName}
                  </span>
                </div>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                  isExceededItem 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {alert.usagePercent.toFixed(1)}%
                </span>
              </div>

              {/* Progress visual with 80% mark */}
              <div className="space-y-1">
                <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" 
                    style={{ left: '80%' }}
                    title="Marca de 80%"
                  />
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceededItem ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, alert.usagePercent)}%` }}
                  />
                </div>
              </div>

              {/* Numbers - cleanly stacked to avoid collisions */}
              <div className="flex items-baseline justify-between text-[11px] gap-2 pt-0.5 flex-wrap min-w-0">
                <div className="text-slate-500 dark:text-slate-400 min-w-0 truncate">
                  <span>Gasto: </span>
                  <strong className="text-slate-800 dark:text-slate-200">{formatBRL(alert.spent)}</strong>
                  <span className="text-slate-400 text-[10px]"> / {formatBRL(alert.limit)}</span>
                </div>
                <div className={`font-bold shrink-0 text-right ${isExceededItem ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {isExceededItem 
                    ? `+${formatBRL(Math.abs(alert.remaining))} acima` 
                    : `Restam ${formatBRL(alert.remaining)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
          💡 Os alertas consideram despesas lançadas deduzidas de reembolsos.
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenLimitsModal}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold transition cursor-pointer text-xs shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>Ajustar Limites</span>
          </button>

          <button
            onClick={onNavigateToPotes}
            className={`flex-1 sm:flex-initial justify-center flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-black transition cursor-pointer text-xs shadow-2xs ${
              hasExceeded
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            <span>Ver Detalhes nos 6 Potes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
