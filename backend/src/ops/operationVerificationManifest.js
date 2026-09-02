export const OPERATION_VERIFICATION_STATUSES = [
  { id: "KABUL", label: "Kabul", tone: "good", summary: "Temel kontroller ve kanıtlar yeterli." },
  { id: "RED", label: "Red", tone: "danger", summary: "Kritik eksik veya risk var; devam edilmez." },
  { id: "EKSIK", label: "Eksik", tone: "warn", summary: "Bazı kanıt veya adımlar eksik; kapanmaz." },
  { id: "TEKRAR_KONTROL", label: "Tekrar kontrol", tone: "info", summary: "İlk kontrol sonrası yeniden doğrulama gerekir." },
];

export const OPERATION_VERIFICATION_PROOF_TYPES = [
  { id: "SCREENSHOT", label: "Ekran görüntüsü" },
  { id: "LOG_EXPORT", label: "İşlem kaydı / dışa aktarım kanıtı" },
  { id: "DEVICE_BUILD", label: "Cihaz / sürüm bilgisi" },
  { id: "OPERATOR_NOTE", label: "Operatör notu" },
];

export const OPERATION_VERIFICATION_ROLES = [
  { id: "SUPER_ADMIN", label: "Süper Yönetici", surface: "/superadmin/operation-verification", summary: "Genel kabul resmi ve kapanış kararı." },
  { id: "ROOM", label: "Taşımacılık Firması", surface: "/room/shifts", summary: "Araç, sürücü ve operasyon hazırlığı." },
  { id: "COMPANY", label: "Hizmet Alan Firma / okul / organizasyon", surface: "/company/shifts", summary: "Talep, atama ve hizmet teyidi." },
  { id: "DRIVER", label: "Sürücü", surface: "/driver/today", summary: "Sürücünün telefon GPS'i, rota ve cihaz akışı." },
  { id: "PERSONEL", label: "Personel", surface: "/personel/live", summary: "Canlı link, biniş ve talep görünürlüğü." },
  { id: "PARENT", label: "Veli", surface: "/parent/live", summary: "Canlı takip ve bağlantı netliği." },
];

