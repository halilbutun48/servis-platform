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

  const err = new Error(baseMessage || `HTTP ${status}`);
  err.status = status;
  err.code = normalizedError?.code || payloadOrText?.code || undefined;
  if (isObj) err.payload = payloadOrText;
  else err.text = baseMessage;
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

  return {
    status: Number(error?.status || payload?.status || 0) || 0,
    code: normalized?.code || payload?.code || error?.code || "",
    message: String(message || fallbackMessage),
    details,
    payload,
  };
}

export function getApiErrorMessage(error, fallbackMessage = "İşlem başarısız") {
  return getApiErrorInfo(error, fallbackMessage).message;
}
