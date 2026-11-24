import React from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

export interface D3ChartSkeletonProps {
  title: string;
  subtitle?: string;
  heightClass?: string;
  variant?: 'line' | 'sankey' | 'heatmap' | 'scatter' | 'dashboard' | 'bars';
}

export const D3ChartSkeleton: React.FC<D3ChartSkeletonProps> = ({
  title,
  subtitle,
  heightClass = 'h-80',
  variant = 'line',
}) => {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4"
      role="status"
      aria-live="polite"
      aria-label={`Carregando visualização D3: ${title}`}
      data-testid="d3-chart-skeleton"
    >
      {/* Header placeholder aligned with D3 chart cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Carregando visualização D3: {title}...</span>
        </div>
      </div>

      {/* Height-matched animated chart skeleton area (prevents CLS) */}
      <div
        className={`relative w-full ${heightClass} rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 p-4 overflow-hidden animate-pulse flex flex-col justify-between`}
      >
        {/* Fake horizontal axis/grid lines */}
        <div className="flex-1 flex flex-col justify-between py-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 w-full">
              <div className="w-10 h-2.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 border-b border-dashed border-slate-200 dark:border-slate-800" />
            </div>
          ))}
        </div>

        {/* Variant-specific placeholder geometry */}
        {variant === 'sankey' ? (
          <div className="absolute inset-x-10 inset-y-8 flex items-center justify-between gap-6 pointer-events-none">
            <div className="flex flex-col gap-3 w-16">
              <div className="h-14 rounded-lg bg-emerald-500/20" />
              <div className="h-20 rounded-lg bg-indigo-500/20" />
              <div className="h-10 rounded-lg bg-sky-500/20" />
            </div>
            <div className="flex-1 h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            <div className="flex flex-col gap-2 w-16">
              <div className="h-10 rounded-lg bg-indigo-500/20" />
              <div className="h-10 rounded-lg bg-amber-500/20" />
              <div className="h-10 rounded-lg bg-emerald-500/20" />
              <div className="h-10 rounded-lg bg-rose-500/20" />
            </div>
            <div className="flex-1 h-32 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
            <div className="flex flex-col gap-2 w-16">
              <div className="h-16 rounded-lg bg-rose-500/20" />
              <div className="h-12 rounded-lg bg-amber-500/20" />
              <div className="h-14 rounded-lg bg-emerald-500/20" />
            </div>
          </div>
        ) : variant === 'heatmap' ? (
          <div className="absolute inset-x-12 inset-y-8 grid grid-cols-12 gap-1.5 items-center pointer-events-none">
            {Array.from({ length: 48 }).map((_, idx) => (
              <div
                key={idx}
                className="h-4 rounded-sm bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : variant === 'dashboard' ? (
          <div className="absolute inset-x-10 inset-y-8 grid grid-cols-12 gap-4 items-center pointer-events-none">
            <div className="col-span-5 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-[18px] border-slate-200 dark:border-slate-800" />
            </div>
            <div className="col-span-7 flex items-end gap-2 h-full pt-4">
              {[42, 65, 58, 76, 62, 84, 72, 90, 78, 88].map((pct, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-indigo-500/20"
                  style={{ height: `${pct}%` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-16 inset-y-8 flex items-end gap-3 pointer-events-none">
            {[38, 52, 46, 64, 70, 61, 78, 84, 75, 92, 86, 95].map((pct, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-slate-200/80 dark:bg-slate-800/80"
                style={{ height: `${pct}%` }}
              />
            ))}
          </div>
        )}

        {/* Bottom X-axis label stubs */}
        <div className="flex items-center justify-between gap-2 pl-12 pt-2">
          {['Jan', 'Mar', 'Mai', 'Jul', 'Set', 'Nov'].map((label) => (
            <div
              key={label}
              className="w-8 h-2.5 rounded bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
