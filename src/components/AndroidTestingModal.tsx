import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  WifiOff, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { 
  getRecommendedAppUrl, 
  getAndroidTestingSteps, 
  checkPwaDiagnostics 
} from '../utils/androidTestingUtils';

interface AndroidTestingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMobilePreview?: () => void;
  isMobilePreviewActive?: boolean;
}

export const AndroidTestingModal: React.FC<AndroidTestingModalProps> = ({
  isOpen,
  onClose,
  onToggleMobilePreview,
  isMobilePreviewActive = false,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'steps' | 'diagnostics'>('qr');
  const diagnostics = checkPwaDiagnostics();
  const steps = getAndroidTestingSteps();

  const currentWindowUrl = typeof window !== 'undefined' ? window.location.href : '';
  const testUrl = getRecommendedAppUrl(currentWindowUrl);

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(testUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url: string) => setQrCodeDataUrl(url))
      .catch((err: unknown) => {
        console.error('Falha ao gerar QR code:', err);
      });
  }, [isOpen, testUrl]);

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(testUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Testar Yupee no Android
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  PWA WebAPK
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Acesse pelo celular, instale como app nativo e teste offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold px-4">
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>QR Code & Acesso</span>
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'steps'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>Guia Passo a Passo</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>Diagnóstico PWA</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {/* TAB 1: QR CODE & ACESSO */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col items-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code para testar no Android"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                      Gerando QR Code...
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    Aponte a câmera do seu Android
                  </span>
                </div>

                {/* Info and Link */}
                <div className="flex-1 space-y-3 text-left w-full">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Como testar agora no seu celular:
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      1. Abra a <strong>câmera do Android</strong> ou o Google Lens.<br />
                      2. Toque no link que surgir na tela.<br />
                      3. No Google Chrome, toque em <strong>Instalar Aplicativo</strong>.
                    </p>
                  </div>

                  {/* URL Box */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      URL Direta do Aplicativo:
                    </label>
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="truncate flex-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {testUrl}
                      </span>
                      <button
                        onClick={handleCopyUrl}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
                        title="Copiar URL"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <a
                        href={testUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Preview Mode Toggle */}
              {onToggleMobilePreview && (
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Maximize2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Simulador Mobile no Navegador
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Alterne para a moldura de celular Android diretamente nesta tela
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onToggleMobilePreview();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    {isMobilePreviewActive ? 'Desativar Simulador' : 'Ativar Simulador'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GUIA PASSO A PASSO */}
          {activeTab === 'steps' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <p>
                  O Yupee Reborn é compatível com o padrão <strong>WebAPK do Android</strong>. Ao ser instalado, ele ganha um ícone próprio, tela de splash e roda isolado como um aplicativo da Play Store.
                </p>
              </div>

              <div className="space-y-2.5">
                {steps.map(step => (
                  <div
                    key={step.step}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>
                      {step.tip && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Dica: {step.tip}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNÓSTICO PWA */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verificação de compatibilidade dos recursos do aplicativo para execução no Android:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Service Worker</p>
                    <p className="text-[10px] text-slate-400">Cache de assets e rotas offline</p>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Ativo
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Web App Manifest</p>
                    <p className="text-[10px] text-slate-400">Nome, tema #4f46e5 e standalone</p>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Configurado
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Ícones Android Maskable</p>
                    <p className="text-[10px] text-slate-400">192px, 512px e safe-zone</p>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Prontos
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Persistência Offline</p>
                    <p className="text-[10px] text-slate-400">localStorage seguro</p>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {diagnostics.hasLocalStorageSupport ? 'Suportado' : 'Indisponível'}
                  </span>
                </div>
              </div>

              {/* Status do Dispositivo */}
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Pronto para produção mobile</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Ao abrir o app em qualquer aparelho Android conectado à internet pela primeira vez, os arquivos são guardados no cache local. Lançamentos adicionados sem internet ficam salvos imediatamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Applet ao vivo para testes remotos</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs text-slate-800 dark:text-slate-100 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
