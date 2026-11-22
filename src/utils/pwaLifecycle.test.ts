import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LAST_SW_SYNC_STORAGE_KEY,
  canSafelyReloadForUpdate,
  createInitialPwaLifecycleState,
  dismissPwaNeedRefresh,
  dismissPwaOfflineReady,
  forceRefreshPwaAssets,
  formatSyncTimestampPtBr,
  getActivePwaUpdateHandler,
  inspectPwaCacheDiagnostics,
  markPwaNeedRefresh,
  markPwaOfflineReady,
  readLastSwSyncAt,
  registerPwaServiceWorkerSafe,
  setActivePwaUpdateHandler,
  triggerSafePwaUpdate,
  writeLastSwSyncAt,
} from './pwaLifecycle';

test('PWA lifecycle state transitions manage refresh and offline banners cleanly', () => {
  let state = createInitialPwaLifecycleState();
  assert.deepEqual(state, {
    needRefresh: false,
    offlineReady: false,
    dismissedNeedRefresh: false,
    dismissedOfflineReady: false,
  });

  state = markPwaOfflineReady(state);
  assert.equal(state.offlineReady, true);
  assert.equal(state.dismissedOfflineReady, false);

  state = dismissPwaOfflineReady(state);
  assert.equal(state.offlineReady, true);
  assert.equal(state.dismissedOfflineReady, true);

  state = markPwaNeedRefresh(state);
  assert.equal(state.needRefresh, true);
  assert.equal(state.dismissedNeedRefresh, false);

  state = dismissPwaNeedRefresh(state);
  assert.equal(state.needRefresh, true);
  assert.equal(state.dismissedNeedRefresh, true);
});

test('registerPwaServiceWorkerSafe skips registration in non-production environments', () => {
  let registerCalled = false;
  const result = registerPwaServiceWorkerSafe({
    isProd: false,
    hasServiceWorkerSupport: true,
    registerFn: () => {
      registerCalled = true;
      return async () => {};
    },
    onNeedRefresh: () => {},
    onOfflineReady: () => {},
  });

  assert.equal(result.registered, false);
  assert.equal(result.reason, 'not-production');
  assert.equal(registerCalled, false);
});

test('registerPwaServiceWorkerSafe skips safely when navigator.serviceWorker is unsupported', () => {
  let registerCalled = false;
  const result = registerPwaServiceWorkerSafe({
    isProd: true,
    hasServiceWorkerSupport: false,
    registerFn: () => {
      registerCalled = true;
      return async () => {};
    },
    onNeedRefresh: () => {},
    onOfflineReady: () => {},
  });

  assert.equal(result.registered, false);
  assert.equal(result.reason, 'unsupported');
  assert.equal(registerCalled, false);
});

test('registerPwaServiceWorkerSafe catches errors without throwing and wires callbacks in production', async () => {
  let capturedError: unknown = null;
  const failResult = registerPwaServiceWorkerSafe({
    isProd: true,
    hasServiceWorkerSupport: true,
    registerFn: () => {
      throw new Error('SW registration failed in iframe');
    },
    onNeedRefresh: () => {},
    onOfflineReady: () => {},
    onError: (err) => {
      capturedError = err;
    },
  });

  assert.equal(failResult.registered, false);
  assert.equal(failResult.reason, 'error');
  assert.ok(capturedError instanceof Error);

  let offlineReadyTriggered = false;
  let needRefreshTriggered = false;
  let reloadedWithFlag: boolean | undefined;

  const successResult = registerPwaServiceWorkerSafe({
    isProd: true,
    hasServiceWorkerSupport: true,
    registerFn: (callbacks) => {
      callbacks.onOfflineReady();
      callbacks.onNeedRefresh();
      return async (reloadPage?: boolean) => {
        reloadedWithFlag = reloadPage;
      };
    },
    onNeedRefresh: () => {
      needRefreshTriggered = true;
    },
    onOfflineReady: () => {
      offlineReadyTriggered = true;
    },
  });

  assert.equal(successResult.registered, true);
  assert.equal(offlineReadyTriggered, true);
  assert.equal(needRefreshTriggered, true);
  assert.ok(getActivePwaUpdateHandler());

  // Blocks reload while a modal is open to protect unsaved form input
  assert.equal(canSafelyReloadForUpdate(true), false);
  const blocked = await triggerSafePwaUpdate(true);
  assert.equal(blocked, false);
  assert.equal(reloadedWithFlag, undefined);

  // Allows reload once modal is closed
  assert.equal(canSafelyReloadForUpdate(false), true);
  const applied = await triggerSafePwaUpdate(false);
  assert.equal(applied, true);
  assert.equal(reloadedWithFlag, true);

  setActivePwaUpdateHandler(undefined);
});

