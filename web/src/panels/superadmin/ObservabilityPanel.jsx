import { useEffect, useMemo, useState } from "react";
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

export default function ObservabilityPanel() {
  const [manifest, setManifest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
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
  };

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
    return () => {
      cancelled = true;
    };
  }, []);

  const widgets = Array.isArray(manifest?.widgets) ? manifest.widgets : [];
  const activeWidgets = widgets.filter((item) => ["mobileHealth", "deviceHealth", "gpsReliability"].includes(item.key));
  const roadmapWidgets = widgets.filter((item) => ["issueInbox", "shiftTimeline"].includes(item.key));

  useEffect(() => {
    const firstEvent = recentEvents[0] || null;
    const score = typeof summary?.gpsReliability?.score === 'number' ? Number(summary.gpsReliability.score) : null;
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
      roadmapCounters: { activeWidgets: activeWidgets.length, roadmapWidgets: roadmapWidgets.length },
      evidence: [
        `Canlı durum: ${liveStatusText(summary)}`,
        `GPS skor: ${gpsScoreText(summary)}`,
        `Son canlı olay: ${firstEvent?.label || firstEvent?.type || '-'}`,
      ],
      reasoningLead: 'Bu ekranda amaç canlı sağlık, GPS güveni ve son olayları aynı yerde okumaktır.',
      nextBestAction: firstEvent
        ? 'Önce son canlı olayın önemini ve zamanını oku. Sonra cihaz sağlık notlarıyla birlikte değerlendir.'
        : 'Önce canlı durum ve GPS güven notlarını oku. Sonra event type ve son sync alanlarını kontrol et.',
      safestNextStep: 'En risksiz adım, canlı durum ile GPS skorunu aynı anda okuyup sonra son olaya inmektir.',
      compareHint: 'Canlı durum ile GPS güven skoru aynı şey değildir; biri saha akışını, diğeri veri kalitesini özetler.',
    };
    setCopilotSelection({
      scopeKey: '/superadmin/observability',
      entityType: 'screen',
      entityId: 6107,
      label: firstEvent?.label || 'Canlı sağlık özeti',
      summary: [liveStatusText(summary), gpsScoreText(summary), firstEvent?.severity || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Canlı Durum', value: liveStatusText(summary), help: 'Saha akışının genel canlılık durumunu gösterir.' },
        { label: 'GPS Skoru', value: gpsScoreText(summary), help: 'GPS güven katmanının skorunu gösterir.' },
        { label: 'Cihaz Riski', value: summary?.deviceHealth?.risk || '-', help: 'Cihaz sağlığı tarafında görünen risk özetini gösterir.' },
        { label: 'Son Sync', value: summary?.deviceHealth?.lastSyncAt || '-', help: 'Son senkron zamanını gösterir.' },
        { label: 'Son GPS', value: summary?.deviceHealth?.lastGpsAt || '-', help: 'Son GPS zamanını gösterir.' },
        { label: 'Son Olay', value: firstEvent?.label || firstEvent?.type || '-', help: 'En son canlı olay başlığını gösterir.' },
      ],
      badges: [
        { label: 'Önem', value: firstEvent?.severity || '-', help: 'Son canlı olayın önem seviyesini gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/observability');
  }, [manifest, summary, eventTypes, recentEvents, activeWidgets.length, roadmapWidgets.length]);

  const gpsNotes = useMemo(() => {
    const raw = Array.isArray(summary?.gpsReliability?.notes) ? summary.gpsReliability.notes : [];
    return raw.length ? raw : ["Canlı GPS güven notu henüz oluşmadı."];
  }, [summary]);

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
