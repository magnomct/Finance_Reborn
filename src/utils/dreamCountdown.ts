import { DreamGoal, DreamPriority } from '../types';

export interface DreamCountdownResult {
  hasDeadline: boolean;
  targetDate?: string;
  formattedTargetDate: string;
  daysRemaining: number;
  monthsRemaining: number;
  isPastDeadline: boolean;
  isToday: boolean;
  countdownLabel: string;
  countdownSubtext: string;
  urgencyLevel: 'urgent' | 'warning' | 'normal' | 'overdue' | 'none';
  badgeColorClass: string;
}

export interface PriorityConfig {
  value: DreamPriority;
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
}

export const PRIORITY_CONFIGS: Record<DreamPriority, PriorityConfig> = {
  alta: {
    value: 'alta',
    label: 'Alta Prioridade',
    shortLabel: 'Alta',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    borderClass: 'border-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500'
  },
  media: {
    value: 'media',
    label: 'Média Prioridade',
    shortLabel: 'Média',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500'
  },
  baixa: {
    value: 'baixa',
    label: 'Baixa Prioridade',
    shortLabel: 'Baixa',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500'
  }
};

/**
 * Returns configuration styling and labels for a given dream priority.
 * Defaults to 'media' if undefined or invalid.
 */
export function getPriorityConfig(priority?: DreamPriority): PriorityConfig {
  if (priority && PRIORITY_CONFIGS[priority]) {
    return PRIORITY_CONFIGS[priority];
  }
  return PRIORITY_CONFIGS.media;
}

/**
 * UTC-safe calculation of calendar day difference between target date and reference date.
 */
export function getCalendarDaysRemaining(targetDateStr: string, referenceDateInput?: string | Date): number {
  if (!targetDateStr) return 0;
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  if (!tY || !tM) return 0;

  const targetUtc = Date.UTC(tY, tM - 1, tD || 1);

  let refUtc: number;
  if (typeof referenceDateInput === 'string') {
    const [rY, rM, rD] = referenceDateInput.split('-').map(Number);
    refUtc = Date.UTC(rY, rM - 1, rD || 1);
  } else if (referenceDateInput instanceof Date) {
    refUtc = Date.UTC(referenceDateInput.getFullYear(), referenceDateInput.getMonth(), referenceDateInput.getDate());
  } else {
    const now = new Date();
    refUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((targetUtc - refUtc) / MS_PER_DAY);
}

/**
 * Computes the full countdown status, countdown badge label, and urgency styling for a dream.
 */
export function calculateDreamCountdown(
  targetDateStr?: string,
  referenceDateInput?: string | Date
): DreamCountdownResult {
  if (!targetDateStr) {
    return {
      hasDeadline: false,
      formattedTargetDate: 'Sem prazo',
      daysRemaining: 0,
      monthsRemaining: 0,
      isPastDeadline: false,
      isToday: false,
      countdownLabel: 'Sem prazo estimado',
      countdownSubtext: 'Defina uma data limite',
      urgencyLevel: 'none',
      badgeColorClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };
  }

  const daysRemaining = getCalendarDaysRemaining(targetDateStr, referenceDateInput);
  const formattedTargetDate = targetDateStr.split('-').reverse().join('/');
  const isPastDeadline = daysRemaining < 0;
  const isToday = daysRemaining === 0;

  // Approximate remaining calendar months
  const monthsRemaining = isPastDeadline ? 0 : Math.max(1, Math.ceil(daysRemaining / 30.44));

  if (isPastDeadline) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      hasDeadline: true,
      targetDate: targetDateStr,
      formattedTargetDate,
      daysRemaining,
      monthsRemaining: 0,
      isPastDeadline: true,
      isToday: false,
      countdownLabel: `Expirado há ${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'}`,
      countdownSubtext: 'Prazo estimado ultrapassado',
      urgencyLevel: 'overdue',
      badgeColorClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
    };
  }

  if (isToday) {
    return {
      hasDeadline: true,
      targetDate: targetDateStr,
      formattedTargetDate,
      daysRemaining: 0,
      monthsRemaining: 0,
      isPastDeadline: false,
      isToday: true,
      countdownLabel: 'Termina Hoje!',
      countdownSubtext: 'Último dia para a meta',
      urgencyLevel: 'urgent',
      badgeColorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
    };
  }

  if (daysRemaining <= 30) {
    return {
      hasDeadline: true,
      targetDate: targetDateStr,
      formattedTargetDate,
      daysRemaining,
      monthsRemaining,
      isPastDeadline: false,
      isToday: false,
      countdownLabel: `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`,
      countdownSubtext: 'Prazo final próximo (< 1 mês)',
      urgencyLevel: 'urgent',
      badgeColorClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    };
  }

  if (daysRemaining <= 90) {
    return {
      hasDeadline: true,
      targetDate: targetDateStr,
      formattedTargetDate,
      daysRemaining,
      monthsRemaining,
      isPastDeadline: false,
      isToday: false,
      countdownLabel: `${daysRemaining} dias restantes`,
      countdownSubtext: `~${monthsRemaining} meses estimados`,
      urgencyLevel: 'warning',
      badgeColorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }

  return {
    hasDeadline: true,
    targetDate: targetDateStr,
    formattedTargetDate,
    daysRemaining,
    monthsRemaining,
    isPastDeadline: false,
    isToday: false,
    countdownLabel: `${daysRemaining} dias restantes`,
    countdownSubtext: `~${monthsRemaining} meses estimados`,
    urgencyLevel: 'normal',
    badgeColorClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  };
}

/**
 * Immutably updates the priority of a dream in the dream list.
 */
export function updateDreamPriority(dreams: DreamGoal[], dreamId: string, priority: DreamPriority): DreamGoal[] {
  return dreams.map(d => d.id === dreamId ? { ...d, priority } : d);
}

/**
 * Immutably updates the estimated deadline of a dream in the dream list.
 */
export function updateDreamTargetDate(dreams: DreamGoal[], dreamId: string, targetDate?: string): DreamGoal[] {
  return dreams.map(d => d.id === dreamId ? { ...d, targetDate: targetDate || undefined } : d);
}
