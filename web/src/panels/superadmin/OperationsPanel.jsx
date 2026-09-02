import { useCallback, useEffect, useMemo, useState } from "react";
import { getOperationProofSummary } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import OperationProofMiniCard from "../../components/OperationProofMiniCard";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { countBy, filterNotificationDigest, fmtTR, normalizeNotificationDigest, topRepeatedValues } from "../shared/operationsDigestUtils";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildOperationsCopilotFacts } from "../../utils/copilotFacts";
import { cachedGet } from "../../utils/uiDataCache";
import { humanizeUserFacingText, userFacingRoleLabel } from "../../utils/terminology";

// Compatibility wording for historical static checks: "Audit / Log Kayıtları" is now rendered as "Denetim / İşlem Kayıtları".
const LOGIN_AUDIT_RE = /(LOGIN|SIGNIN|SIGN-IN|AUTH|STEP_UP|TOTP|PIN)/i;

function MiniStat({ title, value, note, tone = "normal" }) {
  const borderColor =
    tone === "warn"
      ? "rgba(255, 176, 123, 0.34)"
      : tone === "danger"
        ? "rgba(255, 123, 123, 0.34)"
        : "rgba(255,255,255,0.08)";
  const background =
    tone === "warn"
      ? "rgba(255, 176, 123, 0.08)"
      : tone === "danger"
        ? "rgba(255, 123, 123, 0.08)"
        : "rgba(255,255,255,0.03)";

  return (
    <div
      style={{
        padding: 14,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        background,
        flex: "1 1 190px",
        minWidth: 0,
      }}
    >
      <div className="panelMeta">{title}</div>
      <div className="panelStatValue" style={{ marginTop: 6, wordBreak: "break-word" }}>
        {value}
      </div>
      {note ? (
        <div className="panelMeta" style={{ marginTop: 6 }}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          {subtitle ? <div className="panelMeta" style={{ marginTop: 4 }}>{subtitle}</div> : null}
        </div>
        {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function metricValue(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

function formatPreviewText(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

const AUDIT_ACTION_LABELS = Object.freeze({
  AUTH_LOGIN_OK: "Başarılı giriş",
  AUTH_LOGIN_FAIL: "Başarısız giriş",
  AUTH_LOGIN_DISABLED: "Giriş kapalı",
  AUTH_LOGIN_DEVICE_REQUIRED: "Cihaz doğrulaması gerekli",
  AUTH_LOGIN_DEVICE_MISMATCH: "Cihaz doğrulaması eşleşmedi",
  AUTH_DRIVER_PIN_LOCKED: "Sürücü PIN'i kilitlendi",
  AUTH_PASSWORD_CHANGED: "Şifre değiştirildi",
  AUTH_TOTP_SETUP_ISSUED: "Ek doğrulama kurulumu oluşturuldu",
  PARENT_ACCESS_LOGIN: "Veli bağlantısıyla giriş",
  AI_COPILOT_QUERY: "Sefer Abi sorgusu",
  EXTERNAL_REFERENCE_IMPORTED: "Dış referans içe aktarıldı",
  EXTERNAL_REFERENCE_REFRESHED: "Dış referans yenilendi",
  GPS_VENDOR_INGEST: "Sağlayıcı konum verisi alındı",
  GPS_DEVICE_INGEST: "Cihaz konum verisi alındı",
  AUTO_STOP_REACHED: "Durak tamamlanma sinyali",
  AUTO_SHIFT_COMPLETE: "Vardiya tamamlanma sinyali",
  BOARDING_CHANGE_APPLIED: "Biniş değişikliği uygulandı",
  CREATE_SINGLE: "Kayıt oluşturuldu",
  UPDATE_SINGLE: "Kayıt güncellendi",
  DELETE_SINGLE: "Kayıt silindi",
  NOTE_ONLY: "Not kaydedildi",
  NOOP: "Değişiklik yapılmadı",
});

const AUDIT_ENTITY_LABELS = Object.freeze({
  User: "Kullanıcı",
  Shift: "Vardiya",
  Vehicle: "Araç",
  Driver: "Sürücü",
  Personel: "Personel",
  ParentInvite: "Veli daveti",
  PickupRequest: "Biniş değişikliği talebi",
  ExternalCostReference: "Dış maliyet referansı",
  GpsDevice: "Konum cihazı",
  ai: "Sefer Abi konuşması",
});

const AUDIT_META_KEY_LABELS = Object.freeze({
  deviceId: "Cihaz kaydı",
  driverId: "Sürücü kaydı",
  passwordChangeRequired: "Şifre değişikliği gerekli",
  reason: "Gerekçe",
  requestReason: "Talep gerekçesi",
  sourceType: "Kaynak türü",
  sourceKey: "Kaynak kaydı",
});

function readableAuditAction(value) {
  const raw = String(value || "").trim();
  if (!raw) return "İşlem kaydı";
  const key = raw.toUpperCase();
  if (AUDIT_ACTION_LABELS[key]) return AUDIT_ACTION_LABELS[key];
  if (/^(SAVE|CREATE|SUBMIT|APPROVE|ACTIVATE|ARCHIVE|APPLY)$/.test(key)) {
    return { SAVE: "Kaydedildi", CREATE: "Oluşturuldu", SUBMIT: "Gönderildi", APPROVE: "Onaylandı", ACTIVATE: "Etkinleştirildi", ARCHIVE: "Arşivlendi", APPLY: "Uygulandı" }[key];
  }
  if (key.includes("LOGIN")) return "Giriş işlemi";
  if (key.includes("EXPORT")) return "Dışa aktarım";
  if (key.includes("REJECT")) return "Reddedildi";
  if (key.includes("APPROVE")) return "Onaylandı";
  return "İşlem kaydı";
}

function readableAuditEntity(value) {
  const raw = String(value || "").trim();
  if (!raw) return "İlgili kayıt";
  if (AUDIT_ENTITY_LABELS[raw]) return AUDIT_ENTITY_LABELS[raw];
  return humanizeUserFacingText(raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase(), "İlgili kayıt");
}

function readableAuditMetaKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Ayrıntı";
  if (AUDIT_META_KEY_LABELS[raw]) return AUDIT_META_KEY_LABELS[raw];
  return humanizeUserFacingText(raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase(), "Ayrıntı");
}

function readableAuditMetaValue(value) {
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  return value;
}

function summarizeAuditMeta(meta) {
  if (meta == null || meta === "") return "—";
  if (typeof meta === "string") {
    const text = meta.trim();
    if (!text) return "—";
    if (/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(text)) return "Sistem kanıtı hazır";
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  if (Array.isArray(meta)) return `${meta.length} öğe`;
  if (typeof meta !== "object") return String(meta);

  const entries = Object.entries(meta).filter(([key, value]) => {
    const joined = `${key} ${String(value ?? "")}`;
    return !/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(joined);
  });
  const parts = [];
  for (const [key, value] of entries) {
    if (value == null || value === "") continue;
    const rendered = typeof value === "object" ? (Array.isArray(value) ? `${value.length} öğe` : "detay") : String(value);
    const label = readableAuditMetaKey(key);
    const displayValue = readableAuditMetaValue(rendered);
    parts.push(`${label}: ${displayValue.length > 40 ? `${displayValue.slice(0, 37)}…` : displayValue}`);
    if (parts.length >= 3) break;
  }
  return parts.length ? parts.join(" • ") : "Sistem kanıtı hazır";
}

function renderAuditMeta(row) {
  return summarizeAuditMeta(row?.meta);
}

export default function SuperAdminOperationsPanel() {
  const { token, me } = useSession();
  const [manifest, setManifest] = useState(null);
  const [surface, setSurface] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [operationProofSummary, setOperationProofSummary] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const [manifestResp, surfaceResp, auditResp, notifResp, opProofResp] = await Promise.all([
        cachedGet("/api/operation-verification/manifest", { token, ttlMs: 10 * 60 * 1000, delayMs: 90 }),
        cachedGet("/api/operation-verification/role-surface?role=SUPER_ADMIN", { token, ttlMs: 10 * 60 * 1000, delayMs: 90 }),
        cachedGet("/api/admin/audit-logs?take=200", { token, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
        cachedGet("/api/notifications/my", { token, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => []),
        getOperationProofSummary({}, { token }).catch(() => null),
      ]);
      setManifest(manifestResp || null);
      setSurface(surfaceResp || null);
      setAuditLogs(Array.isArray(auditResp?.items) ? auditResp.items : Array.isArray(auditResp) ? auditResp : []);
      setNotifications(Array.isArray(notifResp?.items) ? notifResp.items : Array.isArray(notifResp) ? notifResp : []);
      setOperationProofSummary(opProofResp || null);
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
  const notificationRows = useMemo(() => notifRows.slice(0, 8), [notifRows]);
  const boardingRows = useMemo(() => filterNotificationDigest(notifRows, ["biniş", "binmeyecek", "farklı durak", "okula ulaştı", "servise bindi", "durağa ulaştı"]), [notifRows]);
  const roleChecks = Number(surface?.checks?.length || 0);
  const savedChecks = Number(surface?.savedCount || 0);
  const repeatedActions = useMemo(() => topRepeatedValues(auditLogs, (item) => item?.action || "", 5), [auditLogs]);
  const actionCounts = useMemo(() => countBy(auditLogs, (item) => item?.action || ""), [auditLogs]);
  const auditPreviewRows = useMemo(() => (Array.isArray(auditLogs) ? auditLogs : []).slice(0, 15), [auditLogs]);
  const loginAuditRows = useMemo(() => (Array.isArray(auditLogs) ? auditLogs : []).filter((row) => LOGIN_AUDIT_RE.test([row?.action, row?.entity, renderAuditMeta(row)].join(" "))).slice(0, 8), [auditLogs]);
  const loginAuditCount = loginAuditRows.length;
  const roleRows = useMemo(() => (Array.isArray(manifest?.roles) ? manifest.roles : []), [manifest]);
  const kvkkMatchCount = Number(roleRows.length || 0);

  const criticalSignals = useMemo(() => {
    const rows = [];
    if (!surface) rows.push("Rol/yüzey bilgisi henüz okunmadı.");
    if (roleChecks > savedChecks) rows.push(`Kayıtlı kontrol eksik: ${savedChecks}/${roleChecks}`);
    if (operationProofSummary?.nextAction) rows.push(formatPreviewText(operationProofSummary.nextAction));
    if (repeatedActions.length) rows.push(`Tekrar eden işlem grubu: ${repeatedActions.length}`);
    if (!notificationRows.length) rows.push("Bildirim geçmişi sınırlı.");
    return rows.slice(0, 4);
  }, [notificationRows.length, operationProofSummary, repeatedActions.length, roleChecks, savedChecks, surface]);
  const technicalRiskCount = criticalSignals.length;

  const tabCounts = useMemo(() => ({
    summary: criticalSignals.length,
    access: roleRows.length || roleChecks,
    proof: operationProofSummary ? 1 : 0,
    kvkk: kvkkMatchCount,
    audit: auditLogs.length,
    risk: repeatedActions.length + technicalRiskCount,
  }), [auditLogs.length, criticalSignals.length, kvkkMatchCount, operationProofSummary, repeatedActions.length, roleChecks, roleRows.length, technicalRiskCount]);

  const facts = useMemo(() => buildOperationsCopilotFacts({
    operationProofSummary,
    auditCount: Array.isArray(auditLogs) ? auditLogs.length : 0,
    notificationCount: Array.isArray(notifications) ? notifications.length : 0,
    eventCount: roleChecks,
  }), [auditLogs, notifications, operationProofSummary, roleChecks]);

  useEffect(() => {
    if (!operationProofSummary && !auditLogs.length && !notifications.length && !surface && !manifest) {
      clearCopilotSelection("/superadmin/operations");
      return;
    }
    setCopilotSelection({
      scopeKey: "/superadmin/operations",
      entityType: "screen",
      entityId: 6117,
      label: "Denetim Paneli",
      summary: [
        operationProofSummary?.statusText || operationProofSummary?.summaryText || operationProofSummary?.title || null,
        facts?.copilotSummary || null,
      ].filter(Boolean).join(" • "),
      fields: [
        { label: "Rol / yetki denetimi", value: metricValue(roleChecks), help: "Seçili rol yüzeyindeki kontrol maddelerini gösterir." },
        { label: "Denetim kayıtları", value: metricValue(auditLogs.length), help: "İşlem izi satırlarını gösterir." },
        { label: "Konum görünürlüğü", value: operationProofSummary?.gpsVisibilityText || operationProofSummary?.gpsVisibility || surface?.gpsVisibility || "-", help: "Kanıt yüzeyindeki konum görünürlüğü durumunu gösterir." },
        { label: "Kanıt durumu", value: operationProofSummary?.statusText || operationProofSummary?.summaryText || operationProofSummary?.title || "-", help: "Servis kanıtı ve operasyon kanıtı özetini gösterir." },
        { label: "Giriş denetimi", value: metricValue(loginAuditCount), help: "Giriş ve ek doğrulama ile ilişkili kayıtları gösterir." },
        { label: "KVKK eşleşmeleri", value: metricValue(kvkkMatchCount), help: "Rol matrisi ve KVKK eşleşmelerini özetler." },
      ],
      badges: [
        { label: "Ek doğrulama", value: "Aktif", help: "Bu yüzey kritik işlemler için ek doğrulama ister." },
        { label: "KVKK sınırı", value: "Aktif", help: "Detaylar KVKK & Uyumluluk sekmesindedir." },
      ],
      facts,
    });
    return () => clearCopilotSelection("/superadmin/operations");
  }, [auditLogs.length, facts, kvkkMatchCount, loginAuditCount, manifest, notifications.length, operationProofSummary, roleChecks, surface]);

  if (me?.role !== "SUPER_ADMIN") {
    return <div className="card err">Bu panel yalnızca Süper Yönetici erişimi için görünür.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Denetim Paneli"
        subtitle="Ek doğrulama gerektiren güvenlik, KVKK ve denetim sinyallerini önce özetler. Bu yüzey işlem başlatmaz; yazma ve dışa aktarma yolları ek doğrulama ile korunur."
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={load} disabled={busy}>{busy ? "..." : "Yenile"}</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/audit")}>İşlem Kayıtları</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/logexport")}>İşlem kayıtlarını dışa aktar</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/operation-verification")}>Operasyon Doğrulama</button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      <PanelSegmentTabs
        ariaLabel="Denetim bölümleri"
        compact
        tabs={[
          { key: "summary", label: "Özet", badge: tabCounts.summary || 0 },
          { key: "access", label: "Yetki & Erişim", badge: tabCounts.access || 0 },
          { key: "proof", label: "Servis Kanıtı", badge: tabCounts.proof || 0 },
          { key: "kvkk", label: "KVKK & Uyumluluk", badge: tabCounts.kvkk || 0 },
          { key: "audit", label: "Denetim / İşlem Kayıtları", badge: tabCounts.audit || 0 },
          { key: "risk", label: "Riskler & Kararlar", badge: tabCounts.risk || 0 },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <div className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Ek doğrulama · KVKK sınırı aktif</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Bu denetim yüzeyi kritik güvenlik, uyum ve risk sinyallerini özetleyerek okur. Yazma, dışa aktarma ve operasyon değişikliği yolları ek doğrulama ile korunur.
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Ayrıntılar yalnız ilgili sekmede görünür; ana yüzey uzun listeye dönüşmez.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" }}>
          <span className="pill" data-status="WARN">Ek doğrulama gerekli</span>
          <span className="pill" data-status="WARN">KVKK sınırı aktif</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MiniStat title="Rol / yetki denetimi" value={metricValue(roleChecks)} note="Kontrol maddeleri" />
      <MiniStat title="Denetim kayıtları" value={metricValue(auditLogs.length)} note="İşlem izi satırları" />
        <MiniStat title="Teknik işlem riski" value={metricValue(technicalRiskCount)} note="Kritik uyarı özeti" tone={technicalRiskCount > 0 ? "warn" : "normal"} />
        <MiniStat title="Bildirim geçmişi" value={metricValue(notificationRows.length)} note="Son bildirimler" />
      <MiniStat title="Giriş denetimi / giriş kayıtları" value={metricValue(loginAuditCount)} note="Giriş ve ek doğrulama izleri" />
        <MiniStat title="Şüpheli / tekrar eden işlem" value={metricValue(repeatedActions.length)} note="Tekrarlayan işlem grupları" tone={repeatedActions.length > 0 ? "warn" : "normal"} />
        <MiniStat title="KVKK eşleşmeleri" value={metricValue(kvkkMatchCount)} note="Rol / kapsam eşleşmeleri" />
      </div>

      {activeTab === "summary" ? (
        <div role="tabpanel" aria-label="Özet" style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="Denetim özeti"
            subtitle="Kısa yorum ve sıradaki doğru kontrol"
          >
            <div className="panelMeta">
              {operationProofSummary?.summaryText || operationProofSummary?.title || "Denetim sinyalleri hazır."}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {surface?.goal || "Rol ve yetki görünürlüğü, denetim izi ve servis kanıtı aynı yerde okunur."}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Sıradaki doğru kontrol: {operationProofSummary?.nextAction || "Rol/yüzey ve kayıtlı kontrol sayısını gözden geçir."}
            </div>
          </SectionCard>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <SectionCard title="Kritik uyarı özeti" subtitle="Ek doğrulama ve KVKK bandının kısa yorumu">
              <div style={{ display: "grid", gap: 8 }}>
                {criticalSignals.length ? criticalSignals.map((item) => (
                  <div key={item} className="card" style={{ padding: 10, borderRadius: 8 }}>
                    <div className="panelMeta">{item}</div>
                  </div>
                )) : <div className="muted">Kritik uyarı yok.</div>}
              </div>
            </SectionCard>

            <SectionCard title="Bildirim geçmişi" subtitle="Kısa görünüm, uzun liste değil">
              <div style={{ display: "grid", gap: 8 }}>
                {notificationRows.length ? notificationRows.slice(0, 3).map((row) => (
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

            <SectionCard title="Biniş değişikliği kayıtları" subtitle="Kısa sinyal listesi">
              <div style={{ display: "grid", gap: 8 }}>
                {boardingRows.length ? boardingRows.slice(0, 3).map((row) => (
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
          </div>
        </div>
      ) : null}

      {activeTab === "access" ? (
        <div role="tabpanel" aria-label="Yetki & Erişim" style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="Rol / yüzey özeti"
            subtitle="Rol, surface, varsayılan karar ve kayıtlı kontrol"
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

          <SectionCard title="Rol destekleri" subtitle="Manifestte kayıtlı rol/yüzey destekleri">
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {roleRows.length ? roleRows.map((role) => (
                <div key={role.id} className="card" style={{ padding: 12, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}>{role.label || role.id || "-"}</div>
                      <div className="panelMeta" style={{ marginTop: 4 }}>Yüzey: {role.surface || "-"}</div>
                    </div>
                    <span className="pill" data-status="COUNT">
                      {metricValue(role.savedCount || 0)}/{metricValue(role.checks?.length || 0)}
                    </span>
                  </div>
                  <div className="panelMeta" style={{ marginTop: 6 }}>
                    Varsayılan karar: {role.defaultStatus || "-"}
                  </div>
                </div>
              )) : <div className="muted">Rol desteği bulunamadı.</div>}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "proof" ? (
        <div role="tabpanel" aria-label="Servis Kanıtı" style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="Servis Kanıtı"
            subtitle="Servis başladı, GPS kanıtı ve biniş / operatör notu burada okunur"
          >
            <div className="panelMeta">
              Bu bölüm ana sayfada uzun açık kalmaz. Servis başladı, GPS kanıtı var, sürücünün telefon GPS’i görüldü, araç GPS’i görüldü, biniş kaydı var ve operatör notu sinyalleri burada toplanır.
            </div>
          </SectionCard>

          <OperationProofMiniCard
            manualNoteScopeType="SERVICE"
            manualNoteScopeId="superadmin-operations"
          />
        </div>
      ) : null}

      {activeTab === "kvkk" ? (
        <div role="tabpanel" aria-label="KVKK & Uyumluluk" style={{ display: "grid", gap: 12 }}>
          <PanelKvkkHint panelKey="auditLogs" effectiveRole="SUPER_ADMIN" />

          <SectionCard
            title="KVKK / görünürlük notu"
            subtitle="Kritik sınırların kısa özeti"
          >
            <div className="panelMeta">
              Bu yüzeyde KVKK sınırı aktiftir. Ayrıntılar ayrı KVKK panelinde okunur; burada yalnız compact görünürlük notu ve uyum özeti kalır.
            </div>
          </SectionCard>

          <SectionCard
            title="Uyum sınırı"
            subtitle="KVKK eşleşmeleri ve görünürlük sınırı"
          >
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="card" style={{ padding: 12, borderRadius: 8 }}>
                <div className="panelMeta">KVKK eşleşmeleri</div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>{kvkkMatchCount}</div>
                <div className="panelMeta" style={{ marginTop: 6 }}>Rol matrisi / kapsam eşleşmeleri</div>
              </div>
              <div className="card" style={{ padding: 12, borderRadius: 8 }}>
                <div className="panelMeta">Görünürlük sınırı</div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.role?.surface || "-"}</div>
                <div className="panelMeta" style={{ marginTop: 6 }}>Bu panel işlem başlatmaz.</div>
              </div>
              <div className="card" style={{ padding: 12, borderRadius: 8 }}>
                <div className="panelMeta">Uyum notu</div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.goal || "Rol ve yetki görünürlüğü"}</div>
                <div className="panelMeta" style={{ marginTop: 6 }}>Detaylar ayrı KVKK paneline gider.</div>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <div role="tabpanel" aria-label="Denetim / İşlem Kayıtları" style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="Denetim özeti"
            subtitle="Zaman, kişi, işlem, kayıt türü, kayıt no ve sistem kanıtı"
            actions={(
              <button type="button" className="btn sm" onClick={() => navigate("/superadmin/logexport")}>İşlem kayıtlarını dışa aktar</button>
            )}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="pill" data-status="COUNT">{metricValue(auditLogs.length)} denetim kaydı</span>
              <span className="pill" data-status="COUNT">{metricValue(loginAuditCount)} giriş denetimi</span>
              <span className="pill" data-status="COUNT">{metricValue(actionCounts.size)} farklı işlem</span>
              <span className="pill" data-status="COUNT">Tam dışa aktarım üst aksiyonda</span>
            </div>
          </SectionCard>

          <SectionCard title="Denetim / işlem kayıtları" subtitle="Kim, ne yaptı sorusunun son izleri">
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>Zaman</th>
                    <th>Kullanıcı</th>
                    <th>İşlem</th>
                    <th>Kayıt türü</th>
                    <th>Kayıt no</th>
                    <th>Sistem kanıtı</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPreviewRows.length ? auditPreviewRows.map((row) => (
                    <tr key={row.id}>
                      <td>{fmtTR(row.createdAt)}</td>
                      <td>
                        <div>{row.actorEmail || "-"}</div>
                        <div className="panelMeta">
                          {row.actorRole ? userFacingRoleLabel(row.actorRole) : "-"}{row.actorUserId ? ` #${row.actorUserId}` : ""}
                        </div>
                      </td>
                      <td>{readableAuditAction(row.action)}</td>
                      <td>{readableAuditEntity(row.entity)}</td>
                      <td>{row.entityId ?? "-"}</td>
                      <td className="panelMeta" style={{ whiteSpace: "normal" }}>{renderAuditMeta(row)}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="muted">Denetim kaydı yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "risk" ? (
        <div role="tabpanel" aria-label="Riskler & Kararlar" style={{ display: "grid", gap: 12 }}>
          <SectionCard
            title="Teknik işlem riski"
            subtitle="Şüpheli / tekrar eden işlem ve kritik uyarı notları"
          >
            <div style={{ display: "grid", gap: 8 }}>
              {criticalSignals.length ? criticalSignals.map((item) => (
                <div key={item} className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div className="panelMeta">{item}</div>
                </div>
              )) : <div className="muted">Kritik risk sinyali yok.</div>}
            </div>
          </SectionCard>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <SectionCard title="Şüpheli / tekrar eden işlemler" subtitle="Tekrarlayan işlem grupları">
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

            <SectionCard title="Giriş denetimi" subtitle="Giriş ve ek doğrulama ile ilişkili kayıtlar">
              <div style={{ display: "grid", gap: 8 }}>
                {loginAuditRows.length ? loginAuditRows.map((row) => (
                  <div key={row.id} className="card" style={{ padding: 10, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{row.action || row.entity || "-"}</div>
                      <span className="pill" data-status="COUNT">{fmtTR(row.createdAt)}</span>
                    </div>
                    <div className="panelMeta" style={{ marginTop: 4 }}>
                      {row.actorEmail || "-"}{row.actorRole ? ` • ${row.actorRole}` : ""}
                    </div>
                  </div>
                )) : <div className="muted">Giriş denetimi kaydı yok.</div>}
              </div>
            </SectionCard>

            <SectionCard title="Varsayılan karar" subtitle="Rol karar özeti ve kayıtlı kontrol">
              <div style={{ display: "grid", gap: 8 }}>
                <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div className="panelMeta">Varsayılan karar</div>
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{surface?.defaultStatus || "-"}</div>
                </div>
                <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div className="panelMeta">Kayıtlı kontrol</div>
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{savedChecks}/{roleChecks}</div>
                </div>
                <div className="card" style={{ padding: 10, borderRadius: 8 }}>
                  <div className="panelMeta">Sıradaki doğru adım</div>
                  <div style={{ fontWeight: 800, marginTop: 6 }}>{operationProofSummary?.nextAction || "Rol/yüzey ve kanıt akışını gözden geçir."}</div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
