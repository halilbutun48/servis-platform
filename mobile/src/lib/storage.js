import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'ps.driver.session.v1';
const DEVICE_KEY = 'ps.driver.device-id.v1';
const VOICE_ENABLED_KEY = 'ps.driver.voice-enabled.v1';

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
