import { useEffect, useState } from "react";
import { api } from "../../api";

function Card({ title, badge, subtitle, children }) {
  return (
    <div className="card" style={{ flex: "1 1 280px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          {subtitle ? (
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {badge ? (
          <span className="pill" data-status={badge.status || "INFO"}>
            {badge.label}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function CapabilityList({ items, emptyText, planned = false }) {
  if (!items.length) {
    return <div className="muted">{emptyText}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>{item.label}</div>
          <span className="pill" data-status={planned ? "WARN" : "OK"}>
            {item.status}
          </span>
        </div>
      ))}
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

  const capabilities = manifest?.capabilities || [];
  const activeCapabilities = capabilities.filter((item) => item.status === "ACTIVE");
  const plannedCapabilities = capabilities.filter((item) => item.status === "PLANNED");

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Doğal Copilot Yol Haritası</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Read-only / suggestion-first yüzey. Canlı operasyon yüzeyi değildir; M64 yol haritası ve template özetini gösterir.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill" data-status="INFO">
            Roadmap
          </span>
          <span className="pill" data-status="WARN">
            Planned surface
          </span>
          <button className="btn" onClick={load}>
            Yenile
          </button>
        </div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card
          title="Durum özeti"
          badge={{ label: manifest?.activeMilestone || "M64", status: "INFO" }}
          subtitle="Bu yüzey planlanan yardımcı katmanını, açıklayıcı cevap iskeletini ve geri bildirim zeminini özetler."
        >
          <div>{manifest?.title || "Henüz yardımcı özeti yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {manifest?.rules?.[0] || "Read-only ve suggestion-first çizgisi korunur."}
          </div>
        </Card>
        <Card
          title="Aktif capability'ler"
          badge={{ label: `${activeCapabilities.length} active`, status: "OK" }}
          subtitle="Bugün çalışan ve değişiklik yapmayan yardımcı yüzeyler."
        >
          <CapabilityList items={activeCapabilities} emptyText="Henüz canlı capability yok" />
        </Card>
        <Card
          title="Planlanan capability'ler"
          badge={{ label: `${plannedCapabilities.length} planned`, status: "WARN" }}
          subtitle="Roadmap üzerinde olan, ama canlı yönetim yüzeyi olmayan parçalar."
        >
          <CapabilityList items={plannedCapabilities} emptyText="Henüz planlanan capability yok" planned />
        </Card>
        <Card title="Cevap iskeleti" badge={{ label: "READ-ONLY", status: "INFO" }} subtitle="Açıklayıcı cevap iskeleti ve akış bölümleri.">
          <div>{(replyTemplate?.sections || []).length} bölüm</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {(replyTemplate?.sections || []).join(" • ") || "Henüz cevap yapısı yok"}
          </div>
        </Card>
        <Card title="Geri bildirim iskeleti" badge={{ label: "SUGGESTION-FIRST", status: "INFO" }} subtitle="Kullanıcı geri bildirimi için yol haritası seçenekleri.">
          <div>{(feedbackTemplate?.options || []).join(" • ") || "Henüz geri bildirim seçeneği yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {feedbackTemplate?.summary || "Yardımcı için kullanılan geri bildirim mantığı burada özetlenir"}
          </div>
        </Card>
      </div>
    </div>
  );
}
