import React, { useState, useMemo } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle2, DollarSign, Calendar, Flame, ShieldCheck, Zap
} from 'lucide-react';
import { Transaction, JarType } from '../types';
import { calculateFinancialMetrics, simulateDailyCashflow, formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';

interface ChartsViewProps {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  selectedMonth: string;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  usePjProfitInPf,
  selectedMonth
}) => {
  const [selectedJarSlice, setSelectedJarSlice] = useState<JarType | null>(null);
  const [chartMode, setChartMode] = useState<'donut' | 'ritmo' | 'evolucao'>('donut');

  const metrics = useMemo(() => {
    return calculateFinancialMetrics(transactions, usePjProfitInPf);
  }, [transactions, usePjProfitInPf]);

  const cashflowSim = useMemo(() => {
    return simulateDailyCashflow(transactions, metrics.effectiveIncomeBase, 0, 31);
  }, [transactions, metrics.effectiveIncomeBase]);

  // Donut chart calculation
  const donutData = useMemo(() => {
    const entries = Object.values(metrics.jars).filter(j => j.spent > 0);
    const totalSpent = entries.reduce((acc, j) => acc + j.spent, 0);

    let cumulativeAngle = 0;
    const slices = entries.map(j => {
      const fraction = totalSpent > 0 ? j.spent / totalSpent : 0;
      const angle = fraction * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      return {
        ...j,
        fraction,
        percentage: fraction * 100,
        startAngle,
        endAngle,
      };
    });

    return { slices, totalSpent };
  }, [metrics.jars]);

  // Helper for SVG donut slice
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  // Multi-month comparative data (Agosto, Setembro, Outubro, Novembro)
  const monthlyComparison = [
    { month: 'Ago/26', receitas: 4800, despesas: 4650, saldo: 150 },
    { month: 'Set/26', receitas: 5050, despesas: 4820, saldo: 230 },
    { month: 'Out/26 (Atual)', receitas: metrics.totalReceipts, despesas: metrics.totalPayments, saldo: metrics.netBalanceConsolidated },
    { month: 'Nov/26 (Prev.)', receitas: 5120, despesas: 4500, saldo: 620 },
  ];

  const maxMonthValue = Math.max(...monthlyComparison.map(m => Math.max(m.receitas, m.despesas)), 5500);

  // Health Score calculation (0 - 100)
  const healthScore = useMemo(() => {
    let score = 70;
    if (metrics.netBalanceConsolidated > 0) score += 15;
    if (metrics.overdraftInterest === 0) score += 15;
    else score -= 10;
    if (metrics.jars.NEC_55 && metrics.jars.NEC_55.usageRatio <= 100) score += 10;
    return Math.min(100, Math.max(0, score));
  }, [metrics]);

  return (
    <div className="space-y-6">
      
      {/* Top Selector: Tabs de Gráficos */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5 w-full md:w-auto touch-pan-x">
          <button
            onClick={() => setChartMode('donut')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'donut'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Distribuição dos 6 Potes</span>
          </button>

          <button
            onClick={() => setChartMode('ritmo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'ritmo'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Ritmo de Gastos Diário</span>
          </button>

          <button
            onClick={() => setChartMode('evolucao')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'evolucao'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Comparativo Mensal</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium px-2">
          Mês de Referência: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Renda Efetiva Base</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {formatBRL(metrics.effectiveIncomeBase)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {usePjProfitInPf ? 'CLT + Lucro Líquido PJ' : 'Apenas Salário CLT'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Gasto PF</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">
            {formatBRL(metrics.totalSpentPF)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {((metrics.totalSpentPF / (metrics.effectiveIncomeBase || 1)) * 100).toFixed(1)}% da renda
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Saldo Livre Mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            +{formatBRL(metrics.netBalanceConsolidated)}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            Superávit garantido 🎉
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Saúde Orçamentária</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-purple-600 dark:text-purple-400">{healthScore}/100</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {healthScore >= 80 ? 'Excelente' : 'Ajustar'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Metodologia 6 Potes Yupee</p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODO 1: GRÁFICO DE ROSCA INTERATIVO (DONUT DOS 6 POTES)     */}
      {/* ========================================================= */}
      {chartMode === 'donut' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" />
                Composição dos Gastos pelos 6 Potes
              </h3>
              <p className="text-xs text-slate-500">
                Passe o mouse ou toque nas fatias para inspecionar os valores e limites de cada pote.
              </p>
            </div>
            {selectedJarSlice && (
              <button
                onClick={() => setSelectedJarSlice(null)}
                className="text-xs text-blue-500 hover:underline font-bold"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* SVG Donut */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-64 h-64 -rotate-90">
                {donutData.slices.map((slice, index) => {
                  let cumulativeFraction = 0;
                  for (let i = 0; i < index; i++) {
                    cumulativeFraction += donutData.slices[i].fraction;
                  }
                  const startFraction = cumulativeFraction;
                  const endFraction = cumulativeFraction + slice.fraction;

                  const [startX, startY] = getCoordinatesForPercent(startFraction);
                  const [endX, endY] = getCoordinatesForPercent(endFraction);
                  const largeArcFlag = slice.fraction > 0.5 ? 1 : 0;
                  const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                  const isSelected = selectedJarSlice === slice.id;

                  return (
                    <path
                      key={slice.id}
                      d={pathData}
                      fill={slice.colorHex}
                      className="cursor-pointer transition-all duration-200 hover:opacity-90"
                      style={{
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        transformOrigin: '0 0',
                        opacity: selectedJarSlice && !isSelected ? 0.4 : 1,
                      }}
                      onClick={() => setSelectedJarSlice(slice.id)}
                    />
                  );
                })}
                {/* Inner cutout for donut hole */}
                <circle cx="0" cy="0" r="0.65" className="fill-white dark:fill-slate-900" />
              </svg>

              {/* Center Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Gasto</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {formatBRL(donutData.totalSpent)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {((donutData.totalSpent / (metrics.effectiveIncomeBase || 1)) * 100).toFixed(0)}% do Teto
                </span>
              </div>
            </div>

            {/* Legend & Breakdown Details */}
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(metrics.jars).map(jar => {
                  const isSelected = selectedJarSlice === jar.id;
                  const isOver = jar.isOver;

                  return (
                    <div
                      key={jar.id}
                      onClick={() => setSelectedJarSlice(isSelected ? null : jar.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20' 
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: jar.colorHex }} 
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {jar.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Alvo: {(jar.pct * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-black text-slate-800 dark:text-slate-100">
                          {formatBRL(jar.spent)}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Teto: {formatBRL(jar.budget)}
                        </span>
                      </div>

                      <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(jar.usageRatio, 100)}%`,
                            backgroundColor: isOver ? '#EF4444' : jar.colorHex,
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] mt-1 text-slate-400">
                        <span>{jar.usageRatio.toFixed(0)}% consumido</span>
                        <span className={isOver ? 'text-rose-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                          {isOver ? `Estouro: ${formatBRL(jar.spent - jar.budget)}` : `Livre: ${formatBRL(jar.remaining)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODO 2: RITMO DIÁRIO DE GASTOS (BURN-RATE / GASTO ACUMULADO) */}
      {/* ========================================================= */}
      {chartMode === 'ritmo' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Ritmo de Gastos Diário vs Teto Orçamentário
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe a curva de despesas acumuladas ao longo dos 31 dias do mês em relação à linha orçamentária linear ideal.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Gasto Real</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 border-t border-dashed border-slate-500" />
                <span className="text-slate-400">Linha Ideal</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Curve */}
          <div className="pt-4">
            <div className="h-64 w-full relative">
              <svg viewBox="0 0 1000 240" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="realSpentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = 220 - pct * 200;
                  return (
                    <g key={idx}>
                      <line x1="40" y1={y} x2="980" y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-slate-800" />
                      <text x="10" y={y + 4} fontSize="11" fill="#94A3B8" textAnchor="start">
                        {formatBRL(pct * (metrics.effectiveIncomeBase || 4000)).split(',')[0]}
                      </text>
                    </g>
                  );
                })}

                {/* Ideal Budget Line (Linear) */}
                <line
                  x1="40"
                  y1="220"
                  x2="980"
                  y2="20"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />

                {/* Real Spent Area & Line */}
                {(() => {
                  const maxBudget = metrics.effectiveIncomeBase || 4000;
                  const points = cashflowSim.days.map((pt, index) => {
                    const x = 40 + (index / 30) * 940;
                    const y = 220 - Math.min(1, pt.accumulatedSpent / maxBudget) * 200;
                    return { x, y, pt };
                  });

                  const pathD = points.reduce((acc, curr, idx) => {
                    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                  }, '');

                  const areaD = `${pathD} L 980 220 L 40 220 Z`;

                  return (
                    <>
                      <path d={areaD} fill="url(#realSpentGradient)" />
                      <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Critical day dots (like Day 22 C6 and Day 25 Mortgage) */}
                      {points.filter(p => p.pt.expense > 0).map((p, idx) => (
                        <g key={idx} className="cursor-pointer group">
                          <circle cx={p.x} cy={p.y} r="5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                          <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="hover:fill-blue-500/20" />
                        </g>
                      ))}
                    </>
                  );
                })()}

                {/* Day labels on X axis */}
                {[1, 5, 10, 15, 20, 25, 30].map(day => {
                  const x = 40 + ((day - 1) / 30) * 940;
                  return (
                    <text key={day} x={x} y="238" fontSize="11" fill="#64748B" textAnchor="middle" fontWeight="bold">
                      D{day}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Strategic Insight Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-600 rounded-xl">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  Ritmo Atual: Gasto sob controle
                </span>
                <p className="text-slate-500 text-[11px]">
                  Os grandes picos do mês ocorrem no <strong>Dia 22 (C6)</strong> e <strong>Dia 25 (Financiamento Apto)</strong>. O fluxo permanece no azul com a compensação de Nathan e do faturamento PJ.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Acumulado</span>
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {formatBRL(metrics.totalSpentPF)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODO 3: COMPARATIVO MENSAL (RECEITAS vs DESPESAS vs SALDO)  */}
      {/* ========================================================= */}
      {chartMode === 'evolucao' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Evolução Comparativa Multi-Mês
              </h3>
              <p className="text-xs text-slate-500">
                Histórico e previsão de receitas, despesas e saldo líquido consolidado.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500" />
                <span>Despesas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500" />
                <span>Saldo</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {monthlyComparison.map((m, idx) => {
              const recHeight = (m.receitas / maxMonthValue) * 160;
              const despHeight = (m.despesas / maxMonthValue) * 160;
              const isCurrent = idx === 2;

              return (
                <div 
                  key={m.month}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isCurrent 
                      ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-400' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                      {m.month}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Saldo: +{formatBRL(m.saldo)}
                    </span>
                  </div>

                  {/* Visual Bars Container */}
                  <div className="h-44 flex items-end justify-center gap-3 py-3">
                    {/* Receitas Bar */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-400">
                        {(m.receitas / 1000).toFixed(1)}k
                      </span>
                      <div 
                        className="w-5 bg-emerald-500 rounded-t-lg transition-all duration-500 shadow-sm hover:opacity-90"
                        style={{ height: `${recHeight}px` }}
                        title={`Receitas: ${formatBRL(m.receitas)}`}
                      />
                    </div>

                    {/* Despesas Bar */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-400">
                        {(m.despesas / 1000).toFixed(1)}k
                      </span>
                      <div 
                        className="w-5 bg-rose-500 rounded-t-lg transition-all duration-500 shadow-sm hover:opacity-90"
                        style={{ height: `${despHeight}px` }}
                        title={`Despesas: ${formatBRL(m.despesas)}`}
                      />
                    </div>
                  </div>

                  <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    {isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                        Em Andamento
                      </span>
                    ) : (
                      <span>Taxa: {((m.saldo / m.receitas) * 100).toFixed(1)}% poup.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
