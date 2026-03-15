import * as Speech from 'expo-speech';

function nextStopLine(nextStop) {
  if (!nextStop) return 'Siradaki durak bilgisi henuz yok.';
  const name = String(nextStop.name || 'isimsiz durak');
  const eta = nextStop.etaMin != null ? `${nextStop.etaMin} dakika` : 'ETA henuz yok';
  return `Siradaki durak ${name}. Yaklasik varis ${eta}.`;
}

function etaLine(nextStop) {
  if (!nextStop) return 'Durak ETA bilgisi henuz yok.';
  const name = String(nextStop.name || 'isimsiz durak');
  const eta = nextStop.etaMin != null ? `${nextStop.etaMin} dakika` : 'ETA henuz yok';
  const remaining = nextStop.remainingKm != null ? `${nextStop.remainingKm} kilometre` : 'kalan mesafe yok';
  return `${name} icin tahmini varis ${eta}. Kalan mesafe ${remaining}.`;
}

export function stopVoiceGuidance() {
  try {
    Speech.stop();
  } catch {
    // ignore speech stop errors
  }
}

export function speakNextStop(nextStop) {
  stopVoiceGuidance();
  Speech.speak(nextStopLine(nextStop), {
    language: 'tr-TR',
    pitch: 1.0,
    rate: 0.95,
  });
}

export function speakStopEta(nextStop) {
  stopVoiceGuidance();
  Speech.speak(etaLine(nextStop), {
    language: 'tr-TR',
    pitch: 1.0,
    rate: 0.95,
  });
}

export function buildVoiceCueKey(nextStop) {
  if (!nextStop?.id) return '';
  const etaBucket = nextStop?.etaMin == null ? 'na' : Math.max(0, Math.floor(Number(nextStop.etaMin) / 2));
  return `${nextStop.id}:${etaBucket}`;
}
