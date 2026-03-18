export const KVKK_MATRIX_VERSION = "2026-03-18";

export const KVKK_MATRIX_ROWS = [
  {
    role: "SUPER_ADMIN",
    panels: ["Admin", "Raporlar", "Loglar"],
    dataScopes: ["system", "company", "room", "driver", "personel"],
    canView: ["kvkk-summary", "consent-records", "audit-trail"],
    canWrite: ["policy-config"],
    notes: "Sistem geneli görünürlük; operasyonel kişisel veride amaç sınırlılığı korunur.",
  },
  {
    role: "ROOM",
    panels: ["Vardiyalar", "Sürücüler", "Raporlar", "Canlı Harita"],
    dataScopes: ["own-room", "assigned-shifts", "own-vehicles", "own-drivers"],
    canView: ["route-progress", "eta-summary", "penalties", "kvkk-summary"],
    canWrite: ["dispatch", "no-show", "assignment"],
    notes: "Sadece kendi oda scope’u; canlı konum operasyon penceresiyle sınırlı.",
  },
  {
    role: "COMPANY",
    panels: ["Vardiyalar", "Raporlar", "Canlı Harita"],
    dataScopes: ["own-company", "own-personel", "assigned-shifts"],
    canView: ["route-progress", "eta-summary", "kvkk-summary"],
    canWrite: ["request", "offer-response"],
    notes: "Firma canlı veriyi sadece kendi personeli ve bağlı vardiya kapsamında görür.",
  },
  {
    role: "DRIVER",
    panels: ["Bugün", "Rota", "Harita", "KVKK"],
    dataScopes: ["self", "assigned-shift", "vehicle-live"],
    canView: ["next-stop", "remaining-stops", "navigation-target", "kvkk-documents"],
    canWrite: ["stop-progress", "kvkk-consent"],
    notes: "Sürücü yalnız kendi vardiyası ve kendi canlı rota verisini görür.",
  },
  {
    role: "PERSONEL",
    panels: ["Benim Servisim", "Canlı Harita", "KVKK"],
    dataScopes: ["self", "matched-shift", "own-stop"],
    canView: ["vehicle-approach", "eta-summary", "remaining-stops", "navigation-target", "kvkk-documents"],
    canWrite: ["ride-request", "kvkk-consent"],
    notes: "Personel sadece kendi servis bağı ve kendi durak/ETA görünümünü alır.",
  },
];

export function getKvkkMatrix() {
  return {
    version: KVKK_MATRIX_VERSION,
    rows: KVKK_MATRIX_ROWS.map((x) => ({ ...x })),
    summary: {
      roleCount: KVKK_MATRIX_ROWS.length,
      focuses: [
        "rol/panel/veri görünürlüğü",
        "canlı konum için amaç ve zaman penceresi sınırı",
        "mobil taraf için KVKK zorunlu ekranlar",
      ],
    },
  };
}
