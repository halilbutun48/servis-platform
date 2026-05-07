import { useCallback, useEffect, useMemo, useState } from "react";
import { getOperationProofSummary, normalizeOperationProofError } from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  NOT_STARTED: "Kanıt bekleniyor",
  IN_PROGRESS: "Servis devam ediyor",
  EVIDENCE_PARTIAL: "Kanıt kısmi",
  EVIDENCE_READY: "Kanıt denetime hazır",
  NEEDS_REVIEW: "Tekrar kontrol gerekli",
  COMPLETED: "Tamamlandı",
};

const SIGNAL_ID_SET = new Set([
  "DRIVER_PHONE_GPS_SEEN",
  "VEHICLE_GPS_SEEN",
  "BOARDING_RECORDED",
  "MANUAL_OPERATOR_NOTE",
]);

const SIGNAL_LABELS = {
  DRIVER_PHONE_GPS_SEEN: "Sürücünün telefon GPS’i görüldü",
  VEHICLE_GPS_SEEN: "Araç GPS’i görüldü",
  BOARDING_RECORDED: "Biniş kaydı var",
  MANUAL_OPERATOR_NOTE: "Operatör notu var",
};

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Kanıt bekleniyor";
}

function getVisibleSignals(signals = []) {
  return (Array.isArray(signals) ? signals : [])
    .filter((item) => SIGNAL_ID_SET.has(String(item?.id || "").toUpperCase()))
    .slice(0, 4);
}

function getSignalLabel(signal = {}) {
  const id = String(signal?.id || "").toUpperCase();
  return SIGNAL_LABELS[id] || signal?.label || id || "-";
}

export default function OperationProofReadonlyBadge({
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
      const summaryResult = await getOperationProofSummary(summaryParams || {}, { token });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizeOperationProofError(e, "Kanıt durumu yüklenemedi.");
      if (info.status === 403) setError("Bu kanıt özetini görme yetkiniz yok.");
      else setError(info.message || "Kanıt durumu yüklenemedi.");
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
  const status = String(summary?.status || "NOT_STARTED").toUpperCase();
  const isEmpty = !loading && status === "NOT_STARTED" && visibleSignals.length === 0 && !summary?.summaryText;

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
          <div className="panelSectionTitle">Servis Kanıtı</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Bu özet hakediş için nihai karar değildir.
          </div>
        </div>
        {!loading ? (
          <span className="pill" data-status={status}>
            {getStatusLabel(status)}
          </span>
        ) : null}
      </div>

      {loading ? <div className="muted">Kanıt durumu yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelMeta">{summary.summaryText}</div> : null}
      {isEmpty ? <div className="muted">Kanıt durumu henüz oluşmadı.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && summary ? (
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
            <span className="muted">Henüz güçlü kanıt sinyali yok.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
