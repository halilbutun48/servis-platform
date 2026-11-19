import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useSession } from "../../state/session";
import { getPath } from "../../router";
import { getGuidedTarget, setGuidedTarget, shouldRestoreGuidedTargetAfterRouteChange } from "../../copilot/guidedTargetState";
import { personLabel } from "../../utils/labels";
import { planCenterOverlayLayerEventName, readPlanCenterOverlayLayer, setPlanCenterOverlayLayer } from "../../utils/planCenterOverlayLayer";
import { getApiErrorMessage } from "../../utils/apiContract";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
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
import { formatOfferAmountMinor } from "../shared/offerAmountPresentation";
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
  buildGuidedDraftCopilotSelection,
  coordNum,
  createAdditionalCustomSlot,
  createDefaultCustomSlots,
  createGuidedBatchIdempotencyKey,
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
  buildGuidedResumeFormState,
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
  loadGuidedDraftCandidates,
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
import { alignGuidedPlanResetBaseline, shouldDiscoverGuidedDraftCandidates } from "./guidedPlanModalHydration";

function guidedModalTargetLabel(step, organization) {
  if (step === 0) return "Konumumu al";
  if (step === 1) return "Taslak vardiya oluştur";
  if (step === 2) return organization ? "İleri" : "Dosya seç";
  return organization ? "Toplu Teklifleri Gönder" : "Toplu Teklifleri Gönder";
}

