import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useSession } from "../../state/session";
import { personLabel } from "../../utils/labels";
import { buildGoogleNavUrl } from "../../utils/navigation";
import {
  WEEKDAYS,
  weekdayBitFromYmdUTC as _weekdayBitFromYmdUTC,
  countMatchingDaysInRange,
  nextYmdMatchingMask,
  selectedFromMask,
  maskFromSelected,
  weekMaskToText as _weekMaskToText,
  addDaysISO,
} from "../../utils/agreementUi";
import { fetchProviderScoreMap } from "../../utils/providerScores";
import { getApiErrorMessage } from "../../utils/apiContract";
import {
  PACKS,
  buildGuidedPlanDestinationAudit,
  buildGuidedPlanDraftCompletion,
  buildGuidedPlanFilledDestinations,
  buildGuidedPlanCurrentStepItems,
  clearPlanTermsForShiftIds as _clearPlanTermsForShiftIds,
  buildGuidedPlanModalResetState,
  buildGuidedPlanModalRouteRefreshPrefill,
  coordNum,
  createAdditionalCustomSlot,
  createDefaultCustomSlots,
  createDurationOptions,
  createFallbackCustomSlots as _createFallbackCustomSlots,
  createInitialEndDate,
  directionLabel,
  emptyDestination,
  fmtCoord,
  fmtTR as _fmtTR,
  hasCoord,
  packDescForMode as _packDescForMode,
  packTitleForMode as _packTitleForMode,
  parseTryInput as _parseTryInput,
  patternLabel,
  readGuidedTempShiftIds,
  stepTitle,
  toHHMM,
  todayYmd,
  writeGuidedTempShiftIds as _writeGuidedTempShiftIds,
  ymdMinToIso as _ymdMinToIso,
} from "./guidedPlanModalUtils";
import GuidedPeopleStopsStep from "./guidedPlanModalPeopleStep";
import { GuidedHubStep, GuidedPlanSetupStep, GuidedSolveOffersStep } from "./guidedPlanModalSections";
import { MapPointPickerModal, Modal } from "./guidedPlanModalShell";
import {
  cleanupGuidedDraftShifts,
  createGuidedDraftShiftsAction,
  geocodeGuidedLocation,
  hydrateGuidedDraftPeopleFromSourceShift,
  loadGuidedCompanyHub,
  loadGuidedResumeDraftShifts,
  osrmReorderGuidedCore,
  refreshGuidedDraftShiftsAction,
  saveGuidedCompanyHub,
  sendGuidedBulkOffersAction,
  sendGuidedRouteRefreshRequestAction,
} from "./guidedPlanModalActions";
export default function GuidedPlanModal({
  open,
  onClose,
  resumeStep = null,
  resumeNonce = 0,
  rooms = [],
  roomsSupported = true,
  onReloadRooms = null,
  onAfterCreated = null,
  launchContext = null,
  launchNonce = 0,
}) {
  const { token, me } = useSession();
  const who = personLabel(me);
  const organization = me?.companyKind === "ORGANIZATION";
  const appliedLaunchNonceRef = useRef(0);
  const routeRefreshMode = String(launchContext?.mode || "").toUpperCase() === "ROUTE_REFRESH";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Step-0: hub
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");
  const [addr, setAddr] = useState("");
  const [hubLoaded, setHubLoaded] = useState(false);

  // Step-1: plan
  const [packKey, setPackKey] = useState("WK_MORNING_EVENING");
  const pack = useMemo(() => PACKS.find((p) => p.key === packKey) || PACKS[0], [packKey]);
  const [startDate, setStartDate] = useState(todayYmd());
  const [durationKey, setDurationKey] = useState("1d");
  const durationOptions = useMemo(() => createDurationOptions(), []);
  const durationDays = useMemo(() => {
    const p = durationOptions.find((x) => x.key === durationKey) || durationOptions[0] || { days: 1 };
    return Number(p.days || 1);
  }, [durationKey, durationOptions]);
  const [endDate, setEndDate] = useState(createInitialEndDate());
  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const [customSlots, setCustomSlots] = useState(() => createDefaultCustomSlots());
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);
  const eligibleDaysCount = useMemo(() => countMatchingDaysInRange(startDate, endDate, weekMask), [startDate, endDate, weekMask]);
  const currentStepItems = useMemo(() => buildGuidedPlanCurrentStepItems({ pack, customSlots }), [pack, customSlots]);
  const totalShiftCount = useMemo(() => eligibleDaysCount * currentStepItems.length, [eligibleDaysCount, currentStepItems]);
  const guidedLimitMessage = useMemo(() => {
    if (eligibleDaysCount > 7) return "Guided en fazla 7 g?n olabilir. Daha uzun planlar i?in s?zle?me kullan?n.";
    if (totalShiftCount > 21) return "Guided en fazla 21 vardiya olu?turabilir. Daha yo?un planlar i?in s?zle?me kullan?n.";
    return "";
  }, [eligibleDaysCount, totalShiftCount]);
  const nextValidStart = useMemo(() => nextYmdMatchingMask(startDate, weekMask, 31), [startDate, weekMask]);
  const [draftNote, setDraftNote] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [orgEstimatedPax, setOrgEstimatedPax] = useState("");
  const [orgGatheringName, setOrgGatheringName] = useState("");
  const [orgReturnType, setOrgReturnType] = useState("RETURN_TO_START");
  const [orgDestinations, setOrgDestinations] = useState([emptyDestination()]);
  const [mapPickIdx, setMapPickIdx] = useState(null);
  const [mapPickPoint, setMapPickPoint] = useState(null);

  const [draftShiftIds, setDraftShiftIds] = useState([]);
  const draftShiftIdsKey = draftShiftIds.join("|");
  const [draftShifts, setDraftShifts] = useState([]);
  const [osrmBatch, setOsrmBatch] = useState({ running: false, done: 0, total: 0 });
  const [osrmResById, setOsrmResById] = useState({});

  // Step-3: offers
  const [roomQ, setRoomQ] = useState("");
  const [_onlyHubRooms, setOnlyHubRooms] = useState(false);
  const [selRoomIds, setSelRoomIds] = useState({});
  const [roomScores, setRoomScores] = useState({});
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [sentOk, setSentOk] = useState(false);
  const [offerOutcome, setOfferOutcome] = useState("idle");
  const [companyGeoGate, setCompanyGeoGate] = useState({ blocking: false, ready: true, geoStats: { ok: 0, review: 0, failed: 0, total: 0 }, stopSummary: null });

  useEffect(() => {
    if (!open) return;
    if (resumeStep == null) return;
    const next = Number(resumeStep);
    if (!Number.isFinite(next)) return;
    setStep(Math.max(0, Math.min(3, next)));
  }, [open, resumeStep, resumeNonce]);

  const roomsFiltered = useMemo(() => {
    const list = Array.isArray(rooms) ? rooms : [];
    const q = String(roomQ || "").trim().toLowerCase();
    return list
      .filter((r) => {
        if (!q) return true;
        const hay = `${r?.id ?? ""} ${r?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 220);
  }, [rooms, roomQ]);

  const roomsById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !Array.isArray(rooms) || !rooms.length) {
        if (alive) setRoomScores({});
        return;
      }
      try {
        const nextScores = await fetchProviderScoreMap((rooms || []).map((r) => r?.id), token);
        if (!alive) return;
        setRoomScores(nextScores);
      } catch {
        if (alive) setRoomScores({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, rooms]);

  const selectedRoomIds = useMemo(
    () =>
      Object.keys(selRoomIds)
        .filter((k) => selRoomIds[k])
        .map((k) => Number(k))
        .filter(Number.isFinite),
    [selRoomIds]
  );

  const selectedRoomCount = selectedRoomIds.length;

  const orgFilledDestinations = useMemo(
    () => buildGuidedPlanFilledDestinations(orgDestinations),
    [orgDestinations]
  );

  const orgDestinationAudit = useMemo(() => {
    return buildGuidedPlanDestinationAudit(orgDestinations);
  }, [orgDestinations]);

  const orgDraftCompletion = useMemo(() => {
    return buildGuidedPlanDraftCompletion({ organization, draftShifts, draftShiftIds, orgDestinationAudit });
  }, [organization, draftShifts, draftShiftIds, orgDestinationAudit]);

  const offerOsrmGate = useMemo(() => {
    const items = (draftShifts || []).map((s) => {
      const sid = Number(s?.id || 0);
      const stops = Array.isArray(s?.stops) ? s.stops : [];
      const validStops = stops.filter((st) => hasCoord(coordNum(st?.lat), coordNum(st?.lng)));
      const stopless = validStops.length < 2;
      const osrmState = osrmResById?.[sid];
      const ready = osrmState?.ok === true && !stopless;
      const failed = osrmState?.ok === false;
      const pending = !ready && !failed && !stopless;
      return { sid, stopless, ready, failed, pending, error: osrmState?.error || "" };
    });

    const total = items.length;
    const readyCount = items.filter((x) => x.ready).length;
    const pendingCount = items.filter((x) => x.pending).length;
    const errorCount = items.filter((x) => x.failed).length;
    const stoplessCount = items.filter((x) => x.stopless).length;
    const firstError = items.find((x) => x.failed)?.error || "";
    const reasons = [];
    if (!total) reasons.push("?nce taslak shift olu?tur.");
    if (!organization && companyGeoGate.blocking) reasons.push("?nce ki?i koordinatlar?n? tamamla.");
    if (stoplessCount > 0) reasons.push(`Duraks?z taslak shift: ${stoplessCount}`);
    if (pendingCount > 0) reasons.push(`OSRM do?rulamas? bekleyen taslak: ${pendingCount}`);
    if (errorCount > 0) reasons.push(firstError || `OSRM do?rulama hatas?: ${errorCount}`);
    return {
      total,
      readyCount,
      pendingCount,
      errorCount,
      stoplessCount,
      blocking: reasons.length > 0,
      reasons,
    };
  }, [draftShifts, osrmResById, organization, companyGeoGate]);

  function setDestinationField(idx, field, value) {
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]: value,
              ...((field === "title" || field === "address") ? { status: "idle", foundText: "", lat: "", lng: "" } : {}),
            }
          : item
      )
    );
  }

  function setDestinationCoordField(idx, field, value) {
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, [field]: value };
        const lat = coordNum(field === "lat" ? value : next.lat);
        const lng = coordNum(field === "lng" ? value : next.lng);
        if (hasCoord(lat, lng)) {
          return {
            ...next,
            lat: fmtCoord(lat),
            lng: fmtCoord(lng),
            status: "manual",
            foundText: "Koordinat haz?r",
          };
        }
        if (String(item?.status || "") === "manual") {
          return { ...next, status: "idle", foundText: "" };
        }
        return next;
      })
    );
  }

  function openDestinationMapPicker(idx) {
    const item = (orgDestinations || [])[idx] || {};
    const lat = coordNum(item?.lat);
    const lng = coordNum(item?.lng);
    const hubLatNum = coordNum(hubLat);
    const hubLngNum = coordNum(hubLng);
    const base = hasCoord(lat, lng)
      ? [lat, lng]
      : hasCoord(hubLatNum, hubLngNum)
      ? [hubLatNum, hubLngNum]
      : [41.0082, 28.9784];
    setMapPickIdx(idx);
    setMapPickPoint(base);
  }

  function applyDestinationMapPoint() {
    if (mapPickIdx == null || !Array.isArray(mapPickPoint)) return;
    const [lat, lng] = mapPickPoint;
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) =>
        i === mapPickIdx
          ? {
              ...item,
              lat: fmtCoord(lat),
              lng: fmtCoord(lng),
              status: "manual",
              foundText: "Haritadan se?ildi",
            }
          : item
      )
    );
    setMapPickIdx(null);
    setMapPickPoint(null);
  }

  function openDestinationNavigation(dest) {
    const lat = coordNum(dest?.lat);
    const lng = coordNum(dest?.lng);
    if (!hasCoord(lat, lng)) {
      setErr("Navigasyon i?in yer koordinat? gerekli.");
      return;
    }
    const hLat = coordNum(hubLat);
    const hLng = coordNum(hubLng);
    const url = buildGoogleNavUrl({
      origin: hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null,
      destination: { lat, lng },
    });
    if (!url) {
      setErr("Navigasyon linki olu?turulamad?.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openShiftNavigation(shift) {
    const stops = (Array.isArray(shift?.stops) ? shift.stops : [])
      .map((s) => ({ lat: coordNum(s?.lat), lng: coordNum(s?.lng) }))
      .filter((x) => hasCoord(x.lat, x.lng));
    if (!stops.length) {
      setErr("Navigasyon i?in en az 1 durak gerekli.");
      return;
    }
    const hLat = coordNum(shift?.hubLat);
    const hLng = coordNum(shift?.hubLng);
    let origin = hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null;
    let destination = null;
    let waypoints = [];
    const loop = String(shift?.pattern || "").toUpperCase() === "LOOP";
    if (loop && origin) {
      destination = origin;
      waypoints = stops;
    } else if (origin) {
      destination = stops[stops.length - 1] || null;
      waypoints = stops.slice(0, -1);
    } else {
      if (stops.length < 2) {
        setErr("Navigasyon i?in hub veya en az 2 durak gerekli.");
        return;
      }
      origin = stops[0];
      destination = stops[stops.length - 1];
      waypoints = stops.slice(1, -1);
    }
    const url = buildGoogleNavUrl({ origin, destination, waypoints });
    if (!url) {
      setErr("Navigasyon linki olu?turulamad?.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function addDestination() {
    setOrgDestinations((prev) => [...(prev || []), emptyDestination()]);
  }

  function removeDestination(idx) {
    setOrgDestinations((prev) => {
      const next = (prev || []).filter((_, i) => i !== idx);
      return next.length ? next : [emptyDestination()];
    });
  }

  function moveDestination(idx, dir) {
    setOrgDestinations((prev) => {
      const next = [...(prev || [])];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return next;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return next;
    });
  }

  async function geocodeDestination(idx) {
    setErr("");
    setInfo("");
    if (!token) return;
    const item = (orgDestinations || [])[idx];
    const q = String(item?.address || item?.title || "").trim();
    if (q.length < 3) {
      setErr("Yer i?in en az 3 karakterlik ad veya adres gir.");
      return;
    }
    setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "loading", foundText: "" } : x)));
    try {
      const r = await geocodeGuidedLocation({ token, q });
      if (r?.ok) {
        setOrgDestinations((prev) =>
          (prev || []).map((x, i) =>
            i === idx
              ? {
                  ...x,
                  lat: String(r.lat),
                  lng: String(r.lng),
                  status: "ok",
                  foundText: String(r.displayName || q),
                  title: String(x.title || "").trim() || String(r.displayName || q).split(",")[0],
                }
              : x
          )
        );
      } else {
        setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: "Bulunamad?" } : x)));
      }
    } catch (e) {
      setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: getApiErrorMessage(e, "Bulunamad?") } : x)));
    }
  }

  function orgNoteSummary() {
    const pax = String(orgEstimatedPax || "").trim();
    const gathering = String(orgGatheringName || "").trim();
    const places = orgFilledDestinations.map((d) => String(d.title || d.address || "").trim()).filter(Boolean);
    const returnText = orgReturnType === "RETURN_TO_START" ? "Ba?lang?? noktas?na d?n" : "Son noktada bitir";
    const parts = [];
    if (gathering) parts.push(`Toplanma: ${gathering}`);
    if (pax) parts.push(`Tahmini ki?i: ${pax}`);
    if (places.length) parts.push(`Yerler: ${places.join(" ? ")}`);
    parts.push(`D?n??: ${returnText}`);
    return `[Gezi plan?] ${parts.join(" | ")}`;
  }

  async function cleanupDraftShifts(idsInput = draftShiftIds, opts = {}) {
    const ids = Array.from(new Set((Array.isArray(idsInput) ? idsInput : []).map((x) => Number(x)).filter(Number.isFinite)));
    await cleanupGuidedDraftShifts({ token, ids });
    if (!opts.keepState) {
      setDraftShiftIds([]);
      setDraftShifts([]);
      setOsrmResById({});
    }
  }

  function resetAll(opts = {}) {
    if (!opts.skipCleanup && !sentOk && draftShiftIds.length) {
      void cleanupDraftShifts(draftShiftIds, { keepState: true });
    }
    const next = buildGuidedPlanModalResetState();
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
  }

  // Load hub on open
  useEffect(() => {
    if (!open) return;
    if (!token) return;
    setErr("");
    setInfo("");
    setSentOk(false);
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");

    let alive = true;
    (async () => {
      const lingeringIds = readGuidedTempShiftIds();
      const resumeMode = resumeStep != null && Number(resumeNonce || 0) > 0;
      if (lingeringIds.length && !resumeMode) {
        await cleanupGuidedDraftShifts({ token, ids: lingeringIds });
      }
      if (resumeMode && lingeringIds.length) {
        if (!alive) return;
        setDraftShiftIds(lingeringIds);
        try {
          const items = await loadGuidedResumeDraftShifts({ token, ids: lingeringIds });
          if (!alive) return;
          setDraftShifts(items);
        } catch {
          if (!alive) return;
          setDraftShifts([]);
        }
      }
      try {
        const h = await loadGuidedCompanyHub({ token });
        if (!alive) return;
        setHubLat(h?.hubLat == null ? "" : String(h.hubLat));
        setHubLng(h?.hubLng == null ? "" : String(h.hubLng));
        setHubLoaded(true);
      } catch {
        if (!alive) return;
        setHubLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, token, resumeStep, resumeNonce]);


  useEffect(() => {
    if (!open || !hubLoaded) return;
    const nonce = Number(launchNonce || 0);
    if (!nonce || appliedLaunchNonceRef.current === nonce) return;
    if (!routeRefreshMode) return;

    const prefill = buildGuidedPlanModalRouteRefreshPrefill({
      launchContext,
      currentHubLat: hubLat,
      currentHubLng: hubLng,
    });

    setPackKey(prefill.packKey);
    setCustomSlots(prefill.customSlots);
    setStartDate(prefill.startDate);
    setDurationKey(prefill.durationKey);
    setDaysSel(prefill.daysSel);
    if (prefill.hubLat != null && prefill.hubLng != null) {
      setHubLat(prefill.hubLat);
      setHubLng(prefill.hubLng);
    }
    if (prefill.selRoomIds) {
      setSelRoomIds(prefill.selRoomIds);
    }
    if (prefill.roomQ) {
      setRoomQ(prefill.roomQ);
    }
    setStep(prefill.step);
    setInfo(prefill.info);
    appliedLaunchNonceRef.current = nonce;
  }, [open, hubLoaded, launchNonce, launchContext, routeRefreshMode, hubLat, hubLng]);

  useEffect(() => {
    if (!open) return;
    if (step !== 3) return;
    setSelRoomIds({});
    const initialRouteRefreshAmount = routeRefreshMode
      ? (launchContext?.currentCompanyOfferAmount != null ? String(launchContext.currentCompanyOfferAmount) : "")
      : "";
    setOfferAmount(initialRouteRefreshAmount);
    setOfferNote("");
    setSentOk(false);
  }, [open, step, draftShiftIdsKey, routeRefreshMode, launchContext]);

  useEffect(() => {
    const keys = new Set((durationOptions || []).map((x) => x.key));
    if (!keys.has(durationKey)) setDurationKey((durationOptions[0] || {}).key || "1d");
  }, [organization, durationKey, durationOptions]);

  // Sync endDate when start/duration changes
  useEffect(() => {
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
  }, [startDate, durationDays]);

  function stepItems() {
    return currentStepItems;
  }

  async function saveHub() {
    setErr("");
    setInfo("");
    if (!token) return;
    const lat = hubLat === "" ? null : Number(hubLat);
    const lng = hubLng === "" ? null : Number(hubLng);
    if ((lat == null) !== (lng == null)) {
      setErr("Hub lat/lng birlikte olmal?.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    setBusy(true);
    try {
      await saveGuidedCompanyHub({ token, hubLat: lat, hubLng: lng });
      setInfo(organization ? "? Toplanma noktas? kaydedildi." : "? ?irket konumu kaydedildi.");
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
      setErr("Taray?c? konum izni desteklemiyor.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setErr("Konum okunamad?.");
          return;
        }
        setHubLat(String(lat));
        setHubLng(String(lng));
        setInfo(organization ? "? Toplanma noktas? konumu al?nd?. Kaydetmek i?in '?leri'ye bas." : "? Konum al?nd?. Kaydetmek i?in '?leri'ye bas.");
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
      setErr("Adres en az 3 karakter olmal?.");
      return;
    }
    setBusy(true);
    try {
      const r = await geocodeGuidedLocation({ token, q });
      if (r?.ok) {
        setHubLat(String(r.lat));
        setHubLng(String(r.lng));
        setInfo(`? Bulundu: ${r.displayName || ""}`);
      } else {
        setErr("Adres bulunamad?.");
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
      setErr("Hub lat/lng birlikte olmal?.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    const items = stepItems();
    if (!items.length) {
      setErr("Plan paketi ge?ersiz.");
      return;
    }
    const totalDraftCount = eligibleDaysCount * items.length;
    if (eligibleDaysCount > 7) {
      setErr("Guided en fazla 7 g?n olabilir. Daha uzun planlar i?in s?zle?me kullan?n.");
      return;
    }
    if (totalDraftCount > 21) {
      setErr("Guided en fazla 21 vardiya olu?turabilir. Daha yo?un planlar i?in s?zle?me kullan?n.");
      return;
    }
    if (organization) {
      if (!String(orgEstimatedPax || "").trim()) {
        setErr("Tahmini ki?i say?s?n? gir.");
        return;
      }
      if (!orgFilledDestinations.length) {
        setErr("En az 1 gidilecek yer ekle.");
        return;
      }
      if (!orgDestinationAudit.ok) {
        setErr(`Koordinat? eksik yerler var: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}. Adresten bul, manuel lat/lng gir veya haritadan se?.`);
        return;
      }
    }

    setBusy(true);
    try {
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
        orgNoteSummaryText: organization ? orgNoteSummary() : "",
        orgReturnType,
        orgEstimatedPax,
        orgFilledDestinations,
        orgGatheringName,
        hubLat,
        hubLng,
      });
      if (!created.createdIds.length) {
        setErr("Se?ili tarih aral???nda (g?n filtresine g?re) vardiya ?retilecek g?n yok. Ba?lang?? / g?nler / s?reyi de?i?tir.");
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
            hydrationInfo = ` ? kaynak vardiyadan ${Number(hydrated.personCount || 0)} personel ta??nd?`;
            nextDraftShifts = await refreshGuidedDraftShiftsAction({ token, draftShiftIds: created.createdIds });
          }
        }
      }

      setDraftShiftIds(created.createdIds);
      setDraftShifts(nextDraftShifts);
      setInfo(`? Taslak shift olu?turuldu: ${created.createdIds.map((x) => "#" + x).join(", ")}${hydrationInfo}`);
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
      setErr(res.error || "S?ralama ba?ar?s?z.");
      return;
    }
    setOsrmResById((prev) => ({ ...prev, [sid]: { ok: true } }));
    setInfo(`? Rota s?raland? (solver: ${res.solver || "-" }).`);
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
    setErr("Taslak shift yok.");
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
    setInfo(`? Hepsi i?lendi. OK: ${okCount}, Hata: ${errCount}.`);
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
      setErr("?nce taslak vardiya olu?turmal?s?n.");
      return;
    }
    if (organization && !orgDraftCompletion.ready) {
      setErr(`Markete g?ndermek i?in plan tamamlanmal?: ${orgDraftCompletion.reasons.join(" ? ")}`);
      return;
    }
    if (!organization && offerOsrmGate.blocking) {
      setErr(offerOsrmGate.reasons.join(" ? ") || "OSRM rota do?rulamas? tamamlanmadan teklif g?nderilemez.");
      return;
    }

    setBusy(true);
    try {
      if (routeRefreshMode) {
        const agreementId = Number(launchContext?.agreementId || 0);
        const roomId = Number(launchContext?.roomId || 0);
        const sourceShiftId = Number(launchContext?.sourceShiftId || 0);
        const created = await sendGuidedRouteRefreshRequestAction({
          token, agreementId, roomId, sourceShiftId, draftShiftIds, offerAmount, offerNote,
        });
        setSentOk(true);
        setOfferOutcome("route_refresh_pending");
        setInfo(`? Rota g?ncelleme teklifi g?nderildi (${launchContext?.roomName || `Oda #${roomId || "?"}`}). Talep #${Number(created?.item?.id || created?.id || 0) || "?"} olarak kaydedildi.`);
      } else {
        const roomIds = selectedRoomIds;
        if (!roomIds.length) {
          setErr("En az 1 room se?.");
          return;
        }
        const result = await sendGuidedBulkOffersAction({ token, draftShiftIds, selectedRoomIds: roomIds, offerAmount, offerNote });
        const skippedCount = Array.isArray(result?.skippedRoomIds) ? result.skippedRoomIds.length : 0;
        setSentOk(true);
        if (result?.allBlocked) {
          setOfferOutcome("agreement_covered");
          setInfo("?? Se?ilen room'lar bu zaman penceresinde zaten aktif s?zle?me kapsam?nda. Yeni teklif g?nderilmedi; taslak vardiyalar korundu.");
        } else {
          setOfferOutcome("sent");
          const sentText = `? G?nderildi (vardiya say?s?: ${Number(result?.sentCount || 0)}).`;
          const skipText = skippedCount > 0 ? ` Not: ${skippedCount} room teklif atland? (aktif s?zle?me ?ak??mas?).` : "";
          setInfo(`${sentText}${skipText}`);
        }
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const planSummary = useMemo(() => {
    const lines = currentStepItems.map((it) => {
      const p = organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern;
      return `${it.label || ""}: ${toHHMM(it.startMin)} ? ${toHHMM(it.endMin)}${organization ? ` ? ${patternLabel(p, organization)}` : ` ? ${directionLabel(it.direction, organization)} ? ${patternLabel(p, organization)}`}`;
    });
    return lines;
  }, [currentStepItems, organization, orgReturnType]);

  return (
    <>
    <Modal
      open={open}
      onClose={() => {
        onClose?.();
        resetAll();
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{routeRefreshMode ? "Rehberli Mod ? Rota G?ncelle" : "Rehberli Mod ? Yeni Plan"}</div>
          <div className="muted" style={{ marginTop: 4 }}>{stepTitle(step, who, organization)}</div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { onClose?.(); resetAll(); }} disabled={busy}>Kapat</button>
        </div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>{err}</div>
      ) : null}
      {info ? (
        <div className="card" style={{ marginTop: 10, border: "1px solid #2a7" }}>{info}</div>
      ) : null}
      {routeRefreshMode ? (
        <div className="card" style={{ marginTop: 10, border: "1px solid rgba(88,166,255,.28)" }}>
          <div style={{ fontWeight: 800 }}>Rota g?ncelleme ba?lam?</div>
          <div className="muted" style={{ marginTop: 6 }}>
            S?zle?me #{Number(launchContext?.agreementId || 0) || "?"} ? Kaynak vardiya #{Number(launchContext?.sourceShiftId || 0) || "?"}
            {launchContext?.roomName ? ` ? Oda ${launchContext.roomName}` : ""}
          </div>
          {launchContext?.sourceSummary ? (
            <div className="muted" style={{ marginTop: 6 }}>{String(launchContext.sourceSummary)}</div>
          ) : null}
          <div className="muted" style={{ marginTop: 6 }}>
            Bu turda mevcut rehberli ak?? ayn? s?zle?me ba?lam?yla a??ld?. Plan? d?zenleyip ki?i/durak taraf?n? yeniden haz?rlayabilirsin.
          </div>
        </div>
      ) : null}

      {/* Step-0: Hub */}
      {step === 0 ? (
        <GuidedHubStep
          organization={organization}
          busy={busy}
          useGeolocation={useGeolocation}
          addr={addr}
          setAddr={setAddr}
          geocodeAddress={geocodeAddress}
          hubLat={hubLat}
          setHubLat={setHubLat}
          hubLng={hubLng}
          setHubLng={setHubLng}
          hubLoaded={hubLoaded}
          saveHub={saveHub}
        />
      ) : null}

      {/* Step-1: Plan */}
      {step === 1 ? (
        <GuidedPlanSetupStep
          organization={organization}
          busy={busy}
          PACKS={PACKS}
          packKey={packKey}
          setPackKey={setPackKey}
          pack={pack}
          customSlots={customSlots}
          setCustomSlots={setCustomSlots}
          createAdditionalCustomSlot={createAdditionalCustomSlot}
          startDate={startDate}
          setStartDate={setStartDate}
          durationOptions={durationOptions}
          durationKey={durationKey}
          setDurationKey={setDurationKey}
          endDate={endDate}
          WEEKDAYS={WEEKDAYS}
          daysSel={daysSel}
          setDaysSel={setDaysSel}
          weekMask={weekMask}
          eligibleDaysCount={eligibleDaysCount}
          totalShiftCount={totalShiftCount}
          guidedLimitMessage={guidedLimitMessage}
          nextValidStart={nextValidStart}
          planSummary={planSummary}
          orgEstimatedPax={orgEstimatedPax}
          setOrgEstimatedPax={setOrgEstimatedPax}
          orgGatheringName={orgGatheringName}
          setOrgGatheringName={setOrgGatheringName}
          orgDestinationAudit={orgDestinationAudit}
          orgDestinations={orgDestinations}
          moveDestination={moveDestination}
          removeDestination={removeDestination}
          setDestinationField={setDestinationField}
          setDestinationCoordField={setDestinationCoordField}
          geocodeDestination={geocodeDestination}
          openDestinationMapPicker={openDestinationMapPicker}
          openDestinationNavigation={openDestinationNavigation}
          addDestination={addDestination}
          orgReturnType={orgReturnType}
          setOrgReturnType={setOrgReturnType}
          setStep={setStep}
          createDraftShifts={createDraftShifts}
        />
      ) : null}

      {/* Step-2: People + stops */}
      {step === 2 ? (
        <GuidedPeopleStopsStep
          organization={organization}
          busy={busy}
          token={token}
          me={me}
          draftShiftIds={draftShiftIds}
          draftShifts={draftShifts}
          roomsById={roomsById}
          orgGatheringName={orgGatheringName}
          orgEstimatedPax={orgEstimatedPax}
          orgReturnType={orgReturnType}
          orgFilledDestinations={orgFilledDestinations}
          companyGeoGate={companyGeoGate}
          setCompanyGeoGate={setCompanyGeoGate}
          setStep={setStep}
          refreshDraftShifts={refreshDraftShifts}
          setErr={setErr}
        />
      ) : null}

      {/* Step-3: Solve + offers */}
      {step === 3 ? (
        <GuidedSolveOffersStep
          organization={organization}
          busy={busy}
          orgDraftCompletion={orgDraftCompletion}
          orgEstimatedPax={orgEstimatedPax}
          companyGeoGate={companyGeoGate}
          offerOsrmGate={offerOsrmGate}
          draftShifts={draftShifts}
          osrmBatch={osrmBatch}
          osrmReorderAll={osrmReorderAll}
          osrmReorder={osrmReorder}
          openShiftNavigation={openShiftNavigation}
          osrmResById={osrmResById}
          onReloadRooms={onReloadRooms}
          roomsSupported={roomsSupported}
          routeRefreshMode={routeRefreshMode}
          routeRefreshLaunch={launchContext}
          sentOk={sentOk}
          offerOutcome={offerOutcome}
          roomQ={roomQ}
          setRoomQ={setRoomQ}
          rooms={rooms}
          selectedRoomCount={selectedRoomCount}
          offerAmount={offerAmount}
          setOfferAmount={setOfferAmount}
          offerNote={offerNote}
          setOfferNote={setOfferNote}
          roomsFiltered={roomsFiltered}
          roomScores={roomScores}
          selRoomIds={selRoomIds}
          setSelRoomIds={setSelRoomIds}
          sendBulkOffers={sendBulkOffers}
          setStep={setStep}
          onAfterCreated={onAfterCreated}
          onClose={onClose}
          resetAll={resetAll}
        />
      ) : null}

    </Modal>

    <MapPointPickerModal
      open={mapPickIdx != null}
      onClose={() => {
        setMapPickIdx(null);
        setMapPickPoint(null);
      }}
      mapPickPoint={mapPickPoint}
      setMapPickPoint={setMapPickPoint}
      fmtCoord={fmtCoord}
      applyDestinationMapPoint={applyDestinationMapPoint}
    />
    </>
  );
}
