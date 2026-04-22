import { useEffect, useRef } from 'react';
import { connectDriverRealtime } from '../lib/realtime';

export function useDriverRealtimeResync({
  apiBaseUrl = '',
  sessionToken = '',
  role = '',
  requirePinChange = false,
  onSync,
} = {}) {
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const onSyncRef = useRef(onSync);

  onSyncRef.current = onSync;

  useEffect(() => {
    const active = Boolean(sessionToken && !requirePinChange && String(role || '').toUpperCase() === 'DRIVER');

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const disconnect = () => {
      clearTimer();
      try {
        socketRef.current?.disconnect?.();
      } catch {
        // best effort only; polling remains the fallback
      } finally {
        socketRef.current = null;
      }
    };

    const scheduleSync = () => {
      if (!active || timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const runSync = onSyncRef.current;
        if (typeof runSync !== 'function') return;
        runSync().catch(() => null);
      }, 350);
    };

    if (!active) {
      disconnect();
      return () => disconnect();
    }

    const socket = connectDriverRealtime({
      baseUrl: apiBaseUrl,
      token: sessionToken,
      onSignal: ({ eventName }) => {
        if (
          eventName === 'shift:update' ||
          eventName === 'route:plan' ||
          eventName === 'route:progress' ||
          eventName === 'notif:new' ||
          eventName === 'ws:ready'
        ) {
          scheduleSync();
        }
      },
      onConnect: scheduleSync,
    });

    socketRef.current = socket;

    return () => disconnect();
  }, [apiBaseUrl, requirePinChange, role, sessionToken]);
}
