import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function NaturalCopilotPanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [replyTemplate, setReplyTemplate] = useState(null);
  const [feedbackTemplate, setFeedbackTemplate] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, r, f] = await Promise.all([
          api("/api/natural-copilot/manifest", { token }),
          api("/api/natural-copilot/reply-template", { token }),
          api("/api/natural-copilot/feedback-template", { token }),
        ]);
        if (cancelled) return;
        setManifest(m || null);
        setReplyTemplate(r || null);
        setFeedbackTemplate(f || null);
      } catch (e2) {
        if (cancelled) return;
        setErr(e2?.message || String(e2));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>M64 Doğal Copilot Katmanı</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Doğal cevap, kısa hafıza, daha basit anlat ve geri bildirim iskeleti
          </div>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif milestone">
          <div>{manifest?.activeMilestone || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{manifest?.title || "-"}</div>
        </Card>
        <Card title="Doğal cevap">
          <div>{(replyTemplate?.sections || []).length} bölüm</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(replyTemplate?.sections || []).join(" • ") || "Henüz veri yok"}
          </div>
        </Card>
        <Card title="Geri bildirim">
          <div>{(feedbackTemplate?.options || []).join(" • ") || "-"}</div>
          <div className="muted" style={{ marginTop: 6 }}>{feedbackTemplate?.summary || "-"}</div>
        </Card>
      </div>
    </div>
  );
}
