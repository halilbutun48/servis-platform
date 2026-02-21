//web/src/layout/AppShell.jsx
import NavDock from "./NavDock";
import { useSession } from "../state/session";

export default function AppShell({ path, children }) {
  const { me, logout } = useSession();
  const role = me?.role || "-";

  return (
    <div className="shell">
      <NavDock role={role} path={path} />
      <div className="shellMain">
        <div className="shellTop">
          <div>
            <div className="title">Personel-Servis V1</div>
            <div className="muted">{me?.email || "-"} • {role}</div>
          </div>
          <button onClick={logout}>Çıkış</button>
        </div>
        <div className="shellContent">{children}</div>
      </div>
    </div>
  );
}
