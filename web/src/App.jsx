// web/src/App.jsx
import { useEffect, useMemo, useState } from "react";
import AppShell from "./layout/AppShell";
import { useSession } from "./state/session";
import { login } from "./api";
import { useHashRoute, navigate } from "./router";
import { companyBase, normalizeCompanyPath } from "./utils/paths";

// ROOM
import RoomMapPanel from "./panels/room/MapPanel";
import VehiclesPanel from "./panels/room/VehiclesPanel";
import DriversPanel from "./panels/room/DriversPanel";
import RoomShiftsPanel from "./panels/room/ShiftsPanel";
import RoomAgreementsPanel from "./panels/room/AgreementsPanel";
import RoomOffersPanel from "./panels/room/OffersPanel";
import RoomHubPanel from "./panels/room/HubPanel";
import RoomCheckinPanel from "./panels/room/CheckinPanel";
// COMPANY
import CompanyWorkflowPanel from "./panels/company/WorkflowPanel";
import CompanyMapPanel from "./panels/company/MapPanel";
import CompanyShiftsPanel from "./panels/company/ShiftsPanel";
import CompanyAgreementsPanel from "./panels/company/AgreementsPanel";
import GeoReviewPanel from "./panels/company/GeoReviewPanel";
import CompanyHubPanel from "./panels/company/HubPanel";
import CompanyCheckinPanel from "./panels/company/CheckinPanel";
import OrganizationCenterPanel from "./panels/organization/CenterPanel";
import OrganizationPlansPanel from "./panels/organization/PlansPanel";

// DRIVER
import DriverMapPanel from "./panels/driver/MapPanel";
import RoutePanel from "./panels/driver/RoutePanel";
import DriverTodayPanel from "./panels/driver/TodayPanel";
import DriverCheckinPanel from "./panels/driver/CheckinPanel";
import DriverPinChangePanel from "./panels/driver/PinChangePanel";

// PERSONEL
import PersonelLivePanel from "./panels/personel/LivePanel";
import MyRidePanel from "./panels/personel/MyRidePanel";

// PARENT
import ParentLivePanel from "./panels/parent/LivePanel";
import SchoolParentInvitePanel from "./panels/school/ParentInvitePanel";
import AcceptParentInvitePanel from "./panels/public/AcceptParentInvitePanel";
import PassengerLivePanel from "./panels/public/PassengerLivePanel";
import AcceptInvitePanel from "./panels/public/AcceptInvitePanel";
import PassengerLinksPanel from "./panels/company/PassengerLinksPanel";

// SHARED
import NotificationsPanel from "./panels/shared/NotificationsPanel";
import AuthInvitesPanel from "./panels/shared/AuthInvitesPanel";
import GoogleLoginButton from "./components/GoogleLoginButton";
import LogsPanel from "./panels/shared/LogsPanel";
import CopilotPanel from "./panels/shared/CopilotPanel";

// SUPER_ADMIN
import SuperAdminPanel from "./panels/superadmin/SuperAdminPanel";
import SuperCompaniesPanel from "./panels/superadmin/CompaniesPanel";
import SuperRoomsPanel from "./panels/superadmin/RoomsPanel";
import SuperUsersPanel from "./panels/superadmin/UsersPanel";
import SuperRegionsPanel from "./panels/superadmin/RegionsPanel";
import SuperAuditLogsPanel from "./panels/superadmin/AuditLogsPanel";
import SuperLogExportPanel from "./panels/superadmin/LogExportPanel";

import ErrorBoundary from "./components/ErrorBoundary";

// ✅ WS
import { startLiveWs, stopLiveWs } from "./live/ws";

function roleDefaultPath(me) {
  const role = me?.role;
  if (role === "ROOM") return "/room/map";
  if (role === "COMPANY") return companyBase(me); // COMPANY or SCHOOL variant
  if (role === "DRIVER") return me?.requirePinChange ? "/driver/change-pin" : "/driver/today";
  if (role === "PERSONEL") return "/personel/live";
  if (role === "PARENT") return "/parent/live";
  if (role === "SUPER_ADMIN") return "/superadmin";
  return "/";
}

