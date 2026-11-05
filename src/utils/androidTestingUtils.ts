/**
 * Utilitários para diagnóstico, gerenciamento e instruções de teste no Android
 */

export interface PwaDiagnosticResult {
  hasServiceWorkerSupport: boolean;
  hasNotificationSupport: boolean;
  hasLocalStorageSupport: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  platformName: string;
}

export interface AndroidStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

/**
 * Obtém a URL recomendada para teste no Android (prioriza URL pública hospedada sobre localhost)
 */
export function getRecommendedAppUrl(currentUrl: string, fallbackSharedUrl = 'https://ais-pre-dvlvkdbcvzcuyiqx54glv3-895853390556.us-east1.run.app'): string {
  if (!currentUrl) return fallbackSharedUrl;
  try {
    const parsed = new URL(currentUrl);
    // Se estiver rodando em localhost, a URL pública compartilhada é necessária para o celular acessar
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return fallbackSharedUrl;
    }
    return currentUrl;
  } catch {
    return fallbackSharedUrl;
  }
}

/**
 * Retorna as etapas de instalação e teste recomendadas para Android
 */
export function getAndroidTestingSteps(): AndroidStep[] {
  return [
    {
      step: 1,
      title: 'Acesse pelo Google Chrome',
      description: 'Abra a URL no Chrome do seu smartphone Android escaneando o QR Code ou digitando o link.',
      tip: 'Funciona nativamente em qualquer versão recente do Android.',
    },
    {
      step: 2,
      title: 'Instale como WebAPK Nativo',
      description: 'Toque no banner inferior "Adicionar Yupee à tela inicial" ou abra o menu de 3 pontinhos (⋮) do Chrome e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
      tip: 'O Android criará um app real com o ícone dos 6 Potes na gaveta de aplicativos.',
    },
    {
      step: 3,
      title: 'Experiência Standalone sem Navegador',
      description: 'Abra o Yupee pelo ícone na tela inicial. Ele iniciará em tela cheia sem barra de endereços, exatamente como um aplicativo nativo.',
    },
    {
      step: 4,
      title: 'Teste o Modo 100% Offline',
      description: 'Coloque o Android em Modo Avião (ou desligue Wi-Fi e dados móveis). O app continuará funcionando normalmente, permitindo registrar lançamentos na Agenda e calcular saldos.',
      tip: 'Os dados ficam salvos localmente e persistem com segurança.',
    },
  ];
}

/**
 * Executa checagem de diagnóstico das capacidades PWA do navegador
 */
export function checkPwaDiagnostics(): PwaDiagnosticResult {
  const hasWindow = typeof window !== 'undefined';
  const hasNav = typeof navigator !== 'undefined';

  const hasServiceWorkerSupport = hasNav && 'serviceWorker' in navigator;
  const hasNotificationSupport = hasWindow && 'Notification' in window;
  const hasLocalStorageSupport = (() => {
    try {
      if (!hasWindow || !window.localStorage) return false;
      const testKey = '__pwa_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  })();

  const isStandalone = hasWindow
    ? window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    : false;

  const isOnline = hasNav && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;

  const userAgent = hasNav ? navigator.userAgent : '';
  let platformName = 'Desktop / Navegador';
  if (/android/i.test(userAgent)) {
    platformName = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    platformName = 'iOS (Apple)';
  }

  return {
    hasServiceWorkerSupport,
    hasNotificationSupport,
    hasLocalStorageSupport,
    isStandalone,
    isOnline,
    platformName,
  };
}
