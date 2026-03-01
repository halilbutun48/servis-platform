import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";
import StopTimeline, { pickNextStopByRemainingKmOrEta } from "../../components/StopTimeline";

function fmtTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyRidePanel() {
  const { token } = useSession();

  const [avail, setAvail] = useState([]);
  const [selShiftId, setSelShiftId] = useState("");
  const [myShift, setMyShift] = useState(null);
  const [eta, setEta] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loc, setLoc] = useState({ lat: "", lng: "" });
  const [selectedStopId, setSelectedStopId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function loadAvailable() {
    if (!token) return;
    try {
      const r = await api("/api/personel/shifts?take=50", { token });
      const items = Array.isArray(r?.items) ? r.items : [];
      setAvail(items);

      // default selection
      if (!selShiftId) {
        const first = items[0]?.id;
        if (first) setSelShiftId(String(first));
      }
    } catch {
      setAvail([]);
    }
  }

  async function loadMyShift() {
    if (!token) return;
    try {
      const r = await api("/api/shifts/my", { token });
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      setMyShift(items[0] || null);
    } catch {
      setMyShift(null);
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

  async function loadEtaForVehicle(vehicleId) {
    if (!token || !vehicleId) return;
    try {
      const r = await api(`/api/eta/vehicle/${vehicleId}`, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadAll() {
    setErr("");
    await Promise.all([loadAvailable(), loadMyShift(), loadNotifs()]);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoReload("shifts", loadMyShift);
  useAutoReload("requests", loadMyShift);
  useAutoReload("notifications", loadNotifs);

  const vehicle = myShift?.vehicle || null;

const etaStopsForTimeline = useMemo(() => {
  const arr = Array.isArray(eta?.items?.[0]?.stops) ? eta.items[0].stops : [];
  return arr.map((s, i) => ({ ...s, order: s?.order ?? (i + 1) }));
}, [eta]);

const nextStop = useMemo(() => pickNextStopByRemainingKmOrEta(etaStopsForTimeline), [etaStopsForTimeline]);
const nextStopId = nextStop?.id ?? null;

function scrollToEtaRow(stopId) {
  try {
    const el = document.getElementById(`eta-row-${String(stopId)}`);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setSelectedStopId(stopId);
  } catch {}
}

  const selShift = useMemo(() => {
    const sid = Number(selShiftId);
    if (!sid) return null;
    return (avail || []).find((s) => Number(s?.id) === sid) || null;
  }, [avail, selShiftId]);

  function getLocation() {
    setOkMsg("");
    setErr("");
    if (!navigator.geolocation) {
      setErr("Tarayıcı konum (geolocation) desteklemiyor.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setLoc({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
      },
      (e) => {
        setBusy(false);
        setErr(String(e?.message || e));
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function createRequest() {
    setOkMsg("");
    setErr("");
    const shiftId = Number(selShiftId);
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!shiftId) return setErr("Vardiya seçmelisin.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setErr("Konum (lat/lng) gerekli.");

    setBusy(true);
    try {
      await api("/api/requests", { token, method: "POST", body: { shiftId, lat, lng } });
      setOkMsg("✅ Talebin alındı. Araç/rota bilgisi geldiğinde burada göreceksin.");
      await loadMyShift();

      // ETA
      const vId = Number(myShift?.vehicleId || 0);
      if (vId) await loadEtaForVehicle(vId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Benim Servisim</h3>
        <div className="muted">En az adım: vardiya seç → konum al → talep oluştur</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}
      {okMsg ? <div className="card ok">{okMsg}</div> : null}

      <div className="grid">
        <div className="card">
          <h3>1) Talep Oluştur</h3>
          <div className="col" style={{ gap: 8 }}>
            <label className="muted">Uygun Vardiya</label>
            <select value={selShiftId} onChange={(e) => setSelShiftId(e.target.value)} disabled={busy}>
              <option value="">Seç…</option>
              {(avail || []).map((s) => (
                <option key={s.id} value={String(s.id)}>
                  #{s.id} • {fmtTR(s.startAt)} → {fmtTR(s.endAt)} • {s.room?.name || (s.roomId ? `Room#${s.roomId}` : "-")}
                </option>
              ))}
            </select>
            {!avail?.length ? <div className="muted">Uygun vardiya yok. (Shift henüz APPROVED/ACTIVE değilse listelenmez.)</div> : null}

            {selShift ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Seçili: <b>Shift #{selShift.id}</b> • {selShift.room?.name || `Room#${selShift.roomId}`}
              </div>
            ) : null}

            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button type="button" disabled={busy} onClick={getLocation}>
                {busy ? "..." : "Konumumu Al"}
              </button>
              <input
                value={loc.lat}
                onChange={(e) => setLoc((p) => ({ ...p, lat: e.target.value }))}
                placeholder="lat"
                style={{ minWidth: 140 }}
                disabled={busy}
              />
              <input
                value={loc.lng}
                onChange={(e) => setLoc((p) => ({ ...p, lng: e.target.value }))}
                placeholder="lng"
                style={{ minWidth: 140 }}
                disabled={busy}
              />
            </div>

            <button type="button" disabled={busy} onClick={createRequest} style={{ marginTop: 10 }}>
              {busy ? "..." : "Talep Oluştur"}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>2) Şu anki durum</h3>
          {myShift ? (
            <div className="col" style={{ gap: 6 }}>
              <div>
                <b>Shift #{myShift.id}</b> — <span className="pill" data-status={myShift.status}>{myShift.status}</span>
              </div>
              <div className="muted">Room: {myShift.room?.name || (myShift.roomId ? `#${myShift.roomId}` : "-")}</div>
              <div className="muted">Araç: {vehicle?.plate || (myShift.vehicleId ? `#${myShift.vehicleId}` : "-")}</div>
              <div className="muted">Sürücü: {myShift.driver?.fullName || (myShift.driverId ? `#${myShift.driverId}` : "-")}</div>
              <div className="muted">Start: {fmtTR(myShift.startAt)} • End: {fmtTR(myShift.endAt)}</div>

{etaStopsForTimeline.length ? (
  <div style={{ marginTop: 10 }}>
    <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
    <StopTimeline
      stops={etaStopsForTimeline}
      nextStopId={nextStopId}
      selectedStopId={selectedStopId}
      compact
      onSelect={(s) => scrollToEtaRow(s?.id)}
    />
    {nextStop?.name ? (
      <div className="muted" style={{ marginTop: 8 }}>
        NEXT: <span className="pill" data-status="NEXT">{nextStop.name}</span>
        {Number.isFinite(Number(nextStop?.etaMin)) ? <span className="muted" style={{ marginLeft: 8 }}>ETA: <b>{Math.round(Number(nextStop.etaMin))}dk</b></span> : null}
        {Number.isFinite(Number(nextStop?.remainingKm)) ? <span className="muted" style={{ marginLeft: 8 }}>km: <b>{Number(nextStop.remainingKm).toFixed(1)}</b></span> : null}
      </div>
    ) : null}
  </div>
) : (
  <div className="muted" style={{ marginTop: 10 }}>
    ETA/Duraklar'a basınca timeline görünür.
  </div>
)}

              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {vehicle ? (
                  <button type="button" disabled={busy} onClick={() => loadEtaForVehicle(vehicle.id)}>
                    ETA / Duraklar
                  </button>
                ) : null}
                <button type="button" disabled={busy} onClick={() => navigate("/shared/notifications")}>Bildirimler</button>
              </div>
            </div>
          ) : (
            <div className="muted">Henüz eşleşmiş bir servis yok (talep oluşturduktan sonra burada görünür).</div>
          )}
        </div>
      </div>

      {eta ? (
        <div className="card">
          <h3>ETA (approx)</h3>
          <div className="muted">vehicleId: {eta.vehicleId}</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Stop</th>
                <th>Km</th>
                <th>ETA(dk)</th>
              </tr>
            </thead>
            <tbody>
              {(eta.items?.[0]?.stops || []).map((s, i) => {
              const rowId = `eta-row-${s.id}`;
              const isSel = selectedStopId && String(selectedStopId) === String(s.id);
              const isNext = nextStopId && String(nextStopId) === String(s.id);
              return (
                <tr key={s.id ?? i} id={rowId} style={isSel ? { outline: "2px solid rgba(245,158,11,.55)" } : undefined}>
                  <td>
                    {isNext ? <span className="pill" data-status="NEXT" style={{ marginRight: 8 }}>NEXT</span> : null}
                    {s.name}
                  </td>
                  <td>{s.remainingKm}</td>
                  <td>{s.etaMin}</td>
                </tr>
              );
            })}
            </tbody>
          </table>
          <div className="muted" style={{ marginTop: 8 }}>
            Not: Bu ETA haversine + speed üzerinden yaklaşık hesap.
          </div>
        </div>
      ) : null}

      {notifs?.length ? (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3>Son Bildirimler</h3>
            <button type="button" disabled={busy} onClick={() => navigate("/shared/notifications")}>
              Tümünü Aç
            </button>
          </div>
          <ul style={{ marginTop: 8 }}>
            {notifs.map((n) => (
              <li key={n.id} className="muted">
                <b>{n.type}</b> • {fmtTR(n.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
