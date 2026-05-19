// web/src/panels/company/MapPanel.jsx
import { formatDateTimeTR, nowIsoTR } from "../../utils/time";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildMapFacts } from "../../utils/copilotFacts";
import { getEtaDisplay, getGpsAgeText } from "../../utils/etaSanity";
import { getPath } from "../../router";
import { getCompanyMapShifts, getCompanyVehicles } from "../../utils/companyDataHub";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import { displayStatusLabel } from "../../utils/displayStatus";
import PanelChrome from "../../components/PanelChrome";

function asNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function gpsAtIso(vehicle) {
  return vehicle?.gpsLast?.at || vehicle?.gpsLastAt || vehicle?.gpsState?.lastAt || null;
}

function ageSecFromAt(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}

function gpsAgeLabel(vehicle) {
  return getGpsAgeText(vehicle);
}

function etaDisplayText(vehicle, etaMinutes, nextStop) {
  return getEtaDisplay({
    etaMinutes,
    gpsStatus: vehicle?.gpsState?.lastUiStatus || vehicle?.gpsState?.lastStatus || vehicle?.gpsLast?.status || vehicle?.gpsLast?.state || (hasGpsFix(vehicle) ? "LIVE" : "UNKNOWN"),
    gpsAge: vehicle?.gpsLast,
    nextStopName: nextStop?.name,
  });
}

function hasGpsFix(vehicle) {
  const lat = asNum(vehicle?.gpsLast?.lat);
  const lng = asNum(vehicle?.gpsLast?.lng);
  return lat != null && lng != null;
}

function fmtTR(x) {
  if (!x) return "-";
  try {
    return formatDateTimeTR(x);
  } catch {
    return String(x);
  }
}

function normShiftStatus(s) {
  return String(s || "").toUpperCase();
}

function shiftTitle(s) {
  if (!s) return "Shift yok";
  return `Shift #${s.id} • ${displayStatusLabel(normShiftStatus(s.status))}`;
}

function isReached(stop) {
  const st = String(stop?.status || stop?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || Boolean(stop?.reachedAt) || Boolean(stop?.reached);
}

function derivedLastReachedOrder(stops) {
  const arr = Array.isArray(stops) ? stops : [];
  let mx = 0;
  for (const s of arr) {
    if (!isReached(s)) continue;
    const o = Number(s?.order);
    if (Number.isFinite(o)) mx = Math.max(mx, o);
  }
  return mx;
}

function firstPendingStop(stops) {
  const arr = Array.isArray(stops) ? stops : [];
  const sorted = [...arr].sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0));
  return sorted.find((s) => s && !isReached(s)) || null;
}

function etaMinGuess(vehicle, nextStop) {
  const eta = asNum(nextStop?.etaMin);
  if (eta != null) return Math.max(0, Math.round(eta));

  const km = asNum(nextStop?.remainingKm);
  if (km != null) {
    const min = Math.round((km / 35) * 60);
    return Math.max(0, min);
  }

  return null;
}

function normStops(stops) {
  return (Array.isArray(stops) ? stops : []).map((x, i) => ({
    ...x,
    order: x?.order ?? i + 1,
    name: x?.name ?? x?.title ?? `Durak ${i + 1}`,
    lat: x?.lat ?? x?.location?.lat,
    lng: x?.lng ?? x?.location?.lng,
  }));
}

function stopCoord(stop) {
  const lat = asNum(stop?.lat);
  const lng = asNum(stop?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function focusStop(stop) {
  const c = stopCoord(stop);
  if (!c) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat: c.lat, lng: c.lng, zoom: 17 } }));
}

