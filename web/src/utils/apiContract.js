export function firstValidationMessage(details) {
  if (!details || typeof details !== "object") return "";
  const formMsg = Array.isArray(details.formErrors) && details.formErrors.length ? details.formErrors[0] : "";
  if (formMsg) return String(formMsg);
  const fieldErrors = details.fieldErrors && typeof details.fieldErrors === "object" ? details.fieldErrors : {};
  for (const key of Object.keys(fieldErrors)) {
    const arr = fieldErrors[key];
    if (Array.isArray(arr) && arr.length) return String(arr[0]);
  }
  return "";
}

function normalizeVisibleApiErrorMessage(value, fallbackMessage = "İşlem başarısız") {
  const text = String(value || "").trim();
  if (!text) return fallbackMessage;
  const clean = text.replace(/\s+/g, " ").trim();
  if (/^(?:FORBIDDEN|Forbidden|HTTP 403 Forbidden|403 Forbidden)$/i.test(clean)) {
    return "Bu işlem için bu rolde erişim görünmüyor.";
  }
  if (
    /<\s*!doctype\s+html/i.test(clean) ||
    /<\s*html[\s>]/i.test(clean) ||
    /<\s*body[\s>]/i.test(clean) ||
    /Cannot (GET|POST|PUT|PATCH|DELETE)\s+\//i.test(clean)
  ) {
    return fallbackMessage;
  }
  return clean;
}

function normalizeVisibleApiErrorCode(value) {
  const code = String(value || "").trim();
  if (!code) return "";
  if (/^(?:FORBIDDEN|Forbidden)$/i.test(code)) return "BAD_REQUEST";
  return code;
}

export function makeHttpError(status, payloadOrText) {
  const isObj = payloadOrText && typeof payloadOrText === "object";
  const normalizedError = isObj && payloadOrText.error && typeof payloadOrText.error === "object" ? payloadOrText.error : null;
  const details = normalizedError?.details || payloadOrText?.details || null;
  const baseMessage = isObj
    ? normalizedError?.message ||
      payloadOrText.message ||
      (typeof payloadOrText.error === "string" ? payloadOrText.error : "") ||
      firstValidationMessage(details) ||
      firstValidationMessage(payloadOrText.error) ||
      ""
    : String(payloadOrText || "");
  const visibleMessage = normalizeVisibleApiErrorMessage(baseMessage, `HTTP ${status}`);

  const err = new Error(visibleMessage || `HTTP ${status}`);
  err.status = status;
  err.code = normalizeVisibleApiErrorCode(normalizedError?.code || payloadOrText?.code || undefined) || undefined;
  if (isObj) err.payload = payloadOrText;
  else err.text = visibleMessage;
  return err;
}

export function getApiErrorInfo(error, fallbackMessage = "İşlem başarısız") {
  const payload = error?.payload && typeof error.payload === "object" ? error.payload : null;
  const normalized = payload?.error && typeof payload.error === "object" ? payload.error : null;
  const details = normalized?.details || payload?.details || null;
  const message =
    normalized?.message ||
    payload?.message ||
    (typeof payload?.error === "string" ? payload.error : "") ||
    firstValidationMessage(details) ||
    error?.message ||
    fallbackMessage;
  const visibleMessage = normalizeVisibleApiErrorMessage(message, fallbackMessage);

  return {
    status: Number(error?.status || payload?.status || 0) || 0,
    code: normalizeVisibleApiErrorCode(normalized?.code || payload?.code || error?.code || ""),
    message: String(visibleMessage || fallbackMessage),
    details,
    payload,
  };
}

export function getApiErrorMessage(error, fallbackMessage = "İşlem başarısız") {
  return getApiErrorInfo(error, fallbackMessage).message;
}
