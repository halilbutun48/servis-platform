import crypto from "node:crypto";
import { createJsonFileStore } from "../lib/jsonFileStore.js";
import { httpError } from "../errors/http.js";
import { maskIp, maskUserAgent } from "../kvkk/enforcement.js";

const store = createJsonFileStore("public-leads.json", {
  defaultValue: () => ({ lastId: 0, items: [] }),
});

export const LEAD_TYPES = [
  "DEMO_REQUEST",
  "LIVE_SUPPORT_REQUEST",
  "SERVICE_NEED",
  "SUPPLIER_APPLICATION",
];

export const LEAD_TYPE_LABELS = {
  DEMO_REQUEST: "Demo talebi",
  LIVE_SUPPORT_REQUEST: "Canlı destek talebi",
  SERVICE_NEED: "Servis ihtiyacı",
  SUPPLIER_APPLICATION: "Tedarikçi başvurusu",
};

const LEAD_TYPE_SET = new Set(LEAD_TYPES);
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const rateBuckets = new Map();

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function cleanText(value, { maxLen = 120, label = "Alan", allowEmpty = true } = {}) {
  const raw = String(value ?? "");
  const noTags = raw.replace(/<[^>]*>/g, " ");
  const noControls = noTags.replace(/[\u0000-\u001F\u007F]/g, " ");
  const collapsed = noControls.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    if (allowEmpty) return null;
    throw httpError(400, "BAD_REQUEST", `${label} gerekli.`);
  }
  if (collapsed.length > maxLen) {
    throw httpError(400, "BAD_REQUEST", `${label} en fazla ${maxLen} karakter olabilir.`);
  }
  return collapsed;
}

function cleanMessage(value, { maxLen = 1200, label = "Mesaj / not" } = {}) {
  const text = cleanText(value, { maxLen, label, allowEmpty: true });
  return text || null;
}

function cleanBoolean(value) {
  if (value === true || value === 1) return true;
  const raw = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "on", "yes", "evet"].includes(raw);
}

function cleanEmail(value) {
  const text = cleanText(value, { maxLen: 160, label: "E-posta" });
  if (!text) return null;
  const email = text.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "BAD_REQUEST", "Geçerli bir e-posta adresi girin.");
  }
  return email;
}

function cleanPhone(value) {
  const text = cleanText(value, { maxLen: 40, label: "Telefon" });
  if (!text) return null;
  const normalized = text.replace(/[^\d+().\-\s]/g, " ").replace(/\s+/g, " ").trim();
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw httpError(400, "BAD_REQUEST", "Geçerli bir telefon numarası girin.");
  }
  if (!/^\+?[0-9][0-9\s().-]*$/.test(normalized)) {
    throw httpError(400, "BAD_REQUEST", "Geçerli bir telefon numarası girin.");
  }
  return normalized;
}

function cleanInt(value, { min = 1, max = 999999, label = "Sayı" } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) {
    throw httpError(400, "BAD_REQUEST", `${label} sayısal olmalı.`);
  }
  const int = Math.trunc(n);
  if (int < min || int > max) {
    throw httpError(400, "BAD_REQUEST", `${label} ${min} ile ${max} arasında olmalı.`);
  }
  return int;
}

function normalizeLeadType(value) {
  const type = String(value || "").trim().toUpperCase();
  if (!LEAD_TYPE_SET.has(type)) {
    throw httpError(400, "BAD_REQUEST", "Başvuru türü seçin.");
  }
  return type;
}

function normalizeNestedLeadObject(raw, fields) {
  const source = raw && typeof raw === "object" ? raw : {};
  const out = {};
  let hasAny = false;

  for (const field of fields) {
    const value = field.kind === "int"
      ? cleanInt(source[field.key], { min: field.min ?? 1, max: field.max ?? 999999, label: field.label })
      : cleanText(source[field.key], { maxLen: field.maxLen ?? 120, label: field.label });
    out[field.key] = value;
    if (value !== null && value !== undefined && value !== "") hasAny = true;
  }

  return hasAny ? out : null;
}

