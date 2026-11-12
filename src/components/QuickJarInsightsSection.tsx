import React, { useState, useMemo } from 'react';
import { 
  Sparkles, RefreshCw, ArrowRight, ShieldCheck, CheckCircle2, 
  TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Layers, RotateCcw, Check, ChevronRight, Info, Zap, DollarSign
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { DEFAULT_JAR_LIMITS } from '../utils/budgetAlerts';
import { 
  generateJarReallocationInsights, 
  ReallocationProposal, 
  QuickReallocationSummary 
} from '../utils/quickReallocationInsights';

interface QuickJarInsightsSectionProps {
  transactions: Transaction[];
  jarLimits?: Record<JarType, number>;
  onSaveLimits?: (newLimits: Record<JarType, number>) => void;
  usePjProfitInPf?: boolean;
  onNavigateToScreen?: (screen: string) => void;
  themeCardClass?: string;
}

export const QuickJarInsightsSection: React.FC<QuickJarInsightsSectionProps> = ({
  transactions,
  jarLimits,
  onSaveLimits,
  usePjProfitInPf = true,
  onNavigateToScreen,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string>('prop-reserva-emergencia');
  const [appliedProposalId, setAppliedProposalId] = useState<string | null>(null);
  const [previousLimits, setPreviousLimits] = useState<Record<JarType, number> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate insights
  const insights: QuickReallocationSummary = useMemo(() => {
    return generateJarReallocationInsights({
      transactions,
      jarLimits,
      usePjProfitInPf
    });
  }, [transactions, jarLimits, usePjProfitInPf]);

  const activeProposal = useMemo(() => {
    return insights.proposals.find(p => p.id === selectedProposalId) || insights.bestProposal;
  }, [insights.proposals, insights.bestProposal, selectedProposalId]);

  // Handle applying the reallocation proposal
  const handleApplyProposal = (proposal: ReallocationProposal) => {
    if (!onSaveLimits) return;
    if (jarLimits) {
      setPreviousLimits({ ...jarLimits });
    }
    onSaveLimits(proposal.proposedLimits);
    setAppliedProposalId(proposal.id);
    setToastMessage(`Realocação aplicada! Novos limites salvos nos 6 Potes.`);

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Handle undoing the reallocation
  const handleUndo = () => {
    if (!onSaveLimits || !previousLimits) return;
    onSaveLimits(previousLimits);
    setAppliedProposalId(null);
    setPreviousLimits(null);
    setToastMessage('Realocação revertida aos limites anteriores.');

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl shadow-sm space-y-5 relative overflow-hidden`}
      data-testid="quick-insights-reallocation-card"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full pointer-events-none -mr-20 -mt-20 blur-2xl" />

      {/* 1. Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Insights Rápidos: Realocação dos 6 Potes
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Últimos 30 Dias
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Análise do saldo atual e histórico recente de gastos. Realoque verba ociosa de potes subutilizados para acelerar sua Reserva ou cobrir despesas prioritárias.
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Atual</span>
            <span className={`text-xs font-black font-mono ${
              insights.currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {insights.currentBalance >= 0 ? '+' : ''}{formatBRL(insights.currentBalance)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Verba Ociosa</span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono" data-testid="kpi-total-surplus-available">
              {formatBRL(insights.totalSurplusAvailable)}
            </span>
          </div>
        </div>
      </div>

      {/* Success / Undo Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          {previousLimits && (
            <button
              type="button"
              onClick={handleUndo}
              className="text-[11px] font-bold underline hover:opacity-80 cursor-pointer ml-3 shrink-0"
              data-testid="btn-desfazer-realocacao"
            >
              Desfazer alteração
            </button>
          )}
        </div>
      )}

      {/* 2. Diagnóstico Rápido dos Potes (Subutilizados vs Em Alerta) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        
        {/* Potes Subutilizados / Superavitários */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Potes Subutilizados (Verba Ociosa)
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              +{formatBRL(insights.totalSurplusAvailable)} livres
            </span>
          </div>

          <div className="space-y-1.5">
            {insights.underutilizedJars.length > 0 ? (
              insights.underutilizedJars.map(j => (
                <div key={j.jarId} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: j.colorHex }} />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{j.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {j.usageRatio}% consumido
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      +{formatBRL(j.surplus)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">sobra do teto</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Nenhum pote com subutilização excessiva no período.
              </div>
            )}
          </div>
        </div>

        {/* Potes em Alerta ou com Demanda de Caixa */}
        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Potes com Alta Pressão / Estouro
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
              {formatBRL(insights.totalDeficit)} acima do teto
            </span>
          </div>

          <div className="space-y-1.5">
            {insights.overspentJars.length > 0 ? (
              insights.overspentJars.map(j => (
                <div key={j.jarId} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: j.colorHex }} />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{j.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                      {j.usageRatio}% usado
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-rose-600 dark:text-rose-400 font-mono">
                      +{formatBRL(j.deficit)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">excedente</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Todos os potes dentro do orçamento planejado!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Seletor de Cenários de Realocação */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            Escolha uma Estratégia de Realocação:
          </span>
          {onNavigateToScreen && (
            <button
              type="button"
              onClick={() => onNavigateToScreen('potes')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos os 6 Potes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Proposal Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {insights.proposals.map(prop => {
            const isSelected = selectedProposalId === prop.id;
            const isApplied = appliedProposalId === prop.id;

            return (
              <button
                key={prop.id}
                type="button"
                onClick={() => setSelectedProposalId(prop.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                  isSelected 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
                data-testid={`btn-select-scenario-${prop.id}`}
              >
                <span>{prop.badge}</span>
                {isApplied && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cenário ativo no momento" />
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Cartão da Proposta Ativa */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/50 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-700 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${activeProposal.badgeColor}`}>
                  {activeProposal.badge}
                </span>
                <span className="text-xs text-slate-400">
                  Total a Realocar: <strong className="text-slate-900 dark:text-white font-mono">{formatBRL(activeProposal.totalTransferred)}</strong>
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                {activeProposal.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeProposal.subtitle}
              </p>
            </div>

            {/* Apply Button */}
            <div className="shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleApplyProposal(activeProposal)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer ${
                  appliedProposalId === activeProposal.id
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
                data-testid="btn-aplicar-realocacao"
              >
                {appliedProposalId === activeProposal.id ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Realocação Aplicada ✅</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Aplicar Realocação aos Potes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rota de Transferência (Origens -> Destino) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Movimentação Proposta entre Potes:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeProposal.transfers.map((tr, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {tr.fromJarName} (-{formatBRL(tr.amount)})
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {tr.toJarName} (+{formatBRL(tr.amount)})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {tr.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Justificativa e Impacto */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Por que esta realocação é recomendada?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {activeProposal.rationale}
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
              💡 {activeProposal.impactDescription}
            </p>
          </div>

          {/* Comparativo de Tetos Antes vs Depois */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Simulação dos Novos Limites após Aplicação:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              {(['NEC_55', 'DIV_10', 'PLP_10', 'LIF_10', 'EDU_10', 'FER_5'] as JarType[]).map(jId => {
                const def = JAR_DEFINITIONS[jId];
                const oldVal = jarLimits?.[jId] ?? DEFAULT_JAR_LIMITS[jId];
                const newVal = activeProposal.proposedLimits[jId];
                const diff = newVal - oldVal;

                return (
                  <div key={jId} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 block truncate">
                      {def?.shortName || jId}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5">
                      {formatBRL(newVal)}
                    </span>
                    {diff !== 0 ? (
                      <span className={`text-[9px] font-bold block ${
                        diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {diff > 0 ? `+${formatBRL(diff)}` : formatBRL(diff)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 block">Mantido</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
