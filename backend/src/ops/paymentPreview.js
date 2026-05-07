const PAYMENT_PREVIEW_VISIBLE_COUNT = 10;

function upperText(value, fallback = "") {
  const v = String(value || fallback).trim().toUpperCase();
  return v || fallback;
}

function normalizePreviewNote(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function formatPreviewAmount(amount, currencyCode = "TRY") {
  const n = Number(amount || 0);
  const safeAmount = Number.isFinite(n) ? n : 0;
  const currency = String(currencyCode || "TRY").trim() || "TRY";
  return `${safeAmount.toLocaleString("tr-TR")} ${currency}`;
}

export function formatPreviewCommissionStatus(paymentModeSnapshot = "OFF", commissionBpsSnapshot = 0) {
  const mode = upperText(paymentModeSnapshot, "OFF");
  const bps = Number(commissionBpsSnapshot || 0);
  if (mode === "OFF") return "Komisyon kapalı";
  if (mode === "OPTIONAL") return bps > 0 ? `Komisyon hazırlıkta • ${bps} bps` : "Komisyon hazırlıkta";
  if (mode === "REQUIRED") return bps > 0 ? `Komisyon gerekli • ${bps} bps` : "Komisyon gerekli";
  return "Komisyon durumu belirsiz";
}

export function formatPreviewAccountStatus(companyAccountStatus = null, roomAccountStatus = null, companyAccountReady = null, roomAccountReady = null) {
  const companyStatus = upperText(companyAccountStatus, "");
  const roomStatus = upperText(roomAccountStatus, "");
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

function resolvePreviewFinanceReady(item = {}) {
  if (typeof item.financeReady === "boolean") return item.financeReady;
  if (typeof item.accountReady === "boolean") return item.accountReady;
  if (typeof item.companyAccountReady === "boolean" || typeof item.roomAccountReady === "boolean") {
    return Boolean(item.companyAccountReady && item.roomAccountReady);
  }
  const status = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "");
  return status === "READY" || status === "EXECUTED";
}

function classifyPreviewItem(item = {}) {
  const status = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "");
  const financeReady = resolvePreviewFinanceReady(item);
  if (financeReady && status === "READY") {
    return { bucket: "READY", statusText: "Hazır görünen kayıt" };
  }
  if (!financeReady) {
    return { bucket: "MISSING_INFO", statusText: "Eksik bilgi" };
  }
  return { bucket: "CONTROL_NEEDED", statusText: "Kontrol gerekli" };
}

function buildPreviewTitle(item = {}) {
  const pieces = [
    String(item?.companyName || item?.settlementPlan?.commercialSource?.company?.name || "").trim(),
    String(item?.roomName || item?.settlementPlan?.commercialSource?.room?.name || "").trim(),
  ].filter(Boolean);
  if (pieces.length) return pieces.join(" • ");
  return String(item?.sourceKey || item?.sourceType || "").trim() || "Hakediş kaydı";
}

function buildPreviewSubtitle(item = {}) {
  const pieces = [
    String(item?.sourceType || item?.settlementPlan?.commercialSource?.sourceType || "").trim(),
    String(item?.sourceKey || item?.settlementPlan?.commercialSource?.sourceKey || "").trim(),
  ].filter(Boolean);
  return pieces.join(" • ");
}

function buildPreviewReason(item = {}, classification = null) {
  const bucket = String(classification?.bucket || classifyPreviewItem(item).bucket).toUpperCase();
  if (bucket === "READY") return "Ticari özet ve ödeme hazırlığı uyumlu görünüyor.";
  if (bucket === "MISSING_INFO") {
    if (item.companyAccountReady === false) return "Şirket ödeme hesabı eksik.";
    if (item.roomAccountReady === false) return "Oda ödeme hesabı eksik.";
    return "Eksik bilgi nedeniyle taslak görünüyor.";
  }
  return "Hazır görünüyor ama son kontrol gerekiyor.";
}

function buildPreviewControlNote(item = {}, classification = null) {
  const bucket = String(classification?.bucket || classifyPreviewItem(item).bucket).toUpperCase();
  if (bucket === "READY") return "Şimdilik ek işlem gerekmez.";
  if (bucket === "MISSING_INFO") return "Eksik bilgi tamamlanmadan ödeme başlatılmaz.";
  return "Son onaydan önce kontrol edilir.";
}

function buildPreviewDetailLines(item = {}, classification = null) {
  const reason = buildPreviewReason(item, classification);
  const subtitle = buildPreviewSubtitle(item) || "Ticari özet görünmüyor";
  const commissionStatus = formatPreviewCommissionStatus(item.paymentModeSnapshot, item.commissionBpsSnapshot);
  const accountStatus = formatPreviewAccountStatus(item.companyAccountStatus, item.roomAccountStatus, item.companyAccountReady, item.roomAccountReady);
  const controlNote = buildPreviewControlNote(item, classification);
  return [
    `Durum: ${classification?.statusText || "Taslak"}`,
    `Neden: ${reason}`,
    `İlgili sözleşme veya vardiya özeti: ${subtitle}`,
    `Komisyon durumu: ${commissionStatus}`,
    `Ödeme hesabı durumu: ${accountStatus}`,
    `Kontrol notu: ${controlNote}`,
  ];
}

