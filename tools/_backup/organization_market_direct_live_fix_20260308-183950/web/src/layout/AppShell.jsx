//web/src/layout/AppShell.jsx
import NavDock from "./NavDock";
import KvkkConsentGate from "../panels/shared/KvkkConsentGate";
import { useSession } from "../state/session";

export default function AppShell({ path, children }) {
  const { me, logout } = useSession();
  const role = me?.role || "-";
  const isSchool = role === "COMPANY" && me?.companyKind === "SCHOOL";
  const isOrganization = role === "COMPANY" && me?.companyKind === "ORGANIZATION";

  // Map pages should be fluid (full width). Everything else is centered for readability.
  const isFluid = String(path || "").includes("/map");

  return (
    <div className="shell">
      <NavDock role={role} path={path} me={me} />
      <div className="shellMain">
        <div className="shellTop">
          <div>
            <div className="title">{isSchool ? "Okul-Servis V1" : isOrganization ? "Organization-Servis V1" : "Personel-Servis V1"}</div>
            <div className="muted">
              {me?.email || "-"} • {isSchool ? "SCHOOL" : isOrganization ? "ORGANIZATION" : role}
            </div>
          </div>
          <button className="btn sm" onClick={logout}>
            Çıkış
          </button>
        </div>
        <div className="shellContent">
          <div className={isFluid ? "page page--fluid" : "page"}>{children}
      </div>
        </div>
      </div>
    </div>
  );
}
