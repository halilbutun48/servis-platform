// #15 user-facing terminology. Stable role/status values remain internal.

const ROLE_LABELS = Object.freeze({
  SUPER_ADMIN: "Süper Yönetici",
  COMPANY: "Hizmet Alan Firma",
  ROOM: "Taşımacılık Firması",
  DRIVER: "Sürücü",
  PERSONEL: "Personel",
  PARENT: "Veli",
});

// This is the canonical visible-status boundary. Backend enums stay intact;
// presentation code imports this map instead of recreating partial versions.
export const STATUS_LABELS = Object.freeze({
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
  MISSING_PROOF: "Kanıt eksik",
  MISSING: "Eksik",
  WEAK: "Zayıf",
  PARTIAL: "Kısmi",
  RISKY: "Riskli",
  INSUFFICIENT_DATA: "Yetersiz veri",
  READY_FOR_REVIEW: "İncelemeye hazır",
  NEEDS_PROOF: "Kanıt gerekli",
  NEEDS_QUALITY_REVIEW: "Kalite incelemesi gerekli",
  NO_IMPACT: "Etki yok",
  PARTIAL_HOLD_RECOMMENDED: "Kısmi bekleme",
  REVIEW_REQUIRED: "İnceleme gerekli",
  REVIEWED: "İncelendi",
  NEEDS_RECHECK: "Tekrar kontrol gerekli",
  IGNORED_FOR_NOW: "Şimdilik beklemede",
  CLEAR: "Temiz",
  RISK: "Risk",
  NEEDS_REVIEW: "İnceleme gerekli",
  NOT_STARTED: "Başlamadı",
  READY: "Hazır",
  DRAFT: "Taslak",
  OPEN: "Açık",
  COUNTERED: "Karşı teklif aşamasında",
  SPLIT: "Bölünerek onaylandı",
  DISABLED: "Devre dışı",
  GRANTED: "İzin var",
  DENIED: "İzin yok",
  REFRESH_NEEDED: "Yenileme gerekli",
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
  PASSIVE: "Pasif",
  BOARD: "Biniş",
  ALIGHT: "İniş",
  ARCHIVED: "Arşiv",
  SHIFT_PUBLISHED: "Teklif / vardiya açıldı",
  AGREEMENT_REQUESTED: "Sözleşme talebi",
  RECEIVED: "Alındı",
  IN_REVIEW: "İnceleniyor",
  NEEDS_INFO: "Ek bilgi gerekli",
  APPROVED_FOR_INVITE: "Davet için uygun",
  BLOCKED: "Engellenmiş",
  TEKRAR_KONTROL: "Tekrar kontrol gerekli",
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
  // A generic "Durum bilgisi" hid both the fact that a mapping was missing
  // and the underlying status. Keep the boundary safe without inventing a
  // reassuring label.
  return STATUS_LABELS[key] || (key ? "Tanımlı olmayan durum" : "Belirtilmedi");
}

export function userFacingStatusText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u.test(text)
    ? userFacingStatusLabel(text)
    : text;
}

export function userFacingFactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return String(fallback || "").trim();
  return text
    .replace(/\b(?:UNKNOWN|MISSING|WEAK)\b/g, (token) => userFacingStatusText(token))
    .replace(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g, (token) => userFacingStatusText(token))
    .replace(/\b[a-z][A-Za-z]*(?:Id|ID)\b/g, "ek kaynak bilgisi")
    .replace(/\b(?:PRE[-_]?\d+|M\d{1,3}|(?:TEST|CHECK|PACKAGE)[-_][A-Z0-9_-]+)\b/gi, "ek doğrulama bilgisi")
    .replace(/\s+/g, " ")
    .trim();
}

export function userFacingDirectionLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "INBOUND") return "Toplama";
  if (key === "OUTBOUND") return "Dağıtım";
  return "Yön bilgisi yok";
}

export function userFacingPatternLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  if (key === "ONE_WAY") return "Tek yön";
  if (key === "LOOP") return "Döngü";
  if (key === "ROUND_TRIP") return "Gidiş-dönüş";
  return "Plan bilgisi yok";
}

const LINEAGE_SIGNAL_LABELS = Object.freeze({
  sourceShiftId: "Kaynak vardiyası",
  marketShiftId: "Pazar vardiyası",
  organizationPlanId: "Organizasyon planı",
  selectedOfferId: "Seçili teklif",
  sourceSummary: "Kaynak özeti",
  commercialSource: "Ticari kaynak",
});

export function userFacingLineageSignalLabel(value) {
  const key = String(value || "").trim();
  return LINEAGE_SIGNAL_LABELS[key] || (key ? "Ek kaynak bilgisi" : "");
}

