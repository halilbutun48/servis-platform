import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { enqueueRequest, flushQueue, getQueue, isOnline, queueSize } from "../../utils/offlineQueue";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
import { boardingChangeRouteRefreshLabel, boardingChangeRouteRefreshNote } from "../shared/boardingChangeUi";

import QueueDetailTable from "../../components/QueueDetailTable";
import CollapsibleSection from "../../components/CollapsibleSection";
import { useAutoReload } from "../../live/useAutoReload";
import { displayStatusLabel } from "../../utils/displayStatus";
import { getGpsAgeText, getGpsReliabilityLabel } from "../../utils/etaSanity";
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

function gpsAgeText(gpsLast) {
  return getGpsAgeText(gpsLast);
}

const EMPTY_ARRAY = [];

export default function DriverTodayPanel() {
  const { token } = useSession();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [online, setOnline] = useState(isOnline());
  const [qLen, setQLen] = useState(queueSize());
  const [flushing, setFlushing] = useState(false);
  const wasOnlineRef = useRef(online);
  const flushBusyRef = useRef(false);
  const loadRef = useRef(null);
  const flushNowRef = useRef(null);

  const active = data?.active || null;
  const today = data?.today || EMPTY_ARRAY;
  const tomorrow = data?.tomorrow || EMPTY_ARRAY;
  const approvedTodayCount = useMemo(
    () => today.filter((s) => ["APPROVED", "ACCEPTED"].includes(String(s?.status || "").toUpperCase())).length,
    [today]
  );
  const selectedShift = active || today[0] || tomorrow[0] || null;
  const selectedVehicle = selectedShift?.vehicle || null;
  const boardingChangeEffects = Array.isArray(selectedShift?.boardingChangeEffects) ? selectedShift.boardingChangeEffects : [];
  const boardingChangeSummary = selectedShift?.boardingChangeSummary || null;
  const routeRefresh = selectedShift?.routeRefresh || null;
  const routeRefreshState = String(routeRefresh?.routeRefreshState || selectedShift?.boardingChangeRouteRefreshState || '').toUpperCase();
  const routeRefreshLabel = routeRefresh?.routeRefreshLabel
    || selectedShift?.boardingChangeRouteRefreshLabel
    || boardingChangeRouteRefreshLabel(routeRefresh || selectedShift || {});
  const routeRefreshNote = routeRefresh?.routeRefreshNote
    || selectedShift?.boardingChangeRouteRefreshNote
    || boardingChangeRouteRefreshNote(routeRefresh || selectedShift || {});
  const hasBoardingChangeVisibility = boardingChangeEffects.length > 0 || (routeRefreshState && routeRefreshState !== "NONE");

  const hasAny = (today?.length || 0) + (tomorrow?.length || 0) > 0;

  const activeLabel = useMemo(() => {
    if (!active && approvedTodayCount > 0) return "Henüz başlatılmış aktif görev yok";
    if (!active) return "Aktif görev yok";
    return `Vardiya #${active.id} - ${displayStatusLabel(active.status)}`;
  }, [active, approvedTodayCount]);

  const activeDescription = useMemo(() => {
    if (active) {
      return `Başlangıç: ${fmt(active.startAt)} - Bitiş: ${fmt(active.endAt)}`;
    }
    if (approvedTodayCount > 0) {
      return `Bugün için ${approvedTodayCount} kabul edilmiş vardiya var. Göreve başlamak için listeden 'Göreve Başla' seç.`;
    }
    return "Bugün için atanmış veya kabul edilmiş vardiya yok.";
  }, [active, approvedTodayCount]);

  const copilotFacts = useMemo(() => buildShiftFacts({
    shift: selectedShift,
    itemCount: today.length + tomorrow.length,
  }), [selectedShift, today.length, tomorrow.length]);

  const copilotSelection = useMemo(() => {
    if (!selectedShift) return null;
    const gpsStateLabel = getGpsReliabilityLabel(selectedVehicle?.gpsState?.lastUiStatus || selectedVehicle?.gpsState?.lastStatus || selectedVehicle?.gpsLast?.status || (selectedShift ? "GPS bekleniyor" : "-"));
    const gpsSourceLabel = selectedVehicle?.gpsState?.lastSource || selectedVehicle?.gpsState?.sourceLabel || selectedVehicle?.gpsLast?.sourceLabel || (selectedVehicle ? "Araç GPS’i" : "GPS bekleniyor");
    const gpsAge = gpsAgeText(selectedVehicle?.gpsLast || selectedShift?.vehicle?.gpsLast || selectedShift?.gpsLast);
    const routeProofText = String(selectedShift?.operationProofStatus || selectedShift?.proofStatus || selectedShift?.serviceProofStatus || selectedShift?.vehicle?.operationProofStatus || selectedShift?.vehicle?.proofStatus || "").trim() || "Belirgin değil";
    return {
      scopeKey: "/driver/today",
      entityType: "shift",
      entityId: Number(selectedShift?.id || 0) || 0,
      label: `Vardiya #${selectedShift?.id || "-"}`,
      summary: [
        `Vardiya #${selectedShift?.id || "-"}`,
        `Durum: ${displayStatusLabel(String(selectedShift?.status || "-").toUpperCase())}`,
        `Araç: ${selectedVehicle?.plate || selectedShift?.vehicle?.plate || "-"}`,
        `Son GPS: ${gpsAge}`,
        `Sıradaki durak: ${selectedShift?.nextStop?.name || selectedShift?.route?.nextStop?.name || selectedShift?.stops?.find?.((s) => !["REACHED", "DONE", "COMPLETED", "SKIPPED"].includes(String(s?.status || s?.state || "").toUpperCase()))?.name || "-"}`,
      ].join(" • "),
      selectedRecordType: "shift",
      selectedRecordId: Number(selectedShift?.id || 0) || 0,
      selectedRecordLabel: `Vardiya #${selectedShift?.id || "-"}`,
      selectedRecordStatus: [
        `Durum: ${displayStatusLabel(String(selectedShift?.status || "-").toUpperCase())}`,
        `Araç: ${selectedVehicle?.plate || selectedShift?.vehicle?.plate || "Yok"}`,
        `Sürücü: ${selectedShift?.driver?.fullName || selectedShift?.driver?.name || "Yok"}`,
        `Durak: ${Array.isArray(selectedShift?.stops) ? selectedShift.stops.length : Number(selectedShift?.stopCount || 0)}`,
        `Son GPS: ${gpsAge}`,
        `GPS durumu: ${gpsStateLabel}`,
        `Kaynak: ${gpsSourceLabel}`,
        `Operasyon kanıtı: ${routeProofText}`,
      ].join(" • "),
      selectedRecordSummary: [
        `Vardiya #${selectedShift?.id || "-"}`,
        displayStatusLabel(String(selectedShift?.status || "-").toUpperCase()),
        selectedVehicle?.plate || selectedShift?.vehicle?.plate || "-",
        `Son GPS ${gpsAge}`,
      ].join(" • "),
      selectedFields: [
        { label: "Vardiya", value: `#${selectedShift?.id || "-"}` },
        { label: "Durum", value: displayStatusLabel(String(selectedShift?.status || "-").toUpperCase()) },
        { label: "Araç", value: selectedVehicle?.plate || selectedShift?.vehicle?.plate || "-" },
        { label: "Sürücü", value: selectedShift?.driver?.fullName || selectedShift?.driver?.name || "-" },
        { label: "Durak", value: String(Array.isArray(selectedShift?.stops) ? selectedShift.stops.length : Number(selectedShift?.stopCount || 0)) },
        { label: "Son GPS", value: gpsAge },
        { label: "GPS durumu", value: gpsStateLabel },
        { label: "Kaynak", value: gpsSourceLabel },
        { label: "Operasyon kanıtı", value: routeProofText },
      ],
      fields: [
        { label: "Vardiya", value: `#${selectedShift?.id || "-"}` },
        { label: "Durum", value: displayStatusLabel(String(selectedShift?.status || "-").toUpperCase()) },
        { label: "Araç", value: selectedVehicle?.plate || selectedShift?.vehicle?.plate || "-" },
        { label: "Sürücü", value: selectedShift?.driver?.fullName || selectedShift?.driver?.name || "-" },
        { label: "Durak", value: String(Array.isArray(selectedShift?.stops) ? selectedShift.stops.length : Number(selectedShift?.stopCount || 0)) },
        { label: "Son GPS", value: gpsAge },
        { label: "GPS durumu", value: gpsStateLabel },
        { label: "Kaynak", value: gpsSourceLabel },
        { label: "Operasyon kanıtı", value: routeProofText },
      ],
      selectedBadges: [
        { label: "Araç GPS’i", value: gpsStateLabel },
        { label: "Sürücünün telefon GPS’i", value: gpsSourceLabel },
      ],
      badges: [
        { label: "Araç GPS’i", value: gpsStateLabel },
        { label: "Sürücünün telefon GPS’i", value: gpsSourceLabel },
      ],
      structuredFacts: {
        ...copilotFacts,
        selectedShiftId: Number(selectedShift?.id || 0) || 0,
        selectedVehiclePlate: selectedVehicle?.plate || selectedShift?.vehicle?.plate || "",
        gpsAge,
        gpsSourceLabel,
        routeProofText,
      },
      facts: copilotFacts,
      uiHints: {
        surface: "driver-today",
      },
    };
  }, [copilotFacts, selectedShift, selectedVehicle]);

  useEffect(() => {
    if (!selectedShift) {
      clearCopilotSelection("/driver/today");
      return undefined;
    }
    setCopilotSelection(copilotSelection);
    return () => clearCopilotSelection("/driver/today");
  }, [copilotSelection, selectedShift]);

  async function load() {
    setErr("");
    try {
      const r = await api("/api/driver/shifts/today", { token });
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
        navigate(`/driver/route?shift=${shiftId}`);
        return;
      }
      try {
        await api(`/api/driver/shifts/${shiftId}/start`, { method: 'POST', token });
      } catch (e2) {
        if (!e2?.status || Number(e2.status) >= 500) {
          enqueueRequest({ method: 'POST', url: `/api/driver/shifts/${shiftId}/start`, body: null, label: 'start' });
          setQLen(queueSize());
          navigate(`/driver/route?shift=${shiftId}`);
          return;
        }
        throw e2;
      }
      navigate(`/driver/route?shift=${shiftId}`);
    } catch (e) {
      // Eğer endpoint yoksa veya yetki yoksa sürücü yine Rota ekranında manuel reached ile başlayabilir.
      setErr(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  function ShiftRow({ s }) {
    const isActive = active && active.id === s.id;
    const routeLockedReason = !isActive && s.status !== "ACTIVE" ? "Rota, görev başladıktan sonra açılır." : "";
    return (
      <tr key={s.id}>
        <td>#{s.id}</td>
        <td>
          <span className="pill" data-status={s.status}>
            {displayStatusLabel(s.status)}
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
          <button
            type="button"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/driver/route?shift=${s.id}`)}
            disabled={!isActive && s.status !== "ACTIVE"}
            title={routeLockedReason || undefined}
            aria-disabled={routeLockedReason ? "true" : undefined}
          >
            Rota
          </button>
          {routeLockedReason ? (
            <div className="panelMeta" style={{ marginTop: 4 }}>
              {routeLockedReason}
            </div>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="card">
        <h3>Bugün</h3>
        <div className="muted">Tek hedef: aktif görevi gör → başlat → rota ekranında ulaşıldı ile ilerle.</div>
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
</div>

{qLen ? (
  <div style={{ marginTop: 10 }}>
    <CollapsibleSection
      title="Kuyruk Detayı"
      subtitle="Offline kuyruktaki bekleyen istekler. Sadece ikinci katmanı aç."
      badge={qLen}
      defaultOpen={false}
      compact
      rightAction={online && qLen ? (
        <button type="button" disabled={flushing} onClick={flushNow} style={{ fontWeight: 900 }}>
          {flushing ? "..." : `Kuyruğu Gönder (${qLen})`}
        </button>
      ) : null}
    >
      <QueueDetailTable
        items={getQueue().map((x) => ({
          ...x,
          type: x.label || x.type || "-",
        }))}
      />
    </CollapsibleSection>
  </div>
) : null}
      </div>
      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Aktif Görev</h3>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <b>{activeLabel}</b>
            <div className="muted">{activeDescription}</div>
          </div>
          {active?.status === "APPROVED" ? (
            <button type="button" disabled={busyId === active.id} onClick={() => startShift(active.id)}>
              {busyId === active.id ? "..." : "Göreve Başla"}
            </button>
          ) : null}
          {active?.status === "ACTIVE" ? (
            <button type="button" onClick={() => navigate(`/driver/route?shift=${active.id}`)}>Rota'ya Git</button>
          ) : null}
        </div>
      </div>

      {hasBoardingChangeVisibility ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Günlük Biniş Değişiklikleri</div>
              <div className="muted">Bu sadece günlük atama etkisidir. Kalıcı rota değişmez.</div>
            </div>
            {routeRefreshLabel ? (
              <span className="pill" data-status={routeRefreshState || "REQUESTED"}>
                {routeRefreshLabel}
              </span>
            ) : null}
          </div>

          {boardingChangeSummary?.label ? (
            <div style={{ marginTop: 10, fontWeight: 800 }}>{boardingChangeSummary.label}</div>
          ) : null}

          {routeRefreshNote ? (
            <div className="muted" style={{ marginTop: 4 }}>{routeRefreshNote}</div>
          ) : null}

          {boardingChangeEffects.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {boardingChangeEffects.map((effect, index) => {
                const effectLabel = effect?.effectLabel || effect?.changeTypeLabel || "Günlük değişiklik";
                const personLabel = effect?.personLabel || effect?.personName || "Seçili kişi";
                const oldStop = effect?.oldStopLabel || "-";
                const newStop = effect?.newStopLabel || "-";
                const effectRouteRefreshLabel = effect?.routeRefreshLabel || routeRefreshLabel;
                const effectRouteRefreshNote = effect?.routeRefreshNote || routeRefreshNote;
                return (
                  <div key={`${String(effect?.changeType || effect?.changeTypeLabel || effect?.personId || index)}-${index}`} style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontWeight: 800 }}>{effectLabel}</div>
                    <div className="muted" style={{ marginTop: 2 }}>
                      {personLabel}
                      {" "}
                      •
                      {" "}
                      {oldStop}
                      {" → "}
                      {newStop}
                    </div>
                    {effectRouteRefreshLabel ? <div className="panelMeta" style={{ marginTop: 4 }}>{effectRouteRefreshLabel}</div> : null}
                    {effectRouteRefreshNote ? <div className="panelMeta" style={{ marginTop: 4 }}>{effectRouteRefreshNote}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

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
                  <th>Durum</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>{today.map((s) => <ShiftRow key={s.id} s={s} />)}</tbody>
            </table>
          </div>

          {tomorrow?.length ? (
            <div style={{ marginTop: 12 }}>
              <CollapsibleSection
                title="Yarın"
                subtitle="Yarındaki vardiyalar bilgi amaçlıdır; başlayınca otomatik aktif olur."
                badge={tomorrow.length}
                defaultOpen={false}
                compact
              >
                <div className="card" style={{ overflowX: "auto" }}>
                  <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Durum</th>
                        <th>Başlangıç</th>
                        <th>Bitiş</th>
                        <th>Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>{tomorrow.map((s) => <ShiftRow key={s.id} s={s} />)}</tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}


