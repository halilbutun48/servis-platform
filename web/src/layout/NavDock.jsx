// web/src/layout/NavDock.jsx
import { useEffect, useMemo, useState } from "react";
import { navigate } from "../router";
import { companyBase } from "../utils/paths";

function Item({ label, path, active, badge }) {
  return (
    <button
      type="button"
      className={active ? "navItem active" : "navItem"}
      onClick={() => navigate(path)}
      title={label}
    >
      <span className="navLabel">{label}</span>
      {badge ? <span className="navBadge">{badge}</span> : null}
    </button>
  );
}

function Section({ title, items, path }) {
  const isActive = (p) => path === p || String(path || "").startsWith(p + "?");
  if (!items?.length) return null;
  return (
    <div className="navSection">
      {title ? <div className="navSectionTitle">{title}</div> : null}
      <div className="navDockItems">
        {items.map((it) => (
          <Item key={it.path} label={it.label} path={it.path} active={isActive(it.path)} badge={it.badge} />
        ))}
      </div>
    </div>
  );
}

export default function NavDock({ role, path, me }) {
  const LS_ADV = "psv1:nav:advanced";
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ADV);
      setShowAdvanced(raw === "1");
    } catch {
      setShowAdvanced(false);
    }
  }, []);

  function toggleAdvanced() {
    setShowAdvanced((p) => {
      const next = !p;
      try {
        localStorage.setItem(LS_ADV, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const cfg = useMemo(() => {
    const sections = [];
    const advanced = [];

    const base = role === "COMPANY" ? companyBase(me) : "";

    if (role === "ROOM") {
      sections.push({
        title: "Ana",
        items: [
          { label: "Rehber", path: "/room/copilot", badge: "Yeni" },
          { label: "Canlı Takip", path: "/room/map" },
          { label: "Teklifler", path: "/room/offers" },
          { label: "Vardiyalar", path: "/room/shifts" },
        ],
      });
      sections.push({
        title: "Operasyon",
        items: [          { label: "Araçlar", path: "/room/vehicles" },
          { label: "Sürücüler", path: "/room/drivers" },
          { label: "Raporlar", path: "/room/reports" },
        ],
      });
      // Sözleşmeler: Gelişmiş altında
      advanced.push({ label: "Sözleşmeler", path: "/room/agreements" });
      advanced.push({ label: "Hub", path: "/room/hub" });
      advanced.push({ label: "Check-in", path: "/room/checkin" });
      advanced.push({ label: "Giriş Davetleri", path: "/room/auth-invites" });
      advanced.push({ label: "KVKK", path: "/shared/kvkk" });
      advanced.push({ label: "Log Export", path: "/shared/logs" });
      advanced.push({ label: "Bildirimler", path: "/shared/notifications" });
    } else if (role === "COMPANY") {
      sections.push({
        title: "Ana",
        items: [
          { label: "Rehber", path: base + "/copilot", badge: "Yeni" },
          { label: "Harita", path: base + "/map" },
          { label: me?.companyKind === "SCHOOL" ? "Okul Merkezi" : "Planlama Merkezi", path: base },
          { label: "Vardiyalar", path: base + "/shifts" },
          { label: "Raporlar", path: base + "/reports" },
        ],
      });
      // Sözleşmeler: Gelişmiş altında
      advanced.push({ label: "Sözleşmeler", path: base + "/agreements" });
      advanced.push({ label: "Hub", path: base + "/hub" });
      advanced.push({ label: "Check-in", path: base + "/checkin" });
      advanced.push({ label: me?.companyKind === "SCHOOL" ? "Öğrenci Link" : "Personel Link", path: base + "/access-links" });
      advanced.push({ label: me?.companyKind === "SCHOOL" ? "Hesap Davetleri" : "Giriş Davetleri", path: base + "/auth-invites" });
      if (me?.companyKind === "SCHOOL") advanced.push({ label: "Parent Link", path: "/school/parents" });
      advanced.push({ label: me?.companyKind === "SCHOOL" ? "Öğrenci Konum İncele" : me?.companyKind === "ORGANIZATION" ? "Lokasyon İncele" : "Konum İncele", path: base + "/georeview" });
      advanced.push({ label: "KVKK", path: "/shared/kvkk" });
      advanced.push({ label: "Log Export", path: "/shared/logs" });
      advanced.push({ label: "Bildirimler", path: "/shared/notifications" });
    } else if (role === "DRIVER") {
      sections.push({
        title: "",
        items: [
          { label: "Rehber", path: "/driver/copilot", badge: "Yeni" },
          { label: "Bugün", path: "/driver/today" },
          { label: "Rota", path: "/driver/route" },
          { label: "Harita", path: "/driver/map" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Export", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "PERSONEL") {
      sections.push({
        title: "",
        items: [
          { label: "Rehber", path: "/personel/copilot", badge: "Yeni" },
          { label: "Canlı", path: "/personel/live" },
          { label: "Servisim", path: "/personel/my" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Export", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "PARENT") {
      sections.push({
        title: "",
        items: [
          { label: "Rehber", path: "/parent/copilot", badge: "Yeni" },
          { label: "Canlı", path: "/parent/live" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Export", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "SUPER_ADMIN") {
      sections.push({
        title: "",
        items: [
          { label: "Rehber", path: "/superadmin/copilot", badge: "Yeni" },
          { label: "Overview", path: "/superadmin" },
          { label: "Companies", path: "/superadmin/companies" },
          { label: "Rooms", path: "/superadmin/rooms" },
          { label: "Users", path: "/superadmin/users" },
          { label: "Regions", path: "/superadmin/regions" },
          { label: "Audit", path: "/superadmin/audit" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Export", path: "/superadmin/logexport" },
        ],
      });
    }

    return { sections, advanced };
  }, [role, me]);

  const hasAdvanced = cfg.advanced.length > 0;

  return (
    <div className="navDock">
      <div className="navDockTitle">{role === "COMPANY" && me?.companyKind === "SCHOOL" ? "SCHOOL" : role === "COMPANY" && me?.companyKind === "ORGANIZATION" ? "ORGANIZATION" : role}</div>

      {cfg.sections.map((s) => (
        <Section key={s.title || "main"} title={s.title} items={s.items} path={path} />
      ))}

      {hasAdvanced ? (
        <div className="navAdvanced">
          <button type="button" className="navToggle" onClick={toggleAdvanced}>
            {showAdvanced ? "Gelişmiş ▾" : "Gelişmiş ▸"}
          </button>
          {showAdvanced ? <Section title={null} items={cfg.advanced} path={path} /> : null}
        </div>
      ) : null}
    </div>
  );
}

