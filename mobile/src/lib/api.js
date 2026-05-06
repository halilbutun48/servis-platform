import { getDeviceId, getSession, saveDeviceId, saveSession } from './storage';
import { buildReleaseBlockingError, getReleaseGuard } from './release';

const API_BASE_URL = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = Math.max(4000, Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 12000));
const QUERY_CACHE_TTL_MS = Math.max(15000, Number(process.env.EXPO_PUBLIC_QUERY_CACHE_TTL_MS || 60000));
const QUERY_RATE_LIMIT_COOLDOWN_MS = Math.max(30000, Number(process.env.EXPO_PUBLIC_QUERY_RATE_LIMIT_COOLDOWN_MS || 60000));
const QUERY_CACHE = new Map();

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractScalarText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (value instanceof Error) return String(value.message || '').trim();
  if (Array.isArray(value)) {
    return value.map((item) => extractScalarText(item)).filter(Boolean).join(', ');
  }
  if (isRecord(value)) {
    for (const key of ['code', 'message', 'error', 'reason', 'name', 'type', 'description']) {
      const next = extractScalarText(value[key]);
      if (next) return next;
    }
    return '';
  }
  return String(value).trim();
}

function collectObjectKeys(...values) {
  const keys = new Set();
  for (const value of values) {
    if (!isRecord(value)) continue;
    Object.keys(value).forEach((key) => {
      const text = String(key || '').trim();
      if (text) keys.add(text);
    });
  }
  return Array.from(keys);
}

function buildQueryCacheKey(name, parts = []) {
  const normalizedParts = Array.isArray(parts) ? parts : [parts];
  return [name, ...normalizedParts.map((part) => String(part ?? '').trim())].join('|');
}

function getQueryCacheEntry(cacheKey) {
  if (!QUERY_CACHE.has(cacheKey)) {
    QUERY_CACHE.set(cacheKey, {
      promise: null,
      hasValue: false,
      value: undefined,
      resolvedAt: 0,
      cooldownUntil: 0,
      lastError: null,
      lastStatus: 0,
    });
  }
  return QUERY_CACHE.get(cacheKey);
}

export function clearApiQueryCache() {
  QUERY_CACHE.clear();
}

async function requestWithQueryCache(cacheName, parts, fetcher, { force = false, ttlMs = QUERY_CACHE_TTL_MS, cooldownMs = QUERY_RATE_LIMIT_COOLDOWN_MS } = {}) {
  const cacheKey = buildQueryCacheKey(cacheName, parts);
  const entry = getQueryCacheEntry(cacheKey);
  const now = Date.now();

  if (!force) {
    if (entry.promise) return entry.promise;
    if (entry.cooldownUntil > now) {
      if (entry.hasValue) return entry.value;
      throw entry.lastError || buildNormalizedError({
        status: 429,
        code: 'RATE_LIMITED',
        fallbackMessage: 'Çok fazla istek gönderildi. Biraz sonra tekrar deneyin.',
      });
    }
    if (entry.hasValue && entry.resolvedAt && (now - entry.resolvedAt) < ttlMs) {
      return entry.value;
    }
  }

  const nextPromise = (async () => {
    try {
      const value = await fetcher();
      entry.hasValue = true;
      entry.value = value;
      entry.resolvedAt = Date.now();
      entry.lastError = null;
      entry.lastStatus = 0;
      entry.cooldownUntil = 0;
      return value;
    } catch (error) {
      const normalized = normalizeThrownError(error, cacheName);
      entry.lastError = normalized;
      entry.lastStatus = Number(normalized?.status || 0);
      if (entry.lastStatus === 429) {
        entry.cooldownUntil = Date.now() + cooldownMs;
      } else if (normalized?.isNetworkError) {
        entry.cooldownUntil = Date.now() + Math.min(cooldownMs, 30000);
      }
      if (entry.hasValue && !force) return entry.value;
      throw normalized;
    } finally {
      if (entry.promise === nextPromise) entry.promise = null;
    }
  })();

  entry.promise = nextPromise;
  return nextPromise;
}

