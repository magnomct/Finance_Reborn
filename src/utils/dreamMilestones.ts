import { DreamGoal, DreamMilestoneLevel, Transaction } from '../types';

export const DREAM_MILESTONE_THRESHOLDS: DreamMilestoneLevel[] = [50, 75, 100];

const DISMISSED_MILESTONES_KEY = 'yupee_dream_milestone_dismissed_v1';

export interface DreamMilestoneTierConfig {
  level: DreamMilestoneLevel;
  title: string;
  shortLabel: string;
  description: (dreamTitle: string, depositedFormatted: string, targetFormatted: string, pct: number) => string;
  theme: 'info' | 'warning' | 'success';
}

export interface DreamMonthlyMilestoneStatus {
  dreamId: string;
  dreamTitle: string;
  category: string;
  monthKey: string;
  monthlyTarget: number;
  monthlyDeposited: number;
  progressPct: number;
  clampedProgressPct: number;
  remainingForMonth: number;
  achievedMilestones: DreamMilestoneLevel[];
  highestMilestone: DreamMilestoneLevel | null;
  nextMilestone: DreamMilestoneLevel | null;
  dismissKey: string | null;
  tierConfig: DreamMilestoneTierConfig | null;
}

/**
 * Normalizes text for case-insensitive, accent-insensitive comparison.
 */
function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Returns the YYYY-MM month key for a date string or today.
 */
