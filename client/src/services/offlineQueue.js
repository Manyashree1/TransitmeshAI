const QUEUE_KEY = 'transitai.etm.pending_queue';
const DB_NAME = 'TransitAIQueue';
const STORE_NAME = 'etmEvents';

const hasIndexedDb = () => typeof window !== 'undefined' && !!window.indexedDB && typeof window.indexedDB.open === 'function';

function readLocalQueue() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalQueue(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function openQueueDatabase() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB unavailable'));
  });
}

async function readIndexedQueue() {
  const db = await openQueueDatabase();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Failed to read queued ETM events'));
  });
}

async function writeIndexedQueue(items) {
  const db = await openQueueDatabase();
  if (!db) {
    writeLocalQueue(items);
    return;
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.clear();
    items.forEach(item => store.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to write queued ETM events'));
  });
}

export async function getQueuedEtmEvents() {
  try {
    if (hasIndexedDb()) {
      return await readIndexedQueue();
    }
    return readLocalQueue();
  } catch {
    return readLocalQueue();
  }
}

export async function queueEtmEvent(event) {
  const pendingItem = {
    id: event.transactionId || event.ticketId || `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...event,
    syncStatus: 'PENDING_SYNC',
    queuedAt: new Date().toISOString(),
    retryCount: Number(event.retryCount || 0),
  };

  try {
    const existing = await getQueuedEtmEvents();
    const next = [...existing.filter(item => item.id !== pendingItem.id), pendingItem];

    if (hasIndexedDb()) {
      await writeIndexedQueue(next);
    } else {
      writeLocalQueue(next);
    }

    return pendingItem;
  } catch {
    const fallback = readLocalQueue();
    const next = [...fallback.filter(item => item.id !== pendingItem.id), pendingItem];
    writeLocalQueue(next);
    return pendingItem;
  }
}

export async function removeQueuedEtmEvent(id) {
  const existing = await getQueuedEtmEvents();
  const next = existing.filter(item => item.id !== id);

  if (hasIndexedDb()) {
    await writeIndexedQueue(next);
  } else {
    writeLocalQueue(next);
  }
}

export async function syncQueuedEtmEvents(api) {
  const queued = await getQueuedEtmEvents();
  if (!queued.length) return [];

  const results = [];

  for (const item of queued) {
    try {
      const { data } = await api.post('/ticketing/events', item);
      await removeQueuedEtmEvent(item.id);
      results.push({ ...data, synced: true, itemId: item.id });
    } catch (error) {
      const response = error?.response;
      const status = response?.status;
      const isDuplicate = status === 200 || status === 409 || response?.data?.duplicate === true;

      if (isDuplicate) {
        await removeQueuedEtmEvent(item.id);
        results.push({ synced: true, duplicate: true, itemId: item.id });
      } else {
        results.push({ synced: false, itemId: item.id, error: response?.data?.error || response?.data || error });
      }
    }
  }

  return results;
}
