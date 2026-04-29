import { StyleSheet } from 'react-native';
import { humanizeApiError, isNetworkLikeError } from '../lib/api';
import { getDriverBackgroundRuntimeStatus } from '../lib/backgroundGps';
import { buildReleaseInfo } from '../lib/release';
import { formatGpsCoords, permissionTextFromStatus, resolveLiveLocationState } from '../lib/gps';

export const RELEASE_INFO = buildReleaseInfo();

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

const DEFAULT_KVKK = {
  blocking: false,
  loading: false,
  busy: false,
  message: '',
  requiredCount: 0,
  acceptedCount: 0,
  pendingDocKeys: [],
  lastCheckedAt: '',
  lastAcceptedAt: '',
};

const DEFAULT_NET = {
  status: 'unknown',
  message: '',
  lastOnlineAt: '',
  lastOfflineAt: '',
  lastRecoveryAt: '',
  retryCount: 0,
  nextRetryAt: '',
};

const DEFAULT_HEALTH = {
  ok: false,
  status: 'UNKNOWN',
  message: '',
};

const DEFAULT_GPS = {
  permissionStatus: 'unknown',
  permissionText: "Sürücünün telefon GPS'i için izin gerekli.",
  backgroundPermissionStatus: 'unknown',
  backgroundPermissionText: 'Arka plan GPS izni okunamadı.',
  backgroundTaskState: 'stopped',
  backgroundTaskText: 'Arka plan GPS servisi henüz devrede değil.',
  appState: 'active',
  lastBackgroundReason: '',
  lastBackgroundSyncAt: '',
  canOpenSettings: false,
  publishState: 'idle',
  publishText: 'Konum hazırlanıyor.',
  sourcePriorityText: "Resmi araç GPS'i > yerel telefon önizlemesi > önbellek",
  officialSourceKey: 'BACKEND_VEHICLE_GPS',
  officialSourceText: "Resmi araç GPS'i",
  officialCoordsText: '-',
  officialAt: '',
  officialFreshness: 'OFFLINE',
  officialFreshnessText: 'GPS yok veya bekleniyor',
  displaySourceKey: 'NONE',
  displaySourceText: 'Canlı konum bekleniyor',
  displayCoordsText: '-',
  displayAt: '',
  localPreviewText: '-',
  localPreviewAt: '',
  localPreviewKind: '',
  localPreviewShiftId: null,
  localPreviewVehicleId: null,
  lastLocationText: '-',
  shiftId: null,
  vehicleId: null,
  lastAttemptAt: '',
  lastErrorAt: '',
  lastSentAt: '',
  retryCount: 0,
  nextRetryAt: '',
};

