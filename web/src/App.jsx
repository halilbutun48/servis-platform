import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { api, getToken, setToken } from "./lib/api";
import { makeSocket } from "./lib/socket";
import MapView from "./pages/MapView";
import AdminPanel from "./pages/AdminPanel.jsx";
import SchoolPanel from "./pages/SchoolPanel.jsx";

function Home({ me, onLogout }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Okul Servis Platform</h2>

      {me ? (
        <>
          <div><b>{me.email}</b> â€” {me.role} (schoolId: {me.schoolId ?? "-"})</div>
          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <Link to="/map">Harita</Link>
        {(me?.role === "SUPER_ADMIN" || me?.role === "SERVICE_ROOM") && <Link to="/admin">Servis Odası</Link>}
        {me?.role === "SCHOOL_ADMIN" && <Link to="/school">Okul Yönetimi</Link>}
            <button onClick={onLogout}>Cikis</button>
          </div>
        </>
      ) : (
        <Link to="/login">Giris</Link>
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("parent_seed@demo.com");
  const [password, setPassword] = useState("Demo123!");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(r.token);
      toast.success("Giris basarili");
      await onLogin();
      nav("/");
    } catch (e2) {
      toast.error("Giris hatasi: " + e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Giris</h3>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button disabled={loading}>{loading ? "..." : "Giris"}</button>
      </form>
      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
        Seed sifre: Demo123!
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(true);

  const socket = useMemo(() => makeSocket(), []);

  async function refreshMe() {
    const token = getToken();
    if (!token) { setMe(null); return; }
    const r = await api("/api/me");
    setMe(r.me);
  }

  useEffect(() => {
    (async () => {
      try { await refreshMe(); }
      finally { setBooting(false); }
    })();
  }, []);

  useEffect(() => {
    const onGps = (p) => {
      toast.dismiss("gps");
      toast.success(`GPS: v${p.vehicleId} ${p.lat}, ${p.lon}`, { id: "gps", duration: 1500 });
    };
    socket.on("gps:update", onGps);
    return () => socket.off("gps:update", onGps);
  }, [socket]);

  function logout() {
    setToken("");
    setMe(null);
    toast("Cikis yapildi");
  }

  if (booting) return <div style={{ padding: 16 }}>Yukleniyor...</div>;

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/school" element={<SchoolPanel />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/" element={<Home me={me} onLogout={logout} />} />
        <Route path="/login" element={<Login onLogin={refreshMe} />} />
        <Route path="/map" element={<MapView me={me} socket={socket} />} />
      </Routes>
    </>
  );
}

