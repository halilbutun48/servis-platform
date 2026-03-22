// web/src/App.jsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import AppShell from "./layout/AppShell";
import { useSession } from "./state/session";
import { login } from "./api";
import { useHashRoute, navigate } from "./router";
import { companyBase, normalizeCompanyPath } from "./utils/paths";
import GoogleLoginButton from "./components/GoogleLoginButton";
import ErrorBoundary from "./components/ErrorBoundary";
import { startLiveWs, stopLiveWs } from "./live/ws";

// ROOM
const RoomMapPanel = lazy(() => import("./panels/room/MapPanel"));
const VehiclesPanel = lazy(() => import("./panels/room/VehiclesPanel"));
const DriversPanel = lazy(() => import("./panels/room/DriversPanel"));
const RoomShiftsPanel = lazy(() => import("./panels/room/ShiftsPanel"));
const RoomAgreementsPanel = lazy(() => import("./panels/room/AgreementsPanel"));
const RoomOffersPanel = lazy(() => import("./panels/room/OffersPanel"));
const CommercialFlowPanel = lazy(() => import("./panels/room/CommercialFlowPanel"));
const RoomHubPanel = lazy(() => import("./panels/room/HubPanel"));
const RoomCheckinPanel = lazy(() => import("./panels/room/CheckinPanel"));
const OperationHealthPanel = lazy(() => import("./panels/room/OperationHealthPanel"));

// COMPANY
const CompanyWorkflowPanel = lazy(() => import("./panels/company/WorkflowPanel"));
const CompanyMapPanel = lazy(() => import("./panels/company/MapPanel"));
const CompanyShiftsPanel = lazy(() => import("./panels/company/ShiftsPanel"));
const CompanyAgreementsPanel = lazy(() => import("./panels/company/AgreementsPanel"));
const GeoReviewPanel = lazy(() => import("./panels/company/GeoReviewPanel"));
const CompanyHubPanel = lazy(() => import("./panels/company/HubPanel"));
const CompanyCheckinPanel = lazy(() => import("./panels/company/CheckinPanel"));
const ServiceEvaluationPanel = lazy(() => import("./panels/company/ServiceEvaluationPanel"));
const CompanyCommercialFlowPanel = lazy(() => import("./panels/company/CommercialFlowPanel"));
const OrganizationCenterPanel = lazy(() => import("./panels/organization/CenterPanel"));
const OrganizationPlansPanel = lazy(() => import("./panels/organization/PlansPanel"));

// DRIVER
const DriverMapPanel = lazy(() => import("./panels/driver/MapPanel"));
const RoutePanel = lazy(() => import("./panels/driver/RoutePanel"));
const DriverTodayPanel = lazy(() => import("./panels/driver/TodayPanel"));
const DriverCheckinPanel = lazy(() => import("./panels/driver/CheckinPanel"));
const DriverPinChangePanel = lazy(() => import("./panels/driver/PinChangePanel"));

// PERSONEL
const PersonelLivePanel = lazy(() => import("./panels/personel/LivePanel"));
const MyRidePanel = lazy(() => import("./panels/personel/MyRidePanel"));

// PARENT
const ParentLivePanel = lazy(() => import("./panels/parent/LivePanel"));
const SchoolParentInvitePanel = lazy(() => import("./panels/school/ParentInvitePanel"));
const AcceptParentInvitePanel = lazy(() => import("./panels/public/AcceptParentInvitePanel"));
const PassengerLivePanel = lazy(() => import("./panels/public/PassengerLivePanel"));
const AcceptInvitePanel = lazy(() => import("./panels/public/AcceptInvitePanel"));
const PassengerLinksPanel = lazy(() => import("./panels/company/PassengerLinksPanel"));

// SHARED
const NotificationsPanel = lazy(() => import("./panels/shared/NotificationsPanel"));
const AuthInvitesPanel = lazy(() => import("./panels/shared/AuthInvitesPanel"));
const LogsPanel = lazy(() => import("./panels/shared/LogsPanel"));
const ReportsPanel = lazy(() => import("./panels/shared/ReportsPanel"));
const CopilotPanel = lazy(() => import("./panels/shared/CopilotPanel"));
const KvkkPanel = lazy(() => import("./panels/shared/KvkkPanel"));

