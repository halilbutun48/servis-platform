import { api } from "../../api";
import { invalidate } from "../../live/bus";
import { toDatetimeLocalTR } from "../../utils/time";
import { getApiErrorMessage } from "../../utils/apiContract";
import { parseTryInput, trimOrNull } from "./shiftsPanelOfferUtils";
import { computePackageShiftIds, istanbulLocalToUtcIso } from "./companyShiftsPanelUtils";

export function openCompanyExtendModal({ shift, setExtendModal }) {
  if (!shift) return;
  const baseEnd = shift?.endAt ? new Date(shift.endAt).getTime() : Date.now();
  setExtendModal({
    open: true,
    shift,
    endLocal: toDatetimeLocalTR(new Date(baseEnd + 60 * 60 * 1000)),
    note: "",
  });
}

export async function submitCompanyExtendRequest({ token, extendModal, setErr, setBusy, setExtendModal }) {
  const s = extendModal.shift;
  const sid = Number(s?.id);
  if (!sid) return;
  const iso = istanbulLocalToUtcIso(extendModal.endLocal);
  if (!iso) {
    setErr("Yeni bitiş tarihi geçersiz.");
    return;
  }
  setBusy(true);
  setErr("");
  try {
    await api.put(`/api/shifts/${sid}/extend-request`, {
      requestedEndAt: iso,
      noteCompany: trimOrNull(extendModal.note),
    }, { token });
    setExtendModal({ open: false, shift: null, endLocal: "", note: "" });
    invalidate("shift:list");
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export function openCompanyOfferModalForShift({ shiftId, pkgIds = null, items, setOfferModalPkgIds, setOfferModal, ensureReferenceData }) {
  ensureReferenceData?.().catch(() => {});
  const sid = Number(shiftId);
  const seed = (items || []).find((x) => Number(x.id) === sid);
  const auto = computePackageShiftIds(items, seed);
  const idsRaw = Array.isArray(pkgIds) && pkgIds.length ? pkgIds : auto;
  const ids = Array.from(new Set((idsRaw || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
  setOfferModalPkgIds(ids.length > 1 ? ids : []);
  setOfferModal({
    open: true,
    shiftId: sid,
    q: "",
    onlyHub: true,
    roomIds: {},
    amountCompany: "",
    noteCompany: "",
  });
}

export function toggleCompanyOfferRoom(roomId, setOfferModal) {
  const rid = Number(roomId);
  if (!Number.isFinite(rid)) return;
  setOfferModal((p) => {
    const next = { ...(p || {}) };
    const map = { ...(next.roomIds || {}) };
    map[rid] = !map[rid];
    next.roomIds = map;
    return next;
  });
}

export async function submitCompanyOfferModal({ offerModal, offerModalPkgIds, token, setErr, setBusy, setOfferModal, setOfferModalPkgIds, load }) {
  const shiftId = Number(offerModal.shiftId);
  const roomIds = Object.entries(offerModal.roomIds || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => Number(k))
    .filter((x) => Number.isFinite(x));

  if (!shiftId) {
    setErr("Shift seçilmedi");
    return;
  }
  if (!roomIds.length) {
    setErr("En az 1 room seç");
    return;
  }

  const amountCompany = parseTryInput(offerModal.amountCompany);
  const noteCompany = trimOrNull(offerModal.noteCompany);

  setBusy(true);
  setErr("");
  try {
    const targetShiftIds = (offerModalPkgIds || []).length
      ? Array.from(new Set((offerModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
      : [shiftId];

    if (!targetShiftIds.includes(shiftId)) targetShiftIds.unshift(shiftId);

    for (const sid of targetShiftIds) {
      await api(`/api/shifts/${sid}/offers`, {
        method: "POST",
        token,
        body: { roomIds, amountCompany: amountCompany ?? null, noteCompany: noteCompany ?? null },
      });
    }

    setOfferModal((p) => ({ ...p, open: false }));
    setOfferModalPkgIds([]);
    invalidate("offers");
    await load();
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function openCompanyOffersModalForShift({ shiftId, pkgIds = null, items, token, setBusy, setErr, setOffersCounterSel, setOffersModalPkgIds, setOffersModal }) {
  const sid = Number(shiftId);
  setOffersCounterSel({});
  const seed = (items || []).find((x) => Number(x.id) === sid);
  const auto = computePackageShiftIds(items, seed);
  const idsRaw = Array.isArray(pkgIds) && pkgIds.length ? pkgIds : auto;
  const ids = Array.from(new Set((idsRaw || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
  setOffersModalPkgIds(ids.length > 1 ? ids : []);

  if (!sid) return;
  setBusy(true);
  setErr("");
  try {
    const r = await api(`/api/offers/shift/${sid}`, { method: "GET", token });
    setOffersModal({ open: true, shiftId: sid, items: r?.items || [] });
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function companyCounterOfferAction({ offer, offersCounterSel, token, setErr, setBusy, openOffersModalForShift, offersModal, offersModalPkgIds, load }) {
  const oid = Number(offer?.id);
  if (!oid) return;
  const st = offersCounterSel[oid] || {};
  const amountCompany = parseTryInput(st.amountCompany);
  const noteCompany = trimOrNull(st.noteCompany);
  if (amountCompany == null) {
    setErr("Karşı teklif tutarı gerekli.");
    return;
  }
  setBusy(true);
  setErr("");
  try {
    await api(`/api/offers/${oid}/company-counter`, { method: "PUT", token, body: { amountCompany, noteCompany } });
    await openOffersModalForShift(offersModal.shiftId, offersModalPkgIds);
    invalidate("offers");
    await load();
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function companyCounterPackageAction({ offer, offersCounterSel, offersModal, offersModalPkgIds, token, setErr, setBusy, openOffersModalForShift, load }) {
  const roomId = Number(offer?.roomId || offer?.room?.id || 0);
  if (!roomId) return;
  const oid = Number(offer?.id || 0);
  const st = offersCounterSel[oid] || {};
  const amountCompany = parseTryInput(st.amountCompany);
  const noteCompany = trimOrNull(st.noteCompany);
  if (amountCompany == null) {
    setErr("Paket karşı teklif tutarı gerekli.");
    return;
  }
  const baseShiftId = Number(offersModal.shiftId || 0);
  const targetShiftIds = (offersModalPkgIds || []).length
    ? Array.from(new Set((offersModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
    : [baseShiftId];
  if (!targetShiftIds.includes(baseShiftId)) targetShiftIds.unshift(baseShiftId);
  setBusy(true);
  setErr("");
  try {
    await api(`/api/offers/company-counter-bulk`, {
      method: "POST",
      token,
      body: { roomId, shiftIds: targetShiftIds, amountCompany, noteCompany },
    });
    await openOffersModalForShift(offersModal.shiftId, offersModalPkgIds);
    invalidate("offers");
    await load();
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function acceptCompanyOfferAction({ offerId, token, setBusy, setErr, setOffersModal, load }) {
  const oid = Number(offerId);
  if (!oid) return;
  setBusy(true);
  setErr("");
  try {
    await api(`/api/offers/${oid}/accept`, { method: "PUT", token, body: {} });
    setOffersModal((p) => ({ ...p, open: false }));
    invalidate("shifts");
    invalidate("offers");
    await load();
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function acceptCompanyOfferPackageAction({ roomId, offersModal, offersModalPkgIds, token, setBusy, setErr, setOffersModal, setOffersModalPkgIds, load }) {
  const rid = Number(roomId);
  if (!rid) return;
  const baseShiftId = Number(offersModal.shiftId);
  if (!baseShiftId) return;
  const targetShiftIds = (offersModalPkgIds || []).length
    ? Array.from(new Set((offersModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
    : [baseShiftId];
  if (!targetShiftIds.includes(baseShiftId)) targetShiftIds.unshift(baseShiftId);
  setBusy(true);
  setErr("");
  try {
    for (const sid of targetShiftIds) {
      const r = await api(`/api/offers/shift/${sid}`, { method: "GET", token });
      const items = r?.items || [];
      const match = items.find((o) => Number(o.roomId) === rid && (o.status === "COUNTERED" || o.status === "OFFERED"));
      if (!match?.id) continue;
      await api(`/api/offers/${Number(match.id)}/accept`, { method: "PUT", token, body: {} });
    }
    setOffersModal((p) => ({ ...p, open: false }));
    setOffersModalPkgIds([]);
    invalidate("shifts");
    invalidate("offers");
    await load();
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

function afterCompanyPendingAction({ setMainTab, setTrackTab, setShowTemplatesMgr }) {
  setMainTab("track");
  setTrackTab("pending");
  setShowTemplatesMgr(false);
  try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
}

export async function sendCompanyCounterOfferAction({ shift, offerSel, vehiclesById, token, setBusy, setErr, setOfferOpen, setMainTab, setTrackTab, setShowTemplatesMgr, load, setOfferSel }) {
  const sid = Number(shift.id);
  const form = offerSel[sid] || {};
  const vRaw = form.companyOfferVehicleId;
  const vId = vRaw ? Number(vRaw) : null;
  const amt = parseTryInput(form.companyOfferAmount);
  const note = trimOrNull(form.companyOfferNote);
  if (vId) {
    const v = vehiclesById.get(Number(vId));
    if (v?.roomId && Number(v.roomId) !== Number(shift.roomId)) {
      setErr("Seçtiğin teklif aracı bu shift’in room’una ait değil.");
      return;
    }
  }
  setBusy(true);
  setErr("");
  try {
    await api(`/api/shifts/${sid}/company-offer`, {
      method: "PUT",
      token,
      body: {
        companyOfferVehicleId: vId || null,
        companyOfferAmount: amt ?? null,
        companyOfferNote: note || null,
      },
    });
    setOfferOpen((p) => ({ ...p, [sid]: false }));
    invalidate("shifts");
    await load();
    afterCompanyPendingAction({ setMainTab, setTrackTab, setShowTemplatesMgr });
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function clearCompanyCounterOfferAction({ shift, token, setBusy, setErr, setOfferSel, setOfferOpen, setMainTab, setTrackTab, setShowTemplatesMgr, load }) {
  const sid = Number(shift.id);
  setBusy(true);
  setErr("");
  try {
    await api(`/api/shifts/${sid}/company-offer`, {
      method: "PUT",
      token,
      body: { companyOfferVehicleId: null, companyOfferAmount: null, companyOfferNote: null },
    });
    setOfferSel((p) => ({
      ...p,
      [sid]: { companyOfferVehicleId: "", companyOfferAmount: "", companyOfferNote: "" },
    }));
    setOfferOpen((p) => ({ ...p, [sid]: false }));
    invalidate("shifts");
    await load();
    afterCompanyPendingAction({ setMainTab, setTrackTab, setShowTemplatesMgr });
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function cancelCompanyRequestAction({ shift, token, setBusy, setErr, setMainTab, setTrackTab, setShowTemplatesMgr, load, confirmImpl = window.confirm }) {
  const sid = Number(shift.id);
  if (!sid) return;
  if (!confirmImpl(`Shift #${sid} talebini iptal etmek istiyor musun? (REJECTED)`)) return;
  setBusy(true);
  setErr("");
  try {
    await api(`/api/shifts/${sid}`, {
      method: "PUT",
      token,
      body: { status: "REJECTED" },
    });
    invalidate("shifts");
    await load();
    afterCompanyPendingAction({ setMainTab, setTrackTab, setShowTemplatesMgr });
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setBusy(false);
  }
}

export async function decideCompanyRoomOfferAction({ shift, decision, noteRaw, token, setDecidingId, setErr, setDecisionNoteSel, setMainTab, setTrackTab, setShowTemplatesMgr, load }) {
  const sid = Number(shift.id);
  setDecidingId(sid);
  setErr("");
  const note = trimOrNull(noteRaw);
  try {
    await api(`/api/shifts/${sid}/room-offer-decision`, {
      method: "PUT",
      token,
      body: {
        decision,
        ...(note ? { note } : {}),
      },
    });
    setDecisionNoteSel((p) => ({ ...p, [sid]: "" }));
    invalidate("shifts");
    await load();
    afterCompanyPendingAction({ setMainTab, setTrackTab, setShowTemplatesMgr });
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setDecidingId(null);
  }
}
