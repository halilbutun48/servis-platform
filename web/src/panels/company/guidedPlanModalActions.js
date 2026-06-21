import { api } from "../../api";
import { addDaysISO, weekdayBitFromYmdUTC } from "../../utils/agreementUi";
import { getApiErrorInfo } from "../../utils/apiContract";
import {
  buildGuidedPlanModalResetState,
  clearGuidedPlanModalDraftState,
  normalizePersistedGuidedPlanDraftState,
} from "./guidedPlanModalUtils";
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
          let stopName = String(dest?.title || dest?.address || `Konum ${idx + 1}`).trim();
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
              name: stopName || `Konum ${idx + 1}`,
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

export async function hydrateGuidedDraftPeopleFromSourceShift({ token, sourceShiftId, targetShiftIds }) {
  const sid = Number(sourceShiftId || 0);
  const targets = Array.from(new Set((Array.isArray(targetShiftIds) ? targetShiftIds : []).map((x) => Number(x)).filter(Number.isFinite)));
  if (!token || !sid || !targets.length) return { copied: false, personCount: 0, coordCount: 0, targetCount: 0 };

  const sourceResp = await api(`/api/shifts/${sid}/people`, { token });
  const items = Array.isArray(sourceResp?.items) ? sourceResp.items : [];
  if (!items.length) return { copied: false, personCount: 0, coordCount: 0, targetCount: targets.length };

  const toFiniteCoord = (value) => {
    if (value == null || value === "") return null;
    const n0 = Number(value);
    if (!Number.isFinite(n0)) return null;
    const n = Object.is(n0, -0) ? 0 : n0;
    if (n === 0) return null;
    return n;
  };

  let previewPayload = null;
  try {
    previewPayload = await api(`/api/shifts/${sid}/route-preview`, { token });
  } catch {
    previewPayload = null;
  }

  const stopById = new Map(
    (Array.isArray(previewPayload?.stops) ? previewPayload.stops : [])
      .map((s) => [Number(s?.id || 0), { lat: toFiniteCoord(s?.lat), lng: toFiniteCoord(s?.lng) }])
      .filter(([id]) => Number.isFinite(id) && id > 0)
  );

  const coordByPersonelId = new Map();
  for (const a of Array.isArray(previewPayload?.assignments) ? previewPayload.assignments : []) {
    const personelId = Number(a?.personelId || 0);
    const stopId = Number(a?.stopId || 0);
    if (!Number.isFinite(personelId) || personelId <= 0) continue;
    const stop = stopById.get(stopId);
    const lat = stop?.lat ?? null;
    const lng = stop?.lng ?? null;
    if (typeof lat === "number" && typeof lng === "number" && !coordByPersonelId.has(personelId)) {
      coordByPersonelId.set(personelId, { lat, lng });
    }
  }

  const payload = items
    .map((p) => {
      const personelId = Number(p?.id || p?.personelId || 0) || undefined;
      const fromAssignment = personelId ? coordByPersonelId.get(personelId) : null;
      const lat = toFiniteCoord(p?.lat ?? p?.homeLat ?? fromAssignment?.lat);
      const lng = toFiniteCoord(p?.lng ?? p?.homeLng ?? fromAssignment?.lng);
      return {
        personelId,
        fullName: String(p?.fullName || p?.name || "").trim(),
        phone: p?.phone ?? null,
        address: null,
        lat,
        lng,
        geoManualOverride: p?.geoManualOverride === true,
        kind: p?.kind || undefined,
      };
    })
    .filter((p) => p.fullName);

  if (!payload.length) return { copied: false, personCount: 0, coordCount: 0, targetCount: targets.length };

  for (const targetId of targets) {
    await api(`/api/shifts/${targetId}/people?mode=REPLACE`, {
      token,
      method: 'PUT',
      body: { items: payload },
    });
  }

  const coordCount = payload.filter((p) => typeof p.lat === "number" && typeof p.lng === "number").length;
  return { copied: true, personCount: payload.length, coordCount, targetCount: targets.length };
}

