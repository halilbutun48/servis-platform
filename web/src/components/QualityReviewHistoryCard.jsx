import { useCallback, useEffect, useMemo, useState } from "react";
import { getQualityReviewDecisionHistory, normalizeQualityReviewDecisionError } from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  REVIEW_PENDING: "Kalite incelemesi bekliyor",
  REVIEWED: "İncelendi",
  NEEDS_RECHECK: "Tekrar kontrol gerekli",
  IGNORED_FOR_NOW: "Şimdilik dikkate alınmadı",
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Kalite incelemesi bekliyor";
}

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

function buildQueryScope(me, summaryParams) {
  if (summaryParams && typeof summaryParams === "object" && Object.keys(summaryParams).length > 0) {
    return summaryParams;
  }
  const role = String(me?.role || "").trim().toUpperCase();
  if (role === "ROOM") {
    const roomId = Number(me?.roomId || 0) || 0;
    return roomId ? { roomId } : {};
  }
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) {
    const companyId = Number(me?.companyId || 0) || 0;
    return companyId ? { companyId } : {};
  }
  return {};
}

function getVisibleItems(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 5);
}

function getHistorySummary(items = []) {
  const visible = getVisibleItems(items);
  if (!visible.length) return "";
  const latest = visible[0];
  return `${visible.length} kayıt • son karar: ${latest?.statusText || getStatusLabel(latest?.reviewStatus)}`;
}

export default function QualityReviewHistoryCard({
  summaryParams = null,
  className = "",
  style,
}) {
  const { token, me } = useSession();
  const queryScope = useMemo(() => buildQueryScope(me, summaryParams), [me, summaryParams]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const reloadSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const payload = await getQualityReviewDecisionHistory(queryScope || {}, { token });
      setSummary(payload || null);
    } catch (e) {
      const info = normalizeQualityReviewDecisionError(e, "Kalite karar geçmişi yüklenemedi.");
      if (info.status === 403) setError("Bu kalite geçmişini görme yetkiniz yok.");
      else setError(info.message || "Kalite karar geçmişi yüklenemedi.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [queryScope, token]);

  useEffect(() => {
    if (!token) return;
    reloadSummary();
  }, [token, reloadSummary]);

  const items = useMemo(() => getVisibleItems(summary?.items), [summary]);
  const historySummary = useMemo(() => getHistorySummary(summary?.items), [summary]);
  const latestDecision = summary?.latestDecision || items[0] || null;
  const isEmpty = !loading && !summary && !error;

  if (!token) return null;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">Kalite karar geçmişi</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>Denetim izi</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>Bu geçmiş kesin kalite puanı değildir.</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>Bu geçmiş hakediş veya komisyon hesabını etkilemez.</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Servis Kanıtı, Hizmet Kanıtı, Sürücünün telefon GPS’i, Araç GPS’i, Biniş kaydı, Operatör notu, Geri bildirim ve Şikayet sinyallerinin güvenli özetini gösterir.
          </div>
        </div>
        {!loading && latestDecision ? (
          <span className="pill" data-status={String(latestDecision?.reviewStatus || "REVIEW_PENDING").toUpperCase()}>
            {getStatusLabel(latestDecision?.reviewStatus)}
          </span>
        ) : null}
      </div>

      {loading ? <div className="muted">Kalite karar geçmişi yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelBody">{summary.summaryText}</div> : null}
      {!loading && summary?.nonFinalText ? <div className="panelMeta">{summary.nonFinalText}</div> : null}
      {!loading && summary?.paymentImpactText ? <div className="panelMeta">{summary.paymentImpactText}</div> : null}
      {!loading && historySummary ? <div className="quality-compact-summary">{historySummary}</div> : null}
      {isEmpty ? <div className="muted">Kalite karar geçmişi henüz yok.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && latestDecision ? (
        <div className="quality-history-item">
          <div className="panelSectionTitle" style={{ fontSize: 14 }}>Son kalite kararı</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="pill" data-status={String(latestDecision.reviewStatus || "REVIEW_PENDING").toUpperCase()}>
              {latestDecision.statusText || getStatusLabel(latestDecision.reviewStatus)}
            </span>
            <span className="panelMeta">{latestDecision.actorLabel || "Yetkili kullanıcı"}</span>
            <span className="panelMeta">{fmtTR(latestDecision.createdAt)}</span>
          </div>
          {latestDecision.notePreview ? <div className="panelBody">{latestDecision.notePreview}</div> : null}
        </div>
      ) : null}

      {!loading && items.length ? (
        <div className="quality-mini-list">
          {items.map((item) => (
            <div key={item.id} className="quality-history-item">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="pill" data-status={String(item.reviewStatus || "REVIEW_PENDING").toUpperCase()}>
                  {item.statusText || getStatusLabel(item.reviewStatus)}
                </span>
                <span className="panelMeta">{item.actorLabel || "Yetkili kullanıcı"}</span>
                <span className="panelMeta">{fmtTR(item.createdAt)}</span>
              </div>
              {item.notePreview ? <div className="panelBody">{normalizeText(item.notePreview)}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
