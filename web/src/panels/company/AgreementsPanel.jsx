import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../../router";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import AgreementWizard from "./AgreementWizard";
import GuidedPlanModal from "./GuidedPlanModal";
import {
  WEEKDAYS,
  DAY_PRESETS,
  TIME_PRESETS,
  DURATION_PRESETS,
  QUICK_DURATION_PRESETS,
  maskFromSelected,
  selectedFromMask,
  weekMaskToText,
  toHHMM,
  addDaysISO,
} from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import { fetchProviderScore } from "../../utils/providerScores";
import { getCompanyAgreements, getCompanyRooms } from "../../utils/companyDataHub";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import AgreementOpsBridgeCard from "../../components/AgreementOpsBridgeCard";
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
import { companyPath } from "../../utils/paths";
import { AGREEMENT_STATUS_OPTIONS, agreementStatusText } from "../../utils/agreementLabels";
import { getShiftRoutePreview } from "../../utils/shiftRoutePreview";
import { routeDiffText, routeSummaryText, summarizeRoutePreview } from "../../utils/routePreviewSummary";

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
const PLAN_TEMPLATES = [
  {
    key: "MORNING",
    label: "Sabah (07:00→09:00) • Hafta içi",
    daysMask: 62,
    startMin: 7 * 60,
    endMin: 9 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "EVENING",
    label: "Akşam (17:00→19:00) • Hafta içi",
    daysMask: 62,
    startMin: 17 * 60,
    endMin: 19 * 60,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "NIGHT",
    label: "Gece (23:00→01:00) • Hafta içi",
    daysMask: 62,
    startMin: 23 * 60,
    endMin: 1 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
  {
    key: "CUSTOM",
    label: "Özel (elle ayarla)",
    daysMask: 62,
    startMin: 8 * 60,
    endMin: 10 * 60,
    direction: "INBOUND",
    pattern: "ONE_WAY",
  },
];

export default function AgreementsPanel() {
  const { token, me } = useSession();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59
  const [opsBridge, setOpsBridge] = useState({});
  const [routeRefreshPendingByAgreement, setRouteRefreshPendingByAgreement] = useState({});
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

  const [templateKey, _setTemplateKey] = useState("MORNING");
  const [roomId, _setRoomId] = useState("");

  const [startDate, _setStartDate] = useState(todayYmd());

  const DEFAULT_DURATION_KEY = QUICK_DURATION_PRESETS?.[0]?.key || "2d";
  const [durationKey, _setDurationKey] = useState(DEFAULT_DURATION_KEY);
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS.find((x) => x.key === DEFAULT_DURATION_KEY) || DURATION_PRESETS[0];
    return Number(p.days || 30);
  }, [DEFAULT_DURATION_KEY, durationKey]);
  const [_endDate, setEndDate] = useState(addDaysISO(todayYmd(), 0));

  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const _weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  const [_startHHMM, setStartHHMM] = useState("07:00");
  const [_endHHMM, setEndHHMM] = useState("09:00");

  // routing meta
  const [_direction, setDirection] = useState("INBOUND");
  const [_pattern, setPattern] = useState("ONE_WAY");

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

  function applyTemplate(key) {
    const t = PLAN_TEMPLATES.find((x) => x.key === key) || PLAN_TEMPLATES[0];
    setDaysSel(selectedFromMask(t.daysMask));
    setStartHHMM(toHHMM(t.startMin));
    setEndHHMM(toHHMM(t.endMin));
    setDirection(t.direction);
    setPattern(t.pattern);
  }

  useEffect(() => {
    applyTemplate(templateKey);
  }, [templateKey]);

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
  }, [statusFilter, take, token]);

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

  useEffect(() => {
    const row = selectedAgreementRow;
    if (!row?.a) {
      clearCopilotSelection('/company/agreements');
      return;
    }
    const { a, room } = row;
    const todayTotal = Number(shiftStats?.[a.id]?.todayTotal || 0);
    const todayDone = Number(shiftStats?.[a.id]?.todayDone || 0);
    const horizonOpen = Number(shiftStats?.[a.id]?.horizonOpen || 0);
    setCopilotSelection({
      scopeKey: '/company/agreements',
      entityType: 'agreement',
      entityId: Number(a?.id || 2103) || 2103,
      label: `Sözleşme #${a.id}`,
      summary: [agreementStatusText(a?.status), room?.name || `Oda #${a?.roomId || '-'}`, ymdTR(a?.startDate), ymdTR(a?.endDate)].filter(Boolean).join(' • '),
      fields: [
        { label: 'Oda', value: room?.name || `#${a?.roomId || '-'}`, help: 'Sözleşmenin bağlı olduğu operasyon odasını gösterir.' },
        { label: 'Durum', value: agreementStatusText(a?.status), help: 'Sözleşmenin karar veya aktiflik durumunu gösterir.' },
        { label: 'Başlangıç', value: ymdTR(a?.startDate), help: 'Sözleşmenin başlangıç tarihini gösterir.' },
        { label: 'Bitiş', value: ymdTR(a?.endDate), help: 'Sözleşmenin bitiş tarihini gösterir.' },
        { label: 'Tutar', value: a?.companyOfferAmount != null ? `${new Intl.NumberFormat("tr-TR").format(Number(a.companyOfferAmount || 0))} ₺` : '-', help: 'Company teklif veya sözleşme tutarını gösterir.' },
        { label: 'Bugün / Ufuk', value: `${todayDone}/${todayTotal} tamamlandı • ${horizonOpen} kabul edildi`, help: 'Bugünkü ilerleme ve ufuktaki vardiya sayısını özetler.' },
      ],
      badges: [
        { label: 'Yön', value: String(a?.direction || '-').toUpperCase(), help: 'Sözleşmenin akış yönünü gösterir.' },
        { label: 'Plan', value: weekMaskToText(a?.weekMask) || '-', help: 'Haftalık çalışma günlerini özetler.' },
      ],
      facts: { screenType: 'AGREEMENTS', stage: String(a?.status || '').toUpperCase(), nextBestAction: 'Önce durum, oda ve tarih aralığını birlikte oku. Sonra bugün/ufuk verisini kontrol et.' },
    });
  }, [selectedAgreementRow, shiftStats]);

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
          showCounterActions={selectedRouteRefreshCountered}
          busy={busy}
          onOpenCurrentPreview={() => openAgreementShift(selectedRouteRefreshCurrentPreviewShiftId, true)}
          onOpenProposedPreview={() => openAgreementShift(selectedRouteRefreshProposedPreviewShiftId, true)}
          onAcceptCounter={() => acceptRouteRefreshCounter(selectedRouteRefreshPending.id)}
          onRejectCounter={() => rejectRouteRefreshCounter(selectedRouteRefreshPending.id)}
        />
      ) : null}

      {selectedAgreementRow?.a ? (
        <AgreementOpsBridgeCard
          agreement={selectedAgreementRow.a}
          room={selectedAgreementRow.room}
          bridge={selectedAgreementBridge}
          onOpenShift={(shiftId) => openAgreementShift(shiftId, false)}
          onOpenPreview={(shiftId) => openAgreementShift(shiftId, true)}
          emptyText="Bu sözleşmeden henüz üretilmiş vardiya yok. Operasyon bağlantısı ilk generated shift oluşunca burada görünür."
        />
      ) : null}

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

      {/* List */}
      <div className="tableWrap">
        <CompanyAgreementsSelectedSummarySection
          selectedLabel={selectedAgreementRow?.a ? `Sözleşme #${selectedAgreementRow.a.id}` : ""}
          selectedSummary={selectedAgreementRow?.a ? [agreementStatusText(selectedAgreementRow.a.status), selectedAgreementRow?.room?.name || `Oda #${selectedAgreementRow.a.roomId || '-'}`, ymdTR(selectedAgreementRow.a.startDate), ymdTR(selectedAgreementRow.a.endDate), selectedAgreementOrigin?.sourceShiftId ? `Kaynak vardiya #${selectedAgreementOrigin.sourceShiftId}` : null].filter(Boolean).join(" • ") : ""}
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
