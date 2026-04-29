const GUIDED_RESUME_KEY = "psv1:guidedResume:v1";

export function writeGuidedResume(payload) {
  try {
    localStorage.setItem(GUIDED_RESUME_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeCoord(v, kind) {
  if (v === null || v === undefined) return null;
  let n = null;

  if (typeof v === "number") {
    n = v;
  } else {
    const s0 = String(v).trim();
    if (!s0) return null;
    const s = s0.replace(",", ".");
    const nn = Number(s);
    if (Number.isFinite(nn)) n = nn;
    else {
      const pf = parseFloat(s);
      if (Number.isFinite(pf)) n = pf;
    }
  }

  if (!Number.isFinite(n)) return null;

  // Excel/CSV bazen lat/lng'yi "mikro derece" (örn 37755276) olarak verir.
  // Heuristik: büyük sayıysa ölçekle.
  const abs = Math.abs(n);
  if (abs > 1000) {
    let scaled = n / 1e6;
    if (Math.abs(scaled) > 180) scaled = n / 1e5;
    if (Math.abs(scaled) > 180) scaled = n / 1e4;
    n = scaled;
  }

  if (!Number.isFinite(n)) return null;
  if (Object.is(n, -0)) n = 0;
  if (n === 0) return null;
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

export function sanitizeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  s = s.replace(/[/]+/g, " ");
  s = s.replace(/\b(no|no\.|numara|daire|apt|kat)\b\s*[:#-]?\s*\S+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!/türkiye|turkiye|tr\b/i.test(s)) s = s + " Türkiye";
  return s;
}

export function parseCsv(text) {
  // MVP parser: virgül ayracı, ilk satır header olabilir.
  // Beklenen kolonlar (case-insensitive): name, address, lat, lng (phone varsa yok sayılır)
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const split = (line) => {
    // basit split: quoted alan yok (MVP)
    return line.split(",").map((x) => x.trim());
  };

  const head = split(lines[0]).map((h) => h.toLowerCase());
  const hasHeader =
    head.includes("name") ||
    head.includes("phone") ||
    head.includes("address") ||
    head.includes("lat") ||
    head.includes("lng");

  let startIdx = 0;
  let idx = { name: 0, phone: 1, address: 2, lat: 3, lng: 4 };

  if (hasHeader) {
    idx = {
      name: Math.max(0, head.indexOf("name")),
      phone: Math.max(0, head.indexOf("phone")),
      address: Math.max(0, head.indexOf("address")),
      lat: Math.max(0, head.indexOf("lat")),
      lng: Math.max(0, head.indexOf("lng")),
    };
    startIdx = 1;
  }

  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    const row = split(lines[i]);
    const name = row[idx.name] ?? "";
    const address = row[idx.address] ?? "";
    const lat = normalizeCoord(row[idx.lat], "lat");
    const lng = normalizeCoord(row[idx.lng], "lng");

    out.push({ name, phone: "", address, lat, lng });
  }
  return out;
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c");
}

function headerIndex(head, keys) {
  for (const k of keys) {
    const i = head.indexOf(k);
    if (i >= 0) return i;
  }
  return -1;
}

export function parseSheetRowsToPeople(rows2d) {
  const rows = Array.isArray(rows2d) ? rows2d : [];
  if (!rows.length) return [];

  const headRaw = rows[0] || [];
  const head = headRaw.map((h) => normalizeHeader(h));
  const hasHeader =
    head.some((h) => ["name", "ad", "ad soyad", "adsoyad", "full name", "fullname"].includes(h)) ||
    head.some((h) => ["address", "adres"].includes(h)) ||
    head.some((h) => ["lat", "enlem", "latitude"].includes(h)) ||
    head.some((h) => ["lng", "lon", "boylam", "longitude", "long"].includes(h));

  let startIdx = 0;
  let idx = { name: 0, phone: 1, address: 2, lat: 3, lng: 4 };

  if (hasHeader) {
    idx = {
      name: Math.max(0, headerIndex(head, ["name", "ad", "ad soyad", "adsoyad", "full name", "fullname"])),
      address: Math.max(0, headerIndex(head, ["address", "adres"])),
      lat: Math.max(0, headerIndex(head, ["lat", "enlem", "latitude"])),
      lng: Math.max(0, headerIndex(head, ["lng", "lon", "boylam", "longitude", "long"])),
    };
    startIdx = 1;
  }

  const out = [];
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = row[idx.name] ?? "";
    const address = row[idx.address] ?? "";
    const lat = normalizeCoord(row[idx.lat], "lat");
    const lng = normalizeCoord(row[idx.lng], "lng");
    out.push({ name, phone: "", address, lat, lng });
  }
  return out;
}

export function mapStoragePeopleToUi(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((x) => ({
      id: String(x?.id || ""),
      name: String(x?.name || ""),
      phone: String(x?.phone || ""),
      address: String(x?.address || ""),
      lat: typeof x?.lat === "number" ? x.lat : null,
      lng: typeof x?.lng === "number" ? x.lng : null,
      geoStatus: String(x?.geoStatus || ""),
      geoReason: String(x?.geoReason || ""),
      geoReasonText: String(x?.geoReasonText || ""),
    }))
    .filter((x) => x.id);
}

export function mapBackendPeopleToUi(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((p) => ({
      id: String(p?.id ?? ""),
      personelId: Number(p?.id ?? 0) || null,
      name: String(p?.fullName ?? ""),
      phone: String(p?.phone ?? ""),
      address: String(p?.homeAddress ?? ""),
      lat: typeof p?.homeLat === "number" ? p.homeLat : null,
      lng: typeof p?.homeLng === "number" ? p.homeLng : null,
      geoStatus: String(p?.geoStatus ?? ""),
      geoReason: String(p?.geoReason ?? p?.geoNote ?? ""),
      geoReasonText: String(p?.geoReasonText ?? ""),
      geoManualOverride: Boolean(p?.geoManualOverride),
    }))
    .filter((x) => x.id);
}

export function mapUiPeopleToBackend(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((p) => ({
    personelId: p.personelId || (String(p.id).match(/^\d+$/) ? Number(p.id) : undefined),
    fullName: String(p.name || "").trim(),
    phone: String(p.phone || "").trim() || null,
    address: String(p.address || "").trim() || null,
    lat: typeof p.lat === "number" ? p.lat : null,
    lng: typeof p.lng === "number" ? p.lng : null,
    geoManualOverride: Boolean(p.geoManualOverride),
    geoReason: String(p.geoReason || "") || null,
  }));
}

export function readPeopleFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return mapStoragePeopleToUi(parsed);
  } catch {
    return [];
  }
}

export function writePeopleToStorage(storageKey, list) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    // ignore
  }
}

