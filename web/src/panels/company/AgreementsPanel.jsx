import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../../router";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import AgreementWizard from "./AgreementWizard";
import GuidedPlanModal from "./GuidedPlanModal";
import {
  WEEKDAYS,
  DURATION_PRESETS,
  QUICK_DURATION_PRESETS,
  weekMaskToText,
  toHHMM,
  addDaysISO,
} from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import { fetchProviderScore } from "../../utils/providerScores";
import { getCompanyAgreements, getCompanyRooms } from "../../utils/companyDataHub";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { getAgreementQualityPaymentBridgePreview, getAgreementSeferScorePreview } from "../../api";
import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import AgreementOpsBridgeCard from "../../components/AgreementOpsBridgeCard";
import QualityPaymentBridgePreviewCard from "../shared/QualityPaymentBridgePreviewCard";
import SeferScorePreviewCard from "../shared/SeferScorePreviewCard";
import CollapsibleSection from "../../components/CollapsibleSection";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CompanyAgreementsOverviewSection from "./companyAgreementsOverviewSection";
import CompanyAgreementsRouteRefreshPendingSection from "./companyAgreementsRouteRefreshPendingSection";
import CompanyAgreementsSelectedSummarySection, {
  CompanyAgreementExtendPill,
  CompanyAgreementShiftSummary,
  CompanyAgreementStatusPill,
} from "./companyAgreementsSelectedSummarySection";
import CompanyAgreementsSourceShiftSection from "./companyAgreementsSourceShiftSection";
import { consumeAgreementPrefill } from "../../utils/agreementPrefill";
import { getAgreementOrigins } from "../../utils/agreementOriginLink";
import { buildAgreementCopilotFacts } from "../../utils/agreementCopilotFacts";
import { companyPath } from "../../utils/paths";
import { AGREEMENT_STATUS_OPTIONS, agreementStatusText } from "../../utils/agreementLabels";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import { buildDynamicSavingsPreview, routeDiffText, routeSummaryText, summarizeRoutePreview } from "../../utils/routePreviewSummary";

const EMPTY_QUALITY_BRIDGE_LIST = [];

// ✅ M59 helpers
function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999+03:00");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

function todayYmd() {
  return ymdTR();
}
function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function buildRouteRefreshLaunch({ agreement, room, origin }) {
  const sourceShiftId = Number(origin?.sourceShiftId || 0);
  if (!sourceShiftId) return null;

  const agreementId = Number(agreement?.id || 0);
  const roomId = Number(agreement?.roomId || room?.id || 0);
  const startDate = String(agreement?.startDate || "").slice(0, 10);
  const endDate = String(agreement?.endDate || "").slice(0, 10);
  const today = todayYmd();
  const refreshStartDate = isYmd(startDate) && startDate > today ? startDate : today;
  const startHHMM = toHHMM(agreement?.startMin) || "08:00";
  const endHHMM = toHHMM(agreement?.endMin) || "10:00";

  return {
    mode: "ROUTE_REFRESH",
    agreementId,
    roomId: roomId || null,
    roomName: room?.name || null,
    sourceShiftId,
    sourceSummary: String(origin?.sourceSummary || "").trim() || null,
    startDate: refreshStartDate,
    agreementStartDate: isYmd(startDate) ? startDate : null,
    agreementEndDate: isYmd(endDate) ? endDate : null,
    durationKey: "1w",
    weekMask: Number(agreement?.weekMask || 62) || 62,
    startHHMM,
    endHHMM,
    direction: String(agreement?.direction || "INBOUND").toUpperCase(),
    pattern: String(agreement?.pattern || "ONE_WAY").toUpperCase(),
    hubLat: agreement?.hubLat ?? null,
    hubLng: agreement?.hubLng ?? null,
    currentCompanyOfferAmount: agreement?.companyOfferAmount ?? null,
    currentRoomOfferAmount: agreement?.roomOfferAmount ?? null,
  };
}
function canRouteRefresh(agreement, origin) {
  const status = String(agreement?.status || "").toUpperCase();
  if (!["APPROVED", "ACTIVE"].includes(status)) return false;
  return Number(origin?.sourceShiftId || 0) > 0;
}

function isActiveRouteRefreshStatus(status) {
  return ["PENDING", "COUNTERED"].includes(String(status || "").toUpperCase());
}

function moneyTry(value) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat("tr-TR").format(Number.isFinite(n) ? n : 0)} ₺`;
}

function trDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/.test(text)) return text.replace(/\s*[—–-]\s*/g, " - ");
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day}.${map.month}.${map.year} ${map.hour}:${map.minute}`;
}

function compactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}
const AGREEMENTS_VIEW_TABS = [
  { key: "list", label: "Liste" },
  { key: "bridge", label: "Bağlantı" },
  { key: "wizard", label: "Yazım" },
];

