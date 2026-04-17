import { Router } from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { prisma } from "../../prisma.js";
import { audit } from "../../audit.js";
import { clusterStops } from "../../services/clusterStops.js";
import { etaMinutes } from "../../geo.js";
import { computeRouteKey, parsePolyline, sumDistanceKm } from "../../services/routeLearning.js";
import { getShiftAndCheckScopeOrThrow } from "./helpers.js";
import { validateWithZod } from "../../z.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { httpError } from "../../errors/http.js";
import { clearShiftRoutePreviewCache, rebuildShiftRouteStateBestEffort } from "../../services/shiftRouteState.js";
import { decorateGeoItem, inferGeoState } from "../../services/geoState.js";
import { rememberResponse } from "../../utils/responseCache.js";
import { resolveAgreementSourceShiftPayload } from "../../services/agreementSourceShift.js";

const qModeSchema = z
  .preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v === "object") return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    return s;
  }, z.enum(["REPLACE", "MERGE"]).optional())
  .transform((v) => v ?? "REPLACE");

const qMaxWalkSchema = z
  .preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v === "object") return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    return Number(s);
  }, z.number().int().min(50).max(2000).optional())
  .transform((v) => v ?? 250);

const personelItemSchema = z.object({
  personelId: z.preprocess((v) => (v == null ? undefined : Number(v)), z.number().int().positive()).optional(),
  fullName: z.string().min(1).max(120),
  phone: z.string().trim().min(3).max(32).optional().nullable(),
  address: z.string().trim().min(2).max(240).optional().nullable(),
  lat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  lng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  geoManualOverride: z.boolean().optional(),
  kind: z.enum(["PERSONEL", "STUDENT"]).optional(),
});

const importRawItemSchema = z
  .object({
    personelId: z.any().optional(),
    fullName: z.any().optional(),
    phone: z.any().optional(),
    address: z.any().optional(),
    lat: z.any().optional(),
    lng: z.any().optional(),
    geoManualOverride: z.any().optional(),
    kind: z.any().optional(),
  })
  .passthrough();

function routePreviewScope(user) {
  return { role: user?.role, companyId: user?.companyId, roomId: user?.roomId };
}

function sanitizePhone(p) {
  const s = String(p ?? "").trim();
  if (!s) return null;
  return s;
}

function sanitizeText(v, maxLen = 240) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

function normalizeCoord(v, kind) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

function warning(rowNo, code, message, level = "warning") {
  return { rowNo, code, message, level };
}

function buildImportFingerprint(item) {
  const fullName = String(item.fullName || "").trim().toLowerCase();
  const phone = String(item.phone || "").trim().toLowerCase();
  const address = String(item.address || "").trim().toLowerCase();
  const lat = typeof item.lat === "number" ? item.lat.toFixed(6) : "";
  const lng = typeof item.lng === "number" ? item.lng.toFixed(6) : "";
  return [fullName, phone, address, lat, lng].join("|");
}

