export const GPS_STATUS = {
  LIVE: "LIVE",
  STALE: "STALE",
  OFFLINE: "OFFLINE",
};

export function gpsAgeSec(atIso, nowMs = Date.now()) {
  if (!atIso) return null;
  const t = new Date(atIso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 1000));
}

// Standart kural (tek yer):
// LIVE   : ageSec <= 20
// STALE  : 20 < ageSec <= 300
// OFFLINE: ageSec > 300  veya at yok/bozuk
export function gpsStatusFromAt(atIso, opts = {}) {
  const liveSec = opts.liveSec ?? 20;
  const offlineSec = opts.offlineSec ?? 300;

  const ageSec = gpsAgeSec(atIso);
  if (ageSec == null) return { status: GPS_STATUS.OFFLINE, ageSec: null };

  if (ageSec <= liveSec) return { status: GPS_STATUS.LIVE, ageSec };
  if (ageSec <= offlineSec) return { status: GPS_STATUS.STALE, ageSec };

  return { status: GPS_STATUS.OFFLINE, ageSec };
}

// DB’den eski "ONLINE" vs gelirse normalize et
export function normalizeGpsStatus(s) {
  const x = String(s || "").toUpperCase();
  if (x === "ONLINE") return GPS_STATUS.LIVE;
  if (x === "LIVE" || x === "STALE" || x === "OFFLINE") return x;
  return GPS_STATUS.OFFLINE;
}

