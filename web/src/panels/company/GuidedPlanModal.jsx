import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../api";
import { useSession } from "../../state/session";
import ShiftPeopleTab from "./ShiftPeopleTab";
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
  clearPlanTermsForShiftIds as _clearPlanTermsForShiftIds,
  collectGuidedSessionPersonIds,
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
  parseHHMM,
  parseTryInput as _parseTryInput,
  patternLabel,
  readGuidedTempShiftIds,
  stepTitle,
  toHHMM,
  todayYmd,
  updateStoredPeopleKvkkFields,
  writeGuidedTempShiftIds as _writeGuidedTempShiftIds,
  ymdMinToIso as _ymdMinToIso,
} from "./guidedPlanModalUtils";
import { GuidedHubStep, GuidedPlanSetupStep, GuidedSolveOffersStep } from "./guidedPlanModalSections";
import { MapPickEvents, Modal } from "./guidedPlanModalShell";
import {
  cleanupGuidedDraftShifts,
  createGuidedDraftShiftsAction,
  geocodeGuidedLocation,
  loadGuidedCompanyHub,
  loadGuidedResumeDraftShifts,
  osrmReorderGuidedCore,
  refreshGuidedDraftShiftsAction,
  saveGuidedCompanyHub,
  sendGuidedBulkOffersAction,
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
}) {
  const { token, me } = useSession();
  const who = personLabel(me);
  const organization = me?.companyKind === "ORGANIZATION";

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
  const currentStepItems = useMemo(() => {
    if (pack.key !== "CUSTOM") return pack.items;
    const slots = Array.isArray(customSlots) ? customSlots : [];
    if (!slots.length) return [];
    const out = [];
    for (const s of slots) {
      const sMin = parseHHMM(s?.startHHMM);
      const eMin = parseHHMM(s?.endHHMM);
      if (sMin == null || eMin == null) return [];
      out.push({
        label: String(s?.label || "").trim() || "Özel",
        startMin: sMin,
        endMin: eMin,
        direction: s?.direction || "INBOUND",
        pattern: s?.pattern || "ONE_WAY",
      });
    }
    return out;
  }, [pack, customSlots]);
  const totalShiftCount = useMemo(() => eligibleDaysCount * currentStepItems.length, [eligibleDaysCount, currentStepItems]);
  const guidedLimitMessage = useMemo(() => {
    if (eligibleDaysCount > 7) return "Guided en fazla 7 gün olabilir. Daha uzun planlar için sözleşme kullanın.";
    if (totalShiftCount > 21) return "Guided en fazla 21 vardiya oluşturabilir. Daha yoğun planlar için sözleşme kullanın.";
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
    () => (orgDestinations || []).filter((d) => String(d?.title || d?.address || "").trim()),
    [orgDestinations]
  );

  const orgDestinationAudit = useMemo(() => {
    const items = (orgDestinations || [])
      .map((d, idx) => {
        const label = String(d?.title || d?.address || "").trim();
        const lat = coordNum(d?.lat);
        const lng = coordNum(d?.lng);
        return {
          idx,
          label: label || `Yer ${idx + 1}`,
          lat,
          lng,
          hasCoord: hasCoord(lat, lng),
        };
      })
      .filter((x) => Boolean(x.label));
    return {
      total: items.length,
      ready: items.filter((x) => x.hasCoord).length,
      missing: items.filter((x) => !x.hasCoord),
      ok: items.length > 0 && items.every((x) => x.hasCoord),
    };
  }, [orgDestinations]);

  const orgDraftCompletion = useMemo(() => {
    if (!organization) return { ready: true, reasons: [], badShiftIds: [], expectedStops: 0 };
    const reasons = [];
    const expectedStops = orgDestinationAudit.total;
    if (!expectedStops) reasons.push("En az 1 gidilecek yer ekle.");
    if (!orgDestinationAudit.ok) {
      reasons.push(`Koordinatı eksik yerler: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}`);
    }
    const badShiftIds = (draftShifts || [])
      .filter((s) => {
        const validStops = (Array.isArray(s?.stops) ? s.stops : []).filter((st) => hasCoord(coordNum(st?.lat), coordNum(st?.lng)));
        return validStops.length < expectedStops;
      })
      .map((s) => Number(s.id))
      .filter(Number.isFinite);
    if (draftShiftIds.length && badShiftIds.length) {
      reasons.push(`Eksik duraklı taslak shift: ${badShiftIds.map((id) => `#${id}`).join(", ")}`);
    }
    return {
      ready: reasons.length === 0 && draftShiftIds.length > 0,
      reasons,
      badShiftIds,
      expectedStops,
    };
  }, [organization, orgDestinationAudit, draftShifts, draftShiftIds]);

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
    if (!total) reasons.push("Önce taslak shift oluştur.");
    if (!organization && companyGeoGate.blocking) reasons.push("Önce kişi koordinatlarını tamamla.");
    if (stoplessCount > 0) reasons.push(`Duraksız taslak shift: ${stoplessCount}`);
    if (pendingCount > 0) reasons.push(`OSRM doğrulaması bekleyen taslak: ${pendingCount}`);
    if (errorCount > 0) reasons.push(firstError || `OSRM doğrulama hatası: ${errorCount}`);
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
            foundText: "Koordinat hazır",
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
              foundText: "Haritadan seçildi",
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
      setErr("Navigasyon için yer koordinatı gerekli.");
      return;
    }
    const hLat = coordNum(hubLat);
    const hLng = coordNum(hubLng);
    const url = buildGoogleNavUrl({
      origin: hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null,
      destination: { lat, lng },
    });
    if (!url) {
      setErr("Navigasyon linki oluşturulamadı.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openShiftNavigation(shift) {
    const stops = (Array.isArray(shift?.stops) ? shift.stops : [])
      .map((s) => ({ lat: coordNum(s?.lat), lng: coordNum(s?.lng) }))
      .filter((x) => hasCoord(x.lat, x.lng));
    if (!stops.length) {
      setErr("Navigasyon için en az 1 durak gerekli.");
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
        setErr("Navigasyon için hub veya en az 2 durak gerekli.");
        return;
      }
      origin = stops[0];
      destination = stops[stops.length - 1];
      waypoints = stops.slice(1, -1);
    }
    const url = buildGoogleNavUrl({ origin, destination, waypoints });
    if (!url) {
      setErr("Navigasyon linki oluşturulamadı.");
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
      setErr("Yer için en az 3 karakterlik ad veya adres gir.");
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
        setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: "Bulunamadı" } : x)));
      }
    } catch (e) {
      setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: getApiErrorMessage(e, "Bulunamadı") } : x)));
    }
  }

  function orgNoteSummary() {
    const pax = String(orgEstimatedPax || "").trim();
    const gathering = String(orgGatheringName || "").trim();
    const places = orgFilledDestinations.map((d) => String(d.title || d.address || "").trim()).filter(Boolean);
    const returnText = orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir";
    const parts = [];
    if (gathering) parts.push(`Toplanma: ${gathering}`);
    if (pax) parts.push(`Tahmini kişi: ${pax}`);
    if (places.length) parts.push(`Yerler: ${places.join(" → ")}`);
    parts.push(`Dönüş: ${returnText}`);
    return `[Gezi planı] ${parts.join(" | ")}`;
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
    setStep(0);
    setBusy(false);
    setErr("");
    setInfo("");
    setHubLat("");
    setHubLng("");
    setAddr("");
    setHubLoaded(false);
    setPackKey("WK_MORNING_EVENING");
    setStartDate(todayYmd());
    setDurationKey("1d");
    setEndDate(createInitialEndDate());
    setDaysSel(selectedFromMask(62));
    setCustomSlots(createDefaultCustomSlots());
    setDraftNote("");
    setDraftAmount("");
    setOrgEstimatedPax("");
    setOrgGatheringName("");
    setOrgReturnType("RETURN_TO_START");
    setOrgDestinations([emptyDestination()]);
    setMapPickIdx(null);
    setMapPickPoint(null);
    setDraftShiftIds([]);
    setDraftShifts([]);
    setOsrmBatch({ running: false, done: 0, total: 0 });
    setOsrmResById({});
    setCompanyGeoGate({ blocking: false, ready: true, geoStats: { ok: 0, review: 0, failed: 0, total: 0 }, stopSummary: null });
    setRoomQ("");
    setOnlyHubRooms(false);
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");
    setSentOk(false);
    setOfferOutcome("idle");
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
        await cleanupDraftShifts(lingeringIds, { keepState: true });
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
    if (!open) return;
    if (step !== 3) return;
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");
    setSentOk(false);
  }, [open, step, draftShiftIds.join("|")]);

  useEffect(() => {
    const keys = new Set((durationOptions || []).map((x) => x.key));
    if (!keys.has(durationKey)) setDurationKey((durationOptions[0] || {}).key || "1d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  // Sync endDate when start/duration changes
  useEffect(() => {
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setErr("Hub lat/lng birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    setBusy(true);
    try {
      await saveGuidedCompanyHub({ token, hubLat: lat, hubLng: lng });
      setInfo(organization ? "✅ Toplanma noktası kaydedildi." : "✅ Şirket konumu kaydedildi.");
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
        setInfo(organization ? "✅ Toplanma noktası konumu alındı. Kaydetmek için 'İleri'ye bas." : "✅ Konum alındı. Kaydetmek için 'İleri'ye bas.");
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
        setInfo(`✅ Bulundu: ${r.displayName || ""}`);
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
      setErr("Hub lat/lng birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    const items = stepItems();
    if (!items.length) {
      setErr("Plan paketi geçersiz.");
      return;
    }
    const totalDraftCount = eligibleDaysCount * items.length;
    if (eligibleDaysCount > 7) {
      setErr("Guided en fazla 7 gün olabilir. Daha uzun planlar için sözleşme kullanın.");
      return;
    }
    if (totalDraftCount > 21) {
      setErr("Guided en fazla 21 vardiya oluşturabilir. Daha yoğun planlar için sözleşme kullanın.");
      return;
    }
    if (organization) {
      if (!String(orgEstimatedPax || "").trim()) {
        setErr("Tahmini kişi sayısını gir.");
        return;
      }
      if (!orgFilledDestinations.length) {
        setErr("En az 1 gidilecek yer ekle.");
        return;
      }
      if (!orgDestinationAudit.ok) {
        setErr(`Koordinatı eksik yerler var: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}. Adresten bul, manuel lat/lng gir veya haritadan seç.`);
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
        setErr("Seçili tarih aralığında (gün filtresine göre) vardiya üretilecek gün yok. Başlangıç / günler / süreyi değiştir.");
        return;
      }
      setDraftShiftIds(created.createdIds);
      setDraftShifts(created.draftShifts);
      setInfo(`✅ Taslak shift oluşturuldu: ${created.createdIds.map((x) => "#" + x).join(", ")}`);
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
    setInfo(`✅ Rota sıralandı (solver: ${res.solver || "-"}).`);
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
    setInfo(`✅ Hepsi işlendi. OK: ${okCount}, Hata: ${errCount}.`);
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
      setErr("Önce taslak shift oluşturmalısın.");
      return;
    }

    const roomIds = selectedRoomIds;
    if (!roomIds.length) {
      setErr("En az 1 room seç.");
      return;
    }
    if (organization && !orgDraftCompletion.ready) {
      setErr(`Markete göndermek için plan tamamlanmalı: ${orgDraftCompletion.reasons.join(" • ")}`);
      return;
    }
    if (!organization && offerOsrmGate.blocking) {
      setErr(offerOsrmGate.reasons.join(" • ") || "OSRM rota doğrulaması tamamlanmadan teklif gönderilemez.");
      return;
    }

    setBusy(true);
    try {
      const result = await sendGuidedBulkOffersAction({ token, draftShiftIds, selectedRoomIds: roomIds, offerAmount, offerNote });
      const skippedCount = Array.isArray(result?.skippedRoomIds) ? result.skippedRoomIds.length : 0;
      setSentOk(true);
      if (result?.allBlocked) {
        setOfferOutcome("agreement_covered");
        setInfo("ℹ️ Seçilen room'lar bu zaman penceresinde zaten aktif sözleşme kapsamında. Yeni teklif gönderilmedi; taslak vardiyalar korundu.");
      } else {
        setOfferOutcome("sent");
        const sentText = `✅ Gönderildi (shift sayısı: ${Number(result?.sentCount || 0)}).`;
        const skipText = skippedCount > 0 ? ` Not: ${skippedCount} room teklif atlandı (aktif sözleşme çakışması).` : "";
        setInfo(`${sentText}${skipText}`);
      }
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const planSummary = useMemo(() => {
    const items = stepItems();
    const lines = items.map((it) => {
      const p = organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern;
      return `${it.label || ""}: ${toHHMM(it.startMin)} – ${toHHMM(it.endMin)}${organization ? ` • ${patternLabel(p, organization)}` : ` • ${directionLabel(it.direction, organization)} • ${patternLabel(p, organization)}`}`;
    });
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packKey, customSlots, organization, orgReturnType]);

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
          <div style={{ fontWeight: 900, fontSize: 18 }}>Guided Mode — Yeni Plan</div>
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
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div className="muted">{organization ? "3. adım: Yerleri ve kişi sayısını son kez kontrol et. Kişi/import bölümü Organization için opsiyoneldir." : `3. adım: ${who} ekle/import → durak üret → önizleme.`}</div>
          {!draftShiftIds.length ? (
            <div className="card err">Önce taslak shift oluşturmalısın.</div>
          ) : (
            <div className="card">
              <div className="muted">Taslak shift’ler: {draftShiftIds.map((x) => `#${x}`).join(", ")}</div>
              <div className="muted" style={{ marginTop: 4 }}>Not: Bu adım Shift Tools UI’sinin aynısını kullanır.</div>
            </div>
          )}

          {organization ? (
            <>
              <div className="card">
                <div style={{ fontWeight: 800 }}>Plan özeti</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Toplanma: <b>{orgGatheringName || "-"}</b> • Tahmini kişi: <b>{orgEstimatedPax || "-"}</b> • Dönüş: <b>{orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir"}</b>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Yerler: {orgFilledDestinations.length ? orgFilledDestinations.map((d) => d.title || d.address).join(" → ") : "Henüz yer girilmedi"}
                </div>
              </div>
              <details className="card">
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Opsiyonel kişi / import alanı</summary>
                <div className="muted" style={{ marginTop: 6 }}>
                  Organization için bu bölüm zorunlu değil. Sadece kişi listesi de taşımak istersen kullan.
                </div>
                <div style={{ marginTop: 10 }}>
                  <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={(draftShifts || []).map((s) => s.id)} />
                </div>
              </details>
            </>
          ) : (
            <div className="card">
              <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={(draftShifts || []).map((s) => s.id)} guidedMode hideGeoReviewLinks onSummaryChange={setCompanyGeoGate} />
            </div>
          )}

          {!organization && companyGeoGate.blocking ? (
            <div className="card" style={{ border: "1px solid #b85" }}>
              <div style={{ fontWeight: 800 }}>⚠ Guided Mode kilidi</div>
              <div className="muted" style={{ marginTop: 6 }}>
                İncelenecek durumda veya eksik koordinatlı kişi varken sonraki adıma geçilmez ve markete gönderim açılmaz.
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                İncelenecek: <b>{Number(companyGeoGate?.geoStats?.review || 0)}</b> • Başarısız: <b>{Number(companyGeoGate?.geoStats?.failed || 0)}</b>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Düzeltmeyi bu ekranda yap. Guided Mode içinden dış Konum Seçici ekranına çıkış kapalı tutulur.
              </div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(1)} disabled={busy}>Geri</button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!organization) {
                    const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
                    const personIds = collectGuidedSessionPersonIds(companyKey, draftShiftIds);
                    if (personIds.length) {
                      await api("/api/company/personels/bulk-clear", {
                        token,
                        method: "POST",
                        body: { ids: personIds, fields: ["phone", "address"] },
                      });
                      updateStoredPeopleKvkkFields(companyKey, draftShiftIds, { phone: true, address: true });
                    }
                  }
                  refreshDraftShifts();
                  setStep(3);
                } catch (e) {
                  setErr(getApiErrorMessage(e));
                }
              }}
              disabled={busy || (!organization && companyGeoGate.blocking)}
            >
              {organization ? "İleri" : "Adres Temizle ve İlerle"}
            </button>
          </div>
        </div>
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

    <Modal
      open={mapPickIdx != null}
      onClose={() => {
        setMapPickIdx(null);
        setMapPickPoint(null);
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Haritadan nokta seç</div>
        <div className="muted">Haritada bir noktaya tıkla. Seçilen koordinat ilgili yer kartına yazılır.</div>
        <div style={{ height: 360, width: "100%", border: "1px solid #223", borderRadius: 12, overflow: "hidden" }}>
          {Array.isArray(mapPickPoint) ? (
            <MapContainer center={mapPickPoint} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapPickEvents onPick={(lat, lng) => setMapPickPoint([lat, lng])} />
              <CircleMarker center={mapPickPoint} radius={9} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.7 }} />
            </MapContainer>
          ) : null}
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lat</label>
            <input value={fmtCoord(mapPickPoint?.[0])} readOnly />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lng</label>
            <input value={fmtCoord(mapPickPoint?.[1])} readOnly />
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setMapPickIdx(null);
              setMapPickPoint(null);
            }}
          >
            Vazgeç
          </button>
          <button type="button" onClick={applyDestinationMapPoint} disabled={!Array.isArray(mapPickPoint)}>
            Bu noktayı kullan
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
