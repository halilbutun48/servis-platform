// web/src/panels/company/HubPanel.jsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import HubMapPicker from "../../components/geo/HubMapPicker";

function sanitizeAddress(input) {
  let s = String(input ?? "").trim();
  if (!s) return "";
  s = s.replace(/[/]+/g, " ");
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

  async function load(opts = {}) {
    const silent = Boolean(opts?.silent);
    setErr("");
    if (!silent) setMsg("");
    try {
      const r = await api("/api/company/hub", { token });
      setLat(r?.hubLat == null ? "" : String(r.hubLat));
      setLng(r?.hubLng == null ? "" : String(r.hubLng));
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function myLocation() {
    setErr("");
    setMsg("");
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
      setMsg(`Konum alındı: ${a.toFixed(6)}, ${b.toFixed(6)}. Kaydet'e bas.`);
    } catch (e) {
      const code = e?.code;
      const m =
        code === 1
          ? "Konum izni reddedildi."
          : code === 2
          ? "Konum bulunamadı."
          : code === 3
          ? "Konum isteği zaman aşımına uğradı."
          : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  async function geocode() {
    setErr("");
    setMsg("");
    const q = sanitizeAddress(addr);
    if (!q) {
      setErr("Adres gir.");
      return;
    }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { method: "POST", token, body: { q, country: "tr" } });
      setLat(String(r.lat));
      setLng(String(r.lng));
      setMsg(`Konum bulundu: ${Number(r.lat).toFixed(6)}, ${Number(r.lng).toFixed(6)}. Kaydet'e bas.`);
    } catch (e) {
      const m = e?.payload?.error === "notfound" ? "Geocode başarısız: notfound" : e?.message || String(e);
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr("");
    setMsg("");
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
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <PanelChrome
        title="Company Hub"
        subtitle="Şirket tesisi/merkezi (hub) koordinatı. INBOUND/OUTBOUND rota merkezinde kullanılır."
        actions={<button type="button" className="btn sm ghost" onClick={load} disabled={busy}>Yenile</button>}
      />

      <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="ROLE">Company Hub</span>
        <span className="pill" data-status="COUNT">Lat: {lat || "-"}</span>
        <span className="pill" data-status="COUNT">Lng: {lng || "-"}</span>
      </div>

      {err ? <div className="card err">{err}</div> : null}
      {msg ? <div className="card" style={{ borderColor: "rgba(34,197,94,.35)", background: "rgba(6,34,20,.25)" }}>{msg}</div> : null}

      <div className="grid" style={{ gridTemplateColumns: "minmax(320px, 360px) minmax(0, 1fr)", alignItems: "start" }}>
        <PanelChrome
          title="Adres ve Koordinat"
          subtitle="Hub koordinatını elle, konumla ya da harita üstünden seç."
        >
          <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <div className="panelMeta">Adres</div>
              <input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="örn. OSB / Fabrika / İlçe / İl"
                disabled={busy}
              />
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", minWidth: 0 }}>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div className="panelMeta">Hub Lat</div>
                <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} disabled={busy} />
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div className="panelMeta">Hub Lng</div>
                <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} disabled={busy} />
              </div>
            </div>

            <div className="toolbar" style={{ marginTop: 2 }}>
              <button type="button" className="btn sm" onClick={myLocation} disabled={busy}>
                Konumumu Al
              </button>
              <button type="button" className="btn sm" onClick={geocode} disabled={busy}>
                Adresten Bul
              </button>
              <button type="button" className="btn sm primary" onClick={save} disabled={busy}>
                Kaydet
              </button>
            </div>
          </div>
        </PanelChrome>

        <PanelChrome
          title="Konum Önizleme"
          subtitle="Pikselde gördüğün nokta, kayda gidecek konumu netleştirir."
        >
          <HubMapPicker
            lat={lat}
            lng={lng}
            busy={busy}
            subjectLabel="Company Hub"
            previewHeight={580}
            onPick={(nextLat, nextLng) => {
              setLat(String(nextLat));
              setLng(String(nextLng));
              setMsg(`Haritada seçildi: ${Number(nextLat).toFixed(6)}, ${Number(nextLng).toFixed(6)}. Kaydet'e bas.`);
              setErr("");
            }}
          />

          <div className="panelMeta" style={{ marginTop: 10 }}>
            Not: Konum izni için tarayıcı bazen <b>HTTPS</b> ister (localhost çoğu zaman OK).
          </div>
        </PanelChrome>
      </div>
    </div>
  );
}
