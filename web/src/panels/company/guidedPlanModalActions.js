import { api } from "../../api";
import { addDaysISO, weekdayBitFromYmdUTC } from "../../utils/agreementUi";
import { getApiErrorInfo } from "../../utils/apiContract";
import {
  clearPlanTermsForShiftIds,
  parseTryInput,
  writeGuidedTempShiftIds,
  ymdMinToIso,
} from "./guidedPlanModalUtils";

export async function geocodeGuidedLocation({ token, q }) {
  return api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
}

export async function cleanupGuidedDraftShifts({ token, ids }) {
  const uniqueIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((x) => Number(x)).filter(Number.isFinite)));
  if (token) {
    for (const sid of uniqueIds) {
      try {
        await api(`/api/shifts/${sid}/guided-temp`, { token, method: "DELETE" });
      } catch {
        // temp cleanup best-effort
      }
    }
  }
  clearPlanTermsForShiftIds(uniqueIds);
  writeGuidedTempShiftIds([]);
  return uniqueIds;
}

export async function loadGuidedResumeDraftShifts({ token, ids }) {
  const uniqueIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((x) => Number(x)).filter(Number.isFinite)));
  if (!token || !uniqueIds.length) return [];
  const list = await api("/api/shifts?take=500&includeDrafts=1&includeStops=1", { token });
  const itemsAll = Array.isArray(list?.items) ? list.items : [];
  return itemsAll.filter((x) => uniqueIds.includes(Number(x.id)));
}

export async function loadGuidedCompanyHub({ token }) {
  return api("/api/company/hub", { token });
}

export async function saveGuidedCompanyHub({ token, hubLat, hubLng }) {
  return api("/api/company/hub", { token, method: "PUT", body: { hubLat, hubLng } });
}

