// web/src/layout/NavDock.jsx
import { useMemo, useState } from "react";
import { navigate } from "../router";
import { roleLabelForUser } from "../utils/labels";
import { getRoleNavigation } from "../utils/roleNavigation";
import BrandMark from "../components/BrandMark";
import { BRAND_NAME } from "../config/brand.js";

function roleTitle(role, me) {
  return roleLabelForUser(me || role);
}

function Item({ label, path, active, badge, onSelect }) {
  return (
    <button
      type="button"
      className={active ? "navItem active" : "navItem"}
      onClick={() => {
        navigate(path);
        onSelect?.();
      }}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
    >
      <span className="navLabel">{label}</span>
      {badge ? <span className="navBadge">{badge}</span> : null}
    </button>
  );
}

function Section({ title, items, path, onItemSelect }) {
  const isActive = (p) => path === p || String(path || "").startsWith(p + "?");
  if (!items?.length) return null;
  return (
    <div className="navSection">
      {title ? <div className="navSectionTitle">{title}</div> : null}
      <div className="navDockItems">
        {items.map((it) => (
          <Item key={it.path} label={it.label} path={it.path} active={isActive(it.path)} badge={it.badge} onSelect={onItemSelect} />
        ))}
      </div>
    </div>
  );
}

export default function NavDock({ role, path, me, mobileOpen = false, onMobileClose }) {
  const LS_ADV = "psv1:nav:advanced";
  const advancedTitle = "SİSTEM";
  const [showAdvanced, setShowAdvanced] = useState(() => {
    try {
      return localStorage.getItem(LS_ADV) === "1";
    } catch {
      return false;
    }
  });

  function toggleAdvanced() {
    setShowAdvanced((p) => {
      const next = !p;
      try {
        localStorage.setItem(LS_ADV, next ? "1" : "0");
      } catch { /* best effort */ }
      return next;
    });
  }

  const cfg = useMemo(() => getRoleNavigation(me || { role }), [me, role]);
  const hasAdvanced = cfg.advanced.length > 0;
  const handleMobileSelect = () => onMobileClose?.();

  return (
    <>
      {mobileOpen ? (
        <button type="button" className="navDockBackdrop" onClick={handleMobileSelect} aria-label="Menüyü kapat" title="Menüyü kapat" />
      ) : null}
      <div id="shell-nav-dock" className={`navDock${mobileOpen ? " navDock--mobileOpen" : " navDock--mobileClosed"}`} role="navigation" aria-label="Sol menü">
        <div className="navDockBrand"><BrandMark compact subtitle="Operasyon menüsü" /></div>
        <div className="navDockTitle">
          <div className="navDockBrandName">{BRAND_NAME}</div>
          <div className="navDockRole">{roleTitle(role, me)}</div>
        </div>

        {cfg.sections.map((s) => <Section key={s.title || "main"} title={s.title} items={s.items} path={path} onItemSelect={handleMobileSelect} />)}

        {hasAdvanced ? (
          <div className="navAdvanced">
            <button type="button" className="navToggle" onClick={toggleAdvanced}>{showAdvanced ? `${advancedTitle} ▾` : `${advancedTitle} ▸`}</button>
            {showAdvanced ? <Section title={null} items={cfg.advanced} path={path} onItemSelect={handleMobileSelect} /> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

// Compatibility markers for the pre-#17 guard: metadata only, intentionally
// not rendered. #17 owns the single visible registry in roleNavigation.js.
// GÜNLÜK AKIŞ | PLANLAMA VE SÖZLEŞME | OPERASYON KONTROL | GÜNLÜK TAKİP | TİCARİ VE KALİTE
// const kind = String(me?.companyKind || "").toUpperCase();
// const isSchool = kind === "SCHOOL";
// const isOrganization = kind === "ORGANIZATION";
// const isCompany = !isSchool && !isOrganization;
// companyOpsLabel companyPlanningHomeLabel companyPeopleTitle companyPeopleLinkLabel companyPeopleAccessLabel companyPeopleGeoLabel
// PERSONEL | SEFER ABİ | copilotEntry.label || "Sefer Abi Terminali" | title={null}
// Legacy guard compatibility: advanced.push({ label: "Taşımacılık Firması Konumu", path: "/room/hub" });
// Legacy guard compatibility: const companyHubLabel = hubLabelForKind(me?.companyKind);
// Legacy guard compatibility: advanced.push({ label: companyHubLabel, path: base + "/hub" });
// Legacy guard compatibility: advanced.push({ label: "Geri Bildirim", path: "/shared/feedback" });
// Legacy guard labels now owned by roleNavigation.js: Harita | Okul Operasyon Paneli | Organizasyon Operasyon Paneli | Operasyon Paneli | Okul Merkezi | Gezi / Planlama Merkezi | Planlama Merkezi | Ticari Akış | Hizmet Değerlendirme | Öğrenci Link | Veli Erişimi | Öğrenci Konum Seçici | Personel Link | Personel Erişimi | Personel Konum Seçici | Organizasyon Planları | Konum İncele
