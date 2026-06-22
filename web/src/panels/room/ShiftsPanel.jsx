// web/src/panels/room/ShiftsPanel.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
import { getApiErrorMessage } from "../../utils/apiContract";
import { resolveShiftRegionLabel } from "../../utils/regionOwnership";
import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  normalizeRoomShiftError as normalizeErr,
  shiftRequiredPax,
  trimOrNull,
} from "./roomShiftsPanelUtils";
import {
  effectiveShiftRoomId,
  buildOffersByShiftId,
  listVehiclesForRoom,
  listDriversForRoom,
  copyVehicleToPkg as copyVehicleToPkgHelper,
  copyDriverToPkg as copyDriverToPkgHelper,
  hydrateDispatchSelections as hydrateDispatchSelectionsHelper,
  setDispatchSelection as setDispatchSelectionHelper,
  selectedDispatchVehicleId as selectedDispatchVehicleIdHelper,
  selectedDispatchDriverId as selectedDispatchDriverIdHelper,
  buildDispatchVirtualShift as buildDispatchVirtualShiftHelper,
  getDispatchSelectionStates as getDispatchSelectionStatesHelper,
  isDriverAvailableForShift,
  isVehicleAvailableForShift,
  makeAvailabilitySig,
  matchShift,
  pkgShiftIdsFor,
} from "./roomShiftsPanelHelpers";
import { autoSplitApproveAction, approveShiftAction, rejectShiftAction, submitReassignAction } from "./roomShiftsPanelActions";
import { RoomShiftsModalSection, RoomShiftsOverviewSection } from "./roomShiftsOverviewSection";
import { RoomShiftsMainSections } from "./roomShiftsMainSections";
import {
  checkRoomShiftAvailability,
  loadRoomShiftsPanelAll,
  loadRoomShiftsPanelOffers,
  loadRoomShiftsPanelReferenceData,
  loadRoomShiftsPanelShiftList,
} from "./roomShiftsPanelWorkflow";

