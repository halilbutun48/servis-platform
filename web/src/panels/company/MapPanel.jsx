import { formatDateTimeTR, nowIsoTR } from "../../utils/time";
// web/src/panels/company/MapPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";

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
  const sec = ageSecFromAt(gpsAtIso(vehicle));
  if (sec == null) return "-";
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}dk`;
  const h = Math.round(min / 60);
  return `${h}s`; // saat
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
  return `Shift #${s.id} • ${normShiftStatus(s.status)}`;
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
  const sorted = [...arr].sort((a, b) => (Number(a?.order ?? 0) - Number(b?.order ?? 0)));
  return sorted.find((s) => s && !isReached(s)) || null;
}

function etaMinGuess(vehicle, nextStop) {
  // Backend stop.etaMin/remainingKm varsa onları kullan
  const eta = asNum(nextStop?.etaMin);
  if (eta != null) return Math.max(0, Math.round(eta));

  const km = asNum(nextStop?.remainingKm);
  if (km != null) {
    // kaba tahmin: 35 km/h
    const min = Math.round((km / 35) * 60);
    return Math.max(0, min);
  }

  // yoksa null
  return null;
}

function normStops(stops) {
  return (Array.isArray(stops) ? stops : []).map((x, i) => ({
    ...x,
    order: x?.order ?? (i + 1),
    name: x?.name ?? x?.title ?? `Durak ${i + 1}`,
    lat: x?.lat ?? x?.location?.lat,
    lng: x?.lng ?? x?.location?.lng,
  }));
}

function focusStop(stop) {
  const lat = asNum(stop?.lat);
  const lng = asNum(stop?.lng);
  if (lat == null || lng == null) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = asNum(stop?.lat);
  const dLng = asNum(stop?.lng);
  if (dLat == null || dLng == null) return;

  const oLat = asNum(originVehicle?.gpsLast?.lat);
  const oLng = asNum(originVehicle?.gpsLast?.lng);
  const hasOrigin = oLat != null && oLng != null;

  const dest = `${dLat},${dLng}`;
  const url = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}

