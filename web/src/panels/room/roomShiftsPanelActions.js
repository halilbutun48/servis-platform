export function offerBundleKey(offer) {
  const sh = offer?.shift || {};
  const companyId = sh?.companyId ?? sh?.company?.id ?? null;
  const ca = sh?.createdAt ? String(sh.createdAt).slice(0, 16) : null;
  if (!companyId || !ca) return null;
  return `${companyId}|${ca}`;
}

export async function autoSplitApproveAction(ctx, shift) {
  const { setBusy, setErr, loadPoolSummary, loadDispatchPreview, selectedDispatchVehicleId, selectedDispatchDriverId, api, token, invalidate, load } = ctx;
  const sid = Number(shift?.id || 0);
  if (!sid) return;
  setBusy(true);
  setErr("");
  try {
    const pool = await loadPoolSummary(shift, { force: true });
    const comboCount = Number(pool?.suggestedCombo?.vehicleCount || 0);
    if (!pool?.enoughPoolCapacity || comboCount < 2) {
      setErr("Bu vardiya için çoklu araç kombinasyonu hazır değil.");
      return;
    }
    const preview = await loadDispatchPreview(shift, { force: false });
    const suggestions = Array.isArray(preview?.suggestions) ? preview.suggestions : [];
    const overrides = suggestions.map((part) => ({
      splitIndex: Number(part?.splitIndex || 0),
      vehicleId: selectedDispatchVehicleId(sid, part),
      driverId: selectedDispatchDriverId(sid, part),
    })).filter((x) => x.splitIndex && x.vehicleId && x.driverId);
    await api(`/api/shifts/${sid}/auto-split-approve`, { method: "POST", token, body: { overrides } });
    invalidate("shifts");
    await load({ force: true });
  } catch (e) {
    setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    setBusy(false);
  }
}

export async function approveShiftAction(ctx, shift) {
  const { assignSel, driverSel, vehiclesById, buildCapacityMeta, vehiclesForRoom, setErr, avail, checkAvailabilityForShift, setBusy, api, token, invalidate, load, setAvail, normalizeErr, makeSig } = ctx;
  const sid = Number(shift.id);
  const selV = assignSel[sid] || "";
  const vehicleId = selV ? Number(selV) : null;
  const selD = driverSel[sid] || "";
  const manualDriverId = selD ? Number(selD) : null;
  if (!vehicleId) {
    setErr("Approve için araç seçmelisin.");
    return;
  }
  const v = vehiclesById.get(vehicleId);
  const capacityMeta = buildCapacityMeta({ shift, vehicle: v, roomVehicles: vehiclesForRoom(shift?.roomId) });
  if (capacityMeta.blockCode) {
    setErr(capacityMeta.blockMessage || "Yetersiz kapasite.");
    return;
  }
  const driverId = manualDriverId ?? (v?.driverId ? Number(v.driverId) : null);
  if (!driverId) {
    setErr("Approve için driver seçmelisin (veya araçta driver bağlı olmalı).");
    return;
  }
  const a = avail[sid];
  if (a?.status === "conflict") {
    setErr(a?.message || "Çakışma var. Uygun olmayan driver/araç.");
    return;
  }
  await checkAvailabilityForShift(shift, vehicleId, driverId);
  const a2 = avail[sid];
  if (a2?.status === "conflict") {
    setErr(a2?.message || "Çakışma var. Uygun olmayan driver/araç.");
    return;
  }
  setBusy(true);
  setErr("");
  try {
    await api(`/api/shifts/${sid}/approve`, { method: "PUT", token, body: { vehicleId, driverId } });
    invalidate("shifts");
    await load({ force: true });
  } catch (e) {
    const ne = normalizeErr(e);
    if (ne?.data?.conflictingShift || ne?.data?.code) {
      setAvail((p) => ({
        ...p,
        [sid]: {
          sig: makeSig({ shift, vehicleId, driverId }),
          status: "conflict",
          code: ne.data.code || ne.code || "CONFLICT",
          message: ne.data.message || ne.message || "Çakışma.",
          conflictingShift: ne.data.conflictingShift || null,
          source: "approve",
        },
      }));
    }
    setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
  } finally {
    setBusy(false);
  }
}

export async function rejectShiftAction(ctx, shift) {
  const sid = Number(shift.id);
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/shifts/${sid}/reject`, { method: "PUT", token: ctx.token, body: {} });
    ctx.invalidate("shifts");
    await ctx.load({ force: true });
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}

export async function sendMarketCounterAction(ctx, offer) {
  const oid = Number(offer?.id);
  if (!oid) return;
  const st = ctx.marketCounterSel[oid] || {};
  const amountRoom = st.amountRoom == null || st.amountRoom === "" ? undefined : ctx.parseTryInput(st.amountRoom);
  const noteRoom = String(st.noteRoom ?? "").trim() || undefined;
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/offers/${oid}/counter`, { method: "PUT", token: ctx.token, body: { amountRoom, noteRoom } });
    ctx.invalidate("offers");
    await ctx.load({ force: true });
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}

