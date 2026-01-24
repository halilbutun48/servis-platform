export function getToken() {
  return (localStorage.getItem("token") || "").trim();
}

export function setToken(t) {
  localStorage.setItem("token", (t || "").trim());
}

export function clearToken() {
  localStorage.removeItem("token");
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

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function login(email, password) {
  // login'de token yok, o yüzden Authorization göndermiyoruz
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
  }

  const data = await res.json(); // { token }
  if (!data?.token) throw new Error("Login response token yok");
  setToken(data.token);
  return data;
}