import React, { useState, useMemo } from 'react';
import { 
  Calendar, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, 
  Trash2, Edit3, Plus, ArrowUpRight, ArrowDownRight, Tag,
  Clock, DollarSign, ChevronRight, Layers, Bell, FileText
} from 'lucide-react';
import { Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL, formatNumber } from '../utils/finance';
import { calculateReminderStatus } from '../utils/reminders';
import { 
  buildWeeklyCalendar, 
  WeekGroup, 
  DayColumn, 
  WEEKDAY_SHORT 
} from '../utils/agendaWeekly';

interface AgendaWeeklyGridProps {
  transactions: Transaction[];
  selectedMonth: string;
  onToggleStatus: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onOpenQuickNotes?: (tx: Transaction) => void;
  onAddNewForDate?: (dateStr: string) => void;
  theme: {
    card: string;
    hoverRow: string;
  };
}

export const AgendaWeeklyGrid: React.FC<AgendaWeeklyGridProps> = ({
  transactions,
  selectedMonth,
  onToggleStatus,
  onDeleteTransaction,
  onEditTransaction,
  onOpenQuickNotes,
  onAddNewForDate,
  theme
}) => {
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'ALL'>('ALL');

  const calendarData = useMemo(() => {
    return buildWeeklyCalendar(transactions, selectedMonth);
  }, [transactions, selectedMonth]);

  const displayedWeeks = useMemo(() => {
    if (selectedWeekFilter === 'ALL') {
      return calendarData.weeks;
    }
    return calendarData.weeks.filter(w => w.weekNumber === selectedWeekFilter);
  }, [calendarData.weeks, selectedWeekFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150" data-testid="agenda-weekly-view">
      
      {/* Month Cash Flow Progression Timeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {calendarData.weeks.map(week => {
          const isSelected = selectedWeekFilter === week.weekNumber;
          const isPositiveWeek = week.net >= 0;
          const isPositiveAccum = week.accumulatedCashFlow >= 0;

          return (
            <button
              key={week.weekNumber}
              type="button"
              onClick={() => setSelectedWeekFilter(prev => prev === week.weekNumber ? 'ALL' : week.weekNumber)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-400/40 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              data-testid={`btn-select-week-${week.weekNumber}`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">
                    {week.shortLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {week.dateRangeLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[10px] text-slate-500 font-medium">Fluxo Semanal:</span>
                  <span className={`font-mono font-bold text-[11px] ${isPositiveWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {week.net > 0 ? '+' : ''}{formatBRL(week.net)}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold">Acumulado Mês:</span>
                <span className={`font-mono font-black ${isPositiveAccum ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {week.accumulatedCashFlow > 0 ? '+' : ''}{formatBRL(week.accumulatedCashFlow)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter / View Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Grade Semanal de Dias ({calendarData.monthName} / {calendarData.year})
          </span>
          <span className="text-slate-400 text-[11px]">
            • {calendarData.summary.totalTransactions} transações no mês
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedWeekFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedWeekFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'
            }`}
          >
            Todas as Semanas
          </button>
          {calendarData.weeks.map(w => (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => setSelectedWeekFilter(w.weekNumber)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedWeekFilter === w.weekNumber
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Sem {w.weekNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Sections List */}
      <div className="space-y-6">
        {displayedWeeks.map(week => {
          const isPositiveWeek = week.net >= 0;
          const isPositiveAccum = week.accumulatedCashFlow >= 0;

          return (
            <div 
              key={week.weekNumber} 
              className={`${theme.card} rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs`}
              data-testid={`weekly-group-${week.weekNumber}`}
            >
              {/* Week Header & Cumulative Cash Flow Summary */}
              <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    S{week.weekNumber}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {week.label}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {week.transactionCount === 0 ? 'Sem lançamentos nesta semana' : `${week.transactionCount} lançamento(s) na semana`}
                    </p>
                  </div>
                </div>

                {/* Week Cashflow Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                  {/* Entradas da semana */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">+{formatBRL(week.income)}</span>
                  </div>

                  {/* Saídas da semana */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">-{formatBRL(week.expense)}</span>
                  </div>

                  {/* Saldo Líquido da semana */}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold border ${
                    isPositiveWeek 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                  }`}>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Semana:</span>
                    <span className="font-mono">{week.net > 0 ? '+' : ''}{formatBRL(week.net)}</span>
                  </div>

                  {/* Saldo Acumulado no Mês até esta semana */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100/80 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800 font-black">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">Acumulado Mês:</span>
                    <span className="font-mono">{week.accumulatedCashFlow > 0 ? '+' : ''}{formatBRL(week.accumulatedCashFlow)}</span>
                  </div>
                </div>
              </div>

              {/* 7-Column Day Grid (Segunda a Domingo) */}
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2.5">
                  {week.days.map((dayCol, colIdx) => {
                    if (!dayCol.isInCurrentMonth) {
                      return (
                        <div 
                          key={`empty-${colIdx}`}
                          className="hidden lg:flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800/60 opacity-40 min-h-[120px]"
                        >
                          <span className="text-[11px] font-bold text-slate-400 uppercase">
                            {dayCol.dayOfWeekShort}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">—</span>
                        </div>
                      );
                    }

                    const hasTxs = dayCol.transactions.length > 0;
                    const isPositiveDay = dayCol.net >= 0;

                    return (
                      <div
                        key={dayCol.dateStr}
                        className={`flex flex-col justify-between p-3 rounded-2xl border transition ${
                          hasTxs 
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs' 
                            : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/60'
                        }`}
                        data-testid={`day-col-${dayCol.dateStr}`}
                      >
                        {/* Day Header */}
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center">
                                {dayCol.dayOfMonth}
                              </span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                {dayCol.dayOfWeekShort}
                              </span>
                            </div>

                            {/* Daily Net Flow */}
                            {hasTxs ? (
                              <span className={`text-[10px] font-mono font-bold ${isPositiveDay ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {dayCol.net > 0 ? '+' : ''}{formatBRL(dayCol.net)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                R$ 0
                              </span>
                            )}
                          </div>

                          {/* Transactions in Day */}
                          <div className="mt-2.5 space-y-2">
                            {hasTxs ? (
                              dayCol.transactions.map(tx => {
                                const isPositive = tx.type === 'receita' || tx.type === 'reembolso';
                                const jarDef = JAR_DEFINITIONS[tx.jar] || JAR_DEFINITIONS.NEC_55;
                                const reminder = calculateReminderStatus(tx, '2026-10-25');

                                return (
                                  <div
                                    key={tx.id}
                                    className={`p-2 rounded-xl border text-xs transition relative group/tx ${
                                      tx.status === 'liquidado'
                                        ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60'
                                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60'
                                    }`}
                                    data-testid={`weekly-tx-${tx.id}`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight" title={tx.description}>
                                        {tx.description}
                                      </span>
                                      
                                      {/* Quick status toggle */}
                                      <button
                                        type="button"
                                        onClick={() => onToggleStatus(tx.id)}
                                        className={`shrink-0 p-0.5 rounded cursor-pointer transition ${
                                          tx.status === 'liquidado'
                                            ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
                                            : 'text-amber-500 hover:text-amber-600'
                                        }`}
                                        title={tx.status === 'liquidado' ? 'Liquidado (clique p/ agendar)' : 'Agendado (clique p/ liquidar)'}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Amount */}
                                    <div className="mt-1 flex items-baseline justify-between">
                                      <span className={`font-mono font-black text-xs ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {isPositive ? '+' : '-'} {formatBRL(Math.abs(tx.amount))}
                                      </span>
                                      <span className="text-[9px] text-slate-400">
                                        {tx.account}
                                      </span>
                                    </div>

                                    {/* Tags & Notes */}
                                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${jarDef.bgClass} ${jarDef.textClass}`}>
                                        {jarDef.shortName}
                                      </span>

                                      {tx.notes && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenQuickNotes && onOpenQuickNotes(tx)}
                                          className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 transition cursor-pointer flex items-center gap-1"
                                          title={`Observação: ${tx.notes} (clique para editar)`}
                                          data-testid={`weekly-badge-obs-${tx.id}`}
                                        >
                                          <span>{tx.notes}</span>
                                          <Edit3 className="w-2.5 h-2.5 opacity-70" />
                                        </button>
                                      )}

                                      {reminder.reminderActive && (
                                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold flex items-center gap-0.5 ${
                                          reminder.urgency === 'overdue' 
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        }`}>
                                          <Bell className="w-2 h-2" />
                                          {reminder.daysRemaining === 0 ? 'Hoje' : `${reminder.daysRemaining}d`}
                                        </span>
                                      )}
                                    </div>

                                    {/* Action buttons (appear on hover) */}
                                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
                                      <button
                                        type="button"
                                        onClick={() => onOpenQuickNotes && onOpenQuickNotes(tx)}
                                        className="hover:text-blue-500 flex items-center gap-0.5 cursor-pointer"
                                        title="Editar observação"
                                      >
                                        <FileText className="w-2.5 h-2.5" /> Obs
                                      </button>
                                      {onEditTransaction && (
                                        <button
                                          type="button"
                                          onClick={() => onEditTransaction(tx)}
                                          className="hover:text-amber-500 flex items-center gap-0.5 cursor-pointer"
                                          title="Editar lançamento"
                                        >
                                          <Edit3 className="w-2.5 h-2.5" /> Editar
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onDeleteTransaction(tx.id)}
                                        className="hover:text-rose-500 flex items-center gap-0.5 cursor-pointer"
                                        title="Excluir lançamento"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-4 text-center">
                                <span className="text-[10px] text-slate-300 dark:text-slate-600 block">
                                  Sem lançamentos
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Add Button for this day */}
                        {onAddNewForDate && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => onAddNewForDate(dayCol.dateStr)}
                              className="w-full py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800/60 transition flex items-center justify-center gap-1 cursor-pointer"
                              title={`Novo lançamento em ${dayCol.dayOfMonth}/${selectedMonth}`}
                            >
                              <Plus className="w-3 h-3" /> Adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
