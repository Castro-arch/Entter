import type { CheckInInput } from './api';

/**
 * Native IndexedDB queue for check-in scans made while offline. No library —
 * the schema is a single keyed object store, which the browser API handles
 * directly without needing a wrapper.
 */
const DB_NAME = 'entter-checkin-queue';
const STORE_NAME = 'scans';
const DB_VERSION = 1;

export interface QueuedScan extends CheckInInput {
  clientId: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'clientId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueScan(
  input: Omit<CheckInInput, 'clientId'>,
): Promise<QueuedScan> {
  const queued: QueuedScan = { ...input, clientId: crypto.randomUUID() };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(queued);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return queued;
}

export async function getQueuedScans(): Promise<QueuedScan[]> {
  const db = await openDb();
  const result = await new Promise<QueuedScan[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedScan[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function removeQueuedScan(clientId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(clientId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
