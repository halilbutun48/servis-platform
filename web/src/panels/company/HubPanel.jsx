// web/src/panels/company/HubPanel.jsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function sanitizeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  s = s.replace(/[\/]+/g, " ");
  s = s.replace(/\b(no|no\.|numara|daire|apt|kat)\b\s*[:#-]?\s*\S+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (!/türkiye|turkiye|tr\b/i.test(s)) s = s + " Türkiye";
  return s;
}


export default function HubPanel() {
  const { token } = useSession();
  const [addr, setAddr] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr(""); setMsg("");
    try {
      const r = await api("/api/company/hub", { token });
      setLat(r?.hubLat == null ? "" : String(r.hubLat));
      setLng(r?.hubLng == null ? "" : String(r.hubLng));
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => { load(); }, []);

  async function myLocation() {
    setErr(""); setMsg("");
    if (!navigator?.geolocation) {
      setErr("Tarayıcı konum özelliği yok.");
      return;
    }
    setBusy(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          (e) => reject(e),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
      const a = pos?.coords?.latitude;
      const b = pos?.coords?.longitude;
      if (typeof a !== "number" || typeof b !== "number") throw new Error("Konum okunamadı");
      setLat(String(a));
      setLng(String(b));
      setMsg(`Konum alındı: ${a.toFixed(6)}, ${b.toFixed(6)}. Kaydet'e basarak kaydet.`);
    } catch (e) {
      const code = e?.code;
      const m =
        code === 1 ? "Konum izni reddedildi." :
        code === 2 ? "Konum bulunamadı." :
        code === 3 ? "Konum isteği zaman aşımına uğradı." :
        (e?.message || String(e));
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  async function geocode() {
    setErr(""); setMsg("");
    const q = sanitizeAddress(addr);
    if (!q) { setErr("Adres gir."); return; }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { method: "POST", token, body: { q, country: "tr" } });
      setLat(String(r.lat));
      setLng(String(r.lng));
      setMsg(`Konum bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}. Kaydet'e basarak kaydet.`);
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : (e?.message || String(e));
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr(""); setMsg("");
    const a = lat === "" ? null : Number(lat);
    const b = lng === "" ? null : Number(lng);
    setBusy(true);
    try {
      await api("/api/company/hub", { method: "PUT", token, body: { hubLat: a, hubLng: b } });
      setMsg("Kaydedildi.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Company Hub</h2>
      <div className="muted" style={{ marginBottom: 8 }}>
        Şirket tesisi/merkezi (hub) koordinatı. INBOUND/OUTBOUND rota merkezinde kullanılabilir.
      </div>

      {err ? <div className="error">{err}</div> : null}
      {msg ? <div className="ok">{msg}</div> : null}

      <div className="card" style={{ marginTop: 10 }}>
        <div className="muted">Adres</div>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="örn. OSB / Fabrika / İlçe / İl" disabled={busy} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label className="muted">
            Hub Lat
            <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} disabled={busy} />
          </label>
          <label className="muted">
            Hub Lng
            <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} disabled={busy} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={myLocation} disabled={busy}>Konumumu Al</button>
          <button type="button" onClick={geocode} disabled={busy}>Adresten Bul</button>
          <button type="button" onClick={save} disabled={busy}>Kaydet</button>
          <button type="button" onClick={load} disabled={busy}>Yenile</button>
        </div>
      </div>
    </div>
  );
}
