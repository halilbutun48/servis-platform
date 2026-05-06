//web/src/layout/AppShell.jsx
import NavDock from "./NavDock";
import KvkkConsentGate from "../panels/shared/KvkkConsentGate";
import TotpStepUpCard from "../panels/shared/TotpStepUpCard";
import { useSession } from "../state/session";
import TabletOpsQuickBar from "../components/TabletOpsQuickBar";
import BrandMark from "../components/BrandMark";
import FloatingCopilotDrawer from "../components/copilot/FloatingCopilotDrawer";
import { BRAND_NAME } from "../config/brand.js";

export default function AppShell({ path, children }) {
  const { me, logout } = useSession();
  const role = me?.role || "-";
  const isSchool = role === "COMPANY" && me?.companyKind === "SCHOOL";
  const isOrganization = role === "COMPANY" && me?.companyKind === "ORGANIZATION";
  const isTabletOpsRole = role === "ROOM" || role === "COMPANY";

  // Map and Copilot pages should be fluid (full width). Everything else is centered for readability.
  const fluidPath = String(path || "");
  const isFluid = fluidPath.includes("/map") || /\/(copilot|natural-copilot)$/.test(fluidPath);

  return (
    <div className={isTabletOpsRole ? "shell shell--tablet-ops" : "shell"} data-role={role}>
      <NavDock role={role} path={path} me={me} />
      <div className="shellMain">
        <div className="shellTop">
          <div className="shellTopBrand"><BrandMark compact subtitle="Operasyon paneli" /></div>
          <div className="shellTopMeta">
            <div className="title">{BRAND_NAME}</div>
            <div className="muted">
              {isSchool ? "Okul operasyonu" : isOrganization ? "Organizasyon operasyonu" : "Personel servis operasyonu"}
            </div>
            <div className="muted">
              {me?.email || "-"} • {isSchool ? "SCHOOL" : isOrganization ? "ORGANIZATION" : role}
            </div>
          </div>
          <button className="btn sm shellTopLogout" onClick={logout}>
            Çıkış
          </button>
        </div>
        <div className="shellContent">
          <div className={isFluid ? "page page--fluid" : "page"}>
            <TotpStepUpCard />
            <KvkkConsentGate />
            {isTabletOpsRole ? <TabletOpsQuickBar role={role} me={me} path={path} /> : null}
            {children}
            <FloatingCopilotDrawer path={path} />
          </div>
        </div>
      </div>
    </div>
  );
}
