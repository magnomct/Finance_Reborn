import React, { useState, useMemo } from 'react';
import { 
  PieChart, Sparkles, Target, Calendar, ArrowUpRight, 
  CheckCircle2, Clock, Info, Check, ChevronRight
} from 'lucide-react';
import { DreamGoal } from '../types';
import { formatBRL } from '../utils/finance';
import { 
  calculateDreamsDonutData, 
  DreamDonutSlice 
} from '../utils/dreamCalculations';

interface DreamsDonutChartProps {
  dreams: DreamGoal[];
  onSelectDream?: (dream: DreamGoal) => void;
  onApplySuggestedDeposit?: (dreamId: string, suggestedAmount: number) => void;
}

export const DreamsDonutChart: React.FC<DreamsDonutChartProps> = ({
  dreams,
  onSelectDream,
  onApplySuggestedDeposit
}) => {
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);

  const { slices, totalCurrent, totalTarget, overallCompletionPct } = useMemo(() => {
    return calculateDreamsDonutData(dreams);
  }, [dreams]);

  // Coordinate helper for SVG donut segments
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const selectedSlice = useMemo(() => {
    if (!selectedSliceId) return slices[0] || null;
    return slices.find(s => s.id === selectedSliceId) || slices[0] || null;
  }, [selectedSliceId, slices]);

  if (dreams.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-indigo-500 text-white">
              <PieChart className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-400">
              Visão Panorâmica de Metas
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Gráfico de Rosca
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Distribuição & Conclusão dos Sonhos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Percentual acumulado em cada meta e projeção de aportes para cumprir prazos.
          </p>
        </div>

        {selectedSliceId && (
          <button
            onClick={() => setSelectedSliceId(null)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
          >
            Ver Média Global
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left: SVG Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
            <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
              {slices.map((slice) => {
                const [startX, startY] = getCoordinatesForPercent(slice.startFraction);
                const [endX, endY] = getCoordinatesForPercent(slice.endFraction);
                const largeArcFlag = slice.fraction > 0.5 ? 1 : 0;
                const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                const isSelected = selectedSlice?.id === slice.id;

                return (
                  <path
                    key={slice.id}
                    d={pathData}
                    fill={slice.colorHex}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    style={{
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: '0 0',
                      opacity: selectedSliceId && !isSelected ? 0.45 : 1,
                    }}
                    onClick={() => setSelectedSliceId(slice.id)}
                  >
                    <title>{`${slice.title}: ${formatBRL(slice.current)} (${slice.completionPct}% da meta)`}</title>
                  </path>
                );
              })}

              {/* Inner Cutout (Donut Hole) */}
              <circle cx="0" cy="0" r="0.66" className="fill-white dark:fill-slate-900" />
            </svg>

            {/* Center Content Inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {selectedSliceId && selectedSlice ? 'Meta Selecionada' : 'Progresso Global'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {selectedSliceId && selectedSlice 
                  ? `${selectedSlice.completionPct.toFixed(0)}%` 
                  : `${overallCompletionPct}%`}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {selectedSliceId && selectedSlice 
                  ? formatBRL(selectedSlice.current) 
                  : formatBRL(totalCurrent)}
              </span>
              <span className="text-[9px] text-slate-400">
                de {selectedSliceId && selectedSlice ? formatBRL(selectedSlice.target) : formatBRL(totalTarget)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-2">
            Toque nas fatias para inspecionar cada objetivo
          </p>
        </div>

        {/* Right: Selected Goal Details & Suggested Contribution */}
        <div className="lg:col-span-7 space-y-4">
          {selectedSlice ? (
            <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3.5">
              
              {/* Goal Title and Category */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" 
                    style={{ backgroundColor: selectedSlice.colorHex }} 
                  />
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">
                      {selectedSlice.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Categoria: {selectedSlice.category}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-black text-white shrink-0 shadow-2xs" style={{ backgroundColor: selectedSlice.colorHex }}>
                  {selectedSlice.completionPct.toFixed(1)}% Concluído
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Acumulado: <strong className="text-slate-900 dark:text-white">{formatBRL(selectedSlice.current)}</strong>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Meta: <strong className="text-slate-900 dark:text-white">{formatBRL(selectedSlice.target)}</strong>
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, selectedSlice.completionPct)}%`,
                      backgroundColor: selectedSlice.colorHex 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Faltam: <strong>{formatBRL(Math.max(0, selectedSlice.target - selectedSlice.current))}</strong></span>
                  <span>Aporte atual: {formatBRL(selectedSlice.monthlyDeposit)}/mês</span>
                </div>
              </div>

              {/* Deadline & Suggested Deposit Box */}
              {selectedSlice.targetDate ? (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] mb-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Data Limite: {selectedSlice.targetDate.split('-').reverse().join('/')} ({selectedSlice.monthsRemaining} meses restantes)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Aporte necessário para atingir no prazo: <strong className="text-indigo-600 dark:text-indigo-400">{formatBRL(selectedSlice.suggestedDeposit)}/mês</strong>
                    </p>
                  </div>

                  {onApplySuggestedDeposit && selectedSlice.suggestedDeposit > 0 && selectedSlice.suggestedDeposit !== selectedSlice.monthlyDeposit && (
                    <button
                      onClick={() => onApplySuggestedDeposit(selectedSlice.id, selectedSlice.suggestedDeposit)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Aplicar {formatBRL(selectedSlice.suggestedDeposit)}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
                  <span>Defina uma data limite para calcular o aporte mensal necessário automaticamente.</span>
                  {onSelectDream && (
                    <button 
                      onClick={() => {
                        const originalDream = dreams.find(d => d.id === selectedSlice.id);
                        if (originalDream) onSelectDream(originalDream);
                      }}
                      className="font-bold underline text-[11px] cursor-pointer"
                    >
                      Definir Prazo
                    </button>
                  )}
                </div>
              )}

            </div>
          ) : null}

          {/* Quick Legend of All Dreams */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Todas as Metas no Gráfico
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slices.map(slice => {
                const isSelected = selectedSlice?.id === slice.id;
                return (
                  <button
                    key={slice.id}
                    onClick={() => setSelectedSliceId(slice.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.colorHex }} />
                      <span className="truncate font-bold text-slate-800 dark:text-slate-200">
                        {slice.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 shrink-0">
                      {slice.completionPct.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