export async function osrmReorderGuidedCore({ token, draftShifts, shiftId }) {
  const sid = Number(shiftId);
  const shift = (draftShifts || []).find((x) => Number(x.id) === sid);
  if (!shift) return { ok: false, error: "Vardiya bulunamadı." };

  const stops = Array.isArray(shift?.stops) ? shift.stops : [];
  if (stops.length < 2) return { ok: false, error: "Sıralama için en az 2 durak gerekir." };

  const hubOk = shift?.hubLat != null && shift?.hubLng != null;
  const depot = hubOk
    ? { id: "depot", lat: Number(shift.hubLat), lng: Number(shift.hubLng) }
    : { id: "depot", lat: Number(stops[0].lat), lng: Number(stops[0].lng) };

  const points = [depot, ...stops.map((x) => ({ id: Number(x.id), lat: Number(x.lat), lng: Number(x.lng) }))];
  const table = await api("/api/plan-builder/osrm-table", { token, method: "POST", body: { profile: "driving", points } });
  if (!table?.ok) {
    return { ok: false, error: "OSRM rota doğrulaması alınamadı. Rota motoru hazır değil veya bu taslak için rota verisi üretilemedi." };
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


export async function sendGuidedRouteRefreshRequestAction({ token, agreementId, roomId, sourceShiftId, draftShiftIds, offerAmount, offerNote }) {
  const body = { roomId, sourceShiftId, draftShiftIds };
  const amountCompany = parseTryInput(offerAmount);
  const noteStr = String(offerNote || "").trim();
  if (amountCompany != null) body.companyOfferAmount = amountCompany;
  if (noteStr) body.companyOfferNote = noteStr;
  return api(`/api/agreements/${Number(agreementId || 0)}/route-refresh-request`, { token, method: "POST", body });
}

export function useGuidedPlanModalActions(ctx) {
  const {
    token,
    organization,
    routeRefreshMode,
    launchContext,
    guidedPlanDraftStorageKey,
    setResetStateBaseline,
    hydratingDraftRef,
    skipPersistOnceRef,
    skipStep3ResetOnceRef,
    appliedLaunchNonceRef,
    currentStepItems,
    eligibleDaysCount,
    weekMask,
    draftNote,
    draftAmount,
    addr,
    orgEstimatedPax,
    orgGatheringName,
    orgReturnType,
    orgFilledDestinations,
    hubLat,
    hubLng,
    startDate,
    endDate,
    draftShiftIds,
    draftShifts,
    selectedRoomIds,
    offerAmount,
    offerNote,
    orgDraftCompletion,
    offerOsrmGate,
    offerSendBlockedByOsrm,
    orgDestinationAudit,
    hubSaveFeedback,
    getApiErrorMessage,
    sentOk,
    setStep,
    setBusy,
    setErr,
    setInfo,
    setHubLat,
    setHubLng,
    setAddr,
    setHubLoaded,
    setPackKey,
    setStartDate,
    setDurationKey,
    setEndDate,
    setDaysSel,
    setCustomSlots,
    setDraftNote,
    setDraftAmount,
    setOrgEstimatedPax,
    setOrgGatheringName,
    setOrgReturnType,
    setOrgDestinations,
    setMapPickIdx,
    setMapPickPoint,
    setDraftShiftIds,
    setDraftShifts,
    setOsrmBatch,
    setOsrmResById,
    setRoomQ,
    setOnlyHubRooms,
    setSelRoomIds,
    setRoomScores,
    setOfferAmount,
    setOfferNote,
    setSentOk,
    setOfferOutcome,
    setCompanyGeoGate,
    onClose,
  } = ctx;

  async function cleanupDraftShifts(idsInput = draftShiftIds, opts = {}) {
    const ids = Array.from(new Set((Array.isArray(idsInput) ? idsInput : []).map((x) => Number(x)).filter(Number.isFinite)));
    await cleanupGuidedDraftShifts({ token, ids });
    if (!opts.keepState) {
      setDraftShiftIds([]);
      setDraftShifts([]);
      setOsrmResById({});
    }
  }

  function closeGuidedPlanModal() {
    setBusy(false);
    setErr("");
    setInfo("");
    setMapPickIdx(null);
    setMapPickPoint(null);
    onClose?.();
  }

  function resetAll(opts = {}) {
    if (!opts.skipCleanup && !sentOk && draftShiftIds.length) {
      void cleanupDraftShifts(draftShiftIds, { keepState: true });
    }
    skipPersistOnceRef.current = true;
    hydratingDraftRef.current = false;
    skipStep3ResetOnceRef.current = false;
    const next = buildGuidedPlanModalResetState();
    setResetStateBaseline(normalizePersistedGuidedPlanDraftState(next));
    setStep(next.step);
    setBusy(next.busy);
    setErr(next.err);
    setInfo(next.info);
    setHubLat(next.hubLat);
    setHubLng(next.hubLng);
    setAddr(next.addr);
    setHubLoaded(next.hubLoaded);
    setPackKey(next.packKey);
    setStartDate(next.startDate);
    setDurationKey(next.durationKey);
    setEndDate(next.endDate);
    setDaysSel(next.daysSel);
    setCustomSlots(next.customSlots);
    setDraftNote(next.draftNote);
    setDraftAmount(next.draftAmount);
    setOrgEstimatedPax(next.orgEstimatedPax);
    setOrgGatheringName(next.orgGatheringName);
    setOrgReturnType(next.orgReturnType);
    setOrgDestinations(next.orgDestinations);
    setMapPickIdx(next.mapPickIdx);
    setMapPickPoint(next.mapPickPoint);
    setDraftShiftIds(next.draftShiftIds);
    setDraftShifts(next.draftShifts);
    setOsrmBatch(next.osrmBatch);
    setOsrmResById(next.osrmResById);
    setCompanyGeoGate(next.companyGeoGate);
    setRoomQ(next.roomQ);
    setOnlyHubRooms(next.onlyHubRooms);
    setSelRoomIds(next.selRoomIds);
    setRoomScores(next.roomScores);
    setOfferAmount(next.offerAmount);
    setOfferNote(next.offerNote);
    setSentOk(next.sentOk);
    setOfferOutcome(next.offerOutcome);
    appliedLaunchNonceRef.current = 0;
    clearGuidedPlanModalDraftState(guidedPlanDraftStorageKey);
  }

  async function saveHub() {
    setErr("");
    setInfo("");
    if (!token) return;
    const lat = hubLat === "" ? null : Number(hubLat);
    const lng = hubLng === "" ? null : Number(hubLng);
    if ((lat == null) !== (lng == null)) {
      setErr("Konum enlem/boylam birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Konum 0,0 olamaz.");
      return;
    }

    setBusy(true);
    try {
      await saveGuidedCompanyHub({ token, hubLat: lat, hubLng: lng });
      setInfo(organization ? hubSaveFeedback?.organization || "Toplanma konumu kaydedildi." : hubSaveFeedback?.company || "Şirket konumu kaydedildi.");
      setStep(1);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function useGeolocation() {
    setErr("");
    setInfo("");
    if (!navigator?.geolocation) {
      setErr("Tarayıcı konum izni desteklemiyor.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setErr("Konum okunamadı.");
          return;
        }
        setHubLat(String(lat));
        setHubLng(String(lng));
        setInfo(
          organization
            ? "• Toplanma konumu alındı. Kaydetmek için 'İleri'ye bas."
            : "• Konum alındı. Kaydetmek için 'İleri'ye bas."
        );
      },
      (e) => {
        setBusy(false);
        setErr(getApiErrorMessage(e, "Konum izni reddedildi"));
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  async function geocodeAddress() {
    setErr("");
    setInfo("");
    if (!token) return;
    const q = String(addr || "").trim();
    if (q.length < 3) {
      setErr("Adres en az 3 karakter olmalı.");
      return;
    }
    setBusy(true);
    try {
      const r = await geocodeGuidedLocation({ token, q });
      if (r?.ok) {
        setHubLat(String(r.lat));
        setHubLng(String(r.lng));
        setInfo(`Bulundu: ${r.displayName || ""}`);
      } else {
        setErr("Adres bulunamadı.");
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function createDraftShifts() {
    setErr("");
    setInfo("");
    setSentOk(false);
    if (!token) return;

    const lat = hubLat === "" ? null : Number(hubLat);
    const lng = hubLng === "" ? null : Number(hubLng);
    if ((lat == null) !== (lng == null)) {
      setErr("Konum enlem/boylam birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Konum 0,0 olamaz.");
      return;
    }

    const items = Array.isArray(currentStepItems) ? currentStepItems : [];
    if (!items.length) {
      setErr("Plan paketi geçersiz.");
      return;
    }
    const totalDraftCount = eligibleDaysCount * items.length;
    if (eligibleDaysCount > 7) {
      setErr("Rehberli Mod en fazla 7 gün olabilir. Daha uzun planlar için sözleşme kullanın.");
      return;
    }
    if (totalDraftCount > 21) {
      setErr("Rehberli Mod en fazla 21 vardiya oluşturabilir. Daha yoğun planlar için sözleşme kullanın.");
      return;
    }
    if (organization) {
      if (!String(orgEstimatedPax || "").trim()) {
        setErr("Tahmini kişi sayısını gir.");
        return;
      }
      if (!orgFilledDestinations.length) {
        setErr("En az 1 gidilecek konum ekle.");
        return;
      }
      if (!orgDestinationAudit.ok) {
        setErr(`Koordinatı eksik konumlar var: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}. Adresten bul, manuel enlem / boylam gir veya haritadan seç.`);
        return;
      }
    }

    setBusy(true);
    try {
      const orgNoteSummaryText = organization
        ? (() => {
            const gathering = String(orgGatheringName || "").trim();
            const pax = String(orgEstimatedPax || "").trim();
            const places = (Array.isArray(orgFilledDestinations) ? orgFilledDestinations : [])
              .map((d) => String(d.title || d.address || "").trim())
              .filter(Boolean);
            const returnText = orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir";
            const parts = [];
            if (gathering) parts.push(`Toplanma Konumu: ${gathering}`);
            if (pax) parts.push(`Tahmini kişi: ${pax}`);
            if (places.length) parts.push(`Konumlar: ${places.join(" • ")}`);
            parts.push(`Dönüş: ${returnText}`);
            return `[Gezi planı] ${parts.join(" | ")}`;
          })()
        : "";

      const created = await createGuidedDraftShiftsAction({
        token,
        existingDraftShiftIds: draftShiftIds,
        cleanupDraftShifts,
        stepItems: items,
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
      });
      if (!created.createdIds.length) {
        setErr("Seçili tarih aralığında (gün filtresine göre) vardiya üretilecek gün yok. Başlangıç / günler / süreyi değiştir.");
        return;
      }

      let nextDraftShifts = created.draftShifts;
      let hydrationInfo = "";
      if (!organization && routeRefreshMode) {
        const sourceShiftId = Number(launchContext?.sourceShiftId || 0);
        if (sourceShiftId > 0) {
          const hydrated = await hydrateGuidedDraftPeopleFromSourceShift({
            token,
            sourceShiftId,
            targetShiftIds: created.createdIds,
          });
          if (hydrated?.copied) {
            hydrationInfo = ` ? kaynak vardiyadan ${Number(hydrated.personCount || 0)} personel taşındı`;
            nextDraftShifts = await refreshGuidedDraftShiftsAction({ token, draftShiftIds: created.createdIds });
          }
        }
      }

      setDraftShiftIds(created.createdIds);
      setDraftShifts(nextDraftShifts);
      setInfo(`Taslak vardiya oluşturuldu: ${created.createdIds.map((x) => "#" + x).join(", ")}${hydrationInfo}`);
      setStep(2);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshDraftShifts() {
    if (!token) return;
    if (!draftShiftIds.length) return;
    try {
      const items = await refreshGuidedDraftShiftsAction({ token, draftShiftIds });
      setDraftShifts(items);
    } catch {
      // ignore
    }
  }

  async function osrmReorderCore(sid) {
    return osrmReorderGuidedCore({ token, draftShifts, shiftId: sid });
  }

  async function osrmReorder(shiftId) {
    setErr("");
    setInfo("");
    if (!token) return;

    const sid = Number(shiftId);
    if (!Number.isFinite(sid)) return;

    setBusy(true);
    try {
      const res = await osrmReorderCore(sid);
      if (!res.ok) {
        setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: res.error } }));
        setErr(res.error || "Sıralama başarısız.");
        return;
      }
      setOsrmResById((prev) => ({ ...prev, [sid]: { ok: true } }));
      setInfo(`Rota sırası oluşturuldu (motor: ${res.solver || "-" }).`);
      await refreshDraftShifts();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function osrmReorderAll() {
    setErr("");
    setInfo("");
    if (!token) return;

    const ids = (draftShifts || [])
      .map((x) => Number(x.id))
      .filter(Number.isFinite);

    if (!ids.length) {
      setErr("Taslak vardiya yok.");
      return;
    }

    setBusy(true);
    setOsrmBatch({ running: true, done: 0, total: ids.length });

    try {
      let okCount = 0;
      let errCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const sid = ids[i];
        try {
          const res = await osrmReorderCore(sid);
          if (res.ok) {
            okCount++;
            setOsrmResById((prev) => ({ ...prev, [sid]: { ok: true } }));
          } else {
            errCount++;
            setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: res.error } }));
          }
        } catch (e) {
          errCount++;
          setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: getApiErrorMessage(e) } }));
        }

        setOsrmBatch({ running: true, done: i + 1, total: ids.length });
      }

      await refreshDraftShifts();
      setInfo(`Hepsi işlendi. Başarılı: ${okCount}, Hatalı: ${errCount}.`);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setOsrmBatch((p) => ({ ...p, running: false }));
      setBusy(false);
    }
  }

  async function sendBulkOffers() {
    setErr("");
    setInfo("");
    if (!token) return;
    if (!draftShiftIds.length) {
      setErr("Önce taslak vardiya oluşturmalısın.");
      return;
    }
    if (organization && !orgDraftCompletion.ready) {
      setErr(`Markete göndermek için plan tamamlanmalı: ${orgDraftCompletion.reasons.join(" • ")}`);
      return;
    }
    if (offerSendBlockedByOsrm) {
      setErr(offerOsrmGate.reasons.join(" • ") || "Rota doğrulaması tamamlanmadan teklif gönderilemez.");
      return;
    }

    setBusy(true);
    try {
      if (routeRefreshMode) {
        const agreementId = Number(launchContext?.agreementId || 0);
        const roomId = Number(launchContext?.roomId || 0);
        const sourceShiftId = Number(launchContext?.sourceShiftId || 0);
        const created = await sendGuidedRouteRefreshRequestAction({
          token,
          agreementId,
          roomId,
          sourceShiftId,
          draftShiftIds,
          offerAmount,
          offerNote,
        });
        setSentOk(true);
        setOfferOutcome("route_refresh_pending");
        setInfo(`Rota güncelleme isteği gönderildi (${launchContext?.roomName || `Sağlayıcı #${roomId || "?"}`}). Talep #${Number(created?.item?.id || created?.id || 0) || "?"} olarak kaydedildi.`);
      } else {
        const roomIds = selectedRoomIds;
        if (!roomIds.length) {
          setErr("En az 1 sağlayıcı seç.");
          return;
        }
        const result = await sendGuidedBulkOffersAction({ token, draftShiftIds, selectedRoomIds: roomIds, offerAmount, offerNote });
        const skippedCount = Array.isArray(result?.skippedRoomIds) ? result.skippedRoomIds.length : 0;
        setSentOk(true);
        if (result?.allBlocked) {
          setOfferOutcome("agreement_covered");
          setInfo("Seçilen sağlayıcılar bu zaman penceresinde zaten aktif sözleşme kapsamında. Yeni teklif gönderilmedi; taslak vardiyalar korundu.");
        } else {
          setOfferOutcome("sent");
          const sentText = `Gönderildi (vardiya sayısı: ${Number(result?.sentCount || 0)}).`;
          const skipText = skippedCount > 0 ? ` Not: ${skippedCount} sağlayıcı teklifi atlandı (aktif sözleşme çakışması).` : "";
          setInfo(`${sentText}${skipText}`);
        }
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return {
    closeGuidedPlanModal,
    resetAll,
    saveHub,
    useGeolocation,
    geocodeAddress,
    createDraftShifts,
    refreshDraftShifts,
    osrmReorder,
    osrmReorderAll,
    sendBulkOffers,
  };
}
