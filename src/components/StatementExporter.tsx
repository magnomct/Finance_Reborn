import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileCode,
  FileSpreadsheet,
  X,
  Calendar,
  ChevronDown,
  Tag,
} from 'lucide-react';
import { ParentCategoryItem, Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  buildExportFilename,
  calculateExportNetBalance,
  ExportExecutionResult,
  ExportFormat,
  ExportScope,
  exportTransactionsFile,
  normalizeExportScope,
} from '../utils/exportTransactionsService';

interface StatementExporterProps {
  filteredTransactions: Transaction[];
  activeScope: ExportScope;
  periodLabel: string;
  categoryLabel?: string;
  hierarchy?: ParentCategoryItem[];
  onExportSuccess?: (result: ExportExecutionResult) => void;
}

export const StatementExporter: React.FC<StatementExporterProps> = ({
  filteredTransactions,
  activeScope,
  periodLabel,
  categoryLabel,
  hierarchy,
  onExportSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = filteredTransactions.length === 0;
  const scopeInfo = useMemo(() => normalizeExportScope(activeScope), [activeScope]);

  const netBalance = useMemo(
    () => calculateExportNetBalance(filteredTransactions),
    [filteredTransactions]
  );

  const countLabel = useMemo(() => {
    const n = filteredTransactions.length;
    return n === 1 ? '1 transação' : `${n} transações`;
  }, [filteredTransactions.length]);

  const previewCsvName = useMemo(
    () => buildExportFilename({ scope: activeScope, format: 'csv' }),
    [activeScope]
  );

  const previewOfxName = useMemo(
    () => buildExportFilename({ scope: activeScope, format: 'ofx' }),
    [activeScope]
  );

  // Close on Escape key or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close automatically if filters turn dataset empty
  useEffect(() => {
    if (isEmpty && isOpen) {
      setIsOpen(false);
    }
  }, [isEmpty, isOpen]);

  const handleDownload = (format: ExportFormat) => {
    if (isEmpty) return;
    const result = exportTransactionsFile(filteredTransactions, format, {
      scope: activeScope,
      hierarchy,
    });
    if (result.success) {
      setIsOpen(false);
      if (onExportSuccess) {
        onExportSuccess(result);
      }
    }
  };

  const scopeBadgeStyle =
    scopeInfo.slug === 'pj_mei'
      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
      : scopeInfo.slug === 'pf'
      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';

  const triggerTooltip = isEmpty
    ? 'Nenhuma transação filtrada para exportar. Ajuste os filtros de escopo, data ou categoria.'
    : `Exportar ${countLabel} do escopo ${scopeInfo.label} em .CSV ou .OFX`;

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <span title={triggerTooltip} className="inline-block">
        <button
          type="button"
          onClick={() => {
            if (!isEmpty) setIsOpen(prev => !prev);
          }}
          disabled={isEmpty}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Exportar extrato em CSV ou OFX"
          data-testid="btn-statement-exporter"
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 shadow-sm cursor-pointer active:scale-95 ${
            isEmpty
              ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Exportar</span>
          <span className="opacity-85 text-[11px] font-semibold tabular-nums">
            ({filteredTransactions.length})
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </span>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="false"
            aria-label="Exportar Extrato"
            data-testid="popover-statement-exporter"
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-20 sm:top-full sm:mt-2 w-auto sm:w-[380px] z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-left"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Exportar Extrato
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Considera exatamente os filtros visíveis na tabela
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar painel de exportação"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo do Escopo Atual */}
            <div
              className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 space-y-2.5"
              data-testid="exporter-scope-summary"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  data-testid="exporter-scope-badge"
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${scopeBadgeStyle}`}
                >
                  Escopo: {scopeInfo.label}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                  {countLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    Período
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                    {periodLabel}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Saldo Líquido
                  </span>
                  <p
                    data-testid="exporter-net-balance"
                    className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${
                      netBalance >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {netBalance >= 0 ? '+' : ''}
                    {formatBRL(netBalance)}
                  </p>
                </div>
              </div>

              {categoryLabel && categoryLabel !== 'ALL' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                  <Tag className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="truncate">
                    Categoria: <strong className="font-semibold">{categoryLabel}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Format Choices */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => handleDownload('csv')}
                data-testid="btn-export-format-csv"
                className="w-full flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    .CSV (Planilha Excel / Contabilidade)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    UTF-8 BOM, separador ponto e vírgula (;) e valores em vírgula
                  </p>
                  <span className="inline-block text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full">
                    {previewCsvName}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDownload('ofx')}
                data-testid="btn-export-format-ofx"
                className="w-full flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    .OFX (Conciliação Bancária / ERP)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Esquema padrão OFX v102/200 com saldo consolidado (LEDGERBAL)
                  </p>
                  <span className="inline-block text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full">
                    {previewOfxName}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
