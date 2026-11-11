import React, { useState, useMemo } from 'react';
import { 
  Scissors, Sparkles, TrendingDown, DollarSign, Calendar, 
  ArrowRight, ShieldCheck, PieChart, ChevronDown, ChevronUp,
  Percent, Coffee, Zap, CheckCircle2, PiggyBank, Target
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateLeisureVariableAnalysis 
} from '../utils/leisureVariableAnalysis';

interface LeisureVariableSavingsCardProps {
  transactions: Transaction[];
  themeCardClass?: string;
  onNavigateToScreen?: (screen: string) => void;
}

export const LeisureVariableSavingsCard: React.FC<LeisureVariableSavingsCardProps> = ({
  transactions,
  themeCardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
  onNavigateToScreen
}) => {
  const [selectedPercent, setSelectedPercent] = useState<number>(20); // 20% recommended default
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  const analysis = useMemo(() => {
    return calculateLeisureVariableAnalysis(transactions, selectedPercent);
  }, [transactions, selectedPercent]);

  const handleApplyCut = (percent: number) => {
    setSelectedPercent(percent);
    setAppliedFeedback(`Corte de ${percent}% selecionado: economia estimada de ${formatBRL((analysis.dailyAverage * (percent / 100)) * 30)}/mês!`);
    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  return (
    <div 
      className={`${themeCardClass} p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm border border-slate-200/90 dark:border-slate-800 relative overflow-hidden`}
      data-testid="leisure-variable-savings-card"
    >
      {/* Glow decorativo de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header com Ícone e Identificação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shrink-0">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Otimização de Lazer & Gastos Variáveis</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Últimos 30 Dias
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise dos gastos com Lazer, Saídas e Gastos Variáveis com sugestão de corte diário e projeção de economia real em R$.
            </p>
          </div>
        </div>

        {analysis.hasData && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <span className="text-xs font-bold text-slate-400">Janela:</span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
              {analysis.startDateStr} a {analysis.endDateStr}
            </span>
          </div>
        )}
      </div>

      {/* Feedback de Notificação Temporária */}
      {appliedFeedback && (
        <div 
          className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-900 dark:text-emerald-100 text-xs font-semibold animate-in fade-in"
          data-testid="leisure-savings-feedback"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{appliedFeedback}</span>
        </div>
      )}

      {/* Métricas Principais: Gastos 30d, Média Diária, Corte Sugerido e Economia em R$ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {/* Total Gasto em Lazer / Variável */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Total Lazer & Variável (30d)
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white" data-testid="leisure-total-spent">
              {formatBRL(analysis.totalSpent)}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {analysis.transactionCount} {analysis.transactionCount === 1 ? 'lançamento identificado' : 'lançamentos identificados'}
          </span>
        </div>

        {/* Média de Gastos Diários */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block mb-0.5">
              Média de Gastos Diários
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300" data-testid="leisure-daily-average">
              {formatBRL(analysis.dailyAverage)}
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">/dia</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">
            Média ponderada em 30 dias
          </span>
        </div>

        {/* Corte Diário Específico Sugerido */}
        <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-400 block mb-0.5">
                Corte Diário Sugerido
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                -{selectedPercent}%
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400" data-testid="leisure-daily-cut">
              -{formatBRL(analysis.suggestedDailyCut)}
              <span className="text-xs font-bold ml-1">/dia</span>
            </div>
          </div>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-1">
            Redução discreta no dia a dia
          </span>
        </div>

        {/* Estimativa de Economia em R$ (Mês e Ano) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border-2 border-emerald-400/80 dark:border-emerald-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 block mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Economia Estimada</span>
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Líquida
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight" data-testid="leisure-monthly-savings">
              +{formatBRL(analysis.suggestedMonthlySavings)}
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1">/mês</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1 block" data-testid="leisure-annual-savings">
            Projeção: +{formatBRL(analysis.suggestedAnnualSavings)} em 1 ano 🎯
          </span>
        </div>
      </div>

      {/* Seletor Interativo de Intensidade do Corte */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              Selecione a Intensidade do Corte Desejado:
            </span>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
            Corte Selecionado: {selectedPercent}% ({formatBRL(analysis.suggestedDailyCut)}/dia a menos)
          </span>
        </div>

        {/* Botões de Cenários de Corte */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {analysis.scenarios.map(sc => {
            const isSelected = selectedPercent === sc.percent;
            return (
              <button
                key={sc.percent}
                type="button"
                onClick={() => handleApplyCut(sc.percent)}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
                data-testid={`scenario-btn-${sc.percent}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {sc.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {sc.percent}%
                  </span>
                </div>
                <div className="text-xs font-bold">
                  <span className={isSelected ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}>
                    -{formatBRL(sc.dailyCut)}/dia
                  </span>
                  <div className={`text-sm font-black mt-0.5 ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    +{formatBRL(sc.monthlySavings)}/mês
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projeção Visual: Antes do Corte vs Depois do Corte */}
      {analysis.hasData && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              <span>Impacto Orçamentário com o Corte de {selectedPercent}%:</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-black">
              <span className="text-slate-400 line-through">
                {formatBRL(analysis.totalSpent)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                → {formatBRL(analysis.totalSpent - analysis.suggestedMonthlySavings)}/mês
              </span>
            </div>
          </div>

          {/* Barra Comparativa com corte visual */}
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-4 rounded-full overflow-hidden flex shadow-inner relative">
            {/* Gastos remanescentes permitidos */}
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${100 - selectedPercent}%` }}
              title={`Gasto ajustado com corte: ${formatBRL(analysis.totalSpent - analysis.suggestedMonthlySavings)}`}
            />
            {/* Fatia de economia economizada */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 animate-pulse"
              style={{ width: `${selectedPercent}%` }}
              title={`Economia liberada: +${formatBRL(analysis.suggestedMonthlySavings)}`}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-0.5">
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Teto Ajustado ({100 - selectedPercent}%): {formatBRL(analysis.totalSpent - analysis.suggestedMonthlySavings)}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Economia Líquida ({selectedPercent}%): +{formatBRL(analysis.suggestedMonthlySavings)}
            </span>
          </div>

          {/* Dica Estratégica do Impacto Real */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-start gap-2.5 text-xs">
            <PiggyBank className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <strong>Como aplicar essa economia na prática:</strong> {analysis.adviceMessage} Redirecionando essa quantia mensal para o pote <strong>PLP (10%)</strong> ou para amortizar parcelamentos com juros, você acelera seu superávit de caixa sem abrir mão de se divertir.
            </p>
          </div>
        </div>
      )}

      {/* Accordion Detalhado: Extrato dos Gastos de Lazer / Variável nos Últimos 30 Dias */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 relative z-10">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          data-testid="btn-toggle-leisure-details"
        >
          <div className="flex items-center gap-2">
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {isDetailsOpen 
                ? 'Ocultar lançamentos analisados' 
                : `Ver ${analysis.transactionCount} ${analysis.transactionCount === 1 ? 'lançamento analisado' : 'lançamentos analisados'} em Lazer & Variável`}
            </span>
          </div>
          {isDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isDetailsOpen && (
          <div className="mt-2 space-y-2 animate-in fade-in" data-testid="leisure-transactions-list">
            {analysis.transactions.length === 0 ? (
              <p className="text-xs text-slate-400 p-2">Nenhum gasto específico encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.transactions.map(tx => (
                  <div 
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">
                        {tx.description}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {tx.date} • {tx.category || 'Lazer / Variável'} • {tx.account}
                      </span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">
                      {formatBRL(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Divisão por Categorias */}
            {analysis.categoriesBreakdown.length > 0 && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-400">Categorias:</span>
                {analysis.categoriesBreakdown.map(cat => (
                  <span 
                    key={cat.category}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {cat.category}: {formatBRL(cat.total)} ({cat.percentOfTotal.toFixed(0)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ações Rápidas: Navegar para Potes (DIV_10) ou Sonhos & Metas */}
      {onNavigateToScreen && (
        <div className="pt-2 flex items-center justify-end gap-2 flex-wrap relative z-10">
          <button
            type="button"
            onClick={() => onNavigateToScreen('potes')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            data-testid="btn-nav-potes-from-leisure"
          >
            <PieChart className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ver Limites do Pote Lazer (10%)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToScreen('sonhos')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
            data-testid="btn-nav-sonhos-from-leisure"
          >
            <Target className="w-3.5 h-3.5 text-white" />
            <span>Direcionar Economia para Sonhos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
