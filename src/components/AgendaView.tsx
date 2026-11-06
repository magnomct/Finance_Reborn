import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, 
  Trash2, Edit3, Tag, X, Plus, Bell, List, CalendarDays 
} from 'lucide-react';
import { Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL, calculateFinancialMetrics } from '../utils/finance';
import { calculateReminderStatus } from '../utils/reminders';
import { AgendaWeeklyGrid } from './AgendaWeeklyGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSACTION_ITEM_VARIANTS, getTransactionItemTransition } from '../utils/motionTransitions';

interface AgendaViewProps {
  selectedMonth: string;
  selectedMonthIndex: number;
  setSelectedMonthIndex: (idx: number) => void;
  months: string[];
  filteredTransactions: Transaction[];
  totalTransactionsCount: number;
  selectedJarFilter: string;
  setSelectedJarFilter: (jar: string) => void;
  financialMetrics: ReturnType<typeof calculateFinancialMetrics>;
  onToggleStatus: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  theme: {
    card: string;
    hoverRow: string;
  };
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  selectedMonth,
  selectedMonthIndex,
  setSelectedMonthIndex,
  months,
  filteredTransactions,
  totalTransactionsCount,
  selectedJarFilter,
  setSelectedJarFilter,
  financialMetrics,
  onToggleStatus,
  onDeleteTransaction,
  onEditTransaction,
  onUpdateNotes,
  theme,
}) => {
  const [quickNotesTx, setQuickNotesTx] = useState<Transaction | null>(null);
  const [quickNotesValue, setQuickNotesValue] = useState<string>('');
  const [viewMode, setViewMode] = useState<'diario' | 'semanal'>('diario');

  const handleOpenQuickNotes = (tx: Transaction) => {
    setQuickNotesTx(tx);
    setQuickNotesValue(tx.notes || '');
  };

  const handleSaveQuickNotes = () => {
    if (!quickNotesTx) return;
    const trimmed = quickNotesValue.trim();
    if (onUpdateNotes) {
      onUpdateNotes(quickNotesTx.id, trimmed);
    } else if (onEditTransaction) {
      onEditTransaction({
        ...quickNotesTx,
        notes: trimmed || undefined
      });
    }
    setQuickNotesTx(null);
  };

  const handleClearQuickNotes = () => {
    if (!quickNotesTx) return;
    if (onUpdateNotes) {
      onUpdateNotes(quickNotesTx.id, '');
    } else if (onEditTransaction) {
      onEditTransaction({
        ...quickNotesTx,
        notes: undefined
      });
    }
    setQuickNotesTx(null);
  };
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Navegador de Mês estilo Yupee (< Outubro / 2026 >) + Alternador Diário / Semanal */}
      <div className={`${theme.card} p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <button 
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition disabled:opacity-30 cursor-pointer"
            onClick={() => setSelectedMonthIndex(Math.max(0, selectedMonthIndex - 1))}
            disabled={selectedMonthIndex === 0}
            title="Mês anterior"
            data-testid="btn-prev-month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center px-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedMonth}</span>
            <span className="text-[11px] block text-slate-400">
              {filteredTransactions.length} lançamentos registrados
            </span>
          </div>

          <button 
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition disabled:opacity-30 cursor-pointer"
            onClick={() => setSelectedMonthIndex(Math.min(months.length - 1, selectedMonthIndex + 1))}
            disabled={selectedMonthIndex === months.length - 1}
            title="Próximo mês"
            data-testid="btn-next-month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Diário / Semanal */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-center sm:self-auto border border-slate-200/60 dark:border-slate-700/60" data-testid="agenda-mode-toggle">
          <button
            type="button"
            onClick={() => setViewMode('diario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'diario'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            data-testid="toggle-view-diario"
            title="Visualização Diária Cronológica"
          >
            <List className="w-3.5 h-3.5" />
            <span>Diário</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('semanal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'semanal'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            data-testid="toggle-view-semanal"
            title="Visualização Semanal com fluxo de caixa acumulado"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Semanal</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs w-full max-w-full touch-pan-x">
        <button 
          onClick={() => setSelectedJarFilter('ALL')}
          className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
            selectedJarFilter === 'ALL' 
              ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Todos ({totalTransactionsCount})
        </button>

        <button 
          onClick={() => setSelectedJarFilter('NEC_55')}
          className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
            selectedJarFilter === 'NEC_55' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
          }`}
        >
          55% Necessidades
        </button>

        <button 
          onClick={() => setSelectedJarFilter('DIV_10')}
          className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
            selectedJarFilter === 'DIV_10' 
              ? 'bg-purple-600 text-white shadow-sm' 
              : 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900'
          }`}
        >
          10% Lazer / C6
        </button>

        <button 
          onClick={() => setSelectedJarFilter('PLP_10')}
          className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
            selectedJarFilter === 'PLP_10' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
          }`}
        >
          10% Reserva
        </button>

        <button 
          onClick={() => setSelectedJarFilter('PJ_EXCLUIDO')}
          className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition shrink-0 ${
            selectedJarFilter === 'PJ_EXCLUIDO' 
              ? 'bg-amber-600 text-white shadow-sm' 
              : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
          }`}
        >
          PJ Operacional
        </button>
      </div>

      {/* Alternância entre Visualização Diária e Visualização Semanal */}
      {viewMode === 'diario' ? (
        /* Daily Feed Cronológico */
        <div className={`${theme.card} rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80`} data-testid="agenda-daily-feed">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <List className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="font-semibold">Nenhuma movimentação encontrada para o filtro selecionado.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={true}>
            {filteredTransactions.map((tx, idx) => {
              const day = tx.date.split('-')[2] || '01';
              const isPositive = tx.type === 'receita' || tx.type === 'reembolso';
              const isOverdraftAlert = tx.description.toLowerCase().includes('cheque especial');
              const isMortgage = tx.description.toLowerCase().includes('financiamento');
              const jarDef = JAR_DEFINITIONS[tx.jar] || JAR_DEFINITIONS.NEC_55;

              return (
                <motion.div 
                  key={`${selectedMonth}-${selectedJarFilter}-${tx.id}`}
                  layout="position"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={getTransactionItemTransition(idx)}
                  className={`p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 ${theme.hoverRow} transition group w-full`}
                >
              {/* Day badge & info */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold shrink-0">
                  <span className="text-[9px] text-slate-400">DIA</span>
                  <span className="text-xs sm:text-sm font-black">{day}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-full">
                      {tx.description}
                    </h4>
                    
                    {/* Badge Dinâmico e Editável de Observações */}
                    {tx.notes ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuickNotes(tx);
                        }}
                        className="group/badge px-2 py-0.5 rounded-md text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/80 dark:hover:bg-blue-900 dark:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-xs border border-blue-200/80 dark:border-blue-800"
                        title="Clique para editar ou remover esta observação"
                        data-testid={`badge-obs-${tx.id}`}
                      >
                        <span>{tx.notes}</span>
                        <Edit3 className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-80 group-hover/badge:opacity-100 group-hover/badge:scale-110 transition shrink-0" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuickNotes(tx);
                        }}
                        className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 font-medium flex items-center gap-1 cursor-pointer transition"
                        title="Adicionar observação neste lançamento"
                        data-testid={`btn-add-obs-${tx.id}`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Obs</span>
                      </button>
                    )}

                    {isOverdraftAlert && !tx.notes?.includes('Evitável') && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Evitável
                      </span>
                    )}

                    {/* Badge Visual de Lembrete de Vencimento */}
                    {tx.reminderDaysBefore !== undefined && tx.reminderDaysBefore !== null && (() => {
                      const reminderInfo = calculateReminderStatus(tx, '2026-10-25');
                      if (tx.status === 'liquidado') {
                        return (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium flex items-center gap-1"
                            title={`Lembrete configurado (${tx.reminderDaysBefore}d antes) - Lançamento já liquidado`}
                            data-testid={`badge-reminder-${tx.id}`}
                          >
                            <Bell className="w-2.5 h-2.5 opacity-60" />
                            <span>Lembrete {tx.reminderDaysBefore}d</span>
                          </span>
                        );
                      }

                      return (
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                            reminderInfo.urgency === 'overdue'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse'
                              : reminderInfo.urgency === 'today'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse'
                              : reminderInfo.reminderActive
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium'
                          }`}
                          title={`Lembrete com ${tx.reminderDaysBefore} dias de antecedência: ${reminderInfo.message}`}
                          data-testid={`badge-reminder-${tx.id}`}
                        >
                          <Bell className={`w-2.5 h-2.5 ${reminderInfo.reminderActive ? 'text-amber-600 dark:text-amber-400' : 'opacity-60'}`} />
                          <span>{reminderInfo.reminderActive ? reminderInfo.message : `Lembrete ${tx.reminderDaysBefore}d`}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500 dark:text-slate-300">{tx.account}</span>
                    <span>•</span>
                    <span>{tx.costCenter}</span>
                    <span>•</span>
                    <span 
                      className="font-medium"
                      style={{ color: jarDef.colorHex }}
                    >
                      {jarDef.shortName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center gap-3 text-right shrink-0">
                <div>
                  <span className={`text-sm sm:text-base font-black ${
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                  </span>
                  
                  <div 
                    onClick={() => onToggleStatus(tx.id)}
                    className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-0.5 cursor-pointer hover:text-blue-500"
                    title="Clique para alternar status"
                  >
                    <CheckCircle2 className={`w-3 h-3 ${tx.status === 'liquidado' ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span>{tx.status === 'liquidado' ? 'Liquidado' : 'Agendado'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenQuickNotes(tx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={tx.notes ? "Editar observação" : "Adicionar observação"}
                    data-testid={`btn-obs-action-${tx.id}`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>

                  {onEditTransaction && (
                    <button 
                      onClick={() => onEditTransaction(tx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Editar lançamento completo"
                      data-testid={`edit-tx-${tx.id}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="opacity-70 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Remover transação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
        )}
      </div>
      ) : (
        /* Visualização Semanal em Grid com Fluxo Acumulado */
        <AgendaWeeklyGrid
          transactions={filteredTransactions}
          selectedMonth={selectedMonth}
          onToggleStatus={onToggleStatus}
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={onEditTransaction}
          onOpenQuickNotes={handleOpenQuickNotes}
          theme={theme}
        />
      )}

      {/* Clássico Rodapé Yupee de Totais */}
      <div className={`${theme.card} p-4 rounded-3xl space-y-2 border-t-2 border-blue-500`}>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Total de recebimentos no mês:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            +{formatBRL(financialMetrics.totalReceipts)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Total de pagamentos no mês:</span>
          <span className="font-bold text-rose-500 dark:text-rose-400 text-sm">
            -{formatBRL(financialMetrics.totalPayments)}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
              Resultado Consolidado
            </span>
            <span className="text-[11px] text-slate-500">CLT R$ 2.060 + Lucro PJ R$ 1.592</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              +{formatBRL(financialMetrics.netBalanceConsolidated)}
            </span>
            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              Superávit Confirmado 🎉
            </span>
          </div>
        </div>
      </div>

      {/* Modal Rápido de Edição de Observações / Tags */}
      {quickNotesTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Editar Observação
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {quickNotesTx.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickNotesTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Texto da Observação / Badge
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Nathan 60%, Parcela 1/12, Evitável..."
                value={quickNotesValue}
                onChange={e => setQuickNotesValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveQuickNotes();
                  } else if (e.key === 'Escape') {
                    setQuickNotesTx(null);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-quick-notes"
              />

              {/* Chips de atalhos rápidos */}
              <div className="mt-2.5 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Sugestões rápidas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Nathan 60%', 'Magno 40%', 'Reembolso 50%', 'Evitável', 'Parcela 1/12', 'Pendente aprovação'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickNotesValue(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        quickNotesValue === preset
                          ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {quickNotesTx.notes ? (
                <button
                  type="button"
                  onClick={handleClearQuickNotes}
                  className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                  data-testid="btn-clear-quick-notes"
                >
                  Remover
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickNotesTx(null)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickNotes}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  data-testid="btn-save-quick-notes"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
