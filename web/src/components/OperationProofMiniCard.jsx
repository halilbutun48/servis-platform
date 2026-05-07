import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOperationProofSummary,
  normalizeOperationProofError,
  postOperationProofManualNote,
} from "../api";
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

const SIGNAL_LIMIT = 4;
const CHECKLIST_LIMIT = 5;
const MAX_NOTE_LENGTH = 500;

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Kanıt bekleniyor";
}

function getVisibleSignals(signals = []) {
  return (Array.isArray(signals) ? signals : [])
    .filter((item) => SIGNAL_ID_SET.has(String(item?.id || "").toUpperCase()))
    .slice(0, SIGNAL_LIMIT);
}

function getVisibleChecklist(checklist = []) {
  return (Array.isArray(checklist) ? checklist : []).slice(0, CHECKLIST_LIMIT);
}

function getSignalLabel(signal = {}) {
  const id = String(signal?.id || "").toUpperCase();
  return SIGNAL_LABELS[id] || signal?.label || id || "-";
}

export default function OperationProofMiniCard({
  summaryParams = null,
  manualNoteScopeType = "SERVICE",
  manualNoteScopeId = "overview",
  className = "",
  style,
}) {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reloadSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const summaryResult = await getOperationProofSummary(summaryParams || {}, { token });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizeOperationProofError(e, "Servis kanıtı yüklenemedi.");
      if (info.status === 403) setError("Bu özet için yetkiniz yok.");
      else setError(info.message || "Servis kanıtı yüklenemedi.");
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
  const status = String(summary?.status || "NOT_STARTED").toUpperCase();
  const isEmpty = !loading && status === "NOT_STARTED" && visibleSignals.length === 0;
  const noteLength = normalizeText(note).length;

  async function handleSave(event) {
    event.preventDefault();
    const trimmed = normalizeText(note);
    if (!trimmed) {
      setError("Kısa not girin.");
      return;
    }
    if (trimmed.length > MAX_NOTE_LENGTH) {
      setError("Not en fazla 500 karakter olabilir.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await postOperationProofManualNote(
        {
          scopeType: manualNoteScopeType,
          scopeId: manualNoteScopeId,
          note: trimmed,
        },
        { token }
      );
      setNote("");
      await reloadSummary();
      setSuccess("Operatör notu kaydedildi.");
    } catch (e) {
      const info = normalizeOperationProofError(e, "Operatör notu kaydedilemedi.");
      if (info.status === 403) setError("Bu özet için yetkiniz yok.");
      else setError(info.message || "Operatör notu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (!token) return null;

  return (
    <div
      className={`card ${className}`.trim()}
      style={{ display: "grid", gap: 12, minWidth: 0, ...style }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
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

      {loading ? <div className="muted">Servis kanıtı yükleniyor...</div> : null}
      {!loading && summary?.summaryText ? <div className="panelMeta">{summary.summaryText}</div> : null}
      {isEmpty ? <div className="muted">Henüz servis kanıtı oluşmadı.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}
      {success ? <div style={{ color: "#90f0b1" }}>{success}</div> : null}

      {!loading && summary ? (
        <>
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

          <div style={{ display: "grid", gap: 8 }}>
            {visibleChecklist.length ? (
              visibleChecklist.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 18, flex: "0 0 18px", fontWeight: 900, lineHeight: 1.3 }}>
                      {item.done ? "✓" : "•"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}>{item.label}</div>
                      {item.note ? <div className="panelMeta" style={{ marginTop: 4 }}>{item.note}</div> : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">Henüz kontrol listesi oluşmadı.</div>
            )}
          </div>
        </>
      ) : null}

      <form onSubmit={handleSave} style={{ display: "grid", gap: 8 }}>
        <div className="panelMeta">Manuel operatör notu</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
          placeholder="Kısa operatör notu yazın"
          maxLength={MAX_NOTE_LENGTH}
          rows={2}
          style={{
            width: "100%",
            minHeight: 72,
            resize: "vertical",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            color: "inherit",
            padding: "10px 12px",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div className="panelMeta">{noteLength}/{MAX_NOTE_LENGTH}</div>
          <button type="submit" className="btn sm" disabled={saving || noteLength === 0}>
            {saving ? "..." : "Notu kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
