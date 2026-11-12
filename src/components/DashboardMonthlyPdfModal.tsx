import React, { useState } from 'react';
import { 
  FileText, Download, Check, X, ShieldCheck, 
  Calendar, Layers, Target, DollarSign, AlertCircle, Sparkles,
  Building2, Clock, CheckCircle2, TrendingUp, AlertTriangle
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

          {/* Bloco Dedicado: Resumo MEI (Teto R$ 81k, Status do DAS e Repasse PF) */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-900/90 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 space-y-3.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Resumo MEI (Operação Anual {summary.meiMetrics.year})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${summary.meiMetrics.statusBadge.color}`}>
                      {summary.meiMetrics.statusBadge.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Consolidação do faturamento acumulado anual contra a meta de R$ 81.000,00 e status de pagamento do DAS de {currentOption.label}.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 block">Meta Anual MEI</span>
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">
                  {formatBRL(summary.meiMetrics.annualCeiling)}
                </span>
              </div>
            </div>

            {/* 3 Colunas: YTD vs Teto, Status DAS, Transferência Líquida PF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Card 1: Faturamento Acumulado no Ano */}
              <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Faturamento Acumulado Anual
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {summary.meiMetrics.consumedPct.toFixed(1)}% da meta
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {formatBRL(summary.meiMetrics.ytdRevenue)}
                  </div>

                  {/* Barra de Progresso do Teto */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        summary.meiMetrics.consumedPct > 100 
                          ? 'bg-rose-500' 
                          : summary.meiMetrics.consumedPct > 80 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, summary.meiMetrics.consumedPct)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {summary.meiMetrics.ytdRevenue > summary.meiMetrics.annualCeiling ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Meta de R$ 81.000,00 ultrapassada!
                    </span>
                  ) : (
                    <span>
                      Meta de R$ 81k: restam <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.meiMetrics.remainingAnnualQuota)}</strong> ({formatBRL(summary.meiMetrics.recommendedMonthlyQuota)}/mês seguro)
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Status de Pagamento do DAS */}
              <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Status de Pagamento do DAS ({currentOption.label.split('/')[0].trim()})
                    </span>
                    {summary.meiMetrics.isDasPaidThisMonth ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> DAS Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                        <Clock className="w-3 h-3" /> DAS Pendente
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
                    <span>{formatBRL(summary.meiMetrics.dasAmount)}</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      ({summary.meiMetrics.dasConfig.name})
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>Vencimento oficial:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    Dia 20 ({summary.meiMetrics.dasDueDate})
                  </strong>
                </div>
              </div>

              {/* Card 3: Transferência PF & Distribuição Isenta */}
              <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Repasse Líquido PF
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      100% Isento IRPF
                    </span>
                  </div>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(summary.meiMetrics.totalPayoutPF)}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Parcela Isenta:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.meiMetrics.exemptProfitDistribution)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Reserva PJ retida:</span>
                    <span className="text-slate-500">{formatBRL(summary.meiMetrics.pjReserveAmount)} ({summary.meiMetrics.pjReservePct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seções Inclusas no PDF */}
          <div className="space-y-2.5">
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              Conteúdo do Relatório em PDF:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 flex items-start gap-2.5 sm:col-span-2">
                <Building2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-900 dark:text-indigo-300 block">Operação MEI & Tributação Anual</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                    Termômetro do teto de R$ 81.000, status da guia DAS do mês ({summary.meiMetrics.isDasPaidThisMonth ? 'Pago' : 'Pendente'}) e distribuição isenta de lucros para PF.
                  </p>
                </div>
              </div>

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
