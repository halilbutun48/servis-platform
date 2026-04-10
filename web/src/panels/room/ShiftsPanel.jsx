// web/src/panels/room/ShiftsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import ShiftReassignModal from "../../components/ShiftReassignModal";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
import { getApiErrorMessage } from "../../utils/apiContract";
import {
  buildCapacityMeta,
  formatShiftDateTimeTR as fmtTR,
  normalizeRoomShiftError as normalizeErr,
  overlaps,
  shiftRequiredPax,
  trimOrNull,
} from "./roomShiftsPanelUtils";
import {
  RoomDispatchPoolSummary,
  RoomPendingSection,
  RoomFinalListSection } from "./roomShiftsPanelSections";
import { autoSplitApproveAction, approveShiftAction, rejectShiftAction, submitReassignAction } from "./roomShiftsPanelActions";

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

  // Bekleyen filtreleri
  const [pendingStatus, setPendingStatus] = useState("OPEN"); // OPEN | REQUESTED | DRAFT
  const [pendingQ, setPendingQ] = useState("");
  const [onlyAgreement, setOnlyAgreement] = useState(false);

  // Tüm shifts filtreleri
  const [listStatus, setListStatus] = useState("OPEN"); // OPEN | ALL | REQUESTED | APPROVED | ACTIVE | DONE | REJECTED | DRAFT
  const [listQ, setListQ] = useState("");
  const [focusedTrackShiftId, setFocusedTrackShiftId] = useState(null);

  // M28/M63-R3A: offers inbox -> ilgili satira hizli gecis
  useEffect(() => {
    const pendingRaw = localStorage.getItem("room:focusPendingShiftId");
    if (pendingRaw) {
      localStorage.removeItem("room:focusPendingShiftId");
      const sid = String(pendingRaw || "").trim();
      if (sid) {
        setPendingStatus("REQUESTED");
        setPendingQ(sid);
        return;
      }
    }

    const raw = localStorage.getItem("room:focusShiftId");
    if (!raw) return;
    localStorage.removeItem("room:focusShiftId");
    const sid = String(raw || "").trim();
    if (!sid) return;
    setListStatus("ALL");
    setListQ(sid);
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

  // M16: Haritada Önizleme (modal)
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

  function toggleAvailable(shiftId) {
    setShowAvailableOnly((p) => ({ ...p, [Number(shiftId)]: !p[Number(shiftId)] }));
  }

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

  
  // M61_UI_COPY — Paket içi hızlı doldurma (sadece UI)
  // Not: Bu kopyalama sadece dropdown değerlerini kopyalar; backend’e kayıt atmaz.
  const pkgKeyOfShift = (sh) => {
    const cid = Number(sh?.companyId ?? sh?.company?.id ?? 0);
    const t0 =
      sh?.createdAt ? new Date(sh.createdAt).getTime() :
      sh?.startAt ? new Date(sh.startAt).getTime() :
      0;
    const bucket = Number.isFinite(t0) ? Math.floor(t0 / 60000) : 0;
    return `${cid}:${bucket}`;
  };

  const pkgShiftIdsFor = (baseShift) => {
    const key = pkgKeyOfShift(baseShift);
    const arr = (pendingFiltered || []).filter((x) => pkgKeyOfShift(x) === key);
    return arr.map((x) => Number(x.id)).filter(Number.isFinite);
  };

  const uiCopyVehicleToPkg = (baseShift, vehicleIdStr) => {
    const vidStr = String(vehicleIdStr || "");
    if (!vidStr) return;
    const ids = pkgShiftIdsFor(baseShift);
    if (ids.length <= 1) return;

    setAssignSel((prev) => {
      const next = { ...(prev || {}) };
      for (const id of ids) next[id] = vidStr;
      return next;
    });

    // araç driver'ı varsa ve satırda manuel driver yoksa doldur
    const vid = Number(vidStr);
    const vv = Number.isFinite(vid) ? vehiclesById.get(vid) : null;
    const autoDid = vv?.driverId ? String(vv.driverId) : "";
    if (autoDid) {
      setDriverSel((prev) => {
        const next = { ...(prev || {}) };
        for (const id of ids) {
          if (!next[id]) next[id] = autoDid;
        }
        return next;
      });
    }
  };

  const uiCopyDriverToPkg = (baseShift, driverIdStr) => {
    const didStr = String(driverIdStr || "");
    if (!didStr) return;
    const ids = pkgShiftIdsFor(baseShift);
    if (ids.length <= 1) return;

    setDriverSel((prev) => {
      const next = { ...(prev || {}) };
      for (const id of ids) next[id] = didStr;
      return next;
    });
  };
const offersByShiftId = useMemo(() => {
    const m = new Map();
    for (const o of offers || []) {
      const sid = Number(o?.shiftId);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      // unique per (shiftId, roomId)
      m.set(sid, o);
    }
    return m;
  }, [offers]);

  function effectiveShiftRoomId(shift, marketOffer = null) {
    const shiftRoomId = Number(shift?.roomId || 0);
    if (shiftRoomId > 0) return shiftRoomId;
    const offerRoomId = Number(marketOffer?.roomId || 0);
    if (offerRoomId > 0) return offerRoomId;
    return null;
  }

  function matchShift(s, qRaw) {
    const q = String(qRaw ?? "").trim().toLowerCase();
    if (!q) return true;

    const parts = [
      s?.id,
      s?.status,
      s?.company?.name,
      s?.vehicle?.plate,
      s?.driver?.fullName,
      s?.companyOfferNote,
      s?.roomOfferNote,
      s?.roomOfferDecision,
      s?.roomOfferDecisionNote,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return parts.includes(q);
  }

  // “müsait araç” hesabı (UI local): aynı zaman aralığında APPROVED/ACTIVE shift’i olan araç müsait değildir
  function isVehicleAvailableForShift(vehicleId, shift) {
    const vId = Number(vehicleId);
    if (!Number.isFinite(vId)) return false;

    const blockers = items.filter((x) => {
      if (!x?.vehicleId) return false;
      if (Number(x.vehicleId) !== vId) return false;
      const st = String(x.status || "");
      if (!["APPROVED", "ACTIVE"].includes(st)) return false;
      if (Number(x.id) === Number(shift.id)) return false;
      return overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
    });

    return blockers.length === 0;
  }

  function isDriverAvailableForShift(driverId, shift) {
    const dId = Number(driverId);
    if (!Number.isFinite(dId)) return false;

    const blockers = items.filter((x) => {
      if (!x?.driverId) return false;
      if (Number(x.driverId) !== dId) return false;
      const st = String(x.status || "");
      if (!["APPROVED", "ACTIVE"].includes(st)) return false;
      if (Number(x.id) === Number(shift.id)) return false;
      return overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
    });

    return blockers.length === 0;
  }

  function vehiclesForRoom(roomId) {
    const rid = Number(roomId);
    return vehicles
      .filter((v) => !v?.roomId || Number(v.roomId) === rid)
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  function driversForRoom(roomId) {
    const rid = Number(roomId);
    return drivers
      .filter((d) => !d?.roomId || Number(d.roomId) === rid)
      .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  }

  function hydrateDispatchSelections(shiftId, suggestions = []) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    setDispatchEditSel((prev) => {
      const base = { ...(prev[sid] || {}) };
      for (const part of suggestions || []) {
        const idx = Number(part?.splitIndex || 0);
        if (!idx) continue;
        base[idx] = {
          vehicleId: Number(base[idx]?.vehicleId || part?.vehicleId || 0) || "",
          driverId: Number(base[idx]?.driverId || part?.driverId || 0) || "" };
      }
      return { ...prev, [sid]: base };
    });
  }

  function setDispatchSelection(shiftId, splitIndex, patch) {
    const sid = Number(shiftId || 0);
    const idx = Number(splitIndex || 0);
    if (!sid || !idx) return;
    setDispatchEditSel((prev) => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || {}),
        [idx]: {
          ...(prev[sid]?.[idx] || {}),
          ...(patch || {}) } } }));
  }

  function selectedDispatchVehicleId(shiftId, part) {
    const sid = Number(shiftId || 0);
    const idx = Number(part?.splitIndex || 0);
    const v = dispatchEditSel?.[sid]?.[idx]?.vehicleId;
    return Number(v || part?.vehicleId || 0) || 0;
  }

  function selectedDispatchDriverId(shiftId, part) {
    const sid = Number(shiftId || 0);
    const idx = Number(part?.splitIndex || 0);
    const d = dispatchEditSel?.[sid]?.[idx]?.driverId;
    return Number(d || part?.driverId || 0) || 0;
  }

  function buildDispatchVirtualShift(shift, allocatedPax) {
    const pax = Number(allocatedPax || 0) || 0;
    return {
      ...(shift || {}),
      requiredPax: pax,
      requiredPaxOverride: pax,
      assignmentCount: pax,
      peopleCount: pax };
  }

  function getDispatchSelectionStates(shift, suggestions = []) {
    const sid = Number(shift?.id || 0);
    const vehicleCounts = new Map();
    const driverCounts = new Map();
    const selRows = (suggestions || []).map((part) => ({
      splitIndex: Number(part?.splitIndex || 0),
      allocatedPax: Number(part?.allocatedPax || 0),
      vehicleId: selectedDispatchVehicleId(sid, part),
      driverId: selectedDispatchDriverId(sid, part),
      part }));
    for (const row of selRows) {
      if (row.vehicleId) vehicleCounts.set(row.vehicleId, (vehicleCounts.get(row.vehicleId) || 0) + 1);
      if (row.driverId) driverCounts.set(row.driverId, (driverCounts.get(row.driverId) || 0) + 1);
    }
    const result = {};
    for (const row of selRows) {
      const vDup = row.vehicleId && (vehicleCounts.get(row.vehicleId) || 0) > 1;
      const dDup = row.driverId && (driverCounts.get(row.driverId) || 0) > 1;
      if (vDup) {
        result[row.splitIndex] = { status: "conflict", code: "DUPLICATE_VEHICLE", message: "Aynı araç başka öneride de seçili." };
        continue;
      }
      if (dDup) {
        result[row.splitIndex] = { status: "conflict", code: "DUPLICATE_DRIVER", message: "Aynı şoför başka öneride de seçili." };
        continue;
      }
      const virtualShift = buildDispatchVirtualShift(shift, row.allocatedPax);
      result[row.splitIndex] = localAvailability({ shift: virtualShift, vehicleId: row.vehicleId, driverId: row.driverId });
    }
    return result;
  }

  function makeSig({ shift, vehicleId, driverId }) {
    return [
      String(vehicleId || ""),
      String(driverId || ""),
      String(shift?.startAt || ""),
      String(shift?.endAt || ""),
    ].join("|");
  }

  function localAvailability({ shift, vehicleId, driverId }) {
    if (!vehicleId || !driverId) {
      return { status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." };
    }

    const vehicle = vehiclesById.get(Number(vehicleId)) || null;
    const capacity = buildCapacityMeta({
      shift,
      vehicle,
      roomVehicles: vehiclesForRoom(shift?.roomId) });
    if (capacity.blockCode) {
      return {
        status: "conflict",
        code: capacity.blockCode,
        message: capacity.blockMessage };
    }

    const dOk = isDriverAvailableForShift(driverId, shift);
    if (!dOk) {
      const conflictingShift = items.find((x) => {
        if (Number(x.id) === Number(shift.id)) return false;
        const st = String(x.status || "");
        if (!["APPROVED", "ACTIVE"].includes(st)) return false;
        return (
          Number(x.driverId) === Number(driverId) &&
          overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt)
        );
      });
      return {
        status: "conflict",
        code: "DRIVER_CONFLICT",
        message: "Driver aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: conflictingShift || null };
    }

    const vOk = isVehicleAvailableForShift(vehicleId, shift);
    if (!vOk) {
      const conflictingShift = items.find((x) => {
        if (Number(x.id) === Number(shift.id)) return false;
        const st = String(x.status || "");
        if (!["APPROVED", "ACTIVE"].includes(st)) return false;
        return (
          Number(x.vehicleId) === Number(vehicleId) &&
          overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt)
        );
      });
      return {
        status: "conflict",
        code: "VEHICLE_CONFLICT",
        message: "Araç aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: conflictingShift || null };
    }

    return { status: "ok", code: "OK", message: "Uygun." };
  }

  async function remoteAvailability({ shift, vehicleId, driverId }) {
    // backend’de varsa: GET /api/availability?vehicleId=..&driverId=..&startAt=..&endAt=..
    const qs = new URLSearchParams({
      vehicleId: String(vehicleId),
      driverId: String(driverId),
      startAt: String(shift.startAt),
      endAt: String(shift.endAt),
      shiftId: String(shift.id),
      excludeShiftId: String(shift.id) }).toString();

    const r = await api(`/api/availability?${qs}`, { token });

    // olası formatlar:
    // { ok:true }
    // { ok:false, code, message, conflictingShift }
    // { available:true/false, ... }
    if (r && typeof r === "object") {
      if (r.ok === true || r.available === true) return { status: "ok", code: "OK", message: "Uygun.", source: "remote" };
      if (r.ok === false || r.available === false) {
        return {
          status: "conflict",
          code: r.code || "CONFLICT",
          message: r.message || "Çakışma.",
          conflictingShift: r.conflictingShift || r.conflict || null,
          source: "remote" };
      }
      // başka payload: {code,message,...}
      if (r.code && (String(r.code).includes("CONFLICT") || String(r.code).includes("OVERLAP") || String(r.code).includes("CAPACITY"))) {
        return {
          status: "conflict",
          code: r.code,
          message: r.message || "Çakışma.",
          conflictingShift: r.conflictingShift || null,
          source: "remote" };
      }
      if (r.code || r.message) {
        return {
          status: "error",
          code: r.code || "REMOTE_ERROR",
          message: r.message || "Availability hata.",
          source: "remote" };
      }
    }

    return { status: "error", code: "REMOTE_BAD_RESPONSE", message: "Availability: beklenmeyen response.", source: "remote" };
  }

  async function checkAvailabilityForShift(shift, vehicleId, driverId) {
    const sid = Number(shift.id);
    const sig = makeSig({ shift, vehicleId, driverId });

    // sig değişmediyse tekrar etme
    const prev = avail[sid];
    if (prev?.sig === sig && prev?.status && prev.status !== "checking") return;

    // seçim eksik
    if (!vehicleId || !driverId) {
      setAvail((p) => ({
        ...p,
        [sid]: { sig, status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." } }));
      return;
    }

    // inflight tekilleştirme
    const inflightKey = `${sid}|${sig}`;
    if (availInflight.current.has(inflightKey)) return;
    availInflight.current.add(inflightKey);

    setAvail((p) => ({
      ...p,
      [sid]: { sig, status: "checking", code: "CHECKING", message: "Kontrol ediliyor..." } }));

    try {
      // önce remote dene; 404 vb. olursa local fallback
      let out = null;
      try {
        out = await remoteAvailability({ shift, vehicleId, driverId });
      } catch (e) {
        const ne = normalizeErr(e);
        const m = (ne?.message || "").toLowerCase();
        const looks404 = m.includes("404") || m.includes("not found") || m.includes("cannot get") || m.includes("no route");
        if (looks404) {
          out = { ...localAvailability({ shift, vehicleId, driverId }), source: "local" };
        } else {
          out = { ...localAvailability({ shift, vehicleId, driverId }), source: "local" };
          if (out.status === "ok") out = { ...out, message: "Uygun (local)." };
        }
      }

      if (!out) out = { status: "error", code: "AVAIL_UNKNOWN", message: "Uygunluk durumu belirlenemedi." };

      setAvail((p) => ({
        ...p,
        [sid]: {
          sig,
          status: out.status || "error",
          code: out.code || null,
          message: out.message || "",
          conflictingShift: out.conflictingShift || null,
          source: out.source || "local" } }));
    } finally {
      availInflight.current.delete(inflightKey);
    }
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

  async function load() {
    setErr("");
    try {
      const [sh, veh, drv, rm, off] = await Promise.all([
        // ✅ includeOffered=1: market/offered shift'leri de getir (shift.roomId null olsa bile)
        api("/api/shifts?take=200&includeOffered=1", { token }),
        api("/api/vehicles", { token }),
        api("/api/drivers", { token }).catch(() => ({ items: [] })), // bazı ortamlarda yoksa kırma
        api("/api/rooms", { token }).catch(() => ({ items: [] })), // ROOM yetkisi var ama yoksa kırma
        api("/api/offers/inbox?status=OPEN,COUNTERED,ACCEPTED&take=300", { token }).catch(() => ({ items: [] })),
      ]);

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
      const dlist = Array.isArray(drv) ? drv : drv?.items ?? [];
      const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];

      const olist = Array.isArray(off) ? off : off?.items ?? [];

      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

      setItems(list);
      setVehicles(vlist);
      setDrivers(dlist);
      setRooms(rlist);
      setOffers(Array.isArray(olist) ? olist : []);

      // satır seçimleri init (var olanı ezme)
      setAssignSel((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const s of list) {
          const sid = Number(s.id);
          if (next[sid] !== undefined) continue;

          // default: companyOfferVehicleId varsa onu seç, yoksa boş
          next[sid] = s.companyOfferVehicleId ? String(s.companyOfferVehicleId) : "";
          changed = true;
        }
        return changed ? next : prev;
      });

      // driver seçimleri init (var olanı ezme)
      const vMap = new Map(vlist.map((v) => [Number(v.id), v]));
      setDriverSel((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const s of list) {
          const sid = Number(s.id);
          if (next[sid] !== undefined) continue;

          const vid = s.vehicleId ?? s.companyOfferVehicleId ?? null;
          const vv = vid ? vMap.get(Number(vid)) : null;
          const did = s.driverId ?? vv?.driverId ?? null;

          next[sid] = did ? String(did) : "";
          changed = true;
        }
        return changed ? next : prev;
      });

      // roomOffer form init (var olanı ezme)
      setRoomOfferSel((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const s of list) {
          const sid = Number(s.id);
          if (next[sid]) continue;

          next[sid] = {
            roomOfferVehicleId: s.roomOfferVehicleId ? String(s.roomOfferVehicleId) : "",
            roomOfferAmount: s.roomOfferAmount != null ? String(s.roomOfferAmount) : "",
            roomOfferNote: s.roomOfferNote ?? "",
            notifyDriver: Boolean(s.roomOfferToDriver),
            driverNote: s.roomOfferDriverNote ?? "" };
          changed = true;
        }
        return changed ? next : prev;
      });
    } catch (e) {
      const ne = normalizeErr(e);
      setErr(ne.code === "ACTIVE_NO_SHOW_PENALTY" ? "Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz." : ne.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoReload("shifts", load);
  useAutoReload("drivers", load);
  useAutoReload("rooms", load);

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
    if (onlyAgreement) arr = arr.filter((s) => Number(s.agreementId) > 0);
    arr = arr.filter((s) => matchShift(s, pendingQ));
    return arr;
  }, [pendingBase, pendingStatus, pendingQ, onlyAgreement]);

  const listBase = useMemo(
    () => items.filter((s) => !(String(s?.status || "") === "SPLIT" && !Number(s?.splitRootId || 0))),
    [items]
  );

  const listFiltered = useMemo(() => {
    let arr = [...listBase];

    if (listStatus === "OPEN") {
      arr = arr.filter((s) => ["APPROVED", "ACTIVE"].includes(String(s.status)));
    } else if (listStatus !== "ALL") {
      arr = arr.filter((s) => String(s.status) === listStatus);
    }

    if (onlyAgreement) arr = arr.filter((s) => Number(s.agreementId) > 0);
    arr = arr.filter((s) => matchShift(s, listQ));
    return arr;
  }, [listBase, listStatus, listQ, onlyAgreement]);

  const copilotShiftId = useMemo(
    () => Number(focusedTrackShiftId || 0) || Number(pendingFiltered[0]?.id || listFiltered[0]?.id || 0) || null,
    [focusedTrackShiftId, pendingFiltered, listFiltered]
  );
  const copilotShift = useMemo(
    () => items.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0)) || pendingFiltered.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0)) || listFiltered.find((x) => Number(x?.id || 0) === Number(copilotShiftId || 0)) || null,
    [items, pendingFiltered, listFiltered, copilotShiftId]
  );

  useEffect(() => {
    if (!copilotShift) {
      clearCopilotSelection('/room/shifts');
      return;
    }
    const facts = buildShiftFacts({ shift: copilotShift, itemCount: pendingFiltered.length + listFiltered.length });
    setCopilotSelection({
      scopeKey: '/room/shifts',
      entityType: 'shift',
      entityId: Number(copilotShift?.id || 1103) || 1103,
      label: `Vardiya #${copilotShift.id}`,
      summary: [String(copilotShift?.status || '').toUpperCase() || '-', fmtTR(copilotShift?.startAt), fmtTR(copilotShift?.endAt)].filter(Boolean).join(' • '),
      fields: [
        { label: 'Durum', value: String(copilotShift?.status || '-').toUpperCase(), help: 'Vardiyanın operasyon durumunu gösterir.' },
        { label: 'Saat', value: `${fmtTR(copilotShift?.startAt)} → ${fmtTR(copilotShift?.endAt)}`, help: 'Planlanan başlangıç ve bitiş saatini gösterir.' },
        { label: 'Araç', value: copilotShift?.vehicle?.plate || (copilotShift?.vehicleId ? `#${copilotShift.vehicleId}` : '-'), help: 'Bağlı araç bilgisini gösterir.' },
        { label: 'Sürücü', value: copilotShift?.driver?.fullName || (copilotShift?.driverId ? `#${copilotShift.driverId}` : '-'), help: 'Bağlı sürücü bilgisini gösterir.' },
        { label: 'Yolcu', value: String(shiftRequiredPax(copilotShift) || 0), help: 'Tahmini gerekli yolcu kapasitesini gösterir.' },
      ],
      badges: [
        ...(Number(copilotShift?.agreementId || 0) > 0 ? [{ label: 'Sözleşme', value: `#${copilotShift.agreementId}`, help: 'Bu vardiyanın sözleşme kaynaklı üretildiğini gösterir.' }] : []),
      ],
      facts });
  }, [copilotShift, pendingFiltered.length, listFiltered.length]);

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

        // araç seçili ama driver boşsa, araçtaki driverId’yi kullan (approve ile uyum)
        const autoD = vId ? (vehiclesById.get(Number(vId))?.driverId ? Number(vehiclesById.get(Number(vId))?.driverId) : null) : null;
        const effDriverId = dId ?? autoD;

        await checkAvailabilityForShift(s, vId, effDriverId);
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          roomVehicles: vehiclesForRoom(effectiveRoomId) });
        if (capacityMeta.dispatchRequired && effectiveRoomId && !poolSummary[sid] && !poolInflight.current.has(sid)) {
          await loadPoolSummary(s);
        }
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (cached?.status === "ok" && cached?.data) return cached.data;
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

  function renderPoolSummary(shift, capacityMeta, effectiveRoomId = null) {
    return (
      <RoomDispatchPoolSummary
        shift={shift}
        capacityMeta={capacityMeta}
        effectiveRoomId={effectiveRoomId}
        poolSummary={poolSummary}
        dispatchPreview={dispatchPreview}
        getDispatchSelectionStates={getDispatchSelectionStates}
        vehiclesForRoom={vehiclesForRoom}
        driversForRoom={driversForRoom}
        selectedDispatchVehicleId={selectedDispatchVehicleId}
        selectedDispatchDriverId={selectedDispatchDriverId}
        vehiclesById={vehiclesById}
        driversById={driversById}
        buildDispatchVirtualShift={buildDispatchVirtualShift}
        setDispatchSelection={setDispatchSelection}
        openDispatchSuggestionPreview={openDispatchSuggestionPreview}
        loadPoolSummary={loadPoolSummary}
        loadDispatchPreview={loadDispatchPreview}
        autoSplitApprove={autoSplitApprove}
        busy={busy}
      />
    );
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
      load,
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
      load,
      setAvail,
      normalizeErr,
      makeSig }, shift);
  }

  async function rejectShift(shift) {
    return rejectShiftAction({ setBusy, setErr, api, token, invalidate, load, getApiErrorMessage }, shift);
  }

  async function submitReassign(payload) {
    return submitReassignAction({ reassignModal, setBusy, setErr, api, invalidate, load, getApiErrorMessage, setReassignModal, setOpsEventsModal }, payload);
  }

  function openReassignModal(shift) {
    setReassignModal({ open: true, shift });
  }

  function openOpsEvents(shiftId) {
    setOpsEventsModal({ open: true, shiftId: Number(shiftId) || null });
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (ROOM)</h3>
        <div className="muted">Company request → Room approve (vehicle+driver) + opsiyonel pazarlık</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <RoomPendingSection
        pendingStatus={pendingStatus}
        setPendingStatus={setPendingStatus}
        pendingQ={pendingQ}
        setPendingQ={setPendingQ}
        onlyAgreement={onlyAgreement}
        setOnlyAgreement={setOnlyAgreement}
        pendingFiltered={pendingFiltered}
        offersByShiftId={offersByShiftId}
        effectiveShiftRoomId={effectiveShiftRoomId}
        vehiclesForRoom={vehiclesForRoom}
        assignSel={assignSel}
        vehiclesById={vehiclesById}
        showAvailableOnly={showAvailableOnly}
        isVehicleAvailableForShift={isVehicleAvailableForShift}
        driversById={driversById}
        driverSel={driverSel}
        avail={avail}
        busy={busy}
        openRoutePreview={openRoutePreview}
        renderPoolSummary={renderPoolSummary}
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
      />

      <RoomFinalListSection
        listStatus={listStatus}
        setListStatus={setListStatus}
        listQ={listQ}
        setListQ={setListQ}
        onlyAgreement={onlyAgreement}
        setOnlyAgreement={setOnlyAgreement}
        copilotShift={copilotShift}
        listFiltered={listFiltered}
        items={items}
        offersByShiftId={offersByShiftId}
        vehiclesById={vehiclesById}
        extendNoteSel={extendNoteSel}
        setExtendNote={setExtendNote}
        busy={busy}
        decideExtend={decideExtend}
        openOpsEvents={openOpsEvents}
        openReassignModal={openReassignModal}
        setFocusedTrackShiftId={setFocusedTrackShiftId}
        copilotShiftId={copilotShiftId}
      />

      {/* Preview error/info (modal dışında küçük banner) */}
      {previewOpen && previewErr ? (
        <div className="card err" style={{ marginTop: 10 }}>
          Harita Önizleme: {previewErr}
        </div>
      ) : null}

      <ShiftReassignModal
        open={reassignModal.open}
        shift={reassignModal.shift}
        vehicles={vehicles}
        drivers={drivers}
        busy={busy}
        onClose={() => setReassignModal({ open: false, shift: null })}
        onSubmit={submitReassign}
      />

      <ShiftOperationEventsModal
        open={opsEventsModal.open}
        shiftId={opsEventsModal.shiftId}
        onClose={() => setOpsEventsModal({ open: false, shiftId: null })}
      />

      <RoutePreviewModal
        open={previewOpen}
        onClose={() => {
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
        title={
          previewShift
            ? `Shift #${previewShift.id} — Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
            : `Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
        }
        shiftId={typeof previewShift?.id === "number" ? previewShift?.id : null}
        stops={previewStops}
        people={previewPeople}
        previewSummary={previewSummary}
        previewPathPoints={previewPathPoints}
        previewSource={previewSource}
        previewShift={previewShift}
      />
    </div>
  );
}