function normalizeServiceNeed(raw, type) {
  if (type !== "SERVICE_NEED") return null;
  return normalizeNestedLeadObject(raw, [
    { key: "serviceType", label: "Hizmet türü", maxLen: 80 },
    { key: "approxPeopleCount", label: "Yaklaşık kişi sayısı", kind: "int", min: 1, max: 5000 },
    { key: "originRegion", label: "Başlangıç bölgesi", maxLen: 120 },
    { key: "destinationRegion", label: "Varış bölgesi", maxLen: 120 },
    { key: "scheduleText", label: "Servis günü / saat bilgisi", maxLen: 200 },
    { key: "followUpNote", label: "Ek not", maxLen: 240 },
  ]);
}

function normalizeSupplierInfo(raw, type) {
  if (type !== "SUPPLIER_APPLICATION") return null;
  return normalizeNestedLeadObject(raw, [
    { key: "vehicleCount", label: "Araç sayısı", kind: "int", min: 1, max: 5000 },
    { key: "serviceRegions", label: "Hizmet verdiği bölgeler", maxLen: 180 },
    { key: "vehicleTypes", label: "Araç tipleri", maxLen: 180 },
    { key: "authorizedPerson", label: "Yetkili kişi", maxLen: 120 },
    { key: "capacityNote", label: "Kısa kapasite notu", maxLen: 240 },
    { key: "invitedMembershipNote", label: "Ek not", maxLen: 240 },
  ]);
}

function normalizeState(base) {
  const src = base && typeof base === "object" ? base : {};
  const items = Array.isArray(src.items) ? src.items.map(normalizeLeadRecord).filter(Boolean) : [];
  const lastId = Math.max(
    Number.isFinite(Number(src.lastId)) ? Math.trunc(Number(src.lastId)) : 0,
    ...items.map((item) => parseLeadNumber(item.id))
  );
  return { lastId, items };
}

function parseLeadNumber(id) {
  const match = String(id || "").match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function normalizeLeadRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = LEAD_TYPE_SET.has(String(raw.type || "").toUpperCase()) ? String(raw.type || "").toUpperCase() : "DEMO_REQUEST";
  return {
    id: String(raw.id || "").trim() || `lead-${String(parseLeadNumber(raw.id) || 0).padStart(6, "0")}`,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    type,
    status: String(raw.status || "RECEIVED").trim().toUpperCase() || "RECEIVED",
    source: String(raw.source || "PUBLIC_LANDING").trim().toUpperCase() || "PUBLIC_LANDING",
    name: cleanText(raw.name, { maxLen: 120, label: "Ad soyad", allowEmpty: false }),
    phone: cleanPhone(raw.phone),
    email: cleanEmail(raw.email),
    organizationName: cleanText(raw.organizationName, { maxLen: 160, label: "Kurum / firma adı" }),
    city: cleanText(raw.city, { maxLen: 80, label: "İl" }),
    district: cleanText(raw.district, { maxLen: 80, label: "İlçe" }),
    role: cleanText(raw.role, { maxLen: 80, label: "Rol / başvuru tipi" }),
    message: cleanMessage(raw.message, { maxLen: 1200, label: "Mesaj / not" }),
    serviceNeed: normalizeServiceNeed(raw.serviceNeed, type),
    supplierInfo: normalizeSupplierInfo(raw.supplierInfo, type),
    kvkkAccepted: cleanBoolean(raw.kvkkAccepted),
    contactPermission: cleanBoolean(raw.contactPermission),
    ipMasked: cleanText(raw.ipMasked, { maxLen: 64, label: "IP" }),
    userAgentSummary: cleanText(raw.userAgentSummary, { maxLen: 64, label: "User-Agent" }),
    sourceRoute: cleanText(raw.sourceRoute, { maxLen: 120, label: "Source route" }),
  };
}