export function userFacingLineageText(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/\bsourceShiftId\b/g, "kaynak vardiyası")
    .replace(/\bmarketShiftId\b/g, "pazar vardiyası")
    .replace(/\borganizationPlanId\b/g, "organizasyon planı")
    .replace(/\bselectedOfferId\b/g, "seçili teklif")
    .replace(/\bsourceSummary\b/g, "kaynak özeti")
    .replace(/\bcommercialSource\b/g, "ticari kaynak")
    .replace(/\b[a-z][A-Za-z]*(?:Id|ID)\b/g, "ek kaynak bilgisi")
    .replace(/\b[a-z]+_[a-z0-9_]+\b/gi, "ek kaynak bilgisi")
    .replace(/\s+/g, " ")
    .trim();
}

export function userFacingCommercialPreviewText(value, fallback = "Ticari bilgiler yalnızca karar desteği önizlemesidir; ödeme veya fatura oluşturulmaz.") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (/lisans\s+ücreti|başarı\s+payı|komisyon|commission|platform\s+fee|success\s+fee|%\s*\d+(?:[.,]\d+)?/iu.test(text)) {
    return fallback;
  }
  return text;
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

function normalizeVisibleWhitespace(value) {
  const lines = String(value || "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/[^\S\r\n]+/gu, " ").trim());
  const normalized = [];
  for (const line of lines) {
    // Keep one intentional blank separator between paragraphs, but do not
    // retain leading, trailing, or repeated empty lines.
    if (!line) {
      if (normalized.length && normalized.at(-1) !== "") normalized.push("");
      continue;
    }
    // A multi-item response may have passed through more than one presenter.
    // Deduplicate repeated bullet markers only within that line; never strip
    // the marker or join separate list rows.
    normalized.push(line.replace(/^(?:•\s*){2,}/u, "• "));
  }
  while (normalized.at(-1) === "") normalized.pop();
  return normalized.join("\n");
}

export function humanizeUserFacingText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const humanized = text
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
    // Preserve title-cased user-facing names such as "Driver One"; only
    // uppercase internal role codes are safe to normalize here.
    .replace(/\bDRIVER\b/g, "sürücü")
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
    .replace(/\bworker\b/gi, "arka plan işlemi")
    .replace(/\bqueue\b/gi, "bekleyen işlemler")
    .replace(/\braw\s+(?:ip|ua|user[- ]?agent)\b/gi, "ağ bilgisi")
    .replace(/\b(?:ip address|user[- ]?agent)\b/gi, "ağ bilgisi")
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
    // Sefer Abi answers may carry internal domain/status tokens from a
    // read-model summary. Keep those identifiers internal at the final
    // rendered-text boundary; backend/auth semantics remain unchanged.
    .replace(/\bOPERATIONS\b/gi, "operasyon")
    .replace(/\bSHIFTS\b/gi, "vardiya")
    .replace(/\bOFFERS\b/gi, "teklif")
    .replace(/\bAGREEMENTS\b/gi, "sözleşme")
    .replace(/\bPERSONNEL\b/gi, "personel")
    .replace(/\bPARENT\b/gi, "veli")
    .replace(/\bCOMPANY\b/gi, "Hizmet Alan Firma")
    .replace(/\bROOM\b/gi, "Taşımacılık Firması")
    .replace(/\bBLOCKED\b/gi, "engellenmiş")
    .replace(/\bDRAFT\b/gi, "taslak")
    .replace(/\bOPEN\b/gi, "açık")
    .replace(/\bCOUNTERED\b/gi, "karşı teklif aşamasında")
    .replace(/\bOUTBOUND\b/gi, "gidiş")
    .replace(/\bINBOUND\b/gi, "dönüş")
    .replace(/\bONE_WAY\b/gi, "tek yönlü")
    .replace(/\bAI_COPILOT_QUERY\b/gi, "Sefer Abi sorusu")
    .replace(/(?<!\()\bETA\b/gi, "tahmini varış zamanı (ETA)")
    .replace(/\bGPS\b/gi, "GPS/konum")
    .replace(/\b(?:baş|bas)koordinat\p{L}*/giu, "başlatılması")
    .replace(/(?:konum\/)?GPS\/konum(?:\/konum)?/gi, "GPS/konum")
    .replace(/^(?:\s*\d+\s+(?:operasyon|vardiya|teklif|sözleşme|personel|veli|araç|sürücü)\s+kayd[ıi][,.;:]?\s*)+(?=(?:sonraki|önce|önerim|risk|güvenli))/iu, "")
    .replace(/^#\d+$/g, "");
  // Whitespace is presentation semantics for Sefer Abi: newline-delimited
  // bullets and paragraphs must reach the drawer intact. Only horizontal
  // whitespace is normalized inside each line.
  return normalizeVisibleWhitespace(humanized) || fallback;
}
