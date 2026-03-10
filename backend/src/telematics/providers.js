function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickTs(...values) {
  for (const v of values) {
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function normalizeDirectPush(body = {}) {
  const lat = toNum(body.lat);
  const lng = toNum(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const e = new Error("lat/lng required");
    e.status = 400;
    throw e;
  }
  return {
    vehicleId: body.vehicleId != null ? Number(body.vehicleId) : null,
    serial: body.serial ? String(body.serial).trim() : null,
    at: pickTs(body.at, body.ts),
    lat,
    lng,
    speed: toNum(body.speed),
    heading: toNum(body.heading ?? body.course),
    accuracy: toNum(body.accuracy),
    provider: "direct",
    source: "DEVICE",
    raw: body,
  };
}

export function normalizeVendorPayload(provider, body = {}) {
  const key = String(provider || "").trim().toLowerCase();

  if (key === "generic") {
    const lat = toNum(body.lat);
    const lng = toNum(body.lng);
    const serial = String(body.serial || body.imei || body.deviceId || "").trim();
    if (!serial) {
      const e = new Error("serial required");
      e.status = 400;
      throw e;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const e = new Error("lat/lng required");
      e.status = 400;
      throw e;
    }
    return {
      serial,
      at: pickTs(body.at, body.ts, body.fixTime),
      lat,
      lng,
      speed: toNum(body.speed),
      heading: toNum(body.heading ?? body.course),
      accuracy: toNum(body.accuracy),
      provider: key,
      source: "VENDOR",
      raw: body,
    };
  }

  if (key === "traccar") {
    const serial = String(
      body.serial ||
      body.imei ||
      body.deviceId ||
      body.uniqueId ||
      body?.device?.uniqueId ||
      body?.device?.imei ||
      body?.attributes?.imei ||
      ""
    ).trim();
    const lat = toNum(body.lat ?? body.latitude ?? body?.position?.latitude);
    const lng = toNum(body.lng ?? body.longitude ?? body?.position?.longitude);
    if (!serial) {
      const e = new Error("serial required");
      e.status = 400;
      throw e;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const e = new Error("lat/lng required");
      e.status = 400;
      throw e;
    }
    return {
      serial,
      at: pickTs(
        body.at,
        body.fixTime,
        body.deviceTime,
        body.serverTime,
        body?.position?.fixTime,
        body?.position?.deviceTime,
        body?.position?.serverTime
      ),
      lat,
      lng,
      speed: toNum(body.speed ?? body?.position?.speed),
      heading: toNum(body.heading ?? body.course ?? body?.position?.course),
      accuracy: toNum(body.accuracy ?? body?.position?.accuracy),
      provider: key,
      source: "VENDOR",
      raw: body,
    };
  }

  const e = new Error(`unsupported provider: ${key || "unknown"}`);
  e.status = 400;
  throw e;
}
