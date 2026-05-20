// web/src/panels/personel/LivePanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { pickNextStopByRemainingKmOrEta } from "../../components/stopTimelineUtils";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { displayStatusLabel } from "../../utils/displayStatus";
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel } from "../../utils/etaSanity";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";

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

function toNum(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function gpsAtIso(v) {
  return v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.createdAt || v?.gpsLast?.updatedAt || null;
}

function gpsAgeLabel(v) {
  return getGpsAgeText(v);
}

function etaDisplayText(vehicle, etaMinutes, nextStop) {
  return getEtaDisplay({
    etaMinutes,
    gpsStatus: vehicle ? uiStatusFromVehicle(vehicle) : "UNKNOWN",
    gpsAge: vehicle?.gpsLast,
    nextStopName: nextStop?.name,
  });
}

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function stopCoord(stop) {
  const lat = toNum(stop?.lat ?? stop?.location?.lat);
  const lng = toNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function gpsCoord(v) {
  const lat = toNum(v?.gpsLast?.lat);
  const lng = toNum(v?.gpsLast?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function focusStop(stop) {
  const c = stopCoord(stop);
  if (!c) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat: c.lat, lng: c.lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const sc = stopCoord(stop);
  if (!sc) return;

  const vc = gpsCoord(originVehicle);
  const dest = `${sc.lat},${sc.lng}`;
  const url = vc
    ? `https://www.google.com/maps/dir/?api=1&origin=${vc.lat},${vc.lng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function isReachedStop(s) {
  const st = String(s?.status || s?.state || "").toUpperCase();
  if (st === "REACHED" || st === "DONE" || st === "SKIPPED") return true;
  if (Boolean(s?.reachedAt) || Boolean(s?.reached)) return true;
  return false;
}

function normalizeStop(s, i) {
  const order = s?.order ?? (i + 1);
  const id = s?.id ?? `${order}`;
  const name = s?.name ?? s?.title ?? `Durak ${order}`;
  const lat = s?.lat ?? s?.location?.lat;
  const lng = s?.lng ?? s?.location?.lng;
  const statusRaw = s?.status || s?.state || (Boolean(s?.reachedAt) || Boolean(s?.reached) ? "REACHED" : "");
  const status = statusRaw ? String(statusRaw).toUpperCase() : "";
  return { ...s, id, order, name, lat, lng, status };
}

function etaQualityTone(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (["OFFLINE_GPS", "STALE_GPS", "SKIP_PRESENT", "DONE_WITH_SKIPS"].includes(q)) return "WARN";
  if (q === "DONE") return "OK";
  return "LIVE";
}

function etaQualityText(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (q === "OFFLINE_GPS") return "GPS kapalı veya çok eski";
  if (q === "STALE_GPS") return "GPS gecikmeli";
  if (q === "SKIP_PRESENT") return "Atlanan durak var";
  if (q === "DONE_WITH_SKIPS") return "Rota bitti, atlanan durak var";
  if (q === "DONE") return "Rota tamamlandı";
  if (q === "NO_SHIFT") return "Aktif rota yok";
  return String(eta?.progressLabel || "Rota ilerliyor");
}

function nextActionText(eta) {
  const act = String(eta?.nextAction || "").toUpperCase();
  if (act === "CONTACT_ROOM") return "Rota tamamlandı; atlanan durak için oda ile görüşün.";
  if (act === "WAIT_GPS_UPDATE") return "GPS verisi güncellenene kadar kısa süre bekleyin.";
  if (act === "NO_ACTIVE_ROUTE") return "Şu an aktif rota görünmüyor.";
  return "";
}

function etaMinGuess(vehicle, stop) {
  if (!vehicle || !stop) return null;

  const em = toNum(stop?.etaMin);
  if (em != null) return Math.max(0, Math.round(em));

  const km = toNum(stop?.remainingKm);
  if (km != null) return Math.max(1, Math.round((km / 35) * 60));

  const vc = gpsCoord(vehicle);
  const sc = stopCoord(stop);
  if (vc && sc) {
    // rough: haversine / 35 km/h
    const km2 = haversineMeters(vc.lat, vc.lng, sc.lat, sc.lng) / 1000;
    return Math.max(1, Math.round((km2 / 35) * 60));
  }

  return null;
}

const PERSONEL_LIVE_TABS = [
  { key: "timeline", label: "Duraklar" },
  { key: "map", label: "Harita" },
];

export default function PersonelLivePanel() {
  const { token } = useSession();

  const [myShift, setMyShift] = useState(null);
  const [eta, setEta] = useState(null);
  const [err, setErr] = useState("");
  const [myPos, setMyPos] = useState(null);
  const [geoErr, setGeoErr] = useState("");
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [viewMode, setViewMode] = useState("timeline");

  async function loadMyShift() {
    setErr("");
    try {
      const r = await api("/api/shifts/my", { token });
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      const s = items[0] || null;
      setMyShift(s);
      return s;
    } catch (e) {
      setMyShift(null);
      setErr(String(e?.message || e));
      return null;
    }
  }

  async function loadEta(vid, shiftId) {
    if (!vid) return;
    try {
      const qs = shiftId ? "?shiftId=" + encodeURIComponent(String(shiftId)) : "";
      const r = await api("/api/eta/vehicle/" + encodeURIComponent(String(vid)) + qs, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadAll() {
    const s = await loadMyShift();
    const vid = s?.vehicleId || s?.vehicle?.id || null;
    await loadEta(vid, s?.id || null);
  }

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      loadAllRef.current();
    });
  }, [token]);

  useAutoReload("shifts", loadAll);
  useAutoReload("vehicles", loadAll);
  useAutoReload("eta", loadAll);

  // Best-effort: get person's location once (for nearest-stop suggestion)
  useEffect(() => { queueMicrotask(() => { setGeoErr(""); }); if (typeof navigator === "undefined" || !navigator.geolocation) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy });
        },
        (e) => {
          queueMicrotask(() => setGeoErr(String(e?.message || e)));
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 }
      );
    } catch (e) {
      queueMicrotask(() => setGeoErr(String(e?.message || e)));
    }
  }, []);

  const baseVehicle = myShift?.vehicle || null;

  const vehicle = useMemo(() => {
    if (!baseVehicle) return null;

    // /api/shifts/my payload'ı bazen gpsLast içermeyebilir; ETA payload'ından ödünç al.
    if (baseVehicle?.gpsLast?.at || baseVehicle?.gpsLast?.ts || !eta?.last) return baseVehicle;

    return {
      ...baseVehicle,
      gpsLast: {
        ...(baseVehicle.gpsLast || {}),
        lat: eta.last?.lat,
        lng: eta.last?.lng,
        at: eta.last?.at,
        speed: eta.last?.speed } };
  }, [baseVehicle, eta]);

  const vehicles = useMemo(() => (vehicle ? [vehicle] : []), [vehicle]);

  const stops = useMemo(() => {
    const baseAll = Array.isArray(myShift?.stops) ? myShift.stops : [];
    const etaStops = Array.isArray(eta?.stops) ? eta.stops : [];

    const etaById = new Map(etaStops.map((s) => [String(s?.id ?? ""), s]));
    const etaByOrder = new Map(etaStops.map((s) => [String(s?.order ?? ""), s]));

    if (baseAll.length) {
      return baseAll.map((s, i) => {
        const n = normalizeStop(s, i);
        const e = etaById.get(String(n.id)) || etaByOrder.get(String(n.order));
        if (e) {
          const km = toNum(e?.remainingKm);
          const em = toNum(e?.etaMin);
          if (km != null) n.remainingKm = km;
          if (em != null) n.etaMin = em;
        }
        return n;
      });
    }

    // fallback: ETA list (pending only)
    return etaStops.map((s, i) => normalizeStop(s, i));
  }, [eta, myShift]);

  const nextStop = useMemo(() => {
    const picked = pickNextStopByRemainingKmOrEta(stops);
    if (picked) return picked;
    return stops.find((s) => !isReachedStop(s)) || null;
  }, [stops]);
  const nextStopId = nextStop?.id ?? null;

  const reachedCount = useMemo(() => stops.filter((s) => isReachedStop(s)).length, [stops]);
  const totalStops = stops.length;
  const pct = totalStops ? Math.min(100, Math.max(0, Math.round((reachedCount / totalStops) * 100))) : 0;

  const ui = vehicle ? uiStatusFromVehicle(vehicle) : "-";
  const pillKey = pillKeyFromUi(ui);
  const nextEtaMin = useMemo(() => etaMinGuess(vehicle, nextStop), [vehicle, nextStop]);
  const remainingStopsCount = Number(eta?.remainingStopsCount || 0);
  const remainingRouteEtaMin = Number.isFinite(Number(eta?.remainingRouteEtaMin)) ? Number(eta.remainingRouteEtaMin) : null;
  const remainingRouteKm = Number.isFinite(Number(eta?.remainingRouteKm)) ? Number(eta.remainingRouteKm) : null;
  const skippedStopsCount = Number(eta?.skippedStopsCount || 0);
  const skippedStops = Array.isArray(eta?.skippedStops) ? eta.skippedStops : [];
  const routeQualityText = etaQualityText(eta);
  const routeQualityTone = etaQualityTone(eta);
  const nextActionTextValue = nextActionText(eta);
  const gpsSourceLabel = vehicle?.gpsState?.lastSource || vehicle?.gpsState?.sourceLabel || vehicle?.gpsLast?.sourceLabel || (vehicle ? 'Araç GPS’i' : 'GPS bekleniyor');
  const gpsStatusText = getGpsReliabilityLabel(ui);
  const copilotFacts = useMemo(() => buildMapFacts({
    selected: vehicle,
    selectedShift: myShift,
    selectedNext: nextStop,
    selectedEta: nextEtaMin,
    selectedStats: { total: totalStops, remaining: remainingStopsCount, completed: reachedCount },
    gpsStatus: gpsStatusText,
    gpsAge: gpsAgeLabel(vehicle),
    vehicleCount: vehicles.length,
  }), [vehicle, myShift, nextStop, nextEtaMin, totalStops, remainingStopsCount, reachedCount, gpsStatusText, vehicles.length]);
  const copilotSelection = useMemo(() => {
    if (!vehicle && !myShift) return null;
    const serviceLabel = vehicle?.plate || (myShift?.vehicleId ? `#${myShift.vehicleId}` : `Shift #${myShift?.id || '-'}`);
    const parts = [
      `Shift #${myShift?.id || '-'}`,
      displayStatusLabel(String(myShift?.status || '-').toUpperCase()),
      vehicle?.plate ? `Araç ${vehicle.plate}` : null,
      `Son GPS ${gpsAgeLabel(vehicle)}`,
      nextStop?.name ? `Sıradaki ${nextStop.name}` : null,
      nextEtaMin != null ? `ETA ${etaDisplayText(vehicle, nextEtaMin, nextStop)}` : null,
      remainingStopsCount ? `Kalan durak ${remainingStopsCount}` : null,
    ].filter(Boolean);
    return {
      scopeKey: "/personel/live",
      entityType: vehicle?.id ? "vehicle" : "shift",
      entityId: Number(vehicle?.id || myShift?.id || 0) || null,
      label: vehicle?.plate ? `Bugünkü servis • ${vehicle.plate}` : `Shift #${myShift?.id || "-"}`,
      summary: parts.join(" • "),
      fields: [
        { label: 'Servis', value: serviceLabel, help: 'Sana bağlı bugünkü servis veya vardiya etiketini gösterir.' },
        { label: 'Araç', value: vehicle?.plate || (myShift?.vehicleId ? `#${myShift.vehicleId}` : '-'), help: 'Seçili aracın plakasını gösterir.' },
        { label: 'Sürücü', value: myShift?.driver?.fullName || (myShift?.driverId ? `#${myShift.driverId}` : '-'), help: 'Bağlı sürücü adını gösterir.' },
        { label: 'Son GPS', value: gpsAgeLabel(vehicle), help: 'Son canlı konumun ne kadar önce geldiğini gösterir.' },
        { label: 'GPS durumu', value: gpsStatusText, help: 'Araç GPS sinyalinin canlı mı eski mi olduğunu gösterir.' },
        { label: 'Kaynak', value: gpsSourceLabel, help: 'Konum kaynağını Türkçe ve güvenli olarak gösterir.' },
        { label: 'Sıradaki durak', value: nextStop?.name || '-', help: 'Bir sonraki durak adını gösterir.' },
        { label: 'ETA', value: nextEtaMin != null ? etaDisplayText(vehicle, nextEtaMin, nextStop) : '-', help: 'Sıradaki durağa kalan tahmini süreyi güvenli biçimde gösterir.' },
        { label: 'Servis durumu', value: displayStatusLabel(String(myShift?.status || '-').toUpperCase()), help: 'Vardiya veya servis durumunu gösterir.' },
      ],
      badges: [
        { label: 'Araç GPS’i', value: gpsStatusText, help: 'Araç GPS sinyalinin görünürlüğünü gösterir.' },
        { label: 'Sürücünün telefon GPS’i', value: gpsSourceLabel, help: 'Sürücünün telefon GPS’i veya konum kaynağı metnini gösterir.' },
      ],
      facts: {
        ...copilotFacts,
        selectedRecordType: vehicle?.id ? 'vehicle' : 'shift',
        selectedRecordId: Number(vehicle?.id || myShift?.id || 0) || 0,
        selectedRecordLabel: vehicle?.plate || `Shift #${myShift?.id || '-'}`,
        selectedRecordStatus: copilotFacts?.selectedRecordStatus || '',
      },
    };
  }, [vehicle, myShift, nextStop, nextEtaMin, remainingStopsCount, gpsSourceLabel, gpsStatusText, copilotFacts]);

  useEffect(() => {
    if (!copilotSelection) {
      clearCopilotSelection('/personel/live');
      return undefined;
    }
    setCopilotSelection(copilotSelection);
    return () => clearCopilotSelection('/personel/live');
  }, [copilotSelection]);

  const recommended = useMemo(() => {
    if (!myPos || !Number.isFinite(myPos.lat) || !Number.isFinite(myPos.lng)) return null;

    let candidates = stops
      .map((s) => {
        const c = stopCoord(s);
        if (!c) return null;
        const distM = haversineMeters(myPos.lat, myPos.lng, c.lat, c.lng);
        return { stop: { ...s, lat: c.lat, lng: c.lng }, distM };
      })
      .filter(Boolean);

    // Prefer pickup-like stops if present
    const pick = candidates.filter((c) => {
      const t = String(c.stop?.type ?? c.stop?.kind ?? c.stop?.stopType ?? "").toUpperCase();
      return t.includes("PICK");
    });
    if (pick.length) candidates = pick;

    candidates.sort((a, b) => a.distM - b.distM);
    const best = candidates[0];
    if (!best) return null;
    if (best.distM > 1500) return null;
    return best;
  }, [stops, myPos]);

  function fitAll() {
    try {
      window.dispatchEvent(new Event("map:fitAll"));
    } catch { /* no-op */ }
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Personel • Canlı Harita</div>
          <div className="muted">Sana ait durak + araç yaklaşımı + ETA + navigasyon</div>
        </div>
      </div>
      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(520px, calc(100vh - 420px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 285px)" }}>
          <div className="title" style={{ fontSize: 16 }}>
            Şu anki durum
          </div>

          {myShift ? (
            <div className="col" style={{ gap: 6, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>Shift #{myShift.id}</b>
                <span className="pill" data-status={String(myShift.status || "").toUpperCase()}>
                  {displayStatusLabel(String(myShift.status || "").toUpperCase())}
                </span>
              </div>

              <div className="muted">Room: {myShift.room?.name || (myShift.roomId ? `#${myShift.roomId}` : "-")}</div>

              <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>
                  Araç: {vehicle?.plate || (myShift.vehicleId ? `#${myShift.vehicleId}` : "-")}
                </span>
                {vehicle ? (
                  <>
                    <span className="pill" data-status={pillKey} title={`GPS: ${displayStatusLabel(ui)}`}>
                      {displayStatusLabel(ui)}
                    </span>
                    <span className="muted">Son GPS:</span>
                    <span className="pill">{gpsAgeLabel(vehicle)}</span>
                  </>
                ) : null}
              </div>

              <div className="muted">Sürücü: {myShift.driver?.fullName || (myShift.driverId ? `#${myShift.driverId}` : "-")}</div>
              <div className="muted">Start: {fmtTR(myShift.startAt)} • End: {fmtTR(myShift.endAt)}</div>

              {totalStops ? (
                <>
                  <div className="muted">
                    İlerleme: {pct}% (reached:{reachedCount}/{totalStops})
                    {nextStop?.name ? ` • Sıradaki: ${nextStop.name}` : ""}
                    {nextStop?.name && nextEtaMin != null ? ` • ETA: ${etaDisplayText(vehicle, nextEtaMin, nextStop)}` : ""}{remainingStopsCount ? ` • Kalan durak: ${remainingStopsCount}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="pill" data-status={routeQualityTone}>{routeQualityText}</span>
                    {skippedStopsCount ? <span className="muted">Atlanan durak: <b>{skippedStopsCount}</b></span> : null}
                  </div>
                  {nextActionTextValue ? <div className="muted">{nextActionTextValue}</div> : null}
                </>
              ) : (
                <div className="muted">Durak bilgisi yok.</div>
              )}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              Henüz eşleşmiş bir servis yok.
            </div>
          )}
        </div>

        <div>
          <div className="card" data-role="personelSelected" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div className="title" style={{ fontSize: 16 }}>
                  Seçili Araç
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {vehicle?.plate || "-"} • Shift #{myShift?.id || "-"} • {String(myShift?.status || "-").toUpperCase()}
                </div>
              </div>
              <button className="btn sm" onClick={fitAll}>
                Tümünü Göster
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {vehicle ? (
                <>
                  <span className="muted">GPS:</span>
                  <span className="pill" data-status={pillKeyFromUi(uiStatusFromVehicle(vehicle))}>
                    {displayStatusLabel(uiStatusFromVehicle(vehicle))}
                  </span>
                  <span className="muted">Son GPS:</span>
                  <span className="pill">{gpsAgeLabel(vehicle)}</span>
                </>
              ) : (
                <span className="muted">Araç yok.</span>
              )}

              {nextStop?.name ? (
                <>
                  <span className="muted">Sıradaki:</span>
                  <span className="pill" data-status="NEXT">{nextStop.name}</span>
                  <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, vehicle)}>
                    Navigasyon Aç
                  </button>
                  {nextEtaMin != null ? (
                    <span className="muted">
                      ETA: <b>{nextEtaMin != null ? etaDisplayText(vehicle, nextEtaMin, nextStop) : "-"}</b>
                    </span>
                  ) : null}
                  {toNum(nextStop?.remainingKm) != null ? (
                    <span className="muted">
                      Kalan: <b>{toNum(nextStop.remainingKm).toFixed(1)}km</b>
                    </span>
                  ) : null}
                  {remainingRouteEtaMin != null ? (
                    <span className="muted">
                      Rota ETA: <b>{remainingRouteEtaMin != null ? etaDisplayText(vehicle, remainingRouteEtaMin, nextStop) : "-"}</b>
                    </span>
                  ) : null}
                  {remainingRouteKm != null ? (
                    <span className="muted">
                      Rota km: <b>{remainingRouteKm.toFixed(1)}km</b>
                    </span>
                  ) : null}
                  <span className="pill" data-status={routeQualityTone}>{routeQualityText}</span>
                  {skippedStopsCount ? (
                    <span className="muted">
                      Atlanan: <b>{skippedStopsCount}</b>
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="muted">Sıradaki durak yok.</span>
              )}
            </div>

            {skippedStops.length ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Atlananlar: <b>{skippedStops.map((s) => s?.name || `Durak ${s?.order || ""}`).join(", ")}</b>
              </div>
            ) : null}

            {recommended ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Önerilen durak:{" "}
                <span className="pill" data-status="OK">{recommended.stop?.name || "Durak"}</span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  <b>{Math.round(recommended.distM)}m</b>
                </span>
                <button
                  className="btn sm"
                  style={{ marginLeft: 8 }}
                  onClick={() => openNav(recommended.stop, { gpsLast: { lat: myPos?.lat, lng: myPos?.lng } })}
                  title="Konumundan durağa navigasyon"
                >
                  Navigasyon Aç
                </button>
              </div>
            ) : null}

            {!recommended && geoErr ? <div className="muted" style={{ marginTop: 8 }}>Konum alınamadı: {geoErr}</div> : null}

            <PanelSegmentTabs
              ariaLabel="Personel canlı takip bölümleri"
              tabs={PERSONEL_LIVE_TABS}
              value={viewMode}
              onChange={setViewMode}
              compact
            />

            {viewMode === "timeline" ? (
              <div style={{ marginTop: 10 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
                <StopTimeline
                  stops={stops}
                  nextStopId={nextStopId}
                  selectedStopId={selectedStopId}
                  compact
                  onSelect={(s) => {
                    setSelectedStopId(s?.id ?? null);
                    focusStop(s);
                  }}
                />
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div className="card" style={{ marginBottom: 10 }}>
                  <div className="title" style={{ fontSize: 16 }}>Harita Önizleme</div>
                  <div className="muted" style={{ fontSize: 12 }}>Seçili araç + (varsa) duraklar</div>
                </div>

                <MapView
                  vehicles={vehicles}
                  stops={stops}
                  selectedVehicleId={vehicle?.id ?? null}
                  onSelectVehicle={() => {}}
                  fitKey={`personel-live:${vehicle?.id ?? "none"}:${stops.length}:${gpsAtIso(vehicle) || ""}`}
                  height="var(--mapH)"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
