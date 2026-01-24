import { navigate } from "../router";

function Item({ label, path, active, badge }) {
  return (
    <button
      className={active ? "navItem active" : "navItem"}
      onClick={() => navigate(path)}
      title={label}
    >
      <span className="navLabel">{label}</span>
      {badge ? <span className="navBadge">{badge}</span> : null}
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
    items.push({ label: "Notifications", path: "/shared/notifications" });
  } else if (role === "COMPANY") {
    items.push({ label: "Map", path: "/company/map" });
    items.push({ label: "Shifts", path: "/company/shifts" });
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
  }

  return (
    <div className="navDock">
      <div className="navDockTitle">{role}</div>
      <div className="navDockItems">
        {items.map((it) => (
          <Item key={it.path} label={it.label} path={it.path} active={path === it.path} badge={it.badge} />
        ))}
      </div>
    </div>
  );
}
