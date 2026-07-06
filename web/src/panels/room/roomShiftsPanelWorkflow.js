import { buildCapacityMeta, normalizeRoomShiftError as normalizeErr, overlaps } from "./roomShiftsPanelUtils";
import { isDriverAvailableForShift, isVehicleAvailableForShift, makeAvailabilitySig } from "./roomShiftsPanelHelpers";
import { cachedGet } from "../../utils/uiDataCache";

function hydrateShiftSelections({ list, vehicles, setAssignSel, setDriverSel, setRoomOfferSel }) {
  setAssignSel((prev) => {
    let changed = false;
    const next = { ...prev };
    for (const s of list) {
      const sid = Number(s.id);
      if (next[sid] !== undefined) continue;

      next[sid] = s.companyOfferVehicleId ? String(s.companyOfferVehicleId) : "";
      changed = true;
    }
    return changed ? next : prev;
  });

  {
    const vMap = new Map((Array.isArray(vehicles) ? vehicles : []).map((v) => [Number(v.id), v]));
    setDriverSel((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const s of list) {
        const sid = Number(s.id);
        if (next[sid] !== undefined) continue;

        const vid = s.vehicleId ?? s.companyOfferVehicleId ?? null;
        const vv = vid ? vMap.get(Number(vid)) : null;
        const did = s.driverId ?? vv?.driverId ?? null;

        next[sid] = did ? String(did) : "";
        changed = true;
      }
      return changed ? next : prev;
    });
  }

  setRoomOfferSel((prev) => {
    let changed = false;
    const next = { ...prev };
    for (const s of list) {
      const sid = Number(s.id);
      if (next[sid]) continue;

      next[sid] = {
        roomOfferVehicleId: s.roomOfferVehicleId ? String(s.roomOfferVehicleId) : "",
        roomOfferAmount: s.roomOfferAmount != null ? String(s.roomOfferAmount) : "",
        roomOfferNote: s.roomOfferNote ?? "",
        notifyDriver: Boolean(s.roomOfferToDriver),
        driverNote: s.roomOfferDriverNote ?? "",
      };
      changed = true;
    }
    return changed ? next : prev;
  });
}

function localAvailability({ items, vehiclesById, vehiclesForRoom }, { shift, vehicleId, driverId }) {
  if (!vehicleId || !driverId) {
    return { status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." };
  }

  const vehicle = vehiclesById.get(Number(vehicleId)) || null;
  const capacity = buildCapacityMeta({
    shift,
    vehicle,
    roomVehicles: vehiclesForRoom(shift?.roomId),
  });
  if (capacity.blockCode) {
    return {
      status: "conflict",
      code: capacity.blockCode,
      message: capacity.blockMessage,
    };
  }

  const dOk = isDriverAvailableForShift(driverId, shift);
  if (!dOk) {
    const conflictingShift = items.find((x) => {
      if (Number(x.id) === Number(shift.id)) return false;
      const st = String(x.status || "");
      if (!["APPROVED", "ACTIVE"].includes(st)) return false;
      return (
        Number(x.driverId) === Number(driverId) &&
        overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt)
      );
    });
    return {
      status: "conflict",
      code: "DRIVER_CONFLICT",
      message: "Driver aynı zaman aralığında başka bir vardiyada.",
      conflictingShift: conflictingShift || null,
    };
  }

  const vOk = isVehicleAvailableForShift(vehicleId, shift);
  if (!vOk) {
    const conflictingShift = items.find((x) => {
      if (Number(x.id) === Number(shift.id)) return false;
      const st = String(x.status || "");
      if (!["APPROVED", "ACTIVE"].includes(st)) return false;
      return (
        Number(x.vehicleId) === Number(vehicleId) &&
        overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt)
      );
    });
    return {
      status: "conflict",
      code: "VEHICLE_CONFLICT",
      message: "Araç aynı zaman aralığında başka bir vardiyada.",
      conflictingShift: conflictingShift || null,
    };
  }

  return { status: "ok", code: "OK", message: "Uygun." };
}

async function remoteAvailability({ api, token }, { shift, vehicleId, driverId }) {
  const qs = new URLSearchParams({
    vehicleId: String(vehicleId),
    driverId: String(driverId),
    startAt: String(shift.startAt),
    endAt: String(shift.endAt),
    shiftId: String(shift.id),
    excludeShiftId: String(shift.id),
  }).toString();

  const r = await api(`/api/availability?${qs}`, { token });

  if (r && typeof r === "object") {
    if (r.ok === true || r.available === true) {
      return { status: "ok", code: "OK", message: "Uygun.", source: "remote" };
    }
    if (r.ok === false || r.available === false) {
      return {
        status: "conflict",
        code: r.code || "CONFLICT",
        message: r.message || "Çakışma.",
        conflictingShift: r.conflictingShift || r.conflict || null,
        source: "remote",
      };
    }
    if (r.code && (String(r.code).includes("CONFLICT") || String(r.code).includes("OVERLAP") || String(r.code).includes("CAPACITY"))) {
      return {
        status: "conflict",
        code: r.code,
        message: r.message || "Çakışma.",
        conflictingShift: r.conflictingShift || null,
        source: "remote",
      };
    }
    if (r.code || r.message) {
      return {
        status: "error",
        code: r.code || "REMOTE_ERROR",
        message: r.message || "Availability hata.",
        source: "remote",
      };
    }
  }

  return { status: "error", code: "REMOTE_BAD_RESPONSE", message: "Availability: beklenmeyen response.", source: "remote" };
}

