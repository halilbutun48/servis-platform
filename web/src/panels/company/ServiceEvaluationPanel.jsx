import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { resolveRuntimeScopeKey } from "../../copilot/screenRegistry";
import { useSession } from "../../state/session";
import { getCompanyTrustQualityItems, getCompanyTrustQualitySummary, getTrustQualityTemplate } from "../../utils/companyDataHub";
import { companyPath } from "../../utils/paths";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildServiceEvaluationFacts } from "../../utils/copilotFacts";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import QualityProofReadonlyCard from "../../components/QualityProofReadonlyCard";
import QualityDraftScoreCard from "../../components/QualityDraftScoreCard";
import QualityReviewDecisionCard from "../../components/QualityReviewDecisionCard";
import QualityReviewHistoryCard from "../../components/QualityReviewHistoryCard";

function fmtTR(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ title, value, note, accent = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
  };
  const colors = palette[accent] || palette.default;
  return (
    <div
      className="quality-card-shell"
      style={{
        padding: 14,
        border: colors.border,
        borderRadius: 8,
        minWidth: 0,
        width: "100%",
        display: "grid",
        gap: 8,
      }}
    >
      <div className="panelSectionTitle" style={{ color: colors.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: colors.value }}>{value}</div>
      {note ? <div className="panelMeta">{note}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children, className = "", style }) {
  return (
    <div
      className={`quality-card-shell${className ? ` ${className}` : ""}`}
      style={{
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        minWidth: 0,
        width: "100%",
        display: "grid",
        gap: 10,
        ...style,
      }}
    >
      <div>
        <div className="panelSectionTitle">{title}</div>
        {subtitle ? <div className="panelMeta" style={{ marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ value }) {
  const text = String(value || "").trim().toUpperCase();
  const style = { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
  if (["DEĞERLENDİRME AÇIK", "BEKLİYOR", "PENDING", "REVIEW_PENDING"].includes(text)) {
    style.color = "#fedf89";
    style.background = "rgba(247,144,9,0.16)";
    style.border = "1px solid rgba(247,144,9,0.45)";
  }
  if (["HENÜZ AÇILAMAZ", "HİZMET DEVAM EDİYOR", "ACTIVE", "APPROVED", "DEVAM_EDIYOR"].includes(text)) {
    style.color = "#b2ddff";
    style.background = "rgba(83,177,253,0.12)";
    style.border = "1px solid rgba(83,177,253,0.35)";
  }
  if (["TAMAMLANDI", "DONE", "KAYDEDİLDİ", "REVIEWED"].includes(text)) {
    style.color = "#d1fadf";
    style.background = "rgba(18,183,106,0.16)";
    style.border = "1px solid rgba(18,183,106,0.45)";
  }
  return <span className="pill" style={style}>{value || "-"}</span>;
}

function buildInitialEvaluationForm(item) {
  return {
    timeliness: item?.evaluation?.ratings?.timeliness ?? 0,
    vehicleSuitability: item?.evaluation?.ratings?.vehicleSuitability ?? 0,
    driverBehavior: item?.evaluation?.ratings?.driverBehavior ?? 0,
    operationOrder: item?.evaluation?.ratings?.operationOrder ?? 0,
    liveTrackingConfidence: item?.evaluation?.ratings?.liveTrackingConfidence ?? 0,
    overallSatisfaction: item?.evaluation?.ratings?.overallSatisfaction ?? 0,
    note: item?.evaluation?.note || "",
    recommendAgain: item?.evaluation?.recommendAgain === false ? "false" : "true",
  };
}

function EvaluationModal({ open, item, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(() => buildInitialEvaluationForm(item));

  useEffect(() => {
    setForm(buildInitialEvaluationForm(item));
  }, [item]);

  if (!open || !item) return null;

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
          {fields.map(([key, label]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
              }}
            >
              <div>{label}</div>
              <div style={{ display: "inline-flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, [key]: n }))}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 20,
                      color: n <= Number(form[key] || 0) ? "#fdb022" : "#667085",
                      padding: 0,
                    }}
                  >
                    {n <= Number(form[key] || 0) ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Kısa not</div>
            <textarea
              rows={4}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              style={{ width: "100%" }}
              placeholder="Kısa yorum yaz"
            />
          </label>

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Tekrar çalışmak ister misiniz?</div>
            <select value={form.recommendAgain} onChange={(e) => setForm((p) => ({ ...p, recommendAgain: e.target.value }))}>
              <option value="true">Evet</option>
              <option value="false">Hayır</option>
            </select>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onClose}>Vazgeç</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit({
                shiftId: item.shiftId,
                ratings: {
                  timeliness: form.timeliness,
                  vehicleSuitability: form.vehicleSuitability,
                  driverBehavior: form.driverBehavior,
                  operationOrder: form.operationOrder,
                  liveTrackingConfidence: form.liveTrackingConfidence,
                  overallSatisfaction: form.overallSatisfaction,
                },
                note: form.note,
                recommendAgain: form.recommendAgain === "true",
              })}
            >
              {busy ? "Kaydediliyor..." : "Kaydet"}
            </button>
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
  const [activeTab, setActiveTab] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [focusedItemId, setFocusedItemId] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const copilotScopeKey = useMemo(() => resolveRuntimeScopeKey(getPath(), "/company/service-evaluation"), []);
  const kindLabel = me?.companyKind === "SCHOOL" ? "Okul" : me?.companyKind === "ORGANIZATION" ? "Organizasyon" : "Firma";

  const completedCount = Number(summary?.cards?.completedServices || 0);
  const pendingCount = Number(summary?.cards?.pendingEvaluation || 0);
  const activeCount = Number(summary?.cards?.activeServices || 0);
  const providerCount = Number(summary?.cards?.providerCount || 0);
  const templateFields = Array.isArray(evaluation?.fields) ? evaluation.fields : [];
  const pendingPreview = useMemo(() => (Array.isArray(items) ? items : []).slice(0, 3), [items]);
  const selectedItem = useMemo(
    () => pendingPreview.find((item) => String(item.id || "") === String(focusedItemId || "")) || null,
    [pendingPreview, focusedItemId]
  );
  const copilotSubject = selectedItem || pendingPreview[0] || null;

  const loadBase = useCallback(async (signal) => {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const [summaryPayload, itemsPayload] = await Promise.all([
        getCompanyTrustQualitySummary(token, { signal }),
        getCompanyTrustQualityItems(token, { signal, take: 12, pendingOnly: true }),
      ]);
      if (signal?.aborted) return;
      setSummary(summaryPayload || null);
      setItems(Array.isArray(itemsPayload?.items) ? itemsPayload.items : []);
    } catch (e) {
      if (signal?.aborted || e?.name === "AbortError") return;
      setErr(e?.message || String(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [token]);

  const ensureTemplate = useCallback(async (signal) => {
    if (!token) return;
    try {
      const templatePayload = await getTrustQualityTemplate(token, { signal });
      if (signal?.aborted) return;
      setEvaluation(templatePayload || null);
    } catch (e) {
      if (signal?.aborted || e?.name === "AbortError") return;
      setErr(e?.message || String(e));
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setItems([]);
      setEvaluation(null);
      setFocusedItemId("");
      setSelected(null);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    (async () => {
      await loadBase(controller.signal);
    })();
    return () => controller.abort();
  }, [token, loadBase]);

  useEffect(() => {
    if (!token || activeTab !== "fields" || evaluation) return undefined;
    const controller = new AbortController();
    ensureTemplate(controller.signal);
    return () => controller.abort();
  }, [token, activeTab, evaluation, ensureTemplate]);

  useEffect(() => {
    if (!token || (!summary && !pendingPreview.length && !evaluation)) {
      clearCopilotSelection(copilotScopeKey);
      return () => clearCopilotSelection(copilotScopeKey);
    }

    const facts = buildServiceEvaluationFacts({ item: copilotSubject, summary });
    setCopilotSelection({
      scopeKey: copilotScopeKey,
      entityType: "screen",
      entityId: 6114,
      label: "Hizmet Değerlendirme",
      summary: [
        pendingCount ? `${pendingCount} bekleyen` : null,
        completedCount ? `${completedCount} tamamlanan` : null,
        activeCount ? `${activeCount} aktif` : null,
        providerCount ? `${providerCount} sağlayıcı` : null,
        templateFields.length ? `${templateFields.length} alan` : null,
        facts?.copilotSummary || null,
      ].filter(Boolean).join(" • "),
      fields: [
        { label: "Tamamlanan Hizmet", value: String(completedCount), help: "Kapanmış hizmet sayısı." },
        { label: "Aktif Hizmet", value: String(activeCount), help: "Hâlâ açık operasyon sayısı." },
        { label: "Değerlendirme Bekleyen", value: String(pendingCount), help: "İnceleme bekleyen kayıt sayısı." },
        { label: "Sağlayıcı Sayısı", value: String(providerCount), help: "Hizmet değerlendirmesinde görünen sağlayıcı sayısı." },
        { label: "Değerlendirme Alanı", value: String(templateFields.length), help: "Görünen değerlendirme alanı sayısı." },
      ],
      badges: [
        { label: "Durum", value: pendingCount ? "BEKLEYEN VAR" : "TEMİZ", help: "Kritik değerlendirme bekleyen kayıt durumu." },
      ],
      facts,
    });
    return () => clearCopilotSelection(copilotScopeKey);
  }, [token, summary, pendingPreview, evaluation, copilotScopeKey, copilotSubject, pendingCount, completedCount, activeCount, providerCount, templateFields.length]);

  const tabs = useMemo(() => ([
    { key: "overview", label: "Özet", badge: pendingCount || null },
    { key: "proof", label: "Kanıt / Hazırlık", badge: completedCount || null },
    { key: "draft", label: "Taslak Skor", badge: activeCount || null },
    { key: "decision", label: "İnceleme Kararı", badge: pendingCount || null },
    { key: "history", label: "Geçmiş" },
    { key: "fields", label: "Değerlendirme Alanları", badge: templateFields.length || null },
  ]), [pendingCount, completedCount, activeCount, templateFields.length]);

  function openCompanyList(shiftId) {
    const shiftsPath = companyPath(me, "/shifts");
    navigate(shiftsPath);
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("company:shifts:focus", {
          detail: { section: "list", shiftIds: shiftId ? [Number(shiftId)] : [] },
        }));
      } catch {
        // no-op
      }
    }, 60);
  }

  async function submitEvaluation(payload) {
    setSaving(true);
    setErr("");
    try {
      await api.post("/api/trust-quality/company/evaluations", payload, { token });
      setSelected(null);
      setFocusedItemId("");
      await loadBase();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const overviewLead = pendingCount > 0
    ? `Değerlendirme bekleyen hizmet var · ${pendingCount} kayıt`
    : "Değerlendirme bekleyen hizmet yok. Kanıt ve taslak skor sekmeleri yine referans olarak açık.";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PanelChrome
        title="Hizmet Değerlendirme"
        subtitle={`${kindLabel} için kısa özet, kanıt, taslak skor, karar ve geçmiş sekmeleriyle okunur.`}
        actions={<div className="panelMeta">Kapsam: Kendi hizmet alanınız</div>}
      />

      {err ? <div className="card" style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <MetricCard
            title="Tamamlanan Hizmet"
            value={loading ? "…" : completedCount}
            note="Değerlendirme açılabilecek hizmetler"
            accent={completedCount ? "good" : "default"}
          />
          <MetricCard
            title="Aktif Hizmet"
            value={loading ? "…" : activeCount}
            note="Kabul edilen / aktif operasyonlar"
            accent={activeCount ? "good" : "default"}
          />
          <MetricCard
            title="Değerlendirme Bekleyen"
            value={loading ? "…" : pendingCount}
            note="Kısa puan ve yorum bekleyen kayıtlar"
            accent={pendingCount ? "warm" : "default"}
          />
          <MetricCard
            title="Sağlayıcı Sayısı"
            value={loading ? "…" : providerCount}
            note="Son hizmetlerde görünen taşımacılık firması / sağlayıcı"
          />
        </div>
      </div>

      {pendingCount > 0 ? (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="panelSectionTitle">Yeni değerlendirme bekleyen hizmet var</div>
            <div className="panelMeta" style={{ marginTop: 4 }}>{overviewLead}</div>
          </div>
          <button type="button" onClick={() => setActiveTab("decision")}>İnceleme Kararı sekmesine git</button>
        </div>
      ) : null}

      <div className="card" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <PanelSegmentTabs
          ariaLabel="Hizmet değerlendirme sekmeleri"
          compact
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {activeTab === "overview" ? (
          <div role="tabpanel" aria-label="Özet" className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              <SectionCard
                title="Sıradaki doğru işlem"
                subtitle="Kısa aksiyon, karar öncesi yönlendirme"
              >
                <div className="panelBody">
                  {pendingCount > 0
                    ? "Önce bekleyen hizmetleri gözden geçir. Sonra inceleme kararını ver."
                    : "Bekleyen kayıt görünmüyor. Kanıt ve taslak skor referans yüzeylerini gerektiğinde aç."}
                </div>
                <div className="toolbar" style={{ flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setActiveTab("decision")} disabled={!pendingCount}>
                    İnceleme Kararı
                  </button>
                  <button type="button" onClick={() => setActiveTab("proof")}>Kanıt / Hazırlık</button>
                </div>
              </SectionCard>

              <SectionCard
                title="Bekleyen değerlendirme özeti"
                subtitle="Kısa durum ve ilk bakış"
              >
                <div className="panelBody">{overviewLead}</div>
                <div className="panelMeta">
                  Bu özet detaylı kalite checklistini tekrar etmez; sadece son adıma geçişi tarif eder.
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Bekleyen hizmetler"
              subtitle="İlk 3 kayıt görünür; ayrıntı karar tabında"
            >
              {pendingPreview.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {pendingPreview.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.4fr) auto",
                        gap: 10,
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 12,
                        border: String(focusedItemId || "") === String(item.id || "")
                          ? "1px solid rgba(61,122,255,0.45)"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: String(focusedItemId || "") === String(item.id || "")
                          ? "rgba(61,122,255,0.10)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700 }}>{item.providerName || "-"}</div>
                          <StatusBadge value={item.statusLabel} />
                          <StatusBadge value={item.evaluationStatus} />
                        </div>
                        <div className="panelMeta" style={{ marginTop: 4 }}>{item.serviceLabel || "-"}</div>
                        <div className="panelMeta" style={{ marginTop: 4 }}>{item.nextStep || "-"}</div>
                        <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(item.completedAt)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {item.canEvaluate ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedItemId(item.id);
                              setSelected(item);
                            }}
                          >
                            {item.evaluation ? "Puanı güncelle" : "Değerlendir"}
                          </button>
                        ) : null}
                        {item.actionPath ? (
                          <button
                            type="button"
                            onClick={() => {
                              const path = companyPath(me, item.actionPath.replace(/^\/company/, ""));
                              if (path === companyPath(me, "/shifts")) {
                                setFocusedItemId(item.id);
                                openCompanyList(item.shiftId);
                              } else {
                                navigate(path);
                              }
                            }}
                          >
                            {item.actionLabel || "Aç"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">
                  Henüz değerlendirme ekranına düşen tamamlanmış hizmet yok.
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "proof" ? (
          <div role="tabpanel" aria-label="Kanıt / Hazırlık" className="card" style={{ padding: 14 }}>
            <QualityProofReadonlyCard />
          </div>
        ) : null}

        {activeTab === "draft" ? (
          <div role="tabpanel" aria-label="Taslak Skor" className="card" style={{ padding: 14 }}>
            <QualityDraftScoreCard />
          </div>
        ) : null}

        {activeTab === "decision" ? (
          <div role="tabpanel" aria-label="İnceleme Kararı" className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
            <QualityReviewDecisionCard />
            {selected ? (
              <SectionCard
                title="Seçili hizmet"
                subtitle="Karar kaydını açmadan önce kısa bağlam"
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div><b>{selected.providerName || "-"}</b></div>
                  <div className="panelMeta">Hizmet: {selected.serviceLabel || "-"}</div>
                  <div className="panelMeta">Durum: <StatusBadge value={selected.statusLabel} /></div>
                  <div className="panelMeta">Değerlendirme: <StatusBadge value={selected.evaluationStatus} /></div>
                  <div className="panelMeta">Sonraki Adım: {selected.nextStep || "-"}</div>
                  <div className="panelMeta">Son Güncelleme: {fmtTR(selected.completedAt)}</div>
                </div>
              </SectionCard>
            ) : (
              <SectionCard
                title="Seçili hizmet"
                subtitle="Karar için bir satır seç"
              >
                <div className="muted">Listeden bir hizmet seçtiğinde buradaki bağlam görünür.</div>
              </SectionCard>
            )}
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div role="tabpanel" aria-label="Geçmiş" className="card" style={{ padding: 14 }}>
            <QualityReviewHistoryCard />
          </div>
        ) : null}

        {activeTab === "fields" ? (
          <div role="tabpanel" aria-label="Değerlendirme Alanları" className="card" style={{ display: "grid", gap: 12 }}>
            <SectionCard
              title="Değerlendirme alanları"
              subtitle="Hizmetler ve sözleşmeler için görünür kalite alanları"
            >
              <div className="panelBody">
                {evaluation?.summary || "Hizmet değerlendirme alanları ve sözleşme yönlendirmeleri burada görünür."}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {templateFields.length ? templateFields.map((field) => (
                  <span key={field} className="pill">{field}</span>
                )) : <span className="muted">Henüz değerlendirme alanı yok</span>}
              </div>
              <div className="panelMeta">
                Puan ölçeği: 1 • 2 • 3 • 4 • 5
              </div>
            </SectionCard>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => openCompanyList()}>Hizmetleri aç</button>
              <button type="button" onClick={() => navigate(companyPath(me, "/agreements"))}>Sözleşmeleri aç</button>
              <button type="button" onClick={() => setActiveTab("proof")}>Kanıt / Hazırlık</button>
            </div>
          </div>
        ) : null}
      </div>

      <EvaluationModal
        key={selected ? `eval-${selected.id || selected.shiftId || "x"}-${selected.evaluation?.updatedAt || selected.evaluation?.note || "new"}` : "eval-empty"}
        open={!!selected}
        item={selected}
        busy={saving}
        onClose={() => setSelected(null)}
        onSubmit={submitEvaluation}
      />
    </div>
  );
}
