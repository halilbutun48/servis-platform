import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function SummaryCard({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div className="muted" style={{ marginTop: 6 }}>{note}</div>
    </div>
  );
}

function Row({ title, text }) {
  return (
    <div className="card">
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div className="muted" style={{ marginTop: 6 }}>{text}</div>
    </div>
  );
}

export default function PilotLaunchGatePanel() {
  const [manifest, setManifest] = useState(null);
  const [decision, setDecision] = useState(null);
  const [risks, setRisks] = useState([]);
  const [acceptanceManifest, setAcceptanceManifest] = useState(null);
  const [acceptanceSession, setAcceptanceSession] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);

  const load = async () => {
    const [m, d, r, am, as, hs] = await Promise.all([
      api('/api/pilot-launch-gate/manifest').catch(() => null),
      api('/api/pilot-launch-gate/decision-template').catch(() => null),
      api('/api/pilot-launch-gate/risk-template').catch(() => null),
      api('/api/field-acceptance/manifest').catch(() => null),
      api('/api/field-acceptance/session-template').catch(() => null),
      api('/api/observability/health-summary').catch(() => null),
    ]);
    setManifest(m?.manifest || null);
    setDecision(d?.decision || null);
    setRisks(Array.isArray(r?.risks) ? r.risks : []);
    setAcceptanceManifest(am || null);
    setAcceptanceSession(as || null);
    setHealthSummary(hs || null);
  };

  useEffect(() => {
    load();
  }, []);

  const totalChecklist = acceptanceManifest?.checklist?.length || 0;
  const passChecklist = (acceptanceSession?.checklist || []).filter((x) => x.status === "PASS").length;
  const riskCount = risks.length;
  const sectionsCount = Array.isArray(manifest?.sections) ? manifest.sections.length : 6;

  const decisionLabel = useMemo(() => {
    const status = String(decision?.status || "LIMITED_GO").trim() || "LIMITED_GO";
    return status;
  }, [decision]);

  const riskSummary = riskCount
    ? risks.map((x) => `${x.title || "Risk"} (${x.severity || "-"})`).join(" • ")
    : "Henüz kritik risk yok.";

  const acceptanceSummary = totalChecklist
    ? `${passChecklist}/${totalChecklist} madde tamam. Karar: ${acceptanceSession?.decision || "-"}.`
    : "Henüz kabul checklist verisi yok.";

  const healthSummaryText = healthSummary?.deviceHealth
    ? `Risk: ${healthSummary.deviceHealth.risk && healthSummary.deviceHealth.risk !== "unknown" ? healthSummary.deviceHealth.risk : "Henüz risk yok"} • Son sync: ${healthSummary.deviceHealth.lastSyncAt || "Henüz veri yok"}`
    : "Henüz canlı sağlık özeti yok.";

  const buildText = acceptanceSession
    ? `${acceptanceSession.deviceModel || "Cihaz bilgisi yok"} • Build: ${acceptanceSession.buildProfile || "-"}`
    : "Henüz build / cihaz bilgisi yok.";

  const decisionText = `${decisionLabel} • ${decision?.reason || "Karar nedeni henüz girilmedi."}`;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Sahaya Çıkış Kontrolü</h2>
          <div className="muted" style={{ marginTop: 6 }}>Sahaya çıkıştan önce son kararı ve bloklayan riskleri tek yerde toplar.</div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SummaryCard title="Son karar" value={decisionLabel} note={decision?.reason || "Checklist tamamlanmadı"} />
        <SummaryCard title="Risk sayısı" value={String(riskCount)} note={riskCount ? "Açık riskler izlenmeli" : "Kritik risk görünmüyor"} />
        <SummaryCard title="Bölüm sayısı" value={String(sectionsCount)} note="Saha öncesi son karar kapısı" />
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <Row title="Launch checklist" text={totalChecklist ? `${passChecklist}/${totalChecklist} madde tamamlandı.` : "Henüz checklist verisi yok."} />
        <Row title="Kritik risk listesi" text={riskSummary} />
        <Row title="Acceptance özetleri" text={acceptanceSummary} />
        <Row title="Gözlemleme sağlık özeti" text={healthSummaryText} />
        <Row title="Build / cihaz uygunluk özeti" text={buildText} />
        <Row title="GO / LIMITED GO / NO-GO" text={decisionText} />
      </div>
    </div>
  );
}
