import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function joinList(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(" • ") : "-";
}

function roleTitle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "SUPER_ADMIN") return "Sistem yöneticisi";
  if (r === "ROOM") return "Taşımacılık Firması operasyonu";
  if (r === "COMPANY") return "Firma operasyonu";
  if (r === "DRIVER") return "Sürücü";
  if (r === "PERSONEL") return "Personel";
  if (r === "PARENT") return "Veli";
  return r || "Rol";
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
          <span className="pill">Matrix v{matrix?.version || "-"}</span>
          {summary?.blocking ? <span className="pill" data-status="WARN">Onay bekleniyor</span> : <span className="pill" data-status="OK">Onay durumu uygun</span>}
        </div>

        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="title" style={{ fontSize: 16 }}>Kısa özet</div>
            <div className="muted" style={{ marginTop: 8 }}>Gerekli belge: <b>{summary?.requiredCount ?? 0}</b></div>
            <div className="muted" style={{ marginTop: 6 }}>Onaylanan: <b>{summary?.acceptedCount ?? 0}</b></div>
            <div className="muted" style={{ marginTop: 6 }}>Bekleyen belge anahtarları: <b>{joinList(summary?.pendingDocKeys)}</b></div>
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
                <span className="pill" data-status="ROLE">{row.role}</span>
                <span className="muted">{roleTitle(row.role)}</span>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>Paneller: <b>{joinList(row.panels)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Veri kapsamı: <b>{joinList(row.dataScopes)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Görüntüleme: <b>{joinList(row.canView)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Yazma: <b>{joinList(row.canWrite)}</b></div>
              <div className="muted" style={{ marginTop: 8 }}>{row.notes || ""}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