export async function bulkMarketCounterAction(ctx, refOffer, mode) {
  const refId = Number(refOffer?.id);
  if (!refId) return;
  const st = ctx.marketCounterSel[refId] || {};
  const amountRoom = st.amountRoom == null || st.amountRoom === "" ? undefined : ctx.parseTryInput(st.amountRoom);
  const noteRoom = String(st.noteRoom ?? "").trim() || undefined;
  if (amountRoom == null && !noteRoom) {
    ctx.setErr("Toplu karşı teklif için tutar veya not gir. (Bir satırda doldurup Pakete/Hizmet Alan Firmaya Uygula)");
    return;
  }
  const refShift = refOffer?.shift || {};
  const refCompanyId = Number(refShift?.companyId ?? refShift?.company?.id);
  if (!refCompanyId) {
    ctx.setErr("Hizmet Alan Firma bulunamadı.");
    return;
  }
  const refBundleKey = offerBundleKey(refOffer);
  if (mode === "bundle" && !refBundleKey) {
    ctx.setErr("Paket anahtarı bulunamadı. Hizmet Alan Firmaya Uygula'yı kullan.");
    return;
  }
  const targets = (ctx.offers || []).filter((o) => {
    if (!o) return false;
    const s = String(o.status || "");
    if (s === "CANCELLED" || s === "ACCEPTED") return false;
    const sh = o.shift || {};
    const cid = Number(sh?.companyId ?? sh?.company?.id);
    if (!cid) return false;
    if (mode === "company") return cid === refCompanyId;
    if (mode === "bundle") {
      const k = offerBundleKey(o);
      return k && k === refBundleKey;
    }
    return false;
  });
  if (!targets.length) {
    ctx.setErr("Toplu counter için eşleşen teklif bulunamadı.");
    return;
  }
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    let ok = 0;
    let fail = 0;
    for (const o of targets) {
      const oid = Number(o?.id);
      if (!oid) continue;
      try {
        await ctx.api(`/api/offers/${oid}/counter`, { method: "PUT", token: ctx.token, body: { amountRoom, noteRoom } });
        ok++;
      } catch {
        fail++;
      }
    }
    ctx.invalidate("offers");
    await ctx.load({ force: true });
    if (fail) ctx.setErr(`Toplu counter: ${ok} başarılı, ${fail} hata.`);
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}

function toIntOrNull(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function sendRoomOfferAction(ctx, shift) {
  const sid = Number(shift.id);
  const form = ctx.roomOfferSel[sid] || {};
  const roomOfferVehicleId = toIntOrNull(form.roomOfferVehicleId);
  const roomOfferAmount = toIntOrNull(ctx.parseTryInput(form.roomOfferAmount));
  const roomOfferNote = ctx.trimOrNull(form.roomOfferNote);
  const notifyDriver = Boolean(form.notifyDriver);
  const driverNote = ctx.trimOrNull(form.driverNote);
  if (notifyDriver && !roomOfferVehicleId) {
    ctx.setErr("Driver’a ilet seçtiysen teklif aracı seçmelisin.");
    return;
  }
  const hasAny = roomOfferVehicleId != null || roomOfferAmount != null || roomOfferNote != null || notifyDriver === true || (notifyDriver && driverNote != null);
  if (!hasAny) {
    ctx.setErr("Gönderilecek bir teklif alanı yok. (Araç / tutar / not seç)");
    return;
  }
  const payload = { roomOfferVehicleId: roomOfferVehicleId ?? null, roomOfferAmount: roomOfferAmount ?? null, roomOfferNote: roomOfferNote ?? null, notifyDriver: notifyDriver ? true : false, driverNote: notifyDriver ? driverNote ?? null : null };
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    const res = await ctx.api(`/api/shifts/${sid}/room-offer`, { method: "PUT", token: ctx.token, body: payload });
    if (res && typeof res === "object" && res.error) throw new Error(res.error);
    if (!res || !res.id) throw new Error("room-offer başarısız: boş response");
    const mismatch = (payload.roomOfferNote != null && (res.roomOfferNote ?? null) !== payload.roomOfferNote) || (payload.roomOfferAmount != null && Number(res.roomOfferAmount ?? NaN) !== Number(payload.roomOfferAmount)) || (payload.roomOfferVehicleId != null && Number(res.roomOfferVehicleId ?? NaN) !== Number(payload.roomOfferVehicleId));
    if (mismatch) throw new Error("Backend teklifi kaydetmedi (response mismatch). Network response’u kontrol et.");
    ctx.setRoomOfferOpen((p) => ({ ...p, [sid]: false }));
    ctx.invalidate("shifts");
    await ctx.load({ force: true });
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}

export async function clearRoomOfferAction(ctx, shift) {
  const sid = Number(shift.id);
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api(`/api/shifts/${sid}/room-offer`, { method: "PUT", token: ctx.token, body: { roomOfferVehicleId: null, roomOfferAmount: null, roomOfferNote: null, notifyDriver: false, driverNote: null } });
    ctx.setRoomOfferSel((p) => ({ ...p, [sid]: { roomOfferVehicleId: "", roomOfferAmount: "", roomOfferNote: "", notifyDriver: false, driverNote: "" } }));
    ctx.setRoomOfferOpen((p) => ({ ...p, [sid]: false }));
    ctx.invalidate("shifts");
    await ctx.load({ force: true });
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}

export async function submitReassignAction(ctx, payload) {
  const shift = ctx.reassignModal.shift;
  if (!shift?.id) return;
  ctx.setBusy(true);
  ctx.setErr("");
  try {
    await ctx.api.put(`/api/shifts/${shift.id}/reassign`, payload);
    ctx.setReassignModal({ open: false, shift: null });
    ctx.setOpsEventsModal({ open: true, shiftId: shift.id });
    ctx.invalidate("shifts");
    await ctx.load({ force: true });
  } catch (e) {
    ctx.setErr(ctx.getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    ctx.setBusy(false);
  }
}
