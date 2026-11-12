import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PiggyBank, 
  Calendar, Layers, Sparkles, AlertCircle, CheckCircle2, 
  ShieldCheck, ArrowUpRight, ArrowDownRight, Eye, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { Transaction } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateCumulativeSavingsMetrics, 
  CumulativeSavingsSummary, 
  CumulativeMonthData 
} from '../utils/cumulativeSavings';

export interface CumulativeSavingsLineChartProps {
  transactions?: Transaction[];
  usePjProfitInPf?: boolean;
  selectedMonth?: string;
  className?: string;
}

export const CumulativeSavingsLineChart: React.FC<CumulativeSavingsLineChartProps> = ({
  transactions = [],
  usePjProfitInPf = true,
  selectedMonth = '2026-10',
  className = '',
}) => {
  const [windowMonths, setWindowMonths] = useState<6 | 12>(6);
  const [displayMode, setDisplayMode] = useState<'acumulado' | 'mensal'>('acumulado');
  const [highlightMarginArea, setHighlightMarginArea] = useState<boolean>(true);

  // Calculate cumulative metrics
  const summary: CumulativeSavingsSummary = useMemo(() => {
    return calculateCumulativeSavingsMetrics({
      transactions,
      windowMonths,
      usePjProfitInPf,
      selectedMonth,
    });
  }, [transactions, windowMonths, usePjProfitInPf, selectedMonth]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return summary.months.map(m => {
      return {
        ...m,
        // Chart plotting fields based on display mode
        faturamentoPlot: displayMode === 'acumulado' ? m.faturamentoAcumulado : m.receitaMensal,
        despesasPlot: displayMode === 'acumulado' ? m.despesasAcumuladas : m.despesaMensal,
        poupancaPlot: displayMode === 'acumulado' ? m.margemPoupancaAcumulada : m.poupancaMensal,
        // For margin area fill
        margemArea: displayMode === 'acumulado' 
          ? [m.despesasAcumuladas, m.faturamentoAcumulado] 
          : [m.despesaMensal, m.receitaMensal],
      };
    });
  }, [summary.months, displayMode]);

  // Custom Recharts Tooltip
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: CumulativeMonthData = payload[0].payload;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[240px] space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{data.fullName} ({data.month})</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            data.isSuperavit 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
          }`}>
            {data.isSuperavit ? 'Superávit' : 'Déficit'}
          </span>
        </div>

        {displayMode === 'acumulado' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                Faturamento Acumulado:
              </span>
              <strong className="font-bold text-slate-800 dark:text-white">
                {formatBRL(data.faturamentoAcumulado)}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Despesas Acumuladas:
              </span>
              <strong className="font-bold text-slate-800 dark:text-white">
                {formatBRL(data.despesasAcumuladas)}
              </strong>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <PiggyBank className="w-3.5 h-3.5" />
                Margem de Poupança:
              </span>
              <div className="text-right">
                <div className="font-black text-emerald-600 dark:text-emerald-400">
                  {data.margemPoupancaAcumulada >= 0 ? '+' : ''}{formatBRL(data.margemPoupancaAcumulada)}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {data.margemPoupancaPct}% do faturamento
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 flex justify-between">
              <span>Neste mês:</span>
              <span>+{formatBRL(data.receitaMensal)} | -{formatBRL(data.despesaMensal)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                Receita do Mês:
              </span>
              <strong className="font-bold text-slate-800 dark:text-white">
                {formatBRL(data.receitaMensal)}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Despesas do Mês:
              </span>
              <strong className="font-bold text-slate-800 dark:text-white">
                {formatBRL(data.despesaMensal)}
              </strong>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <PiggyBank className="w-3.5 h-3.5" />
                Poupança do Mês:
              </span>
              <div className="text-right">
                <div className="font-black text-emerald-600 dark:text-emerald-400">
                  {data.poupancaMensal >= 0 ? '+' : ''}{formatBRL(data.poupancaMensal)}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {data.margemMensalPct}% da receita
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 animate-in fade-in duration-200 ${className}`}
      data-testid="card-cumulative-savings-chart"
    >
      
      {/* Header com Título, Subtítulo e Controles */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Análise de Retenção & Sustentabilidade
            </span>
          </div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
            Faturamento Acumulado vs. Despesas Totais
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe o crescimento mês a mês do faturamento contra os gastos e monitore a expansão da sua <strong>Margem de Poupança</strong> líquida.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Window Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setWindowMonths(6)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                windowMonths === 6
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              data-testid="btn-window-6m"
            >
              6 Meses
            </button>
            <button
              onClick={() => setWindowMonths(12)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                windowMonths === 12
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              data-testid="btn-window-12m"
            >
              12 Meses
            </button>
          </div>

          {/* Display Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDisplayMode('acumulado')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                displayMode === 'acumulado'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
              data-testid="btn-mode-accumulated"
            >
              Curva Acumulada
            </button>
            <button
              onClick={() => setDisplayMode('mensal')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                displayMode === 'mensal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
              data-testid="btn-mode-monthly"
            >
              Fluxo Mensal
            </button>
          </div>

          {/* Toggle Highlight Area */}
          <button
            onClick={() => setHighlightMarginArea(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              highlightMarginArea
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Destacar a área sombreada da Margem de Poupança entre o Faturamento e as Despesas"
            data-testid="btn-toggle-margin-area"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Destacar Margem</span>
          </button>
        </div>
      </div>

      {/* Grid de 4 KPIs no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Faturamento Total */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              Faturamento {displayMode === 'acumulado' ? 'Acumulado' : 'Total'}
            </span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.totalFaturamento)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Média: <strong>{formatBRL(summary.mediaMensalFaturamento)}</strong> / mês
          </p>
        </div>

        {/* Card 2: Despesas Totais */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Despesas {displayMode === 'acumulado' ? 'Acumuladas' : 'Totais'}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
            {formatBRL(summary.totalDespesas)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Consome <strong>{((summary.totalDespesas / (summary.totalFaturamento || 1)) * 100).toFixed(1)}%</strong> do faturamento
          </p>
        </div>

        {/* Card 3: Margem de Poupança Acumulada */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Margem de Poupança
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {summary.margemPoupancaGeralPct}%
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.totalPoupanca >= 0 ? '+' : ''}{formatBRL(summary.totalPoupanca)}
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-medium mt-0.5">
            Saldo acumulado preservado
          </p>
        </div>

        {/* Card 4: Diagnóstico e Média de Retenção */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Status da Retenção
            </span>
            <span className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${summary.statusBadgeClass}`}>
              {summary.statusLabel}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.mediaMensalPoupanca)} <span className="text-xs font-bold text-slate-400">/mês</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Melhor mês: <strong>{summary.melhorMes.month}</strong> (+{formatBRL(summary.melhorMes.poupancaMensal)})
          </p>
        </div>
      </div>

      {/* Gráfico Recharts de Linha com Destaque para a Margem */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-4 font-semibold flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              <span className="text-slate-800 dark:text-slate-200">
                {displayMode === 'acumulado' ? 'Faturamento Acumulado' : 'Faturamento Mensal'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-800 dark:text-slate-200">
                {displayMode === 'acumulado' ? 'Despesas Acumuladas' : 'Despesas Mensais'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-emerald-500 border-t-2 border-dashed border-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Margem de Poupança (Distância)
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Clique ou passe o mouse nos pontos para inspecionar
          </span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                {/* Emerald Gradient for the Savings Margin Area */}
                <linearGradient id="savingsMarginGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>

                {/* Indigo soft glow for Revenue */}
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />

              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
              />

              <YAxis 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val: number) => {
                  if (Math.abs(val) >= 1000) {
                    return `R$ ${(val / 1000).toFixed(0)}k`;
                  }
                  return `R$ ${val}`;
                }}
                tick={{ fontSize: 11, fill: '#64748B' }}
                width={70}
              />

              <Tooltip content={renderCustomTooltip} />

              <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />

              {/* Shaded Savings Margin Area */}
              {highlightMarginArea && (
                <Area
                  type="monotone"
                  dataKey="poupancaPlot"
                  name="Margem de Poupança (Área)"
                  fill="url(#savingsMarginGradient)"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              )}

              {/* Line 1: Faturamento Acumulado / Mensal */}
              <Line
                type="monotone"
                dataKey="faturamentoPlot"
                name={displayMode === 'acumulado' ? 'Faturamento Acumulado' : 'Receita do Mês'}
                stroke="#4F46E5"
                strokeWidth={3.5}
                dot={{ r: 4, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 3 }}
              />

              {/* Line 2: Despesas Acumuladas / Mensais */}
              <Line
                type="monotone"
                dataKey="despesasPlot"
                name={displayMode === 'acumulado' ? 'Despesas Acumuladas' : 'Despesas do Mês'}
                stroke="#F43F5E"
                strokeWidth={3.5}
                dot={{ r: 4, fill: '#F43F5E', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#F43F5E', stroke: '#FFFFFF', strokeWidth: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Decomposta Mês a Mês da Margem de Poupança */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Detalhamento da Trajetória Mensal</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Valores {displayMode === 'acumulado' ? 'cumulativos até o período' : 'do mês isolado'}
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Mês</th>
                <th className="py-2.5 px-3 text-right">Faturamento</th>
                <th className="py-2.5 px-3 text-right">Despesas</th>
                <th className="py-2.5 px-3 text-right">Margem de Poupança</th>
                <th className="py-2.5 px-3 text-center">Taxa (%)</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {summary.months.map((m) => {
                const fat = displayMode === 'acumulado' ? m.faturamentoAcumulado : m.receitaMensal;
                const desp = displayMode === 'acumulado' ? m.despesasAcumuladas : m.despesaMensal;
                const margemVal = displayMode === 'acumulado' ? m.margemPoupancaAcumulada : m.poupancaMensal;
                const margemPct = displayMode === 'acumulado' ? m.margemPoupancaPct : m.margemMensalPct;

                return (
                  <tr key={m.yearMonth} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                      {m.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                      {formatBRL(fat)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                      {formatBRL(desp)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {margemVal >= 0 ? '+' : ''}{formatBRL(margemVal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                        margemPct >= 15
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : margemPct >= 5
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : margemPct >= 0
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {margemPct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {margemVal >= 0 ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Superávit
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500 flex items-center justify-end gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Déficit
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Insight Callout Box */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-emerald-500/10 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-slate-900 dark:text-white block">
              Diagnóstico Estratégico da Margem de Poupança
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5 leading-relaxed">
              {summary.insightTexto}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-auto">
          <span className="text-[10px] text-slate-400 block uppercase font-bold text-right">
            Tendência da Margem
          </span>
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl inline-flex items-center gap-1 ${
            summary.tendenciaMargem === 'expansao'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : summary.tendenciaMargem === 'estavel'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}>
            {summary.tendenciaMargem === 'expansao' ? (
              <>
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Em Expansão (+ Poupança)</span>
              </>
            ) : summary.tendenciaMargem === 'estavel' ? (
              <span>Fluxo Estável</span>
            ) : (
              <>
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Em Compressão (- Margem)</span>
              </>
            )}
          </span>
        </div>
      </div>

    </div>
  );
};
