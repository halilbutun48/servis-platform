export const KVKK_ENFORCEMENT_VERSION = "2026-03-28-m77.5-hotfix1";

export const KVKK_EXACT_GPS_ROLES = ["SUPER_ADMIN", "ROOM", "DRIVER"];
export const KVKK_MASKED_GPS_ROLES = ["COMPANY", "PERSONEL", "PARENT"];

function cleanString(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

export function maskPhone(value) {
  const s = cleanString(value);
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

export function maskEmail(value) {
  const s = cleanString(value);
  if (!s || !s.includes("@")) return null;
  const [local, domain] = s.split("@");
  const safeLocal = local.length <= 2 ? `${local[0] || "*"}***` : `${local.slice(0, 2)}***`;
  const parts = String(domain || "").split(".");
  if (!parts.length) return `${safeLocal}@***`;
  parts[0] = `${String(parts[0] || "").slice(0, 1)}***`;
  return `${safeLocal}@${parts.join(".")}`;
}

export function maskIp(value) {
  const s = cleanString(value);
  if (!s) return null;
  if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (s.includes(":")) {
    const parts = s.split(":").filter(Boolean);
    return `${parts.slice(0, 2).join(":") || "xxxx"}:xxxx:xxxx`;
  }
  return "masked-ip";
}

export function maskUserAgent(value) {
  const s = cleanString(value);
  if (!s) return null;
  if (/edg/i.test(s)) return "Edge/*";
  if (/chrome/i.test(s)) return "Chrome/*";
  if (/firefox/i.test(s)) return "Firefox/*";
  if (/safari/i.test(s) && !/chrome/i.test(s)) return "Safari/*";
  if (/okhttp/i.test(s)) return "okhttp/*";
  return "masked-ua";
}

export function maskAddress(value) {
  const s = cleanString(value);
  if (!s) return null;
  if (s.length <= 12) return `${s.slice(0, 4)}…`;
  return `${s.slice(0, 10)}…`;
}

function roundCoord(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function sanitizeGpsLast(gpsLast, role) {
  if (!gpsLast) return gpsLast;
  const out = { ...gpsLast };
  if (KVKK_EXACT_GPS_ROLES.includes(role)) return out;
  if (KVKK_MASKED_GPS_ROLES.includes(role)) {
    out.lat = roundCoord(out.lat, 2);
    out.lng = roundCoord(out.lng, 2);
    out.precision = "masked-2dp";
    return out;
  }
  out.lat = null;
  out.lng = null;
  out.precision = "hidden";
  return out;
}

export function sanitizeVehicleLiveItem(item, { role } = {}) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    gpsLast: sanitizeGpsLast(item.gpsLast, String(role || "")),
  };
}

export function sanitizeParentChildItem(item) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    phone: null,
    homeAddress: null,
    phoneMasked: maskPhone(item.phone),
    homeAddressMasked: maskAddress(item.homeAddress),
  };
}

export function sanitizeSessionItem(item) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    ip: null,
    userAgent: null,
    ipMasked: maskIp(item.ip),
    userAgentMasked: maskUserAgent(item.userAgent),
  };
}

export function sanitizeInviteItem(item, { role, allowSensitive = false } = {}) {
  if (!item || typeof item !== "object") return item;
  const exactAllowed = allowSensitive && String(role || "") === "SUPER_ADMIN";
  return {
    ...item,
    email: exactAllowed ? item.email : null,
    phone: exactAllowed ? item.phone : null,
    emailMasked: maskEmail(item.email),
    phoneMasked: maskPhone(item.phone),
  };
}

export function sanitizeCompanyPersonelItem(item, { businessDomain, role } = {}) {
  if (!item || typeof item !== "object") return item;
  const domain = String(businessDomain || "").toUpperCase();
  const allowExact = String(role || "") === "SUPER_ADMIN";
  if (domain !== "SCHOOL" || allowExact) return item;
  return {
    ...item,
    phone: null,
    homeAddress: null,
    phoneMasked: maskPhone(item.phone),
    homeAddressMasked: maskAddress(item.homeAddress),
  };
}

function sanitizeKeyValue(key, value) {
  const k = String(key || "").toLowerCase();
  if (value == null) return value;
  if (k.includes("password") || k.includes("secret") || k.includes("token")) return "[REDACTED_SECRET]";
  if (k === "ip" || k.endsWith("ip")) return maskIp(value);
  if (k.includes("useragent") || k.includes("user_agent") || k === "ua") return maskUserAgent(value);
  if (k.includes("email")) return maskEmail(value);
  if (k.includes("phone")) return maskPhone(value);
  if (k.includes("address")) return maskAddress(value);
  if (k === "lat" || k === "lng") return roundCoord(value, 2);
  return value;
}

export function sanitizeAuditMeta(meta) {
  if (meta == null) return null;
  if (Array.isArray(meta)) return meta.map((x) => sanitizeAuditMeta(x));
  if (typeof meta !== "object") return meta;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v && typeof v === "object") {
      out[k] = sanitizeAuditMeta(v);
      continue;
    }
    out[k] = sanitizeKeyValue(k, v);
  }
  return out;
}

export function sanitizeOperationEventMeta(meta) {
  return sanitizeAuditMeta(meta);
}

export function sanitizeLogText(text) {
  let s = String(text || "");
  s = s.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, (m) => maskEmail(m) || "[email]");
  s = s.replace(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g, (m) => maskIp(m) || "[ip]");
  s = s.replace(/(lat=)(-?\d+(?:\.\d+)?)/gi, (_, p, n) => `${p}${roundCoord(n, 2)}`);
  s = s.replace(/(lng=)(-?\d+(?:\.\d+)?)/gi, (_, p, n) => `${p}${roundCoord(n, 2)}`);
  return s;
}

