// web/src/state/sessionProvider.jsx
import { useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api";
import { startLiveWs, stopLiveWs } from "../live/ws";
import { SessionCtx } from "./sessionContext";

export function SessionProvider({ children }) {
  const [token, setTok] = useState(getToken());
  const [me, setMe] = useState(null);
  const [authErr, setAuthErr] = useState("");

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
      setAuthErr(String(e?.message || e));
      logout();
    }
  }

  function logout() {
    try {
      stopLiveWs();
    } catch {
      // no-op: best effort logout cleanup
    }
    clearToken();
    setTok("");
    setMe(null);
  }

  useEffect(() => {
    loadMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) {
      stopLiveWs();
      return;
    }
    startLiveWs(token);
    return () => stopLiveWs();
  }, [token]);

  const value = useMemo(() => ({ token, setToken: setTok, me, loadMe, logout, authErr }), [token, me, authErr]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
