// web/src/panels/company/GeoReviewPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import GeoLocationPicker from "../../components/geo/GeoLocationPicker";
import { companyPath } from "../../utils/paths";
import { isSchool, personLabel } from "../../utils/labels";

const GUIDED_TEMP_STORAGE_KEY = "psv1:guidedTempShiftIds:v1";
const GUIDED_RESUME_KEY = "psv1:guidedResume:v1";
const REASON_OPTIONS = [
  { value: "", label: "Tüm nedenler" },
  { value: "ADDRESS_ONLY", label: "Adres var, koordinat yok" },
  { value: "INVALID_COORD", label: "Koordinat eksik/geçersiz" },
  { value: "MISSING_ADDRESS", label: "Adres ve koordinat yok" },
  { value: "MANUAL_OVERRIDE", label: "Elle doğrulandı" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tüm durumlar" },
  { value: "NEEDS_REVIEW", label: "İncelenecek" },
  { value: "OK", label: "Hazır" },
  { value: "FAILED", label: "Başarısız" },
];

function sanitizeAddress(v) {
  return String(v || "").trim().replace(/\s+/g, " ");
}

function normalizeCoord(v, kind) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "OK") return { color: "#22c55e", bg: "rgba(34,197,94,.14)" };
  if (s === "NEEDS_REVIEW") return { color: "#f59e0b", bg: "rgba(245,158,11,.14)" };
  if (s === "FAILED") return { color: "#ef4444", bg: "rgba(239,68,68,.14)" };
  return { color: "#cbd5e1", bg: "rgba(148,163,184,.12)" };
}

function readGuidedResume(basePath) {
  try {
    const raw = localStorage.getItem(GUIDED_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.basePath || "") !== String(basePath || "")) return null;
    const ts = Number(parsed.ts || 0);
    if (Number.isFinite(ts) && ts > 0 && Date.now() - ts > 1000 * 60 * 60 * 12) return null;
    return {
      step: Number(parsed.step || 2) || 2,
      personId: Number(parsed.personId || 0) || null,
      source: String(parsed.source || ""),
    };
  } catch {
    return null;
  }
}

function readGuidedTempShiftIds() {
  try {
    const raw = localStorage.getItem(GUIDED_TEMP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x) && x > 0);
  } catch {
    return [];
  }
}

function readSessionPersonIds(companyKey) {
  const ids = new Set();
  try {
    const shiftIds = readGuidedTempShiftIds();
    shiftIds.forEach((sid) => {
      const key = `psv1:company:${companyKey}:shift:${sid}:people:v1`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((p) => {
        const pid = Number(p?.personelId ?? p?.id ?? 0);
        if (Number.isFinite(pid) && pid > 0) ids.add(pid);
      });
    });
  } catch {
    // ignore
  }
  return Array.from(ids);
}

function formatGeoReason(item) {
  return item?.geoReasonText || item?.geoNote || "Neden yok";
}