export function sanitizeLogRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    text: sanitizeLogText(row.text),
    meta: sanitizeAuditMeta(row.meta),
  };
}


export function sanitizeShiftActorLabel(value) {
  const s = cleanString(value);
  if (!s) return null;
  return sanitizeLogText(s);
}

export function sanitizeInviteActorUser(item, { role } = {}) {
  if (!item || typeof item !== "object") return item;
  const exactAllowed = String(role || "") === "SUPER_ADMIN";
  return {
    id: item.id ?? null,
    fullName: item.fullName ?? null,
    email: exactAllowed ? item.email ?? null : null,
    emailMasked: maskEmail(item.email),
  };
}

export function sanitizeAuthInviteListItem(item, { role } = {}) {
  if (!item || typeof item !== "object") return item;
  const exactAllowed = String(role || "") === "SUPER_ADMIN";
  return {
    ...item,
    tokenHash: null,
    email: exactAllowed ? item.email ?? null : null,
    phone: exactAllowed ? item.phone ?? null : null,
    emailMasked: maskEmail(item.email),
    phoneMasked: maskPhone(item.phone),
    createdBy: sanitizeInviteActorUser(item.createdBy, { role }),
    consumedBy: sanitizeInviteActorUser(item.consumedBy, { role }),
  };
}

export function sanitizeDriverContactSummary(item, { role, allowExact = false } = {}) {
  if (!item || typeof item !== "object") return item;
  const exactAllowed = allowExact || ["ROOM", "SUPER_ADMIN"].includes(String(role || ""));
  const phoneMasked = maskPhone(item.phone);
  const user = item.user && typeof item.user === "object"
    ? {
        ...item.user,
        email: exactAllowed ? item.user.email ?? null : null,
        emailMasked: maskEmail(item.user.email),
      }
    : item.user;

  if (exactAllowed) {
    return {
      ...item,
      phone: item.phone ?? null,
      phoneMasked,
      user,
    };
  }

  return {
    id: item.id ?? null,
    fullName: item.fullName ?? null,
    phone: null,
    phoneMasked,
    user: user ? {
      id: user.id ?? null,
      email: null,
      emailMasked: user.emailMasked ?? maskEmail(user.email),
    } : undefined,
  };
}

export function sanitizeShiftParticipantPayload(item, { role } = {}) {
  if (!item || typeof item !== "object") return item;
  const out = { ...item };
  if (item.driver) out.driver = sanitizeDriverContactSummary(item.driver, { role });
  if (item.vehicle && typeof item.vehicle === "object") {
    out.vehicle = {
      ...item.vehicle,
      gpsLast: sanitizeGpsLast(item.vehicle.gpsLast, String(role || "")),
    };
  }
  if (item.room && typeof item.room === "object" && !["ROOM", "SUPER_ADMIN"].includes(String(role || ""))) {
    out.room = { id: item.room.id ?? null, name: item.room.name ?? null };
  }
  if (item.company && typeof item.company === "object") {
    out.company = { id: item.company.id ?? null, name: item.company.name ?? null, ...(item.company.kind ? { kind: item.company.kind } : {}) };
  }
  return out;
}

export function sanitizeVehicleDirectoryItem(item, { role } = {}) {
  if (!item || typeof item !== "object") return item;
  const out = {
    ...item,
    gpsLast: sanitizeGpsLast(item.gpsLast, String(role || "")),
  };
  if (item.driver) out.driver = sanitizeDriverContactSummary(item.driver, { role });
  if (Array.isArray(item.shifts)) out.shifts = item.shifts.map((x) => sanitizeShiftParticipantPayload(x, { role }));
  if (item.room && typeof item.room === "object" && !["ROOM", "SUPER_ADMIN"].includes(String(role || ""))) {
    out.room = { id: item.room.id ?? null, name: item.room.name ?? null };
  }
  return out;
}

export const trackedAuditEvents = ["LOG_EXPORT", "RETENTION_RUN", "KVKK_DOC_ACCEPT", "KVKK_DOC_REVOKE"];

export function buildKvkkEnforcementSummary() {
  return {
    version: KVKK_ENFORCEMENT_VERSION,
    exactGpsRoles: [...KVKK_EXACT_GPS_ROLES],
    maskedGpsRoles: [...KVKK_MASKED_GPS_ROLES],
    payloadSurfaces: [
      "GET /api/parent/children",
      "GET /api/live/vehicles",
      "GET /api/parent/live/vehicles",
      "GET /api/me/sessions",
      "GET /api/school/parent-invites",
      "GET /api/logs/preview",
      "GET /api/logs/export",
      "GET /api/admin/logs/preview",
      "GET /api/admin/logs/export",
      "GET /api/shifts/:id/operation-events",
      "GET /api/company/personels",
      "GET /api/auth/invites",
      "GET /api/vehicles",
      "GET /api/shifts",
      "GET /api/shifts/:id"
    ],
    redactions: [
      "ham `phone` ve `homeAddress` yerine masked alanlar",
      "gpsLast.lat/lng masked-2dp veya hidden",
      "`ip` ve `userAgent` ham verilmez",
      "log/export text ve meta icinde email/ip/koordinat redaction",
      "school domain davet ve kisi listelerinde parent/child iletisim daraltma",
      "auth davet listesinde ham email/phone ve tokenHash donmez",
      "company/driver/superadmin disi shift/vehicle driver iletisim alanlari daraltilir",
      "preview/export hedef etiketleri ve admin export filtreleri redaction uygular",
      "retention/export audit izi ham filtreleri oldugu gibi yazmaz"
    ],
    trackedAuditEvents: [...trackedAuditEvents],
  };
}
