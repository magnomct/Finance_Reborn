import React from 'react';
import {
  Trophy,
  Target,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  BellRing
} from 'lucide-react';
import { DreamMonthlyMilestoneStatus, DREAM_MILESTONE_THRESHOLDS } from '../utils/dreamMilestones';
import { formatBRL } from '../utils/finance';

interface DreamMilestoneBannerProps {
  activeAlerts: DreamMonthlyMilestoneStatus[];
  toastAlert: DreamMonthlyMilestoneStatus | null;
  onDismissAlert: (dismissKey: string) => void;
  onDismissAll: () => void;
  onDismissToast: () => void;
  onQuickCompleteMonth?: (dreamId: string, remainingAmount: number) => void;
}

const THEME_STYLES = {
  info: {
    card: 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800/80',
    iconBg: 'bg-sky-600 text-white',
    badge: 'bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700',
    titleText: 'text-sky-950 dark:text-sky-100',
    bodyText: 'text-sky-800 dark:text-sky-200/90',
    barFill: 'bg-gradient-to-r from-sky-500 to-indigo-500',
    checkpointActive: 'bg-sky-600 text-white border-sky-600',
    toast: 'bg-sky-900 dark:bg-sky-950 border-sky-500 text-white',
    Icon: Target,
  },
  warning: {
    card: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80',
    iconBg: 'bg-amber-500 text-white',
    badge: 'bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    titleText: 'text-amber-950 dark:text-amber-100',
    bodyText: 'text-amber-800 dark:text-amber-200/90',
    barFill: 'bg-gradient-to-r from-amber-500 to-orange-500',
    checkpointActive: 'bg-amber-500 text-white border-amber-500',
    toast: 'bg-amber-900 dark:bg-amber-950 border-amber-500 text-white',
    Icon: TrendingUp,
  },
  success: {
    card: 'bg-emerald-50/95 dark:bg-emerald-950/45 border-emerald-300 dark:border-emerald-800/80',
    iconBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    titleText: 'text-emerald-950 dark:text-emerald-100',
    bodyText: 'text-emerald-800 dark:text-emerald-200/90',
    barFill: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    checkpointActive: 'bg-emerald-600 text-white border-emerald-600',
    toast: 'bg-emerald-900 dark:bg-emerald-950 border-emerald-500 text-white',
    Icon: Trophy,
  },
} as const;

export const DreamMilestoneBanner: React.FC<DreamMilestoneBannerProps> = ({
  activeAlerts,
  toastAlert,
  onDismissAlert,
  onDismissAll,
  onDismissToast,
  onQuickCompleteMonth,
}) => {
  if (!toastAlert && activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Live Toast Notification ao atingir novo marco (50%, 75% ou 100%) */}
      {toastAlert && toastAlert.tierConfig && (() => {
        const style = THEME_STYLES[toastAlert.tierConfig.theme];
        const ToastIcon = style.Icon;
        const msg = toastAlert.tierConfig.description(
          toastAlert.dreamTitle,
          formatBRL(toastAlert.monthlyDeposited),
          formatBRL(toastAlert.monthlyTarget),
          toastAlert.progressPct
        );

        return (
          <div
            role="status"
            aria-live="polite"
            data-testid="dream-milestone-toast"
            className={`fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-md p-4 rounded-2xl border-2 shadow-2xl flex items-start justify-between gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 ${style.toast}`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-white/15 shrink-0">
                <ToastIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Marco de {toastAlert.highestMilestone}% Desbloqueado
                  </span>
                  <h4 className="font-black text-sm text-white">
                    {toastAlert.tierConfig.title}
                  </h4>
                </div>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  {msg}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Fechar notificação de marco atingido"
              data-testid="btn-close-milestone-toast"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Banner Persistente de Marcos da Meta Mensal de Poupança */}
      {activeAlerts.length > 0 && (
        <section
          aria-label="Notificações de Marcos de Poupança Mensal"
          data-testid="dream-monthly-milestone-banner"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Marcos da Meta de Poupança Mensal
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {activeAlerts.length} {activeAlerts.length === 1 ? 'marco ativo' : 'marcos ativos'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Acompanhamento automático dos patamares de 50%, 75% e 100% da economia mensal definida para cada sonho.
                </p>
              </div>
            </div>

            {activeAlerts.length > 1 && (
              <button
                type="button"
                onClick={onDismissAll}
                data-testid="btn-dismiss-all-milestones"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
              >
                Dispensar todos
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeAlerts.map(alert => {
              if (!alert.tierConfig || !alert.dismissKey) return null;
              const style = THEME_STYLES[alert.tierConfig.theme];
              const TierIcon = style.Icon;
              const message = alert.tierConfig.description(
                alert.dreamTitle,
                formatBRL(alert.monthlyDeposited),
                formatBRL(alert.monthlyTarget),
                alert.progressPct
              );

              return (
                <div
                  key={alert.dismissKey}
                  data-testid={`milestone-alert-card-${alert.dreamId}`}
                  data-milestone-level={alert.highestMilestone}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${style.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2.5 rounded-2xl shadow-xs shrink-0 ${style.iconBg}`}>
                        <TierIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                            {alert.tierConfig.shortLabel}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {alert.dreamTitle}
                          </span>
                        </div>
                        <h4 className={`font-black text-sm mt-1 ${style.titleText}`}>
                          {alert.tierConfig.title}
                        </h4>
                        <p className={`text-xs mt-0.5 leading-relaxed ${style.bodyText}`}>
                          {message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.dismissKey!)}
                      aria-label={`Dispensar aviso de ${alert.dreamTitle}`}
                      data-testid={`btn-dismiss-milestone-${alert.dreamId}`}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Barra de Progresso Mensal com Checkpoints de 50%, 75% e 100% */}
                  <div className="space-y-2 pt-1">
                    <div className="relative w-full h-2.5 bg-white/80 dark:bg-slate-800 rounded-full overflow-hidden border border-black/5 dark:border-white/10">
                      <div
                        className="absolute top-0 bottom-0 left-[50%] w-[1.5px] bg-slate-300 dark:bg-slate-600 z-10"
                        title="Marco de 50%"
                      />
                      <div
                        className="absolute top-0 bottom-0 left-[75%] w-[1.5px] bg-slate-300 dark:bg-slate-600 z-10"
                        title="Marco de 75%"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${style.barFill}`}
                        style={{ width: `${alert.clampedProgressPct}%` }}
                        data-testid={`milestone-progress-fill-${alert.dreamId}`}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Checkpoints 50%, 75%, 100% */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {DREAM_MILESTONE_THRESHOLDS.map(level => {
                          const isReached = alert.achievedMilestones.includes(level);
                          return (
                            <span
                              key={level}
                              className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border transition ${
                                isReached
                                  ? style.checkpointActive
                                  : 'bg-white/70 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isReached ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5 opacity-60" />
                              )}
                              <span>{level}%</span>
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {alert.remainingForMonth > 0
                            ? `Falta ${formatBRL(alert.remainingForMonth)} para 100% do mês`
                            : 'Meta mensal 100% cumprida!'}
                        </span>

                        {alert.remainingForMonth > 0 && onQuickCompleteMonth && (
                          <button
                            type="button"
                            onClick={() => onQuickCompleteMonth(alert.dreamId, alert.remainingForMonth)}
                            data-testid={`btn-complete-month-${alert.dreamId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Completar ({formatBRL(alert.remainingForMonth)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
