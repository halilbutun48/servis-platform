import { useEffect, useMemo, useState } from "react";
import MapView from "../../components/map/MapView";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import CollapsibleSection from "../../components/CollapsibleSection";
import { getEtaDisplay } from "../../utils/etaSanity";

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
  } catch {
    return String(iso);
  }
}

function toNum(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function stopCoord(stop) {
  const lat = toNum(stop?.lat ?? stop?.location?.lat);
  const lng = toNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function sameStop(a, b) {
  const aId = Number(a?.id || 0);
  const bId = Number(b?.id || 0);
  if (aId > 0 && bId > 0) return aId === bId;

  const ac = stopCoord(a);
  const bc = stopCoord(b);
  if (!ac || !bc) return false;

  const dist = haversineMeters(ac.lat, ac.lng, bc.lat, bc.lng);
  if (dist > 3) return false;

  const aName = String(a?.name || "").trim().toLowerCase();
  const bName = String(b?.name || "").trim().toLowerCase();
  if (aName && bName) return aName === bName;

  return true;
}

function stopUniqueKey(stop, idx = 0) {
  const id = Number(stop?.id || 0);
  if (id > 0) return `id:${id}`;
  const coord = stopCoord(stop);
  const order = Number(stop?.order || 0);
  const name = String(stop?.name || "").trim().toLowerCase();
  if (coord) return `coord:${coord.lat.toFixed(6)}:${coord.lng.toFixed(6)}:${order}:${name}`;
  return `fallback:${order}:${name}:${idx}`;
}

function dedupeStops(list) {
  const out = [];
  const seen = new Set();
  for (const [idx, item] of (Array.isArray(list) ? list : []).entries()) {
    if (!item) continue;
    const key = stopUniqueKey(item, idx);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractShiftStops(data) {
  const raw = [
    ...(Array.isArray(data?.shift?.stops) ? data.shift.stops : []),
    ...(Array.isArray(data?.shift?.route?.stops) ? data.shift.route.stops : []),
    ...(Array.isArray(data?.route?.stops) ? data.route.stops : []),
    ...(Array.isArray(data?.stops) ? data.stops : []),
  ];
  const deduped = dedupeStops(raw)
    .filter(Boolean)
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  if (data?.stop && !deduped.some((x) => sameStop(x, data.stop))) deduped.push(data.stop);
  return deduped;
}

function stopLabel(stop, { ownStop } = {}) {
  const base = String(stop?.name || `Durak #${stop?.id || "-"}`).trim();
  const own = ownStop && sameStop(stop, ownStop);
  if (own) return `Kendi durağınız • ${base}`;
  return base;
}

function buildUserNavUrl(stop, myPos) {
  const sc = stopCoord(stop);
  if (!sc) return "";
  const dest = `${sc.lat},${sc.lng}`;
  const hasOrigin = Number.isFinite(Number(myPos?.lat)) && Number.isFinite(Number(myPos?.lng));
  const originPart = hasOrigin ? `&origin=${Number(myPos.lat)},${Number(myPos.lng)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${dest}&travelmode=walking`;
}

function buildVehicleNavUrl(stop, vehicle) {
  const sc = stopCoord(stop);
  const lat = toNum(vehicle?.gpsLast?.lat);
  const lng = toNum(vehicle?.gpsLast?.lng);
  if (!sc) return "";
  const dest = `${sc.lat},${sc.lng}`;
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export default function PassengerLivePanel() {
  const [token, setToken] = useState(readTokenFromHash());
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [myPos, setMyPos] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState("");

  async function load() {
    const tk = readTokenFromHash();
    setToken(tk);
    if (!tk) {
      setErr("Geçerli bağlantı bulunamadı.");
      setData(null);
      return;
    }
    setBusy(true);
    try {
      const cleanPath = String(window.location.hash || "").includes("/public/personel-live") ? "personel-live" : "passenger-live";
      const res = await fetch(`/api/public/${cleanPath}?token=${encodeURIComponent(tk)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Link okunamadı");
      setErr("");
      setData(json);
    } catch {
      setErr("Canlı servis bilgisi şu anda okunamadı. Linki yenileyip tekrar deneyin.");
      setData(null);
    } finally {
      setBusy(false);
    }
  }

  function requestMyLocation() {
    setGeoErr("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Bu cihaz konum paylaşımını desteklemiyor. Konum destekleyen bir cihazda tekrar deneyin.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setMyPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        setGeoBusy(false);
        setGeoErr("Konum henüz alınamadı. Konum iznini ve cihaz ayarlarını kontrol edin.");
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  useEffect(() => {
    load();
    requestMyLocation();
    const onHash = () => load();
    window.addEventListener("hashchange", onHash);
    const t = window.setInterval(load, 15000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.clearInterval(t);
    };
  }, []);

  const isLive = String(data?.phase || "") === "LIVE";
  const vehicles = useMemo(() => (isLive && data?.vehicle ? [data.vehicle] : []), [data, isLive]);
  const ownStop = useMemo(() => data?.stop || null, [data]);
  const stopPoint = useMemo(() => stopCoord(ownStop), [ownStop]);
  const shiftStops = useMemo(() => extractShiftStops(data), [data]);

  const nearestStops = useMemo(() => {
    if (!myPos) return [];
    return shiftStops
      .map((stop) => {
        const coord = stopCoord(stop);
        if (!coord) return null;
        return {
          ...stop,
          __distanceM: haversineMeters(Number(myPos.lat), Number(myPos.lng), coord.lat, coord.lng),
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.__distanceM || 0) - Number(b.__distanceM || 0));
  }, [shiftStops, myPos]);

  const nearestStop = useMemo(() => nearestStops[0] || null, [nearestStops]);

  const mapStops = useMemo(() => {
    const arr = shiftStops
      .map((stop, idx) => {
        const coord = stopCoord(stop);
        if (!coord) return null;
        return {
          ...stop,
          id: stop?.id ?? `shift-stop-${idx}`,
          name: stopLabel(stop, { ownStop }),
          lat: coord.lat,
          lng: coord.lng,
          status: sameStop(stop, ownStop) ? "DONE" : "PENDING",
        };
      })
      .filter(Boolean);
    if (myPos && Number.isFinite(Number(myPos.lat)) && Number.isFinite(Number(myPos.lng))) {
      arr.push({
        id: "me",
        name: "Siz",
        lat: Number(myPos.lat),
        lng: Number(myPos.lng),
        status: "DONE",
      });
    }
    return arr;
  }, [shiftStops, ownStop, myPos]);

  const userNavUrl = useMemo(() => buildUserNavUrl(ownStop, myPos), [ownStop, myPos]);
  const nearestNavUrl = useMemo(() => buildUserNavUrl(nearestStop, myPos), [nearestStop, myPos]);
  const vehicleNavUrl = useMemo(() => buildVehicleNavUrl(ownStop, data?.vehicle), [ownStop, data]);
  const myDistanceM = useMemo(() => {
    if (!stopPoint || !myPos) return null;
    return haversineMeters(Number(myPos.lat), Number(myPos.lng), stopPoint.lat, stopPoint.lng);
  }, [stopPoint, myPos]);
  const myWalkMin = useMemo(() => {
    if (!Number.isFinite(Number(myDistanceM))) return null;
    return Math.max(1, Math.round(Number(myDistanceM) / 80));
  }, [myDistanceM]);

  const nearestDistanceM = useMemo(() => {
    if (!nearestStop || !myPos) return null;
    return Number(nearestStop.__distanceM || 0);
  }, [nearestStop, myPos]);

  const nearestWalkMin = useMemo(() => {
    if (!Number.isFinite(Number(nearestDistanceM))) return null;
    return Math.max(1, Math.round(Number(nearestDistanceM) / 80));
  }, [nearestDistanceM]);

  const liveStatusLabel = data
    ? (isLive ? "Canlı" : data.phase === "SCHEDULED" ? "Planlandı" : "Tamamlandı")
    : "Bekleniyor";
  const etaSummary = isLive
    ? getEtaDisplay({
        etaMinutes: data?.etaMin,
        gpsStatus: data?.vehicle?.gpsState?.lastUiStatus || data?.vehicle?.gpsState?.lastStatus || data?.status || (data ? "LIVE" : "UNKNOWN"),
        gpsAge: data?.vehicle?.gpsLast || data?.gpsLast,
        nextStopName: data?.nextStop?.name,
      })
    : "Vardiya saatinde görünür";
  const liveSteps = [
    `Durak ${shiftStops.length}`,
    `Kalan ${data?.remainingStopsTotal ?? "-"}`,
    `Konum ${myPos ? "Alındı" : "Bekleniyor"}`,
  ];

  return (
    <div className="wrap">
      <div className="card">
        <FlowSummaryStrip
          title="Canlı Servis Linki"
          description="Bu bağlantı yalnızca size ait durak, araç yaklaşımı ve navigasyon bilgisini gösterir."
          statusText={busy ? "Yükleniyor" : err ? "Bağlantı okunamadı" : liveStatusLabel}
          tone={isLive ? "success" : data ? "warning" : "info"}
          steps={liveSteps}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 12 }}>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Durum</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{liveStatusLabel}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">ETA</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{etaSummary}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Konum</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{myPos ? "Alındı" : "Bekleniyor"}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Kalan durak</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.remainingStopsTotal ?? "-"}</div>
          </div>
        </div>
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
              <div className="muted">Araç: <b>{isLive ? (data?.vehicle?.plate || "Henüz atanmadı") : "Vardiya saatinde görünür"}</b></div>
              <div className="muted">Durum: <b>{data.phase === "LIVE" ? "Canlı" : data.phase === "SCHEDULED" ? "Planlandı" : "Tamamlandı"}</b></div>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>Vardiya: <b>{fmtTR(data?.shift?.startAt)}</b> → <b>{fmtTR(data?.shift?.endAt)}</b></div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="title">Sizin durağınız ve navigasyon</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>Kendi durağınız: <b>{ownStop?.name || "-"}</b></div>
              <div>
                En yakın durak: <b>{nearestStop?.name || "-"}</b>
                {nearestStop && ownStop && sameStop(nearestStop, ownStop) ? <span className="muted"> • Kendi durağınız ile aynı</span> : null}
              </div>
              {isLive ? (
                <div className="muted">
                  Araçtan durağa ETA: <b>{getEtaDisplay({
                    etaMinutes: data?.etaMin,
                    gpsStatus: data?.vehicle?.gpsState?.lastUiStatus || data?.vehicle?.gpsState?.lastStatus || data?.status || (data ? "LIVE" : "UNKNOWN"),
                    gpsAge: data?.vehicle?.gpsLast || data?.gpsLast,
                    nextStopName: data?.nextStop?.name,
                  })}</b>
                  {" • "}
                  Araçtan durağa mesafe: <b>{data?.etaKm != null ? `${data.etaKm} km` : "-"}</b>
                </div>
              ) : (
                <div className="muted">Araç bilgisi yalnız vardiya saatinde görünür.</div>
              )}
              <div className="muted">
                Sizden kendi durağınıza: <b>{myDistanceM != null ? `${(Number(myDistanceM) / 1000).toFixed(2)} km` : "Konum alınmadı"}</b>
                {myWalkMin != null ? <> • Yaklaşık yürüyüş: <b>{myWalkMin} dk</b></> : null}
                {myPos && Number.isFinite(Number(myPos.accuracy)) ? <> • doğruluk ~<b>{Math.round(Number(myPos.accuracy))} m</b></> : null}
              </div>
              <div className="muted">
                Sizden en yakın durağa: <b>{nearestDistanceM != null ? `${(Number(nearestDistanceM) / 1000).toFixed(2)} km` : "Konum alınmadı"}</b>
                {nearestWalkMin != null ? <> • Yaklaşık yürüyüş: <b>{nearestWalkMin} dk</b></> : null}
              </div>
              <div className="muted">Sonraki durak: <b>{data?.nextStop?.name || "-"}</b> • Size kalan durak: <b>{data?.remainingStopsToMine ?? "-"}</b></div>
              <div className="muted">Toplam kalan: <b>{data?.remainingStopsTotal ?? "-"}</b>{data?.myStopReached ? " • Durağınıza ulaşıldı" : ""}</div>
              {geoErr ? <div className="muted" style={{ color: "#fca5a5" }}>Konum alınamadı: {geoErr}</div> : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
                <button type="button" onClick={requestMyLocation} disabled={geoBusy}>{geoBusy ? "..." : (myPos ? "Konumumu Yenile" : "Konumumu Al")}</button>
                {userNavUrl ? (
                  <button type="button" onClick={() => window.open(userNavUrl, "_blank", "noopener,noreferrer")}>Durağıma Navigasyon Aç</button>
                ) : null}
                {nearestNavUrl ? (
                  <button type="button" onClick={() => window.open(nearestNavUrl, "_blank", "noopener,noreferrer")}>En Yakın Durağa Navigasyon Aç</button>
                ) : null}
                {isLive && vehicleNavUrl ? (
                  <button type="button" onClick={() => window.open(vehicleNavUrl, "_blank", "noopener,noreferrer")}>Aracın rota yönünü aç</button>
                ) : null}
              </div>
              {nearestStops.length ? (
                <div className="muted">
                  En yakın 3 durak:{" "}
                  {nearestStops.slice(0, 3).map((stop, idx) => (
                    <span key={stop?.id ?? `${stop?.name || "stop"}-${idx}`}>
                      {idx > 0 ? " • " : ""}
                      <b>{stop?.name || `Durak #${stop?.id || "-"}`}</b>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <CollapsibleSection
              title="Detay"
              subtitle="Vardiya durakları ve en yakın durak bilgisi kontrollü alanda gösterilir."
              badge={shiftStops.length}
              defaultOpen={false}
              compact
            >
              {shiftStops.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {shiftStops.map((stop, idx) => {
                    const isOwn = ownStop && sameStop(stop, ownStop);
                    const isNearest = nearestStop && sameStop(stop, nearestStop);
                    const quickUrl = buildUserNavUrl(stop, myPos);
                    return (
                      <div
                        key={stop?.id ?? `shift-stop-row-${idx}`}
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div>
                          <b>{stop?.name || `Durak #${stop?.id || idx + 1}`}</b>
                          <span className="muted">
                            {isOwn ? " • Kendi durağınız" : ""}
                            {isNearest && !isOwn ? " • En yakın durak" : ""}
                            {!stopCoord(stop) ? " • Koordinat yok" : ""}
                          </span>
                        </div>
                        {quickUrl ? (
                          <button type="button" onClick={() => window.open(quickUrl, "_blank", "noopener,noreferrer")}>
                            Git
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="muted">Shift durağı bulunamadı.</div>
              )}
            </CollapsibleSection>
          </div>

          <div style={{ marginTop: 12 }}>
            <CollapsibleSection
              title="Kanıt"
              subtitle={isLive ? "Araç yaklaşımı ve tüm duraklar burada görülür." : "Duraklar yalnız vardiya saatinde canlı görünür."}
              defaultOpen={false}
              compact
            >
              <MapView vehicles={vehicles} stops={mapStops} />
            </CollapsibleSection>
          </div>
        </>
      ) : null}

      {!data && !err ? (
        <div className="card" style={{ marginTop: 12 }}>{busy ? "Yükleniyor..." : (token ? "Bağlantı okunuyor..." : "Bağlantı bekleniyor...")}</div>
      ) : null}
    </div>
  );
}
