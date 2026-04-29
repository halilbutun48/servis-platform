import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

function Card({ title, children, wide = false }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        flex: wide ? "1 1 420px" : "1 1 280px",
        minWidth: 0,
      }}
    >
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function fmtTR(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function gpsScoreText(summary) {
  const score = summary?.gpsReliability?.score;
  if (typeof score === "number") return String(score);
  return "Henüz skor yok";
}

function liveStatusText(summary) {
  const status = String(summary?.status || "").toUpperCase();
  if (status === "SCAFFOLD") return "Hazırlık";
  if (!status) return "Henüz canlı veri yok";
  return status;
}

function formatMaybeNumber(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

export default function ObservabilityPanel() {
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [queueProof, setQueueProof] = useState(null);
  const [err, setErr] = useState("");
  const [queueErr, setQueueErr] = useState("");
  const [queueBusyKey, setQueueBusyKey] = useState("");
  const [queueSyncBusy, setQueueSyncBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const proof = await api("/api/admin/queues/auto-reached/proof");
      setQueueProof(proof || null);
      setQueueErr("");
    } catch (e) {
      setQueueProof(null);
      setQueueErr(e?.message || String(e));
    }
  }, []);

  const load = useCallback(async () => {
    setErr("");
    try {
      const [m, s, types, recent] = await Promise.all([
        api("/api/observability/manifest"),
        api("/api/observability/health-summary"),
        api("/api/observability/event-types"),
        api("/api/observability/recent-events").catch(() => ({ items: [] })),
      ]);
      setManifest(m || null);
      setSummary(s || null);
      setEventTypes(Array.isArray(types?.items) ? types.items : []);
      setRecentEvents(Array.isArray(recent?.items) ? recent.items : []);
    } catch (e) {
      setErr(e?.message || String(e));
    }
    await loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s, types, recent] = await Promise.all([
          api("/api/observability/manifest"),
          api("/api/observability/health-summary"),
          api("/api/observability/event-types"),
          api("/api/observability/recent-events").catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setSummary(s || null);
        setEventTypes(Array.isArray(types?.items) ? types.items : []);
        setRecentEvents(Array.isArray(recent?.items) ? recent.items : []);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    (async () => {
      await loadQueue();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadQueue]);

  const widgets = Array.isArray(manifest?.widgets) ? manifest.widgets : [];
  const activeWidgets = widgets.filter((item) => ["mobileHealth", "deviceHealth", "gpsReliability"].includes(item.key));
  const roadmapWidgets = widgets.filter((item) => ["issueInbox", "shiftTimeline"].includes(item.key));
  const queueHealth = queueProof?.health || null;
  const queueThreshold = queueProof?.threshold || null;
  const queueIncident = queueProof?.incident || null;
  const queueDeadLetter = queueProof?.deadLetter || null;
  const queueStats = queueHealth?.queue || {};
  const queueWarnings = Array.isArray(queueThreshold?.warnings) ? queueThreshold.warnings : [];
  const queueNotes = Array.isArray(queueHealth?.notes) ? queueHealth.notes : [];
  const queueItems = Array.isArray(queueDeadLetter?.items) ? queueDeadLetter.items : [];

  useEffect(() => {
    const firstEvent = recentEvents[0] || null;
    const score = typeof summary?.gpsReliability?.score === 'number' ? Number(summary.gpsReliability.score) : null;
    const queueDepth = Number(queueStats.queueDepth || 0);
    const deadLetterDepth = Number(queueStats.deadLetterDepth || 0);
    if (!manifest && !summary && !recentEvents.length && !eventTypes.length) {
      clearCopilotSelection('/superadmin/observability');
      return;
    }
    const facts = {
      screenType: 'OBSERVABILITY',
      stage: String(summary?.status || '').toUpperCase() || 'SCAFFOLD',
      readiness: /OK|LIVE|HEALTHY/.test(String(summary?.status || '').toUpperCase()) && (!summary?.deviceHealth?.risk || String(summary?.deviceHealth?.risk) === 'unknown') ? 'READY' : 'REVIEW_NEEDED',
      readinessScore: score != null ? Math.max(24, Math.min(95, Math.round(score))) : 42,
      blockers: [
        ...(summary?.deviceHealth?.risk && String(summary.deviceHealth.risk) !== 'unknown' ? [`Cihaz sağlık riski: ${summary.deviceHealth.risk}`] : []),
        ...((score != null && score < 60) ? ['GPS güven skoru düşük görünüyor.'] : []),
      ],
      counters: { eventTypes: eventTypes.length, recentEvents: recentEvents.length, gpsScore: score != null ? score : '-' },
      roadmapCounters: { activeWidgets: activeWidgets.length, roadmapWidgets: roadmapWidgets.length, queueDepth, deadLetterDepth },
      evidence: [
        `Canlı durum: ${liveStatusText(summary)}`,
        `GPS skor: ${gpsScoreText(summary)}`,
        `Queue: ${queueThreshold?.status || "BELİRSİZ"} / ${formatMaybeNumber(queueStats.queueDepth)}`,
        `Alarm: ${queueIncident?.severity || "BELİRSİZ"} / ${queueIncident?.title || "-"}`,
        `Son canlı olay: ${firstEvent?.label || firstEvent?.type || '-'}`,
      ],
      reasoningLead: 'Bu ekranda amaç canlı sağlık, GPS güveni ve son olayları aynı yerde okumaktır.',
      nextBestAction: firstEvent
        ? 'Önce son canlı olayın önemini ve zamanını oku. Sonra cihaz sağlık ve queue notlarıyla birlikte değerlendir.'
        : 'Önce canlı durum, GPS güven notu ve queue eşiklerini oku. Sonra event type ve dead-letter satırlarına in.',
      safestNextStep: 'En risksiz adım, canlı durum, GPS skoru ve queue threshold bilgisini aynı anda okuyup sonra ayrıntıya inmektir.',
      compareHint: 'Canlı durum ile GPS güven skoru aynı şey değildir; biri saha akışını, diğeri veri kalitesini özetler. Queue ise operasyon dayanıklılığını gösterir.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/observability',
      entityType: 'screen',
      entityId: 6107,
      label: firstEvent?.label || 'Canlı sağlık ve queue özeti',
      summary: [liveStatusText(summary), gpsScoreText(summary), queueThreshold?.status || null, firstEvent?.severity || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Canlı Durum', value: liveStatusText(summary), help: 'Saha akışının genel canlılık durumunu gösterir.' },
        { label: 'GPS Skoru', value: gpsScoreText(summary), help: 'GPS güven katmanının skorunu gösterir.' },
        { label: 'Cihaz Riski', value: summary?.deviceHealth?.risk || '-', help: 'Cihaz sağlığı tarafında görünen risk özetini gösterir.' },
        { label: 'Son Sync', value: summary?.deviceHealth?.lastSyncAt || '-', help: 'Son senkron zamanını gösterir.' },
        { label: 'Son GPS', value: summary?.deviceHealth?.lastGpsAt || '-', help: 'Son GPS zamanını gösterir.' },
        { label: 'Son Olay', value: firstEvent?.label || firstEvent?.type || '-', help: 'En son canlı olay başlığını gösterir.' },
        { label: 'Queue Durum', value: queueThreshold?.status || '-', help: 'Auto-reached queue dayanıklılık kontrolünün son durumunu gösterir.' },
        { label: 'Queue Alarm', value: queueIncident?.severity || '-', help: 'Queue alarm seviyesini gösterir.' },
        { label: 'Dead-letter', value: formatMaybeNumber(queueStats.deadLetterDepth), help: 'Kuyrukta bekleyen dead-letter sayısını gösterir.' },
      ],
      badges: [
        { label: 'Önem', value: firstEvent?.severity || '-', help: 'Son canlı olayın önem seviyesini gösterir.' },
        { label: 'Queue', value: queueThreshold?.status || '-', help: 'Queue threshold değerlendirme sonucunu gösterir.' },
        { label: 'Alarm', value: queueIncident?.severity || '-', help: 'Operasyon alarm seviyesini gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/observability');
  }, [manifest, summary, eventTypes, recentEvents, activeWidgets.length, roadmapWidgets.length, queueThreshold, queueIncident, queueStats.queueDepth, queueStats.deadLetterDepth]);

  const gpsNotes = useMemo(() => {
    const raw = Array.isArray(summary?.gpsReliability?.notes) ? summary.gpsReliability.notes : [];
    return raw.length ? raw : ["Canlı GPS güven notu henüz oluşmadı."];
  }, [summary]);

  const openDeadLetterCount = queueItems.filter((item) => item?.ok !== false).length;
  const queueHealthLabel = queueThreshold?.status || (queueProof?.ok ? "OK" : "Bilinmiyor");
  const queueIncidentTitle = queueIncident?.title || "Queue alarmı yok";

  const runDeadLetterAction = useCallback(async (taskId, action) => {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) return;
    setQueueBusyKey(`${normalizedTaskId}:${action}`);
    setQueueErr("");
    try {
      await api(`/api/admin/queues/auto-reached/dead-letter/${encodeURIComponent(normalizedTaskId)}/${action}`, { method: "POST" });
      await loadQueue();
    } catch (e) {
      setQueueErr(e?.message || String(e));
    } finally {
      setQueueBusyKey("");
    }
  }, [loadQueue]);

  const syncQueueIncident = useCallback(async () => {
    setQueueSyncBusy(true);
    setQueueErr("");
    try {
      await api("/api/admin/queues/auto-reached/incident-sync", { method: "POST" });
      await loadQueue();
    } catch (e) {
      setQueueErr(e?.message || String(e));
    } finally {
      setQueueSyncBusy(false);
    }
  }, [loadQueue]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Canlı Sağlık ve Risk Özeti</div>
          <div className="panelSubtitle" style={{ marginTop: 6 }}>
            Sahadaki cihaz, yayın ve canlılık durumunu tek ekranda özetler.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <PanelKvkkHint panelKey="observability" />

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Aktif operasyon</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Canlı durum">
          <div className="panelStatValue">{liveStatusText(summary)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Kaynak: sürücünün telefon GPS'i</div>
        </Card>
        <Card title="GPS güven skoru">
          <div className="panelStatValue">{gpsScoreText(summary)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>{summary?.gpsReliability?.label || "GPS güven özeti"}</div>
          <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
            {gpsNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </Card>
        <Card title="Cihaz sağlık özeti">
          <div>Risk: {summary?.deviceHealth?.risk && summary.deviceHealth.risk !== "unknown" ? summary.deviceHealth.risk : "Henüz risk yok"}</div>
          <div style={{ marginTop: 6 }}>Son sync: {summary?.deviceHealth?.lastSyncAt || "Henüz veri yok"}</div>
          <div style={{ marginTop: 6 }}>Son GPS: {summary?.deviceHealth?.lastGpsAt || "Henüz veri yok"}</div>
        </Card>
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Auto-reached queue</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Queue proof" wide>
          {queueErr ? <div style={{ marginBottom: 8, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{queueErr}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button className="btn" disabled={queueSyncBusy} onClick={syncQueueIncident}>
              {queueSyncBusy ? "Alarm eşitleniyor..." : "Alarmı eşitle"}
            </button>
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <div className="panelMeta">Durum</div>
              <div className="panelSectionTitle">{queueHealthLabel}</div>
            </div>
            <div>
              <div className="panelMeta">Queue depth</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.queueDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">Processing</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.processingDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">Claims</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.claimsDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">Dead-letter</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.deadLetterDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">En eski claim</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.oldestClaimAgeMs)} ms</div>
            </div>
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            {queueHealth?.redisConnected === false ? "Redis bağlı değil." : "Redis erişilebilir."}
            {" "}• Reclaim sweep: {formatMaybeNumber(queueHealth?.config?.reclaimSweepMs)} ms
            {" "}• Max attempts: {formatMaybeNumber(queueHealth?.config?.maxAttempts)}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Başlangıç: {fmtTR(queueHealth?.capturedAt)} • Worker PID: {queueHealth?.runtime?.workerPid || "-"}
          </div>
          <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 }}>
            <div className="panelSectionTitle">Queue alarm</div>
            <div className="panelBody" style={{ marginTop: 6 }}>{queueIncidentTitle}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Seviye: {queueIncident?.severity || "OK"}</div>
            <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
              {(Array.isArray(queueIncident?.recommendedActions) ? queueIncident.recommendedActions : ["Queue sağlıklı; alarm aksiyonu yok."]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <div className="panelMeta" style={{ marginTop: 10 }}>Chaos proof</div>
            <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
              {(Array.isArray(queueIncident?.chaosDrills) ? queueIncident.chaosDrills : ["Redis down/up", "Worker restart", "Poison job"]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(queueWarnings.length ? queueWarnings : queueNotes).map((item, idx) => (
              <span key={idx} className="pill" data-status="WARN">
                {item?.message || item}
              </span>
            ))}
            {!queueWarnings.length && !queueNotes.length ? <span className="pill" data-status="OK">Eşik yok</span> : null}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title={`Dead-letter (${openDeadLetterCount})`} wide>
          {!queueItems.length ? (
            <div className="panelMeta">Henüz dead-letter yok.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {queueItems.map((item, idx) => {
                const parsed = item?.parsed || {};
                const taskId = String(parsed?.queueTaskId || parsed?.taskId || parsed?.id || "").trim();
                const canAct = !!taskId && item?.ok !== false;
                const busyRequeue = queueBusyKey === `${taskId}:requeue`;
                const busyResolve = queueBusyKey === `${taskId}:resolve`;
                return (
                  <div key={`${taskId || "dead"}-${idx}`} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div className="panelSectionTitle">{taskId ? `Task ${taskId}` : "Parse edilemeyen kayıt"}</div>
                        <div className="panelMeta">
                          Neden: {parsed?.deadLetterReason || item?.parseError || "Bilinmiyor"}
                        </div>
                      </div>
                      <div className="panelMeta" style={{ whiteSpace: "nowrap" }}>
                        {fmtTR(parsed?.deadLetteredAtIso || parsed?.queuedAtIso || null)}
                      </div>
                    </div>
                    <div className="panelMeta" style={{ marginTop: 6 }}>
                      Attempts: {formatMaybeNumber(parsed?.attemptCount)} • Requeue reason: {parsed?.lastRequeueReason || "-"}
                    </div>
                    {!item?.ok ? (
                      <div className="panelMeta" style={{ marginTop: 6, color: "#ff7b7b" }}>
                        Raw parse error: {item?.parseError || "-"}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button
                        className="btn"
                        disabled={!canAct || busyResolve || busyRequeue}
                        onClick={() => runDeadLetterAction(taskId, "requeue")}
                      >
                        {busyRequeue ? "Yeniden kuyruğa alınıyor..." : "Yeniden kuyruğa al"}
                      </button>
                      <button
                        className="btn"
                        disabled={!canAct || busyResolve || busyRequeue}
                        onClick={() => runDeadLetterAction(taskId, "resolve")}
                      >
                        {busyResolve ? "Çözülüyor..." : "Çözülmüş işaretle"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Son canlı olaylar" wide>
          {!recentEvents.length ? (
            <div className="panelMeta">Henüz canlı olay yok.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {recentEvents.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <div>
                    <div className="panelSectionTitle">{item.label || item.type}</div>
                    <div className="panelMeta">Önem: {item.severity || "INFO"}</div>
                  </div>
                  <div className="panelMeta" style={{ whiteSpace: "nowrap" }}>{fmtTR(item.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="İzlenen olay türleri">
          {!eventTypes.length ? (
            <div className="panelMeta">Henüz olay türü tanımı yok.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }} className="panelMeta">
              {eventTypes.slice(0, 10).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="panelSectionTitle" style={{ marginTop: 18 }}>Gelecek faz</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Planlı yüzeyler">
          <div className="panelBody">{roadmapWidgets.length ? roadmapWidgets.map((item) => item.label).join(" • ") : "Planlı yüzey yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Aktif yüzey: {activeWidgets.length} • Gelecek faz: {roadmapWidgets.length}
          </div>
        </Card>
        <Card title="Kapsam notu">
          <div className="panelBody">{manifest?.title || "Gözlemleme + saha teşhis"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {manifest?.scope?.room ? "Oda ve Süper Yönetici için canlı yüzey" : "Kapsam bilgisi bekleniyor."}
          </div>
        </Card>
      </div>
    </div>
  );
}
