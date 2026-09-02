// #15 user-facing terminology. Stable role/status values remain internal.

const ROLE_LABELS = Object.freeze({
  SUPER_ADMIN: "Süper Yönetici",
  COMPANY: "Hizmet Alan Firma",
  ROOM: "Taşımacılık Firması",
  DRIVER: "Sürücü",
  PERSONEL: "Personel",
  PARENT: "Veli",
});

const STATUS_LABELS = Object.freeze({
  LIVE: "Canlı",
  ONLINE: "Bağlı",
  STALE: "Güncel değil",
  OFFLINE: "Çevrim dışı",
  PENDING: "Bekliyor",
  REQUESTED: "Bekliyor",
  APPROVED: "Onaylandı",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
  ACTIVE: "Aktif",
  DONE: "Tamamlandı",
  CANCELLED: "İptal edildi",
  ERROR: "Hata",
  WARN: "Uyarı",
  UNKNOWN: "Belirsiz",
  READY: "Hazır",
  REVIEW_NEEDED: "Kontrol gerekli",
  STEP_UP_REQUIRED: "Ek doğrulama gerekli",
  AUTH_LOGIN_OK: "Giriş başarılı",
  AUTH_LOGIN_FAIL: "Giriş başarısız",
  AUTH_LOGIN_DISABLED: "Giriş kapalı",
  AUTH_LOGIN_DEVICE_REQUIRED: "Cihaz doğrulaması gerekli",
  AUTH_LOGIN_DEVICE_MISMATCH: "Cihaz doğrulaması eşleşmedi",
});

export function userFacingRoleLabel(value, companyKind = "") {
  const key = String(value || "").trim().toUpperCase();
  const kind = String(companyKind || "").trim().toUpperCase();
  if (key === "COMPANY" && kind === "SCHOOL") return "Okul";
  if (key === "COMPANY" && kind === "ORGANIZATION") return "Organizasyon";
  return ROLE_LABELS[key] || "Kullanıcı";
}

export function userFacingStatusLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  return STATUS_LABELS[key] || (key ? "Durum bilgisi" : "Belirtilmedi");
}

export function userFacingRouteSourceLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "ESTIMATED" || key === "CALCULATED") return "Tahmini rota";
  if (key === "SNAPSHOT") return "Kaydedilmiş rota";
  if (key === "LEARNED") return "Öğrenilmiş rota";
  if (key === "OSRM" || key === "ROUTING_SERVICE") return "Yol ağı rotası";
  if (key === "LIVE" || key === "GPS") return "Canlı konum rotası";
  return key ? "Rota bilgisi" : "Rota bilgisi yok";
}

export function userFacingScopeLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Genel kapsam";
  const key = raw.toUpperCase();
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  if (key === "SCHOOL") return "Okul";
  if (key === "ORGANIZATION") return "Organizasyon";
  if (key === "SYSTEM") return "Sistem geneli";
  if (key === "COMPANY") return "Hizmet Alan Firma kapsamı";
  if (key === "ROOM") return "Taşımacılık Firması kapsamı";
  if (key === "OWN-COMPANY" || key === "OWN_COMPANY") return "Kendi firma kapsamı";
  if (key === "OWN-ROOM" || key === "OWN_ROOM") return "Kendi taşımacılık firması kapsamı";
  if (key === "OWN-PERSONEL" || key === "OWN_PERSONEL") return "Kendi personel kayıtları";
  if (key === "OWN-PARENT-LINKS" || key === "OWN_PARENT_LINKS") return "Kendi veli bağlantıları";
  if (key === "ASSIGNED-SHIFTS" || key === "ASSIGNED_SHIFTS") return "Atanmış vardiyalar";
  if (key === "OWN-VEHICLES" || key === "OWN_VEHICLES") return "Kendi araçları";
  if (key === "OWN-DRIVERS" || key === "OWN_DRIVERS") return "Kendi sürücüleri";
  if (key === "LINKED-COMPANY-SCHOOL" || key === "LINKED_COMPANY_SCHOOL") return "Bağlı firma / okul bilgileri";
  if (key === "LINKED-CHILD" || key === "LINKED_CHILD") return "Bağlı çocuk";
  if (key === "CHILD-MATCHED-SHIFT" || key === "CHILD_MATCHED_SHIFT") return "Eşleşen servis vardiyası";
  if (key === "CHILD-ETA" || key === "CHILD_ETA") return "Bağlı servisin tahmini varış bilgisi";
  if (key === "SCHOOL-DOMAIN" || key === "SCHOOL_DOMAIN") return "Okul kapsamı";
  if (key === "ORGANIZATION-DOMAIN" || key === "ORGANIZATION_DOMAIN") return "Organizasyon kapsamı";
  return "Özel kapsam";
}

