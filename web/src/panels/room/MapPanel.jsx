// web/src/panels/room/MapPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { ageSecFromAt, pillKeyFromUi, uiStatusFromVehicle } from "../../utils/uiStatus";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { getEtaDisplay, getGpsAgeText } from "../../utils/etaSanity";
import { displayStatusLabel } from "../../utils/displayStatus";
import { gpsSourcePresentationLabel } from "../../utils/gpsSource";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import MapOperationsDisclosure from "../../components/map/MapOperationsDisclosure";
import SafeDriveSummaryCard from "../shared/SafeDriveSummaryCard";
import { cachedGet } from "../../utils/uiDataCache";

function toNum(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasGpsFix(v) {
  const lat = toNum(v?.gpsLast?.lat);
  const lng = toNum(v?.gpsLast?.lng);
  return lat != null && lng != null;
}

function gpsAtIso(v) {
  return v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.createdAt || v?.gpsLast?.updatedAt || null;
}

function gpsAgeLabel(v) {
  return getGpsAgeText(v);
}

function routeSourceLabel(value) {
  const key = String(value || "").toUpperCase();
  if (key === "ESTIMATED") return "Tahmini rota";
  if (key === "OSRM") return "Yol ağı rotası";
  if (key === "OFFLINE") return "Çevrim dışı";
  return key || "Belirtilmemiş";
}

function gpsCoord(v) {
  const lat = toNum(v?.gpsLast?.lat);
  const lng = toNum(v?.gpsLast?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function stopCoord(s) {
  const lat = toNum(s?.lat ?? s?.location?.lat);
  const lng = toNum(s?.lng ?? s?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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
    const km2 = haversineKm(vc.lat, vc.lng, sc.lat, sc.lng);
    return Math.max(1, Math.round((km2 / 35) * 60));
  }

  return null;
}

function etaDisplayText(vehicle, etaMinutes, nextStop) {
  return getEtaDisplay({
    etaMinutes,
    gpsStatus: vehicle?.gpsState?.lastUiStatus || vehicle?.gpsState?.lastStatus || vehicle?.gpsLast?.status || vehicle?.gpsLast?.state || (hasGpsFix(vehicle) ? "LIVE" : "UNKNOWN"),
    gpsAge: vehicle?.gpsLast,
    nextStopName: nextStop?.name,
  });
}

function derivedLastReachedOrder(stops) {
  let max = 0;
  for (const s of stops || []) {
    const st = String(s?.state || "").toUpperCase();
    if (st === "REACHED" || st === "SKIPPED" || st === "DONE") {
      const o = Number(s?.order || 0);
      if (Number.isFinite(o) && o > max) max = o;
    }
  }
  return max;
}

function firstPendingStop(stops) {
  return (
    (stops || []).find((s) => {
      const st = String(s?.state || "").toUpperCase();
      return st === "PENDING" || !st;
    }) || null
  );
}

function shiftTitle(s) {
  if (!s) return "-";
  const id = s.id ? `#${s.id}` : "";
  const st = String(s.status || "").toUpperCase();
  return `Vardiya ${id} • ${displayStatusLabel(st)}`;
}

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function focusStop(stop) {
  const c = stopCoord(stop);
  if (!c) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat: c.lat, lng: c.lng, zoom: 17 } }));
}

