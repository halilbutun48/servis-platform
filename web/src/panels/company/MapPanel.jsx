// web/src/panels/company/MapPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline, { pickNextStopByRemainingKmOrEta } from "../../components/StopTimeline";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

function normShiftStatus(s) {
  return String(s || "").toUpperCase();
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
  const lat = Number(String(stop?.lat ?? "").replace(",", "."));
  const lng = Number(String(stop?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = Number(String(stop?.lat ?? "").replace(",", "."));
  const dLng = Number(String(stop?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return;

  const oLat = Number(String(originVehicle?.gpsLast?.lat ?? "").replace(",", "."));
  const oLng = Number(String(originVehicle?.gpsLast?.lng ?? "").replace(",", "."));
  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);

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

  const [selShift, setSelShift] = useState(null);
  const [selStops, setSelStops] = useState([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadVehicles() {
    setErr("");
    setBusy(true);
    try {
      const r = await api("/api/vehicles", { token });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);
      setSelectedVehicleId((prev) => (prev && items.some((v) => v.id === prev)) ? prev : (items[0]?.id ?? null));

      if (selectedVehicleId && !items.some((v) => String(v.id) === String(selectedVehicleId))) setSelectedVehicleId(null);
      if (!selectedVehicleId) {
        const first = items[0] || null;
        if (first) setSelectedVehicleId(first.id);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function loadSelectedShift(vehicleId) {
    try {
      if (!vehicleId) {
        setSelShift(null);
        setSelStops([]);
        return;
      }

      const qs = new URLSearchParams();
      qs.set("vehicleId", String(vehicleId));
      qs.set("status", "APPROVED,ACTIVE");
      qs.set("take", "1");

      const r = await api(`/api/shifts?${qs.toString()}`, { token });
      const items = Array.isArray(r?.items) ? r.items : [];
      const s = items[0] || null;

      setSelShift(s);
      setSelStops(normStops(s?.stops || []));
    } catch {
      setSelShift(null);
      setSelStops([]);
    }
  }

  useEffect(() => { loadVehicles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

// selection hard-guard (string/number mismatch etc.)
useEffect(() => {
  if (!vehicles.length) return;
  if (selectedVehicleId == null) { setSelectedVehicleId(vehicles[0].id); return; }
  const ok = vehicles.some((v) => String(v.id) === String(selectedVehicleId));
  if (!ok) setSelectedVehicleId(vehicles[0].id);
}, [vehicles, selectedVehicleId]);

  useEffect(() => { loadSelectedShift(selectedVehicleId); }, [selectedVehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    loadVehicles();
  });
  useAutoReload("gps", loadVehicles);
  useAutoReload("shifts", () => loadSelectedShift(selectedVehicleId));

  const selectedVehicle = useMemo(() => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null, [vehicles, selectedVehicleId]);
  const ui = selectedVehicle ? uiStatusFromVehicle(selectedVehicle) : "-";
  const pillKey = pillKeyFromUi(ui);

  const nextStop = useMemo(() => pickNextStopByRemainingKmOrEta(selStops), [selStops]);
  const nextStopId = nextStop?.id ?? null;

  function fitAll() {
    window.dispatchEvent(new Event("map:fitAll"));
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Company • Canlı Harita</div>
          <div className="muted">Onaylı/aktif vardiyalardaki araçlar</div>
          {selectedVehicle ? (
            <div className="muted">Seçili: {selectedVehicle.plate || `#${selectedVehicle.id}`} • {selectedVehicle.seats || "-"} koltuk</div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn sm" onClick={loadVehicles} disabled={busy}>{busy ? "..." : "Yenile"}</button>
          <button className="btn sm" onClick={fitAll}>Tümünü Göster</button>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(520px, calc(100vh - 420px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 265px)" }}>
          <div className="title" style={{ fontSize: 16 }}>Araçlar</div>
          <div className="muted" style={{ marginTop: 6 }}>Marker’a tıkla veya listeden seç.</div>

          <div className="col mapAsideList" style={{ marginTop: 10, overflowY: "auto", maxHeight: "calc(var(--mapH) + 160px)" }}>
            {!vehicles.length ? <div className="muted" style={{ padding: 10 }}>Araç yok.</div> : null}

            {vehicles.map((v) => {
              const isSel = String(v.id) === String(selectedVehicleId);
              const ui2 = uiStatusFromVehicle(v);
              const pk2 = pillKeyFromUi(ui2);
              return (
                <button
                  key={v.id}
                  className={isSel ? "navItem active" : "navItem"}
                  onClick={() => setSelectedVehicleId(v.id)}
                  style={{ justifyContent: "space-between", gap: 10 }}
                >
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <b>{v.plate || `#${v.id}`}</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {v.seats ? `${v.seats} koltuk` : ""} {v.seats ? "• " : ""}{v.room?.name || ""}
                    </span>
                  </span>
                  <span className="pill" data-status={pk2}>{ui2}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {selectedVehicle ? (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="title" style={{ fontSize: 16 }}>Seçili Araç</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {selectedVehicle.plate || `#${selectedVehicle.id}`} • <span className="pill" data-status={pillKey}>{ui}</span>
              </div>

              {selShift ? (
                <div className="muted" style={{ marginTop: 8 }}>
                  Shift #{selShift.id} • {normShiftStatus(selShift.status)}
                  {selShift.startAt ? ` • Start: ${new Date(selShift.startAt).toLocaleString("tr-TR")}` : ""}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 8 }}>Bu araç için APPROVED/ACTIVE shift bulunamadı.</div>
              )}

              {nextStop?.name ? (
                <div className="muted" style={{ marginTop: 10 }}>
                  Sıradaki: <span className="pill" data-status="NEXT">{nextStop.name}</span>
                  <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, selectedVehicle)}>Navigasyon Aç</button>
                </div>
              ) : null}

              {selStops.length ? (
                <div style={{ marginTop: 10 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
                  <StopTimeline stops={selStops} nextStopId={nextStopId} compact onSelect={(s) => focusStop(s)} />
                </div>
              ) : null}
            </div>
          ) : null}

          <MapView
            vehicles={vehicles}
            stops={selStops}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            fitKey={`company-live:${vehicles.length}:${selectedVehicleId}:${selStops.length}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}


