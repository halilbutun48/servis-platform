import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { countBy, filterNotificationDigest, fmtTR, normalizeNotificationDigest, topRepeatedValues } from "../shared/operationsDigestUtils";

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

export default function SuperAdminOperationsPanel() {
  const { token, me } = useSession();
  const [manifest, setManifest] = useState(null);
  const [surface, setSurface] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const [manifestResp, surfaceResp, auditResp, notifResp] = await Promise.all([
        api("/api/operation-verification/manifest", { token }),
        api("/api/operation-verification/role-surface?role=SUPER_ADMIN", { token }),
        api("/api/admin/audit-logs?take=200", { token }),
        api("/api/notifications/my", { token }).catch(() => []),
      ]);
      setManifest(manifestResp || null);
      setSurface(surfaceResp || null);
      setAuditLogs(Array.isArray(auditResp?.items) ? auditResp.items : Array.isArray(auditResp) ? auditResp : []);
      setNotifications(Array.isArray(notifResp?.items) ? notifResp.items : Array.isArray(notifResp) ? notifResp : []);
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

  const notifRows = useMemo(() => normalizeNotificationDigest(notifications), [notifications]);
  const boardingRows = useMemo(() => filterNotificationDigest(notifRows, ["biniş", "binmeyecek", "farklı durak", "okula ulaştı", "servise bindi", "durağa ulaştı"]), [notifRows]);
  const roleChecks = Number(surface?.checks?.length || 0);
  const savedChecks = Number(surface?.savedCount || 0);
  const repeatedActions = useMemo(() => topRepeatedValues(auditLogs, (item) => item?.action || "", 5), [auditLogs]);
  const actionCounts = useMemo(() => countBy(auditLogs, (item) => item?.action || ""), [auditLogs]);
  const importantLogs = useMemo(() => (Array.isArray(auditLogs) ? auditLogs : []).slice(0, 10), [auditLogs]);
  const notificationRows = useMemo(() => notifRows.slice(0, 10), [notifRows]);

  if (me?.role !== "SUPER_ADMIN") {
    return <div className="card err">Bu panel yalnızca SUPER_ADMIN scope için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Denetim Paneli"
        subtitle="Rol/yetki, audit, bildirim ve biniş değişikliği kayıtlarını tek yerde okur."
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/audit")}>İşlem Kayıtları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/logexport")}>Log Dışa Aktarımı</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/operation-verification")}>Operasyon Doğrulama</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/observability")}>Canlı İzleme</button>
            <button className="btn sm" onClick={() => navigate("/shared/notifications")}>Bildirimler</button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      <PanelKvkkHint panelKey="auditLogs" effectiveRole="SUPER_ADMIN" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MiniStat title="Rol / yetki denetimi" value={metricValue(roleChecks)} note="Operasyon yüzeyi kontrol maddeleri" />
        <MiniStat title="Audit kayıtları" value={metricValue(auditLogs.length)} note="Son işlem izi satırları" />
        <MiniStat title="Tekil işlem türü" value={metricValue(actionCounts.size)} note="Farklı action sayısı" />
        <MiniStat title="Bildirim geçmişi" value={metricValue(notificationRows.length)} note="Son gelen bildirimler" />
        <MiniStat title="Biniş değişikliği kayıtları" value={metricValue(boardingRows.length)} note="Durak / biniş sinyalleri" />
        <MiniStat title="Şüpheli / tekrar eden işlem" value={metricValue(repeatedActions.length)} note="Tekrarlayan action grupları" />
        <MiniStat title="KVKK görünürlük" value={metricValue(manifest?.roles?.length || 0)} note="Rol matrisi ve scope özeti" />
      </div>

      <SectionCard
        title="Rol/yetki denetimi"
        subtitle="Seçili yüzeyin beklenen karar ve kanıt özetini gösterir"
      >
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="card" style={{ padding: 12, borderRadius: 8 }}>
            <div className="panelMeta">Rol</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.role?.label || "Süper Yönetici"}</div>
          </div>
          <div className="card" style={{ padding: 12, borderRadius: 8 }}>
            <div className="panelMeta">Yüzey</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.role?.surface || "-"}</div>
          </div>
          <div className="card" style={{ padding: 12, borderRadius: 8 }}>
            <div className="panelMeta">Varsayılan karar</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.defaultStatus || "-"}</div>
          </div>
          <div className="card" style={{ padding: 12, borderRadius: 8 }}>
            <div className="panelMeta">Kayıtlı kontrol</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{savedChecks}/{roleChecks}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Audit / log kayıtları" subtitle="Kim, ne yaptı sorusunun son izleri">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>EntityId</th>
                <th>Meta</th>
              </tr>
            </thead>
            <tbody>
              {importantLogs.length ? importantLogs.map((row) => (
                <tr key={row.id}>
                  <td>{fmtTR(row.createdAt)}</td>
                  <td>
                    <div>{row.actorEmail || "-"}</div>
                    <div className="panelMeta">{row.actorRole || "-"}{row.actorUserId ? ` #${row.actorUserId}` : ""}</div>
                  </td>
                  <td>{row.action || "-"}</td>
                  <td>{row.entity || "-"}</td>
                  <td>{row.entityId ?? "-"}</td>
                  <td className="panelMeta" style={{ whiteSpace: "normal" }}>{row.meta ? JSON.stringify(row.meta) : ""}</td>
                </tr>
              )) : <tr><td colSpan={6} className="muted">Audit kaydı yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <SectionCard title="Biniş değişikliği kayıtları" subtitle="Biniş / durak / rota değişikliği sinyalleri">
          <div style={{ display: "grid", gap: 8 }}>
            {boardingRows.length ? boardingRows.slice(0, 6).map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <span className="pill" data-status={row.kind || "COUNT"}>{row.kind || "-"}</span>
                </div>
                <div className="panelMeta" style={{ marginTop: 4 }}>{row.message || "—"}</div>
              </div>
            )) : <div className="muted">Biniş değişikliği kaydı yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Şüpheli / tekrar eden işlemler" subtitle="Aynı action'ın tekrar sayısı">
          <div style={{ display: "grid", gap: 8 }}>
            {repeatedActions.length ? repeatedActions.map((row) => (
              <div key={row.key} className="card" style={{ padding: 10, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{row.key}</div>
                  <span className="pill" data-status="COUNT">{row.count}</span>
                </div>
                <div className="panelMeta" style={{ marginTop: 4 }}>
                  Aynı işlem son kayıtlarda {row.count} kez görünüyor.
                </div>
              </div>
            )) : <div className="muted">Tekrarlayan işlem sinyali yok.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Bildirim geçmişi" subtitle="Özellikle biniş ve operasyon bildirimleri">
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

      <SectionCard title="Hızlı denetim yolları" subtitle="Derin inceleme için mevcut resmi panellere geç">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => navigate("/superadmin/audit")}>İşlem Kayıtları</button>
          <button type="button" className="btn" onClick={() => navigate("/superadmin/logexport")}>Log Dışa Aktarımı</button>
          <button type="button" className="btn" onClick={() => navigate("/superadmin/observability")}>Canlı İzleme</button>
          <button type="button" className="btn" onClick={() => navigate("/superadmin/operation-verification")}>Operasyon Doğrulama</button>
          <button type="button" className="btn" onClick={() => navigate("/shared/notifications")}>Bildirimler</button>
        </div>
      </SectionCard>

      <SectionCard title="KVKK / görünürlük notu" subtitle="Bu panel yalnız denetim özetidir, günlük operasyon yönetmez.">
        <div className="panelMeta">
          {surface?.goal || "Rol ve yetki görünürlüğü, audit izi ve biniş kayıtları aynı yerde okunur."}
        </div>
      </SectionCard>
    </div>
  );
}
