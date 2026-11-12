import React, { useState } from 'react';
import { Building2, Edit3, Briefcase, Calculator } from 'lucide-react';
import { Transaction } from '../types';
import { calculateFinancialMetrics, formatBRL } from '../utils/finance';
import { PjDreComparative } from './PjDreComparative';
import { PjDreSummaryCard } from './PjDreSummaryCard';
import { PjDreMarginComparisonCard } from './PjDreMarginComparisonCard';
import { NetMarginEvolutionCard } from './NetMarginEvolutionCard';
import { PJTaxAndPayoutOptimizerCard } from './PJTaxAndPayoutOptimizerCard';
import { MEIFinancialAndPayoutCard } from './MEIFinancialAndPayoutCard';

interface PjViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const PjView: React.FC<PjViewProps> = ({ transactions, onAddTransaction, onEditTransaction }) => {
  const [pjTab, setPjTab] = useState<'mei' | 'simples'>('mei');
  const metrics = calculateFinancialMetrics(transactions, true);
  const pjTransactions = transactions.filter(t => t.costCenter === 'PJ');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-teal-600 text-white">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
              Gestão Empresarial & Operação Jurídica
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Operação PJ (Conta Inter PJ)
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o faturamento MEI, limite anual de R$ 81.000, guia DAS unificada e simulações para o Simples Nacional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-900">
            Regime Atual: MEI Ativo
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-900">
            Margem Líquida: {metrics.pjProfitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Tabs de Regime: MEI (Atual) vs Simples Nacional (Planejamento) */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl text-xs font-bold gap-1 self-start sm:self-auto max-w-fit">
        <button
          type="button"
          onClick={() => setPjTab('mei')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            pjTab === 'mei'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          data-testid="pj-tab-mei"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Operação MEI (Atual)</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
            pjTab === 'mei' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
          }`}>
            Ativo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPjTab('simples')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            pjTab === 'simples'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          data-testid="pj-tab-simples"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Simples Nacional (Planejamento & DRE)</span>
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
            pjTab === 'simples' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
          }`}>
            Simulador
          </span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA MEI (ATUAL) */}
      {pjTab === 'mei' && (
        <div className="space-y-6">
          {/* Central MEI: Limite Anual, DAS Fixo e Transferência PF */}
          <MEIFinancialAndPayoutCard 
            transactions={transactions} 
            initialMonth="2026-10" 
            onAddTransaction={onAddTransaction}
          />
        </div>
      )}

      {/* CONTEÚDO DA ABA SIMPLES NACIONAL (PLANEJAMENTO & DRE) */}
      {pjTab === 'simples' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Painel de Planejamento Tributário:</strong> Parâmetros do Simples Nacional mantidos para projeção e transição caso sua receita ultrapasse o teto do MEI.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPjTab('mei')}
              className="px-3 py-1 bg-white dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold hover:underline cursor-pointer shrink-0 ml-2"
            >
              Voltar ao MEI
            </button>
          </div>

          {/* Componente Resumo DRE: Cálculo Automático de Receita Bruta, DAS Estimado e Lucro Líquido p/ PF */}
          <PjDreSummaryCard transactions={transactions} initialMonth="2026-10" />

          {/* Comparativo DRE: Mês Atual vs Média dos Últimos 3 Meses */}
          <PjDreMarginComparisonCard transactions={transactions} initialMonth="2026-10" />

          {/* DRE Comparativo Analítico: Mês Atual vs Média 3 Meses */}
          <PjDreComparative transactions={transactions} initialMonth="2026-10" />

          {/* Evolução da Margem Líquida - 12 Meses */}
          <NetMarginEvolutionCard transactions={transactions} initialMonth="2026-10" />

          {/* Otimizador de Fator R, Limite do Simples e Divisão de Retiradas */}
          <PJTaxAndPayoutOptimizerCard transactions={transactions} initialMonth="2026-10" />
        </div>
      )}

      {/* Tabela de Lançamentos PJ */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Extrato Detalhado da Conta Inter PJ
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {onEditTransaction && <th className="py-2.5 px-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pjTransactions.map(tx => {
                const isPositive = tx.type === 'receita';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-400">{tx.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{tx.description}</span>
                        {tx.notes && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                            {tx.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{tx.category || 'Geral PJ'}</td>
                    <td className={`py-3 px-3 text-right font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                        Liquidado
                      </span>
                    </td>
                    {onEditTransaction && (
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Editar lançamento PJ"
                          data-testid={`edit-pj-${tx.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
