const DEFAULT_CODE_BY_STATUS = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
};

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function httpError(status = 500, codeOrMessage = null, messageOrDetails = null, maybeDetails = null) {
  const safeStatus = Number.isFinite(Number(status)) ? Number(status) : 500;

  let code = null;
  let message = null;
  let details = null;

  if (maybeDetails !== null) {
    code = codeOrMessage;
    message = messageOrDetails;
    details = maybeDetails;
  } else if (isPlainObject(messageOrDetails) || Array.isArray(messageOrDetails)) {
    code = typeof codeOrMessage === "string" ? codeOrMessage : null;
    message = typeof codeOrMessage === "string" ? codeOrMessage : null;
    details = messageOrDetails;
  } else if (typeof messageOrDetails === "string") {
    code = typeof codeOrMessage === "string" ? codeOrMessage : null;
    message = messageOrDetails;
  } else if (typeof codeOrMessage === "string") {
    message = codeOrMessage;
  }

  const err = new Error(String(message || DEFAULT_CODE_BY_STATUS[safeStatus] || "INTERNAL_ERROR"));
  err.status = safeStatus;
  err.code = String(code || DEFAULT_CODE_BY_STATUS[safeStatus] || "INTERNAL_ERROR");
  if (details !== null && details !== undefined) err.details = details;
  return err;
}

export function normalizeError(err) {
  const status = Number.isFinite(Number(err?.status)) ? Number(err.status) : 500;
  const code = String(err?.code || DEFAULT_CODE_BY_STATUS[status] || "INTERNAL_ERROR");
  let message = err?.message || code;
  if (status >= 500 && (!message || message === code)) message = "Beklenmeyen bir hata oluştu.";

  const out = {
    ok: false,
    error: {
      code,
      message: String(message || code),
    },
  };

  if (err?.details !== undefined) out.error.details = err.details;
  return { status, body: out };
}

export function sendErrorResponse(res, err) {
  const { status, body } = normalizeError(err);
  return res.status(status).json(body);
}

export function expressErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  return sendErrorResponse(res, err);
}
