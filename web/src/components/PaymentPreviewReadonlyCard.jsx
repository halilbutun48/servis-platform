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

const FILTERS = [
  { key: "ALL", label: "Tümü" },
  { key: "READY", label: "Hazır görünen" },
  { key: "MISSING_INFO", label: "Eksik bilgi" },
  { key: "CONTROL_NEEDED", label: "Kontrol gerekli" },
];

const PAYMENT_PREVIEW_STYLES = {
  toolbar: { display: "grid", gap: 8 },
  filterBar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  filterChip: {
    appearance: "none",
    border: "1px solid #334155",
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(148, 163, 184, 0.08)",
    color: "#e7eefc",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.25,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  filterChipActive: {
    borderColor: "#3a66ff",
    background: "rgba(59, 130, 246, 0.18)",
    color: "#dbeafe",
    boxShadow: "0 0 0 1px rgba(58, 102, 255, 0.18) inset",
  },
  filterCount: { fontSize: 11, fontWeight: 900, opacity: 0.85 },
  filterSummary: { fontSize: 12, lineHeight: 1.4, color: "#98a2b3" },
  previewList: { display: "grid", gap: 8 },
  rowSelected: { borderColor: "rgba(58, 102, 255, 0.6)", background: "rgba(59, 130, 246, 0.08)" },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" },
  rowActionWrap: { display: "flex", justifyContent: "flex-end" },
  detailPanel: {
    display: "grid",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },
  detailGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  detailItem: { display: "grid", gap: 3, minWidth: 0 },
  detailLabel: { fontSize: 12, fontWeight: 800, lineHeight: 1.25, color: "#a9b7d6" },
  detailValue: { fontSize: 14, lineHeight: 1.5, color: "#e7eefc", wordBreak: "break-word" },
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

function buildControlNote(item = {}) {
  const bucket = String(item?.status || "").toUpperCase();
  if (bucket === "READY") return "Şimdilik ek işlem gerekmez.";
  if (bucket === "MISSING_INFO") return "Eksik bilgi tamamlanmadan ödeme başlatılmaz.";
  return "Son onaydan önce kontrol edilir.";
}

function formatCommissionStatus(paymentModeSnapshot = "OFF", commissionBpsSnapshot = 0) {
  const mode = String(paymentModeSnapshot || "OFF").trim().toUpperCase();
  const bps = Number(commissionBpsSnapshot || 0);
  if (mode === "OFF") return "Komisyon kapalı";
  if (mode === "OPTIONAL") return bps > 0 ? `Komisyon hazırlıkta • ${bps} bps` : "Komisyon hazırlıkta";
  if (mode === "REQUIRED") return bps > 0 ? `Komisyon gerekli • ${bps} bps` : "Komisyon gerekli";
  return "Komisyon durumu belirsiz";
}

function formatAccountStatus(companyAccountStatus = null, roomAccountStatus = null, companyAccountReady = null, roomAccountReady = null) {
  const companyStatus = String(companyAccountStatus || "").trim().toUpperCase();
  const roomStatus = String(roomAccountStatus || "").trim().toUpperCase();
  const companyReady = typeof companyAccountReady === "boolean" ? companyAccountReady : null;
  const roomReady = typeof roomAccountReady === "boolean" ? roomAccountReady : null;
  const parts = [];
  if (companyReady === true || companyStatus === "ACTIVE" || companyStatus === "VERIFIED") parts.push("Şirket hesabı hazır");
  else if (companyReady === false || companyStatus === "MISSING" || companyStatus === "INACTIVE" || companyStatus === "ERROR") parts.push("Şirket hesabı eksik");
  else parts.push("Şirket hesabı belirsiz");
  if (roomReady === true || roomStatus === "ACTIVE" || roomStatus === "VERIFIED") parts.push("Oda hesabı hazır");
  else if (roomReady === false || roomStatus === "MISSING" || roomStatus === "INACTIVE" || roomStatus === "ERROR") parts.push("Oda hesabı eksik");
  else parts.push("Oda hesabı belirsiz");
  return parts.join(" • ");
}

function buildDetailFields(item = {}) {
  return [
    { label: "Durum", value: item.statusText || getStatusLabel(item.status) },
    { label: "Neden hazır / neden eksik / neden kontrol gerekli", value: item.detailReason || "Kontrol notu oluşturuluyor." },
    { label: "İlgili sözleşme veya vardiya özeti", value: item.subtitle || "Ticari özet görünmüyor" },
    { label: "Komisyon durumu", value: formatCommissionStatus(item.paymentModeSnapshot, item.commissionBpsSnapshot) },
    { label: "Ödeme hesabı durumu", value: formatAccountStatus(item.companyAccountStatus, item.roomAccountStatus, item.companyAccountReady, item.roomAccountReady) },
    { label: "Kontrol notu", value: buildControlNote(item) },
  ];
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
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedPreviewId, setSelectedPreviewId] = useState("");

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

  const items = useMemo(() => (Array.isArray(summary?.items) ? summary.items.slice(0, 10) : []), [summary]);

  const draftCount = normalizeCount(summary?.draftCount);
  const readyCount = normalizeCount(summary?.readyCount);
  const missingInfoCount = normalizeCount(summary?.missingInfoCount);
  const controlNeededCount = normalizeCount(summary?.controlNeededCount);

  const filterCounts = useMemo(() => {
    const ready = items.filter((item) => String(item?.status || "").toUpperCase() === "READY").length;
    const missing = items.filter((item) => String(item?.status || "").toUpperCase() === "MISSING_INFO").length;
    const controlNeeded = items.filter((item) => String(item?.status || "").toUpperCase() === "CONTROL_NEEDED").length;
    return {
      ALL: items.length,
      READY: ready,
      MISSING_INFO: missing,
      CONTROL_NEEDED: controlNeeded,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (activeFilter === "ALL") return items;
    return items.filter((item) => String(item?.status || "").toUpperCase() === activeFilter);
  }, [activeFilter, items]);

  useEffect(() => {
    if (!visibleItems.length) {
      if (selectedPreviewId) setSelectedPreviewId("");
      return;
    }
    const stillVisible = visibleItems.some((item) => String(item?.id || "") === String(selectedPreviewId || ""));
    if (!stillVisible) {
      setSelectedPreviewId(String(visibleItems[0]?.id || ""));
    }
  }, [selectedPreviewId, visibleItems]);

  const selectedPreviewItem = useMemo(
    () => visibleItems.find((item) => String(item?.id || "") === String(selectedPreviewId || "")) || visibleItems[0] || null,
    [selectedPreviewId, visibleItems],
  );

  const isEmpty = !loading && draftCount === 0 && !error;
  const statusLabel = getStatusLabel(summary?.status);
  const noteText = normalizeText(summary?.nonFinalText || "Ödeme başlatılmaz");
  const selectedDetailFields = useMemo(() => (selectedPreviewItem ? buildDetailFields(selectedPreviewItem) : []), [selectedPreviewItem]);

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
          <div className="panelMeta" style={{ marginTop: 4 }}>Taslak</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>Ödeme başlatılmaz.</div>
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

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
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

      <div style={PAYMENT_PREVIEW_STYLES.toolbar}>
        <div className="panelMeta">Filtrele</div>
        <div style={PAYMENT_PREVIEW_STYLES.filterBar}>
          {FILTERS.map((filter) => {
            const count = normalizeCount(filterCounts[filter.key]);
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                style={{ ...PAYMENT_PREVIEW_STYLES.filterChip, ...(isActive ? PAYMENT_PREVIEW_STYLES.filterChipActive : null) }}
                data-active={isActive ? "true" : "false"}
                aria-pressed={isActive}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
                <span style={PAYMENT_PREVIEW_STYLES.filterCount}>{count}</span>
              </button>
            );
          })}
        </div>
        <div style={PAYMENT_PREVIEW_STYLES.filterSummary}>
          {visibleItems.length ? `${visibleItems.length} kayıt gösteriliyor` : "Filtreye uygun kayıt yok."}
        </div>
      </div>

      {loading ? <div className="muted">Hakediş önizlemesi yükleniyor...</div> : null}
      {isEmpty ? <div className="muted">Hakediş önizlemesi için görünür kayıt yok.</div> : null}
      {error ? <div style={{ color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!loading && visibleItems.length ? (
        <div style={PAYMENT_PREVIEW_STYLES.previewList}>
          {visibleItems.map((item) => {
            const classified = classifyPreviewItem(item);
            const entryStatus = normalizeText(item?.entryStatusText || getEntryStatusLabel(item?.entryStatus || item?.settlementPlan?.status || item?.settlementStatus));
            const amountText = formatAmount(
              item?.amount ?? item?.grossAmount ?? item?.settlementPlan?.grossAmount ?? 0,
              item?.currencyCode || item?.settlementPlan?.currencyCode || "TRY",
            );
            const title = buildTitle(item);
            const subtitle = buildSubtitle(item);
            const notePreview = normalizeText(item?.notePreview || item?.note || "");
            const isSelected = String(selectedPreviewId || "") === String(item?.id || "");
            return (
              <div
                key={item.id}
                className="quality-history-item"
                data-selected={isSelected ? "true" : "false"}
                style={isSelected ? PAYMENT_PREVIEW_STYLES.rowSelected : undefined}
              >
                <div style={PAYMENT_PREVIEW_STYLES.rowHeader}>
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
                  {classified.bucket !== "READY" ? (
                    <span className="quality-chip quality-chip--muted">{getPreviewLabel({ bucket: classified.bucket, statusText: classified.statusText })}</span>
                  ) : null}
                </div>
                {notePreview ? <div className="panelBody">{notePreview}</div> : null}
                <div style={PAYMENT_PREVIEW_STYLES.rowActionWrap}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setSelectedPreviewId(String(item?.id || ""))}
                  >
                    Detayı gör
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!loading && selectedPreviewItem ? (
        <div style={PAYMENT_PREVIEW_STYLES.detailPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Seçili kayıt detayı</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>
                Hakediş önizlemesi yalnızca kontrol içindir.
              </div>
            </div>
            <span className="pill" data-status={selectedPreviewItem.status === "READY" ? "READY" : selectedPreviewItem.status === "MISSING_INFO" ? "WARN" : "INFO"}>
              {selectedPreviewItem.statusText || "Taslak"}
            </span>
          </div>

          <div style={PAYMENT_PREVIEW_STYLES.detailGrid}>
            {selectedDetailFields.map((field) => (
              <div key={field.label} style={PAYMENT_PREVIEW_STYLES.detailItem}>
                <div style={PAYMENT_PREVIEW_STYLES.detailLabel}>{field.label}</div>
                <div style={PAYMENT_PREVIEW_STYLES.detailValue}>{field.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
