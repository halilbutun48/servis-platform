// web/src/panels/room/MapPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { ageSecFromAt, pillKeyFromUi, uiStatusFromVehicle } from "../../utils/uiStatus";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { displayStatusLabel } from "../../utils/displayStatus";
import PanelChrome from "../../components/PanelChrome";

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
  const age = ageSecFromAt(gpsAtIso(v));
  if (age == null) return "-";
  if (age < 60) return `${age}s`;
  if (age < 3600) return `${Math.floor(age / 60)}dk`;
  return `${Math.floor(age / 3600)}sa`;
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
  return `Shift ${id} â€¢ ${displayStatusLabel(st)}`;
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

export default function RoomMapPanel() {
  const { token } = useSession();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [showNoGps, setShowNoGps] = useState(true);
  const [showStops, setShowStops] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [routePreview, setRoutePreview] = useState({ points: [], source: "ESTIMATED" });

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const r = await api("/api/vehicles", { token });
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

  const copilotSummary = useMemo(() => {
    if (!selected) return null;
    const parts = [];
    if (selectedShift?.id) parts.push(`Vardiya #${selectedShift.id}`);
    if (selected?.plate) parts.push(`AraÃ§ ${selected.plate}`);
    const ui = uiStatusFromVehicle(selected);
    if (ui) parts.push(`GPS ${ui}`);
    if (selectedNext?.name) parts.push(`SÄ±radaki ${selectedNext.name}`);
    return parts.join(" â€¢ ");
  }, [selected, selectedShift?.id, selectedNext?.name]);

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
          ? `AraÃ§ ${selected.plate}`
          : `AraÃ§ #${selected?.id || "-"}`,
      summary: copilotSummary || "",
      fields: [
        { label: 'AraÃ§', value: selected?.plate || `#${selected?.id || '-'}`, help: 'SeÃ§ili aracÄ±n plakasÄ±nÄ± veya kayÄ±t numarasÄ±nÄ± gÃ¶sterir.' },
        { label: 'Son GPS', value: gpsAgeLabel(selected), help: 'Son canlÄ± konum bilgisinin kaÃ§ dakika veya saniye Ã¶nce geldiÄŸini gÃ¶sterir.' },
        { label: 'SÄ±radaki Durak', value: selectedNext?.name || '-', help: 'AraÃ§ ÅŸu anda hangi duraÄŸa doÄŸru gidiyor bilgisini gÃ¶sterir.' },
        { label: 'ETA', value: selectedEta != null ? `${selectedEta}dk` : '-', help: 'SÄ±radaki duraÄŸa tahmini kalan sÃ¼reyi gÃ¶sterir.' },
        { label: 'Toplam Durak', value: `${selectedStats?.total ?? 0}`, help: 'SeÃ§ili vardiyadaki toplam durak sayÄ±sÄ±nÄ± gÃ¶sterir.' },
        { label: 'Kalan', value: `${selectedStats?.remaining ?? 0}`, help: 'HenÃ¼z tamamlanmamÄ±ÅŸ durak sayÄ±sÄ±nÄ± gÃ¶sterir.' },
      ],
      facts,
      badges: [
        { label: 'GPS', value: displayStatusLabel(uiStatusFromVehicle(selected) || '-'), help: 'AraÃ§ GPS sinyalinin canlÄ± mÄ± eski mi yok mu olduÄŸunu gÃ¶sterir.' },
        { label: 'Vardiya Durumu', value: displayStatusLabel(String(selectedShift?.status || '-').toUpperCase()), help: 'SeÃ§ili vardiyanÄ±n operasyon durumunu gÃ¶sterir.' },
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
        const r = await api(`/api/shifts/${selectedShift.id}/route-preview`, { token });
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

  return (
    <div className="wrap wrap--fluid">
      <PanelChrome
        title="Room â€¢ CanlÄ± Takip"
        subtitle="Tek panel: canlÄ± liste + seÃ§ili araÃ§ + duraklar + harita"
        actions={
          <div className="toolbar" style={{ justifyContent: "flex-end" }}>
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(Boolean(e.target.checked))} />
              Sadece ACTIVE
            </label>

            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={showNoGps} onChange={(e) => setShowNoGps(Boolean(e.target.checked))} />
              GPS olmayanlarÄ± gÃ¶ster
            </label>

            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={showStops} onChange={(e) => setShowStops(Boolean(e.target.checked))} />
              DuraklarÄ± gÃ¶ster
            </label>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Plaka / sÃ¼rÃ¼cÃ¼ / ÅŸirket / id"
              style={{ width: 280 }}
            />

            <button className="btn sm" onClick={load} disabled={busy}>
              {busy ? "..." : "Yenile"}
            </button>
          </div>
        }
      />

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(700px, calc(100vh - 300px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 285px)" }}>
          <div className="title" style={{ fontSize: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>CanlÄ± Liste</span>
            <span className="muted" style={{ fontSize: 12 }}>{cards.length} kayÄ±t</span>
          </div>

          <div className="muted" style={{ margin: "8px 0 10px" }}>
            SatÄ±ra tÄ±kla â†’ saÄŸda timeline + harita.
          </div>

          <div className="col mapAsideList" style={{ flex: 1, minHeight: 0 }}>
            {!cards.length ? (
              <div className="muted" style={{ padding: 10 }}>
                Aktif/uygun vardiya bulunamadÄ±.
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
                      SÃ¼rÃ¼cÃ¼: {s?.driver?.fullName || v?.driver?.fullName || "-"}
                      {s?.company?.name ? ` â€¢ ${s.company.name}` : ""}
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
                      Ä°lerleme: {c.pct}% (reached:{c.lastReachedOrder}/{c.total || 0})
                      {c.nextStop?.name ? ` â€¢ SÄ±radaki: ${c.nextStop.name}` : ""}
                      {c.nextStop?.name && c.nextEtaMin != null ? ` â€¢ ETA: ${c.nextEtaMin}dk` : ""}
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
                      BaÅŸlangÄ±Ã§: {fmtTR(s?.startAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 10, paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div className="title" style={{ fontSize: 16, lineHeight: 1.1 }}>SeÃ§ili AraÃ§</div>
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                  {selected?.plate || "-"} â€¢ {selectedShift ? shiftTitle(selectedShift) : "Shift yok"}
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
                      <span className="muted" style={{ fontSize: 12 }}>SÄ±radaki:</span>
                      <span className="pill" data-status="NEXT">{selectedNext.name}</span>

                      <button
                        className="btn sm"
                        onClick={() => openNextStopNavigation(selectedNext, selected)}
                      >
                        Sonraki DuraÄŸa Navigasyon
                      </button>

                      {selectedEta != null ? (
                        <span className="pill">ETA: {selectedEta}dk</span>
                      ) : null}

                      <button
                        className="btn sm"
                        onClick={() => openFullRouteNavigation(selectedStops, selected)}
                      >
                        Tam RotayÄ± DÄ±ÅŸ Navigasyonda AÃ§
                      </button>
                    </>
                  ) : (
                    <span className="muted">SÄ±radaki durak yok.</span>
                  )}
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
                  <span className="pill">Toplam Durak SayÄ±sÄ±: {selectedStats.total}</span>
                  <span className="pill" data-status="OK">Tamamlanan: {selectedStats.completed}</span>
                  <span className="pill" data-status="REQUESTED">Kalan: {selectedStats.remaining}</span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginLeft: 4,
                    }}
                  >
                    <span className="muted" style={{ fontSize: 12 }}>Mini Timeline</span>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <StopTimeline
                        stops={selectedStops}
                        nextStopId={selectedNext?.id ?? null}
                        compact
                        onSelect={(s) => focusStop(s)}
                      />
                    </div>
                  </div>

                  <button className="btn sm" onClick={fitAll}>TÃ¼mÃ¼nÃ¼ GÃ¶ster</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="title" style={{ fontSize: 16 }}>Harita Ã–nizleme</div>
            <div className="muted" style={{ fontSize: 12 }}>
              SeÃ§ili araÃ§ + tÃ¼m rota. Yol aÄŸÄ±na yakÄ±n Ã¶nizleme varsa otomatik kullanÄ±lÄ±r.
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
        </div>
      </div>
    </div>
  );
}
