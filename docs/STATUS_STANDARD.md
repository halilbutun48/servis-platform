Eşik önerisi (net ve basit):

LIVE : ageSec <= 30

STALE : 30 < ageSec <= 300 (5 dk)

OFFLINE: ageSec > 300 veya last yok

UI + backend aynı hesaplarsa “aynı renk/aynı badge” garanti olur.

// shared/status.js (web) veya backend/src/status.js (backend)
export const GPS_LIVE_SEC = 30;
export const GPS_OFFLINE_SEC = 300;


export function statusFromAgeSec(ageSec) {
  if (ageSec == null) return "OFFLINE";
  if (ageSec <= GPS_LIVE_SEC) return "LIVE";
  if (ageSec <= GPS_OFFLINE_SEC) return "STALE";
  return "OFFLINE";
}


export function ageSecFromIso(at) {
  if (!at) return null;
  const ms = Date.now() - new Date(at).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 1000));
}

Badge sınıf standardı (map marker + list):

badge badge--live

badge badge--stale

badge badge--offline

Renkleri CSS’te tek yerden yönet: hem listede hem marker’da aynı class.