export function mapPaymentPreviewItem(item = {}) {
  const classification = classifyPreviewItem(item);
  const amount = Number(item?.amount || item?.grossAmount || item?.settlementPlan?.grossAmount || 0);
  const currencyCode = item?.currencyCode || item?.currency || item?.settlementPlan?.currencyCode || "TRY";
  const entryStatusText = upperText(item.entryStatus || item?.settlementPlan?.status || item.settlementStatus, "DORMANT");
  const companyAccountStatus = upperText(item?.companyAccount?.status || item?.companyAccountStatus || "", "");
  const roomAccountStatus = upperText(item?.roomAccount?.status || item?.roomAccountStatus || "", "");
  const paymentModeSnapshot = upperText(item.paymentModeSnapshot || item?.settlementPlan?.paymentModeSnapshot || "OFF", "OFF");
  const commissionBpsSnapshot = Number(item.commissionBpsSnapshot || item?.settlementPlan?.commissionBpsSnapshot || 0);
  const companyAccountReady = typeof item.companyAccountReady === "boolean" ? item.companyAccountReady : null;
  const roomAccountReady = typeof item.roomAccountReady === "boolean" ? item.roomAccountReady : null;
  const financeReady = typeof item.financeReady === "boolean" ? item.financeReady : null;
  return {
    id: String(item?.entryId || item?.id || item?.sourceKey || `${item?.companyId || "row"}-${item?.roomId || "scope"}`),
    title: buildPreviewTitle(item),
    subtitle: buildPreviewSubtitle(item),
    status: classification.bucket,
    statusText: classification.statusText,
    detailReason: buildPreviewReason(item, classification),
    detailLines: buildPreviewDetailLines(item, classification),
    entryStatusText: entryStatusText === "EXECUTED"
      ? "Tamamlandı"
      : entryStatusText === "READY"
      ? "Hazır"
      : entryStatusText === "PLANNED" || entryStatusText === "DORMANT"
      ? "Taslak"
      : "Kontrol gerekli",
    amountText: formatPreviewAmount(amount, currencyCode),
    notePreview: normalizePreviewNote(item?.notePreview || item?.note || item?.settlementPlan?.note || ""),
    controlNote: buildPreviewControlNote(item, classification),
    paymentModeSnapshot,
    commissionBpsSnapshot,
    commissionStatusText: formatPreviewCommissionStatus(paymentModeSnapshot, commissionBpsSnapshot),
    companyAccountStatus,
    roomAccountStatus,
    companyAccountReady,
    roomAccountReady,
    accountStatusText: formatPreviewAccountStatus(companyAccountStatus, roomAccountStatus, companyAccountReady, roomAccountReady),
    financeReady,
  };
}

export function buildPaymentPreviewSummary(rows = [], sourceLabel = "hakediş kuyruğu") {
  const mapped = (Array.isArray(rows) ? rows : []).map((item) => mapPaymentPreviewItem(item));
  const draftCount = mapped.length;
  const readyCount = mapped.filter((item) => item.status === "READY").length;
  const missingInfoCount = mapped.filter((item) => item.status === "MISSING_INFO").length;
  const controlNeededCount = mapped.filter((item) => item.status === "CONTROL_NEEDED").length;
  const status = draftCount ? "DRAFT" : "EMPTY";

  return {
    version: "PAY_01B",
    title: "Hakediş önizlemesi",
    status,
    summaryText: draftCount
      ? `Bu önizleme ${sourceLabel} içindeki taslak kayıtları gösterir. Ödeme başlatılmaz.`
      : "Hakediş önizlemesi için görünür kayıt yok.",
    draftCount,
    readyCount,
    missingInfoCount,
    controlNeededCount,
    items: mapped.slice(0, PAYMENT_PREVIEW_VISIBLE_COUNT),
    nextAction: missingInfoCount > 0
      ? "Eksik bilgi olan kayıtlar önce kontrol edilir."
      : controlNeededCount > 0
      ? "Kontrol gerekli kayıtlar gözden geçirilir."
      : draftCount > 0
      ? "Ödeme başlatılmaz. Bu yalnızca taslak önizlemedir."
      : "Ticari kayıt eklendiğinde önizleme güncellenir.",
    nonFinalText: "Ödeme başlatılmaz",
  };
}

export function normalizePaymentPreviewBucket(value) {
  const bucket = upperText(value, "ALL");
  return ["ALL", "READY", "MISSING_INFO", "CONTROL_NEEDED"].includes(bucket) ? bucket : "ALL";
}

function csvEscape(value) {
  let s = String(value ?? "");
  if (/^[=+\-@]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildPaymentPreviewCsvRows(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const status = String(item?.statusText || "").trim() || "Taslak";
    const title = String(item?.title || "").trim() || "Hakediş kaydı";
    const subtitle = String(item?.subtitle || "").trim() || "Ticari özet görünmüyor";
    const commissionStatus = String(item?.commissionStatusText || formatPreviewCommissionStatus(item?.paymentModeSnapshot, item?.commissionBpsSnapshot));
    const accountStatus = String(item?.accountStatusText || formatPreviewAccountStatus(item?.companyAccountStatus, item?.roomAccountStatus, item?.companyAccountReady, item?.roomAccountReady));
    const note = String(item?.controlNote || item?.detailReason || "Son onaydan önce kontrol edilir.").trim();
    const amount = String(item?.amountText || "0 TRY").trim();
    return [
      csvEscape(status),
      csvEscape(title),
      csvEscape(subtitle),
      csvEscape(commissionStatus),
      csvEscape(accountStatus),
      csvEscape(note),
      csvEscape(amount),
    ].join(",");
  });
}
