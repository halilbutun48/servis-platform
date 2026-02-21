// web/src/App.jsx
import { useEffect, useMemo, useState } from "react";
import AppShell from "./layout/AppShell";
import { useSession } from "./state/session";
import { login } from "./api";
import { useHashRoute, navigate } from "./router";

import VehiclesPanel from "./panels/room/VehiclesPanel";
import DriversPanel from "./panels/room/DriversPanel";
import RoomShiftsPanel from "./panels/room/ShiftsPanel";
import CompanyShiftsPanel from "./panels/company/ShiftsPanel";
import RoutePanel from "./panels/driver/RoutePanel";
import MyRidePanel from "./panels/personel/MyRidePanel";
import NotificationsPanel from "./panels/shared/NotificationsPanel";
import SuperAdminPanel from "./panels/superadmin/SuperAdminPanel";
import RoomMapPanel from "./panels/room/MapPanel";
import CompanyMapPanel from "./panels/company/MapPanel";
import GeoReviewPanel from "./panels/company/GeoReviewPanel";
import DriverMapPanel from "./panels/driver/MapPanel";
import PersonelLivePanel from "./panels/personel/LivePanel";

// ✅ M17.1 UI
import RoomAgreementsPanel from "./panels/room/AgreementsPanel";
import CompanyAgreementsPanel from "./panels/company/AgreementsPanel";

import ErrorBoundary from "./components/ErrorBoundary";

// ✅ WS
import { startLiveWs, stopLiveWs } from "./live/ws";

function roleDefaultPath(role) {
  if (role === "ROOM") return "/room/map";
  if (role === "COMPANY") return "/company/map";
  if (role === "DRIVER") return "/driver/map";
  if (role === "PERSONEL") return "/personel/live";
  if (role === "SUPER_ADMIN") return "/superadmin";
  return "/";
}

function LoginCard() {
  const { setToken } = useSession();
  const [email, setEmail] = useState("room@demo.com");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await login(email, password);
      setToken(r.token);
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Personel-Servis V1</div>
        <div className="muted">
          Tek UI → Role-based paneller (ROOM/COMPANY/DRIVER/PERSONEL)
        </div>
      </div>

      <div className="card">
        <h3>Login</h3>
        <form onSubmit={onLogin} className="col">
          <label className="muted">E-posta</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="muted">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button disabled={busy} type="submit">
            {busy ? "..." : "Giriş"}
          </button>
        </form>
        {err ? (
          <div className="card err" style={{ marginTop: 12 }}>
            {err}
          </div>
        ) : null}
        <hr />
        <div className="muted">
          Demo kullanıcılar: <b>room@demo.com</b>, <b>company@demo.com</b>,{" "}
          <b>driver@demo.com</b>, <b>personel@demo.com</b> (şifre:{" "}
          <b>demo123</b>)
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { token, me } = useSession();
  const { path } = useHashRoute();

  // ✅ WS: token geldikçe başlat, token gidince durdur
  useEffect(() => {
    if (token) startLiveWs(token);
    else stopLiveWs();

    // component unmount olursa da kapat
    return () => stopLiveWs();
  }, [token]);

  // Redirect to default panel after login
  useEffect(() => {
    if (!token || !me?.role) return;
    if (path === "/" || path === "") navigate(roleDefaultPath(me.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, me?.role]);

  const view = useMemo(() => {
    if (!token) return { layout: false, node: <LoginCard /> };
    if (!me)
      return {
        layout: false,
        node: (
          <div className="wrap">
            <div className="card">Loading...</div>
          </div>
        ),
      };

    // Shared
    if (path === "/shared/notifications")
      return { layout: true, node: <NotificationsPanel /> };

    // ROOM
    if (path === "/room/map") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/vehicles")
      return { layout: true, node: <VehiclesPanel /> };
    if (path === "/room/drivers")
      return { layout: true, node: <DriversPanel /> };
    if (path === "/room/shifts")
      return { layout: true, node: <RoomShiftsPanel /> };
    if (path === "/room/agreements")
      return { layout: true, node: <RoomAgreementsPanel /> };

    // COMPANY
    if (path === "/company/map")
      return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/company/shifts")
      return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/company/georeview")
      return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/company/agreements")
      return { layout: true, node: <CompanyAgreementsPanel /> };

    // DRIVER
    if (path === "/driver/map")
      return { layout: true, node: <DriverMapPanel /> };
    if (path === "/driver/route")
      return { layout: true, node: <RoutePanel /> };

    // PERSONEL
    if (path === "/personel/live")
      return { layout: true, node: <PersonelLivePanel /> };
    if (path === "/personel/my")
      return { layout: true, node: <MyRidePanel /> };

    // SUPER_ADMIN
    if (path === "/superadmin")
      return { layout: true, node: <SuperAdminPanel /> };

    // Unknown: go default
    const def = roleDefaultPath(me.role);
    navigate(def);
    return { layout: true, node: <div className="card">Redirecting...</div> };
  }, [token, me, path]);

  if (!view.layout) return view.node;

  return (
    <AppShell path={path}>
      <ErrorBoundary>{view.node}</ErrorBoundary>
    </AppShell>
  );
}