function resolveBackendErrorShape(payload) {
  const root = isRecord(payload) ? payload : null;
  const nestedError = isRecord(root?.error) ? root.error : null;
  const details = isRecord(nestedError?.details) ? nestedError.details : isRecord(root?.details) ? root.details : null;
  const fieldErrors = isRecord(nestedError?.fieldErrors) ? nestedError.fieldErrors : isRecord(root?.fieldErrors) ? root.fieldErrors : null;

  return {
    code:
      extractScalarText(nestedError?.code) ||
      extractScalarText(root?.code) ||
      extractScalarText(nestedError?.error) ||
      extractScalarText(root?.error) ||
      extractScalarText(root?.name) ||
      extractScalarText(root?.type),
    message:
      extractScalarText(nestedError?.message) ||
      extractScalarText(root?.message) ||
      extractScalarText(nestedError?.description) ||
      extractScalarText(root?.description) ||
      extractScalarText(root?.errorMessage),
    details,
    fieldErrors,
  };
}

function maskDeviceId(deviceId = '') {
  const clean = String(deviceId || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

function buildUrl(path) {
  const releaseGuard = getReleaseGuard();
  if (releaseGuard.blocking) {
    throw buildReleaseBlockingError(releaseGuard);
  }
  if (!API_BASE_URL) {
    const error = new Error('Mobil API adresi ayarlı değil.');
    error.code = 'API_BASE_URL_MISSING';
    error.userMessage = 'Mobil API adresi ayarlı değil. EXPO_PUBLIC_API_BASE_URL gerekli.';
    throw error;
  }
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  try {
    return new URL(normalizedPath, baseUrl).toString();
  } catch {
    return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getApiTimeoutMs() {
  return REQUEST_TIMEOUT_MS;
}

function generateDeviceId() {
  const crypto = globalThis?.crypto || null;
  if (crypto?.randomUUID) {
    return `mobile-${crypto.randomUUID().replace(/-/g, '')}`;
  }
  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `mobile-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function ensureDeviceId() {
  let deviceId = await getDeviceId();
  if (deviceId) return deviceId;
  deviceId = generateDeviceId();
  await saveDeviceId(deviceId);
  return deviceId;
}

function extractPayloadMessage(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  const envelope = resolveBackendErrorShape(payload);
  return envelope.message || envelope.code || '';
}

function extractValidationFieldMessage(payload) {
  const envelope = resolveBackendErrorShape(payload);
  const fieldErrors = envelope.fieldErrors || payload?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object') return '';
  const hasIdentifier = Boolean(fieldErrors.identifier || fieldErrors.code || fieldErrors.email);
  const hasPassword = Boolean(fieldErrors.password || fieldErrors.pin);
  const messages = [];
  if (hasIdentifier) messages.push('Sürücü kodu veya e-posta gerekli.');
  if (hasPassword) messages.push('PIN veya şifre gerekli.');
  return messages.join(' ');
}

function buildLoginDiagnostics({
  releaseGuard = getReleaseGuard(),
  path = '/api/auth/login',
  method = 'POST',
  attemptedUrl = '',
  response = null,
  networkError = null,
  deviceId = '',
} = {}) {
  if (String(releaseGuard?.stage || '').trim().toLowerCase() !== 'local-emulator') return null;
  const payload = response?.payload && typeof response.payload === 'object' ? response.payload : null;
  const envelope = resolveBackendErrorShape(payload);
  const detailKeys = collectObjectKeys(envelope.details);
  const fieldErrorKeys = collectObjectKeys(envelope.fieldErrors);
  const deviceIdText = String(deviceId || '').trim();
  return {
    stage: 'local-emulator',
    method,
    endpointPath: path,
    attemptedUrl,
    apiBaseUrl: String(releaseGuard?.apiBaseUrl || API_BASE_URL || '').trim(),
    transport: networkError ? 'network' : 'http',
    status: Number(response?.status || networkError?.status || 0) || 0,
    code:
      extractScalarText(response?.code) ||
      envelope.code ||
      extractScalarText(payload?.error) ||
      extractScalarText(networkError?.code),
    message:
      envelope.message ||
      extractScalarText(response?.message) ||
      extractScalarText(networkError?.message),
    detailKeys,
    fieldErrorKeys,
    deviceIdPresent: Boolean(deviceIdText),
    deviceIdMask: maskDeviceId(deviceIdText),
    networkErrorName: extractScalarText(networkError?.name),
    networkErrorMessage: extractScalarText(networkError?.message),
  };
}

function deriveErrorCode(payload, status = 0, fallbackMessage = '') {
  const envelope = resolveBackendErrorShape(payload);
  const raw =
    envelope.code ||
    extractScalarText(payload?.code) ||
    extractScalarText(payload?.error) ||
    extractScalarText(fallbackMessage);
  if (raw) return raw.toUpperCase().replace(/\s+/g, '_');
  if (Number(status) === 403) return 'HTTP_403';
  if (Number(status) === 408) return 'NETWORK_TIMEOUT';
  if (Number(status) > 0) return `HTTP_${Number(status)}`;
  return 'REQUEST_FAILED';
}

function deriveUserMessage(code, { payload = null, status = 0, fallbackMessage = '' } = {}) {
  const envelope = resolveBackendErrorShape(payload);
  const cooldownSec = Number(payload?.cooldownSec || 0) || 0;
  if (Number(status) === 403 || String(code || '').toUpperCase() === 'HTTP_403' || String(code || '').toUpperCase() === 'FORBIDDEN') {
    return 'Giriş yetkisi doğrulanamadı. Sürücü kodu, PIN veya cihaz eşleşmesini kontrol edin.';
  }
  switch (String(code || '').toUpperCase()) {
    case 'API_BASE_URL_MISSING':
      return 'Mobil API adresi ayarlı değil. EXPO_PUBLIC_API_BASE_URL gerekli.';
    case 'NETWORK_TIMEOUT':
      return 'Sunucu yanıtı gecikti. Lütfen tekrar deneyin.';
    case 'NETWORK_ERROR':
      return 'Bağlantı kurulamadı. İnternet erişimini kontrol edin.';
    case 'INVALID_CREDENTIALS':
      return 'Sürücü kodu/e-posta veya PIN/şifre hatalı.';
    case 'PIN_LOCKED':
      return cooldownSec > 0
        ? `Çok fazla hatalı PIN denemesi oldu. ${cooldownSec} saniye sonra tekrar deneyin.`
        : 'Çok fazla hatalı PIN denemesi oldu. Bir süre sonra tekrar deneyin.';
    case 'DEVICE_MISMATCH':
      return 'Bu sürücü hesabı başka bir cihaza bağlı görünüyor. Operasyon ile cihaz eşleşmesini kontrol edin.';
    case 'DEVICE_ID_REQUIRED':
      return 'Bu hesap için cihaz doğrulaması gerekli.';
    case 'BAD_CURRENT_PIN':
      return 'Mevcut PIN hatalı.';
    case 'CURRENT_PIN_REQUIRED':
      return 'Mevcut PIN gerekli.';
    case 'INVALID_REFRESH_TOKEN':
    case 'REFRESH_REVOKED':
    case 'REFRESH_REUSE_DETECTED':
    case 'REFRESH_EXPIRED':
    case 'SESSION_REFRESH_FAILED':
      return 'Oturum süresi doldu. Yeniden giriş yapın.';
    case 'CONSENT_REQUIRED':
      return 'Devam etmek için gerekli KVKK onaylarını tamamlayın.';
    default:
      if (envelope.fieldErrors || payload?.fieldErrors) {
        const fieldMessage = extractValidationFieldMessage(payload);
        if (fieldMessage) return fieldMessage;
      }
      return extractScalarText(envelope.message) || extractScalarText(payload?.message) || extractScalarText(payload?.error) || extractScalarText(fallbackMessage) || `HTTP ${status || 0}` || 'İşlem başarısız.';
  }
}

function buildNormalizedError({ status = 0, payload = null, path = '', code = '', fallbackMessage = '', reason = '', cause = null } = {}) {
  const finalCode = deriveErrorCode(payload, status, code || fallbackMessage);
  const userMessage = deriveUserMessage(finalCode, { payload, status, fallbackMessage });
  const error = new Error(userMessage);
  error.status = Number(status || 0);
  error.payload = payload;
  error.path = path;
  error.code = finalCode;
  error.userMessage = userMessage;
  error.retryable = finalCode === 'NETWORK_TIMEOUT' || finalCode === 'NETWORK_ERROR' || Number(status || 0) >= 500;
  error.isNetworkError = finalCode === 'NETWORK_TIMEOUT' || finalCode === 'NETWORK_ERROR';
  error.reason = reason || '';
  if (cause) error.cause = cause;
  return error;
}

function normalizeThrownError(error, path = '') {
  if (!error) return buildNormalizedError({ path, code: 'REQUEST_FAILED', fallbackMessage: 'İşlem başarısız.' });
  if (error?.userMessage && error?.code) return error;

  const text = String(error?.message || error || '').trim();
  if (error?.name === 'AbortError') {
    return buildNormalizedError({ path, status: 408, code: 'NETWORK_TIMEOUT', fallbackMessage: text || 'Request timeout', cause: error });
  }
  if (text.toLowerCase().includes('network request failed') || text.toLowerCase().includes('failed to fetch') || text.toLowerCase().includes('network error')) {
    return buildNormalizedError({ path, code: 'NETWORK_ERROR', fallbackMessage: text || 'Network request failed', cause: error });
  }
  if (error?.status || error?.payload) {
    return buildNormalizedError({
      path: error?.path || path,
      status: error?.status || 0,
      payload: error?.payload || null,
      code: error?.code || '',
      fallbackMessage: extractPayloadMessage(error?.payload) || text,
      cause: error,
    });
  }
  if (error?.code === 'API_BASE_URL_MISSING') {
    return buildNormalizedError({ path, code: 'API_BASE_URL_MISSING', fallbackMessage: text, cause: error });
  }
  return buildNormalizedError({ path, code: 'REQUEST_FAILED', fallbackMessage: text || 'İşlem başarısız.', cause: error });
}

async function rawRequest(path, { method = 'GET', body, token } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');

    if (!response.ok) {
      throw buildNormalizedError({
        status: response.status,
        payload,
        path,
        fallbackMessage: extractPayloadMessage(payload) || `HTTP ${response.status}`,
      });
    }

    return payload;
  } catch (error) {
    throw normalizeThrownError(error, path);
  } finally {
    clearTimeout(timeoutId);
  }
}

function markSessionFailure(sourceError, reason = '') {
  const normalized = normalizeThrownError(sourceError, sourceError?.path || '');
  const error = new Error(normalized.userMessage || 'Oturum süresi doldu. Yeniden giriş yapın.');
  error.status = Number(normalized.status || 401);
  error.payload = normalized.payload || null;
  error.path = normalized.path || '';
  error.code = normalized.code || 'SESSION_REFRESH_FAILED';
  error.userMessage = normalized.userMessage || 'Oturum süresi doldu. Yeniden giriş yapın.';
  error.sessionFailure = true;
  error.sessionFailureReason = reason || normalized.code || normalized.userMessage || 'session-failed';
  return error;
}

async function refreshIfNeeded() {
  const session = await getSession();
  if (!session?.refreshToken) return null;
  const deviceId = session.deviceId || (await ensureDeviceId());

  try {
    const refreshed = await rawRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken, deviceId },
    });

    if (!refreshed?.token || !refreshed?.refreshToken) {
      throw buildNormalizedError({
        path: '/api/auth/refresh',
        status: 503,
        code: 'REFRESH_SESSION_CREATE_FAILED',
        fallbackMessage: 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.',
      });
    }

    const nextSession = {
      ...session,
      token: refreshed.token,
      refreshToken: refreshed.refreshToken,
      deviceId,
    };
    await saveSession(nextSession);
    clearApiQueryCache();
    return nextSession;
  } catch (error) {
    throw markSessionFailure(error, 'refresh-failed');
  }
}

async function request(path, options = {}, allowRefresh = true) {
  const session = await getSession();
  const token = options.token || session?.token || '';

  try {
    return await rawRequest(path, { ...options, token });
  } catch (error) {
    const normalized = normalizeThrownError(error, path);
    if (!allowRefresh || ![401, 403].includes(Number(normalized?.status || 0))) throw normalized;
    if (!session?.refreshToken) throw markSessionFailure(normalized, 'refresh-token-missing');

    const nextSession = await refreshIfNeeded();
    if (!nextSession?.token) throw markSessionFailure(normalized, 'refresh-token-empty');

    try {
      return await rawRequest(path, { ...options, token: nextSession.token });
    } catch (retryError) {
      const retryNormalized = normalizeThrownError(retryError, path);
      if ([401, 403].includes(Number(retryNormalized?.status || 0))) {
        throw markSessionFailure(retryNormalized, 'retry-rejected-after-refresh');
      }
      throw retryNormalized;
    }
  }
}

function asPositiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function requireShiftId(shiftId) {
  const value = asPositiveInt(shiftId);
  if (!value) throw buildNormalizedError({ code: 'SHIFT_ID_REQUIRED', fallbackMessage: 'Geçerli vardiya seçilmedi.' });
  return value;
}

function requireStopId(stopId) {
  const value = asPositiveInt(stopId);
  if (!value) throw buildNormalizedError({ code: 'STOP_ID_REQUIRED', fallbackMessage: 'Geçerli durak seçilmedi.' });
  return value;
}

async function postShiftAction(shiftId, action) {
  const value = requireShiftId(shiftId);
  return request(`/api/driver/shifts/${value}/${action}`, { method: 'POST' });
}

async function postStopAction(shiftId, stopId, action) {
  const shiftValue = requireShiftId(shiftId);
  const stopValue = requireStopId(stopId);
  return request(`/api/driver/shifts/${shiftValue}/stops/${stopValue}/${action}`, { method: 'POST' });
}

export function getApiErrorCode(error) {
  return String(error?.code || error?.payload?.code || error?.payload?.error || '').toUpperCase();
}

export function humanizeApiError(error, fallback = 'İşlem başarısız.') {
  if (!error) return fallback;
  return String(error?.userMessage || error?.payload?.message || error?.payload?.error || error?.message || fallback);
}

export function isSessionFailureError(error) {
  return Boolean(error?.sessionFailure);
}

export function isKvkkBlockingError(error) {
  const code = getApiErrorCode(error);
  return code.includes('KVKK') || code === 'CONSENT_REQUIRED';
}

export function isDeviceMismatchError(error) {
  return getApiErrorCode(error) === 'DEVICE_MISMATCH';
}

export function isPinLockedError(error) {
  return getApiErrorCode(error) === 'PIN_LOCKED';
}

export function isNetworkLikeError(error) {
  const code = getApiErrorCode(error);
  return Boolean(error?.isNetworkError || code === 'NETWORK_TIMEOUT' || code === 'NETWORK_ERROR');
}

export async function loginDriver(identifier, password) {
  const deviceId = await ensureDeviceId();
  const releaseGuard = getReleaseGuard();
  const attemptedUrl = buildUrl('/api/auth/login');
  return rawRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier, password, deviceId },
  }).catch((error) => {
    const stage = String(releaseGuard?.stage || '').trim().toLowerCase();
    if (stage === 'local-emulator') {
      const response = Number(error?.status || 0) > 0
        ? {
            status: Number(error?.status || 0),
            payload: error?.payload || null,
            code: error?.code || '',
            message: error?.userMessage || error?.message || '',
          }
        : null;
      const diagnostics = buildLoginDiagnostics({
        releaseGuard,
        path: '/api/auth/login',
        method: 'POST',
        attemptedUrl,
        response,
        networkError: response ? null : error,
        deviceId,
      });
      if (diagnostics) {
        error.loginDiagnostics = diagnostics;
        error.diagnostics = diagnostics;
      }
    }
    throw error;
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
      message: humanizeApiError(error, 'Health failed.'),
    };
  }
}

export async function fetchMe({ force = false } = {}) {
  return requestWithQueryCache('me', [], () => request('/api/me'), { force });
}

export async function fetchMyNotifications({ force = false } = {}) {
  return requestWithQueryCache('notifications', [], () => request('/api/notifications/my'), { force });
}

export async function fetchToday({ force = false } = {}) {
  return requestWithQueryCache('driver-today', [], () => request('/api/driver/shifts/today'), { force });
}

export async function fetchLiveVehicles(take = 20) {
  const limit = Number.isFinite(Number(take)) ? Math.max(1, Math.min(100, Number(take))) : 20;
  return request(`/api/live/vehicles?take=${limit}`);
}

export async function fetchPersonelShifts(take = 20) {
  const limit = Number.isFinite(Number(take)) ? Math.max(1, Math.min(100, Number(take))) : 20;
  return request(`/api/personel/shifts?take=${limit}`);
}

export async function fetchParentChildren() {
  return request('/api/parent/children');
}

export async function fetchParentLiveVehicles(childId, take = 20) {
  const childValue = Number(childId || 0);
  if (!Number.isFinite(childValue) || childValue <= 0) return [];
  const limit = Number.isFinite(Number(take)) ? Math.max(1, Math.min(100, Number(take))) : 20;
  return request(`/api/parent/live/vehicles?childId=${childValue}&take=${limit}`);
}

export async function fetchActiveRoute({ force = false } = {}) {
  return requestWithQueryCache('driver-active-route', [], () => request('/api/driver/route/active'), { force });
}

export async function fetchShiftRoute(shiftId, { force = false } = {}) {
  const value = asPositiveInt(shiftId);
  if (!value) return null;
  return requestWithQueryCache('driver-shift-route', [value], () => request(`/api/driver/shifts/${value}/route`), { force });
}

export async function startDriverShift(shiftId) {
  return postShiftAction(shiftId, 'start');
}

export async function pauseDriverShift(shiftId) {
  return postShiftAction(shiftId, 'pause');
}

export async function resumeDriverShift(shiftId) {
  return postShiftAction(shiftId, 'resume');
}

export async function completeDriverShift(shiftId) {
  return postShiftAction(shiftId, 'complete');
}

export async function markDriverStopReached(shiftId, stopId) {
  return postStopAction(shiftId, stopId, 'reached');
}

export async function skipDriverStop(shiftId, stopId) {
  return postStopAction(shiftId, stopId, 'skip');
}

export async function reopenDriverStop(shiftId, stopId) {
  return postStopAction(shiftId, stopId, 'reopen');
}

export async function undoDriverStop(shiftId, stopId) {
  return postStopAction(shiftId, stopId, 'undo');
}

export async function fetchKvkkCurrent({ force = false } = {}) {
  return requestWithQueryCache('kvkk-current', [], () => request('/api/kvkk/documents/current'), { force });
}

export async function acceptKvkkRequiredMany(items = []) {
  return request('/api/kvkk/consents/accept-many', {
    method: 'POST',
    body: Array.isArray(items) && items.length ? { items } : {},
  });
}

export async function reportSelfNoShow({ childId = null, reason = '' } = {}) {
  const body = {
    reason: String(reason || '').trim(),
  };
  const childValue = Number(childId || 0);
  if (Number.isFinite(childValue) && childValue > 0) body.childId = childValue;
  return request('/api/penalties/self/no-show', {
    method: 'POST',
    body,
  });
}

export async function submitBoardingChangeRequest({
  shiftId,
  lat,
  lng,
  kind = '',
  reason = '',
  childId = null,
  source = 'mobile',
} = {}) {
  const shiftValue = Number(shiftId || 0);
  const latValue = Number(lat);
  const lngValue = Number(lng);
  if (!Number.isFinite(shiftValue) || shiftValue <= 0) {
    throw buildNormalizedError({ code: 'SHIFT_ID_REQUIRED', fallbackMessage: 'Geçerli vardiya seçilmedi.' });
  }
  if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
    throw buildNormalizedError({ code: 'BOARDING_CHANGE_COORDS_REQUIRED', fallbackMessage: 'Konum bilgisi gerekli.' });
  }

  const body = {
    shiftId: shiftValue,
    lat: latValue,
    lng: lngValue,
    kind: String(kind || '').trim(),
    reason: String(reason || '').trim(),
    source: String(source || 'mobile').trim() || 'mobile',
  };

  const childValue = Number(childId || 0);
  if (Number.isFinite(childValue) && childValue > 0) body.childId = childValue;

  return request('/api/requests', {
    method: 'POST',
    body,
  });
}

export async function changeDriverPin(currentPin, newPin) {
  return request('/api/auth/driver/change-pin', {
    method: 'POST',
    body: { currentPin, newPin },
  });
}

export async function changePassword({ currentPassword = '', newPassword = '', confirmPassword = '' } = {}) {
  const body = {
    newPassword: String(newPassword || ''),
    confirmPassword: String(confirmPassword || ''),
  };
  const current = String(currentPassword || '');
  if (current) {
    body.currentPassword = current;
  }
  return request('/api/auth/change-password', {
    method: 'POST',
    body,
  });
}

export async function logoutDriver() {
  const session = await getSession();
  if (!session?.refreshToken) {
    clearApiQueryCache();
    return { ok: true, localOnly: true };
  }
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
  } finally {
    clearApiQueryCache();
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
