import { navigate } from "../router";
import { companyBase } from "../utils/paths";

function Item({ label, path, active }) {
  return (
    <button
      type="button"
      className={active ? "secondary tabletQuickButton is-active" : "secondary tabletQuickButton"}
      onClick={() => navigate(path)}
    >
      {label}
    </button>
  );
}

export default function TabletOpsQuickBar({ role, me, path }) {
  if (role !== "ROOM" && role !== "COMPANY") return null;

  const base = role === "COMPANY" ? companyBase(me) : "";
  const items =
      role === "ROOM"
      ? [
          { label: "Canlı Takip", path: "/room/map" },
          { label: "Teklifler", path: "/room/offers" },
          { label: "Vardiyalar", path: "/room/shifts" },
          { label: "Sürücüler", path: "/room/drivers" },
          { label: "Check-in", path: "/room/checkin" },
        ]
      : [
          { label: "Harita", path: base + "/map" },
          { label: "Operasyon", path: base + "/operations" },
          { label: "Merkez", path: base },
          { label: "Vardiyalar", path: base + "/shifts" },
          { label: "Check-in", path: base + "/checkin" },
        ];

  return (
    <div className="tabletQuickBar" data-role={role}>
      <div className="tabletQuickTitle">
        {role === "ROOM" ? "Tablet kısa işlemler" : "Tablet hızlı işlemler"}
      </div>
      <div className="tabletQuickGrid">
        {items.map((it) => (
          <Item key={it.path} label={it.label} path={it.path} active={path === it.path} />
        ))}
      </div>
      <div className="muted tabletQuickHint">
        Bu alan M48.5 temelidir. Room / Company için aynı web uygulaması tablet kullanımında daha hızlı dolaşım verecek şekilde açılır.
      </div>
    </div>
  );
}