export default function CompanyMapPanel() {
  const { token } = useSession();
  const scopeKey = useMemo(() => {
    const path = String(getPath() || "/company/map").split("?")[0];
    if (path === "/school/map" || path === "/organization/map") return path;
    return "/company/map";
  }, []);

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const [shifts, setShifts] = useState([]);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [showNoGps, setShowNoGps] = useState(true);
  const [showStops, setShowStops] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [routePreview, setRoutePreview] = useState({ points: [], source: "ESTIMATED" });

  const loadVehicles = useCallback(async (signal) => {
    const r = await getCompanyVehicles(token, { signal, take: 20, onlyActive: true, ttlMs: 45000 });
    const items = Array.isArray(r) ? r : [];
    setVehicles(items);

    if (selectedVehicleId && !items.some((v) => String(v.id) === String(selectedVehicleId))) {
      setSelectedVehicleId(null);
    }
    if (!selectedVehicleId) {
      const withShift = shifts.find((s) => s?.vehicleId != null) || null;
      const first = withShift ? items.find((v) => String(v.id) === String(withShift.vehicleId)) : null;
      setSelectedVehicleId((first || items[0] || null)?.id ?? null);
    }
  }, [token, selectedVehicleId, shifts]);

  const loadShifts = useCallback(async (signal) => {
    const r = await getCompanyMapShifts(token, { signal, ttlMs: 9000 });
    const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
    setShifts(items);

    if (!selectedVehicleId) {
      const first = items[0] || null;
      if (first?.vehicleId != null) setSelectedVehicleId(first.vehicleId);
    }
  }, [token, selectedVehicleId]);

  const loadAll = useCallback(async (signal) => {
    setErr("");
    setBusy(true);
    try {
      await Promise.all([loadVehicles(signal), loadShifts(signal)]);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [loadVehicles, loadShifts]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!cancelled) loadAll(controller.signal);
    }, 320);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [loadAll]);

  const refreshTimersRef = useRef({ vehicles: null, shifts: null });

  const scheduleRefresh = useCallback((kind, task, wait = 600) => {
    const bag = refreshTimersRef.current || {};
    if (bag[kind]) clearTimeout(bag[kind]);
    bag[kind] = setTimeout(() => { task().catch(() => {}); }, wait);
    refreshTimersRef.current = bag;
  }, []);

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

    scheduleRefresh("vehicles", () => loadVehicles(), 600);
  });

  useAutoReload("gps", (detail) => {
    const m = detail?.payload?.msg;
    const ev = m?._event;
    if (ev !== "gps:update") return;

    const vehicleId = Number(m?.vehicleId);
    if (!Number.isFinite(vehicleId)) return;

    const lat = asNum(m?.lat);
    const lng = asNum(m?.lng);
    if (lat == null || lng == null) return;

    const at = m?.at || nowIsoTR();

    setVehicles((prev) =>
      (Array.isArray(prev) ? prev : []).map((v) => {
        if (Number(v?.id) !== vehicleId) return v;
        return {
          ...v,
          gpsLast: { ...(v?.gpsLast || {}), lat, lng, at },
        };
      })
    );
  });

  useAutoReload("shifts", () => {
    scheduleRefresh("shifts", () => loadShifts(), 600);
  });

  useEffect(() => () => {
    const bag = refreshTimersRef.current || {};
    Object.values(bag).forEach((timer) => timer && clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!vehicles.length) return;
    if (selectedVehicleId == null) {
      setSelectedVehicleId(vehicles[0].id);
      return;
    }
    const ok = vehicles.some((v) => String(v.id) === String(selectedVehicleId));
    if (!ok) setSelectedVehicleId(vehicles[0].id);
  }, [vehicles, selectedVehicleId]);

  const vehicleById = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) m.set(String(v?.id), v);
    return m;
  }, [vehicles]);

  const shiftsByVehicleId = useMemo(() => {
    const m = new Map();
    for (const s of shifts) {
      if (s?.vehicleId == null) continue;
      const k = String(s.vehicleId);
      const prev = m.get(k);
      if (!prev) m.set(k, s);
      else {
        const a = normShiftStatus(prev.status);
        const b = normShiftStatus(s.status);
        if (a !== "ACTIVE" && b === "ACTIVE") m.set(k, s);
      }
    }
    return m;
  }, [shifts]);

  const cards = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    const out = [];

    for (const s0 of shifts) {
      const st = normShiftStatus(s0?.status);
      if (!s0?.vehicleId) continue;
      if (onlyActive && st !== "ACTIVE") continue;
      if (!(st === "ACTIVE" || st === "APPROVED")) continue;

      const v = vehicleById.get(String(s0.vehicleId)) || null;
      if (!v) continue;

      if (!showNoGps && !hasGpsFix(v)) continue;

      const plate = String(v?.plate || "").toLowerCase();
      const driverName = String(s0?.driver?.fullName || v?.driver?.fullName || "").toLowerCase();
      const roomName = String(v?.room?.name || s0?.room?.name || "").toLowerCase();

      if (qq) {
        const hay = `${plate} ${driverName} ${roomName} ${s0?.id ?? ""}`;
        if (!hay.includes(qq)) continue;
      }

      const stops = normStops(s0?.stops || []);
      const lastReachedOrder = derivedLastReachedOrder(stops);
      const total = stops.length;
      const next = firstPendingStop(stops);
      const pct = total ? Math.min(100, Math.max(0, Math.round((lastReachedOrder / total) * 100))) : 0;

      const ui = uiStatusFromVehicle(v);
      const pillKey = pillKeyFromUi(ui);
      const etaMin = etaMinGuess(v, next);

      out.push({
        vehicle: v,
        shift: s0,
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
      const sa = normShiftStatus(a.shift?.status);
      const sb = normShiftStatus(b.shift?.status);
      if (sa !== sb) return sa === "ACTIVE" ? -1 : 1;
      const aa = ageSecFromAt(gpsAtIso(a.vehicle)) ?? 999999;
      const bb = ageSecFromAt(gpsAtIso(b.vehicle)) ?? 999999;
      return aa - bb;
    });

    return out;
  }, [shifts, vehicleById, q, onlyActive, showNoGps]);

  const selected = useMemo(
    () => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null,
    [vehicles, selectedVehicleId]
  );

  const selectedShift = useMemo(() => {
    if (!selected) return null;
    const s = shiftsByVehicleId.get(String(selected.id)) || null;
    if (!s) return null;
    if (onlyActive && normShiftStatus(s.status) !== "ACTIVE") return null;
    return s;
  }, [selected, shiftsByVehicleId, onlyActive]);

  const selectedStops = useMemo(() => normStops(selectedShift?.stops || []), [selectedShift]);
  const selectedNext = useMemo(() => firstPendingStop(selectedStops), [selectedStops]);
  const selectedEta = useMemo(() => etaMinGuess(selected, selectedNext), [selected, selectedNext]);
  const selectedStats = useMemo(() => routeStats(selectedStops), [selectedStops]);

  const copilotSummary = useMemo(() => {
    if (!selected) return null;
    const parts = [];
    if (selectedShift?.id) parts.push(`Vardiya #${selectedShift.id}`);
    if (selected?.plate) parts.push(`Araç ${selected.plate}`);
    const ui = uiStatusFromVehicle(selected);
    if (ui) parts.push(`GPS ${ui}`);
    if (selectedNext?.name) parts.push(`Sıradaki ${selectedNext.name}`);
    return parts.join(" • ");
  }, [selected, selectedShift?.id, selectedNext?.name]);

  useEffect(() => {
    if (!selected) {
      clearCopilotSelection(scopeKey);
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
      scopeKey,
      entityType: selectedShift?.id ? "shift" : "vehicle",
      entityId: Number(selectedShift?.id || selected?.id || 0) || null,
      label: selectedShift?.id
        ? `Vardiya #${selectedShift.id}`
        : selected?.plate
          ? `Araç ${selected.plate}`
          : `Araç #${selected?.id || "-"}`,
      summary: copilotSummary || "",
      fields: [
        { label: 'Araç', value: selected?.plate || `#${selected?.id || '-'}`, help: 'Seçili aracın plakasını veya kayıt numarasını gösterir.' },
        { label: 'Son GPS', value: gpsAgeLabel(selected), help: 'Son canlı konum bilgisinin kaç dakika veya saniye önce geldiğini gösterir.' },
        { label: 'Sıradaki Durak', value: selectedNext?.name || '-', help: 'Araç şu anda hangi durağa doğru gidiyor bilgisini gösterir.' },
        { label: 'ETA', value: etaDisplayText(selected, selectedEta, selectedNext), help: 'Sıradaki durağa tahmini kalan süreyi güvenli biçimde gösterir.' },
        { label: 'Toplam Durak', value: `${selectedStats?.total ?? 0}`, help: 'Seçili vardiyadaki toplam durak sayısını gösterir.' },
        { label: 'Kalan', value: `${selectedStats?.remaining ?? 0}`, help: 'Henüz tamamlanmamış durak sayısını gösterir.' },
      ],
      facts,
      badges: [
        { label: 'GPS', value: displayStatusLabel(uiStatusFromVehicle(selected) || '-'), help: 'Araç GPS sinyalinin canlı mı eski mi yok mu olduğunu gösterir.' },
        { label: 'Vardiya Durumu', value: displayStatusLabel(String(selectedShift?.status || '-').toUpperCase()), help: 'Seçili vardiyanın operasyon durumunu gösterir.' },
      ],
    });
    return () => clearCopilotSelection(scopeKey);
  }, [selected, selectedShift, selectedNext, selectedEta, selectedStats, vehicles.length, copilotSummary, scopeKey]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      (async () => {
        if (!selectedShift?.id) {
          if (alive) setRoutePreview({ points: [], source: "ESTIMATED" });
          return;
        }
        try {
          const r = await getShiftRoutePreview(token, selectedShift.id, { ttlMs: 60000, delayMs: 180, signal: controller.signal });
          const pts = Array.isArray(r?.path?.points) ? r.path.points : [];
          if (alive) {
            setRoutePreview({
              points: pts,
              source: String(r?.path?.source || "ESTIMATED").toUpperCase(),
            });
          }
        } catch (e) {
          if (e?.name === 'AbortError') return;
          if (alive) setRoutePreview({ points: [], source: "ESTIMATED" });
        }
      })();
    }, 1200);
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timer);
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
        title={`${scopeKey === "/school/map" ? "Okul" : scopeKey === "/organization/map" ? "Organizasyon" : "Company"} • Canlı Harita`}
        subtitle="Tek panel: canlı liste + seçili araç + duraklar + harita"
        actions={
          <div className="toolbar" style={{ justifyContent: "flex-end" }}>
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(Boolean(e.target.checked))} />
              Sadece ACTIVE
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
              placeholder="Plaka / sürücü / room / id"
              style={{ width: 280 }}
            />

            <button className="btn sm" onClick={loadAll} disabled={busy}>
              {busy ? "..." : "Yenile"}
            </button>
          </div>
        }
      />

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(700px, calc(100vh - 300px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 285px)" }}>
          <div className="title" style={{ fontSize: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>Canlı Liste</span>
            <span className="muted" style={{ fontSize: 12 }}>{cards.length} kayıt</span>
          </div>

          <div className="muted" style={{ margin: "8px 0 10px" }}>
            Satıra tıkla → sağda timeline + harita.
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
                      <span className="pill" data-status={normShiftStatus(s?.status)}>
                        {displayStatusLabel(normShiftStatus(s?.status))}
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
                      {v?.room?.name ? ` • ${v.room.name}` : ""}
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
                      İlerleme: {c.pct}% (reached:{c.lastReachedOrder}/{c.total || 0})
                      {c.nextStop?.name ? ` • Sıradaki: ${c.nextStop.name}` : ""}
                      {c.nextStop?.name && c.nextEtaMin != null ? ` • ETA: ${etaDisplayText(selected, c.nextEtaMin, c.nextStop)}` : ""}
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
                    <span className="muted" style={{ fontSize: 12 }}>Son GPS: {gpsAgeLabel(v)}</span>
                    <span className="muted" style={{ fontSize: 12 }}>Başlangıç: {fmtTR(s?.startAt)}</span>
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
                <div className="title" style={{ fontSize: 16, lineHeight: 1.1 }}>Seçili Araç</div>
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                  {selected?.plate || "-"} • {selectedShift ? shiftTitle(selectedShift) : "Shift yok"}
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

                      <button
                        className="btn sm"
                        onClick={() => openNextStopNavigation(selectedNext, selected)}
                      >
                        Sonraki Durağa Navigasyon
                      </button>

                      {selectedEta != null ? (
                        <span className="pill">ETA: {etaDisplayText(selected, selectedEta, selectedNext)}</span>
                      ) : null}

                      <button
                        className="btn sm"
                        onClick={() => openFullRouteNavigation(selectedStops, selected)}
                      >
                        Tam Rotayı Dış Navigasyonda Aç
                      </button>
                    </>
                  ) : (
                    <span className="muted">Sıradaki durak yok.</span>
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
                  <span className="pill">Toplam Durak Sayısı: {selectedStats.total}</span>
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

                  <button className="btn sm" onClick={fitAll}>Tümünü Göster</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="title" style={{ fontSize: 16 }}>Harita Önizleme</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Seçili araç + tüm rota. Yol ağına yakın önizleme varsa otomatik kullanılır.
            </div>
          </div>

          <MapView
            vehicles={vehicles}
            stops={showStops ? selectedStops : []}
            routePath={routePreview.points}
            routeSource={routePreview.source}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            fitKey={`company:${vehicles.length}:${selectedVehicleId}:${selectedStops.length}:${gpsAtIso(selected) || ""}:${showStops ? "stops" : "nostops"}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}
