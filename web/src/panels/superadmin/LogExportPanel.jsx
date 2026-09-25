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

function userFacingAction(action) {
  const labels = {
    AUTH_LOGIN_OK: "Giriş başarılı",
    AUTH_LOGIN_FAIL: "Giriş başarısız",
    AUTH_LOGIN_DEVICE_MISMATCH: "Girişte cihaz uyuşmazlığı",
    AUTH_LOGIN_DEVICE_REQUIRED: "Girişte cihaz doğrulaması gerekli",
    AUTH_LOGIN_DISABLED: "Devre dışı hesapla giriş denemesi",
    AUTH_DRIVER_PIN_LOCKED: "Sürücü PIN'i kilitlendi",
    AUTH_PASSWORD_CHANGED: "Şifre değiştirildi",
    AUTH_TOTP_SETUP_ISSUED: "Ek doğrulama kurulumu oluşturuldu",
    AUTH_STEP_UP_OK: "Ek doğrulama başarılı",
    AUTH_STEP_UP_FAIL: "Ek doğrulama başarısız",
  };
  return labels[String(action || "").trim()] || (action ? "Sistem işlemi" : "-");
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
        <h1 className="panelTitle">İşlem kayıtlarını dışa aktar</h1>
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
                    İstek yolunu içeren
                    <input value={pathLike} onChange={(e) => setPathLike(e.target.value)} placeholder="ör: /api/shifts" />
                  </label>
                  <label className="muted">
                    Ağ adresini içeren
                    <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="ör: 192.168" />
                  </label>
                  <label className="muted">
                    Durum kodu
                    <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ör: 200" />
                  </label>
                </>
              ) : null}
            </>
          ) : (
            <>
              <label className="muted">
                Kayıt türü
                <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                  <option value="user">Kullanıcı</option>
                  <option value="driver">Sürücü</option>
                  <option value="vehicle">Araç</option>
                  <option value="room">Taşımacılık Firması</option>
                  <option value="company">Hizmet Alan Firma</option>
                  <option value="personel">Personel</option>
                  <option value="student">Öğrenci</option>
                </select>
              </label>
              <label className="muted">
                Kayıt numarası
                <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="Kayıt numarası" />
              </label>
              <label className="muted">
                Hız sınırı (km/s)
                <input value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} placeholder="örn: 80" />
              </label>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {!isBundle ? (
            <button className="btn sm" onClick={onPreview} disabled={busy}>
              {busy ? "..." : "Önizlemeyi göster"}
            </button>
          ) : null}
          <button className="btn sm" onClick={onExport} disabled={busy}>
            {busy ? "..." : "Dışa aktar"}
          </button>
          {err ? <span className="muted" style={{ color: "crimson" }}>{err}</span> : null}
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          Not: Özet dışa aktarımı varsayılan metin biçimindedir. Giriş kayıtları denetim kayıtlarından okunur.
        </div>
      </div>

      {!isBundle ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Önizleme (son 250)</div>
          <div className="tableWrap">
            <table className="table pre18-admin-log-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem türü</th>
                  <th>Ayrıntı</th>
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.id || Math.random()}>
                    <td data-label="Tarih">{fmt(x.createdAt)}</td>
                    <td data-label="İşlem türü">{userFacingAction(x.action || x.method || x.type)}</td>
                    <td data-label="Ayrıntı">
                      {kind === "requests"
                        ? `Durum: ${x.status || "-"} • Yöntem: ${x.method || "-"} • Yol: ${x.path || "-"} (${x.durationMs || 0} ms)${x.ip ? ` • Ağ adresi: ${x.ip}` : ""}${x.userId ? ` • Kullanıcı no: ${x.userId}` : ""}`
                        : kind === "login"
                        ? `İşlem: ${userFacingAction(x.action || x.method || x.type)} • Kullanıcı no: ${x.entityId || "-"} • Kanıt: ${summarizePreviewMeta(x.meta)}`
                        : `İşlem: ${userFacingAction(x.action || x.method || x.type)} • Kayıt: ${x.entity || "-"} • Kayıt no: ${x.entityId || "-"}${x.actorUserId ? ` • İşlemi yapan kullanıcı: ${x.actorUserId}` : ""} • Kanıt: ${summarizePreviewMeta(x.meta)}`}
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
