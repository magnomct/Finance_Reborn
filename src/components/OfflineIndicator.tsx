import React, { useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  pendingCount: number;
  onSyncNow?: () => Promise<void> | void;
  isSyncing?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  pendingCount,
  onSyncNow,
  isSyncing = false,
}) => {
  const isOnline = useOnlineStatus();
  const [justSynced, setJustSynced] = useState(false);

  const handleManualSync = async () => {
    if (onSyncNow) {
      await onSyncNow();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3500);
    }
  };

  if (isOnline && pendingCount === 0 && !justSynced) {
    return null;
  }

  if (justSynced) {
    return (
      <div className="fixed bottom-safe left-4 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>Sincronização concluída com sucesso!</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className="fixed bottom-safe left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600 text-white px-4 py-2.5 text-xs font-medium shadow-xl border border-amber-400/30 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <WifiOff className="w-4 h-4 text-amber-100" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span className="font-bold">Modo Offline Ativo:</span>
          <span className="text-amber-100 text-[11px] sm:text-xs">
            {pendingCount > 0
              ? `${pendingCount} transação(ões) registrada(s) localmente`
              : 'Novas transações serão salvas no dispositivo'}
          </span>
        </div>
      </div>
    );
  }

  // When online but has pending offline queue items
  return (
    <div
      className="fixed bottom-safe left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-indigo-700 text-white px-4 py-2.5 text-xs font-medium shadow-xl border border-indigo-500/40 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2"
      role="status"
      aria-live="polite"
    >
      <Wifi className="w-4 h-4 text-emerald-300" />
      <span>
        Online — <strong className="text-emerald-300">{pendingCount}</strong> transação(ões) offline aguardando sincronização
      </span>
      {onSyncNow && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="ml-1.5 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      )}
    </div>
  );
};
