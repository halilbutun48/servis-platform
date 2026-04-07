// web/src/panels/company/planBuilderPanelActions.js

import { getApiErrorMessage } from "../../utils/apiContract";
import {
  buildPeopleItemsFromVehicle,
  buildPreviewPathPoints,
  buildPreviewPeople,
  buildPreviewStopsFromClusters,
  clusterPreviewStops,
  estimatePathDistanceKm,
  fmtKm,
  fmtMin,
  normalizeMaxWalkM,
  orderPreviewStops,
  parseShiftStopsResponse,
  summarizeMatrix,
} from "./planBuilderPanelWorkflow";

export async function ensurePlanBuilderRoomsLoaded({ api, token, pbRooms, setPbRoomsBusy, setPbRooms }) {
  if (pbRooms?.length) return;
  setPbRoomsBusy(true);
  try {
    const r = await api("/api/rooms?take=500", { method: "GET", token });
    setPbRooms(Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : []);
  } catch (e) {
    console.warn("rooms load failed", e);
  } finally {
    setPbRoomsBusy(false);
  }
}

export async function sendPlanBuilderBulkOffers({ api, token, bulkOffer, setBulkOffer, dispatchWindow, closeDelayMs = 150 }) {
  const roomIds = Object.entries(bulkOffer.roomsSel || {})
    .filter(([_, v]) => !!v)
    .map(([k]) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!bulkOffer.shiftIds?.length) return;
  if (!roomIds.length) {
    setBulkOffer((p) => ({ ...p, err: "En az 1 room seç." }));
    return;
  }

  setBulkOffer((p) => ({ ...p, busy: true, err: "", info: "", done: false, sent: 0, skippedRoomIds: [] }));
  try {
    const amt = String(bulkOffer.amountCompany || "").trim();
    const note = String(bulkOffer.noteCompany || "").trim();
    const amountCompany = amt ? Number(amt) : null;

    let sent = 0;
    const skipped = new Set();

    for (const sid of bulkOffer.shiftIds) {
      const resp = await api(`/api/shifts/${sid}/offers`, {
        method: "POST",
        token,
        body: {
          roomIds,
          amountCompany: (() => {
            const n = Number(Number.isFinite(amountCompany) ? amountCompany : null);
            return Number.isFinite(n) && n > 0 ? n : undefined;
          })(),
          noteCompany: note == null ? "" : String(note),
        },
      });

      if (resp && Array.isArray(resp.skippedRoomIds)) {
        for (const rid of resp.skippedRoomIds) {
          const n = Number(rid);
          if (Number.isFinite(n) && n > 0) skipped.add(n);
        }
      }

      sent++;
      setBulkOffer((p) => ({ ...p, sent }));
    }

    const skippedRoomIds = Array.from(skipped);
    const info = skippedRoomIds.length
      ? `Not: ${skippedRoomIds.length} room teklif atlandı (aktif sözleşme çakışması).`
      : "";

    setBulkOffer((p) => ({ ...p, done: true, busy: false, info, skippedRoomIds }));

    try {
      dispatchWindow?.dispatchEvent(
        new CustomEvent("company:shifts:focus", {
          detail: { section: "market", shiftIds: bulkOffer.shiftIds },
        })
      );
    } catch {}

    setTimeout(() => {
      setBulkOffer((p) => ({ ...p, open: false }));
    }, closeDelayMs);
  } catch (e) {
    setBulkOffer((p) => ({ ...p, err: getApiErrorMessage(e) }));
  } finally {
    setBulkOffer((p) => ({ ...p, busy: false }));
  }
}

export async function loadPlanBuilderCompanyHub({ api, token }) {
  try {
    const hub = await api("/api/company/hub", { method: "GET", token });
    return {
      hubLat: typeof hub?.hubLat === "number" ? hub.hubLat : null,
      hubLng: typeof hub?.hubLng === "number" ? hub.hubLng : null,
    };
  } catch {
    return { hubLat: null, hubLng: null };
  }
}

