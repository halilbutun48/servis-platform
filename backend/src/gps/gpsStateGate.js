// backend/src/gps/gpsStateGate.js
// Notif dedupe/transition gate: sadece state transition olunca notif üret.

const UI = {
  LIVE: "LIVE",
  STALE: "STALE",
  OFFLINE: "OFFLINE",
};

function transitionOf(prev, next) {
  if (prev === UI.LIVE && next === UI.STALE) return "LIVE_TO_STALE";
  if (prev === UI.LIVE && next === UI.OFFLINE) return "LIVE_TO_OFFLINE";
  if (prev === UI.STALE && next === UI.OFFLINE) return "STALE_TO_OFFLINE";
  if ((prev === UI.STALE || prev === UI.OFFLINE) && next === UI.LIVE) return "TO_LIVE";
  return null;
}

/**
 * Gate kuralı:
 * - state yoksa create et, notif üretme
 * - prev==next ise notif yok
 * - prev!=next ise update (updateMany ile yarışa dayanıklı)
 * - STALE/OFFLINE notif'leri ancak daha önce LIVE görülmüşse (seenLiveAt) üret
 * - TO_LIVE (recovery) notif'ü ancak daha önce LIVE görülmüşse üret (yani gerçek recovery)
 *
 * @param {object} args
 * @param {import("@prisma/client").PrismaClient} args.prisma
 * @param {number} args.vehicleId
 * @param {"LIVE"|"STALE"|"OFFLINE"} args.newUiStatus
 * @param {string|null|undefined} [args.newSource]
 * @param {Date} args.now
 */
export async function gateVehicleGpsState({ prisma, vehicleId, newUiStatus, newSource = null, now }) {
  const nextSource = String(newSource || '').trim().toUpperCase() || null;
  const cur = await prisma.vehicleGpsState.findUnique({ where: { vehicleId } });

  // İlk kayıt: notif yok (başlangıç spam’ini keser)
  if (!cur) {
    await prisma.vehicleGpsState.create({
      data: {
        vehicleId,
        lastUiStatus: newUiStatus,
        lastChangedAt: now,
        seenLiveAt: newUiStatus === UI.LIVE ? now : null,
        lastSource: nextSource,
      },
    });

    return {
      changed: false,
      shouldNotify: false,
      transition: null,
      prevStatus: null,
      newStatus: newUiStatus,
    };
  }

  // Aynı state: notif yok
  if (cur.lastUiStatus === newUiStatus && (!nextSource || String(cur.lastSource || '').trim().toUpperCase() === nextSource)) {
    return {
      changed: false,
      shouldNotify: false,
      transition: null,
      prevStatus: cur.lastUiStatus,
      newStatus: newUiStatus,
    };
  }

  const prev = cur.lastUiStatus;
  const transition = transitionOf(prev, newUiStatus);

  // Yarışa dayanıklı: sadece beklenen prev ise update et
  const updated = await prisma.vehicleGpsState.updateMany({
    where: { vehicleId, lastUiStatus: prev },
    data: {
      lastUiStatus: newUiStatus,
      lastChangedAt: now,
      ...(newUiStatus === UI.LIVE && !cur.seenLiveAt ? { seenLiveAt: now } : {}),
      ...(nextSource ? { lastSource: nextSource } : {}),
    },
  });

  if (updated.count === 0) {
    // başka instance update etti → spam üretme
    return {
      changed: false,
      shouldNotify: false,
      transition: null,
      prevStatus: prev,
      newStatus: newUiStatus,
    };
  }

  // seenLiveAt yoksa (hiç LIVE görmemiş araç):
  // - STALE/OFFLINE üretme
  // - TO_LIVE da üretme (çünkü gerçek recovery değil; ilk canlıya geliş olabilir)
  const hadSeenLive = Boolean(cur.seenLiveAt);

  let shouldNotify = false;
  if (transition && hadSeenLive) {
    // gerçek state transition
    shouldNotify = true;
  }

  return {
    changed: true,
    shouldNotify,
    transition,
    prevStatus: prev,
    newStatus: newUiStatus,
  };
}

export { UI };
