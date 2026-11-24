import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  PwaCacheDiagnostics,
  forceRefreshPwaAssets,
  formatSyncTimestampPtBr,
  inspectPwaCacheDiagnostics,
  readLastSwSyncAt,
  writeLastSwSyncAt,
} from '../utils/pwaLifecycle';

export interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface TechnicalDiagnosticsPayload {
  timestamp_br: string;
  network: {
    online: boolean;
    effectiveType: string;
    downlinkMbps: number | null;
    rttMs: number | null;
  };
  serviceWorker: {
    supported: boolean;
    state: string;
    scope: string | null;
    updateWaiting: boolean;
  };
  cacheStorage: Array<{
    cacheName: string;
    entryCount: number;
  }>;
  localStorageHealth: {
    schemaVersion: string;
    lastAssetSyncAt: string | null;
    activeKeysCount: number;
  };
}

interface CollectDiagnosticsDeps {
  navigatorObj?: {
    onLine?: boolean;
    connection?: NetworkInformationLike;
    serviceWorker?: {
      getRegistration?: () => Promise<{
        scope?: string;
        active?: { state?: string } | null;
        waiting?: { state?: string } | null;
        installing?: { state?: string } | null;
      } | undefined>;
    };
  } | null;
  cachesObj?: {
    keys?: () => Promise<string[]>;
    open?: (name: string) => Promise<{ keys: () => Promise<readonly unknown[]> }>;
  } | null;
  storageObj?: Storage | Record<string, string> | null;
  nowDate?: Date;
}