export async function openPlanBuilderVehiclePreview({
  api,
  token,
  vehicle,
  idx,
  solveRes,
  maxWalkM,
  companyDefaultMaxWalkM,
  direction,
  pattern,
  setRoutePreview,
  setErr,
  setPreviewBusy,
}) {
  setPreviewBusy((p) => ({ ...p, [idx]: true }));
  try {
    const people = buildPreviewPeople(vehicle?.people || []);
    const hub = await loadPlanBuilderCompanyHub({ api, token });
    const mw = normalizeMaxWalkM(maxWalkM, companyDefaultMaxWalkM);
    const personSolve = solveRes?.[idx];
    const orderedClusters = orderPreviewStops(
      clusterPreviewStops(people, mw),
      Array.isArray(personSolve?.orderIds) ? personSolve.orderIds : null
    );

    let stops = buildPreviewStopsFromClusters(orderedClusters, idx);
    let previewSource = "ESTIMATED";
    let distanceKmEstimated = personSolve?.ok && Number.isFinite(Number(personSolve.totalKm)) ? Number(personSolve.totalKm) : null;
    let durationMinEstimated = personSolve?.ok && Number.isFinite(Number(personSolve.totalMin)) ? Number(personSolve.totalMin) : null;
    let previewWarning = null;

    if (stops.length >= 2) {
      const stopPoints = stops.map((s) => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
      const stopMx = await api("/api/plan-builder/osrm-table", {
        method: "POST",
        token,
        body: { points: stopPoints, profile: "driving" },
      });

      if (stopMx?.ok) {
        const stopSolve = await api("/api/plan-builder/solve-vrp", {
          method: "POST",
          token,
          body: {
            durationsSec: stopMx.durationsSec,
            distancesM: stopMx.distancesM,
            pointIds: stopPoints.map((p) => p.id),
            depotIndex: 0,
            returnToDepot: false,
            preferOrtools: true,
          },
        });

        if (stopSolve?.ok && Array.isArray(stopSolve.orderPointIds) && stopSolve.orderPointIds.length === stopPoints.length) {
          const byId = new Map(stops.map((s) => [String(s.id), s]));
          stops = stopSolve.orderPointIds.map((id, i) => ({
            ...(byId.get(String(id)) || byId.values().next().value),
            order: i + 1,
          }));
          distanceKmEstimated = fmtKm(stopSolve.totalDistanceM) ?? estimatePathDistanceKm(buildPreviewPathPoints(stops, hub, { direction, pattern }));
          durationMinEstimated = fmtMin(stopSolve.totalDurationSec) ?? Math.max(1, Math.round((Number(distanceKmEstimated || 0) / 30) * 60));
        } else {
          previewWarning = "OSRM/solver iyileştirmesi tamamlanamadı; temel stop sırası gösteriliyor.";
        }
      } else {
        previewWarning = "OSRM tablo alınamadı; temel stop sırası gösteriliyor.";
      }
    }

    const previewPathPoints = buildPreviewPathPoints(stops, hub, { direction, pattern });
    if (distanceKmEstimated == null) distanceKmEstimated = estimatePathDistanceKm(previewPathPoints);
    if (durationMinEstimated == null) durationMinEstimated = Math.max(1, Math.round((distanceKmEstimated / 30) * 60));

    const hasHub =
      Number.isFinite(Number(hub?.hubLat)) &&
      Number.isFinite(Number(hub?.hubLng)) &&
      !(Math.abs(Number(hub?.hubLat)) < 1e-9 && Math.abs(Number(hub?.hubLng)) < 1e-9);

    setRoutePreview({
      open: true,
      title: `Taslak Rota Önizleme • Küme #${idx + 1}`,
      stops,
      people,
      previewSummary: {
        direction,
        pattern,
        isLoop: pattern === "LOOP",
        stopCount: stops.length,
        totalPassengerCount: people.length,
        distanceKmEstimated,
        durationMinEstimated,
        startLabel: hasHub ? (pattern === "LOOP" || direction === "OUTBOUND" ? "HUB" : "STOP") : "STOP",
        endLabel: hasHub ? (pattern === "LOOP" || direction === "INBOUND" ? "HUB" : "STOP") : "STOP",
        warning: !hasHub ? "hubMissing" : previewWarning,
      },
      previewPathPoints,
      previewSource,
      previewShift: {
        hubLat: hub?.hubLat ?? null,
        hubLng: hub?.hubLng ?? null,
        direction,
        pattern,
      },
    });
  } catch (e) {
    setErr(`Ön izleme hazırlanamadı: ${getApiErrorMessage(e)}`);
  } finally {
    setPreviewBusy((p) => {
      const nx = { ...p };
      delete nx[idx];
      return nx;
    });
  }
}

export async function createPlanBuilderMarketOffer({
  api,
  token,
  vehicle,
  idx,
  range,
  direction,
  pattern,
  maxWalkM,
  companyDefaultMaxWalkM,
  autoReorderStops,
  setErr,
  setRowOfferBusy,
  openBulkOfferModal,
}) {
  const startAt = range?.startAtLocal;
  const endAt = range?.endAtLocal;
  if (!startAt || !endAt) {
    setErr("Start/End geçersiz. Şablon + tarih seç.");
    return;
  }
  if (!(vehicle?.people || []).length) {
    setErr("Bu taslak kümede kişi yok.");
    return;
  }

  const mw = normalizeMaxWalkM(maxWalkM, companyDefaultMaxWalkM);
  setErr("");
  setRowOfferBusy((p) => ({ ...p, [idx]: true }));
  try {
    const hub = await loadPlanBuilderCompanyHub({ api, token });

    const shift = await api("/api/shifts", {
      method: "POST",
      token,
      body: {
        startAt,
        endAt,
        status: "REQUESTED",
        hubLat: hub.hubLat,
        hubLng: hub.hubLng,
        direction,
        pattern,
      },
    });
    const shiftId = Number(shift?.id);
    if (!shiftId) throw new Error("shiftCreateFailed");

    await api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
      method: "PUT",
      token,
      body: { items: buildPeopleItemsFromVehicle(vehicle) },
    });

    await api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${mw}`, {
      method: "POST",
      token,
      body: {},
    });

    if (autoReorderStops) {
      const stopsResp = await api(`/api/shifts/${shiftId}/stops`, { method: "GET", token });
      const stops = parseShiftStopsResponse(stopsResp);
      if (stops.length >= 2) {
        const points = stops.map((s) => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
        const mx = await api("/api/plan-builder/osrm-table", {
          method: "POST",
          token,
          body: { points, profile: "driving" },
        });
        if (mx?.ok) {
          const pointIds = points.map((x) => x.id);
          const sv = await api("/api/plan-builder/solve-vrp", {
            method: "POST",
            token,
            body: {
              durationsSec: mx.durationsSec,
              distancesM: mx.distancesM,
              pointIds,
              depotIndex: 0,
              returnToDepot: false,
              preferOrtools: true,
            },
          });
          if (sv?.ok && Array.isArray(sv.orderPointIds) && sv.orderPointIds.length === pointIds.length) {
            await api(`/api/shifts/${shiftId}/stops/reorder`, {
              method: "PUT",
              token,
              body: { idsInOrder: sv.orderPointIds },
            });
          }
        }
      }
    }

    openBulkOfferModal([shiftId]);
  } catch (e) {
    setErr(`Ayrı market teklifi oluşturulamadı: ${getApiErrorMessage(e)}`);
  } finally {
    setRowOfferBusy((p) => {
      const nx = { ...p };
      delete nx[idx];
      return nx;
    });
  }
}

export async function computePlanBuilderMatrix({ api, token, vehicle, idx, setErr, setMxRes, setMxPayload, setMxBusy }) {
  setErr("");
  setMxRes((p) => ({ ...p, [idx]: null }));
  setMxPayload((p) => ({ ...p, [idx]: null }));
  setMxBusy((p) => ({ ...p, [idx]: true }));
  try {
    const points = (vehicle?.people || []).map((p) => ({ id: p.id, lat: p.homeLat, lng: p.homeLng }));
    const out = await api("/api/plan-builder/osrm-table", {
      method: "POST",
      token,
      body: { points, profile: "driving" },
    });
    if (!out?.ok) {
      setMxRes((p) => ({ ...p, [idx]: { ok: false, error: out?.error || "osrmError", detail: out?.detail } }));
      return null;
    }
    setMxPayload((p) => ({ ...p, [idx]: out }));
    const s = summarizeMatrix(out);
    setMxRes((p) => ({ ...p, [idx]: s.ok ? s : { ok: false, error: s.error } }));
    return out;
  } catch (e) {
    setMxRes((p) => ({ ...p, [idx]: { ok: false, error: getApiErrorMessage(e) } }));
    return null;
  } finally {
    setMxBusy((p) => {
      const nx = { ...p };
      delete nx[idx];
      return nx;
    });
  }
}

export async function solvePlanBuilderRoute({
  api,
  token,
  vehicle,
  idx,
  mxPayload,
  computeMatrixForVehicle,
  setErr,
  setSolveRes,
  setSolveBusy,
}) {
  setErr("");
  setSolveRes((p) => ({ ...p, [idx]: null }));
  setSolveBusy((p) => ({ ...p, [idx]: true }));
  try {
    let payload = mxPayload?.[idx];
    const currentPointIds = (vehicle?.people || []).map((p) => String(p?.id));
    const cachedPointIds = (payload?.points || []).map((p) => String(p?.id));
    const samePointSet =
      currentPointIds.length === cachedPointIds.length &&
      currentPointIds.every((id, i) => id === cachedPointIds[i]);

    if (!payload?.ok || !samePointSet) {
      payload = await computeMatrixForVehicle(vehicle, idx);
    }
    if (!payload?.ok) {
      setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: "matrixMissing" } }));
      return;
    }

    const pointIds = (payload.points || []).map((p) => p.id);
    const out = await api("/api/plan-builder/solve-vrp", {
      method: "POST",
      token,
      body: {
        durationsSec: payload.durationsSec,
        distancesM: payload.distancesM,
        pointIds,
        depotIndex: 0,
        returnToDepot: false,
        preferOrtools: true,
      },
    });

    if (!out?.ok) {
      setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: out?.error || "solveError" } }));
      return;
    }

    const orderIds = Array.isArray(out.orderPointIds) ? out.orderPointIds : null;
    const byId = new Map((vehicle?.people || []).map((p) => [p.id, p.fullName]));
    const orderNames = orderIds ? orderIds.map((id) => byId.get(id) || String(id)) : [];

    setSolveRes((p) => ({
      ...p,
      [idx]: {
        ok: true,
        solver: out.solver,
        totalMin: fmtMin(out.totalDurationSec),
        totalKm: fmtKm(out.totalDistanceM),
        orderIds,
        orderNames,
      },
    }));
  } catch (e) {
    setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: getApiErrorMessage(e) } }));
  } finally {
    setSolveBusy((p) => {
      const nx = { ...p };
      delete nx[idx];
      return nx;
    });
  }
}

export async function applyPlanBuilderToShifts({
  api,
  token,
  plan,
  range,
  direction,
  pattern,
  maxWalkM,
  companyDefaultMaxWalkM,
  autoReorderStops,
  setErr,
  setApplyRes,
  setApplyBusy,
  openBulkOfferModal,
  onAfterApply,
}) {
  setErr("");
  setApplyRes(null);

  const startAt = range?.startAtLocal;
  const endAt = range?.endAtLocal;
  if (!startAt || !endAt) {
    setErr("Start/End geçersiz. Şablon + tarih seç.");
    return;
  }

  const mw = normalizeMaxWalkM(maxWalkM, companyDefaultMaxWalkM);
  setApplyBusy(true);
  try {
    const hub = await loadPlanBuilderCompanyHub({ api, token });
    const created = [];
    const vehicles = plan?.vehicles || [];

    for (let idx = 0; idx < vehicles.length; idx++) {
      const vehicle = vehicles[idx];
      const seatDemand = vehicle?.people?.length || 0;
      if (!seatDemand) continue;

      try {
        const shift = await api("/api/shifts", {
          method: "POST",
          token,
          body: {
            startAt,
            endAt,
            status: "REQUESTED",
            hubLat: hub.hubLat,
            hubLng: hub.hubLng,
            direction,
            pattern,
          },
        });

        const shiftId = Number(shift?.id);
        if (!shiftId) throw new Error("shiftCreateFailed");

        await api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
          method: "PUT",
          token,
          body: { items: buildPeopleItemsFromVehicle(vehicle) },
        });

        await api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${mw}`, {
          method: "POST",
          token,
          body: {},
        });

        let stopCount = null;
        let solver = null;
        let totalMin = null;
        let totalKm = null;

        if (autoReorderStops) {
          const stopsResp = await api(`/api/shifts/${shiftId}/stops`, { method: "GET", token });
          const stops = parseShiftStopsResponse(stopsResp);
          stopCount = stops.length;

          if (stops.length >= 2) {
            const points = stops.map((s) => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
            const mx = await api("/api/plan-builder/osrm-table", {
              method: "POST",
              token,
              body: { points, profile: "driving" },
            });

            if (mx?.ok) {
              const pointIds = points.map((x) => x.id);
              const sv = await api("/api/plan-builder/solve-vrp", {
                method: "POST",
                token,
                body: {
                  durationsSec: mx.durationsSec,
                  distancesM: mx.distancesM,
                  pointIds,
                  depotIndex: 0,
                  returnToDepot: false,
                  preferOrtools: true,
                },
              });

              if (sv?.ok && Array.isArray(sv.orderPointIds) && sv.orderPointIds.length === pointIds.length) {
                await api(`/api/shifts/${shiftId}/stops/reorder`, {
                  method: "PUT",
                  token,
                  body: { idsInOrder: sv.orderPointIds },
                });

                solver = sv.solver;
                totalMin = fmtMin(sv.totalDurationSec);
                totalKm = fmtKm(sv.totalDistanceM);
              }
            }
          }
        }

        created.push({ ok: true, shiftId, seatDemand, stopCount, solver, totalMin, totalKm });
      } catch (e) {
        created.push({ ok: false, idx, error: getApiErrorMessage(e) });
      }
    }

    setApplyRes({ ok: true, created });
    try {
      const okShiftIds = (created || []).filter((x) => x && x.ok && x.shiftId).map((x) => x.shiftId);
      openBulkOfferModal(okShiftIds);
    } catch {}
    if (typeof onAfterApply === "function") onAfterApply(created);
  } catch (e) {
    setErr(getApiErrorMessage(e));
  } finally {
    setApplyBusy(false);
  }
}
