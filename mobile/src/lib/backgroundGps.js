import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { fetchActiveRoute, fetchToday, publishGps } from './api';
import { buildGpsPayload, GPS_PUBLISH_INTERVAL_MS, resolveGpsPublishTarget } from './gps';
import { getVoiceGuidanceEnabled } from './storage';
import { speakReachedStopAndNext, speakRouteCompleted } from './voice';

export const DRIVER_BG_LOCATION_TASK = 'ps-driver-bg-location';
const DRIVER_BG_DISTANCE_INTERVAL_M = 20;

export function deriveRouteTransition(prevRoute, nextRoute) {
  const previousStop = prevRoute?.nextStop || null;
  if (!previousStop?.id) return null;

  const nextStop = nextRoute?.nextStop || null;
  const prevId = String(previousStop.id || '');
  const nextId = String(nextStop?.id || '');
  const prevReached = Number(prevRoute?.progress?.lastReachedOrder || 0) || 0;
  const nextReached = Number(nextRoute?.progress?.lastReachedOrder || 0) || 0;
  const previousOrder = Number(previousStop?.order || 0) || 0;

  if (Boolean(nextRoute?.progress?.completed) && !nextStop) {
    return { type: 'complete', reachedStop: previousStop, nextStop: null };
  }

  if (nextReached > prevReached && previousOrder && nextReached >= previousOrder) {
    return { type: 'reached', reachedStop: previousStop, nextStop };
  }

  if (prevId && nextId && prevId !== nextId) {
    return { type: 'reached', reachedStop: previousStop, nextStop };
  }

  return null;
}

async function isTaskAvailable() {
  return TaskManager.isAvailableAsync().catch(() => false);
}

export async function stopDriverBackgroundLocation() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_LOCATION_TASK).catch(() => false);
  if (!started) return false;
  await Location.stopLocationUpdatesAsync(DRIVER_BG_LOCATION_TASK).catch(() => null);
  return true;
}

export async function syncDriverBackgroundLocation({
  sessionToken,
  role,
  requirePinChange,
  today,
  route,
  kvkkBlocking,
  requestPermission = false,
  appState = 'active',
} = {}) {
  const taskAvailable = await isTaskAvailable();
  const isDriver = String(role || '').toUpperCase() === 'DRIVER';
  const backgroundPreferred = String(appState || 'active') !== 'active';
  const target = resolveGpsPublishTarget(today, route);

  const canRun = Boolean(
    taskAvailable &&
    sessionToken &&
    isDriver &&
    !requirePinChange &&
    !kvkkBlocking &&
    backgroundPreferred &&
    target.activeShift &&
    target.vehicleId &&
    target.canPublish
  );

  if (!canRun) {
    await stopDriverBackgroundLocation();
    return { started: false, reason: 'not-eligible', target };
  }

  const foreground = requestPermission
    ? await Location.requestForegroundPermissionsAsync().catch(() => null)
    : await Location.getForegroundPermissionsAsync().catch(() => null);

  if (!foreground || foreground.status !== 'granted') {
    await stopDriverBackgroundLocation();
    return { started: false, reason: 'foreground-permission', target, permission: foreground };
  }

  const background = requestPermission
    ? await Location.requestBackgroundPermissionsAsync().catch(() => null)
    : await Location.getBackgroundPermissionsAsync().catch(() => null);

  if (!background || background.status !== 'granted') {
    await stopDriverBackgroundLocation();
    return { started: false, reason: 'background-permission', target, permission: background };
  }

  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_BG_LOCATION_TASK).catch(() => false);
  if (!started) {
    await Location.startLocationUpdatesAsync(DRIVER_BG_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: GPS_PUBLISH_INTERVAL_MS,
      distanceInterval: DRIVER_BG_DISTANCE_INTERVAL_M,
      deferredUpdatesDistance: 0,
      deferredUpdatesInterval: 0,
      mayShowUserSettingsDialog: false,
      foregroundService: {
        notificationTitle: 'Personel Servis GPS acik',
        notificationBody: "Surucunun telefon GPS'i vardiya sirasinda arka planda konum gonderiyor.",
        notificationColor: '#0f172a',
        killServiceOnDestroy: false,
      },
    });
  }

  return { started: true, reason: 'running', target };
}

if (!TaskManager.isTaskDefined(DRIVER_BG_LOCATION_TASK)) {
  TaskManager.defineTask(DRIVER_BG_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;

    const locations = Array.isArray(data?.locations) ? data.locations : [];
    const latest = locations[locations.length - 1] || null;
    if (!latest?.coords) return;

    try {
      const [today, previousRoute] = await Promise.all([
        fetchToday().catch(() => null),
        fetchActiveRoute().catch(() => null),
      ]);

      const target = resolveGpsPublishTarget(today, previousRoute);
      if (!target.activeShift || !target.vehicleId || !target.canPublish) return;

      await publishGps(buildGpsPayload(latest, target.vehicleId));

      const nextRoute = await fetchActiveRoute().catch(() => null);
      const voiceEnabled = await getVoiceGuidanceEnabled().catch(() => false);
      const transition = voiceEnabled ? deriveRouteTransition(previousRoute, nextRoute) : null;

      if (transition?.type === 'complete') {
        speakRouteCompleted();
      } else if (transition?.type === 'reached') {
        speakReachedStopAndNext(transition.reachedStop, nextRoute);
      }
    } catch (taskError) {
      console.log('driver background gps task error', String(taskError?.message || taskError || 'unknown'));
    }
  });
}
