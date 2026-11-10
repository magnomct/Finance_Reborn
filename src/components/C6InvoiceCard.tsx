import React, { useState } from 'react';
import { 
  CreditCard, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle2, Info, ChevronDown, ChevronUp, ArrowRight,
  Calendar, ShieldAlert
} from 'lucide-react';
import { Transaction } from '../types';
import { analyzeC6InvoiceComparison, C6InvoiceAnalysis } from '../utils/c6InvoiceAnalysis';
import { formatBRL } from '../utils/finance';

interface C6InvoiceCardProps {
  transactions: Transaction[];
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
}

export const C6InvoiceCard: React.FC<C6InvoiceCardProps> = ({
  transactions,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const analysis: C6InvoiceAnalysis = analyzeC6InvoiceComparison({
    transactions,
    referenceDate: '2026-10-27',
  });

  const {
    currentInvoiceAmount,
    last3MonthsAverage,
    last3Months,
    differenceAmount,
    differencePercentage,
    isAboveTrend,
    trendStatus,
    alertTitle,
    alertDescription,
    recommendation,
    closingDay,
    isClosed
  } = analysis;

  // Determine badge styling based on trend status
  const badgeConfig = {
    alerta: {
      bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      tag: 'Acima da Tendência',
      tagBg: 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200',
    },
    atencao: {
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      tag: 'Leve Alta',
      tagBg: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
    },
    dentro_da_media: {
      bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
      tag: 'Dentro da Média',
      tagBg: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    },
    abaixo_da_media: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      tag: 'Economia Registrada',
      tagBg: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    },
  }[trendStatus];

  return (
    <div 
      className={`${themeCardClass} p-5 rounded-3xl space-y-3.5 shadow-sm transition hover:shadow-md border-purple-200/80 dark:border-purple-900/60 relative overflow-hidden`}
      data-testid="card-c6-invoice-analysis"
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-rose-500" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
          <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
              Cartão C6 Concentrador
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3" />
              {isClosed ? `Fatura Fechada (Dia ${closingDay})` : `Fechamento no Dia ${closingDay}`}
            </span>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeConfig.tagBg}`}>
          {badgeConfig.tag}
        </span>
      </div>

      {/* Main Figures: Current Invoice vs 3M Average */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
            Fatura Atual Fechada
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatBRL(currentInvoiceAmount)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Necessidades (R$ 2.000) + Lazer (R$ 600)
          </span>
        </div>

        <div className="border-l border-slate-100 dark:border-slate-800 pl-3">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
            Média dos Últimos 3 Meses
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300">
              {formatBRL(last3MonthsAverage)}
            </span>
            <span className={`text-xs font-black flex items-center ${
              isAboveTrend ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {isAboveTrend ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
              {differencePercentage >= 0 ? `+${differencePercentage}%` : `${differencePercentage}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {last3Months.map(m => m.monthName.slice(0, 3)).join(' • ')}
          </span>
        </div>
      </div>

      {/* Análise Rápida & Alerta de Tendência */}
      <div className={`p-3 rounded-2xl border ${badgeConfig.bg} text-xs space-y-1.5`} data-testid="alert-c6-trend">
        <div className="flex items-center gap-2">
          {badgeConfig.icon}
          <strong className="font-extrabold text-xs">
            {alertTitle}
          </strong>
        </div>
        <p className="text-[11px] leading-relaxed opacity-95">
          {alertDescription}
        </p>
        <div className="pt-1 text-[11px] font-medium border-t border-current/10">
          💡 <strong>Dica prática:</strong> {recommendation}
        </div>
      </div>

      {/* Accordion Toggle: Detalhamento dos Últimos 3 Meses */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-1 transition cursor-pointer"
          data-testid="btn-toggle-c6-history"
        >
          <span>Comparativo mensal detalhado (Últimos 3 meses)</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs animate-in fade-in duration-150">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
              Histórico de Fechamento do Cartão C6
            </span>
            <div className="space-y-1.5">
              {last3Months.map(item => (
                <div key={item.monthName} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{item.monthName}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatBRL(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold">
                <span className="text-slate-500">Média (3 Meses):</span>
                <span className="text-purple-600 dark:text-purple-400">{formatBRL(last3MonthsAverage)}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-700 dark:text-slate-200">Fatura Atual (Outubro):</span>
                <span className={isAboveTrend ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {formatBRL(currentInvoiceAmount)} ({differencePercentage >= 0 ? `+${differencePercentage}%` : `${differencePercentage}%`})
                </span>
              </div>
            </div>

            {onNavigateToScreen && (
              <button
                type="button"
                onClick={() => onNavigateToScreen('extratos')}
                className="w-full mt-2 py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ver lançamentos do Cartão C6 no Extrato</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
