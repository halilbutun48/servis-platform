import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import PanelChrome from "../../components/PanelChrome";
import OperationProofMiniCard from "../../components/OperationProofMiniCard";
import BoardingRouteImpactPreviewCard from "../shared/BoardingRouteImpactPreviewCard";
import { loadSchoolOperationsBundle } from "../../utils/dashboardBulk";
import { displayStatusLabel } from "../../utils/displayStatus";
import { resolvePersonDisplayLabel } from "../../utils/labels";
import { filterNotificationDigest, fmtTR, normalizeNotificationDigest } from "../shared/operationsDigestUtils";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildBoardingRouteImpactCopilotFacts } from "../../utils/copilotFacts";
import {
  boardingChangeApplyBoundaryNote,
  boardingChangeApplyButtonLabel,
  boardingChangeApplySuccessNote,
  boardingChangeApplicationStatusLabel,
  boardingChangeDecisionLabel,
  boardingChangeDecisionOwnerLabel,
  boardingChangeDecisionOwnerNote,
  boardingChangeKindLabel,
  boardingChangeRouteRefreshLabel,
  boardingChangeRouteRefreshNote,
} from "../shared/boardingChangeUi";

function MiniStat({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 180px", minWidth: 180 }}>
      <div className="panelMeta" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          {subtitle ? <div className="panelMeta" style={{ marginTop: 4 }}>{subtitle}</div> : null}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function metricValue(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n : String(value);
}

function latestInviteByChild(invites = []) {
  const map = new Map();
  const rows = Array.isArray(invites) ? [...invites] : [];
  rows.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
  for (const item of rows) {
    const key = Number(item?.childPersonelId || 0);
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return map;
}

function isDifferentStopRequest(item = {}) {
  const kind = String(item?.requestKind || item?.kind || "").toUpperCase();
  const label = boardingChangeKindLabel(item?.requestKind || item?.kind);
  return kind.includes("ALTERNATE_STOP") || kind.includes("DIFFERENT_STOP") || String(label || "").includes("Farklı durak");
}

export default function SchoolOperationsPanel() {
  const { token, me } = useSession();
  const [students, setStudents] = useState([]);
  const [invites, setInvites] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedPreviewRequestId, setSelectedPreviewRequestId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSelectionNonce, setPreviewSelectionNonce] = useState(0);
  const [applyingRequestId, setApplyingRequestId] = useState(null);
  const [decidingRequestId, setDecidingRequestId] = useState(null);
  const [applyNotice, setApplyNotice] = useState("");
  const [decisionNotice, setDecisionNotice] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const previewCardRef = useRef(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const bulk = await loadSchoolOperationsBundle({ token });
      if (bulk) {
        setStudents(Array.isArray(bulk.students) ? bulk.students : []);
        setInvites(Array.isArray(bulk.invites) ? bulk.invites : []);
        setRequests(Array.isArray(bulk.requests) ? bulk.requests : []);
        setNotifications(Array.isArray(bulk.notifications) ? bulk.notifications : []);
        return;
      }
      const [studentsResp, invitesResp, requestsResp, notificationsResp] = await Promise.all([
        api("/api/company/personels?kind=STUDENT&take=120", { token }),
        api("/api/school/parent-invites?take=120", { token }),
        api("/api/requests", { token }).catch(() => []),
        api("/api/notifications/my", { token }).catch(() => []),
      ]);

      setStudents(Array.isArray(studentsResp?.items) ? studentsResp.items : Array.isArray(studentsResp) ? studentsResp : []);
      setInvites(Array.isArray(invitesResp?.items) ? invitesResp.items : Array.isArray(invitesResp) ? invitesResp : []);
      setRequests(Array.isArray(requestsResp?.items) ? requestsResp.items : Array.isArray(requestsResp) ? requestsResp : []);
      setNotifications(Array.isArray(notificationsResp?.items) ? notificationsResp.items : Array.isArray(notificationsResp) ? notificationsResp : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [token]);

  const handleApplyAcceptedRequest = useCallback(async (requestId) => {
    const id = Number(requestId || 0);
    if (!id) return;
    setApplyingRequestId(id);
    setErr("");
    setApplyNotice("");
    try {
      const result = await api(`/api/requests/${id}/apply-boarding-change`, { token, method: "POST" });
      setApplyNotice(result?.boardingChangeRouteRefreshNote || result?.boardingChangeRouteRefreshLabel || result?.applicationBoundaryNote || result?.applicationText || boardingChangeApplySuccessNote());
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setApplyingRequestId(null);
    }
  }, [load, token]);

  const handleDecideRequest = useCallback(async (requestId, status) => {
    const id = Number(requestId || 0);
    if (!id) return;
    const nextStatus = String(status || "").trim().toUpperCase();
    if (!["ACCEPTED", "CANCELLED"].includes(nextStatus)) return;
    setDecidingRequestId(id);
    setDecisionNotice("");
    setDecisionError("");
    try {
      const result = await api(`/api/requests/${id}/close`, {
        token,
        method: "POST",
        body: { status: nextStatus },
      });
      setDecisionNotice(result?.decisionText || (nextStatus === "ACCEPTED" ? "Talep onaylandı." : "Talep reddedildi."));
      await load();
    } catch (e) {
      setDecisionError(String(e?.message || e));
    } finally {
      setDecidingRequestId(null);
    }
  }, [load, token]);

  const handlePreviewRequestSelect = useCallback((row) => {
    const id = Number(row?.id || 0) || null;
    if (!id) return;
    setSelectedPreviewRequestId(id);
    setPreviewLoading(true);
    setPreviewSelectionNonce((value) => value + 1);
  }, []);

  const handlePreviewSelectionClear = useCallback(() => {
    setSelectedPreviewRequestId(null);
    setPreviewLoading(false);
    setPreviewSelectionNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  useAutoReload("school-operations", load);

  const notifRows = useMemo(() => normalizeNotificationDigest(notifications), [notifications]);
  const noBoardRows = useMemo(() => filterNotificationDigest(notifRows, ["bugün öğrencinizin servise binmeyeceği", "bugün öğrencim servise binmeyecek", "bugün binmeyecek"]), [notifRows]);
  const boardedRows = useMemo(() => filterNotificationDigest(notifRows, ["servise bindi", "okula ulaştı", "ulaştı"]), [notifRows]);
  const parentNotificationRows = useMemo(() => notifRows.slice(0, 10), [notifRows]);
  const inviteByChild = useMemo(() => latestInviteByChild(invites), [invites]);
  const riskRequestRows = useMemo(() => (Array.isArray(requests) ? requests : []).filter((item) => {
    const status = String(item?.status || "").toUpperCase();
    return ["REQUESTED", "OPEN", "PENDING", "COUNTERED"].includes(status) || item?.lat != null || item?.lng != null;
  }), [requests]);
  const acceptedRequestRows = useMemo(() => (Array.isArray(requests) ? requests : []).filter((item) => String(item?.status || "").toUpperCase() === "ACCEPTED"), [requests]);

  const studentRows = useMemo(
    () => (Array.isArray(students) ? students : []).slice(0, 12).map((student) => {
      const latestInvite = inviteByChild.get(Number(student?.id || 0)) || null;
      const siblingInviteCount = (Array.isArray(invites) ? invites : []).filter((it) => Number(it?.childPersonelId || 0) === Number(student?.id || 0)).length;
      return {
        id: student.id,
        name: student.fullName || student.name || `#${student.id}`,
        inviteStatus: latestInvite?.status || "-",
        inviteCount: siblingInviteCount,
        expiresAt: latestInvite?.expiresAt || null,
        boardingStatus: student.geoStatus || student.status || "-",
        note: [student.status, student.geoStatus].filter(Boolean).join(" • ") || "-",
      };
    }),
    [students, inviteByChild, invites]
  );

  const inviteRows = useMemo(
    () => (Array.isArray(invites) ? invites : []).slice(0, 12).map((invite) => ({
      id: invite.id,
      child: invite?.child?.fullName || invite?.child?.name || `#${invite?.childPersonelId || "-"}`,
      status: invite.status || "-",
      createdAt: invite.createdAt || null,
      expiresAt: invite.expiresAt || null,
    })),
    [invites]
  );

  const requestRows = useMemo(
    () => riskRequestRows.slice(0, 10).map((item) => ({
      id: item.id,
      personel: item?.personel?.fullName || item?.personel?.name || `#${item?.personelId || "-"}`,
      personelId: item?.personelId || item?.personel?.id || null,
      shift: item?.shift?.id || item?.shiftId || "-",
      shiftRecord: item?.shift || null,
      status: item?.status || "OPEN",
      requestKind: item?.requestKind || item?.kind || null,
      kind: boardingChangeKindLabel(item?.requestKind || item?.kind),
      decision: boardingChangeDecisionLabel(item?.decisionState || item?.status),
      decisionOwnerRole: item?.decisionOwnerRole || "COMPANY",
      decisionOwnerLabel: boardingChangeDecisionOwnerLabel(item),
      decisionOwnerNote: boardingChangeDecisionOwnerNote(item),
      detail: item?.decisionText || (item?.lat != null || item?.lng != null ? "Konumlu biniş değişikliği" : "Standart biniş değişikliği"),
      routeRefreshState: item?.boardingChangeRouteRefreshState || "NONE",
      routeRefreshLabel: item?.boardingChangeRouteRefreshLabel || boardingChangeRouteRefreshLabel(item),
      routeRefreshNote: item?.boardingChangeRouteRefreshNote || boardingChangeRouteRefreshNote(item),
      createdAt: item?.createdAt || item?.at || null,
      lat: item?.lat ?? null,
      lng: item?.lng ?? null,
      nearestStop: item?.nearestStop || null,
      preview: item?.routeImpactPreview || null,
    })),
    [riskRequestRows]
  );
  const acceptedRows = useMemo(
    () => acceptedRequestRows.slice(0, 10).map((item) => ({
      id: item.id,
      personel: item?.personel?.fullName || item?.personel?.name || `#${item?.personelId || "-"}`,
      personelId: item?.personelId || item?.personel?.id || null,
      shift: item?.shift?.id || item?.shiftId || "-",
      shiftRecord: item?.shift || null,
      status: item?.status || "ACCEPTED",
      requestKind: item?.requestKind || item?.kind || null,
      kind: boardingChangeKindLabel(item?.requestKind || item?.kind),
      decision: boardingChangeDecisionLabel(item?.decisionState || item?.status),
      decisionOwnerRole: item?.decisionOwnerRole || "COMPANY",
      decisionOwnerLabel: boardingChangeDecisionOwnerLabel(item),
      decisionOwnerNote: boardingChangeDecisionOwnerNote(item),
      detail: item?.boardingChangeApplicationText || item?.decisionText || (item?.lat != null || item?.lng != null ? "Kabul edilen biniş değişikliği" : "Kabul edilen değişiklik"),
      routeRefreshState: item?.boardingChangeRouteRefreshState || "NONE",
      routeRefreshLabel: item?.boardingChangeRouteRefreshLabel || boardingChangeRouteRefreshLabel(item),
      routeRefreshNote: item?.boardingChangeRouteRefreshNote || boardingChangeRouteRefreshNote(item),
      applicationStatus: item?.boardingChangeApplicationStatus || "READY",
      applicationText: item?.boardingChangeApplicationText || "",
      applicationAt: item?.boardingChangeAppliedAt || null,
      boundaryNote: item?.boardingChangeApplicationBoundaryNote || "",
      lat: item?.lat ?? null,
      lng: item?.lng ?? null,
      nearestStop: item?.nearestStop || null,
      preview: item?.routeImpactPreview || null,
    })),
    [acceptedRequestRows]
  );
  const requestSelectionRows = useMemo(() => [...requestRows, ...acceptedRows], [requestRows, acceptedRows]);

  const diffStopRows = useMemo(() => [...requestRows, ...acceptedRows].filter((row) => isDifferentStopRequest(row)).map((row) => ({
    key: `request-${row.id}`,
    title: row.personel,
    message: `${row.kind} • ${row.decision}${row.detail ? ` • ${row.detail}` : ""}`,
  })), [acceptedRows, requestRows]);

  const selectedPreviewRequest = useMemo(() => {
    if (!requestSelectionRows.length) return null;
    const desiredId = Number(selectedPreviewRequestId || 0);
    if (desiredId > 0) {
      const hit = requestSelectionRows.find((item) => Number(item?.id || 0) === desiredId);
      if (hit) return hit;
    }
    if (!riskRequestRows.length) return acceptedRequestRows[0] || null;
    return null;
  }, [acceptedRequestRows, requestSelectionRows, riskRequestRows.length, selectedPreviewRequestId]);

  const selectedPreview = useMemo(() => selectedPreviewRequest?.preview || null, [selectedPreviewRequest]);

  useEffect(() => {
    if (!selectedPreviewRequestId) {
      setPreviewLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      try {
        previewCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        previewCardRef.current?.focus?.({ preventScroll: true });
      } catch {
        /* no-op */
      }
      setPreviewLoading(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [previewSelectionNonce, selectedPreviewRequestId]);

  const selectedPreviewFacts = useMemo(() => {
    if (!selectedPreviewRequest || !selectedPreview) return null;
    return buildBoardingRouteImpactCopilotFacts({
      preview: selectedPreview,
      request: selectedPreviewRequest,
      screenPath: "/school/operations",
    });
  }, [selectedPreview, selectedPreviewRequest]);

  const selectedPreviewSelection = useMemo(() => {
    if (!selectedPreviewRequest || !selectedPreview || !selectedPreviewFacts) return null;
    const personLabel = resolvePersonDisplayLabel(selectedPreviewRequest, selectedPreview, "Kişi bilgisi eksik");
    const summary = selectedPreviewRequest?.boardingChangeApplicationText || selectedPreview.summaryLine || selectedPreview.previewOnlyNote || selectedPreviewRequest?.detail || "";
    const applicationStatusLabel = selectedPreviewRequest?.boardingChangeApplicationStatus
      ? boardingChangeApplicationStatusLabel(selectedPreviewRequest.boardingChangeApplicationStatus)
      : (selectedPreview.reliability?.label || "Önizleme");
    return {
      scopeKey: "/school/operations",
      entityType: "screen",
      entityId: Number(selectedPreviewRequest?.id || 0) || 0,
      label: `${selectedPreview.changeTypeLabel || boardingChangeKindLabel(selectedPreviewRequest?.kind)} • ${personLabel}`,
      summary,
      selectedLabel: personLabel,
      selectedSummary: summary,
      selectedRecordLabel: personLabel,
      selectedRecordSummary: summary,
      selectedRecordStatus: applicationStatusLabel,
      helpContextSummary: `${selectedPreviewRequest?.decisionOwnerNote || selectedPreviewRequest?.boardingChangeApplicationBoundaryNote || selectedPreview.previewOnlyNote || ""} ${selectedPreview.nextBestAction || ""}`.trim(),
      contextSummary: summary,
      selectedRecord: {
        label: personLabel,
        summary,
        status: applicationStatusLabel,
        changeType: selectedPreview.changeTypeLabel,
        oldStopLabel: selectedPreview.oldStopLabel,
        newStopLabel: selectedPreview.newStopLabel,
        decisionOwnerLabel: selectedPreviewRequest?.decisionOwnerLabel || boardingChangeDecisionOwnerLabel(selectedPreviewRequest),
        decisionOwnerNote: selectedPreviewRequest?.decisionOwnerNote || boardingChangeDecisionOwnerNote(selectedPreviewRequest),
        applicationStatus: selectedPreviewRequest?.boardingChangeApplicationStatus || null,
        applicationBoundaryNote: selectedPreviewRequest?.boardingChangeApplicationBoundaryNote || null,
        previewOnlyNote: selectedPreview.previewOnlyNote,
      },
      selectedFields: [
        { label: "Değişiklik Türü", value: selectedPreview.changeTypeLabel || "-" },
        { label: "Eski Durak", value: selectedPreview.oldStopLabel || "-" },
        { label: "Yeni / Geçici Durak", value: selectedPreview.newStopLabel || "-" },
        { label: "Karar Sahibi", value: selectedPreviewRequest?.decisionOwnerLabel || boardingChangeDecisionOwnerLabel(selectedPreviewRequest) },
        { label: "Kişi Etkisi", value: `${selectedPreview.currentPeopleCount} → ${selectedPreview.previewPeopleCount}` },
        { label: "Durak Etkisi", value: `${selectedPreview.currentStopCount} → ${selectedPreview.previewStopCount}` },
        { label: "Km Etkisi", value: `${selectedPreview.distanceDeltaKm?.toFixed ? selectedPreview.distanceDeltaKm.toFixed(2) : selectedPreview.distanceDeltaKm} km` },
        { label: "Süre Etkisi", value: `${selectedPreview.durationDeltaMin} dk` },
        { label: "Kapasite", value: selectedPreview.capacityImpact?.status || "-" },
        { label: "Güvenilirlik", value: selectedPreview.reliability?.label || "-" },
      ],
      selectedBadges: [
        { label: "Uygulama", value: selectedPreviewRequest?.boardingChangeApplicationStatus ? applicationStatusLabel : (selectedPreview.previewOnlyNote || "Bu sadece önizlemedir.") },
        { label: "ETA", value: selectedPreview.reliability?.label || "ETA hesaplanamıyor" },
      ],
      facts: selectedPreviewFacts,
      liveFacts: selectedPreviewFacts,
      structuredFacts: selectedPreviewFacts,
      screenPath: "/school/operations",
    };
  }, [selectedPreview, selectedPreviewFacts, selectedPreviewRequest]);

  const previewSelectionLabel = useMemo(() => {
    if (!selectedPreviewRequest) return "";
    const personLabel = resolvePersonDisplayLabel(selectedPreviewRequest, selectedPreview, "Kişi bilgisi eksik");
    return `${boardingChangeKindLabel(selectedPreviewRequest?.requestKind || selectedPreviewRequest?.kind)} • ${personLabel}`;
  }, [selectedPreview, selectedPreviewRequest]);

  const previewSelectionNote = useMemo(() => {
    if (!requestSelectionRows.length) return "";
    if (!selectedPreviewRequestId && selectedPreviewRequest) {
      return "Açık istek yok; ilk kabul edilen kayıt gösteriliyor.";
    }
    if (selectedPreviewRequestId && selectedPreviewRequest) {
      return selectedPreviewRequest?.decisionOwnerNote || selectedPreviewRequest?.routeRefreshNote || selectedPreviewRequest?.routeRefreshLabel || "Salt okunur önizleme seçildi.";
    }
    return "Seçili satırın salt okunur önizlemesi burada gösterilir.";
  }, [requestSelectionRows.length, selectedPreviewRequest, selectedPreviewRequestId]);

  useEffect(() => {
    if (!selectedPreviewSelection) {
      clearCopilotSelection("/school/operations");
      return;
    }
    setCopilotSelection(selectedPreviewSelection);
    return () => clearCopilotSelection("/school/operations");
  }, [selectedPreviewSelection]);

  const tabItems = useMemo(() => ([
    { key: "summary", label: "Özet" },
    { key: "students", label: "Öğrenci Servisleri", badge: studentRows.length },
    { key: "parent", label: "Veli & Bildirimler", badge: inviteRows.length + parentNotificationRows.length },
    { key: "exceptions", label: "İstisnalar / Günlük Değişiklikler", badge: noBoardRows.length + diffStopRows.length + riskRequestRows.length },
    { key: "proof", label: "Kanıt / Check-in" },
    { key: "history", label: "Geçmiş", badge: notifRows.length + requestRows.length },
  ]), [
    diffStopRows.length,
    inviteRows.length,
    noBoardRows.length,
    notifRows.length,
    parentNotificationRows.length,
    requestRows.length,
    riskRequestRows.length,
    studentRows.length,
  ]);

  if (me?.companyKind !== "SCHOOL") {
    return <div className="card err">Bu panel yalnızca SCHOOL scope için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Okul Operasyon Paneli"
        subtitle="Öğrenci servisleri, veli bağlantıları ve günlük istisnaları summary-first biçimde okur."
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
            <button className="btn sm" onClick={() => navigate("/school/parents")}>Veli Erişimi</button>
            <button className="btn sm" onClick={() => setActiveTab("proof")}>Check-in</button>
            <button className="btn sm" onClick={() => setActiveTab("parent")}>Bildirimler</button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}
      {applyNotice ? <div className="card" style={{ borderColor: "rgba(18, 183, 106, 0.28)", background: "rgba(18, 183, 106, 0.08)" }}>{applyNotice}</div> : null}
      {decisionNotice ? <div className="card" style={{ borderColor: "rgba(18, 183, 106, 0.28)", background: "rgba(18, 183, 106, 0.08)" }}>{decisionNotice}</div> : null}
      {decisionError ? <div className="card err">{decisionError}</div> : null}

      <PanelSegmentTabs
        ariaLabel="Okul Operasyon Paneli bölümleri"
        tabs={tabItems}
        value={activeTab}
        onChange={setActiveTab}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MiniStat title="Öğrenci servis atamaları" value={metricValue(students.length)} note="Öğrenci envanteri" />
        <MiniStat title="Veli bağlantıları" value={metricValue(invites.length)} note="Aktif ve geçmiş erişim" />
        <MiniStat title="Bugün binmeyecek öğrenciler" value={metricValue(noBoardRows.length)} note="Bildirim özetinden okunur" />
        <MiniStat title="Farklı duraktan binecek öğrenciler" value={metricValue(diffStopRows.length)} note="Açık ve kabul edilen isteklerden okunur" />
        <MiniStat title="Servise bindi / okula ulaştı" value={metricValue(boardedRows.length)} note="Canlı durum bildirimleri" />
        <MiniStat title="Veli bildirim geçmişi" value={metricValue(parentNotificationRows.length)} note="Son kayıtlar" />
      </div>

      {activeTab === "summary" ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <SectionCard title="Sıradaki doğru kontrol" subtitle="Önce en sıcak sinyali okur, sonra ilgili sekmeye geçersin">
            <div style={{ display: "grid", gap: 8 }}>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Bugün binmeyecek öğrenciler</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{noBoardRows[0]?.title || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{noBoardRows[0]?.message || "Canlı sinyal bekleniyor."}</div>
              </div>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Farklı duraktan binecek öğrenciler</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{diffStopRows[0]?.title || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{diffStopRows[0]?.message || "Durak farkı bildirimi yok."}</div>
              </div>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Son bildirim</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{parentNotificationRows[0]?.title || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{parentNotificationRows[0]?.message || "Bildirim akışı bekleniyor."}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn sm" onClick={() => setActiveTab("students")}>Öğrenci Servisleri</button>
                <button type="button" className="btn sm" onClick={() => setActiveTab("parent")}>Veli & Bildirimler</button>
                <button type="button" className="btn sm" onClick={() => setActiveTab("exceptions")}>İstisnalar</button>
                <button type="button" className="btn sm" onClick={() => setActiveTab("proof")}>Kanıt / Check-in</button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Canlı bağlam" subtitle="Seçili kayıt yoksa en güncel özet görünür">
            <div style={{ display: "grid", gap: 8 }}>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Öğrenci</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{studentRows[0]?.name || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{studentRows[0]?.note || "Öğrenci bağlamı bekleniyor."}</div>
              </div>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Veli bağlantısı</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{inviteRows[0]?.child || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{inviteRows[0]?.status ? displayStatusLabel(inviteRows[0].status) : "Bağlantı bekleniyor."}</div>
              </div>
              <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>Operasyon isteği</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{requestRows[0]?.personel || "Kayıt yok"}</div>
                <div className="muted" style={{ marginTop: 4 }}>{requestRows[0]?.detail || "İstek akışı bekleniyor."}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "students" ? (
        <SectionCard title="Öğrenci servisleri" subtitle="Öğrenci servis atamaları ve kısa biniş özeti">
          <div className="tableWrap">
            <table className="tbl" style={{ whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Veli bağlantısı</th>
                  <th>Durum</th>
                  <th>Biniş</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.length ? studentRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.inviteCount} bağlantı</td>
                    <td>{displayStatusLabel(row.inviteStatus)}</td>
                    <td>{displayStatusLabel(row.boardingStatus)}</td>
                    <td>{row.note}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="muted">Öğrenci kaydı bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "parent" ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <SectionCard title="Veli bağlantıları" subtitle="Geçerli ve geçmiş erişim kayıtları">
            <div className="tableWrap">
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Durum</th>
                    <th>Oluşturma</th>
                    <th>Bitiş</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteRows.length ? inviteRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.child}</td>
                      <td>{displayStatusLabel(row.status)}</td>
                      <td>{fmtTR(row.createdAt)}</td>
                      <td>{fmtTR(row.expiresAt)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} className="muted">Henüz veli bağlantısı yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Bildirim özeti" subtitle="Son veli bildirimleri ve canlı servis sinyalleri">
            <div style={{ display: "grid", gap: 8 }}>
              {parentNotificationRows.slice(0, 3).length ? parentNotificationRows.slice(0, 3).map((row) => (
                <div key={row.id} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span>
                  </div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(row.at)}</div>
                </div>
              )) : <div className="muted">Son veli bildirimi yok.</div>}

              <div style={{ marginTop: 6, fontWeight: 700 }}>Servise bindi / okula ulaştı</div>
              <div style={{ display: "grid", gap: 8 }}>
                {boardedRows.length ? boardedRows.slice(0, 4).map((row) => (
                  <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                  </div>
                )) : <div className="muted">Servise bindi / okula ulaştı kaydı yok.</div>}
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "exceptions" ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div ref={previewCardRef} tabIndex={-1} style={{ gridColumn: "1 / -1", scrollMarginTop: 16, outline: "none" }}>
            <BoardingRouteImpactPreviewCard
              preview={previewLoading ? null : selectedPreview}
              request={selectedPreviewRequest}
              loading={previewLoading}
              emptyText={selectedPreviewRequestId ? "Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok." : ""}
              selectionLabel={previewSelectionLabel}
              selectionNote={previewSelectionNote}
              decisionOwnerLabel={selectedPreviewRequest?.decisionOwnerLabel || boardingChangeDecisionOwnerLabel(selectedPreviewRequest)}
              decisionOwnerNote={selectedPreviewRequest?.decisionOwnerNote || boardingChangeDecisionOwnerNote(selectedPreviewRequest)}
              onClearSelection={selectedPreviewRequestId ? handlePreviewSelectionClear : null}
              title="Rota etkisi önizlemesi"
            />
          </div>

          <SectionCard title="Bugün binmeyecek öğrenciler" subtitle="Bugün servise binmeyeceği bildirilen kayıtlar">
            <div style={{ display: "grid", gap: 8 }}>
              {noBoardRows.length ? noBoardRows.slice(0, 5).map((row) => (
                <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                </div>
              )) : <div className="muted">Bugün binmeyeceğini bildiren öğrenci kaydı yok.</div>}
            </div>
          </SectionCard>

          <SectionCard title="Farklı duraktan binecek öğrenciler" subtitle="Açık ve kabul edilen durak değişikliği istekleri">
            <div style={{ display: "grid", gap: 8 }}>
              {diffStopRows.length ? diffStopRows.slice(0, 5).map((row) => (
                <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                </div>
              )) : <div className="muted">Farklı durak kaydı yok.</div>}
            </div>
          </SectionCard>

          <SectionCard title="Riskli / onay bekleyen istekler" subtitle="Konumlu veya açık biniş değişikliği kayıtları">
            <div className="tableWrap">
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Kişi</th>
                    <th>Shift</th>
                    <th>Durum</th>
                    <th>Tür</th>
                    <th>Karar</th>
                    <th>Zaman</th>
                    <th>Önizleme</th>
                  </tr>
                </thead>
                <tbody>
                  {requestRows.length ? requestRows.map((row) => {
                    const decisionOwnerRole = String(row.decisionOwnerRole || "").trim().toUpperCase();
                    return (
                    <tr
                      key={row.id}
                      style={Number(selectedPreviewRequestId || 0) === Number(row.id || 0)
                        ? { background: "rgba(59, 130, 246, 0.12)" }
                        : undefined}
                    >
                      <td>{row.personel}</td>
                      <td>#{row.shift}</td>
                      <td>{displayStatusLabel(row.status)}</td>
                      <td>{row.kind}</td>
                      <td>
                        <div>{row.decision}</div>
                        <div className="panelMeta" style={{ marginTop: 4 }}>{row.decisionOwnerNote}</div>
                        {/* String(row.decisionOwnerRole || "").toUpperCase() === "COMPANY" && String(row.status || "").toUpperCase() === "OPEN" */}
                        {decisionOwnerRole === "COMPANY" && String(row.status || "").toUpperCase() === "OPEN" ? (
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn sm"
                              disabled={Number(decidingRequestId || 0) === Number(row.id || 0)}
                              onClick={() => handleDecideRequest(row.id, "ACCEPTED")}
                            >
                              {Number(decidingRequestId || 0) === Number(row.id || 0) ? "..." : "Kabul et"}
                            </button>
                            <button
                              type="button"
                              className="btn sm ghost"
                              disabled={Number(decidingRequestId || 0) === Number(row.id || 0)}
                              onClick={() => handleDecideRequest(row.id, "CANCELLED")}
                            >
                              {Number(decidingRequestId || 0) === Number(row.id || 0) ? "..." : "Reddet"}
                            </button>
                          </div>
                        ) : null}
                        {/* String(row.decisionOwnerRole || "").toUpperCase() === "DRIVER" && String(row.status || "").toUpperCase() === "OPEN" */}
                        {decisionOwnerRole === "DRIVER" && String(row.status || "").toUpperCase() === "OPEN" ? (
                          <div className="panelMeta" style={{ marginTop: 8 }}>Sürücü tarafında karar bekliyor.</div>
                        ) : null}
                      </td>
                      <td>{fmtTR(row.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn sm"
                          aria-pressed={Number(selectedPreviewRequestId || 0) === Number(row.id || 0)}
                          onClick={() => handlePreviewRequestSelect(row)}
                          style={Number(selectedPreviewRequestId || 0) === Number(row.id || 0)
                            ? { borderColor: "rgba(59, 130, 246, 0.55)", boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.18)" }
                            : undefined}
                        >
                          {previewLoading && Number(selectedPreviewRequestId || 0) === Number(row.id || 0) ? "Önizleniyor..." : "Rota etkisini önizle"}
                        </button>
                      </td>
                    </tr>
                    );
                  }) : <tr><td colSpan={7} className="muted">Riskli istek yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Kabul edilen değişiklikler" subtitle={boardingChangeApplyBoundaryNote()}>
            <div className="tableWrap">
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Kişi</th>
                    <th>Shift</th>
                    <th>Durum</th>
                    <th>Tür</th>
                    <th>Uygulama</th>
                    <th>Zaman</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedRows.length ? acceptedRows.map((row) => {
                    const statusLabel = boardingChangeApplicationStatusLabel(row.applicationStatus || "READY");
                    const canApply = String(row.applicationStatus || "").toUpperCase() === "READY";
                    const isApplying = Number(applyingRequestId || 0) === Number(row.id || 0);
                    return (
                      <tr key={`accepted-${row.id}`}>
                        <td>{row.personel}</td>
                        <td>#{row.shift}</td>
                        <td>{displayStatusLabel(row.status)}</td>
                        <td>{row.kind}</td>
                        <td>{statusLabel}</td>
                        <td>{fmtTR(row.applicationAt || row.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {canApply ? (
                              <button
                                type="button"
                                className="btn sm"
                                onClick={() => handleApplyAcceptedRequest(row.id)}
                                disabled={isApplying}
                              >
                                {isApplying ? "..." : boardingChangeApplyButtonLabel()}
                              </button>
                            ) : (
                              <span className="muted">{row.applicationText || boardingChangeApplySuccessNote()}</span>
                            )}
                          </div>
                          {row.routeRefreshLabel ? <div className="panelMeta" style={{ marginTop: 4 }}>{row.routeRefreshLabel}</div> : null}
                          {row.routeRefreshNote ? <div className="panelMeta" style={{ marginTop: 4 }}>{row.routeRefreshNote}</div> : null}
                          {row.boundaryNote ? <div className="panelMeta" style={{ marginTop: 4 }}>{row.boundaryNote}</div> : null}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={7} className="muted">Kabul edilen değişiklik yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "proof" ? (
        <OperationProofMiniCard
          manualNoteScopeType="SERVICE"
          manualNoteScopeId="school-operations"
        />
      ) : null}

      {activeTab === "history" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <SectionCard title="Geçmiş servis hareketleri" subtitle="Son veli bildirimleri ve sinyal akışı">
            <div style={{ display: "grid", gap: 8 }}>
              {notifRows.length ? notifRows.slice(0, 10).map((row) => (
                <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span>
                  </div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(row.at)}</div>
                </div>
              )) : <div className="muted">Geçmiş servis hareketi yok.</div>}
            </div>
          </SectionCard>

          <SectionCard title="Geçmiş günlük değişiklikler" subtitle="Karar bekleyen veya sonuçlanan operasyon istekleri">
            <div className="tableWrap">
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Kişi</th>
                    <th>Shift</th>
                    <th>Durum</th>
                    <th>Tür</th>
                    <th>Karar</th>
                    <th>Zaman</th>
                  </tr>
                </thead>
                <tbody>
                  {requestRows.length ? requestRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.personel}</td>
                      <td>#{row.shift}</td>
                      <td>{displayStatusLabel(row.status)}</td>
                      <td>{row.kind}</td>
                      <td>{row.decision}</td>
                      <td>{fmtTR(row.createdAt)}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="muted">Geçmiş günlük değişiklik yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
