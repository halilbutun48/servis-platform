export const KVKK_MATRIX_VERSION = "2026-03-28";

export const KVKK_AUTH_ROLES = ["SUPER_ADMIN", "ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"];
export const KVKK_BUSINESS_DOMAINS = ["COMPANY", "SCHOOL", "ORGANIZATION", "ROOM"];

export const KVKK_MATRIX_ROWS = [
  {
    role: "SUPER_ADMIN",
    panels: ["Admin", "Raporlar", "Loglar", "KVKK"],
    dataScopes: ["system", "company", "school-domain", "organization-domain", "room"],
    canView: ["kvkk-summary", "consent-records", "audit-trail", "retention-policy"],
    canWrite: ["policy-config", "retention-run", "user-status"],
    notes: "Sistem geneli görünürlük vardır; yine de şifre, TOTP secret ve ham kişisel veri export'u varsayılan olarak dışarı açılmaz.",
  },
  {
    role: "ROOM",
    panels: ["Vardiyalar", "Sürücüler", "Araçlar", "Canlı Harita", "KVKK"],
    dataScopes: ["own-room", "assigned-shifts", "own-vehicles", "own-drivers", "linked-company-school"],
    canView: ["route-progress", "eta-summary", "assignment-state", "kvkk-summary"],
    canWrite: ["dispatch", "no-show", "assignment"],
    notes: "Sadece kendi room scope'u. Canlı konum ve kişi adresi operasyon penceresiyle sınırlı; tam GPS geçmişi ve gereksiz kimlik bilgisi açılmaz.",
  },
  {
    role: "COMPANY",
    panels: ["Vardiyalar", "Personeller", "Raporlar", "Canlı Harita", "KVKK"],
    dataScopes: ["own-company", "own-personel", "own-parent-links", "assigned-shifts"],
    canView: ["route-progress", "eta-summary", "service-state", "kvkk-summary"],
    canWrite: ["request", "offer-response", "personel-maintenance"],
    notes: "Firma kullanıcısı yalnız kendi firma kapsamını görür. School/organization alanı Company.kind ile ayrılır; ayrı auth role değildir.",
  },
  {
    role: "DRIVER",
    panels: ["Bugün", "Rota", "Harita", "KVKK"],
    dataScopes: ["self", "assigned-shift", "vehicle-live"],
    canView: ["next-stop", "remaining-stops", "navigation-target", "kvkk-documents"],
    canWrite: ["stop-progress", "kvkk-consent", "gps-publish"],
    notes: "Sürücü yalnız kendi vardiyası, kendi aracı ve kendi operasyon akışını görür. Başka sürücü veya başka vardiya verisi açılmaz.",
  },
  {
    role: "PERSONEL",
    panels: ["Benim Servisim", "Canlı Harita", "KVKK"],
    dataScopes: ["self", "matched-shift", "own-stop"],
    canView: ["vehicle-approach", "eta-summary", "remaining-stops", "navigation-target", "kvkk-documents"],
    canWrite: ["ride-request", "kvkk-consent"],
    notes: "Personel sadece kendi servis bağı, kendi durak bilgisi ve kendisini etkileyen ETA özetini görür. Diğer personel listesi ve tam rota izi açılmaz.",
  },
  {
    role: "PARENT",
    panels: ["Canlı Takip", "Çocuk Bağlantısı", "KVKK"],
    dataScopes: ["linked-child", "child-matched-shift", "child-eta"],
    canView: ["vehicle-approach", "eta-summary", "remaining-stops", "child-link", "kvkk-documents"],
    canWrite: ["kvkk-consent"],
    notes: "Veli yalnız bağlı çocuk/personel kaydını görür. Açık adres, tam GPS geçmişi ve room/company operasyon iç notları görünmez.",
  },
];

export function getKvkkMatrix() {
  return {
    version: KVKK_MATRIX_VERSION,
    authRoles: [...KVKK_AUTH_ROLES],
    businessDomains: [...KVKK_BUSINESS_DOMAINS],
    rows: KVKK_MATRIX_ROWS.map((x) => ({ ...x })),
    summary: {
      roleCount: KVKK_MATRIX_ROWS.length,
      focuses: [
        "rol/panel/veri görünürlüğü",
        "canlı konum için amaç ve zaman penceresi sınırı",
        "sürücünün telefon GPS'i ve tam geçmiş için ayrı kısıt",
        "school/organization alanının auth role değil business domain olması",
      ],
    },
  };
}
