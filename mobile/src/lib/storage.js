import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'ps.driver.session.v1';
const DEVICE_KEY = 'ps.driver.device-id.v1';
const VOICE_ENABLED_KEY = 'ps.driver.voice-enabled.v1';
const SNAPSHOT_KEY = 'ps.driver.mobile-snapshot.v1';
const SELECTED_SHIFT_KEY = 'ps.driver.selected-shift-id.v1';
const PENDING_SESSION_EVENT_KEY = 'ps.driver.pending-session-event.v1';

export async function getSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session || {}));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getDeviceId() {
  return (await SecureStore.getItemAsync(DEVICE_KEY)) || '';
}

export async function saveDeviceId(deviceId) {
  await SecureStore.setItemAsync(DEVICE_KEY, String(deviceId || ''));
}

export async function getVoiceGuidanceEnabled() {
  return (await SecureStore.getItemAsync(VOICE_ENABLED_KEY)) === '1';
}

export async function saveVoiceGuidanceEnabled(enabled) {
  await SecureStore.setItemAsync(VOICE_ENABLED_KEY, enabled ? '1' : '0');
}

async function readJson(key) {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(key, value) {
  await SecureStore.setItemAsync(key, JSON.stringify(value || {}));
}

export async function getLastMobileSnapshot() {
  return readJson(SNAPSHOT_KEY);
}

export async function saveLastMobileSnapshot(snapshot) {
  await writeJson(SNAPSHOT_KEY, snapshot || {});
}

export async function clearLastMobileSnapshot() {
  await SecureStore.deleteItemAsync(SNAPSHOT_KEY);
}

export async function getSelectedShiftId() {
  const raw = await SecureStore.getItemAsync(SELECTED_SHIFT_KEY);
  const value = Number(raw || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function saveSelectedShiftId(shiftId) {
  const value = Number(shiftId || 0);
  if (!Number.isFinite(value) || value <= 0) {
    await SecureStore.deleteItemAsync(SELECTED_SHIFT_KEY);
    return;
  }
  await SecureStore.setItemAsync(SELECTED_SHIFT_KEY, String(value));
}

export async function clearSelectedShiftId() {
  await SecureStore.deleteItemAsync(SELECTED_SHIFT_KEY);
}

export async function getPendingSessionEvent() {
  return readJson(PENDING_SESSION_EVENT_KEY);
}

export async function savePendingSessionEvent(event) {
  await writeJson(PENDING_SESSION_EVENT_KEY, {
    type: 'SESSION_FAILURE',
    at: new Date().toISOString(),
    ...(event || {}),
  });
}

export async function clearPendingSessionEvent() {
  await SecureStore.deleteItemAsync(PENDING_SESSION_EVENT_KEY);
}
