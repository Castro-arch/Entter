'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attendanceApi, type CheckInInput, type CheckInResult } from './api';
import { enqueueScan, getQueuedScans, removeQueuedScan } from './offline-queue';

const SYNC_INTERVAL_MS = 8000;

/**
 * Every scan is queued in IndexedDB first and shown as optimistically
 * successful; a background loop (interval + `online` event) flushes the
 * queue through `batch-sync`, which is safe to replay because check-in is
 * idempotent per participant/day. Staff never stop scanning because the
 * venue Wi-Fi hiccupped.
 */
export function useOfflineCheckIn(
  eventId: string,
  onResult?: (result: CheckInResult) => void,
) {
  const [pendingCount, setPendingCount] = useState(0);
  const syncing = useRef(false);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const refreshPendingCount = useCallback(async () => {
    setPendingCount((await getQueuedScans()).length);
  }, []);

  const flush = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      const queued = await getQueuedScans();
      if (queued.length === 0) return;
      const results = await attendanceApi.batchSync(eventId, queued);
      for (const result of results) {
        if (result.clientId && result.status !== 'error') {
          await removeQueuedScan(result.clientId);
        }
        onResultRef.current?.(result);
      }
    } catch {
      // Still offline or the API is unreachable; the next tick retries.
    } finally {
      syncing.current = false;
      await refreshPendingCount();
    }
  }, [eventId, refreshPendingCount]);

  useEffect(() => {
    void flush();
    const interval = setInterval(() => void flush(), SYNC_INTERVAL_MS);
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [flush, refreshPendingCount]);

  const submitScan = useCallback(
    async (input: Omit<CheckInInput, 'clientId'>) => {
      await enqueueScan(input);
      await refreshPendingCount();
      void flush();
    },
    [flush, refreshPendingCount],
  );

  return { submitScan, pendingCount };
}
