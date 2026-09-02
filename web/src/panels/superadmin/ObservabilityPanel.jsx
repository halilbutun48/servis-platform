import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

const LOGIN_EVENT_TYPES = new Set([
  "AUTH_LOGIN_OK",
  "AUTH_LOGIN_FAIL",
  "AUTH_LOGIN_DISABLED",
  "AUTH_LOGIN_DEVICE_REQUIRED",
  "AUTH_LOGIN_DEVICE_MISMATCH",
  "AUTH_DRIVER_PIN_LOCKED",
]);

function Card({ title, children, wide = false }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        flex: wide ? "1 1 420px" : "1 1 280px",
        minWidth: 0,
      }}
    >
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricTile({ title, value, help, tone = "normal" }) {
  const borderColor =
    tone === "warn"
      ? "rgba(255, 176, 123, 0.34)"
      : tone === "danger"
        ? "rgba(255, 123, 123, 0.34)"
        : "rgba(255,255,255,0.08)";
  const background =
    tone === "warn"
      ? "rgba(255, 176, 123, 0.08)"
      : tone === "danger"
        ? "rgba(255, 123, 123, 0.08)"
        : "rgba(255,255,255,0.03)";

  return (
    <div
      style={{
        padding: 14,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        background,
        flex: "1 1 190px",
        minWidth: 0,
      }}
    >
      <div className="panelMeta">{title}</div>
      <div className="panelStatValue" style={{ marginTop: 6, wordBreak: "break-word" }}>
        {value}
      </div>
      {help ? (
        <div className="panelMeta" style={{ marginTop: 6 }}>
          {help}
        </div>
      ) : null}
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

function fmtCount(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "0";
}

function gpsScoreText(summary) {
  const score = summary?.gpsReliability?.score;
  if (typeof score === "number") return String(score);
  return "Henüz skor yok";
}

function technicalStateLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  const labels = {
    OK: "Uygun",
    LIVE: "Canlı",
    HEALTHY: "Sağlıklı",
    WARN: "Uyarı",
    WARNING: "Uyarı",
    CRITICAL: "Kritik",
    ERROR: "Hata",
    SCAFFOLD: "Hazırlık",
    UNKNOWN: "Belirsiz",
    READY: "Hazır",
  };
  return labels[key] || (key ? "Kontrol gerekli" : "-");
}

function readableAdminText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/M\d+|internal|debug|raw|payload/i.test(text)) return "Sistem kanıtı hazır";
  return text
    .replace(/summary[- ]first/gi, "öncelikli özet")
    .replace(/telemetry/gi, "konum verisi")
    .replace(/dead[- ]letter/gi, "işlenemeyen kuyruk kaydı")
    .replace(/queue/gi, "kuyruk")
    .replace(/event type/gi, "olay türü")
    .replace(/\bGPS\b/gi, "konum sinyali")
    .replace(/\bSync\b/gi, "Senkron")
    .replace(/\bIncident\b/gi, "Alarm")
    .replace(/\bThreshold\b/gi, "Eşik")
    .replace(/\bLogin\b/gi, "Giriş")
    .replace(/\bprovider\b/gi, "veri sağlayıcısı");
}

function eventTypeLabel(value) {
  const key = String(value || "").trim();
  const labels = {
    AUTH_LOGIN_OK: "Giriş başarılı",
    AUTH_LOGIN_FAIL: "Giriş başarısız",
    AUTH_LOGIN_DEVICE_MISMATCH: "Girişte cihaz uyuşmazlığı",
    AUTH_LOGIN_DEVICE_REQUIRED: "Girişte cihaz doğrulaması gerekli",
    AUTH_LOGIN_DISABLED: "Devre dışı hesapla giriş denemesi",
    AUTH_DRIVER_PIN_LOCKED: "Sürücü PIN'i kilitlendi",
  };
  return labels[key] || (key ? readableAdminText(key.replace(/_/g, " ")) : "Olay");
}

