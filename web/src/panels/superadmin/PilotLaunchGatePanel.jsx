import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import { statusBadgeInlineStyle } from "../../utils/statusBadge";

function SummaryCard({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 280px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      <div className="panelStatValue">{value}</div>
      <div className="panelMeta" style={{ marginTop: 6 }}>{note}</div>
    </div>
  );
}

function Row({ title, text }) {
  return (
    <div className="card">
      <div className="panelSectionTitle">{title}</div>
      <div className="panelBody" style={{ marginTop: 6 }}>{text}</div>
    </div>
  );
}

function TabPanel({ active, label, children }) {
  if (!active) return null;
  return (
    <div role="tabpanel" aria-label={label} tabIndex={-1} style={{ marginTop: 14, display: "grid", gap: 12 }}>
      {children}
    </div>
  );
}

function Pill({ code }) {
  const safe = String(code || "CHECK").toUpperCase();
  return <span className="pill" style={statusBadgeInlineStyle(safe)}>{safe}</span>;
}

function SeverityPill({ value }) {
  const safe = String(value || "MEDIUM").toUpperCase();
  const mapped = safe === "CRITICAL" ? "CRITICAL" : safe === "HIGH" ? "WARNING" : safe === "LOW" ? "SUCCESS" : "INFO";
  return <span className="pill" style={statusBadgeInlineStyle(mapped)}>{safe}</span>;
}

function PrepList({ title, items, renderDetail }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div className="panelSectionTitle">{title}</div>
        <div className="panelMeta">{safeItems.length} kayıt</div>
      </div>
      {safeItems.length ? safeItems.map((item, idx) => (
        <div key={item?.id || item?.roleId || item?.surfaceId || idx} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="panelSectionTitle">{item?.title || item?.label || item?.roleId || `Kayıt ${idx + 1}`}</div>
            {item?.status?.code ? <Pill code={item.status.code} /> : null}
          </div>
          {item?.owner ? <div className="panelMeta">Sorumlu: {item.owner}</div> : null}
          {item?.surface ? <div className="panelMeta">Yüzey: {item.surface}</div> : null}
          <div className="panelMeta">{renderDetail ? renderDetail(item) : (item?.detail || item?.success || "-")}</div>
        </div>
      )) : <div className="muted">Henüz kayıt yok.</div>}
    </div>
  );
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(items) {
  return Array.isArray(items) ? items.join("\n") : "";
}

const FEEDBACK_ROLE_OPTIONS = ["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"];
const DECISION_STATUS_OPTIONS = [
  { id: "GO", label: "GO" },
  { id: "LIMITED_GO", label: "LIMITED_GO" },
  { id: "NO_GO", label: "NO_GO" },
];
const RISK_SEVERITY_OPTIONS = [
  { id: "LOW", label: "LOW" },
  { id: "MEDIUM", label: "MEDIUM" },
  { id: "HIGH", label: "HIGH" },
  { id: "CRITICAL", label: "CRITICAL" },
];
const RISK_STATUS_OPTIONS = [
  { id: "OPEN", label: "OPEN" },
  { id: "TRACKING", label: "TRACKING" },
  { id: "MITIGATED", label: "MITIGATED" },
  { id: "CLOSED", label: "CLOSED" },
];

