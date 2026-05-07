import { useCallback, useEffect, useMemo, useState } from "react";
import { getPaymentBackboneReadinessPreview, normalizePaymentPreviewError } from "../api";
import { useSession } from "../state/session";

const STATUS_LABELS = {
  DRAFT: "Taslak",
  EMPTY: "Taslak",
  CONTROL_NEEDED: "Kontrol gerekli",
  MISSING_INFO: "Eksik bilgi",
  READY: "Hazır görünen kayıt",
};

const ENTRY_STATUS_LABELS = {
  READY: "Hazır",
  PLANNED: "Taslak",
  EXECUTED: "Tamamlandı",
  DORMANT: "Taslak",
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(amount, currencyCode = "TRY") {
  const n = Number(amount || 0);
  const safeAmount = Number.isFinite(n) ? n : 0;
  const currency = String(currencyCode || "TRY").trim() || "TRY";
  return `${safeAmount.toLocaleString("tr-TR")} ${currency}`;
}

function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || "Taslak";
}

function getEntryStatusLabel(status) {
  return ENTRY_STATUS_LABELS[String(status || "").toUpperCase()] || "Taslak";
}

function getPreviewLabel(item = {}) {
  const bucket = String(item?.bucket || "").toUpperCase();
  return STATUS_LABELS[bucket] || item?.statusText || "Taslak";
}

function resolveFinanceReady(item = {}) {
  if (typeof item.financeReady === "boolean") return item.financeReady;
  if (typeof item.accountReady === "boolean") return item.accountReady;
  if (typeof item.companyAccountReady === "boolean" || typeof item.roomAccountReady === "boolean") {
    return Boolean(item.companyAccountReady && item.roomAccountReady);
  }
  const status = String(item?.entryStatus || item?.settlementPlan?.status || item?.settlementStatus || "").trim().toUpperCase();
  return status === "READY" || status === "EXECUTED";
}

function classifyPreviewItem(item = {}) {
  const status = String(item?.entryStatus || item?.settlementPlan?.status || item?.settlementStatus || "").trim().toUpperCase();
  const financeReady = resolveFinanceReady(item);
  if (financeReady && status === "READY") return { bucket: "READY", statusText: "Hazır görünen kayıt" };
  if (!financeReady) return { bucket: "MISSING_INFO", statusText: "Eksik bilgi" };
  return { bucket: "CONTROL_NEEDED", statusText: "Kontrol gerekli" };
}

function buildTitle(item = {}) {
  const pieces = [
    normalizeText(item?.companyName),
    normalizeText(item?.roomName),
  ].filter(Boolean);
  if (pieces.length) return pieces.join(" • ");
  return normalizeText(item?.sourceKey) || "Hakediş kaydı";
}

function buildSubtitle(item = {}) {
  const pieces = [
    normalizeText(item?.sourceType),
    normalizeText(item?.sourceKey),
  ].filter(Boolean);
  return pieces.join(" • ");
}