function liveStatusText(summary) {
  const status = String(summary?.status || "").toUpperCase();
  if (status === "SCAFFOLD") return "Hazırlık";
  if (!status) return "Henüz canlı veri yok";
  return technicalStateLabel(status);
}

function formatMaybeNumber(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

function proofStateText(value) {
  return value ? "Hazır" : "-";
}

function queueStatusText(queueThreshold, queueIncident) {
  const thresholdStatus = String(queueThreshold?.status || "").toUpperCase();
  const incidentSeverity = String(queueIncident?.severity || "").toUpperCase();
  if (incidentSeverity && incidentSeverity !== "OK") return `Alarm ${technicalStateLabel(incidentSeverity)}`;
  if (thresholdStatus && thresholdStatus !== "OK") return `Eşik ${technicalStateLabel(thresholdStatus)}`;
  return "Uygun";
}

function getCriticalSignals({ summary, queueThreshold, queueIncident, queueStats }) {
  const deviceRisk = String(summary?.deviceHealth?.risk || "").toLowerCase();
  const thresholdStatus = String(queueThreshold?.status || "").toUpperCase();
  const incidentSeverity = String(queueIncident?.severity || "").toUpperCase();
  const deadLetterDepth = Number(queueStats?.deadLetterDepth || 0);

  return [
    thresholdStatus && thresholdStatus !== "OK" ? `Kuyruk eşiği ${technicalStateLabel(queueThreshold?.status || thresholdStatus)}` : null,
    incidentSeverity && incidentSeverity !== "OK" ? `Alarm seviyesi ${technicalStateLabel(queueIncident?.severity || incidentSeverity)}` : null,
    deviceRisk && deviceRisk !== "unknown" ? `Cihaz riski ${readableAdminText(summary?.deviceHealth?.risk || deviceRisk)}` : null,
    deadLetterDepth > 0 ? `İşlenemeyen kuyruk kaydı: ${deadLetterDepth}` : null,
  ].filter(Boolean);
}

function renderChipRow(items) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className="pill" data-status="WARN">
          {item}
        </span>
      ))}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState("summary");

  const fetchCoreData = useCallback(async () => {
    const [m, s, types, recent] = await Promise.all([
      api("/api/observability/manifest"),
      api("/api/observability/health-summary"),
      api("/api/observability/event-types"),
      api("/api/observability/recent-events").catch(() => ({ items: [] })),
    ]);

    return {
      manifest: m || null,
      summary: s || null,
      eventTypes: Array.isArray(types?.items) ? types.items : [],
      recentEvents: Array.isArray(recent?.items) ? recent.items : [],
    };
  }, []);

  const fetchQueueProof = useCallback(async () => {
    return api("/api/admin/queues/auto-reached/proof");
  }, []);

  const applyCoreData = useCallback((payload) => {
    setManifest(payload?.manifest || null);
    setSummary(payload?.summary || null);
    setEventTypes(Array.isArray(payload?.eventTypes) ? payload.eventTypes : []);
    setRecentEvents(Array.isArray(payload?.recentEvents) ? payload.recentEvents : []);
  }, []);

  const bootstrap = useCallback(
    async ({ isCancelled = () => false } = {}) => {
      setErr("");
      try {
        const core = await fetchCoreData();
        if (isCancelled()) return;
        applyCoreData(core);
      } catch (e) {
        if (isCancelled()) return;
        setErr(e?.message || String(e));
      }

      try {
        const proof = await fetchQueueProof();
        if (isCancelled()) return;
        setQueueProof(proof || null);
        setQueueErr("");
      } catch (e) {
        if (isCancelled()) return;
        setQueueProof(null);
        setQueueErr(e?.message || String(e));
      }
    },
    [applyCoreData, fetchCoreData, fetchQueueProof],
  );

  useEffect(() => {
    let cancelled = false;
    void bootstrap({ isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  const widgets = Array.isArray(manifest?.widgets) ? manifest.widgets : [];
  const activeWidgets = widgets.filter((item) => ["mobileHealth", "deviceHealth", "gpsReliability"].includes(item.key));
  const roadmapWidgets = widgets.filter((item) => ["issueInbox", "shiftTimeline"].includes(item.key));
  const queueHealth = queueProof?.health || null;
  const queueThreshold = queueProof?.threshold || null;
  const queueIncident = queueProof?.incident || null;
  const queueDeadLetter = queueProof?.deadLetter || null;
  const queueAlarm = queueProof?.alarm || null;
  const queueStats = queueHealth?.queue || {};
  const queueRuntime = queueHealth?.runtime || {};
  const queueWarnings = Array.isArray(queueThreshold?.warnings) ? queueThreshold.warnings : [];
  const queueNotes = Array.isArray(queueHealth?.notes) ? queueHealth.notes : [];
  const queueItems = Array.isArray(queueDeadLetter?.items) ? queueDeadLetter.items : [];
  const recentEvent = recentEvents[0] || null;
  const gpsNotes = useMemo(() => {
    const raw = Array.isArray(summary?.gpsReliability?.notes) ? summary.gpsReliability.notes : [];
    return raw.length ? raw.map(readableAdminText) : ["Canlı konum sinyali güven notu henüz oluşmadı."];
  }, [summary]);
  const loginAuditCount = useMemo(
    () => recentEvents.filter((item) => LOGIN_EVENT_TYPES.has(String(item?.type || ""))).length,
    [recentEvents],
  );
  const criticalSignals = getCriticalSignals({ summary, queueThreshold, queueIncident, queueStats });
  const hasCriticalSignals = criticalSignals.length > 0;
  const qaEntryCount = recentEvents.length;
  const openIssueCount = criticalSignals.length;

  useEffect(() => {
    const firstEvent = recentEvent || null;
    const score = typeof summary?.gpsReliability?.score === "number" ? Number(summary.gpsReliability.score) : null;
    const queueDepth = Number(queueStats.queueDepth || 0);
    const deadLetterDepth = Number(queueStats.deadLetterDepth || 0);

    if (!manifest && !summary && !recentEvents.length && !eventTypes.length) {
      clearCopilotSelection("/superadmin/observability");
      return;
    }

    const facts = {
      screenType: "OBSERVABILITY",
      stage: String(summary?.status || "").toUpperCase() || "SCAFFOLD",
      readiness:
        /OK|LIVE|HEALTHY/.test(String(summary?.status || "").toUpperCase()) && (!summary?.deviceHealth?.risk || String(summary?.deviceHealth?.risk) === "unknown")
          ? "READY"
          : "REVIEW_NEEDED",
      readinessScore: score != null ? Math.max(24, Math.min(95, Math.round(score))) : 42,
      blockers: [
        ...(summary?.deviceHealth?.risk && String(summary.deviceHealth.risk) !== "unknown" ? [`Cihaz sağlık riski: ${readableAdminText(summary.deviceHealth.risk)}`] : []),
        ...((score != null && score < 60) ? ["Konum sinyali güven skoru düşük görünüyor."] : []),
        ...(queueIncident?.severity && String(queueIncident.severity).toUpperCase() !== "OK" ? [`Kuyruk alarmı: ${technicalStateLabel(queueIncident.severity)}`] : []),
      ],
      counters: { eventTypes: eventTypes.length, recentEvents: recentEvents.length, gpsScore: score != null ? score : "-", queueDepth, deadLetterDepth },
      roadmapCounters: { activeWidgets: activeWidgets.length, roadmapWidgets: roadmapWidgets.length, queueDepth, deadLetterDepth },
      evidence: [
        `Canlı durum: ${liveStatusText(summary)}`,
        `Konum sinyali skoru: ${gpsScoreText(summary)}`,
        `Kuyruk: ${technicalStateLabel(queueThreshold?.status || "UNKNOWN")} / ${formatMaybeNumber(queueStats.queueDepth)}`,
        `Alarm: ${technicalStateLabel(queueIncident?.severity || "UNKNOWN")} / ${readableAdminText(queueIncident?.title || "-")}`,
        `Son canlı olay: ${readableAdminText(firstEvent?.label || eventTypeLabel(firstEvent?.type) || "-")}`,
      ],
      reasoningLead: "Bu ekranda amaç canlı sağlık, konum sinyali güveni ve son olayları aynı yerde okumaktır.",
      nextBestAction: firstEvent
        ? "Önce son canlı olayın önemini ve zamanını oku. Sonra cihaz sağlığı ve kuyruk notlarıyla birlikte değerlendir."
        : "Önce canlı durum, konum sinyali güven notu ve kuyruk eşiklerini oku. Sonra olay türü ve işlenemeyen kayıt satırlarına in.",
      safestNextStep: "En risksiz adım, canlı durum, konum sinyali skoru ve kuyruk eşiği bilgisini aynı anda okuyup sonra ayrıntıya inmektir.",
      compareHint: "Canlı durum ile konum sinyali güven skoru aynı şey değildir; biri saha akışını, diğeri veri kalitesini özetler. Kuyruk ise operasyon dayanıklılığını gösterir.",
    };

    setCopilotSelection({
      scopeKey: '/superadmin/observability',
      entityType: "screen",
      entityId: 6107,
      label: firstEvent?.label || "Canlı sağlık ve risk özeti",
      summary: [liveStatusText(summary), gpsScoreText(summary), technicalStateLabel(queueThreshold?.status), technicalStateLabel(firstEvent?.severity)].filter((x) => x && x !== "-").join(" • "),
      fields: [
        { label: "Canlı Durum", value: liveStatusText(summary), help: "Saha akışının genel canlılık durumunu gösterir." },
        { label: "Konum sinyali skoru", value: gpsScoreText(summary), help: "Konum sinyali güven katmanının skorunu gösterir." },
        { label: "Cihaz riski", value: readableAdminText(summary?.deviceHealth?.risk || "-"), help: "Cihaz sağlığı tarafında görünen risk özetini gösterir." },
        { label: "Son senkron", value: summary?.deviceHealth?.lastSyncAt || "-", help: "Son senkron zamanını gösterir." },
        { label: "Son konum sinyali", value: summary?.deviceHealth?.lastGpsAt || "-", help: "Son konum sinyali zamanını gösterir." },
        { label: "Son olay", value: readableAdminText(firstEvent?.label || eventTypeLabel(firstEvent?.type) || "-"), help: "En son canlı olay başlığını gösterir." },
        { label: "Kuyruk durumu", value: technicalStateLabel(queueThreshold?.status), help: "Kuyruk dayanıklılık kontrolünün son durumunu gösterir." },
        { label: "Kuyruk alarmı", value: technicalStateLabel(queueIncident?.severity), help: "Kuyruk alarm seviyesini gösterir." },
        { label: "İşlenemeyen kayıt", value: formatMaybeNumber(queueStats.deadLetterDepth), help: "Kuyrukta işlenemeyen kayıt sayısını gösterir." },
      ],
      badges: [
        { label: "Önem", value: firstEvent?.severity || "-", help: "Son canlı olayın önem seviyesini gösterir." },
        { label: "Kuyruk", value: technicalStateLabel(queueThreshold?.status), help: "Kuyruk eşiği değerlendirme sonucunu gösterir." },
        { label: "Alarm", value: technicalStateLabel(queueIncident?.severity), help: "Operasyon alarm seviyesini gösterir." },
      ],
      facts,
    });

    return () => clearCopilotSelection("/superadmin/observability");
  }, [manifest, summary, eventTypes, recentEvents, activeWidgets.length, roadmapWidgets.length, queueThreshold, queueIncident, queueStats.queueDepth, queueStats.deadLetterDepth, recentEvent]);

  const queueIncidentTitle = readableAdminText(queueIncident?.title || "Kuyruk alarmı yok");
  const criticalTitle = hasCriticalSignals ? "KVKK / alarm aktif" : "KVKK / canlı izleme hazır";
  const criticalDescription = hasCriticalSignals
    ? criticalSignals.join(" • ")
    : "Canlı durum, konum sinyali güveni ve kuyruk sinyalleri normal görünüyor.";
  const tabs = [
    { key: "summary", label: "Özet" },
    { key: "live", label: "Canlı Akış", badge: fmtCount(recentEvents.length) },
    { key: "alarms", label: "Alarmlar & Riskler", badge: fmtCount(openIssueCount) },
    { key: "events", label: "İzlenen Olaylar", badge: fmtCount(eventTypes.length) },
    { key: "proof", label: "Sistem Kanıtı" },
    { key: "history", label: "Geçmiş / İşlem kayıtları", badge: fmtCount(queueItems.length + recentEvents.length) },
  ];

  const renderSummaryTab = () => {
    const nextStep = hasCriticalSignals
      ? "Önce Alarmlar & Riskler sekmesine geç. Sonra Sistem Kanıtı sekmesinde kuyruk kanıtı ve işlenemeyen kayıt durumunu doğrula."
      : "Kritik sinyal görünmüyor. İstersen Canlı Akış ve Sistem Kanıtı sekmelerini sırayla aç.";
    const overviewBullets = [
      `Canlı durum: ${liveStatusText(summary)}`,
      `Konum sinyali güven skoru: ${gpsScoreText(summary)}`,
      `Kalite kontrolü giriş kaydı: ${fmtCount(qaEntryCount)}`,
      `Açık alarm / açık sorun: ${fmtCount(openIssueCount)}`,
      `Son canlı akış: ${recentEvent?.label || recentEvent?.type || "-"}`,
    ];
    const riskBullets = [
      ...criticalSignals.slice(0, 3),
      ...gpsNotes.slice(0, 2),
    ];

    return (
      <div role="tabpanel" aria-label="Özet" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card title="Kısa yorum" wide>
            <div className="panelBody">Bu ekran canlı sağlık, risk ve son olayları tek yerde okutur.</div>
            <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
              {overviewBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card title="Kritik risk özeti" wide>
            <div className="panelBody">{criticalDescription}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {readableAdminText(queueIncident?.title || "Kuyruk alarmı yok")} • {technicalStateLabel(queueAlarm?.alarmLevel || "OK")}
            </div>
            <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
              {riskBullets.length ? riskBullets.map((item) => <li key={item}>{item}</li>) : <li>Ek risk notu yok.</li>}
            </ul>
          </Card>
          <Card title="Sıradaki doğru kontrol" wide>
            <div className="panelBody">{nextStep}</div>
            <div className="panelMeta" style={{ marginTop: 8 }}>
              En risksiz okuma sırası: canlı durum → konum sinyali güven skoru → kuyruk eşiği → son olay.
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderLiveTab = () => (
    <div role="tabpanel" aria-label="Canlı Akış" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Son canlı akışlar" wide>
          {recentEvents.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {recentEvents.map((item) => (
                <div
                  key={item.id}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}
                >
                  <div>
                    <div className="panelSectionTitle">{readableAdminText(item.label || eventTypeLabel(item.type))}</div>
                    <div className="panelMeta">Önem: {technicalStateLabel(item.severity || "INFO")}</div>
                  </div>
                  <div className="panelMeta" style={{ whiteSpace: "nowrap" }}>{fmtTR(item.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panelMeta">Henüz canlı olay yok.</div>
          )}
        </Card>
        <Card title="Canlı yorum">
          <div className="panelBody">{liveStatusText(summary)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Konum sinyali güven skoru: {gpsScoreText(summary)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Son giriş kaydı: {fmtCount(loginAuditCount)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Son canlı akış: {readableAdminText(recentEvent?.label || eventTypeLabel(recentEvent?.type) || "-")}</div>
        </Card>
      </div>
    </div>
  );

  const renderAlarmsTab = () => (
    <div role="tabpanel" aria-label="Alarmlar & Riskler" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Kritik alarm bandı" wide>
          <div className="panelBody">{criticalDescription}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            KVKK bandı üstte sabit kalır; detay burada açılır.
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Alarm özeti: {queueIncidentTitle} • Durum: {queueStatusText(queueThreshold, queueIncident)}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" disabled={queueSyncBusy} onClick={syncQueueIncident}>
              {queueSyncBusy ? "Alarm eşitleniyor..." : "Alarmı eşitle"}
            </button>
            <button className="btn sm" onClick={() => setActiveTab("proof")}>Sistem Kanıtı sekmesi</button>
          </div>
          {renderChipRow(criticalSignals)}
        </Card>
        <Card title="Konum sinyali / canlılık riski" wide>
          <div className="panelBody">Cihaz riski: {summary?.deviceHealth?.risk && summary.deviceHealth.risk !== "unknown" ? readableAdminText(summary.deviceHealth.risk) : "Henüz risk görünmüyor"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Konum sinyali güven skoru: {gpsScoreText(summary)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Canlı durum: {liveStatusText(summary)}</div>
          <ul className="panelMeta" style={{ marginTop: 8, paddingLeft: 18 }}>
            {gpsNotes.map((note, idx) => <li key={`${note}-${idx}`}>{note}</li>)}
          </ul>
        </Card>
        <Card title="Alarm geçmişi" wide>
          {recentEvents.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {recentEvents.slice(0, 5).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="panelSectionTitle">{readableAdminText(item.label || eventTypeLabel(item.type))}</div>
                    <div className="panelMeta">Seviye: {technicalStateLabel(item.severity || "INFO")}</div>
                  </div>
                  <div className="panelMeta" style={{ whiteSpace: "nowrap" }}>{fmtTR(item.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panelMeta">Alarm geçmişi için kayıt yok.</div>
          )}
        </Card>
      </div>
      {queueWarnings.length || queueNotes.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(queueWarnings.length ? queueWarnings : queueNotes).map((item, idx) => (
            <span key={`${item?.message || item}-${idx}`} className="pill" data-status="WARN">
              {readableAdminText(item?.message || item)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderEventsTab = () => (
    <div role="tabpanel" aria-label="İzlenen Olaylar" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="İzlenen olay türleri" wide>
          {!eventTypes.length ? (
            <div className="panelMeta">Henüz olay türü tanımı yok.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }} className="panelMeta">
              {eventTypes.map((item) => <li key={item}>{eventTypeLabel(item)}</li>)}
            </ul>
          )}
        </Card>
        <Card title="İzleme kapsamı" wide>
          <div className="panelBody">{manifest?.title || "Gözlemleme + saha teşhis"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {manifest?.mobileHealthEventTypes?.length ? `${manifest.mobileHealthEventTypes.length} mobil olay tipi` : "Olay kapsamı bekleniyor."}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {widgets.length
              ? widgets.map((item) => (
                  <span key={item.key} className="pill">
                    {readableAdminText(item.label || item.key)}
                  </span>
                ))
              : <span className="pill" data-status="WARN">Widget tanımı yok</span>}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderProofTab = () => (
    <div role="tabpanel" aria-label="Sistem Kanıtı" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Sistem kanıtı" wide>
          <div className="panelBody">Bu tab teknik ama sadeleştirilmiş kanıt bilgisini gösterir.</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <div className="panelMeta">Kuyruk derinliği</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.queueDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">İşlemde</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.processingDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">Kanıt</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.claimsDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">Hatalı kayıt</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueStats.deadLetterDepth)}</div>
            </div>
            <div>
              <div className="panelMeta">İşçi işlem numarası</div>
              <div className="panelSectionTitle">{queueRuntime?.workerPid || "-"}</div>
            </div>
            <div>
              <div className="panelMeta">Başlangıç</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.startedAtIso)}</div>
            </div>
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Redis durumu: {queueHealth?.redisConnected === false ? "Bağlı değil" : "Bağlı"} • Aktif görevler: {formatMaybeNumber(queueRuntime?.activeTasks)} • Zirve: {formatMaybeNumber(queueRuntime?.peakActiveTasks)}
          </div>
        </Card>
        <Card title="Kanıt hedefleri" wide>
          <div className="panelBody">Kuyruk, işleme ve işlenemeyen kayıt hedefleri.</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <div className="panelMeta">Kuyruk: {proofStateText(queueHealth?.queue?.key)}</div>
            <div className="panelMeta">İşlemde: {proofStateText(queueHealth?.queue?.processingKey)}</div>
            <div className="panelMeta">Kanıt anahtarı: {proofStateText(queueHealth?.queue?.claimsHashKey)}</div>
            <div className="panelMeta">Kanıt indeksi: {proofStateText(queueHealth?.queue?.claimsIndexKey)}</div>
            <div className="panelMeta">Hatalı kayıt hattı: {proofStateText(queueHealth?.queue?.deadLetterKey)}</div>
          </div>
        </Card>
        <Card title="Kanıt sinyalleri" wide>
          <div className="panelBody">{readableAdminText(queueAlarm?.title || queueIncidentTitle)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Alarm seviyesi: {technicalStateLabel(queueAlarm?.alarmLevel || queueIncident?.severity || "OK")}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Alarm kaydı: {readableAdminText(queueIncident?.title || "-")}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Eşik: {technicalStateLabel(queueThreshold?.status)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Kuyruk notu: {readableAdminText(queueNotes[0] || "Belirgin not yok")}</div>
        </Card>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div role="tabpanel" aria-label="Geçmiş / İşlem kayıtları" tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="İşlem kaydı özeti" wide>
          <div className="panelBody">Geçmiş canlı akışlar, eski alarm kayıtları ve kapasite izleri burada sadeleştirilmiş halde görünür.</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <div className="panelMeta">Son kuyruktan alınan</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.lastDequeuedAtIso)}</div>
            </div>
            <div>
              <div className="panelMeta">Son işlenen</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.lastHandledAtIso)}</div>
            </div>
            <div>
              <div className="panelMeta">Son yeniden kuyruğa alınan</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.lastRequeuedAtIso)}</div>
            </div>
            <div>
              <div className="panelMeta">Son işlenemeyen kayıt</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.lastDeadLetteredAtIso)}</div>
            </div>
            <div>
              <div className="panelMeta">Son hata</div>
              <div className="panelSectionTitle">{fmtTR(queueRuntime?.lastErrorAtIso)}</div>
            </div>
            <div>
              <div className="panelMeta">Kapasite</div>
              <div className="panelSectionTitle">{formatMaybeNumber(queueRuntime?.activeTasks)} / {formatMaybeNumber(queueRuntime?.peakActiveTasks)}</div>
            </div>
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Son hata mesajı: {readableAdminText(queueRuntime?.lastErrorMessage || "Yok")}
          </div>
        </Card>
        <Card title={`İşlenemeyen kayıt geçmişi (${fmtCount(queueItems.length)})`} wide>
          {queueErr ? <div className="panelMeta" style={{ marginBottom: 8, color: "#ffb17b", whiteSpace: "pre-wrap" }}>{queueErr}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button className="btn sm" disabled={queueSyncBusy} onClick={syncQueueIncident}>
              {queueSyncBusy ? "Alarm eşitleniyor..." : "Alarmı eşitle"}
            </button>
            <button className="btn sm" onClick={() => setActiveTab("alarms")}>Alarmlar & Riskler</button>
          </div>
          {!queueItems.length ? (
            <div className="panelMeta">Henüz işlenemeyen kayıt yok.</div>
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
                        <div className="panelSectionTitle">{taskId ? `Görev ${taskId}` : "İçeriği okunamayan kayıt"}</div>
                        <div className="panelMeta">
                          Ayrıştırma notu: {readableAdminText(parsed?.deadLetterReason || (!item?.ok ? "Kayıt okunamadı" : "Bilinmiyor"))}
                        </div>
                      </div>
                      <div className="panelMeta" style={{ whiteSpace: "nowrap" }}>
                        {fmtTR(parsed?.deadLetteredAtIso || parsed?.queuedAtIso || null)}
                      </div>
                    </div>
                    <div className="panelMeta" style={{ marginTop: 6 }}>
                      Deneme sayısı: {formatMaybeNumber(parsed?.attemptCount)} • Yeniden kuyruğa alma nedeni: {readableAdminText(parsed?.lastRequeueReason || "-")}
                    </div>
                    {!item?.ok ? (
                      <div className="panelMeta" style={{ marginTop: 6, color: "#ff7b7b" }}>
                        Kayıt ayrıştırılamadı.
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
    </div>
  );

  const runDeadLetterAction = useCallback(
    async (taskId, action) => {
      const normalizedTaskId = String(taskId || "").trim();
      if (!normalizedTaskId) return;
      setQueueBusyKey(`${normalizedTaskId}:${action}`);
      setQueueErr("");
      try {
        await api(`/api/admin/queues/auto-reached/dead-letter/${encodeURIComponent(normalizedTaskId)}/${action}`, { method: "POST" });
        await bootstrap();
      } catch (e) {
        setQueueErr(e?.message || String(e));
      } finally {
        setQueueBusyKey("");
      }
    },
    [bootstrap],
  );

  const syncQueueIncident = useCallback(async () => {
    setQueueSyncBusy(true);
    setQueueErr("");
    try {
      await api("/api/admin/queues/auto-reached/incident-sync", { method: "POST" });
      await bootstrap();
    } catch (e) {
      setQueueErr(e?.message || String(e));
    } finally {
      setQueueSyncBusy(false);
    }
  }, [bootstrap]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
      <div className="panelTitle">Canlı sağlık ve risk özeti</div>
          <div className="panelSubtitle" style={{ marginTop: 6 }}>
            Sahadaki cihaz, yayın ve canlılık durumunu öncelikli özet panelinde gösterir.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={bootstrap}>Yenile</button>
          <button className="btn" onClick={() => setActiveTab("alarms")}>Alarmları aç</button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
      {queueErr ? <div style={{ marginTop: 8, color: "#ffb17b", whiteSpace: "pre-wrap" }}>{queueErr}</div> : null}

      <PanelKvkkHint panelKey="observability" />

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${hasCriticalSignals ? "rgba(255, 123, 123, 0.34)" : "rgba(255,255,255,0.08)"}`,
          background: hasCriticalSignals ? "rgba(255, 123, 123, 0.08)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{criticalTitle}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {criticalDescription}
            </div>
            {renderChipRow(criticalSignals.slice(0, 4))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
            <button className="btn sm" onClick={bootstrap}>Yenile</button>
            <button className="btn sm" onClick={() => setActiveTab("alarms")}>Alarmlar & Riskler</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricTile title="Canlı durum" value={liveStatusText(summary)} help="Saha akışının canlı özetidir." />
        <MetricTile title="Konum sinyali güveni" value={gpsScoreText(summary)} help={summary?.gpsReliability?.label || "Konum sinyali güven özeti"} />
        <MetricTile title="Kalite kontrolü giriş kaydı" value={fmtCount(qaEntryCount)} help="Son giriş ve doğrulama kayıtları." />
        <MetricTile title="Açık alarm / açık sorun" value={fmtCount(openIssueCount)} help="Alarm ve risk göstergelerinin toplamı." tone={hasCriticalSignals ? "warn" : "normal"} />
        <MetricTile title="Son canlı akış" value={recentEvent?.label || recentEvent?.type || "-"} help={fmtTR(recentEvent?.createdAt)} />
      </div>

      <div style={{ marginTop: 14 }}>
        <PanelSegmentTabs
          ariaLabel="Canlı sağlık bölümleri"
          compact
          value={activeTab}
          onChange={setActiveTab}
          tabs={tabs}
        />
      </div>

      {activeTab === "summary" ? renderSummaryTab() : null}
      {activeTab === "live" ? renderLiveTab() : null}
      {activeTab === "alarms" ? renderAlarmsTab() : null}
      {activeTab === "events" ? renderEventsTab() : null}
      {activeTab === "proof" ? renderProofTab() : null}
      {activeTab === "history" ? renderHistoryTab() : null}
    </div>
  );
}