function normalizeImportRows(rows) {
  const accepted = [];
  const warnings = [];
  const seen = new Set();

  (Array.isArray(rows) ? rows : []).forEach((raw, index) => {
    const rowNo = index + 1;
    const parsed = importRawItemSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      warnings.push(warning(rowNo, "INVALID_ROW", "SatÄ±r biÃ§imi okunamadÄ±.", "error"));
      return;
    }

    const value = parsed.data;
    const personelIdRaw = value.personelId == null || value.personelId === "" ? undefined : Number(value.personelId);
    const personelId = Number.isInteger(personelIdRaw) && personelIdRaw > 0 ? personelIdRaw : undefined;
    const fullName = sanitizeText(value.fullName, 120);
    const phone = sanitizePhone(value.phone);
    const address = sanitizeText(value.address, 240);
    const lat = normalizeCoord(value.lat, "lat");
    const lng = normalizeCoord(value.lng, "lng");
    const geoManualOverride = value.geoManualOverride === true || value.geoManualOverride === "true";
    const kind = value.kind === "STUDENT" ? "STUDENT" : value.kind === "PERSONEL" ? "PERSONEL" : undefined;

    if (!fullName) {
      warnings.push(warning(rowNo, "MISSING_NAME", "Ad soyad boÅŸ olduÄŸu iÃ§in satÄ±r atlandÄ±.", "error"));
      return;
    }

    const hasCoords = typeof lat === "number" && typeof lng === "number";
    const hasPartialCoords = (lat == null) !== (lng == null);
    if (hasPartialCoords) {
      warnings.push(
        warning(rowNo, "INVALID_COORD", "Enlem/boylam eksik veya geÃ§ersiz; adres varsa review akÄ±ÅŸÄ±na dÃ¼ÅŸecek.")
      );
    }

    if (!address && !hasCoords) {
      warnings.push(
        warning(rowNo, "MISSING_ADDRESS_OR_COORDS", "Adres veya geÃ§erli koordinat olmadÄ±ÄŸÄ± iÃ§in satÄ±r atlandÄ±.", "error")
      );
      return;
    }

    const normalized = {
      personelId,
      fullName,
      phone,
      address,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      geoManualOverride,
      kind,
    };

    const fingerprint = buildImportFingerprint(normalized);
    if (seen.has(fingerprint)) {
      warnings.push(warning(rowNo, "DUPLICATE_ROW", "AynÄ± satÄ±r bu dosyada tekrar ettiÄŸi iÃ§in atlandÄ±."));
      return;
    }
    seen.add(fingerprint);

    const geoMeta = inferGeoState(normalized);
    if (geoMeta.geoStatus === "NEEDS_REVIEW") {
      warnings.push(
        warning(rowNo, "GEO_NEEDS_REVIEW", `${geoMeta.geoReasonText}; kayÄ±t review gerektiriyor.`)
      );
    }

    accepted.push({ rowNo, item: normalized, geoStatus: geoMeta.geoStatus, geoReason: geoMeta.geoReason, rawJson: raw ?? null });
  });

  return { accepted, warnings };
}

function normalizeGeoStatus(input) {
  return inferGeoState(input).geoStatus;
}

