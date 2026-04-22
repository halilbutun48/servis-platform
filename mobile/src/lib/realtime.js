import { io } from 'socket.io-client';

const DRIVER_REALTIME_EVENTS = new Set([
  'ws:ready',
  'shift:update',
  'route:plan',
  'route:progress',
  'notif:new',
]);

export function connectDriverRealtime({
  baseUrl = '',
  token = '',
  onSignal,
  onConnect,
  onDisconnect,
  onError,
} = {}) {
  const resolvedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  const resolvedToken = String(token || '').trim();

  if (!resolvedBaseUrl || !resolvedToken) {
    return null;
  }

  const socket = io(resolvedBaseUrl, {
    autoConnect: true,
    auth: { token: resolvedToken },
    forceNew: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    onConnect?.({ socket });
  });

  socket.on('disconnect', (reason) => {
    onDisconnect?.({ socket, reason });
  });

  socket.on('connect_error', (error) => {
    onError?.({ socket, error });
  });

  for (const eventName of DRIVER_REALTIME_EVENTS) {
    socket.on(eventName, (payload) => {
      onSignal?.({ socket, eventName, payload });
    });
  }

  return socket;
}
