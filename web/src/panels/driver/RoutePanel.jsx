import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { enqueueRequest, flushQueue, getQueue, isOnline, queueSize } from "../../utils/offlineQueue";
import MapView from "../../components/map/MapView";
import QueueDetailTable from "../../components/QueueDetailTable";
import StopTimeline from "../../components/StopTimeline";
import { useAutoReload } from "../../live/useAutoReload";
import { useSession } from "../../state/session";
import { openNextStopNavigation, openFullRouteNavigation, routeStats, isReachedStop } from "../../utils/navigation";
import { nowIsoTR } from "../../utils/time";

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
  const [toast, setToast] = useState("");
  const [_prevReachedOrder, setPrevReachedOrder] = useState(null);
  const [online, setOnline] = useState(isOnline());
  const [qLen, setQLen] = useState(queueSize());
  const [flushing, setFlushing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const wasOnlineRef = useRef(online);
  const flushBusyRef = useRef(false);
  const loadRef = useRef(null);
  const flushNowRef = useRef(null);
  const busyRef = useRef(false);
  const shiftIdRef = useRef(null);
  const nextStopIdRef = useRef(null);
  const reachedRef = useRef(null);

  const mode = data?.mode || "";
  const shift = data?.shift || null;
  const orderedStops = useMemo(() => data?.orderedStops || data?.routeStops || [], [data?.orderedStops, data?.routeStops]);
  const nextStop = data?.nextStop || null;
  const progress = data?.progress || null;
  const paused = !!progress?.pausedAt;
  const [showStops, setShowStops] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(null);

  const pct = useMemo(() => {
    if (!shift || !progress || !orderedStops.length) return 0;
    const maxOrder = Math.max(...orderedStops.map((s) => s.order || 0), 0) || 1;
    return Math.min(100, Math.round((progress.lastReachedOrder / maxOrder) * 100));
  }, [shift, progress, orderedStops]);

  const routeSummary = useMemo(() => routeStats(orderedStops), [orderedStops]);

  const lastReachedStop = useMemo(() => {
    const ord = Number(progress?.lastReachedOrder || 0);
    if (!ord) return null;
    return orderedStops.find((s) => Number(s.order) === ord) || null;
  }, [orderedStops, progress?.lastReachedOrder]);

  const canUndo = useMemo(() => {
    if (!lastReachedStop?.id) return false;
    const t = lastReachedStop.reachedAt || lastReachedStop.skippedAt;
    if (!t) return true; // backend will enforce window if timestamps are not available
    const ms = Date.now() - new Date(t).getTime();
    return ms <= 120000;
  }, [lastReachedStop?.id, lastReachedStop?.reachedAt, lastReachedStop?.skippedAt]);

  busyRef.current = busy;
  shiftIdRef.current = shift?.id || null;
  nextStopIdRef.current = nextStop?.id || null;

  function focusStop(stop) {
    const lat = Number(stop?.lat);
    const lng = Number(stop?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
  }

  function showToast(msg) {
    if (!msg) return;
    setToast(msg);
    window.clearTimeout(window.__driverToastT);
    window.__driverToastT = window.setTimeout(() => setToast(""), 1800);
  }

  async function safePost(url, body, label) {
    setQLen(queueSize());

    if (!isOnline()) {
      enqueueRequest({ method: 'POST', url, body, label });
      setQLen(queueSize());
      showToast('OFFLINE: Kuyruğa alındı');
      return { queued: true };
    }

    try {
      const r = await api(url, { method: 'POST', body, token });
      setQLen(queueSize());
      return r;
    } catch (e) {
      const s = Number(e?.status || 0);
      // API down (vite proxy 500) veya network error => kuyrukla
      if (!e?.status || s >= 500) {
        enqueueRequest({ method: 'POST', url, body, label });
        setQLen(queueSize());
        showToast(s >= 500 ? 'Sunucu geçici hatası: Kuyruğa alındı' : 'Bağlantı yok: Kuyruğa alındı');
        return { queued: true };
      }
      throw e;
    }
  }

  async function flushNow() {
    if (!isOnline()) return;
    if (flushBusyRef.current) return;
    flushBusyRef.current = true;
    setFlushing(true);
    try {
      const r = await flushQueue({ token, apiFn: api });
      setQLen(queueSize());
      if (r.sent || r.dropped) showToast(`Kuyruk işlendi: +${r.sent} (drop ${r.dropped})`);
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setFlushing(false);
      flushBusyRef.current = false;
    }
  }

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

  useAutoReload("shifts", load, Boolean(token));

  loadRef.current = load;
  flushNowRef.current = flushNow;

  useEffect(() => {
    loadRef.current?.();
    const t = setInterval(() => loadRef.current?.(), 5000);
    return () => clearInterval(t);
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
    flushNowRef.current?.();
  }
}, [online, qLen]);


  // M72.2: PERIODIC FLUSH while online if queue remains (API outage/restart doesn't toggle navigator.onLine)
  useEffect(() => {
    if (!online) return;
    if (qLen <= 0) return;
    const t = setInterval(() => flushNowRef.current?.(), 5000);
    return () => clearInterval(t);
  }, [online, qLen]);



// ğŸ”” toast when progress advances (auto-reached or manual)
useEffect(() => {
  const ord = Number(progress?.lastReachedOrder || 0);
  if (!Number.isFinite(ord)) return;

  setPrevReachedOrder((prev) => {
    if (prev == null) return ord;
    if (ord > prev) showToast("Durak ulaşıldı");
    return ord;
  });
}, [progress?.lastReachedOrder]);

  // ? M31-A: keyboard shortcut (Enter) = reached
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Enter") return;
      if (busyRef.current) return;
      if (!shiftIdRef.current || !nextStopIdRef.current) return;
      reachedRef.current?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function applyOptimisticReached() {
    try {
      const now = nowIsoTR();
      setData((prev) => {
        if (!prev) return prev;

        const ordered = Array.isArray(prev.orderedStops) ? prev.orderedStops : [];
        const prevLast = Number(prev?.progress?.lastReachedOrder || 0) || 0;

        // current stop = nextStop (preferred) or first stop after lastReachedOrder
        const curr =
          prev.nextStop ||
          ordered.find((s) => Number(s?.order || 0) > prevLast) ||
          null;

        if (!curr) return prev;

        // order from curr or list
        const ordFromList = ordered.find((s) => s && s.id === curr.id)?.order;
        const currOrder = Number(curr?.order || ordFromList || 0) || prevLast;
        const newLast = Math.max(prevLast, currOrder);

        const mark = (arr) =>
          Array.isArray(arr)
            ? arr.map((s) =>
                s && s.id === curr.id
                  ? { ...s, reachedAt: s.reachedAt || now }
                  : s
              )
            : arr;

        const next = ordered.find((s) => Number(s?.order || 0) > newLast) || null;

        return {
          ...prev,
          orderedStops: mark(ordered),
          routeStops: mark(prev.routeStops || []),
          progress: { ...(prev.progress || {}), lastReachedOrder: newLast },
          nextStop: next,
        };
      });
    } catch { /* no-op: stop progress update is best effort */ }
  }


  async function reached() {
    if (!shift?.id || !nextStop?.id) return;
    setBusy(true);
    setErr("");
    try {
      const url = `/api/driver/shifts/${shift.id}/stops/${nextStop.id}/reached`;
      const r = await safePost(url, null, 'reached');
      if (r?.queued) {
        // M72.4.1: optimistic local progress while queued (multi-click safe)
        applyOptimisticReached();
        return;
      }

      showToast("Durak ulaşıldı");

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





  reachedRef.current = reached;
async function undoLast() {
  if (!shift?.id || !lastReachedStop?.id) return;
  setBusy(true);
  setErr("");
  try {
    const r = await safePost(`/api/driver/shifts/${shift.id}/stops/${lastReachedStop.id}/undo`, null, 'undo');
    if (r?.queued) return;
    showToast("Geri alındı");
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
      const r = await safePost(`/api/driver/shifts/${shift.id}/start`, null, 'start');
      if (r?.queued) return;
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function pauseShift() {
    if (!shift?.id) return;
    setBusy(true);
    setErr("");
    try {
      const r = await safePost(`/api/driver/shifts/${shift.id}/pause`, null, 'pause');
      if (r?.queued) return;
      showToast('Mola alındı');
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function resumeShift() {
    if (!shift?.id) return;
    setBusy(true);
    setErr("");
    try {
      const r = await safePost(`/api/driver/shifts/${shift.id}/resume`, null, 'resume');
      if (r?.queued) return;
      showToast('Devam ??');
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
      const r = await safePost(`/api/driver/shifts/${shift.id}/complete`, null, 'complete');
      if (r?.queued) return;
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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Bugün Rotam</h3>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            {!online ? (
              <span className="pill" style={{ fontWeight: 900 }} data-status="REJECTED">OFFLINE {qLen ? `(${qLen})` : ""}</span>
            ) : qLen ? (
              <span className="pill" style={{ fontWeight: 900 }} data-status="APPROVED">KUYRUK: {qLen}</span>
            ) : null}
            {qLen ? (
              <button type="button" onClick={() => setShowQueue((p) => !p)} style={{ fontWeight: 900 }}>
                {showQueue ? "Kuyruk Detayını Kapat" : "Kuyruk Detayı"}
              </button>
            ) : null}
            {online && qLen ? (
              <button type="button" disabled={busy || flushing} onClick={flushNow} style={{ fontWeight: 900 }}>
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
        <div className="muted">
          Faz 1/Faz 2: <b>Rota sırası</b> + <b>sıradaki durak</b> + <b>dış navigasyon</b>. (Kısayol: <b>Enter</b>)
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {toast ? (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 12px", borderRadius: 12, background: "#0b1220", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 800 }}>
          {toast}
        </div>
      ) : null}


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
                <b>Shift #{shift.id}</b> •{" "}
                <span className="pill" data-status={shift.status}>
                  {paused ? `${shift.status} (MOLA)` : shift.status}
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
                <div className="ok">• Vardiya tamamlandı. Yeni vardiya bekleniyor.</div>
              ) : null}
            </div>
          ) : (
            <div className="muted">Vardiya bulunamadı.</div>
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
            {shift?.status === "ACTIVE" ? (
              paused ? (
                <button type="button" disabled={busy} onClick={resumeShift} style={{ fontWeight: 900 }}>
                  Devam Et
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={pauseShift} style={{ fontWeight: 900 }}>
                  Molaya Al
                </button>
              )
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

              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className="pill">Toplam: {routeSummary.total}</span>
                <span className="pill" data-status="OK">Tamamlanan: {routeSummary.completed}</span>
                <span className="pill" data-status="REQUESTED">Kalan: {routeSummary.remaining}</span>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => openNextStopNavigation(nextStop, { gpsLast: data?.last })}>Sonraki Durak Navigasyonu</button>
                <button type="button" onClick={() => openFullRouteNavigation(orderedStops, { gpsLast: data?.last })}>Tam Rotayı Dış Navigasyonda Aç</button>
              </div>

              <button type="button" disabled={busy || shift?.status !== "ACTIVE" || paused} onClick={reached} style={reachedBtnStyle}>
                {busy ? "..." : paused ? "Mola (Devam Et)" : shift?.status !== "ACTIVE" ? "Başlat (Göreve Başla)" : "Reached"}
              </button>

              {lastReachedStop ? (
                <button type="button" disabled={busy || !canUndo || paused} onClick={undoLast} style={{ padding: "10px 12px", borderRadius: 12, fontWeight: 800, opacity: canUndo ? 1 : 0.6 }}>
                  Geri Al (2dk)
                </button>
              ) : null}

              <div className="muted">Konum: {data?.last ? `${data.last.lat}, ${data.last.lng}` : "-"}</div>
            </div>
          ) : (
            <div className="muted">Sonraki durak yok (vardiya bitmiş olabilir).</div>
          )}

          <div className="muted" style={{ marginTop: 10 }}>mode: {mode || "-"}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="muted" style={{ marginBottom: 6 }}>Adım adım takip</div>
        <StopTimeline
          stops={orderedStops}
          nextStopId={nextStop?.id ?? null}
          selectedStopId={selectedStopId}
          compact={false}
          onSelect={(s) => { setSelectedStopId(s?.id ?? null); focusStop(s); }}
        />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3>Duraklar (rota sırası / mesafe / ETA)</h3>
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
                <th>Durum</th>
                <th>Km</th>
                <th>ETA (dk)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orderedStops.map((s) => {
                const reachedState = isReachedStop(s);
                const isNext = nextStop?.id != null && String(nextStop.id) === String(s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.order}</td>
                    <td>{s.name}</td>
                    <td>
                      {isNext ? <span className="pill" data-status="NEXT">NEXT</span> : reachedState ? <span className="pill" data-status="OK">OK</span> : <span className="pill" data-status="REQUESTED">BEKLİYOR</span>}
                    </td>
                    <td>{s.remainingKm}</td>
                    <td>{s.etaMin}</td>
                    <td><button type="button" onClick={() => openNextStopNavigation(s, { gpsLast: data?.last })}>Nav</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>
            Detayl? listeyi sadece gerekirse a?.
          </div>
        )}
      </div>
    </div>
  );
}


