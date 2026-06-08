// web/src/App.jsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import AppShell from "./layout/AppShell";
import { useSession } from "./state/session";
import { login } from "./api";
import { useHashRoute, navigate } from "./router";
import { companyBase } from "./utils/paths";
import BrandMark from "./components/BrandMark";
import ErrorBoundary from "./components/ErrorBoundary";
import { startLiveWs, stopLiveWs } from "./live/ws";

const LOGIN_HIGHLIGHTS = [
  {
    title: "Servis tedarikinden vardiyaya tek akış",
    body: "Talep, planlama ve saha akışı aynı yüzeyde ilerler; ekipler rol bazlı yönlendirilir.",
  },
  {
    title: "Canlı GPS, kanıt ve kalite kontrolü",
    body: "Konum, durum ve kanıt sinyalleri tek bakışta görünür, iş akışı bölünmez.",
  },
  {
    title: "Hakediş ve maliyet riskleri için güvenli önizleme",
    body: "Ödeme ve uyum sinyalleri kilit akışları bozmadan readonly önizlenir.",
  },
  {
    title: "Sefer Abi ile rol bazlı operasyon desteği",
    body: "Her role uygun rehber ve kısayol seti, panel karmaşasını azaltır.",
  },
];

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
const PersonelAccessPanel = lazy(() => import("./panels/company/PersonelAccessPanel"));
const CompanyCommercialFlowPanel = lazy(() => import("./panels/company/CommercialFlowPanel"));
const OrganizationCenterPanel = lazy(() => import("./panels/organization/CenterPanel"));
const OrganizationPlansPanel = lazy(() => import("./panels/organization/PlansPanel"));
const CompanyOperationsPanel = lazy(() => import("./panels/company/OperationsPanel"));
const SchoolOperationsPanel = lazy(() => import("./panels/school/OperationsPanel"));

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
const PublicLandingPage = lazy(() => import("./panels/public/PublicLandingPage"));
const SchoolParentInvitePanel = lazy(() => import("./panels/school/ParentInvitePanel"));
const AcceptParentInvitePanel = lazy(() => import("./panels/public/AcceptParentInvitePanel"));
const PassengerLivePanel = lazy(() => import("./panels/public/PassengerLivePanel"));
const PassengerLinksPanel = lazy(() => import("./panels/company/PassengerLinksPanel"));

// SHARED
const NotificationsPanel = lazy(() => import("./panels/shared/NotificationsPanel"));
const LogsPanel = lazy(() => import("./panels/shared/LogsPanel"));
const ReportsPanel = lazy(() => import("./panels/shared/ReportsPanel"));
const CopilotPanel = lazy(() => import("./panels/shared/CopilotPanel"));
const FeedbackLoopPanel = lazy(() => import("./panels/shared/FeedbackLoopPanel"));
const KvkkPanel = lazy(() => import("./panels/shared/KvkkPanel"));
const ForcePasswordChangePanel = lazy(() => import("./panels/shared/ForcePasswordChangePanel"));

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
const SuperOperationVerificationPanel = lazy(() => import("./panels/superadmin/OperationVerificationPanel"));
const SuperOperationsPanel = lazy(() => import("./panels/superadmin/OperationsPanel"));
const SuperPublicLeadReviewPanel = lazy(() => import("./panels/superadmin/PublicLeadReviewPanel"));

function roleDefaultPath(me) {
  if (me?.requirePasswordChange) return "/auth/change-password";
  const role = me?.role;
  if (role === "ROOM") return "/room/map";
  if (role === "COMPANY") return companyBase(me); // COMPANY or SCHOOL variant
  if (role === "DRIVER") return me?.requirePinChange ? "/driver/change-pin" : "/driver/today";
  if (role === "PERSONEL") return "/personel/live";
  if (role === "PARENT") return "/parent/live";
  if (role === "SUPER_ADMIN") return "/superadmin";
  return "/";
}

function fallbackCopilotPath(path) {
  const clean = String(path || "").split("?")[0];
  if (clean.startsWith("/room")) return "/room/copilot";
  if (clean.startsWith("/company")) return "/company/copilot";
  if (clean.startsWith("/school")) return "/school/copilot";
  if (clean.startsWith("/organization")) return "/organization/copilot";
  if (clean.startsWith("/driver")) return "/driver/copilot";
  if (clean.startsWith("/personel")) return "/personel/copilot";
  if (clean.startsWith("/parent")) return "/parent/copilot";
  return "/superadmin/copilot";
}

