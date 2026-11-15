import {
  SavingsAdvisorPlan,
  SixJarsSavingsSnapshot,
  buildDeterministicSavingsPlan,
  extractSixJarsSavingsSnapshot,
  sanitizeSavingsAdvisorPlan,
} from '../utils/savingsAdvisor';

export type {
  OffendingSubcategorySummary,
  OffendingTransactionSummary,
  SavingsAdvisorActionStep,
  SavingsAdvisorPlan,
  SixJarsSavingsSnapshot,
  SnapshotJarSummary,
} from '../utils/savingsAdvisor';

export { extractSixJarsSavingsSnapshot, buildDeterministicSavingsPlan };

export type SavingsAnalysisSource = 'gemini' | 'heuristic';

export interface CachedSavingsAnalysis {
  cacheKey: string;
  monthKey: string;
  txCount: number;
  plan: SavingsAdvisorPlan;
  source: SavingsAnalysisSource;
  modelUsed: string;
  updatedAt: string; // ISO timestamp
}

export interface AppliedSavingsStepsState {
  completedStepIds: string[];
  isMainTipApplied: boolean;
  updatedAt: string;
}

const CACHE_KEY_PREFIX = '@finance_app:ai_jars_tip_';
const APPLIED_KEY_PREFIX = '@finance_app:ai_jars_applied_';

const inFlightRequests = new Map<string, Promise<CachedSavingsAnalysis>>();

export function getSavingsAdvisorCacheKey(monthKey: string, txCount: number): string {
  return `${CACHE_KEY_PREFIX}${monthKey}_${txCount}`;
}

export function getAppliedStepsStorageKey(monthKey: string): string {
  return `${APPLIED_KEY_PREFIX}${monthKey}`;
}

export function getCachedSavingsAnalysis(
  monthKey: string,
  txCount: number
): CachedSavingsAnalysis | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const key = getSavingsAdvisorCacheKey(monthKey, txCount);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSavingsAnalysis;
    if (!parsed || !parsed.plan || !Array.isArray(parsed.plan.actionableSteps)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedSavingsAnalysis(entry: CachedSavingsAnalysis): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(entry.cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadAppliedStepsState(monthKey: string): AppliedSavingsStepsState {
  const empty: AppliedSavingsStepsState = {
    completedStepIds: [],
    isMainTipApplied: false,
    updatedAt: '',
  };
  if (typeof window === 'undefined' || !window.localStorage) return empty;
  try {
    const raw = window.localStorage.getItem(getAppliedStepsStorageKey(monthKey));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AppliedSavingsStepsState>;
    return {
      completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
      isMainTipApplied: Boolean(parsed.isMainTipApplied),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return empty;
  }
}

export function saveAppliedStepsState(
  monthKey: string,
  state: AppliedSavingsStepsState
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getAppliedStepsStorageKey(monthKey), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export interface FetchSmartSavingsOptions {
  forceRefresh?: boolean;
}

/**
 * Fetches personalized savings plan from the server-side Gemini endpoint
 * with localStorage anti-spam caching and deterministic heuristic fallback.
 */
export async function fetchSmartSavingsAnalysis(
  snapshot: SixJarsSavingsSnapshot,
  options: FetchSmartSavingsOptions = {}
): Promise<CachedSavingsAnalysis> {
  const { forceRefresh = false } = options;
  const cacheKey = getSavingsAdvisorCacheKey(snapshot.monthKey, snapshot.txCount);

  if (!forceRefresh) {
    const cached = getCachedSavingsAnalysis(snapshot.monthKey, snapshot.txCount);
    if (cached) {
      return cached;
    }

    const existingPromise = inFlightRequests.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }
  }

  const requestPromise = (async (): Promise<CachedSavingsAnalysis> => {
    try {
      const response = await fetch('/api/consultor-economia-potes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshot }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const plan = sanitizeSavingsAdvisorPlan(data?.plan, snapshot);
      const result: CachedSavingsAnalysis = {
        cacheKey,
        monthKey: snapshot.monthKey,
        txCount: snapshot.txCount,
        plan,
        source: data?.source === 'gemini' ? 'gemini' : 'heuristic',
        modelUsed: typeof data?.modelUsed === 'string' ? data.modelUsed : 'gemini-2.5-flash',
        updatedAt: typeof data?.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
      };

      saveCachedSavingsAnalysis(result);
      return result;
    } catch {
      const fallbackPlan = buildDeterministicSavingsPlan(snapshot);
      const fallbackResult: CachedSavingsAnalysis = {
        cacheKey,
        monthKey: snapshot.monthKey,
        txCount: snapshot.txCount,
        plan: fallbackPlan,
        source: 'heuristic',
        modelUsed: 'local-heuristic',
        updatedAt: new Date().toISOString(),
      };
      saveCachedSavingsAnalysis(fallbackResult);
      return fallbackResult;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!forceRefresh) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}
