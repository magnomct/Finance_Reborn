import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenAndroidGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenAndroidGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running inside standalone PWA mode, suppress install button
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        PWA Instalado
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstalledSuccess(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        title="Instalar Yupee Reborn como aplicativo no seu computador ou celular"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Instalar App</span>
        <span className="md:hidden">Instalar</span>
      </button>

      {/* iOS or Manual Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Instalar Yupee PWA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acesso rápido, ícone dedicado e suporte 100% offline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Como instalar no iPhone ou iPad (Safari):
                </p>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-indigo-600">1.</span>
                  <div className="flex-1">
                    Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com seta para cima) na barra do Safari.
                  </div>
                  <Share2 className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-indigo-600">2.</span>
                  <div>
                    Role as opções e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-indigo-600">3.</span>
                  <div>
                    Confirme tocando em <strong>Adicionar</strong>. O Yupee aparecerá junto aos seus outros aplicativos!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Instalação em Navegadores Modernos (Chrome / Edge / Android):
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Download className="w-4 h-4" />
                    <span>Instalar pelo Navegador</span>
                  </div>
                  <p>
                    Clique no ícone de computador/instalação na barra de endereço (à direita da URL) ou no menu de 3 pontinhos do navegador e selecione <strong>"Instalar Yupee Reborn"</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Vantagens do PWA:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li>Funciona mesmo sem internet com armazenamento offline.</li>
                    <li>Janela própria sem barra de navegação do browser.</li>
                    <li>Sincronização imediata ao reconectar.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {onOpenAndroidGuide && (
                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    onOpenAndroidGuide();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Ver QR Code para Android</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer text-center"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
