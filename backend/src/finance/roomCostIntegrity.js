const CORRECTION_ENTITY = "RoomCostEntryCorrection";
const CORRECTION_ACTION = "ROOM_COST_CORRECTION_APPLIED";

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function uniquePositiveIds(values = []) {
  return [...new Set(values.map(positiveId).filter(Boolean))];
}

function correctionIds(audit) {
  const meta = audit?.meta && typeof audit.meta === "object" ? audit.meta : {};
  return {
    originalEntryId: positiveId(meta.originalEntryId ?? audit?.entityId),
    reversalEntryId: positiveId(meta.reversalEntryId),
    replacementEntryId: positiveId(meta.replacementEntryId),
    correctionRef: text(meta.correctionRef),
  };
}

function belongsToRoom(audit, roomActorIds, roomEntryIds) {
  const actorUserId = positiveId(audit?.actorUserId);
  if (actorUserId && roomActorIds.has(actorUserId)) return true;
  return uniquePositiveIds([
    audit?.entityId,
    audit?.meta?.originalEntryId,
    audit?.meta?.reversalEntryId,
    audit?.meta?.replacementEntryId,
  ]).some((id) => roomEntryIds.has(id));
}

function sourceRefsFor(rows) {
  return [...new Set(rows.map((row) => text(row?.sourceRef)).filter(Boolean))].sort();
}

function freezeIncident(incident) {
  return Object.freeze({
    ...incident,
    missingEntryIds: Object.freeze([...incident.missingEntryIds]),
    presentEntryIds: Object.freeze([...incident.presentEntryIds]),
    sourceRefs: Object.freeze([...incident.sourceRefs]),
    auditTrace: Object.freeze({ ...incident.auditTrace }),
  });
}

/**
 * Projects immutable correction audit evidence without repairing or rewriting
 * ledger rows. A missing correction row is an integrity incident, never an
 * invitation to synthesize an economic entry.
 */
