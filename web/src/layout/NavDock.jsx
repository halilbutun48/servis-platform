// web/src/layout/NavDock.jsx
import { useMemo, useState } from "react";
import { navigate } from "../router";
import { companyBase } from "../utils/paths";
import { hubLabelForKind, roleLabelForUser } from "../utils/labels";
import { getCopilotMenuEntry } from "../copilot/screenRegistry";
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
      } catch { /* no-op: advanced mode preference is best-effort */ }
      return next;
    });
  }

  const cfg = useMemo(() => {
    const sections = [];
    const advanced = [];
    const dailyFlowTitle = "GÜNLÜK AKIŞ";
    const planningTitle = "PLANLAMA VE SÖZLEŞME";
    const operationsTitle = "OPERASYON KONTROL";
    const seferAbiTitle = "SEFER ABİ";

    const base = role === "COMPANY" ? companyBase(me) : "";
    const kind = String(me?.companyKind || "").toUpperCase();
    const isSchool = kind === "SCHOOL";
    const isOrganization = kind === "ORGANIZATION";
    const isCompany = !isSchool && !isOrganization;
    const companyOpsLabel = isCompany
      ? "Operasyon Paneli"
      : isSchool
        ? "Okul Operasyon Paneli"
        : "Organizasyon Operasyon Paneli";
    const companyPlanningHomeLabel = isSchool
      ? "Okul Merkezi"
      : isOrganization
        ? "Gezi / Planlama Merkezi"
        : "Planlama Merkezi";
    const companyPeopleTitle = isSchool
      ? "ÖĞRENCİ VE VELİ"
      : isOrganization
        ? "KATILIMCI VE KONUM"
        : "Personel";
    const companyPeopleLinkLabel = isSchool ? "Öğrenci Link" : "Personel Link";
    const companyPeopleAccessLabel = isSchool ? "Veli Erişimi" : "Personel Erişimi";
    const companyPeopleGeoLabel = isSchool
      ? "Öğrenci Konum Seçici"
      : isOrganization
        ? "Konum İncele"
        : "Personel Konum Seçici";
    const financialOperationsLabel = "Bütçe ve Servis Maliyeti";
    const companyHubLabel = hubLabelForKind(me?.companyKind);
    const copilotEntry = getCopilotMenuEntry({ role, companyKind: me?.companyKind });
    const feedbackEntry = { label: "Geri Bildirim", path: "/shared/feedback" };
    const copilotSection = {
      title: seferAbiTitle,
      items: [{ label: copilotEntry.label || "Sefer Abi Terminali", path: copilotEntry.path }],
    };

    if (role === "ROOM") {
      sections.push({
        title: dailyFlowTitle,
        items: [
          { label: "Canlı Takip", path: "/room/map" },
          { label: "Ticari Akışım", path: "/room/commercial-flow" },
        ],
      });
      sections.push({
        title: planningTitle,
        items: [
          { label: "Teklifler", path: "/room/offers" },
          { label: "Vardiyalar", path: "/room/shifts" },
          { label: "Sözleşmeler", path: "/room/agreements" },
        ],
      });
      sections.push({
        title: operationsTitle,
        items: [
          { label: "Finansal Operasyonlar", path: "/room/financial-operations" },
          { label: "Operasyon Sağlığı", path: "/room/operation-health" },
          { label: "Araçlar", path: "/room/vehicles" },
          { label: "Sürücüler", path: "/room/drivers" },
          { label: "Raporlar", path: "/room/reports" },
        ],
      });
      advanced.push({ label: "Taşımacılık Firması Konumu", path: "/room/hub" });
      advanced.push({ label: "Check-in", path: "/room/checkin" });
      advanced.push({ label: "KVKK", path: "/shared/kvkk" });
      advanced.push({ label: "Log Dışa Aktarımı", path: "/shared/logs" });
      advanced.push({ label: "Bildirimler", path: "/shared/notifications" });
      advanced.push(feedbackEntry);
    } else if (role === "COMPANY") {
      sections.push({
        title: "GÜNLÜK TAKİP",
        items: [
          { label: "Harita", path: base + "/map" },
          { label: companyOpsLabel, path: base + "/operations" },
        ],
      });
      sections.push({
        title: "PLANLAMA VE SÖZLEŞME",
        items: [
          { label: companyPlanningHomeLabel, path: base },
          ...(isOrganization ? [{ label: "Organizasyon Planları", path: base + "/plans" }] : []),
          ...((isSchool || isOrganization) ? [{ label: "Planlama Senaryosu", path: base + "/cost-scenarios" }] : []),
          { label: "Vardiyalar", path: base + "/shifts" },
          { label: "Sözleşmeler", path: base + "/agreements" },
        ],
      });
      sections.push({
        title: "TİCARİ VE KALİTE",
        items: [
          { label: "Ticari Akış", path: base + "/commercial-flow" },
          { label: "Hizmet Değerlendirme", path: base + "/service-evaluation" },
          { label: financialOperationsLabel, path: base + "/financial-operations" },
          { label: "Raporlar", path: base + "/reports" },
        ],
      });
      sections.push({
        title: companyPeopleTitle,
        items: [
          { label: companyPeopleLinkLabel, path: base + "/access-links" },
          { label: companyPeopleAccessLabel, path: base + "/personel-access" },
          { label: companyPeopleGeoLabel, path: base + "/georeview" },
          { label: "Check-in", path: base + "/checkin" },
        ],
      });
      advanced.push({ label: companyHubLabel, path: base + "/hub" });
      advanced.push({ label: "KVKK", path: "/shared/kvkk" });
      advanced.push({ label: "Log Dışa Aktarımı", path: "/shared/logs" });
      advanced.push({ label: "Bildirimler", path: "/shared/notifications" });
      advanced.push({ label: "Geri Bildirim", path: "/shared/feedback" });
    } else if (role === "DRIVER") {
      sections.push({
        title: "",
        items: [
          { label: "Bugün", path: "/driver/today" },
          { label: "Rota", path: "/driver/route" },
          { label: "Harita", path: "/driver/map" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Dışa Aktarımı", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "PERSONEL") {
      sections.push({
        title: "",
        items: [
          { label: "Canlı", path: "/personel/live" },
          { label: "Servisim", path: "/personel/my" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Dışa Aktarımı", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "PARENT") {
      sections.push({
        title: "",
        items: [
          { label: "Canlı", path: "/parent/live" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Dışa Aktarımı", path: "/shared/logs" },
          { label: "Bildirimler", path: "/shared/notifications" },
        ],
      });
    } else if (role === "SUPER_ADMIN") {
      sections.push({
        title: "Temel Yönetim",
        items: [
          { label: "Genel Bakış", path: "/superadmin" },
          { label: "Firmalar", path: "/superadmin/companies" },
          { label: "Taşımacılık Firmaları", path: "/superadmin/rooms" },
          { label: "Kullanıcılar", path: "/superadmin/users" },
          { label: "İller ve Bölgeler", path: "/superadmin/regions" },
        ],
      });
      sections.push({
        title: "Entegrasyonlar",
        items: [
          { label: "Telematik / GPS Sağlayıcıları", path: "/superadmin/telematics" },
        ],
      });
      sections.push({
        title: "Kontrol ve İzleme",
        items: [
          { label: "İşlem Kayıtları", path: "/superadmin/audit" },
          { label: "Canlı İzleme", path: "/superadmin/observability" },
          { label: "Denetim Paneli", path: "/superadmin/operations" },
          { label: "Kabul Merkezi", path: "/superadmin/acceptance" },
          { label: "Başvuru İncelemesi", path: "/superadmin/onboarding-review" },
          { label: "Operasyon Doğrulama", path: "/superadmin/operation-verification" },
          { label: "Sahaya Çıkış Kontrolü", path: "/superadmin/pilot-launch-gate" },
        ],
      });
      sections.push({
        title: "Ticari, Kalite ve Uyum",
        items: [
          { label: "Sistem Standartları", path: "/superadmin/ssot-alignment" },
          { label: "Ticari Akış", path: "/superadmin/commercial-core" },
          { label: "Güven ve Kalite", path: "/superadmin/trust-quality" },
          { label: "KVKK", path: "/shared/kvkk" },
          { label: "Log Dışa Aktarımı", path: "/superadmin/logexport" },
        ],
      });
    }

    return { sections, advanced, copilotSection };
  }, [role, me]);

  const hasAdvanced = cfg.advanced.length > 0;
  const handleMobileSelect = () => {
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="navDockBackdrop"
          onClick={handleMobileSelect}
          aria-label="Menüyü kapat"
          title="Menüyü kapat"
        />
      ) : null}
      <div
        id="shell-nav-dock"
        className={`navDock${mobileOpen ? " navDock--mobileOpen" : " navDock--mobileClosed"}`}
        role="navigation"
        aria-label="Sol menü"
      >
        <div className="navDockBrand"><BrandMark compact subtitle="Operasyon menüsü" /></div>
        <div className="navDockTitle">
          <div className="navDockBrandName">{BRAND_NAME}</div>
          <div className="navDockRole">
            {roleTitle(role, me)}
          </div>
        </div>

        {cfg.sections.map((s) => (
          <Section key={s.title || "main"} title={s.title} items={s.items} path={path} onItemSelect={handleMobileSelect} />
        ))}

        {hasAdvanced ? (
          <div className="navAdvanced">
            <button type="button" className="navToggle" onClick={toggleAdvanced}>
              {showAdvanced ? `${advancedTitle} ▾` : `${advancedTitle} ▸`}
            </button>
            {showAdvanced ? <Section title={null} items={cfg.advanced} path={path} onItemSelect={handleMobileSelect} /> : null}
          </div>
        ) : null}

        {cfg.copilotSection ? (
          <Section key="copilot" title={cfg.copilotSection.title} items={cfg.copilotSection.items} path={path} onItemSelect={handleMobileSelect} />
        ) : null}
      </div>
    </>
  );
}
