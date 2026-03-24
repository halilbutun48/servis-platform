import * as Speech from 'expo-speech';

function fmtTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  } catch {
    return '';
  }
}

function passengerLine(count) {
  const n = Math.max(0, Number(count || 0));
  if (!n) return 'Bu durakta yolcu bilgisi henüz yok.';
  if (n === 1) return 'Bu durakta 1 yolcu alınacak.';
  return `Bu durakta ${n} yolcu alınacak.`;
}

function etaDistanceLine(stop) {
  const parts = [];
  if (stop?.remainingKm != null) parts.push(`${stop.remainingKm} kilometre`);
  if (stop?.etaMin != null) parts.push(`yaklaşık ${stop.etaMin} dakika`);
  if (!parts.length) return 'Yaklaşık varış bilgisi henüz yok.';
  return `${parts.join(', ')} kaldı.`;
}

function welcomeLine(today, route) {
  const shift = today?.active || today?.assigned || today?.today?.[0] || today?.tomorrow?.[0] || today?.upcoming?.[0] || route?.shift || null;
  const start = fmtTime(shift?.startAt);
  const end = fmtTime(shift?.endAt);
  const totalStops = Math.max(0, Number(route?.summary?.totalStops || route?.orderedStops?.length || 0));
  const totalPassengers = Math.max(0, Number(route?.summary?.totalPassengers || 0));
  const nextStop = route?.nextStop || null;
  const nextName = String(nextStop?.name || 'ilk durak');

  const pieces = ['Sesli yardıma hoş geldiniz.'];
  if (start || end) {
    pieces.push(`Bugünkü vardiyanız ${start || '-'}${end ? ` ile ${end}` : ''} arasında.`);
  }
  if (totalPassengers || totalStops) {
    pieces.push(`Bu rotada ${totalPassengers} yolcu ve ${totalStops} durak var.`);
  }
  if (nextStop) {
    pieces.push(`İlk durak ${nextName}. ${etaDistanceLine(nextStop)}`);
    pieces.push(passengerLine(nextStop?.passengerCount));
  }
  return pieces.join(' ');
}

function nextStopLine(route) {
  const nextStop = route?.nextStop || null;
  if (!nextStop) return 'Sıradaki durak bilgisi henüz yok.';
  const name = String(nextStop.name || 'isimsiz durak');
  return `Sıradaki durak ${name}. ${etaDistanceLine(nextStop)} ${passengerLine(nextStop?.passengerCount)}`;
}

function etaLine(route) {
  const nextStop = route?.nextStop || null;
  if (!nextStop) return 'Durak ETA bilgisi henüz yok.';
  const name = String(nextStop.name || 'isimsiz durak');
  return `${name} için ${etaDistanceLine(nextStop)} ${passengerLine(nextStop?.passengerCount)}`;
}

function completionLine() {
  return 'Güzergâh tamamlandı. İyi günler.';
}

function speak(text) {
  stopVoiceGuidance();
  Speech.speak(text, {
    language: 'tr-TR',
    pitch: 1.0,
    rate: 0.92,
  });
}

export function stopVoiceGuidance() {
  try {
    Speech.stop();
  } catch {
    // ignore speech stop errors
  }
}

export function speakShiftWelcome(today, route) {
  speak(welcomeLine(today, route));
}

export function speakNextStop(route) {
  speak(nextStopLine(route));
}

export function speakStopEta(route) {
  speak(etaLine(route));
}

export function speakRouteCompleted() {
  speak(completionLine());
}

export function buildVoiceCueKey(route) {
  const shiftId = Number(route?.shift?.id || 0) || 0;
  if (route?.progress?.completed) return `done:${shiftId}`;
  if (!route?.nextStop?.id) return '';
  const etaBucket = route?.nextStop?.etaMin == null ? 'na' : Math.max(0, Math.floor(Number(route.nextStop.etaMin) / 2));
  return `${shiftId}:${route.nextStop.id}:${route?.progress?.lastReachedOrder || 0}:${etaBucket}`;
}

export function buildVoiceWelcomeKey(today, route) {
  const shift = today?.active || today?.assigned || today?.today?.[0] || today?.tomorrow?.[0] || today?.upcoming?.[0] || route?.shift || null;
  if (!shift?.id) return '';
  return `${shift.id}:${shift.startAt || ''}:${shift.endAt || ''}`;
}

export function buildCompletionCueKey(route) {
  const shiftId = Number(route?.shift?.id || 0) || 0;
  return route?.progress?.completed ? `complete:${shiftId}` : '';
}