export function buildCorrectionIntegrityProjection({
  roomId = null,
  roomActorIds = [],
  audits = [],
  entryRows = [],
  currentEconomicEffect = null,
} = {}) {
  const actorIds = new Set(uniquePositiveIds(roomActorIds));
  const rowsById = new Map(entryRows.map((row) => [positiveId(row?.id), row]).filter(([id]) => id));
  const entryIds = new Set(rowsById.keys());
  const scopedAudits = audits
    .filter((audit) => audit?.entity === CORRECTION_ENTITY && audit?.action === CORRECTION_ACTION)
    .filter((audit) => belongsToRoom(audit, actorIds, entryIds));
  const incidents = [];
  const validCorrections = [];

  for (const audit of scopedAudits) {
    const ids = correctionIds(audit);
    const referencedIds = [ids.originalEntryId, ids.reversalEntryId, ids.replacementEntryId];
    const presentEntryIds = uniquePositiveIds(referencedIds.filter((id) => rowsById.has(id)));
    const missingEntryIds = uniquePositiveIds(referencedIds.filter((id) => !id || !rowsById.has(id)));
    const original = ids.originalEntryId ? rowsById.get(ids.originalEntryId) : null;
    const reversal = ids.reversalEntryId ? rowsById.get(ids.reversalEntryId) : null;
    const replacement = ids.replacementEntryId ? rowsById.get(ids.replacementEntryId) : null;
    const completeIds = uniquePositiveIds(referencedIds).length === 3 && missingEntryIds.length === 0;
    const lineageValid = completeIds
      && reversal?.isReversal === true
      && positiveId(reversal?.reversalOfEntryId) === ids.originalEntryId
      && reversal?.roomId === roomId
      && replacement?.isReversal === false
      && replacement?.roomId === roomId
      && original?.roomId === roomId;

    if (lineageValid) {
      validCorrections.push(Object.freeze({
        auditId: positiveId(audit.id),
        correctionRef: ids.correctionRef,
        entryIds: Object.freeze([ids.originalEntryId, ids.reversalEntryId, ids.replacementEntryId]),
        sourceRefs: Object.freeze(sourceRefsFor([original, reversal, replacement])),
        immutable: true,
      }));
      continue;
    }

    const reason = missingEntryIds.length
      ? "AUDIT_REFERENCED_LEDGER_ROWS_MISSING"
      : "CORRECTION_LINEAGE_INVALID";
    incidents.push(freezeIncident({
      classification: "ORPHANED_CORRECTION_AUDIT",
      status: "HISTORICAL_DATA_LOSS",
      repairStatus: "BLOCKED_NO_TRUSTED_PAYLOAD",
      roomId,
      auditId: positiveId(audit.id),
      originalEntryId: ids.originalEntryId,
      reversalEntryId: ids.reversalEntryId,
      replacementEntryId: ids.replacementEntryId,
      presentEntryIds,
      missingEntryIds,
      sourceRefs: sourceRefsFor([original, reversal, replacement]),
      sourceRefStatus: missingEntryIds.length ? "UNAVAILABLE_FOR_MISSING_ROWS" : "AVAILABLE_BUT_LINEAGE_INVALID",
      correctionRef: ids.correctionRef,
      reason,
      causeStatus: "UNPROVEN",
      cause: "Audit olayı ledger satırlarının eksik olduğunu gösteriyor; güvenilir eski payload bulunmadığı için tarihsel neden yeniden kurulamaz.",
      economicEffectStatus: "CURRENT_LEDGER_ONLY",
      immutable: true,
      replayable: false,
      auditTrace: {
        createdAt: audit?.createdAt || null,
        actorUserId: positiveId(audit?.actorUserId),
        actorRole: text(audit?.actorRole),
        entity: audit?.entity || null,
        action: audit?.action || null,
      },
    }));
  }

  return Object.freeze({
    status: incidents.length ? "BLOCKED" : "PASS",
    roomId,
    correctionAuditCount: scopedAudits.length,
    validCorrectionCount: validCorrections.length,
    incidentCount: incidents.length,
    validCorrections: Object.freeze(validCorrections),
    incidents: Object.freeze(incidents),
    currentEconomicEffect: currentEconomicEffect ? Object.freeze({ ...currentEconomicEffect }) : null,
    readOnly: true,
    writeAction: false,
  });
}

export async function inspectCorrectionAuditIntegrity({ roomId, prisma, currentEconomicEffect = null } = {}) {
  if (!prisma?.roomCostEntry?.findMany || !prisma?.auditLog?.findMany) {
    return Object.freeze({
      status: "NOT_PROVEN",
      roomId,
      correctionAuditCount: null,
      validCorrectionCount: null,
      incidentCount: null,
      validCorrections: Object.freeze([]),
      incidents: Object.freeze([]),
      currentEconomicEffect: currentEconomicEffect ? Object.freeze({ ...currentEconomicEffect }) : null,
      readOnly: true,
      writeAction: false,
      sourceOwnerAvailable: false,
      reason: "LEDGER_INTEGRITY_READ_OWNER_REQUIRED",
    });
  }
  const [roomActors, entryRows, audits] = await Promise.all([
    prisma.user?.findMany
      ? prisma.user.findMany({ where: { roomId }, select: { id: true } })
      : [],
    prisma.roomCostEntry.findMany({
      where: { roomId },
      select: { id: true, roomId: true, sourceRef: true, isReversal: true, reversalOfEntryId: true, lifecycle: true },
    }),
    prisma.auditLog.findMany({
      where: { entity: CORRECTION_ENTITY, action: CORRECTION_ACTION },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return buildCorrectionIntegrityProjection({
    roomId,
    roomActorIds: roomActors.map((actor) => actor.id),
    audits,
    entryRows,
    currentEconomicEffect,
  });
}

export { CORRECTION_ACTION, CORRECTION_ENTITY };
