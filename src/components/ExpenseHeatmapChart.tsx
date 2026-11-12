import React, { useState, useMemo } from 'react';
import { 
  Flame, Calendar, Filter, Sparkles, AlertTriangle, ShieldCheck, 
  ArrowRight, DollarSign, Layers, ChevronDown, CheckCircle2, 
  X, Info, BarChart2, TrendingDown, Clock, HelpCircle, Eye
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { formatBRL } from '../utils/finance';
import { 
  buildExpenseHeatmapData, 
  DayExpenseCell, 
  HeatmapFilterOptions,
  ExpenseHeatmapResult,
  SeasonalDayInsight
} from '../utils/expenseHeatmap';

interface ExpenseHeatmapChartProps {
  transactions: Transaction[];
  selectedMonth?: string;
  onSelectDateInAgenda?: (dateStr: string) => void;
}

export const ExpenseHeatmapChart: React.FC<ExpenseHeatmapChartProps> = ({
  transactions,
  selectedMonth = 'Outubro',
  onSelectDateInAgenda
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [jarFilter, setJarFilter] = useState<JarType | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dayTypeFilter, setDayTypeFilter] = useState<'ALL' | 'WEEKDAYS' | 'WEEKENDS'>('ALL');
  const [viewMode, setViewMode] = useState<'matriz' | 'padroes' | 'ambos'>('ambos');
  
  // Selected cell for detailed modal
  const [selectedCell, setSelectedCell] = useState<DayExpenseCell | null>(null);
  const [hoveredCell, setHoveredCell] = useState<DayExpenseCell | null>(null);

  // Filter options
  const filterOptions: HeatmapFilterOptions = useMemo(() => ({
    jarFilter,
    categoryFilter,
    dayTypeFilter,
    year: selectedYear
  }), [jarFilter, categoryFilter, dayTypeFilter, selectedYear]);

  // Heatmap calculated data
  const heatmapData: ExpenseHeatmapResult = useMemo(() => {
    return buildExpenseHeatmapData({
      transactions,
      year: selectedYear,
      filters: filterOptions
    });
  }, [transactions, selectedYear, filterOptions]);

  // Helper for cell background color according to intensity level (0..4)
  const getCellBgClass = (cell: DayExpenseCell) => {
    if (!cell.isValidDay) {
      return 'bg-slate-100/40 dark:bg-slate-800/20 border-transparent cursor-not-allowed opacity-30';
    }
    if (cell.totalSpent <= 0) {
      return 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/80 border-slate-200/50 dark:border-slate-800 text-slate-400';
    }
    switch (cell.intensityLevel) {
      case 1:
        // Leve (R$ 1 a R$ 150)
        return 'bg-amber-100/90 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
      case 2:
        // Moderado (R$ 151 a R$ 500)
        return 'bg-orange-300/90 dark:bg-orange-800/70 hover:bg-orange-400 dark:hover:bg-orange-700 border-orange-400 dark:border-orange-600 text-orange-950 dark:text-white font-medium';
      case 3:
        // Elevado (R$ 501 a R$ 1200)
        return 'bg-rose-400 dark:bg-rose-700 hover:bg-rose-500 dark:hover:bg-rose-600 border-rose-500 dark:border-rose-500 text-white font-bold shadow-xs';
      case 4:
        // Crítico/Pico (> R$ 1200 ou fatura concentrada)
        return 'bg-rose-600 dark:bg-rose-600 hover:bg-rose-700 dark:hover:bg-rose-500 border-rose-700 dark:border-rose-400 text-white font-black shadow-sm ring-1 ring-rose-400 animate-pulse-slow';
      default:
        return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800';
    }
  };

  const { patterns } = heatmapData;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6" data-testid="expense-heatmap-container">
      
      {/* 1. Header do Mapa de Calor */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Flame className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Mapa de Calor de Despesas
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                Sazonalidade Anual
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Intensidade de gastos por dia do mês ao longo do ano. Identifique padrões sazonais de consumo, dias de pico recorrente e semanas críticas de desembolso.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Despesas Ano</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono" data-testid="kpi-total-year-expenses">
              {formatBRL(heatmapData.totalYearExpenses)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Dia de Maior Pico</span>
            <span className="text-sm font-black text-orange-600 dark:text-orange-400 font-mono" data-testid="kpi-busiest-day">
              Dia {patterns.busiestDayOfYear.dayOfMonth} ({formatBRL(patterns.busiestDayOfYear.totalSpent)})
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Média por Dia Ativo</span>
            <span className="text-sm font-black text-slate-800 dark:text-white font-mono">
              {formatBRL(heatmapData.avgDailyExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filtros e Controles Interativos */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none outline-none cursor-pointer pr-1"
              data-testid="select-heatmap-year"
            >
              <option value={2026}>Ano 2026</option>
              <option value={2025}>Ano 2025</option>
            </select>
          </div>

          {/* Jar Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pote:</span>
            <select
              value={jarFilter}
              onChange={(e) => setJarFilter(e.target.value as any)}
              className="bg-transparent border-none outline-none cursor-pointer pr-1"
              data-testid="select-heatmap-jar"
            >
              <option value="ALL">Todos os 6 Potes</option>
              <option value="NEC_55">Necessidades (55%)</option>
              <option value="DIV_10">Lazer (10%)</option>
              <option value="PLP_10">Reserva & Sonhos (10%)</option>
              <option value="LIF_10">Investimentos (10%)</option>
              <option value="EDU_10">Educação (10%)</option>
              <option value="FER_5">Férias & Doações (5%)</option>
            </select>
          </div>

          {/* Category Filter */}
          {heatmapData.availableCategories.length > 0 && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Categoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                data-testid="select-heatmap-category"
              >
                <option value="ALL">Todas as Categorias</option>
                {heatmapData.availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day type filter: All, Weekdays, Weekends */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setDayTypeFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                dayTypeFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDayTypeFilter('WEEKDAYS')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                dayTypeFilter === 'WEEKDAYS'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Apenas dias úteis (Segunda a Sexta)"
            >
              Dias Úteis
            </button>
            <button
              onClick={() => setDayTypeFilter('WEEKENDS')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                dayTypeFilter === 'WEEKENDS'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Apenas fins de semana (Sábado e Domingo)"
            >
              Fins de Semana
            </button>
          </div>

        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'matriz' ? 'ambos' : 'matriz')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'matriz'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>Matriz Mês × Dia</span>
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'padroes' ? 'ambos' : 'padroes')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'padroes'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            data-testid="btn-view-padroes-sazonais"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Padrões Sazonais</span>
          </button>
        </div>

      </div>

      {/* 3. Legenda Térmica (Escala de Calor) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/60 dark:bg-slate-800/30 px-3.5 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          Escala de Intensidade:
        </span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <span className="text-slate-500">R$ 0 (Livre)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800" />
            <span className="text-slate-600 dark:text-slate-400">R$ 1 a R$ 150 (Leve)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-orange-300 dark:bg-orange-800/80 border border-orange-400 dark:border-orange-600" />
            <span className="text-slate-600 dark:text-slate-400">R$ 151 a R$ 500 (Moderado)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-400 dark:bg-rose-700 border border-rose-500" />
            <span className="text-slate-600 dark:text-slate-400">R$ 501 a R$ 1.200 (Elevado)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-600 dark:bg-rose-600 border border-rose-700 ring-1 ring-rose-400" />
            <span className="text-rose-600 dark:text-rose-400 font-bold">&gt; R$ 1.200 (Pico Crítico)</span>
          </div>
        </div>
      </div>

      {/* 4. Insight Headline Banner */}
      <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-bold text-orange-900 dark:text-orange-200 block">
              {patterns.headlineInsight}
            </span>
            <p className="text-[11px] text-orange-700/90 dark:text-orange-300/80 mt-0.5">
              {patterns.diagnosisText}
            </p>
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block sm:text-right">
            Colchão de Liquidez Sugerido
          </span>
          <span className="text-sm font-black text-orange-900 dark:text-orange-100 font-mono">
            {formatBRL(patterns.recommendedLiquidityBuffer)}
          </span>
        </div>
      </div>

      {/* 5. MATRIZ DE CALOR (12 Meses × 31 Dias) */}
      {(viewMode === 'matriz' || viewMode === 'ambos') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Matriz do Ano {selectedYear} • 12 Meses × 31 Dias
            </h4>
            <span className="text-[11px] text-slate-400">
              💡 Clique ou passe o mouse em qualquer célula para ver detalhes do dia
            </span>
          </div>

          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="min-w-[760px]">
              
              {/* Header: Dias 1 a 31 */}
              <div className="grid grid-cols-[80px_repeat(31,1fr)_85px] gap-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 text-center">
                <div className="text-left pl-1">Mês</div>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const isHighlightDay = d === 5 || d === 10 || d === 15 || d === 20 || d === 22 || d === 25 || d === 30;
                  return (
                    <div 
                      key={d} 
                      className={`truncate ${
                        isHighlightDay 
                          ? 'text-orange-600 dark:text-orange-400 font-black' 
                          : 'text-slate-400'
                      }`}
                      title={`Dia ${d}`}
                    >
                      {d}
                    </div>
                  );
                })}
                <div className="text-right pr-1">Total Mês</div>
              </div>

              {/* Rows: 12 Meses */}
              <div className="space-y-1.5 pt-1.5">
                {heatmapData.matrix.map((monthCells, mIdx) => {
                  const monthSummary = heatmapData.monthsSummary[mIdx];
                  const isCurrentSelectedMonth = monthSummary.monthName.toLowerCase() === selectedMonth.toLowerCase();

                  return (
                    <div 
                      key={mIdx}
                      className={`grid grid-cols-[80px_repeat(31,1fr)_85px] gap-1 items-center p-1 rounded-xl transition ${
                        isCurrentSelectedMonth 
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-300 dark:ring-blue-900/60' 
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                      }`}
                      data-testid={`heatmap-row-${mIdx}`}
                    >
                      {/* Month label */}
                      <div className="flex items-center gap-1 pl-1">
                        <span className={`text-xs font-bold truncate ${
                          isCurrentSelectedMonth 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {monthSummary.monthShortName}
                        </span>
                        {monthSummary.isPeakMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Mês de maior pico de despesas no ano" />
                        )}
                      </div>

                      {/* 31 Day Cells */}
                      {monthCells.map((cell) => {
                        const bgClass = getCellBgClass(cell);
                        const isHovered = hoveredCell?.dateStr === cell.dateStr;

                        return (
                          <button
                            key={cell.dayOfMonth}
                            type="button"
                            disabled={!cell.isValidDay}
                            onClick={() => {
                              if (cell.isValidDay) {
                                setSelectedCell(cell);
                              }
                            }}
                            onMouseEnter={() => cell.isValidDay && setHoveredCell(cell)}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`h-6 sm:h-7 rounded-md border text-[9px] flex items-center justify-center transition-all duration-150 relative cursor-pointer ${bgClass} ${
                              isHovered ? 'scale-110 z-10 shadow-md ring-2 ring-blue-500' : ''
                            }`}
                            title={
                              cell.isValidDay 
                                ? `${cell.dayOfMonth} de ${cell.monthName}: ${formatBRL(cell.totalSpent)} (${cell.transactionCount} lançamentos)`
                                : 'Dia inexistente'
                            }
                            data-testid={`heatmap-cell-${cell.monthIndex}-${cell.dayOfMonth}`}
                          >
                            {cell.isValidDay && cell.totalSpent > 0 ? (
                              <span className="truncate px-0.5 leading-none">
                                {cell.intensityLevel >= 3 ? '🔥' : cell.dayOfMonth}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}

                      {/* Month Total */}
                      <div className="text-right pr-1">
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 font-mono">
                          {formatBRL(monthSummary.totalSpent).split(',')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column Summary: Totais por Dia do Mês */}
              <div className="grid grid-cols-[80px_repeat(31,1fr)_85px] gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 text-center items-end">
                <div className="text-left pl-1 font-bold">Média/Dia</div>
                {heatmapData.dayTotalsAcrossYear.map((d) => {
                  const maxDayVal = Math.max(...heatmapData.dayTotalsAcrossYear.map(x => x.avg), 1);
                  const barHeight = Math.max(3, Math.round((d.avg / maxDayVal) * 22));
                  const isTopDay = patterns.topDaysOfMonth.some(td => td.dayOfMonth === d.dayOfMonth);

                  return (
                    <div key={d.dayOfMonth} className="flex flex-col items-center gap-0.5" title={`Dia ${d.dayOfMonth}: Média de ${formatBRL(d.avg)}/mês`}>
                      <div 
                        className={`w-full max-w-[12px] rounded-t transition-all ${
                          isTopDay 
                            ? 'bg-rose-500 dark:bg-rose-400 shadow-xs' 
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                      <span className={`text-[8px] leading-none ${isTopDay ? 'font-black text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {d.dayOfMonth}
                      </span>
                    </div>
                  );
                })}
                <div className="text-right pr-1 font-bold text-slate-500">Acumulado</div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. PADRÕES SAZONAIS & RANKING DE DIAS CRÍTICOS */}
      {(viewMode === 'padroes' || viewMode === 'ambos') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Diagnóstico de Padrões Sazonais de Consumo
            </h4>
            <span className="text-xs text-slate-400">
              Análise comportamental ao longo dos 12 meses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Top Dias Mais Caros do Mês */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Flame className="w-4 h-4" />
                  Dias de Pico Recorrente
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Top 3
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {patterns.topDaysOfMonth.slice(0, 3).map((item, idx) => (
                  <div key={item.dayOfMonth} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <strong className="text-slate-900 dark:text-white">Dia {item.dayOfMonth}</strong>
                        <span className="text-[10px] text-slate-400">({item.sharePctOfYear}% do ano)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[150px]">
                        {item.primaryReason}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono block">
                        {formatBRL(item.avgSpentMonth)}
                      </span>
                      <span className="text-[9px] text-slate-400">média/mês</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Semana Crítica (Concentração) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <Clock className="w-4 h-4" />
                  Semana de Maior Pressão
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                  {patterns.concentrationWeek.sharePct}% do Total
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {patterns.concentrationWeek.weekRange}
                  </span>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                    {formatBRL(patterns.concentrationWeek.totalSpent)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full" 
                    style={{ width: `${Math.min(100, patterns.concentrationWeek.sharePct)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {patterns.concentrationWeek.description}. Concentra mais da metade das saídas mensais.
                </p>
              </div>
            </div>

            {/* Card 3: Dias Úteis vs Fins de Semana */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <BarChart2 className="w-4 h-4" />
                  Perfil Semanal
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold capitalize">
                  {patterns.weekdayVsWeekend.primaryProfile.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-bold block">Dias Úteis (Seg-Sex)</span>
                    <span className="text-[10px] text-slate-400">Contas fixas, moradia e condução</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-white font-mono block">
                      {formatBRL(patterns.weekdayVsWeekend.weekdayAvg)}
                    </span>
                    <span className="text-[9px] text-slate-400">por dia útil</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-bold block">Fins de Semana (Sáb-Dom)</span>
                    <span className="text-[10px] text-slate-400">Lazer, alimentação e saídas</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-white font-mono block">
                      {formatBRL(patterns.weekdayVsWeekend.weekendAvg)}
                    </span>
                    <span className="text-[9px] text-slate-400">por fim de semana</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Trimestres & Sazonalidade Anual */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  Blindagem de Caixa
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Segurança
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Mês de Maior Saída:</span>
                  <strong className="text-purple-600 dark:text-purple-400">
                    {patterns.topMonths[0]?.monthName || 'Outubro'} ({patterns.topMonths[0]?.sharePct}%)
                  </strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pico Diário Máximo:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">
                    {formatBRL(patterns.busiestDayOfYear.totalSpent)}
                  </strong>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Mantenha a reserva do pote <strong>PLP 10%</strong> intacta para cobrir antecipadamente a concentração dos dias 22 e 25.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL DE DETALHES DO DIA SELECIONADO */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl max-w-lg w-full space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  Detalhamento do Dia
                </span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedCell.dayOfWeekName}, {selectedCell.dayOfMonth} de {selectedCell.monthName} de {selectedYear}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                data-testid="btn-fechar-modal-dia"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Gasto</span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">
                  {formatBRL(selectedCell.totalSpent)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lançamentos</span>
                <span className="text-xl font-black text-slate-800 dark:text-white">
                  {selectedCell.transactionCount} {selectedCell.transactionCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Composição do Desembolso:
              </span>

              {selectedCell.transactions.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {selectedCell.transactions.map((tx) => {
                    const jarDef = JAR_DEFINITIONS[tx.jar as JarType];
                    return (
                      <div 
                        key={tx.id} 
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {tx.description}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: jarDef?.colorHex || '#94A3B8' }} 
                            />
                            <span className="text-[10px] text-slate-500">
                              {jarDef?.shortName || tx.jar} • {tx.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono block">
                            -{formatBRL(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                  Nenhum gasto registrado neste dia. Data livre de desembolsos! 🎉
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                {selectedCell.isWeekend ? 'Fim de Semana (Sáb/Dom)' : 'Dia Útil (Seg a Sex)'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs hover:opacity-90 cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
