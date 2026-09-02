import { companyBase } from "./paths.js";
import { hubLabelForKind } from "./labels.js";

// One navigation registry for the eight supported user contexts. A menu item
// is only a route pointer; authorization remains server-side in the API.
const SHARED_ADVANCED = [
  { label: "Bildirimler", path: "/shared/notifications" },
  { label: "İşlem kayıtlarını dışa aktar", path: "/shared/logs" },
  { label: "KVKK", path: "/shared/kvkk" },
  { label: "Geri Bildirim", path: "/shared/feedback" },
];

function companyContext(me) {
  const kind = String(me?.companyKind || "").toUpperCase();
  const base = companyBase(me);
  const isSchool = kind === "SCHOOL";
  const isOrganization = kind === "ORGANIZATION";
  const isCompany = !isSchool && !isOrganization;
  return {
    base,
    kind,
    isSchool,
    isOrganization,
    isCompany,
    homeLabel: isSchool ? "Okul Merkezi" : isOrganization ? "Gezi / Planlama Merkezi" : "Planlama Merkezi",
    operationsLabel: isSchool ? "Okul Operasyon Paneli" : isOrganization ? "Organizasyon Operasyon Paneli" : "Operasyon Paneli",
    peopleTitle: isSchool ? "ÖĞRENCİ VE VELİ" : isOrganization ? "KATILIMCI VE KONUM" : "PERSONEL VE KONUM",
  };
}

function companyNavigation(me) {
  const ctx = companyContext(me);
  const { base } = ctx;
  const sections = [
    {
      title: "ANA SAYFA",
      items: [
        { label: ctx.homeLabel, path: base },
        { label: ctx.operationsLabel, path: `${base}/operations` },
      ],
    },
    {
      title: "PLANLAMA VE SÖZLEŞME",
      items: [
        ...(ctx.isOrganization ? [{ label: "Organizasyon Planları", path: `${base}/plans` }] : []),
        { label: "Vardiyalar", path: `${base}/shifts` },
        { label: "Sözleşmeler", path: `${base}/agreements` },
      ],
    },
    {
      title: "FİNANS VE TİCARİ AKIŞ",
      items: [
        { label: "Bütçe ve Servis Maliyeti", path: `${base}/financial-operations` },
        { label: "Ticari Akış", path: `${base}/commercial-flow` },
        { label: "Hizmet Değerlendirme", path: `${base}/service-evaluation` },
      ],
    },
  ];

  if (ctx.isSchool) {
    sections.push({
      title: ctx.peopleTitle,
      items: [
        { label: "Veli Erişimi", path: "/school/parents" },
        { label: "Öğrenci bağlantıları", path: `${base}/access-links` },
      ],
    });
  } else {
    sections.push({
      title: ctx.peopleTitle,
      items: [
        { label: "Personel Erişimi", path: `${base}/personel-access` },
        { label: "Personel bağlantıları", path: `${base}/access-links` },
      ],
    });
  }

  const advanced = [
    { label: hubLabelForKind(me?.companyKind), path: `${base}/hub` },
    { label: "Harita", path: `${base}/map` },
    { label: ctx.isSchool ? "Öğrenci Konum Seçici" : ctx.isOrganization ? "Konum İncele" : "Personel Konum Seçici", path: `${base}/georeview` },
    { label: "Biniş kayıtları", path: `${base}/checkin` },
    { label: "Raporlar", path: `${base}/reports` },
    ...SHARED_ADVANCED,
  ];

  return { sections, advanced };
}

export function navigationContextKey(me = {}) {
  const role = String(me?.role || "").toUpperCase();
  if (role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
  }
  return role;
}

export function getRoleNavigation(me = {}) {
  const role = navigationContextKey(me);
  if (role === "ROOM") {
    return {
      sections: [
        { title: "ANA SAYFA", items: [{ label: "Operasyon Merkezi", path: "/room" }] },
        { title: "TİCARİ AKIŞ", items: [{ label: "Teklifler", path: "/room/offers" }, { label: "Sözleşmeler", path: "/room/agreements" }] },
        { title: "OPERASYON", items: [{ label: "Vardiyalar", path: "/room/shifts" }, { label: "Operasyon Sağlığı", path: "/room/operation-health" }, { label: "Finansal Operasyonlar", path: "/room/financial-operations" }, { label: "Araçlar", path: "/room/vehicles" }] },
      ],
      advanced: [{ label: "Canlı Takip", path: "/room/map" }, { label: "Sürücüler", path: "/room/drivers" }, { label: "Ticari Akışım", path: "/room/commercial-flow" }, { label: "Raporlar", path: "/room/reports" }, { label: "Taşımacılık Firması Konumu", path: "/room/hub" }, { label: "Biniş kayıtları", path: "/room/checkin" }, ...SHARED_ADVANCED],
    };
  }
  if (role === "COMPANY" || role === "SCHOOL" || role === "ORGANIZATION") return companyNavigation(me);
  if (role === "DRIVER") {
    return {
      sections: [{ title: "ANA GÖREV", items: [{ label: "Bugün", path: "/driver/today" }, { label: "Rota", path: "/driver/route" }] }],
      // Legacy acceptance name "Check-in" is intentionally rendered as the plain Turkish "Biniş kaydı".
      advanced: [{ label: "Harita", path: "/driver/map" }, { label: "Biniş kaydı", path: "/driver/checkin" }, { label: "PIN Değiştir", path: "/driver/change-pin" }, ...SHARED_ADVANCED],
    };
  }
  if (role === "PERSONEL") {
    return {
      sections: [{ title: "SERVİSİM", items: [{ label: "Canlı", path: "/personel/live" }, { label: "Servisim", path: "/personel/my" }] }],
      advanced: SHARED_ADVANCED,
    };
  }
  if (role === "PARENT") {
    return { sections: [{ title: "SERVİS", items: [{ label: "Canlı", path: "/parent/live" }] }], advanced: SHARED_ADVANCED };
  }
  if (role === "SUPER_ADMIN") {
    return {
      sections: [
        { title: "GENEL DURUM", items: [{ label: "Genel Bakış", path: "/superadmin" }, { label: "Denetim Paneli", path: "/superadmin/operations" }] },
        { title: "YÖNETİM", items: [{ label: "Firmalar", path: "/superadmin/companies" }, { label: "Taşımacılık Firmaları", path: "/superadmin/rooms" }, { label: "Kullanıcılar", path: "/superadmin/users" }] },
        { title: "KONTROL", items: [{ label: "İşlem Kayıtları", path: "/superadmin/audit" }, { label: "Canlı İzleme", path: "/superadmin/observability" }, { label: "Kabul Merkezi", path: "/superadmin/acceptance" }] },
      ],
      advanced: [{ label: "İller ve Bölgeler", path: "/superadmin/regions" }, { label: "Konum veri sağlayıcıları", path: "/superadmin/telematics" }, { label: "Operasyon Doğrulama", path: "/superadmin/operation-verification" }, { label: "Sahaya Çıkış Kontrolü", path: "/superadmin/pilot-launch-gate" }, { label: "Başvuru İncelemesi", path: "/superadmin/onboarding-review" }, { label: "Sistem Standartları", path: "/superadmin/ssot-alignment" }, { label: "Ticari Akış", path: "/superadmin/commercial-core" }, { label: "Güven ve Kalite", path: "/superadmin/trust-quality" }, { label: "İşlem kayıtlarını dışa aktar", path: "/superadmin/logexport" }, ...SHARED_ADVANCED.filter((item) => item.path !== "/shared/logs")],
    };
  }
  return { sections: [], advanced: [] };
}
