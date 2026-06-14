/**
 * useOfflineSync — Store-and-Forward React hook
 * ===============================================
 * Monitors network connectivity.
 * When connection is restored, auto-syncs all cached offline alerts to backend.
 * Shows progress to user.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingAlerts, getPendingCount, clearAllPending } from '../services/offlineQueue';
import { bulkSyncAlerts, checkHealth } from '../services/api';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const syncAttemptedRef = useRef(false);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Perform bulk sync when coming back online
  const performSync = useCallback(async () => {
    if (isSyncing || syncAttemptedRef.current) return;
    const count = await getPendingCount();
    if (count === 0) return;

    syncAttemptedRef.current = true;
    setIsSyncing(true);
    console.log(`[OfflineSync] Starting sync of ${count} queued alerts...`);

    try {
      const pending = await getPendingAlerts();
      const result = await bulkSyncAlerts(pending);

      await clearAllPending();
      setPendingCount(0);
      setLastSyncResult({
        success: true,
        synced: result.synced_count,
        failed: result.failed_count,
        timestamp: new Date().toISOString(),
      });

      console.log(`[OfflineSync] Synced ${result.synced_count} alerts.`);
    } catch (err) {
      console.error('[OfflineSync] Sync failed:', err.message);
      setLastSyncResult({ success: false, error: err.message });
    } finally {
      setIsSyncing(false);
      syncAttemptedRef.current = false;
    }
  }, [isSyncing]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Verify backend is actually reachable (not just browser online)
      const health = await checkHealth();
      if (health.online) {
        await performSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      syncAttemptedRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync, refreshPendingCount]);

  // Periodically refresh pending count
  useEffect(() => {
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    manualSync: performSync,
    refreshPendingCount,
  };
};
