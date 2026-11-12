import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Sparkles, AlertTriangle, 
  Layers, CheckCircle2, DollarSign, Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { Transaction } from '../types';
import { calculatePJMarginMetrics, PJMarginEvolutionSummary } from '../utils/pjMarginMetrics';
import { formatBRL } from '../utils/finance';

export interface NetMarginEvolutionCardProps {
  transactions?: Transaction[];
  initialMonth?: string;
  className?: string;
}

export const NetMarginEvolutionCard: React.FC<NetMarginEvolutionCardProps> = ({
  transactions = [],
  initialMonth = '2026-10',
  className = '',
}) => {
  const [windowMonths, setWindowMonths] = useState<6 | 12>(12);

  // Compute 12M metrics
  const summary: PJMarginEvolutionSummary = useMemo(() => {
    return calculatePJMarginMetrics(transactions, initialMonth, windowMonths);
  }, [transactions, initialMonth, windowMonths]);

  // Max value for left Y-axis (Revenue & Profit)
  const maxLeftY = useMemo(() => {
    const maxVal = Math.max(...summary.selectedWindowMonths.map(m => Math.max(m.grossRevenue, m.netProfit)));
    return Math.ceil((maxVal * 1.15) / 500) * 500;
  }, [summary.selectedWindowMonths]);

  // Custom Rich Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    const isPositiveMoM = dataItem.momMarginDiffPoints >= 0;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2.5 min-w-[240px] z-50 pointer-events-none">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span className="font-bold text-slate-800 dark:text-white">
            {dataItem.monthLabel}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Margem: <strong className="text-amber-500 font-bold">{dataItem.netMarginPct.toFixed(1)}%</strong>
          </span>
        </div>

        {/* Revenue and Costs */}
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
              Receita Bruta:
            </span>
            <strong className="font-mono text-slate-900 dark:text-white">
              {formatBRL(dataItem.grossRevenue)}
            </strong>
          </div>

          <div className="flex items-center justify-between text-slate-500 pl-4 text-[10px]">
            <span>(-) Custos & Impostos PJ:</span>
            <span className="font-mono text-rose-500">
              - {formatBRL(dataItem.costsAndTaxes)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Lucro Líquido:
            </span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
              {formatBRL(dataItem.netProfit)}
            </strong>
          </div>
        </div>

        {/* MoM Variation */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Variação da Margem (MoM):</span>
          <span className={`font-bold flex items-center gap-0.5 ${isPositiveMoM ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositiveMoM ? '▲ +' : '▼ '}
            {dataItem.momMarginDiffPoints.toFixed(1)} p.p.
          </span>
        </div>
      </div>
    );
  };

  const currentMonth = summary.currentMonth;
  const isMoMUp = currentMonth.momMarginDiffPoints >= 0;

  return (
    <div 
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden ${className}`}
      data-testid="net-margin-evolution-card"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/5 via-emerald-500/5 to-transparent rounded-full pointer-events-none -mr-16 -mt-16 blur-2xl" />

      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Evolução da Margem Líquida - 12 Meses
              </h3>
              
              {/* Semantic Trend Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                summary.trendBadgeColor === 'emerald'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : summary.trendBadgeColor === 'rose'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {summary.trendBadgeColor === 'emerald' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : summary.trendBadgeColor === 'rose' ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span>{summary.trendBadgeLabel}</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o faturamento, lucro livre de impostos e a oscilação da margem líquida da empresa no período.
          </p>
        </div>

        {/* Window Selector: 6M / 12M */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setWindowMonths(6)}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              windowMonths === 6
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            data-testid="toggle-window-6m"
          >
            <span>6 Meses</span>
          </button>

          <button
            onClick={() => setWindowMonths(12)}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              windowMonths === 12
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
            data-testid="toggle-window-12m"
          >
            <span>12 Meses</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs (3 Colunas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-10">
        
        {/* KPI 1: Faturamento Bruto */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
            Faturamento Bruto ({windowMonths}M)
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono block" data-testid="kpi-gross-revenue">
            {formatBRL(summary.totalGrossRevenue)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            Média de {formatBRL(summary.totalGrossRevenue / windowMonths)} / mês
          </span>
        </div>

        {/* KPI 2: Lucro Líquido */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/60">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
            Lucro Líquido Acumulado ({windowMonths}M)
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block" data-testid="kpi-net-profit">
            {formatBRL(summary.totalNetProfit)}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            Margem média do período: <strong className="text-slate-700 dark:text-slate-200">{summary.averageMarginPct.toFixed(1)}%</strong>
          </span>
        </div>

        {/* KPI 3: Margem Líquida Atual com Indicador MoM */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-amber-100 dark:border-amber-950/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Margem Líquida Atual
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 ${
              isMoMUp 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {isMoMUp ? '▲ +' : '▼ '}
              {currentMonth.momMarginDiffPoints.toFixed(1)} p.p.
            </span>
          </div>

          <span className="text-xl font-black text-amber-500 dark:text-amber-400 font-mono block" data-testid="kpi-current-margin">
            {currentMonth.netMarginPct.toFixed(1)}%
          </span>

          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            Lucro do mês: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatBRL(currentMonth.netProfit)}</strong>
          </span>
        </div>

      </div>

      {/* Gráfico Principal Dual Y-Axis Recharts ComposedChart */}
      <div className="space-y-2 pt-1 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Desempenho Financeiro e Margem
            </span>
            <span className="text-[10px] text-slate-400">
              • Linha âmbar = Margem Líquida (%)
            </span>
          </div>

          <div className="flex items-center gap-3 font-semibold text-[11px] flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span className="text-indigo-600 dark:text-indigo-400">Faturamento Bruto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Lucro Líquido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500" />
              <span className="text-amber-500">Margem (%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span className="text-slate-400">Média ({summary.averageMarginPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-2" data-testid="margin-composed-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={summary.selectedWindowMonths} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              
              <XAxis 
                dataKey="monthShort" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              
              {/* Eixo Y Esquerdo (R$) */}
              <YAxis 
                yAxisId="left"
                domain={[0, maxLeftY]}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(1)}k`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />

              {/* Eixo Y Direito (0% a 100%) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                tick={{ fontSize: 10, fill: '#f59e0b' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Linha de Referência da Margem Média */}
              <ReferenceLine 
                yAxisId="right"
                y={summary.averageMarginPct} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{
                  value: `Média: ${summary.averageMarginPct.toFixed(1)}%`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight'
                }} 
              />

              {/* Barra: Receita Bruta (Azul Índigo) */}
              <Bar 
                yAxisId="left"
                dataKey="grossRevenue" 
                name="Faturamento Bruto" 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]}
                maxBarSize={windowMonths === 6 ? 32 : 18}
              />

              {/* Barra: Lucro Líquido (Verde Esmeralda) */}
              <Bar 
                yAxisId="left"
                dataKey="netProfit" 
                name="Lucro Líquido" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                maxBarSize={windowMonths === 6 ? 32 : 18}
              />

              {/* Linha: Margem Líquida (%) (Âmbar) */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="netMarginPct" 
                name="Margem Líquida (%)" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#f59e0b' }}
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rodapé de Diagnóstico */}
      <div 
        className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/5 dark:from-amber-950/40 dark:via-emerald-950/30 dark:to-slate-900 border border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        data-testid="margin-diagnostic-footer"
      >
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-white block">
              Diagnóstico Estratégico de Rentabilidade PJ
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {summary.diagnosticInsight}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center text-right pl-2 sm:border-l sm:border-amber-200/60 dark:sm:border-amber-900/60">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tendência 3M</span>
          <strong className="text-amber-600 dark:text-amber-400 text-xs font-black">
            {summary.quarterlyTrend} ({summary.last3MonthsAvgMarginPct.toFixed(1)}%)
          </strong>
          <span className="text-[10px] text-slate-500 block">
            Média últimos 3 meses
          </span>
        </div>
      </div>

    </div>
  );
};
