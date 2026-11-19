import { JarType, Transaction } from '../types';
import { JAR_DEFINITIONS } from '../data/initialData';
import { safeGetStorage, safeSetStorage } from './storage';
import {
  DEFAULT_SIX_JAR_PERCENTAGES,
  SIX_JAR_KEYS,
  extractMonthKey,
  resolveActiveSixJarsMonth,
} from './sixJarsMetrics';

export const BASE_INCOME_STORAGE_KEY = '@finance_app:base_income_v1';
export const JAR_PERCENTAGES_STORAGE_KEY = '@finance_app:jar_percentages_v1';
export const BASE_INCOME_SYNC_EVENT = 'yupee:base-income-updated';
export const DEFAULT_BASE_MONTHLY_INCOME = 3652.31;

type CoreJarId = Exclude<JarType, 'PJ_EXCLUIDO'>;
const CORE_SIX_JAR_KEYS = SIX_JAR_KEYS as CoreJarId[];

export type BaseIncomeMode = 'manual' | 'auto_consolidated';

export interface BaseIncomeConfig {
  mode: BaseIncomeMode;
  manualTotalBRL: number;
  pfFixedIncomeBRL: number;
  meiNetTransferBRL: number;
  useSplitInputs: boolean;
  updatedAt: string;
}

export interface RealizedIncomeBreakdown {
  monthKey: string;
  pfIncomeBRL: number;
  pjGrossRevenueBRL: number;
  pjExpensesBRL: number;
  meiNetTransferBRL: number;
  consolidatedIncomeBRL: number;
}

export interface JarAllocationPreviewItem {
  id: Exclude<JarType, 'PJ_EXCLUIDO'>;
  name: string;
  shortName: string;
  pct: number;
  amountBRL: number;
  colorHex: string;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function createDefaultBaseIncomeConfig(): BaseIncomeConfig {
  return {
    mode: 'auto_consolidated',
    manualTotalBRL: 0,
    pfFixedIncomeBRL: 0,
    meiNetTransferBRL: 0,
    useSplitInputs: false,
    updatedAt: '',
  };
}

export function sanitizeBaseIncomeConfig(raw: unknown): BaseIncomeConfig {
  const defaults = createDefaultBaseIncomeConfig();
  if (!raw || typeof raw !== 'object') return defaults;

  const obj = raw as Partial<BaseIncomeConfig>;
  const mode: BaseIncomeMode =
    obj.mode === 'manual' || obj.mode === 'auto_consolidated'
      ? obj.mode
      : defaults.mode;

  const toSafeMoney = (val: unknown): number => {
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) && n >= 0 ? round2(n) : 0;
  };

  return {
    mode,
    manualTotalBRL: toSafeMoney(obj.manualTotalBRL),
    pfFixedIncomeBRL: toSafeMoney(obj.pfFixedIncomeBRL),
    meiNetTransferBRL: toSafeMoney(obj.meiNetTransferBRL),
    useSplitInputs: Boolean(obj.useSplitInputs),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
  };
}

export function loadBaseIncomeConfig(): BaseIncomeConfig {
  const raw = safeGetStorage<unknown>(
    BASE_INCOME_STORAGE_KEY,
    null,
    val => Boolean(val && typeof val === 'object' && !Array.isArray(val))
  );
  if (!raw) return createDefaultBaseIncomeConfig();
  return sanitizeBaseIncomeConfig(raw);
}

export function saveBaseIncomeConfig(config: BaseIncomeConfig): BaseIncomeConfig {
  const clean = sanitizeBaseIncomeConfig({
    ...config,
    updatedAt: config.updatedAt || new Date().toISOString(),
  });
  safeSetStorage(BASE_INCOME_STORAGE_KEY, clean);

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(BASE_INCOME_SYNC_EVENT, { detail: clean }));
    } catch {
      // Ignore event dispatch issues in restricted environments
    }
  }
  return clean;
}

export function loadJarPercentages(): Record<CoreJarId, number> {
  const parsed = safeGetStorage<Partial<Record<CoreJarId, number>> | null>(
    JAR_PERCENTAGES_STORAGE_KEY,
    null,
    val => Boolean(val && typeof val === 'object' && !Array.isArray(val))
  );
  if (!parsed) return { ...DEFAULT_SIX_JAR_PERCENTAGES };

  const result: Record<CoreJarId, number> = { ...DEFAULT_SIX_JAR_PERCENTAGES };
  CORE_SIX_JAR_KEYS.forEach(k => {
    const val = parsed[k];
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 100) {
      result[k] = val;
    }
  });
  return result;
}

export function saveJarPercentages(
  percentages: Partial<Record<JarType, number>>
): Record<CoreJarId, number> {
  const result: Record<CoreJarId, number> = { ...DEFAULT_SIX_JAR_PERCENTAGES };
  CORE_SIX_JAR_KEYS.forEach(k => {
    const val = percentages[k];
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 100) {
      result[k] = val;
    }
  });
  safeSetStorage(JAR_PERCENTAGES_STORAGE_KEY, result);
  return result;
}

/**
 * Parses a BRL currency input string (supporting pt-BR "6.500,50", "6500,50", or "6500.50")
 * into a non-negative finite number.
 */