// FIELD DISPATCH DISCOVERY / INVENTORY
// Üstte kalacak: Sahaya Çıkış Kontrolü başlığı, kritik engel / hazır değil / onay gerekli bandı, ana KPI kartları ve varsa global uyarı sinyalleri.
// Özet: Son karar, risk sayısı, saha hazırlık, M84 saha döngüsü, kabul / sağlık / build özetleri ve sıradaki doğru kontrol.
// Hazırlık Kontrolü: Launch checklist, canlı ortam ve release kontrolleri, operatör sırası, saha senaryoları, rol/cihaz checklisti, kapasite kartları, açık bloklar, uyarılar ve saha notları.
// Not: Bölge / Kapasite için ayrı uzun bölüm yok; kapasite kartları Hazırlık Kontrolü altında gruplanır.
// Onay & Çıkış: Karar kaydı ve GO / LIMITED_GO / NO_GO kararı.
// Eksikler & Riskler: Risk kaydı, kayıtlı riskler ve kritik risk özeti.
// Geri Bildirimler: Saha gözlem / geri bildirim döngüsü, yeni geri bildirim formu, rol kapsaması, yüzey kapsaması.
// Geçmiş / Log: Son saha kayıtları, M84 bloklar, M84 uyarılar, M84 notları.
// Veri kaybı yok; yalnızca uzun tek kolon görünümü bölüm bölüm okunur hale getiriliyor.

const DEFAULT_FEEDBACK_FORM = {
  title: "",
  detail: "",
  reportedByRole: "DRIVER",
  ownerRole: "ROOM",
  surface: "MOBILE",
  severity: "MEDIUM",
  status: "GORULDU",
  scenarioId: "",
  relatedPath: "/driver/today",
};

const DEFAULT_DECISION_FORM = {
  status: "LIMITED_GO",
  reason: "Checklist tamamlanmadi",
  blockingItemsText: "",
  notesText: "",
};

const DEFAULT_RISK_FORM = {
  id: "",
  title: "",
  detail: "",
  severity: "MEDIUM",
  status: "OPEN",
  owner: "SUPER_ADMIN",
};

