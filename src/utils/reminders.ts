import { Transaction } from '../types';

export interface ReminderStatus {
  isDueSoon: boolean;
  isOverdue: boolean;
  daysRemaining: number; // e.g. -2 for 2 days ago, 0 for today, 3 for in 3 days
  reminderActive: boolean;
  message: string;
  urgency: 'overdue' | 'today' | 'upcoming' | 'none';
}

export interface ActiveReminderItem {
  transaction: Transaction;
  status: ReminderStatus;
}

/**
 * Calculates calendar day difference between target date and reference date (UTC-safe).
 */
export function getCalendarDaysDiff(targetDateStr: string, referenceDateStr: string): number {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const [rY, rM, rD] = referenceDateStr.split('-').map(Number);

  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const refUtc = Date.UTC(rY, rM - 1, rD);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((targetUtc - refUtc) / MS_PER_DAY);
}

/**
 * Formats a Date object as YYYY-MM-DD
 */
export function formatDateToYMD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes reminder status for a transaction against a reference date.
 */
export function calculateReminderStatus(
  tx: Transaction,
  referenceDateStr?: string
): ReminderStatus {
  const ref = referenceDateStr || formatDateToYMD();
  
  if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
    return {
      isDueSoon: false,
      isOverdue: false,
      daysRemaining: 0,
      reminderActive: false,
      message: '',
      urgency: 'none'
    };
  }

  const daysRemaining = getCalendarDaysDiff(tx.date, ref);

  // If already liquidated/paid, reminders are not active
  if (tx.status !== 'agendado') {
    return {
      isDueSoon: false,
      isOverdue: false,
      daysRemaining,
      reminderActive: false,
      message: 'Liquidado',
      urgency: 'none'
    };
  }

  // If no reminder days configured
  if (tx.reminderDaysBefore === undefined || tx.reminderDaysBefore === null) {
    return {
      isDueSoon: false,
      isOverdue: daysRemaining < 0,
      daysRemaining,
      reminderActive: false,
      message: daysRemaining < 0 
        ? (daysRemaining === -1 ? 'Vencido ontem' : `Vencido há ${Math.abs(daysRemaining)} dias`)
        : daysRemaining === 0 
          ? 'Vence hoje' 
          : `Vence em ${daysRemaining} dias`,
      urgency: 'none'
    };
  }

  const threshold = Math.max(0, tx.reminderDaysBefore);

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      isDueSoon: false,
      isOverdue: true,
      daysRemaining,
      reminderActive: true,
      message: overdueDays === 1 ? 'Vencido ontem' : `Vencido há ${overdueDays} dias`,
      urgency: 'overdue'
    };
  }

  if (daysRemaining === 0) {
    return {
      isDueSoon: true,
      isOverdue: false,
      daysRemaining,
      reminderActive: true,
      message: 'Vence hoje!',
      urgency: 'today'
    };
  }

  if (daysRemaining <= threshold) {
    return {
      isDueSoon: true,
      isOverdue: false,
      daysRemaining,
      reminderActive: true,
      message: daysRemaining === 1 ? 'Vence amanhã' : `Vence em ${daysRemaining} dias`,
      urgency: 'upcoming'
    };
  }

  // Not within notification threshold yet
  return {
    isDueSoon: false,
    isOverdue: false,
    daysRemaining,
    reminderActive: false,
    message: `Vence em ${daysRemaining} dias`,
    urgency: 'none'
  };
}

/**
 * Returns active reminders sorted by urgency:
 * 1. Overdue (most overdue first)
 * 2. Today
 * 3. Upcoming (closest first)
 */
export function getActiveReminders(
  transactions: Transaction[],
  referenceDateStr?: string
): ActiveReminderItem[] {
  const activeItems: ActiveReminderItem[] = [];

  for (const tx of transactions) {
    const status = calculateReminderStatus(tx, referenceDateStr);
    if (status.reminderActive) {
      activeItems.push({ transaction: tx, status });
    }
  }

  return activeItems.sort((a, b) => {
    // 1. Overdue first
    if (a.status.urgency === 'overdue' && b.status.urgency !== 'overdue') return -1;
    if (b.status.urgency === 'overdue' && a.status.urgency !== 'overdue') return 1;

    // 2. Today next
    if (a.status.urgency === 'today' && b.status.urgency !== 'today') return -1;
    if (b.status.urgency === 'today' && a.status.urgency !== 'today') return 1;

    // Both overdue: most overdue first (smallest daysRemaining, e.g. -5 before -1)
    if (a.status.urgency === 'overdue' && b.status.urgency === 'overdue') {
      return a.status.daysRemaining - b.status.daysRemaining;
    }

    // Both upcoming: closest first (smallest positive daysRemaining)
    return a.status.daysRemaining - b.status.daysRemaining;
  });
}

/**
 * Helper to get human label for presets
 */
export function getReminderPresetLabel(days?: number | null): string {
  if (days === undefined || days === null) return 'Sem lembrete';
  if (days === 0) return 'No dia (0d)';
  if (days === 1) return '1 dia antes';
  if (days === 2) return '2 dias antes';
  if (days === 3) return '3 dias antes';
  if (days === 5) return '5 dias antes';
  if (days === 7) return '7 dias antes';
  return `${days} dias antes`;
}