test('vite.config.ts declares aggressive precaching, manual chunks, and StaleWhileRevalidate metadata rule', () => {
  const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
  const content = fs.readFileSync(viteConfigPath, 'utf-8');

  assert.match(content, /registerType:\s*'autoUpdate'/);
  assert.match(content, /injectRegister:\s*'auto'/);
  assert.match(content, /globPatterns:\s*\['\*\*\/\*\.\{js,css,html,ico,png,svg,woff2\}'\]/);
  assert.match(content, /globIgnores:\s*\['\*\*\/node_modules\/\*\*\/\*',\s*'\*\*\/\*\.map'\]/);
  assert.match(content, /cleanupOutdatedCaches:\s*true/);
  assert.match(content, /clientsClaim:\s*true/);
  assert.match(content, /skipWaiting:\s*true/);
  assert.match(content, /navigateFallback:\s*'\/index\.html'/);
  assert.match(content, /navigateFallbackDenylist:\s*\[\s*\/\^\\\/api\\\/\/\s*\]/);
  assert.match(content, /handler:\s*'StaleWhileRevalidate'/);
  assert.match(content, /cacheName:\s*'finance-metadata-swr'/);
  assert.match(content, /maxEntries:\s*50/);
  assert.match(content, /maxAgeSeconds:\s*60\s*\*\s*60\s*\*\s*24/);
  assert.match(content, /'vendor-react'/);
  assert.match(content, /'core-finance'/);
  assert.match(content, /'d3-charts'/);
});

test('formatSyncTimestampPtBr formats DD/MM/YYYY HH:mm and handles missing values', () => {
  assert.equal(formatSyncTimestampPtBr(null), 'Nunca verificado');
  assert.equal(formatSyncTimestampPtBr(0), 'Nunca verificado');

  const dt = new Date(2026, 10, 21, 9, 5, 0); // 21/11/2026 09:05
  assert.equal(formatSyncTimestampPtBr(dt.getTime()), '21/11/2026 09:05');
});

test('inspectPwaCacheDiagnostics inspects SW waiting state and Workbox cache names safely', async () => {
  const diagnostics = await inspectPwaCacheDiagnostics({
    navigatorObj: {
      serviceWorker: {
        getRegistration: async () => ({
          active: {},
          waiting: { postMessage: () => {} },
        }),
      },
    },
    cachesObj: {
      keys: async () => ['workbox-precache-v2', 'finance-metadata-swr'],
      delete: async () => true,
    },
  });

  assert.equal(diagnostics.swSupported, true);
  assert.equal(diagnostics.swRegistered, true);
  assert.equal(diagnostics.updateAvailable, true);
  assert.equal(diagnostics.cacheCount, 2);
  assert.deepEqual(diagnostics.cacheNames, ['workbox-precache-v2', 'finance-metadata-swr']);
});

test('forceRefreshPwaAssets updates SW, posts SKIP_WAITING, purges caches without touching financial localStorage, and handles preview fallback', async () => {
  const storeMap = new Map<string, string>([
    ['yupee_transactions_v2', '[{"id":"tx-1"}]'],
    ['yupee_dreams_v2', '[{"id":"dream-1"}]'],
  ]);
  const mockStorage = {
    getItem: (k: string) => storeMap.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storeMap.set(k, v);
    },
  };

  let swUpdateCalled = false;
  let postedMsg: unknown = null;
  const deletedCaches: string[] = [];
  const syncTimestamp = new Date(2026, 10, 21, 12, 30, 0).getTime();

  const swResult = await forceRefreshPwaAssets({
    navigatorObj: {
      serviceWorker: {
        getRegistration: async () => ({
          active: {},
          waiting: {
            postMessage: (msg) => {
              postedMsg = msg;
            },
          },
          update: async () => {
            swUpdateCalled = true;
          },
        }),
      },
    },
    cachesObj: {
      keys: async () => ['workbox-precache-v2', 'finance-metadata-swr'],
      delete: async (name) => {
        deletedCaches.push(name);
        return true;
      },
    },
    storage: mockStorage,
    nowMs: syncTimestamp,
  });

  assert.equal(swUpdateCalled, true);
  assert.deepEqual(postedMsg, { type: 'SKIP_WAITING' });
  assert.deepEqual(deletedCaches, ['workbox-precache-v2', 'finance-metadata-swr']);
  assert.equal(swResult.mode, 'sw_updated');
  assert.equal(swResult.feedbackMessage, 'Assets atualizados! Recarregando...');
  assert.equal(swResult.deletedCacheCount, 2);
  assert.equal(swResult.shouldReload, true);

  // Financial localStorage keys must remain 100% intact
  assert.equal(storeMap.get('yupee_transactions_v2'), '[{"id":"tx-1"}]');
  assert.equal(storeMap.get('yupee_dreams_v2'), '[{"id":"dream-1"}]');
  assert.equal(readLastSwSyncAt(mockStorage), syncTimestamp);
  assert.equal(storeMap.get(LAST_SW_SYNC_STORAGE_KEY), String(syncTimestamp));

  // Preview / sandbox fallback when no SW registration exists
  const previewResult = await forceRefreshPwaAssets({
    navigatorObj: {},
    cachesObj: {
      keys: async () => ['stale-preview-cache'],
      delete: async () => true,
    },
    storage: mockStorage,
    nowMs: syncTimestamp + 60_000,
  });

  assert.equal(previewResult.mode, 'preview_cache_cleared');
  assert.equal(previewResult.feedbackMessage, 'Ambiente de pré-visualização: cache limpo');
  assert.equal(previewResult.deletedCacheCount, 1);
  assert.equal(previewResult.shouldReload, false);
  assert.equal(writeLastSwSyncAt(syncTimestamp, mockStorage), syncTimestamp);
});
