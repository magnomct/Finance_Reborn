import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, 
  Sparkles, Edit3, Check, X, RotateCcw, Copy, DollarSign, 
  BarChart3, Layers, Info, Calendar, ArrowRight, Eye, ChevronRight
} from 'lucide-react';
import { formatBRL } from '../utils/finance';
import { 
  calculateAnnualSavingsProgress, 
  loadAnnualSavingsTargets, 
  saveAnnualSavingsTargets, 
  suggestAnnualSavingsTargets, 
  DEFAULT_ANNUAL_SAVINGS_TARGETS,
  MonthSavingsTarget,
  AnnualSavingsGoalsSummary,
  SHORT_MONTHS
} from '../utils/annualSavingsGoals';
import { MONTH_NAMES } from '../data/annualDashboardData';

interface AnnualSavingsGoalsAccumulatorProps {
  realizedMonthlySavings: number[]; // 12 numbers (Jan to Dec)
  monthlyIncomes?: number[]; // 12 numbers for suggestions
  currentMonthIndex?: number; // 0 to 11 (e.g. 9 for Outubro)
  year?: number;
  onSelectMonth?: (monthIndex: number) => void;
}

export const AnnualSavingsGoalsAccumulator: React.FC<AnnualSavingsGoalsAccumulatorProps> = ({
  realizedMonthlySavings,
  monthlyIncomes = Array(12).fill(4400),
  currentMonthIndex = 9,
  year = 2026,
  onSelectMonth
}) => {
  // Load saved targets from localStorage
  const [targets, setTargets] = useState<number[]>(() => loadAnnualSavingsTargets());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTargets, setEditedTargets] = useState<number[]>([...targets]);
  const [bulkValue, setBulkValue] = useState<number>(600);
  const [viewMode, setViewMode] = useState<'curva' | 'barras' | 'tabela'>('curva');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync edited targets when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditedTargets([...targets]);
    }
  }, [isEditing, targets]);

  // Compute summary metrics
  const summary: AnnualSavingsGoalsSummary = useMemo(() => {
    return calculateAnnualSavingsProgress({
      targets,
      realizedSavings: realizedMonthlySavings,
      currentMonthIndex,
      year
    });
  }, [targets, realizedMonthlySavings, currentMonthIndex, year]);

  // Handle saving modified targets
  const handleSaveTargets = () => {
    setTargets([...editedTargets]);
    saveAnnualSavingsTargets(editedTargets);
    setIsEditing(false);
    setNotification('Metas anuais de economia salvas com sucesso! 🎉');
    setTimeout(() => setNotification(null), 4000);
  };

  // Replicate single value to all 12 months
  const handleReplicateBulk = () => {
    const newTargets = Array(12).fill(Math.max(0, bulkValue));
    setEditedTargets(newTargets);
  };

  // Suggest targets based on income
  const handleSuggest = () => {
    const suggested = suggestAnnualSavingsTargets(monthlyIncomes);
    setEditedTargets(suggested);
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    setEditedTargets([...DEFAULT_ANNUAL_SAVINGS_TARGETS]);
  };

  // Update target for single month in edit mode
  const handleSingleMonthTargetChange = (idx: number, val: number) => {
    const updated = [...editedTargets];
    updated[idx] = Math.max(0, val);
    setEditedTargets(updated);
  };

  // Active highlighted month (hovered or current month)
  const activeMonthData: MonthSavingsTarget = useMemo(() => {
    const targetIdx = hoveredMonthIdx !== null ? hoveredMonthIdx : currentMonthIndex;
    return summary.months[Math.min(targetIdx, 11)] || summary.months[0];
  }, [hoveredMonthIdx, currentMonthIndex, summary.months]);

  // SVG Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Find max value across cumulative series for scaling
  const maxCumulativeVal = useMemo(() => {
    let max = 1000;
    summary.months.forEach(m => {
      if (m.cumulativeTarget > max) max = m.cumulativeTarget;
      if (m.cumulativeRealized > max) max = m.cumulativeRealized;
    });
    return Math.ceil(max * 1.15);
  }, [summary.months]);

  const getX = (idx: number) => padLeft + (idx / 11) * chartW;
  const getY = (val: number) => padTop + chartH - (val / (maxCumulativeVal || 1)) * chartH;

  // Build SVG Paths for Cumulative Curves
  const targetPoints = summary.months.map((m, idx) => ({ x: getX(idx), y: getY(m.cumulativeTarget) }));
  const realizedPoints = summary.months.map((m, idx) => ({ x: getX(idx), y: getY(m.cumulativeRealized) }));

  const generateLinePath = (pts: { x: number; y: number }[]) => {
    return pts.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  const targetLinePath = generateLinePath(targetPoints);
  const realizedLinePath = generateLinePath(realizedPoints);
  const realizedAreaPath = `${realizedLinePath} L ${getX(11)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6 relative overflow-hidden"
      data-testid="annual-savings-goals-accumulator"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-emerald-500/5 to-transparent rounded-full pointer-events-none -mr-20 -mt-20 blur-2xl" />

      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Target className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Metas Globais de Economia Anual
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                12 Meses • Ano {year}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Defina objetivos mensais de poupança para o ano inteiro e compare visualmente o planejado contra o realizado acumulado mês a mês.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch View Mode */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('curva')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'curva'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              data-testid="tab-view-curva-acumulada"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Curva Acumulada</span>
            </button>
            <button
              onClick={() => setViewMode('barras')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'barras'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              data-testid="tab-view-barras-mensais"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras Mês a Mês</span>
            </button>
            <button
              onClick={() => setViewMode('tabela')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'tabela'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              data-testid="tab-view-tabela-12m"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabela 12M</span>
            </button>
          </div>

          {/* Edit Goals Toggle Button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isEditing
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            data-testid="btn-definir-metas-anuais"
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                <span>Fechar Edição</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Definir / Ajustar Metas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. Painel de Edição de Metas (Aparece quando isEditing === true) */}
      {isEditing && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                Configurar Metas de Poupança por Mês ({year})
              </h4>
              <p className="text-[11px] text-slate-500">
                Ajuste os valores de cada mês individualmente ou use as ferramentas de preenchimento rápido.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSuggest}
                className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold hover:bg-teal-100 transition cursor-pointer flex items-center gap-1"
                title="Sugerir 15% da renda mensal (e 22% em Dezembro)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sugerir pela Renda</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-xs font-bold hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Padrão</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTargets}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1"
                data-testid="btn-salvar-metas-anuais"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Metas</span>
              </button>
            </div>
          </div>

          {/* Bulk Replication Bar */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Replicar valor para todos os 12 meses:
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(Number(e.target.value) || 0)}
                  className="w-24 pl-8 pr-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-xs font-bold text-slate-900 dark:text-white"
                  data-testid="input-bulk-target"
                />
              </div>
              <button
                type="button"
                onClick={handleReplicateBulk}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-bold hover:opacity-90 cursor-pointer"
                data-testid="btn-replicar-todos"
              >
                Aplicar aos 12 Meses
              </button>
            </div>
          </div>

          {/* 12 Months Grid Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
            {editedTargets.map((val, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>{MONTH_NAMES[idx]}</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400">{SHORT_MONTHS[idx]}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={val}
                    onChange={(e) => handleSingleMonthTargetChange(idx, Number(e.target.value) || 0)}
                    className="w-full pl-6 pr-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-xs font-bold text-slate-900 dark:text-white"
                    data-testid={`input-month-target-${idx}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KPI Cards: Visão Geral Acumulada */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Meta Anual Acumulada */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Meta Anual (12 Meses)</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono" data-testid="kpi-total-annual-target">
            {formatBRL(summary.totalAnnualTarget)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Meta até {MONTH_NAMES[currentMonthIndex]}: <strong>{formatBRL(summary.cumulativeTargetToDate)}</strong>
          </p>
        </div>

        {/* KPI 2: Realizado Acumulado */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Realizado Acumulado</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" data-testid="kpi-cumulative-realized">
            {formatBRL(summary.cumulativeRealizedToDate)}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            Total anual projetado: <strong>{formatBRL(summary.totalAnnualRealized)}</strong>
          </p>
        </div>

        {/* KPI 3: Superávit Acumulado vs Meta */}
        <div className={`p-4 rounded-2xl border ${
          summary.cumulativeVarianceToDate >= 0 
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' 
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
        }`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${
              summary.cumulativeVarianceToDate >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
            }`}>
              Diferença Acumulada
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              summary.cumulativeVarianceToDate >= 0 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {summary.cumulativeVarianceToDate >= 0 ? 'Superávit 🎉' : 'Déficit'}
            </span>
          </div>
          <div className={`text-lg sm:text-xl font-black font-mono ${
            summary.cumulativeVarianceToDate >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`} data-testid="kpi-cumulative-variance">
            {summary.cumulativeVarianceToDate >= 0 ? '+' : ''}{formatBRL(summary.cumulativeVarianceToDate)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {summary.cumulativeVarianceToDate >= 0 ? 'Acima do objetivo estabelecido' : 'Abaixo do planejado'}
          </p>
        </div>

        {/* KPI 4: Taxa de Alcance Global */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Alcance da Meta</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400 font-mono" data-testid="kpi-progress-pct">
            {summary.progressToDatePct.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            <strong>{summary.monthsMetCount} de {currentMonthIndex + 1}</strong> meses bateram a meta
          </p>
        </div>

      </div>

      {/* 4. Insight Headline Card */}
      <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-teal-900 dark:text-teal-200 block text-xs sm:text-sm">
              {summary.statusHeadline}
            </span>
            <p className="text-[11px] text-teal-700/90 dark:text-teal-300/80 mt-0.5">
              {summary.diagnosis} {summary.recommendation}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 self-end sm:self-center">
          <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-bold block">
            Ritmo Projetado Fim de Ano
          </span>
          <span className="text-sm font-black text-teal-900 dark:text-teal-100 font-mono">
            {formatBRL(summary.projectedYearEndSavings)}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. VISUALIZAÇÃO 1: GRÁFICO INTERATIVO DE CURVAS ACUMULADAS (SVG) */}
      {/* ============================================================== */}
      {viewMode === 'curva' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Curva de Evolução Acumulada: Meta Planejada vs Realizado
              </h4>
              <p className="text-[11px] text-slate-400">
                Passe o mouse ou toque nos pontos para inspecionar os valores acumulados de cada mês.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 border-t-2 border-dashed border-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">Meta Acumulada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Realizado Acumulado</span>
              </div>
            </div>
          </div>

          {/* SVG Chart Container */}
          <div className="pt-2">
            <div className="h-64 sm:h-72 w-full relative">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full overflow-visible" 
                preserveAspectRatio="none"
                data-testid="svg-curva-acumulada"
              >
                <defs>
                  <linearGradient id="realizedCumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const val = pct * maxCumulativeVal;
                  const y = padTop + chartH - pct * chartH;
                  return (
                    <g key={idx}>
                      <line 
                        x1={padLeft} 
                        y1={y} 
                        x2={svgWidth - padRight} 
                        y2={y} 
                        stroke="#E2E8F0" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                        className="dark:stroke-slate-800" 
                      />
                      <text x={padLeft - 8} y={y + 4} fontSize="10" fill="#94A3B8" textAnchor="end" className="font-mono">
                        {(val / 1000).toFixed(0)}k
                      </text>
                    </g>
                  );
                })}

                {/* Realized Area Fill */}
                <path d={realizedAreaPath} fill="url(#realizedCumGradient)" />

                {/* Target Planned Line (Dashed) */}
                <path 
                  d={targetLinePath} 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 6" 
                  strokeLinecap="round" 
                />

                {/* Realized Accumulated Line (Solid) */}
                <path 
                  d={realizedLinePath} 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Interactive Points on Month Nodes */}
                {summary.months.map((m, idx) => {
                  const ptReal = realizedPoints[idx];
                  const ptTgt = targetPoints[idx];
                  const isHovered = hoveredMonthIdx === idx;
                  const isCurrent = idx === currentMonthIndex;

                  return (
                    <g 
                      key={idx} 
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredMonthIdx(idx)}
                      onMouseLeave={() => setHoveredMonthIdx(null)}
                      onClick={() => onSelectMonth && onSelectMonth(idx)}
                    >
                      {/* Vertical highlight line on hover */}
                      {isHovered && (
                        <line 
                          x1={ptReal.x} 
                          y1={padTop} 
                          x2={ptReal.x} 
                          y2={padTop + chartH} 
                          stroke="#10B981" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3" 
                        />
                      )}

                      {/* Target node dot */}
                      <circle 
                        cx={ptTgt.x} 
                        cy={ptTgt.y} 
                        r={isHovered ? 5 : 3.5} 
                        fill="#3B82F6" 
                        stroke="#FFFFFF" 
                        strokeWidth="2" 
                      />

                      {/* Realized node dot */}
                      <circle 
                        cx={ptReal.x} 
                        cy={ptReal.y} 
                        r={isHovered ? 7 : (isCurrent ? 5.5 : 4.5)} 
                        fill="#10B981" 
                        stroke="#FFFFFF" 
                        strokeWidth="2.5" 
                        className="transition-all duration-150"
                      />

                      {/* Invisible hover target */}
                      <circle cx={ptReal.x} cy={ptReal.y} r="18" fill="transparent" />

                      {/* X-axis labels */}
                      <text 
                        x={ptReal.x} 
                        y={padTop + chartH + 18} 
                        fontSize="11" 
                        textAnchor="middle" 
                        fontWeight={isHovered || isCurrent ? 'bold' : 'normal'}
                        fill={isCurrent ? '#10B981' : (isHovered ? '#0F172A' : '#64748B')}
                        className="dark:fill-slate-400"
                      >
                        {m.monthShortName}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Active Month Inspection Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold">
                {activeMonthData.monthName}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Meta do Mês: {formatBRL(activeMonthData.targetMonthly)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Realizado no Mês: {formatBRL(activeMonthData.realizedMonthly)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Acumulado até {activeMonthData.monthName}: <strong>{formatBRL(activeMonthData.cumulativeRealized)}</strong> (Meta: {formatBRL(activeMonthData.cumulativeTarget)})
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 self-end sm:self-auto">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                activeMonthData.cumulativeVariance >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {activeMonthData.cumulativeVariance >= 0 ? '+' : ''}{formatBRL(activeMonthData.cumulativeVariance)} acumulado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. VISUALIZAÇÃO 2: BARRAS MENSAIS (META DO MÊS vs REALIZADO)    */}
      {/* ============================================================== */}
      {viewMode === 'barras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Comparativo Mensal: Meta do Mês vs Economia Realizada
            </h4>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-400" />
                <span>Meta Mensal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Realizado</span>
              </div>
            </div>
          </div>

          {/* Bar Columns Container */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {summary.months.map((m) => {
              const maxBarVal = Math.max(m.targetMonthly, m.realizedMonthly, 1000);
              const targetH = Math.min(100, Math.round((m.targetMonthly / maxBarVal) * 90));
              const realizedH = Math.min(100, Math.round((m.realizedMonthly / maxBarVal) * 90));

              return (
                <div 
                  key={m.monthIndex}
                  className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                    m.isGoalMet 
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-800 dark:text-white">{m.monthShortName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      m.isGoalMet 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {m.isGoalMet ? 'Batida 🎉' : 'Abaixo'}
                    </span>
                  </div>

                  {/* Dual Bars */}
                  <div className="h-28 flex items-end justify-center gap-2.5 py-2">
                    {/* Target Bar */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono text-slate-400">
                        {m.targetMonthly >= 1000 ? `${(m.targetMonthly / 1000).toFixed(1)}k` : m.targetMonthly}
                      </span>
                      <div 
                        className="w-4 bg-blue-400/80 rounded-t-md transition-all duration-300" 
                        style={{ height: `${targetH}px` }}
                        title={`Meta: ${formatBRL(m.targetMonthly)}`}
                      />
                    </div>

                    {/* Realized Bar */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {m.realizedMonthly >= 1000 ? `${(m.realizedMonthly / 1000).toFixed(1)}k` : m.realizedMonthly}
                      </span>
                      <div 
                        className={`w-4 rounded-t-md transition-all duration-300 ${
                          m.isGoalMet ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ height: `${realizedH}px` }}
                        title={`Realizado: ${formatBRL(m.realizedMonthly)}`}
                      />
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-center font-bold text-slate-500">
                    {m.monthlyProgressPct.toFixed(0)}% da meta
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. VISUALIZAÇÃO 3: TABELA DETALHADA DOS 12 MESES               */}
      {/* ============================================================== */}
      {viewMode === 'tabela' && (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold">
              <tr>
                <th className="py-2.5 px-3">Mês</th>
                <th className="py-2.5 px-3 text-right">Meta Mensal</th>
                <th className="py-2.5 px-3 text-right">Realizado Mensal</th>
                <th className="py-2.5 px-3 text-right">Meta Acumulada</th>
                <th className="py-2.5 px-3 text-right">Realizado Acumulado</th>
                <th className="py-2.5 px-3 text-right">Diferença Acumulada</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {summary.months.map((m) => (
                <tr key={m.monthIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 font-bold font-sans text-slate-800 dark:text-slate-200">
                    {m.monthName}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                    {formatBRL(m.targetMonthly)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatBRL(m.realizedMonthly)}
                  </td>
                  <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">
                    {formatBRL(m.cumulativeTarget)}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(m.cumulativeRealized)}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${
                    m.cumulativeVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {m.cumulativeVariance >= 0 ? '+' : ''}{formatBRL(m.cumulativeVariance)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                      m.isGoalMet 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {m.isGoalMet ? 'Meta Batida' : 'Abaixo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