export async function createGuidedDraftShiftsAction({
  token,
  existingDraftShiftIds,
  cleanupDraftShifts,
  stepItems,
  startDate,
  endDate,
  weekMask,
  draftNote,
  draftAmount,
  organization,
  orgNoteSummaryText,
  orgReturnType,
  orgEstimatedPax,
  orgFilledDestinations,
  orgGatheringName,
  hubLat,
  hubLng,
}) {
  const lat = hubLat === "" ? null : Number(hubLat);
  const lng = hubLng === "" ? null : Number(hubLng);
  const items = Array.isArray(stepItems) ? stepItems : [];

  if (existingDraftShiftIds?.length) {
    await cleanupDraftShifts(existingDraftShiftIds);
  }

  const createdIds = [];
  const ymds = [];
  let cur = String(startDate);
  for (let i = 0; i <= 370; i++) {
    const bit = weekdayBitFromYmdUTC(cur);
    if ((weekMask & bit) !== 0) ymds.push(cur);
    if (cur === endDate) break;
    cur = addDaysISO(cur, 1);
  }

  const dayCount = ymds.length;
  const totalShiftCount = ymds.length * items.length;
  if (dayCount > 7) throw new Error("Guided en fazla 7 gün olabilir. Daha uzun planlar için sözleşme kullanın.");
  if (totalShiftCount > 21) throw new Error("Guided en fazla 21 vardiya oluşturabilir. Daha yoğun planlar için sözleşme kullanın.");

  const rows = [];
  for (const ymd of ymds) {
    for (const it of items) {
      const startAt = ymdMinToIso(ymd, it.startMin);
      const endYmd = it.endMin < it.startMin ? addDaysISO(ymd, 1) : ymd;
      const endAt = ymdMinToIso(endYmd, it.endMin);
      const noteParts = [];
      if (draftNote) noteParts.push(String(draftNote).trim());
      if (organization && orgNoteSummaryText) noteParts.push(orgNoteSummaryText);

      const body = {
        status: "DRAFT",
        startAt,
        endAt,
        hubLat: lat,
        hubLng: lng,
        direction: it.direction,
        pattern: organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern,
      };

      const amountTry = parseTryInput(draftAmount);
      if (amountTry != null) body.companyOfferAmount = amountTry;
      if (noteParts.length) body.companyOfferNote = noteParts.filter(Boolean).join("\n");

      if (organization) {
        const pax = Number(orgEstimatedPax || 0);
        if (Number.isFinite(pax) && pax > 0) body.requiredPax = pax;
        const stopDrafts = [];
        for (let idx = 0; idx < (orgFilledDestinations || []).length; idx++) {
          const dest = orgFilledDestinations[idx];
          let stopName = String(dest?.title || dest?.address || `Yer ${idx + 1}`).trim();
          let stopLat = dest?.lat === "" ? null : Number(dest?.lat);
          let stopLng = dest?.lng === "" ? null : Number(dest?.lng);
          if (!(Number.isFinite(stopLat) && Number.isFinite(stopLng))) {
            const q = String(dest?.address || dest?.title || "").trim();
            if (q.length >= 3) {
              try {
                const geo = await geocodeGuidedLocation({ token, q });
                if (geo?.ok) {
                  stopLat = Number(geo.lat);
                  stopLng = Number(geo.lng);
                  stopName = stopName || String(geo.displayName || q).split(",")[0];
                }
              } catch {
                // continue with others
              }
            }
          }
          if (Number.isFinite(stopLat) && Number.isFinite(stopLng)) {
            stopDrafts.push({
              name: stopName || `Yer ${idx + 1}`,
              lat: stopLat,
              lng: stopLng,
              order: stopDrafts.length + 1,
              type: "MANUAL",
            });
          }
        }
        if (stopDrafts.length) body.stops = stopDrafts;
      }

      rows.push({ ymd, item: it, body });
    }
  }

  let createdItems = [];
  try {
    const batchResp = await api("/api/shifts/guided-batch", {
      token,
      method: "POST",
      body: { items: rows.map((row) => row.body) },
    });
    createdItems = Array.isArray(batchResp?.items) ? batchResp.items : [];
  } catch (e) {
    const msg = String(e?.message || e || "");
    if (!msg.includes("Cannot POST /api/shifts/guided-batch")) throw e;
    for (const row of rows) {
      const shift = await api("/api/shifts", { token, method: "POST", body: row.body });
      if (shift?.id) createdItems.push(shift);
    }
  }

  createdItems.forEach((shift, idx) => {
    if (shift?.id) createdIds.push(Number(shift.id));
    const row = rows[idx];
    if (!shift?.id || !row) return;
    try {
      localStorage.setItem(
        `psv1:planTerms:shift:${Number(shift.id)}:v1`,
        JSON.stringify({
          planStartDate: startDate,
          planEndDate: endDate,
          ymd: row.ymd,
          weekMask,
          startMin: row.item.startMin,
          endMin: row.item.endMin,
          direction: row.item.direction,
          pattern: organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : row.item.pattern,
          hubLat: lat,
          hubLng: lng,
          organization: organization
            ? {
                gatheringName: orgGatheringName,
                estimatedPax: Number(orgEstimatedPax || 0) || null,
                returnType: orgReturnType,
                places: (orgFilledDestinations || []).map((d) => ({ title: d.title, address: d.address })),
              }
            : null,
        })
      );
    } catch {
      // ignore localStorage errors
    }
  });

  writeGuidedTempShiftIds(createdIds);
  const draftShifts = createdItems.length ? createdItems : await loadGuidedResumeDraftShifts({ token, ids: createdIds });
  return { createdIds, draftShifts, dayCount, totalShiftCount };
}

export async function refreshGuidedDraftShiftsAction({ token, draftShiftIds }) {
  return loadGuidedResumeDraftShifts({ token, ids: draftShiftIds });
}

