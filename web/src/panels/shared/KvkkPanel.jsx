import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { userFacingPanelLabel, userFacingRoleLabel, userFacingScopeLabel } from "../../utils/terminology";

function joinList(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(" • ") : "-";
}

const PERMISSION_LABELS = Object.freeze({
  "route-progress": "Rota ilerlemesi",
  "eta-summary": "Tahmini varış özeti",
  "assignment-state": "Atama durumu",
  "service-state": "Servis durumu",
  "kvkk-summary": "KVKK özeti",
  "consent-records": "Onay kayıtları",
  "audit-trail": "Denetim izi",
  "retention-policy": "Saklama politikası",
  "vehicle-approach": "Aracın yaklaşma durumu",
  "remaining-stops": "Kalan duraklar",
  "navigation-target": "Navigasyon hedefi",
  "kvkk-documents": "KVKK belgeleri",
  "child-link": "Çocuk bağlantısı",
  "policy-config": "Politika ayarları",
  "retention-run": "Saklama işlemi",
  "user-status": "Kullanıcı durumu",
  dispatch: "Sefer ataması",
  "no-show": "Gelmeme bildirimi",
  assignment: "Atama",
  request: "Talep",
  "offer-response": "Teklif yanıtı",
  "personel-maintenance": "Personel kaydı güncellemesi",
  "stop-progress": "Durak ilerleme kaydı",
  "kvkk-consent": "KVKK onayı",
  "gps-publish": "Konum paylaşımı",
});

function userFacingPermissionList(values) {
  if (!Array.isArray(values) || !values.length) return "-";
  return values.map((value) => PERMISSION_LABELS[String(value || "").trim().toLowerCase()] || "Ayrıntılı yetki").join(" • ");
}

function roleTitle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "SUPER_ADMIN") return "Sistem yöneticisi";
  if (r === "ROOM") return "Taşımacılık Firması operasyonu";
  if (r === "COMPANY") return "Hizmet Alan Firma operasyonu";
  return userFacingRoleLabel(r);
}

export default function KvkkPanel() {
  const { token, me } = useSession();
  const [matrix, setMatrix] = useState(null);
  const [summary, setSummary] = useState(null);
  const [required, setRequired] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadAll = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const [mx, sm, rq] = await Promise.all([
        api("/api/kvkk/matrix", { token }),
        api("/api/kvkk/summary", { token }),
        api("/api/kvkk/required", { token }),
      ]);
      setMatrix(mx || null);
      setSummary(sm || null);
      setRequired(Array.isArray(rq?.items) ? rq.items : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setMatrix(null);
      setSummary(null);
      setRequired([]);
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const rows = useMemo(() => {
    const arr = Array.isArray(matrix?.rows) ? matrix.rows : [];
    if (String(me?.role || "") === "SUPER_ADMIN") return arr;
    return arr.filter((x) => String(x?.role || "") === String(me?.role || ""));
  }, [matrix, me?.role]);

  return (
    <div className="wrap wrap--fluid">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="title">KVKK</div>
            <div className="muted">Rolüne göre hangi ekranları ve hangi veriyi gördüğünü özetler.</div>
          </div>
          <button type="button" className="btn sm" onClick={loadAll} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>

        {err ? <div className="err" style={{ marginTop: 10 }}>{err}</div> : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="pill" data-status="ROLE">{roleTitle(me?.role)}</span>
          <span className="pill">Kural sürümü: {matrix?.version || "-"}</span>
          {summary?.blocking ? <span className="pill" data-status="WARN">Onay bekleniyor</span> : <span className="pill" data-status="OK">Onay durumu uygun</span>}
        </div>

        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="title" style={{ fontSize: 16 }}>Kısa özet</div>
            <div className="muted" style={{ marginTop: 8 }}>Gerekli belge: <b>{summary?.requiredCount ?? 0}</b></div>
            <div className="muted" style={{ marginTop: 6 }}>Onaylanan: <b>{summary?.acceptedCount ?? 0}</b></div>
            <div className="muted" style={{ marginTop: 6 }}>Bekleyen belge sayısı: <b>{Array.isArray(summary?.pendingDocKeys) ? summary.pendingDocKeys.length : 0}</b></div>
          </div>

          <div className="card">
            <div className="title" style={{ fontSize: 16 }}>Bu rolde zorunlu belgeler</div>
            {required.length ? (
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {required.map((x) => (
                  <div key={x.docKey} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>{x.title || x.docKey}</div>
                    <div className="muted" style={{ marginTop: 4 }}>{x.summary || "-"}</div>
                    <div className="muted" style={{ marginTop: 4 }}>Sürüm: <b>{x.docVersion || "-"}</b></div>
                  </div>
                ))}
              </div>
            ) : <div className="muted" style={{ marginTop: 8 }}>Bu rolde zorunlu belge görünmüyor.</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Rol görünürlük matrisi</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {String(me?.role || "") === "SUPER_ADMIN" ? "Tüm roller gösterilir." : "Sadece kendi rol satırın gösterilir."}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {rows.map((row) => (
            <div key={row.role} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="pill" data-status="ROLE">{userFacingRoleLabel(row.role)}</span>
                <span className="muted">{roleTitle(row.role)}</span>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>Paneller: <b>{joinList(row.panels?.map((x) => userFacingPanelLabel(x)))}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Veri kapsamı: <b>{joinList(row.dataScopes?.map((x) => userFacingScopeLabel(x)))}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Görüntüleme: <b>{userFacingPermissionList(row.canView)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Yazma: <b>{userFacingPermissionList(row.canWrite)}</b></div>
              <div className="muted" style={{ marginTop: 8 }}>{row.notes ? "Ayrıntılı erişim açıklaması mevcut." : ""}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