const ROLE_SURFACES = {
  SUPER_ADMIN: {
    roleId: "SUPER_ADMIN",
    goal: "Tüm rol doğrulama sonucunu tek yerde okuyup kapanış kararı vermek.",
    defaultStatus: "TEKRAR_KONTROL",
    cards: [
      { id: "ready", label: "Hazır görünen rol", value: 3, note: "İlk iskelet seviyesinde" },
      { id: "needProof", label: "Ek kanıt isteyen", value: 2, note: "Kanıt toplama devam ediyor" },
      { id: "needRetest", label: "Tekrar kontrol", value: 1, note: "Sürücü cihaz turu bekleniyor" },
    ],
    checks: [
      { id: "sa_overview", title: "Rol özeti tek yerde görünür", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Panel üstünden rol seçip durumu oku" },
      { id: "sa_status_flow", title: "Kabul / red / eksik / tekrar kontrol dili nettir", status: "KABUL", proofTypes: ["SCREENSHOT", "OPERATOR_NOTE"], nextStep: "Karar dili ile saha notunu eşleştir" },
      { id: "sa_pack_trace", title: "Sürümle ilişkili kayıt izi görünür", status: "EKSIK", proofTypes: ["LOG_EXPORT"], nextStep: "Bu sürümde kayıt izini derinleştir" },
    ],
  },
  ROOM: {
    roleId: "ROOM",
    goal: "Araç, sürücü ve vardiya hazırlığını doğrulamak.",
    defaultStatus: "KABUL",
    cards: [
      { id: "vehicle", label: "Araç uygunluğu", value: 1, note: "Seçili araç hazır" },
      { id: "driver", label: "Sürücü ataması", value: 1, note: "Bağ ve çakışma kontrolü" },
      { id: "ops", label: "Operasyon notu", value: 1, note: "Kısa kapanış notu" },
    ],
    checks: [
      { id: "room_assign", title: "Araç + sürücü ataması okunur", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Vardiya kartından atamayı doğrula" },
      { id: "room_conflict", title: "Çakışma / uygunluk uyarısı görünür", status: "TEKRAR_KONTROL", proofTypes: ["SCREENSHOT", "OPERATOR_NOTE"], nextStep: "Bu sürümde karar bağını sağlamlaştır" },
      { id: "room_note", title: "Kısa operasyon notu bırakılabilir", status: "EKSIK", proofTypes: ["OPERATOR_NOTE"], nextStep: "Kalıcı kayıt akışı bu sürümde açılacak" },
    ],
  },
  COMPANY: {
    roleId: "COMPANY",
    goal: "Talep, hizmet ve kapanış teyidini sade okumak.",
    defaultStatus: "KABUL",
    cards: [
      { id: "service", label: "Hizmet görünürlüğü", value: 1, note: "Atama ve durum okunur" },
      { id: "commercial", label: "Ticari akış bağı", value: 1, note: "Teklif/sözleşme ayrımı korunur" },
      { id: "feedback", label: "Kısa teyit", value: 1, note: "Kalite ve onay yüzeyi" },
    ],
    checks: [
      { id: "company_shift", title: "Vardiya ve durum özeti görünür", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Şirket ekranında durum kartını aç" },
      { id: "company_acceptance", title: "Hizmet kabul akışı sade dille okunur", status: "KABUL", proofTypes: ["SCREENSHOT", "OPERATOR_NOTE"], nextStep: "Operatör notuyla teyit et" },
      { id: "company_proof", title: "Kalıcı kanıt kaydı yok", status: "EKSIK", proofTypes: ["LOG_EXPORT"], nextStep: "Bu sürümde kayıt omurgasına bağlanacak" },
    ],
  },
  DRIVER: {
    roleId: "DRIVER",
    goal: "Sürücünün telefon GPS'i, rota ve cihaz hazır oluşunu doğrulamak.",
    defaultStatus: "TEKRAR_KONTROL",
    cards: [
      { id: "gps", label: "GPS akışı", value: 1, note: "İzin ve yayın" },
      { id: "route", label: "Rota görünürlüğü", value: 1, note: "Today/route akışı" },
      { id: "device", label: "Cihaz notu", value: 1, note: "Build ve model" },
    ],
    checks: [
      { id: "driver_today", title: "Today ekranı anlaşılır", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Today ekran görüntüsünü ekle" },
      { id: "driver_gps", title: "Sürücünün telefon GPS'i yayın teyidi alınır", status: "TEKRAR_KONTROL", proofTypes: ["DEVICE_BUILD", "SCREENSHOT"], nextStep: "Canlı saha turunda tekrar bak" },
      { id: "driver_offline", title: "Offline toparlama ve not akışı", status: "EKSIK", proofTypes: ["OPERATOR_NOTE"], nextStep: "Saha testinde not standardını sabitle" },
    ],
  },
  PERSONEL: {
    roleId: "PERSONEL",
    goal: "Canlı link ve talep akışının netliğini doğrulamak.",
    defaultStatus: "KABUL",
    cards: [
      { id: "live", label: "Canlı ekran", value: 1, note: "Basit görünüm" },
      { id: "pickup", label: "Talep akışı", value: 1, note: "Aç/kapat okunur" },
      { id: "feedback", label: "Kısa not", value: 1, note: "Operasyon geri bildirimi" },
    ],
    checks: [
      { id: "personel_live", title: "Canlı görünüm sade", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Canlı ekranı doğrula" },
      { id: "personel_request", title: "Talep akışı okunur", status: "KABUL", proofTypes: ["SCREENSHOT", "OPERATOR_NOTE"], nextStep: "Talep örneğiyle teyit et" },
      { id: "personel_proof", title: "Kalıcı sonuç kaydı beklemede", status: "EKSIK", proofTypes: ["LOG_EXPORT"], nextStep: "Bu sürümün kalıcı kayıt turu" },
    ],
  },
  PARENT: {
    roleId: "PARENT",
    goal: "Veli canlı takip ve bağlantı netliğini doğrulamak.",
    defaultStatus: "KABUL",
    cards: [
      { id: "link", label: "Bağlantı netliği", value: 1, note: "Link açılıyor" },
      { id: "live", label: "Canlı takip", value: 1, note: "Özet görünüm" },
      { id: "trust", label: "Güven hissi", value: 1, note: "Sade dil" },
    ],
    checks: [
      { id: "parent_live", title: "Canlı takip açılır", status: "KABUL", proofTypes: ["SCREENSHOT"], nextStep: "Veli linkiyle test et" },
      { id: "parent_copy", title: "Dil sade ve anlaşılır", status: "KABUL", proofTypes: ["SCREENSHOT", "OPERATOR_NOTE"], nextStep: "Metni gözden geçir" },
      { id: "parent_retest", title: "Uzun saha tekrar kontrolü gerekli", status: "TEKRAR_KONTROL", proofTypes: ["OPERATOR_NOTE"], nextStep: "Gerçek cihaz turunda yeniden bak" },
    ],
  },
};

function normalizeRole(roleId = "SUPER_ADMIN") {
  const normalized = String(roleId || "SUPER_ADMIN").trim().toUpperCase();
  return OPERATION_VERIFICATION_ROLES.find((item) => item.id === normalized) || OPERATION_VERIFICATION_ROLES[0];
}

function countByStatus(checks) {
  const counts = { KABUL: 0, RED: 0, EKSIK: 0, TEKRAR_KONTROL: 0 };
  for (const item of Array.isArray(checks) ? checks : []) {
    const key = String(item?.status || "").toUpperCase();
    if (counts[key] != null) counts[key] += 1;
  }
  return counts;
}

export function getOperationVerificationManifest() {
  const totalChecks = Object.values(ROLE_SURFACES).reduce((sum, surface) => sum + (surface?.checks?.length || 0), 0);
  return {
    activeMilestone: "M78.3",
    title: "Operasyon Doğrulama Yüzeyi",
    summary: "M78 omurgasını ilk kayıt katmanı üstüne özet, filtre ve export görünürlüğü ekleyerek okunur hale getirir. STABLE_TO yine 78 olarak kalır.",
    roles: OPERATION_VERIFICATION_ROLES,
    statuses: OPERATION_VERIFICATION_STATUSES,
    proofTypes: OPERATION_VERIFICATION_PROOF_TYPES,
    totals: {
      roleCount: OPERATION_VERIFICATION_ROLES.length,
      totalChecks,
    },
  };
}

export function buildOperationVerificationRoleSurface(roleId = "SUPER_ADMIN", records = []) {
  const role = normalizeRole(roleId);
  const surface = ROLE_SURFACES[role.id] || ROLE_SURFACES.SUPER_ADMIN;
  const recordMap = new Map(
    (Array.isArray(records) ? records : [])
      .filter((item) => String(item?.roleId || "").toUpperCase() === role.id && item?.checkId)
      .map((item) => [String(item.checkId), item])
  );
  const checks = (surface.checks || []).map((item) => {
    const saved = recordMap.get(item.id);
    const proofTypeList = saved?.proofType ? [saved.proofType] : item.proofTypes || [];
    return {
      ...item,
      status: saved?.status || item.status,
      proofTypes: proofTypeList,
      saved: !!saved,
      note: saved?.note || "",
      evidenceRef: saved?.evidenceRef || "",
      updatedAt: saved?.updatedAt || null,
      updatedByEmail: saved?.updatedByEmail || "",
      statusOrigin: saved ? "MANUAL" : "DEFAULT",
    };
  });
  return {
    activeMilestone: "M78.3",
    role,
    goal: surface.goal,
    defaultStatus: surface.defaultStatus,
    cards: surface.cards,
    checks,
    savedCount: checks.filter((item) => item.saved).length,
    statusCounts: countByStatus(checks),
    recommendedProofs: Array.from(new Set(checks.flatMap((item) => item.proofTypes || []))),
  };
}


export function getOperationVerificationCheckMeta(roleId = "SUPER_ADMIN", checkId = "") {
  const role = normalizeRole(roleId);
  const surface = ROLE_SURFACES[role.id] || ROLE_SURFACES.SUPER_ADMIN;
  const found = (surface.checks || []).find((item) => item.id === String(checkId || ""));
  return found ? { ...found } : null;
}

export function getOperationVerificationRoleSurface(roleId = "SUPER_ADMIN") {
  return buildOperationVerificationRoleSurface(roleId, []);
}
