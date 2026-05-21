import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CollapsibleSection from "../../components/CollapsibleSection";
import OperationProofMiniCard from "../../components/OperationProofMiniCard";
import { displayStatusLabel } from "../../utils/displayStatus";
import { filterNotificationDigest, fmtTR, normalizeNotificationDigest } from "../shared/operationsDigestUtils";
import { boardingChangeDecisionLabel, boardingChangeKindLabel } from "../shared/boardingChangeUi";

function companyBaseFromKind(kind) {
  const k = String(kind || "").toUpperCase();
  if (k === "ORGANIZATION") return "/organization";
  return "/company";
}

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

function getShiftAssignmentLabel(personel = {}) {
  const candidates = [
    personel?.currentShift?.id,
    personel?.shift?.id,
    personel?.activeShiftId,
    personel?.shiftId,
    personel?.assignedShiftId,
    personel?.assignment?.shiftId,
  ];
  const raw = candidates.find((v) => Number.isFinite(Number(v)) && Number(v) > 0);
  return raw ? `#${raw}` : "-";
}

function getPersonelStatusLabel(personel = {}) {
  const parts = [
    personel?.status,
    personel?.activeStatus,
    personel?.geoStatus,
    personel?.assignmentStatus,
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
}

function getShiftContractLabel(shift = {}) {
  const agreementId = Number(shift?.agreementId || 0);
  return agreementId > 0 ? `Sözleşme #${agreementId}` : "-";
}

export default function CompanyOperationsPanel() {
  const { token, me } = useSession();
  const [personels, setPersonels] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [notificationQ, setNotificationQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const companyKind = String(me?.companyKind || "COMPANY").toUpperCase();
  const basePath = companyBaseFromKind(companyKind);
  const title = companyKind === "ORGANIZATION" ? "Kurum Operasyon Paneli" : "Şirket Operasyon Paneli";
  const subtitle = companyKind === "ORGANIZATION"
    ? "Personel, vardiya, biniş değişikliği ve bildirim özetini tek yerde okur."
    : "Personel, vardiya, biniş değişikliği ve bildirim özetini tek yerde okur.";

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [personelsResp, shiftsResp, requestsResp, notificationsResp, summaryResp] = await Promise.all([
        api("/api/company/personels?kind=PERSONEL&take=120", { token }),
        api("/api/shifts?take=120&status=APPROVED,ACTIVE,DONE", { token }),
        api("/api/requests?onlyOpen=1&onlyActive=1", { token }).catch(() => []),
        api("/api/notifications/my", { token }).catch(() => []),
        api(`/api/reports/shifts/summary?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`, { token }).catch(() => null),
      ]);

      setPersonels(Array.isArray(personelsResp?.items) ? personelsResp.items : Array.isArray(personelsResp) ? personelsResp : []);
      setShifts(Array.isArray(shiftsResp?.items) ? shiftsResp.items : Array.isArray(shiftsResp) ? shiftsResp : []);
      setRequests(Array.isArray(requestsResp?.items) ? requestsResp.items : Array.isArray(requestsResp) ? requestsResp : []);
      setNotifications(Array.isArray(notificationsResp?.items) ? notificationsResp.items : Array.isArray(notificationsResp) ? notificationsResp : []);
      setShiftSummary(summaryResp || null);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  useAutoReload("company-operations", load);

  const notifRows = useMemo(() => normalizeNotificationDigest(notifications), [notifications]);
  const noBoardRows = useMemo(() => filterNotificationDigest(notifRows, ["bugün servisi kullanmayacağ", "bugün binmeyecek", "servisi kullanmayacağım"]), [notifRows]);
  const diffStopRows = useMemo(() => filterNotificationDigest(notifRows, ["farklı duraktan", "farklı durak"]), [notifRows]);
  const lateRows = useMemo(() => filterNotificationDigest(notifRows, ["yetişem", "gecik", "kaçır"]), [notifRows]);
  const boardedRows = useMemo(() => filterNotificationDigest(notifRows, ["servise bindi", "bindi"]), [notifRows]);
  const arrivedRows = useMemo(() => filterNotificationDigest(notifRows, ["okula ulaştı", "ulaştı"]), [notifRows]);

  const openRequestRows = useMemo(() => (Array.isArray(requests) ? requests : []).filter((item) => {
    const status = String(item?.status || "").toUpperCase();
    return ["REQUESTED", "OPEN", "PENDING", "COUNTERED"].includes(status) || item?.lat != null || item?.lng != null;
  }), [requests]);

  const activeShiftRows = useMemo(() => (Array.isArray(shifts) ? shifts : []).filter((item) => ["APPROVED", "ACTIVE"].includes(String(item?.status || "").toUpperCase())), [shifts]);
  const activeContractRows = useMemo(() => activeShiftRows.filter((item) => Number(item?.agreementId || 0) > 0), [activeShiftRows]);
  const liveDigest = useMemo(() => `${lateRows.length} yetişememe • ${boardedRows.length} biniş • ${arrivedRows.length} ulaşma`, [lateRows.length, boardedRows.length, arrivedRows.length]);

  const todayShiftCount = Number(shiftSummary?.total || shifts.length || 0);
  const todayActiveCount = Number(shiftSummary?.byStatus?.ACTIVE || activeShiftRows.length || 0);
  const todayApprovedCount = Number(shiftSummary?.byStatus?.APPROVED || activeShiftRows.filter((item) => String(item?.status || "").toUpperCase() === "APPROVED").length || 0);

  const personelRows = useMemo(
    () => (Array.isArray(personels) ? personels : []).slice(0, 10).map((personel) => ({
      id: personel.id,
      name: personel.fullName || personel.name || `#${personel.id}`,
      status: getPersonelStatusLabel(personel),
      assignment: getShiftAssignmentLabel(personel),
      note: [personel.phone, personel.email].filter(Boolean).join(" • ") || "-",
    })),
    [personels]
  );

  const serviceRows = useMemo(
    () => activeShiftRows.slice(0, 10).map((shift) => ({
      id: shift.id,
      status: shift.status,
      startAt: shift.startAt,
      endAt: shift.endAt,
      agreement: getShiftContractLabel(shift),
      driver: shift.driver?.fullName || shift.driver?.name || `#${shift.driverId || "-"}`,
      vehicle: shift.vehicle?.plate || `#${shift.vehicleId || "-"}`,
    })),
    [activeShiftRows]
  );

  const requestRows = useMemo(
    () => openRequestRows.slice(0, 10).map((item) => ({
      id: item.id,
      personel: item?.personel?.fullName || item?.personel?.name || `#${item?.personelId || "-"}`,
      shift: item?.shift?.id || item?.shiftId || "-",
      status: item?.status || "OPEN",
      kind: boardingChangeKindLabel(item?.requestKind || item?.kind),
      decision: boardingChangeDecisionLabel(item?.decisionState || item?.status),
      detail: item?.decisionText || (item?.lat != null || item?.lng != null ? "Konumlu biniş değişikliği" : "Standart biniş değişikliği"),
      createdAt: item?.createdAt || item?.at || null,
    })),
    [openRequestRows]
  );

  const notificationRows = useMemo(
    () => notifRows.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message || "-",
      at: item.at,
      kind: item.kind || item.type || "-",
    })),
    [notifRows]
  );
  const notificationFilteredRows = useMemo(() => {
    const q = String(notificationQ || "").trim().toLowerCase();
    if (!q) return notificationRows;
    return notificationRows.filter((row) => [row.title, row.message, row.kind, fmtTR(row.at)].join(" • ").toLowerCase().includes(q));
  }, [notificationQ, notificationRows]);
  const openRequestCount = openRequestRows.length;
  const exceptionCount = openRequestRows.length + noBoardRows.length + diffStopRows.length;
  const hasAlertBand = notificationRows.length > 0;
  const alertBandTitle = hasAlertBand ? `Yeni bildirim var · ${notificationRows.length} kayıt` : "";
  const alertBandSubtitle = hasAlertBand
    ? "Bildirim detayları Bildirimler tabında; ana ekranı uzatmadan hızlı haber veriyoruz."
    : "";
  const tabCounts = useMemo(() => ({
    summary: todayShiftCount,
    cluster: activeContractRows.length,
    personel: personels.length,
    serviceTimes: activeShiftRows.length,
    exceptions: exceptionCount,
    notifications: notificationRows.length,
  }), [todayShiftCount, activeContractRows.length, personels.length, activeShiftRows.length, exceptionCount, notificationRows.length]);
  const nextAction = useMemo(() => {
    if (notificationRows.length > 0) {
      return { tab: "notifications", label: "Bildirimleri aç", note: `${notificationRows.length} kayıt Bildirimler tabında.` };
    }
    if (openRequestCount > 0) {
      return { tab: "exceptions", label: "Eksik değişiklikleri aç", note: `${openRequestCount} açık / onay bekleyen kayıt var.` };
    }
    if (noBoardRows.length > 0) {
      return { tab: "exceptions", label: "Servis kullanmayacak personeller", note: `${noBoardRows.length} kayıt bildirim akışından geliyor.` };
    }
    if (diffStopRows.length > 0) {
      return { tab: "exceptions", label: "Farklı durak kayıtları", note: `${diffStopRows.length} kayıt konum / durak sinyalinden okunuyor.` };
    }
    if (activeContractRows.length > 0) {
      return { tab: "cluster", label: "Servis Kümesini incele", note: `${activeContractRows.length} sözleşmeli aktif vardiya var.` };
    }
    return { tab: "personel", label: "Personel tabına geç", note: "Bugünkü personel görünümünü doğrula." };
  }, [activeContractRows.length, diffStopRows.length, noBoardRows.length, notificationRows.length, openRequestCount]);
  const unassignedPersonelRows = useMemo(
    () => personelRows.filter((row) => String(row.assignment || "").trim() === "-" || String(row.assignment || "").trim() === ""),
    [personelRows]
  );

  if (me?.role !== "COMPANY") {
    return <div className="card err">Bu panel yalnızca COMPANY scope için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title={title}
        subtitle={subtitle}
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={load} disabled={busy}>
              {busy ? "..." : "Yenile"}
            </button>
            <button className="btn sm" onClick={() => navigate(basePath + "/shifts")}>Vardiyalar</button>
            <button className="btn sm" onClick={() => navigate(basePath + "/agreements")}>Sözleşmeler</button>
            <button className="btn sm" onClick={() => navigate(basePath + "/checkin")}>Check-in</button>
            <button className="btn sm" onClick={() => navigate(basePath + "/map")}>Harita</button>
            <button className="btn sm" onClick={() => navigate("/shared/notifications")}>Bildirimler</button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MiniStat title="Personel" value={metricValue(personels.length)} note="Şirket kapsamındaki personel kaydı" />
        <MiniStat title="Servis durumu" value={metricValue(todayShiftCount)} note={`Aktif ${todayActiveCount} • Onaylı ${todayApprovedCount}`} />
        <MiniStat title="Değişiklik" value={metricValue(openRequestRows.length)} note="Açık veya onay bekleyen kayıtlar" />
        <MiniStat title="Servis dışı" value={metricValue(noBoardRows.length)} note="Bildirim akışından türetilir" />
        <MiniStat title="Farklı durak" value={metricValue(diffStopRows.length)} note="Konum / durak sinyalinden okunur" />
        <MiniStat title="Sözleşme ilişkisi" value={metricValue(activeContractRows.length)} note="Sözleşmeye bağlı aktif vardiyalar" />
        <MiniStat title="Bildirim" value={metricValue(notifRows.length)} note={liveDigest} />
      </div>

      {hasAlertBand ? (
        <div className="card" style={{ borderColor: "rgba(245, 158, 11, 0.36)", background: "rgba(245, 158, 11, 0.08)" }}>
          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">{alertBandTitle}</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>{alertBandSubtitle}</div>
            </div>
            <button type="button" className="btn sm" onClick={() => setActiveTab("notifications")}>Bildirimleri aç</button>
          </div>
        </div>
      ) : null}

      <PanelSegmentTabs
        ariaLabel="Şirket operasyon sekmeleri"
        tabs={[
          { key: "summary", label: "Özet", badge: tabCounts.summary || 0 },
          { key: "cluster", label: "Servis Kümesi", badge: tabCounts.cluster || 0 },
          { key: "personel", label: "Personel", badge: tabCounts.personel || 0 },
          { key: "serviceTimes", label: "Servis Zamanları", badge: tabCounts.serviceTimes || 0 },
          { key: "exceptions", label: "İstisnalar / Değişiklikler", badge: tabCounts.exceptions || 0 },
          { key: "notifications", label: "Bildirimler", badge: tabCounts.notifications || 0 },
        ]}
        value={activeTab}
        onChange={(tab) => setActiveTab(String(tab || "summary"))}
        compact
      />

      {activeTab === "summary" ? (
        <div role="tabpanel" aria-label="Özet" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 0.75fr)", gap: 12, minWidth: 0 }}>
            <SectionCard title="Ana operasyon durumu" subtitle="Kısa özet ve kritik işaretler">
              <div style={{ display: "grid", gap: 10 }}>
                <div className="panelBody">
                  Bugün {metricValue(todayShiftCount)} servis görünümü var. {metricValue(todayActiveCount)} aktif, {metricValue(todayApprovedCount)} onaylı kayıt okunuyor. {metricValue(exceptionCount)} istisna/değişiklik ve {metricValue(notificationRows.length)} bildirim tablara ayrıldı.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="pill" data-status="OK">Aktif servis • {metricValue(todayActiveCount)}</span>
                  <span className="pill" data-status="COUNT">Personel • {metricValue(personels.length)}</span>
                  <span className="pill" data-status={exceptionCount > 0 ? "WARN" : "OK"}>İstisna • {metricValue(exceptionCount)}</span>
                  <span className="pill" data-status={notificationRows.length > 0 ? "PENDING" : "INFO"}>Bildirim • {metricValue(notificationRows.length)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Sıradaki önerilen kontrol" subtitle="Tek CTA ile ilgili sekmeye geç">
              <div style={{ display: "grid", gap: 10 }}>
                <div className="panelBody">{nextAction.note}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn sm" onClick={() => setActiveTab(nextAction.tab)}>{nextAction.label}</button>
                  <button type="button" className="btn sm" onClick={() => setActiveTab("cluster")}>Servis Kümesi</button>
                  <button type="button" className="btn sm" onClick={() => setActiveTab("personel")}>Personel</button>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Kısa operasyon notu" subtitle="Bu ekran ana özet ve ilgili sekmelere hızlı geçiş için kullanılır">
            <div className="panelMeta">
              Operasyon detayları, servis kümesi, personel servis zamanları, istisnalar ve bildirimler ayrı sekmelere taşındı. Aynı listeyi iki yerde tekrar etmiyoruz.
            </div>
          </SectionCard>

          <CollapsibleSection
            title="Servis Kanıtı"
            subtitle="Hakediş için nihai karar değildir."
            compact
          >
            <OperationProofMiniCard
              manualNoteScopeType="SERVICE"
              manualNoteScopeId={`company-operations-${companyKind.toLowerCase()}`}
            />
          </CollapsibleSection>
        </div>
      ) : null}

      {activeTab === "cluster" ? (
        <div role="tabpanel" aria-label="Servis Kümesi" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <SectionCard
            title="Servis Kümesi"
            subtitle="Şartlı küme / servis bağlantısı / GPS görünürlük / araç GPS gibi bağlantılı durumlar"
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div className="panelMeta">
                Bugünkü aktif servisler ve sözleşmeli bağlantılar burada toplanır. Bu görünüm ana sayfadaki uzun blok yerine tek sekmede okunur.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill" data-status="INFO">Aktif servis • {metricValue(activeShiftRows.length)}</span>
                <span className="pill" data-status="AGREEMENT">Sözleşmeli aktif • {metricValue(activeContractRows.length)}</span>
                <span className="pill" data-status="COUNT">Bugün toplam • {metricValue(todayShiftCount)}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      <th>Vardiya</th>
                      <th>Durum</th>
                      <th>Sözleşme</th>
                      <th>Sürücü</th>
                      <th>Araç</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.length ? serviceRows.map((row) => (
                      <tr key={row.id}>
                        <td>#{row.id}</td>
                        <td>{displayStatusLabel(row.status)}</td>
                        <td>{row.agreement}</td>
                        <td>{row.driver}</td>
                        <td>{row.vehicle}</td>
                        <td>{fmtTR(row.startAt)}</td>
                        <td>{fmtTR(row.endAt)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="muted">Servis kümesi kaydı yok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "personel" ? (
        <div role="tabpanel" aria-label="Personel" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <SectionCard title="Personel Özet" subtitle="Personel listesi / personel durum özeti">
            <div style={{ display: "grid", gap: 10 }}>
              <div className="panelMeta">
                Personel servis atamaları, şirket içindeki kayıtlar, atama durumu ve kısa notlar birlikte görünür.
              </div>
              {unassignedPersonelRows.length ? (
                <div className="card" style={{ padding: 10, borderColor: "rgba(245, 158, 11, 0.28)" }}>
                  <div className="panelSectionTitle">Bağlantısız / eksik personel • {metricValue(unassignedPersonelRows.length)}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>Ataması olmayan ya da kısa özetinde bağlantı bilgisi görünmeyen kayıtlar.</div>
                </div>
              ) : null}
              <div style={{ overflowX: "auto" }}>
                <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      <th>Ad</th>
                      <th>Atama</th>
                      <th>Durum</th>
                      <th>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personelRows.length ? personelRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.assignment}</td>
                        <td>{row.status}</td>
                        <td>{row.note}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="muted">Personel kaydı bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "serviceTimes" ? (
        <div role="tabpanel" aria-label="Servis Zamanları" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <SectionCard
            title="Personel servis zamanları"
            subtitle="Başlangıç / bitiş / sürücü / araç bilgileri"
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div className="panelMeta">
                Bugün onaylı ve aktif servislerin planlanan zamanları bu sekmede okunur.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      <th>Vardiya</th>
                      <th>Durum</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                      <th>Sözleşme</th>
                      <th>Sürücü</th>
                      <th>Araç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.length ? serviceRows.map((row) => (
                      <tr key={row.id}>
                        <td>#{row.id}</td>
                        <td>{displayStatusLabel(row.status)}</td>
                        <td>{fmtTR(row.startAt)}</td>
                        <td>{fmtTR(row.endAt)}</td>
                        <td>{row.agreement}</td>
                        <td>{row.driver}</td>
                        <td>{row.vehicle}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="muted">Bugün için servis ataması yok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "exceptions" ? (
        <div role="tabpanel" aria-label="İstisnalar / Değişiklikler" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <CollapsibleSection
            title="Eksik değişiklikleri"
            badge={metricValue(openRequestCount)}
            subtitle="Açık / onay bekleyen biniş değişiklikleri"
            compact
            defaultOpen={openRequestCount > 0}
          >
            <div style={{ overflowX: "auto" }}>
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
                  )) : (
                    <tr><td colSpan={6} className="muted">Bekleyen biniş değişikliği yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Bugün servisi kullanmayacak personeller"
            badge={metricValue(noBoardRows.length)}
            subtitle="Biniş değişiklikleri ve bildirim akışından okunan kısa özet"
            compact
            defaultOpen={false}
          >
            <div style={{ display: "grid", gap: 8 }}>
              {noBoardRows.length ? noBoardRows.slice(0, 5).map((row) => (
                <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                </div>
              )) : <div className="muted">Bugün servisi kullanmayacağını bildiren kayıt yok.</div>}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Farklı duraktan binecek personeller"
            badge={metricValue(diffStopRows.length)}
            subtitle="Konum / durak değişikliği sinyalleri"
            compact
            defaultOpen={false}
          >
            <div style={{ display: "grid", gap: 8 }}>
              {diffStopRows.length ? diffStopRows.slice(0, 5).map((row) => (
                <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                </div>
              )) : <div className="muted">Farklı durak kaydı yok.</div>}
            </div>
          </CollapsibleSection>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <div role="tabpanel" aria-label="Bildirimler" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <SectionCard
            title="Son bildirimler"
            subtitle="Bildirim tipi / tarih / durum"
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <input
                  value={notificationQ}
                  onChange={(e) => setNotificationQ(e.target.value)}
                  placeholder="Bildirim ara"
                  style={{ minWidth: 240 }}
                />
                <button type="button" className="btn sm" onClick={() => setNotificationQ("")}>Temizle</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                  <thead>
                    <tr>
                      <th>Başlık</th>
                      <th>Tür</th>
                      <th>Mesaj</th>
                      <th>Zaman</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationFilteredRows.length ? notificationFilteredRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.title}</td>
                        <td><span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span></td>
                        <td>{row.message || "—"}</td>
                        <td>{fmtTR(row.at)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="muted">Bildirim geçmişi boş görünüyor.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
