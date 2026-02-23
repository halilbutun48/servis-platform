// web/src/layout/NavDock.jsx
import { navigate } from "../router";

function Item({ label, path, active, badge }) {
  return (
    <button
      type="button"
      className={active ? "nav-item active" : "nav-item"}
      onClick={() => navigate(path)}
      title={label}
    >
      <span>{label}</span>
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );
}

export default function NavDock({ role, path }) {
  const items = [];

  if (role === "ROOM") {
    items.push({ label: "Map", path: "/room/map" });
    items.push({ label: "Vehicles", path: "/room/vehicles" });
    items.push({ label: "Drivers", path: "/room/drivers" });
    items.push({ label: "Shifts", path: "/room/shifts" });
    items.push({ label: "Agreements", path: "/room/agreements" });
    items.push({ label: "Offers", path: "/room/offers" });
    items.push({ label: "Notifications", path: "/shared/notifications" });
  } else if (role === "COMPANY") {
    // ✅ M26: workflow-first (minimum confusion)
    items.push({ label: "Home", path: "/company" });
    items.push({ label: "Agreements", path: "/company/agreements" });
    items.push({ label: "Shifts", path: "/company/shifts" });
    items.push({ label: "Geo Review", path: "/company/georeview" });
    items.push({ label: "Map", path: "/company/map" });
    items.push({ label: "Notifications", path: "/shared/notifications" });
  } else if (role === "DRIVER") {
    items.push({ label: "Map", path: "/driver/map" });
    items.push({ label: "Route", path: "/driver/route" });
    items.push({ label: "Notifications", path: "/shared/notifications" });
  } else if (role === "PERSONEL") {
    items.push({ label: "Live", path: "/personel/live" });
    items.push({ label: "My Ride", path: "/personel/my" });
    items.push({ label: "Notifications", path: "/shared/notifications" });
  } else if (role === "SUPER_ADMIN") {
    items.push({ label: "Overview", path: "/superadmin" });
    items.push({ label: "Companies", path: "/superadmin/companies" });
    items.push({ label: "Rooms", path: "/superadmin/rooms" });
  }

  return (
    <div className="nav">
      <div className="nav-role">{role}</div>
      <div className="nav-items">
        {items.map((it) => (
          <Item key={it.path} label={it.label} path={it.path} active={path === it.path} badge={it.badge} />
        ))}
      </div>
    </div>
  );
}
