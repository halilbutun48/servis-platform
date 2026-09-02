import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { formatDateTimeTR, isoFromTRLocalInput } from "../../utils/time";

function isoLocalInputToIso(s) {
  return isoFromTRLocalInput(s);
}

async function downloadWithToken(url, token, filenameHint) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename="([^"]+)"/i);
  const filename = m?.[1] || filenameHint || "export.txt";
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

function fmt(ts) {
  try {
    return formatDateTimeTR(ts);
  } catch {
    return String(ts || "");
  }
}

function summarizePreviewMeta(meta) {
  if (meta == null || meta === "") return "sistem kanıtı hazır";
  if (typeof meta === "string") {
    const text = meta.trim();
    if (!text) return "sistem kanıtı hazır";
    if (/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(text)) return "sistem kanıtı hazır";
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
    parts.push(`${key}: ${rendered.length > 40 ? `${rendered.slice(0, 37)}…` : rendered}`);
    if (parts.length >= 3) break;
  }
  return parts.length ? parts.join(" • ") : "sistem kanıtı hazır";
}


function basePathForKind(kind) {
  const k = String(kind || "").trim();
  // SuperAdmin filters (login/audit/requests) live under /api/admin/logs
  if (!k.startsWith("bundle_")) return "/api/admin/logs";
  // Bundles are served by shared logs router
  return "/api/logs";
}


