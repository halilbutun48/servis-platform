import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const CATEGORY_OPTIONS = [
  { id: "GORUS", label: "Görüş" },
  { id: "ONERI", label: "Öneri" },
  { id: "DEGERLENDIRME", label: "Değerlendirme" },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((item) => [item.id, item.label]));

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function Stars({ value, onChange, readOnly = false }) {
  const count = Number(value || 0);
  return (
    <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={readOnly ? undefined : () => onChange?.(n)}
          aria-label={`${n} yıldız`}
          style={{
            border: 0,
            background: "transparent",
            cursor: readOnly ? "default" : "pointer",
            fontSize: 18,
            color: n <= count ? "#fdb022" : "#667085",
            padding: 0,
            lineHeight: 1,
          }}
        >
          {n <= count ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function pillStyle(kind) {
  if (kind === "SUPER_ADMIN") return { background: "rgba(130,150,255,0.16)", border: "1px solid rgba(130,150,255,0.45)", color: "#dbe2ff" };
  if (kind === "ROOM") return { background: "rgba(18,183,106,0.14)", border: "1px solid rgba(18,183,106,0.35)", color: "#d1fadf" };
  if (kind === "COMPANY") return { background: "rgba(247,144,9,0.14)", border: "1px solid rgba(247,144,9,0.35)", color: "#fedf89" };
  return { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#d0d5dd" };
}

export default function FeedbackLoopSection({ title = "Geri Bildirim", subtitle = "", compact = false }) {
  const { token, me } = useSession();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    categoryId: "GORUS",
    rating: 3,
    title: "",
    detail: "",
  });

  async function load() {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const response = await api("/api/pilot-launch-gate/field-feedback-loop/records", { token });
      const list = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
      setItems(list);
    } catch (error) {
      setErr(String(error?.message || error));
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const summary = useMemo(() => {
    const total = items.length;
    const ratings = items.map((item) => Number(item?.rating || 0)).filter((value) => Number.isFinite(value) && value > 0);
    const averageRating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
    const byCategory = CATEGORY_OPTIONS.reduce((acc, item) => {
      acc[item.id] = items.filter((row) => String(row?.categoryId || "GORUS").toUpperCase() === item.id).length;
      return acc;
    }, {});
    return {
      total,
      averageRating: Number(averageRating.toFixed(2)),
      byCategory,
      latestAt: items[0]?.updatedAt || items[0]?.createdAt || null,
    };
  }, [items]);

  async function submit() {
    const safeTitle = String(form.title || "").trim();
    const safeDetail = String(form.detail || "").trim();
    if (!safeDetail) {
      setErr("Detay alanını doldurun.");
      return;
    }
    if (!Number.isFinite(Number(form.rating || 0)) || Number(form.rating || 0) < 1) {
      setErr("Yıldız puanı seçin.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      await api("/api/pilot-launch-gate/field-feedback-loop/records", {
        method: "POST",
        token,
        body: {
          title: safeTitle || `${CATEGORY_LABELS[form.categoryId] || "Görüş"} • ${me?.role || "Kullanıcı"}`,
          detail: safeDetail,
          categoryId: form.categoryId,
          rating: Number(form.rating || 0),
          severity: "LOW",
          surface: "WEB",
          tags: [form.categoryId, "FEEDBACK_LOOP"],
        },
      });
      setForm((prev) => ({
        ...prev,
        title: "",
        detail: "",
      }));
      await load();
    } catch (error) {
      setErr(String(error?.message || error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {subtitle || "Kısa not, öneri veya değerlendirme bırak; kayıtlar Super Admin tarafından okunur."}
          </div>
        </div>
        <div className="panelMeta" style={{ textAlign: "right" }}>
          Toplam: <b>{summary.total}</b> • Ortalama: <b>{summary.averageRating ? `${summary.averageRating} ★` : "—"}</b>
          {summary.latestAt ? <div>Son kayıt: <b>{fmtTR(summary.latestAt)}</b></div> : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATEGORY_OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={form.categoryId === item.id ? "btn primary" : "btn"}
            disabled={saving}
            onClick={() => setForm((prev) => ({ ...prev, categoryId: item.id }))}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="panelMeta">Yıldız değerlendirme</span>
          <Stars
            value={form.rating}
            onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="panelMeta">Kısa başlık</span>
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={`${CATEGORY_LABELS[form.categoryId] || "Görüş"} • ${me?.role || "Kullanıcı"}`}
            maxLength={160}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="panelMeta">Detay</span>
          <textarea
            value={form.detail}
            onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))}
            rows={compact ? 3 : 4}
            maxLength={1600}
            placeholder="Kısa bağlam, neden önemli olduğu ve varsa beklenen davranış."
          />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="panelMeta" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORY_OPTIONS.map((item) => (
              <span key={item.id} className="pill" style={item.id === "DEGERLENDIRME" ? { background: "rgba(130,150,255,0.14)" } : undefined}>
                {item.label} • {summary.byCategory[item.id] || 0}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={saving} onClick={() => setForm((prev) => ({ ...prev, title: "", detail: "" }))}>
              Temizle
            </button>
            <button type="button" className="btn primary" disabled={saving} onClick={submit}>
              {saving ? "..." : "Gönder"}
            </button>
          </div>
        </div>
      </div>

      {err ? <div className="panelMeta" style={{ color: "#fca5a5", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ display: "grid", gap: 8 }}>
        <div className="panelSectionTitle">Son kayıtlar</div>
        {busy ? <div className="muted">Yükleniyor...</div> : null}
        {!busy && !items.length ? <div className="muted">Henüz kayıt yok.</div> : null}
        {items.slice(0, compact ? 6 : 10).map((item) => {
          const categoryId = String(item?.categoryId || "GORUS").toUpperCase();
          const rating = Number(item?.rating || 0);
          return (
            <div
              key={item?.id || `${item?.createdAt || ""}-${item?.title || ""}`}
              style={{
                padding: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="pill" style={pillStyle(item?.reportedByRole)}>
                    {item?.reportedByRole || "-"}
                  </span>
                  <span className="pill">{CATEGORY_LABELS[categoryId] || categoryId}</span>
                  {rating > 0 ? <Stars value={rating} readOnly /> : <span className="muted">Puan yok</span>}
                </div>
                <div className="panelMeta">{fmtTR(item?.updatedAt || item?.createdAt)}</div>
              </div>

              <div style={{ fontWeight: 700 }}>{item?.title || "Başlıksız kayıt"}</div>
              <div className="panelMeta" style={{ whiteSpace: "pre-wrap" }}>{item?.detail || "-"}</div>

              <div className="panelMeta" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>Durum: <b>{item?.status || "-"}</b></span>
                <span>Yüzey: <b>{item?.surface || "-"}</b></span>
                {item?.ownerRole ? <span>Sahip: <b>{item.ownerRole}</b></span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
