/**
 * ExamGuard Pro - Offline Queue (Store and Forward)
 * ==================================================
 * Uses IndexedDB (via idb) to cache alerts when offline.
 * Auto-syncs when network is restored.
 *
 * This is the key feature for rural India exam centers!
 * "Store and Forward" - data is never lost due to connectivity.
 */

import { openDB } from 'idb';

const DB_NAME = 'examguard-offline';
const STORE_ALERTS = 'pending_alerts';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_ALERTS)) {
          const store = db.createObjectStore(STORE_ALERTS, {
            keyPath: 'localId',
            autoIncrement: true,
          });
          store.createIndex('session_id', 'session_id', { unique: false });
          store.createIndex('cached_at', 'cached_at', { unique: false });
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Cache an alert to IndexedDB for offline storage.
 * @param {Object} alertData - Alert payload (same shape as API)
 * @returns {number} localId of cached entry
 */
export const cacheAlert = async (alertData) => {
  const db = await getDB();
  const entry = {
    ...alertData,
    offline_cached: true,
    cached_at: new Date().toISOString(),
  };
  const id = await db.add(STORE_ALERTS, entry);
  console.log(`[OfflineQueue] Cached alert #${id}: ${alertData.alert_type}`);
  return id;
};

/**
 * Get all pending (unsynced) alerts from IndexedDB.
 * @returns {Array} List of cached alerts
 */
export const getPendingAlerts = async () => {
  const db = await getDB();
  return db.getAll(STORE_ALERTS);
};

/**
 * Get count of pending alerts.
 */
export const getPendingCount = async () => {
  const db = await getDB();
  return db.count(STORE_ALERTS);
};

/**
 * Remove a synced alert from the offline queue.
 * @param {number} localId
 */
export const removeAlert = async (localId) => {
  const db = await getDB();
  await db.delete(STORE_ALERTS, localId);
};

/**
 * Clear all pending alerts (after successful bulk sync).
 */
export const clearAllPending = async () => {
  const db = await getDB();
  await db.clear(STORE_ALERTS);
  console.log('[OfflineQueue] All pending alerts cleared after sync.');
};

/**
 * Get alerts for a specific session from the offline queue.
 */
export const getSessionPending = async (sessionId) => {
  const db = await getDB();
  return db.getAllFromIndex(STORE_ALERTS, 'session_id', sessionId);
};