export default function LogExportPanel() {
  const { token } = useSession();

  const [kind, setKind] = useState("login");
  const [format, setFormat] = useState("txt");

  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [pathLike, setPathLike] = useState("");
  const [ip, setIp] = useState("");
  const [status, setStatus] = useState("");

  const [targetType, setTargetType] = useState("user");
  const [targetId, setTargetId] = useState("");
  const [speedLimitKmh, setSpeedLimitKmh] = useState("");

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isBundle = useMemo(() => kind.startsWith("bundle"), [kind]);

  function buildQs() {
    const qs = new URLSearchParams();
    qs.set("kind", kind);
    qs.set("format", format);

    const fromIso = isoLocalInputToIso(fromLocal);
    const toIso = isoLocalInputToIso(toLocal);
    if (fromIso) qs.set("from", fromIso);
    if (toIso) qs.set("to", toIso);

    if (email.trim()) qs.set("email", email.trim());
    if (userId.trim()) qs.set("userId", userId.trim());
    if (pathLike.trim()) qs.set("pathLike", pathLike.trim());
    if (ip.trim()) qs.set("ip", ip.trim());
    if (status.trim()) qs.set("status", status.trim());

    if (isBundle) {
      qs.set("targetType", targetType);
      qs.set("targetId", targetId.trim());
      if (speedLimitKmh.trim()) qs.set("speedLimitKmh", speedLimitKmh.trim());
    }

    // cache buster
    qs.set("_ts", String(Date.now()));
    return qs;
  }

  const onPreview = useCallback(async () => {
    if (isBundle) return; // bundle is export-only
    setBusy(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("kind", kind);
      qs.set("take", "250");

      const fromIso = isoLocalInputToIso(fromLocal);
      const toIso = isoLocalInputToIso(toLocal);
      if (fromIso) qs.set("from", fromIso);
      if (toIso) qs.set("to", toIso);

      if (email.trim()) qs.set("email", email.trim());
      if (userId.trim()) qs.set("userId", userId.trim());
      if (pathLike.trim()) qs.set("pathLike", pathLike.trim());
      if (ip.trim()) qs.set("ip", ip.trim());
      if (status.trim()) qs.set("status", status.trim());

      const base = basePathForKind(kind);
      const r = await api.get(`${base}/preview?${qs.toString()}`, { token });
      setItems(r.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [email, fromLocal, ip, isBundle, kind, pathLike, status, token, toLocal, userId]);

  async function onExport() {
    setBusy(true);
    setErr("");
    try {
      if (isBundle && !targetId.trim()) {
        throw new Error("Bundle için targetId zorunlu");
      }
      const qs = buildQs();
      const base = basePathForKind(kind);
    const url = `${base}/export?${qs.toString()}`;
      const hint = isBundle ? `bundle_${targetType}_${targetId}.txt` : `logs_${kind}.${format}`;
      await downloadWithToken(url, token, hint);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // initial preview
    onPreview();
  }, [onPreview]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div className="panelTitle">İşlem kayıtlarını dışa aktar</div>
        <span className="pill" data-status="COUNT">{items.length} kayıt</span>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label className="muted">
            Tür
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="login">Giriş kayıtları</option>
              <option value="audit">Denetim işlemleri</option>
              <option value="requests">İstek kayıtları</option>
              <option value="bundle_user">Kullanıcı özeti</option>
              <option value="bundle_driver">Sürücü özeti</option>
              <option value="bundle_vehicle">Araç özeti</option>
              <option value="bundle_room">Taşımacılık Firması özeti</option>
              <option value="bundle_company">Hizmet Alan Firma özeti</option>
              <option value="bundle_personel">Personel özeti</option>
              <option value="bundle_student">Öğrenci özeti</option>
            </select>
          </label>

          <label className="muted">
            Biçim
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="txt">TXT (varsayılan)</option>
              <option value="csv">Excel (CSV)</option>
            </select>
          </label>

          <label className="muted">
            Başlangıç (TR)
            <input type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} />
          </label>

          <label className="muted">
            Bitiş (TR)
            <input type="datetime-local" value={toLocal} onChange={(e) => setToLocal(e.target.value)} />
          </label>

          {!isBundle ? (
            <>
              <label className="muted">
                E-posta içeren
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ör: demo.com" />
              </label>
              <label className="muted">
                Kullanıcı numarası
                <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ör: 1" />
              </label>
              {kind === "requests" ? (
                <>
                  <label className="muted">
                    pathLike
                    <input value={pathLike} onChange={(e) => setPathLike(e.target.value)} placeholder="ör: /api/shifts" />
                  </label>
                  <label className="muted">
                    ip contains
                    <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="ör: 192.168" />
                  </label>
                  <label className="muted">
                    status
                    <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="200" />
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <>
              <label className="muted">
                Target Type
                <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                  <option value="user">user</option>
                  <option value="driver">driver</option>
                  <option value="vehicle">vehicle</option>
                  <option value="room">room</option>
                  <option value="company">company</option>
                  <option value="personel">personel</option>
                  <option value="student">student</option>
                </select>
              </label>
              <label className="muted">
                Target Id
                <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="id" />
              </label>
              <label className="muted">
                Speed limit override (kmh)
                <input value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} placeholder="örn: 80" />
              </label>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {!isBundle ? (
            <button className="btn sm" onClick={onPreview} disabled={busy}>
              {busy ? "..." : "Preview"}
            </button>
          ) : null}
          <button className="btn sm" onClick={onExport} disabled={busy}>
            {busy ? "..." : "Export (Download)"}
          </button>
          {err ? <span className="muted" style={{ color: "crimson" }}>{err}</span> : null}
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          Not: Bundle export varsayılan TXT’dir. Login logları AuditLog üzerinden tutulur (AUTH_LOGIN_*).
        </div>
      </div>

      {!isBundle ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Önizleme (son 250)</div>
          <div style={{ overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>createdAt</th>
                  <th>type</th>
                  <th>info</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.id || Math.random()}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt(x.createdAt)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{x.action || x.method || x.type || "-"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {kind === "requests"
                        ? `${x.status} ${x.method} ${x.path} (${x.durationMs}ms) ip=${x.ip || ""} userId=${x.userId || ""}`
                        : kind === "login"
                        ? `${x.action} userId=${x.entityId || ""} kanıt=${summarizePreviewMeta(x.meta)}`
                        : `${x.action} ${x.entity}#${x.entityId || ""} actorUserId=${x.actorUserId || ""} kanıt=${summarizePreviewMeta(x.meta)}`}
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={3} className="muted">kayıt yok</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
