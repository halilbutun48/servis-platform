import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getQualityReviewDecisionSummary,
  normalizeQualityReviewDecisionError,
  postQualityReviewDecision,
} from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  REVIEW_PENDING: "Kalite incelemesi bekliyor",
  REVIEWED: "İncelendi",
  NEEDS_RECHECK: "Tekrar kontrol gerekli",
  IGNORED_FOR_NOW: "Şimdilik dikkate alınmadı",
};

const DECISION_OPTIONS = [
  { value: "REVIEWED", label: "İncelendi" },
  { value: "NEEDS_RECHECK", label: "Tekrar kontrol gerekli" },
  { value: "IGNORED_FOR_NOW", label: "Şimdilik dikkate alma" },
];

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Kalite incelemesi bekliyor";
}

function getVisibleChecklist(checklist = []) {
  return (Array.isArray(checklist) ? checklist : []).slice(0, 5);
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

function buildBodyScope(me, summaryParams = null) {
  if (summaryParams && typeof summaryParams === "object") {
    const scopeType = normalizeText(summaryParams.scopeType || "").toUpperCase();
    const scopeId = normalizeText(summaryParams.scopeId || "");
    if (scopeType && scopeId) {
      return { scopeType, scopeId };
    }
    const queryRoomId = Number(summaryParams.roomId || 0) || 0;
    if (queryRoomId) {
      return { scopeType: "QUALITY_DRAFT_SCORE", scopeId: `room:${queryRoomId}` };
    }
    const queryCompanyId = Number(summaryParams.companyId || 0) || 0;
    if (queryCompanyId) {
      return { scopeType: "QUALITY_DRAFT_SCORE", scopeId: `company:${queryCompanyId}` };
    }
  }
  const role = String(me?.role || "").trim().toUpperCase();
  if (role === "ROOM") {
    const roomId = Number(me?.roomId || 0) || 0;
    return roomId ? { scopeType: "QUALITY_DRAFT_SCORE", scopeId: `room:${roomId}` } : { scopeType: "QUALITY_DRAFT_SCORE", scopeId: "global" };
  }
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) {
    const companyId = Number(me?.companyId || 0) || 0;
    return companyId ? { scopeType: "QUALITY_DRAFT_SCORE", scopeId: `company:${companyId}` } : { scopeType: "QUALITY_DRAFT_SCORE", scopeId: "global" };
  }
  return { scopeType: "QUALITY_DRAFT_SCORE", scopeId: "global" };
}

export default function QualityReviewDecisionCard({
  summaryParams = null,
  className = "",
  style,
}) {
  const { token, me } = useSession();
  const queryScope = useMemo(() => buildQueryScope(me, summaryParams), [me, summaryParams]);
  const bodyScope = useMemo(() => buildBodyScope(me, summaryParams), [me, summaryParams]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDecision, setSelectedDecision] = useState("");
  const [note, setNote] = useState("");

  const reloadSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const summaryResult = await getQualityReviewDecisionSummary(queryScope || {}, { token });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizeQualityReviewDecisionError(e, "Kalite inceleme kararı yüklenemedi.");
      if (info.status === 403) setError("Bu kalite kararını görme yetkiniz yok.");
      else setError(info.message || "Kalite inceleme kararı yüklenemedi.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [queryScope, token]);

  useEffect(() => {
    if (!token) return;
    reloadSummary();
  }, [token, reloadSummary]);

  useEffect(() => {
    const status = String(summary?.reviewStatus || "").toUpperCase();
    if (status && status !== "REVIEW_PENDING") {
      setSelectedDecision(status);
      return;
    }
    setSelectedDecision("");
  }, [summary?.reviewStatus]);

  const visibleChecklist = useMemo(() => getVisibleChecklist(summary?.checklist), [summary]);
  const currentStatus = String(summary?.reviewStatus || "REVIEW_PENDING").toUpperCase();
  const selected = String(selectedDecision || "").toUpperCase();
  const isEmpty = !loading && !summary && !error;

  async function handleSave() {
    if (!selectedDecision) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await postQualityReviewDecision({
        ...bodyScope,
        decision: selectedDecision,
        note,
      }, { token });
      setSuccess(response?.message || "Kalite inceleme kararı kaydedildi.");
      setNote("");
      await reloadSummary();
    } catch (e) {
      const info = normalizeQualityReviewDecisionError(e, "Kalite inceleme kararı kaydedilemedi.");
      if (info.status === 403) setError("Bu kalite kararını görme yetkiniz yok.");
      else setError(info.message || "Kalite inceleme kararı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="panelSectionTitle">Kalite inceleme kararı</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu karar kesin kalite puanı değildir.
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu karar hakediş veya komisyon hesabını etkilemez.
          </div>
        </div>
        {!loading ? (
          <span className="pill" data-status={currentStatus}>
            {getStatusLabel(currentStatus)}
          </span>
        ) : null}
      </div>

      {loading ? <div className="muted">Kalite inceleme kararı yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelBody">{summary.summaryText}</div> : null}
      {!loading && summary?.nextAction ? <div className="panelMeta">{summary.nextAction}</div> : null}
      {!loading && summary?.nonFinalText ? <div className="panelMeta">{summary.nonFinalText}</div> : null}
      {!loading && summary?.paymentImpactText ? <div className="panelMeta">{summary.paymentImpactText}</div> : null}
      {isEmpty ? <div className="muted">Kalite inceleme kararı henüz yok.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}
      {success ? <div style={{ color: "#8dedb9", whiteSpace: "pre-wrap" }}>{success}</div> : null}

      {!loading && summary ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DECISION_OPTIONS.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDecision(option.value)}
                  style={{
                    border: active ? "1px solid rgba(61,122,255,0.8)" : "1px solid rgba(255,255,255,0.12)",
                    background: active ? "rgba(61,122,255,0.16)" : "rgba(255,255,255,0.03)",
                    color: "inherit",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Kısa inceleme notu</div>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(normalizeText(e.target.value).slice(0, 500))}
              placeholder="Kısa inceleme notu yazın"
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={saving || !selectedDecision} onClick={handleSave}>
              {saving ? "Kaydediliyor..." : "Kararı kaydet"}
            </button>
          </div>

          {visibleChecklist.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {visibleChecklist.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    className="pill"
                    data-status={item.done ? "ACTIVE" : "NEUTRAL"}
                    style={{ minWidth: 28, justifyContent: "center" }}
                    title={item.note || item.label}
                  >
                    {item.done ? "✓" : "•"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div className="panelMeta" style={{ marginTop: 2 }}>{item.note || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