export function getCurrentMonthKey(date?: Date): string {
  const ref = date || new Date();
  const year = ref.getFullYear();
  const month = String(ref.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Extracts YYYY-MM from a transaction date string.
 */
export function getTransactionMonthKey(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const match = dateStr.trim().match(/^(\d{4}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Determines whether a transaction represents a savings contribution for a given dream.
 */
export function doesTransactionMatchDream(tx: Transaction, dream: DreamGoal): boolean {
  if (!tx || !dream) return false;
  if (tx.dreamId && tx.dreamId === dream.id) return true;

  // Check savings/aporte transactions referencing the dream title
  if (tx.type !== 'despesa' && tx.amount >= 0) return false;

  const desc = normalizeText(tx.description);
  const cat = normalizeText(tx.category || '');
  const title = normalizeText(dream.title);

  if (!title) return false;

  const isSavingsRelated =
    cat.includes('sonhos') ||
    cat.includes('poupanca') ||
    desc.includes('aporte') ||
    tx.jar === 'PLP_10' ||
    tx.jar === 'LIF_10' ||
    tx.jar === 'FER_5';

  if (!isSavingsRelated) return false;

  return desc.includes(title);
}

/**
 * Sums total monthly deposits contributed toward a dream in the specified month (YYYY-MM).
 */
export function calculateDreamMonthlyDeposits(
  dream: DreamGoal,
  transactions: Transaction[],
  monthKey: string
): number {
  if (!dream || !Array.isArray(transactions) || !monthKey) return 0;

  return transactions.reduce((sum, tx) => {
    if (getTransactionMonthKey(tx.date) !== monthKey) return sum;
    if (!doesTransactionMatchDream(tx, dream)) return sum;
    return sum + Math.abs(tx.amount || 0);
  }, 0);
}

/**
 * Returns all milestone checkpoints achieved (subset of [50, 75, 100]).
 */
export function getAchievedMilestones(progressPct: number): DreamMilestoneLevel[] {
  if (!Number.isFinite(progressPct) || progressPct < 50) return [];
  return DREAM_MILESTONE_THRESHOLDS.filter(threshold => progressPct >= threshold);
}

/**
 * Returns the highest milestone reached (100, 75, 50, or null).
 */
export function getHighestMilestone(progressPct: number): DreamMilestoneLevel | null {
  const achieved = getAchievedMilestones(progressPct);
  if (achieved.length === 0) return null;
  return achieved[achieved.length - 1];
}

/**
 * Returns the next milestone to reach (50, 75, 100, or null if 100% is already reached).
 */
export function getNextMilestone(progressPct: number): DreamMilestoneLevel | null {
  if (!Number.isFinite(progressPct) || progressPct < 50) return 50;
  if (progressPct < 75) return 75;
  if (progressPct < 100) return 100;
  return null;
}

/**
 * Builds presentation metadata for a milestone tier (50%, 75%, 100%).
 */
export function getMilestoneTierConfig(level: DreamMilestoneLevel): DreamMilestoneTierConfig {
  switch (level) {
    case 100:
      return {
        level: 100,
        title: '100% da Meta Mensal Atingida!',
        shortLabel: '100% Concluído',
        theme: 'success',
        description: (dreamTitle, depositedFormatted, targetFormatted) =>
          `Parabéns! Você atingiu 100% da meta de poupança mensal para "${dreamTitle}" (${depositedFormatted} de ${targetFormatted}).`
      };
    case 75:
      return {
        level: 75,
        title: '75% da Meta Mensal Atingida!',
        shortLabel: '75% • Reta Final',
        theme: 'warning',
        description: (dreamTitle, depositedFormatted, targetFormatted, pct) =>
          `Quase lá! Você já acumulou ${pct.toFixed(0)}% (${depositedFormatted} de ${targetFormatted}) da meta mensal de "${dreamTitle}".`
      };
    case 50:
    default:
      return {
        level: 50,
        title: '50% da Meta Mensal Atingida!',
        shortLabel: '50% • Metade da Meta',
        theme: 'info',
        description: (dreamTitle, depositedFormatted, targetFormatted, pct) =>
          `Ótimo ritmo! Você atingiu ${pct.toFixed(0)}% (${depositedFormatted} de ${targetFormatted}) da meta de poupança mensal para "${dreamTitle}".`
      };
  }
}

/**
 * Evaluates monthly savings progress and 50%/75%/100% milestone states for all dreams.
 */
export function evaluateDreamMonthlyMilestones(
  dreams: DreamGoal[],
  transactions: Transaction[],
  monthKey: string = getCurrentMonthKey()
): DreamMonthlyMilestoneStatus[] {
  if (!Array.isArray(dreams)) return [];

  return dreams.map(dream => {
    const monthlyTarget = Math.max(0, dream.monthlyDeposit || 0);
    const monthlyDeposited = calculateDreamMonthlyDeposits(dream, transactions, monthKey);

    const progressPct = monthlyTarget > 0
      ? Math.round(((monthlyDeposited / monthlyTarget) * 100) * 10) / 10
      : 0;
    const clampedProgressPct = Math.min(100, Math.max(0, progressPct));
    const remainingForMonth = Math.max(0, Math.round((monthlyTarget - monthlyDeposited) * 100) / 100);

    const achievedMilestones = monthlyTarget > 0 ? getAchievedMilestones(progressPct) : [];
    const highestMilestone = monthlyTarget > 0 ? getHighestMilestone(progressPct) : null;
    const nextMilestone = monthlyTarget > 0 ? getNextMilestone(progressPct) : null;

    const dismissKey = highestMilestone !== null
      ? `${dream.id}:${monthKey}:${highestMilestone}`
      : null;

    const tierConfig = highestMilestone !== null
      ? getMilestoneTierConfig(highestMilestone)
      : null;

    return {
      dreamId: dream.id,
      dreamTitle: dream.title,
      category: dream.category || 'Outros',
      monthKey,
      monthlyTarget,
      monthlyDeposited,
      progressPct,
      clampedProgressPct,
      remainingForMonth,
      achievedMilestones,
      highestMilestone,
      nextMilestone,
      dismissKey,
      tierConfig
    };
  });
}

/**
 * Filters evaluated statuses to those with an active milestone (>= 50%) that hasn't been dismissed,
 * sorted with highest milestone (100 -> 75 -> 50) and highest progress first.
 */
export function getActiveDreamMilestoneAlerts(
  statuses: DreamMonthlyMilestoneStatus[],
  dismissedKeys: string[] = []
): DreamMonthlyMilestoneStatus[] {
  const dismissedSet = new Set(dismissedKeys);

  return (statuses || [])
    .filter(s => s.highestMilestone !== null && s.dismissKey !== null && !dismissedSet.has(s.dismissKey))
    .sort((a, b) => {
      const levelDiff = (b.highestMilestone || 0) - (a.highestMilestone || 0);
      if (levelDiff !== 0) return levelDiff;
      return b.progressPct - a.progressPct;
    });
}

/**
 * Detects newly unlocked milestones compared to a set of already-notified keys.
 */
export function detectNewlyUnlockedMilestones(
  statuses: DreamMonthlyMilestoneStatus[],
  notifiedKeys: Set<string>
): DreamMonthlyMilestoneStatus[] {
  return (statuses || []).filter(
    s => s.highestMilestone !== null && s.dismissKey !== null && !notifiedKeys.has(s.dismissKey)
  );
}

/**
 * Loads dismissed milestone alert keys from localStorage.
 */
export function loadDismissedDreamMilestones(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_MILESTONES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Erro ao carregar marcos dispensados de sonhos:', err);
  }
  return [];
}

/**
 * Saves dismissed milestone alert keys to localStorage.
 */
export function saveDismissedDreamMilestones(keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_MILESTONES_KEY, JSON.stringify(keys));
  } catch (err) {
    console.warn('Erro ao salvar marcos dispensados de sonhos:', err);
  }
}
