import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Edit3,
  Check,
  X,
  RefreshCw,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { JarType } from '../types';
import { formatBRL } from '../utils/finance';
import {
  BaseIncomeConfig,
  RealizedIncomeBreakdown,
  buildSixJarsAllocationPreview,
  parseBRLInput,
} from '../utils/baseIncomeConfig';
import { SaveManualIncomePayload } from '../hooks/useBaseIncome';
import { formatMonthLabelPtBr } from '../utils/sixJarsMetrics';

export interface BaseIncomeConfigCardProps {
  config: BaseIncomeConfig;
  effectiveBaseIncome: number;
  realizedIncome: RealizedIncomeBreakdown;
  customPercentages?: Partial<Record<JarType, number>>;
  usePjProfitInPf: boolean;
  onSaveManualIncome: (payload: SaveManualIncomePayload) => void;
  onSwitchToAuto: () => void;
  onUseRealizedIncome: () => void;
  onNavigateToSixJars?: () => void;
}

function toEditableNumberString(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toFixed(2).replace('.', ',');
}

export const BaseIncomeConfigCard: React.FC<BaseIncomeConfigCardProps> = ({
  config,
  effectiveBaseIncome,
  realizedIncome,
  customPercentages,
  usePjProfitInPf,
  onSaveManualIncome,
  onSwitchToAuto,
  onUseRealizedIncome,
  onNavigateToSixJars,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [useSplit, setUseSplit] = useState<boolean>(config.useSplitInputs);
  const [directInput, setDirectInput] = useState<string>(() =>
    toEditableNumberString(
      config.mode === 'manual' ? config.manualTotalBRL : effectiveBaseIncome
    )
  );
  const [pfInput, setPfInput] = useState<string>(() =>
    toEditableNumberString(
      config.pfFixedIncomeBRL > 0 ? config.pfFixedIncomeBRL : realizedIncome.pfIncomeBRL
    )
  );
  const [meiInput, setMeiInput] = useState<string>(() =>
    toEditableNumberString(
      config.meiNetTransferBRL > 0
        ? config.meiNetTransferBRL
        : realizedIncome.meiNetTransferBRL
    )
  );
  const [showSavedBadge, setShowSavedBadge] = useState<boolean>(false);

  // Keep draft inputs in sync when external config changes while not editing
  useEffect(() => {
    if (isEditing) return;
    setUseSplit(config.useSplitInputs);
    setDirectInput(
      toEditableNumberString(
        config.mode === 'manual' ? config.manualTotalBRL : effectiveBaseIncome
      )
    );
    setPfInput(
      toEditableNumberString(
        config.pfFixedIncomeBRL > 0 ? config.pfFixedIncomeBRL : realizedIncome.pfIncomeBRL
      )
    );
    setMeiInput(
      toEditableNumberString(
        config.meiNetTransferBRL > 0
          ? config.meiNetTransferBRL
          : realizedIncome.meiNetTransferBRL
      )
    );
  }, [isEditing, config, effectiveBaseIncome, realizedIncome]);

  useEffect(() => {
    if (!showSavedBadge) return;
    const timer = setTimeout(() => setShowSavedBadge(false), 5000);
    return () => clearTimeout(timer);
  }, [showSavedBadge]);

  const draftIncomeBRL = useMemo(() => {
    if (!isEditing) return effectiveBaseIncome;
    if (useSplit) {
      return Math.max(0, parseBRLInput(pfInput) + parseBRLInput(meiInput));
    }
    return Math.max(0, parseBRLInput(directInput));
  }, [isEditing, useSplit, pfInput, meiInput, directInput, effectiveBaseIncome]);

  const previewItems = useMemo(
    () => buildSixJarsAllocationPreview(draftIncomeBRL, customPercentages),
    [draftIncomeBRL, customPercentages]
  );

  const totalPreviewPct = useMemo(
    () => previewItems.reduce((acc, item) => acc + item.pct, 0),
    [previewItems]
  );

  const handleOpenEditor = () => {
    setUseSplit(config.useSplitInputs);
    setDirectInput(toEditableNumberString(effectiveBaseIncome));
    setPfInput(
      toEditableNumberString(
        config.mode === 'manual' && config.useSplitInputs
          ? config.pfFixedIncomeBRL
          : realizedIncome.pfIncomeBRL || effectiveBaseIncome
      )
    );
    setMeiInput(
      toEditableNumberString(
        config.mode === 'manual' && config.useSplitInputs
          ? config.meiNetTransferBRL
          : realizedIncome.meiNetTransferBRL
      )
    );
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleCommitManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (useSplit) {
      const pf = parseBRLInput(pfInput);
      const mei = parseBRLInput(meiInput);
      onSaveManualIncome({
        manualTotalBRL: pf + mei,
        pfFixedIncomeBRL: pf,
        meiNetTransferBRL: mei,
        useSplitInputs: true,
      });
    } else {
      const total = parseBRLInput(directInput);
      onSaveManualIncome({
        manualTotalBRL: total,
        useSplitInputs: false,
      });
    }
    setIsEditing(false);
    setShowSavedBadge(true);
  };

  const handleModeSwitch = (targetMode: 'manual' | 'auto_consolidated') => {
    if (targetMode === 'auto_consolidated') {
      setIsEditing(false);
      onSwitchToAuto();
      setShowSavedBadge(true);
      return;
    }
    if (config.mode !== 'manual') {
      handleOpenEditor();
    }
  };

  const handleApplyRealizedClick = () => {
    setIsEditing(false);
    onUseRealizedIncome();
    setShowSavedBadge(true);
  };

  const monthLabel = formatMonthLabelPtBr(realizedIncome.monthKey);

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4"
      data-testid="base-income-config-card"
      aria-labelledby="base-income-card-title"
    >
      {/* Top Header Row: Title, Mode Toggle Pill & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-sm shrink-0">
            <Wallet className="w-5 h-5" />
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Configurar Renda Base Consolidada
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  config.mode === 'manual'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                }`}
                data-testid="base-income-mode-badge"
              >
                {config.mode === 'manual'
                  ? 'Modo Manual / Fixo'
                  : 'Automático (Extrato PF + MEI)'}
              </span>

              {showSavedBadge && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black animate-in fade-in duration-150"
                  data-testid="base-income-saved-badge"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Salvo e sincronizado com os 6 Potes ✓</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-0.5">
              <h3
                id="base-income-card-title"
                className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300"
              >
                Renda Líquida Base:
              </h3>
              <span
                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight"
                data-testid="base-income-display-value"
              >
                {formatBRL(draftIncomeBRL)}
              </span>
              {isEditing && draftIncomeBRL !== effectiveBaseIncome && (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  (prévia em tempo real)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Realizado em {monthLabel}: PF{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {formatBRL(realizedIncome.pfIncomeBRL)}
              </strong>{' '}
              {usePjProfitInPf ? (
                <>
                  + Repasse MEI{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {formatBRL(realizedIncome.meiNetTransferBRL)}
                  </strong>{' '}
                  ={' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatBRL(realizedIncome.consolidatedIncomeBRL)}
                  </strong>
                </>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  (Lucro PJ desativado no perfil)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Mode Toggle Pill + Inline Edit / Use Realized Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Mode Toggle Pill */}
          <div
            className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold"
            role="group"
            aria-label="Modo de cálculo da renda líquida base"
          >
            <button
              type="button"
              onClick={() => handleModeSwitch('manual')}
              data-testid="btn-mode-manual"
              className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                config.mode === 'manual' || isEditing
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('auto_consolidated')}
              data-testid="btn-mode-auto"
              className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                config.mode === 'auto_consolidated' && !isEditing
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Sincronizado c/ Extrato + MEI
            </button>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleOpenEditor}
              data-testid="btn-edit-base-income"
              className="px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Renda</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyRealizedClick}
            data-testid="btn-use-realized-income"
            title={`Sincronizar com a renda realizada no extrato de ${monthLabel} (${formatBRL(
              realizedIncome.consolidatedIncomeBRL
            )})`}
            className="px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Usar Renda Realizada do Mês</span>
          </button>
        </div>
      </div>

      {/* Inline Editor Panel */}
      {isEditing && (
        <form
          onSubmit={handleCommitManual}
          className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800/70 space-y-3 animate-in fade-in duration-150"
          data-testid="base-income-editor-form"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Defina sua Renda Líquida Mensal Alvo (atualiza os 6 Potes na hora)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setUseSplit(prev => !prev)}
              data-testid="btn-toggle-pf-mei-split"
              className={`self-start sm:self-auto px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                useSplit
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{useSplit ? 'Modo Consolidado Único' : 'Dividir PF + Repasse MEI'}</span>
            </button>
          </div>

          {!useSplit ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="input-base-income-total"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1"
                >
                  Renda Líquida Mensal Consolidada (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    R$
                  </span>
                  <input
                    id="input-base-income-total"
                    data-testid="input-base-income-total"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    placeholder="Ex: 6.500,00"
                    value={directInput}
                    onChange={e => setDirectInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={draftIncomeBRL <= 0}
                  data-testid="btn-save-base-income"
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar e Sincronizar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  data-testid="btn-cancel-base-income"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <label
                  htmlFor="input-base-income-pf"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1"
                >
                  Renda PF Fixa (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    R$
                  </span>
                  <input
                    id="input-base-income-pf"
                    data-testid="input-base-income-pf"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    placeholder="Ex: 3.500,00"
                    value={pfInput}
                    onChange={e => setPfInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="input-base-income-mei"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1"
                >
                  Repasse Líquido MEI (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    R$
                  </span>
                  <input
                    id="input-base-income-mei"
                    data-testid="input-base-income-mei"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 2.500,00"
                    value={meiInput}
                    onChange={e => setMeiInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={draftIncomeBRL <= 0}
                  data-testid="btn-save-base-income"
                  className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar ({formatBRL(draftIncomeBRL)})</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  data-testid="btn-cancel-base-income"
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-bold transition cursor-pointer"
                  aria-label="Cancelar edição"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {draftIncomeBRL <= 0 && (
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Informe um valor maior que R$ 0,00 ou utilize &quot;Sincronizado c/ Extrato + MEI&quot;.
            </p>
          )}
        </form>
      )}

      {/* Live 6 Jars Allocation Preview Bar + 6 Compact Mini-Pills */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            Prévia Instantânea dos 6 Potes ({totalPreviewPct.toFixed(0)}%)
          </span>
          {onNavigateToSixJars && (
            <button
              type="button"
              onClick={onNavigateToSixJars}
              data-testid="btn-goto-six-jars-from-income"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir 6 Potes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Stacked Proportional Color Bar */}
        <div
          className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5"
          aria-hidden="true"
          data-testid="base-income-preview-bar"
        >
          {previewItems.map(item => (
            <div
              key={item.id}
              className="h-full transition-all duration-200"
              style={{
                width: `${totalPreviewPct > 0 ? (item.pct / totalPreviewPct) * 100 : 0}%`,
                backgroundColor: item.colorHex,
              }}
              title={`${item.name} (${item.pct}%): ${formatBRL(item.amountBRL)}`}
            />
          ))}
        </div>

        {/* 6 Compact Mini-Pills */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
          data-testid="base-income-preview-pills"
        >
          {previewItems.map(item => (
            <div
              key={item.id}
              data-testid={`income-preview-pill-${item.id}`}
              className="px-2.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.colorHex }}
                />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {item.shortName} ({item.pct.toFixed(0)}%)
                </span>
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums mt-0.5 truncate">
                {formatBRL(item.amountBRL)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
