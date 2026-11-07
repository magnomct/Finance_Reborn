import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, 
  Calendar, DollarSign, Layers, ArrowUpRight, ArrowDownRight,
  Info, Sparkles, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculate6MonthBalanceEvolution, 
  MonthBalancePoint, 
  MonthlyEvolutionSummary 
} from '../utils/monthlyEvolution';

interface MonthlyBalanceLineChartProps {
  transactions: Transaction[];
  usePjProfitInPf?: boolean;
  selectedMonth?: string;
  onSelectMonth?: (monthIndex: number) => void;
}

export const MonthlyBalanceLineChart: React.FC<MonthlyBalanceLineChartProps> = ({
  transactions,
  usePjProfitInPf = true,
  selectedMonth = 'Outubro',
  onSelectMonth,
}) => {
  const [activeSeries, setActiveSeries] = useState<'all' | 'saldo' | 'fluxo'>('all');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(9); // Default Outubro (idx 9)
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  const summary: MonthlyEvolutionSummary = useMemo(() => {
    return calculate6MonthBalanceEvolution({
      currentTransactions: transactions,
      usePjProfitInPf,
    });
  }, [transactions, usePjProfitInPf]);

  const activeMonth = useMemo(() => {
    const targetIdx = hoveredPointIdx !== null ? hoveredPointIdx : selectedMonthIdx;
    if (targetIdx === null) return summary.months[summary.months.length - 1];
    return summary.months.find(m => m.monthIndex === targetIdx) || summary.months[summary.months.length - 1];
  }, [summary.months, selectedMonthIdx, hoveredPointIdx]);

  // Chart coordinates mapping
  const width = 1000;
  const height = 300;
  const paddingLeft = 70;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find bounds across series to scale Y axis nicely
  const { minVal, maxVal } = useMemo(() => {
    let min = 0;
    let max = 6000;

    summary.months.forEach(m => {
      max = Math.max(max, m.receitas, m.despesas, m.saldo);
      min = Math.min(min, m.saldo, 0);
    });

    // Add 12% buffer to max and ensure min is comfortable
    const upper = Math.ceil((max * 1.12) / 500) * 500;
    const lower = min < 0 ? Math.floor((min * 1.2) / 500) * 500 : 0;
    return { minVal: lower, maxVal: upper };
  }, [summary.months]);

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  const getX = (index: number) => {
    const step = chartWidth / (summary.months.length - 1 || 1);
    return paddingLeft + index * step;
  };

  // Zero-line Y coordinate
  const zeroY = getY(0);

  // Generate paths
  const incomePoints = summary.months.map((m, idx) => ({ x: getX(idx), y: getY(m.receitas), m }));
  const expensePoints = summary.months.map((m, idx) => ({ x: getX(idx), y: getY(m.despesas), m }));
  const balancePoints = summary.months.map((m, idx) => ({ x: getX(idx), y: getY(m.saldo), m }));

  const generateLinePath = (pts: { x: number; y: number }[]) => {
    return pts.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  const incomePath = generateLinePath(incomePoints);
  const expensePath = generateLinePath(expensePoints);
  const balancePath = generateLinePath(balancePoints);

  const incomeArea = `${incomePath} L ${getX(summary.months.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;
  const expenseArea = `${expensePath} L ${getX(summary.months.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;
  const balanceArea = `${balancePath} L ${getX(summary.months.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;

  // Grid tick values (4 steps)
  const gridTicks = useMemo(() => {
    const ticks = [];
    const step = (maxVal - minVal) / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(minVal + i * step);
    }
    return ticks;
  }, [minVal, maxVal]);

  return (
    <div 
      className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200"
      data-testid="container-grafico-linha-evolucao"
    >
      
      {/* Header com Título, Seletor de Curvas e Status da Tendência */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-blue-500 text-white shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Histórico Semestral & Tendências
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white" data-testid="titulo-grafico-linha">
            Evolução do Saldo Mensal (Últimos 6 Meses)
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhe o comportamento de receitas vs despesas e a curva de poupança líquida para detectar tendências de economia ou gastos excessivos.
          </p>
        </div>

        {/* Badges de Diagnóstico e Seletor de Curvas */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Badge de Diagnóstico da Tendência */}
          <div 
            className={`px-3 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 border shadow-2xs ${
              summary.trendStatus === 'economia'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : summary.trendStatus === 'gastos_excessivos'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
            }`}
            data-testid="badge-diagnostico-tendencia"
          >
            {summary.trendStatus === 'economia' ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : summary.trendStatus === 'gastos_excessivos' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            )}
            <span>{summary.trendHeadline}</span>
          </div>

          {/* Toggle de Visualização de Linhas */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveSeries('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeSeries === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Exibir todas as curvas (Receitas, Despesas e Saldo)"
            >
              Todas
            </button>
            <button
              onClick={() => setActiveSeries('saldo')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeSeries === 'saldo' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Exibir somente a curva do Saldo Líquido"
            >
              Só Saldo
            </button>
            <button
              onClick={() => setActiveSeries('fluxo')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeSeries === 'fluxo' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Exibir Receitas vs Despesas"
            >
              Receitas vs Despesas
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Cards Resumo dos 6 Meses */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Média Receitas</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
            {formatBRL(summary.averageIncome)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">mensal no semestre</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Média Despesas</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 block">
            {formatBRL(summary.averageExpenses)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {((summary.averageExpenses / (summary.averageIncome || 1)) * 100).toFixed(0)}% da renda média
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Saldo Médio Livre</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 block">
            +{formatBRL(summary.averageBalance)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Média de {summary.averageSavingsRate}% de economia
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Poupança Semestral</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 block">
            +{formatBRL(summary.totalSavingsPeriod)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
            {summary.isConsistentSaver ? 'Consistência Comprovada ✅' : 'Monitorar Gastos ⚠️'}
          </span>
        </div>
      </div>

      {/* Legenda das Linhas do Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1">
        <div className="flex items-center gap-4">
          {(activeSeries === 'all' || activeSeries === 'fluxo') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Receitas</span>
            </div>
          )}

          {(activeSeries === 'all' || activeSeries === 'fluxo') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 rounded-full bg-rose-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Despesas</span>
            </div>
          )}

          {(activeSeries === 'all' || activeSeries === 'saldo') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1.5 rounded-full bg-blue-500" />
              <span className="font-black text-blue-600 dark:text-blue-400 text-[11px]">Saldo Líquido</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
            <span>Linha Zero (Equilíbrio)</span>
          </div>
        </div>

        {activeMonth && (
          <div className="text-[11px] text-slate-500">
            Mês em foco: <strong className="text-slate-900 dark:text-white font-bold">{activeMonth.monthName}</strong> • Saldo: <strong className={activeMonth.saldo >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>{formatBRL(activeMonth.saldo)}</strong> ({activeMonth.savingsRate}% da renda)
          </div>
        )}
      </div>

      {/* SVG Interactive Multi-Line Chart */}
      <div className="relative w-full overflow-hidden select-none" data-testid="svg-grafico-linha-container">
        <div className="w-full h-72 sm:h-80">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="lineExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="lineBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {gridTicks.map((val, idx) => {
              const y = getY(val);
              return (
                <g key={idx}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke="#E2E8F0" 
                    strokeWidth="1" 
                    strokeDasharray={val === 0 ? 'none' : '4 4'}
                    className={val === 0 ? 'stroke-slate-400 dark:stroke-slate-600 stroke-[1.5]' : 'dark:stroke-slate-800'} 
                  />
                  <text 
                    x={paddingLeft - 10} 
                    y={y + 4} 
                    fontSize="11" 
                    fill="#94A3B8" 
                    textAnchor="end"
                    fontWeight={val === 0 ? 'bold' : 'normal'}
                  >
                    {formatBRL(val).split(',')[0]}
                  </text>
                </g>
              );
            })}

            {/* Linha Zero Destacada */}
            <line 
              x1={paddingLeft} 
              y1={zeroY} 
              x2={width - paddingRight} 
              y2={zeroY} 
              stroke="#64748B" 
              strokeWidth="1.5" 
              strokeDasharray="6 4"
            />

            {/* Indicator Vertical Guide Line for Hovered/Selected Month */}
            {activeMonth && (
              <line
                x1={getX(summary.months.findIndex(m => m.monthIndex === activeMonth.monthIndex))}
                y1={paddingTop}
                x2={getX(summary.months.findIndex(m => m.monthIndex === activeMonth.monthIndex))}
                y2={paddingTop + chartHeight}
                stroke="#6366F1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70"
              />
            )}

            {/* Curva de Receitas */}
            {(activeSeries === 'all' || activeSeries === 'fluxo') && (
              <>
                <path d={incomeArea} fill="url(#lineIncomeGradient)" />
                <path 
                  d={incomePath} 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </>
            )}

            {/* Curva de Despesas */}
            {(activeSeries === 'all' || activeSeries === 'fluxo') && (
              <>
                <path d={expenseArea} fill="url(#lineExpenseGradient)" />
                <path 
                  d={expensePath} 
                  fill="none" 
                  stroke="#EF4444" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </>
            )}

            {/* Curva de Saldo Líquido (Curva Central de Poupança) */}
            {(activeSeries === 'all' || activeSeries === 'saldo') && (
              <>
                <path d={balanceArea} fill="url(#lineBalanceGradient)" />
                <path 
                  d={balancePath} 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="drop-shadow-sm"
                />
              </>
            )}

            {/* Pontos Interativos (Data Markers) */}
            {summary.months.map((m, idx) => {
              const x = getX(idx);
              const yBal = getY(m.saldo);
              const yInc = getY(m.receitas);
              const yExp = getY(m.despesas);
              const isSelected = activeMonth?.monthIndex === m.monthIndex;

              return (
                <g 
                  key={m.monthIndex} 
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedMonthIdx(m.monthIndex);
                    if (onSelectMonth) onSelectMonth(m.monthIndex);
                  }}
                  onMouseEnter={() => setHoveredPointIdx(m.monthIndex)}
                  onMouseLeave={() => setHoveredPointIdx(null)}
                  data-testid={`ponto-mes-${m.shortName}`}
                >
                  {/* Invisible hit area for smooth touch/hover */}
                  <rect 
                    x={x - 25} 
                    y={paddingTop} 
                    width={50} 
                    height={chartHeight} 
                    fill="transparent" 
                  />

                  {/* Income point */}
                  {(activeSeries === 'all' || activeSeries === 'fluxo') && (
                    <circle 
                      cx={x} 
                      cy={yInc} 
                      r={isSelected ? 5.5 : 4} 
                      fill="#10B981" 
                      stroke="#FFFFFF" 
                      strokeWidth="2" 
                    />
                  )}

                  {/* Expense point */}
                  {(activeSeries === 'all' || activeSeries === 'fluxo') && (
                    <circle 
                      cx={x} 
                      cy={yExp} 
                      r={isSelected ? 5.5 : 4} 
                      fill="#EF4444" 
                      stroke="#FFFFFF" 
                      strokeWidth="2" 
                    />
                  )}

                  {/* Balance point (Maior destaque) */}
                  {(activeSeries === 'all' || activeSeries === 'saldo') && (
                    <circle 
                      cx={x} 
                      cy={yBal} 
                      r={isSelected ? 7.5 : 5.5} 
                      fill={m.saldo >= 0 ? '#3B82F6' : '#EF4444'} 
                      stroke="#FFFFFF" 
                      strokeWidth={isSelected ? 3 : 2} 
                      className="transition-all duration-150 drop-shadow-sm"
                    />
                  )}

                  {/* Rótulo do Mês no Eixo X */}
                  <text 
                    x={x} 
                    y={height - 18} 
                    fontSize={isSelected ? "12" : "11"} 
                    fill={isSelected ? "#1E293B" : "#64748B"} 
                    textAnchor="middle" 
                    fontWeight={isSelected ? "900" : "bold"}
                    className={isSelected ? "dark:fill-white" : ""}
                  >
                    {m.shortName}
                  </text>
                  <text 
                    x={x} 
                    y={height - 4} 
                    fontSize="9" 
                    fill={m.saldo >= 0 ? "#10B981" : "#EF4444"} 
                    textAnchor="middle" 
                    fontWeight="bold"
                  >
                    {m.saldo >= 0 ? `+${(m.saldo / 1000).toFixed(1)}k` : `${(m.saldo / 1000).toFixed(1)}k`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Grid com os Cards dos 6 Meses para Navegação Tátil */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {summary.months.map(m => {
          const isSelected = activeMonth?.monthIndex === m.monthIndex;
          const isSurplus = m.saldo >= 0;

          return (
            <div
              key={m.monthIndex}
              onClick={() => {
                setSelectedMonthIdx(m.monthIndex);
                if (onSelectMonth) onSelectMonth(m.monthIndex);
              }}
              className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-xs' 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              data-testid={`card-mes-${m.shortName}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {m.monthName}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                    isSurplus 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}>
                    {m.savingsRate}%
                  </span>
                </div>

                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Rec:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatBRL(m.receitas)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Desp:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatBRL(m.despesas)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-[10px] text-slate-400 font-medium">Saldo:</span>
                <span className={`font-black ${isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isSurplus ? '+' : ''}{formatBRL(m.saldo)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Estratégico de Diagnóstico da Tendência */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        summary.trendStatus === 'economia'
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-300 dark:border-emerald-800/80'
          : summary.trendStatus === 'gastos_excessivos'
          ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-rose-300 dark:border-rose-800/80'
          : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-300 dark:border-blue-800/80'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-3 rounded-2xl text-white shadow-md shrink-0 ${
            summary.trendStatus === 'economia'
              ? 'bg-emerald-600 shadow-emerald-600/20'
              : summary.trendStatus === 'gastos_excessivos'
              ? 'bg-rose-600 shadow-rose-600/20'
              : 'bg-blue-600 shadow-blue-600/20'
          }`}>
            {summary.trendStatus === 'economia' ? (
              <TrendingUp className="w-5 h-5" />
            ) : summary.trendStatus === 'gastos_excessivos' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Diagnóstico de Tendência (6 Meses)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                summary.trendStatus === 'economia'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : summary.trendStatus === 'gastos_excessivos'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
              }`}>
                {summary.trendHeadline}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed max-w-2xl">
              {summary.trendDiagnosis}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
              💡 {summary.recommendation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[105px]">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Melhor Mês</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
              {summary.bestMonth.shortName} (+{formatBRL(summary.bestMonth.saldo)})
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[105px]">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Mês Mais Apertado</span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
              {summary.lowestMonth.shortName} ({formatBRL(summary.lowestMonth.saldo)})
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
