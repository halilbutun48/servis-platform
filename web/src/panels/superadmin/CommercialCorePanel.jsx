import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { Card, fmtBps, fmtDateTime, InputRow, stripHtmlNoise } from "./commercialCorePanelShared";
import { readOptional } from "./commercialCorePanelOptionalStates";
import { buildPaymentSourceQuery } from "./commercialCorePanelUtils";
import { createCommercialCorePanelActions } from "./commercialCorePanelActions";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildCommercialCoreCopilotFacts } from "../../utils/copilotFacts";
import { useSession } from "../../state/session";
import OperationProofReadonlyBadge from "../../components/OperationProofReadonlyBadge";
import PaymentReadinessReadonlyCard from "../../components/PaymentReadinessReadonlyCard";
import PaymentPreviewReadonlyCard from "../../components/PaymentPreviewReadonlyCard";
import PaymentReadonlySafetyBadge from "../../components/PaymentReadonlySafetyBadge";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CollapsibleSection from "../../components/CollapsibleSection";
import { getOperationProofSummary, getPaymentBackboneReadinessPreview } from "../../api";

export default function CommercialCorePanel() {
  const { token } = useSession();
  const [manifest, setManifest] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [paymentBackbone, setPaymentBackbone] = useState(null);
  const [settings, setSettings] = useState(null);
  const [pilotStatus, setPilotStatus] = useState(null);
  const [pilotCandidatesMeta, setPilotCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [pilotCandidates, setPilotCandidates] = useState([]);
  const [requiredStatus, setRequiredStatus] = useState(null);
  const [requiredCandidatesMeta, setRequiredCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [requiredCandidates, setRequiredCandidates] = useState([]);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountCandidatesMeta, setAccountCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [accountCandidates, setAccountCandidates] = useState([]);
  const [settlementStatus, setSettlementStatus] = useState(null);
  const [settlementQueueMeta, setSettlementQueueMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [settlementQueue, setSettlementQueue] = useState([]);
  const [reconciliationStatus, setReconciliationStatus] = useState(null);
  const [reconciliationQueueMeta, setReconciliationQueueMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [reconciliationQueue, setReconciliationQueue] = useState([]);
  const [paymentSourcesMeta, setPaymentSourcesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [paymentSources, setPaymentSources] = useState([]);
  const [paymentPreviewSummary, setPaymentPreviewSummary] = useState(null);
  const [operationProofSummary, setOperationProofSummary] = useState(null);
  const [viewTab, setViewTab] = useState("summary");
  const tabSectionRefs = useRef({});
  const [rooms, setRooms] = useState([]);
  const [roomQuery, setRoomQuery] = useState("");
  const [paymentSourceFilters, setPaymentSourceFilters] = useState({
    sourceType: "ALL",
    paymentMode: "ALL",
    settlementStatus: "ALL",
    companyId: "",
    roomId: "",
    q: "",
    from: "",
    to: "",
  });
  const [globalForm, setGlobalForm] = useState({ paymentMode: "OFF", commissionBps: 0, note: "" });
  const [roomForm, setRoomForm] = useState({ roomId: "", paymentMode: "OFF", commissionBps: 0, note: "" });
  const [accountForm, setAccountForm] = useState({ ownerType: "COMPANY", ownerId: "", providerKey: "DORMANT", status: "INACTIVE", label: "", maskedIban: "", accountRef: "", note: "" });
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const [m, l, pbRes, cfgRes, pilotRes, pilotCandidatesRes, requiredRes, requiredCandidatesRes, accountStatusRes, accountCandidatesRes, settlementStatusRes, settlementQueueRes, reconciliationStatusRes, reconciliationQueueRes, paymentSourcesRes, roomRes, previewRes, opProofRes] = await Promise.all([
        api("/api/commercial-core/manifest"),
        api("/api/commercial-core/lifecycle-template"),
        readOptional("/api/commercial-core/payment-backbone/status", "paymentBackbone"),
        readOptional("/api/commercial-core/payment-backbone/settings", "settings"),
        readOptional("/api/commercial-core/payment-backbone/pilot/status", "pilotStatus"),
        readOptional("/api/commercial-core/payment-backbone/pilot/candidates?take=30", "pilotCandidates"),
        readOptional("/api/commercial-core/payment-backbone/required/status", "requiredStatus"),
        readOptional("/api/commercial-core/payment-backbone/required/candidates?take=30", "requiredCandidates"),
        readOptional("/api/commercial-core/payment-backbone/accounts/status", "accountStatus"),
        readOptional("/api/commercial-core/payment-backbone/accounts/candidates?take=30", "accountCandidates"),
        readOptional("/api/commercial-core/payment-backbone/settlement/status", "settlementStatus"),
        readOptional("/api/commercial-core/payment-backbone/settlement/queue?take=40", "settlementQueue"),
        readOptional("/api/commercial-core/payment-backbone/reconciliation/status", "reconciliationStatus"),
        readOptional("/api/commercial-core/payment-backbone/reconciliation/queue?take=40", "reconciliationQueue"),
        readOptional(`/api/commercial-core/payment-backbone/sources?${buildPaymentSourceQuery(paymentSourceFilters, 20).toString()}`, "paymentSources"),
        readOptional("/api/rooms?take=500", "rooms"),
        getPaymentBackboneReadinessPreview({}, { token }).catch(() => null),
        getOperationProofSummary({}, { token }).catch(() => null),
      ]);
      const pb = pbRes?.data || null;
      const cfg = cfgRes?.data || null;
      const pilot = pilotRes?.data || null;
      const pilotItems = pilotCandidatesRes?.ok ? (pilotCandidatesRes?.data?.items || []) : [];
      const required = requiredRes?.data || null;
      const requiredItems = requiredCandidatesRes?.ok ? (requiredCandidatesRes?.data?.items || []) : [];
      const accounts = accountStatusRes?.data || null;
      const accountItems = accountCandidatesRes?.ok ? (accountCandidatesRes?.data?.items || []) : [];
      const settlement = settlementStatusRes?.data || null;
      const settlementItems = settlementQueueRes?.ok ? (settlementQueueRes?.data?.items || []) : [];
      const reconciliation = reconciliationStatusRes?.data || null;
      const reconciliationItems = reconciliationQueueRes?.ok ? (reconciliationQueueRes?.data?.items || []) : [];
      const paymentSourcesData = paymentSourcesRes?.data || null;
      const paymentSourceItems = paymentSourcesRes?.ok ? (paymentSourcesData?.items || []) : [];
      const roomItems = roomRes?.ok ? (roomRes?.data?.items || []) : [];
      setManifest(m || null);
      setLifecycle(l || null);
      setPaymentBackbone(pb);
      setSettings(cfg);
      setPilotStatus(pilot);
      setPilotCandidatesMeta(pilotCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (pilotCandidatesRes?.data || { endpointStatus: "missing", summary: "Opsiyonel pilot aday endpointi okunamadı." }));
      setPilotCandidates(pilotItems);
      setRequiredStatus(required);
      setRequiredCandidatesMeta(requiredCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (requiredCandidatesRes?.data || { endpointStatus: "missing", summary: "Zorunlu rollout aday endpointi okunamadı." }));
      setRequiredCandidates(requiredItems);
      setAccountStatus(accounts);
      setAccountCandidatesMeta(accountCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (accountCandidatesRes?.data || { endpointStatus: "missing", summary: "Ödeme hesabı aday endpointi okunamadı." }));
      setAccountCandidates(accountItems);
      setSettlementStatus(settlement);
      setSettlementQueueMeta(settlementQueueRes?.ok ? { endpointStatus: "ok", summary: "" } : (settlementQueueRes?.data || { endpointStatus: "missing", summary: "Settlement operasyon kuyruğu endpointi okunamadı." }));
      setSettlementQueue(settlementItems);
      setReconciliationStatus(reconciliation);
      setReconciliationQueueMeta(reconciliationQueueRes?.ok ? { endpointStatus: "ok", summary: "" } : (reconciliationQueueRes?.data || { endpointStatus: "missing", summary: "Settlement mutabakat kuyruğu endpointi okunamadı." }));
      setReconciliationQueue(reconciliationItems);
      setPaymentSourcesMeta(paymentSourcesRes?.ok ? { endpointStatus: "ok", total: paymentSourcesData?.summary?.total ?? paymentSourceItems.length, summary: paymentSourcesData?.summary?.total != null ? `${paymentSourcesData.summary.total} kaynak` : "" } : (paymentSourcesRes?.data || { endpointStatus: "missing", summary: "Ödeme kaynakları endpointi okunamadı." }));
      setPaymentSources(paymentSourceItems);
      setPaymentPreviewSummary(previewRes?.data || previewRes || null);
      setOperationProofSummary(opProofRes?.data || opProofRes || null);
      setRooms(roomItems);
      setGlobalForm({
        paymentMode: cfg?.globalRule?.paymentMode || "OFF",
        commissionBps: Number(cfg?.globalRule?.commissionBps || 0),
        note: cfg?.globalRule?.note || "",
      });
      if (!pbRes?.ok || !cfgRes?.ok || !pilotRes?.ok || !pilotCandidatesRes?.ok || !requiredRes?.ok || !requiredCandidatesRes?.ok || !accountStatusRes?.ok || !accountCandidatesRes?.ok || !settlementStatusRes?.ok || !settlementQueueRes?.ok || !reconciliationStatusRes?.ok || !reconciliationQueueRes?.ok || !paymentSourcesRes?.ok) {
        const reasons = [];
        if (!pbRes?.ok) reasons.push(pbRes?.status === 403 ? "payment backbone özeti step-up bekliyor" : "payment backbone özeti endpointi bulunamadı");
        if (!cfgRes?.ok) reasons.push(cfgRes?.status === 403 ? "ticari ayarlar step-up bekliyor" : "ticari ayarlar endpointi bulunamadı");
        if (!pilotRes?.ok) reasons.push(pilotRes?.status === 403 ? "opsiyonel ödeme pilot özeti step-up bekliyor" : "opsiyonel ödeme pilot özeti endpointi bulunamadı");
        if (!pilotCandidatesRes?.ok) reasons.push(pilotCandidatesRes?.status === 403 ? "opsiyonel ödeme pilot aday listesi step-up bekliyor" : "opsiyonel ödeme pilot aday listesi endpointi bulunamadı");
        if (!requiredRes?.ok) reasons.push(requiredRes?.status === 403 ? "zorunlu ödeme rollout özeti step-up bekliyor" : "zorunlu ödeme rollout özeti endpointi bulunamadı");
        if (!requiredCandidatesRes?.ok) reasons.push(requiredCandidatesRes?.status === 403 ? "zorunlu ödeme rollout aday listesi step-up bekliyor" : "zorunlu ödeme rollout aday listesi endpointi bulunamadı");
        if (!accountStatusRes?.ok) reasons.push(accountStatusRes?.status === 403 ? "Ödeme hesabı hazırlık özeti step-up bekliyor" : "Ödeme hesabı hazırlık özeti endpointi bulunamadı");
        if (!accountCandidatesRes?.ok) reasons.push(accountCandidatesRes?.status === 403 ? "Ödeme hesabı aday listesi step-up bekliyor" : "Ödeme hesabı aday listesi endpointi bulunamadı");
        if (!settlementStatusRes?.ok) reasons.push(settlementStatusRes?.status === 403 ? "Settlement operasyon özeti step-up bekliyor" : "Settlement operasyon özeti endpointi bulunamadı");
        if (!settlementQueueRes?.ok) reasons.push(settlementQueueRes?.status === 403 ? "Settlement operasyon kuyruğu step-up bekliyor" : "Settlement operasyon kuyruğu endpointi bulunamadı");
        if (!reconciliationStatusRes?.ok) reasons.push(reconciliationStatusRes?.status === 403 ? "Settlement mutabakat özeti step-up bekliyor" : "Settlement mutabakat özeti endpointi bulunamadı");
        if (!reconciliationQueueRes?.ok) reasons.push(reconciliationQueueRes?.status === 403 ? "Settlement mutabakat kuyruğu step-up bekliyor" : "Settlement mutabakat kuyruğu endpointi bulunamadı");
        if (!paymentSourcesRes?.ok) reasons.push(paymentSourcesRes?.status === 403 ? "Ödeme kaynakları step-up bekliyor" : "Ödeme kaynakları endpointi bulunamadı");
        setErr(reasons.join(" • "));
      }
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    }
  }, [paymentSourceFilters, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const steps = manifest?.steps || [];
  const activeSteps = steps.filter((item) => String(item?.status || "").toUpperCase() === "ACTIVE");
  const plannedSteps = steps.filter((item) => String(item?.status || "").toUpperCase() === "PLANNED");
  const route = lifecycle?.route || [];
  const cards = paymentBackbone?.cards || {};
  const activeRule = paymentBackbone?.activeRule || null;
  const roomOverrides = settings?.roomOverrides || [];
  const activationGate = paymentBackbone?.activationGate || settings?.activationGate || null;
  const activationChecklist = paymentBackbone?.activationChecklist || settings?.activationChecklist || [];
  const paymentBackboneEndpointStatus = String(paymentBackbone?.endpointStatus || "ok");
  const settingsEndpointStatus = String(settings?.endpointStatus || "ok");
  const pilotEndpointStatus = String(pilotStatus?.endpointStatus || "ok");
  const pilotCandidatesEndpointStatus = String(pilotCandidatesMeta?.endpointStatus || "ok");
  const requiredEndpointStatus = String(requiredStatus?.endpointStatus || "ok");
  const requiredCandidatesEndpointStatus = String(requiredCandidatesMeta?.endpointStatus || "ok");
  const accountEndpointStatus = String(accountStatus?.endpointStatus || "ok");
  const accountCandidatesEndpointStatus = String(accountCandidatesMeta?.endpointStatus || "ok");
  const settlementEndpointStatus = String(settlementStatus?.endpointStatus || "ok");
  const settlementQueueEndpointStatus = String(settlementQueueMeta?.endpointStatus || "ok");
  const reconciliationEndpointStatus = String(reconciliationStatus?.endpointStatus || "ok");
  const reconciliationQueueEndpointStatus = String(reconciliationQueueMeta?.endpointStatus || "ok");
    const paymentSourcesEndpointStatus = String(paymentSourcesMeta?.endpointStatus || "ok");
    const settingsWritable = settingsEndpointStatus === "ok";
    const pilotWritable = pilotEndpointStatus === "ok" && pilotCandidatesEndpointStatus === "ok";
    const requiredWritable = requiredEndpointStatus === "ok" && requiredCandidatesEndpointStatus === "ok";
    const accountWritable = accountEndpointStatus === "ok" && accountCandidatesEndpointStatus === "ok";
    const settlementWritable = settlementEndpointStatus === "ok" && settlementQueueEndpointStatus === "ok";
    const reconciliationWritable = reconciliationEndpointStatus === "ok" && reconciliationQueueEndpointStatus === "ok";
    const paymentSourcesWritable = paymentSourcesEndpointStatus === "ok";
    const paymentBackboneWriteEnabled = Boolean(paymentBackbone?.activationGate?.enabled);
    const paymentBackboneSafeMode = !paymentBackboneWriteEnabled;

  const filteredRooms = useMemo(() => {
    const q = String(roomQuery || "").trim().toLowerCase();
    const base = Array.isArray(rooms) ? rooms : [];
    if (!q) return base.slice(0, 60);
    return base.filter((item) => String(item?.name || "").toLowerCase().includes(q)).slice(0, 60);
  }, [rooms, roomQuery]);

  const {
    saveGlobal,
    saveRoomOverride,
    disableRoomOverride,
    activatePilot,
    deactivatePilot,
    activateRequired,
    deactivateRequired,
    applyAccountCandidate,
    savePaymentAccount,
    markSettlementPlanned,
    markSettlementReady,
    markSettlementExecuted,
    markSettlementCancelled,
    saveReconciliation,
    refreshPaymentSources,
    exportPaymentSourcesCsv,
    exportSettlementLedgerCsv,
    applyRoom,
  } = useMemo(
    () => createCommercialCorePanelActions({
      load,
      setBusyKey,
      setErr,
      setOkMsg,
      setAccountForm,
      setRoomForm,
      globalForm,
      roomForm,
      accountForm,
      paymentSourceFilters,
    }),
    [load, setBusyKey, setErr, setOkMsg, setAccountForm, setRoomForm, globalForm, roomForm, accountForm, paymentSourceFilters],
  );

  useEffect(() => {
    const facts = buildCommercialCoreCopilotFacts({
      paymentPreviewSummary,
      paymentBackbone,
      settings,
      settlementStatus,
      accountStatus,
      operationProofSummary,
      paymentSourcesMeta,
      lifecycle,
    });
    if (!paymentPreviewSummary && !paymentBackbone && !settings && !settlementStatus && !accountStatus) {
      clearCopilotSelection('/superadmin/commercial-core');
      return;
    }
    setCopilotSelection({
      scopeKey: '/superadmin/commercial-core',
      entityType: 'screen',
      entityId: 6112,
      label: 'Ticari Akış',
      summary: [
        paymentPreviewSummary?.title || paymentPreviewSummary?.statusText || paymentPreviewSummary?.summaryText || null,
        facts?.copilotSummary || null,
      ].filter(Boolean).join(' • '),
      fields: [
        { label: 'Hakediş önizleme', value: paymentPreviewSummary?.statusText || paymentPreviewSummary?.summaryText || paymentPreviewSummary?.status || '-', help: 'Hakediş önizleme durumunu gösterir.' },
        { label: 'Eksik bilgi', value: `${paymentPreviewSummary?.missingCount ?? 0}`, help: 'Hazır olmayan kayıtların sayısını gösterir.' },
        { label: 'Kontrol gerekli', value: `${paymentPreviewSummary?.reviewCount ?? 0}`, help: 'Tekrar bakılması gereken kayıtların sayısını gösterir.' },
        { label: 'Komisyon', value: paymentBackbone?.activeRule ? `${paymentBackbone.activeRule.paymentMode || 'OFF'} • ${fmtBps(paymentBackbone.activeRule.commissionBps)}` : 'Tanımlı değil', help: 'Komisyon kuralı ve ödeme modu özetini gösterir.' },
        { label: 'Ödeme hesabı', value: paymentPreviewSummary?.paymentAccountStatus || accountStatus?.summary || '-', help: 'Ödeme hesabı hazırlığını gösterir.' },
        { label: 'Sözleşme / vardiya', value: paymentPreviewSummary?.contractOrShiftSummary || lifecycle?.summary || '-', help: 'Sözleşme veya vardiya üretim özetini gösterir.' },
      ],
      badges: [
        { label: 'Durum', value: paymentPreviewSummary?.statusText || paymentPreviewSummary?.summaryText || paymentPreviewSummary?.status || 'BEKLİYOR', help: 'Hakediş önizleme durumunu gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/superadmin/commercial-core');
  }, [paymentPreviewSummary, paymentBackbone, settings, settlementStatus, accountStatus, operationProofSummary, paymentSourcesMeta, lifecycle]);

  useEffect(() => {
    const target = tabSectionRefs.current?.[viewTab];
    if (!target) return;
    try {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus?.({ preventScroll: true });
    } catch {
      target.scrollIntoView?.({ block: "start" });
    }
  }, [viewTab]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelTitle">Ticari Akış Özeti</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Talep, teklif, pazarlık ve sözleşme geçişini tek akışta özetler.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ffb17b", whiteSpace: "pre-wrap" }}>{stripHtmlNoise(err)}</div> : null}
      {okMsg ? <div style={{ marginTop: 12, color: "#7bffb2", whiteSpace: "pre-wrap" }}>{okMsg}</div> : null}

      <div style={{ marginTop: 14, maxWidth: 980 }}>
        <FlowSummaryStrip
          title="Ticari akış özeti"
          description="Bu ekran ödeme başlatmaz. Hakediş hazırlığı, önizleme ve kanıt durumunu birlikte gösterir."
          steps={["1. Hazırlık", "2. Önizleme", "3. CSV taslağı", "4. Son kontrol", "Ödeme kapalı"]}
          statusText="Ödeme kapalı"
          tone="warn"
        />
      </div>

        <div style={{ marginTop: 14, maxWidth: 760 }}>
          <PaymentReadonlySafetyBadge />
        </div>

        {paymentBackboneSafeMode ? (
          <div style={{ marginTop: 12, maxWidth: 980 }}>
            <div className="panelMeta">
              Aktif ödeme kapalı · Hakediş sadece önizleme modunda · Bu ekran ödeme başlatmaz · Canlı ödeme daha sonra açılacak
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, maxWidth: 760 }}>
          <PaymentReadinessReadonlyCard
            paymentBackbone={paymentBackbone}
            settings={settings}
          activeRule={activeRule}
          settlementStatus={settlementStatus}
          cards={cards}
          paymentBackboneEndpointStatus={paymentBackboneEndpointStatus}
          settingsEndpointStatus={settingsEndpointStatus}
        />
      </div>

      <div style={{ marginTop: 14, maxWidth: 980 }}>
        <PanelSegmentTabs
          ariaLabel="Ticari akış bölümleri"
          compact
          value={viewTab}
          onSelect={setViewTab}
          tabs={[
            { key: "summary", label: "Özet" },
            { key: "billing", label: "Hakediş" },
            { key: "prep", label: "Ödeme Hazırlık" },
            { key: "commission", label: "Komisyon" },
            { key: "proof", label: "Kalite / Kanıt" },
            { key: "risk", label: "Riskler" },
            { key: "history", label: "Geçmiş" },
          ]}
        />
      </div>

      {viewTab === "proof" ? (
        <div
          ref={(node) => { tabSectionRefs.current.proof = node; }}
          tabIndex={-1}
          role="tabpanel"
          aria-label="Kalite / Kanıt"
          style={{ marginTop: 14, display: "grid", gap: 12 }}
        >
          <PaymentPreviewReadonlyCard />
          <OperationProofReadonlyBadge />
        </div>
      ) : null}

      <div ref={(node) => { tabSectionRefs.current.summary = node; }} tabIndex={-1} className="panelSectionTitle" style={{ marginTop: 18 }}>Aktif operasyon</div>
        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card title="Aktif durum">
            <div>{manifest?.title || "Henüz ticari özet yok"}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {manifest?.activeMilestone || "Aktif durum bilgisi gelmedi"}
            </div>
        </Card>
        <Card title="Aktif adımlar">
          <div>{activeSteps.length} adım</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {activeSteps.map((item) => item.label).join(" • ") || "Henüz aktif adım yok"}
          </div>
        </Card>
        <Card title="Sözleşmeye geçiş">
          <div>{route.join(" → ") || "Henüz geçiş yolu yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {lifecycle?.summary || "Bu ekran ticari sürecin hangi kapılardan geçtiğini anlatır"}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Payment backbone durumu">
          <div>{paymentBackbone?.summary || "Henüz payment backbone özeti yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {paymentBackbone?.activeMilestone || "-"} • {paymentBackbone?.dormant ? "Dormant" : "Açık"}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Aktivasyon anahtarı: {activationGate?.state ?? "0"} • {activationGate?.enabled ? "Hazırlıktan canlı kapıya uygun" : "Hazırlık modu"}
          </div>
        </Card>
        <Card title="Aktivasyon checklist">
          <div style={{ display: "grid", gap: 6 }}>
            {(activationChecklist || []).map((item) => (
              <div key={item.key} style={{ display: "grid", gap: 4, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{item.label}</strong>
                  <span className="panelMeta">{item.status}</span>
                </div>
                <div className="panelMeta">{item.detail}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Aktif komisyon kuralı">
          <div>{activeRule ? `${activeRule.paymentMode} • ${fmtBps(activeRule.commissionBps)}` : "Henüz aktif kural yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {activeRule ? `Kaynak: ${activeRule.scopeType}${activeRule.roomId ? ` #${activeRule.roomId}` : ""}${activeRule.ruleId ? ` • Kural #${activeRule.ruleId}` : ""}` : "M82.10 ile yönetim yüzeyi açılacak"}
          </div>
        </Card>
        <Card title="Kaynak sayaçları">
          <div>Toplam kaynak: {cards.commercialSources || 0}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Agreement: {cards.agreementSources || 0} • Shift series: {cards.shiftSeriesSources || 0}
          </div>
        </Card>
        <Card title="Settlement hazırlığı">
          <div>Plan: {cards.settlementPlans || 0}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Hesap: {cards.paymentAccounts || 0} • Kural: {cards.commissionRules || 0}
          </div>
        </Card>
      </div>

      <div ref={(node) => { tabSectionRefs.current.billing = node; }} tabIndex={-1}>
      <CollapsibleSection
        title="Ödeme listesi ve dışa aktarım"
        subtitle="Filtrelenmiş ödeme kaynakları ve CSV dışa aktarımı."
        badge={paymentSourcesMeta?.summary || paymentSources.length || 0}
        defaultOpen={false}
      >
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div className="panelMeta">
            Hazırlık omurgasındaki kaynakları filtreleyip CSV olarak indirebilirsin. Export için Super Admin step-up gerekir.
          </div>
          {paymentSourcesEndpointStatus !== "ok" ? (
            <div className="panelMeta" style={{ color: "#ffb17b" }}>
              {paymentSourcesEndpointStatus === "forbidden"
                ? "Ödeme listesi için önce TOTP step-up doğrulamasını tamamla."
                : "Ödeme listesi endpointi bu çalışmakta olan sunucuda yok görünüyor."}
            </div>
          ) : null}
          <Card title={`Ödeme kaynakları (${paymentSourcesMeta?.summary || paymentSources.length || 0})`}>
            <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <InputRow label="Kaynak türü">
                <select value={paymentSourceFilters.sourceType} onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, sourceType: e.target.value }))}>
                  <option value="ALL">Tümü</option>
                  <option value="AGREEMENT">Agreement</option>
                  <option value="SHIFT_SERIES">Shift series</option>
                </select>
              </InputRow>
              <InputRow label="Payment mode">
                <select value={paymentSourceFilters.paymentMode} onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, paymentMode: e.target.value }))}>
                  <option value="ALL">Tümü</option>
                  <option value="OFF">OFF</option>
                  <option value="OPTIONAL">OPTIONAL</option>
                  <option value="REQUIRED">REQUIRED</option>
                </select>
              </InputRow>
              <InputRow label="Mutabakat durumu">
                <select value={paymentSourceFilters.settlementStatus} onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, settlementStatus: e.target.value }))}>
                  <option value="ALL">Tümü</option>
                  <option value="DORMANT">DORMANT</option>
                  <option value="READY">READY</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </InputRow>
              <InputRow label="Şirket ID">
                <input
                  type="number"
                  min="1"
                  value={paymentSourceFilters.companyId}
                  onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, companyId: e.target.value }))}
                  placeholder="örn. 12"
                />
              </InputRow>
              <InputRow label="Oda ID">
                <input
                  type="number"
                  min="1"
                  value={paymentSourceFilters.roomId}
                  onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, roomId: e.target.value }))}
                  placeholder="örn. 4"
                />
              </InputRow>
              <InputRow label="Ara">
                <input
                  value={paymentSourceFilters.q}
                  onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, q: e.target.value }))}
                  placeholder="sourceKey / şirket / oda"
                />
              </InputRow>
              <InputRow label="Başlangıç">
                <input
                  type="datetime-local"
                  value={paymentSourceFilters.from}
                  onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, from: e.target.value }))}
                />
              </InputRow>
              <InputRow label="Bitiş">
                <input
                  type="datetime-local"
                  value={paymentSourceFilters.to}
                  onChange={(e) => setPaymentSourceFilters((prev) => ({ ...prev, to: e.target.value }))}
                />
              </InputRow>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={refreshPaymentSources} disabled={busyKey === "payment-sources" || !paymentSourcesWritable}>
                {busyKey === "payment-sources" ? "Yenileniyor..." : "Listeyi yenile"}
              </button>
              <button className="btn" onClick={exportPaymentSourcesCsv} disabled={busyKey === "payment-sources-export" || !paymentSourcesWritable}>
                {busyKey === "payment-sources-export" ? "İndiriliyor..." : "CSV indir"}
              </button>
              <button className="btn" onClick={exportSettlementLedgerCsv} disabled={busyKey === "payment-sources-ledger-export" || !paymentSourcesWritable}>
                {busyKey === "payment-sources-ledger-export" ? "İndiriliyor..." : "Detaylı muhasebe CSV indir"}
              </button>
              <button
                className="btn sm"
                onClick={() => setPaymentSourceFilters({
                  sourceType: "ALL",
                  paymentMode: "ALL",
                  settlementStatus: "ALL",
                  companyId: "",
                  roomId: "",
                  q: "",
                  from: "",
                  to: "",
                })}
              >
                Filtreleri temizle
              </button>
            </div>
            {Array.isArray(paymentSources) && paymentSources.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {paymentSources.map((item) => (
                  <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.sourceKey}</div>
                      <div>{item.settlementStatus || item?.settlementPlan?.status || "DORMANT"}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="panelMeta">Mode: {item.paymentModeSnapshot} • Komisyon: {fmtBps(item.commissionBpsSnapshot)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    <div className="panelMeta">Brüt: {item?.settlementPlan?.grossAmount ?? item?.amountCompanySnapshot ?? 0} • Komisyon: {item?.settlementPlan?.commissionAmount ?? 0} • Sağlayıcı net: {item?.settlementPlan?.providerNetAmount ?? item?.amountProviderSnapshot ?? 0}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panelMeta">Filtreye uyan ödeme kaynağı yok. Filtreleri daraltmayı veya hazırlık omurgasında yeni kaynak üretmeyi dene.</div>
            )}
            </div>
          </Card>
        </div>
      </CollapsibleSection>
      </div>

      <div ref={(node) => { tabSectionRefs.current.prep = node; }} tabIndex={-1}>
      <CollapsibleSection
        title="Ödeme hazırlık, komisyon ve risk detayları"
        subtitle="M85-M89 blokları ve canlı ödeme hazırlık ayrıntıları."
        badge={paymentBackboneWriteEnabled ? "Açık" : "Kapalı"}
        defaultOpen={false}
      >
        {paymentBackboneWriteEnabled ? (
          <>
      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div className="panelSectionTitle">Super Admin ticari ayarlar</div>
        <div className="panelMeta">
          {settings?.summary || "Global payment mode ve oda bazlı komisyon override ayarları dormant omurgaya yazılır."}
        </div>
        {paymentBackboneEndpointStatus !== "ok" || settingsEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {settingsEndpointStatus === "forbidden"
              ? "Bu yüzeyin tam okunması için önce TOTP step-up doğrulamasını tamamla."
              : settingsEndpointStatus === "missing"
              ? "Backend ticari ayar endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : paymentBackboneEndpointStatus === "missing"
              ? "Payment backbone status endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Bazı ticari endpointler şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Global ayar">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Payment mode" help="Tüm sistem için varsayılan mod.">
              <select value={globalForm.paymentMode} onChange={(e) => setGlobalForm((prev) => ({ ...prev, paymentMode: e.target.value }))}>
                {(settings?.paymentModes || ["OFF", "OPTIONAL", "REQUIRED"]).map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </InputRow>
            <InputRow label="Global komisyon (bps)" help="Örnek: 250 = %2.50">
              <input
                type="number"
                min="0"
                max="10000"
                value={globalForm.commissionBps}
                onChange={(e) => setGlobalForm((prev) => ({ ...prev, commissionBps: e.target.value }))}
              />
            </InputRow>
            <InputRow label="Not" help="İç not. Ticari snapshot içine doğrudan yazılmaz.">
              <textarea rows="3" value={globalForm.note} onChange={(e) => setGlobalForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <div className="panelMeta">Son güncelleme: {fmtDateTime(settings?.globalRule?.updatedAt)}</div>
            <button className="btn" onClick={saveGlobal} disabled={busyKey === "global" || !settingsWritable}>
              {busyKey === "global" ? "Kaydediliyor..." : "Global ayarı kaydet"}
            </button>
          </div>
        </Card>

        <Card title="Oda bazlı override">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Oda ara" help="Önce odayı seç, sonra override kaydet.">
              <input value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} placeholder="Oda adı yaz" disabled={!settingsWritable} />
            </InputRow>
              <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8 }}>
              {!settingsWritable ? <div className="panelMeta">Ayar endpointi hazır olmadan oda override seçimi kapalı.</div> : filteredRooms.length ? filteredRooms.map((room) => (
                <button
                  key={room.id}
                  className="btn sm"
                  style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }}
                  onClick={() => applyRoom(room)}
                  disabled={!settingsWritable}
                >
                  <span>{room.name}</span>
                  <span>#{room.id}</span>
                </button>
              )) : <div className="panelMeta">Eşleşen oda bulunamadı.</div>}
            </div>
            <InputRow label="Seçili oda">
              <input value={roomForm.roomId} readOnly placeholder="Önce oda seç" />
            </InputRow>
            <InputRow label="Payment mode">
              <select value={roomForm.paymentMode} onChange={(e) => setRoomForm((prev) => ({ ...prev, paymentMode: e.target.value }))}>
                {(settings?.paymentModes || ["OFF", "OPTIONAL", "REQUIRED"]).map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </InputRow>
            <InputRow label="Oda komisyonu (bps)">
              <input
                type="number"
                min="0"
                max="10000"
                value={roomForm.commissionBps}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, commissionBps: e.target.value }))}
              />
            </InputRow>
            <InputRow label="Not">
              <textarea rows="3" value={roomForm.note} onChange={(e) => setRoomForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <button className="btn" onClick={saveRoomOverride} disabled={busyKey === "room" || !roomForm.roomId || !settingsWritable}>
              {busyKey === "room" ? "Kaydediliyor..." : "Oda override kaydet"}
            </button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title={`Aktif oda override listesi (${settings?.roomOverrideCount || 0})`}>
          {roomOverrides.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {roomOverrides.map((item) => (
                <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{item.roomName || `Oda #${item.roomId}`}</div>
                    <button className="btn sm" disabled={busyKey === `disable:${item.roomId}` || !settingsWritable} onClick={() => disableRoomOverride(item.roomId)}>
                      {busyKey === `disable:${item.roomId}` ? "Kapatılıyor..." : "Override kapat"}
                    </button>
                  </div>
                  <div>{item.paymentMode} • {fmtBps(item.commissionBps)}</div>
                  <div className="panelMeta">Room #{item.roomId} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                  {item.note ? <div className="panelMeta">Not: {item.note}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="panelMeta">Aktif oda override yok. Tüm yeni ticari kaynaklar global ayarı kullanır.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div ref={(node) => { tabSectionRefs.current.commission = node; }} tabIndex={-1} className="panelSectionTitle">M85 opsiyonel ödeme pilotu</div>
        <div className="panelMeta">
          {pilotStatus?.summary || "OPTIONAL moddaki ticari kaynaklar pilot listesine alınabilir. READY olanlar yalnız pilot hazırlık görünürlüğü taşır; gerçek charge/payout hala dormant kalır."}
        </div>
        {pilotEndpointStatus !== "ok" || pilotCandidatesEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {pilotEndpointStatus === "forbidden"
              ? "Opsiyonel ödeme pilot yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : pilotEndpointStatus === "missing"
              ? "Opsiyonel ödeme pilot endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Opsiyonel ödeme pilot yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Pilot özeti">
          <div>{pilotStatus?.activeMilestone || "M85"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Hazır: {pilotStatus?.readyCount || 0} • Bekleyen: {pilotStatus?.dormantCount || 0}
          </div>
        </Card>
        <Card title="OPTIONAL adaylar">
          <div>{pilotStatus?.candidateCount || 0} kaynak</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Global veya oda override OPTIONAL ise yeni ticari kaynak burada görünür.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Opsiyonel ödeme pilot listesi">
          {Array.isArray(pilotCandidates) && pilotCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {pilotCandidates.map((item) => {
                const settlementStatus = String(item?.settlementStatus || item?.settlementPlan?.status || "DORMANT").toUpperCase();
                const isReady = settlementStatus === "READY";
                const busyOn = busyKey === `pilot:on:${item.id}`;
                const busyOff = busyKey === `pilot:off:${item.id}`;
                return (
                  <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.sourceKey}</div>
                      <div>{isReady ? "READY" : settlementStatus}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="panelMeta">Mode: {item.paymentModeSnapshot} • Komisyon: {fmtBps(item.commissionBpsSnapshot)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    <div className="panelMeta">Brüt: {item?.settlementPlan?.grossAmount ?? item?.amountCompanySnapshot ?? 0} • Komisyon: {item?.settlementPlan?.commissionAmount ?? 0} • Sağlayıcı net: {item?.settlementPlan?.providerNetAmount ?? item?.amountProviderSnapshot ?? 0}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!pilotWritable || isReady || busyOn} onClick={() => activatePilot(item.id)}>
                        {busyOn ? "Hazırlanıyor..." : "Pilot READY yap"}
                      </button>
                      <button className="btn sm" disabled={!pilotWritable || !isReady || busyOff} onClick={() => deactivatePilot(item.id)}>
                        {busyOff ? "Kapatılıyor..." : "Pilot DORMANT yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panelMeta">OPTIONAL modda pilot adayı kaynak yok. Önce payment mode OPTIONAL olacak şekilde yeni sözleşme veya vardiya serisi üret.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div className="panelSectionTitle">M86 zorunlu ödeme rollout'u</div>
        <div className="panelMeta">
          {requiredStatus?.summary || "REQUIRED moddaki ticari kaynaklar ACTIVE/DISABLED akışıyla yönetilir. ACTIVE durumda settlement planı aktif, entry satırları READY görünür; gerçek provider entegrasyonu hala dormant adapter üstünden temsil edilir."}
        </div>
        {requiredEndpointStatus !== "ok" || requiredCandidatesEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {requiredEndpointStatus === "forbidden"
              ? "Zorunlu ödeme rollout yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : requiredEndpointStatus === "missing"
              ? "Zorunlu ödeme rollout endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Zorunlu ödeme rollout yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Rollout özeti">
          <div>{requiredStatus?.activeMilestone || "M86"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Aktif: {requiredStatus?.activeCount || 0} • Bekleyen: {requiredStatus?.waitingCount || 0} • Durdurulan: {requiredStatus?.disabledCount || 0}
          </div>
        </Card>
        <Card title="REQUIRED adaylar">
          <div>{requiredStatus?.candidateCount || 0} kaynak</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Global veya oda override REQUIRED ise yeni ticari kaynak burada zorunlu rollout adayı olarak görünür.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Zorunlu ödeme rollout listesi">
          {Array.isArray(requiredCandidates) && requiredCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {requiredCandidates.map((item) => {
                const settlementStatus = String(item?.settlementStatus || item?.settlementPlan?.status || "DORMANT").toUpperCase();
                const isActive = settlementStatus === "ACTIVE";
                const isDisabled = settlementStatus === "DISABLED";
                const busyOn = busyKey === `required:on:${item.id}`;
                const busyOff = busyKey === `required:off:${item.id}`;
                return (
                  <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.sourceKey}</div>
                      <div>{settlementStatus}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="panelMeta">Mode: {item.paymentModeSnapshot} • Komisyon: {fmtBps(item.commissionBpsSnapshot)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    <div className="panelMeta">Brüt: {item?.settlementPlan?.grossAmount ?? item?.amountCompanySnapshot ?? 0} • Komisyon: {item?.settlementPlan?.commissionAmount ?? 0} • Sağlayıcı net: {item?.settlementPlan?.providerNetAmount ?? item?.amountProviderSnapshot ?? 0}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!requiredWritable || isActive || busyOn} onClick={() => activateRequired(item.id)}>
                        {busyOn ? "Aktifleştiriliyor..." : "Rollout ACTIVE yap"}
                      </button>
                      <button className="btn sm" disabled={!requiredWritable || (!isActive && isDisabled) || busyOff} onClick={() => deactivateRequired(item.id)}>
                        {busyOff ? "Durduruluyor..." : "Rollout DISABLED yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panelMeta">REQUIRED modda rollout adayı kaynak yok. Önce payment mode REQUIRED olacak şekilde yeni sözleşme veya vardiya serisi üret.</div>
          )}
        </Card>
      </div>
      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div className="panelSectionTitle">M87 ödeme hesabı hazırlığı</div>
        <div className="panelMeta">
          {accountStatus?.summary || "Şirket ve oda tarafındaki ödeme hesabı metadata/readiness durumu bu yüzeyde görünür. Bu faz gerçek charge/payout açmaz."}
        </div>
        {accountEndpointStatus !== "ok" || accountCandidatesEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {accountEndpointStatus === "forbidden"
              ? "Ödeme hesabı hazırlık yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : accountEndpointStatus === "missing"
              ? "Ödeme hesabı hazırlık endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Ödeme hesabı hazırlık yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Hesap hazırlık özeti">
          <div>{accountStatus?.activeMilestone || "M87"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Şirket hazır: {accountStatus?.companyReadyCount || 0}/{accountStatus?.companyCandidateCount || 0} • Oda hazır: {accountStatus?.roomReadyCount || 0}/{accountStatus?.roomCandidateCount || 0}
          </div>
        </Card>
        <Card title="Eksik / hata">
          <div>Eksik: {(accountStatus?.companyMissingCount || 0) + (accountStatus?.roomMissingCount || 0)}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Hata: {(accountStatus?.companyErrorCount || 0) + (accountStatus?.roomErrorCount || 0)} • Platform hesabı: {accountStatus?.platformAccountCount || 0}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Ödeme hesabı metadata formu">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Sahip tipi" help="Company veya Room için owner id girilir.">
              <select value={accountForm.ownerType} onChange={(e) => setAccountForm((prev) => ({ ...prev, ownerType: e.target.value }))}>
                {["COMPANY", "ROOM", "PLATFORM"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </InputRow>
            <InputRow label="Owner id" help="PLATFORM için boş bırakabilirsin.">
              <input value={accountForm.ownerId} onChange={(e) => setAccountForm((prev) => ({ ...prev, ownerId: e.target.value }))} placeholder="ör: 12" />
            </InputRow>
            <InputRow label="Provider key" help="Şimdilik DORMANT kalabilir.">
              <input value={accountForm.providerKey} onChange={(e) => setAccountForm((prev) => ({ ...prev, providerKey: e.target.value }))} />
            </InputRow>
            <InputRow label="Durum">
              <select value={accountForm.status} onChange={(e) => setAccountForm((prev) => ({ ...prev, status: e.target.value }))}>
                {["INACTIVE", "ACTIVE", "VERIFIED", "ERROR"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </InputRow>
            <InputRow label="Etiket">
              <input value={accountForm.label} onChange={(e) => setAccountForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="ör: Şirket ana hesap" />
            </InputRow>
            <InputRow label="Maskeli IBAN">
              <input value={accountForm.maskedIban} onChange={(e) => setAccountForm((prev) => ({ ...prev, maskedIban: e.target.value }))} placeholder="TR** **** **** 1234" />
            </InputRow>
            <InputRow label="Account ref">
              <input value={accountForm.accountRef} onChange={(e) => setAccountForm((prev) => ({ ...prev, accountRef: e.target.value }))} placeholder="provider ref" />
            </InputRow>
            <InputRow label="Not">
              <textarea rows="3" value={accountForm.note} onChange={(e) => setAccountForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <button className="btn" onClick={savePaymentAccount} disabled={busyKey === "account" || !accountWritable}>
              {busyKey === "account" ? "Kaydediliyor..." : "Hesap metadata kaydet"}
            </button>
          </div>
        </Card>

        <Card title="Ödeme hesabı aday listesi">
          {Array.isArray(accountCandidates) && accountCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {accountCandidates.map((item) => (
                  <div key={item.key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{item.ownerName}</div>
                    <div>{item.accountStatus || "MISSING"}</div>
                  </div>
                  <div>{item.ownerType} • Mode: {item.paymentModeHint} • Settlement: {item.settlementStatusHint}</div>
                  <div className="panelMeta">Kaynak: {item.sourceType} • {item.sourceKey} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                  <div className="panelMeta">Hesap: {item?.account?.label || "-"} • Provider: {item?.account?.providerKey || "-"} • IBAN: {item?.account?.maskedIban || "-"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn sm" disabled={!accountWritable} onClick={() => applyAccountCandidate(item)}>Forma al</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panelMeta">OPTIONAL/REQUIRED modda hesap hazırlık adayı kaynak yok.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div ref={(node) => { tabSectionRefs.current.risk = node; }} tabIndex={-1} className="panelSectionTitle">M88 settlement operasyon masası</div>
        <div className="panelMeta">
          {settlementStatus?.summary || "READY/PLANNED/EXECUTED settlement entry satırları Super Admin yüzeyinde görünür ve manuel operasyon akışıyla yönetilir."}
        </div>
        {settlementEndpointStatus !== "ok" || settlementQueueEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {settlementEndpointStatus === "forbidden"
              ? "Settlement operasyon yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : settlementEndpointStatus === "missing"
              ? "Settlement operasyon endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Settlement operasyon yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Settlement özet">
          <div>{settlementStatus?.activeMilestone || "M88"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            READY: {settlementStatus?.readyCount || 0} • PLANNED: {settlementStatus?.plannedCount || 0} • EXECUTED: {settlementStatus?.executedCount || 0}
          </div>
        </Card>
        <Card title="Hazırlık / blok">
          <div>Finans hazır: {settlementStatus?.financeReadyCount || 0}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Bloklu: {settlementStatus?.blockedCount || 0} • Kuyruk: {settlementStatus?.candidateCount || 0}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Settlement operasyon kuyruğu">
          {Array.isArray(settlementQueue) && settlementQueue.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {settlementQueue.map((item) => {
                const status = String(item?.entryStatus || "DORMANT").toUpperCase();
                const busyPlan = busyKey === `settlement:plan:${item.entryId}`;
                const busyReady = busyKey === `settlement:ready:${item.entryId}`;
                const busyExecute = busyKey === `settlement:execute:${item.entryId}`;
                const busyCancel = busyKey === `settlement:cancel:${item.entryId}`;
                const canPlan = settlementWritable && item.financeReady && ["READY", "PLANNED"].includes(status);
                const canExecute = settlementWritable && item.financeReady && ["READY", "PLANNED"].includes(status);
                const canReady = settlementWritable && ["PLANNED", "CANCELLED", "READY"].includes(status);
                const canCancel = settlementWritable && ["READY", "PLANNED", "CANCELLED"].includes(status);
                return (
                  <div key={item.entryId} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.entryKind} • {item.sourceKey}</div>
                      <div>{status}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="panelMeta">Tutar: {item.amount || 0} {item.currencyCode || "TRY"} • Mode: {item.paymentModeSnapshot} • Plan: {item.settlementPlanStatus}</div>
                    <div className="panelMeta">Finans hazırlık: {item.financeReady ? "Hazır" : "Bloklu"} • Şirket hesap: {item?.companyAccount?.status || "MISSING"} • Oda hesap: {item.roomId ? (item?.roomAccount?.status || "MISSING") : "N/A"}</div>
                    <div className="panelMeta">Provider ref: {item.providerRef || "-"} • Vade: {fmtDateTime(item.dueAt)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    {item.note ? <div className="panelMeta">Not: {item.note}</div> : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!canPlan || busyPlan} onClick={() => markSettlementPlanned(item)}>
                        {busyPlan ? "Planlanıyor..." : "PLANNED yap"}
                      </button>
                      <button className="btn sm" disabled={!canReady || busyReady} onClick={() => markSettlementReady(item)}>
                        {busyReady ? "Hazırlanıyor..." : "READY yap"}
                      </button>
                      <button className="btn sm" disabled={!canExecute || busyExecute} onClick={() => markSettlementExecuted(item)}>
                        {busyExecute ? "İşleniyor..." : "EXECUTED yap"}
                      </button>
                      <button className="btn sm" disabled={!canCancel || busyCancel} onClick={() => markSettlementCancelled(item)}>
                        {busyCancel ? "İptal ediliyor..." : "CANCELLED yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panelMeta">Settlement operasyon kuyruğunda görünür satır yok.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: 12 }}>
        <div className="panelSectionTitle">M89 settlement mutabakat masası</div>
        <div className="panelMeta">
          {reconciliationStatus?.summary || "PLANNED/EXECUTED satırlar için bekliyor-eşleşti-inceleme-uyuşmazlık-kapandı döngüsü görünür olur. Bu faz gerçek provider webhook yerine manuel mutabakat izi tutar."}
        </div>
        {reconciliationEndpointStatus !== "ok" || reconciliationQueueEndpointStatus !== "ok" ? (
          <div className="panelMeta" style={{ color: "#ffb17b" }}>
            {reconciliationEndpointStatus === "forbidden"
              ? "Settlement mutabakat yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : reconciliationEndpointStatus === "missing"
              ? "Settlement mutabakat endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Settlement mutabakat yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
        <div style={{ marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card title="Mutabakat özet">
            <div>{reconciliationStatus?.activeMilestone || "M89"}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Bekliyor: {reconciliationStatus?.pendingCount || 0} • Eşleşti: {reconciliationStatus?.matchedCount || 0}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              İnceleme: {reconciliationStatus?.reviewCount || 0} • Uyuşmazlık: {reconciliationStatus?.mismatchCount || 0} • Kapandı: {reconciliationStatus?.closedCount || 0}
            </div>
          </Card>
          <Card title="Risk sinyali">
            <div>Eksik provider ref: {reconciliationStatus?.missingProviderRefCount || 0}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Vadesi geçen planlı: {reconciliationStatus?.overduePlannedCount || 0} • Kuyruk: {reconciliationStatus?.candidateCount || 0}
            </div>
          </Card>
        </div>
          <Card title="Settlement mutabakat kuyruğu">
            {Array.isArray(reconciliationQueue) && reconciliationQueue.length ? (
              <div style={{ display: "grid", gap: 8 }}>
                {reconciliationQueue.map((item) => {
                  const state = String(item?.reconciliationStatus || "BEKLIYOR").toUpperCase();
                const busyMatched = busyKey === `recon:ESLESTI:${item.entryId}`;
                const busyReview = busyKey === `recon:INCELEME_GEREKLI:${item.entryId}`;
                const busyMismatch = busyKey === `recon:UYUSMAZLIK:${item.entryId}`;
                const busyClosed = busyKey === `recon:KAPANDI:${item.entryId}`;
                return (
                  <div key={`recon-${item.entryId}`} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.entryKind} • {item.sourceKey}</div>
                      <div>{state}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="panelMeta">Beklenen: {item.reconciliationExpectedAmount ?? item.amount ?? 0} • Gelen: {item.reconciliationReceivedAmount ?? item.amount ?? 0} • Delta: {item.reconciliationDeltaAmount ?? 0}</div>
                    <div className="panelMeta">Provider ref: {item.providerRef || "-"} • Harici ref: {item.reconciliationExternalRef || "-"} • Son güncelleme: {fmtDateTime(item.reconciliationLastUpdatedAt)}</div>
                    <div className="panelMeta">{item.missingProviderRef ? "Eksik provider ref var. " : ""}{item.overduePlanned ? "Plan vadesi geçti. " : ""}{item.reconciliationNote ? `Not: ${item.reconciliationNote}` : "Mutabakat notu yok."}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!reconciliationWritable || busyMatched} onClick={() => saveReconciliation(item, "ESLESTI")}>{busyMatched ? "Kaydediliyor..." : "Eşleşti"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyReview} onClick={() => saveReconciliation(item, "INCELEME_GEREKLI")}>{busyReview ? "Kaydediliyor..." : "İnceleme"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyMismatch} onClick={() => saveReconciliation(item, "UYUSMAZLIK")}>{busyMismatch ? "Kaydediliyor..." : "Uyuşmazlık"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyClosed} onClick={() => saveReconciliation(item, "KAPANDI")}>{busyClosed ? "Kaydediliyor..." : "Kapandı"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="panelMeta">Settlement mutabakat kuyruğunda görünür satır yok.</div>
            )}
          </Card>
        </div>
          </>
        ) : (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <div className="panelSectionTitle">Canlı ödeme kapalı</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Aktif ödeme kapalı. Bu alanlar saha öncesi gizli tutulur.</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>Hakediş sadece önizleme modunda. Canlı ödeme daha sonra açılacak.</div>
          </div>
        )}

      </CollapsibleSection>
      </div>

        <div ref={(node) => { tabSectionRefs.current.history = node; }} tabIndex={-1} className="panelSectionTitle" style={{ marginTop: 18 }}>Gelecek faz</div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Planlı ticari adımlar">
          <div>{plannedSteps.length ? plannedSteps.map((item) => item.label).join(" • ") : "Planlı adım yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Aktif: {activeSteps.length} • Planlı: {plannedSteps.length}
          </div>
        </Card>
        <Card title="Plan notları">
          <div>{manifest?.activeMilestone || "M62"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {manifest?.rules?.join(" • ") || "Henüz plan notu yok"}
          </div>
        </Card>
      </div>

    </div>
  );
}

