import React, { useState } from 'react';
import { 
  FileText, Download, Check, X, ShieldCheck, 
  Calendar, Layers, Target, DollarSign, AlertCircle, Sparkles
} from 'lucide-react';
import { Transaction, JarType, DreamGoal } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  computeDashboardMonthlySummary, 
  downloadDashboardMonthlyPDF 
} from '../utils/dashboardPdfReport';

export interface DashboardMonthlyPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  dreams: DreamGoal[];
  jarLimits: Record<JarType, number>;
  defaultMonthName?: string;
  defaultYearMonth?: string;
}

export const DashboardMonthlyPdfModal: React.FC<DashboardMonthlyPdfModalProps> = ({
  isOpen,
  onClose,
  transactions,
  dreams,
  jarLimits,
  defaultMonthName = 'Outubro / 2026',
  defaultYearMonth = '2026-10'
}) => {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthName);
  const [entityName, setEntityName] = useState('Magno Silva');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Month mapping
  const monthOptions = [
    { label: 'Agosto / 2026', ym: '2026-08' },
    { label: 'Setembro / 2026', ym: '2026-09' },
    { label: 'Outubro / 2026', ym: '2026-10' },
    { label: 'Novembro / 2026', ym: '2026-11' }
  ];

  const currentOption = monthOptions.find(m => m.label === selectedMonth) || monthOptions[2];

  if (!isOpen) return null;

  const summary = computeDashboardMonthlySummary(
    transactions,
    dreams,
    jarLimits,
    {
      monthName: currentOption.label,
      yearMonth: currentOption.ym
    }
  );

  const handleDownload = () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      downloadDashboardMonthlyPDF(
        transactions,
        dreams,
        jarLimits,
        {
          monthName: currentOption.label,
          yearMonth: currentOption.ym,
          entityName: entityName.trim() || 'Magno Silva'
        }
      );
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Relatório Mensal Consolidado (PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Dashboard Executivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere um documento completo com diagnóstico financeiro, divisão dos 6 potes e metas de economia.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Month & Entity Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Mês de Referência do Relatório
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:ring-1 focus:ring-teal-500"
              >
                {monthOptions.map(m => (
                  <option key={m.label} value={m.label}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Titular / Responsável Financeiro
              </label>
              <input
                type="text"
                value={entityName}
                onChange={e => setEntityName(e.target.value)}
                placeholder="Nome do titular"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Quick Metrics Preview */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Prévia do Fechamento ({currentOption.label})
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                summary.netBalance >= 0 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {summary.netBalance >= 0 ? 'Superávit Confirmado 🎉' : 'Déficit / Ajustar Gastos'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Receitas</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  +{formatBRL(summary.totalIncome)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Despesas</span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  -{formatBRL(summary.totalExpenses)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Saldo do Mês</span>
                <span className={`text-xs font-black ${
                  summary.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}>
                  {formatBRL(summary.netBalance)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Metas de Economia</span>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                  {summary.dreamOverallCompletion}% concluído
                </span>
              </div>
            </div>
          </div>

          {/* Seções Inclusas no PDF */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              Conteúdo do Relatório em PDF:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-900 dark:text-blue-300 block">Resumo dos 6 Potes Orçamentários</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Tabela com teto planejado, gastos realizados, saldo restante e alerta visual para potes acima de 80% e 100%.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/40 flex items-start gap-2.5">
                <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-900 dark:text-purple-300 block">Metas de Economia & Sonhos</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Metas totais, progresso acumulado, prazos limites e cálculo inteligente do aporte mensal necessário.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-start gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 dark:text-emerald-300 block">Fechamento Consolidado PF & PJ</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Entradas CLT, faturamento PJ, despesas operacionais e distribuição líquida.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 block">Maiores Movimentações & Lançamentos</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Rastreamento das maiores despesas e receitas para auditoria e controle.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">PDF gerado e baixado com sucesso! Verifique sua pasta de downloads.</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Formato: <strong>A4 Portrait (PDF)</strong> • Gerado localmente no navegador
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 font-semibold transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <span>Gerando PDF...</span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório Mensal (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
