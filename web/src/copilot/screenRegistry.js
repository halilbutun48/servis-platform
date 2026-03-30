import { companyBase } from "../utils/paths";

export function normalizeGuideRoleKey(me) {
  const role = String(me?.role || "");
  if (role === "COMPANY") {
    const kind = String(me?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
    return "COMPANY";
  }
  return role;
}

const SHARED = [
  { id: 9001, path: "/shared/notifications", label: "Bildirimler" },
  { id: 9002, path: "/shared/logs", label: "Log Export" },
  { id: 9003, path: "/shared/kvkk", label: "KVKK" },
];

const REGISTRY = {
  ROOM: [
    { id: 1101, path: "/room/map", label: "Canlı Takip" },
    { id: 1102, path: "/room/offers", label: "Teklifler" },
    { id: 1103, path: "/room/shifts", label: "Vardiyalar" },
    { id: 1104, path: "/room/vehicles", label: "Araçlar" },
    { id: 1105, path: "/room/drivers", label: "Sürücüler" },
    { id: 1106, path: "/room/agreements", label: "Sözleşmeler" },
    { id: 1107, path: "/room/copilot", label: "Copilot" },
    { id: 1108, path: "/room/hub", label: "Hub" },
    { id: 1109, path: "/room/checkin", label: "Check-in" },
    { id: 1110, path: "/room/auth-invites", label: "Giriş Davetleri" },
    { id: 1114, path: "/room/operation-health", label: "Operasyon Sağlığı" },
    { id: 1115, path: "/room/commercial-flow", label: "Ticari Akışım" },
    { id: 1116, path: "/room/reports", label: "Raporlar" },
    ...SHARED,
  ],
  COMPANY: [
    { id: 2101, path: "/company", label: "Planlama Merkezi" },
    { id: 2102, path: "/company/shifts", label: "Vardiyalar" },
    { id: 2103, path: "/company/agreements", label: "Sözleşmeler" },
    { id: 2104, path: "/company/access-links", label: "Personel Link" },
    { id: 2105, path: "/company/copilot", label: "Copilot" },
    { id: 2106, path: "/company/hub", label: "Hub" },
    { id: 2107, path: "/company/checkin", label: "Check-in" },
    { id: 2108, path: "/company/auth-invites", label: "Giriş Davetleri" },
    { id: 2109, path: "/company/georeview", label: "Personel Konum Seçici" },
    { id: 2113, path: "/company/map", label: "Harita" },
    { id: 2114, path: "/company/service-evaluation", label: "Hizmet Değerlendirme" },
    { id: 2115, path: "/company/commercial-flow", label: "Ticari Akışım" },
    { id: 2116, path: "/company/reports", label: "Raporlar" },
    ...SHARED,
  ],
  SCHOOL: [
    { id: 2201, path: "/school", label: "Okul Merkezi" },
    { id: 2202, path: "/school/shifts", label: "Vardiyalar" },
    { id: 2203, path: "/school/agreements", label: "Sözleşmeler" },
    { id: 2204, path: "/school/access-links", label: "Öğrenci Link" },
    { id: 2205, path: "/school/copilot", label: "Copilot" },
    { id: 2206, path: "/school/hub", label: "Hub" },
    { id: 2207, path: "/school/checkin", label: "Check-in" },
    { id: 2208, path: "/school/auth-invites", label: "Hesap Davetleri" },
    { id: 2209, path: "/school/georeview", label: "Öğrenci Konum Seçici" },
    { id: 2210, path: "/school/parents", label: "Parent Link" },
    { id: 2214, path: "/school/map", label: "Harita" },
    { id: 2215, path: "/school/service-evaluation", label: "Hizmet Değerlendirme" },
    { id: 2216, path: "/school/commercial-flow", label: "Ticari Akışım" },
    { id: 2217, path: "/school/reports", label: "Raporlar" },
    ...SHARED,
  ],
  ORGANIZATION: [
    { id: 2301, path: "/organization", label: "Gezi / Planlama Merkezi" },
    { id: 2302, path: "/organization/plans", label: "Yer Planları" },
    { id: 2303, path: "/organization/shifts", label: "Vardiyalar" },
    { id: 2304, path: "/organization/agreements", label: "Sözleşmeler" },
    { id: 2305, path: "/organization/access-links", label: "Personel Link" },
    { id: 2306, path: "/organization/copilot", label: "Copilot" },
    { id: 2307, path: "/organization/hub", label: "Hub" },
    { id: 2308, path: "/organization/checkin", label: "Check-in" },
    { id: 2309, path: "/organization/auth-invites", label: "Giriş Davetleri" },
    { id: 2310, path: "/organization/georeview", label: "Lokasyon İncele" },
    { id: 2311, path: "/organization/map", label: "Harita" },
    { id: 2312, path: "/organization/service-evaluation", label: "Hizmet Değerlendirme" },
    { id: 2313, path: "/organization/commercial-flow", label: "Ticari Akışım" },
    { id: 2314, path: "/organization/reports", label: "Raporlar" },
    ...SHARED,
  ],
  DRIVER: [
    { id: 3101, path: "/driver/today", label: "Bugün" },
    { id: 3102, path: "/driver/route", label: "Rota" },
    { id: 3103, path: "/driver/map", label: "Harita" },
    { id: 3104, path: "/driver/checkin", label: "Check-in" },
    { id: 3105, path: "/driver/copilot", label: "Copilot" },
    { id: 3106, path: "/driver/change-pin", label: "PIN Değiştir" },
    ...SHARED,
  ],
  PERSONEL: [
    { id: 4101, path: "/personel/live", label: "Canlı" },
    { id: 4102, path: "/personel/my", label: "Servisim" },
    { id: 4103, path: "/personel/copilot", label: "Copilot" },
    ...SHARED,
  ],
  PARENT: [
    { id: 5101, path: "/parent/live", label: "Canlı" },
    { id: 5102, path: "/parent/copilot", label: "Copilot" },
    ...SHARED,
  ],
  SUPER_ADMIN: [
    { id: 6101, path: "/superadmin", label: "Genel Bakış" },
    { id: 6102, path: "/superadmin/companies", label: "Şirketler" },
    { id: 6103, path: "/superadmin/rooms", label: "Operasyon Odaları" },
    { id: 6104, path: "/superadmin/users", label: "Kullanıcılar" },
    { id: 6105, path: "/superadmin/regions", label: "Bölgeler" },
    { id: 6106, path: "/superadmin/audit", label: "İşlem Kayıtları" },
    { id: 6107, path: "/superadmin/observability", label: "Canlı İzleme" },
    { id: 6108, path: "/superadmin/acceptance", label: "Kabul Merkezi" },
    { id: 6109, path: "/superadmin/operation-verification", label: "Operasyon Doğrulama" },
    { id: 6110, path: "/superadmin/pilot-launch-gate", label: "Sahaya Çıkış Kontrolü" },
    { id: 6111, path: "/superadmin/ssot-alignment", label: "Sistem Standartları" },
    { id: 6112, path: "/superadmin/commercial-core", label: "Ticari Akış" },
    { id: 6113, path: "/superadmin/trust-quality", label: "Güven ve Kalite" },
    { id: 6114, path: "/superadmin/copilot", label: "Copilot" },
    { id: 6115, path: "/superadmin/logexport", label: "Log Dışa Aktarımı" },
    { id: 6116, path: "/superadmin/natural-copilot", label: "Natural Copilot" },
    { id: 6117, path: "/shared/kvkk", label: "KVKK" },
  ],
};

export function getCopilotScreenOptions(me) {
  const key = normalizeGuideRoleKey(me);
  return REGISTRY[key] || [];
}

export function resolveCopilotScreenContext(path, me) {
  const clean = String(path || "").split("?")[0];
  const rows = getCopilotScreenOptions(me);
  const current = rows.find((x) => x.path === clean) || rows[0] || null;
  return { screen: current, label: current?.label || clean || "Ekran", path: clean };
}

export function getCopilotMenuEntry(me) {
  const rows = getCopilotScreenOptions(me);
  const roleKey = normalizeGuideRoleKey(me);
  const fallbackPath = roleKey === "ROOM"
    ? "/room/copilot"
    : roleKey === "COMPANY"
      ? "/company/copilot"
      : roleKey === "SCHOOL"
        ? "/school/copilot"
        : roleKey === "ORGANIZATION"
          ? "/organization/copilot"
          : roleKey === "SUPER_ADMIN"
            ? "/superadmin/copilot"
            : roleKey === "DRIVER"
              ? "/driver/copilot"
              : roleKey === "PERSONEL"
                ? "/personel/copilot"
                : roleKey === "PARENT"
                  ? "/parent/copilot"
                  : "/superadmin/copilot";
  return rows.find((x) => x.path.endsWith('/copilot')) || { id: 0, path: fallbackPath, label: 'Copilot' };
}

export function resolveRuntimeScopeKey(currentPath, fallbackPath) {
  const clean = String(currentPath || "").split("?")[0] || String(fallbackPath || "");
  if (clean.startsWith("/school/")) return String(fallbackPath || clean).replace(/^\/company(?=\/|$)/, "/school");
  if (clean.startsWith("/organization/")) return String(fallbackPath || clean).replace(/^\/company(?=\/|$)/, "/organization");
  if (clean.startsWith("/company/")) return String(fallbackPath || clean).replace(/^\/school(?=\/|$)|^\/organization(?=\/|$)/, "/company");
  if (clean === "/school" || clean === "/organization" || clean === "/company") return companyBase({ role: "COMPANY", companyKind: clean === "/school" ? "SCHOOL" : clean === "/organization" ? "ORGANIZATION" : "COMPANY" });
  return String(fallbackPath || clean);
}