async function upsertCompanyPersonel(companyId, item, defaultKind) {
  const phone = sanitizePhone(item.phone);
  const geoMeta = inferGeoState(item);
  const data = {
    fullName: item.fullName,
    kind: item.kind ?? defaultKind,
    phone,
    homeAddress: item.address ?? null,
    homeLat: typeof item.lat === "number" ? item.lat : null,
    homeLng: typeof item.lng === "number" ? item.lng : null,
    geoManualOverride: Boolean(item.geoManualOverride),
    geoStatus: geoMeta.geoStatus,
    geoUpdatedAt:
      typeof item.lat === "number" && typeof item.lng === "number" ? new Date() : null,
  };

  // If explicit personelId provided, update it (must belong to company)
  if (item.personelId) {
    const existing = await prisma.personel.findFirst({
      where: { id: item.personelId, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw Object.assign(new Error("personelId does not belong to this company"), { status: 400 });
    }
    const personel = await prisma.personel.update({ where: { id: item.personelId }, data });
    return { personel, action: "updated" };
  }

  // If phone present, upsert by (companyId, phone)
  if (phone) {
    const existing = await prisma.personel.findUnique({
      where: { companyId_phone: { companyId, phone } },
      select: { id: true },
    });
    const personel = await prisma.personel.upsert({
      where: { companyId_phone: { companyId, phone } },
      create: { companyId, ...data },
      update: data,
    });
    return { personel, action: existing ? "updated" : "created" };
  }

  // Otherwise create a new record (no stable key)
  const personel = await prisma.personel.create({ data: { companyId, ...data } });
  return { personel, action: "created" };
}

async function getShiftPeople(shiftId) {
  const rows = await prisma.shiftPersonel.findMany({
    where: { shiftId },
    include: {
      personel: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          homeAddress: true,
          homeLat: true,
          homeLng: true,
          geoStatus: true,
          geoManualOverride: true,
          geoNote: true,
          geoUpdatedAt: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return rows
    .map((r) => decorateGeoItem(r.personel))
    .filter(Boolean);
}

function pickEligiblePoints(personels) {
  const ok = [];
  const skipped = [];

  for (const p of personels) {
    const lat = p.homeLat;
    const lng = p.homeLng;
    const eligible =
      (p.geoStatus === "OK" || p.geoManualOverride) &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    if (eligible) ok.push({ personelId: p.id, lat, lng });
    else skipped.push(p);
  }

  return { ok, skipped };
}

function parseItemArray(req) {
  const items = req.body?.items ?? req.body?.rows ?? [];
  return validateWithZod(z.array(personelItemSchema).max(500), items);
}


async function generateStopsForShiftInternal({ req, shift, mode, maxWalkM }) {
  const companyHub = (shift.hubLat == null || shift.hubLng == null)
    ? await prisma.company.findUnique({ where: { id: shift.companyId }, select: { hubLat: true, hubLng: true } })
    : null;

  const people = await getShiftPeople(shift.id);
  const { ok: points, skipped } = pickEligiblePoints(people);

  if (points.length === 0) {
    throw httpError(400, "NO_ELIGIBLE_POINTS", "No eligible personel points (need geoStatus OK or manual override + lat/lng)", {
      skippedCount: skipped.length,
      hubApplied: false,
    });
  }

  const clusters = clusterStops(points, maxWalkM);
  const namePrefix = String(shift?.direction || "INBOUND").toUpperCase() === "OUTBOUND" ? "Dropoff" : "Pickup";

  let hubApplied = false;
  let createdStops = [];
  let assignmentCount = 0;

  await prisma.$transaction(async (tx) => {
    if ((shift.hubLat == null || shift.hubLng == null) && companyHub?.hubLat != null && companyHub?.hubLng != null) {
      await tx.shift.update({
        where: { id: shift.id },
        data: { hubLat: companyHub.hubLat, hubLng: companyHub.hubLng },
      });
      hubApplied = true;
    }

    if (mode === "REPLACE") {
      await tx.stopAssignment.deleteMany({ where: { shiftId: shift.id } });
      await tx.shiftProgress.deleteMany({ where: { shiftId: shift.id } });
      await tx.stop.deleteMany({ where: { shiftId: shift.id } });
    }

    const nextStops = [];
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const stop = await tx.stop.create({
        data: {
          shiftId: shift.id,
          name: `${namePrefix} ${i + 1}`,
          order: i + 1,
          lat: c.center.lat,
          lng: c.center.lng,
          type: "COMMON",
          state: "PENDING",
        },
      });
      nextStops.push(stop);

      const assignments = c.members.map((m) => ({
        shiftId: shift.id,
        stopId: stop.id,
        personelId: m.personelId,
        walkM: c.walkMByPersonelId.get(m.personelId) ?? 0,
      }));

      if (assignments.length > 0) {
        await tx.stopAssignment.createMany({ data: assignments, skipDuplicates: true });
      }
    }

    createdStops = nextStops;
    assignmentCount = await tx.stopAssignment.count({ where: { shiftId: shift.id } });
  });

  await rebuildShiftRouteStateBestEffort(shift.id);
  await audit(req, {
    action: "SHIFT_STOPS_GENERATE",
    entity: "Shift",
    entityId: shift.id,
    meta: { mode, maxWalkM, stops: createdStops.length, assignments: assignmentCount, skipped: skipped.length, hubApplied },
  });

  return {
    ok: true,
    shiftId: shift.id,
    maxWalkM,
    stopCount: createdStops.length,
    assignmentCount,
    skippedCount: skipped.length,
    hubApplied,
  };
}

export function attachShiftPeopleRoutes(router, _io) {
  const r = Router();

  // COMPANY: get shift people
  r.get("/:id/people", authRequired(), requireRole("COMPANY"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const items = await getShiftPeople(shift.id);
    res.json({ ok: true, items });
  }));

  // COMPANY: replace/merge shift people
  r.put("/:id/people", authRequired(), requireRole("COMPANY"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const mode = validateWithZod(qModeSchema, req.query.mode);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId }, select: { kind: true } });
    const defaultKind = company?.kind === "SCHOOL" ? "STUDENT" : "PERSONEL";

    const items = parseItemArray(req);

    const createdOrUpdated = [];
    for (const it of items) {
      const result = await upsertCompanyPersonel(req.user.companyId, it, defaultKind);
      createdOrUpdated.push(result.personel);
    }

    // Deduplicate by personelId
    const uniq = new Map(createdOrUpdated.map((p) => [p.id, p]));
    const personelIds = [...uniq.keys()];

    if (mode === "REPLACE") {
      await prisma.shiftPersonel.deleteMany({ where: { shiftId: shift.id } });
    }

    // For MERGE, we only create missing links
    const existingLinks = mode === "MERGE"
      ? await prisma.shiftPersonel.findMany({
          where: { shiftId: shift.id, personelId: { in: personelIds } },
          select: { personelId: true },
        })
      : [];

    const existingSet = new Set(existingLinks.map((x) => x.personelId));
    const toCreate = personelIds
      .filter((pid) => !existingSet.has(pid))
      .map((pid) => ({ shiftId: shift.id, personelId: pid }));

    if (toCreate.length > 0) {
      await prisma.shiftPersonel.createMany({ data: toCreate, skipDuplicates: true });
    }

    clearShiftRoutePreviewCache(shift.id);
    await audit(req, {
      action: "SHIFT_PEOPLE_UPSERT",
      entity: "Shift",
      entityId: shift.id,
      meta: {
        mode,
        count: items.length,
        linked: toCreate.length,
      },
    });

    res.json({ ok: true, shiftId: shift.id, mode, inputCount: items.length, linkedCount: toCreate.length });
  }));

  // COMPANY: import people + write import trail
  r.post("/:id/people/import", authRequired(), requireRole("COMPANY"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const mode = validateWithZod(qModeSchema, req.query.mode);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId }, select: { kind: true } });
    const defaultKind = company?.kind === "SCHOOL" ? "STUDENT" : "PERSONEL";

    const bodySchema = z.object({
      fileName: z.string().max(200).optional(),
      rows: z.array(importRawItemSchema).max(2000).optional(),
      items: z.array(importRawItemSchema).max(2000).optional(),
    });

    const body = validateWithZod(bodySchema, req.body ?? {});
    const rawRows = body.rows ?? body.items ?? [];
    if (rawRows.length === 0) {
      throw httpError(400, "ROWS_REQUIRED", "rows/items required");
    }

    const { accepted, warnings } = normalizeImportRows(rawRows);
    if (accepted.length === 0) {
      throw httpError(400, "NO_VALID_ROWS", "Ä°Ã§e aktarÄ±lacak geÃ§erli satÄ±r bulunamadÄ±.", {
        summary: {
          totalRows: rawRows.length,
          acceptedRows: 0,
          createdPersonels: 0,
          updatedPersonels: 0,
          linkedToShift: 0,
          skippedRows: rawRows.length,
          needsReviewRows: 0,
          failedRows: rawRows.length,
        },
        warnings,
      });
    }

    const rowPayloads = rawRows.map((raw, idx) => {
      const rowNo = idx + 1;
      const acceptedRow = accepted.find((x) => x.rowNo === rowNo);
      const fullName = sanitizeText(raw?.fullName, 120);
      const phone = sanitizePhone(raw?.phone);
      const address = sanitizeText(raw?.address, 240);
      const lat = normalizeCoord(raw?.lat, "lat");
      const lng = normalizeCoord(raw?.lng, "lng");
      const geoMeta = acceptedRow
        ? { geoStatus: acceptedRow.geoStatus, geoReason: acceptedRow.geoReason }
        : (fullName ? inferGeoState({ fullName, phone, address, lat, lng }) : { geoStatus: "FAILED", geoReason: "MISSING_ADDRESS" });
      return {
        rowNo,
        rawJson: raw ?? null,
        fullName,
        phone,
        address,
        lat,
        lng,
        geoStatus: geoMeta.geoStatus,
      };
    });

    const imp = await prisma.shiftImport.create({
      data: {
        shiftId: shift.id,
        createdByUserId: req.user.id,
        fileName: body.fileName ?? null,
        rows: {
          create: rowPayloads,
        },
      },
      select: { id: true },
    });

    let createdPersonels = 0;
    let updatedPersonels = 0;
    let needsReviewRows = 0;
    const createdOrUpdated = [];

    for (const row of accepted) {
      const result = await upsertCompanyPersonel(req.user.companyId, row.item, defaultKind);
      createdOrUpdated.push(result.personel);
      if (result.action === "created") createdPersonels += 1;
      else updatedPersonels += 1;
      if (row.geoStatus === "NEEDS_REVIEW") needsReviewRows += 1;

      await prisma.shiftImportRow.updateMany({
        where: {
          importId: imp.id,
          rowNo: row.rowNo,
        },
        data: { personelId: result.personel.id },
      });
    }

    const uniq = new Map(createdOrUpdated.map((p) => [p.id, p]));
    const personelIds = [...uniq.keys()];

    if (mode === "REPLACE") {
      await prisma.shiftPersonel.deleteMany({ where: { shiftId: shift.id } });
    }

    const existingLinks = mode === "MERGE"
      ? await prisma.shiftPersonel.findMany({
          where: { shiftId: shift.id, personelId: { in: personelIds } },
          select: { personelId: true },
        })
      : [];

    const existingSet = new Set(existingLinks.map((x) => x.personelId));
    const toCreate = personelIds
      .filter((pid) => !existingSet.has(pid))
      .map((pid) => ({ shiftId: shift.id, personelId: pid }));

    if (toCreate.length > 0) {
      await prisma.shiftPersonel.createMany({ data: toCreate, skipDuplicates: true });
    }

    const summary = {
      totalRows: rawRows.length,
      acceptedRows: accepted.length,
      createdPersonels,
      updatedPersonels,
      linkedToShift: toCreate.length,
      skippedRows: rawRows.length - accepted.length,
      needsReviewRows,
      failedRows: Math.max(0, rawRows.length - accepted.length),
    };

    clearShiftRoutePreviewCache(shift.id);
    await audit(req, {
      action: "SHIFT_PEOPLE_IMPORT",
      entity: "Shift",
      entityId: shift.id,
      meta: {
        importId: imp.id,
        mode,
        ...summary,
        warningCount: warnings.length,
      },
    });

    res.json({ ok: true, shiftId: shift.id, importId: imp.id, mode, summary, warnings });
  }));

  // COMPANY: batch generate stops for guided multi-shift flow
  r.post("/stops/generate-batch", authRequired(), requireRole("COMPANY"), asyncHandler(async (req, res) => {
    const ids = Array.from(new Set((Array.isArray(req.body?.shiftIds) ? req.body.shiftIds : []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
    const mode = validateWithZod(qModeSchema, req.body?.mode ?? req.query.mode);
    const maxWalkM = validateWithZod(qMaxWalkSchema, req.body?.maxWalkM ?? req.query.maxWalkM);

    if (!ids.length) throw httpError(400, "SHIFT_IDS_REQUIRED", "shiftIds required");
    if (ids.length > 21) throw httpError(400, "GUIDED_SHIFT_LIMIT", "Guided en fazla 21 vardiya iÃ§in durak Ã¼retebilir.");

    const results = [];
    for (const id of ids) {
      const shift = await getShiftAndCheckScopeOrThrow(id, req.user);
      const result = await generateStopsForShiftInternal({ req, shift, mode, maxWalkM });
      results.push(result);
    }

    return res.json({ ok: true, count: results.length, items: results, first: results[0] || null });
  }));

  // COMPANY: generate stops from shift people
  r.post("/:id/stops/generate", authRequired(), requireRole("COMPANY"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const mode = validateWithZod(qModeSchema, req.query.mode);
    const maxWalkM = validateWithZod(qMaxWalkSchema, req.query.maxWalkM);

    const shift = await getShiftAndCheckScopeOrThrow(id, req.user);
    const result = await generateStopsForShiftInternal({ req, shift, mode, maxWalkM });
    res.json(result);
  }));

  // COMPANY + ROOM: list stops (used by Shift Tools "Shiftâ€™ten DuraklarÄ± Ã‡ek")
  r.get("/:id/stops", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    await getShiftAndCheckScopeOrThrow(id, req.user, { include: { room: true, agreement: true }, allowRoomOfferScope: true });

    const stops = await prisma.stop.findMany({
      where: { shiftId: id },
      orderBy: { order: "asc" },
    });

    const assignments = await prisma.stopAssignment.findMany({
      where: { shiftId: id },
      select: { stopId: true },
    });

    const countByStopId = new Map();
    for (const a of assignments) {
      countByStopId.set(a.stopId, (countByStopId.get(a.stopId) || 0) + 1);
    }

    const items = stops.map((s) => ({
      ...s,
      assignmentCount: countByStopId.get(s.id) || 0,
    }));

    return res.json({ ok: true, stops: items });
  }));

  async function loadAgreementSourceShiftPayload(agreementId) {
    return resolveAgreementSourceShiftPayload(agreementId);
  }

  // COMPANY + ROOM: route preview (M19: summary + directional hub path + learned overlay)
  r.get("/:id/route-preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const shift = await getShiftAndCheckScopeOrThrow(id, req.user, {
      include: {
        room: true,
        agreement: true,
        progress: true,
        organizationPlan: {
          include: {
            stops: {
              orderBy: { order: "asc" },
              select: { id: true, order: true, name: true, lat: true, lng: true, passengerCount: true },
            },
          },
        },
      },
      allowRoomOfferScope: true,
    });

    const payload = await rememberResponse(
      `shift-route-preview:${id}`,
      async () => {
        let people = await getShiftPeople(shift.id);
        let stops = await prisma.stop.findMany({
          where: { shiftId: shift.id },
          orderBy: { order: "asc" },
        });
        let assignments = await prisma.stopAssignment.findMany({
          where: { shiftId: shift.id },
          select: { stopId: true, personelId: true, walkM: true },
        });
        let previewShiftSource = shift;

        const sourcePayload = Number(shift.agreementId || 0) > 0 ? await loadAgreementSourceShiftPayload(shift.agreementId) : null;
        const currentHubLat = typeof shift.hubLat === "number" ? shift.hubLat : typeof shift.agreement?.hubLat === "number" ? shift.agreement.hubLat : typeof shift.room?.hubLat === "number" ? shift.room.hubLat : null;
        const currentHubLng = typeof shift.hubLng === "number" ? shift.hubLng : typeof shift.agreement?.hubLng === "number" ? shift.agreement.hubLng : typeof shift.room?.hubLng === "number" ? shift.room.hubLng : null;
        const hasMeaningfulStops = Array.isArray(stops) && stops.some((s) => {
          if (typeof s?.lat !== "number" || typeof s?.lng !== "number") return false;
          if (typeof currentHubLat !== "number" || typeof currentHubLng !== "number") return true;
          return Math.abs(Number(s.lat) - Number(currentHubLat)) > 1e-6 || Math.abs(Number(s.lng) - Number(currentHubLng)) > 1e-6;
        });

        if (sourcePayload?.shift) {
          const sourcePlanStops = Array.isArray(sourcePayload.shift.organizationPlan?.stops)
            ? sourcePayload.shift.organizationPlan.stops.map((s) => ({
                id: Number(s.id || 0),
                shiftId: sourcePayload.shift.id,
                name: s.name,
                lat: s.lat,
                lng: s.lng,
                order: s.order,
                type: s.type,
              }))
            : [];
          if (!hasMeaningfulStops) {
            if (Array.isArray(sourcePayload.stops) && sourcePayload.stops.length) stops = sourcePayload.stops;
            else if (sourcePlanStops.length) stops = sourcePlanStops;
          }
          if (!people.length && Array.isArray(sourcePayload.people) && sourcePayload.people.length) {
            people = sourcePayload.people;
          }
          if (!assignments.length && Array.isArray(sourcePayload.assignments) && sourcePayload.assignments.length) {
            assignments = sourcePayload.assignments;
          }
          if (!hasMeaningfulStops || !people.length || !assignments.length || sourcePlanStops.length) {
            previewShiftSource = sourcePayload.shift;
          }
        }

        const { skipped } = pickEligiblePoints(people);

        const countByStopId = new Map();
        for (const a of assignments) countByStopId.set(a.stopId, (countByStopId.get(a.stopId) || 0) + 1);

        const orgPlanStops = Array.isArray(previewShiftSource.organizationPlan?.stops) ? previewShiftSource.organizationPlan.stops : [];
        const orgPlanStopsByOrder = new Map(orgPlanStops.map((s, i) => [Number(s.order || i + 1), s]));

        function fallbackPassengerCountForStop(stop, index) {
          const byOrder = orgPlanStopsByOrder.get(Number(stop.order || index + 1));
          if (byOrder?.passengerCount != null) return Number(byOrder.passengerCount || 0);
          const byIndex = orgPlanStops[index];
          if (byIndex?.passengerCount != null) return Number(byIndex.passengerCount || 0);
          const byMatch = orgPlanStops.find((x) =>
            String(x.name || '').trim() === String(stop.name || '').trim() &&
            Math.abs(Number(x.lat) - Number(stop.lat)) < 1e-6 &&
            Math.abs(Number(x.lng) - Number(stop.lng)) < 1e-6
          );
          return Number(byMatch?.passengerCount || 0);
        }

        const stopsWithCounts = stops.map((s, index) => {
          const assignmentCount = countByStopId.get(s.id) || 0;
          const fallbackPassengerCount = fallbackPassengerCountForStop(s, index);
          return {
            ...s,
            assignmentCount,
            passengerCount: fallbackPassengerCount,
            previewCount: assignmentCount > 0 ? assignmentCount : fallbackPassengerCount,
          };
        });

        const hubLat = typeof shift.hubLat === "number" ? shift.hubLat : typeof previewShiftSource?.hubLat === "number" ? previewShiftSource.hubLat : typeof shift.agreement?.hubLat === "number" ? shift.agreement.hubLat : typeof previewShiftSource?.agreement?.hubLat === "number" ? previewShiftSource.agreement.hubLat : typeof shift.room?.hubLat === "number" ? shift.room.hubLat : typeof previewShiftSource?.room?.hubLat === "number" ? previewShiftSource.room.hubLat : null;
        const hubLng = typeof shift.hubLng === "number" ? shift.hubLng : typeof previewShiftSource?.hubLng === "number" ? previewShiftSource.hubLng : typeof shift.agreement?.hubLng === "number" ? shift.agreement.hubLng : typeof previewShiftSource?.agreement?.hubLng === "number" ? previewShiftSource.agreement.hubLng : typeof shift.room?.hubLng === "number" ? shift.room.hubLng : typeof previewShiftSource?.room?.hubLng === "number" ? previewShiftSource.room.hubLng : null;
        const hub = typeof hubLat === "number" && typeof hubLng === "number" ? { lat: hubLat, lng: hubLng } : null;
        const direction = String(shift.direction || previewShiftSource?.direction || shift.agreement?.direction || previewShiftSource?.agreement?.direction || "INBOUND").toUpperCase();
        const pattern = String(shift.pattern || previewShiftSource?.pattern || shift.agreement?.pattern || previewShiftSource?.agreement?.pattern || "ONE_WAY").toUpperCase();

        const stopPoints = stopsWithCounts.filter((s) => typeof s.lat === "number" && typeof s.lng === "number").map((s) => ({ lat: s.lat, lng: s.lng }));

        let estPoints = [];
        let startLabel = "";
        let endLabel = "";
        let warning = null;

        if (!hub) {
          warning = "hubMissing";
          estPoints = stopPoints.slice();
          startLabel = stopPoints.length ? "FIRST_STOP" : "";
          endLabel = stopPoints.length ? "LAST_STOP" : "";
        } else if (pattern === "LOOP") {
          estPoints = [hub, ...stopPoints, hub];
          startLabel = "HUB";
          endLabel = "HUB";
        } else if (direction === "OUTBOUND") {
          estPoints = [hub, ...stopPoints];
          startLabel = "HUB";
          endLabel = stopPoints.length ? "LAST_STOP" : "HUB";
        } else {
          estPoints = [...stopPoints, hub];
          startLabel = stopPoints.length ? "FIRST_STOP" : "HUB";
          endLabel = "HUB";
        }

        const distanceKmEstimated = Number(sumDistanceKm(estPoints).toFixed(2));
        const durationMinEstimated = Math.round(Number(etaMinutes(distanceKmEstimated, 30)));

        const routeKey = computeRouteKey({ direction, pattern, hub, stops: stopPoints });
        const learned = await prisma.routeLearned.findUnique({ where: { routeKey } });
        const learnedPoints = learned && Number(learned.sampleCount || 0) >= 3 ? parsePolyline(learned.polylineCanonical) : null;
        const snapshotHash = String(shift.routeSnapshotInputHash || previewShiftSource?.routeSnapshotInputHash || "");
        const snapshotPoints = parsePolyline(shift.routeSnapshotPolyline || previewShiftSource?.routeSnapshotPolyline);
        const snapshotFresh = Boolean(snapshotHash && snapshotHash === routeKey && Array.isArray(snapshotPoints) && snapshotPoints.length >= 2);

        const source = snapshotFresh ? "SNAPSHOT" : learnedPoints && learnedPoints.length >= 2 ? "LEARNED" : "ESTIMATED";
        const pathPoints = source === "SNAPSHOT" ? snapshotPoints : source === "LEARNED" ? learnedPoints : estPoints;

        const totalPassengerCountRaw = stopsWithCounts.reduce((sum, s) => sum + Number(s.previewCount ?? s.assignmentCount ?? s.passengerCount ?? 0), 0);
        const requiredPaxFallback = Math.max(0, Number(shift.requiredPaxOverride || previewShiftSource?.requiredPaxOverride || 0));
        const totalPassengerCount = totalPassengerCountRaw > 0 ? totalPassengerCountRaw : requiredPaxFallback;

        const summary = {
          stopCount: stopPoints.length,
          totalPassengerCount,
          direction,
          pattern,
          isLoop: pattern === "LOOP",
          startLabel,
          endLabel,
          distanceKmEstimated,
          durationMinEstimated,
          warning,
        };

        if (learned) {
          summary.distanceKmLearned = Number(Number(learned.distanceKmLearned || 0).toFixed(2));
          summary.durationMinLearned = Number(learned.durationMinLearned || 0);
          summary.learnedSampleCount = Number(learned.sampleCount || 0);
        }

        if (snapshotFresh) {
          summary.distanceKmSnapshot = Number(Number((Number((shift.routeSnapshotDistanceM ?? previewShiftSource?.routeSnapshotDistanceM) || 0) / 1000)).toFixed(2));
          summary.durationMinSnapshot = Math.round(Number((shift.routeSnapshotDurationSec ?? previewShiftSource?.routeSnapshotDurationSec) || 0) / 60);
          summary.snapshotValidatedAt = shift.routeSnapshotValidatedAt || previewShiftSource?.routeSnapshotValidatedAt || null;
        }

        summary.previewPolicy = source === "SNAPSHOT" ? "DB_SNAPSHOT" : source === "LEARNED" ? "DB_LEARNED" : "DB_ESTIMATED";

        return {
          ok: true,
          shift: {
            id: shift.id,
            status: shift.status,
            startAt: shift.startAt,
            endAt: shift.endAt,
            roomId: shift.roomId,
            companyId: shift.companyId,
            agreementId: shift.agreementId ?? null,
            hubLat,
            hubLng,
            direction,
            pattern,
            requiredPaxOverride: shift.requiredPaxOverride ?? null,
          },
          people,
          stops: stopsWithCounts,
          assignments,
          skipped: skipped.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            phone: p.phone,
            geoStatus: p.geoStatus,
            geoManualOverride: p.geoManualOverride,
            homeLat: p.homeLat,
            homeLng: p.homeLng,
          })),
          summary,
          path: { source, points: pathPoints, routeKey },
        };
      },
      { ttlMs: 30000, scope: routePreviewScope(req.user) }
    );

    return res.json(payload);
  }));

  router.use(r);
}
