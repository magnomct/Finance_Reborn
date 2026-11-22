export interface PwaLifecycleState {
  needRefresh: boolean;
  offlineReady: boolean;
  dismissedNeedRefresh: boolean;
  dismissedOfflineReady: boolean;
}

export type PwaUpdateHandler = (reloadPage?: boolean) => Promise<void>;

export const PWA_NEED_REFRESH_EVENT = 'yupee:pwa-need-refresh';
export const PWA_OFFLINE_READY_EVENT = 'yupee:pwa-offline-ready';
export const LAST_SW_SYNC_STORAGE_KEY = '@finance_app:last_sw_sync_at';

let activeUpdateHandler: PwaUpdateHandler | undefined;

export function createInitialPwaLifecycleState(): PwaLifecycleState {
  return {
    needRefresh: false,
    offlineReady: false,
    dismissedNeedRefresh: false,
    dismissedOfflineReady: false,
  };
}

export function markPwaNeedRefresh(state: PwaLifecycleState): PwaLifecycleState {
  return {
    ...state,
    needRefresh: true,
    dismissedNeedRefresh: false,
  };
}

export function markPwaOfflineReady(state: PwaLifecycleState): PwaLifecycleState {
  return {
    ...state,
    offlineReady: true,
    dismissedOfflineReady: false,
  };
}

export function dismissPwaNeedRefresh(state: PwaLifecycleState): PwaLifecycleState {
  return {
    ...state,
    dismissedNeedRefresh: true,
  };
}

export function dismissPwaOfflineReady(state: PwaLifecycleState): PwaLifecycleState {
  return {
    ...state,
    dismissedOfflineReady: true,
  };
}

export function canSafelyReloadForUpdate(hasUnsavedModalOpen: boolean): boolean {
  return !hasUnsavedModalOpen;
}

export function setActivePwaUpdateHandler(handler?: PwaUpdateHandler): void {
  activeUpdateHandler = handler;
}

export function getActivePwaUpdateHandler(): PwaUpdateHandler | undefined {
  return activeUpdateHandler;
}

export async function triggerSafePwaUpdate(
  hasUnsavedModalOpen: boolean,
  customHandler?: PwaUpdateHandler
): Promise<boolean> {
  if (!canSafelyReloadForUpdate(hasUnsavedModalOpen)) {
    return false;
  }
  const handler = customHandler ?? activeUpdateHandler;
  if (!handler) {
    return false;
  }
  await handler(true);
  return true;
}

export function dispatchPwaNeedRefresh(handler?: PwaUpdateHandler): void {
  if (handler) {
    setActivePwaUpdateHandler(handler);
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(PWA_NEED_REFRESH_EVENT));
  }
}

export function dispatchPwaOfflineReady(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(PWA_OFFLINE_READY_EVENT));
  }
}

export interface RegisterPwaCallbacks {
  onNeedRefresh: () => void;
  onOfflineReady: () => void;
  onRegisterError: (error: unknown) => void;
}

export interface RegisterPwaOptions {
  isProd: boolean;
  hasServiceWorkerSupport: boolean;
  registerFn: (callbacks: RegisterPwaCallbacks) => PwaUpdateHandler;
  onNeedRefresh: () => void;
  onOfflineReady: () => void;
  onError?: (error: unknown) => void;
}

export interface RegisterPwaResult {
  registered: boolean;
  updateSW?: PwaUpdateHandler;
  reason?: 'not-production' | 'unsupported' | 'error';
}

export function registerPwaServiceWorkerSafe(
  options: RegisterPwaOptions
): RegisterPwaResult {
  const {
    isProd,
    hasServiceWorkerSupport,
    registerFn,
    onNeedRefresh,
    onOfflineReady,
    onError,
  } = options;

  if (!isProd) {
    return { registered: false, reason: 'not-production' };
  }

  if (!hasServiceWorkerSupport) {
    return { registered: false, reason: 'unsupported' };
  }

  try {
    const updateSW = registerFn({
      onNeedRefresh,
      onOfflineReady,
      onRegisterError: (err) => {
        onError?.(err);
      },
    });
    setActivePwaUpdateHandler(updateSW);
    return {
      registered: true,
      updateSW,
    };
  } catch (error) {
    onError?.(error);
    return {
      registered: false,
      reason: 'error',
    };
  }
}

