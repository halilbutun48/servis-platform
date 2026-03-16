// web/src/panels/company/GeoReviewPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { isSchool, personLabel } from "../../utils/labels";

const REASON_OPTIONS = [
  { value: "", label: "Tüm nedenler" },
  { value: "ADDRESS_ONLY", label: "Adres var, koordinat yok" },
  { value: "INVALID_COORD", label: "Koordinat eksik/geçersiz" },
  { value: "MISSING_ADDRESS", label: "Adres ve koordinat yok" },
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

export default function GeoReviewPanel() {
  const { me } = useSession();
  const who = personLabel(me);
  const school = isSchool(me);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [bulkStats, setBulkStats] = useState({ found: 0, notFound: 0, error: 0 });
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const kindQs = school ? "&kind=STUDENT" : "";
      const r = await api("/api/company/personels?geoStatus=NEEDS_REVIEW" + kindQs);
      setItems(Array.isArray(r?.items) ? r.items.filter((x) => x?.geoStatus === "NEEDS_REVIEW") : []);
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
  }, []);

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    return (items || []).filter((p) => {
      const reasonOk = !reason || String(p.geoReason || p.geoNote || "") === reason;
      if (!reasonOk) return false;
      if (!s) return true;
      const t = `${p.fullName || ""} ${p.phone || ""} ${p.homeAddress || ""}`.toLowerCase();
      return t.includes(s);
    });
  }, [items, q, reason]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function geocodeOne(item) {
    const q = sanitizeAddress(item.homeAddress);
    if (!q) throw new Error("Adres boş.");
    return api("/api/geocode", { method: "POST", body: { q, country: "tr" } });
  }

  async function bulkGeocode() {
    const candidates = filtered.filter((p) => String(p.geoReason || p.geoNote || "") === "ADDRESS_ONLY" || String(p.geoReason || p.geoNote || "") === "INVALID_COORD");
    if (!candidates.length) return;
    setBulkBusy(true);
    setErr("");
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
          await api(`/api/company/personels/${item.id}/location`, {
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
          found += 1;
          removeItem(item.id);
        } catch (e) {
          if (e?.status === 404) notFound += 1;
          else error += 1;
        }
      }
      setBulkStats({ found, notFound, error });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "none" }}>
      <div className="card">
        <div className="title">{school ? `${who} Konum İncele` : "Geocode Review"}</div>
        <div className="muted">NEEDS_REVIEW kayıtlarını burada düzeltip OK yapabilirsin.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Ara: ad / tel / adres"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 200 }}>
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={load} disabled={busy || bulkBusy}>{busy ? "..." : "Yenile"}</button>
          <button onClick={bulkGeocode} disabled={busy || bulkBusy || !filtered.length}>{bulkBusy ? "Çalışıyor..." : "Toplu Adresten Bul"}</button>
          <div className="muted">
            Kayıt: <b>{filtered.length}</b> &nbsp; Bulundu: <b>{bulkStats.found}</b> &nbsp; Bulunamadı: <b>{bulkStats.notFound}</b> &nbsp; Hata: <b>{bulkStats.error}</b>
          </div>
        </div>

        {err ? (
          <div className="card err" style={{ marginTop: 12 }}>{err}</div>
        ) : null}

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="tbl" style={{ minWidth: 1280 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Adres</th>
                <th>Lat</th>
                <th>Lng</th>
                <th>Durum</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <GeoRow key={p.id} idx={idx} p={p} onPatch={patchItem} onRemove={removeItem} setErr={setErr} />
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 12 }}>NEEDS_REVIEW kayıt yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GeoRow({ idx, p, onPatch, onRemove, setErr }) {
  const [fullName, setFullName] = useState(p.fullName || "");
  const [phone, setPhone] = useState(p.phone || "");
  const [address, setAddress] = useState(p.homeAddress || "");
  const [lat, setLat] = useState(p.homeLat ?? "");
  const [lng, setLng] = useState(p.homeLng ?? "");
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  const valid = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  async function saveRow({ markOk = false } = {}) {
    setBusy(true);
    setErr("");
    try {
      const resp = await api(`/api/company/personels/${p.id}/location`, {
        method: "PUT",
        body: {
          fullName: String(fullName || "").trim(),
          phone: String(phone || "").trim() || null,
          homeAddress: String(address || "").trim() || null,
          lat: lat === "" ? null : Number(lat),
          lng: lng === "" ? null : Number(lng),
          geoManualOverride: markOk ? true : undefined,
          geoStatus: markOk ? "OK" : undefined,
        },
      });
      const item = resp?.item || null;
      if (item?.geoStatus === "OK") onRemove(p.id);
      else if (item) onPatch(p.id, item);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function geocodeAddress() {
    const q = sanitizeAddress(address);
    if (!q) {
      setErr("Adres boş.");
      return;
    }
    setGeoBusy(true);
    setErr("");
    try {
      const resp = await api("/api/geocode", { method: "POST", body: { q, country: "tr" } });
      const nextLat = normalizeCoord(resp?.lat, "lat");
      const nextLng = normalizeCoord(resp?.lng, "lng");
      if (typeof nextLat !== "number" || typeof nextLng !== "number") throw new Error("Adres için koordinat bulunamadı.");
      setLat(String(nextLat));
      setLng(String(nextLng));
    } catch (e) {
      if (e?.status === 404) setErr("Adres bulunamadı.");
      else setErr(e?.message || String(e));
    } finally {
      setGeoBusy(false);
    }
  }

  return (
    <tr>
      <td>{idx + 1}</td>
      <td><input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ minWidth: 180 }} /></td>
      <td><input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ minWidth: 160 }} /></td>
      <td><input value={address} onChange={(e) => setAddress(e.target.value)} style={{ minWidth: 240 }} /></td>
      <td><input value={lat} onChange={(e) => setLat(e.target.value)} style={{ width: 140 }} /></td>
      <td><input value={lng} onChange={(e) => setLng(e.target.value)} style={{ width: 140 }} /></td>
      <td className="muted" style={{ minWidth: 180 }}>
        <div><b>{p.geoStatus || "-"}</b></div>
        <div style={{ fontSize: 12 }}>{p.geoReasonText || p.geoNote || "Neden yok"}</div>
      </td>
      <td>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={geocodeAddress} disabled={geoBusy || !String(address || "").trim()}>{geoBusy ? "Bulunuyor..." : "Adresten Bul"}</button>
          <button type="button" className="btn" onClick={() => saveRow()} disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</button>
          <button type="button" onClick={() => saveRow({ markOk: true })} disabled={!valid || busy}>{busy ? "..." : "OK Yap"}</button>
        </div>
      </td>
    </tr>
  );
}
