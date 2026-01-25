import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api";
import { connectSocket } from "../socket";
import { invalidate } from "../live/bus";

const SessionCtx = createContext(null);

export function SessionProvider({ children }) {
  const [token, setTok] = useState(getToken());
  const [me, setMe] = useState(null);
  const [authErr, setAuthErr] = useState("");
  const sockRef = useRef(null);

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
      if (sockRef.current) sockRef.current.disconnect();
    } catch {}
    sockRef.current = null;
    clearToken();
    setTok("");
    setMe(null);
  }

  // load me when token changes
  useEffect(() => {
    loadMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // websocket connect
  useEffect(() => {
    if (!token) return;

    // reset old
    try {
      if (sockRef.current) sockRef.current.disconnect();
    } catch {}
    sockRef.current = null;

    const s = connectSocket(token);
    sockRef.current = s;

    // invalidate keys on events so all panels stay in sync
    s.on("vehicle:update", () => invalidate("vehicles"));
    s.on("driver:update", () => invalidate("drivers"));
    s.on("shift:update", () => invalidate("shifts"));
    s.on("route:plan", () => invalidate("shifts"));
    s.on("route:progress", () => invalidate("shifts"));
    s.on("gps:update", () => invalidate("vehicles"));
    s.on("eta:update", () => invalidate("eta"));
    s.on("notif:new", () => invalidate("notifications"));

    return () => {
      try {
        s.disconnect();
      } catch {}
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