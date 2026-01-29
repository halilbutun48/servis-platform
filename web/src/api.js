export function getToken() {
  return (localStorage.getItem("token") || "").trim();
}

export function setToken(t) {
  localStorage.setItem("token", (t || "").trim());
}

export function clearToken() {
  localStorage.removeItem("token");
}

function makeHttpError(status, payloadOrText) {
  const isObj = payloadOrText && typeof payloadOrText === "object";
  const baseMessage = isObj
    ? payloadOrText.message || payloadOrText.error || ""
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

export async function login(email, password) {
  // login'de token yok, o yüzden Authorization göndermiyoruz
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