export async function loadRoomShiftsPanelAll(ctx) {
  ctx.setErr("");
  try {
    const [sh, veh, drv, rm, off] = await Promise.all([
      cachedGet("/api/shifts?take=200&includeOffered=1", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }),
      cachedGet("/api/vehicles", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }),
      cachedGet("/api/drivers", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
      cachedGet("/api/rooms", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
      cachedGet("/api/offers/inbox?status=OPEN,COUNTERED,ACCEPTED&take=300", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
    ]);

    const list = Array.isArray(sh) ? sh : sh?.items ?? [];
    const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
    const dlist = Array.isArray(drv) ? drv : drv?.items ?? [];
    const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];
    const olist = Array.isArray(off) ? off : off?.items ?? [];

    list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

    ctx.setItems(list);
    ctx.setVehicles(vlist);
    ctx.setDrivers(dlist);
    ctx.setRooms(rlist);
    ctx.setOffers(Array.isArray(olist) ? olist : []);
    hydrateShiftSelections({
      list,
      vehicles: vlist,
      setAssignSel: ctx.setAssignSel,
      setDriverSel: ctx.setDriverSel,
      setRoomOfferSel: ctx.setRoomOfferSel,
    });
  } catch (e) {
    const ne = normalizeErr(e);
    ctx.setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
  }
}

export async function loadRoomShiftsPanelShiftList(ctx) {
  ctx.setErr("");
  try {
    const sh = await cachedGet("/api/shifts?take=200&includeOffered=1", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 });
    const list = Array.isArray(sh) ? sh : sh?.items ?? [];
    list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

    ctx.setItems(list);
    hydrateShiftSelections({
      list,
      vehicles: Array.isArray(ctx.vehicles) ? ctx.vehicles : [],
      setAssignSel: ctx.setAssignSel,
      setDriverSel: ctx.setDriverSel,
      setRoomOfferSel: ctx.setRoomOfferSel,
    });
  } catch (e) {
    const ne = normalizeErr(e);
    ctx.setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
  }
}

export async function loadRoomShiftsPanelReferenceData(ctx) {
  ctx.setErr("");
  try {
    const [veh, drv, rm] = await Promise.all([
      cachedGet("/api/vehicles", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }),
      cachedGet("/api/drivers", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
      cachedGet("/api/rooms", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] })),
    ]);

    const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
    const dlist = Array.isArray(drv) ? drv : drv?.items ?? [];
    const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];

    ctx.setVehicles(vlist);
    ctx.setDrivers(dlist);
    ctx.setRooms(rlist);

    const vMap = new Map(vlist.map((v) => [Number(v.id), v]));
    ctx.setDriverSel((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const s of ctx.items) {
        const sid = Number(s.id);
        if (next[sid] !== undefined) continue;

        const vid = s.vehicleId ?? s.companyOfferVehicleId ?? null;
        const vv = vid ? vMap.get(Number(vid)) : null;
        const did = s.driverId ?? vv?.driverId ?? null;

        next[sid] = did ? String(did) : "";
        changed = true;
      }
      return changed ? next : prev;
    });
  } catch (e) {
    const ne = normalizeErr(e);
    ctx.setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
  }
}

export async function loadRoomShiftsPanelOffers(ctx) {
  ctx.setErr("");
  try {
    const off = await cachedGet("/api/offers/inbox?status=OPEN,COUNTERED,ACCEPTED&take=300", { token: ctx.token, force: Boolean(ctx.force), ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => ({ items: [] }));
    const olist = Array.isArray(off) ? off : off?.items ?? [];
    ctx.setOffers(Array.isArray(olist) ? olist : []);
  } catch (e) {
    const ne = normalizeErr(e);
    ctx.setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
  }
}

export async function checkRoomShiftAvailability(ctx, shift, vehicleId, driverId) {
  const sid = Number(shift.id);
  const sig = makeAvailabilitySig({ shift, vehicleId, driverId });

  const prev = ctx.avail[sid];
  if (prev?.sig === sig && prev?.status && prev.status !== "checking") return;

  if (!vehicleId || !driverId) {
    ctx.setAvail((p) => ({
      ...p,
      [sid]: { sig, status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." },
    }));
    return;
  }

  const inflightKey = `${sid}|${sig}`;
  if (ctx.availInflight.current.has(inflightKey)) return;
  ctx.availInflight.current.add(inflightKey);

  ctx.setAvail((p) => ({
    ...p,
    [sid]: { sig, status: "checking", code: "CHECKING", message: "Kontrol ediliyor..." },
  }));

  try {
    let out = null;
    try {
      out = await remoteAvailability({ api: ctx.api, token: ctx.token }, { shift, vehicleId, driverId });
    } catch (e) {
      const ne = normalizeErr(e);
      const m = (ne?.message || "").toLowerCase();
      const looks404 = m.includes("404") || m.includes("not found") || m.includes("cannot get") || m.includes("no route");
      if (looks404) {
        out = { ...localAvailability(ctx, { shift, vehicleId, driverId }), source: "local" };
      } else {
        out = { ...localAvailability(ctx, { shift, vehicleId, driverId }), source: "local" };
        if (out.status === "ok") out = { ...out, message: "Uygun (local)." };
      }
    }

    if (!out) out = { status: "error", code: "AVAIL_UNKNOWN", message: "Uygunluk durumu belirlenemedi." };

    ctx.setAvail((p) => ({
      ...p,
      [sid]: {
        sig,
        status: out.status || "error",
        code: out.code || null,
        message: out.message || "",
        conflictingShift: out.conflictingShift || null,
        source: out.source || "local",
      },
    }));
  } finally {
    ctx.availInflight.current.delete(inflightKey);
  }
}
