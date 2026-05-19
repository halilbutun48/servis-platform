import { useEffect, useMemo, useRef, useState } from "react";
import { api, reportNoShow } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership } from "../../utils/regionOwnership";
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel } from "../../utils/etaSanity";

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

function normalizeStop(s, i) {
  const order = s?.order ?? i + 1;
  const id = s?.id ?? `${order}`;
  const name = s?.name ?? s?.title ?? `Durak ${order}`;
  const statusRaw = s?.status || s?.state || (s?.reachedAt || s?.reached ? "REACHED" : "");
  const status = String(statusRaw || "PENDING").toUpperCase();
  return { ...s, id, order, name, status };
}

function isReachedStop(s) {
  const st = String(s?.status || s?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "SKIPPED" || Boolean(s?.reachedAt) || Boolean(s?.reached);
}

function routeQualityText(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (q === "OFFLINE_GPS") return "GPS kapalı veya çok eski";
  if (q === "STALE_GPS") return "GPS gecikmeli";
  if (q === "SKIP_PRESENT") return "Atlanan durak var";
  if (q === "DONE_WITH_SKIPS") return "Rota bitti, atlanan durak var";
  if (q === "DONE") return "Rota tamamlandı";
  if (q === "NO_SHIFT") return "Aktif rota yok";
  return String(eta?.progressLabel || "Rota ilerliyor");
}

function routeQualityTone(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (["OFFLINE_GPS", "STALE_GPS", "SKIP_PRESENT", "DONE_WITH_SKIPS"].includes(q)) return "WARN";
  if (q === "DONE") return "OK";
  return "LIVE";
}

function gpsAgeLabel(gpsLast) {
  return getGpsAgeText(gpsLast);
}

function etaDisplayText(vehicle, etaMinutes, nextStop) {
  return getEtaDisplay({
    etaMinutes,
    gpsStatus: vehicle?.gpsState?.lastUiStatus || vehicle?.gpsState?.lastStatus || vehicle?.gpsLast?.status || vehicle?.gpsLast?.state || "UNKNOWN",
    gpsAge: vehicle?.gpsLast,
    nextStopName: nextStop?.name,
  });
}

function openStopNavigation(stop, myPos) {
  const sc = stopCoord(stop);
  if (!sc) return;
  const dest = `${sc.lat},${sc.lng}`;
  const hasOrigin = Number.isFinite(Number(myPos?.lat)) && Number.isFinite(Number(myPos?.lng));
  const originPart = hasOrigin ? `&origin=${Number(myPos.lat)},${Number(myPos.lng)}` : "";
  const url = `https://www.google.com/maps/dir/?api=1${originPart}&destination=${dest}&travelmode=walking`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MyRidePanel() {
  const { token } = useSession();

  const [myShift, setMyShift] = useState(null);
  const [eta, setEta] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowMsg, setNoShowMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadMyShift() {
    if (!token) return null;
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

  async function loadEta(shift) {
    const vid = shift?.vehicleId || shift?.vehicle?.id || null;
    const sid = shift?.id || null;
    if (!token || !vid) {
      setEta(null);
      return;
    }
    try {
      const qs = sid ? `?shiftId=${encodeURIComponent(String(sid))}` : "";
      const r = await api(`/api/eta/vehicle/${encodeURIComponent(String(vid))}${qs}`, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadNotifs() {
    if (!token) return;
    try {
      const r = await api("/api/notifications/my", { token });
      setNotifs(Array.isArray(r) ? r.slice(0, 5) : []);
    } catch {
      setNotifs([]);
    }
  }

  async function loadAll() {
    setErr("");
    const s = await loadMyShift();
    await Promise.all([loadEta(s), loadNotifs()]);
  }

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  async function handleNoShow() {
    if (!myShift?.id || noShowBusy) return;
    setNoShowBusy(true);
    setErr("");
    setNoShowMsg("");
    try {
      const result = await reportNoShow({ token });
      const stopName = result?.stop?.name ? ` Durak: ${result.stop.name}.` : "";
      const suggestion = result?.canSkipStop
        ? " Bu durakta başka kimse yok; durağı atlama önerisi gitti."
        : " Bu durakta başka yolcular da var; durağı atlamama uyarısı gitti.";
      setNoShowMsg(`${result?.targetName || "Bildirim"} için sürücüye iletildi.${stopName}${suggestion}`);
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setNoShowBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      loadAllRef.current();
    });
  }, [token]);

  useAutoReload("shifts", loadAll);
  useAutoReload("requests", loadAll);
  useAutoReload("notifications", loadNotifs);
  useAutoReload("eta", loadAll);

  function getMyLocation() {
    setErr("");
    if (!navigator.geolocation) {
      setErr("Tarayıcı konum desteği vermiyor.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setMyPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (e) => {
        setBusy(false);
        setErr(String(e?.message || e));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  const vehicle = myShift?.vehicle || null;

  const stops = useMemo(() => {
    const baseStops = Array.isArray(myShift?.stops) ? myShift.stops : [];
    const etaStops = Array.isArray(eta?.stops) ? eta.stops : [];
    const etaById = new Map(etaStops.map((s) => [String(s?.id ?? ""), s]));
    const etaByOrder = new Map(etaStops.map((s) => [String(s?.order ?? ""), s]));

    const merged = (baseStops.length ? baseStops : etaStops).map((s, i) => {
      const row = normalizeStop(s, i);
      const e = etaById.get(String(row.id)) || etaByOrder.get(String(row.order));
      if (e) {
        const remainingKm = toNum(e?.remainingKm);
        const etaMin = toNum(e?.etaMin);
        if (remainingKm != null) row.remainingKm = remainingKm;
        if (etaMin != null) row.etaMin = etaMin;
      }
      const c = stopCoord(row);
      if (c && myPos) {
        row.distanceM = haversineMeters(Number(myPos.lat), Number(myPos.lng), c.lat, c.lng);
      }
      return row;
    });

    return merged.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [myShift, eta, myPos]);

  const nearestStop = useMemo(() => {
    const unreached = stops.filter((s) => !isReachedStop(s) && Number.isFinite(Number(s.distanceM)));
    const pool = unreached.length ? unreached : stops.filter((s) => Number.isFinite(Number(s.distanceM)));
    if (!pool.length) return null;
    const ordered = [...pool].sort((a, b) => Number(a.distanceM || Infinity) - Number(b.distanceM || Infinity));
    return ordered[0] || null;
  }, [stops]);

  const selectedStop = useMemo(() => {
    if (selectedStopId == null) return nearestStop;
    return stops.find((s) => String(s.id) === String(selectedStopId)) || nearestStop || null;
  }, [stops, selectedStopId, nearestStop]);

  const remainingStopsCount = useMemo(() => stops.filter((s) => !isReachedStop(s)).length, [stops]);
  const routeEtaMin = Number.isFinite(Number(eta?.remainingRouteEtaMin)) ? Number(eta.remainingRouteEtaMin) : null;
  const routeKm = Number.isFinite(Number(eta?.remainingRouteKm)) ? Number(eta.remainingRouteKm) : null;
  const gpsSourceLabel = vehicle?.gpsState?.lastSource || vehicle?.gpsState?.sourceLabel || vehicle?.gpsLast?.sourceLabel || (vehicle ? 'Araç GPS’i' : 'GPS bekleniyor');
  const gpsStatusText = getGpsReliabilityLabel(vehicle?.gpsState?.lastUiStatus || (vehicle ? 'LIVE' : '-'));
  const copilotFacts = useMemo(() => buildMapFacts({
    selected: vehicle,
    selectedShift: myShift,
    selectedNext: selectedStop || nearestStop,
    selectedEta: routeEtaMin != null ? routeEtaMin : selectedStop?.etaMin ?? null,
    selectedStats: { total: stops.length, remaining: remainingStopsCount, completed: Math.max(0, stops.length - remainingStopsCount) },
    gpsStatus: gpsStatusText,
    gpsAge: gpsAgeLabel(vehicle?.gpsLast),
    vehicleCount: vehicle ? 1 : 0,
  }), [vehicle, myShift, selectedStop, nearestStop, routeEtaMin, stops.length, remainingStopsCount, gpsStatusText]);
  const copilotSelection = useMemo(() => {
    if (!myShift && !vehicle) return null;
    const selectedNext = selectedStop || nearestStop || null;
    return {
      scopeKey: '/personel/my',
      entityType: vehicle?.id ? 'vehicle' : 'shift',
      entityId: Number(vehicle?.id || myShift?.id || 0) || null,
      label: vehicle?.plate ? `Bugünkü servis • ${vehicle.plate}` : `Shift #${myShift?.id || '-'}`,
      summary: [
        `Shift #${myShift?.id || '-'}`,
        displayStatusLabel(String(myShift?.status || '').toUpperCase()) || '-',
        vehicle?.plate ? `Araç ${vehicle.plate}` : null,
        `Son GPS ${gpsAgeLabel(vehicle?.gpsLast)}`,
        selectedNext?.name ? `Sıradaki durak ${selectedNext.name}` : null,
        routeEtaMin != null ? `ETA ${etaDisplayText(vehicle, routeEtaMin, selectedNext)}` : null,
      ].filter(Boolean).join(' • '),
      fields: [
        { label: 'Servis', value: vehicle?.plate || `Shift #${myShift?.id || '-'}`, help: 'Bugünkü servis veya vardiya etiketini gösterir.' },
        { label: 'Araç', value: vehicle?.plate || (myShift?.vehicleId ? `#${myShift.vehicleId}` : '-'), help: 'Bağlı araç plakasını gösterir.' },
        { label: 'Sürücü', value: myShift?.driver?.fullName || (myShift?.driverId ? `#${myShift.driverId}` : '-'), help: 'Bağlı sürücü adını gösterir.' },
        { label: 'Son GPS', value: gpsAgeLabel(vehicle?.gpsLast), help: 'Konumun ne kadar önce geldiğini gösterir.' },
        { label: 'GPS durumu', value: gpsStatusText, help: 'Araç GPS sinyal durumunu gösterir.' },
        { label: 'Kaynak', value: gpsSourceLabel, help: 'Konum kaynağını Türkçe ve güvenli biçimde gösterir.' },
        { label: 'Sıradaki durak', value: selectedNext?.name || '-', help: 'Sıradaki veya seçili durağı gösterir.' },
        { label: 'Seçili durak', value: selectedStop?.name || '-', help: 'Elle seçilen durağı gösterir.' },
        { label: 'ETA', value: routeEtaMin != null ? etaDisplayText(vehicle, routeEtaMin, selectedNext) : '-', help: 'Kalan rota ETA bilgisini güvenli biçimde gösterir.' },
        { label: 'Servis durumu', value: displayStatusLabel(String(myShift?.status || '').toUpperCase()), help: 'Servis veya vardiya durumunu gösterir.' },
      ],
      badges: [
        { label: 'Araç GPS’i', value: gpsStatusText, help: 'Araç GPS sinyalinin canlı mı eski mi olduğunu gösterir.' },
        { label: 'Sürücünün telefon GPS’i', value: gpsSourceLabel, help: 'Sürücünün telefon GPS’i veya kaynak etiketini gösterir.' },
      ],
      facts: {
        ...copilotFacts,
        selectedRecordType: vehicle?.id ? 'vehicle' : 'shift',
        selectedRecordId: Number(vehicle?.id || myShift?.id || 0) || 0,
        selectedRecordLabel: vehicle?.plate || `Shift #${myShift?.id || '-'}`,
        selectedRecordStatus: copilotFacts?.selectedRecordStatus || '',
      },
    };
  }, [myShift, vehicle, selectedStop, nearestStop, routeEtaMin, copilotFacts, gpsSourceLabel, gpsStatusText]);

  useEffect(() => {
    if (!copilotSelection) {
      clearCopilotSelection('/personel/my');
      return undefined;
    }
    setCopilotSelection(copilotSelection);
    return () => clearCopilotSelection('/personel/my');
  }, [copilotSelection]);

  return (
    <div>
      <div className="card">
        <h3>Benim Servisim</h3>
        <div className="muted">Talep ekranı yerine sana bağlı son servis, duraklar ve en yakın durağa navigasyon gösterilir.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid">
        <div className="card">
          <h3>1) Konumum ve en yakın durak</h3>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <button type="button" disabled={busy} onClick={getMyLocation}>{busy ? "..." : (myPos ? "Konumumu Yenile" : "Konumumu Al")}</button>
            {myPos ? (
              <div className="muted">
                {Number(myPos.lat).toFixed(6)}, {Number(myPos.lng).toFixed(6)}
                {Number.isFinite(Number(myPos.accuracy)) ? <> • doğruluk ~{Math.round(Number(myPos.accuracy))} m</> : null}
              </div>
            ) : (
              <div className="muted">En yakın durağı hesaplamak ve navigasyon için kendi konumunu al.</div>
            )}
          </div>

          {nearestStop ? (
            <div style={{ marginTop: 14 }}>
              <div className="muted">En yakın durak</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{nearestStop.name}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {Number.isFinite(Number(nearestStop.distanceM)) ? <>Bana uzaklık: <b>{(Number(nearestStop.distanceM) / 1000).toFixed(2)} km</b></> : "Konum alınınca uzaklık hesaplanır."}
                {Number.isFinite(Number(nearestStop.etaMin)) ? <> • Araç ETA: <b>{etaDisplayText(vehicle, Number(nearestStop.etaMin), nearestStop)}</b></> : null}
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" disabled={busy} onClick={() => setSelectedStopId(nearestStop.id)}>En yakın durağı seç</button>
                <button type="button" disabled={busy} onClick={() => openStopNavigation(nearestStop, myPos)}>Git</button>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 14 }}>Durak listesi veya konum hazır olunca burada en yakın durak önerisi görünür.</div>
          )}
        </div>

        <div className="card">
          <h3>2) Sana atanmış servis</h3>
          {myShift ? (
            <div className="col" style={{ gap: 6 }}>
              <div>
                <b>Shift #{myShift.id}</b> — <span className="pill" data-status={String(myShift.status || "").toUpperCase()}>{displayStatusLabel(String(myShift.status || "").toUpperCase())}</span>
              </div>
              <div className="muted">Room: {myShift.room?.name || (myShift.roomId ? `#${myShift.roomId}` : "-")}</div>
              <div className="muted">Araç: {vehicle?.plate || (myShift.vehicleId ? `#${myShift.vehicleId}` : "-")}</div>
              <div className="muted">Sürücü: {myShift.driver?.fullName || (myShift.driverId ? `#${myShift.driverId}` : "-")}</div>
              <div className="muted">Başlangıç: {fmtTR(myShift.startAt)} • Bitiş: {fmtTR(myShift.endAt)}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Kalan durak: <b>{remainingStopsCount}</b>
                {routeEtaMin != null ? <> • Rota ETA: <b>{etaDisplayText(vehicle, routeEtaMin, selectedStop || nearestStop)}</b></> : null}
                {routeKm != null ? <> • Rota km: <b>{routeKm.toFixed(1)} km</b></> : null}
              </div>
              {eta ? (
                <div style={{ marginTop: 6 }}>
                  <span className="pill" data-status={routeQualityTone(eta)}>{routeQualityText(eta)}</span>
                </div>
              ) : null}
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" disabled={noShowBusy} onClick={handleNoShow}>{noShowBusy ? "..." : "Bugün gelmiyorum"}</button>
                <div className="muted">Bu bildirim sürücüye gider. Durakta yalnız sen varsın, atlama önerisi eklenir.</div>
              </div>
              {noShowMsg ? <div className="muted" style={{ marginTop: 8 }}>{noShowMsg}</div> : null}
              {selectedStop ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  Seçili durak: <b>{selectedStop.name}</b>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="muted">Şu an sana bağlı bir servis görünmüyor. Eşleşen son servis oluşunca burada duraklar otomatik görünür.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>3) Güzergâh Durakları</h3>
        <div className="muted" style={{ marginBottom: 8 }}>Kendi konumuna göre en yakın durağı bul ve istersen doğrudan navigasyon aç.</div>
        <table className="tbl">
          <thead>
              <tr>
                <th>#</th>
                <th>Durak</th>
                <th>Durum</th>
                <th>Bana Uzaklık</th>
                <th>Araç ETA</th>
                <th>İşlem</th>
              </tr>
          </thead>
          <tbody>
            {stops.length ? stops.map((s) => {
              const active = selectedStop && String(selectedStop.id) === String(s.id);
              const stopEtaText = Number.isFinite(Number(s?.etaMin))
                ? etaDisplayText(vehicle, Number(s.etaMin), s)
                : "-";
              return (
                <tr key={String(s.id)} style={active ? { background: "rgba(59,130,246,.10)", outline: "1px solid rgba(59,130,246,.35)" } : undefined}>
                  <td>{s.order}</td>
                  <td>
                    {s.name}
                    {nearestStop && String(nearestStop.id) === String(s.id) ? <span className="pill" data-status="REQUESTED" style={{ marginLeft: 8 }}>EN YAKIN</span> : null}
                  </td>
                  <td><span className="pill" data-status={String(s.status || "PENDING").toUpperCase()}>{displayStatusLabel(String(s.status || "PENDING").toUpperCase())}</span></td>
                  <td>{Number.isFinite(Number(s.distanceM)) ? `${(Number(s.distanceM) / 1000).toFixed(2)} km` : "-"}</td>
                  <td>{stopEtaText}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      <button type="button" disabled={busy} onClick={() => setSelectedStopId(s.id)}>Seç</button>
                      <button type="button" disabled={busy} onClick={() => openStopNavigation(s, myPos)}>Git</button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="muted">Durak listesi bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notifs?.length ? (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3>Son Bildirimler</h3>
            <button type="button" disabled={busy} onClick={() => navigate("/shared/notifications")}>Tümünü Aç</button>
          </div>
          <ul style={{ marginTop: 8 }}>
            {notifs.map((n) => (
              <li key={n.id} className="muted">
                <b>{n.type}</b> • {formatRegionOwnership(n)} • {fmtTR(n.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
