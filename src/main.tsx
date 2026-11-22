import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import {
  dispatchPwaNeedRefresh,
  dispatchPwaOfflineReady,
  registerPwaServiceWorkerSafe,
} from './utils/pwaLifecycle';

// Safe production-only Service Worker registration with non-intrusive pt-BR callbacks
registerPwaServiceWorkerSafe({
  isProd: import.meta.env.PROD,
  hasServiceWorkerSupport:
    typeof window !== 'undefined' && 'serviceWorker' in navigator,
  registerFn: (callbacks) =>
    registerSW({
      immediate: true,
      onNeedRefresh: callbacks.onNeedRefresh,
      onOfflineReady: callbacks.onOfflineReady,
      onRegisterError: callbacks.onRegisterError,
    }),
  onNeedRefresh: () => {
    dispatchPwaNeedRefresh();
  },
  onOfflineReady: () => {
    dispatchPwaOfflineReady();
  },
  onError: () => {
    // Falha silenciosa em ambientes sem suporte a Service Worker
  },
});

createRoot(document.getElementById('root')!).render(<App />);
