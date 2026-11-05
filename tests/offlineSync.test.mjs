import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOfflineQueue,
  serializeOfflineQueue,
  createQueueItem,
  enqueueOfflineItem,
  markItemsAsSynced,
  removeSyncedItems,
  countPendingOffline,
  isTransactionPendingOffline,
} from '../src/utils/offlineSync.ts';

test('parseOfflineQueue handles null, empty, invalid json safely', () => {
  assert.deepEqual(parseOfflineQueue(null), []);
  assert.deepEqual(parseOfflineQueue(''), []);
  assert.deepEqual(parseOfflineQueue('{ invalid json'), []);
  assert.deepEqual(parseOfflineQueue('{"not": "an array"}'), []);
});

test('serializeOfflineQueue and parseOfflineQueue are symmetrical', () => {
  const dummyQueue = [
    {
      id: 'sync-1',
      transactionId: 'tx-1',
      action: 'create',
      transaction: { id: 'tx-1', description: 'Mercado', amount: -150 },
      timestamp: 1700000000,
      synced: false,
    },
  ];
  const serialized = serializeOfflineQueue(dummyQueue);
  assert.equal(typeof serialized, 'string');
  const parsed = parseOfflineQueue(serialized);
  assert.deepEqual(parsed, dummyQueue);
});

test('createQueueItem sets default fields correctly', () => {
  const tx = { id: 'tx-99', description: 'Café', amount: -12 };
  const item = createQueueItem(tx, 'create', 1000);
  assert.equal(item.transactionId, 'tx-99');
  assert.equal(item.action, 'create');
  assert.equal(item.timestamp, 1000);
  assert.equal(item.synced, false);
  assert.ok(item.id.startsWith('sync-1000-'));
});

test('enqueueOfflineItem prepends new items and deduplicates pending item for same transaction', () => {
  const tx1 = { id: 'tx-1', description: 'Item 1', amount: -50 };
  const tx2 = { id: 'tx-2', description: 'Item 2', amount: -100 };

  let queue = enqueueOfflineItem([], tx1, 'create', 100);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].transactionId, 'tx-1');

  queue = enqueueOfflineItem(queue, tx2, 'create', 200);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].transactionId, 'tx-2');

  // Updating tx1 while still pending should replace previous pending entry
  const updatedTx1 = { ...tx1, amount: -75 };
  queue = enqueueOfflineItem(queue, updatedTx1, 'update', 300);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].transactionId, 'tx-1');
  assert.equal(queue[0].transaction.amount, -75);
  assert.equal(queue[0].action, 'update');
});

test('markItemsAsSynced and removeSyncedItems manage sync lifecycle', () => {
  const tx1 = { id: 'tx-1', description: 'A', amount: 10 };
  const tx2 = { id: 'tx-2', description: 'B', amount: 20 };

  const item1 = createQueueItem(tx1, 'create', 100);
  const item2 = createQueueItem(tx2, 'create', 200);

  const initialQueue = [item1, item2];
  assert.equal(countPendingOffline(initialQueue), 2);

  // Mark item1 as synced
  const updated = markItemsAsSynced(initialQueue, [item1.id]);
  assert.equal(countPendingOffline(updated), 1);
  assert.equal(updated.find(i => i.id === item1.id).synced, true);
  assert.equal(updated.find(i => i.id === item2.id).synced, false);

  // Remove synced items
  const cleaned = removeSyncedItems(updated);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].id, item2.id);
});

test('isTransactionPendingOffline correctly identifies unsynced transactions', () => {
  const tx = { id: 'tx-100', description: 'Internet', amount: -120 };
  const item = createQueueItem(tx, 'create');

  assert.equal(isTransactionPendingOffline('tx-100', [item]), true);
  assert.equal(isTransactionPendingOffline('tx-other', [item]), false);

  const syncedItem = { ...item, synced: true };
  assert.equal(isTransactionPendingOffline('tx-100', [syncedItem]), false);
});