export async function osrmReorderGuidedCore({ token, draftShifts, shiftId }) {
  const sid = Number(shiftId);
  const shift = (draftShifts || []).find((x) => Number(x.id) === sid);
  if (!shift) return { ok: false, error: "Shift bulunamadı." };

  const stops = Array.isArray(shift?.stops) ? shift.stops : [];
  if (stops.length < 2) return { ok: false, error: "Sıralama için en az 2 durak gerekir." };

  const hubOk = shift?.hubLat != null && shift?.hubLng != null;
  const depot = hubOk
    ? { id: "depot", lat: Number(shift.hubLat), lng: Number(shift.hubLng) }
    : { id: "depot", lat: Number(stops[0].lat), lng: Number(stops[0].lng) };

  const points = [depot, ...stops.map((x) => ({ id: Number(x.id), lat: Number(x.lat), lng: Number(x.lng) }))];
  const table = await api("/api/plan-builder/osrm-table", { token, method: "POST", body: { profile: "driving", points } });
  if (!table?.ok) {
    return { ok: false, error: "OSRM rota doğrulaması alınamadı. Solver/OSRM hazır değil veya bu taslak için matris üretilemedi." };
  }

  const solved = await api("/api/plan-builder/solve-vrp", {
    token,
    method: "POST",
    body: {
      durationsSec: table?.durationsSec,
      distancesM: table?.distancesM,
      pointIds: points.map((p) => p.id),
      depotIndex: 0,
      returnToDepot: String(shift?.pattern || "").toUpperCase() === "LOOP",
      preferOrtools: true,
    },
  });

  if (!solved?.ok || !Array.isArray(solved?.orderPointIds)) {
    return { ok: false, error: "Rota çözümü alınamadı. Solver hazır değil veya çözüm üretilemedi." };
  }

  const orderedStopIds = solved.orderPointIds
    .filter((id) => id !== "depot")
    .map((id) => Number(id))
    .filter(Number.isFinite);

  if (orderedStopIds.length !== stops.length) {
    return { ok: false, error: "Sıralama uyuşmadı (durak sayısı)." };
  }

  await api(`/api/shifts/${sid}/stops/reorder`, { token, method: "PUT", body: { idsInOrder: orderedStopIds } });
  return { ok: true, solver: solved.solver || null };
}

export async function sendGuidedBulkOffersAction({ token, draftShiftIds, selectedRoomIds, offerAmount, offerNote }) {
  const amountCompany = parseTryInput(offerAmount);
  const noteStr = String(offerNote || "").trim();
  const baseBody = { roomIds: selectedRoomIds };
  if (amountCompany != null) baseBody.amountCompany = amountCompany;
  if (noteStr) baseBody.noteCompany = noteStr;

  let sentCount = 0;
  let blockedShiftCount = 0;
  const skippedRoomIds = new Set();

  for (const sid of draftShiftIds) {
    try {
      const resp = await api(`/api/shifts/${sid}/offers`, {
        token,
        method: "POST",
        body: baseBody,
      });
      sentCount += 1;
      if (resp && Array.isArray(resp.skippedRoomIds)) {
        for (const rid of resp.skippedRoomIds) {
          const n = Number(rid);
          if (Number.isFinite(n) && n > 0) skippedRoomIds.add(n);
        }
      }
    } catch (error) {
      const info = getApiErrorInfo(error);
      if (info.code === "AGREEMENT_BLOCKED_ROOMS") {
        blockedShiftCount += 1;
        const blocked = Array.isArray(info.details?.skippedRoomIds) ? info.details.skippedRoomIds : [];
        for (const rid of blocked) {
          const n = Number(rid);
          if (Number.isFinite(n) && n > 0) skippedRoomIds.add(n);
        }
        continue;
      }
      throw error;
    }
  }

  writeGuidedTempShiftIds([]);
  return {
    sentCount,
    blockedShiftCount,
    skippedRoomIds: Array.from(skippedRoomIds),
    allBlocked: draftShiftIds.length > 0 && blockedShiftCount === draftShiftIds.length,
  };
}
