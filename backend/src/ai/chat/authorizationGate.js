import prisma from "../../prisma.js";
import { getRoleDomainCapabilities } from "./semanticIntentPlanner.js";

const PROTECTED_DOMAINS = new Set([
  "OFFERS", "AGREEMENTS", "SHIFTS", "VEHICLES", "DRIVERS", "PERSONNEL",
  "SERVICE_REQUESTS", "OPERATIONS", "BUDGET", "FINANCE", "NOTIFICATIONS",
  "ORGANIZATION_PLANS", "TENANT_ACCESS",
]);

function integer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function roleFor(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "COMPANY" && ["SCHOOL", "ORGANIZATION"].includes(String(user?.companyKind || "").toUpperCase())) {
    return String(user.companyKind).toUpperCase();
  }
  return role;
}

async function driverIdsForUser(user) {
  const row = await prisma.driver.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
  return row?.id ? [row.id] : [];
}

async function personelIdsForUser(user) {
  const row = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true } });
  return row?.id ? [row.id] : [];
}

async function parentPersonelIdsForUser(user) {
  const rows = await prisma.parentChild.findMany({ where: { parentUserId: integer(user?.id) || -1 }, select: { personelId: true } });
  return rows.map((row) => integer(row.personelId)).filter(Boolean);
}

function personelRelation(personelIds) {
  return personelIds.length
    ? { OR: [
      { people: { some: { personelId: { in: personelIds } } } },
      { pickupRequests: { some: { personelId: { in: personelIds } } } },
      { assignments: { some: { personelId: { in: personelIds } } } },
    ] }
    : { id: -1 };
}

async function scopedWhere(user, entityType) {
  const role = roleFor(user);
  if (role === "SUPER_ADMIN") return {};
  if (role === "ROOM") return { roomId: integer(user?.roomId) || -1 };
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) return { companyId: integer(user?.companyId) || -1 };
  if (role === "DRIVER") {
    const driverIds = await driverIdsForUser(user);
    if (entityType === "vehicle") return { driver: { is: { userId: integer(user?.id) || -1 } } };
    return driverIds.length ? { driverId: { in: driverIds } } : { id: -1 };
  }
  if (role === "PERSONEL" || role === "PARENT") {
    const personelIds = role === "PERSONEL"
      ? await personelIdsForUser(user)
      : await parentPersonelIdsForUser(user);
    const relation = personelRelation(personelIds);
    if (entityType === "vehicle" || entityType === "driver") return { shifts: { some: relation } };
    return relation;
  }
  return { id: -1 };
}

