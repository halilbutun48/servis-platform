//web/src/api.js
export function getToken() {
  return (localStorage.getItem("token") || "").trim();
}

export function setToken(t) {
  localStorage.setItem("token", (t || "").trim());
}

export function clearToken() {
  localStorage.removeItem("token");
}

function firstValidationMessage(details) {
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

function getOrCreateBrowserDeviceId() {
  try {
    const key = "personel_servis_browser_device_id";
    const existing = String(localStorage.getItem(key) || "").trim();
    if (existing) return existing;
    const fresh = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return `web-fallback-${Date.now().toString(36)}`;
  }
}

function makeHttpError(status, payloadOrText) {
  const isObj = payloadOrText && typeof payloadOrText === "object";
  const baseMessage = isObj
    ? payloadOrText.message ||
      (typeof payloadOrText.error === "string" ? payloadOrText.error : "") ||
      firstValidationMessage(payloadOrText.details) ||
      firstValidationMessage(payloadOrText.error) ||
      ""
    : String(payloadOrText || "");

  const err = new Error(baseMessage || `HTTP ${status}`);
  err.status = status;
  if (isObj) err.payload = payloadOrText;
  else err.text = baseMessage;
  return err;
}

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };

  const t = ((token ?? getToken()) || "").trim();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(path, {
    cache: "no-store",
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    // Try JSON first if advertised
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }

    // Fallback: text
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  return ct.includes("application/json") ? res.json() : res.text();
}
// ✅ convenience helpers (SuperAdmin panelleri api.get/post/put/del kullanıyor)
api.get = (path, opts = {}) => api(path, { ...opts, method: "GET" });
api.post = (path, body, opts = {}) => api(path, { ...opts, method: "POST", body });
api.put = (path, body, opts = {}) => api(path, { ...opts, method: "PUT", body });
api.del = (path, opts = {}) => api(path, { ...opts, method: "DELETE" });

export async function login(identifier, password) {
  // login'de token yok, o yüzden Authorization göndermiyoruz
  const body = { identifier, password, deviceId: getOrCreateBrowserDeviceId() };
  const res = await fetch("/api/auth/login", {
    cache: "no-store",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  const data = await res.json(); // { token }
  if (!data?.token) throw new Error("Login response token yok");
  setToken(data.token);
  return data;
}


export async function getTotpStatus(token) {
  return api("/api/auth/totp/status", { token });
}

export async function setupTotp(token) {
  return api("/api/auth/totp/setup", { method: "POST", token, body: {} });
}

export async function enableTotp(token, code) {
  return api("/api/auth/totp/enable", { method: "POST", token, body: { code } });
}

export async function verifyTotp(token, code) {
  return api("/api/auth/totp/verify", { method: "POST", token, body: { code } });
}

export async function googleLogin(credential, { inviteToken, deviceId, testProfile } = {}) {
  const res = await fetch("/api/auth/google", {
    cache: "no-store",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, inviteToken, deviceId, testProfile }),
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const json = await res.json().catch(() => null);
      throw makeHttpError(res.status, json || { message: res.statusText });
    }
    const txt = await res.text().catch(() => "");
    throw makeHttpError(res.status, txt || res.statusText);
  }

  const data = await res.json();
  if (!data?.token) throw new Error("Google login response token yok");
  setToken(data.token);
  return data;
}


export async function changeDriverPin(currentPin, newPin, token) {
  return api("/api/auth/driver/change-pin", { method: "POST", token, body: { currentPin, newPin } });
}
