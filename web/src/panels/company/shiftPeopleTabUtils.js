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
