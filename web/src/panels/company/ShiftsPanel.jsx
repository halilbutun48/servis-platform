// web/src/panels/company/ShiftsPanel.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { PRESET_TEMPLATES } from "./ShiftTemplatesPanel";
import { getPath, navigate } from "../../router";
import { companyPath } from "../../utils/paths";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
import { fetchProviderScoreMap } from "../../utils/providerScores";
import { getCompanyAgreements, getCompanyRooms, getCompanyShifts, getCompanyVehicles } from "../../utils/companyDataHub";
import { getApiErrorMessage } from "../../utils/apiContract";
import { rankOffersWithRecommendation, roomLabel, vehicleMetaLine } from "./shiftsPanelOfferUtils";
import CompanyShiftsPanelTrackView from "./CompanyShiftsPanelTrackView";
import CompanyShiftsPanelIntro from "./CompanyShiftsPanelIntro";
import { CompanyFinalListSection } from "./companyShiftsPanelSections";
import { addDaysYmd, computePackageShiftIds, isSameDayIstanbul, loadCustomTemplatesFromStorage, todayYmdLocal } from "./companyShiftsPanelUtils";
import { COMPANY_FINAL_STATUSES, filterCompanyContractItems, filterCompanyFinalItems, filterCompanyMarketItems, filterCompanyOtherItems, filterCompanyPendingItems, getCompanyContractItemsRaw, getCompanyMarketItemsRaw, getCompanyOtherItemsRaw, getCompanyPendingItemsRaw, getCompanyRoomScoreIds, getCompanyTrackCounts, getCompanyTrackDefaultTab } from "./companyShiftsPanelSelectors";
import { buildAgreementConversionByShift, focusCompanyMarketById } from "./companyShiftsPanelStateHelpers";
import { acceptCompanyOfferAction, acceptCompanyOfferPackageAction, cancelCompanyRequestAction, companyCounterOfferAction, companyCounterPackageAction, openCompanyExtendModal, openCompanyOfferModalForShift, openCompanyOffersModalForShift, submitCompanyExtendRequest, submitCompanyOfferModal, toggleCompanyOfferRoom } from "./companyShiftsPanelActions";
import { renderCompanyOfferSummary, renderRoomOfferSummary } from "./companyShiftsPanelSummaryCells";
import { buildAgreementPrefillFromShift, stashAgreementPrefill } from "../../utils/agreementPrefill";
// M66 compatibility marker: Operasyon Kaydı UI + ShiftOperationEventsModal implementation lives in CompanyShiftsPanelTrackView.

export default function CompanyShiftsPanel() {
  const { token, me } = useSession();

  const LS_LAST_ROOM = "company:lastRoomId";

  const [trackTab, _setTrackTab] = useState("other"); // market | pending | contract | other
  const trackTabTouchedRef = useRef(false);
  const setMainTab = useCallback(() => {}, []);
  const setTrackTab = useCallback((next) => {
    trackTabTouchedRef.current = true;
    _setTrackTab(next);
  }, []);

  const setShowTemplatesMgr = useCallback(() => {}, []);
  const [pbTplKey, setPbTplKey] = useState("");
  const [lastCreatedShiftId] = useState(0);


  const [items, setItems] = useState([]);
  const [agreementConversionByShift, setAgreementConversionByShift] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomScores, setRoomScores] = useState({});
  const [refDataReady, setRefDataReady] = useState(false);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [opsEventsModal, setOpsEventsModal] = useState({ open: false, shiftId: null });
  const refLoadPromiseRef = useRef(null);


  // ✅ M24: Market shift (room seçmeden) + multi-room offers
  const [marketQ, setMarketQ] = useState("");
  const [marketFocusIds, setMarketFocusIds] = useState([]);
  const [pendingFocusIds, setPendingFocusIds] = useState([]);
  const [contractQ, setContractQ] = useState("");
  const [contractStatus, setContractStatus] = useState("ALL");
  const [otherQ, setOtherQ] = useState("");
  const [otherStatus, setOtherStatus] = useState("ALL");
  const [offerModal, setOfferModal] = useState({
    open: false,
    shiftId: null,
    q: "",
    onlyHub: true,
    roomIds: {},
    amountCompany: "",
    noteCompany: "",
  });
  const [offersModal, setOffersModal] = useState({ open: false, shiftId: null, items: [] });
  // M60: Paket teklif/accept desteği (Company)
  const [offerModalPkgIds, setOfferModalPkgIds] = useState([]); // number[]
  const [offersModalPkgIds, setOffersModalPkgIds] = useState([]); // number[]
  const [offersCounterSel, setOffersCounterSel] = useState({});

  const offersDecisionCards = useMemo(() => rankOffersWithRecommendation(offersModal.items || [], roomScores), [offersModal.items, roomScores]);
  const recommendedOffer = useMemo(() => offersDecisionCards.find((offer) => offer.__recommended) || null, [offersDecisionCards]);
  const recommendedCanAccept = String(recommendedOffer?.status || "").toUpperCase() === "COUNTERED";

  // M51: Shift süre uzatma (Company → Room talep)
  const [extendModal, setExtendModal] = useState({ open: false, shift: null, endLocal: "", note: "" });
  const [previewModal, setPreviewModal] = useState({ open: false, shiftId: null });
  const [detailModal, setDetailModal] = useState(null); // { kind: "vehicle"|"driver", data: any }

  // Pending filtreler
  const [pendingQ, setPendingQ] = useState("");
  // Hızlı filtre (Bugün / Yarın) — Istanbul local YYYY-MM-DD
  const [dayYmd, setDayYmd] = useState("");
  const [applyToast, setApplyToast] = useState(null); // { ids:number[] }
  const marketSectionRef = useRef(null);
  const pendingSectionRef = useRef(null);
  const contractSectionRef = useRef(null);
  const otherSectionRef = useRef(null);
  const marketSearchRef = useRef(null);


