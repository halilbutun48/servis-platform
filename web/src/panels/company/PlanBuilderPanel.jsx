// web/src/panels/company/PlanBuilderPanel.jsx


import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { personLabel } from "../../utils/labels";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import { addDaysYmdTR, isoFromTRLocalInput, ymdTR } from "../../utils/time";

// Tiny geohash encoder (no deps)
const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function encodeGeohash(lat, lng, precision = 6) {
  const p = Math.max(1, Math.min(12, Number(precision) || 6));
  let latitude = [-90.0, 90.0];
  let longitude = [-180.0, 180.0];
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let hash = "";

  while (hash.length < p) {
    if (isEven) {
      const mid = (longitude[0] + longitude[1]) / 2;
      if (lng > mid) {
        ch |= 1 << (4 - bit);
        longitude[0] = mid;
      } else {
        longitude[1] = mid;
      }
    } else {
      const mid = (latitude[0] + latitude[1]) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bit);
        latitude[0] = mid;
      } else {
        latitude[1] = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayYmdLocal() {
  return ymdTR();
}
function addDaysYmd(ymd, deltaDays) {
  return addDaysYmdTR(ymd, deltaDays);
}
function minutesOf(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (![hh, mm].every(Number.isFinite)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
function buildLocalRangeFromItem(baseYmd, item) {

  const baseDate = String(baseYmd || "").match(/^\d{4}-\d{2}-\d{2}$/) ? baseYmd : todayYmdLocal();
  const sMin = minutesOf(item?.startHHMM);
  const eMin = minutesOf(item?.endHHMM);
  if (sMin == null || eMin == null) return { startAtLocal: "", endAtLocal: "" };

  const startAtLocal = `${baseDate}T${item.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endAtLocal = `${endDate}T${item.endHHMM}`;
  return { startAtLocal, endAtLocal };
}

// datetime-local (Istanbul local) -> canonical ISO instant
function istanbulLocalToUtcIso(dtLocal) {
  return isoFromTRLocalInput(dtLocal) || null;
}


function avgLatLng(list) {
  if (!list?.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const p of list) {
    const lat = Number(p?.homeLat);
    const lng = Number(p?.homeLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    n++;
  }
  if (!n) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

export default function PlanBuilderPanel({
  token,
  templateOptions,
  rangeOverride,
  hideDraftTransferUI = false,
  directionOverride,
  patternOverride,
  onUseDraft,
  onAfterApply,
}) {
  const { me } = useSession();
  const who = personLabel(me);
  const companyDefaultMaxWalkM = me?.companyKind === "SCHOOL" ? 50 : 250;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // Stage-1: OSRM matrix per draft-vehicle
  const [mxBusy, setMxBusy] = useState({}); // { [idx]: true }
  const [mxRes, setMxRes] = useState({}); // { [idx]: { ok, n, avgMin, avgKm, error } }
  const [mxPayload, setMxPayload] = useState({}); // { [idx]: { durationsSec, distancesM, points } }

  // Stage-2: route solve (OR-Tools optional)
  const [solveBusy, setSolveBusy] = useState({}); // { [idx]: true }
  const [solveRes, setSolveRes] = useState({}); // { [idx]: { ok, solver, totalMin, totalKm, orderIds, orderNames } }
  const [previewBusy, setPreviewBusy] = useState({}); // { [idx]: true }

  // Stage-3: apply (create shifts + people + stops + reorder)
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyRes, setApplyRes] = useState(null); // { ok, created:[{shiftId, seatDemand, stopCount, solver?}] }

  // --- M33.6b BULK OFFER MODAL (PlanBuilder) ---
  const [pbRooms, setPbRooms] = useState([]);
  const [pbRoomsBusy, setPbRoomsBusy] = useState(false);

  const [bulkOffer, setBulkOffer] = useState({
    open: false,
    shiftIds: [],
    q: "",
    roomsSel: {}, // { [roomId]: true }
    amountCompany: (() => { const n = Number(""); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
    noteCompany: (() => { const v = (""); return (v === null || v === undefined) ? "" : String(v); })(),
    busy: false,
    err: "",
    done: false,
    sent: 0,
    info: "",
    skippedRoomIds: [],
  });

  async function ensureRoomsLoaded() {
    if (pbRooms?.length) return;
    setPbRoomsBusy(true);
    try {
      const r = await api("/api/rooms?take=500", { method: "GET", token });
      setPbRooms(Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []));
    } catch (e) {
      // keep silent, modal shows error on send
      console.warn("rooms load failed", e);
    } finally {
      setPbRoomsBusy(false);
    }
  }

  function openBulkOfferModal(shiftIds) {
    const ids = Array.isArray(shiftIds) ? shiftIds.filter(Boolean) : [];
    if (!ids.length) return;
    setBulkOffer((p) => ({
      ...p,
      open: true,
      shiftIds: ids,
      roomsSel: {},
      q: "",
      amountCompany: (() => { const n = Number(""); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
      noteCompany: (() => { const v = (""); return (v === null || v === undefined) ? "" : String(v); })(),
      busy: false,
      err: "",
      done: false,
      sent: 0,
    info: "",
    skippedRoomIds: [],
    }));
    ensureRoomsLoaded();
  }

  async function sendBulkOffers() {
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
        const resp = await api("/api/shifts/" + sid + "/offers", {
          method: "POST",
          token,
          body: {
            roomIds,
            amountCompany: (() => {
              const n = Number(Number.isFinite(amountCompany) ? amountCompany : null);
              return Number.isFinite(n) && n > 0 ? n : undefined;
            })(),
            noteCompany: (() => {
              const v = note || null;
              return v == null ? "" : String(v);
            })(),
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

      // ✅ Akış: teklif gönderimi bittikten sonra Market Shifts'e odakla (menü gezdirmesin)
      try {
        window.dispatchEvent(
          new CustomEvent("company:shifts:focus", {
            detail: { section: "market", shiftIds: bulkOffer.shiftIds },
          })
        );
      } catch {}

      // modal'ı kapat (ekranı serbest bırak)
      setTimeout(() => {
        setBulkOffer((p) => ({ ...p, open: false }));
      }, 150);
    } catch (e) {
      setBulkOffer((p) => ({ ...p, err: String(e?.message || e) }));
    } finally {
      setBulkOffer((p) => ({ ...p, busy: false }));
    }
  }
  // --- /M33.6b ---
  const [maxWalkM, setMaxWalkM] = useState(() => String(me?.companyKind === "SCHOOL" ? 50 : 250));
  const [autoReorderStops, setAutoReorderStops] = useState(true);

  // Inputs
  const [onlyOk, setOnlyOk] = useState(true);
  // Company tarafında nihai araç kapasitesi belirlenmez; Stage-3 taslak gruplama kapasite ile bölünmez.
  const [precision, setPrecision] = useState("6");
  const [baseDate, setBaseDate] = useState(() => todayYmdLocal());
  const [tplKey, setTplKey] = useState(() => (templateOptions?.[0]?.key ? String(templateOptions[0].key) : ""));
  const transferAsMarket = true;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rowOfferBusy, setRowOfferBusy] = useState({});
  const [routePreview, setRoutePreview] = useState({
    open: false,
    title: "",
    stops: [],
    people: [],
    previewSummary: null,
    previewPathPoints: null,
    previewSource: null,
    previewShift: null,
  });

  useEffect(() => {
    if (tplKey) return;
    if (templateOptions?.[0]?.key) setTplKey(String(templateOptions[0].key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateOptions?.length]);

  useEffect(() => {
    setMaxWalkM((prev) => {
      const current = Number(prev);
      if (!String(prev || "").trim() || current === 50 || current === 250) {
        return String(companyDefaultMaxWalkM);
      }
      return prev;
    });
  }, [companyDefaultMaxWalkM]);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const res = await api("/api/company/personels", { token });
      const list = Array.isArray(res) ? res : res?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let ok = 0;
    let needs = 0;
    let failed = 0;
    let missingLoc = 0;

    for (const p of items || []) {
      total++;
      const lat = Number(p?.homeLat);
      const lng = Number(p?.homeLng);
      const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);
      if (!hasLoc) missingLoc++;

      if (p?.geoStatus === "OK") ok++;
      else if (p?.geoStatus === "NEEDS_REVIEW") needs++;
      else if (p?.geoStatus === "FAILED") failed++;
    }
    return { total, ok, needs, failed, missingLoc };
  }, [items]);

  const eligible = useMemo(() => {
    return (items || [])
      .filter((p) => {
        const lat = Number(p?.homeLat);
        const lng = Number(p?.homeLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        if (onlyOk) return p?.geoStatus === "OK";
        return true;
      })
      .map((p) => ({
        id: p.id,
        fullName: p.fullName,
        homeLat: Number(p.homeLat),
        homeLng: Number(p.homeLng),
        geoStatus: p.geoStatus,
      }));
  }, [items, onlyOk]);

  const plan = useMemo(() => {
    const prec = Math.max(1, Math.min(12, Number(precision) || 6));

    const groups = new Map(); // geohash -> people[]
    for (const p of eligible) {
      const key = encodeGeohash(p.homeLat, p.homeLng, prec);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const entries = Array.from(groups.entries()).sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0));

    const vehicles = entries.map(([key, people]) => ({
      people: [...people],
      groupKeys: new Set([key]),
      centroid: avgLatLng(people),
    }));

    const recommended = vehicles.length;

    return {
      prec,
      groups: entries,
      vehicles,
      recommended,
      total: eligible.length,
    };
  }, [eligible, precision]);

  const planVehicleSignature = useMemo(
    () => JSON.stringify((plan?.vehicles || []).map((v) => (v?.people || []).map((p) => String(p?.id ?? "")))),
    [plan]
  );

  useEffect(() => {
    setMxBusy({});
    setMxRes({});
    setMxPayload({});
    setSolveBusy({});
    setSolveRes({});
    setRowOfferBusy({});
    setPreviewBusy({});
  }, [planVehicleSignature, rangeOverride?.startAtLocal, rangeOverride?.endAtLocal, tplKey, baseDate, onlyOk, precision]);

  const selectedTpl = useMemo(() => templateOptions?.find((x) => x.key === tplKey) || null, [templateOptions, tplKey]);

  const range = useMemo(() => {
    // If parent provides a range (Step-1: Şablon & Zaman), trust it.
    const s = String(rangeOverride?.startAtLocal || "").trim();
    const e = String(rangeOverride?.endAtLocal || "").trim();
    if (s && e) return { startAtLocal: s, endAtLocal: e };
    return buildLocalRangeFromItem(baseDate, selectedTpl?.item);
  }, [rangeOverride?.startAtLocal, rangeOverride?.endAtLocal, baseDate, selectedTpl]);

  const activeDirection = useMemo(() => {
    const raw = String(directionOverride || selectedTpl?.item?.direction || "INBOUND").toUpperCase();
    return raw === "OUTBOUND" ? "OUTBOUND" : "INBOUND";
  }, [directionOverride, selectedTpl]);

  const activePattern = useMemo(() => {
    const raw = String(patternOverride || selectedTpl?.item?.pattern || "ONE_WAY").toUpperCase();
    return raw === "LOOP" ? "LOOP" : "ONE_WAY";
  }, [patternOverride, selectedTpl]);

  function normalizeMaxWalkM(rawValue) {
    return Math.min(2000, Math.max(50, Number(rawValue) || companyDefaultMaxWalkM));
  }

  function haversineMeters(a, b) {
    const toRad = (deg) => (Number(deg) * Math.PI) / 180;
    const lat1 = Number(a?.lat);
    const lng1 = Number(a?.lng);
    const lat2 = Number(b?.lat);
    const lng2 = Number(b?.lng);
    if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const aa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return Math.round(R * c);
  }

  function clusterPreviewStops(people, maxWalkMeters) {
    const remaining = new Map((people || []).map((p) => [String(p.id), p]));
    const distCache = new Map();

    function pairKey(a, b) {
      return String(a.id) < String(b.id) ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    }

    function dist(a, b) {
      const k = pairKey(a, b);
      const hit = distCache.get(k);
      if (hit != null) return hit;
      const meters = haversineMeters(a, b);
      distCache.set(k, meters);
      return meters;
    }

    const clusters = [];
    while (remaining.size > 0) {
      const seed = remaining.values().next().value;
      const candidates = [];
      for (const p of remaining.values()) {
        if (dist(seed, p) <= maxWalkMeters) candidates.push(p);
      }

      let bestCenter = seed;
      let bestMembers = [seed];
      for (const candidate of candidates) {
        const members = [];
        for (const p of candidates) {
          if (dist(candidate, p) <= maxWalkMeters) members.push(p);
        }
        if (members.length > bestMembers.length) {
          bestCenter = candidate;
          bestMembers = members;
        }
      }

      for (const member of bestMembers) {
        remaining.delete(String(member.id));
      }

      clusters.push({ center: bestCenter, members: bestMembers });
    }

    return clusters;
  }

  function orderPreviewStops(clusters, orderIds) {
    if (!Array.isArray(orderIds) || !orderIds.length) return clusters;
    const pos = new Map(orderIds.map((id, i) => [String(id), i]));
    return [...clusters].sort((a, b) => {
      const ai = Math.min(...(a.members || []).map((m) => (pos.has(String(m.id)) ? pos.get(String(m.id)) : Number.MAX_SAFE_INTEGER)));
      const bi = Math.min(...(b.members || []).map((m) => (pos.has(String(m.id)) ? pos.get(String(m.id)) : Number.MAX_SAFE_INTEGER)));
      if (ai !== bi) return ai - bi;
      return (b.members?.length || 0) - (a.members?.length || 0);
    });
  }

  function estimatePathDistanceKm(points) {
    const list = Array.isArray(points) ? points : [];
    let totalMeters = 0;
    for (let i = 1; i < list.length; i++) {
      totalMeters += haversineMeters(list[i - 1], list[i]);
    }
    return Number((totalMeters / 1000).toFixed(1));
  }

  function buildPreviewPathPoints(stops, hub) {
    const stopPoints = (stops || [])
      .map((s) => ({ lat: Number(s?.lat), lng: Number(s?.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    const hubLat = Number(hub?.hubLat);
    const hubLng = Number(hub?.hubLng);
    const hasHub =
      Number.isFinite(hubLat) &&
      Number.isFinite(hubLng) &&
      !(Math.abs(hubLat) < 1e-9 && Math.abs(hubLng) < 1e-9);

    if (!hasHub) return stopPoints;

    const hubPoint = { lat: hubLat, lng: hubLng };
    if (activePattern === "LOOP") return [hubPoint, ...stopPoints, hubPoint];
    if (activeDirection === "OUTBOUND") return [hubPoint, ...stopPoints];
    return [...stopPoints, hubPoint];
  }

  async function loadCompanyHub() {
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

  function buildVehicleDraft(v, idx) {
    const seatDemand = v?.people?.length || 0;
    const centroid = v?.centroid || null;
    const sampleNames = (v?.people || []).map((p) => p.fullName).filter(Boolean);
    const mx = mxRes?.[idx] || null;
    const sv = solveRes?.[idx] || null;
    return {
      idx,
      seatDemand,
      centroid,
      groupCount: v?.groupKeys?.size || 0,
      peopleIds: (v?.people || []).map((p) => p.id).filter(Boolean),
      peopleNames: sampleNames,
      startAtLocal: range.startAtLocal,
      endAtLocal: range.endAtLocal,
      templateKey: tplKey,
      marketMode: transferAsMarket,
      matrixAvgMin: mx?.ok ? mx.avgMin : null,
      matrixAvgKm: mx?.ok ? mx.avgKm : null,
      solver: sv?.ok ? sv.solver : null,
      routeMin: sv?.ok ? sv.totalMin : null,
      routeKm: sv?.ok ? sv.totalKm : null,
      orderNames: Array.isArray(sv?.orderNames) ? sv.orderNames : [],
    };
  }

  
async function openVehiclePreview(v, idx) {
    setPreviewBusy((p) => ({ ...p, [idx]: true }));
    try {
      const people = (v?.people || [])
        .map((p) => ({
          id: String(p.id),
          name: p.fullName || String(p.id),
          lat: Number(p.homeLat),
          lng: Number(p.homeLng),
          geoStatus: p.geoStatus || "",
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      const hub = await loadCompanyHub();
      const mw = normalizeMaxWalkM(maxWalkM);
      const personSolve = solveRes?.[idx];
      const orderedClusters = orderPreviewStops(
        clusterPreviewStops(people, mw),
        Array.isArray(personSolve?.orderIds) ? personSolve.orderIds : null
      );

      let stops = orderedClusters.map((cluster, i) => ({
        id: `preview-stop-${idx}-${i + 1}`,
        title:
          (cluster.members?.length || 0) > 1
            ? `${cluster.members.length} kişi • Durak ${i + 1}`
            : cluster.members?.[0]?.name || `Durak ${i + 1}`,
        lat: Number(cluster.center?.lat),
        lng: Number(cluster.center?.lng),
        count: cluster.members?.length || 0,
        order: i + 1,
        state: "PENDING",
      }));

      let previewSource = "ESTIMATED";
      let distanceKmEstimated = personSolve?.ok && Number.isFinite(Number(personSolve.totalKm))
        ? Number(personSolve.totalKm)
        : null;
      let durationMinEstimated = personSolve?.ok && Number.isFinite(Number(personSolve.totalMin))
        ? Number(personSolve.totalMin)
        : null;
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
            previewSource = stopSolve.solver === "ortools" ? "ESTIMATED" : "ESTIMATED";
            distanceKmEstimated = fmtKm(stopSolve.totalDistanceM) ?? estimatePathDistanceKm(buildPreviewPathPoints(stops, hub));
            durationMinEstimated = fmtMin(stopSolve.totalDurationSec) ?? Math.max(1, Math.round((Number(distanceKmEstimated || 0) / 30) * 60));
          } else {
            previewWarning = "OSRM/solver iyileştirmesi tamamlanamadı; temel stop sırası gösteriliyor.";
          }
        } else {
          previewWarning = "OSRM tablo alınamadı; temel stop sırası gösteriliyor.";
        }
      }

      const previewPathPoints = buildPreviewPathPoints(stops, hub);
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
          direction: activeDirection,
          pattern: activePattern,
          isLoop: activePattern === "LOOP",
          stopCount: stops.length,
          totalPassengerCount: people.length,
          distanceKmEstimated,
          durationMinEstimated,
          startLabel: hasHub ? (activePattern === "LOOP" || activeDirection === "OUTBOUND" ? "HUB" : "STOP") : "STOP",
          endLabel: hasHub ? (activePattern === "LOOP" || activeDirection === "INBOUND" ? "HUB" : "STOP") : "STOP",
          warning: !hasHub ? "hubMissing" : previewWarning,
        },
        previewPathPoints,
        previewSource,
        previewShift: {
          hubLat: hub?.hubLat ?? null,
          hubLng: hub?.hubLng ?? null,
          direction: activeDirection,
          pattern: activePattern,
        },
      });
    } catch (e) {
      setErr(`Ön izleme hazırlanamadı: ${String(e?.message || e)}`);
    } finally {
      setPreviewBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }

  async function createMarketOfferForVehicle(v, idx) {
    const startAt = istanbulLocalToUtcIso(range.startAtLocal);
    const endAt = istanbulLocalToUtcIso(range.endAtLocal);
    if (!startAt || !endAt) {
      setErr("Start/End geçersiz. Şablon + tarih seç.");
      return;
    }

    const seatDemand = v?.people?.length || 0;
    if (!seatDemand) {
      setErr("Aktarılacak kişi yok.");
      return;
    }

    const mw = normalizeMaxWalkM(maxWalkM);
    setErr("");
    setRowOfferBusy((p) => ({ ...p, [idx]: true }));
    try {
      let hubLat = null;
      let hubLng = null;
      try {
        const hub = await loadCompanyHub();
        hubLat = hub.hubLat;
        hubLng = hub.hubLng;
      } catch {}

      const shift = await api("/api/shifts", {
        method: "POST",
        token,
        body: { startAt, endAt, status: "REQUESTED", hubLat, hubLng, direction: activeDirection, pattern: activePattern },
      });
      const shiftId = Number(shift?.id);
      if (!shiftId) throw new Error("shiftCreateFailed");

      const peopleItems = (v.people || []).map((p) => ({
        personelId: p.id,
        fullName: p.fullName,
        lat: p.homeLat,
        lng: p.homeLng,
        geoManualOverride: true,
      }));

      await api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
        method: "PUT",
        token,
        body: { items: peopleItems },
      });

      await api(`/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=${mw}`, {
        method: "POST",
        token,
        body: {},
      });

      if (autoReorderStops) {
        const stopsResp = await api(`/api/shifts/${shiftId}/stops`, { method: "GET", token });
        const stops = Array.isArray(stopsResp) ? stopsResp : (Array.isArray(stopsResp?.items) ? stopsResp.items : (Array.isArray(stopsResp?.stops) ? stopsResp.stops : []));
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
      setErr(`Ayrı market teklifi oluşturulamadı: ${String(e?.message || e)}`);
    } finally {
      setRowOfferBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }

  function summarizeMatrix(payload) {
    const dur = payload?.durationsSec;
    const dist = payload?.distancesM;
    const n = Array.isArray(dur) ? dur.length : 0;
    if (!n) return { ok: false, error: "noMatrix" };

    let sumS = 0;
    let sumM = 0;
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const s = dur?.[i]?.[j];
        const m = dist?.[i]?.[j];
        if (typeof s === "number" && s > 0) {
          sumS += s;
          if (typeof m === "number" && m > 0) sumM += m;
          cnt++;
        }
      }
    }
    if (!cnt) return { ok: false, error: "unreachable" };
    const avgMin = Math.round(sumS / cnt / 60);
    const avgKm = sumM ? Number((sumM / cnt / 1000).toFixed(1)) : null;
    return { ok: true, n, avgMin, avgKm };
  }

  async function computeMatrixForVehicle(v, idx) {
    setErr("");
    setMxRes((p) => ({ ...p, [idx]: null }));
    setMxPayload((p) => ({ ...p, [idx]: null }));
    setMxBusy((p) => ({ ...p, [idx]: true }));
    try {
      const points = (v?.people || []).map((p) => ({ id: p.id, lat: p.homeLat, lng: p.homeLng }));
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
      setMxRes((p) => ({ ...p, [idx]: { ok: false, error: e?.message || String(e) } }));
      return null;
    } finally {
      setMxBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }

  function fmtMin(sec) {
    const s = Number(sec);
    if (!Number.isFinite(s) || s < 0) return null;
    return Math.max(0, Math.round(s / 60));
  }
  function fmtKm(m) {
    const x = Number(m);
    if (!Number.isFinite(x) || x < 0) return null;
    return Number((x / 1000).toFixed(1));
  }

  async function solveRouteForVehicle(v, idx) {
    setErr("");
    setSolveRes((p) => ({ ...p, [idx]: null }));
    setSolveBusy((p) => ({ ...p, [idx]: true }));
    try {
      let payload = mxPayload?.[idx];
      const currentPointIds = (v?.people || []).map((p) => String(p?.id));
      const cachedPointIds = (payload?.points || []).map((p) => String(p?.id));
      const samePointSet =
        currentPointIds.length === cachedPointIds.length &&
        currentPointIds.every((id, i) => id === cachedPointIds[i]);

      if (!payload?.ok || !samePointSet) {
        // auto-fetch matrix if missing or stale for current cluster
        payload = await computeMatrixForVehicle(v, idx);
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
      const byId = new Map((v?.people || []).map((p) => [p.id, p.fullName]));
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
      setSolveRes((p) => ({ ...p, [idx]: { ok: false, error: e?.message || String(e) } }));
    } finally {
      setSolveBusy((p) => {
        const nx = { ...p };
        delete nx[idx];
        return nx;
      });
    }
  }


  async function applyPlanToShifts() {
    setErr("");
    setApplyRes(null);

    const startAt = istanbulLocalToUtcIso(range.startAtLocal);
    const endAt = istanbulLocalToUtcIso(range.endAtLocal);
    if (!startAt || !endAt) {
      setErr("Start/End geçersiz. Şablon + tarih seç.");
      return;
    }

    const mw = normalizeMaxWalkM(maxWalkM);

    setApplyBusy(true);
    try {
      // Company hub (optional but recommended for route preview / INBOUND end anchor)
      let hubLat = null;
      let hubLng = null;
      try {
        const hub = await api("/api/company/hub", { method: "GET", token });
        hubLat = typeof hub?.hubLat === "number" ? hub.hubLat : null;
        hubLng = typeof hub?.hubLng === "number" ? hub.hubLng : null;
      } catch {
        // ignore (hub optional)
      }

      const created = [];
      const vehicles = plan?.vehicles || [];

      for (let idx = 0; idx < vehicles.length; idx++) {
        const v = vehicles[idx];
        const seatDemand = v?.people?.length || 0;
        if (!seatDemand) continue;

        try {
          // 1) create market shift (roomId null)
          const shift = await api("/api/shifts", {
            method: "POST",
            token,
            body: { startAt, endAt, status: "REQUESTED", hubLat, hubLng, direction: activeDirection, pattern: activePattern },
          });

          const shiftId = Number(shift?.id);
          if (!shiftId) throw new Error("shiftCreateFailed");

          // 2) attach people
          const peopleItems = (v.people || []).map((p) => ({
            personelId: p.id,
            fullName: p.fullName,
            lat: p.homeLat,
            lng: p.homeLng,
            geoManualOverride: true,
          }));

          await api(`/api/shifts/${shiftId}/people?mode=REPLACE`, {
            method: "PUT",
            token,
            body: { items: peopleItems },
          });

          // 3) generate stops (COMMON clusters + assignments)
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
            // 4) fetch shift stops
            const stopsResp = await api(`/api/shifts/${shiftId}/stops`, { method: "GET", token });
            const stops = Array.isArray(stopsResp) ? stopsResp : (Array.isArray(stopsResp?.items) ? stopsResp.items : (Array.isArray(stopsResp?.stops) ? stopsResp.stops : []));
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
          created.push({ ok: false, idx, error: String(e?.message || e) });
        }
      }

      setApplyRes({ ok: true, created });
      // M33.6b: open bulk offer modal automatically after apply
      try {
        const okShiftIds = (created || []).filter((x) => x && x.ok && x.shiftId).map((x) => x.shiftId);
        openBulkOfferModal(okShiftIds);
      } catch (e) {}      if (typeof onAfterApply === "function") onAfterApply(created);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setApplyBusy(false);
    }
  }
   const openShiftToolsGeocode = () => {
    try {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => (b.textContent || "").trim() === "Shift Tools"
      );
      if (btn) btn.click();
      setTimeout(() => {
        const el = document.getElementById("shift-tools-geocode");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {}
  };
 return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Plan Builder (Stage-3)</h3>
          <div className="muted">
            Stage-0: kişi sayısı + kapasite → araç sayısı, geohash/cluster → taslak dağıtım. • Stage-1/2: OSRM + solver ile rota önerisi. • Stage-3: cluster bazlı ayrı market teklifi üretimi.
          </div>
        </div>
        <button type="button" onClick={load} disabled={busy} title={`${who} listesini yenile`}>
          {busy ? "..." : "Yenile"}
        </button>
      </div>

      {err ? <div className="card err">{err}</div> : null}

            <div className="card" style={{ marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>İş Akışı</h3>
        <div className="muted">
          <b>Plan Builder</b>: sade akış <b>Rota önerisi oluştur</b> → <b>Ön izle</b> → <b>Ayrı market teklifi oluştur</b>. Nihai araç/sürücü/kapasite kararı Room tarafında netleşir.
          <br />
          <b>Manuel Talep</b>: tekil talep (istisna / düzeltme).
          <br />
          <b>Shift Tools</b>: shift sonrası personel / durak / konum düzeltme (Adresten Bul).
        </div>
      </div>
<div className="grid" style={{ marginTop: 10 }}>
        <div className="col">
          <div style={{ fontWeight: 800 }}>{who} Özeti</div>
          <div className="muted">
            Toplam: <b>{stats.total}</b> • OK: <b>{stats.ok}</b> • NEEDS_REVIEW: <b>{stats.needs}</b> • FAILED: <b>{stats.failed}</b> • Konum eksik: <b>{stats.missingLoc}</b>
          </div>
          {stats.needs || stats.failed || stats.missingLoc ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Not: Stage-0 için varsayılan filtre <b>geoStatus=OK</b> ve <b>lat/lng var</b>. Geo Review bitmeden plan doğruluğu düşer.              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={openShiftToolsGeocode}>
                  Konumları düzelt (Shift Tools → Adresten Bul)
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="col">
          <div style={{ fontWeight: 800 }}>Parametreler</div>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={onlyOk} onChange={(e) => setOnlyOk(e.target.checked)} />
            Sadece geoStatus=OK
          </label>
          <div className="muted" style={{ marginTop: 6 }}>
            Taslak plan kapasiteye göre bölünmez; sistem konum kümelerine göre taslak grup çıkarır. Nihai araç kapasitesi <b>Room</b> tarafında netleşir.
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="secondary" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Gelişmiş ayarları gizle" : "Gelişmiş ayarları göster"}
            </button>
          </div>

          {showAdvanced ? (
            <div className="grid" style={{ gap: 10, marginTop: 10 }}>
              <div className="col">
                <label className="muted">Konuma göre gruplama hassasiyeti</label>
                <select value={precision} onChange={(e) => setPrecision(e.target.value)}>
                  <option value="5">5 (daha geniş)</option>
                  <option value="6">6 (öneri)</option>
                  <option value="7">7 (daha dar)</option>
                  <option value="8">8 (çok dar)</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <hr />

      {!hideDraftTransferUI ? (
        <div className="grid">
        <div className="col">
          <div style={{ fontWeight: 800 }}>Talep taslağı zamanı</div>
          <div className="grid" style={{ gap: 10 }}>
            <div className="col">
              <label className="muted">Tarih</label>
              <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />
            </div>
            <div className="col">
              <label className="muted">Şablon item</label>
              <select value={tplKey} onChange={(e) => setTplKey(e.target.value)}>
                <option value="">— seç —</option>
                {(templateOptions || []).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label} ({o.item.startHHMM}–{o.item.endHHMM})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Önerilen teklif zamanı: Start=<b>{range.startAtLocal || "-"}</b> • End=<b>{range.endAtLocal || "-"}</b>
          </div>
        </div>

        <div className="col">
          <div style={{ fontWeight: 800 }}>Öneri</div>
          <div className="muted">
            Eligible: <b>{plan.total}</b> kişi • Konum kümesi bazlı önerilen market shift: <b>{plan.recommended}</b>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Üretilen taslak araç sayısı: <b>{plan.vehicles.length}</b> • Geohash grup sayısı: <b>{plan.groups.length}</b>
          </div>
        </div>
      </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Taslak gruplar ve rota önerisi</div>
        <div className="muted" style={{ marginBottom: 8 }}>
          Bu alan taslak plan ve teklif hazırlığı içindir. <b>Rota önerisi oluştur</b> matrix alma ve çözüm adımını tek akışta yapar. <b>Ön izle</b> stop kümeleri için OSRM+Solver iyileştirmesini uygulayıp modal açar.
        </div>
        <div className="grid" style={{ gap: 10, alignItems: "end", marginBottom: 10 }}>
          <div className="col">
            <label className="muted">Stop üretim maxWalkM (m)</label>
            <input value={maxWalkM} onChange={(e) => setMaxWalkM(e.target.value)} placeholder="250" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <button type="button" className="btn sm" onClick={() => setMaxWalkM(String(companyDefaultMaxWalkM))}>
                {me?.companyKind === "SCHOOL" ? "School 50" : "Company 250"}
              </button>
              {me?.companyKind === "SCHOOL" ? null : (
                <button type="button" className="btn sm" onClick={() => setMaxWalkM("50")}>School 50</button>
              )}
            </div>
          </div>
          <div className="col">
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input type="checkbox" checked={autoReorderStops} onChange={(e) => setAutoReorderStops(e.target.checked)} />
              Oluşan stop sırasını OSRM+Solver ile iyileştir
            </label>
            <div className="muted">
              Ayrı market teklifi oluşturulduğunda, seçiliyse stop üretimi sonrası OSRM+Solver ile sıralama iyileştirilir.
            </div>
          </div>
        </div>
        {!plan.total ? (
          <div className="muted">Uygun (lat/lng) personel bulunamadı.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Kişi</th>
                <th>Geohash grup</th>
                <th>Merkez</th>
                <th>Örnek</th>
                <th>Rota önerisi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plan.vehicles.map((v, idx) => {
                const c = v.centroid;
                const sample = (v.people || []).slice(0, 6).map((p) => p.fullName).filter(Boolean);
                const mx = mxRes?.[idx];
                const mxIsBusy = !!mxBusy?.[idx];
                const sv = solveRes?.[idx];
                const svIsBusy = !!solveBusy?.[idx];
                const pvIsBusy = !!previewBusy?.[idx];
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <b>{v.people.length}</b>
                    </td>
                    <td className="muted">{v.groupKeys?.size || 0}</td>
                    <td className="muted">{c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : "-"}</td>
                    <td className="muted" title={(v.people || []).map((p) => p.fullName).join("\n")}>
                      {sample.join(", ")}
                      {(v.people?.length || 0) > sample.length ? " …" : ""}
                    </td>
                    <td className="muted">
                      {mxIsBusy ? (
                        "..."
                      ) : mx?.ok ? (
                        <span title="Ortalama çiftler arası süre/mesafe (yaklaşık)">
                          ~{mx.avgMin} dk{mx.avgKm != null ? ` • ~${mx.avgKm} km` : ""}
                        </span>
                      ) : mx ? (
                        <span title={mx.detail || ""}>ERR</span>
                      ) : (
                        "-"
                      )}
                      <div style={{ marginTop: 6 }}>
                        {svIsBusy ? (
                          <span>çözülüyor…</span>
                        ) : sv?.ok ? (
                          <span title={sv.solver === "ortools" ? "OR-Tools" : "Fallback (heuristic)"}>
                            Rota: ~{sv.totalMin ?? "?"} dk{sv.totalKm != null ? ` • ~${sv.totalKm} km` : ""} • {sv.solver}
                          </span>
                        ) : sv ? (
                          <span>VRP ERR</span>
                        ) : null}
                        {sv?.ok && (sv.orderNames?.length || 0) ? (
                          <div className="muted" style={{ marginTop: 4 }} title={(sv.orderNames || []).join("\n")}>
                            {(sv.orderNames || []).slice(0, 6).join(" → ")}
                            {(sv.orderNames?.length || 0) > 6 ? " …" : ""}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <button type="button" onClick={() => solveRouteForVehicle(v, idx)} disabled={mxIsBusy || svIsBusy || (v.people?.length || 0) < 2}>
                          {mxIsBusy || svIsBusy ? "Oluşturuluyor…" : "Rota önerisi oluştur"}
                        </button>

                      </div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Matrix alma ve çözüm adımı otomatik yapılır.</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => { void openVehiclePreview(v, idx); }} disabled={pvIsBusy}>
                          {pvIsBusy ? "Hazırlanıyor…" : "Ön izle"}
                        </button>
                        <button
                          type="button"
                          disabled={!range.startAtLocal || !range.endAtLocal || !!rowOfferBusy?.[idx]}
                          onClick={() => createMarketOfferForVehicle(v, idx)}
                        >
                          {rowOfferBusy?.[idx] ? "Oluşturuluyor…" : "Ayrı market teklifi oluştur"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RoutePreviewModal
        open={routePreview.open}
        onClose={() =>
          setRoutePreview({
            open: false,
            title: "",
            stops: [],
            people: [],
            previewSummary: null,
            previewPathPoints: null,
            previewSource: null,
            previewShift: null,
          })
        }
        title={routePreview.title}
        stops={routePreview.stops}
        people={routePreview.people}
        previewSummary={routePreview.previewSummary}
        previewPathPoints={routePreview.previewPathPoints}
        previewSource={routePreview.previewSource}
        previewShift={routePreview.previewShift}
      />

          {/* --- M33.6b BULK OFFER MODAL UI --- */}
      {bulkOffer.open ? (
        <div className="modal-backdrop">
          <div className="modal card" style={{ maxWidth: 900 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>Toplu Teklif Gönder</h3>
                <div className="muted">
                  Oluşturulan shift’lere toplu teklif gönder: <b>#{bulkOffer.shiftIds.join(", #")}</b>
                </div>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setBulkOffer((p) => ({ ...p, open: false }))}
                disabled={bulkOffer.busy}
              >
                Kapat
              </button>
            </div>

            <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <div className="col" style={{ minWidth: 260 }}>
                <label className="muted">Room ara</label>
                <input
                  value={bulkOffer.q}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, q: e.target.value }))}
                  placeholder="name contains"
                  disabled={bulkOffer.busy}
                />
                <div className="muted" style={{ marginTop: 8 }}>
                  {pbRoomsBusy ? "Room listesi yükleniyor..." : ("Toplam room: " + ((pbRooms?.length ?? 0)))}
                </div>
              </div>

              <div className="col" style={{ minWidth: 160 }}>
                <label className="muted">Tutar (opsiyonel)</label>
                <input
                  value={bulkOffer.amountCompany}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, amountCompany: (() => { const n = Number(e.target.value ); return Number.isFinite(n) && n > 0 ? n : undefined; })()}))}
                  placeholder="örn. 2500"
                  disabled={bulkOffer.busy}
                />
              </div>

              <div className="col" style={{ minWidth: 260 }}>
                <label className="muted">Not (opsiyonel)</label>
                <input
                  value={bulkOffer.noteCompany}
                  onChange={(e) => setBulkOffer((p) => ({ ...p, noteCompany: (() => { const v = (e.target.value ); return (v === null || v === undefined) ? "" : String(v); })()}))}
                  placeholder="örn. sabah giriş"
                  disabled={bulkOffer.busy}
                />
              </div>
            </div>

            <div className="card" style={{ marginTop: 12, maxHeight: 320, overflow: "auto" }}>
              {(pbRooms || [])
                .filter((r) => {
                  const q = String(bulkOffer.q || "").trim().toLowerCase();
                  if (!q) return true;
                  return String(r?.name || "").toLowerCase().includes(q);
                })
                .map((r) => (
                  <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px" }}>
                    <input
                      type="checkbox"
                      checked={!!bulkOffer.roomsSel?.[r.id]}
                      onChange={(e) =>
                        setBulkOffer((p) => ({ ...p, roomsSel: { ...(p.roomsSel || {}), [r.id]: e.target.checked } }))
                      }
                      disabled={bulkOffer.busy}
                    />
                    <span>
                      {r?.name} <span className="muted">#{r.id}</span>
                    </span>
                    {r?.hasHub ? <span className="pill ok">HUB</span> : null}
                  </label>
                ))}
              {!pbRooms?.length ? <div className="muted">Room listesi boş.</div> : null}
            </div>

            {bulkOffer.err ? <div className="err" style={{ marginTop: 10 }}>{bulkOffer.err}</div> : null}
            {bulkOffer.done ? (
              <div className="ok" style={{ marginTop: 10 }}>
                Gönderildi ✅ (shift sayısı: {bulkOffer.sent})
              </div>
            ) : null}

            <div className="row" style={{ justifyContent: "end", marginTop: 12, gap: 8 }}>
              <button type="button" className="secondary"
                onClick={() => setBulkOffer((p) => ({ ...p, roomsSel: {} }))}
                disabled={bulkOffer.busy}
              >
                Temizle
              </button>
              <button type="button" onClick={sendBulkOffers} disabled={bulkOffer.busy}>
                {bulkOffer.busy ? "Gönderiliyor..." : "Toplu Teklifleri Gönder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* --- /M33.6b --- */}
</div>
  );
}



