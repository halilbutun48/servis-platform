import { getDeviceId, getSession, saveDeviceId, saveSession } from './storage';

const API_BASE_URL = String(process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000').trim().replace(/\/$/, '');

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function ensureDeviceId() {
  let deviceId = await getDeviceId();
  if (deviceId) return deviceId;
  deviceId = `mobile-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  await saveDeviceId(deviceId);
  return deviceId;
}

async function rawRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const error = new Error(
      String(payload?.message || payload?.error || payload || `HTTP ${response.status}`)
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function refreshIfNeeded() {
  const session = await getSession();
  if (!session?.refreshToken) return null;
  const deviceId = session.deviceId || (await ensureDeviceId());
  const refreshed = await rawRequest('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: session.refreshToken, deviceId },
  });
  const nextSession = {
    ...session,
    token: refreshed?.token || '',
    refreshToken: refreshed?.refreshToken || session.refreshToken,
    deviceId,
  };
  await saveSession(nextSession);
  return nextSession;
}

async function request(path, options = {}, allowRefresh = true) {
  const session = await getSession();
  const token = options.token || session?.token || '';
  try {
    return await rawRequest(path, { ...options, token });
  } catch (error) {
    if (!allowRefresh || ![401, 403].includes(Number(error?.status || 0))) throw error;
    const nextSession = await refreshIfNeeded();
    if (!nextSession?.token) throw error;
    return rawRequest(path, { ...options, token: nextSession.token });
  }
}

export async function loginDriver(identifier, password) {
  const deviceId = await ensureDeviceId();
  return rawRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier, password, deviceId },
  });
}

export async function fetchHealth() {
  try {
    const payload = await rawRequest('/health', { method: 'GET' });
    return { ok: true, status: 'UP', payload };
  } catch (error) {
    return {
      ok: false,
      status: 'DOWN',
      message: String(error?.payload?.message || error?.payload?.error || error?.message || error || 'Health failed.'),
    };
  }
}

export async function fetchMe() {
  return request('/api/me');
}

export async function fetchToday() {
  return request('/api/driver/shifts/today');
}

export async function fetchActiveRoute() {
  return request('/api/driver/route/active');
}

export async function changeDriverPin(currentPin, newPin) {
  return request('/api/auth/driver/change-pin', {
    method: 'POST',
    body: { currentPin, newPin },
  });
}

export async function logoutDriver() {
  const session = await getSession();
  if (!session?.refreshToken) return { ok: true, localOnly: true };
  try {
    return await request(
      '/api/auth/logout',
      {
        method: 'POST',
        body: { refreshToken: session.refreshToken },
      },
      false
    );
  } catch {
    return { ok: false, localOnly: true };
  }
}

export async function apiGet(path) {
  return request(path, { method: 'GET' });
}

export async function publishGps(payload) {
  return request('/api/gps', {
    method: 'POST',
    body: payload,
  });
}