export function userFacingPanelLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  const labels = {
    DASHBOARD: "Genel bakış",
    HOME: "Ana sayfa",
    MAP: "Canlı takip",
    LIVE: "Canlı takip",
    VEHICLES: "Araçlar",
    DRIVERS: "Sürücüler",
    PERSONEL: "Personel",
    SHIFTS: "Vardiyalar",
    AGREEMENTS: "Sözleşmeler",
    REPORTS: "Raporlar",
    NOTIFICATIONS: "Bildirimler",
    CHECKIN: "Biniş kayıtları",
    ACCESS_LINKS: "Erişim bağlantıları",
    OPERATIONS: "Operasyon",
    AUDIT: "İşlem kayıtları",
    KVKK: "KVKK",
  };
  return labels[key] || "İlgili panel";
}

export const USER_FACING_TERMS = Object.freeze({
  checkIn: "Biniş kaydı",
  checkInTracking: "Biniş kayıtları",
  accessLink: "Erişim bağlantısı",
  accessLinks: "Erişim bağlantıları",
  event: "Olay",
  events: "Olaylar",
  log: "İşlem kaydı",
  logs: "İşlem kayıtları",
  preview: "Önizleme",
  approval: "Kullanıcı onayı",
  source: "Dayanak",
  gps: "Konum sinyali",
  gpsSource: "Konum sinyali kaynağı",
});

