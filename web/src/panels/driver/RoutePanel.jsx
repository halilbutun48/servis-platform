import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import MapView from "../../components/map/MapView";
import { useSession } from "../../state/session";

function getQueryParam(name) {
  try {
    const raw = (window.location.hash || "").replace(/^#/, "");
    const q = raw.includes("?") ? raw.split("?")[1] : "";
    const sp = new URLSearchParams(q);
    return sp.get(name);
  } catch {
    return null;
  }
}

export default function RoutePanel() {
  const { token } = useSession();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const mode = data?.mode || "";
  const shift = data?.shift || null;
  const orderedStops = data?.orderedStops || [];
  const nextStop = data?.nextStop || null;
  const progress = data?.progress || null;
  const [showStops, setShowStops] = useState(false);

  const pct = useMemo(() => {
    if (!shift || !progress || !orderedStops.length) return 0;
    const maxOrder = Math.max(...orderedStops.map((s) => s.order || 0), 0) || 1;
    return Math.min(100, Math.round((progress.lastReachedOrder / maxOrder) * 100));
  }, [shift, progress, orderedStops]);

  async function load() {
    setErr("");
    try {
      const qShift = getQueryParam("shift");
      const url = qShift ? `/api/driver/shifts/${qShift}/route` : "/api/driver/route/active";
      const r = await api(url, { token });
      setData(r);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ M31-A: keyboard shortcut (Enter) = reached
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Enter") return;
      if (busy) return;
      if (!shift?.id || !nextStop?.id) return;
      reached();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, shift?.id, nextStop?.id]);

  async function reached() {
    if (!shift?.id || !nextStop?.id) return;
    setBusy(true);
    setErr("");
    try {
      const url = `/api/driver/shifts/${shift.id}/stops/${nextStop.id}/reached`;
      const r = await api(url, { method: "POST", token });

      // hızlı UI güncelle
      setData((prev) => ({
        ...(prev || {}),
        progress: { lastReachedOrder: r.lastReachedOrder, completed: r.completed },
        nextStop: r.nextStop || null,
      }));

      // kesin senkron için yenile
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }


  async function startShift() {
    if (!shift?.id) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/driver/shifts/${shift.id}/start`, { method: "POST", token });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!shift?.id) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/driver/shifts/${shift.id}/complete`, { method: "POST", token });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const reachedBtnStyle = {
    fontWeight: 900,
    fontSize: 18,
    padding: "14px 18px",
    borderRadius: 14,
    minWidth: 180,
  };

  return (
    <div>
      <div className="card">
        <h3>Bugün Rotam</h3>
        <div className="muted">
          En az adım: <b>Sonraki durağı gör</b> → <b>Reached</b>. (Kısayol: <b>Enter</b>)
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}


      {data?.routeStops?.length ? (
        <MapView
          vehicles={data?.vehicle && data?.last ? [{ id: data.vehicle.id, plate: data.vehicle.plate, gpsLast: data.last }] : []}
          stops={data.routeStops}
          selectedVehicleId={data?.vehicle?.id ?? null}
          onSelectVehicle={() => {}}
          fitKey={`driverRoute:${shift?.id ?? "x"}:${(data.routeStops || []).length}:${data?.last?.at ?? ""}`}
          height="320px"
        />
      ) : null}

      <div className="grid">
        <div className="card">
          <h3>Vardiya</h3>
          {shift ? (
            <div className="col">
              <div>
                <b>Shift #{shift.id}</b> —{" "}
                <span className="pill" data-status={shift.status}>
                  {shift.status}
                </span>
              </div>
              <div className="muted">Start: {String(shift.startAt)} | End: {String(shift.endAt)}</div>

              {progress ? (
                <>
                  <div className="bar">
                    <div className="barFill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="muted">İlerleme: {pct}% (lastReachedOrder: {progress.lastReachedOrder})</div>
                </>
              ) : null}

              {mode === "COMPLETED_FALLBACK" ? (
                <div className="ok">✅ Vardiya tamamlandı. Yeni vardiya bekleniyor.</div>
              ) : null}
            </div>
          ) : (
            <div className="muted">Vardiya bulunamadı</div>
          )}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3>Sonraki Durak</h3>
              <div className="muted">Araç: {data?.vehicle?.plate || "-"} • GPS: {data?.last?.status || "-"}</div>
            </div>
            {shift?.status === "APPROVED" ? (
              <button type="button" disabled={busy} onClick={startShift} style={{ fontWeight: 900 }}>
                Göreve Başla
              </button>
            ) : null}
            {shift?.status === "ACTIVE" && !nextStop ? (
              <button type="button" disabled={busy} onClick={complete}>
                Görevi Bitir
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={load}>
              Yenile
            </button>
          </div>

          <hr />

          {nextStop ? (
            <div className="col" style={{ gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>{nextStop.name}</div>
                <div className="muted">order: {nextStop.order}</div>
              </div>

              <button type="button" disabled={busy} onClick={reached} style={reachedBtnStyle}>
                {busy ? "..." : "Reached"}
              </button>

              <div className="muted">Konum: {data?.last ? `${data.last.lat}, ${data.last.lng}` : "-"}</div>
            </div>
          ) : (
            <div className="muted">Sonraki durak yok (vardiya bitmiş olabilir).</div>
          )}

          <div className="muted" style={{ marginTop: 10 }}>mode: {mode || "-"}</div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3>Duraklar (mesafe/ETA)</h3>
          <button type="button" onClick={() => setShowStops((p) => !p)}>
            {showStops ? "Gizle" : "Göster"}
          </button>
        </div>

        {showStops ? (
          <table className="tbl" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Ad</th>
                <th>Km</th>
                <th>ETA (dk)</th>
              </tr>
            </thead>
            <tbody>
              {orderedStops.map((s) => (
                <tr key={s.id}>
                  <td>{s.order}</td>
                  <td>{s.name}</td>
                  <td>{s.remainingKm}</td>
                  <td>{s.etaMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>
            Detaylı listeyi sadece gerekirse aç.
          </div>
        )}
      </div>
    </div>
  );
}