export default function RoomShiftsPanel() {
  const { token } = useSession();

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [offers, setOffers] = useState([]); // market offers inbox (SHIFT_OFFER)

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [reassignModal, setReassignModal] = useState({ open: false, shift: null });
  const [opsEventsModal, setOpsEventsModal] = useState({ open: false, shiftId: null });
  const [shiftsTab, setShiftsTab] = useState("pending"); // pending | contract | other

  // Bekleyen filtreleri
  const [pendingStatus, setPendingStatus] = useState("OPEN"); // OPEN | REQUESTED | DRAFT
  const [pendingQ, setPendingQ] = useState("");
  const [contractQ, setContractQ] = useState("");
  const [otherQ, setOtherQ] = useState("");
  const userSelectedShiftsTabRef = useRef(false);

  const [focusedTrackShiftId, setFocusedTrackShiftId] = useState(null);
  const [pendingPreviewShiftId, setPendingPreviewShiftId] = useState(null);
  const selectShiftsTab = useCallback((tab) => { userSelectedShiftsTabRef.current = true; setShiftsTab(tab); }, []);

  // M28/M63-R3A: offers inbox -> ilgili satira hizli gecis
  useEffect(() => {
    const timer = setTimeout(() => {
      const pendingRaw = localStorage.getItem("room:focusPendingShiftId");
      if (pendingRaw) {
        localStorage.removeItem("room:focusPendingShiftId");
        const sid = String(pendingRaw || "").trim();
        if (sid) {
          userSelectedShiftsTabRef.current = true;
          setShiftsTab("pending");
          setPendingStatus("REQUESTED");
          setPendingQ(sid);
          return;
        }
      }

      const previewRaw = localStorage.getItem("room:previewShiftId");
      const raw = localStorage.getItem("room:focusShiftId");
      if (previewRaw) localStorage.removeItem("room:previewShiftId");
      if (raw) localStorage.removeItem("room:focusShiftId");
      const sid = String(previewRaw || raw || "").trim();
      if (!sid) return;
      userSelectedShiftsTabRef.current = true;
      setShiftsTab("contract");
      setContractQ(sid);
      setOtherQ(sid);
      if (previewRaw) setPendingPreviewShiftId(Number(sid || 0));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Bekleyen satır: seçili araç + seçili driver (approve için)
  const [assignSel, setAssignSel] = useState({}); // { [shiftId]: vehicleIdStr }
  const [driverSel, setDriverSel] = useState({}); // { [shiftId]: driverIdStr }
  const [showAvailableOnly, setShowAvailableOnly] = useState({}); // { [shiftId]: bool }

  // Room karşı teklif verisi, sadece init için tutuluyor
  const [, setRoomOfferSel] = useState({});

  // M51: Shift süre uzatma (Room karar)
  const [extendNoteSel, setExtendNoteSel] = useState({}); // { [shiftId]: string }
  const setExtendNote = (shiftId, v) => setExtendNoteSel((p) => ({ ...p, [Number(shiftId)]: v }));
 // { [offerId]: { amountRoom, noteRoom } }

async function decideExtend(shiftId, decision) {
  const sid = Number(shiftId);
  if (!sid) return;
  setBusy(true);
  setErr("");
  try {
    await api.put(`/api/shifts/${sid}/extend-decision`, {
      decision,
      noteRoom: trimOrNull(extendNoteSel[sid]) }, { token });
    setExtendNoteSel((p) => ({ ...p, [sid]: "" }));
    invalidate("shift:list");
  } catch (e) {
    setErr(getApiErrorMessage(e, "İşlem başarısız."));
  } finally {
    setBusy(false);
  }
}

  // M14: uygunluk/çatışma state (shift bazlı)
  // shape: { [sid]: { sig, status, code, message, conflictingShift, source } }
  // status: idle | checking | ok | conflict | error | missing
  const [avail, setAvail] = useState({});
  const availInflight = useRef(new Set());
  const [poolSummary, setPoolSummary] = useState({}); // { [sid]: { status, data?, error? } }
  const poolInflight = useRef(new Set());
  const checkAvailabilityForShiftRef = useRef(null);
  const vehiclesForRoomRef = useRef(null);
  const loadPoolSummaryRef = useRef(null);
  const loadDispatchPreviewRef = useRef(null);
  const poolSummaryRef = useRef(poolSummary);

  // M16: Haritada önizleme (modal)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewShift, setPreviewShift] = useState(null);
  const [previewStops, setPreviewStops] = useState([]);
  const [previewPeople, setPreviewPeople] = useState([]); // şimdilik boş (backend gelince assignment/personel eklenebilir)
  const [previewSummary, setPreviewSummary] = useState(null);
  const [previewPathPoints, setPreviewPathPoints] = useState(null);
  const [previewSource, setPreviewSource] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState("");
  const [dispatchPreview, setDispatchPreview] = useState({});
  const [dispatchEditSel, setDispatchEditSel] = useState({}); // { [shiftId]: { [splitIndex]: { vehicleId, driverId } } }
  const dispatchInflight = useRef(new Set());

  function toggleAvailable(shiftId) { setShowAvailableOnly((p) => ({ ...p, [Number(shiftId)]: !p[Number(shiftId)] })); }

  const roomsById = useMemo(() => {
    const m = new Map();
    for (const r of rooms) m.set(Number(r.id), r);
    return m;
  }, [rooms]);

  const vehiclesById = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) m.set(Number(v.id), v);
    return m;
  }, [vehicles]);

  const driversById = useMemo(() => {
    const m = new Map();
    for (const d of drivers) m.set(Number(d.id), d);
    return m;
  }, [drivers]);

  const previewRegionLabel = useMemo(() => resolveShiftRegionLabel(previewShift, roomsById), [previewShift, roomsById]);
  const reassignRegionLabel = useMemo(() => resolveShiftRegionLabel(reassignModal.shift, roomsById), [reassignModal.shift, roomsById]);
  const opsEventsShift = useMemo(() => {
    const sid = Number(opsEventsModal.shiftId || 0);
    if (!sid) return null;
    return items.find((x) => Number(x?.id || 0) === sid) || null;
  }, [items, opsEventsModal.shiftId]);
  const opsEventsRegionLabel = useMemo(() => resolveShiftRegionLabel(opsEventsShift, roomsById), [opsEventsShift, roomsById]);

  const uiCopyVehicleToPkg = (baseShift, vehicleIdStr) =>
    copyVehicleToPkgHelper({ baseShift, vehicleIdStr, pendingFiltered, vehiclesById, setAssignSel, setDriverSel, pkgShiftIdsFor });

  const uiCopyDriverToPkg = (baseShift, driverIdStr) =>
    copyDriverToPkgHelper({ baseShift, driverIdStr, pendingFiltered, setDriverSel, pkgShiftIdsFor });

  const offersByShiftId = useMemo(() => buildOffersByShiftId(offers), [offers]);

  const vehiclesForRoom = useCallback((roomId) => listVehiclesForRoom(vehicles, roomId), [vehicles]);

  const driversForRoom = useCallback((roomId) => listDriversForRoom(drivers, roomId), [drivers]);

  const hydrateDispatchSelections = useCallback((shiftId, suggestions = []) => {
    hydrateDispatchSelectionsHelper(setDispatchEditSel, shiftId, suggestions);
  }, []);

  const setDispatchSelection = useCallback((shiftId, splitIndex, patch) => {
    setDispatchSelectionHelper(setDispatchEditSel, shiftId, splitIndex, patch);
  }, []);

  const selectedDispatchVehicleId = useCallback((shiftId, part) => {
    return selectedDispatchVehicleIdHelper(dispatchEditSel, shiftId, part);
  }, [dispatchEditSel]);

  const selectedDispatchDriverId = useCallback((shiftId, part) => {
    return selectedDispatchDriverIdHelper(dispatchEditSel, shiftId, part);
  }, [dispatchEditSel]);

  async function checkAvailabilityForShift(shift, vehicleId, driverId) {
    return checkRoomShiftAvailability({ api, token, avail, availInflight, setAvail, items, vehiclesById, vehiclesForRoom }, shift, vehicleId, driverId);
  }

  async function openRoutePreview(shift) {
    const sid = Number(shift?.id);
    if (!sid) return;

    setPreviewShift(shift);
    setPreviewStops([]);
    setPreviewPeople([]); // şimdilik boş
    setPreviewErr("");
    // M16.2: fetch'i modal yapıyor (route-preview); burada loading tutmuyoruz
    setPreviewLoading(false);
    setPreviewOpen(true);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const sid = Number(pendingPreviewShiftId || 0);
      if (!sid || !Array.isArray(items) || !items.length) return;
      const target = items.find((x) => Number(x?.id || 0) === sid);
      if (!target) return;
      setPendingPreviewShiftId(null);
      openRoutePreview(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [pendingPreviewShiftId, items]);

  async function loadAll() {
    return loadRoomShiftsPanelAll({
      api,
      token,
      setErr,
      setItems,
      setVehicles,
      setDrivers,
      setRooms,
      setOffers,
      setAssignSel,
      setDriverSel,
      setRoomOfferSel,
    });
  }

  async function loadShiftListOnly() {
    return loadRoomShiftsPanelShiftList({
      api,
      token,
      vehicles,
      setErr,
      setItems,
      setAssignSel,
      setDriverSel,
      setRoomOfferSel,
    });
  }

  async function loadReferenceDataOnly() {
    return loadRoomShiftsPanelReferenceData({
      api,
      token,
      items,
      setErr,
      setVehicles,
      setDrivers,
      setRooms,
      setDriverSel,
    });
  }

  async function loadOffersOnly() {
    return loadRoomShiftsPanelOffers({
      api,
      token,
      setErr,
      setOffers,
    });
  }

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  useEffect(() => {
    loadAllRef.current();
  }, []);

  useAutoReload("shifts", loadShiftListOnly);
  useAutoReload("vehicles", loadReferenceDataOnly);
  useAutoReload("drivers", loadReferenceDataOnly);
  useAutoReload("rooms", loadReferenceDataOnly);
  useAutoReload("offers", loadOffersOnly);

  const PENDING_STATUSES = useMemo(() => new Set(["DRAFT", "REQUESTED"]), []);
  const pendingBase = useMemo(
    () => items.filter((s) => PENDING_STATUSES.has(String(s.status))),
    [items, PENDING_STATUSES]
  );

  const pendingFiltered = useMemo(() => {
    let arr = [...pendingBase];
    if (pendingStatus !== "OPEN") {
      arr = arr.filter((s) => String(s.status) === pendingStatus);
    }
    arr = arr.filter((s) => matchShift(s, pendingQ));
    return arr;
  }, [pendingBase, pendingStatus, pendingQ]);

  const nonPendingBase = useMemo(
    () => items.filter((s) => !(String(s?.status || "") === "SPLIT" && !Number(s?.splitRootId || 0)) && !PENDING_STATUSES.has(String(s.status))),
    [items, PENDING_STATUSES]
  );

  const contractBase = useMemo(() => nonPendingBase.filter((s) => Number(s?.agreementId) > 0), [nonPendingBase]);

  const otherBase = useMemo(() => nonPendingBase.filter((s) => Number(s?.agreementId) <= 0), [nonPendingBase]);

  const contractFiltered = useMemo(() => contractBase.filter((s) => matchShift(s, contractQ)), [contractBase, contractQ]);

  const otherFiltered = useMemo(() => otherBase.filter((s) => matchShift(s, otherQ)), [otherBase, otherQ]);

  const tabCounts = useMemo(() => ({
    pending: pendingBase.length,
    contract: contractBase.length,
    other: otherBase.length,
  }), [pendingBase.length, contractBase.length, otherBase.length]);

  const defaultShiftsTab = useMemo(() => {
    if (tabCounts.pending > 0) return "pending";
    if (tabCounts.contract > 0) return "contract";
    return "other";
  }, [tabCounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSelectedShiftsTabRef.current) return;
      setShiftsTab(defaultShiftsTab);
    }, 0);
    return () => clearTimeout(timer);
  }, [defaultShiftsTab]);

  const activeTabFiltered = useMemo(() => {
    if (shiftsTab === "pending") return pendingFiltered;
    if (shiftsTab === "contract") return contractFiltered;
    return otherFiltered;
  }, [shiftsTab, pendingFiltered, contractFiltered, otherFiltered]);

  const preferredCopilotShift = useMemo(() => {
    const orderedPools = [
      activeTabFiltered,
      ...(shiftsTab === "pending"
        ? [contractFiltered, otherFiltered]
        : shiftsTab === "contract"
          ? [pendingFiltered, otherFiltered]
          : [pendingFiltered, contractFiltered]),
    ];
    const seen = new Set();
    for (const pool of orderedPools) {
      for (const shift of pool) {
        const sid = Number(shift?.id || 0);
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        const capacityMeta = buildCapacityMeta({ shift, vehicle: null, roomVehicles: vehiclesForRoom(shift?.roomId) });
        if (capacityMeta.dispatchRequired) return shift;
      }
    }
    return activeTabFiltered[0] || pendingFiltered[0] || contractFiltered[0] || otherFiltered[0] || null;
  }, [activeTabFiltered, shiftsTab, pendingFiltered, contractFiltered, otherFiltered, vehiclesForRoom]);

  const copilotShiftId = useMemo(
    () => Number(focusedTrackShiftId || 0) || Number(preferredCopilotShift?.id || 0) || null,
    [focusedTrackShiftId, preferredCopilotShift]
  );
  const copilotShift = useMemo(
    () => items.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0))
      || pendingFiltered.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0))
      || contractFiltered.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0))
      || otherFiltered.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0))
      || null,
    [items, pendingFiltered, contractFiltered, otherFiltered, copilotShiftId]
  );

  useEffect(() => {
    const sid = Number(copilotShift?.id || 0);
    const status = String(copilotShift?.status || "").toUpperCase();
    if (!sid || !["DRAFT", "REQUESTED"].includes(status)) return;
    loadDispatchPreviewRef.current?.(copilotShift, { force: false });
  }, [copilotShift]);

  useEffect(() => {
    if (!copilotShift) {
      clearCopilotSelection('/room/shifts');
      return;
    }
    const facts = buildShiftFacts({ shift: copilotShift, itemCount: pendingFiltered.length + contractFiltered.length + otherFiltered.length });
    setCopilotSelection({
      scopeKey: '/room/shifts',
      entityType: 'shift',
      entityId: Number(copilotShift?.id || 1103) || 1103,
      label: `Vardiya ID ${copilotShift.id}`,
      summary: [String(copilotShift?.status || '').toUpperCase() || '-', fmtTR(copilotShift?.startAt), fmtTR(copilotShift?.endAt)].filter(Boolean).join(' ? '),
      fields: [
        { label: 'Durum', value: String(copilotShift?.status || '-').toUpperCase(), help: 'Vardiyanın operasyon durumunu gösterir.' },
        { label: 'Saat', value: `${fmtTR(copilotShift?.startAt)} - ${fmtTR(copilotShift?.endAt)}`, help: 'Planlanan başlangıç ve bitiş saatini gösterir.' },
        { label: 'Araç', value: copilotShift?.vehicle?.plate || (copilotShift?.vehicleId ? `Araç ID ${copilotShift.vehicleId}` : '-'), help: 'Bağlı araç bilgisini gösterir.' },
        { label: 'Sürücü', value: copilotShift?.driver?.fullName || (copilotShift?.driverId ? `Sürücü ID ${copilotShift.driverId}` : '-'), help: 'Bağlı sürücü bilgisini gösterir.' },
        { label: 'Yolcu', value: String(shiftRequiredPax(copilotShift) || 0), help: 'Tahmini gerekli yolcu kapasitesini gösterir.' },
      ],
      badges: [
        ...(Number(copilotShift?.agreementId || 0) > 0 ? [{ label: 'Sözleşme', value: `Sözleşme ID ${copilotShift.agreementId}`, help: 'Bu vardiyanın sözleşme kaynaklı üretildiğini gösterir.' }] : []),
      ],
      facts });
  }, [copilotShift, pendingFiltered.length, contractFiltered.length, otherFiltered.length]);

  // keep mutable refs fresh without widening effect dependency sets
  checkAvailabilityForShiftRef.current = checkAvailabilityForShift;
  vehiclesForRoomRef.current = vehiclesForRoom;
  loadPoolSummaryRef.current = loadPoolSummary;
  loadDispatchPreviewRef.current = loadDispatchPreview;
  poolSummaryRef.current = poolSummary;

  // M14: bekleyen listede seçimler değiştikçe availability güncelle (throttle)

  useEffect(() => {
    if (!pendingFiltered?.length) return;

    let canceled = false;
    const t = setTimeout(async () => {
      for (const s of pendingFiltered) {
        if (canceled) return;
        const sid = Number(s.id);
        const vStr = assignSel[sid] || "";
        const dStr = driverSel[sid] || "";

        const vId = vStr ? Number(vStr) : null;
        const dId = dStr ? Number(dStr) : null;

        // araç seçili ama driver boşsa, araçtaki driverId'yi kullan (approve ile uyum)
        const autoD = vId ? (vehiclesById.get(Number(vId))?.driverId ? Number(vehiclesById.get(Number(vId))?.driverId) : null) : null;
        const effDriverId = dId ?? autoD;

        await checkAvailabilityForShiftRef.current?.(s, vId, effDriverId);
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [pendingFiltered, assignSel, driverSel, vehiclesById]);

  useEffect(() => {
    if (!pendingFiltered?.length) return;
    let canceled = false;

    (async () => {
      for (const s of pendingFiltered) {
        if (canceled) return;
        const sid = Number(s?.id);
        const marketOffer = offersByShiftId.get(sid) || null;
        const effectiveRoomId = effectiveShiftRoomId(s, marketOffer);
        const vId = assignSel[sid] ? Number(assignSel[sid]) : null;
        const vehicle = vId ? vehiclesById.get(vId) : null;
        const capacityMeta = buildCapacityMeta({
          shift: s,
          vehicle,
          roomVehicles: vehiclesForRoomRef.current?.(effectiveRoomId) || [] });
        if (capacityMeta.dispatchRequired && effectiveRoomId && !poolSummaryRef.current[sid] && !poolInflight.current.has(sid)) {
          await loadPoolSummaryRef.current?.(s);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [pendingFiltered, assignSel, vehiclesById, offersByShiftId]);

  async function loadPoolSummary(shift, { force = false } = {}) {
    const sid = Number(shift?.id);
    if (!sid) return null;

    if (!force) {
      const cached = poolSummary[sid];
      if (cached?.status === "ok" && cached?.data) return cached.data;
      if (poolInflight.current.has(sid)) return null;
    }

    poolInflight.current.add(sid);
    setPoolSummary((prev) => ({
      ...prev,
      [sid]: { ...(prev[sid] || {}), status: "loading", error: "" } }));

    try {
      const data = await api(`/api/availability/pool?shiftId=${sid}`, { token });
      setPoolSummary((prev) => ({ ...prev, [sid]: { status: "ok", data } }));
      return data;
    } catch (e) {
      const msg = String(e?.message || e || "Havuz özeti alınamadı.");
      setPoolSummary((prev) => ({ ...prev, [sid]: { status: "error", error: msg } }));
      return null;
    } finally {
      poolInflight.current.delete(sid);
    }
  }

  async function loadDispatchPreview(shift, { force = false } = {}) {
    const sid = Number(shift?.id);
    if (!sid) return null;
    if (!force) {
      const cached = dispatchPreview[sid];
      if (cached?.status === "ok" && cached?.data) {
        hydrateDispatchSelections(sid, cached.data?.suggestions || []);
        return cached.data;
      }
      if (dispatchInflight.current.has(sid)) return null;
    }
    dispatchInflight.current.add(sid);
    setDispatchPreview((prev) => ({
      ...prev,
      [sid]: { ...(prev[sid] || {}), status: "loading", error: "" } }));
    try {
      const data = await api(`/api/shifts/${sid}/dispatch-preview`, { token });
      setDispatchPreview((prev) => ({ ...prev, [sid]: { status: "ok", data } }));
      hydrateDispatchSelections(sid, data?.suggestions || []);
      return data;
    } catch (e) {
      const msg = getApiErrorMessage(e, "Dispatch önizleme alınamadı.");
      setDispatchPreview((prev) => ({ ...prev, [sid]: { status: "error", error: msg } }));
      return null;
    } finally {
      dispatchInflight.current.delete(sid);
    }
  }

  function openDispatchSuggestionPreview(shift, suggestion) {
    if (!suggestion) return;
    const vehicleId = selectedDispatchVehicleId(shift?.id, suggestion);
    const driverId = selectedDispatchDriverId(shift?.id, suggestion);
    const vehicle = vehiclesById.get(Number(vehicleId)) || suggestion?.vehicle || null;
    const driver = driversById.get(Number(driverId)) || suggestion?.driver || null;
    setPreviewShift({
      ...(shift || {}),
      id: `${shift?.id || ""}-${suggestion?.splitIndex || ""}`,
      requiredPaxOverride: Number(suggestion?.allocatedPax || 0),
      requiredPax: Number(suggestion?.allocatedPax || 0),
      vehicleId: vehicleId || null,
      driverId: driverId || null,
      vehicle,
      driver });
    setPreviewStops(Array.isArray(suggestion?.stops) ? suggestion.stops : []);
    setPreviewPeople([]);
    setPreviewSummary(suggestion?.summary || null);
    setPreviewPathPoints(Array.isArray(suggestion?.path?.points) ? suggestion.path.points : null);
    setPreviewSource(suggestion?.path?.source || suggestion?.routeSource || null);
    setPreviewErr("");
    setPreviewLoading(false);
    setPreviewOpen(true);
  }

  async function autoSplitApprove(shift) {
    return autoSplitApproveAction({
      setBusy,
      setErr,
      loadPoolSummary,
      loadDispatchPreview,
      selectedDispatchVehicleId,
      selectedDispatchDriverId,
      api,
      token,
      invalidate,
      loadAll,
      getApiErrorMessage }, shift);
  }

  async function approveShift(shift) {
    return approveShiftAction({
      assignSel,
      driverSel,
      vehiclesById,
      buildCapacityMeta,
      vehiclesForRoom,
      setErr,
      avail,
      checkAvailabilityForShift,
      setBusy,
      api,
      token,
      invalidate,
      loadAll,
      setAvail,
      normalizeErr,
      makeSig: makeAvailabilitySig }, shift);
  }

  async function rejectShift(shift) {
    return rejectShiftAction({ setBusy, setErr, api, token, invalidate, loadAll, getApiErrorMessage }, shift);
  }

  async function submitReassign(payload) {
    return submitReassignAction({ reassignModal, setBusy, setErr, api, invalidate, loadAll, getApiErrorMessage, setReassignModal, setOpsEventsModal }, payload);
  }

  function openReassignModal(shift) {
    setReassignModal({ open: true, shift });
  }

  function openOpsEvents(shiftId) {
    setOpsEventsModal({ open: true, shiftId: Number(shiftId) || null });
  }

  return (
    <div className="roomCriticalFixScope roomShiftsDensityScope">
      <RoomShiftsOverviewSection
        err={err}
        pendingCount={tabCounts.pending}
        contractCount={tabCounts.contract}
        otherCount={tabCounts.other}
        copilotShift={copilotShift}
        autoSplitApprove={autoSplitApprove}
      />

      <RoomShiftsMainSections
        activeTab={shiftsTab}
        onChangeTab={(tab) => selectShiftsTab(tab)}
        tabCounts={tabCounts}
        pendingStatus={pendingStatus}
        setPendingStatus={setPendingStatus}
        pendingQ={pendingQ}
        setPendingQ={setPendingQ}
        pendingFiltered={pendingFiltered}
        contractQ={contractQ}
        setContractQ={setContractQ}
        contractFiltered={contractFiltered}
        otherQ={otherQ}
        setOtherQ={setOtherQ}
        otherFiltered={otherFiltered}
        offersByShiftId={offersByShiftId}
        effectiveShiftRoomId={effectiveShiftRoomId}
        vehiclesForRoom={vehiclesForRoom}
        assignSel={assignSel}
        vehiclesById={vehiclesById}
        showAvailableOnly={showAvailableOnly}
        isDriverAvailableForShift={isDriverAvailableForShift}
        isVehicleAvailableForShift={isVehicleAvailableForShift}
        driversById={driversById}
        driverSel={driverSel}
        avail={avail}
        busy={busy}
        openRoutePreview={openRoutePreview}
        setAssignSel={setAssignSel}
        setDriverSel={setDriverSel}
        drivers={drivers}
        uiCopyVehicleToPkg={uiCopyVehicleToPkg}
        uiCopyDriverToPkg={uiCopyDriverToPkg}
        toggleAvailable={toggleAvailable}
        roomsById={roomsById}
        approveShift={approveShift}
        rejectShift={rejectShift}
        setFocusedTrackShiftId={setFocusedTrackShiftId}
        copilotShiftId={copilotShiftId}
        poolSummary={poolSummary}
        dispatchPreview={dispatchPreview}
        dispatchEditSel={dispatchEditSel}
        getDispatchSelectionStates={getDispatchSelectionStatesHelper}
        driversForRoom={driversForRoom}
        selectedDispatchVehicleId={selectedDispatchVehicleId}
        selectedDispatchDriverId={selectedDispatchDriverId}
        buildDispatchVirtualShift={buildDispatchVirtualShiftHelper}
        setDispatchSelection={setDispatchSelection}
        openDispatchSuggestionPreview={openDispatchSuggestionPreview}
        loadPoolSummary={loadPoolSummary}
        loadDispatchPreview={loadDispatchPreview}
        autoSplitApprove={autoSplitApprove}
        copilotShift={copilotShift}
        items={items}
        extendNoteSel={extendNoteSel}
        setExtendNote={setExtendNote}
        decideExtend={decideExtend}
        openOpsEvents={openOpsEvents}
        openReassignModal={openReassignModal}
      />

      <RoomShiftsModalSection
        previewOpen={previewOpen}
        previewErr={previewErr}
        previewShift={previewShift}
        previewSubtitle={previewRegionLabel}
        previewStops={previewStops}
        previewPeople={previewPeople}
        previewSummary={previewSummary}
        previewPathPoints={previewPathPoints}
        previewSource={previewSource}
        previewLoading={previewLoading}
        onClosePreview={() => {
          setPreviewOpen(false);
          setPreviewShift(null);
          setPreviewStops([]);
          setPreviewPeople([]);
          setPreviewSummary(null);
          setPreviewPathPoints(null);
          setPreviewSource(null);
          setPreviewErr("");
          setPreviewLoading(false);
        }}
        reassignModal={reassignModal}
        reassignSubtitle={reassignRegionLabel}
        vehicles={vehicles}
        drivers={drivers}
        busy={busy}
        onCloseReassign={() => setReassignModal({ open: false, shift: null })}
        onSubmitReassign={submitReassign}
        opsEventsModal={opsEventsModal}
        opsEventsSubtitle={opsEventsRegionLabel}
        onCloseOpsEvents={() => setOpsEventsModal({ open: false, shiftId: null })}
      />
    </div>
  );
}
