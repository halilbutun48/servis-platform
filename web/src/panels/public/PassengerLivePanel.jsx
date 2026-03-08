import { useEffect, useMemo, useState } from "react";
import MapView from "../../components/map/MapView";

function readTokenFromHash() {
  const hash = String(window.location.hash || "");
  const idx = hash.indexOf("?");
  const q = idx >= 0 ? hash.slice(idx + 1) : "";
  const params = new URLSearchParams(q);
  return String(params.get("token") || window.location.search?.replace(/^\?token=/, "") || "").trim();
}

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch { return String(iso); }
}

function buildNavUrl(stop, vehicle) {
  if (!stop || typeof stop.lat !== "number" || typeof stop.lng !== "number") return "";
  const dest = `${stop.lat},${stop.lng}`;
  if (vehicle?.gpsLast?.lat != null && vehicle?.gpsLast?.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${vehicle.gpsLast.lat},${vehicle.gpsLast.lng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export default function PassengerLivePanel() {
  const [token, setToken] = useState(readTokenFromHash());
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const tk = readTokenFromHash();
    setToken(tk);
    if (!tk) { setErr("Link token bulunamadı."); setData(null); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/public/passenger-live?token=${encodeURIComponent(tk)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Link okunamadı");
      setErr("");
      setData(json);
    } catch (e) {
      setErr(String(e?.message || e));
      setData(null);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    load();
    const onHash = () => load();
    window.addEventListener("hashchange", onHash);
    const t = window.setInterval(load, 15000);
    return () => { window.removeEventListener("hashchange", onHash); window.clearInterval(t); };
  }, []); // eslint-disable-line

  const vehicles = useMemo(() => (data?.vehicle ? [data.vehicle] : []), [data]);
  const stops = useMemo(() => (data?.stop ? [data.stop] : []), [data]);
  const navUrl = buildNavUrl(data?.stop, data?.vehicle);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Canlı Servis Linki</div>
        <div className="muted">Bu bağlantı yalnızca size ait durak, araç yaklaşımı ve navigasyon bilgisini gösterir.</div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 12 }}>
          <b>Link kullanılamıyor:</b> {err}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <div>{data?.personel?.fullName ? <b>{data.personel.fullName}</b> : "Kişi"}</div>
              <div className="muted">Kuruluş: <b>{data?.company?.name || "-"}</b></div>
              <div className="muted">Araç: <b>{data?.vehicle?.plate || "Henüz atanmadı"}</b></div>
              <div className="muted">Durum: <b>{data.phase === "LIVE" ? "Canlı" : data.phase === "SCHEDULED" ? "Planlandı" : "Tamamlandı"}</b></div>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>Vardiya: <b>{fmtTR(data?.shift?.startAt)}</b> → <b>{fmtTR(data?.shift?.endAt)}</b></div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="title">Sizin Durağınız</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>Durak: <b>{data?.stop?.name || "-"}</b></div>
              <div className="muted">ETA: <b>{data?.etaMin != null ? `${data.etaMin} dk` : "-"}</b> • Mesafe: <b>{data?.etaKm != null ? `${data.etaKm} km` : "-"}</b></div>
              <div className="muted">Sonraki durak: <b>{data?.nextStop?.name || "-"}</b> • Size kalan durak: <b>{data?.remainingStopsToMine ?? "-"}</b></div>
              <div className="muted">Toplam kalan: <b>{data?.remainingStopsTotal ?? "-"}</b>{data?.myStopReached ? " • Durağınıza ulaşıldı" : ""}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
                {navUrl ? (
                  <button type="button" onClick={() => window.open(navUrl, "_blank", "noopener,noreferrer")}>Durağıma Navigasyon Aç</button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 8 }}>Araç yaklaşımı</div>
            <MapView vehicles={vehicles} stops={stops} />
          </div>
        </>
      ) : null}

      {!data && !err ? (
        <div className="card" style={{ marginTop: 12 }}>{busy ? "Yükleniyor..." : (token ? "Link okunuyor..." : "Token bekleniyor...")}</div>
      ) : null}
    </div>
  );
}
