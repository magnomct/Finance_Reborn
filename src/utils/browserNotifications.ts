import { Transaction } from '../types';
import { getCalendarDaysDiff, formatDateToYMD } from './reminders';
import { formatBRL } from './finance';

export type BrowserNotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NativeNotificationPayload {
  title: string;
  body: string;
  tag: string;
  data: {
    transactionId: string;
    dueDate: string;
    daysRemaining: number;
    amount: number;
  };
}

/**
 * Checks if a transaction is a scheduled expense that is within 2 days of due date (0, 1 or 2 days).
 */
export function isExpenseWithin2DaysOfDue(
  tx: Transaction,
  referenceDateStr?: string
): boolean {
  if (tx.status !== 'agendado') return false;
  if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return false;

  const ref = referenceDateStr || formatDateToYMD();
  const diffDays = getCalendarDaysDiff(tx.date, ref);

  // Eligible when due in 0, 1, or 2 days
  return diffDays >= 0 && diffDays <= 2;
}

/**
 * Checks if a transaction is exactly 2 days before due date.
 */
export function isExpenseExactly2DaysBeforeDue(
  tx: Transaction,
  referenceDateStr?: string
): boolean {
  if (tx.status !== 'agendado') return false;
  if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) return false;

  const ref = referenceDateStr || formatDateToYMD();
  const diffDays = getCalendarDaysDiff(tx.date, ref);

  return diffDays === 2;
}

/**
 * Builds the notification title and body text for native OS notification.
 */
export function buildNativeNotificationPayload(
  tx: Transaction,
  referenceDateStr?: string
): NativeNotificationPayload {
  const ref = referenceDateStr || formatDateToYMD();
  const diffDays = getCalendarDaysDiff(tx.date, ref);

  const formattedAmount = formatBRL(Math.abs(tx.amount));
  
  let timePhrase = '';
  if (diffDays === 0) {
    timePhrase = 'Vence hoje!';
  } else if (diffDays === 1) {
    timePhrase = 'Vence amanhã (1 dia)!';
  } else if (diffDays === 2) {
    timePhrase = 'Vence em 2 dias!';
  } else {
    timePhrase = `Vence em ${diffDays} dias!`;
  }

  const title = `🔔 Vencimento Próximo: ${tx.description}`;
  const body = `Sua conta no valor de ${formattedAmount} (${timePhrase}) tem vencimento programado para ${tx.date} na conta ${tx.account}.`;
  const tag = `yupee-due-alert-${tx.id}-${tx.date}`;

  return {
    title,
    body,
    tag,
    data: {
      transactionId: tx.id,
      dueDate: tx.date,
      daysRemaining: diffDays,
      amount: tx.amount
    }
  };
}

/**
 * Returns transactions eligible for native notification that have not been dispatched yet.
 */
export function filterPendingNativeNotifications(
  transactions: Transaction[],
  dispatchedTags: Set<string> | string[],
  referenceDateStr?: string
): { transaction: Transaction; payload: NativeNotificationPayload }[] {
  const tagSet = dispatchedTags instanceof Set ? dispatchedTags : new Set(dispatchedTags);
  const results: { transaction: Transaction; payload: NativeNotificationPayload }[] = [];

  for (const tx of transactions) {
    if (isExpenseWithin2DaysOfDue(tx, referenceDateStr)) {
      const payload = buildNativeNotificationPayload(tx, referenceDateStr);
      if (!tagSet.has(payload.tag)) {
        results.push({ transaction: tx, payload });
      }
    }
  }

  return results;
}

/**
 * Helper to inspect the current browser notification permission in client environment.
 */
export function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationPermissionState;
}

/**
 * Requests permission from user to show native browser notifications.
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission as BrowserNotificationPermissionState;
  }
}

/**
 * Dispatches a native browser notification safely if permission is granted.
 */
export function dispatchNativeBrowserNotification(
  payload: NativeNotificationPayload
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/vite.svg', // standard icon from app
      requireInteraction: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('Native notification dispatch was prevented or failed:', err);
    return null;
  }
}
