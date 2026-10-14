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

function canonicalDomain(value) {
  const domain = String(value || "").trim().toUpperCase();
  return {
    AGREEMENT: "AGREEMENTS",
    SHIFT: "SHIFTS",
    VEHICLE: "VEHICLES",
    DRIVER: "DRIVERS",
    PERSONNEL: "PERSONNEL",
    OFFER: "OFFERS",
    SERVICE_REQUEST: "SERVICE_REQUESTS",
  }[domain] || domain;
}

function authorizationResult({ status, reason, deniedDomains = [], unauthorizedEntities = [], authorizedEntityRefs = [], deniedCandidateRefs = [], canonicalPolicy }) {
  const authorizationStatus = status === "ALLOW"
    ? (deniedCandidateRefs.length ? "REQUIRES_CLARIFICATION" : "AUTHORIZED")
    : status === "NOT_FOUND" ? "NOT_FOUND" : "DENIED";
  return {
    status,
    authorizationStatus,
    reason,
    deniedDomains,
    unauthorizedEntities,
    authorizedEntityRefs,
    deniedCandidateRefs,
    canonicalPolicy,
  };
}

function roleFor(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "COMPANY" && ["SCHOOL", "ORGANIZATION"].includes(String(user?.companyKind || "").toUpperCase())) {
    return String(user.companyKind).toUpperCase();
  }
  return role;
}

export function normalizeAuthorizationEntityType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["service_request", "servicerequest"].includes(normalized)
    ? "serviceRequest"
    : normalized;
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
  const normalizedType = normalizeAuthorizationEntityType(entity.type);
  const type = normalizedType === "student" ? "personnel" : normalizedType;
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

export async function authorizeSemanticRequest({ user, plan, request } = {}) {
  const isSupportedCanonicalTransport = (candidate) => ["SEFER-ABI-CANONICAL-REQUEST-V2", "SEFER-ABI-CANONICAL-REQUEST-V3"].includes(candidate?.version);
  const canonicalRequest = isSupportedCanonicalTransport(request)
    ? request
    : isSupportedCanonicalTransport(plan?.request)
      ? plan.request
      : null;
  if (request && !canonicalRequest) {
    return authorizationResult({
      status: "DENY",
      reason: "CANONICAL_REQUEST_UNRESOLVED",
      canonicalPolicy: "CANONICAL_REQUEST_VALIDATION_REQUIRED",
    });
  }
  const semanticPlan = canonicalRequest ? plan?.plan || {} : plan || {};
  const plannerState = plan?.plan || plan || {};
  const collectionRead = Boolean(
    canonicalRequest?.operation === "VIEW_AUTHORIZED_SURFACE"
      && plannerState?.typedRequest?.taskType === "SCREEN_CONTEXT"
      && plannerState?.typedRequest?.selectedRecordIntent !== true
      && plannerState?.typedRequest?.recordDetailsIntent !== true,
  );
  const role = roleFor(user);
  const capabilities = getRoleDomainCapabilities(user).capabilities || {};
  const requestedDomains = canonicalRequest
    ? [canonicalDomain(canonicalRequest.domain)].filter(Boolean)
    : Array.isArray(semanticPlan?.requestedDomains) ? semanticPlan.requestedDomains : [];
  const createShiftOperation = canonicalRequest?.operation === "CREATE_SHIFT"
    && canonicalRequest?.semanticAction?.actionClass === "CREATE";
  const createShiftAuthorizedRole = role === "COMPANY" || role === "SUPER_ADMIN";
  // CREATE is a semantic action, not a permission grant.  The read-domain
  // capability map must not authorize a create workflow for roles that do not
  // own that capability.  ROOM is intentionally mapped upstream to the
  // existing-shift read surface and therefore does not enter this branch.
  if (createShiftOperation && !createShiftAuthorizedRole) {
    return authorizationResult({
      status: "DENY",
      reason: "CREATE_CAPABILITY_DENIED_BY_ROLE",
      deniedDomains: ["SHIFTS"],
      unauthorizedEntities: [],
      deniedCandidateRefs: canonicalRequest?.candidateEntityRefs || [],
      canonicalPolicy: "ROLE_CREATE_CAPABILITY_BOUNDARY",
    });
  }
  const deniedDomains = requestedDomains.filter((domain) => PROTECTED_DOMAINS.has(domain) && capabilities[domain] !== "ALLOW_READ" && capabilities[domain] !== "CONDITIONAL_RECORD_SCOPE");
  const crossTenant = Boolean(semanticPlan?.crossTenantRequested || canonicalRequest?.candidateEntityRefs?.some((ref) => ref?.tenantId && Number(ref.tenantId) !== Number(user?.companyId)));
  if ((crossTenant && role !== "SUPER_ADMIN") || deniedDomains.length) {
    return authorizationResult({
      status: "DENY",
      reason: crossTenant && role !== "SUPER_ADMIN" ? "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL" : "DOMAIN_CAPABILITY_DENIED",
      deniedDomains,
      unauthorizedEntities: [],
      deniedCandidateRefs: canonicalRequest?.candidateEntityRefs || [],
      canonicalPolicy: role === "SUPER_ADMIN" ? "SUPER_ADMIN_ALLOW_READ_ALL_DOMAINS" : "ROLE_TENANT_SCOPE",
    });
  }

  const entities = canonicalRequest
    ? (Array.isArray(canonicalRequest.candidateEntityRefs) ? canonicalRequest.candidateEntityRefs.filter((ref) => ref?.id) : [])
    : Array.isArray(semanticPlan?.entities) ? semanticPlan.entities : semanticPlan?.entity ? [semanticPlan.entity] : [];
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
    return authorizationResult({
      status: "DENY",
      reason: "RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL",
      deniedDomains: requestedDomains,
      unauthorizedEntities,
      deniedCandidateRefs: unauthorizedEntities,
      canonicalPolicy: "ROLE_TENANT_SCOPE",
    });
  }
  return authorizationResult({
    status: "ALLOW",
    reason: role === "SUPER_ADMIN" ? "SUPER_ADMIN_CANONICAL_READ_SCOPE" : "CANONICAL_RBAC_AND_TENANT_SCOPE_ALLOW",
    deniedDomains: [],
    unauthorizedEntities: [],
    authorizedEntityRefs: entities.map((entity) => ({ type: entity.type, id: integer(entity.id) })).filter((entity) => entity.id),
    deniedCandidateRefs: canonicalRequest
      ? (canonicalRequest.candidateEntityRefs || []).filter((ref) => !ref?.id
        && !(collectionRead && ref?.source === "TEXT_ENTITY_CANDIDATE")
        && !(createShiftOperation && createShiftAuthorizedRole && ref?.source === "TEXT_ENTITY_CANDIDATE"))
      : [],
    canonicalPolicy: role === "SUPER_ADMIN" ? "SUPER_ADMIN_ALLOW_READ_ALL_DOMAINS" : "ROLE_TENANT_SCOPE",
  });
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