function SessionLoadingCard({ path }) {
  return (
    <div className="authPage">
      <div className="authShell">
        <section className="card authPanelCard">
          <BrandMark compact subtitle="Oturum hazırlanıyor" centered />
          <div className="authPanelHeader">
            <div className="authPanelKicker">Yükleniyor</div>
            <div className="authPanelTitle">Oturum bilgileri doğrulanıyor</div>
            <div className="authPanelLead">
              Sefer Abi kısayolu hazır; ana panel birkaç saniye sonra açılacak.
            </div>
          </div>

          <button
            className="authSubmit authLoadingLauncher"
            type="button"
            onClick={() => navigate(fallbackCopilotPath(path))}
          >
            Sefer Abi’ye Sor
          </button>

          <div className="authDemoFoot">
            Oturum doğrulaması tamamlanana kadar bu geçici yüzey görünür.
          </div>
        </section>
      </div>
    </div>
  );
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
    <div className="authPage">
      <div className="authShell">
        <section className="card authHeroCard">
          <div className="authHeroSurface">
            <div className="authHeroIntro">
              <div className="authKickerRow">
                <span className="authKickerPill">Final marka sistemi</span>
                <span className="authKickerPill authKickerPill--ghost">SP + kalkan + iş birliği</span>
              </div>
              <BrandMark
                variant="login"
                subtitle="Servis tedarikinden vardiyaya tek akış."
                centered
              />
              <h1 className="authHeroTitle">Operasyon akışını tek girişte topla.</h1>
              <p className="authHeroLead">
                Canlı GPS, kanıt ve kalite kontrolü aynı yerde; hakediş ve maliyet riskleri için güvenli önizleme,
                Sefer Abi ile rol bazlı operasyon desteğiyle birlikte sunulur.
              </p>
              <div className="authHeroPills" aria-label="Login promise highlights">
                <span className="authHeroMiniPill">Güvenli giriş</span>
                <span className="authHeroMiniPill">Rol bazlı akış</span>
                <span className="authHeroMiniPill">Demo hazırlıklı</span>
                <span className="authHeroMiniPill">Mobil dostu</span>
              </div>
            </div>

            <div className="authHighlightsGrid">
              {LOGIN_HIGHLIGHTS.map((item) => (
                <article key={item.title} className="authHighlightCard">
                  <div className="authHighlightTitle">{item.title}</div>
                  <div className="authHighlightBody">{item.body}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="card authPanelCard">
          <BrandMark compact subtitle="Kurumsal giriş ve demo oturumu" centered />
          <div className="authPanelHeader">
            <div className="authPanelKicker">Giriş</div>
            <div className="authPanelTitle">SeferPakt hesabınla devam et</div>
            <div className="authPanelLead">
              Rolüne uygun panele geçmek için kullanıcı adı, e-posta ya da sürücü kodunu kullanabilirsin.
            </div>
          </div>

          <form className="authForm" onSubmit={onLogin}>
            <label className="authField">
              <span>Kullanıcı Adı, E-posta veya Sürücü Kodu</span>
              <input
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="halil.butun, room@demo.com veya SRC-000001"
              />
            </label>
            <label className="authField">
              <span>Şifre veya PIN</span>
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button className="authSubmit" type="submit" disabled={busy}>
              {busy ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>

            {err ? (
              <div className="authError" role="alert">
                {err}
              </div>
            ) : null}
          </form>

          <details className="authDemoDetails">
            <summary>Demo erişim bilgileri: demo kullanıcılar için</summary>
            <div className="authDemoDetailsBody">
              <div className="authDemoSummary">
                Demo kullanıcılar ve demo hesapları varsayılan olarak kapalı bir açıklama alanında tutulur; ana giriş aksiyonunu
                gölgelememeleri için ikincil öncelikte sunulur.
              </div>
              <ul className="authDemoList">
                <li><strong>Room:</strong> room@demo.com / demo123</li>
                <li><strong>Company:</strong> company@demo.com / demo123</li>
                <li><strong>School:</strong> school@demo.com / demo123</li>
                <li><strong>Organization:</strong> organization@demo.com / demo123</li>
                <li><strong>Driver:</strong> driver@demo.com / demo123</li>
                <li><strong>Personel:</strong> personel@demo.com / demo123</li>
              </ul>
              <div className="authDemoFoot">
                Sürücü akışında ayrıca Sürücü Kodu + PIN girişi desteklenir.
              </div>
            </div>
          </details>
        </section>
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
  }, [token, me, me?.role, me?.requirePasswordChange, path]);

  const view = useMemo(() => {
    if (!token) {
      if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };
      if (cleanPath === "/accept-parent-invite") return { layout: false, node: <AcceptParentInvitePanel path={path} /> };
      if (cleanPath === "/public/passenger-live" || cleanPath === "/public/personel-live") return { layout: false, node: <PassengerLivePanel path={path} /> };
      return { layout: false, node: <LoginCard /> };
    }
    if (!me) return { layout: false, node: <SessionLoadingCard path={cleanPath} /> };

    if (me.requirePasswordChange && cleanPath !== "/auth/change-password") {
      navigate("/auth/change-password");
      return { layout: false, node: <div style={{ padding: 16 }}>Şifre değiştirme ekranına yönlendiriliyor...</div> };
    }

    if (cleanPath === "/auth/change-password") {
      return { layout: false, node: <ForcePasswordChangePanel /> };
    }

    if (me.role === "DRIVER" && me.requirePinChange && path !== "/driver/change-pin") {
      navigate("/driver/change-pin");
      return { layout: true, node: <div style={{ padding: 16 }}>PIN ekranına yönlendiriliyor...</div> };
    }

    // Shared
    if (path === "/shared/notifications") return { layout: true, node: <NotificationsPanel /> };
    if (path === "/shared/logs") return { layout: true, node: <LogsPanel /> };
    if (path === "/shared/feedback") return { layout: true, node: <FeedbackLoopPanel /> };
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
    if (path === "/room/copilot") return { layout: true, node: <CopilotPanel /> };

    // COMPANY
    if (path === "/company") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/company/operations") return { layout: true, node: <CompanyOperationsPanel /> };
    if (path === "/company/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/company/commercial-flow") return { layout: true, node: <CompanyCommercialFlowPanel /> };
    if (path === "/company/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/company/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/company/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/company/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/company/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/company/personel-access") return { layout: true, node: <PersonelAccessPanel /> };
    if (path === "/company/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/company/service-evaluation") return { layout: true, node: <ServiceEvaluationPanel /> };
    if (path === "/company/copilot") return { layout: true, node: <CopilotPanel /> };

    // SCHOOL (Company.kind=SCHOOL)
    if (path === "/school") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/school/operations") return { layout: true, node: <SchoolOperationsPanel /> };
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
    if (path === "/school/copilot") return { layout: true, node: <CopilotPanel /> };


    // ORGANIZATION (Company.kind=ORGANIZATION)
    if (path === "/organization") return { layout: true, node: <CompanyWorkflowPanel /> };
    if (path === "/organization/operations") return { layout: true, node: <CompanyOperationsPanel /> };
    if (path === "/organization/plans") return { layout: true, node: <OrganizationPlansPanel /> };
    if (path === "/organization/map") return { layout: true, node: <CompanyMapPanel /> };
    if (path === "/organization/commercial-flow") return { layout: true, node: <CompanyCommercialFlowPanel /> };
    if (path === "/organization/shifts") return { layout: true, node: <CompanyShiftsPanel /> };
    if (path === "/organization/georeview") return { layout: true, node: <GeoReviewPanel /> };
    if (path === "/organization/agreements") return { layout: true, node: <CompanyAgreementsPanel /> };
    if (path === "/organization/hub") return { layout: true, node: <CompanyHubPanel /> };
    if (path === "/organization/checkin") return { layout: true, node: <CompanyCheckinPanel /> };
    if (path === "/organization/personel-access") return { layout: true, node: <PersonelAccessPanel /> };
    if (path === "/organization/access-links") return { layout: true, node: <PassengerLinksPanel /> };
    if (path === "/organization/service-evaluation") return { layout: true, node: <ServiceEvaluationPanel /> };
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
    if (path === "/superadmin/operations") return { layout: true, node: <SuperOperationsPanel /> };
    if (path === "/superadmin/acceptance") return { layout: true, node: <SuperFieldAcceptancePanel /> };
    if (path === "/superadmin/ssot-alignment") return { layout: true, node: <SuperSsotAlignmentPanel /> };
    if (path === "/superadmin/commercial-core") return { layout: true, node: <SuperCommercialCorePanel /> };
    if (path === "/superadmin/trust-quality") return { layout: true, node: <SuperTrustQualityPanel /> };
    if (path === "/superadmin/natural-copilot") return { layout: true, node: <SuperNaturalCopilotPanel /> };
    if (path === "/superadmin/pilot-launch-gate") return { layout: true, node: <SuperPilotLaunchGatePanel /> };
    if (path === "/superadmin/operation-verification") return { layout: true, node: <SuperOperationVerificationPanel /> };
    if (path === "/superadmin/onboarding-review") return { layout: true, node: <SuperPublicLeadReviewPanel /> };
    if (path === "/superadmin/public-leads") return { layout: true, node: <SuperPublicLeadReviewPanel /> };
    if (path === "/superadmin/copilot") return { layout: true, node: <CopilotPanel /> };

    // Unknown: go default
    const def = roleDefaultPath(me);
    navigate(def);
    return { layout: true, node: <div style={{ padding: 16 }}>Redirecting...</div> };
  }, [token, me, path, cleanPath]);

  if (!view.layout) return view.node;

  const routeResetKey = cleanPath || path || "default";

  return (
    <AppShell path={path}>
      <ErrorBoundary resetKey={routeResetKey}>
        <Suspense key={routeResetKey} fallback={<div style={{ padding: 16 }}>Yükleniyor...</div>}>
          {view.node}
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