export function parseBRLInput(raw: string): number {
  if (!raw || typeof raw !== 'string') return 0;
  let cleaned = raw.replace(/[R$\s]/g, '').trim();
  if (!cleaned) return 0;

  // If both dot and comma exist, determine decimal separator by rightmost symbol
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // pt-BR style: dots are thousand separators, comma is decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    // US style: commas are thousand separators, dot is decimal
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Only comma present: treat comma as decimal separator
    cleaned = cleaned.replace(',', '.');
  } else if (lastDot !== -1) {
    // Only dot(s) present: if multiple dots or exactly 3 digits after single dot (like 6.500), treat as thousands if integer-like?
    // Wait: user typing "6500.50" has 2 digits after dot, while "6.500" has 3. Handle multiple dots as thousand separators.
    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
      cleaned = dotParts.join('');
    }
  }

  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? round2(num) : 0;
}

/**
 * Computes realized consolidated monthly income from transactions in the active month:
 * PF income entries + positive MEI net profit / transfers (when usePjProfitInPf is true).
 */
export function calculateRealizedConsolidatedIncome(
  transactions: Transaction[],
  usePjProfitInPf: boolean = true,
  referenceMonthKey?: string
): RealizedIncomeBreakdown {
  const monthKey = resolveActiveSixJarsMonth(transactions, referenceMonthKey);
  const monthTxs =
    monthKey === 'ALL'
      ? transactions
      : transactions.filter(t => extractMonthKey(t.date) === monthKey);

  const pfIncomeBRL = round2(
    monthTxs
      .filter(t => t.type === 'receita' && t.costCenter !== 'PJ')
      .reduce((acc, t) => acc + Math.max(0, t.amount), 0)
  );

  const pjGrossRevenueBRL = round2(
    monthTxs
      .filter(t => t.type === 'receita' && t.costCenter === 'PJ')
      .reduce((acc, t) => acc + Math.max(0, t.amount), 0)
  );

  const pjExpensesBRL = round2(
    monthTxs
      .filter(t => t.type === 'despesa' && t.costCenter === 'PJ')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0)
  );

  const meiNetTransferBRL = round2(Math.max(0, pjGrossRevenueBRL - pjExpensesBRL));
  const consolidatedIncomeBRL = round2(
    pfIncomeBRL + (usePjProfitInPf ? meiNetTransferBRL : 0)
  );

  return {
    monthKey,
    pfIncomeBRL,
    pjGrossRevenueBRL,
    pjExpensesBRL,
    meiNetTransferBRL,
    consolidatedIncomeBRL,
  };
}

/**
 * Resolves the manual income total from a BaseIncomeConfig (direct or PF + MEI split).
 */
export function getConfiguredManualIncome(config: BaseIncomeConfig): number {
  if (config.useSplitInputs) {
    return round2(Math.max(0, config.pfFixedIncomeBRL) + Math.max(0, config.meiNetTransferBRL));
  }
  return round2(Math.max(0, config.manualTotalBRL));
}

/**
 * Resolves the active effective monthly net income base across the entire app.
 */
export function resolveEffectiveBaseIncome(
  config: BaseIncomeConfig,
  realizedConsolidatedBRL: number
): number {
  if (config.mode === 'manual') {
    return getConfiguredManualIncome(config);
  }
  return round2(Math.max(0, realizedConsolidatedBRL));
}

/**
 * Instant 6 Jars Cascade Calculation:
 * Recalculates exact BRL limits for all 6 Jars whenever baseMonthlyIncome or custom percentages change.
 */
export function calculateSixJarsCascadeLimits(
  baseMonthlyIncome: number,
  customPercentages?: Partial<Record<JarType, number>>,
  existingPjExcludedLimit: number = 600
): Record<JarType, number> {
  const safeBase = Number.isFinite(baseMonthlyIncome) && baseMonthlyIncome > 0 ? baseMonthlyIncome : 0;

  const getPct = (jarId: Exclude<JarType, 'PJ_EXCLUIDO'>): number => {
    const custom = customPercentages?.[jarId];
    if (typeof custom === 'number' && Number.isFinite(custom) && custom >= 0) {
      return custom;
    }
    return DEFAULT_SIX_JAR_PERCENTAGES[jarId];
  };

  return {
    NEC_55: round2(safeBase * (getPct('NEC_55') / 100)),
    LIF_10: round2(safeBase * (getPct('LIF_10') / 100)),
    PLP_10: round2(safeBase * (getPct('PLP_10') / 100)),
    EDU_10: round2(safeBase * (getPct('EDU_10') / 100)),
    DIV_10: round2(safeBase * (getPct('DIV_10') / 100)),
    FER_5: round2(safeBase * (getPct('FER_5') / 100)),
    PJ_EXCLUIDO: round2(Math.max(0, existingPjExcludedLimit)),
  };
}

/**
 * Builds ordered preview pills for the 6 Jars allocation bar inside BaseIncomeConfigCard.
 */
export function buildSixJarsAllocationPreview(
  baseMonthlyIncome: number,
  customPercentages?: Partial<Record<JarType, number>>
): JarAllocationPreviewItem[] {
  const limits = calculateSixJarsCascadeLimits(baseMonthlyIncome, customPercentages);

  return CORE_SIX_JAR_KEYS.map(jarId => {
    const def = JAR_DEFINITIONS[jarId];
    const customPct = customPercentages?.[jarId];
    const pct =
      typeof customPct === 'number' && Number.isFinite(customPct)
        ? customPct
        : DEFAULT_SIX_JAR_PERCENTAGES[jarId];

    return {
      id: jarId,
      name: def.name,
      shortName: def.shortName,
      pct,
      amountBRL: limits[jarId],
      colorHex: def.colorHex,
    };
  });
}
