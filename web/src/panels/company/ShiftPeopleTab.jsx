// web/src/panels/company/ShiftPeopleTab.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { apiOr404Fallback } from "../../utils/apiFallback";
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
  const hasHeader = head.includes("name") || head.includes("phone") || head.includes("address") || head.includes("lat") || head.includes("lng");

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
    const lat = safeNum(row[idx.lat]);
    const lng = safeNum(row[idx.lng]);

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

export default function ShiftPeopleTab({ token, me, shifts, roomsById }) {
  const companyKey = String(me?.companyId ?? me?.id ?? "unknown");

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [maxWalkM, setMaxWalkM] = useState(120);

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

  // M16.2 soft-switch: backend varsa kullan; endpoint yoksa (404) localStorage fallback
  const [peopleBackend, setPeopleBackend] = useState("unknown"); // unknown | on | off

  const shiftOptions = useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    const sorted = [...list].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    return sorted;
  }, [shifts]);

  const selectedShift = useMemo(() => {
    const sid = Number(selectedShiftId || 0);
    return shiftOptions.find((s) => Number(s.id) === sid) || null;
  }, [shiftOptions, selectedShiftId]);

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
      personelId:
        p.personelId ||
        (String(p.id).match(/^\d+$/) ? Number(p.id) : undefined),
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

  // init selected shift
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
            await savePeopleToBackend(sid, people);
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
  }, [people, selectedShiftId, peopleBackend]);

  const geoStats = useMemo(() => {
    let ok = 0, review = 0, failed = 0;
    for (const p of people) {
      const st = p.geoStatus || computeGeoStatus(p);
      if (st === "OK") ok++;
      else if (st === "NEEDS_REVIEW") review++;
      else failed++;
    }
    return { ok, review, failed, total: people.length };
  }, [people]);

  function addPersonManual(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    const name = String(pName || "").trim();
    const phone = String(pPhone || "").trim();
    const address = String(pAddress || "").trim();
    const lat = String(pLat || "").trim() ? Number(pLat) : null;
    const lng = String(pLng || "").trim() ? Number(pLng) : null;

    if (!name) {
      setErr("Ad Soyad zorunlu.");
      return;
    }
    if ((pLat && !Number.isFinite(lat)) || (pLng && !Number.isFinite(lng))) {
      setErr("Lat/Lng sayı olmalı (opsiyonel).");
      return;
    }

    const row = {
      id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      phone,
      address,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
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
    setErr("");
    setInfo("");
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (!rows.length) {
        setErr("CSV boş veya okunamadı.");
        return;
      }

      const mapped = rows.map((r) => {
        const lat = typeof r.lat === "number" && Number.isFinite(r.lat) ? r.lat : null;
        const lng = typeof r.lng === "number" && Number.isFinite(r.lng) ? r.lng : null;
        const address = String(r.address || "").trim();
        return {
          id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`,
          name: String(r.name || "").trim(),
          phone: String(r.phone || "").trim(),
          address,
          lat,
          lng,
          geoStatus: computeGeoStatus({ address, lat, lng }),
        };
      }).filter((x) => x.name);

      if (!mapped.length) {
        setErr("CSV’de geçerli satır bulunamadı (name zorunlu).");
        return;
      }

      setPeople((prev) => [...mapped, ...(prev || [])]);
      setInfo(`İçe aktarıldı: ${mapped.length} kayıt`);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  function removePerson(id) {
    setPeople((prev) => (prev || []).filter((p) => p.id !== id));
  }

  function updatePerson(id, patch) {
    setPeople((prev) => (prev || []).map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      next.geoStatus = computeGeoStatus(next);
      return next;
    }));
  }

  function generateDraftStops() {
    setErr("");
    setInfo("");

    const mw = Number(maxWalkM);
    if (!Number.isFinite(mw) || mw <= 0) {
      setErr("maxWalkM pozitif sayı olmalı.");
      return;
    }

    const stops = clusterPeople(people, mw);
    setDraftStops(stops);
    setInfo(stops.length ? `Draft durak üretildi: ${stops.length} durak` : "OK koordinatlı kayıt yok — durak üretilemedi.");
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
      setDraftStops(mapped);
      setInfo(`Shift durakları yüklendi: ${mapped.length}`);
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
      <div className="muted">Shift bazlı araçlar: personel ekle/import → durak üret (preview) → rota/durak önizleme (mini-map). “Shift’ten Durakları Çek” mevcut durakları API’den getirir.</div>

      {err ? <div className="card err" style={{ marginTop: 10 }}>{err}</div> : null}
      {info ? <div className="card" style={{ marginTop: 10 }}>{info}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>
        {/* Shift selector + summary */}
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
            <b>Personel:</b> {geoStats.total} • OK: {geoStats.ok} • Review: {geoStats.review} • Failed: {geoStats.failed}
            {geoStats.review > 0 || geoStats.failed > 0 ? (
              <span style={{ marginLeft: 10 }}>
                <a href="#/company/georeview">Geo Review’e git</a>
              </span>
            ) : null}
          </div>

          <div className="muted" style={{ marginTop: 6 }}>
            <b>Draft Durak:</b> {draftStops.length}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Not: “Durak Üret” sadece koordinatı (lat/lng) olan personelleri kullanır.
          </div>
        </div>

        {/* Manual add / import */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>Personel Ekle / Import</h3>

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
              <input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="örn. Mahalle / Sokak / İlçe" disabled={busy} />
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
              <b>CSV Import (MVP)</b> — kolonlar: <code>name,phone,address,lat,lng</code> (header opsiyonel)
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => importCsvFile(e.target.files?.[0])}
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
      </div>

      {/* People table */}
      <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Shift Personel Listesi</h3>
        <ShiftPersonelTable people={people} onRemove={removePerson} onUpdate={updatePerson} />
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
