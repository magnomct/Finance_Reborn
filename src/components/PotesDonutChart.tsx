import React, { useState, useMemo } from 'react';
import { 
  PieChart, AlertTriangle, AlertOctagon, CheckCircle2, 
  Sparkles, Layers, Sliders, ArrowUpRight, ArrowDownRight,
  TrendingDown, Info
} from 'lucide-react';
import { JarType, JarInfo } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculatePotesDonutData, 
  describeDonutArc, 
  PoteDonutSlice 
} from '../utils/potesDonut';
import { AnimatedCurrencyCounter } from './AnimatedCurrencyCounter';

interface PotesDonutChartProps {
  jars: Record<JarType, any>;
  jarLimits?: Record<JarType, number>;
  selectedJarKey: JarType | null;
  onSelectJar: (jarId: JarType) => void;
  onOpenLimitsModal?: () => void;
}

export const PotesDonutChart: React.FC<PotesDonutChartProps> = ({
  jars,
  jarLimits,
  selectedJarKey,
  onSelectJar,
  onOpenLimitsModal
}) => {
  const [hoveredJarKey, setHoveredJarKey] = useState<JarType | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL'>('ALL');

  const donutData = useMemo(() => {
    return calculatePotesDonutData(jars, jarLimits);
  }, [jars, jarLimits]);

  const activeJarKey = hoveredJarKey || selectedJarKey;
  const activeSlice = useMemo(() => {
    if (!activeJarKey) return null;
    return donutData.slices.find(s => s.id === activeJarKey) || null;
  }, [donutData.slices, activeJarKey]);

  const displayedSlices = useMemo(() => {
    if (filterMode === 'CRITICAL') {
      return donutData.slices.filter(s => s.status === 'EXCEDIDO' || s.status === 'ALERTA_80');
    }
    return donutData.slices;
  }, [donutData.slices, filterMode]);

  // Donut geometry parameters
  const size = 260;
  const center = size / 2;
  const outerRadius = 110;
  const innerRadius = 72;

  return (
    <div 
      className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-150"
      data-testid="potes-donut-chart"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-blue-500 text-white">
              <PieChart className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
              Consumo Real vs Limites dos 6 Potes
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Gráfico de Rosca Orçamentário
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe a proporção gasta em cada categoria e veja quanto ainda resta disponível do teto orçado.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              data-testid="filter-all-jars"
            >
              Todos ({donutData.slices.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterMode === 'CRITICAL'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              data-testid="filter-critical-jars"
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Em Alerta ({donutData.criticalJarsCount})</span>
            </button>
          </div>

          {onOpenLimitsModal && (
            <button
              type="button"
              onClick={onOpenLimitsModal}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Ajustar limites de orçamento"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Donut SVG on Left, Breakdown Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* SVG Donut Visual */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <svg 
            width={size} 
            height={size} 
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {/* Background Track Circle */}
            <circle 
              cx={center} 
              cy={center} 
              r={(outerRadius + innerRadius) / 2} 
              stroke="currentColor" 
              className="text-slate-100 dark:text-slate-800/80" 
              strokeWidth={outerRadius - innerRadius} 
              fill="none" 
            />

            {/* Slices */}
            {donutData.slices.map(slice => {
              const isSelected = selectedJarKey === slice.id;
              const isHovered = hoveredJarKey === slice.id;
              const isActive = isSelected || isHovered;

              const currentOuter = isActive ? outerRadius + 5 : outerRadius;
              const currentInner = isActive ? innerRadius - 2 : innerRadius;

              const pathD = describeDonutArc(
                center,
                center,
                currentInner,
                currentOuter,
                slice.startAngle,
                slice.endAngle
              );

              if (!pathD) return null;

              return (
                <path
                  key={slice.id}
                  d={pathD}
                  fill={slice.colorHex}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: activeJarKey ? (isActive ? 1 : 0.45) : 0.95,
                    filter: isActive ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' : 'none'
                  }}
                  onMouseEnter={() => setHoveredJarKey(slice.id)}
                  onMouseLeave={() => setHoveredJarKey(null)}
                  onClick={() => onSelectJar(slice.id)}
                  data-testid={`donut-slice-${slice.id}`}
                />
              );
            })}
          </svg>

          {/* Center Info Hole overlay */}
          <div 
            className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-3"
            style={{ width: innerRadius * 1.8, height: innerRadius * 1.8 }}
          >
            {activeSlice ? (
              <div className="animate-in fade-in duration-100 space-y-0.5">
                <span 
                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full inline-block"
                  style={{ backgroundColor: `${activeSlice.colorHex}20`, color: activeSlice.colorHex }}
                >
                  {activeSlice.shortName}
                </span>
                <span className="block text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                  {activeSlice.name}
                </span>
                <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                  <AnimatedCurrencyCounter value={activeSlice.spent} showDirectionBadge={true} />
                </div>
                <div className="text-[10px] font-bold">
                  {activeSlice.remaining > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                      Resta <AnimatedCurrencyCounter value={activeSlice.remaining} showDirectionBadge={true} />
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold inline-flex items-center gap-0.5">
                      Estourou +<AnimatedCurrencyCounter value={activeSlice.overspent} showDirectionBadge={true} />
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 block font-semibold">
                  <AnimatedCurrencyCounter value={activeSlice.usagePercent} isPercent={true} percentDecimals={0} /> do teto (<AnimatedCurrencyCounter value={activeSlice.budgetLimit} />)
                </span>
              </div>
            ) : (
              <div className="animate-in fade-in duration-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Gasto
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                  <AnimatedCurrencyCounter value={donutData.totalSpent} showDirectionBadge={true} />
                </span>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Teto: <AnimatedCurrencyCounter value={donutData.totalBudgetLimit} />
                </div>
                <div className="pt-0.5">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                    donutData.totalRemaining >= 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {donutData.totalRemaining >= 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        Resta <AnimatedCurrencyCounter value={donutData.totalRemaining} showDirectionBadge={true} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        Estourado <AnimatedCurrencyCounter value={donutData.totalOverspent} showDirectionBadge={true} />
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 text-center">
            💡 Passe o mouse ou clique nas fatias para inspecionar
          </div>
        </div>

        {/* Breakdown Cards on Right */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {displayedSlices.map(slice => {
              const isSelected = selectedJarKey === slice.id;
              const isHovered = hoveredJarKey === slice.id;

              return (
                <div
                  key={slice.id}
                  onClick={() => onSelectJar(slice.id)}
                  onMouseEnter={() => setHoveredJarKey(slice.id)}
                  onMouseLeave={() => setHoveredJarKey(null)}
                  className={`p-3 rounded-2xl border text-xs transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-400/30 shadow-xs'
                      : isHovered
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300'
                  }`}
                  data-testid={`donut-legend-card-${slice.id}`}
                >
                  {/* Card Header: Color indicator & Name & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: slice.colorHex }} 
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {slice.name}
                        </span>
                      </div>

                      {slice.status === 'EXCEDIDO' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5 shrink-0">
                          <AlertOctagon className="w-2.5 h-2.5" /> Estourado
                        </span>
                      ) : slice.status === 'ALERTA_80' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" /> 80%+ Alerta
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {slice.shortName}
                        </span>
                      )}
                    </div>

                    {/* Spent vs Budget */}
                    <div className="flex items-baseline justify-between text-[11px] mt-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Consumo: <strong className="text-slate-900 dark:text-white font-mono">{formatBRL(slice.spent)}</strong>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Teto: {formatBRL(slice.budgetLimit)}
                      </span>
                    </div>

                    {/* Progress Bar with 80% mark */}
                    <div className="relative w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-600 z-10" 
                        style={{ left: '80%' }}
                        title="Marca de 80%"
                      />
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(slice.usagePercent, 100)}%`,
                          backgroundColor: slice.status === 'EXCEDIDO' 
                            ? '#EF4444' 
                            : slice.status === 'ALERTA_80' 
                            ? '#F59E0B' 
                            : slice.colorHex
                        }}
                      />
                    </div>
                  </div>

                  {/* Remaining / Overspent Pill */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">
                      {slice.usagePercent.toFixed(0)}% utilizado
                    </span>

                    {slice.remaining > 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Resta {formatBRL(slice.remaining)}
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        +{formatBRL(slice.overspent)} acima
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