// M41: Accordion (Market / Bekleyen / Sözleşmeden Üretilen / Diğer Vardiyalar)
const [accOpen, setAccOpen] = useState({ market: true, pending: true, contract: true, other: true });
const toggleAcc = (key) => setAccOpen((p) => ({ ...p, [key]: !p?.[key] }));
const ensureAcc = (key) => setAccOpen((p) => (p?.[key] ? p : ({ ...p, [key]: true })));

  // M34 Step-6: Plan Builder → Bekleyen Talepler’e filtreli geçiş
  useEffect(() => {
    const onFocus = (ev) => {
      const d = ev?.detail || {};
      const ids = Array.isArray(d.shiftIds) ? d.shiftIds.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
      if (!ids.length) return;

      const section = String(d.section || "market");

      if (section === "pending") {
        setTrackTab("pending");
        ensureAcc("pending");
        setPendingFocusIds(ids);
        setMarketFocusIds([]);
        setPendingQ("");
        setTimeout(() => {
          try { pendingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* no-op */ }
        }, 80);
      } else if (section === "contract") {
        setTrackTab("contract");
        ensureAcc("contract");
        setPendingFocusIds([]);
        setMarketFocusIds([]);
        setContractQ(String(ids[0] || ""));
        setTimeout(() => {
          try { contractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* no-op */ }
        }, 80);
      } else if (section === "other" || section === "list") {
        setTrackTab("other");
        ensureAcc("other");
        setPendingFocusIds([]);
        setMarketFocusIds([]);
        setOtherQ(String(ids[0] || ""));
        setTimeout(() => {
          try { otherSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* no-op */ }
        }, 80);
      } else {
        setTrackTab("market");
        ensureAcc("market");
        setMarketFocusIds(ids);
        setPendingFocusIds([]);
        setMarketQ("");
        setTimeout(() => {
          try {
            marketSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            marketSearchRef.current?.focus?.();
          } catch { /* no-op */ }
        }, 80);
      }
    };
    window.addEventListener("company:shifts:focus", onFocus);
    return () => window.removeEventListener("company:shifts:focus", onFocus);
  }, [setTrackTab]);

  function focusMarketById(id) {
    focusCompanyMarketById({ id, setTrackTab, ensureAcc, setMarketQ, marketSectionRef, marketSearchRef });
  }



  const [pendingOnlyRoomOffer, setPendingOnlyRoomOffer] = useState(false);
  const [focusedTrackShiftId, setFocusedTrackShiftId] = useState(null);

  const fmtTR = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  function openExtendModal(shift) {
    openCompanyExtendModal({ shift, setExtendModal });
  }

  async function submitExtendRequest() {
    await submitCompanyExtendRequest({ token, extendModal, setErr, setBusy, setExtendModal });
  }

// ===== Templates (company-localStorage) =====
// Amaç: Wizard'daki plan paketleri + günler + süre mantığını tek yerde toplamak.
// Not: LocalStorage company bazlıdır. Eski (v1) şablonlar otomatik migrate edilir.

const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
const templatesStorageKey = `psv1:company:${companyKey}:shiftTemplates:v2`;
const templatesStorageKeyLegacy = `psv1:company:${companyKey}:shiftTemplates:v1`;

const [customTemplates, setCustomTemplates] = useState([]); // [{id,name,packKey,weekMask,durationKey,items[],people,kind:"CUSTOM"}]
const companyShiftsSectionsCompat = Boolean(CompanyFinalListSection);



useEffect(() => {
  setCustomTemplates(loadCustomTemplatesFromStorage(templatesStorageKey, templatesStorageKeyLegacy));
  }, [templatesStorageKey, templatesStorageKeyLegacy, companyShiftsSectionsCompat]);