async function authorizedEntityIds(user, entity) {
  const ids = entity?.id ? [integer(entity.id)].filter(Boolean) : [];
  if (!ids.length) return [];
  const role = roleFor(user);
  // Student is a semantic request type backed by the authorized personnel
  // record model.  Preserve the semantic type in the plan and only map it at
  // this deterministic authorization boundary.
  const type = entity.type === "student" ? "personnel" : entity.type;
  const scope = await scopedWhere(user, type);
  if (type === "shift") {
    const rows = await prisma.shift.findMany({ where: { ...scope, id: { in: ids } }, select: { id: true } });
    if (!rows.length && (integer(entity.relatedOfferId) || role === "ROOM")) {
      const offerScope = role === "ROOM"
        ? { roomId: integer(user?.roomId) || -1 }
        : role === "SUPER_ADMIN"
          ? {}
          : { shift: { is: { companyId: integer(user?.companyId) || -1 } } };
      const linked = await prisma.shiftOffer.findFirst({
        where: {
          ...offerScope,
          ...(integer(entity.relatedOfferId) ? { id: integer(entity.relatedOfferId) } : {}),
          shiftId: { in: ids },
        },
        select: { shiftId: true },
      });
      return linked?.shiftId ? [linked.shiftId] : [];
    }
    return rows.map((row) => row.id);
  }
  if (type === "vehicle") {
    const rows = await prisma.vehicle.findMany({ where: { ...scope, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }
  if (type === "offer") {
    const offerScope = roleFor(user) === "ROOM"
      ? { roomId: integer(user?.roomId) || -1 }
      : roleFor(user) === "SUPER_ADMIN"
        ? {}
        : { shift: { is: { companyId: integer(user?.companyId) || -1 } } };
    const rows = await prisma.shiftOffer.findMany({ where: { ...offerScope, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }
  if (type === "agreement") {
    const agreementScope = roleFor(user) === "ROOM"
      ? { roomId: integer(user?.roomId) || -1 }
      : roleFor(user) === "SUPER_ADMIN"
        ? {}
        : { companyId: integer(user?.companyId) || -1 };
    const rows = await prisma.agreement.findMany({ where: { ...agreementScope, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }
  if (type === "driver") {
    const driverScope = roleFor(user) === "DRIVER"
      ? { id: { in: await driverIdsForUser(user) } }
      : roleFor(user) === "PERSONEL" || roleFor(user) === "PARENT"
        ? { id: -1 }
        : scope;
    const rows = await prisma.driver.findMany({ where: { ...driverScope, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }
  if (type === "personnel") {
    const personnelScope = role === "PARENT"
      ? { id: { in: await parentPersonelIdsForUser(user) } }
      : role === "PERSONEL"
        ? { id: { in: await personelIdsForUser(user) } }
        : ["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)
          ? { companyId: integer(user?.companyId) || -1 }
          : { id: -1 };
    const rows = await prisma.personel.findMany({ where: { ...personnelScope, id: { in: ids } }, select: { id: true } });
    return rows.map((row) => row.id);
  }
  if (type === "serviceRequest") {
    let personelIds = [];
    if (role === "PERSONEL") personelIds = await personelIdsForUser(user);
    if (role === "PARENT") personelIds = await parentPersonelIdsForUser(user);
    if (!personelIds.length) return [];
    const rows = await prisma.pickupRequest.findMany({
      where: { id: { in: ids }, personelId: { in: personelIds } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  return [];
}

export async function authorizeSemanticRequest({ user, plan } = {}) {
  const role = roleFor(user);
  const capabilities = getRoleDomainCapabilities(user).capabilities || {};
  const requestedDomains = Array.isArray(plan?.requestedDomains) ? plan.requestedDomains : [];
  const deniedDomains = requestedDomains.filter((domain) => PROTECTED_DOMAINS.has(domain) && capabilities[domain] !== "ALLOW_READ" && capabilities[domain] !== "CONDITIONAL_RECORD_SCOPE");
  const crossTenant = Boolean(plan?.crossTenantRequested);
  if ((crossTenant && role !== "SUPER_ADMIN") || deniedDomains.length) {
    return {
      status: "DENY",
      reason: crossTenant && role !== "SUPER_ADMIN" ? "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL" : "DOMAIN_CAPABILITY_DENIED",
      deniedDomains,
      unauthorizedEntities: [],
      canonicalPolicy: role === "SUPER_ADMIN" ? "SUPER_ADMIN_ALLOW_READ_ALL_DOMAINS" : "ROLE_TENANT_SCOPE",
    };
  }

  const entities = Array.isArray(plan?.entities) ? plan.entities : plan?.entity ? [plan.entity] : [];
  const unauthorizedEntities = [];
  for (const entity of entities) {
    if (!entity?.id || role === "SUPER_ADMIN") continue;
    let allowedIds = [];
    try {
      allowedIds = await authorizedEntityIds(user, entity);
    } catch {
      // A scope-check failure is a deny, never a fallback to broad retrieval.
      allowedIds = [];
    }
    if (!allowedIds.includes(integer(entity.id))) unauthorizedEntities.push({ type: entity.type, id: integer(entity.id) });
  }
  if (unauthorizedEntities.length) {
    return {
      status: "DENY",
      reason: "RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL",
      deniedDomains: requestedDomains,
      unauthorizedEntities,
      canonicalPolicy: "ROLE_TENANT_SCOPE",
    };
  }
  return {
    status: "ALLOW",
    reason: role === "SUPER_ADMIN" ? "SUPER_ADMIN_CANONICAL_READ_SCOPE" : "CANONICAL_RBAC_AND_TENANT_SCOPE_ALLOW",
    deniedDomains: [],
    unauthorizedEntities: [],
    canonicalPolicy: role === "SUPER_ADMIN" ? "SUPER_ADMIN_ALLOW_READ_ALL_DOMAINS" : "ROLE_TENANT_SCOPE",
  };
}

export function authorizationBoundaryReply(decision) {
  const labels = {
    OFFERS: "teklif",
    AGREEMENTS: "sözleşme",
    SHIFTS: "vardiya",
    VEHICLES: "araç",
    DRIVERS: "sürücü",
    PERSONNEL: "personel/veli/öğrenci",
    SERVICE_REQUESTS: "servis talebi",
    OPERATIONS: "operasyon",
    BUDGET: "bütçe ve maliyet",
    FINANCE: "mali kayıt",
    NOTIFICATIONS: "bildirim",
    ORGANIZATION_PLANS: "organizasyon planı",
    TENANT_ACCESS: "hesap erişimi",
  };
  const domains = Array.isArray(decision?.deniedDomains)
    ? decision.deniedDomains.filter(Boolean).map((domain) => labels[domain] || "yetkili kayıt alanı").join(", ")
    : "";
  return domains
    ? `Bu oturumda ${domains} alanı için yetkim yok; korunmuş kayıtları okumadım.`
    : "Bu isteğin kayıt kapsamı mevcut oturumla doğrulanamadı; korunmuş kayıtları okumadım.";
}
