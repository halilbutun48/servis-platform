import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelChrome from "../../components/PanelChrome";
import { displayStatusLabel } from "../../utils/displayStatus";
import { filterNotificationDigest, fmtTR, normalizeNotificationDigest } from "../shared/operationsDigestUtils";
import { boardingChangeDecisionLabel, boardingChangeKindLabel } from "../shared/boardingChangeUi";

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

export default function SchoolOperationsPanel() {
  const { token, me } = useSession();
  const [students, setStudents] = useState([]);
  const [invites, setInvites] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const [studentsResp, invitesResp, requestsResp, notificationsResp] = await Promise.all([
        api("/api/company/personels?kind=STUDENT&take=120", { token }),
        api("/api/school/parent-invites?take=120", { token }),
        api("/api/requests?onlyOpen=1&onlyActive=1", { token }).catch(() => []),
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

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  useAutoReload("school-operations", load);

  const notifRows = useMemo(() => normalizeNotificationDigest(notifications), [notifications]);
  const noBoardRows = useMemo(() => filterNotificationDigest(notifRows, ["bugün öğrencinizin servise binmeyeceği", "bugün öğrencim servise binmeyecek", "bugün binmeyecek"]), [notifRows]);
  const diffStopRows = useMemo(() => filterNotificationDigest(notifRows, ["farklı duraktan", "farklı durak"]), [notifRows]);
  const boardedRows = useMemo(() => filterNotificationDigest(notifRows, ["servise bindi", "okula ulaştı", "ulaştı"]), [notifRows]);
  const parentNotificationRows = useMemo(() => notifRows.slice(0, 10), [notifRows]);
  const inviteByChild = useMemo(() => latestInviteByChild(invites), [invites]);
  const riskRequestRows = useMemo(() => (Array.isArray(requests) ? requests : []).filter((item) => {
    const status = String(item?.status || "").toUpperCase();
    return ["REQUESTED", "OPEN", "PENDING", "COUNTERED"].includes(status) || item?.lat != null || item?.lng != null;
  }), [requests]);

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
      shift: item?.shift?.id || item?.shiftId || "-",
      status: item?.status || "OPEN",
      kind: boardingChangeKindLabel(item?.requestKind || item?.kind),
      decision: boardingChangeDecisionLabel(item?.decisionState || item?.status),
      detail: item?.decisionText || (item?.lat != null || item?.lng != null ? "Konumlu biniş değişikliği" : "Standart biniş değişikliği"),
      createdAt: item?.createdAt || item?.at || null,
    })),
    [riskRequestRows]
  );

  if (me?.companyKind !== "SCHOOL") {
    return <div className="card err">Bu panel yalnızca SCHOOL scope için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Okul Operasyon Paneli"
        subtitle="Öğrenci servis atamaları, veli bağlantıları ve biniş değişikliği özetini tek yerde okur."
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
            <button className="btn sm" onClick={() => navigate("/school/parents")}>Veli Erişimi</button>
            <button className="btn sm" onClick={() => navigate("/school/checkin")}>Check-in</button>
            <button className="btn sm" onClick={() => navigate("/shared/notifications")}>Bildirimler</button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MiniStat title="Öğrenci servis atamaları" value={metricValue(students.length)} note="Öğrenci envanteri" />
        <MiniStat title="Veli bağlantıları" value={metricValue(invites.length)} note="Aktif ve geçmiş erişim" />
        <MiniStat title="Bugün binmeyecek öğrenciler" value={metricValue(noBoardRows.length)} note="Bildirim özetinden okunur" />
        <MiniStat title="Farklı duraktan binecek öğrenciler" value={metricValue(diffStopRows.length)} note="Durak değişiklik sinyali" />
        <MiniStat title="Servise bindi / okula ulaştı" value={metricValue(boardedRows.length)} note="Canlı durum bildirimleri" />
        <MiniStat title="Veli bildirim geçmişi" value={metricValue(parentNotificationRows.length)} note="Son kayıtlar" />
      </div>

      <SectionCard title="Öğrenci servis atamaları" subtitle="Öğrenci listesi ve son erişim / bağlantı özeti">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Veli bağlantısı</th>
                <th>Durum</th>
                <th>Bitiş</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.length ? studentRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.inviteCount} bağlantı</td>
                  <td>{displayStatusLabel(row.inviteStatus)}</td>
                  <td>{fmtTR(row.expiresAt)}</td>
                  <td>{row.note}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">Öğrenci kaydı bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Veli bağlantıları" subtitle="Geçerli ve geçmiş erişim kayıtları">
        <div style={{ overflowX: "auto" }}>
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

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
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

        <SectionCard title="Farklı duraktan binecek öğrenciler" subtitle="Onaylı veya bekleyen durak değişikliği sinyalleri">
          <div style={{ display: "grid", gap: 8 }}>
            {diffStopRows.length ? diffStopRows.slice(0, 5).map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{row.title}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
              </div>
            )) : <div className="muted">Farklı durak kaydı yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Servise bindi / okula ulaştı" subtitle="Canlı durum bildirimleri">
          <div style={{ display: "grid", gap: 8 }}>
            {boardedRows.length ? boardedRows.slice(0, 5).map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{row.title}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
              </div>
            )) : <div className="muted">Servise bindi / okula ulaştı kaydı yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Veli bildirim geçmişi" subtitle="Son bildirimler ve kayıt akışı">
          <div style={{ display: "grid", gap: 8 }}>
            {parentNotificationRows.length ? parentNotificationRows.map((row) => (
              <div key={row.id} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span>
                </div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(row.at)}</div>
              </div>
            )) : <div className="muted">Veli bildirim geçmişi boş görünüyor.</div>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Riskli / onay bekleyen istekler" subtitle="Konumlu veya açık biniş değişikliği kayıtları">
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
              )) : <tr><td colSpan={6} className="muted">Riskli istek yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