export default function GeoReviewPanel() {
  const { me } = useSession();
  const who = personLabel(me);
  const school = isSchool(me);
  const basePath = companyPath(me, "");
  const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
  const guidedResume = useMemo(() => readGuidedResume(basePath), [basePath]);
  const preferredSelectedId = Number(guidedResume?.personId || 0) || null;

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [bulkStats, setBulkStats] = useState({ found: 0, notFound: 0, error: 0 });
  const [scopeMode, setScopeMode] = useState("ALL");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    homeAddress: "",
    lat: "",
    lng: "",
  });

  const scopedIds = useMemo(() => readSessionPersonIds(companyKey), [companyKey, busy]);
  const hasPlanningScope = scopedIds.length > 0;

  useEffect(() => {
    setScopeMode(hasPlanningScope ? "SESSION" : "ALL");
  }, [hasPlanningScope]);

  async function load() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const kindQs = school ? "?kind=STUDENT" : "";
      const r = await api("/api/company/personels" + kindQs);
      setItems(Array.isArray(r?.items) ? r.items : []);
      setBulkStats({ found: 0, notFound: 0, error: 0 });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school]);

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    const scopedSet = new Set(scopedIds.map((x) => Number(x)));
    return (items || []).filter((p) => {
      const itemId = Number(p?.id || 0);
      if (scopeMode === "SESSION" && scopedSet.size > 0 && !scopedSet.has(itemId)) return false;
      if (status && String(p.geoStatus || "") !== status) return false;
      if (reason && String(p.geoReason || p.geoNote || "") !== reason) return false;
      if (!s) return true;
      const t = `${p.fullName || ""} ${p.phone || ""} ${p.homeAddress || ""}`.toLowerCase();
      return t.includes(s);
    });
  }, [items, q, reason, status, scopeMode, scopedIds]);

  const counts = useMemo(() => {
    const base = { total: items.length, visible: filtered.length, ok: 0, review: 0, failed: 0, noCoord: 0 };
    filtered.forEach((it) => {
      const st = String(it.geoStatus || "").toUpperCase();
      if (st === "OK") base.ok += 1;
      else if (st === "NEEDS_REVIEW") base.review += 1;
      else if (st === "FAILED") base.failed += 1;
      if (!(Number.isFinite(Number(it.homeLat)) && Number.isFinite(Number(it.homeLng)))) base.noCoord += 1;
    });
    return base;
  }, [items, filtered]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (preferredSelectedId && filtered.some((x) => Number(x.id) === Number(preferredSelectedId))) {
      if (Number(selectedId) !== Number(preferredSelectedId)) setSelectedId(preferredSelectedId);
      return;
    }
    const exists = filtered.some((x) => Number(x.id) === Number(selectedId));
    if (!exists) setSelectedId(filtered[0].id);
  }, [filtered, selectedId, preferredSelectedId]);

  const selected = useMemo(
    () => filtered.find((x) => Number(x.id) === Number(selectedId)) || filtered[0] || null,
    [filtered, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setForm({ fullName: "", phone: "", homeAddress: "", lat: "", lng: "" });
      return;
    }
    setForm({
      fullName: selected.fullName || "",
      phone: selected.phone || "",
      homeAddress: selected.homeAddress || "",
      lat: selected.homeLat == null ? "" : String(selected.homeLat),
      lng: selected.homeLng == null ? "" : String(selected.homeLng),
    });
  }, [selected]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function geocodeOne(itemLike) {
    const query = sanitizeAddress(itemLike?.homeAddress);
    if (!query) throw new Error("Adres boş.");
    return api("/api/geocode", { method: "POST", body: { q: query, country: "tr" } });
  }

  async function geocodeSelected() {
    if (!selected) return;
    setGeoBusy(true);
    setErr("");
    setMsg("");
    try {
      const resp = await geocodeOne({ homeAddress: form.homeAddress });
      const nextLat = normalizeCoord(resp?.lat, "lat");
      const nextLng = normalizeCoord(resp?.lng, "lng");
      if (typeof nextLat !== "number" || typeof nextLng !== "number") throw new Error("Adres için koordinat bulunamadı.");
      setForm((prev) => ({ ...prev, lat: String(nextLat), lng: String(nextLng) }));
      setMsg("Adres bulundu. Gerekirse haritada ince ayar yapıp Kaydet'e bas.");
    } catch (e) {
      if (e?.status === 404) setErr("Adres bulunamadı.");
      else setErr(e?.message || String(e));
    } finally {
      setGeoBusy(false);
    }
  }

  async function saveSelected({ markOk = false } = {}) {
    if (!selected) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const resp = await api(`/api/company/personels/${selected.id}/location`, {
        method: "PUT",
        body: {
          fullName: String(form.fullName || "").trim(),
          phone: String(form.phone || "").trim() || null,
          homeAddress: String(form.homeAddress || "").trim() || null,
          lat: form.lat === "" ? null : Number(form.lat),
          lng: form.lng === "" ? null : Number(form.lng),
          geoManualOverride: markOk ? true : undefined,
          geoStatus: markOk ? "OK" : undefined,
        },
      });
      if (resp?.item) {
        patchItem(selected.id, resp.item);
        setMsg(markOk ? "Kayıt OK yapıldı." : "Konum kaydedildi.");
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function bulkGeocode() {
    const candidates = filtered.filter((p) => {
      const why = String(p.geoReason || p.geoNote || "");
      return why === "ADDRESS_ONLY" || why === "INVALID_COORD" || why === "MISSING_ADDRESS";
    });
    if (!candidates.length) return;
    setBusy(true);
    setErr("");
    setMsg("");
    let found = 0;
    let notFound = 0;
    let error = 0;
    try {
      for (const item of candidates) {
        try {
          const resp = await geocodeOne(item);
          const lat = normalizeCoord(resp?.lat, "lat");
          const lng = normalizeCoord(resp?.lng, "lng");
          if (typeof lat !== "number" || typeof lng !== "number") {
            error += 1;
            continue;
          }
          const saved = await api(`/api/company/personels/${item.id}/location`, {
            method: "PUT",
            body: {
              fullName: item.fullName,
              phone: item.phone || null,
              homeAddress: item.homeAddress || null,
              lat,
              lng,
              geoManualOverride: true,
              geoStatus: "OK",
            },
          });
          if (saved?.item) patchItem(item.id, saved.item);
          found += 1;
        } catch (e) {
          if (e?.status === 404) notFound += 1;
          else error += 1;
        }
      }
      setBulkStats({ found, notFound, error });
      setMsg(`Toplu işlem bitti. Bulundu: ${found} • Bulunamadı: ${notFound} • Hata: ${error}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const selectedReason = formatGeoReason(selected);

  return (
    <div style={{ width: "100%", maxWidth: "none" }}>
      <div className="card">
        <div className="topbar" style={{ alignItems: "flex-start", gap: 12 }}>
          <div>
            <div className="title">{school ? "Öğrenci Konum Seçici" : `${who} Konum Seçici`}</div>
            <div className="muted">
              Liste solda, harita sağda. Adresten bul, haritada seç ve kaydet. Bu ekran company/personel ve school/öğrenci için ortak çalışır.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {hasPlanningScope ? (
              <button type="button" className="btn" onClick={() => setScopeMode((p) => (p === "SESSION" ? "ALL" : "SESSION"))}>
                {scopeMode === "SESSION" ? "Tüm şirket kayıtlarını göster" : "Sadece bu planlamadakileri göster"}
              </button>
            ) : null}
            <button type="button" className="btn primary" onClick={() => navigate(basePath)}>
              {guidedResume ? "Rehberli adıma geri dön" : school ? "Okul Merkezi'ne dön" : "Planlama Merkezi'ne dön"}
            </button>
          </div>
        </div>

        {hasPlanningScope ? (
          <div className="card" style={{ marginTop: 12, borderColor: "rgba(59,130,246,.32)", background: "rgba(37,99,235,.08)" }}>
            <div style={{ fontWeight: 700 }}>
              {scopeMode === "SESSION" ? "Planlama oturumu filtresi açık" : "Planlama oturumu bulundu"}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Bu ekranda varsayılan olarak sadece aktif planlama oturumundaki kayıtları görebilirsin. Böylece seed/demo kayıtlar karışmaz ve işi bitirince aynı rehberli adıma dönmek kolaylaşır.
            </div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Ara: ad / tel / adres"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 180 }}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 200 }}>
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={load} disabled={busy || geoBusy}>{busy ? "..." : "Yenile"}</button>
          <button onClick={bulkGeocode} disabled={busy || geoBusy || !filtered.length}>
            {busy ? "Çalışıyor..." : "Toplu Adresten Bul"}
          </button>
          <div className="muted">
            Görünen: <b>{counts.visible}</b> / Toplam: <b>{counts.total}</b> • Hazır: <b>{counts.ok}</b> • İncelenecek: <b>{counts.review}</b> • Başarısız: <b>{counts.failed}</b> • Koordinatsız: <b>{counts.noCoord}</b>
          </div>
        </div>

        {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}
        {msg ? (
          <div className="card" style={{ marginTop: 12, borderColor: "rgba(34,197,94,.35)", background: "rgba(6,34,20,.25)" }}>
            {msg}
          </div>
        ) : null}
        {(bulkStats.found || bulkStats.notFound || bulkStats.error) ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Son toplu işlem → Bulundu: <b>{bulkStats.found}</b> • Bulunamadı: <b>{bulkStats.notFound}</b> • Hata: <b>{bulkStats.error}</b>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.1fr) minmax(420px, 1fr)", gap: 12, marginTop: 12 }}>
        <div className="card" style={{ minHeight: 620 }}>
          <div className="topbar">
            <div>
              <div className="title">{school ? "Öğrenci listesi" : `${who} listesi`}</div>
              <div className="muted">Bir kayıt seç, sağ tarafta haritadan pin ayarla.</div>
            </div>
            <div className="muted">
              {scopeMode === "SESSION" ? "Planlama oturumu" : "Tüm şirket kayıtları"} • <b>{filtered.length}</b>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12, maxHeight: 540 }}>
            <table className="tbl" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>Adres</th>
                  <th>Durum</th>
                  <th>Koordinat</th>
                  <th>Seç</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const active = Number(p.id) === Number(selected?.id);
                  const tone = statusTone(p.geoStatus);
                  const hasCoord = Number.isFinite(Number(p.homeLat)) && Number.isFinite(Number(p.homeLng));
                  return (
                    <tr key={p.id} style={active ? { outline: "1px solid rgba(59,130,246,.45)", background: "rgba(37,99,235,.06)" } : undefined}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.fullName || "-"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>#{p.id} • {p.kind || (school ? "STUDENT" : "PERSONEL")}</div>
                      </td>
                      <td>{p.phone || "-"}</td>
                      <td style={{ minWidth: 260 }}>
                        <div>{p.homeAddress || "-"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{formatGeoReason(p)}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            color: tone.color,
                            background: tone.bg,
                            border: `1px solid ${tone.color}33`,
                            fontWeight: 600,
                          }}
                        >
                          {p.geoStatus || "-"}
                        </span>
                      </td>
                      <td className="muted">{hasCoord ? `${Number(p.homeLat).toFixed(5)}, ${Number(p.homeLng).toFixed(5)}` : "Yok"}</td>
                      <td>
                        <button type="button" className={active ? "btn sm primary" : "btn sm"} onClick={() => setSelectedId(p.id)}>
                          {active ? "Seçili" : "Seç"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ padding: 12 }}>
                      {scopeMode === "SESSION" && hasPlanningScope
                        ? "Bu planlama oturumunda gösterilecek kayıt bulunamadı. İstersen üstten tüm şirket kayıtlarına geçebilirsin."
                        : "Kayıt bulunamadı."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <GeoLocationPicker
          title={school ? "Öğrenci konum seçici" : `${who} konum seçici`}
          subtitle="Adresi düzelt, adresten bul veya haritada tıklayarak pimi seç. İş bitince rehberli adıma geri dönüp kaldığın yerden devam edebilirsin."
          selectedName={selected?.fullName || "-"}
          address={form.homeAddress}
          onAddressChange={(value) => setForm((prev) => ({ ...prev, homeAddress: value }))}
          lat={form.lat}
          lng={form.lng}
          onPick={(lat, lng) => setForm((prev) => ({ ...prev, lat: String(lat.toFixed(6)), lng: String(lng.toFixed(6)) }))}
          onGeocode={geocodeSelected}
          onSave={() => saveSelected()}
          onMarkOk={() => saveSelected({ markOk: true })}
          onClear={() => setForm((prev) => ({ ...prev, lat: "", lng: "" }))}
          busy={busy || !selected}
          geoBusy={geoBusy}
          statusLabel={selected?.geoStatus || "-"}
          reasonLabel={selectedReason}
        />
      </div>
    </div>
  );
}
