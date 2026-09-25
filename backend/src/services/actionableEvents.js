import prisma from "../prisma.js";
import { listFieldFeedbackRecords } from "../ops/fieldFeedbackLoop.js";

// Round-2 canonical read-side source. This service is deliberately read-only:
// both the Command Center and Sefer Abi use the same scoped event snapshot.
export const ACTIONABLE_EVENT_SOURCE_ID = "actionable-events-v1";

// The role command center and Sefer Abi can be read moments apart.  Preserve
// the server-produced snapshot the user is actually viewing for a brief,
// scope-bound window so a CURRENT_SCREEN question cannot replace visible
// zero-state truth with a newer role-global signal.  No client counter is
// accepted: both publisher and reader work exclusively with this authorized
// read model.
const CURRENT_SCREEN_SNAPSHOT_TTL_MS = 90 * 1000;
const currentScreenSnapshots = new Map();

const OPEN_OFFER_STATUSES = ["OPEN", "COUNTERED"];
const REVIEW_AGREEMENT_STATUSES = ["REQUESTED", "COUNTERED"];
const ACTIVE_SHIFT_STATUSES = ["APPROVED", "ACTIVE"];

function roleKey(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "COMPANY") {
    const kind = String(user?.companyKind || "").toUpperCase();
    if (kind === "SCHOOL") return "SCHOOL";
    if (kind === "ORGANIZATION") return "ORGANIZATION";
  }
  return role;
}

export function roleHomePathForUser(user) {
  const role = roleKey(user).toLowerCase();
  return ["super_admin", "room", "company", "school", "organization", "driver", "personel", "parent"].includes(role)
    ? `/${role === "super_admin" ? "superadmin" : role}`
    : "";
}

