import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingDown, Layers, AlertTriangle, Calendar, ArrowRight, 
  ShieldAlert, DollarSign, CheckCircle2, Filter, Sparkles, 
  Percent, ChevronRight, HelpCircle, Check, X, CreditCard, Building
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  detectCommitmentsFromTransactions, 
  calculateCashFlowDebtImpact, 
  DetectedCommitment,
  CommitmentType
} from '../utils/installmentsAndInterest';
import { formatBRL } from '../utils/finance';

interface CashFlowDebtImpactCardProps {
  transactions: Transaction[];
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
}

export const CashFlowDebtImpactCard: React.FC<CashFlowDebtImpactCardProps> = ({
  transactions,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen
}) => {
  // 1. Detect all commitments automatically from transactions
  const detectedCommitments = useMemo(() => {
    return detectCommitmentsFromTransactions(transactions);
  }, [transactions]);

  // Selected item IDs for projection (all checked by default)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(detectedCommitments.map(c => c.id));
  });

  // Keep selectedIds in sync if transactions change
  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const item of detectedCommitments) {
        // preserve existing selection, or default to checked
        if (prev.size === 0 || prev.has(item.id)) {
          next.add(item.id);
        }
      }
      return next.size > 0 ? next : new Set(detectedCommitments.map(c => c.id));
    });
  }, [detectedCommitments]);

  // Filter tab: 'all' | 'juros' | 'parcelamento'
  const [activeFilter, setActiveFilter] = useState<'all' | CommitmentType>('all');
  
  // Quick toggle: "Eliminar Juros" simulation
  const [isZeroInterestSimulated, setIsZeroInterestSimulated] = useState(false);

  // Filtered list based on category tab
  const filteredCommitments = useMemo(() => {
    if (activeFilter === 'all') return detectedCommitments;
    return detectedCommitments.filter(c => c.type === activeFilter);
  }, [detectedCommitments, activeFilter]);

  // Active selection for calculation
  const effectiveSelectedIds = useMemo(() => {
    if (!isZeroInterestSimulated) {
      return selectedIds;
    }
    // In zero-interest simulation, deselect all juros
    const set = new Set<string>();
    for (const item of detectedCommitments) {
      if (item.type !== 'juros' && selectedIds.has(item.id)) {
        set.add(item.id);
      }
    }
    return set;
  }, [isZeroInterestSimulated, selectedIds, detectedCommitments]);

  // Compute 3-Month Projection Impact
  const impactSummary = useMemo(() => {
    return calculateCashFlowDebtImpact(
      detectedCommitments,
      effectiveSelectedIds,
      '2026-10-15'
    );
  }, [detectedCommitments, effectiveSelectedIds]);

  // Baseline calculation (with all detected items) to show potential savings
  const baselineSummary = useMemo(() => {
    return calculateCashFlowDebtImpact(
      detectedCommitments,
      new Set(detectedCommitments.map(c => c.id)),
      '2026-10-15'
    );
  }, [detectedCommitments]);

  // Savings realized compared to baseline
  const realizedSavings3M = Math.max(0, baselineSummary.cumulative3MonthsTotal - impactSummary.cumulative3MonthsTotal);

  // Toggle item selection
  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(detectedCommitments.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const jurosCount = detectedCommitments.filter(c => c.type === 'juros').length;
  const parcelasCount = detectedCommitments.filter(c => c.type === 'parcelamento').length;

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm transition hover:shadow-md border-rose-200/80 dark:border-rose-900/60 relative overflow-hidden`}
      data-testid="cashflow-debt-impact-card"
    >
      {/* Decorative top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Impacto de Parcelamentos & Juros no Fluxo de Caixa
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                Projeção 3 Meses
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identificação automática de encargos e parcelas com cálculo acumulado do impacto no fluxo dos próximos 90 dias.
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-rose-500" />
            <span>{detectedCommitments.length} detectados</span>
          </span>
        </div>
      </div>

      {/* Top 3 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* KPI 1: Dreno Mensal */}
        <div 
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1"
          data-testid="metric-monthly-drain"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Comprometimento Mensal</span>
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatBRL(impactSummary.totalMonthlyDrain)}
            <span className="text-xs font-semibold text-slate-400 block sm:inline sm:ml-1">/mês</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Parcelas: {formatBRL(impactSummary.monthlyInstallments)} • Juros: {formatBRL(impactSummary.monthlyInterest)}
          </p>
        </div>

        {/* KPI 2: Impacto Acumulado 3 Meses */}
        <div 
          className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1 relative overflow-hidden"
          data-testid="metric-cumulative-3m"
        >
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold">
            <span>Dreno Acumulado (90 Dias)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
            {formatBRL(impactSummary.cumulative3MonthsTotal)}
          </div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
            Saída total somada de Mês 1 + Mês 2 + Mês 3
          </p>
        </div>

        {/* KPI 3: Juros Evitáveis / Economia Potencial */}
        <div 
          className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1"
          data-testid="metric-avoidable-interest"
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-semibold">
            <span>Juros & Encargos (3 Meses)</span>
            <Percent className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">
            {formatBRL(impactSummary.cumulative3MonthsInterest)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span>{impactSummary.interestSharePct}% do total drenado é pura taxa</span>
          </div>
        </div>
      </div>

      {/* 3-Month Projection Progression Timeline */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/60 dark:from-slate-800/40 dark:via-slate-800/30 dark:to-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Evolução do Fluxo de Caixa Mês a Mês</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Projeção cronológica com total do mês e saldo acumulado que deixa de sobrar para investimentos
            </p>
          </div>

          {/* Quick Simulation Toggle */}
          <button
            type="button"
            onClick={() => setIsZeroInterestSimulated(!isZeroInterestSimulated)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isZeroInterestSimulated
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-emerald-400'
            }`}
            data-testid="btn-toggle-zero-interest"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isZeroInterestSimulated ? 'Simulação: Juros Zerados ✅' : 'Simular Eliminação de Juros'}</span>
          </button>
        </div>

        {/* 3 Month Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {impactSummary.projections.map((p, idx) => {
            const maxCumulative = impactSummary.cumulative3MonthsTotal || 1;
            const progressPct = Math.min(100, Math.round((p.cumulativeTotal / maxCumulative) * 100));

            return (
              <div
                key={p.monthKey}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2 relative"
                data-testid={`card-projection-month-${p.monthIndex}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {p.monthShortLabel}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {p.monthLabel}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Impacto do Mês:</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      -{formatBRL(p.monthTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[10px] text-slate-400">
                    <span>Parcelas: {formatBRL(p.installmentsAmount)}</span>
                    <span>Juros: {formatBRL(p.interestAmount)}</span>
                  </div>
                </div>

                {/* Cumulative bar */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Acumulado até aqui:</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      -{formatBRL(p.cumulativeTotal)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Realized / Potential Savings Message */}
        {isZeroInterestSimulated && realizedSavings3M > 0 && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>Economia Imediata:</strong> Ao estancar os juros, você poupa <strong>+{formatBRL(realizedSavings3M)}</strong> nos próximos 3 meses!
              </span>
            </div>
            {onNavigateToScreen && (
              <button
                type="button"
                onClick={() => onNavigateToScreen('sonhos')}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
              >
                Ver Sonhos & Aportes →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Identified Commitments Detailed List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              Compromissos Identificados no Histórico
            </h4>
            <span className="text-[11px] text-slate-400">
              ({filteredCommitments.length} de {detectedCommitments.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Filter Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                data-testid="filter-tab-all"
              >
                Todos ({detectedCommitments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('juros')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeFilter === 'juros'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                data-testid="filter-tab-juros"
              >
                Juros ({jurosCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('parcelamento')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  activeFilter === 'parcelamento'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                data-testid="filter-tab-parcelas"
              >
                Parcelas ({parcelasCount})
              </button>
            </div>

            {/* Quick Bulk Select */}
            <button
              type="button"
              onClick={selectedIds.size === detectedCommitments.length ? handleDeselectAll : handleSelectAll}
              className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold ml-1 cursor-pointer"
              data-testid="btn-toggle-bulk-select"
            >
              {selectedIds.size === detectedCommitments.length ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
          </div>
        </div>

        {/* Commitments Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredCommitments.map(item => {
            const isChecked = selectedIds.has(item.id);
            const isJuros = item.type === 'juros';
            const threeMonthImpact = item.amount * 3;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 relative ${
                  isChecked
                    ? isJuros
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/80 shadow-xs'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-900/80 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-60'
                }`}
                data-testid={`commitment-card-${item.id}`}
              >
                {/* Custom Checkbox */}
                <div 
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isChecked
                      ? isJuros ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.description}
                    </span>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 shrink-0">
                      -{formatBRL(item.amount)}<span className="text-[10px] font-normal text-slate-400">/mês</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isJuros 
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' 
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {isJuros ? '⚠️ Juros / Encargos' : '💳 Parcela'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Conta {item.account}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {item.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="italic truncate max-w-[200px]">
                      {item.matchReason}
                    </span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      3 Meses: -{formatBRL(threeMonthImpact)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic Callout & Next Steps */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500 text-white font-bold text-[10px] shrink-0 mt-0.5">
            DICA
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-white block">
              Estratégia Anti-Dreno de Caixa Yupee
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Juros de cheque especial (R$ 140/mês) representam <strong>R$ 1.680/ano</strong> drenados. Priorizar sua quitação desbloqueia caixa imediato para turbinar os 6 Potes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToScreen && (
            <button
              type="button"
              onClick={() => onNavigateToScreen('agenda')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition cursor-pointer flex items-center gap-1"
              data-testid="btn-view-agenda-debt"
            >
              <span>Ver Agenda Diária</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
