import { Transaction } from '../types';

export interface OfflineQueueItem {
  id: string;
  transactionId: string;
  action: 'create' | 'update' | 'delete';
  transaction: Transaction;
  timestamp: number;
  synced: boolean;
}

export const OFFLINE_QUEUE_STORAGE_KEY = 'yupee_offline_sync_queue_v1';

export function parseOfflineQueue(raw: string | null): OfflineQueueItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeOfflineQueue(queue: OfflineQueueItem[]): string {
  return JSON.stringify(queue);
}

export function createQueueItem(
  transaction: Transaction,
  action: 'create' | 'update' | 'delete' = 'create',
  now: number = Date.now()
): OfflineQueueItem {
  return {
    id: `sync-${now}-${Math.random().toString(36).substring(2, 7)}`,
    transactionId: transaction.id,
    action,
    transaction,
    timestamp: now,
    synced: false,
  };
}

export function enqueueOfflineItem(
  currentQueue: OfflineQueueItem[],
  transaction: Transaction,
  action: 'create' | 'update' | 'delete' = 'create',
  now: number = Date.now()
): OfflineQueueItem[] {
  const newItem = createQueueItem(transaction, action, now);
  // If item with same transactionId already has a pending action, update it or append
  const filtered = currentQueue.filter(item => item.transactionId !== transaction.id || item.synced);
  return [newItem, ...filtered];
}

export function markItemsAsSynced(
  currentQueue: OfflineQueueItem[],
  itemIds: string[]
): OfflineQueueItem[] {
  const idsSet = new Set(itemIds);
  return currentQueue.map(item => {
    if (idsSet.has(item.id)) {
      return { ...item, synced: true };
    }
    return item;
  });
}

export function removeSyncedItems(currentQueue: OfflineQueueItem[]): OfflineQueueItem[] {
  return currentQueue.filter(item => !item.synced);
}

export function countPendingOffline(queue: OfflineQueueItem[]): number {
  return queue.filter(item => !item.synced).length;
}

export function isTransactionPendingOffline(
  transactionId: string,
  queue: OfflineQueueItem[]
): boolean {
  return queue.some(item => item.transactionId === transactionId && !item.synced);
}

// Browser Storage Helper APIs
export function loadOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  return parseOfflineQueue(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY));
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, serializeOfflineQueue(queue));
  } catch (err) {
    console.error('Error saving offline queue:', err);
  }
}
