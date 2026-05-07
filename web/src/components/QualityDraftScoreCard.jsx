import { useCallback, useEffect, useMemo, useState } from "react";
import { getQualityDraftScoreSummary, normalizeQualityDraftError } from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  NO_SCORE: "Skor yok",
  DRAFT_PARTIAL: "Taslak kısmi",
  DRAFT_READY_FOR_REVIEW: "Denetime hazır öneri",
  NEEDS_REVIEW: "Tekrar kontrol gerekli",
  REVIEWED_DRAFT: "İncelenmiş taslak",
};

const SIGNAL_ID_SET = new Set([
  "PROOF_READY",
  "PROOF_PARTIAL",
  "BOARDING_SIGNAL",
  "DRIVER_PHONE_GPS_SIGNAL",
  "VEHICLE_GPS_SIGNAL",
  "MANUAL_OPERATOR_NOTE",
  "FEEDBACK_SEEN",
  "COMPLAINT_SEEN",
]);

const SIGNAL_LABELS = {
  PROOF_READY: "Servis kanıtı hazır",
  PROOF_PARTIAL: "Kanıt kısmi",
  BOARDING_SIGNAL: "Biniş kaydı var",
  DRIVER_PHONE_GPS_SIGNAL: "Sürücünün telefon GPS’i sinyali var",
  VEHICLE_GPS_SIGNAL: "Araç GPS’i sinyali var",
  MANUAL_OPERATOR_NOTE: "Operatör notu var",
  FEEDBACK_SEEN: "Geri bildirim var",
  COMPLAINT_SEEN: "Şikayet / tekrar kontrol sinyali var",
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getStatusLabel(status, fallbackBand) {
  const key = String(status || "").toUpperCase();
  return STATUS_LABELS[key] || normalizeText(fallbackBand) || "Skor yok";
}

function getVisibleSignals(signals = []) {
  return (Array.isArray(signals) ? signals : [])
    .filter((item) => SIGNAL_ID_SET.has(String(item?.id || "").toUpperCase()))
    .slice(0, 8);
}

function getSignalLabel(signal = {}) {
  const id = String(signal?.id || "").toUpperCase();
  return SIGNAL_LABELS[id] || signal?.label || id || "-";
}

function getVisibleChecklist(checklist = []) {
  return (Array.isArray(checklist) ? checklist : []).slice(0, 5);
}

function getVisibleExplanation(explanation = []) {
  if (!Array.isArray(explanation)) return [];
  return explanation.map((item) => normalizeText(item)).filter(Boolean).slice(0, 4);
}

export default function QualityDraftScoreCard({
  summaryParams = null,
  className = "",
  style,
}) {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const reloadSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const summaryResult = await getQualityDraftScoreSummary(summaryParams || {}, { token });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizeQualityDraftError(e, "Taslak kalite skoru yüklenemedi.");
      if (info.status === 403) setError("Bu kalite özetini görme yetkiniz yok.");
      else setError(info.message || "Taslak kalite skoru yüklenemedi.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [summaryParams, token]);

  useEffect(() => {
    if (!token) return;
    reloadSummary();
  }, [token, reloadSummary]);

  const visibleSignals = useMemo(() => getVisibleSignals(summary?.signals), [summary]);
  const visibleChecklist = useMemo(() => getVisibleChecklist(summary?.checklist), [summary]);
  const visibleExplanation = useMemo(() => getVisibleExplanation(summary?.explanation), [summary]);
  const status = String(summary?.status || "NO_SCORE").toUpperCase();
  const isEmpty = !loading && status === "NO_SCORE" && visibleSignals.length === 0 && visibleChecklist.length === 0 && !summary?.summaryText;

  if (!token) return null;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 12,
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
          <div className="panelSectionTitle">Taslak kalite skoru</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu skor kesin kalite puanı değildir.
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu skor hakediş veya komisyon hesabını etkilemez.
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          {!loading ? (
            <span className="pill" data-status={status}>
              {getStatusLabel(status, summary?.scoreBand)}
            </span>
          ) : null}
          {summary?.draftScore != null ? (
            <div style={{ display: "grid", justifyItems: "end" }}>
              <div className="panelStatValue" style={{ lineHeight: 1 }}>
                {summary.draftScore}
              </div>
              <div className="panelMeta">/100 taslak</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panelMeta">Operasyon kanıtı kalite incelemesine yardımcı olur.</div>

      {loading ? <div className="muted">Taslak kalite skoru yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelBody">{summary.summaryText}</div> : null}
      {!loading && summary?.nextAction ? <div className="panelMeta">{summary.nextAction}</div> : null}
      {!loading && summary?.paymentImpactText ? <div className="panelMeta">{summary.paymentImpactText}</div> : null}
      {isEmpty ? <div className="muted">Taslak kalite skoru henüz oluşmadı.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && summary ? (
        <>
          {visibleExplanation.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              {visibleExplanation.map((line) => (
                <div key={line} className="panelMeta">
                  • {line}
                </div>
              ))}
            </div>
          ) : null}

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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {visibleSignals.length ? (
              visibleSignals.map((signal) => (
                <span
                  key={signal.id}
                  className="pill"
                  title={signal.note || signal.label}
                  data-status="ROLE"
                >
                  {getSignalLabel(signal)}
                </span>
              ))
            ) : (
              <span className="muted">Henüz taslak kalite sinyali yok.</span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
