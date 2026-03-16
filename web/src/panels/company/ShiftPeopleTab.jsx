// web/src/panels/company/ShiftPeopleTab.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { apiOr404Fallback } from "../../utils/apiFallback";
import { useSession } from "../../state/session";
import { personLabel, peopleLabel } from "../../utils/labels";
import { companyPath } from "../../utils/paths";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import ShiftPersonelTable from "../../components/ShiftPersonelTable";

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

function safeNum(x) {
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
    // dene 1e6
    let scaled = n / 1e6;
    if (Math.abs(scaled) > 180) scaled = n / 1e5;
    if (Math.abs(scaled) > 180) scaled = n / 1e4;
    n = scaled;
  }

  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

function sanitizeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  s = s.replace(/[\/]+/g, " ");
  s = s.replace(/\b(no|no\.|numara|daire|apt|kat)\b\s*[:#-]?\s*\S+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!/türkiye|turkiye|tr\b/i.test(s)) s = s + " Türkiye";
  return s;
}

function parseCsv(text) {
  // MVP parser: virgül ayracı, ilk satır header olabilir.
  // Beklenen kolonlar (case-insensitive): name, phone, address, lat, lng
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
    const phone = row[idx.phone] ?? "";
    const address = row[idx.address] ?? "";
    const lat = normalizeCoord(row[idx.lat], "lat");
    const lng = normalizeCoord(row[idx.lng], "lng");

    out.push({ name, phone, address, lat, lng });
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

function parseSheetRowsToPeople(rows2d) {
  const rows = Array.isArray(rows2d) ? rows2d : [];
  if (!rows.length) return [];

  const headRaw = rows[0] || [];
  const head = headRaw.map((h) => normalizeHeader(h));
  const hasHeader =
    head.some((h) => ["name", "ad", "ad soyad", "adsoyad", "full name", "fullname"].includes(h)) ||
    head.some((h) => ["phone", "tel", "telefon", "gsm"].includes(h)) ||
    head.some((h) => ["address", "adres"].includes(h)) ||
    head.some((h) => ["lat", "enlem", "latitude"].includes(h)) ||
    head.some((h) => ["lng", "lon", "boylam", "longitude", "long"].includes(h));

  let startIdx = 0;
  let idx = { name: 0, phone: 1, address: 2, lat: 3, lng: 4 };

  if (hasHeader) {
    idx = {
      name: Math.max(0, headerIndex(head, ["name", "ad", "ad soyad", "adsoyad", "full name", "fullname"])),
      phone: Math.max(0, headerIndex(head, ["phone", "tel", "telefon", "gsm"])),
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
    const phone = row[idx.phone] ?? "";
    const address = row[idx.address] ?? "";
    const lat = normalizeCoord(row[idx.lat], "lat");
    const lng = normalizeCoord(row[idx.lng], "lng");
    out.push({ name, phone, address, lat, lng });
  }
  return out;
}

function computeGeoStatus(p) {
  if (typeof p?.lat === "number" && typeof p?.lng === "number") return "OK";
  if (String(p?.address || "").trim()) return "NEEDS_REVIEW";
  return "FAILED";
}

function clusterPeople(people, maxWalkM) {
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

export default function ShiftPeopleTab({ token, me, shifts, roomsById, mirrorShiftIds, preferredShiftId }) {
  const who = personLabel(me);
  const whoPlural = peopleLabel(me);
  const companyKey = String(me?.companyId ?? me?.id ?? "unknown");

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [maxWalkM, setMaxWalkM] = useState(250);

  // ✅ M51.B: Shift Hub (Toplanma/Dağıtım)
  const [hubDirection, setHubDirection] = useState("INBOUND");
  const [hubAddress, setHubAddress] = useState("");
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  // manual add form
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pLat, setPLat] = useState("");
  const [pLng, setPLng] = useState("");

  const [people, setPeople] = useState([]);
  const [draftStops, setDraftStops] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [importMode, setImportMode] = useState("REPLACE");
  const [importSummary, setImportSummary] = useState(null);

  // M16.2 soft-switch: backend varsa kullan; endpoint yoksa (404) localStorage fallback
  const [peopleBackend, setPeopleBackend] = useState("unknown"); // unknown | on | off
  const [shiftPatchById, setShiftPatchById] = useState({});

  const shiftOptions = useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    const sorted = [...list].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    return sorted;
  }, [shifts]);

  const selectedShiftBase = useMemo(() => {
    const sid = Number(selectedShiftId || 0);
    return shiftOptions.find((s) => Number(s.id) === sid) || null;
  }, [shiftOptions, selectedShiftId]);

  const selectedShift = useMemo(() => {
    if (!selectedShiftBase) return null;
    const key = String(selectedShiftBase.id);
    const patch = shiftPatchById?.[key];
    return patch ? { ...selectedShiftBase, ...patch } : selectedShiftBase;
  }, [selectedShiftBase, shiftPatchById]);

  // Guided Mode: aynı personel/stop setini birden fazla taslak shift'e aynala
  const mirrorIds = useMemo(() => {
    const base = Array.isArray(mirrorShiftIds) ? mirrorShiftIds : [];
    const ids = [Number(selectedShiftId || 0), ...base.map((x) => Number(x || 0))]
      .filter((x) => Number.isFinite(x) && x > 0);
    return Array.from(new Set(ids));
  }, [mirrorShiftIds, selectedShiftId]);

  const peopleStorageKey = useMemo(() => {
    const sid = String(selectedShiftId || "");
    return `psv1:company:${companyKey}:shift:${sid}:people:v1`;
  }, [companyKey, selectedShiftId]);

  function loadPeopleFromStorage() {
    try {
      const raw = localStorage.getItem(peopleStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => ({
          id: String(x?.id || ""),
          name: String(x?.name || ""),
          phone: String(x?.phone || ""),
          address: String(x?.address || ""),
          lat: typeof x?.lat === "number" ? x.lat : null,
          lng: typeof x?.lng === "number" ? x.lng : null,
          geoStatus: String(x?.geoStatus || ""),
        }))
        .filter((x) => x.id);
    } catch {
      return [];
    }
  }

  function savePeopleToStorage(list) {
    try {
      localStorage.setItem(peopleStorageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  function mapBackendPeopleToUi(items) {
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
        geoManualOverride: Boolean(p?.geoManualOverride),
      }))
      .filter((x) => x.id);
  }

  function mapUiPeopleToBackend(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.map((p) => ({
      personelId: p.personelId || (String(p.id).match(/^\d+$/) ? Number(p.id) : undefined),
      fullName: String(p.name || "").trim(),
      phone: String(p.phone || "").trim() || null,
      address: String(p.address || "").trim() || null,
      lat: typeof p.lat === "number" ? p.lat : null,
      lng: typeof p.lng === "number" ? p.lng : null,
      geoManualOverride: Boolean(p.geoManualOverride),
    }));
  }

  async function loadPeopleFromBackend(shiftId) {
    const r = await api(`/api/shifts/${shiftId}/people`, { token });
    return mapBackendPeopleToUi(r?.items);
  }

  async function savePeopleToBackend(shiftId, list) {
    const items = mapUiPeopleToBackend(list);
    return api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
      method: "PUT",
      body: { items },
      token,
    });
  }

  async function importPeopleToBackend(shiftId, fileName, rows, mode) {
    return api(`/api/shifts/${shiftId}/people/import?mode=${encodeURIComponent(String(mode || "REPLACE"))}`, {
      method: "POST",
      body: { fileName, rows },
      token,
    });
  }

  async function generateStopsOnBackend(shiftId, maxWalkMValue) {
    const mw = Number(maxWalkMValue);
    return api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${encodeURIComponent(String(mw))}`, {
      method: "POST",
      token,
    });
  }

  function withHubStop(stops, shift) {
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
    // INBOUND (Toplama → Hub): rota hub'da bitmeli
    return [...list, hub];
  }

  // init selected shift
  useEffect(() => {
    const pid = Number(preferredShiftId || 0);
    if (!pid) return;
    if (!shiftOptions?.length) return;

    const exists = shiftOptions.some((s) => Number(s.id) === pid);
    if (!exists) return;

    // Kullanıcı elle başka shift seçmediyse otomatik seç
    setSelectedShiftId((cur) => (cur ? cur : String(pid)));
  }, [preferredShiftId, shiftOptions]);

  useEffect(() => {
    if (selectedShiftId) return;
    if (shiftOptions.length) setSelectedShiftId(String(shiftOptions[0].id));
  }, [shiftOptions, selectedShiftId]);

  // load people on shift change (backend first; 404 => localStorage fallback)
  useEffect(() => {
    if (!selectedShiftId) return;

    let alive = true;
    setBusy(true);
    setErr("");
    setInfo("");
    setImportSummary(null);

    const sid = String(selectedShiftId);

    (async () => {
      try {
        const list = await apiOr404Fallback(
          async () => {
            const data = await loadPeopleFromBackend(sid);
            setPeopleBackend("on");
            return data;
          },
          async () => {
            setPeopleBackend("off");
            return loadPeopleFromStorage();
          }
        );

        if (!alive) return;
        setPeople(list);
        setDraftStops([]);
        setInfo("");
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
        setPeople(loadPeopleFromStorage());
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleStorageKey]);

  // keep localStorage in sync + (soft) persist to backend
  useEffect(() => {
    if (!selectedShiftId) return;

    // always keep local fallback updated
    savePeopleToStorage(people);

    // debounce backend save; only if backend not known as missing
    if (peopleBackend === "off") return;

    const sid = String(selectedShiftId);
    const t = setTimeout(async () => {
      try {
        await apiOr404Fallback(
          async () => {
            // Guided Mode: aynı listeyi taslak shift'lerin hepsine yaz
            const ids = mirrorIds.length ? mirrorIds : [Number(sid)];
            for (const id of ids) {
              await savePeopleToBackend(String(id), people);
            }
            setPeopleBackend("on");
            return true;
          },
          async () => {
            setPeopleBackend("off");
            return false;
          }
        );
      } catch (e) {
        // Do not overwrite UI; just show error
        setErr(e?.message || String(e));
      }
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, selectedShiftId, peopleBackend, mirrorIds]);

  const geoStats = useMemo(() => {
    let ok = 0,
      review = 0,
      failed = 0;
    for (const p of people) {
      const st = p.geoStatus || computeGeoStatus(p);
      if (st === "OK") ok++;
      else if (st === "NEEDS_REVIEW") review++;
      else failed++;
    }
    return { ok, review, failed, total: people.length };
  }, [people]);

  function stripHubStop(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.filter((x) => String(x?.id || "") !== "hub");
  }

  // ✅ M51.B: selected shift değişince hub formunu doldur
  useEffect(() => {
    if (!selectedShift) return;
    const dir = String(selectedShift?.direction || "INBOUND").toUpperCase();
    setHubDirection(dir === "OUTBOUND" ? "OUTBOUND" : "INBOUND");
    setHubLat(typeof selectedShift?.hubLat === "number" ? String(selectedShift.hubLat) : "");
    setHubLng(typeof selectedShift?.hubLng === "number" ? String(selectedShift.hubLng) : "");
    setHubAddress("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShiftId]);

  const hubPosLabel = useMemo(() => {
    const dir = String(hubDirection || "").toUpperCase();
    const n = stripHubStop(draftStops).length;
    if (dir === "OUTBOUND") return "1. durak";
    return `${n + 1}. durak`;
  }, [hubDirection, draftStops]);

  async function geocodeHubAddress() {
    setErr("");
    setInfo("");
    const q = sanitizeAddress(hubAddress);
    if (!q) {
      setErr("Adres gir.");
      return;
    }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      setHubLat(String(r?.lat ?? ""));
      setHubLng(String(r?.lng ?? ""));
      if (typeof r?.lat === "number" && typeof r?.lng === "number") {
        setInfo(`Hub konumu bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Hub konumu bulundu. Lat/Lng alanlarını kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false)
    }
  }

  async function saveHubToShift() {
    setErr("");
    setInfo("");
    const sid = Number(selectedShiftId || 0);
    if (!sid) {
      setErr("Shift seç.");
      return;
    }

    const lat = normalizeCoord(hubLat, "lat");
    const lng = normalizeCoord(hubLng, "lng");
    if (lat == null || lng == null) {
      setErr("Hub Lat/Lng zorunlu. (Adresten Bul ile doldurabilirsin)");
      return;
    }

    const dir = String(hubDirection || "INBOUND").toUpperCase();
    setBusy(true);
    try {
      const updated = await api(`/api/shifts/${sid}`, {
        token,
        method: "PUT",
        body: { hubLat: lat, hubLng: lng, direction: dir },
      });

      setShiftPatchById((prev) => ({
        ...(prev || {}),
        [String(sid)]: {
          hubLat: updated?.hubLat ?? lat,
          hubLng: updated?.hubLng ?? lng,
          direction: updated?.direction ?? dir,
        },
      }));

      // Draft durak listesine hub'ı ekle (OUTBOUND: başa, INBOUND: sona)
      const baseStops = stripHubStop(draftStops);
      const withHub = withHubStop(baseStops, { ...(selectedShift || {}), hubLat: lat, hubLng: lng, direction: dir });
      setDraftStops(withHub);

      setInfo(`Hub kaydedildi. Liste pozisyonu: ${hubPosLabel}`);
    } catch (e) {
      setErr(String(e?.payload?.message || e?.payload?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearHubOnShift() {
    setErr("");
    setInfo("");
    const sid = Number(selectedShiftId || 0);
    if (!sid) return;
    setBusy(true);
    try {
      await api(`/api/shifts/${sid}`, { token, method: "PUT", body: { hubLat: null, hubLng: null } });
      setShiftPatchById((prev) => ({ ...(prev || {}), [String(sid)]: { ...(prev?.[String(sid)] || {}), hubLat: null, hubLng: null } }));
      setHubLat("");
      setHubLng("");
      setDraftStops(stripHubStop(draftStops));
      setInfo("Hub temizlendi.");
    } catch (e) {
      setErr(String(e?.payload?.message || e?.payload?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }



  async function geocodeManualAddress() {
    setErr("");
    setInfo("");

    const q = sanitizeAddress(pAddress);
    if (!q) {
      setErr("Adres gir.");
      return;
    }

    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      setPLat(String(r?.lat ?? ""));
      setPLng(String(r?.lng ?? ""));
      if (typeof r?.lat === "number" && typeof r?.lng === "number") {
        setInfo(`Konum bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}.`);
      } else {
        setInfo("Konum bulundu. Lat/Lng alanlarını kontrol et.");
      }
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  function addPersonManual(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    const name = String(pName || "").trim();
    const phone = String(pPhone || "").trim();
    const address = String(pAddress || "").trim();
    const lat = normalizeCoord(pLat, "lat");
    const lng = normalizeCoord(pLng, "lng");

    if (!name) {
      setErr("Ad Soyad zorunlu.");
      return;
    }
    if ((String(pLat || "").trim() && lat === null) || (String(pLng || "").trim() && lng === null)) {
      setErr("Lat/Lng sayı olmalı (opsiyonel). Örn: 37.12345 veya 37,12345");
      return;
    }

    const row = {
      id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      phone,
      address,
      lat,
      lng,
      geoStatus: computeGeoStatus({ address, lat, lng }),
    };

    setPeople((prev) => [row, ...(prev || [])]);
    setPName("");
    setPPhone("");
    setPAddress("");
    setPLat("");
    setPLng("");
  }

  async function importCsvFile(file) {
    const text = await file.text();
    const rows = parseCsv(text);
    return rows;
  }

  async function importExcelFile(file) {
    // `xlsx` dependency web tarafında kurulu olmalı (npm i xlsx)
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    return parseSheetRowsToPeople(rows2d);
  }

  async function importFile(file) {
    setErr("");
    setInfo("");
    setImportSummary(null);
    if (!file) return;

    try {
      const name = String(file.name || "").toLowerCase();
      let rows = [];

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        rows = await importExcelFile(file);
      } else if (name.endsWith(".csv")) {
        rows = await importCsvFile(file);
      } else {
        setErr("Desteklenen dosyalar: .xlsx, .xls, .csv");
        return;
      }

      if (!rows.length) {
        setErr("Dosya boş veya okunamadı.");
        return;
      }

      const normalizedRows = rows.map((r) => ({
        fullName: String(r.name || "").trim(),
        phone: String(r.phone || "").trim() || null,
        address: String(r.address || "").trim() || null,
        lat: normalizeCoord(r.lat, "lat"),
        lng: normalizeCoord(r.lng, "lng"),
      }));

      if (selectedShiftId && peopleBackend !== "off") {
        try {
          const sid = Number(selectedShiftId);
          const ids = mirrorIds.length ? mirrorIds : [sid];
          let firstResp = null;
          await apiOr404Fallback(
            async () => {
              for (const id of ids) {
                const resp = await importPeopleToBackend(String(id), file.name || null, normalizedRows, importMode);
                if (!firstResp) firstResp = resp;
              }
              setPeopleBackend("on");
              return true;
            },
            async () => {
              setPeopleBackend("off");
              return false;
            }
          );

          if (firstResp?.summary) {
            setImportSummary(firstResp.summary);
            const warningCount = Array.isArray(firstResp?.warnings) ? firstResp.warnings.length : 0;
            setInfo(`Import tamamlandı: ${firstResp.summary.acceptedRows}/${firstResp.summary.totalRows} satır işlendi${warningCount ? ` • ${warningCount} uyarı` : ""}`);
          }

          const fresh = await loadPeopleFromBackend(String(sid));
          setPeople(fresh);
          return;
        } catch (e) {
          const payload = e?.payload;
          if (payload?.summary) setImportSummary(payload.summary);
          if (Array.isArray(payload?.warnings) && payload.warnings.length) {
            const first = payload.warnings[0];
            setErr(`${payload?.error || e?.message || String(e)} ${first?.rowNo ? `(İlk sorun satır ${first.rowNo}: ${first.message})` : ""}`.trim());
          } else {
            setErr(String(payload?.error || e?.message || e));
          }
          return;
        }
      }

      const mapped = normalizedRows
        .map((r) => ({
          id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`,
          name: String(r.fullName || "").trim(),
          phone: String(r.phone || "").trim(),
          address: String(r.address || "").trim(),
          lat: typeof r.lat === "number" ? r.lat : null,
          lng: typeof r.lng === "number" ? r.lng : null,
          geoStatus: computeGeoStatus({ address: r.address, lat: r.lat, lng: r.lng }),
        }))
        .filter((x) => x.name);

      if (!mapped.length) {
        setErr("Dosyada geçerli satır bulunamadı (Ad Soyad zorunlu; adres veya koordinat olmalı).");
        return;
      }

      setPeople((prev) => (importMode === "REPLACE" ? mapped : [...mapped, ...(prev || [])]));
      setImportSummary({
        totalRows: normalizedRows.length,
        acceptedRows: mapped.length,
        createdPersonels: 0,
        updatedPersonels: 0,
        linkedToShift: mapped.length,
        skippedRows: Math.max(0, normalizedRows.length - mapped.length),
        needsReviewRows: mapped.filter((x) => x.geoStatus === "NEEDS_REVIEW").length,
        failedRows: Math.max(0, normalizedRows.length - mapped.length),
      });
      setInfo(`İçe aktarıldı: ${mapped.length} kayıt (${peopleBackend === "off" ? "yerel mod" : "önizleme"})`);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  function removePerson(id) {
    setPeople((prev) => (prev || []).filter((p) => p.id !== id));
  }

  function updatePerson(id, patch) {
    setPeople((prev) =>
      (prev || []).map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        next.geoStatus = computeGeoStatus(next);
        return next;
      })
    );
  }

  async function generateDraftStops() {
    setErr("");
    setInfo("");

    const mw = Number(maxWalkM);
    if (!Number.isFinite(mw) || mw <= 0) {
      setErr("maxWalkM pozitif sayi olmali.");
      return;
    }

    // Prefer backend: generate + persist stops (wizard Step-4 needs persisted stops)
    // Guided Mode: outbound/inbound taslak shift'lerin hepsine aynı stop setini üret.
    if (selectedShiftId && peopleBackend !== "off") {
      try {
        const ids = mirrorIds.length ? mirrorIds : [Number(selectedShiftId)];
        await apiOr404Fallback(
          async () => {
            for (const id of ids) {
              await generateStopsOnBackend(String(id), mw);
            }
            setPeopleBackend("on");
            return true;
          },
          async () => {
            setPeopleBackend("off");
            return false;
          }
        );

        await loadShiftStopsFromApi();
        return;
      } catch (e) {
        setErr(String(e?.payload?.message || e?.message || e));
      }
    }

    // Fallback: UI-only preview (does not persist)
    const stops = clusterPeople(people, mw);
    setDraftStops(withHubStop(stops, selectedShift));
    setInfo(stops.length ? `Draft durak uretildi: ${stops.length} durak` : "OK koordinatli kayit yok - durak uretilemedi.");
  }

  async function loadShiftStopsFromApi() {
    if (!selectedShiftId) return;
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      const sid = Number(selectedShiftId);
      const resp = await api(`/api/shifts/${sid}/stops`, { token });
      const list = Array.isArray(resp) ? resp : resp?.items ?? resp?.stops ?? [];
      const mapped = (list || [])
        .filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number")
        .map((s, i) => ({
          id: String(s.id ?? `api_${i}`),
          title: String(s.title || s.name || `Durak ${i + 1}`),
          lat: s.lat,
          lng: s.lng,
          count: s.assignmentCount ?? null,
          memberIds: [],
        }));
      const withHub = withHubStop(mapped, selectedShift);
      setDraftStops(withHub);
      setInfo(`Shift durakları yüklendi: ${withHub.length}`);
    } catch (e) {
      setErr(`Shift durakları yüklenemedi: ${String(e?.payload?.message || e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  const roomText = useMemo(() => {
    if (!selectedShift) return "-";
    const r = roomsById?.get ? roomsById.get(Number(selectedShift.roomId)) : null;
    return r ? `${r.name || r.title || `Room #${r.id}`} (#${r.id})` : `#${selectedShift.roomId}`;
  }, [selectedShift, roomsById]);

  return (
    <div className="card">
      <h3>Shift Tools</h3>
      <div className="muted">
        Shift bazlı araçlar: personel ekle/import → durak üret (preview) → rota/durak önizleme (mini-map). “Shift’ten Durakları Çek” mevcut durakları API’den getirir.
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}
      {info ? (
        <div className="card" style={{ marginTop: 10 }}>
          {info}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>
        {/* Shift selector + summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ margin: 0 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ minWidth: 280, flex: 1 }}>
              <label className="muted">Shift</label>
              <select value={String(selectedShiftId || "")} onChange={(e) => setSelectedShiftId(e.target.value)} disabled={busy}>
                {shiftOptions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    #{s.id} • {String(s.status)} • Room {s.roomId} • {new Date(s.startAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 140 }}>
              <label className="muted">maxWalkM</label>
              <input type="number" value={maxWalkM} onChange={(e) => setMaxWalkM(e.target.value)} disabled={busy} />
            </div>

            <button type="button" disabled={busy} onClick={generateDraftStops}>
              Durak Üret (Preview)
            </button>

            <button type="button" disabled={busy || !selectedShiftId} onClick={() => setPreviewOpen(true)}>
              Önizle
            </button>

            <button type="button" className="btn" disabled={busy || !selectedShiftId} onClick={loadShiftStopsFromApi}>
              Shift’ten Durakları Çek
            </button>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            <b>Room:</b> {roomText}
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            <b>{who}:</b> {geoStats.total} • OK: {geoStats.ok} • Review: {geoStats.review} • Failed: {geoStats.failed}
            {geoStats.review > 0 || geoStats.failed > 0 ? (
              <span style={{ marginLeft: 10 }}>
                <a href={"#" + companyPath(me, "/georeview")}>Geo Review’e git</a>
              </span>
            ) : null}
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            <b>Draft Durak:</b> {draftStops.length}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Not: “Durak Üret” sadece koordinatı (lat/lng) olan {whoPlural.toLowerCase()} kullanır.
          </div>
          </div>

          {/* Hub (Toplanma/Dağıtım) */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>Vardiya Toplanma / Dağıtım Yeri</h3>
            <div className="muted" style={{ marginTop: -6 }}>
              INBOUND: hub <b>son durak</b> olur. OUTBOUND: hub <b>1. durak</b> olur.
            </div>

            <div className="grid" style={{ marginTop: 8 }}>
              <div className="col">
                <label className="muted">Yön</label>
                <select value={hubDirection} onChange={(e) => setHubDirection(e.target.value)} disabled={busy}>
                  <option value="INBOUND">INBOUND (Toplama → Hub)</option>
                  <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
                </select>
              </div>

              <div className="col" style={{ gridColumn: "1 / -1" }}>
                <label className="muted">Adres</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={hubAddress}
                    onChange={(e) => setHubAddress(e.target.value)}
                    placeholder="örn. Fabrika / Ofis / Toplanma noktası"
                    disabled={busy}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn sm" onClick={geocodeHubAddress} disabled={busy || !String(hubAddress || "").trim()}>
                    Adresten Bul
                  </button>
                </div>
              </div>

              <div className="col">
                <label className="muted">Hub Lat</label>
                <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} placeholder="41.0..." disabled={busy} />
              </div>
              <div className="col">
                <label className="muted">Hub Lng</label>
                <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} placeholder="29.0..." disabled={busy} />
              </div>

              <div className="col" style={{ justifyContent: "end", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy || !selectedShiftId} onClick={saveHubToShift}>
                  Kaydet
                </button>
                <button type="button" className="btn" disabled={busy || (!hubLat && !hubLng)} onClick={clearHubOnShift}>
                  Temizle
                </button>
              </div>
            </div>

            <div className="muted" style={{ marginTop: 8 }}>
              <b>Liste pozisyonu:</b> {hubPosLabel}
              {selectedShift?.hubLat != null && selectedShift?.hubLng != null ? (
                <span style={{ marginLeft: 10 }}>
                  <b>Mevcut Hub:</b> {Number(selectedShift.hubLat).toFixed(6)}, {Number(selectedShift.hubLng).toFixed(6)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Manual add / import */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>{who} Ekle / Import</h3>

          <form onSubmit={addPersonManual} className="grid">
            <div className="col">
              <label className="muted">Ad Soyad</label>
              <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="örn. Ali Veli" disabled={busy} />
            </div>
            <div className="col">
              <label className="muted">Tel</label>
              <input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="05xx..." disabled={busy} />
            </div>
            <div className="col" style={{ gridColumn: "1 / -1" }}>
              <label className="muted">Adres</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={pAddress}
                  onChange={(e) => setPAddress(e.target.value)}
                  placeholder="örn. Mahalle / Sokak / İlçe"
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn sm" onClick={geocodeManualAddress} disabled={busy || !String(pAddress || "").trim()}>
                  Adresten Bul
                </button>
              </div>
            </div>
            <div className="col">
              <label className="muted">Lat (ops.)</label>
              <input value={pLat} onChange={(e) => setPLat(e.target.value)} placeholder="41.0..." disabled={busy} />
            </div>
            <div className="col">
              <label className="muted">Lng (ops.)</label>
              <input value={pLng} onChange={(e) => setPLng(e.target.value)} placeholder="29.0..." disabled={busy} />
            </div>

            <div className="col" style={{ justifyContent: "end" }}>
              <button type="submit" disabled={busy}>
                Ekle
              </button>
            </div>
          </form>

          <div className="card" style={{ marginTop: 10 }}>
            <div className="muted">
              <b>Excel/CSV Import</b> — kolonlar: <code>name,phone,address,lat,lng</code> (header opsiyonel)
              <div style={{ marginTop: 6, fontSize: 12 }}>
                Excel başlıkları (TR) da olur: <code>ad / ad soyad / telefon / adres / enlem / boylam</code>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ minWidth: 180 }}>
                <label className="muted">Import modu</label>
                <select value={importMode} onChange={(e) => setImportMode(e.target.value)} disabled={busy}>
                  <option value="REPLACE">REPLACE — mevcut listeyi değiştir</option>
                  <option value="MERGE">MERGE — mevcut listeyi koru, yenileri ekle</option>
                </select>
              </div>
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              disabled={busy}
              onChange={(e) => importFile(e.target.files?.[0])}
              style={{ marginTop: 8 }}
            />

            {importSummary ? (
              <div className="card" style={{ marginTop: 10 }}>
                <div className="muted"><b>Import Özeti</b></div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Toplam: {importSummary.totalRows} • Kabul: {importSummary.acceptedRows} • Shift'e bağlanan: {importSummary.linkedToShift}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Oluşan: {importSummary.createdPersonels} • Güncellenen: {importSummary.updatedPersonels} • Review: {importSummary.needsReviewRows}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Atlanan: {importSummary.skippedRows} • Failed: {importSummary.failedRows}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* People table */}
      <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Shift {who} Listesi</h3>
        <ShiftPersonelTable people={people} onRemove={removePerson} onUpdate={updatePerson} emptyLabel={`Henüz ${who.toLowerCase()} yok.`} />
      </div>

      <RoutePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={selectedShift ? `Shift #${selectedShift.id} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
        stops={draftStops}
        people={people}
      />
    </div>
  );
}
