import React from 'react';
import { Building2, Edit3 } from 'lucide-react';
import { Transaction } from '../types';
import { calculateFinancialMetrics, formatBRL } from '../utils/finance';
import { PjDreComparative } from './PjDreComparative';
import { PjDreSummaryCard } from './PjDreSummaryCard';
import { PjDreMarginComparisonCard } from './PjDreMarginComparisonCard';

interface PjViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const PjView: React.FC<PjViewProps> = ({ transactions, onAddTransaction, onEditTransaction }) => {
  const metrics = calculateFinancialMetrics(transactions, true);
  const pjTransactions = transactions.filter(t => t.costCenter === 'PJ');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500 text-white">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
              Gestão Empresarial & DRE Simplificado
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Operação PJ (Conta Inter PJ)
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe o faturamento de serviços, os tributos do Simples Nacional, custos de saúde e a distribuição de lucros para a PF.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-900">
          Margem Líquida Operacional: {metrics.pjProfitMargin.toFixed(1)}%
        </span>
      </div>

      {/* Componente Resumo DRE: Cálculo Automático de Receita Bruta, DAS Estimado e Lucro Líquido p/ PF */}
      <PjDreSummaryCard transactions={transactions} initialMonth="2026-10" />

      {/* Comparativo DRE: Mês Atual vs Média dos Últimos 3 Meses com Destaque em Verde/Vermelho da Margem Líquida */}
      <PjDreMarginComparisonCard transactions={transactions} initialMonth="2026-10" />

      {/* DRE Comparativo Analítico: Mês Atual vs Média 3 Meses */}
      <PjDreComparative transactions={transactions} initialMonth="2026-10" />

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
