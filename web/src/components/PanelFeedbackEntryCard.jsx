import { useMemo, useState } from "react";
import { api } from "../api";

const CATEGORY_OPTIONS = [
  { id: "GORUS", label: "Görüş" },
  { id: "ONERI", label: "Öneri" },
  { id: "SIKAYET", label: "Şikayet" },
];

const SEVERITY_OPTIONS = [
  { id: "LOW", label: "Düşük" },
  { id: "MEDIUM", label: "Orta" },
  { id: "HIGH", label: "Yüksek" },
];

function roleLabel(roleId) {
  if (roleId === "ROOM") return "Taşımacılık Firması";
  if (roleId === "COMPANY") return "Hizmet Alan Firma";
  if (roleId === "DRIVER") return "Sürücü";
  if (roleId === "PERSONEL") return "Personel";
  if (roleId === "PARENT") return "Veli";
  if (roleId === "SCHOOL") return "Okul";
  if (roleId === "ORGANIZATION") return "Organizasyon";
  return "Kullanıcı";
}

export default function PanelFeedbackEntryCard({ roleId, panelLabel, relatedPath = "" }) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("GORUS");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const currentCategory = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.id === categoryId) || CATEGORY_OPTIONS[0],
    [categoryId]
  );
  const currentPath = useMemo(() => {
    if (relatedPath) return relatedPath;
    if (typeof window !== "undefined" && window.location?.pathname) return window.location.pathname;
    return "";
  }, [relatedPath]);

  async function submitFeedback() {
    const safeDetail = String(detail || "").trim();
    const safeTitle = String(title || "").trim() || `${currentCategory.label} • ${panelLabel}`;
    if (!safeDetail) {
      setErr("Detay alanını doldurun.");
      return;
    }

    setBusy(true);
    setErr("");
    setNotice("");
    try {
      await api.post("/api/pilot-launch-gate/field-feedback-loop/records", {
        title: safeTitle,
        detail: safeDetail,
        severity,
        surface: "WEB",
        relatedPath: currentPath,
        tags: [currentCategory.id, "PANEL_FEEDBACK"],
      });
      setNotice(`${currentCategory.label} kaydedildi. Süper Yönetici inceleme kuyruğuna düştü.`);
      setTitle("");
      setDetail("");
      setSeverity("MEDIUM");
      setCategoryId("GORUS");
      setOpen(false);
    } catch (error) {
      setErr(String(error?.message || error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">Görüş / Öneri / Şikayet</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            {roleLabel(roleId)} panelinden kısa not bırakın; kayıt Süper Yönetici tarafında tek kuyruğa düşer.
          </div>
        </div>
        <button type="button" className={open ? "btn" : "btn primary"} disabled={busy} onClick={() => {
          setErr("");
          setNotice("");
          setOpen((value) => !value);
        }}>
          {open ? "Kapat" : "Geri Bildirim Yaz"}
        </button>
      </div>

      {notice ? (
        <div className="panelMeta" style={{ marginTop: 10 }}>
          {notice}
        </div>
      ) : null}

      {err ? (
        <div className="panelMeta" style={{ marginTop: 10, color: "#fca5a5" }}>
          {err}
        </div>
      ) : null}

      {open ? (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {CATEGORY_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={categoryId === item.id ? "btn primary" : "btn"}
                disabled={busy}
                onClick={() => setCategoryId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="panelMeta">Kısa başlık</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`${currentCategory.label} • ${panelLabel}`}
              maxLength={160}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="panelMeta">Detay</span>
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={4}
              maxLength={1600}
              placeholder="Kısa bağlam, gördüğünüz durum ve mümkünse beklenen davranış."
            />
          </label>

          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
              <span className="panelMeta">Önem</span>
              <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                {SEVERITY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn primary" disabled={busy} onClick={submitFeedback}>
                {busy ? "..." : "Gönder"}
              </button>
            </div>
          </div>

          {currentPath ? (
            <div className="panelMeta">
              Ekran: <b>{panelLabel}</b>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
