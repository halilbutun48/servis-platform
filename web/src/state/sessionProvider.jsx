// web/src/state/sessionProvider.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api";
import { startLiveWs, stopLiveWs } from "../live/ws";
import { SessionCtx } from "./sessionContext";

const SESSION_CACHE_KEY = "personel_servis_cached_session";

function readCachedSession(token) {
  const safeToken = String(token || "").trim();
  if (!safeToken) return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || String(parsed.token || "").trim() !== safeToken) return null;
    return parsed.me && typeof parsed.me === "object" ? parsed.me : null;
  } catch {
    return null;
  }
}

function writeCachedSession(token, me) {
  const safeToken = String(token || "").trim();
  if (!safeToken || !me || typeof me !== "object") return;
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ token: safeToken, me }));
  } catch {
    // no-op: cache is best effort only
  }
}

function clearCachedSession() {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // no-op: cache is best effort only
  }
}

export function SessionProvider({ children }) {
  const initialToken = getToken();
  const [token, setTok] = useState(initialToken);
  const [me, setMe] = useState(() => readCachedSession(initialToken));
  const [authErr, setAuthErr] = useState("");

  useEffect(() => {
    if (token) setToken(token);
  }, [token]);

  const logout = useCallback(() => {
    try {
      stopLiveWs();
    } catch {
      // no-op: best effort logout cleanup
    }
    clearToken();
    clearCachedSession();
    setTok("");
    setMe(null);
    setAuthErr("");
  }, []);

  const loadMe = useCallback(async (t = token) => {
    if (!t) {
      setMe(null);
      return;
    }
    try {
      const r = await api("/api/me", { token: t });
      setMe(r);
      setAuthErr("");
      writeCachedSession(t, r);
    } catch (e) {
      const status = Number(e?.status || e?.payload?.status || 0) || 0;
      setAuthErr(String(e?.message || e));

      if (status === 429) {
        return;
      }

      logout();
    }
  }, [logout, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!token) {
        setMe(null);
        setAuthErr("");
        return;
      }
      const cached = readCachedSession(token);
      if (cached) {
        setMe(cached);
      }
      void loadMe(token);
    }, 0);
    return () => clearTimeout(timer);
  }, [token, loadMe]);

  useEffect(() => {
    if (!token) {
      stopLiveWs();
      return;
    }
    startLiveWs(token);
    return () => stopLiveWs();
  }, [token]);

  const value = useMemo(() => ({ token, setToken: setTok, me, loadMe, logout, authErr }), [token, me, authErr, loadMe, logout]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
