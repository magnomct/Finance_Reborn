import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Download, Trash2, CheckCircle2, Clock, 
  ArrowUpDown, Filter, DollarSign, Upload, FileSpreadsheet, 
  FileText, Calendar, X, Sparkles, Edit3
} from 'lucide-react';
import { Transaction, JarType, AccountType, AutoCategoryRule } from '../types';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { BankImportModal } from './BankImportModal';
import { ExportPdfModal } from './ExportPdfModal';
import { downloadTransactionsCSV } from '../utils/csvExport';

interface ExtratosViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onImportTransactions?: (newTransactions: Transaction[]) => void;
  autoRules?: AutoCategoryRule[];
  scope?: 'PF' | 'PJ' | 'CONSOLIDADO';
}

type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'YEAR_CURRENT' | 'CUSTOM';

export const ExtratosView: React.FC<ExtratosViewProps> = ({
  transactions,
  onDeleteTransaction,
  onToggleStatus,
  onEditTransaction,
  onImportTransactions,
  autoRules = [],
  scope
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'PF' | 'PJ'>(() => {
    if (scope === 'PF') return 'PF';
    if (scope === 'PJ') return 'PJ';
    return 'ALL';
  });
  const [jarFilter, setJarFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Sync when parent scope changes
  useEffect(() => {
    if (scope === 'PF') setScopeFilter('PF');
    else if (scope === 'PJ') setScopeFilter('PJ');
    else if (scope === 'CONSOLIDADO') setScopeFilter('ALL');
  }, [scope]);

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
      // Last day of month
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
    return 'Todo o Histórico (Todos os lançamentos)';
  }, [datePreset, startDate, endDate]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Scope filtering (PF vs PJ vs Consolidado)
      if (scopeFilter === 'PF') {
        const isPJ = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
        if (isPJ) return false;
      } else if (scopeFilter === 'PJ') {
        const isPJ = t.costCenter === 'PJ' || t.account === 'Inter PJ' || t.jar === 'PJ_EXCLUIDO';
        if (!isPJ) return false;
      }

      if (jarFilter !== 'ALL' && t.jar !== jarFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (accountFilter !== 'ALL' && t.account !== accountFilter) return false;

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
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, scopeFilter, jarFilter, typeFilter, accountFilter, startDate, endDate]);

  const totalFilteredReceipts = filtered
    .filter(t => t.type === 'receita' || t.type === 'reembolso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFilteredPayments = filtered
    .filter(t => t.type === 'despesa')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const dateTag = new Date().toISOString().slice(0, 10);
    const scopeTag = scopeFilter !== 'ALL' ? `${scopeFilter.toLowerCase()}_` : '';
    const filterTag = datePreset !== 'ALL' ? `${datePreset.toLowerCase()}_` : '';
    const filename = `extrato_yupee_${scopeTag}${filterTag}${dateTag}.csv`;
    const success = downloadTransactionsCSV(filtered, filename);
    if (success) {
      setExportNotification(`Extrato CSV exportado com sucesso! (${filtered.length} lançamentos filtrados)`);
      setTimeout(() => {
        setExportNotification(null);
      }, 4000);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Banner de Importação de Arquivos OFX e CSV */}
      <div className="bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-transparent p-4 sm:p-5 rounded-3xl border border-teal-200/80 dark:border-teal-900/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-600 text-white">
              <Upload className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Importação Bancária Automatizada
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
              .OFX & .CSV
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
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm hover:shadow transition shrink-0 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Importar Arquivo (.OFX / .CSV)</span>
        </button>
      </div>

      {/* Top Filter Bar & Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Header row with Title, Search and Export Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Extrato Geral de Lançamentos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filtered.length} itens
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Período ativo: <span className="font-semibold text-teal-600 dark:text-teal-400">{currentPeriodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por descrição, centro..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Exportar PDF Contábil Button (Primary Action for Accountant) */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold transition shrink-0 shadow-sm hover:shadow cursor-pointer"
              title="Gerar relatório formal em PDF para contador ou prestação de contas"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF Contábil</span>
            </button>

            {/* Exportar Extrato (CSV com filtros ativos de busca e escopo) */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shrink-0 shadow-sm hover:shadow cursor-pointer active:scale-95"
              title={`Baixar ${filtered.length} lançamentos filtrados em formato CSV (compatível com Excel, Numbers e Google Sheets)`}
              data-testid="btn-export-extrato"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Extrato</span>
              <span className="hidden sm:inline opacity-80 text-[10px] font-semibold">
                ({filtered.length})
              </span>
            </button>
          </div>
        </div>

        {/* Feedback visual de exportação CSV com sucesso */}
        {exportNotification && (
          <div className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{exportNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportNotification(null)}
              className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Date Filter Bar with Presets & Date Pickers */}
        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase text-[10px] mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Período:
            </span>
            <button
              onClick={() => handleSelectPreset('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                datePreset === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleSelectPreset('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => handleSelectPreset('LAST_30_DAYS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                datePreset === 'LAST_30_DAYS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              onClick={() => handleSelectPreset('YEAR_CURRENT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
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
            <span className="text-[10px] uppercase font-bold text-slate-400">De:</span>
            <input 
              type="date"
              value={startDate}
              onChange={e => {
                setDatePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
            />
            <span className="text-[10px] uppercase font-bold text-slate-400">Até:</span>
            <input 
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
                onClick={() => handleSelectPreset('ALL')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Limpar filtro de data"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dimension Selectors (Escopo, Pote, Tipo, Conta) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value as 'ALL' | 'PF' | 'PJ')}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
            data-testid="select-scope-filter"
          >
            <option value="ALL">Todos os Escopos (Consolidado)</option>
            <option value="PF">Pessoa Física (PF)</option>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
          </select>

          <select
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
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todos os Tipos (Receitas & Despesas)</option>
            <option value="despesa">Despesas (-)</option>
            <option value="receita">Receitas (+)</option>
            <option value="reembolso">Reembolsos</option>
          </select>

          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">Todas as Contas</option>
            <option value="Inter PF">Inter PF</option>
            <option value="Inter PJ">Inter PJ</option>
            <option value="C6">Cartão C6</option>
            <option value="Passe">Passe / Transporte</option>
          </select>
        </div>
      </div>

      {/* Tabela de Extratos */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
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
                  const isPositive = tx.type === 'receita' || tx.type === 'reembolso';
                  const jarDef = JAR_DEFINITIONS[tx.jar] || JAR_DEFINITIONS.NEC_55;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{tx.description}</span>
                          {tx.notes && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction && onEditTransaction(tx)}
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
                          style={{ backgroundColor: `${jarDef.colorHex}15`, color: jarDef.colorHex }}
                        >
                          {jarDef.shortName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{tx.account}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{tx.costCenter}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onToggleStatus(tx.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            tx.status === 'liquidado'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {tx.status === 'liquidado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{tx.status === 'liquidado' ? 'Liquidado' : 'Agendado'}</span>
                        </button>
                      </td>
                      <td className={`py-3 px-4 text-right font-black whitespace-nowrap ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onEditTransaction && (
                            <button
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Editar lançamento"
                              data-testid={`edit-extrato-${tx.id}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
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
            <span className="text-slate-500">
              Recebimentos: <strong className="text-emerald-600 dark:text-emerald-400">+{formatBRL(totalFilteredReceipts)}</strong>
            </span>
            <span className="text-slate-500">
              Pagamentos: <strong className="text-rose-600 dark:text-rose-400">-{formatBRL(totalFilteredPayments)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] uppercase font-bold">Saldo Filtrado:</span>
            <strong className={`text-sm font-black ${
              totalFilteredReceipts - totalFilteredPayments >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}>
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

    </div>
  );
};