export const initialState = {
  loading: true,
  syncing: false,
  usingCachedData: false,
  error: '',
  lastErrorAt: '',
  lastSyncAt: '',
  session: null,
  deviceId: '',
  voiceEnabled: false,
  selectedShiftId: null,
  me: null,
  today: null,
  route: null,
  health: { ...DEFAULT_HEALTH },
  net: { ...DEFAULT_NET },
  gps: { ...DEFAULT_GPS },
  kvkk: { ...DEFAULT_KVKK },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneObject(value) {
  return isPlainObject(value) ? { ...value } : null;
}

function positiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mergeGpsState(baseGps = {}, extras = {}) {
  return {
    ...DEFAULT_GPS,
    ...(isPlainObject(baseGps) ? baseGps : {}),
    ...(isPlainObject(extras) ? extras : {}),
  };
}

function mergeNetState(baseNet = {}) {
  return {
    ...DEFAULT_NET,
    ...(isPlainObject(baseNet) ? baseNet : {}),
  };
}

function mergeKvkkState(baseKvkk = {}) {
  return {
    ...DEFAULT_KVKK,
    ...(isPlainObject(baseKvkk) ? baseKvkk : {}),
    pendingDocKeys: Array.isArray(baseKvkk?.pendingDocKeys) ? [...baseKvkk.pendingDocKeys] : [...DEFAULT_KVKK.pendingDocKeys],
  };
}

export function humanize(value, fallback = 'İşlem başarısız.') {
  return humanizeApiError(value, fallback);
}

export function humanizeGpsError(value, fallback = 'GPS konumu gönderilemedi.') {
  return humanizeApiError(value, fallback);
}

export function humanizeSessionFailure(value, fallback = 'Oturum kapandı. Yeniden giriş yapın.') {
  return humanizeApiError(value, fallback);
}

export function isNetworkError(value) {
  return isNetworkLikeError(value);
}

export function backgroundPermissionTextFromStatus(permission) {
  if (!permission) return 'Arka plan GPS izni okunamadı.';
  if (permission.status === 'granted') return 'Arka plan GPS izni hazır.';
  if (permission.canAskAgain === false) return 'Arka plan GPS izni kapalı. Ayarlardan açmanız gerekiyor.';
  return 'Arka plan GPS izni gerekli.';
}

export function buildGpsRuntimeSnapshot({
  runtime = null,
  reason = '',
  options = {},
  appState = 'active',
} = {}) {
  const foregroundPermission = options.foregroundPermission ?? runtime?.foregroundPermission ?? null;
  const backgroundPermission = options.backgroundPermission ?? runtime?.backgroundPermission ?? null;
  const taskStarted = Boolean(runtime?.started);
  const canOpenSettings = Boolean(
    options.canOpenSettings ?? ((foregroundPermission?.canAskAgain === false) || (backgroundPermission?.canAskAgain === false))
  );

  return {
    permissionStatus: foregroundPermission?.status || options.permissionStatus || 'unknown',
    permissionText: permissionTextFromStatus(foregroundPermission),
    backgroundPermissionStatus: backgroundPermission?.status || 'unknown',
    backgroundPermissionText: options.backgroundPermissionText || backgroundPermissionTextFromStatus(backgroundPermission),
    backgroundTaskState: taskStarted ? 'running' : 'stopped',
    backgroundTaskText: taskStarted
      ? 'Arka plan GPS servisi kayıtlı. Ekran kapansa da yayın devam etmeli.'
      : 'Arka plan GPS servisi henüz devrede değil.',
    appState: options.appState || appState,
    lastBackgroundReason: reason || options.reason || '',
    lastBackgroundSyncAt: new Date().toISOString(),
    canOpenSettings,
  };
}

export async function readGpsRuntimeSnapshot(reason = '', options = {}, appState = 'active') {
  const runtime = await getDriverBackgroundRuntimeStatus().catch(() => null);
  return buildGpsRuntimeSnapshot({ runtime, reason, options, appState });
}

export function applyGpsRuntimeSnapshot(setState, snapshot = {}) {
  if (typeof setState !== 'function') return;
  setState((prev) => ({
    ...prev,
    gps: {
      ...prev.gps,
      ...snapshot,
    },
  }));
}

export function buildSignedInSyncArtifacts({
  state = initialState,
  routeBundle = { route: null, selectedShiftId: null },
  me = null,
  today = null,
  health = null,
  kvkkCurrent = null,
  lastSyncAt = '',
} = {}) {
  const selectedShiftId = routeBundle?.selectedShiftId ?? null;
  const nextKvkk = nextKvkkState(kvkkCurrent || me?.kvkk, state.kvkk);
  const nextNet = {
    status: 'online',
    message: state.net?.status === 'offline' ? 'Bağlantı geri geldi, bilgiler yenileniyor.' : 'Bağlantı var.',
    lastOnlineAt: lastSyncAt,
    lastOfflineAt: state.net?.lastOfflineAt || '',
    lastRecoveryAt: state.net?.status === 'offline' ? lastSyncAt : (state.net?.lastRecoveryAt || ''),
    retryCount: 0,
    nextRetryAt: '',
  };
  const nextGps = decorateGpsState({
    ...state.gps,
    shiftId: Number(selectedShiftId || state.gps?.shiftId || 0) || null,
    vehicleId: Number(routeBundle?.route?.shift?.vehicleId || routeBundle?.route?.vehicle?.id || state.gps?.vehicleId || 0) || null,
  }, routeBundle?.route, {
    usingCachedData: false,
    netStatus: nextNet.status,
    selectedShiftId,
  });

  return {
    nextKvkk,
    nextNet,
    nextGps,
    selectedShiftId,
    snapshot: buildMobileSnapshot({
      me,
      today,
      route: routeBundle?.route,
      health,
      kvkk: nextKvkk,
      net: nextNet,
      lastSyncAt,
      lastErrorAt: '',
      gps: nextGps,
      selectedShiftId,
    }),
  };
}

export function decorateGpsState(baseGps, route, { usingCachedData = false, netStatus = 'unknown', selectedShiftId = null } = {}) {
  const resolved = resolveLiveLocationState({
    route,
    gps: isPlainObject(baseGps) ? baseGps : {},
    usingCachedData,
    netStatus,
    selectedShiftId,
  });
  return {
    ...DEFAULT_GPS,
    ...(isPlainObject(baseGps) ? baseGps : {}),
    ...resolved,
  };
}

export function buildLocalPreviewSnapshot(position, target, kind = 'last-known') {
  const coordsText = formatGpsCoords(position?.coords);
  const timestamp = new Date(position?.timestamp || Date.now()).toISOString();
  return {
    localPreviewText: coordsText,
    localPreviewAt: timestamp,
    localPreviewKind: String(kind || 'last-known'),
    localPreviewShiftId: positiveInt(target?.shiftId),
    localPreviewVehicleId: positiveInt(target?.vehicleId),
  };
}

export function buildRetryMeta(retryCount = 1, baseMs = 15000, maxMs = 180000) {
  const nextCount = Math.max(1, Number(retryCount || 1));
  const baseWait = Math.max(1000, Number(baseMs || 15000));
  const cap = Math.max(baseWait, Number(maxMs || 180000));
  const waitMs = Math.min(baseWait * (2 ** (nextCount - 1)), cap);
  return {
    retryCount: nextCount,
    waitMs,
    nextRetryAt: new Date(Date.now() + waitMs).toISOString(),
  };
}

export function canRunRetryWindow(nextRetryAt, force = false) {
  if (force) return true;
  const ts = new Date(nextRetryAt || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return true;
  return Date.now() >= ts;
}

export function nextKvkkState(currentKvkk, previousKvkk = DEFAULT_KVKK, fallbackMessage = '') {
  const prev = mergeKvkkState(previousKvkk);
  const current = isPlainObject(currentKvkk) ? currentKvkk : null;

  if (!current) {
    return {
      ...prev,
      loading: false,
      busy: false,
      message: fallbackMessage || prev.message || '',
    };
  }

  const requiredCount = positiveInt(current.requiredCount) ?? prev.requiredCount ?? 0;
  const acceptedCount = positiveInt(current.acceptedCount) ?? prev.acceptedCount ?? 0;
  const blocking = current.blocking != null
    ? Boolean(current.blocking)
    : Boolean(requiredCount > 0 && acceptedCount < requiredCount);

  return {
    ...prev,
    ...current,
    loading: false,
    busy: false,
    blocking,
    requiredCount,
    acceptedCount,
    pendingDocKeys: Array.isArray(current.pendingDocKeys) ? [...current.pendingDocKeys] : [...prev.pendingDocKeys],
    lastCheckedAt: String(current.lastCheckedAt || prev.lastCheckedAt || ''),
    lastAcceptedAt: String(current.lastAcceptedAt || prev.lastAcceptedAt || ''),
    message: String(current.message || fallbackMessage || prev.message || ''),
  };
}

export function buildMobileSnapshot({
  me = null,
  today = null,
  route = null,
  health = null,
  kvkk = null,
  net = null,
  lastSyncAt = '',
  lastErrorAt = '',
  gps = null,
  selectedShiftId = null,
} = {}) {
  return {
    version: 1,
    snapshotAt: lastSyncAt || new Date().toISOString(),
    lastSyncAt: String(lastSyncAt || ''),
    lastErrorAt: String(lastErrorAt || ''),
    me: cloneObject(me),
    today: cloneObject(today),
    route: cloneObject(route),
    health: mergeStateWithDefaults(DEFAULT_HEALTH, health),
    kvkk: mergeKvkkState(kvkk),
    net: mergeNetState(net),
    gps: mergeGpsState(gps),
    selectedShiftId: positiveInt(selectedShiftId),
  };
}

function mergeStateWithDefaults(defaultState, value) {
  return {
    ...defaultState,
    ...(isPlainObject(value) ? value : {}),
  };
}

export function hydrateStateFromSnapshot(snapshot, { session = null, deviceId = '', voiceEnabled = false, selectedShiftId = null } = {}) {
  const snap = isPlainObject(snapshot) ? snapshot : {};
  return {
    ...initialState,
    ...snap,
    loading: false,
    syncing: false,
    usingCachedData: true,
    error: String(snap.error || ''),
    lastErrorAt: String(snap.lastErrorAt || ''),
    lastSyncAt: String(snap.lastSyncAt || ''),
    session: session || snap.session || null,
    deviceId: String(deviceId || snap.deviceId || ''),
    voiceEnabled: typeof voiceEnabled === 'boolean' ? voiceEnabled : Boolean(snap.voiceEnabled),
    selectedShiftId: positiveInt(selectedShiftId || snap.selectedShiftId) || null,
    me: cloneObject(snap.me),
    today: cloneObject(snap.today),
    route: cloneObject(snap.route),
    health: mergeStateWithDefaults(DEFAULT_HEALTH, snap.health),
    net: mergeNetState(snap.net),
    gps: mergeGpsState(snap.gps),
    kvkk: mergeKvkkState(snap.kvkk),
  };
}

export { DEFAULT_GPS, DEFAULT_HEALTH, DEFAULT_KVKK, DEFAULT_NET };
