// web/src/App.jsx
import { useEffect, useMemo, useState } from "react";
import AppShell from "./layout/AppShell";
import { useSession } from "./state/session";
import { login } from "./api";
import { useHashRoute, navigate } from "./router";

// ROOM
import RoomMapPanel from "./panels/room/MapPanel";
import VehiclesPanel from "./panels/room/VehiclesPanel";
import DriversPanel from "./panels/room/DriversPanel";
import RoomShiftsPanel from "./panels/room/ShiftsPanel";
import RoomAgreementsPanel from "./panels/room/AgreementsPanel";
import RoomOffersPanel from "./panels/room/OffersPanel";
import RoomHubPanel from "./panels/room/HubPanel";

// COMPANY
import CompanyWorkflowPanel from "./panels/company/WorkflowPanel";
import CompanyMapPanel from "./panels/company/MapPanel";
import CompanyShiftsPanel from "./panels/company/ShiftsPanel";
import CompanyAgreementsPanel from "./panels/company/AgreementsPanel";
import GeoReviewPanel from "./panels/company/GeoReviewPanel";
import CompanyHubPanel from "./panels/company/HubPanel";

// DRIVER
import DriverMapPanel from "./panels/driver/MapPanel";
import RoutePanel from "./panels/driver/RoutePanel";
import DriverTodayPanel from "./panels/driver/TodayPanel";

// PERSONEL
import PersonelLivePanel from "./panels/personel/LivePanel";
import MyRidePanel from "./panels/personel/MyRidePanel";

// SHARED
import NotificationsPanel from "./panels/shared/NotificationsPanel";

// SUPER_ADMIN
import SuperAdminPanel from "./panels/superadmin/SuperAdminPanel";
import SuperCompaniesPanel from "./panels/superadmin/CompaniesPanel";
import SuperRoomsPanel from "./panels/superadmin/RoomsPanel";

import ErrorBoundary from "./components/ErrorBoundary";

// ✅ WS
import { startLiveWs, stopLiveWs } from "./live/ws";

function roleDefaultPath(role) {
  if (role === "ROOM") return "/room/map";
  if (role === "COMPANY") return "/company"; // ✅ M26: workflow home
  if (role === "DRIVER") return "/driver/today";
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
        <div className="muted">Tek UI → Role-based paneller (ROOM/COMPANY/DRIVER/PERSONEL)</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Login</div>
        <form onSubmit={onLogin} style={{ display: "grid", gap: 8, marginTop: 8, maxWidth: 420 }}>
          <label className="muted">
            E-posta
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="muted">
            Şifre
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "..." : "Giriş"}
          </button>

          {err ? (
            <div className="muted" style={{ color: "crimson" }}>
              {err}
            </div>
          ) : null}
        </form>

        <hr style={{ margin: "12px 0" }} />
        <div className="muted">
          Demo kullanıcılar: room@demo.com, company@demo.com, driver@demo.com, personel@demo.com (şifre: demo123)
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
    if (!me) return { layout: false, node: <div style={{ padding: 16 }}>Loading...</div> };

    // Shared
    if (path === "/shared/notifications") return { layout: true, node: <NotificationsPanel /> };

    // ROOM
    if (path === "/room/map") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/vehicles") return { layout: true, node: <VehiclesPanel /> };
    if (path === "/room/drivers") return { layout: true, node: <DriversPanel /> };
    if (path === "/room/shifts") return { layout: true, node: <RoomShiftsPanel /> };
    if (path === "/room/agreements") return { layout: true, node: <RoomAgreementsPanel /> };
    if (path === "/room/offers") return { layout: true, node: <RoomOffersPanel /> };
    if (path === "/room/hub") return { layout: true, node: <RoomHubPanel /> };

    // COMPANY
    if (path === "/company") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/company/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/company/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/company/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/company/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/company/hub") return { layout: true, node: <CompanyHubPanel /> };

    // DRIVER
    if (path === "/driver/map") return { layout: true, node: <DriverMapPanel /> };
    if (path === "/driver/route" || String(path || "").startsWith("/driver/route?")) return { layout: true, node: <RoutePanel /> };

    // PERSONEL
    if (path === "/personel/live") return { layout: true, node: <PersonelLivePanel /> };
    if (path === "/personel/my") return { layout: true, node: <MyRidePanel /> };

    // SUPER_ADMIN
    if (path === "/superadmin") return { layout: true, node: <SuperAdminPanel /> };
    if (path === "/superadmin/companies") return { layout: true, node: <SuperCompaniesPanel /> };
    if (path === "/superadmin/rooms") return { layout: true, node: <SuperRoomsPanel /> };

    // Unknown: go default
    const def = roleDefaultPath(me.role);
    navigate(def);
    return { layout: true, node: <div style={{ padding: 16 }}>Redirecting...</div> };
  }, [token, me, path]);

  if (!view.layout) return view.node;

  return (
    <AppShell path={path}>
      <ErrorBoundary>{view.node}</ErrorBoundary>
    </AppShell>
  );
}
