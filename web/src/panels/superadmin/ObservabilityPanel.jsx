import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function Card({ title, children, wide = false }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        flex: wide ? "1 1 420px" : "1 1 280px",
        minWidth: 0,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
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
  const [summary, setSummary] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [s, types, recent] = await Promise.all([
        api("/api/observability/health-summary"),
        api("/api/observability/event-types"),
        api("/api/observability/recent-events").catch(() => ({ items: [] })),
      ]);
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
        const [s, types, recent] = await Promise.all([
          api("/api/observability/health-summary"),
          api("/api/observability/event-types"),
          api("/api/observability/recent-events").catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
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

  const gpsNotes = useMemo(() => {
    const raw = Array.isArray(summary?.gpsReliability?.notes) ? summary.gpsReliability.notes : [];
    return raw.length ? raw : ["Canlı GPS güven notu henüz oluşmadı."];
  }, [summary]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Canlı Sağlık ve Risk Özeti</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Sahadaki cihaz, yayın ve canlılık durumunu tek ekranda özetler.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <PanelKvkkHint panelKey="observability" />

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Canlı durum">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{liveStatusText(summary)}</div>
          <div className="muted" style={{ marginTop: 6 }}>Kaynak: sürücünün telefon GPS'i</div>
        </Card>
        <Card title="GPS güven skoru">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{gpsScoreText(summary)}</div>
          <div className="muted" style={{ marginTop: 6 }}>{summary?.gpsReliability?.label || "GPS güven özeti"}</div>
          <ul className="muted" style={{ marginTop: 8, paddingLeft: 18 }}>
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
            <div className="muted">Henüz canlı olay yok.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {recentEvents.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.label || item.type}</div>
                    <div className="muted">Önem: {item.severity || "INFO"}</div>
                  </div>
                  <div className="muted" style={{ whiteSpace: "nowrap" }}>{fmtTR(item.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="İzlenen olay türleri">
          {!eventTypes.length ? (
            <div className="muted">Henüz olay türü tanımı yok.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }} className="muted">
              {eventTypes.slice(0, 10).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