export async function loadPeopleFromBackend(apiFn, token, shiftId) {
  const r = await apiFn(`/api/shifts/${shiftId}/people`, { token });
  return mapBackendPeopleToUi(r?.items);
}

export async function savePeopleToBackend(apiFn, token, shiftId, list) {
  const items = mapUiPeopleToBackend(list);
  return apiFn(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
    method: "PUT",
    body: { items },
    token,
  });
}

export async function importPeopleToBackend(apiFn, token, shiftId, fileName, rows, mode) {
  return apiFn(`/api/shifts/${shiftId}/people/import?mode=${encodeURIComponent(String(mode || "REPLACE"))}`, {
    method: "POST",
    body: { fileName, rows },
    token,
  });
}

export function summarizeWarnings(list) {
  const items = Array.isArray(list) ? list : [];
  const counts = new Map();
  for (const item of items) {
    const key = String(item?.code || "UNKNOWN");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
}

export function warningLabel(code) {
  const c = String(code || "");
  if (c === "MISSING_NAME") return "Ad Soyad eksik";
  if (c === "MISSING_ADDRESS_OR_COORDS") return "Adres/koordinat eksik";
  if (c === "INVALID_COORD") return "Koordinat geçersiz";
  if (c === "DUPLICATE_ROW") return "Tekrar satır";
  if (c === "GEO_NEEDS_REVIEW") return "Konum kontrolü gerekir";
  if (c === "INVALID_ROW") return "Satır okunamadı";
  return c || "Uyarı";
}

export function stripHubStop(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((x) => String(x?.id || "") !== "hub");
}

export function withHubStop(stops, shift) {
  const list = Array.isArray(stops) ? [...stops] : [];
  const hubLat = typeof shift?.hubLat === "number" ? shift.hubLat : null;
  const hubLng = typeof shift?.hubLng === "number" ? shift.hubLng : null;
  if (hubLat == null || hubLng == null) return list;

  const hub = {
    id: "hub",
    title: "Hub",
    lat: hubLat,
    lng: hubLng,
    count: null,
    memberIds: [],
    _virtual: true,
  };

  const dir = String(shift?.direction || "").toUpperCase();
  if (dir === "OUTBOUND") return [hub, ...list];
  return [...list, hub];
}

export function buildStopSummary({ base = {}, stopsInput, peopleInput, computeGeoStatus: computeGeoStatusFn }) {
  const allStops = Array.isArray(stopsInput) ? stopsInput : [];
  const realStops = stripHubStop(allStops);
  const hubIncluded = allStops.some((x) => String(x?.id || "") === "hub");
  const totalPeople = Number(base.totalPeople ?? (Array.isArray(peopleInput) ? peopleInput.length : 0));
  const reviewCount = Number(base.reviewCount ?? (Array.isArray(peopleInput) ? peopleInput.filter((p) => (p.geoStatus || computeGeoStatusFn(p)) === "NEEDS_REVIEW").length : 0));
  const coveredCount = Number(base.coveredCount ?? realStops.reduce((sum, s) => sum + Number(s?.count || 0), 0));
  const singletonCount = Number(base.singletonCount ?? realStops.filter((s) => Number(s?.count || 0) === 1).length);
  const stopCountWithoutHub = Number(base.stopCountWithoutHub ?? base.stopCount ?? realStops.length);
  const stopCountWithHub = Number(base.stopCountWithHub ?? (stopCountWithoutHub + (hubIncluded ? 1 : 0)));
  const skippedCount = Number(base.skippedCount ?? Math.max(0, totalPeople - coveredCount - reviewCount));
  const stopLoads = realStops.map((s, i) => ({ title: String(s?.title || `Durak ${i + 1}`), count: Number(s?.count || 0) }));
  return {
    ...base,
    totalPeople,
    reviewCount,
    coveredCount,
    singletonCount,
    stopCount: stopCountWithoutHub,
    stopCountWithoutHub,
    stopCountWithHub,
    hubIncluded,
    skippedCount,
    stopLoads,
  };
}

export function computeGeoMeta(p) {
  const hasCoords = typeof p?.lat === "number" && typeof p?.lng === "number";
  const hasPartialCoords = (p?.lat == null) !== (p?.lng == null);
  const hasAddress = Boolean(String(p?.address || "").trim());
  if (Boolean(p?.geoManualOverride) && hasCoords) {
    return { geoStatus: "OK", geoReason: "MANUAL_OVERRIDE", geoReasonText: "Elle doğrulandı" };
  }
  if (hasCoords) {
    return { geoStatus: "OK", geoReason: "HAS_COORDS", geoReasonText: "Geçerli koordinat var" };
  }
  if (hasPartialCoords) {
    return { geoStatus: "NEEDS_REVIEW", geoReason: "INVALID_COORD", geoReasonText: "Koordinat eksik veya geçersiz" };
  }
  if (hasAddress) {
    return { geoStatus: "NEEDS_REVIEW", geoReason: "ADDRESS_ONLY", geoReasonText: "Adres var, koordinat yok" };
  }
  return { geoStatus: "FAILED", geoReason: "MISSING_ADDRESS", geoReasonText: "Adres ve koordinat yok" };
}

export function computeGeoStatus(p) {
  return computeGeoMeta(p).geoStatus;
}

export function clusterPeople(people, maxWalkM) {
  const pts = (people || []).filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
  if (!pts.length) return [];

  // greedy clustering (MVP): sırayla yeni cluster, radius içinde ekle
  const used = new Set();
  const clusters = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (used.has(p.id)) continue;

    const members = [p];
    used.add(p.id);

    for (let j = i + 1; j < pts.length; j++) {
      const q = pts[j];
      if (used.has(q.id)) continue;
      const d = haversineM({ lat: p.lat, lng: p.lng }, { lat: q.lat, lng: q.lng });
      if (d <= maxWalkM) {
        members.push(q);
        used.add(q.id);
      }
    }

    const lat = members.reduce((s, x) => s + x.lat, 0) / members.length;
    const lng = members.reduce((s, x) => s + x.lng, 0) / members.length;

    clusters.push({
      id: `stop_${i}_${Math.random().toString(16).slice(2)}`,
      title: `Durak ${clusters.length + 1}`,
      lat,
      lng,
      count: members.length,
      memberIds: members.map((m) => m.id),
    });
  }

  return clusters;
}
