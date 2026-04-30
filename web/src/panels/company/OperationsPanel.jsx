import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelChrome from "../../components/PanelChrome";
import { displayStatusLabel } from "../../utils/displayStatus";
import { filterNotificationDigest, fmtTR, normalizeNotificationDigest } from "../shared/operationsDigestUtils";

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const companyKind = String(me?.companyKind || "COMPANY").toUpperCase();
  const basePath = companyBaseFromKind(companyKind);
  const title = companyKind === "ORGANIZATION" ? "Organizasyon Operasyon Paneli" : "Şirket Operasyon Paneli";
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
      detail: item?.lat != null || item?.lng != null ? "Konumlu biniş değişikliği" : "Standart biniş değişikliği",
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
        <MiniStat title="Personel listesi" value={metricValue(personels.length)} note="Şirket kapsamındaki personel kaydı" />
        <MiniStat title="Bugünkü servis durumu" value={metricValue(todayShiftCount)} note={`Aktif ${todayActiveCount} • Onaylı ${todayApprovedCount}`} />
        <MiniStat title="Personel biniş değişiklikleri" value={metricValue(openRequestRows.length)} note="Açık veya onay bekleyen kayıtlar" />
        <MiniStat title="Bugün servisi kullanmayacak personeller" value={metricValue(noBoardRows.length)} note="Bildirim akışından türetilir" />
        <MiniStat title="Farklı duraktan binecek personeller" value={metricValue(diffStopRows.length)} note="Konum / durak sinyalinden okunur" />
        <MiniStat title="Sözleşme / vardiya ilişkisi" value={metricValue(activeContractRows.length)} note="Sözleşmeye bağlı aktif vardiyalar" />
        <MiniStat title="Canlı bildirim özeti" value={metricValue(notifRows.length)} note={liveDigest} />
      </div>

      <SectionCard
        title="Personel listesi"
        subtitle="Kişi listesi, vardiya / servis atama özeti ve kısa notlar"
      >
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
      </SectionCard>

      <SectionCard
        title="Personel servis atamaları"
        subtitle="Aktif ve onaylı vardiyalar, sözleşme ilişkisiyle birlikte"
      >
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
      </SectionCard>

      <SectionCard
        title="Biniş değişiklikleri"
        subtitle="Düşük riskli kayıtlar ve dikkat gerektiren konumlu talepler"
      >
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Kişi</th>
                <th>Shift</th>
                <th>Durum</th>
                <th>Tür</th>
                <th>Zaman</th>
              </tr>
            </thead>
            <tbody>
              {requestRows.length ? requestRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.personel}</td>
                  <td>#{row.shift}</td>
                  <td>{displayStatusLabel(row.status)}</td>
                  <td>{row.detail}</td>
                  <td>{fmtTR(row.createdAt)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="muted">Bekleyen biniş değişikliği yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <SectionCard title="Bugün servisi kullanmayacak personeller" subtitle="Bildirim akışından okunan kısa özet">
          <div style={{ display: "grid", gap: 8 }}>
            {noBoardRows.length ? noBoardRows.slice(0, 5).map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{row.title}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
              </div>
            )) : <div className="muted">Bugün servisi kullanmayacağını bildiren kayıt yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Farklı duraktan binecek personeller" subtitle="Konum / durak değişikliği sinyalleri">
          <div style={{ display: "grid", gap: 8 }}>
            {diffStopRows.length ? diffStopRows.slice(0, 5).map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{row.title}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
              </div>
            )) : <div className="muted">Farklı durak kaydı yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Son bildirimler" subtitle="Bu şirketin bildirim geçmişinden son kayıtlar">
          <div style={{ display: "grid", gap: 8 }}>
            {notificationRows.length ? notificationRows.map((row) => (
              <div key={row.id} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span>
                </div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(row.at)}</div>
              </div>
            )) : <div className="muted">Bildirim geçmişi boş görünüyor.</div>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
