import React, { useState } from 'react';
import { 
  FileText, Download, Check, X, ShieldCheck, 
  Calendar, Building2, UserCheck, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  AccountingReportConfig, 
  computeAccountingSummary, 
  downloadAccountingPDF 
} from '../utils/pdfReportGenerator';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredTransactions: Transaction[];
  currentPeriodLabel: string;
  defaultEntityName?: string;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  filteredTransactions,
  currentPeriodLabel,
  defaultEntityName = 'Magno Silva'
}) => {
  const [reportTitle, setReportTitle] = useState('Demonstrativo Financeiro & Prestação de Contas');
  const [entityName, setEntityName] = useState(defaultEntityName);
  const [documentNumber, setDocumentNumber] = useState('');
  const [accountantName, setAccountantName] = useState('');
  const [accountantCrc, setAccountantCrc] = useState('');
  const [notes, setNotes] = useState('Relatório emitido para conferência contábil, conciliação bancária e prestação de contas.');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const summary = computeAccountingSummary(filteredTransactions);

  const handleDownload = () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const config: AccountingReportConfig = {
        reportTitle: reportTitle.trim() || 'Demonstrativo Financeiro & Prestação de Contas',
        entityName: entityName.trim() || 'Titular / Responsável',
        documentNumber: documentNumber.trim() || undefined,
        periodLabel: currentPeriodLabel,
        notes: notes.trim() || undefined,
        accountantName: accountantName.trim() || undefined,
        accountantCrc: accountantCrc.trim() || undefined,
        includeSignatures,
      };

      downloadAccountingPDF(filteredTransactions, config);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Erro ao gerar relatório contábil em PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Exportar PDF Contábil
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Prestação de Contas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere um demonstrativo formal, formatado para contadores, auditoria e declaração fiscal.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 pb-8 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300">
          
          {/* Resumo do que será exportado */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Lançamentos Selecionados no Filtro</span>
              <span className="text-teal-600 dark:text-teal-400 font-black">{currentPeriodLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Lançamentos</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">{summary.totalCount}</span>
                <span className="text-[10px] text-slate-400 block">
                  {summary.liquidatedCount} liq. | {summary.scheduledCount} agend.
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold uppercase">Receitas (+)</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(summary.totalIncome)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold uppercase">Despesas (-)</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {formatBRL(summary.totalExpenses)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-bold uppercase">Saldo Líquido</span>
                <span className={`text-sm font-black ${
                  summary.netBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'
                }`}>
                  {formatBRL(summary.netBalance)}
                </span>
              </div>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Nenhum lançamento corresponde ao filtro atual. Ajuste os filtros na tela de extratos antes de exportar.</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Título do Demonstrativo Contábil
              </label>
              <input 
                type="text"
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                placeholder="Ex: Prestação de Contas Mensal - Outubro/2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Titular ou Razão Social
                </label>
                <input 
                  type="text"
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                  placeholder="Nome do titular ou empresa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Documento (CPF / CNPJ)
                </label>
                <input 
                  type="text"
                  value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)}
                  placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Nome do Contador / Auditor (Opcional)
                </label>
                <input 
                  type="text"
                  value={accountantName}
                  onChange={e => setAccountantName(e.target.value)}
                  placeholder="Ex: CRC Consultoria Contábil"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Registro Profissional / CRC (Opcional)
                </label>
                <input 
                  type="text"
                  value={accountantCrc}
                  onChange={e => setAccountantCrc(e.target.value)}
                  placeholder="Ex: CRC-SP 123456/O-1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Finalidade / Notas Explicativas Contábeis
              </label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Finalidade do documento, observações sobre regime de caixa ou competência..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              />
            </div>

            {/* Checkbox para Assinatura */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={e => setIncludeSignatures(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Incluir declaração de conformidade e campos de assinatura formal (Titular & Contador)
                </span>
              </label>
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span><strong>PDF gerado com sucesso!</strong> O download iniciou automaticamente no seu navegador.</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition"
          >
            Fechar
          </button>

          <button
            onClick={handleDownload}
            disabled={filteredTransactions.length === 0 || isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black shadow-sm hover:shadow transition"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Gerar e Baixar PDF</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
