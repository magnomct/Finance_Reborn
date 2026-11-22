import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  PwaCacheDiagnostics,
  forceRefreshPwaAssets,
  formatSyncTimestampPtBr,
  inspectPwaCacheDiagnostics,
  readLastSwSyncAt,
  writeLastSwSyncAt,
} from '../utils/pwaLifecycle';

export const PWACacheStatusFooter: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [diagnostics, setDiagnostics] = useState<PwaCacheDiagnostics>({
    swSupported: false,
    swRegistered: false,
    updateAvailable: false,
    cacheCount: 0,
    cacheNames: [],
  });
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => readLastSwSyncAt());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'success' | 'info' | 'error';
  } | null>(null);

  const refreshDiagnostics = useCallback(async (recordTimestampIfMissing = false) => {
    const result = await inspectPwaCacheDiagnostics();
    setDiagnostics(result);
    if (recordTimestampIfMissing && !readLastSwSyncAt()) {
      const now = writeLastSwSyncAt(Date.now());
      setLastSyncAt(now);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refreshDiagnostics(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void refreshDiagnostics(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshDiagnostics]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleForceAssetRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setFeedback(null);

    try {
      const result = await forceRefreshPwaAssets();
      setLastSyncAt(result.syncedAt);
      await refreshDiagnostics(false);
      setFeedback({
        message: result.feedbackMessage,
        tone: result.mode === 'sw_updated' ? 'success' : 'info',
      });

      if (result.shouldReload && typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        setIsRefreshing(false);
      }
    } catch {
      setFeedback({
        message: 'Não foi possível verificar os caches agora. Seus dados financeiros estão seguros.',
        tone: 'error',
      });
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshDiagnostics]);

  const cacheStatusLabel = diagnostics.updateAvailable
    ? 'Atualização pronta em cache'
    : diagnostics.swRegistered
      ? 'Service Worker ativo'
      : 'Cache local do navegador';

  return (
    <footer
      className="mx-3 sm:mx-4 mt-4 mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 shadow-2xs backdrop-blur-sm"
      data-testid="pwa-cache-status-footer"
      aria-label="Diagnóstico de conectividade e cache PWA"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status de Conectividade + Diagnóstico Workbox */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0 ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}
            role="status"
            aria-live="polite"
            data-testid="pwa-connectivity-pill"
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isOnline ? 'Online • Sincronizado' : 'Modo Offline • Cache Local Ativo'}</span>
          </span>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span data-testid="pwa-sw-status-label">{cacheStatusLabel}</span>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="tabular-nums" data-testid="pwa-cache-count">
              {diagnostics.cacheCount}{' '}
              {diagnostics.cacheCount === 1 ? 'cache ativo' : 'caches ativos'}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="tabular-nums" data-testid="pwa-last-sync-at">
              Última verificação: {formatSyncTimestampPtBr(lastSyncAt)}
            </span>
          </div>
        </div>

        {/* Feedback + Ação Segura de Atualização de Assets */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {feedback && (
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                feedback.tone === 'error'
                  ? 'text-rose-500'
                  : feedback.tone === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
              }`}
              role="status"
              aria-live="polite"
              data-testid="pwa-refresh-feedback"
            >
              {feedback.tone === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              void handleForceAssetRefresh();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-wait whitespace-nowrap shrink-0"
            title="Limpa apenas caches HTTP/Workbox mantendo seus dados financeiros intactos"
            data-testid="btn-force-asset-refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>
              {isRefreshing ? 'Atualizando assets...' : 'Forçar Atualização de Assets'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