export default function AgreementsPanel() {
  const { token, me } = useSession();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59
  const [opsBridge, setOpsBridge] = useState({});
  const [routeRefreshPendingByAgreement, setRouteRefreshPendingByAgreement] = useState({});
  const [qualityPaymentBridgePreview, setQualityPaymentBridgePreview] = useState({ loading: false, data: null, err: "" });
  const [seferScorePreview, setSeferScorePreview] = useState({ loading: false, data: null, err: "" });
  const shiftStatsCacheRef = useRef(new Map());

  const [take, setTake] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);

  // rooms dropdown
  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);
  const [_roomErr, setRoomErr] = useState("");
  const [_selectedRoomScore, setSelectedRoomScore] = useState(null);

  // ✅ M27: advanced create (optional)
  const [advancedOpen, _setAdvancedOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState(null);
  const [wizardPrefillNonce, setWizardPrefillNonce] = useState(0);
  const [agreementOrigins, setAgreementOrigins] = useState({});
  const [recentConversion, setRecentConversion] = useState(null);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [routeRefreshLaunch, setRouteRefreshLaunch] = useState(null);
  const [routeRefreshNonce, setRouteRefreshNonce] = useState(0);
  const [viewMode, setViewMode] = useState("list");

  const [roomId, _setRoomId] = useState("");

  const [startDate, _setStartDate] = useState(todayYmd());

  const DEFAULT_DURATION_KEY = QUICK_DURATION_PRESETS?.[0]?.key || "2d";
  const [durationKey, _setDurationKey] = useState(DEFAULT_DURATION_KEY);
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS.find((x) => x.key === DEFAULT_DURATION_KEY) || DURATION_PRESETS[0];
    return Number(p.days || 30);
  }, [DEFAULT_DURATION_KEY, durationKey]);
  const [_endDate, setEndDate] = useState(addDaysISO(todayYmd(), 0));

  const [useRoomHub, _setUseRoomHub] = useState(true);
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");


  // ✅ live refresh
  useAutoReload("agreements", () => load(), !!token, 650);

  const roomById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  useEffect(() => {
    const rid = Number(roomId || 0);
    const room = rid ? roomById.get(rid) : null;

    if (useRoomHub && room?.hubLat != null && room?.hubLng != null) {
      if (String(hubLat).trim() === "" && String(hubLng).trim() === "") {
        setHubLat(String(room.hubLat));
        setHubLng(String(room.hubLng));
      }
    }
  }, [roomId, roomById, useRoomHub, hubLat, hubLng]);

  useEffect(() => {
    let cancelled = false;
    const rid = Number(roomId || 0);

    if (!advancedOpen || !token || !rid) {
      setSelectedRoomScore(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const score = await fetchProviderScore(rid, token);
        if (!cancelled) setSelectedRoomScore(score || null);
      } catch {
        if (!cancelled) setSelectedRoomScore(null);
      }
    })();

    return () => { cancelled = true; };
  }, [advancedOpen, token, roomId]);

  useEffect(() => {
    if (!isYmd(startDate)) return;
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
  }, [startDate, durationDays]);

  const loadRooms = useCallback(async (signal) => {
    if (!token) return;
    setRoomErr("");
    setRoomsSupported(true);

    try {
      const resp = await getCompanyRooms(token, { signal, take: 30, ttlMs: 60000 });
      if (signal?.aborted) return;
      setRooms(Array.isArray(resp?.items) ? resp.items : []);
    } catch (e) {
      setRooms([]);
      setRoomsSupported(false);
      setRoomErr(e?.message || "Odalar endpointi yok");
    }
  }, [token]);

  function openAgreementShift(shiftId, preview = false) {
    const sid = Number(shiftId || 0);
    if (!sid) return;
    try {
      localStorage.setItem(preview ? "company:previewShiftId" : "company:focusShiftId", String(sid));
    } catch (e) {
      void e;
    }
    navigate(companyPath(me, "/shifts"));
  }

  const load = useCallback(async (signal) => {
    if (!token) return;
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      if (statusFilter) qs.set("status", statusFilter);
      const resp = await getCompanyAgreements(token, { signal, take, status: statusFilter, ttlMs: 30000 });
      if (signal?.aborted) return;
      const list = resp?.items ?? [];
      setItems(list);
      setAgreementOrigins(getAgreementOrigins(list.map((x) => x?.id)));

      // ✅ M59: shift stats (today/horizon) for UI clarity
      try {
        const ids = list.slice(0, 12).map((x) => x?.id).filter(Boolean);
        const statsKey = ids.join(",");
        if (ids.length && shiftStatsCacheRef.current.has(statsKey)) {
          setShiftStats(shiftStatsCacheRef.current.get(statsKey) || {});
        } else if (ids.length) {
          const st = await api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } });
          const nextStats = st?.byId ?? {};
          shiftStatsCacheRef.current.set(statsKey, nextStats);
          setShiftStats(nextStats);
        } else {
          setShiftStats({});
        }

        if (ids.length) {
          const [bridge, routeRefresh] = await Promise.all([
            api("/api/agreements/ops-bridge", { token, method: "POST", body: { agreementIds: ids } }),
            api("/api/agreements/route-refresh", { token }).catch(() => ({ items: [] })),
          ]);
          const nextBridge = bridge?.byId ?? {};
          setOpsBridge(nextBridge);
          setAgreementOrigins((prev) => {
            const stored = getAgreementOrigins(list.map((x) => x?.id));
            const merged = { ...stored, ...prev };
            Object.entries(nextBridge).forEach(([agreementId, item]) => {
              const sourceShiftId = Number(item?.sourceShiftId || 0);
              if (!sourceShiftId) return;
              merged[String(agreementId)] = {
                source: "SHIFT",
                sourceShiftId,
                sourceSummary: String(item?.sourceSummary || `Kaynak vardiya #${sourceShiftId}`),
                linkedAgreementId: Number(agreementId || 0),
                linkedAt: new Date().toISOString(),
                linkedAtTs: Date.now(),
              };
            });
            return merged;
          });
          const pendingMap = {};
          for (const item of (Array.isArray(routeRefresh?.items) ? routeRefresh.items : [])) {
            if (!isActiveRouteRefreshStatus(item?.status)) continue;
            const aid = Number(item?.agreementId || 0);
            if (aid > 0 && !pendingMap[String(aid)]) pendingMap[String(aid)] = item;
          }
          setRouteRefreshPendingByAgreement(pendingMap);
        } else {
          setOpsBridge({});
          setRouteRefreshPendingByAgreement({});
        }
      } catch {
        setShiftStats({});
        setOpsBridge({});
        setRouteRefreshPendingByAgreement({});
      }

    } catch (e) {
      setErr(e?.message || "Sözleşmeler yüklenemedi.");
    }
  }, [token, take, statusFilter]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(controller.signal);
    }, 280);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [load, token]);

  useEffect(() => {
    if (!token || (!advancedOpen && !guidedOpen)) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) loadRooms(controller.signal);
    }, 140);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [token, advancedOpen, guidedOpen, loadRooms]);

  useEffect(() => {
    const prefill = consumeAgreementPrefill();
    if (!prefill) return;
    setWizardPrefill(prefill);
    setWizardPrefillNonce((n) => n + 1);
  }, []);

  async function handleWizardCreated(detail = null) {
    await load();
    const createdIds = Array.isArray(detail?.createdIds) ? detail.createdIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const firstId = createdIds[0] || null;
    if (firstId) setSelectedAgreementId(firstId);
    if (detail?.createdFromShift?.sourceShiftId && firstId) {
      setRecentConversion({
        agreementId: firstId,
        sourceShiftId: Number(detail.createdFromShift.sourceShiftId || 0),
        sourceSummary: String(detail?.createdFromShift?.sourceSummary || ""),
      });
    } else {
      setRecentConversion(null);
    }
    if (createdIds.length) {
      setAgreementOrigins((prev) => ({ ...prev, ...getAgreementOrigins(createdIds) }));
    }
  }

  async function _createAdvanced() {
    setErr("Doğrudan sözleşme açma kapalı. Önce vardiya oluşturup “Sözleşmeye Dönüştür” kullan.");
  }

  function startRouteRefresh(agreement, room) {
    const origin = agreementOrigins?.[String(agreement?.id)] || null;
    const launch = buildRouteRefreshLaunch({ agreement, room, origin });
    if (!launch) {
      setErr("Rota güncelleme için önce kaynak vardiya bağlantısı gerekli.");
      return;
    }
    setErr("");
    setRouteRefreshLaunch(launch);
    setRouteRefreshNonce((n) => n + 1);
    setGuidedOpen(true);
  }

  async function acceptRouteRefreshCounter(requestId) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${requestId}/accept-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Rota güncelleme karşı teklifi kabul edilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectRouteRefreshCounter(requestId) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/route-refresh/${requestId}/reject-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Rota güncelleme karşı teklifi reddedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/accept-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Accept counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/reject-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Reject counter failed");
    } finally {
      setBusy(false);
    }
  }

  async function companyCounter(id, companyOfferAmount, companyOfferNote) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/company-counter`, {
        token,
        method: "PUT",
        body: {
          companyOfferAmount,
          companyOfferNote: companyOfferNote ?? null,
        },
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Company counter failed");
    } finally {
      setBusy(false);
    }
  }

  function askCompanyCounter(a) {
    const raw = prompt("Yeni şirket teklifi (₺):", String(a?.companyOfferAmount ?? a?.roomOfferAmount ?? ""));
    if (raw == null) return;
    const n = Number(String(raw).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Yeni teklif miktarı geçersiz");
      return;
    }
    const note = prompt("Yeni teklif notu (opsiyonel):", String(a?.companyOfferNote || ""));
    companyCounter(a.id, Math.trunc(n), String(note || "").trim() || null);
  }

  async function cancelAgreement(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/cancel`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendRequest(id, endDateYmd, offerAmount, offerNote) {
    setErr("");
    if (!isYmd(endDateYmd)) return setErr("Bitiş tarihi YYYY-MM-DD olmalı");

    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-request`, {
        token,
        method: "PUT",
        body: {
          endDate: endDateYmd,
          extendOfferAmount: offerAmount ?? null,
          extendOfferNote: offerNote ?? null,
        },
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend request failed");
    } finally {
      setBusy(false);
    }
  }

  async function acceptExtendCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-accept-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend counter accept failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectExtendCounter(id) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-reject-counter`, { token, method: "PUT", body: {} });
      await load();
    } catch (e) {
      setErr(e?.message || "Extend counter reject failed");
    } finally {
      setBusy(false);
    }
  }

  function askExtendOfferDetails() {
    const raw = prompt("Uzatma için yeni teklif (₺) — boş bırak: değişmesin", "");
    let offerAmount = null;
    if (raw != null && String(raw).trim() !== "") {
      const n = Number(String(raw).replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        setErr("Uzatma teklifi miktarı geçersiz");
        return null;
      }
      offerAmount = Math.trunc(n);
    }
    const offerNote = prompt("Uzatma notu (opsiyonel):", "") || null;
    return { offerAmount, offerNote: String(offerNote || "").trim() || null };
  }

  function extendByDays(a, days) {
    const base = String(a?.endDate || "").slice(0, 10);
    if (!isYmd(base)) return setErr("endDate yok/format hatalı");
    const next = addDaysISO(base, Number(days || 0));
    const d = askExtendOfferDetails(a); if (!d) return; extendRequest(a.id, String(next).trim(), d.offerAmount, d.offerNote);
  }

  function askExtend(a) {
    const next = prompt("Yeni endDate (YYYY-MM-DD):", a.endDate?.slice(0, 10) || "");
    if (!next) return;
    const d = askExtendOfferDetails(a); if (!d) return; extendRequest(a.id, String(next).trim(), d.offerAmount, d.offerNote);
  }

  const rows = useMemo(() => {
    return (items || []).map((a) => {
      const r = a?.roomId ? roomById.get(Number(a.roomId)) : null;
      return { a, room: r };
    });
  }, [items, roomById]);

  const filteredRows = useMemo(() => rows.filter(({ a, room }) => includesFilter([
    a?.id,
    a?.status,
    room?.name,
    a?.roomId,
    a?.companyOfferAmount,
    a?.roomOfferAmount,
    a?.companyOfferNote,
    a?.roomOfferNote,
    a?.direction,
    a?.pattern,
    a?.startDate,
    a?.endDate,
    weekMaskToText(a?.weekMask),
  ], filterQ)), [rows, filterQ]);

  const selectedAgreementRow = useMemo(
    () => filteredRows.find(({ a }) => Number(a?.id || 0) === Number(selectedAgreementId || 0)) || filteredRows[0] || null,
    [filteredRows, selectedAgreementId]
  );

  const selectedAgreementBridge = useMemo(
    () => (selectedAgreementRow?.a ? opsBridge?.[selectedAgreementRow.a.id] || null : null),
    [selectedAgreementRow, opsBridge]
  );
  const selectedAgreementOrigin = useMemo(
    () => (selectedAgreementRow?.a ? agreementOrigins?.[String(selectedAgreementRow.a.id)] || null : null),
    [selectedAgreementRow, agreementOrigins]
  );
  const selectedRouteRefreshLaunch = useMemo(
    () => (
      selectedAgreementRow?.a
        ? buildRouteRefreshLaunch({ agreement: selectedAgreementRow.a, room: selectedAgreementRow.room, origin: selectedAgreementOrigin })
        : null
    ),
    [selectedAgreementRow, selectedAgreementOrigin]
  );
  const selectedRouteRefreshPending = useMemo(
    () => (selectedAgreementRow?.a ? routeRefreshPendingByAgreement?.[String(selectedAgreementRow.a.id)] || null : null),
    [selectedAgreementRow, routeRefreshPendingByAgreement]
  );
  const selectedRouteRefreshStatus = String(selectedRouteRefreshPending?.status || "").toUpperCase();
  const selectedRouteRefreshCountered = selectedRouteRefreshStatus === "COUNTERED";
  void selectedRouteRefreshLaunch;
  const hasPendingRouteRefresh = (agreementId) => Boolean(routeRefreshPendingByAgreement?.[String(agreementId)]);
  const routeRefreshActionLabel = (agreementId) => {
    const item = routeRefreshPendingByAgreement?.[String(agreementId)];
    if (String(item?.status || "").toUpperCase() === "COUNTERED") return "Karşı Teklif Geldi";
    return item ? "Rota Güncelleme Bekliyor" : "Rota Güncelle";
  };
  const agreementPreviewShiftId = (agreementId) => {
    const bridgeLastShiftId = Number(opsBridge?.[String(agreementId)]?.lastShift?.id || 0);
    if (bridgeLastShiftId > 0) return bridgeLastShiftId;
    return Number(agreementOrigins?.[String(agreementId)]?.sourceShiftId || 0);
  };
  const selectedAgreementPreviewShiftId = selectedAgreementRow?.a ? agreementPreviewShiftId(selectedAgreementRow.a.id) : 0;
  const [routeRefreshPreviewSummary, setRouteRefreshPreviewSummary] = useState({ loading: false, current: null, proposed: null, err: "" });

  useEffect(() => {
    let cancelled = false;
    const agreementId = Number(selectedAgreementRow?.a?.id || 0);

    if (!token || !agreementId) {
      setQualityPaymentBridgePreview({ loading: false, data: null, err: "" });
      setSeferScorePreview({ loading: false, data: null, err: "" });
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    setQualityPaymentBridgePreview((prev) => ({ ...prev, loading: true, err: "" }));
    setSeferScorePreview((prev) => ({ ...prev, loading: true, err: "" }));

    (async () => {
      const [qualityResult, seferResult] = await Promise.allSettled([
        getAgreementQualityPaymentBridgePreview(agreementId, { token, signal: controller.signal }),
        getAgreementSeferScorePreview(agreementId, { token, signal: controller.signal }),
      ]);
      if (cancelled) return;
      setQualityPaymentBridgePreview(
        qualityResult.status === "fulfilled"
          ? { loading: false, data: qualityResult.value, err: "" }
          : { loading: false, data: null, err: qualityResult.reason?.message || "Readonly önizleme yüklenemedi" }
      );
      setSeferScorePreview(
        seferResult.status === "fulfilled"
          ? { loading: false, data: seferResult.value, err: "" }
          : { loading: false, data: null, err: seferResult.reason?.message || "Readonly puan önizlemesi yüklenemedi" }
      );
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, selectedAgreementRow?.a?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadRouteRefreshPreviewSummary() {
      const pending = selectedRouteRefreshPending;
      const sourceShiftId = Number(selectedAgreementOrigin?.sourceShiftId || 0);
      const draftShiftIds = Array.isArray(pending?.draftShiftIds) ? pending.draftShiftIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0) : [];
      if (!token || !pending || !sourceShiftId || !draftShiftIds.length) {
        setRouteRefreshPreviewSummary({ loading: false, current: null, proposed: null, err: "" });
        return;
      }
      setRouteRefreshPreviewSummary((prev) => ({ ...prev, loading: true, err: "" }));
      try {
        const [currentPayload, proposedPayload] = await Promise.all([
          getShiftRoutePreview(token, sourceShiftId, { force: true, ttlMs: 0, delayMs: 0 }),
          getShiftRoutePreview(token, draftShiftIds[0], { force: true, ttlMs: 0, delayMs: 0 }),
        ]);
        if (cancelled) return;
        setRouteRefreshPreviewSummary({
          loading: false,
          current: summarizeRoutePreview(currentPayload),
          proposed: summarizeRoutePreview(proposedPayload),
          err: "",
        });
      } catch (e) {
        if (cancelled) return;
        setRouteRefreshPreviewSummary({ loading: false, current: null, proposed: null, err: e?.message || "Rota özeti yüklenemedi" });
      }
    }
    void loadRouteRefreshPreviewSummary();
    return () => {
      cancelled = true;
    };
  }, [token, selectedAgreementOrigin, selectedRouteRefreshPending]);

  const selectedRouteRefreshCurrentFallback = selectedAgreementBridge?.lastShift ? {
    peopleCount: Number(selectedAgreementBridge.lastShift.peopleCount || 0),
    stopCount: Number(selectedAgreementBridge.lastShift.stopCount || 0),
    distanceM: Number(selectedAgreementBridge.lastShift.routeSnapshotDistanceM || 0),
    durationSec: Number(selectedAgreementBridge.lastShift.routeSnapshotDurationSec || 0),
  } : null;
  const selectedRouteRefreshProposedFallback = selectedRouteRefreshPending ? {
    peopleCount: Number(selectedRouteRefreshPending.peopleCount || 0),
    stopCount: Number(selectedRouteRefreshPending.stopCount || 0),
  } : null;
  const selectedRouteRefreshCurrentText = routeSummaryText(routeRefreshPreviewSummary.current, selectedRouteRefreshCurrentFallback);
  const selectedRouteRefreshProposedText = routeSummaryText(routeRefreshPreviewSummary.proposed, selectedRouteRefreshProposedFallback);
  const selectedRouteRefreshDiffText = routeDiffText(
    routeRefreshPreviewSummary.current || selectedRouteRefreshCurrentFallback,
    routeRefreshPreviewSummary.proposed || selectedRouteRefreshProposedFallback,
    {
      emptyText: "Personel / durak değişikliği yok",
      showNegativeMetricSign: false,
    }
  );
  const selectedRouteRefreshCurrentAmount = Number(selectedRouteRefreshLaunch?.currentCompanyOfferAmount ?? selectedAgreementRow?.a?.companyOfferAmount ?? 0);
  const selectedRouteRefreshNextAmount = Number(
    selectedRouteRefreshCountered
      ? selectedRouteRefreshPending?.roomCounterAmount ?? selectedRouteRefreshPending?.companyOfferAmount ?? selectedRouteRefreshCurrentAmount
      : selectedRouteRefreshPending?.companyOfferAmount ?? selectedRouteRefreshCurrentAmount
  );
  const selectedRouteRefreshPriceImpactText = `${moneyTry(selectedRouteRefreshCurrentAmount)} → ${moneyTry(selectedRouteRefreshNextAmount)} (${selectedRouteRefreshNextAmount - selectedRouteRefreshCurrentAmount > 0 ? "+" : ""}${moneyTry(selectedRouteRefreshNextAmount - selectedRouteRefreshCurrentAmount)})`;
  const selectedRouteRefreshSummaryText = selectedRouteRefreshPending
    ? `Talep #${selectedRouteRefreshPending.id} • ${String(selectedRouteRefreshPending.startDate || "").slice(0, 10)} → ${String(selectedRouteRefreshPending.endDate || "").slice(0, 10)} • ${Number(selectedRouteRefreshPending.shiftCount || 0)} taslak vardiya`
    : "";
  const selectedRouteRefreshRoomCounterText = selectedRouteRefreshCountered
    ? `${moneyTry(selectedRouteRefreshPending?.roomCounterAmount)}${selectedRouteRefreshPending?.roomCounterNote ? ` — ${selectedRouteRefreshPending.roomCounterNote}` : ""}`
    : "";
  const selectedRouteRefreshCurrentPreviewShiftId = Number(selectedAgreementOrigin?.sourceShiftId || 0);
  const selectedRouteRefreshProposedPreviewShiftId = Number((selectedRouteRefreshPending?.draftShiftIds || [])[0] || 0);
  const selectedDynamicSavingsPreview = buildDynamicSavingsPreview({
    currentSummary: routeRefreshPreviewSummary.current || selectedRouteRefreshCurrentFallback,
    proposedSummary: routeRefreshPreviewSummary.proposed || selectedRouteRefreshProposedFallback,
  });
  const qualityBridgePreview = useMemo(() => qualityPaymentBridgePreview.data || null, [qualityPaymentBridgePreview.data]);
  const qualityBridgeStatusText = useMemo(() => compactText(qualityBridgePreview?.qualityStatus || '', ''), [qualityBridgePreview]);
  const qualityBridgeProofCompleteness = Number(qualityBridgePreview?.proofCompleteness ?? NaN);
  const qualityBridgeSettlementReadiness = useMemo(() => compactText(qualityBridgePreview?.settlementReadiness || '', ''), [qualityBridgePreview]);
  const qualityBridgeImpactStatus = useMemo(() => compactText(qualityBridgePreview?.paymentPreviewImpact?.status || '', ''), [qualityBridgePreview]);
  const qualityBridgeImpactReason = useMemo(() => compactText(qualityBridgePreview?.paymentPreviewImpact?.reason || '', ''), [qualityBridgePreview]);
  const qualityBridgeMissingProofs = useMemo(() => (
    Array.isArray(qualityBridgePreview?.missingProofs) ? qualityBridgePreview.missingProofs : EMPTY_QUALITY_BRIDGE_LIST
  ), [qualityBridgePreview]);
  const qualityBridgeRiskReasons = useMemo(() => (
    Array.isArray(qualityBridgePreview?.riskReasons) ? qualityBridgePreview.riskReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [qualityBridgePreview]);
  const qualityBridgeNextAction = useMemo(() => compactText(qualityBridgePreview?.nextBestAction || '', ''), [qualityBridgePreview]);
  const qualityBridgeSummaryText = useMemo(() => compactText(qualityBridgePreview?.summaryText || qualityBridgePreview?.previewOnlyNote || '', ''), [qualityBridgePreview]);
  const seferScorePreviewData = useMemo(() => seferScorePreview.data || null, [seferScorePreview.data]);
  const seferScoreValue = Number(seferScorePreviewData?.score ?? NaN);
  const seferScoreMax = Number(seferScorePreviewData?.scoreMax ?? 5) || 5;
  const seferScoreLevel = useMemo(() => compactText(seferScorePreviewData?.level || '', ''), [seferScorePreviewData]);
  const seferScoreConfidence = useMemo(() => compactText(seferScorePreviewData?.confidence || '', ''), [seferScorePreviewData]);
  const seferScoreStatus = useMemo(() => compactText(seferScorePreviewData?.status || '', ''), [seferScorePreviewData]);
  const seferScoreSummaryText = useMemo(() => compactText(seferScorePreviewData?.summaryText || seferScorePreviewData?.safeExplanation || '', ''), [seferScorePreviewData]);
  const seferScoreSupplierLabel = useMemo(() => compactText(seferScorePreviewData?.supplierLabel || '', ''), [seferScorePreviewData]);
  const seferScorePositiveReasons = useMemo(() => (
    Array.isArray(seferScorePreviewData?.positiveReasons) ? seferScorePreviewData.positiveReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreRiskReasons = useMemo(() => (
    Array.isArray(seferScorePreviewData?.riskReasons) ? seferScorePreviewData.riskReasons : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreMissingSignals = useMemo(() => (
    Array.isArray(seferScorePreviewData?.missingSignals) ? seferScorePreviewData.missingSignals : EMPTY_QUALITY_BRIDGE_LIST
  ), [seferScorePreviewData]);
  const seferScoreNextAction = useMemo(() => compactText(seferScorePreviewData?.nextBestAction || '', ''), [seferScorePreviewData]);
  const seferScoreSafeExplanation = useMemo(() => compactText(seferScorePreviewData?.safeExplanation || '', ''), [seferScorePreviewData]);

  const selectedAgreementCopilotContext = useMemo(() => {
    const row = selectedAgreementRow;
    if (!row?.a) return null;
    const { a, room } = row;
    const bridge = selectedAgreementBridge || {};
    const origin = selectedAgreementOrigin || {};
    const lastShift = bridge?.lastShift || null;
    const todayTotal = Number(shiftStats?.[a.id]?.todayTotal || 0);
    const todayDone = Number(shiftStats?.[a.id]?.todayDone || 0);
    const horizonOpen = Number(shiftStats?.[a.id]?.horizonOpen || 0);
    const statusText = agreementStatusText(a?.status);
    const roomText = room?.name || `Oda #${a?.roomId || '-'}`;
    const sourceShiftId = Number(origin?.sourceShiftId || 0);
    const generatedShiftCount = Number(bridge?.generatedCount || 0);
    const lastGeneratedShiftId = Number(lastShift?.id || 0);
    const lastGeneratedShiftStatus = String(lastShift?.status || '').toUpperCase();
    const lastGeneratedShiftStart = trDateTime(lastShift?.startAt || '');
    const lastGeneratedShiftEnd = trDateTime(lastShift?.endAt || '');
    const personelCount = Number(lastShift?.peopleCount || 0);
    const stopCount = Number(lastShift?.stopCount || 0);
    const selectedRecordSummary = [
      statusText,
      roomText,
      ymdTR(a?.startDate),
      ymdTR(a?.endDate),
      sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : null,
      generatedShiftCount > 0 ? `Üretilen vardiya: ${generatedShiftCount}` : null,
      lastGeneratedShiftId ? `Son üretilen vardiya #${lastGeneratedShiftId}` : null,
      lastGeneratedShiftStart && lastGeneratedShiftEnd ? `${lastGeneratedShiftStart} - ${lastGeneratedShiftEnd}` : null,
      personelCount > 0 ? `Personel: ${personelCount}` : null,
      stopCount > 0 ? `Durak: ${stopCount}` : null,
      qualityBridgeSummaryText ? `Kalite / hakediş: ${qualityBridgeSummaryText}` : null,
      seferScoreSummaryText ? `SeferPuanı: ${seferScoreSummaryText}` : null,
    ].filter(Boolean).join(' • ');
    const selectedRecordLabel = `Sözleşme #${a.id}`;
    const selectedRecordType = 'agreement';
    const selectionFacts = buildAgreementCopilotFacts(a, {
      screenPath: '/company/agreements',
      screenTitle: 'Sözleşmeler (Company)',
      selectedRecordType,
      selectedRecordLabel,
      selectedRecordId: Number(a.id || 0),
      selectedRecordStatus: statusText,
      selectedRecordSummary,
      roomName: roomText,
      roomLabel: roomText,
      startDate: a?.startDate,
      endDate: a?.endDate,
      sourceShiftId,
      generatedShiftCount,
      lastGeneratedShiftId,
      lastGeneratedShiftStatus,
      lastGeneratedShiftStart,
      lastGeneratedShiftEnd,
      personelCount,
      stopCount,
      todayGeneratedShift: generatedShiftCount > 0 || todayDone > 0,
      generationHistory: lastShift ? [{
        id: lastGeneratedShiftId || Number(lastShift?.id || 0),
        status: lastGeneratedShiftStatus || String(lastShift?.status || '').toUpperCase(),
        startAt: lastGeneratedShiftStart,
        endAt: lastGeneratedShiftEnd,
        personelCount,
        stopCount,
      }] : [],
      productionSignal: generatedShiftCount > 0 ? `Üretilen vardiya: ${generatedShiftCount}` : 'Bugün üretim sinyali görünmüyor',
      vehicleLabel: bridge?.agreementVehicle?.plate || (a?.vehicleId ? `#${a.vehicleId}` : '-'),
      driverLabel: bridge?.agreementDriver?.fullName || (a?.driverId ? `#${a.driverId}` : '-'),
      routeRefreshState: selectedRouteRefreshPending ? String(selectedRouteRefreshPending.status || '').toUpperCase() : '',
      routeRefreshRequestId: Number(selectedRouteRefreshPending?.id || 0),
      routeRefreshLabel: selectedRouteRefreshPending ? `Rota güncelleme #${selectedRouteRefreshPending.id}` : '',
      routeRefreshNote: selectedRouteRefreshCountered
        ? 'Karşı teklif'
        : (selectedRouteRefreshPending ? 'Bekliyor' : ''),
      routeRefreshChangeType: selectedRouteRefreshPending?.changeType || '',
      routeRefreshCurrentText: selectedRouteRefreshCurrentText,
      routeRefreshProposedText: selectedRouteRefreshProposedText,
      routeRefreshDiffText: selectedRouteRefreshDiffText,
      routeRefreshPriceImpactText: selectedRouteRefreshPriceImpactText,
      routeRefreshRoomCounterText: selectedRouteRefreshRoomCounterText,
      routeRefreshSummaryText: selectedRouteRefreshSummaryText,
      routeRefreshCurrentPreviewShiftId: selectedRouteRefreshCurrentPreviewShiftId,
      routeRefreshProposedPreviewShiftId: selectedRouteRefreshProposedPreviewShiftId,
      dynamicSavingsPreview: selectedDynamicSavingsPreview,
      qualityPaymentBridgePreview: qualityBridgePreview,
      qualityPaymentBridgeSummaryText: qualityBridgeSummaryText,
      qualityPaymentBridgeStatus: qualityBridgeStatusText,
      qualityPaymentBridgeProofCompleteness: qualityBridgeProofCompleteness,
      qualityPaymentBridgeSettlementReadiness: qualityBridgeSettlementReadiness,
      qualityPaymentBridgeImpactStatus: qualityBridgeImpactStatus,
      qualityPaymentBridgeImpactReason: qualityBridgeImpactReason,
      qualityPaymentBridgeMissingProofs: qualityBridgeMissingProofs,
      qualityPaymentBridgeRiskReasons: qualityBridgeRiskReasons,
      qualityPaymentBridgeNextAction: qualityBridgeNextAction,
      seferScorePreview: seferScorePreviewData,
      seferScoreSummaryText,
      seferScoreValue,
      seferScoreMax,
      seferScoreLevel,
      seferScoreConfidence,
      seferScoreStatus,
      seferScoreSupplierLabel,
      seferScorePositiveReasons,
      seferScoreRiskReasons,
      seferScoreMissingSignals,
      seferScoreNextAction,
      seferScoreSafeExplanation,
      pendingCount: Number(items?.length || 0),
      otherCount: 0,
      extendCount: 0,
      shiftCount: Number(todayTotal || 0) + Number(horizonOpen || 0),
      todayDone,
      todayTotal,
      horizonOpen,
    });
    const fields = [
      { label: 'Kaynak vardiya', value: sourceShiftId ? `#${sourceShiftId}` : '-', help: 'Bu sözleşmenin üretim kökünü gösterir.' },
      { label: 'Üretilen vardiya', value: generatedShiftCount > 0 ? String(generatedShiftCount) : 'Yok', help: 'Bu sözleşmeden üretilen toplam vardiya sayısını gösterir.' },
      { label: 'Son üretilen vardiya', value: lastGeneratedShiftId ? `#${lastGeneratedShiftId}` : '-', help: 'En son üretilen vardiyayı gösterir.' },
      { label: 'Son durum', value: lastGeneratedShiftStatus || '-', help: 'Son üretilen vardiyanın durumunu gösterir.' },
      { label: 'Son zaman', value: lastGeneratedShiftStart && lastGeneratedShiftEnd ? `${lastGeneratedShiftStart} - ${lastGeneratedShiftEnd}` : '-', help: 'Son üretilen vardiyanın saat penceresini gösterir.' },
      { label: 'Personel', value: personelCount > 0 ? String(personelCount) : '-', help: 'Son üretilen vardiyadaki personel sayısını gösterir.' },
      { label: 'Durak', value: stopCount > 0 ? String(stopCount) : '-', help: 'Son üretilen vardiyadaki durak sayısını gösterir.' },
      qualityBridgePreview ? { label: 'Kalite durumu', value: qualityBridgeStatusText || '-', help: 'Readonly kalite değerlendirmesi; ödeme başlatılmaz.' } : null,
      qualityBridgePreview ? { label: 'Kanıt tamlığı', value: Number.isFinite(qualityBridgeProofCompleteness) ? `${Math.max(0, Math.min(100, Math.round(qualityBridgeProofCompleteness)))}%` : '-', help: 'Eksik kanıt varsa önce tamamlanmalı.' } : null,
      qualityBridgePreview ? { label: 'Önizleme etkisi', value: qualityBridgeImpactStatus || '-', help: qualityBridgeImpactReason || 'Hakediş önizleme etkisi sadece okunur.' } : null,
      qualityBridgePreview ? { label: 'Hazırlık', value: qualityBridgeSettlementReadiness || '-', help: 'Settlement hazırlığı yalnızca readonly görünür.' } : null,
      qualityBridgePreview ? { label: 'Sıradaki işlem', value: qualityBridgeNextAction || '-', help: 'Sadece öneri gösterilir; ödeme başlatılmaz.' } : null,
      seferScorePreviewData ? { label: 'SeferPuanı', value: Number.isFinite(seferScoreValue) ? `${seferScoreValue.toFixed(2)} / ${seferScoreMax.toFixed(0)}` : '-', help: seferScoreSummaryText || 'Readonly kalite puanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.' } : null,
      seferScorePreviewData ? { label: 'Seviye', value: seferScoreLevel || '-', help: 'Elit / İyi / Standart / Riskli / Kritik.' } : null,
      seferScorePreviewData ? { label: 'Güven', value: seferScoreConfidence || '-', help: 'Önizleme güven seviyesini gösterir.' } : null,
      seferScorePreviewData ? { label: 'Sıradaki Sefer adımı', value: seferScoreNextAction || '-', help: 'Sadece okunur yönlendirme gösterir.' } : null,
      { label: 'Araç', value: bridge?.agreementVehicle?.plate || (a?.vehicleId ? `#${a.vehicleId}` : '-'), help: 'Onay veya üretim sırasında seçilen aracı gösterir.' },
      { label: 'Sürücü', value: bridge?.agreementDriver?.fullName || (a?.driverId ? `#${a.driverId}` : '-'), help: 'Onay veya üretim sırasında seçilen sürücüyü gösterir.' },
      { label: 'Oda', value: roomText, help: 'Sözleşmenin bağlı olduğu operasyon odasını gösterir.' },
      { label: 'Durum', value: statusText, help: 'Sözleşmenin karar veya aktiflik durumunu gösterir.' },
      selectedRouteRefreshPending ? { label: 'Rota güncellemesi', value: selectedRouteRefreshCountered ? 'Karşı teklif' : 'Bekliyor', help: selectedRouteRefreshSummaryText || 'Sözleşmeye bağlı rota güncelleme talebi.' } : null,
      { label: 'Bugün / Ufuk', value: `${todayDone}/${todayTotal} tamamlandı • ${horizonOpen} kabul edildi`, help: 'Bugünkü ilerleme ve ufuktaki vardiya sayısını özetler.' },
      { label: 'Tarih', value: `${ymdTR(a?.startDate)} → ${ymdTR(a?.endDate)}`, help: 'Sözleşmenin geçerli tarih aralığını gösterir.' },
      { label: 'Saat', value: `${toHHMM(a?.startMin)} → ${toHHMM(a?.endMin)}`, help: 'Sözleşmenin çalışma saat aralığını gösterir.' },
    ];
    const badges = [
      { label: 'Yön', value: String(a?.direction || '-').toUpperCase(), help: 'Sözleşmenin akış yönünü gösterir.' },
      { label: 'Plan', value: weekMaskToText(a?.weekMask) || '-', help: 'Haftalık çalışma günlerini özetler.' },
      { label: 'Üretim', value: generatedShiftCount > 0 ? 'Var' : 'Yok', help: 'Bugün üretim sinyali durumunu gösterir.' },
      { label: 'Köprü', value: sourceShiftId > 0 ? 'Açık' : 'Kapalı', help: 'Kaynak vardiya köprüsünün açık olup olmadığını gösterir.' },
      qualityBridgePreview ? { label: 'Readonly', value: 'Ödeme başlatılmaz', help: qualityBridgePreview?.previewOnlyNote || 'Tahsilat/fatura oluşturulmaz.' } : null,
    ];
    return {
      facts: selectionFacts,
      label: selectedRecordLabel,
      summary: [selectedRecordSummary, selectionFacts?.copilotSummary].filter(Boolean).join(' • '),
      fields,
      badges,
      selectedRecordType,
      selectedRecordId: Number(a.id || 0) || 0,
      selectedRecordStatus: statusText,
      selectedRecordSummary,
      copilotSummary: selectionFacts?.copilotSummary || selectedRecordSummary,
    };
  }, [
    selectedAgreementRow,
    selectedAgreementBridge,
    selectedAgreementOrigin,
    shiftStats,
    items.length,
    selectedRouteRefreshPending,
    selectedRouteRefreshCountered,
    selectedRouteRefreshCurrentText,
    selectedRouteRefreshProposedText,
    selectedRouteRefreshDiffText,
    selectedRouteRefreshPriceImpactText,
    selectedRouteRefreshRoomCounterText,
    selectedRouteRefreshSummaryText,
    selectedRouteRefreshCurrentPreviewShiftId,
    selectedRouteRefreshProposedPreviewShiftId,
    selectedDynamicSavingsPreview,
    qualityBridgePreview,
    qualityBridgeStatusText,
    qualityBridgeProofCompleteness,
    qualityBridgeSettlementReadiness,
    qualityBridgeImpactStatus,
    qualityBridgeImpactReason,
    qualityBridgeMissingProofs,
    qualityBridgeRiskReasons,
    qualityBridgeNextAction,
    qualityBridgeSummaryText,
    seferScorePreviewData,
    seferScoreValue,
    seferScoreMax,
    seferScoreLevel,
    seferScoreConfidence,
    seferScoreStatus,
    seferScoreSummaryText,
    seferScoreSupplierLabel,
    seferScorePositiveReasons,
    seferScoreRiskReasons,
    seferScoreMissingSignals,
    seferScoreNextAction,
    seferScoreSafeExplanation,
  ]);

  useEffect(() => {
    if (!selectedAgreementCopilotContext) {
      clearCopilotSelection('/company/agreements');
      return;
    }
    setCopilotSelection({
      scopeKey: '/company/agreements',
      entityType: 'screen',
      entityId: Number(selectedAgreementCopilotContext.selectedRecordId || 0) || 2103,
      label: selectedAgreementCopilotContext.label,
      summary: selectedAgreementCopilotContext.summary,
      fields: selectedAgreementCopilotContext.fields,
      badges: selectedAgreementCopilotContext.badges,
      facts: {
        ...selectedAgreementCopilotContext.facts,
        selectedRecordType: selectedAgreementCopilotContext.selectedRecordType,
        selectedRecordId: selectedAgreementCopilotContext.selectedRecordId,
        selectedRecordLabel: selectedAgreementCopilotContext.label,
        selectedRecordStatus: selectedAgreementCopilotContext.selectedRecordStatus,
        selectedRecordSummary: selectedAgreementCopilotContext.selectedRecordSummary,
      },
    });
  }, [selectedAgreementCopilotContext]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <CompanyAgreementsOverviewSection
        busy={busy}
        statusFilter={statusFilter}
        take={take}
        filterQ={filterQ}
        statusOptions={AGREEMENT_STATUS_OPTIONS}
        recentConversion={recentConversion}
        wizardPrefill={wizardPrefill}
        onStatusFilterChange={setStatusFilter}
        onTakeChange={setTake}
        onFilterChange={setFilterQ}
        onReload={load}
      />

      {err ? <div className="muted" style={{ color: "crimson" }}>{String(err)}</div> : null}

      <PanelSegmentTabs
        ariaLabel="Sözleşme görünümü"
        tabs={AGREEMENTS_VIEW_TABS}
        value={viewMode}
        onChange={setViewMode}
      />

      {viewMode === "bridge" ? (
        <>
          {selectedAgreementRow?.a && selectedAgreementOrigin ? (
            <CompanyAgreementsSourceShiftSection
              origin={selectedAgreementOrigin}
              canShowRouteRefreshActions={canRouteRefresh(selectedAgreementRow?.a, selectedAgreementOrigin)}
              previewShiftId={selectedAgreementPreviewShiftId}
              routeRefreshActionDisabled={busy || Boolean(selectedRouteRefreshPending)}
              routeRefreshActionLabel={selectedRouteRefreshCountered ? "Karşı Teklif Geldi" : selectedRouteRefreshPending ? "Rota Güncelleme Bekliyor" : "Rota Güncelle"}
              onOpenSourceShift={() => openAgreementShift(selectedAgreementOrigin.sourceShiftId, false)}
              onOpenPreview={() => openAgreementShift(selectedAgreementPreviewShiftId, true)}
              onStartRouteRefresh={() => startRouteRefresh(selectedAgreementRow.a, selectedAgreementRow.room)}
            />
          ) : null}

          {selectedAgreementRow?.a ? (
            <CollapsibleSection
              title="Operasyon bağlantısı"
              subtitle="Seçili sözleşmenin ürettiği vardiya ve önizleme bağlantısı ikinci katmanda."
              badge={selectedAgreementRow.a?.id ? `#${selectedAgreementRow.a.id}` : "Seçili"}
              defaultOpen={false}
              compact
            >
              <AgreementOpsBridgeCard
                agreement={selectedAgreementRow.a}
                room={selectedAgreementRow.room}
                bridge={selectedAgreementBridge}
                onOpenShift={(shiftId) => openAgreementShift(shiftId, false)}
                onOpenPreview={(shiftId) => openAgreementShift(shiftId, true)}
                emptyText="Bu sözleşmeden henüz üretilmiş vardiya yok. Operasyon bağlantısı ilk generated shift oluşunca burada görünür."
              />
            </CollapsibleSection>
          ) : null}

          {selectedAgreementRow?.a ? (
            <CollapsibleSection
              title="Kalite / hakediş önizlemesi"
              subtitle="Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz."
              badge={selectedAgreementRow.a?.id ? `#${selectedAgreementRow.a.id}` : "Seçili"}
              defaultOpen={false}
              compact
            >
              <QualityPaymentBridgePreviewCard
                agreement={selectedAgreementRow.a}
                preview={qualityPaymentBridgePreview.data}
                loading={qualityPaymentBridgePreview.loading}
                error={qualityPaymentBridgePreview.err}
              />
              <SeferScorePreviewCard
                agreement={selectedAgreementRow.a}
                preview={seferScorePreviewData}
                loading={seferScorePreview.loading}
                error={seferScorePreview.err}
                style={{ marginTop: 12 }}
              />
            </CollapsibleSection>
          ) : null}

          {selectedRouteRefreshPending ? (
            <CompanyAgreementsRouteRefreshPendingSection
              title={selectedRouteRefreshCountered ? "Rota güncelleme karşı teklifi" : "Bekleyen rota güncelleme teklifi"}
              summaryText={selectedRouteRefreshSummaryText}
              companyOfferNote={selectedRouteRefreshPending.companyOfferNote || ""}
              roomCounterText={selectedRouteRefreshRoomCounterText}
              currentRouteText={selectedRouteRefreshCurrentText}
              proposedRouteText={selectedRouteRefreshProposedText}
              diffText={selectedRouteRefreshDiffText}
              priceImpactText={selectedRouteRefreshPriceImpactText}
              previewError={routeRefreshPreviewSummary.err}
              previewLoading={routeRefreshPreviewSummary.loading}
              currentPreviewShiftId={selectedRouteRefreshCurrentPreviewShiftId}
              proposedPreviewShiftId={selectedRouteRefreshProposedPreviewShiftId}
              dynamicSavingsPreview={selectedDynamicSavingsPreview}
              showCounterActions={selectedRouteRefreshCountered}
              busy={busy}
              onOpenCurrentPreview={() => openAgreementShift(selectedRouteRefreshCurrentPreviewShiftId, true)}
              onOpenProposedPreview={() => openAgreementShift(selectedRouteRefreshProposedPreviewShiftId, true)}
              onAcceptCounter={() => acceptRouteRefreshCounter(selectedRouteRefreshPending.id)}
              onRejectCounter={() => rejectRouteRefreshCounter(selectedRouteRefreshPending.id)}
            />
          ) : null}
        </>
      ) : null}

      {viewMode === "wizard" ? (
        <>
          <div className="card">
            <div style={{ fontWeight: 900 }}>Sözleşme oluşturma kuralı</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Company tarafında sözleşme artık doğrudan bu ekrandan açılmaz. Önce bir vardiya oluştur, ardından ilgili vardiyada <b>Sözleşmeye Dönüştür</b> aksiyonunu kullan.
            </div>
            <div style={{ marginTop: 10 }}>
              <AgreementWizard
                rooms={null}
                roomsSupported={roomsSupported}
                onReloadRooms={null}
                renderTrigger={() => null}
                onCreated={handleWizardCreated}
                launchPrefill={wizardPrefill}
                autoOpenNonce={wizardPrefillNonce}
              />
            </div>
          </div>
        </>
      ) : null}

      {viewMode === "list" ? (
        <div className="tableWrap">
          <CompanyAgreementsSelectedSummarySection
            selectedLabel={selectedAgreementCopilotContext?.label || ""}
            selectedSummary={selectedAgreementCopilotContext?.summary || ""}
            visibleCount={filteredRows.length}
            totalCount={rows.length}
            filterValue={filterQ}
            onClearFilter={() => setFilterQ("")}
          />
          <table className="tbl" style={{ minWidth: 980, marginTop: 10 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Durum</th>
                <th>Oda</th>
                <th>Tarih</th>
                <th>Günler</th>
                <th>Saat</th>
                <th>Dir/Pat</th>
                <th>Şirket Teklifi</th>
                <th>Oda Karşı Teklifi</th>
                <th>Vardiyalar</th>
                <th>Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ a, room }) => (
                <tr key={a.id} onClick={() => setSelectedAgreementId(a.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(a.id || 0))}>
                  <td className="muted">
                    <div>#{a.id}</div>
                    {agreementOrigins?.[String(a.id)]?.sourceShiftId ? (
                      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Kaynak vardiya #{agreementOrigins[String(a.id)].sourceShiftId}</div>
                    ) : null}
                    <CommercialReadonlySummary item={a.commercialBackbone} compact />
                  </td>
                  <td><CompanyAgreementStatusPill status={a.status} /><CompanyAgreementExtendPill extendStatus={a.extendStatus} requestedEndDate={a.extendRequestedEndDate} /></td>
                  <td className="muted">{room ? `${room.name} (#${room.id})` : a.roomId ? `#${a.roomId}` : "-"}</td>
                  <td className="muted">
                    {String(a.startDate || "").slice(0, 10)} → {String(a.endDate || "").slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)}
                  </td>
                  <td className="muted">{a.direction}/{a.pattern}</td>
                  <td className="muted" title={a.companyOfferNote ? `📝 ${a.companyOfferNote}` : ""}>
                    {a.companyOfferAmount != null ? `₺${a.companyOfferAmount}` : "-"}
                    {a.companyOfferNote ? <span style={{ marginLeft: 6 }}>📝</span> : null}
                  </td>
                  <td className="muted" title={a.roomOfferNote ? `📝 ${a.roomOfferNote}` : ""}>
                    {a.roomOfferAmount != null ? `₺${a.roomOfferAmount}` : "-"}
                    {a.roomOfferNote ? <span style={{ marginLeft: 6 }}>📝</span> : null}
                  </td>
                  <td><CompanyAgreementShiftSummary st={shiftStats?.[a.id]} /></td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      {String(a.status || "").toUpperCase() === "COUNTERED" ? (
                        <>
                          <button type="button" disabled={busy} onClick={() => acceptCounter(a.id)}>
                            Kabul Et
                          </button>
                          <button type="button" className="btn" disabled={busy} onClick={() => askCompanyCounter(a)}>
                            Yeni Teklif Gönder
                          </button>
                          <button type="button" className="btn" disabled={busy} onClick={() => rejectCounter(a.id)}>
                            Reddet
                          </button>
                        </>
                      ) : null}
                      {canRouteRefresh(a, agreementOrigins?.[String(a.id)]) ? (
                        <>
                          <button type="button" className="btn" disabled={!agreementPreviewShiftId(a.id)} onClick={() => openAgreementShift(agreementPreviewShiftId(a.id), true)}>
                            Rota Önizleme
                          </button>
                          <button type="button" className="btn" disabled={busy || hasPendingRouteRefresh(a.id)} onClick={() => startRouteRefresh(a, room)}>
                            {routeRefreshActionLabel(a.id)}
                          </button>
                        </>
                      ) : null}
                      <button type="button" disabled={busy || a.status === "CANCELLED" || a.status === "DONE" || a.status === "REJECTED"} onClick={() => cancelAgreement(a.id)}>
                        İptal Et
                      </button>

                      {String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED" ? (
                        <>
                          <button type="button" disabled={busy} onClick={() => acceptExtendCounter(a.id)}>
                            Uzatma Karşı Teklifini Kabul Et
                          </button>
                          <button type="button" className="btn" disabled={busy} onClick={() => rejectExtendCounter(a.id)}>
                            Uzatma Karşı Teklifini Reddet
                          </button>
                        </>
                      ) : null}

                      <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => extendByDays(a, 7)}>
                        Uzat +7g
                      </button>
                      <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => extendByDays(a, 30)}>
                        Uzat +30g
                      </button>
                      <button type="button" disabled={busy || String(a.extendStatus || "NONE").toUpperCase() === "COUNTERED"} onClick={() => askExtend(a)}>
                        Tarih...
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRows.length ? (
                <tr>
                  <td colSpan={11} className="muted">{rows.length ? 'Filtreye uyan sözleşme yok.' : 'Kayıt yok.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <GuidedPlanModal
        open={guidedOpen}
        onClose={() => {
          setGuidedOpen(false);
          setRouteRefreshLaunch(null);
        }}
        rooms={rooms}
        roomsSupported={roomsSupported}
        onReloadRooms={loadRooms}
        onAfterCreated={() => {
          void load();
        }}
        launchContext={routeRefreshLaunch}
        launchNonce={routeRefreshNonce}
      />
    </div>
  );
}
