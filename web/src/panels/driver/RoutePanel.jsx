import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

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

  const pct = useMemo(() => {
    if (!shift || !progress || !orderedStops.length) return 0;
    const maxOrder = Math.max(...orderedStops.map((s) => s.order || 0), 0) || 1;
    return Math.min(100, Math.round((progress.lastReachedOrder / maxOrder) * 100));
  }, [shift, progress, orderedStops]);

  async function load() {
    setErr("");
    try {
      const r = await api("/api/driver/route/active", { token });
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

  async function reached() {
    if (!shift?.id || !nextStop?.id) return;
    setBusy(true);
    setErr("");
    try {
      const url = `/api/driver/shifts/${shift.id}/stops/${nextStop.id}/reached`;
      const r = await api(url, { method: "POST", token });
      setData((prev) => ({
        ...(prev || {}),
        progress: { lastReachedOrder: r.lastReachedOrder, completed: r.completed },
        nextStop: r.nextStop || null,
      }));
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Driver Route</h3>
        <div className="muted">mode: {mode || "-"}</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid">
        <div className="card">
          <h3>Vardiya</h3>
          {shift ? (
            <div className="col">
              <div>
                <b>Shift #{shift.id}</b> — <span className="pill" data-status={shift.status}>{shift.status}</span>
              </div>
              <div className="muted">
                Start: {String(shift.startAt)} | End: {String(shift.endAt)}
              </div>

              {progress ? (
                <>
                  <div className="bar">
                    <div className="barFill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="muted">
                    İlerleme: {pct}% (lastReachedOrder: {progress.lastReachedOrder})
                  </div>
                </>
              ) : null}

              {mode === "COMPLETED_FALLBACK" ? <div className="ok">✅ Vardiya tamamlandı. Yeni vardiya bekleniyor.</div> : null}
            </div>
          ) : (
            <div className="muted">Vardiya bulunamadı</div>
          )}
        </div>

        <div className="card">
          <h3>Son Durum</h3>
          <div className="muted">Araç: {data?.vehicle?.plate || "-"}</div>
          <div className="muted">Konum: {data?.last ? `${data.last.lat}, ${data.last.lng}` : "-"}</div>
          <div className="muted">Hız: {data?.last?.speed ?? "-"} km/h</div>
          <div className="muted">GPS Status: {data?.last?.status || "-"}</div>

          <hr />

          <h3>Sonraki Durak</h3>
          {nextStop ? (
            <>
              <div>
                <b>{nextStop.name}</b> (order: {nextStop.order})
              </div>
              <button disabled={busy} onClick={reached}>
                {busy ? "..." : "Reached"}
              </button>
            </>
          ) : (
            <div className="muted">Sonraki durak yok</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Duraklar (mesafeye göre)</h3>
        <table className="tbl">
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
      </div>
    </div>
  );
}