export default function PilotLaunchGatePanel() {
  const [manifest, setManifest] = useState(null);
  const [decision, setDecision] = useState(null);
  const [risks, setRisks] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [decisionForm, setDecisionForm] = useState(DEFAULT_DECISION_FORM);
  const [riskForm, setRiskForm] = useState(DEFAULT_RISK_FORM);
  const [acceptanceManifest, setAcceptanceManifest] = useState(null);
  const [acceptanceSession, setAcceptanceSession] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);
  const [fieldPrep, setFieldPrep] = useState(null);
  const [fieldPrepErr, setFieldPrepErr] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [riskBusy, setRiskBusy] = useState(false);
  const [feedbackPacket, setFeedbackPacket] = useState(null);
  const [feedbackErr, setFeedbackErr] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_FEEDBACK_FORM);

  const load = async () => {
    const [m, d, r, am, as, hs, fp, fl] = await Promise.all([
      api('/api/pilot-launch-gate/manifest').catch(() => null),
      api('/api/pilot-launch-gate/decision').catch(() => null),
      api('/api/pilot-launch-gate/risks').catch(() => null),
      api('/api/field-acceptance/manifest').catch(() => null),
      api('/api/field-acceptance/session').catch(() => null),
      api('/api/observability/health-summary').catch(() => null),
      api('/api/pilot-launch-gate/field-prep-packet').catch((e) => ({ __error: e })),
      api('/api/pilot-launch-gate/field-feedback-loop').catch((e) => ({ __error: e })),
    ]);
    setManifest(m?.manifest || null);
    setDecision(d?.decision || null);
    setRisks(Array.isArray(r?.risks) ? r.risks : []);
    setDecisionForm({
      status: d?.decision?.status || DEFAULT_DECISION_FORM.status,
      reason: d?.decision?.reason || DEFAULT_DECISION_FORM.reason,
      blockingItemsText: joinLines(d?.decision?.blockingItems),
      notesText: joinLines(d?.decision?.notes),
    });
    setRiskForm(DEFAULT_RISK_FORM);
    setAcceptanceManifest(am?.manifest || am || null);
    setAcceptanceSession(as?.session || as?.currentSession || as || null);
    setHealthSummary(hs || null);
    if (fp?.__error) {
      setFieldPrep(null);
      setFieldPrepErr(fp.__error?.message || String(fp.__error));
    } else {
      setFieldPrep(fp?.packet || null);
      setFieldPrepErr("");
    }
    if (fl?.__error) {
      setFeedbackPacket(null);
      setFeedbackErr(fl.__error?.message || String(fl.__error));
    } else {
      setFeedbackPacket(fl?.packet || null);
      setFeedbackErr("");
    }
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

  const prepStage = String(fieldPrep?.stage || "CHECK_REQUIRED");
  const prepSummary = fieldPrep?.summary || {};
  const prepCounters = fieldPrep?.counters || {};
  const feedbackStage = String(feedbackPacket?.stage || "NO_FEEDBACK_YET");
  const feedbackSummary = feedbackPacket?.summary || {};
  const feedbackRecords = Array.isArray(feedbackPacket?.records) ? feedbackPacket.records : [];
  const feedbackStatuses = Array.isArray(feedbackPacket?.statuses) ? feedbackPacket.statuses : [];
  const feedbackSeverities = Array.isArray(feedbackPacket?.severities) ? feedbackPacket.severities : [];
  const feedbackSurfaces = Array.isArray(feedbackPacket?.surfaces) ? feedbackPacket.surfaces : [];

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

  const updateDecisionField = (key, value) => {
    setDecisionForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRiskField = (key, value) => {
    setRiskForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateFeedbackField = (key, value) => {
    setFeedbackForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveDecision = async () => {
    if (decisionBusy) return;
    setDecisionBusy(true);
    try {
      await api('/api/pilot-launch-gate/decision', {
        method: 'POST',
        body: {
          status: decisionForm.status,
          reason: decisionForm.reason,
          blockingItems: splitLines(decisionForm.blockingItemsText),
          notes: splitLines(decisionForm.notesText),
        },
      });
      await load();
    } finally {
      setDecisionBusy(false);
    }
  };

  const saveRisk = async () => {
    if (riskBusy || !String(riskForm.title || '').trim()) return;
    setRiskBusy(true);
    try {
      await api('/api/pilot-launch-gate/risks', {
        method: 'POST',
        body: {
          id: riskForm.id || undefined,
          title: riskForm.title,
          detail: riskForm.detail,
          severity: riskForm.severity,
          status: riskForm.status,
          owner: riskForm.owner,
        },
      });
      setRiskForm(DEFAULT_RISK_FORM);
      await load();
    } finally {
      setRiskBusy(false);
    }
  };

  const editRisk = (item) => {
    setRiskForm({
      id: item?.id || "",
      title: item?.title || "",
      detail: item?.detail || "",
      severity: item?.severity || DEFAULT_RISK_FORM.severity,
      status: item?.status || DEFAULT_RISK_FORM.status,
      owner: item?.owner || DEFAULT_RISK_FORM.owner,
    });
  };

  const clearRiskForm = () => {
    setRiskForm(DEFAULT_RISK_FORM);
  };

  const removeRisk = async (recordId) => {
    if (riskBusy || !recordId) return;
    setRiskBusy(true);
    try {
      await api(`/api/pilot-launch-gate/risks/${recordId}`, { method: 'DELETE' });
      if (riskForm.id === recordId) {
        setRiskForm(DEFAULT_RISK_FORM);
      }
      await load();
    } finally {
      setRiskBusy(false);
    }
  };

  const submitFeedback = async () => {
    if (!String(feedbackForm.title || '').trim() || !String(feedbackForm.detail || '').trim()) return;
    setFeedbackBusy(true);
    try {
      await api('/api/pilot-launch-gate/field-feedback-loop/records', { method: 'POST', body: feedbackForm });
      setFeedbackForm((prev) => ({
        ...DEFAULT_FEEDBACK_FORM,
        reportedByRole: prev.reportedByRole || DEFAULT_FEEDBACK_FORM.reportedByRole,
        ownerRole: prev.ownerRole || DEFAULT_FEEDBACK_FORM.ownerRole,
        surface: prev.surface || DEFAULT_FEEDBACK_FORM.surface,
        severity: prev.severity || DEFAULT_FEEDBACK_FORM.severity,
        relatedPath: prev.relatedPath || DEFAULT_FEEDBACK_FORM.relatedPath,
      }));
      await load();
    } finally {
      setFeedbackBusy(false);
    }
  };

  const changeFeedbackStatus = async (recordId, status) => {
    if (!recordId || !status) return;
    setFeedbackBusy(true);
    try {
      await api(`/api/pilot-launch-gate/field-feedback-loop/records/${recordId}/status`, {
        method: 'POST',
        body: { status, note: `Panelden durum güncellendi: ${status}` },
      });
      await load();
    } finally {
      setFeedbackBusy(false);
    }
  };

  const prepBlockerCount = Number(prepSummary.blockerCount || 0);
  const prepWarningCount = Number(prepSummary.warningCount || 0);
  const feedbackCriticalCount = Number(feedbackSummary.criticalOpenCount || 0);
  const acceptanceChecklist = Array.isArray(acceptanceSession?.checklist)
    ? acceptanceSession.checklist
    : Array.isArray(acceptanceManifest?.checklist)
      ? acceptanceManifest.checklist
      : [];
  const hasBlockingIssue = prepBlockerCount > 0 || decisionLabel !== "GO";
  const hasRiskIssue = riskCount > 0 || prepWarningCount > 0 || feedbackCriticalCount > 0;
  const fieldDispatchBandText = hasBlockingIssue
    ? `Hazır değil veya onay gerekli · ${prepBlockerCount} blok • karar ${decisionLabel}`
    : hasRiskIssue
      ? `Risk / uyarı açık · ${riskCount} risk • ${prepWarningCount} uyarı`
      : `Hazırlık ve onay hattı şu anda açık görünüyor.`;
  const fieldDispatchBandDescription = hasBlockingIssue
    ? "Karar ve hazırlık sinyallerini Onay & Çıkış ve Hazırlık Kontrolü tablarında birlikte incele."
    : hasRiskIssue
      ? "Eksikler, riskler ve saha geri bildirimleri detay tablarına taşındı."
      : "Özet karar için hazırlık ve geçmiş sekmeleri yeterli görünüyor.";
  const fieldDispatchBandTarget = hasBlockingIssue
    ? "decision"
    : hasRiskIssue
      ? (riskCount > 0 ? "risks" : "feedback")
      : "overview";
  const fieldDispatchTabs = [
    { key: "overview", label: "Özet", badge: null },
    { key: "prep", label: "Hazırlık Kontrolü", badge: (Array.isArray(fieldPrep?.envChecks) ? fieldPrep.envChecks.length : 0) + (Array.isArray(fieldPrep?.operatorSequence) ? fieldPrep.operatorSequence.length : 0) + (Array.isArray(fieldPrep?.scenarios) ? fieldPrep.scenarios.length : 0) + (Array.isArray(fieldPrep?.roleDeviceChecklist) ? fieldPrep.roleDeviceChecklist.length : 0) },
    { key: "decision", label: "Onay & Çıkış", badge: decisionLabel === "GO" ? null : 1 },
    { key: "risks", label: "Eksikler & Riskler", badge: riskCount + prepBlockerCount + prepWarningCount || null },
    { key: "feedback", label: "Geri Bildirimler", badge: (Array.isArray(feedbackRecords) ? feedbackRecords.length : 0) + (Array.isArray(feedbackPacket?.roleCoverage) ? feedbackPacket.roleCoverage.length : 0) },
    { key: "history", label: "Geçmiş / Log", badge: (Array.isArray(feedbackPacket?.notes) ? feedbackPacket.notes.length : 0) + 3 },
  ];

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Sahaya Çıkış Kontrolü"
        subtitle="Sahaya çıkıştan önce son kararı, bloklayan riskleri, saha hazırlık paketini ve saha geri bildirim döngüsünü tek yerde toplar."
        actions={(
          <button className="btn" onClick={load} disabled={decisionBusy || riskBusy || feedbackBusy}>Yenile</button>
        )}
      />

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="panelSectionTitle">Kritik engel / hazır değil / onay gerekli</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>{fieldDispatchBandDescription}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Pill code={decisionLabel} />
            <span className="pill" data-status={hasBlockingIssue ? "WARN" : hasRiskIssue ? "INFO" : "SUCCESS"}>{fieldDispatchBandText}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn sm" onClick={() => setActiveTab(fieldDispatchBandTarget === "decision" ? "decision" : fieldDispatchBandTarget === "risks" ? "risks" : fieldDispatchBandTarget === "feedback" ? "feedback" : "overview")}>
            {fieldDispatchBandTarget === "decision" ? "Onay & Çıkış sekmesine git" : fieldDispatchBandTarget === "risks" ? "Eksikler & Riskler sekmesine git" : fieldDispatchBandTarget === "feedback" ? "Geri Bildirimler sekmesine git" : "Özet sekmesine git"}
          </button>
          {hasBlockingIssue ? <button className="btn sm" onClick={() => setActiveTab("prep")}>Hazırlık Kontrolü sekmesine git</button> : null}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SummaryCard title="Son karar" value={decisionLabel} note={decision?.reason || "Checklist tamamlanmadı"} />
        <SummaryCard title="Risk sayısı" value={String(riskCount)} note={riskCount ? "Açık riskler izlenmeli" : "Kritik risk görünmüyor"} />
        <SummaryCard title="Saha hazırlık" value={prepStage} note={fieldPrepErr || `${prepSummary.blockerCount || 0} blok • ${prepSummary.warningCount || 0} uyarı`} />
        <SummaryCard title="M84 saha döngüsü" value={feedbackStage} note={feedbackErr || `${feedbackSummary.openCount || 0} açık • ${feedbackSummary.repeatedCount || 0} tekrar`} />
      </div>

      <PanelSegmentTabs
        tabs={fieldDispatchTabs}
        value={activeTab}
        onChange={(tabKey) => setActiveTab(String(tabKey || "overview"))}
        ariaLabel="Sahaya Çıkış sekmeleri"
      />

      <TabPanel active={activeTab === "overview"} label="Özet">
        <Row title="Kritik risk listesi" text={riskSummary} />
        <Row title="Acceptance özetleri" text={acceptanceSummary} />
        <Row title="Gözlemleme sağlık özeti" text={healthSummaryText} />
        <Row title="Build / cihaz uygunluk özeti" text={buildText} />
        <Row title="GO / LIMITED GO / NO-GO" text={decisionText} />
      </TabPanel>

      <TabPanel active={activeTab === "prep"} label="Hazırlık Kontrolü">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div className="panelSectionTitle">Kapasite / hazırlık</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SummaryCard title="Hazır vardiya" value={String(prepCounters.readyShifts || 0)} note="Yakın penceredeki kabul edilen / aktif vardiyalar" />
            <SummaryCard title="Aktif araç" value={String(prepCounters.activeVehicles || 0)} note="Sahaya çıkabilecek aktif araç sayısı" />
            <SummaryCard title="Driver kullanıcı" value={String(prepCounters.driverUsers || 0)} note="Mobil tur için giriş yapabilecek sürücü hesabı" />
            <SummaryCard title="Aktif sözleşme" value={String(prepCounters.activeAgreements || 0)} note="Operasyonla ilişkili aktif / kabul edilen sözleşme görünürlüğü" />
          </div>
        </div>
        {fieldPrepErr ? <div style={{ color: "#ffb17b", whiteSpace: "pre-wrap" }}>{fieldPrepErr}</div> : null}
        <PrepList
          title="Launch checklist"
          items={acceptanceChecklist}
          renderDetail={(item) => `${item?.area || "-"} • ${item?.status || "-"}`}
        />
        <PrepList
          title="Canlı ortam ve release kontrolleri"
          items={fieldPrep?.envChecks}
          renderDetail={(item) => item?.status?.detail || item?.detail || "-"}
        />
        <PrepList
          title="Operatör uygulama sırası"
          items={fieldPrep?.operatorSequence}
          renderDetail={(item) => item?.detail || "-"}
        />
        <PrepList
          title="Gerçek saha senaryoları"
          items={fieldPrep?.scenarios}
          renderDetail={(item) => `${item?.success || "-"}${item?.status?.detail ? ` • ${item.status.detail}` : ""}`}
        />
        <PrepList
          title="Rol ve cihaz checklisti"
          items={fieldPrep?.roleDeviceChecklist}
          renderDetail={(item) => item?.detail || "-"}
        />
        <Row title="Açık bloklar" text={(fieldPrep?.blockers || []).join(" • ") || "Henüz blok listesi yok."} />
        <Row title="Kontrol edilmesi gereken uyarılar" text={(fieldPrep?.warnings || []).join(" • ") || "Ek uyarı görünmüyor."} />
        <Row title="Saha paket notları" text={(fieldPrep?.notes || []).join(" • ") || "Henüz saha paket notu yok."} />
      </TabPanel>

      <TabPanel active={activeTab === "decision"} label="Onay & Çıkış">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Karar kaydı</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>GO / LIMITED_GO / NO_GO kararını sahici state'e yazar.</div>
            </div>
            <Pill code={decisionForm.status} />
          </div>
          <select className="input" value={decisionForm.status} onChange={(e) => updateDecisionField("status", e.target.value)}>
            {DECISION_STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <input className="input" placeholder="Karar nedeni" value={decisionForm.reason} onChange={(e) => updateDecisionField("reason", e.target.value)} />
          <textarea className="input" rows={3} placeholder="Bloklayan maddeler (satır satır)" value={decisionForm.blockingItemsText} onChange={(e) => updateDecisionField("blockingItemsText", e.target.value)} />
          <textarea className="input" rows={3} placeholder="Notlar (satır satır)" value={decisionForm.notesText} onChange={(e) => updateDecisionField("notesText", e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="panelMeta">Son güncelleme: {decision?.updatedAt || "-"}</div>
            <button className="btn" onClick={saveDecision} disabled={decisionBusy}>{decisionBusy ? "Kaydediliyor..." : "Kararı kaydet"}</button>
          </div>
        </div>
        <Row title="GO / LIMITED GO / NO-GO" text={decisionText} />
      </TabPanel>

      <TabPanel active={activeTab === "risks"} label="Eksikler & Riskler">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Risk kaydı</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Gerçek riskleri listeler, düzenler ve kaldırır.</div>
            </div>
            <SeverityPill value={riskForm.severity} />
          </div>
          <input className="input" placeholder="Risk başlığı" value={riskForm.title} onChange={(e) => updateRiskField("title", e.target.value)} />
          <textarea className="input" rows={3} placeholder="Risk detayı" value={riskForm.detail} onChange={(e) => updateRiskField("detail", e.target.value)} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <select className="input" value={riskForm.severity} onChange={(e) => updateRiskField("severity", e.target.value)}>
              {RISK_SEVERITY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <select className="input" value={riskForm.status} onChange={(e) => updateRiskField("status", e.target.value)}>
              {RISK_STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <select className="input" value={riskForm.owner} onChange={(e) => updateRiskField("owner", e.target.value)}>
              {FEEDBACK_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="panelMeta">{riskForm.id ? `Düzenlenen risk: ${riskForm.id}` : "Yeni risk kaydı oluşturuluyor."}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={saveRisk} disabled={riskBusy || !String(riskForm.title || "").trim()}>{riskBusy ? "Kaydediliyor..." : "Riski kaydet"}</button>
              <button className="btn" onClick={clearRiskForm} disabled={riskBusy}>{riskForm.id ? "Düzenlemeyi bırak" : "Temizle"}</button>
            </div>
          </div>
        </div>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="panelSectionTitle">Kayıtlı riskler</div>
            <div className="panelMeta">{riskCount} kayıt</div>
          </div>
          {riskCount ? risks.map((item) => (
            <div key={item.id} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="panelSectionTitle">{item.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <SeverityPill value={item.severity} />
                  <Pill code={item.status} />
                </div>
              </div>
              <div className="panelBody">{item.detail || "Detay girilmemiş."}</div>
              <div className="panelMeta">Sorumlu: {item.owner} • Son güncelleme: {item.updatedAt || "-"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn sm" onClick={() => editRisk(item)} disabled={riskBusy}>Düzenle</button>
                <button className="btn sm" onClick={() => removeRisk(item.id)} disabled={riskBusy}>Sil</button>
              </div>
            </div>
          )) : <div className="muted">Henüz risk kaydı yok.</div>}
        </div>
        <Row title="Kritik risk listesi" text={riskSummary} />
        <Row title="Açık bloklar" text={(fieldPrep?.blockers || []).join(" • ") || "Henüz blok listesi yok."} />
        <Row title="Kontrol edilmesi gereken uyarılar" text={(fieldPrep?.warnings || []).join(" • ") || "Ek uyarı görünmüyor."} />
        <Row title="Saha paket notları" text={(fieldPrep?.notes || []).join(" • ") || "Henüz saha paket notu yok."} />
      </TabPanel>

      <TabPanel active={activeTab === "feedback"} label="Geri Bildirimler">
        <div className="card" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="panelSectionTitle">Saha gözlem / geri bildirim döngüsü</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Durum akışı: görüldü → tekrarlandı → çözüldü → kapandı.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Pill code={feedbackStage} />
            </div>
          </div>

          {feedbackErr ? <div style={{ color: "#ffb17b", whiteSpace: "pre-wrap" }}>{feedbackErr}</div> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SummaryCard title="Açık kayıt" value={String(feedbackSummary.openCount || 0)} note="Görüldü durumundaki kayıtlar" />
            <SummaryCard title="Tekrarlandı" value={String(feedbackSummary.repeatedCount || 0)} note="Sahada yeniden üreyen kayıtlar" />
            <SummaryCard title="Çözüldü" value={String(feedbackSummary.resolvedCount || 0)} note="Henüz kapanmayan ama düzeltilen kayıtlar" />
            <SummaryCard title="Kapandı" value={String(feedbackSummary.closedCount || 0)} note="Doğrulanıp kapanan kayıtlar" />
          </div>

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <div className="panelSectionTitle">Yeni saha geri bildirimi ekle</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <input className="input" placeholder="Başlık" value={feedbackForm.title} onChange={(e) => updateFeedbackField("title", e.target.value)} />
              <select className="input" value={feedbackForm.reportedByRole} onChange={(e) => updateFeedbackField("reportedByRole", e.target.value)}>
                {FEEDBACK_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="input" value={feedbackForm.ownerRole} onChange={(e) => updateFeedbackField("ownerRole", e.target.value)}>
                {FEEDBACK_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="input" value={feedbackForm.surface} onChange={(e) => updateFeedbackField("surface", e.target.value)}>
                {feedbackSurfaces.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className="input" value={feedbackForm.severity} onChange={(e) => updateFeedbackField("severity", e.target.value)}>
                {feedbackSeverities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className="input" value={feedbackForm.status} onChange={(e) => updateFeedbackField("status", e.target.value)}>
                {feedbackStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className="input" value={feedbackForm.scenarioId} onChange={(e) => updateFeedbackField("scenarioId", e.target.value)}>
                <option value="">Senaryo seç</option>
                {(fieldPrep?.scenarios || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <input className="input" placeholder="İlgili yol / ekran" value={feedbackForm.relatedPath} onChange={(e) => updateFeedbackField("relatedPath", e.target.value)} />
            </div>
            <textarea className="input" rows={4} placeholder="Detay / gözlem" value={feedbackForm.detail} onChange={(e) => updateFeedbackField("detail", e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="panelMeta">Bu kayıt backend üstünde saklanır; tarayıcı local state tek kaynak değildir.</div>
              <button className="btn" onClick={submitFeedback} disabled={feedbackBusy || !String(feedbackForm.title || "").trim() || !String(feedbackForm.detail || "").trim()}>{feedbackBusy ? "Kaydediliyor..." : "Kaydı ekle"}</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SummaryCard title="Kritik açık" value={String(feedbackSummary.criticalOpenCount || 0)} note="High/Critical ve açık durumda kalan kayıtlar" />
            <SummaryCard title="Toplam kayıt" value={String(feedbackSummary.total || 0)} note={feedbackSummary.lastUpdatedAt ? `Son güncelleme: ${feedbackSummary.lastUpdatedAt}` : "Henüz kayıt yok"} />
            <SummaryCard title="Bölüm sayısı" value={String(sectionsCount)} note="Saha öncesi son karar kapısı" />
          </div>

          <PrepList
            title="Rol kapsaması"
            items={feedbackPacket?.roleCoverage?.map((item) => ({ ...item, title: item.roleId }))}
            renderDetail={(item) => `${item?.count || 0} kayıt${item?.lastUpdatedAt ? ` • son: ${item.lastUpdatedAt}` : ""}`}
          />
          <PrepList
            title="Yüzey kapsaması"
            items={feedbackPacket?.surfaceCoverage?.map((item) => ({ ...item, title: item.label }))}
            renderDetail={(item) => `${item?.count || 0} kayıt`}
          />

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div className="panelSectionTitle">Son saha kayıtları</div>
              <div className="panelMeta">{feedbackRecords.length} kayıt</div>
            </div>
            {feedbackRecords.length ? feedbackRecords.map((item) => (
              <div key={item.id} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div className="panelSectionTitle">{item.title}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <SeverityPill value={item.severity} />
                    <Pill code={item.status} />
                  </div>
                </div>
                <div className="panelMeta">{item.detail}</div>
                <div className="panelMeta">Rol: {item.reportedByRole} • Sorumlu: {item.ownerRole} • Yüzey: {item.surface}{item.relatedPath ? ` • Yol: ${item.relatedPath}` : ""}{item.scenarioId ? ` • Senaryo: ${item.scenarioId}` : ""}</div>
                <div className="panelMeta">Son güncelleyen: {item.lastUpdatedByEmail || "-"} • {item.updatedAt || "-"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn sm" disabled={feedbackBusy || item.status === "TEKRARLANDI"} onClick={() => changeFeedbackStatus(item.id, "TEKRARLANDI")}>Tekrarlandı</button>
                  <button className="btn sm" disabled={feedbackBusy || item.status === "COZULDU"} onClick={() => changeFeedbackStatus(item.id, "COZULDU")}>Çözüldü</button>
                  <button className="btn sm" disabled={feedbackBusy || item.status === "KAPANDI"} onClick={() => changeFeedbackStatus(item.id, "KAPANDI")}>Kapandı</button>
                </div>
              </div>
            )) : <div className="muted">Henüz saha geri bildirimi yok.</div>}
          </div>
        </div>
      </TabPanel>

      <TabPanel active={activeTab === "history"} label="Geçmiş / Log">
        <Row title="Acceptance özetleri" text={acceptanceSummary} />
        <Row title="Gözlemleme sağlık özeti" text={healthSummaryText} />
        <Row title="Build / cihaz uygunluk özeti" text={buildText} />
        <Row title="M84 bloklar" text={(feedbackPacket?.blockers || []).join(" • ") || "Aktif kritik saha bloğu görünmüyor."} />
        <Row title="M84 uyarılar" text={(feedbackPacket?.warnings || []).join(" • ") || "Tekrarlayan uyarı görünmüyor."} />
        <Row title="M84 notları" text={(feedbackPacket?.notes || []).join(" • ") || "Henüz M84 notu yok."} />
      </TabPanel>
    </div>
  );
}
