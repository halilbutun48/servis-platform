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

function Pill({ code }) {
  const safe = String(code || "CHECK").toUpperCase();
  const bg = safe === "READY" || safe === "STABLE" ? "rgba(70,180,120,0.18)" : safe === "BLOCK" || safe === "ACTION_REQUIRED" ? "rgba(220,80,80,0.18)" : safe === "WARN" || safe === "TRACKING" ? "rgba(255,180,90,0.18)" : "rgba(130,150,255,0.18)";
  return <span className="pill" style={{ background: bg }}>{safe}</span>;
}

function SeverityPill({ value }) {
  const safe = String(value || "MEDIUM").toUpperCase();
  const bg = safe === "CRITICAL" ? "rgba(220,80,80,0.22)" : safe === "HIGH" ? "rgba(255,180,90,0.22)" : safe === "LOW" ? "rgba(80,180,120,0.18)" : "rgba(130,150,255,0.18)";
  return <span className="pill" style={{ background: bg }}>{safe}</span>;
}

function PrepList({ title, items, renderDetail }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div className="muted">{safeItems.length} kayıt</div>
      </div>
      {safeItems.length ? safeItems.map((item, idx) => (
        <div key={item?.id || item?.roleId || item?.surfaceId || idx} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>{item?.title || item?.label || item?.roleId || `Kayıt ${idx + 1}`}</div>
            {item?.status?.code ? <Pill code={item.status.code} /> : null}
          </div>
          {item?.owner ? <div className="muted">Sorumlu: {item.owner}</div> : null}
          {item?.surface ? <div className="muted">Yüzey: {item.surface}</div> : null}
          <div className="muted">{renderDetail ? renderDetail(item) : (item?.detail || item?.success || "-")}</div>
        </div>
      )) : <div className="muted">Henüz kayıt yok.</div>}
    </div>
  );
}

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

