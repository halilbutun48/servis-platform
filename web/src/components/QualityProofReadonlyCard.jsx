import { useCallback, useEffect, useMemo, useState } from "react";
import { getQualityProofSignalSummary, normalizeQualityProofError } from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  NOT_READY: "Hazır değil",
  SIGNALS_PARTIAL: "Sinyaller kısmi",
  READY_FOR_REVIEW: "İncelemeye hazır",
  NEEDS_REVIEW: "Tekrar kontrol gerekli",
  REVIEWED: "İncelendi",
};

const SIGNAL_ID_SET = new Set([
  "PROOF_READY",
  "PROOF_PARTIAL",
  "MANUAL_OPERATOR_NOTE",
  "BOARDING_SIGNAL",
  "DRIVER_PHONE_GPS_SIGNAL",
  "VEHICLE_GPS_SIGNAL",
  "SERVICE_EVALUATION_SEEN",
  "COMPLAINT_OR_FEEDBACK_SEEN",
]);

const SIGNAL_LABELS = {
  PROOF_READY: "Servis kanıtı hazır",
  PROOF_PARTIAL: "Kanıt kısmi",
  MANUAL_OPERATOR_NOTE: "Operatör notu var",
  BOARDING_SIGNAL: "Biniş kaydı var",
  DRIVER_PHONE_GPS_SIGNAL: "Sürücünün telefon GPS’i sinyali var",
  VEHICLE_GPS_SIGNAL: "Araç GPS’i sinyali var",
  SERVICE_EVALUATION_SEEN: "Geri bildirim var",
  COMPLAINT_OR_FEEDBACK_SEEN: "Geri bildirim var",
};

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Hazır değil";
}

function getVisibleSignals(signals = []) {
  return (Array.isArray(signals) ? signals : [])
    .filter((item) => SIGNAL_ID_SET.has(String(item?.id || "").toUpperCase()))
    .slice(0, 7);
}

function getSignalLabel(signal = {}) {
  const id = String(signal?.id || "").toUpperCase();
  return SIGNAL_LABELS[id] || signal?.label || id || "-";
}

function getSignalSummary(signals = []) {
  const visible = getVisibleSignals(signals);
  if (!visible.length) return "";
  const labels = visible.slice(0, 3).map((signal) => getSignalLabel(signal));
  const remaining = Math.max(0, visible.length - labels.length);
  return `${visible.length} sinyal • ${labels.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`;
}

function getVisibleChecklist(checklist = []) {
  return (Array.isArray(checklist) ? checklist : []).slice(0, 5);
}

export default function QualityProofReadonlyCard({
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
      const summaryResult = await getQualityProofSignalSummary(summaryParams || {}, { token });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizeQualityProofError(e, "Kalite sinyalleri yüklenemedi.");
      if (info.status === 403) setError("Bu kalite özetini görme yetkiniz yok.");
      else setError(info.message || "Kalite sinyalleri yüklenemedi.");
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
  const signalSummary = useMemo(() => getSignalSummary(summary?.signals), [summary]);
  const visibleChecklist = useMemo(() => getVisibleChecklist(summary?.checklist), [summary]);
  const status = String(summary?.status || "NOT_READY").toUpperCase();
  const isEmpty = !loading && status === "NOT_READY" && visibleSignals.length === 0 && visibleChecklist.length === 0 && !summary?.summaryText;

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
          <div className="panelSectionTitle">Kalite puanı hazırlığı</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            {summary?.nonFinalText || "Bu bilgi tek başına kalite puanı değildir."}
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Servis kanıtı kalite değerlendirmesine yardımcı olur.
          </div>
        </div>
        {!loading ? (
          <span className="pill" data-status={status}>
            {getStatusLabel(status)}
          </span>
        ) : null}
      </div>

      {loading ? <div className="muted">Kalite sinyalleri yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelBody">{summary.summaryText || "Sağlayıcı karşılaştırması için hazırlık"}</div> : null}
      {!loading && summary?.nextAction ? <div className="panelMeta">{summary.nextAction}</div> : null}
      {!loading && signalSummary ? <div className="quality-compact-summary">{signalSummary}</div> : null}
      {isEmpty ? <div className="muted">Kalite sinyali henüz oluşmadı.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && summary ? (
        <>
          {visibleChecklist.length ? (
            <div className="quality-mini-list">
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

          <div className="quality-chip-row">
            {visibleSignals.length ? (
              visibleSignals.map((signal) => (
                <span
                  key={signal.id}
                  className="quality-chip"
                  title={signal.note || signal.label}
                >
                  {getSignalLabel(signal)}
                </span>
              ))
            ) : (
              <span className="quality-chip quality-chip--muted">Henüz güçlü kalite sinyali yok.</span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
