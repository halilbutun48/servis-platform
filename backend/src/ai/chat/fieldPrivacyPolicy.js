function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

const FIELD_FAMILIES = Object.freeze({
  PERSONAL: "RAW_PERSONAL_DATA",
  COORDINATES: "RAW_COORDINATES",
  SECRETS: "SECRET_FIELDS",
});

function planText(plan) {
  return [
    plan?.family,
    plan?.intentFamily,
    plan?.requestedFields,
    plan?.query,
    plan?.entity?.type,
    plan?.entity?.entityType,
  ].flat().filter(Boolean).join(" ");
}

function hasAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

export function resolveFieldPrivacyPolicy({ user, message, plan } = {}) {
  const input = normalize(`${message || ""} ${planText(plan)}`);
  const deniedFields = [];

  if (hasAny(input, [
    /ham\s+kisisel/, /raw\s+personal/, /ad\s+soyad/, /telefon(?:\s+numarasi)?/,
    /e\s*-?posta/, /adres/, /ham\s+adres/, /gizli\s+(?:konum|adres|lokasyon)/, /\btc(?:\s+kimlik)?\b/, /kimlik\s+numarasi/,
    /isimleri\s+(listele|goster|ver)/, /ogrenci(?:lerin)?\s+(ad|isim|detay)/,
    /personel(?:lerin)?\s+(ad|isim|detay)/, /kisisel\s+(bilgi|detay|alan|veri)/,
  ])) deniedFields.push(FIELD_FAMILIES.PERSONAL);

  if (hasAny(input, [
    /koordinat/, /enlem/, /boylam/, /latitude/, /longitude/, /raw\s+coord/, /lat\s*\/\s*lng/,
    /gps\s+(?:enlem|boylam|koordinat)/,
  ])) deniedFields.push(FIELD_FAMILIES.COORDINATES);

  if (hasAny(input, [
    /sifre/, /password/, /parola/, /totp/, /otp/, /secret/, /api\s*key/, /token/, /gizli\s+anahtar/,
  ])) deniedFields.push(FIELD_FAMILIES.SECRETS);

  const uniqueDeniedFields = [...new Set(deniedFields)];
  return {
    status: uniqueDeniedFields.length ? "DENY" : "ALLOW",
    deniedFields: uniqueDeniedFields,
    role: String(user?.role || "").toUpperCase(),
    policy: "NO_RAW_PERSONAL_COORDINATE_SECRET_PROJECTION",
    canViewRecord: true,
    canViewAggregate: uniqueDeniedFields.length === 0,
    canViewPersonalData: false,
    canViewCoordinates: false,
    canViewSecrets: false,
  };
}

export function fieldPrivacyBoundaryReply(decision) {
  const fields = Array.isArray(decision?.deniedFields) ? decision.deniedFields : [];
  const labels = fields.map((field) => ({
    [FIELD_FAMILIES.PERSONAL]: "ham kişisel bilgi",
    [FIELD_FAMILIES.COORDINATES]: "ham koordinat",
    [FIELD_FAMILIES.SECRETS]: "gizli alan",
  }[field] || "korunan alan"));
  const label = labels.length ? labels.join(", ") : "korunan alan";
  return `Bu istekteki ${label} paylaşılmaz. Kayıtların gösterilebilir durum özeti veya güvenli toplu bilgisiyle devam edebilirim.`;
}

export function redactPersonalLabel(value, { role } = {}) {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole !== "SUPER_ADMIN") return String(value || "").trim();
  return "korunan kişi";
}

export const FIELD_PRIVACY_FAMILIES = FIELD_FAMILIES;