useEffect(() => {
  try {
    localStorage.setItem(templatesStorageKey, JSON.stringify(customTemplates));
  } catch {
    // ignore
  }
}, [customTemplates, templatesStorageKey]);

const allTemplates = useMemo(() => {
  const customs = (customTemplates || []).map((t) => ({ ...t, kind: "CUSTOM" }));
  return [...PRESET_TEMPLATES, ...customs];
}, [customTemplates]);

// ===== Yeni shift (request) form state =====
  const [roomId, setRoomId] = useState(() => {
    try {
      return localStorage.getItem(LS_LAST_ROOM) || "";
    } catch {
      return "";
    }
  });
  const [roomQ] = useState(""); // M22: room directory search
  const [seatDemand] = useState("");
  const [offerVehicleId, setOfferVehicleId] = useState("");

const templateOptions = useMemo(() => {
  const opts = [];
  for (const tpl of allTemplates) {
    const items = tpl?.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const key = `${tpl.id}::${i}`;
      const base = tpl.name;
      const label = items.length > 1 ? `${base} • ${it.label}` : base;
      opts.push({ key, tpl, itemIndex: i, item: it, label });
    }
  }
  return opts;
}, [allTemplates]);

// Seed Step-1 template selection
useEffect(() => {
  if (pbTplKey) return;
  const first = templateOptions?.[0]?.key ? String(templateOptions[0].key) : "";
  if (first) setPbTplKey(first);
}, [templateOptions, pbTplKey]);


  // Karşı teklif UI
  const [offerOpen] = useState({});
  const hasOfferOpen = useMemo(() => Object.values(offerOpen || {}).some(Boolean), [offerOpen]);
  const [, setOfferSel] = useState({});

  const isCompany = String(me?.role || "") === "COMPANY";
  const copilotScopeKey = useMemo(() => {
    const path = String(getPath() || "/company/shifts").split("?")[0];
    if (path === "/school/shifts" || path === "/organization/shifts") return path;
    return "/company/shifts";
  }, []);

  const needsReferenceData = useCallback(() => {
    if (detailModal?.kind === "vehicle") return true;
    if (offerModal?.open || offersModal?.open) return true;
    if (hasOfferOpen) return true;
    if (offerVehicleId) return true;
    return false;
  }, [detailModal?.kind, offerModal?.open, offersModal?.open, hasOfferOpen, offerVehicleId]);

  const ensureReferenceData = useCallback(async (signal, { force = false } = {}) => {
    if (!token) return;
    if (!force && refDataReady && rooms.length && vehicles.length) return;
    if (!force && refLoadPromiseRef.current) return refLoadPromiseRef.current;

    const promise = (async () => {
      const [veh, rm] = await Promise.all([
        getCompanyVehicles(token, { signal, force, take: 20, ttlMs: 45000 }).catch(() => []),
        getCompanyRooms(token, { signal, force, take: 30, ttlMs: 60000 }).catch(() => ({ items: [] })),
      ]);
      if (signal?.aborted) return;
      const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
      const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];
      setVehicles(vlist);
      setRooms(rlist);
      setRefDataReady(true);
    })();

    refLoadPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      if (refLoadPromiseRef.current === promise) refLoadPromiseRef.current = null;
    }
  }, [token, refDataReady, rooms.length, vehicles.length]);

  async function load(signal, { withReferences = false, forceReferences = false } = {}) {
    setErr("");
    try {
      const [sh, agreementsResp] = await Promise.all([
        getCompanyShifts(token, { signal, ttlMs: 25000, take: 32 }),
        getCompanyAgreements(token, { signal, take: 200, ttlMs: 8000, delayMs: 20 }).catch(() => ({ items: [] })),
      ]);
      if (signal?.aborted) return;

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      const agreements = Array.isArray(agreementsResp) ? agreementsResp : agreementsResp?.items ?? [];
      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
      setItems(list);
      setAgreementConversionByShift(buildAgreementConversionByShift(agreements));

      if (withReferences || needsReferenceData()) {
        await ensureReferenceData(signal, { force: forceReferences });
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(getApiErrorMessage(e));
    }
  }

  const loadRef = useRef(load);
loadRef.current = load;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) loadRef.current(controller.signal, { withReferences: false });
    }, 0);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [me?.role, token]);

  useEffect(() => {
    if (!token || !needsReferenceData()) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) ensureReferenceData(controller.signal).catch(() => {});
    }, 140);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [token, needsReferenceData, ensureReferenceData]);

  useEffect(() => {
    const previewRaw = localStorage.getItem("company:previewShiftId");
    const focusRaw = localStorage.getItem("company:focusShiftId");
    if (!previewRaw && !focusRaw) return;
    if (previewRaw) localStorage.removeItem("company:previewShiftId");
    if (focusRaw) localStorage.removeItem("company:focusShiftId");
    const sid = Number(previewRaw || focusRaw || 0);
    if (!sid) return;
    setFocusedTrackShiftId(sid);
    if (previewRaw) setPreviewModal({ open: true, shiftId: sid });
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const focusedShift = focusedTrackShiftId
      ? items.find((s) => Number(s?.id || 0) === Number(focusedTrackShiftId || 0)) || null
      : null;

    if (focusedShift) {
      const status = String(focusedShift?.status || "");
      const agreementId = Number(focusedShift?.agreementId || 0);
      const roomId = focusedShift?.roomId;
      const isFinal = COMPANY_FINAL_STATUSES.has(status);
      const nextTab = agreementId > 0
        ? "contract"
        : isFinal
        ? "other"
        : roomId == null || roomId === ""
        ? "market"
        : "pending";

      _setTrackTab(nextTab);
      if (nextTab === "market") {
        setMarketFocusIds([Number(focusedTrackShiftId)]);
        setPendingFocusIds([]);
        setMarketQ("");
      } else if (nextTab === "pending") {
        setPendingFocusIds([Number(focusedTrackShiftId)]);
        setMarketFocusIds([]);
        setPendingQ("");
      } else if (nextTab === "contract") {
        setMarketFocusIds([]);
        setPendingFocusIds([]);
        setContractQ(String(focusedTrackShiftId));
      } else {
        setMarketFocusIds([]);
        setPendingFocusIds([]);
        setOtherQ(String(focusedTrackShiftId));
      }
      return;
    }

    if (!trackTabTouchedRef.current) {
      _setTrackTab(getCompanyTrackDefaultTab(items, COMPANY_FINAL_STATUSES));
    }
  }, [items, focusedTrackShiftId]);

  useAutoReload("shifts", () => load(undefined, { withReferences: false }), true, 650);
  useAutoReload("rooms", () => (needsReferenceData() ? ensureReferenceData(undefined, { force: false }) : Promise.resolve()), true, 650);

  const roomsById = useMemo(() => {
    const m = new Map();
    for (const r of rooms) {
      const rid = Number(r?.id || 0);
      if (rid > 0) m.set(rid, r);
    }
    for (const s of items) {
      const rid = Number(s?.room?.id || s?.roomId || 0);
      if (rid > 0 && !m.has(rid)) m.set(rid, s?.room || { id: rid, name: `Taşımacılık Firması #${rid}` });
    }
    return m;
  }, [rooms, items]);

  const vehiclesById = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) m.set(Number(v.id), v);
    return m;
  }, [vehicles]);

  const driversById = useMemo(() => {
    const m = new Map();
    for (const s of items) {
      const d = s?.driver;
      const id = Number(d?.id || s?.driverId || 0);
      if (id > 0) m.set(id, { ...(m.get(id) || {}), ...d, id });
    }
    for (const v of vehicles) {
      const d = v?.driver;
      const id = Number(d?.id || v?.driverId || 0);
      if (id > 0) {
        m.set(id, {
          ...(m.get(id) || {}),
          ...d,
          id,
          currentVehiclePlate: v?.plate || (m.get(id) || {}).currentVehiclePlate || "",
        });
      }
    }
    return m;
  }, [items, vehicles]);

  const copilotShiftId = useMemo(() => {
    const ids = [
      previewModal?.open ? previewModal?.shiftId : null,
      offersModal?.open ? offersModal?.shiftId : null,
      offerModal?.open ? offerModal?.shiftId : null,
      extendModal?.open ? extendModal?.shift?.id : null,
      opsEventsModal?.open ? opsEventsModal?.shiftId : null,
      focusedTrackShiftId || null,
      Array.isArray(marketFocusIds) ? marketFocusIds[0] : null,
      Array.isArray(pendingFocusIds) ? pendingFocusIds[0] : null,
      lastCreatedShiftId || null,
    ].map((x) => Number(x || 0)).filter((x) => Number.isFinite(x) && x > 0);

    return ids[0] || 0;
  }, [previewModal, offersModal, offerModal, extendModal, opsEventsModal, focusedTrackShiftId, marketFocusIds, pendingFocusIds, lastCreatedShiftId]);

  function openVehicleDetail(s) {
    const id = Number(s?.vehicleId || s?.vehicle?.id || 0);
    const live = id > 0 ? vehiclesById.get(id) : null;
    const merged = { ...(s?.vehicle || {}), ...(live || {}) };
    if (!merged?.id && !merged?.plate) return;
    setDetailModal({ kind: "vehicle", data: merged });
  }

  function openDriverDetail(s) {
    const id = Number(s?.driverId || s?.driver?.id || 0);
    const live = id > 0 ? driversById.get(id) : null;
    const merged = { ...(s?.driver || {}), ...(live || {}) };
    if (!merged?.id && !merged?.fullName) return;
    setDetailModal({ kind: "driver", data: merged });
  }

  const seatN = useMemo(() => (seatDemand ? Number(seatDemand) : null), [seatDemand]);

  const roomOptions = useMemo(() => {
    const fallbackRooms = Array.from(roomsById.values());
    const baseRoomsRaw = rooms?.length
      ? rooms
      : fallbackRooms.length
      ? fallbackRooms
      : Array.from(new Set(vehicles.map((v) => v?.roomId).filter(Boolean).map((x) => Number(x)))).map((id) => ({
          id,
          name: `Taşımacılık Firması #${id}`,
        }));

    // M22: client-side search (directory)
    const q = String(roomQ || "").trim().toLowerCase();
    const baseRooms = q
      ? baseRoomsRaw.filter((r) => roomLabel(r).toLowerCase().includes(q))
      : baseRoomsRaw;

    const list = baseRooms.map((r) => {
      const rid = Number(r.id);
      const eligibleCount = vehicles.filter((v) => {
        if (!v?.roomId) return false;
        if (Number(v.roomId) !== rid) return false;
        if (!seatN) return true;
        return Number(v?.capacity || 0) >= seatN;
      }).length;

      return { ...r, eligibleCount };
    });

    // COMPANY için vehicle kapasitesine göre room elemek doğru değil (company room araçlarını bilmez).
    const filtered = seatN && !isCompany ? list.filter((r) => r.eligibleCount > 0) : list;
    filtered.sort((a, b) => Number(a.id) - Number(b.id));
    return filtered;
  }, [rooms, roomsById, vehicles, seatN, roomQ, isCompany]);

  useEffect(() => {
    if (roomOptions.length) {
      const rid = Number(roomId);
      const ok = roomOptions.some((r) => Number(r.id) === rid);
      if (!ok) {
        setRoomId(String(roomOptions[0].id));
        return;
      }
    }

    if (offerVehicleId) {
      const v = vehiclesById.get(Number(offerVehicleId));
      if (!v) {
        setOfferVehicleId("");
      } else {
        const rid = Number(roomId);
        if (rid && v?.roomId && Number(v.roomId) !== rid) {
          setOfferVehicleId("");
        } else if (seatN && Number(v?.capacity || 0) < seatN) {
          setOfferVehicleId("");
        }
      }
    }

    if (!isCompany) return;
    try {
      if (roomId) localStorage.setItem(LS_LAST_ROOM, String(roomId));
    } catch { /* no-op */ }
  }, [roomOptions, roomId, isCompany, offerVehicleId, vehiclesById, seatN]);


  // offerSel init
  useEffect(() => {
    setOfferSel((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const s of items) {
        const sid = Number(s.id);
        if (next[sid]) continue;

        next[sid] = {
          companyOfferVehicleId: s.companyOfferVehicleId ? String(s.companyOfferVehicleId) : "",
          companyOfferAmount: s.companyOfferAmount != null ? String(s.companyOfferAmount) : "",
          companyOfferNote: s.companyOfferNote ?? "",
        };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [items]);

  function setOffersCounter(offerId, patch) {
    setOffersCounterSel((prev) => ({
      ...prev,
      [offerId]: { ...(prev[offerId] || {}), ...(patch || {}) },
    }));
  }

  const openOfferModalForShift = useCallback((shiftId, pkgIds = null) => {
    openCompanyOfferModalForShift({
      shiftId,
      pkgIds,
      items,
      setOfferModalPkgIds,
      setOfferModal,
      ensureReferenceData,
    });
  }, [items, ensureReferenceData]);

  function toggleOfferRoom(roomId) {
    toggleCompanyOfferRoom(roomId, setOfferModal);
  }

  async function submitOfferModal() {
    await submitCompanyOfferModal({
      offerModal,
      offerModalPkgIds,
      token,
      setErr,
      setBusy,
      setOfferModal,
      setOfferModalPkgIds,
      load,
    });
  }

  const openOffersModalForShift = useCallback(async (shiftId, pkgIds = null) => {
    await openCompanyOffersModalForShift({
      shiftId,
      pkgIds,
      items,
      token,
      setBusy,
      setErr,
      setOffersCounterSel,
      setOffersModalPkgIds,
      setOffersModal,
    });
  }, [items, token]);

  // M28 + M30-A: wizard sonrası tek intent kuyruğundan teklif ekranı aç
  useEffect(() => {
    if (!token) return;
    const offerRaw = localStorage.getItem("company:autoOfferShiftId");
    const offersListRaw = localStorage.getItem("company:autoOffersListShiftId");

    if (offerRaw) {
      localStorage.removeItem("company:autoOfferShiftId");
      const sid = Number(offerRaw);
      if (sid) openOfferModalForShift(sid);
    }

    if (offersListRaw) {
      localStorage.removeItem("company:autoOffersListShiftId");
      const sid = Number(offersListRaw);
      if (sid) setTimeout(() => openOffersModalForShift(sid), 120);
    }
  }, [token, openOfferModalForShift, openOffersModalForShift]);

  async function companyCounterOffer(offer) {
    await companyCounterOfferAction({
      offer,
      offersCounterSel,
      token,
      setErr,
      setBusy,
      openOffersModalForShift,
      offersModal,
      offersModalPkgIds,
      load,
    });
  }

  async function companyCounterPackage(offer) {
    await companyCounterPackageAction({
      offer,
      offersCounterSel,
      offersModal,
      offersModalPkgIds,
      token,
      setErr,
      setBusy,
      openOffersModalForShift,
      load,
    });
  }

  async function acceptOffer(offerId) {
    await acceptCompanyOfferAction({ offerId, token, setBusy, setErr, setOffersModal, load });
  }

  async function acceptOfferPackage(roomId) {
    await acceptCompanyOfferPackageAction({ roomId, offersModal, offersModalPkgIds, token, setBusy, setErr, setOffersModal, setOffersModalPkgIds, load });
  }

  async function cancelMyRequest(shift) {
    await cancelCompanyRequestAction({ shift, token, setBusy, setErr, setMainTab, setTrackTab, setShowTemplatesMgr, load });
  }

  // Bucketed track tabs
  const marketItemsRaw = useMemo(() => getCompanyMarketItemsRaw(items, COMPANY_FINAL_STATUSES), [items]);
  const pendingItemsRaw = useMemo(() => getCompanyPendingItemsRaw(items, COMPANY_FINAL_STATUSES), [items]);
  const contractItemsRaw = useMemo(() => getCompanyContractItemsRaw(items, COMPANY_FINAL_STATUSES), [items]);
  const otherItemsRaw = useMemo(() => getCompanyOtherItemsRaw(items, COMPANY_FINAL_STATUSES), [items]);

  const marketItems = useMemo(() => filterCompanyMarketItems({
    items: marketItemsRaw,
    marketQ,
    marketFocusIds,
    dayYmd,
    isSameDayIstanbul,
  }), [marketItemsRaw, marketQ, marketFocusIds, dayYmd]);

  const pendingItems = useMemo(() => filterCompanyPendingItems({
    items: pendingItemsRaw,
    pendingQ,
    pendingOnlyRoomOffer,
    pendingFocusIds,
    dayYmd,
    isSameDayIstanbul,
  }), [pendingItemsRaw, pendingQ, pendingOnlyRoomOffer, pendingFocusIds, dayYmd]);

  const contractItems = useMemo(() => filterCompanyContractItems({
    items: contractItemsRaw,
    contractQ,
    contractStatus,
    dayYmd,
    isSameDayIstanbul,
  }), [contractItemsRaw, contractQ, contractStatus, dayYmd]);

  const otherItems = useMemo(() => filterCompanyOtherItems({
    items: otherItemsRaw,
    otherQ,
    otherStatus,
    dayYmd,
    isSameDayIstanbul,
  }), [otherItemsRaw, otherQ, otherStatus, dayYmd]);

  const finalItems = useMemo(() => filterCompanyFinalItems({
    items: otherItemsRaw,
    finalQ: otherQ,
    finalStatus: otherStatus,
    dayYmd,
    isSameDayIstanbul,
  }), [otherItemsRaw, otherQ, otherStatus, dayYmd]);

  const featuredTrackShift = useMemo(() => {
    const allTrackItems = [
      ...otherItems,
      ...contractItems,
      ...pendingItems,
      ...marketItems,
      ...items,
    ];

    const canConvertShift = (shift) => {
      const sid = Number(shift?.id || 0);
      if (!sid) return false;
      const convState = String(agreementConversionByShift?.[String(sid)]?.state || "");
      return convState !== "pending" && convState !== "linked";
    };

    return allTrackItems.find((shift) => Number(shift?.id || 0) > 0 && Number(shift?.roomId || 0) > 0 && !Number(shift?.agreementId || 0) && canConvertShift(shift))
      || allTrackItems.find((shift) => Number(shift?.id || 0) > 0 && Number(shift?.roomId || 0) > 0 && canConvertShift(shift))
      || allTrackItems.find((shift) => Number(shift?.id || 0) > 0 && Number(shift?.roomId || 0) > 0)
      || allTrackItems[0]
      || null;
  }, [agreementConversionByShift, otherItems, contractItems, pendingItems, marketItems, items]);

  const copilotShift = useMemo(() => {
    if (copilotShiftId) {
      return items.find((s) => Number(s?.id || 0) === copilotShiftId) || null;
    }
    if (trackTab === "market") return marketItems[0] || null;
    if (trackTab === "pending") return pendingItems[0] || null;
    if (trackTab === "contract") return contractItems[0] || null;
    return otherItems[0] || null;
  }, [trackTab, items, copilotShiftId, marketItems, pendingItems, contractItems, otherItems]);

  const copilotShiftSummary = useMemo(() => {
    if (!copilotShift) return "";
    const parts = [];
    parts.push(`Vardiya #${copilotShift.id}`);
    if (copilotShift?.status) parts.push(`Durum ${String(copilotShift.status).toUpperCase()}`);
    if (copilotShift?.room?.name) parts.push(`Taşımacılık Firması ${copilotShift.room.name}`);
    if (copilotShift?.vehicle?.plate) parts.push(`Araç ${copilotShift.vehicle.plate}`);
    else if (copilotShift?.vehicleId) parts.push(`Araç #${copilotShift.vehicleId}`);
    if (copilotShift?.driver?.fullName) parts.push(`Sürücü ${copilotShift.driver.fullName}`);
    const stopCount = Array.isArray(copilotShift?.stops) ? copilotShift.stops.length : 0;
    if (stopCount > 0) parts.push(`${stopCount} durak`);
    return parts.join(" • ");
  }, [copilotShift]);

  useEffect(() => {
    if (!copilotShift) {
      clearCopilotSelection(copilotScopeKey);
      return;
    }

    const facts = buildShiftFacts({ shift: copilotShift, itemCount: items.length });

    setCopilotSelection({
      scopeKey: copilotScopeKey,
      entityType: "shift",
      entityId: Number(copilotShift.id || 0) || null,
      label: `Vardiya #${copilotShift.id}`,
      summary: copilotShiftSummary,
      fields: [
        { label: 'Vardiya', value: `#${copilotShift.id}`, help: 'Seçili vardiyanın sistem içindeki kimliğini gösterir.' },
        { label: 'Taşımacılık Firması', value: copilotShift?.room?.name || '-', help: 'İşin bağlı olduğu taşımacılık firması bilgisini gösterir.' },
        { label: 'Araç', value: copilotShift?.vehicle?.plate || (copilotShift?.vehicleId ? `#${copilotShift.vehicleId}` : '-'), help: 'Vardiyaya bağlı araç bilgisini gösterir.' },
        { label: 'Sürücü', value: copilotShift?.driver?.fullName || '-', help: 'Vardiyaya atanmış sürücü bilgisini gösterir.' },
        { label: 'Durak Sayısı', value: `${Array.isArray(copilotShift?.stops) ? copilotShift.stops.length : 0}`, help: 'Bu vardiyada kaç durak bulunduğunu gösterir.' },
      ],
      facts,
      badges: [
        { label: 'Durum', value: String(copilotShift?.status || '-').toUpperCase(), help: 'Seçili vardiyanın operasyon durumunu gösterir.' },
        { label: 'Teklif', value: `${Number(copilotShift?.offers?.length || copilotShift?.openOfferCount || 0)}`, help: 'Bu vardiyaya bağlı açık veya görünen teklif sayısını özetler.' },
      ],
    });

    return () => clearCopilotSelection(copilotScopeKey);
  }, [copilotShift, copilotShiftSummary, copilotScopeKey, items.length]);

  // Final filtre uygula
  const shouldLoadRoomScores = useMemo(() => {
    if (offersModal?.open) return true;
    if (offerModal?.open) return true;
    if (trackTab === "market" && marketItems.length > 0) return true;
    return false;
  }, [offersModal?.open, offerModal?.open, trackTab, marketItems.length]);


  const roomScoreIds = useMemo(() => getCompanyRoomScoreIds({
    shouldLoadRoomScores,
    offersModalItems: offersModal?.items,
    offerModalOpen: offerModal?.open,
    rooms,
  }), [shouldLoadRoomScores, offersModal?.items, offerModal?.open, rooms]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !roomScoreIds.length) {
        if (alive) setRoomScores({});
        return;
      }
      try {
        const nextScores = await fetchProviderScoreMap(roomScoreIds, token);
        if (!alive) return;
        setRoomScores(nextScores);
      } catch {
        if (alive) setRoomScores({});
      }
    })();
    return () => { alive = false; };
  }, [token, roomScoreIds]);

  const trackCounts = useMemo(() => ({
    ...getCompanyTrackCounts(items, COMPANY_FINAL_STATUSES),
    final: finalItems.length,
  }), [finalItems.length, items]);

  function openOpsEvents(shiftId) {
    setOpsEventsModal({ open: true, shiftId: Number(shiftId) || null });
  }

  function convertShiftToAgreement(shift) {
    const guard = agreementConversionByShift[String(Number(shift?.id || 0))] || null;
    if (guard?.state === "pending") {
      setErr(`Bu vardiya için sözleşme talebi bekliyor: Sözleşme #${guard.agreementId}.`);
      return;
    }
    if (guard?.state === "linked") {
      setErr(`Bu vardiya zaten sözleşmeye taşındı: Sözleşme #${guard.agreementId}.`);
      return;
    }
    const room = roomsById.get(Number(shift?.roomId || 0)) || shift?.room || null;
    const prefill = buildAgreementPrefillFromShift({ shift, room });
    if (!prefill) {
      setErr("Vardiya bilgisi sözleşme taslağına taşınamadı.");
      return;
    }
    const ok = stashAgreementPrefill(prefill);
    if (!ok) {
      setErr("Sözleşme ön bilgisi tarayıcıya yazılamadı.");
      return;
    }
    navigate(companyPath(me, "/agreements"));
  }

  return (
    <div className="companyActionClarityScope">
      <CompanyShiftsPanelIntro
        err={err}
        applyToast={applyToast}
        focusMarketById={focusMarketById}
        setApplyToast={setApplyToast}
        trackCounts={trackCounts}
        companyKind={me?.companyKind}
      />

      <CompanyShiftsPanelTrackView
        dayYmd={dayYmd}
        setDayYmd={setDayYmd}
        todayYmdLocal={todayYmdLocal}
        addDaysYmd={addDaysYmd}
        trackTab={trackTab}
        setTrackTab={setTrackTab}
        trackCounts={trackCounts}
        marketSectionRef={marketSectionRef}
        accOpen={accOpen}
        setAccOpen={setAccOpen}
        toggleAcc={toggleAcc}
        marketItems={marketItems}
        marketQ={marketQ}
        setMarketQ={setMarketQ}
        marketFocusIds={marketFocusIds}
        setMarketFocusIds={setMarketFocusIds}
        busy={busy}
        marketSearchRef={marketSearchRef}
        fmtTR={fmtTR}
        copilotShiftId={copilotShiftId}
        setFocusedTrackShiftId={setFocusedTrackShiftId}
        openOfferModalForShift={openOfferModalForShift}
        openOffersModalForShift={openOffersModalForShift}
        computePackageShiftIds={computePackageShiftIds}
        pendingSectionRef={pendingSectionRef}
        pendingItems={pendingItems}
        pendingQ={pendingQ}
        setPendingQ={setPendingQ}
        pendingFocusIds={pendingFocusIds}
        setPendingFocusIds={setPendingFocusIds}
        pendingOnlyRoomOffer={pendingOnlyRoomOffer}
        setPendingOnlyRoomOffer={setPendingOnlyRoomOffer}
        roomsById={roomsById}
        agreementConversionByShift={agreementConversionByShift}
        renderRoomOfferSummary={(s) => renderRoomOfferSummary(s, { vehiclesById, fmtTR, busy, onOpenOffersModal: openOffersModalForShift })}
        renderCompanyOfferSummary={(s) => renderCompanyOfferSummary(s, vehiclesById)}
        cancelMyRequest={cancelMyRequest}
        openExtendModal={openExtendModal}
        setPreviewModal={setPreviewModal}
        openOpsEvents={openOpsEvents}
        contractSectionRef={contractSectionRef}
        contractItems={contractItems}
        contractStatus={contractStatus}
        setContractStatus={setContractStatus}
        contractQ={contractQ}
        setContractQ={setContractQ}
        otherSectionRef={otherSectionRef}
        otherItems={otherItems}
        otherStatus={otherStatus}
        setOtherStatus={setOtherStatus}
        otherQ={otherQ}
        setOtherQ={setOtherQ}
        onConvertShiftToAgreement={convertShiftToAgreement}
        openVehicleDetail={openVehicleDetail}
        openDriverDetail={openDriverDetail}
        detailModal={detailModal}
        setDetailModal={setDetailModal}
        vehicleMetaLine={vehicleMetaLine}
        opsEventsModal={opsEventsModal}
        setOpsEventsModal={setOpsEventsModal}
        previewModal={previewModal}
        extendModal={extendModal}
        setExtendModal={setExtendModal}
        submitExtendRequest={submitExtendRequest}
        offerModal={offerModal}
        rooms={rooms}
        roomScores={roomScores}
        setOfferModal={setOfferModal}
        setOffersModal={setOffersModal}
        toggleOfferRoom={toggleOfferRoom}
        submitOfferModal={submitOfferModal}
        offersModal={offersModal}
        offersModalPkgIds={offersModalPkgIds}
        offersDecisionCards={offersDecisionCards}
        recommendedOffer={recommendedOffer}
        recommendedCanAccept={recommendedCanAccept}
        offersCounterSel={offersCounterSel}
        acceptOffer={acceptOffer}
        acceptOfferPackage={acceptOfferPackage}
        setOffersCounter={setOffersCounter}
        companyCounterOffer={companyCounterOffer}
        companyCounterPackage={companyCounterPackage}
        featuredShift={featuredTrackShift}
      />
    </div>
  );
}
