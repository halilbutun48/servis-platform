import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { enqueueRequest, flushQueue, getQueue, isOnline, queueSize } from "../../utils/offlineQueue";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

import QueueDetailTable from "../../components/QueueDetailTable";
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
  const [online, setOnline] = useState(isOnline());
  const [qLen, setQLen] = useState(queueSize());
  const [flushing, setFlushing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const wasOnlineRef = useRef(online);
  const flushBusyRef = useRef(false);

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

  // M72: online/offline watcher
  useEffect(() => {
    function on() {
      setOnline(isOnline());
      setQLen(queueSize());
    }
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    on();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

// M72.1: AUTO-FLUSH when offline -> online (no button needed)
useEffect(() => {
  const was = wasOnlineRef.current;
  wasOnlineRef.current = online;
  if (!was && online && qLen > 0) {
    flushNow();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [online]);


  // M72.2: PERIODIC FLUSH while online if queue remains (API outage/restart doesn't toggle navigator.onLine)
  useEffect(() => {
    if (!online) return;
    if (qLen <= 0) return;
    const t = setInterval(() => flushNow(), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, qLen]);


  async function flushNow() {
    if (!isOnline()) return;
    if (flushBusyRef.current) return;
    flushBusyRef.current = true;
    setFlushing(true);
    try {
      await flushQueue({ token, apiFn: api });
      setQLen(queueSize());
      await load();
    } finally {
      setFlushing(false);
      flushBusyRef.current = false;
    }
  }

  async function startShift(shiftId) {
    setBusyId(shiftId);
    setErr("");
    try {
      if (!isOnline()) {
        enqueueRequest({ method: 'POST', url: `/api/driver/shifts/${shiftId}/start`, body: null, label: 'start' });
        setQLen(queueSize());
        // route ekranında da offline queue var
        navigate('/driver/route');
        return;
      }
      try {
        await api(`/api/driver/shifts/${shiftId}/start`, { method: 'POST', token });
      } catch (e2) {
        if (!e2?.status || Number(e2.status) >= 500) {
          enqueueRequest({ method: 'POST', url: `/api/driver/shifts/${shiftId}/start`, body: null, label: 'start' });
          setQLen(queueSize());
          navigate('/driver/route');
          return;
        }
        throw e2;
      }
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
<div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
  <div className="row" style={{ gap: 8, alignItems: "center" }}>
    {!online ? (
      <span className="pill" style={{ fontWeight: 900 }} data-status="REJECTED">
        OFFLINE {qLen ? `(${qLen})` : ""}
      </span>
    ) : qLen ? (
      <span className="pill" style={{ fontWeight: 900 }} data-status="APPROVED">
        KUYRUK: {qLen}
      </span>
    ) : null}
  </div>

  <div className="row" style={{ gap: 8, alignItems: "center" }}>
    {qLen ? (
      <button type="button" onClick={() => setShowQueue((p) => !p)} style={{ fontWeight: 900 }}>
        {showQueue ? "Kuyruk Detayı Kapat" : "Kuyruk Detayı"}
      </button>
    ) : null}

    {online && qLen ? (
      <button type="button" disabled={flushing} onClick={flushNow} style={{ fontWeight: 900 }}>
        {flushing ? "..." : `Kuyruğu Gönder (${qLen})`}
      </button>
    ) : null}
  </div>
</div>

{showQueue ? (
  <div className="card" style={{ marginTop: 10 }}>
    <QueueDetailTable
      items={getQueue().map((x) => ({
        ...x,
        type: x.label || x.type || "-",
      }))}
    />
  </div>
) : null}
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


