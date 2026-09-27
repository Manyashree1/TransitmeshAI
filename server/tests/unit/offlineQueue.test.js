import { test, describe } from 'node:test';
import assert from 'node:assert';

const oldWindow = globalThis.window;
const oldLocalStorage = globalThis.localStorage;

globalThis.window = { indexedDB: null };
globalThis.localStorage = {
  store: Object.create(null),
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = Object.create(null);
  },
};

const { queueEtmEvent, syncQueuedEtmEvents, getQueuedEtmEvents } = await import('../../../client/src/services/offlineQueue.js');

describe('offline ETM queue', () => {
  test('keeps only one queued record per transactionId', async () => {
    globalThis.localStorage.clear();
    const id = 'offline-queue-001';
    await queueEtmEvent({ transactionId: id, tripId: 'trip-1', passengerCount: 2 });
    await queueEtmEvent({ transactionId: id, tripId: 'trip-1', passengerCount: 2 });

    const queued = await getQueuedEtmEvents();
    assert.equal(queued.length, 1);
    assert.equal(queued[0].transactionId, id);
    assert.equal(queued[0].syncStatus, 'PENDING_SYNC');
  });

  test('sync retries the same transactionId and clears the queue', async () => {
    globalThis.localStorage.clear();
    const api = {
      post: async (_path, payload) => ({
        data: { ok: true, transactionId: payload.transactionId, synced: true },
      }),
    };

    await queueEtmEvent({ transactionId: 'offline-queue-002', tripId: 'trip-2', passengerCount: 1 });
    const syncResult = await syncQueuedEtmEvents(api);

    assert.equal(syncResult.length, 1);
    assert.equal(syncResult[0].synced, true);
    assert.equal(syncResult[0].itemId, 'offline-queue-002');
    assert.deepEqual(await getQueuedEtmEvents(), []);
  });
});

process.on('exit', () => {
  globalThis.window = oldWindow;
  globalThis.localStorage = oldLocalStorage;
});