function normalizeScreenPath(value) {
  return String(value || "").split("?")[0].replace(/^#/, "").replace(/\/+$/, "") || "/";
}

function currentScreenScopeKey(user, path) {
  return [
    Number(user?.id || 0),
    roleKey(user),
    Number(user?.companyId || 0),
    Number(user?.roomId || 0),
    normalizeScreenPath(path),
  ].join(":");
}

export function publishActionableCurrentScreenSnapshot({ user, path, snapshot } = {}) {
  const normalizedPath = normalizeScreenPath(path || roleHomePathForUser(user));
  if (!snapshot || normalizedPath !== normalizeScreenPath(roleHomePathForUser(user))) return snapshot || null;
  currentScreenSnapshots.set(currentScreenScopeKey(user, normalizedPath), {
    expiresAt: Date.now() + CURRENT_SCREEN_SNAPSHOT_TTL_MS,
    snapshot,
  });
  return snapshot;
}

export async function readActionableCurrentScreenSnapshot({ user, path } = {}) {
  const normalizedPath = normalizeScreenPath(path);
  const key = currentScreenScopeKey(user, normalizedPath);
  const cached = currentScreenSnapshots.get(key);
  if (cached?.expiresAt > Date.now()) {
    return {
      ...cached.snapshot,
      source: `${ACTIONABLE_EVENT_SOURCE_ID}:published-current-screen`,
      currentScreenPath: normalizedPath,
      snapshotOrigin: "SERVER_PUBLISHED_UI_READ_MODEL",
    };
  }
  if (cached) currentScreenSnapshots.delete(key);
  const snapshot = await buildActionableEventsForUser(user);
  // A direct assistant request has no UI snapshot to reuse.  Publishing the
  // server result preserves one canonical source for the next same-screen
  // turn without accepting browser-provided facts.
  publishActionableCurrentScreenSnapshot({ user, path: normalizedPath, snapshot });
  return {
    ...snapshot,
    currentScreenPath: normalizedPath,
    snapshotOrigin: "SERVER_CURRENT_SCREEN_READ_MODEL",
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function event({
  id,
  group,
  priority,
  category,
  title,
  whatHappened,
  why,
  actionLabel,
  actionPath,
  evidence,
  sourceType,
  sourceId,
  companyId = null,
  roomId = null,
}) {
  return {
    id: String(id),
    group,
    priority,
    category,
    title,
    whatHappened,
    why,
    actionLabel,
    actionPath,
    evidence,
    sourceType,
    sourceId: integer(sourceId),
    scope: { companyId: integer(companyId), roomId: integer(roomId) },
  };
}

function uniqueEvents(rows) {
  const seen = new Set();
  return asArray(rows).filter((row) => {
    const key = `${row?.category || ""}:${row?.sourceType || ""}:${row?.sourceId || row?.id || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortEvents(rows) {
  const groupOrder = { "KRİTİK": 0, "BUGÜN ÇÖZÜLMELİ": 1, "TAKİP EDİLMELİ": 2, "FIRSAT": 3 };
  return uniqueEvents(rows).sort((a, b) => (
    Number(a?.priority || 99) - Number(b?.priority || 99)
      || Number(groupOrder[a?.group] ?? 9) - Number(groupOrder[b?.group] ?? 9)
      || String(a?.id || "").localeCompare(String(b?.id || ""), "tr")
  ));
}

function summaryFor(events) {
  const byGroup = { "KRİTİK": 0, "BUGÜN ÇÖZÜLMELİ": 0, "TAKİP EDİLMELİ": 0, "FIRSAT": 0 };
  for (const item of events) {
    if (Object.prototype.hasOwnProperty.call(byGroup, item.group)) byGroup[item.group] += 1;
  }
  return {
    total: events.length,
    byGroup,
    primaryEventId: events[0]?.id || null,
    primaryAction: events[0]?.actionLabel || null,
  };
}

function dayWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function hasStaleLocation(gpsLast, now = Date.now()) {
  if (!gpsLast?.at) return true;
  const at = new Date(gpsLast.at).getTime();
  return !Number.isFinite(at) || now - at > 5 * 60 * 1000;
}

async function loadCompanyContext(user) {
  const companyId = integer(user?.companyId);
  if (!companyId) return null;
  return prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, kind: true, name: true },
  });
}

async function buildCompanyEvents(context, role) {
  const companyId = integer(context?.id);
  if (!companyId) return [];
  const [offers, agreements, shifts, hakedis] = await Promise.all([
    prisma.shiftOffer.findMany({
      where: { shift: { is: { companyId } }, status: { in: OPEN_OFFER_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, status: true, shiftId: true, roomId: true, shift: { select: { startAt: true } } },
    }),
    prisma.agreement.findMany({
      where: { companyId, status: { in: REVIEW_AGREEMENT_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, status: true, roomId: true },
    }),
    prisma.shift.findMany({
      where: { companyId, status: { in: ACTIVE_SHIFT_STATUSES }, OR: [{ vehicleId: null }, { driverId: null }] },
      orderBy: { startAt: "asc" },
      take: 20,
      select: { id: true, vehicleId: true, driverId: true, startAt: true, roomId: true },
    }),
    prisma.hakedisRecord.findMany({
      where: { companyId, status: "READY" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, reference: true, roomId: true },
    }),
  ]);
  const rows = [];
  if (offers.length) {
    rows.push(event({
      id: `company:offers:${offers[0].id}`,
      group: "FIRSAT",
      priority: 4,
      category: "OFFER",
      title: `${offers.length} yeni teklif inceleme bekliyor`,
      whatHappened: "Hizmet planına bağlı yeni veya karşı teklif kaydı var.",
      why: "Uygun seçeneği karşılaştırıp karar vermen gerekebilir.",
      actionLabel: "Teklifleri karşılaştır",
      actionPath: role === "ORGANIZATION" ? "/organization/commercial-flow" : role === "SCHOOL" ? "/school/commercial-flow" : "/company/commercial-flow",
      evidence: `${offers.length} açık teklif kaydı`,
      sourceType: "ShiftOffer",
      sourceId: offers[0].id,
      companyId,
      roomId: offers[0].roomId,
    }));
  }
  if (agreements.length) {
    rows.push(event({
      id: `company:agreements:${agreements[0].id}`,
      group: "BUGÜN ÇÖZÜLMELİ",
      priority: 2,
      category: "AGREEMENT",
      title: `${agreements.length} sözleşme inceleme bekliyor`,
      whatHappened: "Sözleşme akışında karşı teklif veya onay bekleyen kayıt var.",
      why: "Operasyon planı bu karara bağlı olabilir.",
      actionLabel: "Sözleşmeleri incele",
      actionPath: role === "ORGANIZATION" ? "/organization/agreements" : role === "SCHOOL" ? "/school/agreements" : "/company/agreements",
      evidence: `${agreements.length} inceleme bekleyen sözleşme`,
      sourceType: "Agreement",
      sourceId: agreements[0].id,
      companyId,
      roomId: agreements[0].roomId,
    }));
  }
  if (shifts.length) {
    rows.push(event({
      id: `company:assignment:${shifts[0].id}`,
      group: "KRİTİK",
      priority: 1,
      category: "SHIFT",
      title: `${shifts.length} vardiyada atama eksik`,
      whatHappened: "Onaylı veya aktif vardiyalarda araç ya da sürücü ataması tamamlanmamış.",
      why: "Operasyon başlamadan önce saha hazırlığı tamamlanmalı.",
      actionLabel: "Atamaları tamamla",
      actionPath: role === "ORGANIZATION" ? "/organization/shifts" : role === "SCHOOL" ? "/school/shifts" : "/company/shifts",
      evidence: `${shifts.length} eksik araç/sürücü ataması`,
      sourceType: "Shift",
      sourceId: shifts[0].id,
      companyId,
      roomId: shifts[0].roomId,
    }));
  }
  if (hakedis.length) {
    rows.push(event({
      id: `company:finance:${hakedis[0].id}`,
      group: "TAKİP EDİLMELİ",
      priority: 3,
      category: "FINANCE",
      title: `${hakedis.length} hakediş önizlemesi inceleme bekliyor`,
      whatHappened: "Hakediş için salt okunur bir önizleme hazır.",
      why: "Tutarı ve dayanağı kullanıcı onayından önce kontrol etmelisin.",
      actionLabel: "Finans önizlemesini aç",
      actionPath: role === "ORGANIZATION" ? "/organization/financial-operations" : role === "SCHOOL" ? "/school/financial-operations" : "/company/financial-operations",
      evidence: `${hakedis.length} hazır hakediş önizlemesi`,
      sourceType: "HakedisRecord",
      sourceId: hakedis[0].id,
      companyId,
      roomId: hakedis[0].roomId,
    }));
  }
  return rows;
}

async function buildSchoolEvents(context) {
  const companyId = integer(context?.id);
  if (!companyId || String(context?.kind || "").toUpperCase() !== "SCHOOL") return [];
  const invites = await prisma.parentInvite.findMany({
    where: { companyId, consumedAt: null, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, childPersonelId: true },
  });
  if (!invites.length) return [];
  return [event({
    id: `school:access:${invites[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 3,
    category: "ACCESS",
    title: `${invites.length} veli erişimi tamamlanmayı bekliyor`,
    whatHappened: "Öğrenci servis bilgilerine erişim için açık davet var.",
    why: "Veli erişimi tamamlanmadan ilgili kişi canlı servis bilgisini göremeyebilir.",
    actionLabel: "Veli erişimini kontrol et",
    actionPath: "/school/parents",
    evidence: `${invites.length} açık veli erişim daveti`,
    sourceType: "ParentInvite",
    sourceId: invites[0].id,
    companyId,
  })];
}

async function buildOrganizationEvents(context) {
  const companyId = integer(context?.id);
  if (!companyId || String(context?.kind || "").toUpperCase() !== "ORGANIZATION") return [];
  const plans = await prisma.organizationPlan.findMany({
    where: { companyId, status: { in: ["DRAFT", "AGREEMENT_REQUESTED"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, status: true },
  });
  if (!plans.length) return [];
  return [event({
    id: `organization:plans:${plans[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 3,
    category: "PLAN",
    title: `${plans.length} plan sonraki adımı bekliyor`,
    whatHappened: "Gezi veya ulaşım planında hazırlık ya da sözleşme talebi adımı açık.",
    why: "Planı tamamlamak için eksik adımı gözden geçirmen gerekebilir.",
    actionLabel: "Planları incele",
    actionPath: "/organization/plans",
    evidence: `${plans.length} açık organizasyon planı`,
    sourceType: "OrganizationPlan",
    sourceId: plans[0].id,
    companyId,
  })];
}

async function buildRoomEvents(user) {
  const roomId = integer(user?.roomId);
  if (!roomId) return [];
  const { start, end } = dayWindow();
  const [offers, agreements, shifts, vehicles, hakedis] = await Promise.all([
    prisma.shiftOffer.findMany({
      where: { roomId, status: { in: OPEN_OFFER_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, roomId: true, shiftId: true },
    }),
    prisma.agreement.findMany({
      where: { roomId, status: { in: REVIEW_AGREEMENT_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, roomId: true },
    }),
    prisma.shift.findMany({
      where: { roomId, status: { in: ACTIVE_SHIFT_STATUSES }, startAt: { lt: end }, endAt: { gte: start }, OR: [{ vehicleId: null }, { driverId: null }] },
      orderBy: { startAt: "asc" },
      take: 20,
      select: { id: true, vehicleId: true, driverId: true, companyId: true },
    }),
    prisma.vehicle.findMany({
      where: { roomId, archivedAt: null },
      take: 200,
      select: { id: true, plate: true, gpsLast: { select: { at: true } } },
    }),
    prisma.hakedisRecord.findMany({
      where: { roomId, status: "READY" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, companyId: true },
    }),
  ]);
  const rows = [];
  if (offers.length) rows.push(event({
    id: `room:offers:${offers[0].id}`,
    group: "FIRSAT",
    priority: 4,
    category: "OFFER",
    title: `${offers.length} teklif yanıt bekliyor`,
    whatHappened: "Yetkili operasyon akışında açık veya karşı teklif var.",
    why: "Yanıt verirsen ticari plan ilerleyebilir.",
    actionLabel: "Teklifleri incele",
    actionPath: "/room/offers",
    evidence: `${offers.length} açık teklif`,
    sourceType: "ShiftOffer",
    sourceId: offers[0].id,
    roomId,
  }));
  if (agreements.length) rows.push(event({
    id: `room:agreements:${agreements[0].id}`,
    group: "BUGÜN ÇÖZÜLMELİ",
    priority: 2,
    category: "AGREEMENT",
    title: `${agreements.length} sözleşme inceleme bekliyor`,
    whatHappened: "Sözleşme akışında karşı tarafın yanıtı veya karar bekleniyor.",
    why: "Vardiya ve teklif akışı bu karara bağlı olabilir.",
    actionLabel: "Sözleşmeleri incele",
    actionPath: "/room/agreements",
    evidence: `${agreements.length} inceleme bekleyen sözleşme`,
    sourceType: "Agreement",
    sourceId: agreements[0].id,
    roomId,
  }));
  if (shifts.length) rows.push(event({
    id: `room:assignment:${shifts[0].id}`,
    group: "KRİTİK",
    priority: 1,
    category: "SHIFT",
    title: `${shifts.length} vardiyada atama eksik`,
    whatHappened: "Onaylı veya aktif vardiyalarda araç ya da sürücü ataması tamamlanmamış.",
    why: "Operasyon başlamadan önce atamayı tamamlaman gerekiyor.",
    actionLabel: "Vardiya atamalarını aç",
    actionPath: "/room/shifts",
    evidence: `${shifts.length} eksik araç/sürücü ataması`,
    sourceType: "Shift",
    sourceId: shifts[0].id,
    roomId,
    companyId: shifts[0].companyId,
  }));
  const staleVehicles = vehicles.filter((vehicle) => hasStaleLocation(vehicle.gpsLast));
  if (staleVehicles.length) rows.push(event({
    id: `room:gps:${staleVehicles[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 2,
    category: "GPS",
    title: `${staleVehicles.length} araçta konum bilgisi güncel değil`,
    whatHappened: "Bazı yetkili araçlardan son beş dakika içinde konum bilgisi alınmadı.",
    why: "Canlı operasyon görünürlüğü etkilenebilir; önce araç durumunu kontrol et.",
    actionLabel: "Canlı durumu aç",
    actionPath: "/room/map",
    evidence: `${staleVehicles.length} araçta gecikmiş veya eksik konum bilgisi`,
    sourceType: "VehicleGps",
    sourceId: staleVehicles[0].id,
    roomId,
  }));
  if (hakedis.length) rows.push(event({
    id: `room:finance:${hakedis[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 3,
    category: "FINANCE",
    title: `${hakedis.length} hakediş önizlemesi inceleme bekliyor`,
    whatHappened: "Hakediş için salt okunur bir önizleme hazır.",
    why: "Tutarı ve dayanağı kullanıcı onayından önce kontrol etmelisin.",
    actionLabel: "Finans önizlemesini aç",
    actionPath: "/room/financial-operations",
    evidence: `${hakedis.length} hazır hakediş önizlemesi`,
    sourceType: "HakedisRecord",
    sourceId: hakedis[0].id,
    roomId,
    companyId: hakedis[0].companyId,
  }));
  return rows;
}

async function buildDriverEvents(user) {
  const driver = await prisma.driver.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true, roomId: true } });
  if (!driver) return [];
  const { start, end } = dayWindow();
  const shifts = await prisma.shift.findMany({
    where: { driverId: driver.id, status: { in: ACTIVE_SHIFT_STATUSES }, startAt: { lt: end }, endAt: { gte: start } },
    orderBy: { startAt: "asc" },
    take: 10,
    select: { id: true, vehicleId: true, companyId: true },
  });
  if (!shifts.length) return [];
  const missingVehicle = shifts.filter((shift) => !shift.vehicleId);
  if (!missingVehicle.length) return [];
  return [event({
    id: `driver:assignment:${missingVehicle[0].id}`,
    group: "KRİTİK",
    priority: 1,
    category: "SHIFT",
    title: "Bugünkü vardiyada araç ataması eksik",
    whatHappened: "Bugün sana bağlı bir vardiyada araç bilgisi tamamlanmamış.",
    why: "Yola çıkmadan önce operasyon sorumlusuyla eşleşmeyi netleştir.",
    actionLabel: "Bugünkü görevi aç",
    actionPath: "/driver/today",
    evidence: `${missingVehicle.length} vardiyada araç ataması eksik`,
    sourceType: "Shift",
    sourceId: missingVehicle[0].id,
    companyId: missingVehicle[0].companyId,
    roomId: driver.roomId,
  })];
}

async function buildPersonelEvents(user) {
  const personel = await prisma.personel.findFirst({ where: { userId: integer(user?.id) || -1 }, select: { id: true, companyId: true } });
  if (!personel) return [];
  const requests = await prisma.pickupRequest.findMany({ where: { personelId: personel.id, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, shift: { select: { roomId: true } } } });
  if (!requests.length) return [];
  return [event({
    id: `personel:request:${requests[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 3,
    category: "SERVICE",
    title: "Servis talebin takip bekliyor",
    whatHappened: "Sana ait açık bir servis talebi bulunuyor.",
    why: "Güncel durumunu kontrol etmen gerekebilir.",
    actionLabel: "Servis durumumu aç",
    actionPath: "/personel/my",
    evidence: `${requests.length} açık servis talebi`,
    sourceType: "PickupRequest",
    sourceId: requests[0].id,
    companyId: personel.companyId,
    roomId: requests[0].shift?.roomId,
  })];
}

async function buildParentEvents(user) {
  const parentUserId = integer(user?.id);
  if (!parentUserId) return [];
  const links = await prisma.parentChild.findMany({ where: { parentUserId }, select: { personelId: true, child: { select: { companyId: true } } } });
  const childIds = links.map((item) => Number(item.personelId)).filter(Boolean);
  if (!childIds.length) return [];
  const requests = await prisma.pickupRequest.findMany({ where: { personelId: { in: childIds }, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, shift: { select: { roomId: true } } } });
  if (!requests.length) return [];
  return [event({
    id: `parent:request:${requests[0].id}`,
    group: "TAKİP EDİLMELİ",
    priority: 3,
    category: "SERVICE",
    title: "Çocuğun servis bilgisinde takip gereken kayıt var",
    whatHappened: "Yetkili çocuk-servis kaydında açık bir talep bulunuyor.",
    why: "Canlı servis bilgisini kontrol etmen gerekebilir.",
    actionLabel: "Canlı durumu aç",
    actionPath: "/parent/live",
    evidence: `${requests.length} açık servis talebi`,
    sourceType: "PickupRequest",
    sourceId: requests[0].id,
    companyId: links[0]?.child?.companyId,
    roomId: requests[0].shift?.roomId,
  })];
}

async function buildSuperAdminEvents() {
  const records = (await listFieldFeedbackRecords({ roleId: "ALL" }))
    .filter((item) => !["COZULDU", "KAPANDI"].includes(String(item?.status || "").toUpperCase()))
    .slice(0, 20);
  if (!records.length) return [];
  return [event({
    id: `superadmin:feedback:${records[0].id}`,
    group: "BUGÜN ÇÖZÜLMELİ",
    priority: 2,
    category: "PLATFORM",
    title: `${records.length} açık platform geri bildirimi var`,
    whatHappened: "Platform yönetiminde kapanmamış geri bildirim kaydı var.",
    why: "Kalite ve operasyon sürekliliği için inceleme gerekiyor.",
    actionLabel: "Geri bildirimleri incele",
    actionPath: "/superadmin/operations",
    evidence: `${records.length} açık geri bildirim`,
    sourceType: "FieldFeedback",
    sourceId: records[0].id,
  })];
}

export async function buildActionableEventsForUser(user) {
  const role = roleKey(user);
  const context = role === "COMPANY" || role === "SCHOOL" || role === "ORGANIZATION" ? await loadCompanyContext(user) : null;
  let rows = [];
  if (role === "COMPANY") rows = await buildCompanyEvents(context, role);
  else if (role === "SCHOOL") rows = await buildSchoolEvents(context);
  else if (role === "ORGANIZATION") rows = [...await buildCompanyEvents(context, role), ...await buildOrganizationEvents(context)];
  else if (role === "ROOM") rows = await buildRoomEvents(user);
  else if (role === "DRIVER") rows = await buildDriverEvents(user);
  else if (role === "PERSONEL") rows = await buildPersonelEvents(user);
  else if (role === "PARENT") rows = await buildParentEvents(user);
  else if (role === "SUPER_ADMIN") rows = await buildSuperAdminEvents();

  const events = sortEvents(rows);
  return {
    source: ACTIONABLE_EVENT_SOURCE_ID,
    generatedAt: new Date().toISOString(),
    role,
    companyKind: context?.kind || null,
    tenant: { companyId: integer(user?.companyId), roomId: integer(user?.roomId) },
    events,
    summary: summaryFor(events),
  };
}

function normalizeQuestion(value) {
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

function questionTopic(value) {
  const text = normalizeQuestion(value);
  if (/vardiya.*sorun|sorun.*vardiya/.test(text)) return "SHIFT";
  if (/su anda sorun|sorun var mi|sorun var/.test(text)) return "PROBLEM";
  if (/yeni teklif|teklif var mi|teklif/.test(text)) return "OFFER";
  if (/bekleyen sozlesme|sozlesme var mi|sozlesme/.test(text)) return "AGREEMENT";
  if (/bugun neye|bugun neye bak|neyi kontrol|neye bakmaliyim/.test(text)) return "TODAY";
  if (/benden onay|onay bekleyen|onay/.test(text)) return "APPROVAL";
  if (/firsat var mi|firsat/.test(text)) return "OPPORTUNITY";
  if (/siradaki dogru islem|sonraki dogru islem|ne yapmaliyim/.test(text)) return "NEXT";
  return "";
}

function topicEvents(topic, events) {
  const rows = asArray(events);
  if (topic === "PROBLEM") return rows.filter((item) => ["KRİTİK", "BUGÜN ÇÖZÜLMELİ"].includes(item.group) || ["GPS", "SHIFT", "SERVICE", "PLATFORM"].includes(item.category));
  if (topic === "OFFER" || topic === "OPPORTUNITY") return rows.filter((item) => item.category === "OFFER");
  if (topic === "AGREEMENT" || topic === "APPROVAL") return rows.filter((item) => ["AGREEMENT", "FINANCE"].includes(item.category));
  if (topic === "SHIFT") return rows.filter((item) => ["SHIFT", "GPS", "SERVICE"].includes(item.category));
  return rows;
}

export function buildActionableAnswer({ message, snapshot }) {
  const topic = questionTopic(message);
  if (!topic) return null;
  const events = topicEvents(topic, snapshot?.events || []);
  const shown = events.slice(0, 3);
  const topicLabel = {
    PROBLEM: "açık sorun",
    OFFER: "yeni teklif",
    AGREEMENT: "bekleyen sözleşme",
    TODAY: "bugünkü öncelik",
    SHIFT: "vardiya durumu",
    APPROVAL: "onay bekleyen kayıt",
    OPPORTUNITY: "fırsat",
    NEXT: "sıradaki işlem",
  }[topic];
  if (!shown.length) {
    return {
      topic,
      reply: `Yetkili mevcut kayıtlarda şu anda ${topicLabel} görünmüyor. Yeni bir kayıt oluştuğunda burada özetlenir.`,
      nextAction: "Yeni kayıt oluştuğunda tekrar kontrol et.",
      eventIds: [],
    };
  }
  const lines = shown.map((item) => `${item.title}. ${item.whatHappened} ${item.evidence}`);
  const next = shown[0]?.actionLabel ? `Önce “${shown[0].actionLabel}” adımını öneririm.` : "Önce en üstteki kaydı kontrol et.";
  return {
    topic,
    reply: `${topicLabel[0].toUpperCase()}${topicLabel.slice(1)} için ${lines.join(" ")} ${next}`.trim(),
    nextAction: shown[0]?.actionLabel || "İlk kaydı kontrol et",
    eventIds: shown.map((item) => item.id),
  };
}
