import { DreamGoal, MonthlyChecklistProgress } from '../types';

const STORAGE_PREFIX = 'yupee_dream_checklist_';

/**
 * Calculates monthly savings checklist progress metrics
 */
export function computeMonthlyChecklistProgress(
  dreams: DreamGoal[],
  completedDreamIds: string[]
): MonthlyChecklistProgress {
  const completedSet = new Set(completedDreamIds);

  let totalPlanned = 0;
  let totalCompleted = 0;
  let completedCount = 0;

  dreams.forEach(dream => {
    const planned = dream.monthlyDeposit > 0 ? dream.monthlyDeposit : 0;
    totalPlanned += planned;

    if (completedSet.has(dream.id)) {
      totalCompleted += planned;
      completedCount++;
    }
  });

  const totalCount = dreams.length;
  const completionPercent = totalPlanned > 0
    ? Math.round((totalCompleted / totalPlanned) * 100)
    : (totalCount > 0 && completedCount === totalCount ? 100 : 0);

  return {
    totalPlanned,
    totalCompleted,
    completedCount,
    totalCount,
    completionPercent,
  };
}

/**
 * Toggles a dream's completion state for a month
 */
export function toggleDreamDeposit(
  completedIds: string[],
  dreamId: string
): string[] {
  if (completedIds.includes(dreamId)) {
    return completedIds.filter(id => id !== dreamId);
  }
  return [...completedIds, dreamId];
}

/**
 * Returns all dream IDs for bulk marking as complete
 */
export function markAllDreamDeposits(dreams: DreamGoal[]): string[] {
  return dreams.map(d => d.id);
}

/**
 * Loads completed dream IDs for a specific month from localStorage
 */
export function loadMonthlyChecklist(monthKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${monthKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Erro ao carregar checklist de sonhos:', err);
  }
  return [];
}

/**
 * Saves completed dream IDs for a specific month to localStorage
 */
export function saveMonthlyChecklist(monthKey: string, completedIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${monthKey}`, JSON.stringify(completedIds));
  } catch (err) {
    console.warn('Erro ao salvar checklist de sonhos:', err);
  }
}
