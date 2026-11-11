import React, { useState, useMemo } from 'react';
import { 
  Brain, Clock, ShieldAlert, ShieldCheck, Moon, Sun, 
  CloudSun, Sparkles, ChevronDown, ChevronUp, Lock, 
  Unlock, CheckCircle2, AlertTriangle, ArrowRight, 
  Flame, Zap, Coffee, HelpCircle, Eye
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateBehavioralAnalysis, 
  extractTransactionHour, 
  getTimePeriodFromHour,
  DayPeriodType 
} from '../utils/behavioralAnalysis';

interface BehavioralAnalysisCardProps {
  transactions: Transaction[];
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
}

export const BehavioralAnalysisCard: React.FC<BehavioralAnalysisCardProps> = ({
  transactions,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen
}) => {
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<DayPeriodType>('noite');
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isLockoutActive, setIsLockoutActive] = useState<boolean>(true);
  
  // Interactive mental guardrail checklist
  const [completedGuardrails, setCompletedGuardrails] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: true
  });

  const analysis = useMemo(() => {
    return calculateBehavioralAnalysis(transactions);
  }, [transactions]);

  // Set default tab to the actual detected peak period
  useMemo(() => {
    if (analysis.peakPeriod) {
      setSelectedPeriodTab(analysis.peakPeriod.period);
    }
  }, [analysis.peakPeriod]);

  const toggleGuardrail = (idx: number) => {
    setCompletedGuardrails(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const completedCount = Object.values(completedGuardrails).filter(Boolean).length;
  const totalGuardrails = analysis.mentalLockout.guardrails.length;

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm border border-slate-200/90 dark:border-slate-800 relative overflow-hidden`}
      data-testid="behavioral-analysis-card"
    >
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/5 via-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-500/20 shrink-0">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Análise Comportamental: Gastos de Lazer</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Horários do Dia
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cruzamento de horários (Manhã, Tarde, Noite) para identificar compras impulsivas e horários de bloqueio mental.
            </p>
          </div>
        </div>

        {/* Lockout Status Badge */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setIsLockoutActive(!isLockoutActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isLockoutActive 
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            data-testid="btn-toggle-lockout-mode"
            title="Alternar ativação do protocolo de bloqueio mental"
          >
            {isLockoutActive ? (
              <>
                <Lock className="w-3.5 h-3.5 text-purple-200" />
                <span>Bloqueio Ativo</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span>Bloqueio Pausado</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {/* Peak Impulse Period */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              Período Mais Impulsivo
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black">
              {analysis.peakPeriod.percentage}% do Lazer
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100">
            {analysis.peakPeriod.label}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {analysis.peakPeriod.timeRange}
          </div>
        </div>

        {/* Suggested Mental Lockout Window */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
              Bloqueio Mental Sugerido
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black">
              Recomendado
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-100" data-testid="mental-lockout-window">
            {analysis.mentalLockout.recommendedWindow}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Janela de maior vulnerabilidade
          </div>
        </div>

        {/* Potential Monthly Savings */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Economia Estimada / Mês
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black">
              +40% Blindado
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-300" data-testid="potential-savings-month">
            {formatBRL(analysis.mentalLockout.potentialMonthlySavings)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            +{formatBRL(analysis.mentalLockout.annualSavings)} / ano
          </div>
        </div>

        {/* Total Leisure Volume */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Lazer Analisado
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {analysis.transactionCount} lançamento(s)
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatBRL(analysis.totalLeisureSpent)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Ticket Médio Pico: {formatBRL(analysis.peakPeriod.averageTicket)}
          </div>
        </div>
      </div>

      {/* Visual Period Distribution Breakdown */}
      <div className="space-y-2.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Distribuição por Horário do Dia
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">
              (Manhã 06-12h • Tarde 12-18h • Noite 18-06h)
            </span>
          </div>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
            {analysis.peakPeriod.label} concentra {analysis.peakPeriod.percentage}%
          </span>
        </div>

        {/* Segmented Progress Bar */}
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
          {analysis.periodsList.map((stat) => {
            const width = Math.max(stat.percentage, stat.totalAmount > 0 ? 5 : 0);
            if (width === 0) return null;
            
            let color = 'bg-amber-400';
            if (stat.period === 'tarde') color = 'bg-cyan-500';
            if (stat.period === 'noite') color = 'bg-gradient-to-r from-purple-600 to-indigo-600';

            return (
              <div
                key={stat.period}
                style={{ width: `${width}%` }}
                className={`${color} h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group`}
                title={`${stat.label}: ${formatBRL(stat.totalAmount)} (${stat.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Period Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {analysis.periodsList.map((stat) => {
            const isSelected = selectedPeriodTab === stat.period;
            let IconComponent = Moon;
            if (stat.period === 'manha') IconComponent = Sun;
            if (stat.period === 'tarde') IconComponent = CloudSun;

            return (
              <button
                key={stat.period}
                type="button"
                onClick={() => setSelectedPeriodTab(stat.period)}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2.5 relative ${
                  isSelected 
                    ? 'ring-2 ring-purple-500 border-purple-500/80 bg-purple-50/40 dark:bg-purple-950/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40'
                }`}
                data-testid={`period-card-${stat.period}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl text-white bg-gradient-to-tr ${stat.colorClass} shadow-sm`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs sm:text-sm text-slate-800 dark:text-white block">
                        {stat.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {stat.timeRange}
                      </span>
                    </div>
                  </div>

                  {stat.isPeak && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-rose-500" />
                      Pico
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {formatBRL(stat.totalAmount)}
                  </span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {stat.percentage}% do total
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{stat.transactionCount} compra(s)</span>
                  <span>Média: {formatBRL(stat.averageTicket)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Mental Lockout Protocol Box */}
      <div 
        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-purple-950/70 to-slate-900 text-white border border-indigo-800/60 shadow-md relative overflow-hidden space-y-4"
        data-testid="mental-lockout-protocol-section"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide text-indigo-100">
                  Protocolo de Bloqueio Mental Sugerido
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  {analysis.mentalLockout.recommendedWindow}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Blindagem comportamental baseada na ciência da fadiga decisória e dopamina.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-300">
              Blindagem: {completedCount}/{totalGuardrails} ativada(s)
            </span>
          </div>
        </div>

        {/* Neurofinancial Reason Banner */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
          <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Gatilho Comportamental: {analysis.mentalLockout.neuroTrigger}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {analysis.mentalLockout.reason}
          </p>
        </div>

        {/* Interactive Cognitive Guardrails Checklist */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-300">
            Regras de Blindagem no Horário Crítico ({analysis.mentalLockout.recommendedWindow}):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {analysis.mentalLockout.guardrails.map((rule, idx) => {
              const isChecked = Boolean(completedGuardrails[idx]);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleGuardrail(idx)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    isChecked
                      ? 'bg-indigo-900/40 border-indigo-500/60 text-white'
                      : 'bg-black/20 border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                  data-testid={`guardrail-item-${idx}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-500" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-white">
                      {rule.title}
                    </span>
                    <span className="text-[11px] text-slate-300/80 block leading-tight">
                      {rule.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Immediate Savings Impact Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Ao segurar o ímpeto no horário crítico, você retém cerca de <strong>{formatBRL(analysis.mentalLockout.potentialMonthlySavings)}</strong> por mês no seu bolso.
            </span>
          </div>

          {onNavigateToScreen && (
            <button
              onClick={() => onNavigateToScreen('potes')}
              className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1 shrink-0 self-end sm:self-center"
            >
              <span>Ver Pote de Lazer (10%)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion: Detailed Transaction List by Period */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          data-testid="btn-toggle-behavioral-details"
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-500" />
            <span>Ver Lançamentos de Lazer Analisados por Horário ({analysis.transactionCount})</span>
          </span>
          {isDetailsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isDetailsOpen && (
          <div className="mt-3 space-y-2.5 animate-fadeIn" data-testid="behavioral-details-list">
            {analysis.periods[selectedPeriodTab].transactions.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                Nenhum lançamento registrado no período da {analysis.periods[selectedPeriodTab].label}. Selecione outro período acima para auditar os dados.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Compras do Período da {analysis.periods[selectedPeriodTab].label} ({analysis.periods[selectedPeriodTab].timeRange}):
                </div>
                {analysis.periods[selectedPeriodTab].transactions.map((tx) => {
                  const hour = extractTransactionHour(tx);
                  const hourFormatted = tx.time || `${hour.toString().padStart(2, '0')}:00`;
                  const isPeakHour = hour >= 20 && hour <= 23;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                      data-testid={`behavioral-tx-${tx.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                          {hourFormatted}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-white block truncate">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {tx.date} • {tx.account} • {tx.category || 'Lazer'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm block">
                          -{formatBRL(Math.abs(tx.amount))}
                        </span>
                        {isPeakHour && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Horário Crítico
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
