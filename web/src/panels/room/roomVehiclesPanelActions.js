import { cachedGet } from "../../utils/uiDataCache";
import { isoFromTRDateInput, isoFromTRLocalInput } from "../../utils/time";
import {
  VEHICLE_TEMPLATES_TR,
  isoToDateInput,
  isoToDatetimeLocal,
  normalizeList,
  pickRoomVehicleError as pickErr,
} from "./roomVehiclesPanelUtils";

function upperTr(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : "";
}

function upperTrOrNull(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : null;
}

export function applyVehicleTemplate(ctx, tid) {
  ctx.setTemplateId(tid);
  const t = VEHICLE_TEMPLATES_TR.find((x) => x.id === tid);
  if (!t) return;
  ctx.setType(t.type);
  ctx.setCapacity(t.capacity);
  ctx.setBrand(t.brand);
  ctx.setModel(t.model);
}

export function applyVehicleEditTemplate(ctx, tid) {
  ctx.setEditTemplateId(tid);
  const t = VEHICLE_TEMPLATES_TR.find((x) => x.id === tid);
  if (!t) return;
  ctx.setEditForm((p) => ({
    ...p,
    type: t.type,
    capacity: t.capacity,
    brand: t.brand,
    model: t.model,
  }));
}

export async function loadRoomVehiclePanelData(ctx, opts = {}) {
  try {
    const includeArchived = opts.includeArchived ?? ctx.showArchived;
    const force = Boolean(opts.force);
    const path = includeArchived ? "/api/vehicles?includeArchived=1" : "/api/vehicles";
    const [v, d] = await Promise.all([
      cachedGet(path, { token: ctx.token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
      cachedGet("/api/drivers", { token: ctx.token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
    ]);

    const vv = normalizeList(v);
    const dd = normalizeList(d);

    ctx.setItems(vv);
    ctx.setDrivers(dd);

    if (!ctx.focusVehicleId && vv.length) ctx.setFocusVehicleId(Number(vv[0].id));
  } catch (e) {
    const { msg } = pickErr(e);
    ctx.setErr(String(msg));
  }
}

export async function createVehicleAction(ctx, e) {
  e.preventDefault();
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    const body = ctx.body ? { ...ctx.body } : {
      plate: upperTr(ctx.plate),
      capacity: Number(ctx.capacity),
      speedLimitKmh: Number(ctx.speedLimitKmh),
    };

    if (!ctx.body) {
      if (ctx.type) body.type = ctx.type;
      if (ctx.brand.trim()) body.brand = upperTr(ctx.brand);
      if (ctx.model.trim()) body.model = upperTr(ctx.model);
      if (String(ctx.modelYear).trim()) body.modelYear = Number(ctx.modelYear);
      if (ctx.color.trim()) body.color = upperTr(ctx.color);
      if (ctx.vin.trim()) body.vin = upperTr(ctx.vin);
      if (ctx.note.trim()) body.note = upperTr(ctx.note);

      if (ctx.inspectionDueAt) body.inspectionDueAt = isoFromTRDateInput(ctx.inspectionDueAt);
      if (ctx.lastServiceAt) body.lastServiceAt = isoFromTRDateInput(ctx.lastServiceAt);
      if (String(ctx.lastServiceKm).trim()) body.lastServiceKm = Number(ctx.lastServiceKm);
      if (ctx.serviceIntervalKm) body.serviceIntervalKm = Number(ctx.serviceIntervalKm);
      if (String(ctx.odometerKm).trim()) body.odometerKm = Number(ctx.odometerKm);

      if (ctx.nextMaintenanceAt) body.nextMaintenanceAt = isoFromTRLocalInput(ctx.nextMaintenanceAt);
    }

    await ctx.api("/api/vehicles", { method: "POST", token: ctx.token, body });

    ctx.setTemplateId("");
    ctx.setPlate("");
    ctx.showToast("Araç eklendi");
    await ctx.load({ force: true });
  } catch (e2) {
    const { msg } = pickErr(e2);
    ctx.setErr(String(msg));
    ctx.showToast("Araç eklenemedi", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export async function bindVehicleDriverAction(ctx, vehicleId) {
  const sel = ctx.bindSel?.[vehicleId] ?? "";
  const driverId = Number(sel || 0);
  if (!driverId) {
    ctx.setErr("Bağlamak için driver seçmelisin.");
    return;
  }

  const bound = ctx.driverBoundMap.get(driverId);
  const isOther = bound && Number(bound.vehicleId) !== Number(vehicleId);
  if (isOther) {
    ctx.setErr(`Bu sürücü zaten başka araca bağlı: ${bound.plate}. Transfer kullan.`);
    ctx.showToast("Sürücü başka araca bağlı", "warn");
    return;
  }

  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/vehicles/${vehicleId}/bind-driver`, {
      method: "PUT",
      token: ctx.token,
      body: { driverId },
    });
    ctx.showToast("Sürücü bağlandı");
    ctx.setBindSel((p) => ({ ...p, [vehicleId]: "" }));
    await ctx.load({ force: true });
  } catch (e) {
    const { msg, code, status, payload } = pickErr(e);

    if (code === "DRIVER_ALREADY_BOUND") {
      const cv = payload?.conflictingVehicle;
      const detail = cv?.plate ? ` (Bağlı araç: ${cv.plate})` : "";
      ctx.setErr(`${msg}${detail}`);
      ctx.showToast("Sürücü başka araca bağlı", "warn");
      return;
    }

    if (Number(status) === 409) {
      ctx.setErr(`Uygun değil (409): ${msg}`);
      ctx.showToast("Uygun değil", "warn");
      return;
    }

    ctx.setErr(String(msg));
    ctx.showToast("Bağlama başarısız", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export async function unbindVehicleDriverAction(ctx, vehicleId) {
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/vehicles/${vehicleId}/bind-driver`, {
      method: "PUT",
      token: ctx.token,
      body: { driverId: null },
    });
    ctx.showToast("Bağlantı kaldırıldı", "warn");
    await ctx.load({ force: true });
  } catch (e) {
    const { msg, status } = pickErr(e);
    if (Number(status) === 409) ctx.setErr(`Uygun değil (409): ${msg}`);
    else ctx.setErr(String(msg));
    ctx.showToast("Ayırma başarısız", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export async function transferVehicleDriverAction(ctx, toVehicleId, driverId, fromVehicleId) {
  const fromPlate = ctx.items.find((x) => Number(x.id) === Number(fromVehicleId))?.plate || `#${fromVehicleId}`;
  const toPlate = ctx.items.find((x) => Number(x.id) === Number(toVehicleId))?.plate || `#${toVehicleId}`;

  const ok = window.confirm(
    `Sürücü şu an "${fromPlate}" aracına bağlı.\n` +
    `Yeni araç: "${toPlate}"\n\n` +
    `Onaylarsan şu adımlar uygulanacak:\n` +
    `1) "${fromPlate}" aracından ayrılacak\n` +
    `2) "${toPlate}" aracına bağlanacak\n\n` +
    `Devam edilsin mi?`
  );
  if (!ok) return;

  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/vehicles/${fromVehicleId}/bind-driver`, {
      method: "PUT",
      token: ctx.token,
      body: { driverId: null },
    });

    await ctx.api(`/api/vehicles/${toVehicleId}/bind-driver`, {
      method: "PUT",
      token: ctx.token,
      body: { driverId },
    });

    ctx.showToast("Transfer tamamlandı", "warn");
    ctx.setBindSel((p) => ({ ...p, [toVehicleId]: "" }));
    await ctx.load({ force: true });
  } catch (e) {
    const { msg, status } = pickErr(e);
    if (Number(status) === 409) ctx.setErr(`Uygun değil (409): ${msg}`);
    else ctx.setErr(String(msg));
    ctx.showToast("Transfer başarısız", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export function openVehicleEditAction(ctx, v) {
  if (v.archivedAt) {
    ctx.setErr("Arşivli araç düzenlenemez.");
    return;
  }

  ctx.setErr("");
  ctx.setEditTemplateId("");

  ctx.setEditForm({
    id: v.id,
    plate: v.plate ?? "",
    capacity: Number(v.capacity ?? 16),
    speedLimitKmh: Number(v.speedLimitKmh ?? 80),
    type: v.type ?? "",
    brand: v.brand ?? "",
    model: v.model ?? "",
    modelYear: v.modelYear != null ? String(v.modelYear) : "",
    color: v.color ?? "",
    vin: v.vin ?? "",
    note: v.note ?? "",
    inspectionDueAt: isoToDateInput(v.inspectionDueAt),
    lastServiceAt: isoToDateInput(v.lastServiceAt),
    lastServiceKm: v.lastServiceKm != null ? String(v.lastServiceKm) : "",
    serviceIntervalKm: v.serviceIntervalKm != null ? Number(v.serviceIntervalKm) : 15000,
    odometerKm: v.odometerKm != null ? String(v.odometerKm) : "",
    nextMaintenanceAt: v.nextMaintenanceAt ? isoToDatetimeLocal(v.nextMaintenanceAt) : "",
  });

  ctx.setEditOpen(true);
}

export async function saveVehicleEditAction(ctx) {
  if (!ctx.editForm.id) return;

  ctx.setBusy(true);
  ctx.setErr("");
  try {
    const body = ctx.body ? { ...ctx.body } : {
      plate: upperTr(ctx.editForm.plate),
      capacity: Number(ctx.editForm.capacity),
      speedLimitKmh: Number(ctx.editForm.speedLimitKmh),
      type: ctx.editForm.type || null,
      brand: upperTrOrNull(ctx.editForm.brand),
      model: upperTrOrNull(ctx.editForm.model),
      modelYear: String(ctx.editForm.modelYear).trim() ? Number(ctx.editForm.modelYear) : null,
      color: upperTrOrNull(ctx.editForm.color),
      vin: upperTrOrNull(ctx.editForm.vin),
      note: upperTrOrNull(ctx.editForm.note),
      inspectionDueAt: ctx.editForm.inspectionDueAt ? isoFromTRDateInput(ctx.editForm.inspectionDueAt) : null,
      lastServiceAt: ctx.editForm.lastServiceAt ? isoFromTRDateInput(ctx.editForm.lastServiceAt) : null,
      lastServiceKm: String(ctx.editForm.lastServiceKm).trim() ? Number(ctx.editForm.lastServiceKm) : null,
      serviceIntervalKm: ctx.editForm.serviceIntervalKm ? Number(ctx.editForm.serviceIntervalKm) : null,
      odometerKm: String(ctx.editForm.odometerKm).trim() ? Number(ctx.editForm.odometerKm) : null,
      nextMaintenanceAt: ctx.editForm.nextMaintenanceAt ? isoFromTRLocalInput(ctx.editForm.nextMaintenanceAt) : null,
    };

    await ctx.api(`/api/vehicles/${ctx.editForm.id}`, { method: "PUT", token: ctx.token, body });

    ctx.setEditOpen(false);
    ctx.showToast("Araç güncellendi");
    await ctx.load({ force: true });
  } catch (e) {
    const { msg } = pickErr(e);
    ctx.setErr(String(msg));
    ctx.showToast("Güncelleme başarısız", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export async function deleteVehicleAction(ctx, v) {
  if (v.archivedAt) {
    ctx.setErr("Arşivli araçta işlem yapılmaz.");
    return;
  }

  const ok = window.confirm(`${v.plate} aracını silmek/arşivlemek istiyor musun? (Shift bağlıysa otomatik arşivlenir)`);
  if (!ok) return;

  ctx.setBusy(true);
  ctx.setErr("");
  try {
    const resp = await ctx.api(`/api/vehicles/${v.id}`, { method: "DELETE", token: ctx.token });

    if (resp?.archived === true) ctx.showToast("Arşivlendi (shift bağlı)", "warn");
    else ctx.showToast("Silindi");

    await ctx.load({ force: true });
  } catch (e) {
    const { msg } = pickErr(e);
    ctx.setErr(String(msg));
    ctx.showToast("Silme/arşivleme başarısız", "err");
  } finally {
    ctx.setBusy(false);
  }
}

export async function checkAvailabilityAllAction(ctx, onlySelected = false) {
  const startIso = isoFromTRLocalInput(ctx.availStartAt);
  const endIso = isoFromTRLocalInput(ctx.availEndAt);

  if (!startIso || !endIso) {
    ctx.showToast("start/end seç", "warn");
    return;
  }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    ctx.showToast("end > start olmalı", "warn");
    return;
  }

  const visible = (ctx.availRows || []).map((r) => r.v);
  const visibleIds = visible.map((v) => Number(v.id));
  const selectedIds = visibleIds.filter((id) => !!ctx.availSel[id]);

  let targetIds;
  if (onlySelected) {
    if (!selectedIds.length) {
      ctx.showToast("Seçili araç yok", "warn");
      return;
    }
    targetIds = selectedIds;
  } else {
    targetIds = selectedIds.length ? selectedIds : visibleIds;
  }

  ctx.setAvailBusy(true);
  ctx.setErr("");

  try {
    const payload = {
      startAt: startIso,
      endAt: endIso,
      vehicleIds: targetIds,
    };

    const resp = await ctx.api("/api/availability/bulk", { method: "POST", body: payload, token: ctx.token });

    const next = {};
    for (const it of resp?.items || []) {
      next[it.vehicleId] = {
        vehicleOk: it.vehicleOk !== false,
        vehicleConflict: it.vehicleConflict || null,
        driverOk: it.driverId ? it.driverOk !== false : true,
        driverConflict: it.driverConflict || null,
      };
    }

    ctx.setAvailMap((prev) => ({ ...prev, ...next }));
    ctx.showToast(`Müsaitlik güncellendi (${Object.keys(next).length})`, "ok");
  } catch (e) {
    const ne = pickErr(e);
    ctx.setErr(ne.msg || "Müsaitlik kontrolü başarısız");
    ctx.showToast("Müsaitlik kontrolü başarısız", "err");
  } finally {
    ctx.setAvailBusy(false);
  }
}
