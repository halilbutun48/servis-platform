// web/src/state/session.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api";
import { startLiveWs, stopLiveWs } from "../live/ws";

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const [token, setTok] = useState(getToken());
  const [me, setMe] = useState(null);
  const [authErr, setAuthErr] = useState("");

  // persist token
  useEffect(() => {
    if (token) setToken(token);
  }, [token]);

  async function loadMe(t = token) {
    if (!t) {
      setMe(null);
      return;
    }
    try {
      const r = await api("/api/me", { token: t });
      setMe(r);
      setAuthErr("");
    } catch (e) {
      // token invalid
      setAuthErr(String(e?.message || e));
      logout();
    }
  }

  function logout() {
    try {
      stopLiveWs();
    } catch {}
    clearToken();
    setTok("");
    setMe(null);
  }

  // load me when token changes
  useEffect(() => {
    loadMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // websocket connect (single source: live/ws.js)
  useEffect(() => {
    // token yoksa ws kapalı kalsın
    if (!token) {
      stopLiveWs();
      return;
    }

    // token varsa ws başlat
    startLiveWs(token);

    return () => {
      stopLiveWs();
    };
  }, [token]);

  const value = useMemo(
    () => ({ token, setToken: setTok, me, loadMe, logout, authErr }),
    [token, me, authErr]
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const v = useContext(SessionCtx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}
