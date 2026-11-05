import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update and offline readiness callbacks
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[Yupee PWA] Novo conteúdo disponível.');
  },
  onOfflineReady() {
    console.log('[Yupee PWA] Aplicativo pronto para funcionar 100% offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
