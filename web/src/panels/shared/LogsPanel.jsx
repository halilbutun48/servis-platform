// web/src/panels/shared/LogsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { formatDateTimeTR, isoFromTRLocalInput, toDatetimeLocalTR } from "../../utils/time";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtTR(d) {
  return formatDateTimeTR(d, { second: "2-digit" });
}

function toLocalInputValue(d) {
  return toDatetimeLocalTR(d);
}

function fromLocalInputValue(v) {
  return isoFromTRLocalInput(v) || null;
}

function safeStr(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function kindNeedsTarget(kind) {
  const k = String(kind || "");
  // Global kinds: can run without any target
  if (k === "requests" || k === "audit" || k === "login") return false;
  // Bundles and entity-scoped kinds generally need a target
  return true;
}

function kindLocksTargetType(kind) {
  const k = String(kind || "");
  if (k === "bundle_vehicle" || k === "gps" || k === "speed") return "vehicle";
  if (k === "bundle_driver") return "driver";
  if (k === "bundle_room") return "room";
  if (k === "bundle_company") return "company";
  if (k === "bundle_personel") return "personel";
  if (k === "bundle_student") return "student";
  if (k === "bundle_user") return "user";
  if (k === "notifications") return null; // can be user/vehicle/driver etc (implementation dependent)
  return null;
}

function mapTargetParams(targetType, targetId) {
  const t = String(targetType || "").trim().toLowerCase();
  const id = String(targetId || "").trim();
  if (!t || !id) return {};
  // backend convenience: some kinds expect explicit *Id params
  const map = {
    vehicle: "vehicleId",
    driver: "driverId",
    room: "roomId",
    company: "companyId",
    user: "userId",
    personel: "personelId",
    student: "studentId",
    shift: "shiftId",
  };
  const key = map[t] || null;
  return {
    targetType: t,
    targetId: id,
    ...(key ? { [key]: id } : {}),
  };
}

function badgeClass(v) {
  const s = String(v || "").toUpperCase();
  if (s.includes("ERROR") || s.includes("FAIL")) return "pill pill-red";
  if (s.includes("WARN") || s.includes("STALE") || s.includes("OFFLINE")) return "pill pill-amber";
  if (s.includes("SPEED")) return "pill pill-purple";
  if (s.includes("OK") || s.includes("LIVE") || s.includes("INFO")) return "pill pill-green";
  return "pill";
}

export default function LogsPanel() {
  const { token } = useSession();

  // defaults
  const [kind, setKind] = useState("requests"); // start with global
  const [targetType, setTargetType] = useState("vehicle");
  const [targetId, setTargetId] = useState("");
  const [childId, setChildId] = useState("");
  const [format, setFormat] = useState("txt");
  const [take, setTake] = useState(250);

  const [from, setFrom] = useState(() => toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => toLocalInputValue(new Date()));

  const [onlyBad, setOnlyBad] = useState(false);
  const [auto, setAuto] = useState(false);
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);

  const lastCopyRef = useRef("");
  const onPreviewRef = useRef(() => Promise.resolve());
  onPreviewRef.current = onPreview;

  // lock targetType if kind dictates
  useEffect(() => {
    const lock = kindLocksTargetType(kind);
    if (lock) setTargetType(lock);
  }, [kind]);

  // auto refresh
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      onPreviewRef.current().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [auto, kind, targetType, targetId, childId, format, take, from, to, onlyBad, cat, q]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const it of items || []) {
      const ts = it.createdAt || it.at || it.ts || it.time || null;
      const d = ts ? new Date(ts) : null;
      const key = d && !Number.isNaN(d.getTime()) ? `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}` : "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    return Array.from(groups.entries());
  }, [items]);

  function buildQueryParams(extra = {}) {
    const params = new URLSearchParams();
    params.set("kind", kind);

    const fromIso = fromLocalInputValue(from);
    const toIso = fromLocalInputValue(to);
    if (fromIso) params.set("from", fromIso);
    if (toIso) params.set("to", toIso);

    params.set("take", String(take || 250));

    if (onlyBad) params.set("onlyBad", "1");
    if (cat && cat !== "ALL") params.set("cat", cat);
    if (q) params.set("q", q);

    if (String(childId || "").trim()) params.set("childId", String(childId).trim());

    // Target is optional for requests/audit/login
    if (kindNeedsTarget(kind)) {
      const lock = kindLocksTargetType(kind);
      const tType = lock || targetType;
      const tId = String(targetId || "").trim();
      // if required but missing, let backend respond with a clear error; UI also shows inline error
      const mapped = mapTargetParams(tType, tId);
      for (const [k, v] of Object.entries(mapped)) params.set(k, String(v));
    }

    // cache-buster for live-ish preview
    params.set("_ts", String(Date.now()));

    for (const [k, v] of Object.entries(extra)) {
      if (v == null || String(v).trim() === "") continue;
      params.set(k, String(v));
    }
    return params.toString();
  }

  async function onPreview() {
    setErr("");
    setBusy(true);
    try {
      const qs = buildQueryParams();
      const r = await api.get(`/api/logs/preview?${qs}`, { token });
      const arr = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      setSummary(r?.summary || null);
      setItems(arr);

      // prep copy buffer
      const lines = arr.slice(0, 200).map((x) => {
        const ts = x.createdAt || x.at || x.ts || x.time || "";
        const t = fmtTR(ts);
        const cc = x.cat || x.category || "";
        const lv = x.level || x.severity || "";
        const ty = x.type || "";
        const msg =
          x.text ||
          x.info ||
          x.message ||
          (x.meta ? safeStr(x.meta) : "") ||
          (ty ? safeStr({ type: ty, ...x }) : safeStr(x));
        return `[${t || "-"}] ${cc || "-"} ${lv || "-"} ${ty || "-"} ${msg || ""}`.trim();
      });
      lastCopyRef.current = lines.join("\n");
    } catch (e) {
      setErr(e?.message || String(e));
      setItems([]);
      setSummary(null);
      lastCopyRef.current = "";
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    setErr("");
    try {
      const qs = buildQueryParams({ format });
      // download with fetch+blob so auth header is included
      const res = await fetch(`/api/logs/export?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      const filename = m?.[1] || `logs.${format === "csv" ? "csv" : "txt"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  function setQuick(hours) {
    const now = new Date();
    const frm = new Date(Date.now() - hours * 60 * 60 * 1000);
    setFrom(toLocalInputValue(frm));
    setTo(toLocalInputValue(now));
  }

  function setQuickDays(days) {
    const now = new Date();
    const frm = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setFrom(toLocalInputValue(frm));
    setTo(toLocalInputValue(now));
  }

  const showTarget = kindNeedsTarget(kind);

  const lockType = kindLocksTargetType(kind);
  const effTargetType = lockType || targetType;

  const missingTarget = showTarget && !String(targetId || "").trim();

  return (
    <div className="panel">
      <div className="card">
        <div className="card-title">İşlem kayıtlarını dışa aktar</div>
        <div className="muted">
          Varsayılan biçim: <b>TXT</b>. Excel için CSV. Önizleme: son N kayıt (özet + filtre + kopyala).
        </div>

        <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <div className="label">Kayıt türü</div>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="requests">İstek kayıtları</option>
              <option value="audit">Denetim kayıtları</option>
              <option value="login">Giriş kayıtları</option>
              <option value="gps">Konum kayıtları</option>
              <option value="speed">Hız ihlalleri</option>
              <option value="notifications">Bildirimler</option>
              <option value="bundle_vehicle">Araç paketi (konum + hız + bildirim)</option>
              <option value="bundle_driver">Sürücü paketi</option>
              <option value="bundle_room">Taşımacılık Firması paketi</option>
              <option value="bundle_company">Hizmet Alan Firma paketi</option>
              <option value="bundle_personel">Personel paketi</option>
              <option value="bundle_student">Öğrenci paketi</option>
              <option value="bundle_user">Kullanıcı paketi</option>
            </select>
          </div>

          <div style={{ minWidth: 200, opacity: showTarget ? 1 : 0.55 }}>
            <div className="label">Hedef türü</div>
            <select
              className="input"
              value={effTargetType}
              disabled={!showTarget || !!lockType}
              onChange={(e) => setTargetType(e.target.value)}
              title={!showTarget ? "İstek, denetim ve giriş kayıtları için hedef seçmek gerekmez" : lockType ? "Bu tür için hedef tipi sabittir" : ""}
            >
              <option value="vehicle">Araç</option>
              <option value="driver">Sürücü</option>
              <option value="room">Taşımacılık Firması</option>
              <option value="company">Hizmet Alan Firma</option>
              <option value="user">Kullanıcı</option>
              <option value="personel">Personel</option>
              <option value="student">Öğrenci</option>
              <option value="shift">Vardiya</option>
            </select>
          </div>

          <div style={{ minWidth: 160, opacity: showTarget ? 1 : 0.55 }}>
            <div className="label">Hedef kayıt no {showTarget ? "" : "(isteğe bağlı)"}</div>
            <input
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={showTarget ? "örn: 1" : "boş bırakabilirsiniz"}
              disabled={!showTarget}
            />
            {missingTarget ? <div className="muted" style={{ color: "#f59e0b" }}>Hedef kayıt no gerekli (bu tür için)</div> : null}
          </div>

          <div style={{ minWidth: 160 }}>
            <div className="label">Öğrenci kayıt no (isteğe bağlı)</div>
            <input className="input" value={childId} onChange={(e) => setChildId(e.target.value)} placeholder="isteğe bağlı" />
          </div>

          <div style={{ minWidth: 160 }}>
            <div className="label">Biçim</div>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="txt">TXT (varsayılan)</option>
              <option value="csv">CSV (Excel)</option>
            </select>
          </div>

          <div style={{ minWidth: 120 }}>
            <div className="label">Önizleme kaydı</div>
            <input className="input" type="number" value={take} onChange={(e) => setTake(Number(e.target.value || 0))} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div className="label">Başlangıç</div>
            <input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div>
            <div className="label">Bitiş</div>
            <input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <button className="btn" onClick={() => setQuick(1)}>Son 1s</button>
          <button className="btn" onClick={() => setQuick(24)}>Son 24s</button>
          <button className="btn" onClick={() => setQuickDays(7)}>Son 7g</button>

          <button className="btn primary" disabled={busy || (showTarget && missingTarget)} onClick={() => onPreview()}>
            {busy ? "..." : "Önizleme"}
          </button>
          <button className="btn" disabled={busy || (showTarget && missingTarget)} onClick={() => onExport()}>
            Dışa aktar
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="row" style={{ gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={onlyBad} onChange={(e) => setOnlyBad(e.target.checked)} />
              <span className="muted">Sadece hata/uyarı</span>
            </label>

            <label className="row" style={{ gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              <span className="muted">Otomatik yenileme (5 sn)</span>
            </label>

            <div style={{ minWidth: 140 }}>
              <div className="label">Kategori</div>
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="ALL">Tümü</option>
                <option value="GPS">Konum</option>
                <option value="SPEED">Hız</option>
                <option value="NOTIF">Bildirim</option>
                <option value="REQ">İstek</option>
                <option value="AUDIT">Denetim</option>
                <option value="LOGIN">Giriş</option>
              </select>
            </div>

            <div style={{ minWidth: 220 }}>
              <div className="label">Ara</div>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="örn: araç / hata / bildirim" />
            </div>

            <button
              className="btn"
              disabled={!lastCopyRef.current}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(lastCopyRef.current || "");
                } catch {
                  // ignore
                }
              }}
              title="İlk 200 satırı panoya kopyalar"
            >
              Kopyala (ilk 200)
            </button>
          </div>
        </div>

        {err ? <div className="muted" style={{ marginTop: 10, color: "#f87171" }}>{err}</div> : null}

        {summary ? (
          <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <span className="pill">Aralık: {summary.rangeTR || "-"}</span>
            <span className="pill">Toplam: {summary.total ?? items.length}</span>
            <span className="pill">Son yenileme: {summary.refreshedAtTR || fmtTR(new Date())}</span>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">Önizleme</div>
        <div className="muted">Gruplu görünüm (gün bazında). İçerik satırları burada görünür.</div>

        {(!items || items.length === 0) ? (
          <div className="muted" style={{ marginTop: 10 }}>Kayıt yok.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {grouped.map(([g, arr]) => (
              <div key={g} style={{ marginBottom: 14 }}>
                <div className="muted" style={{ marginBottom: 6 }}>{g} ({arr.length})</div>
                <div className="table">
                  {arr.map((x, idx) => {
                    const ts = x.createdAt || x.at || x.ts || x.time || "";
                    const t = fmtTR(ts);
                    const cc = x.cat || x.category || "";
                    const lv = x.level || x.severity || "";
                    const ty = x.type || "";
                    const msg =
                      x.text ||
                      x.info ||
                      x.message ||
                      (x.meta ? safeStr(x.meta) : "") ||
                      (x.details ? safeStr(x.details) : "") ||
                      "";

                    const content = msg || ty || safeStr(x);

                    return (
                      <div key={`${x.id || idx}-${idx}`} className="table-row" style={{ alignItems: "start", gap: 10 }}>
                        <div style={{ width: 150 }} className="mono muted">{t || "-"}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span className={badgeClass(cc)}>{cc || "unknown"}</span>
                          <span className={badgeClass(lv)}>{lv || "INFO"}</span>
                        </div>
                        <div className="mono" style={{ whiteSpace: "pre-wrap", opacity: content ? 1 : 0.6 }}>
                          {content || "<empty>"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
