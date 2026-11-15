import { useCallback, useMemo, useState } from 'react';
import { JarType, Transaction } from '../types';
import {
  BaseIncomeConfig,
  JarAllocationPreviewItem,
  RealizedIncomeBreakdown,
  buildSixJarsAllocationPreview,
  calculateRealizedConsolidatedIncome,
  calculateSixJarsCascadeLimits,
  createDefaultBaseIncomeConfig,
  loadBaseIncomeConfig,
  resolveEffectiveBaseIncome,
  saveBaseIncomeConfig,
} from '../utils/baseIncomeConfig';

export interface UseBaseIncomeOptions {
  transactions: Transaction[];
  usePjProfitInPf: boolean;
  customPercentages?: Partial<Record<JarType, number>>;
  existingPjExcludedLimit?: number;
  onCascadeJarLimits?: (limits: Record<JarType, number>) => void;
}

export interface SaveManualIncomePayload {
  manualTotalBRL: number;
  pfFixedIncomeBRL?: number;
  meiNetTransferBRL?: number;
  useSplitInputs?: boolean;
}

export interface UseBaseIncomeResult {
  config: BaseIncomeConfig;
  realizedIncome: RealizedIncomeBreakdown;
  effectiveBaseIncome: number;
  cascadeJarLimits: Record<JarType, number>;
  allocationPreview: JarAllocationPreviewItem[];
  saveManualIncome: (payload: SaveManualIncomePayload) => BaseIncomeConfig;
  switchToAutoConsolidated: () => BaseIncomeConfig;
  useRealizedMonthIncome: (applyAsManual?: boolean) => BaseIncomeConfig;
  resetBaseIncome: () => BaseIncomeConfig;
}

export function useBaseIncome({
  transactions,
  usePjProfitInPf,
  customPercentages,
  existingPjExcludedLimit = 600,
  onCascadeJarLimits,
}: UseBaseIncomeOptions): UseBaseIncomeResult {
  const [config, setConfig] = useState<BaseIncomeConfig>(() => loadBaseIncomeConfig());

  const realizedIncome = useMemo(
    () => calculateRealizedConsolidatedIncome(transactions, usePjProfitInPf),
    [transactions, usePjProfitInPf]
  );

  const effectiveBaseIncome = useMemo(
    () => resolveEffectiveBaseIncome(config, realizedIncome.consolidatedIncomeBRL),
    [config, realizedIncome.consolidatedIncomeBRL]
  );

  const cascadeJarLimits = useMemo(
    () =>
      calculateSixJarsCascadeLimits(
        effectiveBaseIncome,
        customPercentages,
        existingPjExcludedLimit
      ),
    [effectiveBaseIncome, customPercentages, existingPjExcludedLimit]
  );

  const allocationPreview = useMemo(
    () => buildSixJarsAllocationPreview(effectiveBaseIncome, customPercentages),
    [effectiveBaseIncome, customPercentages]
  );

  const commitConfigAndCascade = useCallback(
    (nextRaw: BaseIncomeConfig): BaseIncomeConfig => {
      const saved = saveBaseIncomeConfig({
        ...nextRaw,
        updatedAt: new Date().toISOString(),
      });
      setConfig(saved);

      const resolved = resolveEffectiveBaseIncome(
        saved,
        realizedIncome.consolidatedIncomeBRL
      );
      const nextLimits = calculateSixJarsCascadeLimits(
        resolved,
        customPercentages,
        existingPjExcludedLimit
      );
      onCascadeJarLimits?.(nextLimits);
      return saved;
    },
    [
      realizedIncome.consolidatedIncomeBRL,
      customPercentages,
      existingPjExcludedLimit,
      onCascadeJarLimits,
    ]
  );

  const saveManualIncome = useCallback(
    (payload: SaveManualIncomePayload): BaseIncomeConfig => {
      const useSplit = Boolean(payload.useSplitInputs);
      const pf = payload.pfFixedIncomeBRL ?? config.pfFixedIncomeBRL;
      const mei = payload.meiNetTransferBRL ?? config.meiNetTransferBRL;
      const manualTotal = useSplit
        ? Math.max(0, pf) + Math.max(0, mei)
        : Math.max(0, payload.manualTotalBRL);

      return commitConfigAndCascade({
        mode: 'manual',
        useSplitInputs: useSplit,
        manualTotalBRL: manualTotal,
        pfFixedIncomeBRL: useSplit ? Math.max(0, pf) : manualTotal,
        meiNetTransferBRL: useSplit ? Math.max(0, mei) : 0,
        updatedAt: new Date().toISOString(),
      });
    },
    [commitConfigAndCascade, config.pfFixedIncomeBRL, config.meiNetTransferBRL]
  );

  const switchToAutoConsolidated = useCallback((): BaseIncomeConfig => {
    return commitConfigAndCascade({
      ...config,
      mode: 'auto_consolidated',
      updatedAt: new Date().toISOString(),
    });
  }, [commitConfigAndCascade, config]);

  const useRealizedMonthIncome = useCallback(
    (applyAsManual: boolean = false): BaseIncomeConfig => {
      if (applyAsManual) {
        return commitConfigAndCascade({
          mode: 'manual',
          useSplitInputs: false,
          manualTotalBRL: realizedIncome.consolidatedIncomeBRL,
          pfFixedIncomeBRL: realizedIncome.pfIncomeBRL,
          meiNetTransferBRL: realizedIncome.meiNetTransferBRL,
          updatedAt: new Date().toISOString(),
        });
      }

      return commitConfigAndCascade({
        mode: 'auto_consolidated',
        useSplitInputs: false,
        manualTotalBRL: realizedIncome.consolidatedIncomeBRL,
        pfFixedIncomeBRL: realizedIncome.pfIncomeBRL,
        meiNetTransferBRL: realizedIncome.meiNetTransferBRL,
        updatedAt: new Date().toISOString(),
      });
    },
    [commitConfigAndCascade, realizedIncome]
  );

  const resetBaseIncome = useCallback((): BaseIncomeConfig => {
    const defaults = createDefaultBaseIncomeConfig();
    setConfig(defaults);
    return defaults;
  }, []);

  return {
    config,
    realizedIncome,
    effectiveBaseIncome,
    cascadeJarLimits,
    allocationPreview,
    saveManualIncome,
    switchToAutoConsolidated,
    useRealizedMonthIncome,
    resetBaseIncome,
  };
}