export default function PaymentPreviewReadonlyCard({
  summaryParams = null,
  className = "",
  style,
}) {
  const { token: authKey } = useSession();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(authKey));
  const [error, setError] = useState("");

  const reloadSummary = useCallback(async () => {
    if (!authKey) return;
    setLoading(true);
    setError("");
    try {
      const summaryResult = await getPaymentBackboneReadinessPreview(summaryParams || {}, { token: authKey });
      setSummary(summaryResult || null);
    } catch (e) {
      const info = normalizePaymentPreviewError(e, "Hakediş önizlemesi yüklenemedi.");
      if (info.status === 403) setError("Bu önizlemeyi görme yetkiniz yok.");
      else setError(info.message || "Hakediş önizlemesi yüklenemedi.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [authKey, summaryParams]);

  useEffect(() => {
    if (!authKey) return;
    reloadSummary();
  }, [authKey, reloadSummary]);

  const items = useMemo(() => (Array.isArray(summary?.items) ? summary.items.slice(0, 5) : []), [summary]);
  const draftCount = normalizeCount(summary?.draftCount);
  const readyCount = normalizeCount(summary?.readyCount);
  const missingInfoCount = normalizeCount(summary?.missingInfoCount);
  const controlNeededCount = normalizeCount(summary?.controlNeededCount);
  const isEmpty = !loading && draftCount === 0 && !error;
  const statusLabel = getStatusLabel(summary?.status);
  const noteText = normalizeText(summary?.nonFinalText || "Ödeme başlatılmaz");

  if (!authKey) return null;

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
          <div className="panelSectionTitle">Hakediş önizlemesi</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Taslak
          </div>
          <div className="panelMeta" style={{ marginTop: 4 }}>
            Ödeme başlatılmaz.
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          {!loading ? <span className="pill" data-status={summary?.status || "DRAFT"}>{statusLabel}</span> : null}
          <button className="btn sm" onClick={reloadSummary} disabled={loading}>
            {loading ? "Yükleniyor..." : "Önizlemeyi yenile"}
          </button>
        </div>
      </div>

      <div className="quality-chip-row">
        <span className="quality-chip">Taslak</span>
        <span className="quality-chip quality-chip--muted">Ödeme başlatılmaz</span>
        <span className="quality-chip">Hazır görünen kayıt {readyCount}</span>
        <span className="quality-chip quality-chip--muted">Eksik bilgi {missingInfoCount}</span>
        <span className="quality-chip quality-chip--muted">Kontrol gerekli {controlNeededCount}</span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        <div className="quality-history-item">
          <div className="panelMeta">Toplam taslak kayıt sayısı</div>
          <div className="panelStatValue">{draftCount}</div>
        </div>
        <div className="quality-history-item">
          <div className="panelMeta">Hazır görünen kayıt sayısı</div>
          <div className="panelStatValue">{readyCount}</div>
        </div>
        <div className="quality-history-item">
          <div className="panelMeta">Eksik bilgi olan kayıt sayısı</div>
          <div className="panelStatValue">{missingInfoCount}</div>
        </div>
        <div className="quality-history-item">
          <div className="panelMeta">Kontrol gerekli kayıt sayısı</div>
          <div className="panelStatValue">{controlNeededCount}</div>
        </div>
      </div>

      {!loading && summary?.summaryText ? <div className="panelBody">{summary.summaryText}</div> : null}
      {!loading && summary?.nextAction ? <div className="panelMeta">{summary.nextAction}</div> : null}
      {!loading && noteText ? <div className="panelMeta">{noteText}</div> : null}

      {loading ? <div className="muted">Hakediş önizlemesi yükleniyor...</div> : null}
      {isEmpty ? <div className="muted">Hakediş önizlemesi için görünür kayıt yok.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && items.length ? (
        <div className="quality-mini-list">
          {items.map((item) => {
            const classified = classifyPreviewItem(item);
            const entryStatus = normalizeText(item?.entryStatusText || getEntryStatusLabel(item?.entryStatus || item?.settlementPlan?.status || item?.settlementStatus));
            const amountText = formatAmount(
              item?.amount ?? item?.grossAmount ?? item?.settlementPlan?.grossAmount ?? 0,
              item?.currencyCode || item?.settlementPlan?.currencyCode || "TRY",
            );
            const title = buildTitle(item);
            const subtitle = buildSubtitle(item);
            const notePreview = normalizeText(item?.notePreview || item?.note || "");
            return (
              <div key={item.id} className="quality-history-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{title}</div>
                    {subtitle ? <div className="panelMeta" style={{ marginTop: 2 }}>{subtitle}</div> : null}
                  </div>
                  <span className="pill" data-status={classified.bucket === "READY" ? "READY" : classified.bucket === "MISSING_INFO" ? "WARN" : "INFO"}>
                    {classified.statusText}
                  </span>
                </div>
                <div className="quality-chip-row">
                  <span className="quality-chip quality-chip--muted">{entryStatus}</span>
                  <span className="quality-chip">{amountText}</span>
                  {classified.bucket !== "READY" ? <span className="quality-chip quality-chip--muted">{getPreviewLabel({ bucket: classified.bucket, statusText: classified.statusText })}</span> : null}
                </div>
                {notePreview ? <div className="panelBody">{notePreview}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
