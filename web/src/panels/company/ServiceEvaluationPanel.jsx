import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { companyPath } from "../../utils/paths";

function fmtTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ title, value, note }) {
  return <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 180px" }}><div className="muted" style={{ marginBottom: 8 }}>{title}</div><div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>{note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}</div>;
}

function StatusBadge({ value }) {
  const normalized = String(value || "").trim().toUpperCase();
  let style = { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
  if (["DEĞERLENDİRME AÇIK", "BEKLİYOR", "PENDING"].includes(normalized)) style = { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  if (["HENÜZ AÇILAMAZ", "HİZMET DEVAM EDİYOR", "ACTIVE", "DEVAM_EDIYOR"].includes(normalized)) style = { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  if (["TAMAMLANDI", "DONE", "KAYDEDİLDİ"].includes(normalized)) style = { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...style }}>{value || "-"}</span>;
}

function Stars({ value, onChange, readOnly = false }) {
  return <div style={{ display: "inline-flex", gap: 6 }}>{[1,2,3,4,5].map((n) => <button key={n} type="button" onClick={readOnly ? undefined : () => onChange?.(n)} style={{ border: 0, background: "transparent", cursor: readOnly ? "default" : "pointer", fontSize: 20, color: n <= Number(value || 0) ? "#fdb022" : "#667085", padding: 0 }}>{n <= Number(value || 0) ? "★" : "☆"}</button>)}</div>;
}

function ScorePill({ score, count }) {
  if (!count) return <span className="muted">Henüz puan yok</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" }}>{Number(score || 0).toFixed(1)} ★ <span className="muted">({count})</span></span>;
}

function EvaluationModal({ open, item, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (!open || !item) return;
    setForm({
      timeliness: item?.evaluation?.ratings?.timeliness ?? 0,
      vehicleSuitability: item?.evaluation?.ratings?.vehicleSuitability ?? 0,
      driverBehavior: item?.evaluation?.ratings?.driverBehavior ?? 0,
      operationOrder: item?.evaluation?.ratings?.operationOrder ?? 0,
      liveTrackingConfidence: item?.evaluation?.ratings?.liveTrackingConfidence ?? 0,
      overallSatisfaction: item?.evaluation?.ratings?.overallSatisfaction ?? 0,
      note: item?.evaluation?.note || "",
      recommendAgain: item?.evaluation?.recommendAgain === false ? "false" : "true",
    });
  }, [open, item]);
  if (!open || !item || !form) return null;
  const fields = [
    ["timeliness", "Zamanında başlama"],
    ["vehicleSuitability", "Araç uygunluğu"],
    ["driverBehavior", "Sürücü davranışı"],
    ["operationOrder", "Operasyon düzeni"],
    ["liveTrackingConfidence", "Canlı takip güveni"],
    ["overallSatisfaction", "Genel memnuniyet"],
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 60 }}>
      <div className="card" style={{ width: "min(760px, calc(100vw - 32px))", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Hizmeti değerlendir</h3>
            <div className="muted" style={{ marginTop: 6 }}>{item.providerName} • {item.serviceLabel}</div>
          </div>
          <button type="button" onClick={onClose}>Kapat</button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {fields.map(([key, label]) => <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}><div>{label}</div><Stars value={form[key]} onChange={(n) => setForm((p) => ({ ...p, [key]: n }))} /></div>)}
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Kısa not</div>
            <textarea rows={4} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} style={{ width: "100%" }} placeholder="Kısa yorum yaz" />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Tekrar çalışmak ister misiniz?</div>
            <select value={form.recommendAgain} onChange={(e) => setForm((p) => ({ ...p, recommendAgain: e.target.value }))}>
              <option value="true">Evet</option>
              <option value="false">Hayır</option>
            </select>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose}>Vazgeç</button>
            <button type="button" disabled={busy} onClick={() => onSubmit({ shiftId: item.shiftId, ratings: { timeliness: form.timeliness, vehicleSuitability: form.vehicleSuitability, driverBehavior: form.driverBehavior, operationOrder: form.operationOrder, liveTrackingConfidence: form.liveTrackingConfidence, overallSatisfaction: form.overallSatisfaction }, note: form.note, recommendAgain: form.recommendAgain === "true" })}>{busy ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceEvaluationPanel() {
  const { token, me } = useSession();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const [s, i, e] = await Promise.all([
      api("/api/trust-quality/company/summary", { token }),
      api("/api/trust-quality/company/items", { token }),
      api("/api/trust-quality/evaluation-template", { token }),
    ]);
    setSummary(s || null);
    setItems(Array.isArray(i?.items) ? i.items : []);
    setEvaluation(e || null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e2) {
        if (cancelled) return;
        setErr(e2?.message || String(e2));
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      { title: "Tamamlanan Hizmet", value: c.completedServices ?? "-", note: "Değerlendirme açılabilecek hizmetler" },
      { title: "Değerlendirme Bekleyen", value: c.pendingEvaluation ?? "-", note: "Kısa puan ve yorum bekleyen kayıtlar" },
      { title: "Aktif Hizmet", value: c.activeServices ?? "-", note: "APPROVED / ACTIVE operasyonlar" },
      { title: "Sağlayıcı Sayısı", value: c.providerCount ?? "-", note: "Son hizmetlerde görünen oda / sağlayıcı" },
    ];
  }, [summary]);

  const base = companyPath(me);
  const kindLabel = me?.companyKind === "SCHOOL" ? "Okul" : me?.companyKind === "ORGANIZATION" ? "Organizasyon" : "Firma";

  async function submitEvaluation(payload) {
    setSaving(true);
    setErr("");
    try {
      await api.post("/api/trust-quality/company/evaluations", payload, { token });
      setSelected(null);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Hizmet Değerlendirme</h2>
          <div className="muted" style={{ marginTop: 6 }}>{kindLabel} için tamamlanan hizmet sonrası kalite değerlendirme görünümü</div>
        </div>
        <div className="muted">Kapsam: Kendi hizmet alanınız</div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#f97066", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((card) => <MetricCard key={card.title} {...card} />)}
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Değerlendirme Alanları</div>
            <div className="muted" style={{ marginTop: 6 }}>{(evaluation?.fields || []).join(" • ") || "Henüz veri yok"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate(base + "/shifts")}>Hizmetleri aç</button>
            <button type="button" onClick={() => navigate(base + "/agreements")}>Sözleşmeleri aç</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Tamamlanan / Değerlendirilecek Hizmetler</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left" }}><th>Sağlayıcı</th><th>Puan</th><th>Hizmet</th><th>Durum</th><th>Değerlendirme</th><th>Tarih</th><th>Sonraki Adım</th><th>Aksiyon</th></tr></thead>
            <tbody>
              {items.length ? items.map((item) => (
                <tr key={item.id}>
                  <td>{item.providerName || "-"}</td>
                  <td><ScorePill score={item.providerScore?.averageScore} count={item.providerScore?.evaluationCount} /></td>
                  <td>{item.serviceLabel || "-"}</td>
                  <td><StatusBadge value={item.statusLabel} /></td>
                  <td><StatusBadge value={item.evaluationStatus} /></td>
                  <td>{fmtTR(item.completedAt)}</td>
                  <td>{item.nextStep || "-"}</td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.canEvaluate ? <button type="button" onClick={() => setSelected(item)}>{item.evaluation ? "Puanı güncelle" : "Değerlendir"}</button> : null}
                    {item.actionPath ? <button type="button" onClick={() => navigate(companyPath(me, item.actionPath.replace(/^\/company/, "")))}>{item.actionLabel || "Aç"}</button> : "-"}
                  </td>
                </tr>
              )) : <tr><td colSpan={8} className="muted" style={{ padding: "8px 0" }}>Henüz değerlendirme ekranına düşen tamamlanmış hizmet yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <EvaluationModal open={!!selected} item={selected} busy={saving} onClose={() => setSelected(null)} onSubmit={submitEvaluation} />
    </div>
  );
}