function formatDateTimePtBrWithSeconds(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} (${date.toISOString()})`;
}

export async function collectTechnicalDiagnostics(
  deps?: CollectDiagnosticsDeps
): Promise<TechnicalDiagnosticsPayload> {
  const now = deps?.nowDate ?? new Date();
  const timestamp_br = formatDateTimePtBrWithSeconds(now);

  try {
    const nav =
      deps?.navigatorObj !== undefined
        ? deps.navigatorObj
        : typeof navigator !== 'undefined'
          ? (navigator as unknown as CollectDiagnosticsDeps['navigatorObj'])
          : null;

    const connection = nav?.connection;
    const online = typeof nav?.onLine === 'boolean' ? nav.onLine : true;

    const swSupported = Boolean(nav && 'serviceWorker' in nav && nav.serviceWorker);
    let swState = 'nao_registrado';
    let swScope: string | null = null;
    let updateWaiting = false;

    if (swSupported && typeof nav?.serviceWorker?.getRegistration === 'function') {
      try {
        const registration = await nav.serviceWorker.getRegistration();
        if (registration) {
          const activeWorker =
            registration.active ?? registration.waiting ?? registration.installing;
          swState = activeWorker?.state ?? 'nao_registrado';
          swScope = registration.scope ?? null;
          updateWaiting = Boolean(registration.waiting);
        }
      } catch {
        swState = 'nao_registrado';
        swScope = null;
        updateWaiting = false;
      }
    }

    const cachesApi =
      deps?.cachesObj !== undefined
        ? deps.cachesObj
        : typeof window !== 'undefined' && 'caches' in window
          ? (window.caches as unknown as CollectDiagnosticsDeps['cachesObj'])
          : null;

    const cacheStorage: Array<{ cacheName: string; entryCount: number }> = [];
    if (
      cachesApi &&
      typeof cachesApi.keys === 'function' &&
      typeof cachesApi.open === 'function'
    ) {
      try {
        const names = await cachesApi.keys();
        const buckets = await Promise.all(
          names.map(async (cacheName) => {
            try {
              const cache = await cachesApi.open!(cacheName);
              const entries = await cache.keys();
              return { cacheName, entryCount: entries.length };
            } catch {
              return { cacheName, entryCount: 0 };
            }
          })
        );
        cacheStorage.push(...buckets);
      } catch {
        // Fallback to empty array if CacheStorage is blocked in sandbox
      }
    }

    let schemaVersion = '1.0';
    let lastAssetSyncAt: string | null = null;
    let activeKeysCount = 0;

    try {
      const store =
        deps?.storageObj !== undefined
          ? deps.storageObj
          : typeof localStorage !== 'undefined'
            ? localStorage
            : null;

      if (store) {
        if (typeof (store as Storage).getItem === 'function') {
          const s = store as Storage;
          schemaVersion = s.getItem('@finance_app:schema_version') ?? '1.0';
          lastAssetSyncAt = s.getItem('@finance_app:last_sw_sync_at') ?? null;
          activeKeysCount = Object.keys(s).filter((k) =>
            k.startsWith('@finance_app')
          ).length;
        } else {
          const rec = store as Record<string, string>;
          schemaVersion = rec['@finance_app:schema_version'] ?? '1.0';
          lastAssetSyncAt = rec['@finance_app:last_sw_sync_at'] ?? null;
          activeKeysCount = Object.keys(rec).filter((k) =>
            k.startsWith('@finance_app')
          ).length;
        }
      }
    } catch {
      schemaVersion = '1.0';
      lastAssetSyncAt = null;
      activeKeysCount = 0;
    }

    return {
      timestamp_br,
      network: {
        online,
        effectiveType: connection?.effectiveType ?? 'desconhecido',
        downlinkMbps:
          typeof connection?.downlink === 'number' ? connection.downlink : null,
        rttMs: typeof connection?.rtt === 'number' ? connection.rtt : null,
      },
      serviceWorker: {
        supported: swSupported,
        state: swState,
        scope: swScope,
        updateWaiting,
      },
      cacheStorage,
      localStorageHealth: {
        schemaVersion,
        lastAssetSyncAt,
        activeKeysCount,
      },
    };
  } catch {
    return {
      timestamp_br,
      network: {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: 'desconhecido',
        downlinkMbps: null,
        rttMs: null,
      },
      serviceWorker: {
        supported: false,
        state: 'nao_registrado',
        scope: null,
        updateWaiting: false,
      },
      cacheStorage: [],
      localStorageHealth: {
        schemaVersion: '1.0',
        lastAssetSyncAt: null,
        activeKeysCount: 0,
      },
    };
  }
}

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

  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [isCollectingLog, setIsCollectingLog] = useState<boolean>(false);
  const [technicalPayload, setTechnicalPayload] =
    useState<TechnicalDiagnosticsPayload | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const refreshDiagnostics = useCallback(async (recordTimestampIfMissing = false) => {
    const result = await inspectPwaCacheDiagnostics();
    setDiagnostics(result);
    if (recordTimestampIfMissing && !readLastSwSyncAt()) {
      const now = writeLastSwSyncAt(Date.now());
      setLastSyncAt(now);
    }
  }, []);

  const loadTechnicalDiagnostics = useCallback(async () => {
    setIsCollectingLog(true);
    try {
      const payload = await collectTechnicalDiagnostics();
      setTechnicalPayload(payload);
    } finally {
      setIsCollectingLog(false);
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

  useEffect(() => {
    if (!copiedJson) return;
    const timer = setTimeout(() => {
      setCopiedJson(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedJson]);

  const handleToggleTechnicalLog = useCallback(async () => {
    if (isLogOpen) {
      setIsLogOpen(false);
      return;
    }
    setIsLogOpen(true);
    await loadTechnicalDiagnostics();
  }, [isLogOpen, loadTechnicalDiagnostics]);

  const handleCopyJson = useCallback(async () => {
    if (!technicalPayload) return;
    const serialized = JSON.stringify(technicalPayload, null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(serialized);
      }
      setCopiedJson(true);
    } catch {
      setCopiedJson(false);
    }
  }, [technicalPayload]);

  const handleForceAssetRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setFeedback(null);

    try {
      const result = await forceRefreshPwaAssets();
      setLastSyncAt(result.syncedAt);
      await refreshDiagnostics(false);
      if (isLogOpen) {
        await loadTechnicalDiagnostics();
      }
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
  }, [isLogOpen, isRefreshing, loadTechnicalDiagnostics, refreshDiagnostics]);

  const cacheStatusLabel = diagnostics.updateAvailable
    ? 'Atualização pronta em cache'
    : diagnostics.swRegistered
      ? 'Service Worker ativo'
      : 'Cache local do navegador';

  return (
    <footer
      className="mx-3 sm:mx-4 mt-4 mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 shadow-2xs backdrop-blur-sm space-y-3"
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

        {/* Feedback + Ações Técnicas */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              void handleToggleTechnicalLog();
            }}
            aria-expanded={isLogOpen}
            aria-controls="pwa-technical-log-panel"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              isLogOpen
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
            }`}
            title="Inspecionar diagnóstico técnico de cache, Service Worker e esquema em JSON"
            data-testid="btn-toggle-technical-log"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Log Técnico</span>
          </button>

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

      {/* Painel Colapsável de Log Técnico JSON (Privacidade Segura) */}
      {isLogOpen && (
        <section
          id="pwa-technical-log-panel"
          className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80"
          aria-label="Diagnóstico Técnico de Cache e Sincronização em JSON"
          data-testid="pwa-technical-log-drawer"
        >
          <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <h4 className="text-[11px] font-bold text-slate-100 truncate">
                  Diagnóstico Técnico de Cache &amp; Sincronização (JSON)
                </h4>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void loadTechnicalDiagnostics();
                  }}
                  disabled={isCollectingLog}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  data-testid="btn-refresh-technical-log"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-indigo-400 ${isCollectingLog ? 'animate-spin' : ''}`}
                  />
                  <span>Atualizar Leitura</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleCopyJson();
                  }}
                  disabled={!technicalPayload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  data-testid="btn-copy-technical-json"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-200 shrink-0" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 shrink-0" />
                      <span>Copiar JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-semibold transition cursor-pointer"
                  aria-label="Fechar"
                  data-testid="btn-close-technical-log"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Fechar</span>
                </button>
              </div>
            </div>

            <pre
              className="p-3.5 max-h-64 overflow-auto font-mono text-xs leading-relaxed text-emerald-300 selection:bg-indigo-500/40"
              data-testid="pwa-technical-json-pre"
            >
              {isCollectingLog && !technicalPayload
                ? 'Coletando telemetria técnica de cache e Service Worker...'
                : JSON.stringify(technicalPayload, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </footer>
  );
};
