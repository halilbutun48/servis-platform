import { StyleSheet } from 'react-native';
import { buildDriverAvailabilityState } from './driverAvailabilityState';
import { buildDriverAwarenessState } from './driverAwarenessState';
import { buildBoardingChangeState } from './boardingChangeState';
import { buildNotificationCenterState } from './notificationState';
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
  backgroundTaskAvailable: false,
  backgroundTaskAvailableText: 'Arka plan GPS görevi henüz doğrulanmadı.',
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
  selectedChildId: null,
  driverAvailability: buildDriverAvailabilityState(),
  driverAwareness: buildDriverAwarenessState(),
  boardingChange: buildBoardingChangeState(),
  notifications: buildNotificationCenterState(),
  me: null,
  today: null,
  route: null,
  roleLive: null,
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

function compactShift(value) {
  return isPlainObject(value)
    ? {
        id: positiveInt(value.id),
        status: String(value.status || ''),
        startAt: String(value.startAt || ''),
        endAt: String(value.endAt || ''),
        vehicleId: positiveInt(value.vehicleId),
      }
    : null;
}

function compactStop(value) {
  return isPlainObject(value)
    ? {
        id: positiveInt(value.id),
        name: String(value.name || ''),
        order: positiveInt(value.order),
        state: String(value.state || ''),
        passengerCount: positiveInt(value.passengerCount),
        remainingKm: value.remainingKm != null ? Number(value.remainingKm) : null,
        etaMin: value.etaMin != null ? Number(value.etaMin) : null,
        lat: value.lat != null ? Number(value.lat) : null,
        lng: value.lng != null ? Number(value.lng) : null,
        reachedAt: String(value.reachedAt || ''),
        skippedAt: String(value.skippedAt || ''),
      }
    : null;
}

function compactSummary(value, keys = []) {
  if (!isPlainObject(value)) return null;
  const next = {};
  for (const key of keys) {
    if (value[key] != null) next[key] = value[key];
  }
  return Object.keys(next).length ? next : null;
}

function compactNotificationItem(value) {
  return isPlainObject(value)
    ? {
        id: positiveInt(value.id),
        type: String(value.type || ''),
        scope: String(value.scope || ''),
        scopeLabel: String(value.scopeLabel || ''),
        title: String(value.title || ''),
        message: String(value.message || ''),
        createdAt: String(value.createdAt || ''),
        dedupeKey: String(value.dedupeKey || ''),
        intentLabel: String(value.intentLabel || ''),
        tone: String(value.tone || ''),
        read: Boolean(value.read),
        statusText: String(value.statusText || ''),
      }
    : null;
}

function compactDriverAwarenessItem(value) {
  return isPlainObject(value)
    ? {
        id: positiveInt(value.id),
        type: String(value.type || ''),
        scope: String(value.scope || ''),
        title: String(value.title || ''),
        message: String(value.message || ''),
        kind: String(value.kind || ''),
        createdAt: String(value.createdAt || ''),
        spokenText: String(value.spokenText || ''),
        summary: String(value.summary || ''),
        tone: String(value.tone || ''),
      }
    : null;
}

function compactBoardingChangeItem(value) {
  return isPlainObject(value)
    ? {
        id: String(value.id || ''),
        kind: String(value.kind || ''),
        role: String(value.role || ''),
        label: String(value.label || ''),
        description: String(value.description || ''),
        tone: String(value.tone || ''),
        scopeText: String(value.scopeText || ''),
        statusText: String(value.statusText || ''),
        reason: String(value.reason || ''),
        childId: positiveInt(value.childId),
        shiftId: positiveInt(value.shiftId),
        source: String(value.source || ''),
        createdAt: String(value.createdAt || ''),
        updatedAt: String(value.updatedAt || ''),
      }
    : null;
}

function compactArray(value, mapper, limit = 2) {
  return Array.isArray(value)
    ? value.slice(0, limit).map((item) => mapper(item)).filter(Boolean)
    : [];
}