export function formatSyncTimestampPtBr(timestampMs: number | null | undefined): string {
  if (typeof timestampMs !== 'number' || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return 'Nunca verificado';
  }
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return 'Nunca verificado';
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function readLastSwSyncAt(storage?: StorageLike | null): number | null {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return null;
    const raw = store.getItem(LAST_SW_SYNC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastSwSyncAt(
  timestampMs: number,
  storage?: StorageLike | null
): number {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    if (store && Number.isFinite(timestampMs) && timestampMs > 0) {
      store.setItem(LAST_SW_SYNC_STORAGE_KEY, String(Math.floor(timestampMs)));
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  return timestampMs;
}

export interface ServiceWorkerRegistrationLike {
  active?: unknown;
  waiting?: { postMessage: (msg: unknown) => void } | null;
  installing?: unknown;
  update?: () => Promise<unknown>;
}

export interface NavigatorServiceWorkerLike {
  serviceWorker?: {
    getRegistration?: () => Promise<ServiceWorkerRegistrationLike | undefined>;
  };
}

export interface CacheStorageLike {
  keys: () => Promise<string[]>;
  delete: (cacheName: string) => Promise<boolean>;
}

export interface PwaCacheDiagnostics {
  swSupported: boolean;
  swRegistered: boolean;
  updateAvailable: boolean;
  cacheCount: number;
  cacheNames: string[];
}

export async function inspectPwaCacheDiagnostics(params?: {
  navigatorObj?: NavigatorServiceWorkerLike | null;
  cachesObj?: CacheStorageLike | null;
}): Promise<PwaCacheDiagnostics> {
  const nav =
    params?.navigatorObj !== undefined
      ? params.navigatorObj
      : typeof navigator !== 'undefined'
        ? (navigator as unknown as NavigatorServiceWorkerLike)
        : null;

  const cachesApi =
    params?.cachesObj !== undefined
      ? params.cachesObj
      : typeof window !== 'undefined' && 'caches' in window
        ? (window.caches as unknown as CacheStorageLike)
        : null;

  const swSupported = Boolean(nav?.serviceWorker?.getRegistration);
  let swRegistered = false;
  let updateAvailable = false;

  if (swSupported && nav?.serviceWorker?.getRegistration) {
    try {
      const reg = await nav.serviceWorker.getRegistration();
      if (reg) {
        swRegistered = Boolean(reg.active || reg.waiting || reg.installing);
        updateAvailable = Boolean(reg.waiting);
      }
    } catch {
      swRegistered = false;
      updateAvailable = false;
    }
  }

  let cacheNames: string[] = [];
  if (cachesApi && typeof cachesApi.keys === 'function') {
    try {
      cacheNames = await cachesApi.keys();
    } catch {
      cacheNames = [];
    }
  }

  return {
    swSupported,
    swRegistered,
    updateAvailable,
    cacheCount: cacheNames.length,
    cacheNames,
  };
}

export interface ForceRefreshPwaResult {
  mode: 'sw_updated' | 'preview_cache_cleared';
  feedbackMessage: string;
  deletedCacheCount: number;
  syncedAt: number;
  shouldReload: boolean;
}

export async function forceRefreshPwaAssets(params?: {
  navigatorObj?: NavigatorServiceWorkerLike | null;
  cachesObj?: CacheStorageLike | null;
  storage?: StorageLike | null;
  nowMs?: number;
}): Promise<ForceRefreshPwaResult> {
  const nav =
    params?.navigatorObj !== undefined
      ? params.navigatorObj
      : typeof navigator !== 'undefined'
        ? (navigator as unknown as NavigatorServiceWorkerLike)
        : null;

  const cachesApi =
    params?.cachesObj !== undefined
      ? params.cachesObj
      : typeof window !== 'undefined' && 'caches' in window
        ? (window.caches as unknown as CacheStorageLike)
        : null;

  const nowMs = params?.nowMs ?? Date.now();
  let hasActiveRegistration = false;

  if (nav?.serviceWorker?.getRegistration) {
    try {
      const registration = await nav.serviceWorker.getRegistration();
      if (registration) {
        hasActiveRegistration = true;
        if (typeof registration.update === 'function') {
          await registration.update();
        }
        if (registration.waiting && typeof registration.waiting.postMessage === 'function') {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch {
      // Gracefully fall back to cache cleanup without throwing
    }
  }

  let deletedCacheCount = 0;
  if (cachesApi && typeof cachesApi.keys === 'function') {
    try {
      const cacheNames = await cachesApi.keys();
      const results = await Promise.all(
        cacheNames.map((name) => cachesApi.delete(name))
      );
      deletedCacheCount = results.filter(Boolean).length;
    } catch {
      deletedCacheCount = 0;
    }
  }

  // Only updates the verification timestamp key; never clears financial localStorage data
  const syncedAt = writeLastSwSyncAt(nowMs, params?.storage);

  if (hasActiveRegistration) {
    return {
      mode: 'sw_updated',
      feedbackMessage: 'Assets atualizados! Recarregando...',
      deletedCacheCount,
      syncedAt,
      shouldReload: true,
    };
  }

  return {
    mode: 'preview_cache_cleared',
    feedbackMessage: 'Ambiente de pré-visualização: cache limpo',
    deletedCacheCount,
    syncedAt,
    shouldReload: false,
  };
}