export default function CompanyMapPanel() {
  const { token } = useSession();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const [shifts, setShifts] = useState([]); // APPROVED/ACTIVE

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [showNoGps, setShowNoGps] = useState(true);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [routePreview, setRoutePreview] = useState({ points: [], source: "ESTIMATED" });

  async function loadVehicles() {
    const r = await api("/api/vehicles", { token });
    const items = Array.isArray(r) ? r : [];
    setVehicles(items);

    // selection sanity (prefer first with shift)
    if (selectedVehicleId && !items.some((v) => String(v.id) === String(selectedVehicleId))) setSelectedVehicleId(null);
    if (!selectedVehicleId) {
      const withShift = shifts.find((s) => s?.vehicleId != null) || null;
      const first = withShift ? items.find((v) => String(v.id) === String(withShift.vehicleId)) : null;
      setSelectedVehicleId((first || items[0] || null)?.id ?? null);
    }
  }

  async function loadShifts() {
    const qs = new URLSearchParams();
    qs.set("status", "APPROVED,ACTIVE");
    qs.set("onlyNow", "1");
    qs.set("take", "200");
    const r = await api(`/api/shifts?${qs.toString()}`, { token });
    const items = Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []);
    setShifts(items);

    // selection hint: if nothing selected, pick first shift's vehicle
    if (!selectedVehicleId) {
      const first = items[0] || null;
      if (first?.vehicleId != null) setSelectedVehicleId(first.vehicleId);
    }
  }

  async function loadAll() {
    setErr("");
    setBusy(true);
    try {
      await Promise.all([loadVehicles(), loadShifts()]);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ WS spam guard: vehicle:status patch, gps patch; others -> reload
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

    loadVehicles().catch(() => {});
  });

  // gps:update → HTTP YOK (sadece koordinat patch)
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

  useAutoReload("shifts", () => { loadShifts().catch(() => {}); });

  // selection hard-guard
  useEffect(() => {
    if (!vehicles.length) return;
    if (selectedVehicleId == null) { setSelectedVehicleId(vehicles[0].id); return; }
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
      // prefer ACTIVE
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

  const selected = useMemo(() => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null, [vehicles, selectedVehicleId]);
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
        if (alive) setRoutePreview({ points: pts, source: String(r?.path?.source || "ESTIMATED").toUpperCase() });
      } catch {
        if (alive) setRoutePreview({ points: [], source: "ESTIMATED" });
      }
    }
    loadRoutePreview();
    return () => { alive = false; };
  }, [selectedShift?.id, token]);

  function fitAll() {
    try { window.dispatchEvent(new Event("map:fitAll")); } catch {}
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Company • Canlı Harita</div>
          <div className="muted">Tek panel: canlı liste + seçili araç + duraklar + harita</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(Boolean(e.target.checked))} />
            Sadece ACTIVE
          </label>

          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showNoGps} onChange={(e) => setShowNoGps(Boolean(e.target.checked))} />
            GPS olmayanları göster
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
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(520px, calc(100vh - 420px))" }}>
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
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, minWidth: 0, flex: 1 }}>
                    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                      <b>{v?.plate || "-"}</b>
                      <span className="pill" data-status={c.pillKey} title={`GPS: ${c.ui}`}>{c.ui}</span>
                      <span className="pill" data-status={normShiftStatus(s?.status)}>{normShiftStatus(s?.status)}</span>
                      {!gpsOk ? <span className="pill" data-status="PASSIVE" style={{ fontSize: 11 }}>NO GPS</span> : null}
                    </span>

                    <span className="muted" style={{ fontSize: 12, width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Sürücü: {s?.driver?.fullName || v?.driver?.fullName || "-"}
                      {v?.room?.name ? ` • ${v.room.name}` : ""}
                    </span>

                    <span className="muted" style={{ fontSize: 12, width: "100%", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                      İlerleme: {c.pct}% (reached:{c.lastReachedOrder}/{c.total || 0})
                      {c.nextStop?.name ? ` • Sıradaki: ${c.nextStop.name}` : ""}
                      {c.nextStop?.name && c.nextEtaMin != null ? ` • ETA: ${c.nextEtaMin}dk` : ""}
                    </span>
                  </span>

                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "0 0 118px", maxWidth: 118 }}>
                    <span className="muted" style={{ fontSize: 12 }}>Son GPS: {gpsAgeLabel(v)}</span>
                    <span className="muted" style={{ fontSize: 12 }}>Başlangıç: {fmtTR(s?.startAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div className="title" style={{ fontSize: 16 }}>Seçili Araç</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {selected?.plate || "-"} • {selectedShift ? shiftTitle(selectedShift) : "Shift yok"}
                </div>
              </div>
              <button className="btn sm" onClick={fitAll}>Tümünü Göster</button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="muted">GPS:</span>
              <span className="pill" data-status={pillKeyFromUi(uiStatusFromVehicle(selected))}>
                {uiStatusFromVehicle(selected)}
              </span>
              <span className="muted">Son GPS:</span>
              <span className="pill">{gpsAgeLabel(selected)}</span>

              {selectedNext?.name ? (
                <>
                  <span className="muted">Sıradaki:</span>
                  <span className="pill" data-status="NEXT">{selectedNext.name}</span>
                  <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNextStopNavigation(selectedNext, selected)}>Sonraki Durağa Navigasyon</button>
                  {selectedEta != null ? <span className="muted">ETA: <b>{selectedEta}dk</b></span> : null}
                  <button className="btn sm" onClick={() => openFullRouteNavigation(selectedStops, selected)}>Tam Rotayı Dış Navigasyonda Aç</button>
                </>
              ) : (
                <span className="muted">Sıradaki durak yok.</span>
              )}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="pill">Toplam: {selectedStats.total}</span>
              <span className="pill" data-status="OK">Tamamlanan: {selectedStats.completed}</span>
              <span className="pill" data-status="REQUESTED">Kalan: {selectedStats.remaining}</span>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
              <StopTimeline stops={selectedStops} nextStopId={selectedNext?.id ?? null} compact onSelect={(s) => focusStop(s)} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="title" style={{ fontSize: 16 }}>Harita Önizleme</div>
            <div className="muted" style={{ fontSize: 12 }}>Seçili araç + tüm rota. Yol ağına yakın önizleme varsa otomatik kullanılır.</div>
          </div>

          <MapView
            vehicles={vehicles}
            stops={selectedStops}
            routePath={routePreview.points}
            routeSource={routePreview.source}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            fitKey={`company:${vehicles.length}:${selectedVehicleId}:${selectedStops.length}:${gpsAtIso(selected) || ""}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}