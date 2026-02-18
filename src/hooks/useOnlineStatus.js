import { useEffect, useRef, useSyncExternalStore } from 'react';

// Singleton external store — one pair of event listeners for all consumers
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => listeners.forEach(fn => fn()));
  window.addEventListener('offline', () => listeners.forEach(fn => fn()));
}

/**
 * Centralized online/offline hook with optional reconnect callback.
 *
 * @param {Object} [options]
 * @param {Function} [options.onReconnect] - Fires once on offline→online transition
 * @returns {{ isOnline: boolean }}
 */
export function useOnlineStatus({ onReconnect } = {}) {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const wasOfflineRef = useRef(!navigator.onLine);

  useEffect(() => {
    if (isOnline && wasOfflineRef.current && onReconnect) {
      onReconnect();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, onReconnect]);

  return { isOnline };
}