function guidedModalTargetKey(step, organization) {
  if (step === 2 && !organization) return 'company-shifts:step3:personnel-import';
  return `${getPath()}:button:${guidedModalTargetLabel(step, organization)}`;
}

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
  const school = me?.companyKind === "SCHOOL";
  const appliedLaunchNonceRef = useRef(0);
  const routeRefreshMode = String(launchContext?.mode || "").toUpperCase() === "ROUTE_REFRESH";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [activeOverlayLayer, setActiveOverlayLayer] = useState(() => readPlanCenterOverlayLayer());
  const guidedTargetBeforeModalRef = useRef(null);

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
  const [guidedBatchIdempotencyKey, setGuidedBatchIdempotencyKey] = useState(() => createGuidedBatchIdempotencyKey());
  const [resumeCandidates, setResumeCandidates] = useState([]);
  const [resumeChooserOpen, setResumeChooserOpen] = useState(false);
  const [resumeSelectionBusy, setResumeSelectionBusy] = useState(false);
  const [resumeConfirmDeleteId, setResumeConfirmDeleteId] = useState(null);
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

  const [resetStateBaseline, setResetStateBaseline] = useState(() => normalizePersistedGuidedPlanDraftState(
    alignGuidedPlanResetBaseline(buildGuidedPlanModalResetState(), guidedBatchIdempotencyKey),
  ));
  const hydratingDraftRef = useRef(false);
  const skipPersistOnceRef = useRef(false);
  const skipStep3ResetOnceRef = useRef(false);
  const resumedFromServerRef = useRef(false);
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
         guidedBatchIdempotencyKey,
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
      guidedBatchIdempotencyKey,
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
    resumedFromServerRef.current = false;
    clearCopilotSelection(getPath());
    onClose?.();
  }

  function applyResumedDraftForm(shift) {
    const restored = buildGuidedResumeFormState(shift);
    setPackKey(restored.packKey);
    setCustomSlots(restored.customSlots);
    setStartDate(restored.startDate);
    setEndDate(restored.endDate);
    setDurationKey(restored.durationKey);
    setDaysSel(restored.daysSel);
    setHubLat(restored.hubLat);
    setHubLng(restored.hubLng);
    setOrgEstimatedPax(restored.orgEstimatedPax);
    setOrgReturnType(restored.orgReturnType);
    setOrgDestinations(restored.orgDestinations);

    const id = Number(shift?.id || 0);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const selection = buildGuidedDraftCopilotSelection(shift, buildShiftFacts({ shift, itemCount: 1 }));
    if (selection) setCopilotSelection({ scopeKey: getPath(), ...selection });
  }

  useEffect(() => {
    if (open) {
      setPlanCenterOverlayLayer("guide");
    }
  }, [open]);

  // When the guided workflow opens over a live Sefer Abi target, move the
  // highlight into the actual modal step instead of leaving it attached to
  // the now-covered underlying disclosure. This is presentation grounding;
  // it does not authorize or execute any business action.
  useLayoutEffect(() => {
    if (!open) {
      const previous = guidedTargetBeforeModalRef.current;
      if (shouldRestoreGuidedTargetAfterRouteChange(previous, getPath())) setGuidedTarget(previous);
      else setGuidedTarget(null);
      guidedTargetBeforeModalRef.current = null;
      return undefined;
    }
    if (resumeChooserOpen) {
      setGuidedTarget(null);
      return undefined;
    }
    const existing = getGuidedTarget();
    if (!guidedTargetBeforeModalRef.current && existing?.status === "FOUND") {
      guidedTargetBeforeModalRef.current = existing;
    }
    const label = guidedModalTargetLabel(step, organization);
    const targetKey = guidedModalTargetKey(step, organization);
    const candidates = Array.from(document.querySelectorAll('button,[role="button"],input,select,summary'));
    const node = candidates.find((item) => String(item.textContent || item.getAttribute("aria-label") || item.value || "").replace(/\s+/g, " ").trim() === label);
    if (!node) return undefined;
    setGuidedTarget({
      status: "FOUND",
      targetKey,
      identitySource: "CANONICAL",
      label,
      semanticType: "button",
      screenPath: getPath(),
      role: me?.role || "COMPANY",
      safeAction: "HIGHLIGHT",
      criticalActionExecution: false,
      reason: "Açık rehber adımındaki gerçek ve yetkili kontrol gösteriliyor; iş yazımı çalıştırılmıyor.",
    });
    return undefined;
  }, [open, step, organization, me?.role, resumeChooserOpen]);

  // The overlay observes the old step's DOM removal in the same commit. A
  // post-paint reassertion lets that observer finish before the modal-owned
  // current-step target becomes authoritative again.
  useEffect(() => {
    if (!open || resumeChooserOpen) {
      if (resumeChooserOpen) setGuidedTarget(null);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      const label = guidedModalTargetLabel(step, organization);
      const node = Array.from(document.querySelectorAll('button,[role="button"],input,select,summary'))
        .find((item) => String(item.textContent || item.getAttribute("aria-label") || item.value || "").replace(/\s+/g, " ").trim() === label);
      if (!node) return;
      setGuidedTarget({
        status: "FOUND",
        targetKey: guidedModalTargetKey(step, organization),
        identitySource: "CANONICAL",
        label,
        semanticType: "button",
        screenPath: getPath(),
        role: me?.role || "COMPANY",
        safeAction: "HIGHLIGHT",
        criticalActionExecution: false,
        reason: "Açık rehber adımındaki gerçek ve yetkili kontrol gösteriliyor; iş yazımı çalıştırılmıyor.",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, step, organization, me?.role, resumeChooserOpen]);

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
    let alive = true;
    hydratingDraftRef.current = true;
    (async () => {
      const savedDraft = readGuidedPlanModalDraftState(guidedPlanDraftStorageKey);
      const savedState = savedDraft?.state ? normalizePersistedGuidedPlanDraftState(savedDraft.state) : null;
      const savedIds = Array.isArray(savedState?.draftShiftIds)
        ? savedState.draftShiftIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [];
      const resumeMode = resumeStep != null && Number(resumeNonce || 0) > 0;
      const lingeringIds = readGuidedTempShiftIds();
      let candidates = [];
      if (shouldDiscoverGuidedDraftCandidates({ token, routeRefreshMode })) {
        try {
          candidates = await loadGuidedDraftCandidates({ token });
        } catch {
          if (alive) setInfo("Taslaklar şu anda alınamadı. Yeni plan başlatmadan önce tekrar deneyebilirsin.");
        }
      }
      if (!alive) return;

      const candidateIds = new Set(candidates.map((item) => Number(item?.id)).filter((id) => Number.isFinite(id) && id > 0));
      const savedIdsValid = savedIds.length > 0 && savedIds.every((id) => candidateIds.has(id));
      const restoreState = (state, forcedStep = null) => {
        skipPersistOnceRef.current = true;
        const next = normalizePersistedGuidedPlanDraftState(state);
        next.hubLoaded = true;
        const restoredStep = forcedStep == null ? next.step : Math.max(0, Math.min(3, Number(forcedStep) || 0));
        setStep(restoredStep);
        setBusy(false);
        setErr("");
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
         setGuidedBatchIdempotencyKey(next.guidedBatchIdempotencyKey);
        setOsrmBatch({ running: false, done: 0, total: 0 });
        setOsrmResById(next.osrmResById);
        setRoomQ(next.roomQ);
        setOnlyHubRooms(next.onlyHubRooms);
        setSelRoomIds(next.selRoomIds);
        setRoomScores({});
        const restoredRouteRefreshAmount = routeRefreshMode
          ? (launchContext?.currentCompanyOfferAmount != null
            ? formatOfferAmountMinor(launchContext.currentCompanyOfferAmount)
            : next.offerAmount)
          : next.offerAmount;
        setOfferAmount(restoredRouteRefreshAmount);
        setOfferNote(routeRefreshMode ? "" : next.offerNote);
        setSentOk(routeRefreshMode ? false : next.sentOk);
        setOfferOutcome(next.offerOutcome);
        setCompanyGeoGate(next.companyGeoGate);
        _writeGuidedTempShiftIds(next.draftShiftIds);
        skipStep3ResetOnceRef.current = restoredStep === 2;
      };

      // A normal entry is not an implicit resume.  Even when the client has a
      // locally persisted snapshot whose draft ids are still valid, the
      // server-backed chooser remains authoritative so desktop/tablet/mobile
      // cannot diverge into a silent replacement/new-plan path.  Local state
      // may still restore an unsaved new-plan form (no server draft ids), and
      // an explicit resume flow may restore its selected server draft.
      const mayRestoreLocalState = resumeMode || !savedIds.length || !candidates.length;
      if (savedState && mayRestoreLocalState && (!savedIds.length || savedIdsValid)) {
        restoreState(savedState, resumeMode ? resumeStep : null);
        if (candidates.length && !savedIds.length && !resumeMode) {
          setResumeCandidates(candidates);
          setResumeChooserOpen(true);
        }
        hydratingDraftRef.current = false;
        return;
      }

      if (savedState && savedIds.length && !savedIdsValid) {
        clearGuidedPlanModalDraftState(guidedPlanDraftStorageKey);
        _writeGuidedTempShiftIds([]);
        setInfo("Önceki yerel taslak bağlantısı artık geçerli değil; mevcut server taslaklarını kontrol edebilirsin.");
      }

      if (resumeMode && lingeringIds.length && lingeringIds.every((id) => candidateIds.has(Number(id)))) {
        const matching = candidates.filter((item) => lingeringIds.includes(Number(item?.id)));
        const safeStep = matching.reduce((max, item) => Math.max(max, Number(item?.resumeStep || 0)), 0);
        setDraftShiftIds(lingeringIds);
        try {
          const items = await loadGuidedResumeDraftShifts({ token, ids: lingeringIds });
          if (!alive) return;
          setDraftShifts(items);
          if (items[0]) applyResumedDraftForm(items[0]);
          setStep(safeStep);
          skipStep3ResetOnceRef.current = safeStep === 2;
        } catch {
          if (!alive) return;
          setDraftShifts([]);
          setInfo("Taslak ayrıntıları alınamadı; güvenli başlangıç adımından devam edebilirsin.");
        }
      } else if (candidates.length) {
        setResumeCandidates(candidates);
        setResumeChooserOpen(true);
      } else if (resumeMode && lingeringIds.length) {
        _writeGuidedTempShiftIds([]);
        setInfo("Önceki taslak artık bulunamadı; yeni bir plan başlatabilirsin.");
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
  }, [open, token, resumeStep, resumeNonce, isPristineGuidedPlanDraft, guidedPlanDraftStorageKey, routeRefreshMode]);

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
    const routeRefreshOfferAmount = routeRefreshMode
      ? (launchContext?.currentCompanyOfferAmount != null
        ? formatOfferAmountMinor(launchContext.currentCompanyOfferAmount)
        : "")
      : "";
    if (skipStep3ResetOnceRef.current) {
      skipStep3ResetOnceRef.current = false;
      if (routeRefreshMode && routeRefreshOfferAmount) {
        setOfferAmount(routeRefreshOfferAmount);
      }
      return;
    }
    setSelRoomIds({});
    setOfferAmount(routeRefreshOfferAmount);
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
    school,
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
    guidedBatchIdempotencyKey,
    persistedGuidedPlanDraftSnapshot,
    resumedFromServer: resumedFromServerRef.current,
    selectedRoomIds,
    offerAmount,
    offerNote,
    orgDraftCompletion,
    offerOsrmGate,
    offerSendBlockedByOsrm,
    orgDestinationAudit,
    hubSaveFeedback: {
      organization: "Toplanma konumu kaydedildi.",
      school: "Okul konumu kaydedildi.",
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
    setGuidedBatchIdempotencyKey,
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

  async function resumeGuidedDraft(candidate) {
    const selectedId = Number(candidate?.id || 0);
    if (!selectedId || resumeSelectionBusy) return;
    setResumeSelectionBusy(true);
    setErr("");
    try {
      const latestCandidates = await loadGuidedDraftCandidates({ token });
      const latest = latestCandidates.find((item) => Number(item?.id) === selectedId);
      if (!latest || String(latest.status || "").toUpperCase() !== "DRAFT") {
        setResumeCandidates(latestCandidates);
        setInfo("Bu taslak artık kullanılamıyor; listeyi güncelledim.");
        return;
      }
      const items = await loadGuidedResumeDraftShifts({ token, ids: [selectedId] });
      if (!items.length) {
        setResumeCandidates(latestCandidates.filter((item) => Number(item?.id) !== selectedId));
        setInfo("Bu taslak artık bulunamadı; başka bir taslak seçebilirsin.");
        return;
      }
      const shift = items[0];
      setDraftShiftIds([selectedId]);
      setDraftShifts(items);
      resumedFromServerRef.current = true;
      applyResumedDraftForm(shift);
      setHubLoaded(true);
      setStep(Math.max(0, Math.min(3, Number(latest.resumeStep) || 0)));
      skipStep3ResetOnceRef.current = Number(latest.resumeStep) === 2;
      _writeGuidedTempShiftIds([selectedId]);
      setResumeCandidates([]);
      setResumeChooserOpen(false);
      setResumeConfirmDeleteId(null);
      setInfo(`Taslak #${selectedId} aynı kayıt üzerinden sürdürülebilir.`);
    } catch (error) {
      setErr(getApiErrorMessage(error) || "Taslak şu anda alınamadı.");
    } finally {
      setResumeSelectionBusy(false);
    }
  }

  function startNewGuidedPlan() {
    setResumeChooserOpen(false);
    setResumeCandidates([]);
    setResumeConfirmDeleteId(null);
    setDraftShiftIds([]);
    setDraftShifts([]);
    setGuidedBatchIdempotencyKey(createGuidedBatchIdempotencyKey());
    resumedFromServerRef.current = false;
    clearCopilotSelection(getPath());
    _writeGuidedTempShiftIds([]);
    setStep(0);
    setInfo("Yeni plan başlatıldı. Mevcut taslaklar korunuyor.");
  }

  async function discardGuidedDraft(candidate) {
    const selectedId = Number(candidate?.id || 0);
    if (!selectedId || resumeSelectionBusy) return;
    setResumeSelectionBusy(true);
    setErr("");
    try {
      const latestCandidates = await loadGuidedDraftCandidates({ token });
      const latest = latestCandidates.find((item) => Number(item?.id) === selectedId);
      const sameIdentity = latest
        && String(latest.status || "").toUpperCase() === "DRAFT"
        && String(latest.createdAt || "") === String(candidate?.createdAt || "");
      if (!sameIdentity) {
        setResumeCandidates(latestCandidates);
        setResumeConfirmDeleteId(null);
        setInfo("Taslak değişti veya artık yok; silme işlemini uygulamadım.");
        return;
      }
      await cleanupGuidedDraftShifts({ token, ids: [selectedId] });
      const remaining = latestCandidates.filter((item) => Number(item?.id) !== selectedId);
      setResumeCandidates(remaining);
      setResumeConfirmDeleteId(null);
      if (!remaining.length) setResumeChooserOpen(false);
      setInfo(`Taslak #${selectedId} açık onayla silindi.`);
    } catch (error) {
      setErr(getApiErrorMessage(error) || "Taslak silinemedi; mevcut kayıt korunuyor.");
    } finally {
      setResumeSelectionBusy(false);
    }
  }

  const planSummary = useMemo(() => {
    const lines = currentStepItems.map((it) => {
      const p = organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern;
      return `${it.label || ""}: ${toHHMM(it.startMin)} → ${toHHMM(it.endMin)}${organization ? ` → ${patternLabel(p, organization)}` : ` → ${directionLabel(it.direction, organization)} → ${patternLabel(p, organization)}`}`;
    });
    return lines;
  }, [currentStepItems, organization, orgReturnType]);

  const modalContentStyle = {
    width: "min(1680px, 100%)",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
    <Modal
      open={open}
      onClose={closeGuidedPlanModal}
      dismissOnBackdrop={false}
      // Safe company-action layer: zIndex: 9060
      zIndex={9060}
      backdropClassName="guidedPlanModalBackdrop"
      backdropStyle={{
        background: "rgba(2, 6, 23, 0.72)",
        backdropFilter: "blur(2px)",
        isolation: "isolate",
      }}
      contentProps={{
        style: modalContentStyle,
        className: "guidedPlanModalContent guidedPlanModalContent--primary guidedPlanModalSurface",
        "data-overlay-layer": activeOverlayLayer,
        "data-copilot-workflow-id": resumeChooserOpen ? undefined : "COMPANY_GUIDED_NEW_PLAN",
        "data-copilot-workflow-step": resumeChooserOpen ? undefined : String(step + 1),
        "data-copilot-workflow-completed-through": resumeChooserOpen ? undefined : String(step),
        "data-copilot-workflow-target-label": resumeChooserOpen ? undefined : guidedModalTargetLabel(step, organization),
        "data-copilot-workflow-target-key": resumeChooserOpen ? undefined : guidedModalTargetKey(step, organization),
        onPointerDownCapture: () => setPlanCenterOverlayLayer("guide"),
        onMouseDownCapture: () => setPlanCenterOverlayLayer("guide"),
        onFocusCapture: () => setPlanCenterOverlayLayer("guide"),
      }}
    >
      <div className="guidedPlanModalHeader row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div data-dialog-title className="guidedPlanModalTitle" style={{ fontWeight: 900, fontSize: 18 }}>{routeRefreshMode ? "Rehberli Mod → Rota Güncelle" : "Rehberli Mod → Yeni Plan"}</div>
          <div className="guidedPlanModalStepTitle muted" style={{ marginTop: 4 }}>{resumeChooserOpen ? "Kayıtlı taslaklar" : stepTitle(step, who, organization, school)}</div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="guidedPlanSecondaryAction" onClick={closeGuidedPlanModal} disabled={busy}>Kapat</button>
        </div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>{err}</div>
      ) : null}
      {info ? (
        <div className="card" style={{ marginTop: 10, border: "1px solid #2a7" }}>{info}</div>
      ) : null}
      {resumeChooserOpen ? (
        <div
          className="card"
          data-guided-draft-chooser="true"
          data-copilot-foreground-surface="company:guided-draft-chooser"
          data-copilot-foreground-surface-kind="SAVED_DRAFT_CHOOSER"
          style={{ marginTop: 12, border: "1px solid rgba(88,166,255,.45)" }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>Kaydedilmiş taslaklar</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Bu şirket için server’da kayıtlı rehberli taslak bulundu. Devam etmek mevcut taslağı kullanır; yeni plan eski taslağı silmez.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {resumeCandidates.map((candidate) => {
              const id = Number(candidate?.id || 0);
              const confirm = resumeConfirmDeleteId === id;
              const progress = Number(candidate?.resumeStep || 0) + 1;
              return (
                <div key={id} className="card" data-guided-draft-id={String(id)} style={{ border: "1px solid rgba(148,163,184,.35)" }}>
                  <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>Taslak #{id}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        Durum: DRAFT · Güvenli başlangıç: {progress}. adım
                        {candidate?.createdAt ? ` · ${String(candidate.createdAt).slice(0, 19).replace("T", " ")}` : ""}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="guidedPrimaryAction" data-copilot-target="company:guided-draft-resume" onClick={() => resumeGuidedDraft(candidate)} disabled={resumeSelectionBusy}>
                        Devam et
                      </button>
                      {!confirm ? (
                        <button type="button" className="guidedPlanSecondaryAction" data-copilot-target="company:guided-draft-discard" onClick={() => setResumeConfirmDeleteId(id)} disabled={resumeSelectionBusy}>
                          Taslağı sil
                        </button>
                      ) : (
                        <>
                          <button type="button" className="guidedPlanSecondaryAction" onClick={() => discardGuidedDraft(candidate)} disabled={resumeSelectionBusy}>
                            Silmeyi onayla
                          </button>
                          <button type="button" className="guidedPlanSecondaryAction" onClick={() => setResumeConfirmDeleteId(null)} disabled={resumeSelectionBusy}>
                            Vazgeç
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" className="guidedPrimaryAction" data-copilot-target="company:guided-draft-new" onClick={startNewGuidedPlan} disabled={resumeSelectionBusy}>
              Yeni plan
            </button>
          </div>
        </div>
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
      {!resumeChooserOpen && step === 0 ? (
        <GuidedHubStep
          organization={organization}
          school={school}
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
          guidedTargetKey={guidedModalTargetKey(0, organization)}
        />
      ) : null}

      {/* Step-1: Plan */}
      {!resumeChooserOpen && step === 1 ? (
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
          draftAmount={draftAmount}
          setDraftAmount={setDraftAmount}
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
          guidedTargetKey={guidedModalTargetKey(1, organization)}
        />
      ) : null}

      {/* Step-2: People + stops */}
      {!resumeChooserOpen && step === 2 ? (
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
          guidedTargetKey={guidedModalTargetKey(2, organization)}
        />
      ) : null}

      {/* Step-3: Solve + offers */}
      {!resumeChooserOpen && step === 3 ? (
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
          guidedTargetKey={guidedModalTargetKey(3, organization)}
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