export default function PilotLaunchGatePanel() {
  const [manifest, setManifest] = useState(null);
  const [decision, setDecision] = useState(null);
  const [risks, setRisks] = useState([]);
  const [acceptanceManifest, setAcceptanceManifest] = useState(null);
  const [acceptanceSession, setAcceptanceSession] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);
  const [fieldPrep, setFieldPrep] = useState(null);
  const [fieldPrepErr, setFieldPrepErr] = useState("");
  const [feedbackPacket, setFeedbackPacket] = useState(null);
  const [feedbackErr, setFeedbackErr] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_FEEDBACK_FORM);

  const load = async () => {
    const [m, d, r, am, as, hs, fp, fl] = await Promise.all([
      api('/api/pilot-launch-gate/manifest').catch(() => null),
      api('/api/pilot-launch-gate/decision-template').catch(() => null),
      api('/api/pilot-launch-gate/risk-template').catch(() => null),
      api('/api/field-acceptance/manifest').catch(() => null),
      api('/api/field-acceptance/session-template').catch(() => null),
      api('/api/observability/health-summary').catch(() => null),
      api('/api/pilot-launch-gate/field-prep-packet').catch((e) => ({ __error: e })),
      api('/api/pilot-launch-gate/field-feedback-loop').catch((e) => ({ __error: e })),
    ]);
    setManifest(m?.manifest || null);
    setDecision(d?.decision || null);
    setRisks(Array.isArray(r?.risks) ? r.risks : []);
    setAcceptanceManifest(am || null);
    setAcceptanceSession(as || null);
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

  const updateFeedbackField = (key, value) => {
    setFeedbackForm((prev) => ({ ...prev, [key]: value }));
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

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Sahaya Çıkış Kontrolü</h2>
          <div className="muted" style={{ marginTop: 6 }}>Sahaya çıkıştan önce son kararı, bloklayan riskleri, saha hazırlık paketini ve saha geri bildirim döngüsünü tek yerde toplar.</div>
        </div>
        <button className="btn" onClick={load} disabled={feedbackBusy}>Yenile</button>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SummaryCard title="Son karar" value={decisionLabel} note={decision?.reason || "Checklist tamamlanmadı"} />
        <SummaryCard title="Risk sayısı" value={String(riskCount)} note={riskCount ? "Açık riskler izlenmeli" : "Kritik risk görünmüyor"} />
        <SummaryCard title="Saha hazırlık" value={prepStage} note={fieldPrepErr || `${prepSummary.blockerCount || 0} blok • ${prepSummary.warningCount || 0} uyarı`} />
        <SummaryCard title="M84 saha döngüsü" value={feedbackStage} note={feedbackErr || `${feedbackSummary.openCount || 0} açık • ${feedbackSummary.repeatedCount || 0} tekrar`} />
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <Row title="Launch checklist" text={totalChecklist ? `${passChecklist}/${totalChecklist} madde tamamlandı.` : "Henüz checklist verisi yok."} />
        <Row title="Kritik risk listesi" text={riskSummary} />
        <Row title="Acceptance özetleri" text={acceptanceSummary} />
        <Row title="Gözlemleme sağlık özeti" text={healthSummaryText} />
        <Row title="Build / cihaz uygunluk özeti" text={buildText} />
        <Row title="GO / LIMITED GO / NO-GO" text={decisionText} />
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SummaryCard title="Hazır vardiya" value={String(prepCounters.readyShifts || 0)} note="Yakın penceredeki APPROVED/ACTIVE vardiyalar" />
        <SummaryCard title="Aktif araç" value={String(prepCounters.activeVehicles || 0)} note="Sahaya çıkabilecek aktif araç sayısı" />
        <SummaryCard title="Driver kullanıcı" value={String(prepCounters.driverUsers || 0)} note="Mobil tur için giriş yapabilecek sürücü hesabı" />
        <SummaryCard title="Aktif sözleşme" value={String(prepCounters.activeAgreements || 0)} note="Operasyonla ilişkili aktif/approved sözleşme görünürlüğü" />
      </div>

      {fieldPrepErr ? <div style={{ marginTop: 14, color: "#ffb17b", whiteSpace: "pre-wrap" }}>{fieldPrepErr}</div> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <PrepList
          title="Canlı ortam ve release kontrolleri"
          items={fieldPrep?.envChecks}
          renderDetail={(item) => item?.status?.detail || item?.detail || '-'}
        />
        <PrepList
          title="Operatör uygulama sırası"
          items={fieldPrep?.operatorSequence}
          renderDetail={(item) => item?.detail || '-'}
        />
        <PrepList
          title="Gerçek saha senaryoları"
          items={fieldPrep?.scenarios}
          renderDetail={(item) => `${item?.success || '-'}${item?.status?.detail ? ` • ${item.status.detail}` : ''}`}
        />
        <PrepList
          title="Rol ve cihaz checklisti"
          items={fieldPrep?.roleDeviceChecklist}
          renderDetail={(item) => item?.detail || '-'}
        />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <Row title="Açık bloklar" text={(fieldPrep?.blockers || []).join(' • ') || 'Henüz blok listesi yok.'} />
        <Row title="Kontrol edilmesi gereken uyarılar" text={(fieldPrep?.warnings || []).join(' • ') || 'Ek uyarı görünmüyor.'} />
        <Row title="Saha paket notları" text={(fieldPrep?.notes || []).join(' • ') || 'Henüz saha paket notu yok.'} />
      </div>

      <div className="card" style={{ marginTop: 18, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Saha gözlem / geri bildirim döngüsü</div>
            <div className="muted" style={{ marginTop: 6 }}>Durum akışı: görüldü → tekrarlandı → çözüldü → kapandı.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Pill code={feedbackStage} />
          </div>
        </div>

        {feedbackErr ? <div style={{ color: '#ffb17b', whiteSpace: 'pre-wrap' }}>{feedbackErr}</div> : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SummaryCard title="Açık kayıt" value={String(feedbackSummary.openCount || 0)} note="Görüldü durumundaki kayıtlar" />
          <SummaryCard title="Tekrarlandı" value={String(feedbackSummary.repeatedCount || 0)} note="Sahada yeniden üreyen kayıtlar" />
          <SummaryCard title="Çözüldü" value={String(feedbackSummary.resolvedCount || 0)} note="Henüz kapanmayan ama düzeltilen kayıtlar" />
          <SummaryCard title="Kapandı" value={String(feedbackSummary.closedCount || 0)} note="Doğrulanıp kapanan kayıtlar" />
        </div>

        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Yeni saha geri bildirimi ekle</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <input className="input" placeholder="Başlık" value={feedbackForm.title} onChange={(e) => updateFeedbackField('title', e.target.value)} />
            <select className="input" value={feedbackForm.reportedByRole} onChange={(e) => updateFeedbackField('reportedByRole', e.target.value)}>
              {['SUPER_ADMIN','ROOM','COMPANY','DRIVER'].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <select className="input" value={feedbackForm.ownerRole} onChange={(e) => updateFeedbackField('ownerRole', e.target.value)}>
              {['SUPER_ADMIN','ROOM','COMPANY','DRIVER'].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <select className="input" value={feedbackForm.surface} onChange={(e) => updateFeedbackField('surface', e.target.value)}>
              {feedbackSurfaces.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="input" value={feedbackForm.severity} onChange={(e) => updateFeedbackField('severity', e.target.value)}>
              {feedbackSeverities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="input" value={feedbackForm.status} onChange={(e) => updateFeedbackField('status', e.target.value)}>
              {feedbackStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="input" value={feedbackForm.scenarioId} onChange={(e) => updateFeedbackField('scenarioId', e.target.value)}>
              <option value="">Senaryo seç</option>
              {(fieldPrep?.scenarios || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <input className="input" placeholder="İlgili yol / ekran" value={feedbackForm.relatedPath} onChange={(e) => updateFeedbackField('relatedPath', e.target.value)} />
          </div>
          <textarea className="input" rows={4} placeholder="Detay / gözlem" value={feedbackForm.detail} onChange={(e) => updateFeedbackField('detail', e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="muted">Bu kayıt backend üstünde saklanır; tarayıcı local state tek kaynak değildir.</div>
            <button className="btn" onClick={submitFeedback} disabled={feedbackBusy || !String(feedbackForm.title || '').trim() || !String(feedbackForm.detail || '').trim()}>{feedbackBusy ? 'Kaydediliyor...' : 'Kaydı ekle'}</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SummaryCard title="Kritik açık" value={String(feedbackSummary.criticalOpenCount || 0)} note="High/Critical ve açık durumda kalan kayıtlar" />
          <SummaryCard title="Toplam kayıt" value={String(feedbackSummary.total || 0)} note={feedbackSummary.lastUpdatedAt ? `Son güncelleme: ${feedbackSummary.lastUpdatedAt}` : 'Henüz kayıt yok'} />
          <SummaryCard title="Bölüm sayısı" value={String(sectionsCount)} note="Saha öncesi son karar kapısı" />
        </div>

        <PrepList
          title="Rol kapsaması"
          items={feedbackPacket?.roleCoverage?.map((item) => ({ ...item, title: item.roleId }))}
          renderDetail={(item) => `${item?.count || 0} kayıt${item?.lastUpdatedAt ? ` • son: ${item.lastUpdatedAt}` : ''}`}
        />
        <PrepList
          title="Yüzey kapsaması"
          items={feedbackPacket?.surfaceCoverage?.map((item) => ({ ...item, title: item.label }))}
          renderDetail={(item) => `${item?.count || 0} kayıt`}
        />

        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>Son saha kayıtları</div>
            <div className="muted">{feedbackRecords.length} kayıt</div>
          </div>
          {feedbackRecords.length ? feedbackRecords.map((item) => (
            <div key={item.id} style={{ padding: 12, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <SeverityPill value={item.severity} />
                  <Pill code={item.status} />
                </div>
              </div>
              <div className="muted">{item.detail}</div>
              <div className="muted">Rol: {item.reportedByRole} • Sorumlu: {item.ownerRole} • Yüzey: {item.surface}{item.relatedPath ? ` • Yol: ${item.relatedPath}` : ''}{item.scenarioId ? ` • Senaryo: ${item.scenarioId}` : ''}</div>
              <div className="muted">Son güncelleyen: {item.lastUpdatedByEmail || '-'} • {item.updatedAt || '-'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm" disabled={feedbackBusy || item.status === 'TEKRARLANDI'} onClick={() => changeFeedbackStatus(item.id, 'TEKRARLANDI')}>Tekrarlandı</button>
                <button className="btn sm" disabled={feedbackBusy || item.status === 'COZULDU'} onClick={() => changeFeedbackStatus(item.id, 'COZULDU')}>Çözüldü</button>
                <button className="btn sm" disabled={feedbackBusy || item.status === 'KAPANDI'} onClick={() => changeFeedbackStatus(item.id, 'KAPANDI')}>Kapandı</button>
              </div>
            </div>
          )) : <div className="muted">Henüz saha geri bildirimi yok.</div>}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Row title="M84 bloklar" text={(feedbackPacket?.blockers || []).join(' • ') || 'Aktif kritik saha bloğu görünmüyor.'} />
          <Row title="M84 uyarılar" text={(feedbackPacket?.warnings || []).join(' • ') || 'Tekrarlayan uyarı görünmüyor.'} />
          <Row title="M84 notları" text={(feedbackPacket?.notes || []).join(' • ') || 'Henüz M84 notu yok.'} />
        </div>
      </div>
    </div>
  );
}