function compactMobileSnapshot(snapshot = {}) {
  if (!isPlainObject(snapshot)) return {};

  const next = {
    version: Number(snapshot.version || 1) || 1,
    snapshotAt: String(snapshot.snapshotAt || ''),
    lastSyncAt: String(snapshot.lastSyncAt || ''),
    lastErrorAt: String(snapshot.lastErrorAt || ''),
    me: compactSummary(snapshot.me, ['id', 'role', 'fullName', 'requirePinChange']),
    today: isPlainObject(snapshot.today)
      ? {
          active: compactShift(snapshot.today.active),
          assigned: compactShift(snapshot.today.assigned),
          summary: compactSummary(snapshot.today.summary, ['totalShifts', 'activeShifts', 'approvedShifts', 'pendingShifts']),
          today: compactArray(snapshot.today.today, compactShift, 1),
          tomorrow: compactArray(snapshot.today.tomorrow, compactShift, 1),
          upcoming: compactArray(snapshot.today.upcoming, compactShift, 1),
        }
      : null,
    route: isPlainObject(snapshot.route)
      ? {
          shift: compactShift(snapshot.route.shift),
          summary: compactSummary(snapshot.route.summary, ['totalStops', 'totalPassengers', 'remainingRouteEtaMin', 'remainingKm', 'remainingStops', 'remainingPassengers', 'lastReachedOrder', 'completed', 'paused']),
          progress: compactSummary(snapshot.route.progress, ['completed', 'pausedAt', 'lastReachedOrder']),
          nextStop: compactStop(snapshot.route.nextStop),
          orderedStops: compactArray(snapshot.route.orderedStops, compactStop, 2),
          vehicle: compactSummary(snapshot.route.vehicle, ['id', 'plate']),
          last: compactSummary(snapshot.route.last, ['id', 'plate']),
          mode: String(snapshot.route.mode || ''),
          remainingRouteEtaMin: snapshot.route.remainingRouteEtaMin ?? null,
          remainingKm: snapshot.route.remainingKm ?? null,
          remainingStops: snapshot.route.remainingStops ?? null,
          remainingPassengers: snapshot.route.remainingPassengers ?? null,
        }
      : null,
    roleLive: isPlainObject(snapshot.roleLive)
      ? {
          kind: String(snapshot.roleLive.kind || ''),
          loading: Boolean(snapshot.roleLive.loading),
          error: String(snapshot.roleLive.error || ''),
          blocked: Boolean(snapshot.roleLive.blocked),
          lastSyncAt: String(snapshot.roleLive.lastSyncAt || ''),
          netStatus: String(snapshot.roleLive.netStatus || ''),
          selectedShiftId: positiveInt(snapshot.roleLive.selectedShiftId),
          selectedChildId: positiveInt(snapshot.roleLive.selectedChildId),
          current: isPlainObject(snapshot.roleLive.current)
            ? {
                shiftId: positiveInt(snapshot.roleLive.current.shiftId),
                shiftStatus: String(snapshot.roleLive.current.shiftStatus || ''),
                roomName: String(snapshot.roleLive.current.roomName || ''),
                driverName: String(snapshot.roleLive.current.driverName || ''),
                vehiclePlate: String(snapshot.roleLive.current.vehiclePlate || ''),
                nextStop: compactStop(snapshot.roleLive.current.nextStop),
                remainingStops: positiveInt(snapshot.roleLive.current.remainingStops),
                remainingPassengers: positiveInt(snapshot.roleLive.current.remainingPassengers),
                remainingKm: snapshot.roleLive.current.remainingKm != null ? Number(snapshot.roleLive.current.remainingKm) : null,
                etaMin: snapshot.roleLive.current.etaMin != null ? Number(snapshot.roleLive.current.etaMin) : null,
                gpsStatus: String(snapshot.roleLive.current.gpsStatus || ''),
                gpsAt: String(snapshot.roleLive.current.gpsAt || ''),
                primaryText: String(snapshot.roleLive.current.primaryText || ''),
                secondaryText: String(snapshot.roleLive.current.secondaryText || ''),
                statusText: String(snapshot.roleLive.current.statusText || ''),
                childId: positiveInt(snapshot.roleLive.current.childId),
                childName: String(snapshot.roleLive.current.childName || ''),
                companyName: String(snapshot.roleLive.current.companyName || ''),
                childStopReached: Boolean(snapshot.roleLive.current.childStopReached),
              }
            : null,
          summary: compactSummary(snapshot.roleLive.summary, ['totalShifts', 'activeShifts', 'liveVehicles', 'totalChildren', 'consentBlocked']),
        }
      : null,
    health: mergeStateWithDefaults(DEFAULT_HEALTH, snapshot.health),
    kvkk: mergeKvkkState(snapshot.kvkk),
    net: mergeNetState(snapshot.net),
    gps: mergeGpsState(snapshot.gps),
    selectedShiftId: positiveInt(snapshot.selectedShiftId),
    selectedChildId: positiveInt(snapshot.selectedChildId),
    driverAvailability: buildDriverAvailabilityState(snapshot.driverAvailability),
    driverAwareness: isPlainObject(snapshot.driverAwareness)
      ? {
          items: compactArray(snapshot.driverAwareness.items, compactDriverAwarenessItem, 1),
          latestRelevant: compactDriverAwarenessItem(snapshot.driverAwareness.latestRelevant),
          latestRelevantId: positiveInt(snapshot.driverAwareness.latestRelevantId),
          unreadCount: positiveInt(snapshot.driverAwareness.unreadCount) || 0,
          hasUnread: Boolean(snapshot.driverAwareness.hasUnread),
          lastSeenNotificationId: positiveInt(snapshot.driverAwareness.lastSeenNotificationId),
          lastAnnouncedNotificationId: positiveInt(snapshot.driverAwareness.lastAnnouncedNotificationId),
          lastSeenAt: String(snapshot.driverAwareness.lastSeenAt || ''),
          lastAnnouncedAt: String(snapshot.driverAwareness.lastAnnouncedAt || ''),
          lastFetchedAt: String(snapshot.driverAwareness.lastFetchedAt || ''),
          updatedAt: String(snapshot.driverAwareness.updatedAt || ''),
        }
      : buildDriverAwarenessState(),
    notifications: isPlainObject(snapshot.notifications)
      ? {
          role: String(snapshot.notifications.role || 'DEFAULT'),
          title: String(snapshot.notifications.title || ''),
          subtitle: String(snapshot.notifications.subtitle || ''),
          emptyTitle: String(snapshot.notifications.emptyTitle || ''),
          emptyText: String(snapshot.notifications.emptyText || ''),
          actionLabel: String(snapshot.notifications.actionLabel || ''),
          summary: String(snapshot.notifications.summary || ''),
          surfaceLabel: String(snapshot.notifications.surfaceLabel || ''),
          surfaceHint: String(snapshot.notifications.surfaceHint || ''),
          items: compactArray(snapshot.notifications.items, compactNotificationItem, 1),
          unreadItems: [],
          unreadCount: positiveInt(snapshot.notifications.unreadCount) || 0,
          hasUnread: Boolean(snapshot.notifications.hasUnread),
          latestRelevant: compactNotificationItem(snapshot.notifications.latestRelevant),
          lastSeenNotificationId: positiveInt(snapshot.notifications.lastSeenNotificationId),
          lastSeenAt: String(snapshot.notifications.lastSeenAt || ''),
          lastFetchedAt: String(snapshot.notifications.lastFetchedAt || ''),
        }
      : buildNotificationCenterState(),
    boardingChange: isPlainObject(snapshot.boardingChange)
      ? {
          items: compactArray(snapshot.boardingChange.items, compactBoardingChangeItem, 1),
          lastSubmittedAt: String(snapshot.boardingChange.lastSubmittedAt || ''),
          lastKind: String(snapshot.boardingChange.lastKind || ''),
          lastLabel: String(snapshot.boardingChange.lastLabel || ''),
          lastRole: String(snapshot.boardingChange.lastRole || ''),
          lastStatusText: String(snapshot.boardingChange.lastStatusText || ''),
          lastScopeText: String(snapshot.boardingChange.lastScopeText || ''),
          lastError: String(snapshot.boardingChange.lastError || ''),
          backendRequestId: positiveInt(snapshot.boardingChange.backendRequestId),
          backendStatus: String(snapshot.boardingChange.backendStatus || ''),
          backendDecisionState: String(snapshot.boardingChange.backendDecisionState || ''),
          backendDecisionText: String(snapshot.boardingChange.backendDecisionText || ''),
          backendSyncedAt: String(snapshot.boardingChange.backendSyncedAt || ''),
          loading: Boolean(snapshot.boardingChange.loading),
          updatedAt: String(snapshot.boardingChange.updatedAt || ''),
        }
      : buildBoardingChangeState(),
  };

  const serialized = JSON.stringify(next);
  if (serialized.length <= 1800) return next;

  return {
    version: next.version,
    snapshotAt: next.snapshotAt,
    lastSyncAt: next.lastSyncAt,
    lastErrorAt: next.lastErrorAt,
    me: next.me,
    today: next.today ? {
      active: next.today.active,
      assigned: next.today.assigned,
      summary: next.today.summary,
    } : null,
    route: next.route ? {
      shift: next.route.shift,
      summary: next.route.summary,
      progress: next.route.progress,
      nextStop: next.route.nextStop,
    } : null,
    roleLive: next.roleLive ? {
      kind: next.roleLive.kind,
      loading: next.roleLive.loading,
      error: next.roleLive.error,
      blocked: next.roleLive.blocked,
      lastSyncAt: next.roleLive.lastSyncAt,
      netStatus: next.roleLive.netStatus,
      selectedShiftId: next.roleLive.selectedShiftId,
      selectedChildId: next.roleLive.selectedChildId,
      current: next.roleLive.current ? {
        shiftId: next.roleLive.current.shiftId,
        shiftStatus: next.roleLive.current.shiftStatus,
        roomName: next.roleLive.current.roomName,
        driverName: next.roleLive.current.driverName,
        vehiclePlate: next.roleLive.current.vehiclePlate,
        nextStop: next.roleLive.current.nextStop,
        remainingStops: next.roleLive.current.remainingStops,
        remainingPassengers: next.roleLive.current.remainingPassengers,
        remainingKm: next.roleLive.current.remainingKm,
        etaMin: next.roleLive.current.etaMin,
        gpsStatus: next.roleLive.current.gpsStatus,
        gpsAt: next.roleLive.current.gpsAt,
        primaryText: next.roleLive.current.primaryText,
        secondaryText: next.roleLive.current.secondaryText,
        statusText: next.roleLive.current.statusText,
        childId: next.roleLive.current.childId,
        childName: next.roleLive.current.childName,
        companyName: next.roleLive.current.companyName,
        childStopReached: next.roleLive.current.childStopReached,
      } : null,
      summary: next.roleLive.summary,
    } : null,
    health: next.health,
    kvkk: next.kvkk,
    net: next.net,
    gps: next.gps,
    selectedShiftId: next.selectedShiftId,
    selectedChildId: next.selectedChildId,
    driverAvailability: next.driverAvailability,
    driverAwareness: next.driverAwareness ? {
      ...next.driverAwareness,
      items: [],
    } : buildDriverAwarenessState(),
    notifications: next.notifications ? {
      role: next.notifications.role,
      title: next.notifications.title,
      subtitle: next.notifications.subtitle,
      emptyTitle: next.notifications.emptyTitle,
      emptyText: next.notifications.emptyText,
      actionLabel: next.notifications.actionLabel,
      summary: next.notifications.summary,
      surfaceLabel: next.notifications.surfaceLabel,
      surfaceHint: next.notifications.surfaceHint,
      items: [],
      unreadItems: [],
      unreadCount: next.notifications.unreadCount,
      hasUnread: next.notifications.hasUnread,
      latestRelevant: next.notifications.latestRelevant,
      lastSeenNotificationId: next.notifications.lastSeenNotificationId,
      lastSeenAt: next.notifications.lastSeenAt,
      lastFetchedAt: next.notifications.lastFetchedAt,
    } : buildNotificationCenterState(),
    boardingChange: next.boardingChange ? {
      ...next.boardingChange,
      items: [],
    } : buildBoardingChangeState(),
  };
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
  const taskAvailable = runtime?.taskAvailable !== false;
  const canOpenSettings = Boolean(
    options.canOpenSettings ?? ((foregroundPermission?.canAskAgain === false) || (backgroundPermission?.canAskAgain === false))
  );

  return {
    permissionStatus: foregroundPermission?.status || options.permissionStatus || 'unknown',
    permissionText: permissionTextFromStatus(foregroundPermission),
    backgroundPermissionStatus: backgroundPermission?.status || 'unknown',
    backgroundPermissionText: options.backgroundPermissionText || backgroundPermissionTextFromStatus(backgroundPermission),
    backgroundTaskAvailable: taskAvailable,
    backgroundTaskAvailableText: taskAvailable
      ? 'Arka plan GPS görevi bu cihazda destekleniyor.'
      : 'Arka plan GPS görevi bu cihazda desteklenmiyor.',
    backgroundTaskState: taskStarted ? 'running' : 'stopped',
    backgroundTaskText: taskStarted
      ? 'Arka plan GPS servisi kayıtlı. Ekran kapansa da yayın devam etmeli.'
      : (taskAvailable
        ? 'Arka plan GPS servisi henüz devrede değil.'
        : 'Arka plan GPS görevi bu cihazda desteklenmiyor.'),
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
  driverAwareness = null,
  notifications = null,
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
      roleLive: state.roleLive,
      health,
      kvkk: nextKvkk,
      net: nextNet,
      lastSyncAt,
      lastErrorAt: '',
      gps: nextGps,
      selectedShiftId,
      selectedChildId: state.selectedChildId,
      driverAvailability: state.driverAvailability,
      driverAwareness,
      notifications,
      boardingChange: state.boardingChange,
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
  roleLive = null,
  health = null,
  kvkk = null,
  net = null,
  lastSyncAt = '',
  lastErrorAt = '',
  gps = null,
  selectedShiftId = null,
  selectedChildId = null,
  driverAvailability = null,
  driverAwareness = null,
  notifications = null,
  boardingChange = null,
} = {}) {
  return compactMobileSnapshot({
    version: 1,
    snapshotAt: lastSyncAt || new Date().toISOString(),
    lastSyncAt: String(lastSyncAt || ''),
    lastErrorAt: String(lastErrorAt || ''),
    me: cloneObject(me),
    today: cloneObject(today),
    route: cloneObject(route),
    roleLive: cloneObject(roleLive),
    health: mergeStateWithDefaults(DEFAULT_HEALTH, health),
    kvkk: mergeKvkkState(kvkk),
    net: mergeNetState(net),
    gps: mergeGpsState(gps),
    selectedShiftId: positiveInt(selectedShiftId),
    selectedChildId: positiveInt(selectedChildId),
    driverAvailability: buildDriverAvailabilityState(driverAvailability),
    driverAwareness: buildDriverAwarenessState(driverAwareness),
    notifications: buildNotificationCenterState(notifications),
    boardingChange: buildBoardingChangeState(boardingChange),
  });
}

function mergeStateWithDefaults(defaultState, value) {
  return {
    ...defaultState,
    ...(isPlainObject(value) ? value : {}),
  };
}

export function hydrateStateFromSnapshot(snapshot, { session = null, deviceId = '', voiceEnabled = false, selectedShiftId = null, selectedChildId = null } = {}) {
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
    selectedChildId: positiveInt(selectedChildId || snap.selectedChildId) || null,
    driverAvailability: buildDriverAvailabilityState(snap.driverAvailability),
    driverAwareness: buildDriverAwarenessState(snap.driverAwareness),
    notifications: buildNotificationCenterState(snap.notifications),
    boardingChange: buildBoardingChangeState(snap.boardingChange),
    me: cloneObject(snap.me),
    today: cloneObject(snap.today),
    route: cloneObject(snap.route),
    roleLive: cloneObject(snap.roleLive),
    health: mergeStateWithDefaults(DEFAULT_HEALTH, snap.health),
    net: mergeNetState(snap.net),
    gps: mergeGpsState(snap.gps),
    kvkk: mergeKvkkState(snap.kvkk),
  };
}

export { DEFAULT_GPS, DEFAULT_HEALTH, DEFAULT_KVKK, DEFAULT_NET };
