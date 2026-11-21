import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  Calendar,
  X,
  Edit3,
  Download,
} from 'lucide-react';
import {
  Transaction,
  AutoCategoryRule,
  ParentCategoryItem,
} from '../types';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { BankImportModal } from './BankImportModal';
import { ExportPdfModal } from './ExportPdfModal';
import { ExportModal } from './ExportModal';
import { StatementExporter } from './StatementExporter';
import {
  ExportExecutionResult,
  isPJTransaction,
  resolveTransactionExportMetadata,
} from '../utils/exportTransactionsService';
import { loadCategoryHierarchy } from '../utils/categoryHierarchy';
import { getAllAvailableAccounts } from '../utils/customAccounts';

interface ExtratosViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onImportTransactions?: (newTransactions: Transaction[]) => void;
  autoRules?: AutoCategoryRule[];
  scope?: 'PF' | 'PJ' | 'CONSOLIDADO';
  hierarchy?: ParentCategoryItem[];
}

type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'YEAR_CURRENT' | 'CUSTOM';

export const ExtratosView: React.FC<ExtratosViewProps> = ({
  transactions,
  onDeleteTransaction,
  onToggleStatus,
  onEditTransaction,
  onImportTransactions,
  autoRules = [],
  scope,
  hierarchy,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGlobalExportOpen, setIsGlobalExportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PF' | 'PJ'>(() => {
    if (scope === 'PF') return 'PF';
    if (scope === 'PJ') return 'PJ';
    return 'ALL';
  });
  const [jarFilter, setJarFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportToast, setExportToast] = useState<{
    message: string;
    detail: string;
  } | null>(null);

  const resolvedHierarchy = useMemo(
    () => hierarchy ?? loadCategoryHierarchy(),
    [hierarchy]
  );

  // Sync when parent scope changes
  useEffect(() => {
    if (scope === 'PF') setScopeFilter('PF');
    else if (scope === 'PJ') setScopeFilter('PJ');
    else if (scope === 'CONSOLIDADO') setScopeFilter('ALL');
  }, [scope]);

  // Auto-dismiss export success toast
  useEffect(() => {
    if (!exportToast) return;
    const timer = setTimeout(() => {
      setExportToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [exportToast]);

  // Handle Preset changes
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'LAST_30_DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'YEAR_CURRENT') {
      const year = today.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    }
  };

  const currentPeriodLabel = useMemo(() => {
    if (datePreset === 'THIS_MONTH') {
      const today = new Date();
      return today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (startDate && endDate) {
      const s = startDate.split('-').reverse().join('/');
      const e = endDate.split('-').reverse().join('/');
      return `${s} a ${e}`;
    }
    if (startDate) {
      return `A partir de ${startDate.split('-').reverse().join('/')}`;
    }
    if (endDate) {
      return `Até ${endDate.split('-').reverse().join('/')}`;
    }
    return 'Todo o Histórico';
  }, [datePreset, startDate, endDate]);

  // Available categories combining hierarchy parents and transaction categories
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    resolvedHierarchy.forEach(p => {
      if (p.name) catSet.add(p.name);
    });
    transactions.forEach(t => {
      const meta = resolveTransactionExportMetadata(t, resolvedHierarchy);
      if (meta.parentCategory) catSet.add(meta.parentCategory);
    });
    return Array.from(catSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [transactions, resolvedHierarchy]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        // Scope filtering (PF vs PJ vs Consolidado)
        if (scopeFilter === 'PF' && isPJTransaction(t)) return false;
        if (scopeFilter === 'PJ' && !isPJTransaction(t)) return false;

        if (jarFilter !== 'ALL' && t.jar !== jarFilter) return false;
        if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
        if (accountFilter !== 'ALL' && t.account !== accountFilter) return false;

        // Category filtering (matches parent category or raw category)
        if (categoryFilter !== 'ALL') {
          const meta = resolveTransactionExportMetadata(t, resolvedHierarchy);
          const matchesCategory =
            meta.parentCategory === categoryFilter ||
            t.parentCategory === categoryFilter ||
            t.category === categoryFilter;
          if (!matchesCategory) return false;
        }

        // Date filtering
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;

        // Search query filtering
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            t.description.toLowerCase().includes(q) ||
            t.account.toLowerCase().includes(q) ||
            t.costCenter.toLowerCase().includes(q) ||
            (t.category && t.category.toLowerCase().includes(q)) ||
            (t.parentCategory && t.parentCategory.toLowerCase().includes(q)) ||
            (t.subcategory && t.subcategory.toLowerCase().includes(q)) ||
            (t.notes && t.notes.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    transactions,
    search,
    scopeFilter,
    jarFilter,
    categoryFilter,
    typeFilter,
    accountFilter,
    startDate,
    endDate,
    resolvedHierarchy,
  ]);

  const totalFilteredReceipts = filtered
    .filter(t => t.type === 'receita' || t.type === 'reembolso')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalFilteredPayments = filtered
    .filter(t => t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const handleExportSuccess = (result: ExportExecutionResult) => {
    const countText =
      result.count === 1 ? '1 transação' : `${result.count} transações`;
    setExportToast({
      message: 'Arquivo exportado com sucesso!',
      detail: `${result.filename} · ${countText} (${result.format.toUpperCase()})`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Banner de Importação de Arquivos OFX e CSV */}
      <div className="bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-transparent p-4 sm:p-5 rounded-3xl border border-teal-200/80 dark:border-teal-900/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400 font-bold">
            <Upload className="w-3.5 h-3.5" />
            <span>Importação Bancária Automatizada</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              .OFX &amp; .CSV
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Importar Extrato Bancário ou de Cartão
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adicione extratos do Nubank, Inter, Itaú, Santander, Bradesco, C6 e BB com auto-classificação inteligente nos 6 Potes e prevenção de duplicatas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm hover:shadow transition shrink-0 whitespace-nowrap cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Importar Arquivo (.OFX / .CSV)</span>
        </button>
      </div>

      {/* Top Filter Bar & Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Header row with Title, Scope Toggle & Export Actions */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Extrato Geral de Lançamentos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Período ativo:{' '}
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  {currentPeriodLabel}
                </span>
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                aria-label="Buscar lançamentos no extrato"
                placeholder="Buscar por descrição, centro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Segmented Scope Filter (PF | PJ/MEI | Consolidado) next to Exportar */}
            <div
              role="group"
              aria-label="Filtro de escopo do extrato"
              data-testid="scope-segmented-filter"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
            >
              <button
                type="button"
                onClick={() => setScopeFilter('PF')}
                data-testid="scope-btn-pf"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  scopeFilter === 'PF'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                PF
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('PJ')}
                data-testid="scope-btn-pj"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  scopeFilter === 'PJ'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                PJ/MEI
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                data-testid="scope-btn-consolidado"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  scopeFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Consolidado
              </button>
            </div>

            {/* Smart StatementExporter (CSV Excel PT-BR & OFX) */}
            <StatementExporter
              filteredTransactions={filtered}
              activeScope={scopeFilter}
              periodLabel={currentPeriodLabel}
              categoryLabel={categoryFilter}
              hierarchy={resolvedHierarchy}
              onExportSuccess={handleExportSuccess}
            />

            {/* Exportar PDF Contábil (Secondary action) */}
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer"
              title="Gerar relatório formal em PDF para contador ou prestação de contas"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF Contábil</span>
            </button>

            {/* Exportador Completo (PDF / CSV / Excel) */}
            <button
              type="button"
              onClick={() => setIsGlobalExportOpen(true)}
              data-testid="btn-extratos-global-export"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer"
              title="Abrir exportador completo em PDF, CSV ou Excel"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>PDF / Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* Toast / Badge de feedback visual de exportação */}
        {exportToast && (
          <div
            role="status"
            aria-live="polite"
            data-testid="toast-export-success"
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                <span className="font-bold">{exportToast.message}</span>
                <span className="text-emerald-700/80 dark:text-emerald-300/80 font-mono text-[11px] truncate">
                  {exportToast.detail}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExportToast(null)}
              aria-label="Fechar aviso de exportação"
              className="p-1 rounded-lg text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Date Filter Bar with Presets & Date Pickers */}
        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                datePreset === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('LAST_30_DAYS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                datePreset === 'LAST_30_DAYS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('YEAR_CURRENT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] whitespace-nowrap ${
                datePreset === 'YEAR_CURRENT'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Ano Todo
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label
              htmlFor="extrato-date-start"
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
            >
              De:
            </label>
            <input
              id="extrato-date-start"
              type="date"
              value={startDate}
              onChange={e => {
                setDatePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
            />
            <label
              htmlFor="extrato-date-end"
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400"
            >
              Até:
            </label>
            <input
              id="extrato-date-end"
              type="date"
              value={endDate}
              onChange={e => {
                setDatePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                aria-label="Limpar filtro de data"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Limpar filtro de data"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dimension Selectors (Categoria, Pote, Tipo, Conta) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          <select
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            data-testid="select-category-filter"
          >
            <option value="ALL">Todas as Categorias</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por pote"
            value={jarFilter}
            onChange={e => setJarFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todos os Potes (6 Potes + PJ)</option>
            <option value="NEC_55">55% Necessidades</option>
            <option value="DIV_10">10% Lazer / Estilo</option>
            <option value="PLP_10">10% Reserva</option>
            <option value="LIF_10">10% Liberdade</option>
            <option value="EDU_10">10% Educação</option>
            <option value="FER_5">5% Férias</option>
            <option value="PJ_EXCLUIDO">PJ Corporativo</option>
          </select>

          <select
            aria-label="Filtrar por tipo de lançamento"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todos os Tipos (Entradas &amp; Saídas)</option>
            <option value="despesa">Despesas (-)</option>
            <option value="receita">Receitas (+)</option>
            <option value="reembolso">Reembolsos</option>
          </select>

          <select
            aria-label="Filtrar por conta bancária"
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todas as Contas</option>
            {Array.from(
              new Set([
                ...transactions.map(t => t.account),
                ...getAllAvailableAccounts(),
              ])
            )
              .filter(Boolean)
              .map(acc => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Tabela de Extratos */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Pote</th>
                <th className="py-3 px-4">Conta</th>
                <th className="py-3 px-4">Centro</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const isPositive =
                    tx.type === 'receita' || tx.type === 'reembolso';
                  const jarDef =
                    JAR_DEFINITIONS[tx.jar] || JAR_DEFINITIONS.NEC_55;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{tx.description}</span>
                          {tx.notes && (
                            <button
                              type="button"
                              onClick={() =>
                                onEditTransaction && onEditTransaction(tx)
                              }
                              className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition border border-blue-200/60 dark:border-blue-800"
                              title="Clique para editar este lançamento / observação"
                            >
                              <span>{tx.notes}</span>
                              <Edit3 className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${jarDef.colorHex}15`,
                            color: jarDef.colorHex,
                          }}
                        >
                          {jarDef.shortName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.account}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.costCenter}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(tx.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            tx.status === 'liquidado'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {tx.status === 'liquidado' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>
                            {tx.status === 'liquidado' ? 'Liquidado' : 'Agendado'}
                          </span>
                        </button>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black font-mono tabular-nums whitespace-nowrap ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {isPositive ? '+' : '-'}{' '}
                        {formatBRL(Math.abs(tx.amount))}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              aria-label={`Editar lançamento ${tx.description}`}
                              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Editar lançamento"
                              data-testid={`edit-extrato-${tx.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            aria-label={`Remover lançamento ${tx.description}`}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Remover lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Subtotals */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 dark:text-slate-400">
              Recebimentos:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                +{formatBRL(totalFilteredReceipts)}
              </strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Pagamentos:{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                -{formatBRL(totalFilteredPayments)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-bold">
              Saldo Filtrado:
            </span>
            <strong
              className={`text-sm font-black font-mono tabular-nums ${
                totalFilteredReceipts - totalFilteredPayments >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(totalFilteredReceipts - totalFilteredPayments)}
            </strong>
          </div>
        </div>
      </div>

      {/* Modal de Importação Bancária */}
      {onImportTransactions && (
        <BankImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportTransactions={onImportTransactions}
          existingTransactions={transactions}
          autoRules={autoRules}
        />
      )}

      {/* Modal de Exportação PDF Contábil */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        filteredTransactions={filtered}
        currentPeriodLabel={currentPeriodLabel}
      />

      {/* Modal Global de Exportação (PDF / CSV / Excel) */}
      <ExportModal
        isOpen={isGlobalExportOpen}
        onClose={() => setIsGlobalExportOpen(false)}
        transactions={transactions}
        defaultScope={
          scopeFilter === 'PF' ? 'PF' : scopeFilter === 'PJ' ? 'PJ' : 'CONSOLIDADO'
        }
      />
    </div>
  );
};
