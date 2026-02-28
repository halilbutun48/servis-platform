import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

function fmt(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dt);
  }
}

export default function DriverTodayPanel() {
  const { token } = useSession();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const active = data?.active || null;
  const today = data?.today || [];
  const tomorrow = data?.tomorrow || [];

  const hasAny = (today?.length || 0) + (tomorrow?.length || 0) > 0;

  const activeLabel = useMemo(() => {
    if (!active) return "Aktif görev yok";
    return `Shift #${active.id} — ${active.status}`;
  }, [active]);

  async function load() {
    setErr("");
    try {
      const r = await api("/api/driver/shifts/today", { token });
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

  async function startShift(shiftId) {
    setBusyId(shiftId);
    setErr("");
    try {
      await api(`/api/driver/shifts/${shiftId}/start`, { method: "POST", token });
      navigate("/driver/route");
    } catch (e) {
      // Eğer endpoint yoksa veya yetki yoksa sürücü yine Rota ekranında manuel reached ile başlayabilir.
      setErr(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  function ShiftRow({ s }) {
    const isActive = active && active.id === s.id;
    return (
      <tr key={s.id}>
        <td>#{s.id}</td>
        <td>
          <span className="pill" data-status={s.status}>
            {s.status}
          </span>
        </td>
        <td>{fmt(s.startAt)}</td>
        <td>{fmt(s.endAt)}</td>
        <td style={{ whiteSpace: "nowrap" }}>
          {s.status === "APPROVED" ? (
            <button type="button" disabled={busyId === s.id} onClick={() => startShift(s.id)}>
              {busyId === s.id ? "..." : "Göreve Başla"}
            </button>
          ) : null}
          <button type="button" style={{ marginLeft: 8 }} onClick={() => navigate("/driver/route")}
            disabled={!isActive && s.status !== "ACTIVE"}>
            Rota
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="card">
        <h3>Bugün</h3>
        <div className="muted">Tek hedef: aktif görevi gör → başlat → rota ekranında reached ile ilerle.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Aktif Görev</h3>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <b>{activeLabel}</b>
            {active ? (
              <div className="muted">Start: {fmt(active.startAt)} • End: {fmt(active.endAt)}</div>
            ) : (
              <div className="muted">Bugün için atanmış ACTIVE/APPROVED vardiya yok.</div>
            )}
          </div>
          {active?.status === "APPROVED" ? (
            <button type="button" disabled={busyId === active.id} onClick={() => startShift(active.id)}>
              {busyId === active.id ? "..." : "Göreve Başla"}
            </button>
          ) : null}
          {active?.status === "ACTIVE" ? (
            <button type="button" onClick={() => navigate("/driver/route")}>Rota'ya Git</button>
          ) : null}
        </div>
      </div>

      {!hasAny ? (
        <div className="card muted">Bugün/yarın için vardiya bulunamadı.</div>
      ) : (
        <>
          <div className="card" style={{ overflowX: "auto" }}>
            <h3>Bugün Vardiyalar</h3>
            <table className="tbl" style={{ whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>{today.map((s) => <ShiftRow key={s.id} s={s} />)}</tbody>
            </table>
          </div>

          {tomorrow?.length ? (
            <div className="card" style={{ overflowX: "auto" }}>
              <h3>Yarın</h3>
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>{tomorrow.map((s) => <ShiftRow key={s.id} s={s} />)}</tbody>
              </table>
              <div className="muted" style={{ marginTop: 8 }}>
                Not: Yarınki vardiyalar şimdilik sadece bilgi amaçlıdır; başlayınca otomatik ACTIVE olur.
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
