import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useSession } from "../../state/session";
import { personLabel } from "../../utils/labels";
import { planCenterOverlayLayerEventName, readPlanCenterOverlayLayer, setPlanCenterOverlayLayer } from "../../utils/planCenterOverlayLayer";
import { getApiErrorMessage } from "../../utils/apiContract";
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
import {
  PACKS,
  buildGuidedPlanDestinationAudit,
  buildGuidedPlanDraftCompletion,
  buildGuidedPlanFilledDestinations,
  buildGuidedPlanCurrentStepItems,
  clearPlanTermsForShiftIds as _clearPlanTermsForShiftIds,
  buildGuidedPlanModalDraftStorageKey,
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
  readGuidedPlanModalDraftState,
  normalizePersistedGuidedPlanDraftState,
  stepTitle,
  toHHMM,
  todayYmd,
  clearGuidedPlanModalDraftState,
  writeGuidedTempShiftIds as _writeGuidedTempShiftIds,
  writeGuidedPlanModalDraftState,
  ymdMinToIso as _ymdMinToIso,
} from "./guidedPlanModalUtils";
import GuidedPeopleStopsStep from "./guidedPlanModalPeopleStep";
import { GuidedHubStep, GuidedPlanSetupStep, GuidedSolveOffersStep } from "./guidedPlanModalSections";
import { MapPointPickerModal, Modal } from "./guidedPlanModalShell";
import {
  useGuidedPlanModalActions,
  cleanupGuidedDraftShifts,
  loadGuidedCompanyHub,
  loadGuidedResumeDraftShifts,
} from "./guidedPlanModalActions";
import {
  addDestinationToList,
  applyDestinationMapPointToList,
  buildDestinationMapPickerBasePoint,
  buildDestinationNavigationTarget,
  buildShiftNavigationTarget,
  geocodeGuidedDestinationAtIndex,
  moveDestinationInList,
  removeDestinationFromList,
  setDestinationCoordFieldInList,
  setDestinationFieldInList,
} from "./guidedPlanModalDestinationHelpers";

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
  persistenceScope = "",
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
  const [activeOverlayLayer, setActiveOverlayLayer] = useState(() => readPlanCenterOverlayLayer());

  // Step-0: konum
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
    if (eligibleDaysCount > 7) return "Rehberli Mod en fazla 7 gün olabilir. Daha uzun planlar için sözleşme kullanın.";
    if (totalShiftCount > 21) return "Rehberli Mod en fazla 21 vardiya oluşturabilir. Daha yoğun planlar için sözleşme kullanın.";
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

  const [resetStateBaseline, setResetStateBaseline] = useState(() => normalizePersistedGuidedPlanDraftState(buildGuidedPlanModalResetState()));
  const hydratingDraftRef = useRef(false);
  const skipPersistOnceRef = useRef(false);
  const skipStep3ResetOnceRef = useRef(false);
  const guidedPlanDraftStorageKey = useMemo(
    () => buildGuidedPlanModalDraftStorageKey({ me, persistenceScope, launchContext, routeRefreshMode }),
    [me, persistenceScope, launchContext, routeRefreshMode]
  );
  const draftShiftIdsKey = useMemo(() => draftShiftIds.join("|"), [draftShiftIds]);

  const persistedGuidedPlanDraftSnapshot = useMemo(
    () =>
      normalizePersistedGuidedPlanDraftState({
        step,
        hubLat,
        hubLng,
        addr,
        hubLoaded,
        packKey,
        startDate,
        durationKey,
        endDate,
        daysSel,
        customSlots,
        draftNote,
        draftAmount,
        orgEstimatedPax,
        orgGatheringName,
        orgReturnType,
        orgDestinations,
        mapPickIdx,
        mapPickPoint,
        draftShiftIds,
        draftShifts,
        osrmResById,
        roomQ,
        onlyHubRooms: _onlyHubRooms,
        selRoomIds,
        offerAmount,
        offerNote,
        sentOk,
        offerOutcome,
        companyGeoGate,
      }),
    [
      step,
      hubLat,
      hubLng,
      addr,
      hubLoaded,
      packKey,
      startDate,
      durationKey,
      endDate,
      daysSel,
      customSlots,
      draftNote,
      draftAmount,
      orgEstimatedPax,
      orgGatheringName,
      orgReturnType,
      orgDestinations,
      mapPickIdx,
      mapPickPoint,
      draftShiftIds,
      draftShifts,
      osrmResById,
      roomQ,
      _onlyHubRooms,
      selRoomIds,
      offerAmount,
      offerNote,
      sentOk,
      offerOutcome,
      companyGeoGate,
    ]
  );

  const isPristineGuidedPlanDraft = useMemo(
    () => JSON.stringify(persistedGuidedPlanDraftSnapshot) === JSON.stringify(resetStateBaseline),
    [persistedGuidedPlanDraftSnapshot, resetStateBaseline]
  );

  function closeGuidedPlanModal() {
    setBusy(false);
    setErr("");
    setInfo("");
    setMapPickIdx(null);
    setMapPickPoint(null);
    onClose?.();
  }

  useEffect(() => {
    if (open) {
      setPlanCenterOverlayLayer("guide");
    }
  }, [open]);

  useEffect(() => {
    function onLayerChange(event) {
      const next = String(event?.detail || readPlanCenterOverlayLayer() || "guide").toLowerCase();
      setActiveOverlayLayer(next === "copilot" ? "copilot" : "guide");
    }
    window.addEventListener(planCenterOverlayLayerEventName(), onLayerChange);
    onLayerChange();
    return () => window.removeEventListener(planCenterOverlayLayerEventName(), onLayerChange);
  }, []);

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
    if (!total) reasons.push("Önce taslak vardiya oluştur.");
    if (!organization && companyGeoGate.blocking) reasons.push("Önce kişi koordinatlarını tamamla.");
    if (stoplessCount > 0) reasons.push(`Duraksız taslak vardiya: ${stoplessCount}`);
    if (pendingCount > 0) reasons.push(`OSRM rota doğrulaması bekleyen taslak: ${pendingCount}`);
    if (errorCount > 0) reasons.push(firstError || `OSRM rota doğrulama hatası: ${errorCount}`);
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
  const offerSendBlockedByOsrm = (!organization && offerOsrmGate.blocking);

  // Load hub on open
  useEffect(() => {
    if (!open) return;
    if (!token) return;
    if (!isPristineGuidedPlanDraft) return;

    const savedDraft = readGuidedPlanModalDraftState(guidedPlanDraftStorageKey);
    const resumeMode = resumeStep != null && Number(resumeNonce || 0) > 0;

    if (savedDraft?.state) {
      skipPersistOnceRef.current = true;
      const next = normalizePersistedGuidedPlanDraftState(savedDraft.state);
      next.hubLoaded = true;
      const restoredStep = resumeMode ? Math.max(0, Math.min(3, Number(resumeStep) || 0)) : next.step;
      setStep(restoredStep);
      setBusy(false);
      setErr("");
      setInfo("");
      setHubLat(next.hubLat);
      setHubLng(next.hubLng);
      setAddr(next.addr);
      setHubLoaded(true);
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
      setOsrmBatch({ running: false, done: 0, total: 0 });
      setOsrmResById(next.osrmResById);
      setRoomQ(next.roomQ);
      setOnlyHubRooms(next.onlyHubRooms);
      setSelRoomIds(next.selRoomIds);
      setRoomScores({});
      setOfferAmount(next.offerAmount);
      setOfferNote(next.offerNote);
      setSentOk(next.sentOk);
      setOfferOutcome(next.offerOutcome);
      setCompanyGeoGate(next.companyGeoGate);
      _writeGuidedTempShiftIds(next.draftShiftIds);
      skipStep3ResetOnceRef.current = restoredStep === 3;
      return;
    }

    let alive = true;
    hydratingDraftRef.current = true;
    (async () => {
      const lingeringIds = readGuidedTempShiftIds();
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
      } finally {
        hydratingDraftRef.current = false;
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, token, resumeStep, resumeNonce, isPristineGuidedPlanDraft, guidedPlanDraftStorageKey]);

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
    if (skipStep3ResetOnceRef.current) {
      skipStep3ResetOnceRef.current = false;
      return;
    }
    setSelRoomIds({});
    const initialRouteRefreshAmount = routeRefreshMode
      ? (launchContext?.currentCompanyOfferAmount != null ? String(launchContext.currentCompanyOfferAmount) : "")
      : "";
    setOfferAmount(initialRouteRefreshAmount);
    setOfferNote("");
    setSentOk(false);
  }, [open, step, draftShiftIdsKey, routeRefreshMode, launchContext]);

  useEffect(() => {
    if (!open || !guidedPlanDraftStorageKey) return;
    if (hydratingDraftRef.current) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    if (isPristineGuidedPlanDraft) {
      clearGuidedPlanModalDraftState(guidedPlanDraftStorageKey);
      return;
    }
    writeGuidedPlanModalDraftState(guidedPlanDraftStorageKey, persistedGuidedPlanDraftSnapshot);
  }, [open, guidedPlanDraftStorageKey, isPristineGuidedPlanDraft, persistedGuidedPlanDraftSnapshot]);

  useEffect(() => {
    const keys = new Set((durationOptions || []).map((x) => x.key));
    if (!keys.has(durationKey)) setDurationKey((durationOptions[0] || {}).key || "1d");
  }, [organization, durationKey, durationOptions]);

  // Sync endDate when start/duration changes
  useEffect(() => {
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
  }, [startDate, durationDays]);

  const {
    resetAll,
    saveHub,
    useGeolocation,
    geocodeAddress,
    createDraftShifts,
    refreshDraftShifts,
    osrmReorder,
    osrmReorderAll,
    sendBulkOffers,
  } = useGuidedPlanModalActions({
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
    hubSaveFeedback: {
      organization: "Toplanma konumu kaydedildi.",
      company: "Firma konumu kaydedildi.",
    },
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
  });

  const planSummary = useMemo(() => {
    const lines = currentStepItems.map((it) => {
      const p = organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern;
      return `${it.label || ""}: ${toHHMM(it.startMin)} → ${toHHMM(it.endMin)}${organization ? ` → ${patternLabel(p, organization)}` : ` → ${directionLabel(it.direction, organization)} → ${patternLabel(p, organization)}`}`;
    });
    return lines;
  }, [currentStepItems, organization, orgReturnType]);

  const modalContentStyle = undefined;

  return (
    <>
    <Modal
      open={open}
      onClose={closeGuidedPlanModal}
      dismissOnBackdrop={false}
      // Safe company-action layer: zIndex: 9060
      zIndex={9060}
      contentProps={{
        style: modalContentStyle,
        "data-overlay-layer": activeOverlayLayer,
        onPointerDownCapture: () => setPlanCenterOverlayLayer("guide"),
        onMouseDownCapture: () => setPlanCenterOverlayLayer("guide"),
        onFocusCapture: () => setPlanCenterOverlayLayer("guide"),
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div data-dialog-title style={{ fontWeight: 900, fontSize: 18 }}>{routeRefreshMode ? "Rehberli Mod → Rota Güncelle" : "Rehberli Mod → Yeni Plan"}</div>
          <div className="muted" style={{ marginTop: 4 }}>{stepTitle(step, who, organization)}</div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={closeGuidedPlanModal} disabled={busy}>Kapat</button>
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
          <div style={{ fontWeight: 800 }}>Rota güncelleme bağlamı</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Sözleşme #{Number(launchContext?.agreementId || 0) || "?"} · Kaynak vardiya #{Number(launchContext?.sourceShiftId || 0) || "?"}
            {launchContext?.roomName ? ` · Sağlayıcı ${launchContext.roomName}` : ""}
          </div>
          {launchContext?.sourceSummary ? (
            <div className="muted" style={{ marginTop: 6 }}>{String(launchContext.sourceSummary)}</div>
          ) : null}
          <div className="muted" style={{ marginTop: 6 }}>
            Bu turda mevcut rehberli akış aynı sözleşme bağlamıyla açıldı. Planı düzenleyip kişi/durak tarafını yeniden hazırlayabilirsin.
          </div>
        </div>
      ) : null}

      {/* Step-0: Konum */}
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
          moveDestination={(idx, dir) => setOrgDestinations((prev) => moveDestinationInList(prev, idx, dir))}
          removeDestination={(idx) => setOrgDestinations((prev) => removeDestinationFromList(prev, idx))}
          setDestinationField={(idx, field, value) => setOrgDestinations((prev) => setDestinationFieldInList(prev, idx, field, value))}
          setDestinationCoordField={(idx, field, value) => setOrgDestinations((prev) => setDestinationCoordFieldInList(prev, idx, field, value))}
          geocodeDestination={(idx) => geocodeGuidedDestinationAtIndex({ token, idx, orgDestinations, setOrgDestinations, setErr, setInfo })}
          openDestinationMapPicker={(idx) => {
            const item = (orgDestinations || [])[idx] || {};
            setMapPickIdx(idx);
            setMapPickPoint(buildDestinationMapPickerBasePoint({ item, hubLat, hubLng }));
          }}
          openDestinationNavigation={(dest) => {
            const next = buildDestinationNavigationTarget({ dest, hubLat, hubLng });
            if (next.error) {
              setErr(next.error);
              return;
            }
            window.open(next.url, "_blank", "noopener,noreferrer");
          }}
          addDestination={() => setOrgDestinations((prev) => addDestinationToList(prev))}
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
          openShiftNavigation={(shift) => {
            const next = buildShiftNavigationTarget({ shift });
            if (next.error) {
              setErr(next.error);
              return;
            }
            window.open(next.url, "_blank", "noopener,noreferrer");
          }}
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
          onClose={closeGuidedPlanModal}
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
      applyDestinationMapPoint={() => {
        if (mapPickIdx == null || !Array.isArray(mapPickPoint)) return;
        setOrgDestinations((prev) => applyDestinationMapPointToList(prev, mapPickIdx, mapPickPoint));
        setMapPickIdx(null);
        setMapPickPoint(null);
      }}
    />
    </>
  );
}