export function humanizeUserFacingText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .replace(/\bTELEMATICS_DISABLED\b/gi, "Konum cihazı bağlantısı devre dışı")
    .replace(/intent engine/gi, "yardım akışı")
    .replace(/root cause engine/gi, "neden analizi")
    .replace(/risk scoring engine/gi, "risk değerlendirmesi")
    .replace(/provider adapter/gi, "veri sağlayıcısı bağlantısı")
    .replace(/canonical owner/gi, "asıl sorumlu")
    .replace(/\bCopilot\b/gi, "Sefer Abi")
    .replace(/\bSuper Admin\b/gi, "Süper Yönetici")
    .replace(/\bSüper Admin\b/gi, "Süper Yönetici")
    .replace(/\bOda\b/gi, "Taşımacılık Firması")
    .replace(/\bRoom\b/gi, "Taşımacılık Firması")
    .replace(/\bCompany\b/gi, "Hizmet Alan Firma")
    .replace(/\bŞirket\b/gi, "Hizmet Alan Firma")
    .replace(/\bShift\b/gi, "Vardiya")
    .replace(/\bToday\b/gi, "Bugün")
    .replace(/\bCheck[- ]?in\b/gi, "Biniş kaydı")
    .replace(/\bHub\b/gi, "Merkez")
    .replace(/\bGuided\b/gi, "Rehberli")
    .replace(/\bdispatch\b/gi, "atama")
    .replace(/\bmilestone\b/gi, "ürün aşaması")
    .replace(/\bSUGGESTION[- ]?FIRST\b/gi, "ÖNERİ ODAKLI")
    .replace(/\bactive\b/gi, "aktif")
    .replace(/\bplanned\b/gi, "planlanan")
    .replace(/suggestion[- ]first/gi, "öneri odaklı")
    .replace(/\bacceptance\b/gi, "kabul")
    .replace(/\bchecklist\b/gi, "kontrol listesi")
    .replace(/\bbuild\b/gi, "sürüm")
    .replace(/\bfield operator\b/gi, "saha operatörü")
    .replace(/\bdriver\b/gi, "sürücü")
    .replace(/\bblocking\b/gi, "engelleyen")
    .replace(/\bsync\b/gi, "senkronizasyon")
    .replace(/\bRead[- ]?only\b/gi, "Salt okunur")
    .replace(/\bwrite[- ]?action\b/gi, "yazma işlemi")
    .replace(/\bwrite\b/gi, "değişiklik")
    .replace(/\bpayment\b/gi, "ödeme")
    .replace(/\binvoice\b/gi, "fatura")
    .replace(/\bsettlement\b/gi, "mutabakat")
    .replace(/\bproof\b/gi, "kanıt")
    .replace(/\blog\b/gi, "işlem kaydı")
    .replace(/\bexport\b/gi, "dışa aktarım")
    .replace(/\bTelematics\b/gi, "Konum cihazı")
    .replace(/\btelematics\b/gi, "konum cihazı")
    .replace(/\bsupplier\b/gi, "tedarikçi")
    .replace(/\breadiness\b/gi, "hazırlık")
    .replace(/\bquote floor\b/gi, "teklif alt sınırı")
    .replace(/\bselected shift\b/gi, "seçili vardiya")
    .replace(/\b(lat|lng|lon|latitude|longitude)\b/gi, "koordinat")
    .replace(/\bOSRM\b/gi, "rota hesaplama servisi")
    .replace(/\bOFFLINE\b/gi, "Çevrim dışı")
    .replace(/\bSTALE\b/gi, "Güncel veri gecikmiş")
    .replace(/\bONLINE\b|\bLIVE\b/gi, "Canlı")
    .replace(/\bAPPROVED\b/gi, "Onaylandı")
    .replace(/\bPENDING\b/gi, "Bekliyor")
    .replace(/\bREJECTED\b/gi, "Reddedildi")
    .replace(/\bREADY\b/gi, "Hazır")
    .replace(/\bREVIEW_NEEDED\b/gi, "Kontrol gerekli")
    .replace(/\bNOT_READY\b/gi, "Hazır değil")
    .replace(/\bMISSING_INFO\b/gi, "Eksik bilgi")
    .replace(/\bstep[- ]?up\b/gi, "ek doğrulama")
    .replace(/\bprovider\b/gi, "veri sağlayıcısı")
    .replace(/\bentity\b/gi, "ilgili kayıt")
    .replace(/\baction\b/gi, "işlem")
    .replace(/\bstatus\b/gi, "durum")
    .replace(/\bmode\b/gi, "mod")
    .replace(/\bscope\b/gi, "kapsam")
    .replace(/\bseverity\b/gi, "önem düzeyi")
    .replace(/\bsource\b/gi, "kaynak")
    .replace(/\bcizgisinde kalir\b/gi, "çizgisinde kalır")
    .replace(/\bsimdi ne yap\b/gi, "şimdi ne yapmalıyım")
    .replace(/\bsonraki adim\b/gi, "sonraki adım")
    .replace(/\bgerekirse daha basit anlat\b/gi, "gerekirse daha basit anlat")
    .replace(/\bise yaradi\b/gi, "işe yaradı")
    .replace(/\bise yaramadi\b/gi, "işe yaramadı")
    .replace(/\bcok teknikti\b/gi, "çok teknikti")
    .replace(/\byanlis anladi\b/gi, "yanlış anladı")
    .replace(/\bM\d+(?:\.\d+)?\b/gi, "bu sürüm")
    .replace(/#\d+(?:_[A-Z0-9]+(?:_[A-Z0-9]+)*)+/g, "ilgili kapsam")
    .replace(/\bcanonical\b|\bkanonik\b/gi, "mevcut plan")
    .replace(/\bbaseline\b/gi, "mevcut plan")
    .replace(/\bpreview\b/gi, "önizleme")
    .replace(/\bprojection\b/gi, "öngörü")
    .replace(/\bbounded\b/gi, "sınırları belirli")
    .replace(/planned-vs-actual/gi, "planlanan-gerçekleşen")
    .replace(/\bactual\b/gi, "gerçekleşen")
    .replace(/saha\s+oncesi/gi, "saha öncesi")
    .replace(/^#\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim() || fallback;
}