// SUPER_ADMIN
const SuperAdminPanel = lazy(() => import("./panels/superadmin/SuperAdminPanel"));
const SuperCompaniesPanel = lazy(() => import("./panels/superadmin/CompaniesPanel"));
const SuperRoomsPanel = lazy(() => import("./panels/superadmin/RoomsPanel"));
const SuperUsersPanel = lazy(() => import("./panels/superadmin/UsersPanel"));
const SuperRegionsPanel = lazy(() => import("./panels/superadmin/RegionsPanel"));
const SuperAuditLogsPanel = lazy(() => import("./panels/superadmin/AuditLogsPanel"));
const SuperLogExportPanel = lazy(() => import("./panels/superadmin/LogExportPanel"));
const SuperObservabilityPanel = lazy(() => import("./panels/superadmin/ObservabilityPanel"));
const SuperFieldAcceptancePanel = lazy(() => import("./panels/superadmin/FieldAcceptanceCenter"));
const SuperSsotAlignmentPanel = lazy(() => import("./panels/superadmin/SsotAlignmentPanel"));
const SuperCommercialCorePanel = lazy(() => import("./panels/superadmin/CommercialCorePanel"));
const SuperTrustQualityPanel = lazy(() => import("./panels/superadmin/TrustQualityPanel"));
const SuperNaturalCopilotPanel = lazy(() => import("./panels/superadmin/NaturalCopilotPanel"));
const SuperPilotLaunchGatePanel = lazy(() => import("./panels/superadmin/PilotLaunchGatePanel"));

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
        <div className="muted" style={{ letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Vardis</div>
        <div className="title" style={{ fontSize: 28, lineHeight: 1.15 }}>Personel servis operasyonunu sadeleştirir.</div>
        <div className="muted" style={{ marginTop: 8 }}>Tek panel yapısı, rol bazlı akış ve sahaya uygun sade kullanım.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="title">Giriş</div>
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
    if (path === "/shared/kvkk") return { layout: true, node: <KvkkPanel /> };
    if (path === "/room/reports") return { layout: true, node: <ReportsPanel /> };
    if (path === "/room/operation-health") return { layout: true, node: <OperationHealthPanel /> };
    if (path === "/company/reports") return { layout: true, node: <ReportsPanel /> };
    if (path === "/school/reports") return { layout: true, node: <ReportsPanel /> };
    if (path === "/organization/reports") return { layout: true, node: <ReportsPanel /> };

    // ROOM
    if (path === "/room/map") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/live") return { layout: true, node: <RoomMapPanel /> };
    if (path === "/room/vehicles") return { layout: true, node: <VehiclesPanel /> };
    if (path === "/room/drivers") return { layout: true, node: <DriversPanel /> };
    if (path === "/room/shifts") return { layout: true, node: <RoomShiftsPanel /> };
    if (path === "/room/agreements") return { layout: true, node: <RoomAgreementsPanel /> };
    if (path === "/room/offers") return { layout: true, node: <RoomOffersPanel /> };
    if (path === "/room/commercial-flow") return { layout: true, node: <CommercialFlowPanel /> };
    if (path === "/room/hub") return { layout: true, node: <RoomHubPanel /> };
    if (path === "/room/checkin") return { layout: true, node: <RoomCheckinPanel /> };
    if (path === "/room/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/room/copilot") return { layout: true, node: <CopilotPanel /> };

    // COMPANY
    if (path === "/company") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/company/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/company/commercial-flow") return { layout: true, node: <CompanyCommercialFlowPanel /> };
    if (path === "/company/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/company/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/company/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/company/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/company/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/company/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/company/service-evaluation") return { layout: true, node: <ServiceEvaluationPanel /> };
    if (path === "/company/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/company/copilot") return { layout: true, node: <CopilotPanel /> };

    // SCHOOL (Company.kind=SCHOOL)
    if (path === "/school") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/school/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/school/commercial-flow") return { layout: true, node: <CompanyCommercialFlowPanel /> };
    if (path === "/school/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/school/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/school/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/school/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/school/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/school/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/school/service-evaluation") return { layout: true, node: <ServiceEvaluationPanel /> };
    if (path === "/school/parents") return { layout: true, node: <SchoolParentInvitePanel /> };
    if (path === "/school/auth-invites") return { layout: true, node: <AuthInvitesPanel /> };
    if (path === "/school/copilot") return { layout: true, node: <CopilotPanel /> };


    // ORGANIZATION (Company.kind=ORGANIZATION)
    if (path === "/organization") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/organization/plans") return { layout: true, node: <OrganizationPlansPanel /> };
    if (path === "/organization/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/organization/commercial-flow") return { layout: true, node: <CompanyCommercialFlowPanel /> };
    if (path === "/organization/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/organization/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/organization/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/organization/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/organization/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/organization/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/organization/service-evaluation") return { layout: true, node: <ServiceEvaluationPanel /> };
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
    if (path === "/superadmin/observability") return { layout: true, node: <SuperObservabilityPanel /> };
    if (path === "/superadmin/acceptance") return { layout: true, node: <SuperFieldAcceptancePanel /> };
    if (path === "/superadmin/ssot-alignment") return { layout: true, node: <SuperSsotAlignmentPanel /> };
    if (path === "/superadmin/commercial-core") return { layout: true, node: <SuperCommercialCorePanel /> };
    if (path === "/superadmin/trust-quality") return { layout: true, node: <SuperTrustQualityPanel /> };
    if (path === "/superadmin/natural-copilot") return { layout: true, node: <SuperNaturalCopilotPanel /> };
    if (path === "/superadmin/pilot-launch-gate") return { layout: true, node: <SuperPilotLaunchGatePanel /> };
    if (path === "/superadmin/copilot") return { layout: true, node: <CopilotPanel /> };

    // Unknown: go default
    const def = roleDefaultPath(me);
    navigate(def);
    return { layout: true, node: <div style={{ padding: 16 }}>Redirecting...</div> };
  }, [token, me, path, cleanPath]);

  if (!view.layout) return view.node;

  return (
    <AppShell path={path}>
      <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: 16 }}>Yükleniyor...</div>}>{view.node}</Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}


