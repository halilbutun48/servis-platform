//web/src/layout/AppShell.jsx
import { useEffect, useRef, useState } from "react";
import NavDock from "./NavDock";
import KvkkConsentGate from "../panels/shared/KvkkConsentGate";
import TotpStepUpCard from "../panels/shared/TotpStepUpCard";
import { useSession } from "../state/session";
import TabletOpsQuickBar from "../components/TabletOpsQuickBar";
import BrandMark from "../components/BrandMark";
import FloatingCopilotDrawer from "../components/copilot/FloatingCopilotDrawer";
import { BRAND_NAME } from "../config/brand.js";
import { getStepUpProvider, isStepUpEnabled } from "../utils/stepUp";
import { roleLabelForUser } from "../utils/labels";
import { CopilotRouteContext } from "../copilot/routeContext";

export default function AppShell({ path, routeContext, children }) {
  const { me, logout } = useSession();
  const role = me?.role || "-";
  const roleDisplayLabel = roleLabelForUser(me || role);
  const isSchool = role === "COMPANY" && me?.companyKind === "SCHOOL";
  const isOrganization = role === "COMPANY" && me?.companyKind === "ORGANIZATION";
  const isTabletOpsRole = role === "ROOM" || role === "COMPANY";
  const isRoomFinanceRoute = /^\/room\/financial-operations(?:\?|$)/.test(String(path || ""));
  const isAgreementsDetailRoute = /\/(company|organization|school|room)\/agreements(?:\?|$)/.test(String(path || ""));
  const stepUpProvider = getStepUpProvider();
  const shouldShowStepUpCard = isStepUpEnabled() && stepUpProvider !== "none";
  const [mobileNavPath, setMobileNavPath] = useState(null);
  const mobileNavOpen = mobileNavPath === path;
  const mobileNavTriggerRef = useRef(null);
  const previousMobileNavOpenRef = useRef(false);

  // Map and Copilot pages should be fluid (full width). Everything else is centered for readability.
  const fluidPath = String(path || "");
  const isFluid = fluidPath.includes("/map") || /\/(copilot|natural-copilot)$/.test(fluidPath);
  const isMapPrimary = fluidPath.includes("/map");
  const hasCopilotDrawer = Boolean(me) && !/\/(copilot|natural-copilot)$/.test(fluidPath);
  const shellHeadline = /\/room\/shifts(?:\?|$)/.test(fluidPath) ? "Vardiyalar" : BRAND_NAME;

  useEffect(() => {
    if (!mobileNavOpen || typeof document === "undefined") return undefined;
    function handleMobileNavKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMobileNavPath(null);
      window.requestAnimationFrame(() => mobileNavTriggerRef.current?.focus());
    }

    document.addEventListener("keydown", handleMobileNavKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleMobileNavKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (previousMobileNavOpenRef.current && !mobileNavOpen && typeof window !== "undefined") {
      window.requestAnimationFrame(() => mobileNavTriggerRef.current?.focus());
    }
    previousMobileNavOpenRef.current = mobileNavOpen;
  }, [mobileNavOpen]);

  const shellClasses = [
    isTabletOpsRole ? "shell shell--tablet-ops" : "shell",
    isAgreementsDetailRoute ? "shell--agreements-detail" : null,
    isMapPrimary ? "shell--map-primary" : null,
    hasCopilotDrawer ? "shell--has-copilot-fab" : null,
    mobileNavOpen ? "shell--nav-open" : null,
  ].filter(Boolean).join(" ");

  return (
    <CopilotRouteContext.Provider value={routeContext}>
    <div className={shellClasses} data-role={role}>
      <NavDock
        role={role}
        path={path}
        me={me}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavPath(null)}
      />
      <div className="shellMain">
        <header className="shellTop">
          <button
            type="button"
            className="btn sm shellTopMenu"
            ref={mobileNavTriggerRef}
            onClick={() => setMobileNavPath((current) => (current === path ? null : path))}
            aria-expanded={mobileNavOpen}
            aria-controls="shell-nav-dock"
            aria-label={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}
            title={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}
          >
            Menü
          </button>
          <div className="shellTopBrand" aria-label="SeferPakt">
            <BrandMark size={40} variant="mark" className="shellTopCompactMark" />
          </div>
          <div className="shellTopMeta">
            <div className="title">{shellHeadline}</div>
            <div className="muted">
              {isSchool
                ? "Okul operasyonu"
                : isOrganization
                  ? "Organizasyon operasyonu"
                  : role === "PARENT"
                    ? "Veli servis takibi"
                    : role === "SUPER_ADMIN"
                      ? "Sistem yönetimi"
                      : "Personel servis operasyonu"}
            </div>
            <div className="muted">
              {me?.email || "-"} • {roleDisplayLabel}
            </div>
          </div>
          <button className="btn sm shellTopLogout" onClick={logout}>
            Çıkış
          </button>
        </header>
        <div className="shellContent">
          <div className={isFluid ? "page page--fluid" : "page"}>
            {shouldShowStepUpCard ? <TotpStepUpCard /> : null}
            <KvkkConsentGate />
            {isTabletOpsRole && !isRoomFinanceRoute ? <TabletOpsQuickBar role={role} me={me} path={path} /> : null}
            {children}
            <FloatingCopilotDrawer path={path} routeContext={routeContext} />
          </div>
        </div>
      </div>
    </div>
    </CopilotRouteContext.Provider>
  );
}