function enforceSimpleRateLimit({ ip, userAgent, type, phone, email }) {
  const now = Date.now();
  const key = sha256Hex([String(ip || ""), String(userAgent || ""), String(type || ""), String(phone || ""), String(email || "")].join("|"));
  const existing = rateBuckets.get(key) || [];
  const fresh = existing.filter((ts) => now - ts < RATE_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) {
    throw httpError(429, "RATE_LIMITED", "Biraz sonra tekrar deneyin.");
  }
  fresh.push(now);
  rateBuckets.set(key, fresh);

  for (const [bucketKey, timestamps] of rateBuckets.entries()) {
    const recent = timestamps.filter((ts) => now - ts < RATE_WINDOW_MS);
    if (recent.length) rateBuckets.set(bucketKey, recent);
    else rateBuckets.delete(bucketKey);
  }
}

function normalizeSubmission(payload = {}) {
  const type = normalizeLeadType(payload.type ?? payload.leadType);
  const kvkkAccepted = cleanBoolean(payload.kvkkAccepted);
  if (!kvkkAccepted) {
    throw httpError(400, "BAD_REQUEST", "KVKK onayı gerekli.");
  }

  const name = cleanText(payload.name, { maxLen: 120, label: "Ad soyad", allowEmpty: false });
  const phone = cleanPhone(payload.phone);
  const email = cleanEmail(payload.email);
  if (!phone && !email) {
    throw httpError(400, "BAD_REQUEST", "Telefon veya e-posta alanından en az biri gerekli.");
  }

  const websiteTrap = cleanText(payload.website ?? payload.companyWebsite ?? payload.url, {
    maxLen: 120,
    label: "website",
  });
  if (websiteTrap) {
    throw httpError(400, "BAD_REQUEST", "Başvurunuz doğrulanamadı.");
  }

  return {
    type,
    name,
    phone,
    email,
    organizationName: cleanText(payload.organizationName, { maxLen: 160, label: "Kurum / firma adı" }),
    role: cleanText(payload.role, { maxLen: 80, label: "Rol / başvuru tipi" }),
    city: cleanText(payload.city, { maxLen: 80, label: "İl" }),
    district: cleanText(payload.district, { maxLen: 80, label: "İlçe" }),
    message: cleanMessage(payload.message, { maxLen: 1200, label: "Mesaj / not" }),
    kvkkAccepted: true,
    contactPermission: cleanBoolean(payload.contactPermission),
    serviceNeed: normalizeServiceNeed(payload.serviceNeed, type),
    supplierInfo: normalizeSupplierInfo(payload.supplierInfo, type),
  };
}

async function storeLead(record) {
  const next = await store.updateAsync((current) => {
    const state = normalizeState(current);
    const nextId = state.lastId + 1;
    const id = `lead-${String(nextId).padStart(6, "0")}`;
    const createdAt = new Date().toISOString();
    const item = normalizeLeadRecord({
      ...record,
      id,
      createdAt,
      status: "RECEIVED",
      source: "PUBLIC_LANDING",
    });

    state.lastId = nextId;
    state.items.unshift(item);
    return state;
  });

  const state = normalizeState(next);
  return state.items[0] || null;
}

export async function submitPublicLead(payload = {}, meta = {}) {
  const normalized = normalizeSubmission(payload);

  enforceSimpleRateLimit({
    ip: meta.ip || meta.ipAddress || "",
    userAgent: meta.userAgent || "",
    type: normalized.type,
    phone: normalized.phone,
    email: normalized.email,
  });

  const record = await storeLead({
    ...normalized,
    ipMasked: maskIp(meta.ip || meta.ipAddress || "") || null,
    userAgentSummary: maskUserAgent(meta.userAgent || "") || null,
    sourceRoute: cleanText(meta.sourceRoute, { maxLen: 120, label: "Source route" }),
  });

  if (!record) {
    throw httpError(500, "INTERNAL_ERROR", "Beklenmeyen bir hata oluştu.");
  }

  return {
    ok: true,
    leadId: record.id,
    status: "RECEIVED",
    message: "Başvurunuz alındı. Ekibimiz inceleme sonrası sizinle iletişime geçecek.",
  };
}

export function readPublicLeadStoreState() {
  return store.readAsync();
}