function LoginCard() {
  const { setToken } = useSession();
  const [identifier, setIdentifier] = useState("room@demo.com");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await login(identifier, password);
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
            E-posta veya Sürücü Kodu
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="room@demo.com veya SRC-000001" />
          </label>
          <label className="muted">
            Şifre veya PIN
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

        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Google Auth + Invite Gate: aktif davetin varsa Google ile de giriş yapabilirsin.</div>
          <GoogleLoginButton
            onSuccess={(r) => {
              setToken(r?.token || "");
            }}
            onError={(e) => {
              setErr(String(e?.message || e));
            }}
          />
        </div>

        <hr style={{ margin: "12px 0" }} />
        <div className="muted">
          Demo kullanıcılar: room@demo.com, company@demo.com, school@demo.com, organization@demo.com, driver@demo.com, personel@demo.com (şifre: demo123). Sürücü için ayrıca Sürücü Kodu + PIN girişi de desteklenir.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { token, me } = useSession();
  const { path } = useHashRoute();
  const cleanPath = String(path || "/").split("?")[0];

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
    if (path === "/" || path === "") navigate(roleDefaultPath(me));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, me?.role]);

  const view = useMemo(() => {
    if (!token) {
      if (cleanPath === "/accept-parent-invite") return { layout: false, node: <AcceptParentInvitePanel path={path} /> };
      if (cleanPath === "/accept-invite") return { layout: false, node: <AcceptInvitePanel path={path} /> };
      if (cleanPath === "/public/passenger-live" || cleanPath === "/public/personel-live") return { layout: false, node: <PassengerLivePanel path={path} /> };
      return { layout: false, node: <LoginCard /> };
    }
    if (!me) return { layout: false, node: <div style={{ padding: 16 }}>Loading...</div> };

    if (me.role === "DRIVER" && me.requirePinChange && path !== "/driver/change-pin") {
      navigate("/driver/change-pin");
      return { layout: true, node: <div style={{ padding: 16 }}>PIN ekranına yönlendiriliyor...</div> };
    }

    // Shared
    if (path === "/shared/notifications") return { layout: true, node: <NotificationsPanel /> };
    if (path === "/shared/logs") return { layout: true, node: <LogsPanel /> };

    // ROOM
    if (path === "/room/map") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/live") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/vehicles") return { layout: true, node: <VehiclesPanel /> };
    if (path === "/room/drivers") return { layout: true, node: <DriversPanel /> };
    if (path === "/room/shifts") return { layout: true, node: <RoomShiftsPanel /> };
    if (path === "/room/agreements") return { layout: true, node: <RoomAgreementsPanel /> };
    if (path === "/room/offers") return { layout: true, node: <RoomOffersPanel /> };
    if (path === "/room/hub") return { layout: true, node: <RoomHubPanel /> };
    if (path === "/room/checkin") return { layout: true, node: <RoomCheckinPanel /> };
    if (path === "/room/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/room/copilot") return { layout: true, node: <CopilotPanel /> };

    // COMPANY
    if (path === "/company") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/company/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/company/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/company/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/company/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/company/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/company/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/company/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/company/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/company/copilot") return { layout: true, node: <CopilotPanel /> };

    // SCHOOL (Company.kind=SCHOOL)
    if (path === "/school") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/school/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/school/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/school/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/school/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/school/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/school/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/school/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/school/parents") return { layout: true, node: <SchoolParentInvitePanel /> };
    if (path === "/school/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/school/copilot") return { layout: true, node: <CopilotPanel /> };


    // ORGANIZATION (Company.kind=ORGANIZATION)
    if (path === "/organization") return { layout: true, node: <OrganizationCenterPanel /> };
    if (path === "/organization/plans") return { layout: true, node: <OrganizationPlansPanel /> };
    if (path === "/organization/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/organization/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/organization/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/organization/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/organization/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/organization/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/organization/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/organization/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/organization/copilot") return { layout: true, node: <CopilotPanel /> };

    // DRIVER
    if (path === "/driver" || path === "/driver/today") return { layout: true, node: <DriverTodayPanel /> };
    if (path === "/driver/map") return { layout: true, node: <DriverMapPanel /> };
    if (path === "/driver/route") return { layout: true, node: <RoutePanel /> };
    if (path === "/driver/checkin") return { layout: true, node: <DriverCheckinPanel /> };
    if (path === "/driver/change-pin") return { layout: true, node: <DriverPinChangePanel /> };
    if (path === "/driver/copilot") return { layout: true, node: <CopilotPanel /> };

    // PERSONEL
    if (path === "/personel/live") return { layout: true, node: <PersonelLivePanel /> };
    if (path === "/personel/my") return { layout: true, node: <MyRidePanel /> };
    if (path === "/personel/copilot") return { layout: true, node: <CopilotPanel /> };

    // PARENT
    if (path === "/parent" || path === "/parent/live") return { layout: true, node: <ParentLivePanel /> };
    if (path === "/parent/copilot") return { layout: true, node: <CopilotPanel /> };

    // SUPER_ADMIN
    if (path === "/superadmin") return { layout: true, node: <SuperAdminPanel /> };
    if (path === "/superadmin/companies") return { layout: true, node: <SuperCompaniesPanel /> };
    if (path === "/superadmin/rooms") return { layout: true, node: <SuperRoomsPanel /> };
    if (path === "/superadmin/users") return { layout: true, node: <SuperUsersPanel /> };
    if (path === "/superadmin/regions") return { layout: true, node: <SuperRegionsPanel /> };
    if (path === "/superadmin/audit") return { layout: true, node: <SuperAuditLogsPanel /> };
    if (path === "/superadmin/logexport") return { layout: true, node: <SuperLogExportPanel /> };
    if (path === "/superadmin/copilot") return { layout: true, node: <CopilotPanel /> };

    // Unknown: go default
    const def = roleDefaultPath(me);
    navigate(def);
    return { layout: true, node: <div style={{ padding: 16 }}>Redirecting...</div> };
  }, [token, me, path, cleanPath]);

  if (!view.layout) return view.node;

  return (
    <AppShell path={path}>
      <ErrorBoundary>{view.node}</ErrorBoundary>
    </AppShell>
  );
}


