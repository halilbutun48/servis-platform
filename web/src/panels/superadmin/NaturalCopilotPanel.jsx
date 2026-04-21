import { useEffect, useState } from "react";
import { api } from "../../api";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function NaturalCopilotPanel() {
  const [manifest, setManifest] = useState(null);
  const [replyTemplate, setReplyTemplate] = useState(null);
  const [feedbackTemplate, setFeedbackTemplate] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const [m, r, f] = await Promise.all([
        api("/api/natural-copilot/manifest"),
        api("/api/natural-copilot/reply-template"),
        api("/api/natural-copilot/feedback-template"),
      ]);
      setManifest(m || null);
      setReplyTemplate(r || null);
      setFeedbackTemplate(f || null);
    } catch (e2) {
      setErr(e2?.message || String(e2));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Yardımcı Merkezi</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            M64 yol haritası, cevap iskeleti ve geri bildirim seçeneklerini özetler; canlı operasyon yüzeyi değildir.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill" data-status="INFO">Yol Haritası</span>
          <button className="btn" onClick={load}>Yenile</button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif durum">
          <div>{manifest?.title || "Henüz yardımcı özeti yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {manifest?.activeMilestone || "Aktif durum bilgisi gelmedi"}
          </div>
        </Card>
        <Card title="Cevap yapısı">
          <div>{(replyTemplate?.sections || []).length} bölüm</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(replyTemplate?.sections || []).join(" • ") || "Henüz cevap yapısı yok"}
          </div>
        </Card>
        <Card title="Geri bildirim seçenekleri">
          <div>{(feedbackTemplate?.options || []).join(" • ") || "Henüz geri bildirim seçeneği yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {feedbackTemplate?.summary || "Yardımcı için kullanılan geri bildirim mantığı burada özetlenir"}
          </div>
        </Card>
      </div>
    </div>
  );
}