function MapTabCard(props) {
  const { tabRef, title, subtitle, children, className = "", style = {} } = props;
  return (
    <div
      ref={tabRef}
      tabIndex={-1}
      role="tabpanel"
      aria-label={title}
      className={`card${className ? ` ${className}` : ""}`}
      style={{ marginBottom: 10, ...style }}
    >
      <div className="title" style={{ fontSize: 16 }}>{title}</div>
      {subtitle ? <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export default function RoomMapPanel() {
  const { token } = useSession();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [showNoGps, setShowNoGps] = useState(true);
  const [showStops, setShowStops] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [routePreview, setRoutePreview] = useState({ points: [], source: "ESTIMATED" });
  const [mapTab, setMapTab] = useState("map");
  const mapTabRefs = useRef({});
  const didMapTabMountRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsCompactViewport(Boolean(mq.matches));
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const r = await cachedGet("/api/vehicles", { token, ttlMs: 10 * 60 * 1000, delayMs: 120 });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);

      if (selectedVehicleId && !items.some((v) => String(v.id) === String(selectedVehicleId))) {
        setSelectedVehicleId(null);
      }
      if (!selectedVehicleId) {
        const first =
          items.find((v) =>
            (Array.isArray(v?.shifts) ? v.shifts : []).some((s) =>
              ["ACTIVE", "APPROVED"].includes(String(s?.status || "").toUpperCase())
            )
          ) ||
          items[0] ||
          null;
        if (first) setSelectedVehicleId(first.id);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      loadRef.current();
    });
  }, [token]);

  useAutoReload("vehicles", (detail) => {
    const m = detail?.payload?.msg;
    const ev = m?._event;

    if (ev === "vehicle:status") {
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid) || !st) return;

      setVehicles((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) => {
          if (Number(v?.id) !== vid) return v;
          return { ...v, gpsState: { ...(v?.gpsState || {}), lastUiStatus: st } };
        })
      );
      return;
    }

    load();
  });

  useAutoReload("shifts", load);
  useAutoReload("gps", load);

  const cards = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    const out = [];

    for (const v of vehicles) {
      const shifts = Array.isArray(v?.shifts) ? v.shifts : [];
      const active = shifts.find((s) => String(s?.status || "").toUpperCase() === "ACTIVE") || null;
      const approved = shifts.find((s) => String(s?.status || "").toUpperCase() === "APPROVED") || null;
      const s = active || (!onlyActive ? approved : null) || (onlyActive ? active : approved);

      if (!s) continue;
      if (onlyActive && String(s?.status || "").toUpperCase() !== "ACTIVE") continue;

      if (!showNoGps && !hasGpsFix(v)) continue;

      const plate = String(v?.plate || "").toLowerCase();
      const driverName = String(s?.driver?.fullName || v?.driver?.fullName || "").toLowerCase();
      const companyName = String(s?.company?.name || "").toLowerCase();

      if (qq) {
        const hay = `${plate} ${driverName} ${companyName} ${s?.id ?? ""}`;
        if (!hay.includes(qq)) continue;
      }

      const stops = Array.isArray(s?.stops) ? s.stops : [];
      const lastReachedOrder = derivedLastReachedOrder(stops);
      const total = stops.length;
      const next = firstPendingStop(stops);
      const pct = total ? Math.min(100, Math.max(0, Math.round((lastReachedOrder / total) * 100))) : 0;

      const ui = uiStatusFromVehicle(v);
      const pillKey = pillKeyFromUi(ui);
      const etaMin = etaMinGuess(v, next);

      out.push({
        vehicle: v,
        shift: s,
        stops,
        lastReachedOrder,
        total,
        nextStop: next,
        pct,
        ui,
        pillKey,
        nextEtaMin: etaMin,
      });
    }

    out.sort((a, b) => {
      const sa = String(a.shift?.status || "").toUpperCase();
      const sb = String(b.shift?.status || "").toUpperCase();
      if (sa !== sb) return sa === "ACTIVE" ? -1 : 1;
      const aa = ageSecFromAt(gpsAtIso(a.vehicle)) ?? 999999;
      const bb = ageSecFromAt(gpsAtIso(b.vehicle)) ?? 999999;
      return aa - bb;
    });

    return out;
  }, [vehicles, q, onlyActive, showNoGps]);

  const selected = useMemo(
    () => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId]
  );

  const selectedShift = useMemo(() => {
    if (!selected) return null;
    const shifts = Array.isArray(selected?.shifts) ? selected.shifts : [];
    const active = shifts.find((s) => String(s?.status || "").toUpperCase() === "ACTIVE") || null;
    const approved = shifts.find((s) => String(s?.status || "").toUpperCase() === "APPROVED") || null;
    return onlyActive ? active : active || approved;
  }, [selected, onlyActive]);

  const selectedStops = useMemo(
    () => (Array.isArray(selectedShift?.stops) ? selectedShift.stops : []),
    [selectedShift]
  );

  const selectedNext = useMemo(() => firstPendingStop(selectedStops), [selectedStops]);
  const selectedEta = useMemo(() => etaMinGuess(selected, selectedNext), [selected, selectedNext]);
  const selectedStats = useMemo(() => routeStats(selectedStops), [selectedStops]);
  const safeDriveSummaryParams = useMemo(
    () => {
      const rawGpsSource = selected?.gpsState?.lastSource || selected?.gpsState?.sourceLabel || selected?.gpsLast?.sourceLabel;
      const gpsSourceLabel = rawGpsSource ? gpsSourcePresentationLabel(rawGpsSource) : undefined;
      return ({
      gpsStatus: uiStatusFromVehicle(selected),
      gpsAge: gpsAgeLabel(selected),
      gpsLast: selected?.gpsLast,
      gpsSourceLabel,
      speedKmh: selected?.gpsLast?.speed || selected?.speed || selected?.speedKmh,
      speedLimitKmh: selected?.speedLimitKmh,
      routeProgressState: selectedShift?.status || selected?.gpsState?.lastUiStatus || selected?.gpsState?.lastStatus,
      nextStopName: selectedNext?.name,
      proofStatus: selectedShift?.operationProofStatus || selectedShift?.proofStatus || selected?.operationProofStatus || selected?.proofStatus,
      providerStatus: selected?.gpsState?.lastUiStatus || selected?.gpsState?.lastStatus,
      providerLabel: gpsSourceLabel,
      selectedVehicle: selected,
      selectedShift,
      nextStop: selectedNext,
      });
    },
    [selected, selectedShift, selectedNext]
  );
  const selectedRiskLines = useMemo(() => {
    const lines = [];
    if (!selected) return ["Araç seçilmedi"];

    const gpsStatus = String(uiStatusFromVehicle(selected) || "").toUpperCase();
    if (!hasGpsFix(selected)) {
      lines.push("GPS bekleniyor");
    } else if (gpsStatus === "OFFLINE") {
      lines.push("GPS çevrim dışı");
    } else if (gpsStatus === "STALE") {
      lines.push("GPS güncel değil");
    } else if (gpsStatus === "LOW_SIGNAL") {
      lines.push("GPS düşük sinyal");
    }

    if (!selectedShift) lines.push("Vardiya yok");
    if (!selectedNext?.name) lines.push("Sıradaki durak bekleniyor");
    if (selectedEta == null) lines.push("Tahmini süre hesaplanamıyor");
    return lines.length ? lines : ["Belirgin risk yok"];
  }, [selected, selectedShift, selectedNext?.name, selectedEta]);

  const selectedHistoryLine = useMemo(() => {
    if (!selected) return "";
    const parts = [
      `Son güncelleme: ${fmtTR(selectedShift?.updatedAt || selectedShift?.lastUpdatedAt || selectedShift?.startAt)}`,
      `Son GPS: ${gpsAgeLabel(selected)}`,
      `Rota kaynağı: ${routeSourceLabel(routePreview?.source)}`,
    ];
    return parts.join(" • ");
  }, [selected, selectedShift?.updatedAt, selectedShift?.lastUpdatedAt, selectedShift?.startAt, routePreview?.source]);

  const copilotSummary = useMemo(() => {
    if (!selected) return null;
    const parts = [];
    if (selectedShift?.id) parts.push(`Vardiya #${selectedShift.id}`);
    if (selected?.plate) parts.push(`Araç ${selected.plate}`);
    const ui = uiStatusFromVehicle(selected);
    if (ui) parts.push(`GPS ${gpsSourcePresentationLabel(ui)}`);
    if (selectedNext?.name) parts.push(`Sıradaki ${selectedNext.name}`);
    return parts.join(" - ");
  }, [selected, selectedShift?.id, selectedNext]);

  const selectedSummaryText = useMemo(() => {
    if (!selected) return "";
    const parts = [];
    const ui = uiStatusFromVehicle(selected);
    if (selectedShift?.id) parts.push(`Vardiya #${selectedShift.id}`);
    if (selected?.plate) parts.push(`Araç ${selected.plate}`);
    if (ui) parts.push(`GPS ${gpsSourcePresentationLabel(ui)}`);
    if (selectedNext?.name) parts.push(`Sıradaki ${selectedNext.name}`);
    if (selectedEta != null) {
      const etaText = etaDisplayText(selected, selectedEta, selectedNext);
      if (etaText) parts.push(`Tahmini süre ${etaText}`);
    }
    return parts.join(" • ");
  }, [selected, selectedShift?.id, selectedNext, selectedEta]);

  useEffect(() => {
    if (!selected) {
      clearCopilotSelection("/room/map");
      return;
    }

    const facts = buildMapFacts({
      selected,
      selectedShift,
      selectedNext,
      selectedEta,
      selectedStats,
      gpsStatus: uiStatusFromVehicle(selected),
      gpsAge: gpsAgeLabel(selected),
      vehicleCount: vehicles.length,
    });

    setCopilotSelection({
      scopeKey: "/room/map",
      entityType: selectedShift?.id ? "shift" : "vehicle",
      entityId: Number(selectedShift?.id || selected?.id || 0) || null,
      label: selectedShift?.id
        ? `Vardiya #${selectedShift.id}`
          : selected?.plate
            ? `Araç ${selected.plate}`
            : `Araç #${selected?.id || "-"}`,
      summary: facts?.helpContextSummary || facts?.contextSummary || facts?.copilotSummary || copilotSummary || "",
      helpContextSummary: facts?.helpContextSummary || facts?.copilotSummary || copilotSummary || "",
      contextSummary: facts?.contextSummary || facts?.copilotSummary || copilotSummary || "",
      selectedRecordSummary: facts?.selectedRecordSummary || facts?.selectedRecordStatus || copilotSummary || "",
      selectedRecordStatus: facts?.selectedRecordStatus || "",
      fields: [
        { label: 'Araç', value: selected?.plate || `#${selected?.id || '-'}`, help: 'Seçili aracın plakasını veya kayıt numarasını gösterir.' },
        { label: 'Son GPS', value: gpsAgeLabel(selected), help: 'Son canlı konum bilgisinin kaç dakika veya saniye önce geldiğini gösterir.' },
        { label: 'Sıradaki Durak', value: selectedNext?.name || '-', help: 'Araç şu anda hangi durağa doğru gidiyor bilgisini gösterir.' },
      { label: 'Tahmini süre', value: etaDisplayText(selected, selectedEta, selectedNext), help: 'Sıradaki durağa tahmini kalan süreyi güvenli biçimde gösterir.' },
        { label: 'Toplam Durak', value: `${selectedStats?.total ?? 0}`, help: 'Seçili vardiyadaki toplam durak sayısını gösterir.' },
        { label: 'Kalan', value: `${selectedStats?.remaining ?? 0}`, help: 'Henüz tamamlanmamış durak sayısını gösterir.' },
      ],
      facts,
      badges: [
        { label: 'GPS', value: displayStatusLabel(uiStatusFromVehicle(selected) || '-'), help: 'Araç GPS sinyalinin canlı mı eski mi yok mu olduğunu gösterir.' },
        { label: 'Vardiya Durumu', value: displayStatusLabel(String(selectedShift?.status || '-').toUpperCase()), help: 'Seçili vardiyanın operasyon durumunu gösterir.' },
      ],
    });

    return () => clearCopilotSelection("/room/map");
  }, [selected, selected?.id, selectedShift, selectedShift?.id, selectedNext, selectedEta, selectedStats, vehicles.length, copilotSummary]);

  useEffect(() => {
    let alive = true;

    async function loadRoutePreview() {
      if (!selectedShift?.id) {
        if (alive) setRoutePreview({ points: [], source: "ESTIMATED" });
        return;
      }
      try {
        const r = await cachedGet(`/api/shifts/${selectedShift.id}/route-preview`, { token, ttlMs: 10 * 60 * 1000, delayMs: 120 });
        const pts = Array.isArray(r?.path?.points) ? r.path.points : [];
        if (alive) {
          setRoutePreview({
            points: pts,
            source: String(r?.path?.source || "ESTIMATED").toUpperCase(),
          });
        }
      } catch {
        if (alive) setRoutePreview({ points: [], source: "ESTIMATED" });
      }
    }

    loadRoutePreview();
    return () => {
      alive = false;
    };
  }, [selectedShift?.id, token]);

  function fitAll() {
    try {
      window.dispatchEvent(new Event("map:fitAll"));
    } catch { /* no-op: fitAll event dispatch is best effort */ }
  }

  useEffect(() => {
    if (!didMapTabMountRef.current) {
      didMapTabMountRef.current = true;
      return;
    }

    const target = mapTabRefs.current?.[mapTab];
    if (!target) return;
    try {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus?.({ preventScroll: true });
    } catch {
      // no-op
    }
  }, [mapTab]);

  function renderVehicleListCard({
    title = "Canlı Liste",
    subtitle = "Satıra tıkla → sağda timeline + harita.",
    cardHeight = null,
  } = {}) {
    return (
      <div className="card mapAsideCard" style={cardHeight ? { height: cardHeight } : undefined}>
        <div className="title" style={{ fontSize: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{title}</span>
          <span className="muted" style={{ fontSize: 12 }}>{cards.length} kayıt</span>
        </div>

        <div className="muted" style={{ margin: "8px 0 10px" }}>
          {subtitle}
        </div>

        <div className="col mapAsideList" style={{ flex: 1, minHeight: 0 }}>
          {!cards.length ? (
            <div className="muted" style={{ padding: 10 }}>
              Aktif/uygun vardiya bulunamadı.
            </div>
          ) : null}

          {cards.map((c) => {
            const v = c.vehicle;
            const s = c.shift;
            const isSel = String(v?.id) === String(selectedVehicleId);
            const gpsOk = hasGpsFix(v);

            return (
              <button
                key={`${v.id}:${s.id}`}
                onClick={() => setSelectedVehicleId(v.id)}
                className={isSel ? "navItem active" : "navItem"}
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 12,
                  minHeight: 96,
                  overflow: "hidden",
                  textAlign: "left",
                }}
                title={shiftTitle(s)}
              >
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                    <b>{v?.plate || "-"}</b>
                    <span className="pill" data-status={c.pillKey} title={`GPS: ${displayStatusLabel(c.ui)}`}>{displayStatusLabel(c.ui)}</span>
                    <span className="pill" data-status={String(s?.status || "").toUpperCase()}>
                      {displayStatusLabel(String(s?.status || "").toUpperCase())}
                    </span>
                    {!gpsOk ? (
                      <span className="pill" data-status="PASSIVE" style={{ fontSize: 11 }}>
                        GPS yok
                      </span>
                    ) : null}
                  </span>

                  <span
                    className="muted"
                    style={{
                      fontSize: 12,
                      width: "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Sürücü: {s?.driver?.fullName || v?.driver?.fullName || "-"}
                    {s?.company?.name ? ` • ${s.company.name}` : ""}
                  </span>

                  <span
                    className="muted"
                    style={{
                      fontSize: 12,
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
                    }}
                  >
                    İlerleme: {c.pct}% (tamamlanan: {c.lastReachedOrder}/{c.total || 0})
                    {c.nextStop?.name ? ` • Sıradaki: ${c.nextStop.name}` : ""}
                    {c.nextStop?.name && c.nextEtaMin != null ? ` • Tahmini süre: ${etaDisplayText(v, c.nextEtaMin, c.nextStop)}` : ""}
                  </span>
                </span>

                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    flex: "0 0 118px",
                    maxWidth: 118,
                  }}
                >
                  <span className="muted" style={{ fontSize: 12 }}>
                    Son GPS: {gpsAgeLabel(v)}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Başlangıç: {fmtTR(s?.startAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const mapGridStyle = { ["--mapH"]: isCompactViewport ? "min(300px, calc(100vh - 500px))" : "min(700px, calc(100vh - 300px))" };
  const listCardHeight = isCompactViewport ? "min(260px, calc(100vh - 560px))" : "calc(var(--mapH) + 285px)";
  const vehiclesCardHeight = isCompactViewport ? "min(360px, calc(100vh - 450px))" : "min(760px, calc(100vh - 330px))";

  return (
    <div className="wrap wrap--fluid">
      <PanelChrome
        title="Taşımacılık Firması • Canlı Takip"
        subtitle="Tek panel: canlı liste + seçili araç + duraklar + harita"
        actions={
          <MapOperationsDisclosure summary="Filtreler ve yenileme">
            <div className="toolbar" style={{ justifyContent: "flex-end" }}>
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(Boolean(e.target.checked))} />
              Yalnızca aktif
            </label>

            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={showNoGps} onChange={(e) => setShowNoGps(Boolean(e.target.checked))} />
              GPS olmayanları göster
            </label>

            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={showStops} onChange={(e) => setShowStops(Boolean(e.target.checked))} />
              Durakları göster
            </label>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Plaka / sürücü / hizmet alan firma / kayıt no"
              style={{ width: 280 }}
            />

            <button className="btn sm" onClick={load} disabled={busy}>
              {busy ? "..." : "Yenile"}
            </button>
            </div>
          </MapOperationsDisclosure>
        }
      />

      {err ? <div className="card err">{err}</div> : null}

      <div style={{ marginBottom: 12 }}>
        <PanelSegmentTabs
          ariaLabel="Canlı takip bölümleri"
          compact
          value={mapTab}
          onChange={setMapTab}
          tabs={[
            { key: "map", label: "Harita" },
            { key: "vehicles", label: "Araçlar" },
          ]} 
        />
      </div>

      {mapTab === "map" ? (
        <MapTabCard
          tabRef={(node) => { mapTabRefs.current.map = node; }}
          title="Harita"
          subtitle="Büyük harita + canlı araç listesi."
          badge={`${cards.length}`}
        >
          <div className="grid mapGrid" style={mapGridStyle}>
            <MapOperationsDisclosure summary="Canlı araçlar ve vardiyalar" count={cards.length} className="mapListDisclosure">
              {renderVehicleListCard({
                title: "Canlı Liste",
                subtitle: "Satıra tıkla → sağda timeline + harita.",
                cardHeight: listCardHeight,
              })}
            </MapOperationsDisclosure>

            <div className="col" data-map-surface="primary" style={{ gap: 10 }}>
              <div className="card" data-map-current-state="true" style={{ marginBottom: 0, paddingTop: 12, paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="muted" style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Harita Önizleme
                  </div>
                  <div>
                    <div className="title" style={{ fontSize: 16, lineHeight: 1.1 }}>Seçili Araç</div>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                      {selected?.plate || "-"} • {selectedShift ? shiftTitle(selectedShift) : "Vardiya yok"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        minWidth: 0,
                        flex: "1 1 780px",
                      }}
                    >
                      {selectedShift ? (
                        <span className="pill" data-status={String(selectedShift?.status || "").toUpperCase()}>
                          {displayStatusLabel(String(selectedShift?.status || "").toUpperCase())}
                        </span>
                      ) : null}

                      <span className="muted" style={{ fontSize: 12 }}>GPS:</span>
                      <span className="pill" data-status={pillKeyFromUi(uiStatusFromVehicle(selected))}>
                        {displayStatusLabel(uiStatusFromVehicle(selected))}
                      </span>

                      <span className="muted" style={{ fontSize: 12 }}>Son GPS:</span>
                      <span className="pill">{gpsAgeLabel(selected)}</span>

                      {selectedNext?.name ? (
                        <>
                          <span className="muted" style={{ fontSize: 12 }}>Sıradaki:</span>
                          <span className="pill" data-status="NEXT">{selectedNext.name}</span>
                        </>
                      ) : (
                        <span className="muted">Sıradaki durak yok.</span>
                      )}

                      {selectedEta != null ? (
                        <span className="pill">Tahmini süre: {etaDisplayText(selected, selectedEta, selectedNext)}</span>
                      ) : null}

                      <span className="pill">Toplam Durak Sayısı: {selectedStats.total}</span>
                      <span className="pill" data-status="OK">Tamamlanan: {selectedStats.completed}</span>
                      <span className="pill" data-status="REQUESTED">Kalan: {selectedStats.remaining}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexWrap: "wrap",
                        flex: "0 1 auto",
                        marginLeft: "auto",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginLeft: 4,
                        }}
                      >
                        <span className="muted" style={{ fontSize: 12 }}>Kısa zaman çizelgesi</span>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <StopTimeline
                            stops={selectedStops}
                            nextStopId={selectedNext?.id ?? null}
                            compact
                            onSelect={(s) => focusStop(s)}
                          />
                        </div>
                      </div>

                      <button className="btn sm" onClick={fitAll}>Tümünü Göster</button>
                    </div>
                  </div>

                  <div className="toolbar" style={{ flexWrap: "wrap" }}>
                    <button className={selectedNext ? "btn primary sm" : "btn sm"} data-primary-cta={selectedNext ? "true" : undefined} onClick={() => openNextStopNavigation(selectedNext, selected)} disabled={!selectedNext}>
                      Sonraki Durağa Navigasyon
                    </button>
                    <button className="btn sm" onClick={() => openFullRouteNavigation(selectedStops, selected)} disabled={!selectedStops.length}>
                      Tam Rotayı Dış Navigasyonda Aç
                    </button>
                  </div>

                  <div className="panelMeta" style={{ marginTop: 2 }}>
                    {selectedSummaryText || "Canlı araç seçimi bekleniyor."}
                  </div>
                  <div className="panelMeta" style={{ marginTop: 2 }}>
                    {selectedHistoryLine || "Son güncelleme ve rota kaynağı burada görünür."}
                  </div>

                  <div className="col" style={{ gap: 8, marginTop: 4 }}>
                    {selectedRiskLines.slice(0, 2).map((line) => (
                      <div key={line} className="pill" style={{ justifyContent: "flex-start", width: "fit-content" }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <MapView
                vehicles={vehicles}
                stops={showStops ? selectedStops : []}
                routePath={routePreview.points}
                routeSource={routePreview.source}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={setSelectedVehicleId}
                fitKey={`room:${vehicles.length}:${selectedVehicleId}:${selectedStops.length}:${gpsAtIso(selected) || ""}:${showStops ? "stops" : "nostops"}`}
                height="var(--mapH)"
              />

              <SafeDriveSummaryCard summaryParams={safeDriveSummaryParams} compact style={{ marginBottom: 10 }} />
            </div>
          </div>
        </MapTabCard>
      ) : null}

      {mapTab === "vehicles" ? (
        <MapTabCard
          tabRef={(node) => { mapTabRefs.current.vehicles = node; }}
          title="Araçlar"
          subtitle="Canlı liste ve seçili araç detayı."
          badge={`${cards.length}`}
        >
          <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.9fr)", gap: 12 }}>
            {renderVehicleListCard({
              title: "Canlı Araçlar",
              subtitle: "Satıra tıkla → sağdaki detay değişsin.",
              cardHeight: vehiclesCardHeight,
            })}
            <div className="col" style={{ gap: 10 }}>
              <div className="card">
                <div className="title" style={{ fontSize: 16 }}>Seçili Araç</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {selected?.plate || "-"} • {selectedShift ? shiftTitle(selectedShift) : "Vardiya yok"}
                </div>
                <div className="col" style={{ gap: 8, marginTop: 10 }}>
                  <span className="pill" data-status={pillKeyFromUi(uiStatusFromVehicle(selected))}>{displayStatusLabel(uiStatusFromVehicle(selected))}</span>
                  <span className="pill">Son GPS: {gpsAgeLabel(selected)}</span>
                  <span className="pill">Sonraki: {selectedNext?.name || "Bekleniyor"}</span>
                  <span className="pill">Tahmini süre: {etaDisplayText(selected, selectedEta, selectedNext)}</span>
                </div>
              </div>

              <div className="card">
                <div className="title" style={{ fontSize: 16 }}>Hızlı İşlem</div>
                <div className="toolbar" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <button className="btn sm" onClick={() => openNextStopNavigation(selectedNext, selected)} disabled={!selectedNext}>
                    Sonraki Durağa Git
                  </button>
                  <button className="btn sm" onClick={() => openFullRouteNavigation(selectedStops, selected)} disabled={!selectedStops.length}>
                    Tam Rotayı Aç
                  </button>
                  <button className={!selectedNext ? "btn primary sm" : "btn sm"} data-primary-cta={!selectedNext ? "true" : undefined} onClick={fitAll}>Tümünü Göster</button>
                </div>
              </div>
            </div>
          </div>
        </MapTabCard>
      ) : null}
    </div>
  );
}
