import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Table,
  Download,
  Filter,
  Calendar,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import {
  GlobalExportDatePreset,
  GlobalExportFormat,
  GlobalExportScope,
  buildExportRangeFilename,
  computeExportPreviewStats,
  exportTransactionsToCSV,
  exportTransactionsToExcel,
  exportTransactionsToPDF,
  filterTransactionsForExport,
  resolveDateRangeForPreset,
} from '../utils/export';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  defaultScope?: 'PF' | 'PJ' | 'CONSOLIDADO';
  defaultYearMonth?: string;
}

const MONTH_NAME_TO_YM: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  março: '03',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
};

export function parseMonthLabelToYM(label?: string): string | undefined {
  if (!label) return undefined;
  const trimmed = label.trim().toLowerCase();
  const match = /^([a-zçãõáéíóú]+)\s*\/\s*(\d{4})$/i.exec(trimmed);
  if (!match) return undefined;
  const monthNum = MONTH_NAME_TO_YM[match[1]];
  if (!monthNum) return undefined;
  return `${match[2]}-${monthNum}`;
}

function getAnchorIsoForDataset(
  transactions: Transaction[],
  defaultYearMonth?: string
): string {
  const ym = defaultYearMonth && /^\d{4}-\d{2}$/.test(defaultYearMonth)
    ? defaultYearMonth
    : undefined;

  if (ym) {
    const year = Number(ym.slice(0, 4));
    const month = Number(ym.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    return `${ym}-${String(lastDay).padStart(2, '0')}`;
  }

  const latestDate = (transactions || [])
    .map(t => (t.date || '').slice(0, 10))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .pop();

  return latestDate || new Date().toISOString().slice(0, 10);
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  defaultScope = 'CONSOLIDADO',
  defaultYearMonth,
}) => {
  const anchorIso = useMemo(
    () => getAnchorIsoForDataset(transactions, defaultYearMonth),
    [transactions, defaultYearMonth]
  );

  const initialScope: GlobalExportScope =
    defaultScope === 'PF' ? 'PF' : defaultScope === 'PJ' ? 'PJ' : 'ALL';

  const [format, setFormat] = useState<GlobalExportFormat>('pdf');
  const [datePreset, setDatePreset] = useState<GlobalExportDatePreset>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(() =>
    resolveDateRangeForPreset('THIS_MONTH', anchorIso).startDate
  );
  const [endDate, setEndDate] = useState<string>(() =>
    resolveDateRangeForPreset('THIS_MONTH', anchorIso).endDate
  );
  const [scope, setScope] = useState<GlobalExportScope>(initialScope);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    filename: string;
    format: GlobalExportFormat;
    count: number;
  } | null>(null);

  // Sync preset dates & scope whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const range = resolveDateRangeForPreset('THIS_MONTH', anchorIso);
      setDatePreset('THIS_MONTH');
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setScope(initialScope);
      setSelectedCategories([]);
      setFeedbackBanner(null);
    }
  }, [isOpen, anchorIso, initialScope]);

  // Close cleanly on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    (transactions || []).forEach(tx => {
      const cat = (tx.category || 'Geral').trim() || 'Geral';
      catSet.add(cat);
    });
    return Array.from(catSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [transactions]);

  const filteredTransactions = useMemo(
    () =>
      filterTransactionsForExport(transactions, {
        startDate,
        endDate,
        scope,
        categories: selectedCategories,
      }),
    [transactions, startDate, endDate, scope, selectedCategories]
  );

  const previewStats = useMemo(
    () => computeExportPreviewStats(filteredTransactions),
    [filteredTransactions]
  );

  const targetExt: 'pdf' | 'csv' | 'xls' =
    format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xls';

  const previewFilename = useMemo(
    () =>
      buildExportRangeFilename(filteredTransactions, targetExt, {
        startDate,
        endDate,
      }),
    [filteredTransactions, targetExt, startDate, endDate]
  );

  if (!isOpen) return null;

  const handleSelectPreset = (preset: GlobalExportDatePreset) => {
    setDatePreset(preset);
    if (preset === 'CUSTOM') return;
    const range = resolveDateRangeForPreset(preset, anchorIso);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(item => item !== cat) : [...prev, cat]
    );
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;

    const options = {
      startDate,
      endDate,
      scope,
      categories: selectedCategories,
    };

    const result =
      format === 'csv'
        ? exportTransactionsToCSV(filteredTransactions, options)
        : format === 'excel'
          ? exportTransactionsToExcel(filteredTransactions, options)
          : exportTransactionsToPDF(filteredTransactions, options);

    setFeedbackBanner({
      filename: result.filename,
      format,
      count: result.count,
    });
  };

  const recordCountLabel =
    previewStats.count === 1
      ? '1 lançamento selecionado'
      : `${previewStats.count} lançamentos selecionados`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65"
      onClick={onClose}
      data-testid="modal-global-export"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-export-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 id="global-export-modal-title" className="text-base font-bold text-white">
                Exportar Extrato &amp; Relatório Financeiro
              </h3>
              <p className="text-xs text-slate-400">
                Escolha o formato, filtre por período, escopo ou categorias e baixe na hora.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de exportação"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* 1. 3-Card Format Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              1. Formato do Arquivo
            </label>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
              role="radiogroup"
              aria-label="Formato de exportação"
            >
              {(
                [
                  {
                    id: 'pdf' as const,
                    title: 'PDF',
                    subtitle: 'Relatório executivo A4',
                    badge: 'Impressão / PDF',
                    icon: FileText,
                    activeBorder: 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40',
                    iconStyle: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
                  },
                  {
                    id: 'csv' as const,
                    title: 'CSV',
                    subtitle: 'Separador ";" e UTF-8 BOM',
                    badge: 'Excel / Universal',
                    icon: Table,
                    activeBorder: 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40',
                    iconStyle: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
                  },
                  {
                    id: 'excel' as const,
                    title: 'Excel',
                    subtitle: 'Planilha .xls com totais',
                    badge: 'Formatado',
                    icon: FileSpreadsheet,
                    activeBorder: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40',
                    iconStyle:
                      'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
                  },
                ] as const
              ).map(item => {
                const Icon = item.icon;
                const isSelected = format === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setFormat(item.id)}
                    data-testid={`export-format-card-${item.id}`}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? `${item.activeBorder} shadow-xs`
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconStyle}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.subtitle}
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {item.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Range + Quick Presets */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                2. Período do Extrato
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'THIS_MONTH', label: 'Mês Atual' },
                    { id: 'LAST_30_DAYS', label: 'Últimos 30 dias' },
                    { id: 'YEAR_CURRENT', label: 'Ano Atual' },
                    { id: 'CUSTOM', label: 'Personalizado' },
                  ] as const
                ).map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    data-testid={`export-preset-${preset.id}`}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="export-start-date"
                  className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1"
                >
                  Data Inicial
                </label>
                <input
                  id="export-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  data-testid="input-export-start-date"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label
                  htmlFor="export-end-date"
                  className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1"
                >
                  Data Final
                </label>
                <input
                  id="export-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  data-testid="input-export-end-date"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Scope + Category Multi-Filter */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                3. Escopo &amp; Categorias
              </span>

              {/* Scope Segmented Pills */}
              <div
                role="group"
                aria-label="Escopo da exportação"
                className="inline-flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                {(
                  [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'PF', label: 'Apenas PF' },
                    { id: 'PJ', label: 'Apenas MEI/PJ' },
                  ] as const
                ).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScope(item.id)}
                    data-testid={`export-scope-${item.id}`}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      scope === item.id
                        ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Multi-Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Filtrar por Categorias ({selectedCategories.length === 0 ? 'Todas ativas' : `${selectedCategories.length} selecionada(s)`})
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  data-testid="export-category-all"
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    selectedCategories.length === 0
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  Todas as Categorias
                </button>

                {availableCategories.map(cat => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      aria-pressed={isChecked}
                      data-testid={`export-category-chip-${cat}`}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-700 font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 shrink-0" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Live Summary Preview Pill */}
          <div
            data-testid="export-live-summary-pill"
            className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 ${
              previewStats.count === 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs flex-wrap tabular-nums">
              {previewStats.count === 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    0 lançamentos selecionados • Entradas: {formatBRL(0)} • Saídas: {formatBRL(0)} • Saldo: {formatBRL(0)}
                  </span>
                </>
              ) : (
                <span>
                  <strong>{recordCountLabel}</strong> • Entradas:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {formatBRL(previewStats.totalInflow)}
                  </strong>{' '}
                  • Saídas:{' '}
                  <strong className="text-rose-700 dark:text-rose-400">
                    {formatBRL(previewStats.totalOutflow)}
                  </strong>{' '}
                  • Saldo:{' '}
                  <strong
                    className={
                      previewStats.netBalance >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }
                  >
                    {formatBRL(previewStats.netBalance)}
                  </strong>
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              Arquivo: {previewFilename}
            </div>
          </div>

          {feedbackBanner && (
            <div
              data-testid="export-success-banner"
              className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-xs font-semibold"
            >
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {feedbackBanner.format === 'pdf'
                  ? `Impressão/PDF preparada (${feedbackBanner.count} registros) — ${feedbackBanner.filename}`
                  : `Arquivo ${feedbackBanner.filename} baixado com sucesso (${feedbackBanner.count} registros)!`}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            data-testid="btn-export-submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-xs shadow-sm transition cursor-pointer disabled:cursor-not-allowed active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Arquivo ({format.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
