// web/src/panels/company/ShiftsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";
import { personLabel } from "../../utils/labels";
import { addDaysYmdTR, isoFromTRLocalInput, toDatetimeLocalTR, ymdTR } from "../../utils/time";
import ShiftPeopleTab from "./ShiftPeopleTab";
import ShiftTemplatesPanel, { PRESET_TEMPLATES, DEFAULT_WEEKMASK, DEFAULT_DURATION_KEY } from "./ShiftTemplatesPanel";
import PlanBuilderPanel from "./PlanBuilderPanel";
import RoutePreviewModal from "../../components/RoutePreviewModal";
import { getPath, navigate } from "../../router";
import { companyPath } from "../../utils/paths";
import { ProviderScoreBadge } from "../../components/ProviderScoreBadge";
import ShiftOperationEventsModal from "../../components/ShiftOperationEventsModal";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildShiftFacts } from "../../utils/copilotFacts";
import { fetchProviderScoreMap } from "../../utils/providerScores";
import { getCompanyCommercialFlowSummary, getCompanyRooms, getCompanyShifts, getCompanyVehicles } from "../../utils/companyDataHub";
import { rowSelectionStyle } from "../../utils/listUi";

const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

function AgreementBadge({ agreementId }) {
  const id = Number(agreementId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return (
    <span
      className="pill"
      data-status="AGREEMENT"
      title="Agreement kaynaklı otomatik shift"
      style={{ marginLeft: 8 }}
    >
      Agreement #{id}
    </span>
  );
}


function vehicleMetaLine(v) {
  const type = TYPE_TR[v?.type] || (v?.type ? String(v.type) : "");
  const bmy = [v?.brand, v?.model, v?.modelYear].filter(Boolean).join(" ");
  const cap = Number.isFinite(v?.capacity) ? `${v.capacity} koltuk` : "";
  return [type, bmy, cap].filter(Boolean).join(" • ");
}
function clickableInfoStyle(disabled = false) {
  return {
    border: 0,
    background: "transparent",
    padding: 0,
    margin: 0,
    color: disabled ? "var(--muted)" : "inherit",
    cursor: disabled ? "default" : "pointer",
    textDecoration: disabled ? "none" : "underline dotted",
    textUnderlineOffset: 3,
    font: "inherit",
  };
}
function roomLabel(r) {
  if (!r) return "";
  return r.name || r.title || `Room #${r.id}`;
}
function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}


function formatTRY(amount) {
  if (amount == null) return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("tr-TR").format(n);
}
function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function offerGapMeta(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;

  if (hasCompany && hasRoom) {
    const diff = room - company;
    if (diff === 0) return { label: "Fiyat farkı", value: "Hizalı", tone: "good", note: "Aynı tutar" };
    if (diff > 0) return { label: "Fiyat farkı", value: `+${formatTRY(diff)} ₺`, tone: "warn", note: "Room daha yüksek" };
    return { label: "Fiyat farkı", value: `-${formatTRY(Math.abs(diff))} ₺`, tone: "good", note: "Company daha yüksek" };
  }

  if (hasRoom && !hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(room)} ₺`, tone: "warn", note: "Sadece room teklifi var" };
  if (!hasRoom && hasCompany) return { label: "Fiyat farkı", value: `${formatTRY(company)} ₺`, tone: "neutral", note: "Room cevabı bekleniyor" };
  return { label: "Fiyat farkı", value: "-", tone: "neutral", note: "Tutar sinyali yok" };
}

function OfferSignalPill({ label, value, tone = "neutral" }) {
  const palette =
    tone === "good"
      ? { border: "1px solid rgba(18,183,106,0.35)", background: "rgba(18,183,106,0.10)", color: "#d1fadf" }
      : tone === "warn"
      ? { border: "1px solid rgba(242,153,74,0.35)", background: "rgba(242,153,74,0.10)", color: "#fbd5a5" }
      : { border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#d0d5dd" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...palette,
      }}
    >
      <span style={{ opacity: 0.82 }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}


function providerAverageScore(score) {
  const avg = Number(score?.averageScore);
  const count = Number(score?.evaluationCount || 0);
  return Number.isFinite(avg) && count > 0 ? avg : 0;
}

function offerDecisionPriority(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COUNTERED") return 2;
  if (normalized === "OPEN") return 1;
  return 0;
}

function offerPriceSortValue(amountCompany, amountRoom) {
  const company = Number(amountCompany);
  const room = Number(amountRoom);
  const hasCompany = Number.isFinite(company) && company > 0;
  const hasRoom = Number.isFinite(room) && room > 0;
  if (hasCompany && hasRoom) return room - company;
  if (hasRoom && !hasCompany) return room + 1000000;
  if (!hasRoom && hasCompany) return 500000;
  return 999999;
}

function offerUpdatedSortValue(offer) {
  const value = Date.parse(offer?.updatedAt || offer?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function compareRecommendedOffers(a, b, roomScores = {}) {
  const aDecision = offerDecisionPriority(a?.status);
  const bDecision = offerDecisionPriority(b?.status);
  if (aDecision !== bDecision) return bDecision - aDecision;

  const aRoomId = String(Number(a?.room?.id || a?.roomId || 0));
  const bRoomId = String(Number(b?.room?.id || b?.roomId || 0));
  const aScore = providerAverageScore(roomScores[aRoomId] || null);
  const bScore = providerAverageScore(roomScores[bRoomId] || null);
  if (aScore !== bScore) return bScore - aScore;

  const aGap = offerPriceSortValue(a?.amountCompany, a?.amountRoom);
  const bGap = offerPriceSortValue(b?.amountCompany, b?.amountRoom);
  if (aGap !== bGap) return aGap - bGap;

  return offerUpdatedSortValue(b) - offerUpdatedSortValue(a);
}

function buildRecommendationReason(offer, roomScores = {}) {
  const parts = [];
  const status = String(offer?.status || "").toUpperCase();
  if (status === "COUNTERED") parts.push("karşı teklif");
  else if (status === "OPEN") parts.push("açık teklif");

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  if (scoreValue > 0) parts.push(`puan ${scoreValue.toFixed(1)}`);

  const gap = offerGapMeta(offer?.amountCompany, offer?.amountRoom);
  if (gap?.value && gap.value !== "-") {
    parts.push(gap.value === "Hizalı" ? "fiyat hizalı" : `${gap.label.toLowerCase()} ${gap.value}`);
  }

  return parts.join(" • ");
}

function buildRecommendationMeta(offer, bucket = [], roomScores = {}) {
  const reasons = [];
  const statusPriority = offerDecisionPriority(offer?.status);
  const bucketPriorities = bucket.map((item) => offerDecisionPriority(item?.status));
  const bestPriority = bucketPriorities.length ? Math.max(...bucketPriorities) : statusPriority;
  if (statusPriority === bestPriority && bucketPriorities.some((value) => value !== statusPriority)) {
    if (String(offer?.status || "").toUpperCase() === "COUNTERED") reasons.push("Karşı teklif hazır");
    else if (String(offer?.status || "").toUpperCase() === "OPEN") reasons.push("Açık teklif hazır");
  }

  const roomId = String(Number(offer?.room?.id || offer?.roomId || 0));
  const scoreValue = providerAverageScore(roomScores[roomId] || null);
  const bucketScores = bucket.map((item) => {
    const key = String(Number(item?.room?.id || item?.roomId || 0));
    return providerAverageScore(roomScores[key] || null);
  });
  const bestScore = bucketScores.length ? Math.max(...bucketScores) : scoreValue;
  if (scoreValue > 0 && scoreValue === bestScore && bucketScores.some((value) => value < scoreValue)) {
    reasons.push("Room puanı daha yüksek");
  }

  const gapValue = offerPriceSortValue(offer?.amountCompany, offer?.amountRoom);
  const bucketGaps = bucket.map((item) => offerPriceSortValue(item?.amountCompany, item?.amountRoom));
  const bestGap = bucketGaps.length ? Math.min(...bucketGaps) : gapValue;
  if (Number.isFinite(gapValue) && gapValue === bestGap && bucketGaps.some((value) => value > gapValue)) {
    reasons.push("Fiyat farkı daha düşük");
  }

  const updatedValue = offerUpdatedSortValue(offer);
  const bucketUpdates = bucket.map((item) => offerUpdatedSortValue(item));
  const latestUpdate = bucketUpdates.length ? Math.max(...bucketUpdates) : updatedValue;
  if (!reasons.length && updatedValue === latestUpdate && bucketUpdates.some((value) => value < updatedValue)) {
    reasons.push("Daha güncel cevap");
  }

  const fallback = buildRecommendationReason(offer, roomScores) || "Bu vardiya için otomatik öne çıktı";
  return {
    short: reasons[0] || fallback,
    summary: reasons.length ? reasons.join(" • ") : fallback,
    reasons: reasons.length ? reasons : [fallback],
  };
}

function rankOffersWithRecommendation(items, roomScores = {}) {
  const list = Array.isArray(items) ? [...items] : [];
  if (!list.length) return [];

  const byShift = new Map();
  for (const offer of list) {
    const shiftId = Number(offer?.shiftId || offer?.shift?.id || 0);
    const key = shiftId > 0 ? `shift:${shiftId}` : `single:${offer?.id || Math.random()}`;
    const bucket = byShift.get(key) || [];
    bucket.push(offer);
    byShift.set(key, bucket);
  }

  const recommendationMetaById = new Map();
  for (const bucket of byShift.values()) {
    if (!bucket || bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => compareRecommendedOffers(a, b, roomScores));
    const winner = sorted[0];
    if (winner?.id != null) {
      recommendationMetaById.set(winner.id, buildRecommendationMeta(winner, bucket, roomScores));
    }
  }

  return list
    .map((offer) => {
      const meta = recommendationMetaById.get(offer.id);
      return {
        ...offer,
        __recommended: Boolean(meta),
        __recommendationReason: meta?.summary || "",
        __recommendationShort: meta?.short || "",
        __recommendationReasons: meta?.reasons || [],
      };
    })
    .sort((a, b) => {
      const recDiff = Number(Boolean(b.__recommended)) - Number(Boolean(a.__recommended));
      if (recDiff) return recDiff;
      const shiftDiff = Number(b?.shiftId || b?.shift?.id || 0) - Number(a?.shiftId || a?.shift?.id || 0);
      if (shiftDiff) return shiftDiff;
      return compareRecommendedOffers(a, b, roomScores);
    });
}

function RecommendationBadge({ reason = "" }) {
  return (
    <span
      title={reason || "Bu vardiya için otomatik öne çıktı"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(83,177,253,0.35)",
        background: "rgba(83,177,253,0.12)",
        color: "#b2ddff",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      Önerilen
    </span>
  );
}

function RecommendationReasons({ reasons = [] }) {
  if (!Array.isArray(reasons) || !reasons.length) return null;
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {reasons.slice(0, 3).map((reason, idx) => (
        <span
          key={`${reason}-${idx}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(83,177,253,0.20)",
            background: "rgba(83,177,253,0.08)",
            color: "#d6efff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {reason}
        </span>
      ))}
    </div>
  );
}


function pad2(n) {
  return String(n).padStart(2, "0");
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
function todayYmdLocal() {
  return ymdTR();
}
function addDaysYmd(ymd, deltaDays) {
  return addDaysYmdTR(ymd, deltaDays);
}

function pickCount(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}





export default function CompanyShiftsPanel({ mode = "track" } = {}) {
  const { token, me } = useSession();
  const who = personLabel(me);
  const isCommercialMode = mode === "commercial";


  function goPlanningCenter() {
    navigate(companyPath(me));
  }

  const LS_LAST_ROOM = "company:lastRoomId";

  // Page tabs (Create vs Track)
  const [mainTab, setMainTab] = useState("track"); // create | track
  const [trackTab, setTrackTab] = useState(isCommercialMode ? "market" : "pending"); // market | pending | list

  // Create flow (no new wizard; in-page steps)
  const [createStep, setCreateStep] = useState("request"); // request | people | plan
  const [showTemplatesMgr, setShowTemplatesMgr] = useState(false);
    // Create flow (Plan Builder time range comes from Step-1)
  const [pbDate, setPbDate] = useState(() => todayYmdLocal());
  const [pbTplKey, setPbTplKey] = useState("");
  const [lastCreatedShiftId, setLastCreatedShiftId] = useState(0);


  const [items, setItems] = useState([]);
  const [commercialSummary, setCommercialSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomScores, setRoomScores] = useState({});
  const [refDataReady, setRefDataReady] = useState(false);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [opsEventsModal, setOpsEventsModal] = useState({ open: false, shiftId: null });
  const refLoadPromiseRef = useRef(null);
  const commercialSummaryCacheRef = useRef({ ts: 0, data: null });
  const commercialSummaryPromiseRef = useRef(null);


  // ✅ M24: Market shift (room seçmeden) + multi-room offers
  const [marketMode, setMarketMode] = useState(false);
  const [marketQ, setMarketQ] = useState("");
  const [marketFocusIds, setMarketFocusIds] = useState([]);
  const [pendingFocusIds, setPendingFocusIds] = useState([]);
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

  useEffect(() => {
    if (isCommercialMode) {
      setMainTab("track");
      setTrackTab((prev) => (prev === "list" ? prev : "market"));
    }
    if (mainTab !== "track") return;
    if (trackTab === "market") ensureAcc("market");
    if (trackTab === "pending") ensureAcc("pending");
    if (trackTab === "list") ensureAcc("list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommercialMode, mainTab, trackTab]);

  // Room teklif kararı butonları için
  const [decidingId, setDecidingId] = useState(null);

  // Decision note input state (shift bazlı)
  const [decisionNoteSel, setDecisionNoteSel] = useState({}); // { [shiftId]: string }
  function setDecisionNote(shiftId, value) {
    setDecisionNoteSel((p) => ({ ...p, [Number(shiftId)]: value }));
  }

  // Pending filtreler
  const [pendingQ, setPendingQ] = useState("");
  // Hızlı filtre (Bugün / Yarın) — Istanbul local YYYY-MM-DD
  const [dayYmd, setDayYmd] = useState("");
  const [applyToast, setApplyToast] = useState(null); // { ids:number[] }
  const marketSectionRef = useRef(null);
  const pendingSectionRef = useRef(null);
  const listSectionRef = useRef(null);
  const marketSearchRef = useRef(null);


// M41: Accordion (Market / Bekleyen / Liste)
const [accOpen, setAccOpen] = useState({ market: false, pending: true, list: false });
const toggleAcc = (key) => setAccOpen((p) => ({ ...p, [key]: !p?.[key] }));
const ensureAcc = (key) => setAccOpen((p) => (p?.[key] ? p : ({ ...p, [key]: true })));

  // M34 Step-6: Plan Builder → Bekleyen Talepler’e filtreli geçiş
  useEffect(() => {
    const onFocus = (ev) => {
      const d = ev?.detail || {};
      const ids = Array.isArray(d.shiftIds) ? d.shiftIds.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
      if (!ids.length) return;

      const section = String(d.section || "market");
      setMainTab("track");

      if (section === "pending") {
        setTrackTab("pending");
        ensureAcc("pending");
        setPendingFocusIds(ids);
        setMarketFocusIds([]);
        setPendingQ("");
        setTimeout(() => {
          try { pendingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
        }, 80);
      } else if (section === "list") {
        setTrackTab("list");
        ensureAcc("list");
        setPendingFocusIds([]);
        setMarketFocusIds([]);
        setTimeout(() => {
          try { listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
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
          } catch (e) {}
        }, 80);
      }
    };
    window.addEventListener("company:shifts:focus", onFocus);
    return () => window.removeEventListener("company:shifts:focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusMarketById(id) {
    if (!id) return;
    setMainTab("track");
    setTrackTab("market");
    ensureAcc("market");
    setMarketQ(String(id));
    setTimeout(() => {
      try {
        marketSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
      try {
        marketSearchRef.current?.focus?.();
      } catch {}
    }, 50);
  }



  const [pendingOnlyRoomOffer, setPendingOnlyRoomOffer] = useState(false);
  const [focusedTrackShiftId, setFocusedTrackShiftId] = useState(null);
  const [onlyAgreement, setOnlyAgreement] = useState(false);

  // Final liste filtreler
  const [finalQ, setFinalQ] = useState("");
  const [finalStatus, setFinalStatus] = useState("ALL");

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

  function shiftStartYmdIstanbul(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    } catch {
      return "";
    }
  }

  function isSameDayIstanbul(iso, ymd) {
    if (!ymd) return true;
    const d = shiftStartYmdIstanbul(iso);
    return d && d === ymd;
  }

  // datetime-local (Istanbul local) -> canonical ISO instant
  function istanbulLocalToUtcIso(dtLocal) {
    return isoFromTRLocalInput(dtLocal) || null;
  }


function utcIsoToIstanbulLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!d || Number.isNaN(d.getTime())) return "";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${ymd}T${hm}`;
}

function openExtendModal(shift) {
  if (!shift) return;
  const baseEnd = shift?.endAt ? new Date(shift.endAt).getTime() : Date.now();
  setExtendModal({
    open: true,
    shift,
    endLocal: toDatetimeLocalTR(new Date(baseEnd + 60 * 60 * 1000)),
    note: "",
  });
}

async function submitExtendRequest() {
  const s = extendModal.shift;
  const sid = Number(s?.id);
  if (!sid) return;
  const iso = istanbulLocalToUtcIso(extendModal.endLocal);
  if (!iso) {
    setErr("Yeni bitiş tarihi geçersiz.");
    return;
  }
  setBusy(true);
  setErr("");
  try {
    await api.put(`/api/shifts/${sid}/extend-request`, {
      requestedEndAt: iso,
      noteCompany: trimOrNull(extendModal.note),
    }, { token });
    setExtendModal({ open: false, shift: null, endLocal: "", note: "" });
    invalidate("shift:list");
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setBusy(false);
  }
}

// ===== Templates (company-localStorage) =====
// Amaç: Wizard'daki plan paketleri + günler + süre mantığını tek yerde toplamak.
// Not: LocalStorage company bazlıdır. Eski (v1) şablonlar otomatik migrate edilir.

const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
const templatesStorageKey = `psv1:company:${companyKey}:shiftTemplates:v2`;
const templatesStorageKeyLegacy = `psv1:company:${companyKey}:shiftTemplates:v1`;

const [customTemplates, setCustomTemplates] = useState([]); // [{id,name,packKey,weekMask,durationKey,items[],people,kind:"CUSTOM"}]


function normalizeTemplate(x) {
  if (!x) return null;
  const id = String(x?.id || "").trim();
  const name = String(x?.name || "").trim();
  const packKey = String(x?.packKey || "CUSTOM").trim();
  const weekMask = Number.isFinite(Number(x?.weekMask)) ? Number(x.weekMask) : DEFAULT_WEEKMASK;
  const durationKey = String(x?.durationKey || DEFAULT_DURATION_KEY);
  const people = x?.people == null || x?.people === "" ? null : Number(x.people);

  let items = []
  if (Array.isArray(x?.items) && x.items.length) {
    items = x.items
      .map((it) => ({
        label: String(it?.label || "Vardiya").trim() || "Vardiya",
        startHHMM: String(it?.startHHMM || "").trim(),
        endHHMM: String(it?.endHHMM || "").trim(),
        direction: String(it?.direction || "INBOUND"),
        pattern: String(it?.pattern || "ONE_WAY"),
      }))
      .filter((it) => minutesOf(it.startHHMM) != null && minutesOf(it.endHHMM) != null);
  } else if (x?.startHHMM && x?.endHHMM) {
    // legacy v1
    const s = String(x.startHHMM).trim();
    const e = String(x.endHHMM).trim();
    if (minutesOf(s) != null && minutesOf(e) != null) {
      items = [{ label: name || "Vardiya", startHHMM: s, endHHMM: e, direction: "INBOUND", pattern: "ONE_WAY" }];
    }
  }

  if (!id || !name || !items.length) return null;

  return {
    id,
    name,
    packKey,
    weekMask,
    durationKey,
    items,
    people: Number.isFinite(people) && people > 0 ? people : null,
    kind: "CUSTOM",
  };
}

function loadCustomTemplates() {
  const candidates = []
  for (const key of [templatesStorageKey, templatesStorageKeyLegacy]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    } catch {
      // ignore
    }
  }

  const seen = new Set();
  const out = [];
  for (const x of candidates) {
    const nx = normalizeTemplate(x);
    if (!nx) continue;
    if (seen.has(nx.id)) continue;
    seen.add(nx.id);
    out.push(nx);
  }

  // write back migrated v2 (best effort)
  try {
    localStorage.setItem(templatesStorageKey, JSON.stringify(out));
  } catch {
    // ignore
  }

  return out;
}

useEffect(() => {
  setCustomTemplates(loadCustomTemplates());
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [templatesStorageKey]);

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
  const [roomQ, setRoomQ] = useState(""); // M22: room directory search
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [seatDemand, setSeatDemand] = useState("");
  const [planDraftMeta, setPlanDraftMeta] = useState(null);
  const [offerVehicleId, setOfferVehicleId] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");

// template selection in request tab
// Not: bundle template varsa her item ayrı option olur (tplId::idx)
const [selectedTemplateId, setSelectedTemplateId] = useState("");

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

const pbSelected = useMemo(
  () => templateOptions.find((o) => String(o.key) === String(pbTplKey)) || null,
  [templateOptions, pbTplKey]
);

function buildLocalRangeFromItem(baseDate, it) {
  if (!baseDate || !it?.startHHMM || !it?.endHHMM) return { startAtLocal: "", endAtLocal: "" };
  const sMin = minutesOf(it.startHHMM);
  const eMin = minutesOf(it.endHHMM);
  if (sMin == null || eMin == null) return { startAtLocal: "", endAtLocal: "" };

  const startAtLocal = `${baseDate}T${it.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endAtLocal = `${endDate}T${it.endHHMM}`;
  return { startAtLocal, endAtLocal };
}

const pbRange = useMemo(() => buildLocalRangeFromItem(pbDate, pbSelected?.item), [pbDate, pbSelected]);
const pbOk = Boolean(pbRange?.startAtLocal && pbRange?.endAtLocal);

function applyTemplateItemToRequest(tpl, it) {
  if (!tpl || !it) return;

  const baseDate = startAt ? String(startAt).slice(0, 10) : todayYmdLocal();

  const sMin = minutesOf(it.startHHMM);
  const eMin = minutesOf(it.endHHMM);
  if (sMin == null || eMin == null) return;

  const startDT = `${baseDate}T${it.startHHMM}`;
  const endDate = eMin <= sMin ? addDaysYmd(baseDate, 1) : baseDate;
  const endDT = `${endDate}T${it.endHHMM}`;

  setStartAt(startDT);
  setEndAt(endDT);

  if (!String(seatDemand || "").trim() && tpl.people != null) {
    setSeatDemand(String(tpl.people));
  }
}

function onSelectTemplate(key) {
  const k = String(key || "");
  setSelectedTemplateId(k);
  const opt = templateOptions.find((x) => x.key === k);
  if (!opt) return;
  applyTemplateItemToRequest(opt.tpl, opt.item);
}

function useTemplateFromList(tpl, itemIndex = 0) {
  setMainTab("create");
  setCreateStep("request");
  setShowTemplatesMgr(false);
  const k = `${tpl.id}::${Number(itemIndex) || 0}`;
  setSelectedTemplateId(k);
  const it = (tpl?.items || [])[Number(itemIndex) || 0];
  applyTemplateItemToRequest(tpl, it);
}

function usePlanDraftToRequest(draft) {
  // draft: {startAtLocal,endAtLocal,seatDemand,templateKey,marketMode,peopleIds,peopleNames,centroid,routeSummary}
  setMainTab("create");
  setCreateStep("request");
  setShowTemplatesMgr(false);
  setSelectedTemplateId(String(draft?.templateKey || ""));
  setStartAt(String(draft?.startAtLocal || ""));
  setEndAt(String(draft?.endAtLocal || ""));
  setSeatDemand(draft?.seatDemand != null ? String(draft.seatDemand) : "");
  setMarketMode(Boolean(draft?.marketMode));
  setPlanDraftMeta(draft || null);

  // Clear direct-offer fields (Plan Builder genelde market akışını hedefler)
  setOfferVehicleId("");
  setOfferAmount("");
  setOfferNote("");
}

  // Karşı teklif UI
  const [offerOpen, setOfferOpen] = useState({});
  const [offerSel, setOfferSel] = useState({});

  const isCompany = String(me?.role || "") === "COMPANY";
  const copilotScopeKey = useMemo(() => {
    const path = String(getPath() || "/company/shifts").split("?")[0];
    if (path === "/school/shifts" || path === "/organization/shifts") return path;
    return "/company/shifts";
  }, []);

  function toggleOffer(shiftId) {
    setOfferOpen((p) => ({ ...p, [shiftId]: !p[shiftId] }));
  }
  function setOfferForShift(shiftId, patch) {
    setOfferSel((prev) => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), ...patch },
    }));
  }

  function needsReferenceData() {
    if (mainTab === "create") return true;
    if (detailModal?.kind === "vehicle") return true;
    if (offerModal?.open || offersModal?.open) return true;
    if (Object.values(offerOpen || {}).some(Boolean)) return true;
    if (offerVehicleId) return true;
    return false;
  }

  async function ensureReferenceData(signal, { force = false } = {}) {
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
  }

  async function loadCommercialSummary(signal, { force = false } = {}) {
    if (!token) return null;
    const now = Date.now();
    const cacheAge = now - Number(commercialSummaryCacheRef.current?.ts || 0);
    if (!force && commercialSummaryCacheRef.current?.data != null && cacheAge < 20000) {
      return commercialSummaryCacheRef.current.data;
    }
    if (!force && commercialSummaryPromiseRef.current) {
      return commercialSummaryPromiseRef.current;
    }

    const promise = getCompanyCommercialFlowSummary(token, { signal, ttlMs: 30000 }).catch(() => null);
    commercialSummaryPromiseRef.current = promise;
    try {
      const overview = await promise;
      if (!signal?.aborted) {
        commercialSummaryCacheRef.current = { ts: Date.now(), data: overview || null };
      }
      return overview || null;
    } finally {
      if (commercialSummaryPromiseRef.current === promise) commercialSummaryPromiseRef.current = null;
    }
  }

  async function load(signal, { withReferences = false, forceReferences = false } = {}) {
    setErr("");
    try {
      const sh = await getCompanyShifts(token, { signal, ttlMs: 25000, take: 32 });
      if (signal?.aborted) return;

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
      setItems(list);

      setDecisionNoteSel((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const s of list) {
          const sid = Number(s.id);
          if (next[sid] === undefined) {
            next[sid] = "";
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      if (withReferences || needsReferenceData()) {
        await ensureReferenceData(signal, { force: forceReferences });
      }

      const overview = await loadCommercialSummary(signal, { force: forceReferences });
      if (signal?.aborted) return;
      setCommercialSummary(overview || null);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(controller.signal, { withReferences: false });
    }, 320);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [token, mainTab, detailModal?.kind, offerModal?.open, offersModal?.open, offerVehicleId, JSON.stringify(offerOpen)]);

  // M28 + M30-A: wizard sonrası tek intent kuyruğundan teklif ekranı aç
  useEffect(() => {
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
  }, [token]);

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
      if (rid > 0 && !m.has(rid)) m.set(rid, s?.room || { id: rid, name: `Room #${rid}` });
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

  const copilotShift = useMemo(() => {
    if (mainTab !== "track") return null;
    if (copilotShiftId) {
      return items.find((s) => Number(s?.id || 0) === copilotShiftId) || null;
    }

    const finalStatuses = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]);
    const marketFocusSet = new Set((marketFocusIds || []).map(Number));
    const pendingFocusSet = new Set((pendingFocusIds || []).map(Number));
    const marketNeedle = String(marketQ || "").trim().toLowerCase();
    const pendingNeedle = String(pendingQ || "").trim().toLowerCase();
    const finalNeedle = String(finalQ || "").trim().toLowerCase();

    const matchesDay = (shift) => (!dayYmd ? true : isSameDayIstanbul(shift?.startAt, dayYmd));

    if (trackTab === "market") {
      return items.find((s) => {
        const status = String(s?.status || "");
        if (finalStatuses.has(status)) return false;
        if (!(s?.roomId == null || s?.roomId === "")) return false;
        if (onlyAgreement && Number(s?.agreementId || 0) <= 0) return false;
        if (!matchesDay(s)) return false;
        if (marketFocusSet.size && !marketFocusSet.has(Number(s?.id || 0))) return false;
        if (!marketNeedle) return true;
        const hay = [s?.id, status, s?.companyId].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(marketNeedle);
      }) || null;
    }

    if (trackTab === "pending") {
      return items.find((s) => {
        const status = String(s?.status || "");
        const isSplitRoot = status === "SPLIT" && !Number(s?.splitRootId || 0);
        if (isSplitRoot || finalStatuses.has(status)) return false;
        if (s?.roomId == null || s?.roomId === "") return false;
        if (onlyAgreement && Number(s?.agreementId || 0) <= 0) return false;
        if (!matchesDay(s)) return false;
        if (pendingFocusSet.size && !pendingFocusSet.has(Number(s?.id || 0))) return false;
        if (pendingOnlyRoomOffer) {
          const hasRoomOffer = Boolean(s?.roomOfferVehicleId) || s?.roomOfferAmount != null || Boolean(s?.roomOfferNote) || Boolean(s?.roomOfferToDriver) || Boolean(s?.roomOfferDriverNote);
          if (!hasRoomOffer) return false;
        }
        if (!pendingNeedle) return true;
        const hay = [s?.id, status, s?.roomId, s?.companyId, s?.roomOfferNote, s?.companyOfferNote].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(pendingNeedle);
      }) || null;
    }

    return items.find((s) => {
      const status = String(s?.status || "");
      if (!finalStatuses.has(status)) return false;
      if (onlyAgreement && Number(s?.agreementId || 0) <= 0) return false;
      if (!matchesDay(s)) return false;
      if (finalStatus === "OPEN" && !(status === "APPROVED" || status === "ACTIVE")) return false;
      if (finalStatus !== "ALL" && finalStatus !== "OPEN" && status !== finalStatus) return false;
      if (!finalNeedle) return true;
      const hay = [s?.id, status, s?.roomId, s?.companyId, s?.roomOfferNote, s?.companyOfferNote, s?.vehicle?.plate, s?.driver?.fullName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(finalNeedle);
    }) || null;
  }, [mainTab, trackTab, items, copilotShiftId, marketFocusIds, pendingFocusIds, marketQ, pendingQ, finalQ, onlyAgreement, dayYmd, pendingOnlyRoomOffer, finalStatus]);

  const copilotShiftSummary = useMemo(() => {
    if (!copilotShift) return "";
    const parts = [];
    parts.push(`Vardiya #${copilotShift.id}`);
    if (copilotShift?.status) parts.push(`Durum ${String(copilotShift.status).toUpperCase()}`);
    if (copilotShift?.room?.name) parts.push(`Room ${copilotShift.room.name}`);
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
        { label: 'Room', value: copilotShift?.room?.name || '-', help: 'İşin bağlı olduğu room veya operasyon oda bilgisini gösterir.' },
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
  }, [copilotShift, copilotShiftSummary, copilotScopeKey]);

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
          name: `Room #${id}`,
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
    } catch {}
  }, [roomOptions, roomId, isCompany, offerVehicleId, vehiclesById, seatN]);

  const filteredVehicles = useMemo(() => {
    const rid = Number(roomId);
    const sd = seatN;

    return vehicles
      .filter((v) => !rid || !v?.roomId || Number(v.roomId) === rid)
      .filter((v) => (sd ? Number(v?.capacity || 0) >= sd : true))
      .sort((a, b) => Number(a?.capacity || 0) - Number(b?.capacity || 0));
  }, [vehicles, roomId, seatN]);


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

  async function createShift(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      const body = {
        startAt: istanbulLocalToUtcIso(startAt),
        endAt: istanbulLocalToUtcIso(endAt),
        status: "REQUESTED",
      };

      // ✅ M24: Direct vs Market
      const rid = marketMode ? null : Number(roomId);
      if (!marketMode && (!rid || !Number.isFinite(rid))) {
        setErr("Room zorunlu (Market mode kapalı).");
        return;
      }
      if (!marketMode) body.roomId = rid;

      if (!body.startAt || !body.endAt) {
        setErr("Start/End zorunlu.");
        return;
      }

      // Direct shift: optional offer fields
      if (!marketMode) {
        if (offerVehicleId) body.companyOfferVehicleId = Number(offerVehicleId);

        const amt = parseTryInput(offerAmount);
        if (amt != null) body.companyOfferAmount = amt;

        if (offerNote.trim()) body.companyOfferNote = offerNote.trim();
      }

      const createdShift = await api("/api/shifts", { method: "POST", token, body });

      const createdId = Number(createdShift?.id || 0);
      if (createdId) setLastCreatedShiftId(createdId);

      setSelectedTemplateId("");
      setStartAt("");
      setEndAt("");
      setSeatDemand("");
      setOfferVehicleId("");
      setOfferAmount("");
      setOfferNote("");
      setMarketMode(false);

      invalidate("shifts");
      await load();

      setMainTab("track");
      setTrackTab("pending");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  // ✅ M24: Market offers
  function pkgMinuteKey(s) {
    const ca = s?.createdAt || s?.created_at || s?.createdAtUtc || null;
    if (!ca) return null;
    const d = new Date(ca);
    if (Number.isNaN(d.getTime())) return null;
    return toDatetimeLocalTR(d);
  }

  function computePackageShiftIds(seedShift) {
    if (!seedShift) return [];
    const key = pkgMinuteKey(seedShift);
    const cid = Number(seedShift.companyId || seedShift.company?.id || 0);
    if (!key || !cid) return [];
    const ids = (items || [])
      .filter((x) => Number(x.companyId || x.company?.id || 0) === cid && pkgMinuteKey(x) === key)
      .map((x) => Number(x.id))
      .filter((x) => Number.isFinite(x) && x > 0);
    const uniq = Array.from(new Set(ids)).sort((a, b) => a - b);
    return uniq;
  }

  function openOfferModalForShift(shiftId, pkgIds = null) {
    ensureReferenceData().catch(() => {});
    const sid = Number(shiftId);
    const seed = (items || []).find((x) => Number(x.id) === sid);
    const auto = computePackageShiftIds(seed);
    const idsRaw = Array.isArray(pkgIds) && pkgIds.length ? pkgIds : auto;
    const ids = Array.from(new Set((idsRaw || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));

    // sadece "paket" ise sakla (tek shift ise boş kalsın)
    setOfferModalPkgIds(ids.length > 1 ? ids : []);

    setOfferModal({
      open: true,
      shiftId: sid,
      q: "",
      onlyHub: true,
      roomIds: {},
      amountCompany: "",
      noteCompany: "",
    });
  }

  function toggleOfferRoom(roomId) {
    const rid = Number(roomId);
    if (!Number.isFinite(rid)) return;
    setOfferModal((p) => {
      const next = { ...(p || {}) };
      const map = { ...(next.roomIds || {}) };
      map[rid] = !map[rid];
      next.roomIds = map;
      return next;
    });
  }

  async function submitOfferModal() {
    const shiftId = Number(offerModal.shiftId);
    const roomIds = Object.entries(offerModal.roomIds || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => Number(k))
      .filter((x) => Number.isFinite(x));

    if (!shiftId) {
      setErr("Shift seçilmedi");
      return;
    }
    if (!roomIds.length) {
      setErr("En az 1 room seç");
      return;
    }

    const amountCompany = parseTryInput(offerModal.amountCompany);
    const noteCompany = trimOrNull(offerModal.noteCompany);

    setBusy(true);
    setErr("");
    try {
      const targetShiftIds = (offerModalPkgIds || []).length
        ? Array.from(new Set((offerModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
        : [shiftId];

      if (!targetShiftIds.includes(shiftId)) targetShiftIds.unshift(shiftId);

      for (const sid of targetShiftIds) {
        await api(`/api/shifts/${sid}/offers`, {
          method: "POST",
          token,
          body: { roomIds, amountCompany: amountCompany ?? null, noteCompany: noteCompany ?? null },
        });
      }

      setOfferModal((p) => ({ ...p, open: false }));
      setOfferModalPkgIds([]);
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function openOffersModalForShift(shiftId, pkgIds = null) {
    const sid = Number(shiftId);
    setOffersCounterSel({});
    const seed = (items || []).find((x) => Number(x.id) === sid);
    const auto = computePackageShiftIds(seed);
    const idsRaw = Array.isArray(pkgIds) && pkgIds.length ? pkgIds : auto;
    const ids = Array.from(new Set((idsRaw || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
    setOffersModalPkgIds(ids.length > 1 ? ids : []);

    if (!sid) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api(`/api/offers/shift/${sid}`, { method: "GET", token });
      setOffersModal({ open: true, shiftId: sid, items: r?.items || [] });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }


  function setOffersCounter(offerId, patch) {
    setOffersCounterSel((prev) => ({
      ...prev,
      [offerId]: { ...(prev[offerId] || {}), ...(patch || {}) },
    }));
  }

  async function companyCounterOffer(offer) {
    const oid = Number(offer?.id);
    if (!oid) return;
    const st = offersCounterSel[oid] || {};
    const amountCompany = parseTryInput(st.amountCompany);
    const noteCompany = trimOrNull(st.noteCompany);
    if (amountCompany == null) {
      setErr("Karşı teklif tutarı gerekli.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api(`/api/offers/${oid}/company-counter`, { method: "PUT", token, body: { amountCompany, noteCompany } });
      await openOffersModalForShift(offersModal.shiftId, offersModalPkgIds);
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function companyCounterPackage(offer) {
    const roomId = Number(offer?.roomId || offer?.room?.id || 0);
    if (!roomId) return;
    const oid = Number(offer?.id || 0);
    const st = offersCounterSel[oid] || {};
    const amountCompany = parseTryInput(st.amountCompany);
    const noteCompany = trimOrNull(st.noteCompany);
    if (amountCompany == null) {
      setErr("Paket karşı teklif tutarı gerekli.");
      return;
    }
    const baseShiftId = Number(offersModal.shiftId || 0);
    const targetShiftIds = (offersModalPkgIds || []).length
      ? Array.from(new Set((offersModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
      : [baseShiftId];
    if (!targetShiftIds.includes(baseShiftId)) targetShiftIds.unshift(baseShiftId);
    setBusy(true);
    setErr("");
    try {
      await api(`/api/offers/company-counter-bulk`, {
        method: "POST",
        token,
        body: { roomId, shiftIds: targetShiftIds, amountCompany, noteCompany },
      });
      await openOffersModalForShift(offersModal.shiftId, offersModalPkgIds);
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function acceptOffer(offerId) {
    const oid = Number(offerId);
    if (!oid) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/offers/${oid}/accept`, { method: "PUT", token, body: {} });
      setOffersModal((p) => ({ ...p, open: false }));
      invalidate("shifts");
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function acceptOfferPackage(roomId) {
    const rid = Number(roomId);
    if (!rid) return;

    const baseShiftId = Number(offersModal.shiftId);
    if (!baseShiftId) return;

    const targetShiftIds = (offersModalPkgIds || []).length
      ? Array.from(new Set((offersModalPkgIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)))
      : [baseShiftId];

    if (!targetShiftIds.includes(baseShiftId)) targetShiftIds.unshift(baseShiftId);

    setBusy(true);
    setErr("");
    try {
      for (const sid of targetShiftIds) {
        const r = await api(`/api/offers/shift/${sid}`, { method: "GET", token });
        const items = r?.items || [];
        const match = items.find((o) => Number(o.roomId) === rid && (o.status === "COUNTERED" || o.status === "OFFERED"));
        if (!match?.id) continue;
        await api(`/api/offers/${Number(match.id)}/accept`, { method: "PUT", token, body: {} });
      }

      setOffersModal((p) => ({ ...p, open: false }));
      setOffersModalPkgIds([]);
      invalidate("shifts");
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendCounterOffer(shift) {
    const sid = Number(shift.id);
    const form = offerSel[sid] || {};

    const vRaw = form.companyOfferVehicleId;
    const vId = vRaw ? Number(vRaw) : null;

    const amt = parseTryInput(form.companyOfferAmount);
    const note = trimOrNull(form.companyOfferNote);

    if (vId) {
      const v = vehiclesById.get(Number(vId));
      if (v?.roomId && Number(v.roomId) !== Number(shift.roomId)) {
        setErr("Seçtiğin teklif aracı bu shift’in room’una ait değil.");
        return;
      }
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/company-offer`, {
        method: "PUT",
        token,
        body: {
          companyOfferVehicleId: vId || null,
          companyOfferAmount: amt ?? null,
          companyOfferNote: note || null,
        },
      });

      setOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();

      setMainTab("track");
      setTrackTab("pending");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearCounterOffer(shift) {
    const sid = Number(shift.id);

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/company-offer`, {
        method: "PUT",
        token,
        body: { companyOfferVehicleId: null, companyOfferAmount: null, companyOfferNote: null },
      });

      setOfferSel((p) => ({
        ...p,
        [sid]: { companyOfferVehicleId: "", companyOfferAmount: "", companyOfferNote: "" },
      }));
      setOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();

      setMainTab("track");
      setTrackTab("pending");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Company: kendi talebini iptal et (REQUESTED/DRAFT -> REJECTED)
  async function cancelMyRequest(shift) {
    const sid = Number(shift.id);
    if (!sid) return;

    if (!confirm(`Shift #${sid} talebini iptal etmek istiyor musun? (REJECTED)`)) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}`, {
        method: "PUT",
        token,
        body: { status: "REJECTED" },
      });

      invalidate("shifts");
      await load();

      setMainTab("track");
      setTrackTab("pending");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function decideRoomOffer(shift, decision, noteRaw) {
    const sid = Number(shift.id);
    setDecidingId(sid);
    setErr("");

    const note = trimOrNull(noteRaw);

    try {
      await api(`/api/shifts/${sid}/room-offer-decision`, {
        method: "PUT",
        token,
        body: {
          decision,
          ...(note ? { note } : {}),
        },
      });

      setDecisionNoteSel((p) => ({ ...p, [sid]: "" }));

      invalidate("shifts");
      await load();

      setMainTab("track");
      setTrackTab("pending");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setDecidingId(null);
    }
  }

  function renderCompanyOfferSummary(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;
    const cAmt = s.companyOfferAmount != null ? Number(s.companyOfferAmount) : null;

    const has = Boolean(ovId || cAmt != null || s.companyOfferNote);
    if (!has) return <span className="muted">-</span>;

    return (
      <div className="muted" title={s.companyOfferNote || ""}>
        <div>
          <b>C→R Araç:</b> {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}
        </div>
        {cAmt != null ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>C→R Tutar:</b> {formatTRY(cAmt)} ₺
          </div>
        ) : null}
        {s.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.companyOfferNote}</div> : null}
      </div>
    );
  }

  function renderRoomOfferSummary(s) {
    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;
    const rAmt = s.roomOfferAmount != null ? Number(s.roomOfferAmount) : null;

    const has = Boolean(rvId || rAmt != null || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);
    if (!has) return <span className="muted">-</span>;

    const decision = String(s.roomOfferDecision || "PENDING").toUpperCase();
    const decisionAtText = s.roomOfferDecisionAt ? fmtTR(s.roomOfferDecisionAt) : "";

    return (
      <div className="muted">
        <div>
          <b>R→C Araç:</b> {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}
        </div>

        {rAmt != null ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>R→C Tutar:</b> {formatTRY(rAmt)} ₺
          </div>
        ) : null}

        {s.roomOfferNote ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>R→C Not:</b> {s.roomOfferNote}
          </div>
        ) : null}

        {s.roomOfferToDriver ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>R→D:</b> evet{s.roomOfferDriverNote ? ` • ${s.roomOfferDriverNote}` : ""}
          </div>
        ) : null}

        <div style={{ marginTop: 8 }}>
          <b>Legacy Durum:</b>{" "}
          <span className={decision === "PENDING" ? "muted" : "pill"} data-status={decision === "PENDING" ? undefined : decision}>
            {decision}
          </span>
          {decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          Bu alan eski shift room-offer özetidir. Ticari karar artık Market / Teklifler ekranında verilir.
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => openOffersModalForShift(s.id)}>
            Teklifleri Aç
          </button>
        </div>

        {s.roomOfferDecisionNote ? (
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Legacy Karar Notu:</b> {s.roomOfferDecisionNote}
          </div>
        ) : null}
      </div>
    );
  }

  // Pending vs Final
  const FINAL_STATUSES = useMemo(() => new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]), []);
  // ✅ M24: market shifts (roomId null) ayrı listelenir
  const marketItemsRaw = useMemo(
    () => items.filter((s) => !FINAL_STATUSES.has(String(s.status)) && (s.roomId == null || s.roomId === "")),
    [items, FINAL_STATUSES]
  );

  const pendingItemsRaw = useMemo(
    () => items.filter((s) => {
      const status = String(s?.status || "");
      const isSplitRoot = status === "SPLIT" && !Number(s?.splitRootId || 0);
      if (isSplitRoot) return false;
      return !FINAL_STATUSES.has(status) && s.roomId != null && s.roomId !== "";
    }),
    [items, FINAL_STATUSES]
  );
  const finalItemsRaw = useMemo(() => items.filter((s) => FINAL_STATUSES.has(String(s.status))), [items, FINAL_STATUSES]);

  // Pending filtre uygula
  const pendingItems = useMemo(() => {
    const q = String(pendingQ || "").trim().toLowerCase();
    const pendingFocusSet = new Set((pendingFocusIds || []).map(Number));
    return pendingItemsRaw
        .filter((s) => (!onlyAgreement ? true : Number(s.agreementId) > 0))
        .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s.startAt, dayYmd)))
        .filter((s) => (pendingFocusSet.size ? pendingFocusSet.has(Number(s.id)) : true))
        .filter((s) => {
        if (!pendingOnlyRoomOffer) return true;
        const hasRoomOffer =
          Boolean(s.roomOfferVehicleId) ||
          s.roomOfferAmount != null ||
          Boolean(s.roomOfferNote) ||
          Boolean(s.roomOfferToDriver) ||
          Boolean(s.roomOfferDriverNote);
        return hasRoomOffer;
      })
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.status, s.roomId, s.companyId, s.roomOfferNote, s.companyOfferNote]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [pendingItemsRaw, pendingQ, pendingOnlyRoomOffer, onlyAgreement, pendingFocusIds, dayYmd]);

  // ✅ M24: Market filtre
  const marketItems = useMemo(() => {
    const q = String(marketQ || "").trim().toLowerCase();
    const marketFocusSet = new Set((marketFocusIds || []).map(Number));
    return (marketItemsRaw || [])
      .filter((s) => (onlyAgreement ? Number(s.agreementId) > 0 : true))
      .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s.startAt, dayYmd)))
      .filter((s) => (marketFocusSet.size ? marketFocusSet.has(Number(s.id)) : true))
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.status, s.companyId].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [marketItemsRaw, marketQ, onlyAgreement, marketFocusIds, dayYmd]);

  // Final filtre uygula
  const shouldLoadRoomScores = useMemo(() => {
    if (offersModal?.open) return true;
    if (offerModal?.open) return true;
    if (mainTab === "track" && trackTab === "market" && marketItems.length > 0) return true;
    return false;
  }, [offersModal?.open, offerModal?.open, mainTab, trackTab, marketItems.length]);


  const roomScoreIds = useMemo(() => {
    if (!shouldLoadRoomScores) return [];
    const ids = new Set();
    for (const offer of (offersModal?.items || [])) {
      const rid = Number(offer?.room?.id || offer?.roomId || 0);
      if (rid > 0) ids.add(rid);
    }
    if (offerModal?.open) {
      for (const r of (rooms || [])) {
        const rid = Number(r?.id || 0);
        if (rid > 0) ids.add(rid);
      }
    }
    return Array.from(ids);
  }, [shouldLoadRoomScores, offersModal?.items, offerModal?.open, rooms]);

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

  const finalItems = useMemo(() => {
    const q = String(finalQ || "").trim().toLowerCase();
    return finalItemsRaw
      .filter((s) => (!onlyAgreement ? true : Number(s.agreementId) > 0))
      .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s.startAt, dayYmd)))
      .filter((s) => {
        const st = String(s.status);
        if (finalStatus === "ALL") return true;
        if (finalStatus === "OPEN") return st === "APPROVED" || st === "ACTIVE";
        return st === finalStatus;
      })
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.status, s.roomId, s.companyId, s.roomOfferNote, s.companyOfferNote, s.vehicle?.plate, s.driver?.fullName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [finalItemsRaw, finalQ, finalStatus, onlyAgreement, dayYmd]);

  const canonicalCompanyCounts = useMemo(() => {
    const cards = commercialSummary?.cards || {};
    return {
      market: pickCount(cards.marketShiftCount, cards.marketOffers, marketItems.length, 0),
      pending: pickCount(cards.pendingShiftCount, cards.acceptedOffers, pendingItems.length, 0),
      final: pickCount(cards.finalShiftCount, cards.listCount, finalItems.length, 0),
      active: pickCount(cards.activeShiftCount, cards.activeOps, 0),
      counter: pickCount(cards.counterShiftCount, cards.counterOffers, 0),
    };
  }, [commercialSummary, marketItems.length, pendingItems.length, finalItems.length]);

  const selectedRoom = roomsById.get(Number(roomId)) || roomOptions.find((r) => Number(r.id) === Number(roomId));

  function vehiclesForShiftRoom(shift) {
    const rid = Number(shift.roomId);
    return vehicles
      .filter((v) => !v?.roomId || Number(v.roomId) === rid)
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  function openOpsEvents(shiftId) {
    setOpsEventsModal({ open: true, shiftId: Number(shiftId) || null });
  }

  return (
    <div>
      <div className="card">
        <h3>{isCommercialMode ? "Ticari Akışım (COMPANY)" : "Shifts (COMPANY)"}</h3>
        <div className="muted">{isCommercialMode ? "Market: teklif / pazarlık • Bekleyen: operasyon hazırlığı • Liste: APPROVED/ACTIVE/DONE/REJECTED" : "Bekleyen: DRAFT/REQUESTED • Liste: APPROVED/ACTIVE/DONE/REJECTED"}</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {applyToast?.ids?.length ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Oluşturuldu:</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {(applyToast.ids || []).map((id) => (
                  <button key={id} type="button" className="btn" style={{ marginRight: 6, marginTop: 6 }} onClick={() => focusMarketById(id)}>
                    #{id}
                  </button>
                ))}
                <span className="muted" style={{ marginLeft: 8 }}>Tıkla → Bekleyen Talepler / Market Shifts’te filtrele</span>
              </div>
            </div>
            <button type="button" className="btn" onClick={() => setApplyToast(null)}>
              Kapat
            </button>
          </div>
        </div>
      ) : null}


      {!isCommercialMode ? (
      <>
      {/* Page Tabs: Planning Center vs Track */}
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={goPlanningCenter}
            title="Şablon / talep / Shift Tools / plan üretimi Planlama Merkezi'nde yapılır"
          >
            Planlama Merkezi'ne git
          </button>
          <button
            type="button"
            className={mainTab === "track" ? "btn primary" : "btn"}
            disabled={busy}
            onClick={() => setMainTab("track")}
            title="Market / Bekleyen / Liste + hızlı filtre"
          >
            Takip
          </button>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Oluşturma akışı bu ekrandan kaldırıldı. Şablon, talep, Shift Tools, OSRM + solver ve teklif üretimi Planlama Merkezi'nden yürür; bu ekran takip ve operasyon içindir.
        </div>
      </div>

            {mainTab === "create" ? (
        <>
          <div className="card">
            <div style={{ fontWeight: 800 }}>Oluşturma Planlama Merkezi'ne taşındı</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Aynı işi iki farklı yerden üretmemek için bu ekrandaki oluşturma akışı pasife alındı.
              Yeni vardiya kurma, şablon/talep, Shift Tools, durak üretimi, OSRM + solver önizleme ve market teklif akışı Planlama Merkezi'nden yapılır.
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="btn primary" disabled={busy} onClick={goPlanningCenter}>
                Planlama Merkezi'ne git
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => setMainTab("track")}>
                Takibe dön
              </button>
            </div>
          </div>
        </>
      ) : null}
      </>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Ticari Akışım</h3>
              <div className="muted" style={{ marginTop: 6 }}>Company için teklif, karşı teklif ve pazarlık görünürlüğü</div>
            </div>
            <div className="muted">Kapsam: Kendi ticari alanınız</div>
          </div>
        </div>
      )}

      {mainTab === "track" ? (
        <>
      {/* Hızlı Filtre Presetleri (sticky) */}
      <div
        className="card"
        style={{
          position: "sticky",
          top: 74,
          zIndex: 4,
          background: "rgba(18,26,42,.92)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Hızlı Filtre</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Gün: <b>{dayYmd || "Hepsi"}</b> • Liste: <b>{finalStatus === "ALL" ? "Hepsi" : finalStatus}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <input
              type="date"
              value={dayYmd}
              onChange={(e) => setDayYmd(e.target.value)}
              title="Gün filtresi"
              style={{ padding: "8px 10px" }}
            />

            <button type="button" className="btn sm" onClick={() => setDayYmd(todayYmdLocal())}>
              Bugün
            </button>
            <button type="button" className="btn sm" onClick={() => setDayYmd(addDaysYmd(todayYmdLocal(), 1))}>
              Yarın
            </button>

            <span className="muted" style={{ margin: "0 4px" }}>|</span>

            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setMainTab("track");
                setTrackTab("list");
                setFinalStatus("OPEN");
                setTimeout(() => {
                  try { listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
                }, 0);
              }}
              title="Liste: APPROVED + ACTIVE"
            >
              Açık
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setMainTab("track");
                setTrackTab("list");
                setFinalStatus("ACTIVE");
                setTimeout(() => {
                  try { listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
                }, 0);
              }}
            >
              Active
            </button>

<span className="muted" style={{ margin: "0 4px" }}>|</span>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setDayYmd("");
                setFinalStatus("ALL");
                setFinalQ("");
                setPendingQ("");
                setMarketQ("");
                setPendingOnlyRoomOffer(false);
                setOnlyAgreement(false);
              }}
            >
              Temizle
            </button>
          </div>
        </div>
      </div>



      {/* Track Tabs: Market / Bekleyen / Liste */}
      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className={trackTab === "market" ? "btn primary" : "btn"} onClick={() => setTrackTab("market")}>
            Market <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{canonicalCompanyCounts.market}</span>
          </button>
          <button type="button" className={trackTab === "pending" ? "btn primary" : "btn"} onClick={() => setTrackTab("pending")}>
            Bekleyen <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{canonicalCompanyCounts.pending}</span>
          </button>
          <button type="button" className={trackTab === "list" ? "btn primary" : "btn"} onClick={() => setTrackTab("list")}>
            Liste <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{canonicalCompanyCounts.final}</span>
          </button>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {isCommercialMode
            ? "Market: teklif / pazarlık • Bekleyen: operasyon hazırlığı • Liste: APPROVED/ACTIVE/DONE/REJECTED"
            : "Market: room seçilmemiş talepler • Bekleyen: pazarlık/karar • Liste: APPROVED/ACTIVE/DONE/REJECTED"}
        </div>
      </div>

{/* MARKET (Accordion) */}
<div className="card" ref={marketSectionRef} style={{ display: trackTab === "market" ? "block" : "none" }}>
  <div
    className="row"
    style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
  >
    <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <h3 style={{ margin: 0 }}>Market Shifts</h3>
      <span className="pill" data-status="COUNT" title="Filtrelere göre görünen market shift sayısı">
        {marketItems.length}
      </span>
      <span className="muted">Room seçilmemiş talepler. Teklifi birden fazla room’a gönder.</span>
    </div>

    <div
      className="row"
      style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="btn sm"
        disabled={accOpen.market}
        onClick={(e) => {
          e.stopPropagation();
          setAccOpen((p) => ({ ...p, market: true }));
        }}
      >
        Aç
      </button>
      <button
        type="button"
        className="btn sm"
        disabled={!accOpen.market}
        onClick={(e) => {
          e.stopPropagation();
          setAccOpen((p) => ({ ...p, market: false }));
        }}
      >
        Kapat
      </button>
      <button
        type="button"
        className="btn sm"
        title="Aç / Kapat"
        onClick={(e) => {
          e.stopPropagation();
          toggleAcc("market");
        }}
      >
        {accOpen.market ? "▾" : "▸"}
      </button>
    </div>
  </div>

  {accOpen.market ? (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div />
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <input
            ref={marketSearchRef}
            placeholder="Ara (id/status)"
            value={marketQ}
            onChange={(e) => setMarketQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
          {marketFocusIds.length ? (
            <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>Filtre: {(marketFocusIds || []).map((id) => "#" + id).join(" ")}</span>
              <button type="button" className="secondary" onClick={() => setMarketFocusIds([])} disabled={busy}>
                Filtreyi temizle
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {marketItems.length ? (
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Offers</th>
            </tr>
          </thead>
          <tbody>
            {marketItems.map((s) => (
              <tr key={s.id} onClick={() => setFocusedTrackShiftId(Number(s?.id || 0) || null)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(s?.id || 0))}>
                <td>
                  {s.id}
                  <AgreementBadge agreementId={s.agreementId} />
                </td>
                <td>
                  <span className="pill" data-status={s.status}>{s.status}</span>
                </td>
                <td className="muted">{fmtTR(s.startAt)}</td>
                <td className="muted">{fmtTR(s.endAt)}</td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" disabled={busy} onClick={() => openOfferModalForShift(s.id)}>
                      Teklif Gönder
                    </button>
                    <button
                      type="button"
                      disabled={busy || computePackageShiftIds(s).length < 2}
                      title={computePackageShiftIds(s).length < 2 ? "Paket bulunamadı" : `Pakete uygula (${computePackageShiftIds(s).length} shift)`}
                      onClick={() => openOfferModalForShift(s.id, computePackageShiftIds(s))}
                    >
                      Paket Teklif
                    </button>
                    <button type="button" disabled={busy} onClick={() => openOffersModalForShift(s.id)}>
                      Teklifler
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted">Market shift yok.</div>
      )}
    </div>
  ) : null}
</div>

{/* BEKLEYEN (Accordion) */}
<div className="card" ref={pendingSectionRef} style={{ display: trackTab === "pending" ? "block" : "none" }}>
  <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <h3 style={{ margin: 0 }}>Bekleyen Talepler</h3>
      <span className="pill" data-status="COUNT" title="Filtrelere göre görünen bekleyen talep sayısı">
        {pendingItems.length}
      </span>
      <span className="muted">Pazarlık/karar tamamlanmadan “Liste”ye düşmez.</span>
    </div>

    <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
      <button
        type="button"
        className="btn sm"
        disabled={accOpen.pending}
        onClick={() => setAccOpen((p) => ({ ...p, pending: true }))}
      >
        Aç
      </button>
      <button
        type="button"
        className="btn sm"
        disabled={!accOpen.pending}
        onClick={() => setAccOpen((p) => ({ ...p, pending: false }))}
      >
        Kapat
      </button>
      <button type="button" className="btn sm" title="Aç / Kapat" onClick={() => toggleAcc("pending")}>
        {accOpen.pending ? "▾" : "▸"}
      </button>
    </div>
  </div>

  {accOpen.pending ? (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Ara (id/status/note/room)"
            value={pendingQ}
            onChange={(e) => setPendingQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          {pendingFocusIds.length ? (
            <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>Filtre: {(pendingFocusIds || []).map((id) => "#" + id).join(" ")}</span>
              <button type="button" className="secondary" onClick={() => setPendingFocusIds([])} disabled={busy}>
                Filtreyi temizle
              </button>
            </div>
          ) : null}
          <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={pendingOnlyRoomOffer}
              onChange={(e) => setPendingOnlyRoomOffer(e.target.checked)}
            />
            Sadece Room teklifi olanlar
          </label>
          <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={onlyAgreement}
              onChange={(e) => setOnlyAgreement(e.target.checked)}
            />
            Sadece Agreement shiftleri
          </label>
          <button
            type="button"
            onClick={() => {
              setPendingQ("");
              setPendingOnlyRoomOffer(false);
              setOnlyAgreement(false);
            }}
          >
            Temizle
          </button>
        </div>
      </div>

      {pendingItems.length ? (
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Room Teklifi (R→C)</th>
              <th>Company Teklifi (C→R)</th>
              <th>Pazarlık</th>
              <th>İptal</th>
              <th>Start</th>
              <th>End</th>
              <th>Uzat</th>
              <th>Operasyon</th>
            </tr>
          </thead>
          <tbody>
            {pendingItems.map((s) => {
              const r = roomsById.get(Number(s.roomId));
              const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(s.status));

              const sid = Number(s.id);
              const isOpen = Boolean(offerOpen[sid]);
              const form = offerSel[sid] || {};
              const roomVehicles = vehiclesForShiftRoom(s);

              return (
                <tr key={s.id} onClick={() => setFocusedTrackShiftId(Number(s?.id || 0) || null)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(s?.id || 0))}>
                  <td>
                    {s.id}
                    <AgreementBadge agreementId={s.agreementId} />
                    {Number(s.splitRootId || 0) > 0 ? (
                      <div className="muted" style={{ marginTop: 4 }}>
                        Paket #{s.splitRootId}
                        {Number(s.splitIndex || 0) > 0 && Number(s.splitTotal || 0) > 0
                          ? ` • ${s.splitIndex}/${s.splitTotal}`
                          : ""}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className="pill" data-status={s.status}>
                      {s.status}
                    </span>
                  </td>
                  <td className="muted">
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <span>{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</span>
                      </div>
                    </div>
                  </td>

                  <td>{renderRoomOfferSummary(s)}</td>
                  <td>{renderCompanyOfferSummary(s)}</td>

                  <td>
                    <div style={{ display: "grid", gap: 8 }}><div className="muted">Pazarlık sadece Market / Teklifler ekranında yapılır.</div><button type="button" className="btn sm" disabled={busy} onClick={() => openOffersModalForShift(s.id)}>Teklifleri Aç</button></div>
                  </td>

                  <td>
                    <button type="button" disabled={busy || !canNegotiate} onClick={() => cancelMyRequest(s)}>
                      Talebi İptal Et
                    </button>
                  </td>

                  <td className="muted" title={String(s.startAt)}>{fmtTR(s.startAt)}</td>
                  <td className="muted" title={String(s.endAt)}>{fmtTR(s.endAt)}</td>
                
  <td>
    {s.extendRequestedEndAt ? (
      <div style={{ display: "grid", gap: 6 }}>
        <span className="pill" data-status={s.extendDecision || "PENDING"}>
          {String(s.extendDecision || "PENDING")}
        </span>
        <div className="muted" title={String(s.extendRequestedEndAt)}>
          Talep: {fmtTR(s.extendRequestedEndAt)}
        </div>
      </div>
    ) : (
      <>
<button
        type="button"
        disabled={busy || !(String(s.status || "").toUpperCase() === "APPROVED" || String(s.status || "").toUpperCase() === "ACTIVE")}
        onClick={() => openExtendModal(s)}
      >
        Süre Uzat
      </button>
        <button type="button" className="btn sm" disabled={busy} onClick={() => setPreviewModal({ open: true, shiftId: s.id })}>Harita / Navigasyon Önizle</button>
    </>
)}
  </td>
  <td>
    <button type="button" className="btn sm" disabled={busy} onClick={() => openOpsEvents(s.id)}>Operasyon Kaydı</button>
  </td>
  <td>
    <button type="button" className="btn sm" disabled={busy} onClick={() => openOpsEvents(s.id)}>Operasyon Kaydı</button>
  </td>
</tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="muted">Bekleyen talep yok.</div>
      )}
    </div>
  ) : null}
</div>

{/* LİSTE (Accordion) */}
<div className="card" ref={listSectionRef} style={{ display: trackTab === "list" ? "block" : "none" }}>
  <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <h3 style={{ margin: 0 }}>Liste</h3>
      <span className="pill" data-status="COUNT" title="Filtrelere göre görünen liste kaydı sayısı">
        {finalItems.length}
      </span>
      <span className="muted">Sadece APPROVED/ACTIVE/DONE/REJECTED burada görünür.</span>
    </div>

    <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
      <button
        type="button"
        className="btn sm"
        disabled={accOpen.list}
        onClick={() => setAccOpen((p) => ({ ...p, list: true }))}
      >
        Aç
      </button>
      <button
        type="button"
        className="btn sm"
        disabled={!accOpen.list}
        onClick={() => setAccOpen((p) => ({ ...p, list: false }))}
      >
        Kapat
      </button>
      <button type="button" className="btn sm" title="Aç / Kapat" onClick={() => toggleAcc("list")}>
        {accOpen.list ? "▾" : "▸"}
      </button>
    </div>
  </div>

  {accOpen.list ? (
    <div style={{ marginTop: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)}>
            <option value="ALL">Hepsi</option>
            <option value="OPEN">Açık (APPROVED+ACTIVE)</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DONE">DONE</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <input
            placeholder="Ara (id/status/plate/driver/note)"
            value={finalQ}
            onChange={(e) => setFinalQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={onlyAgreement}
              onChange={(e) => setOnlyAgreement(e.target.checked)}
            />
            Sadece Agreement shiftleri
          </label>
          <button
            type="button"
            onClick={() => {
              setFinalStatus("ALL");
              setFinalQ("");
              setOnlyAgreement(false);
            }}
          >
            Temizle
          </button>
        </div>
      </div>

      {finalItems.length ? (
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Room Teklifi (R→C)</th>
              <th>Company Teklifi (C→R)</th>
              <th>Assigned Vehicle</th>
              <th>Driver</th>
              <th>Start</th>
              <th>End</th>
              <th>Uzat</th>
              <th>Operasyon</th>
            </tr>
          </thead>

          <tbody>
            {finalItems.map((s) => {
              const r = roomsById.get(Number(s.roomId));
              return (
                <tr key={s.id} onClick={() => setFocusedTrackShiftId(Number(s?.id || 0) || null)} style={rowSelectionStyle(Number(copilotShiftId || 0) === Number(s?.id || 0))}>
                  <td>
                    {s.id}
                    <AgreementBadge agreementId={s.agreementId} />
                  </td>
                  <td>
                    <span className="pill" data-status={s.status}>
                      {s.status}
                    </span>
                  </td>
                  <td className="muted">
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <span>{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</span>
                      </div>
                    </div>
                  </td>
                  <td>{renderRoomOfferSummary(s)}</td>
                  <td>{renderCompanyOfferSummary(s)}</td>
                  <td className="muted">
                    {s.vehicle?.plate || s.vehicleId ? (
                      <button
                        type="button"
                        onClick={() => openVehicleDetail(s)}
                        style={clickableInfoStyle(!(s.vehicle?.plate || s.vehicleId))}
                        title="Araç detayını aç"
                      >
                        {s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="muted">
                    {s.driver?.fullName || s.driverId ? (
                      <button
                        type="button"
                        onClick={() => openDriverDetail(s)}
                        style={clickableInfoStyle(!(s.driver?.fullName || s.driverId))}
                        title="Sürücü detayını aç"
                      >
                        {s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="muted" title={String(s.startAt)}>{fmtTR(s.startAt)}</td>
                  <td className="muted" title={String(s.endAt)}>{fmtTR(s.endAt)}</td>
                
  <td>
    {s.extendRequestedEndAt ? (
      <div style={{ display: "grid", gap: 6 }}>
        <span className="pill" data-status={s.extendDecision || "PENDING"}>
          {String(s.extendDecision || "PENDING")}
        </span>
        <div className="muted" title={String(s.extendRequestedEndAt)}>
          Talep: {fmtTR(s.extendRequestedEndAt)}
        </div>
      </div>
    ) : (
      <>
<button
        type="button"
        disabled={busy || !(String(s.status || "").toUpperCase() === "APPROVED" || String(s.status || "").toUpperCase() === "ACTIVE")}
        onClick={() => openExtendModal(s)}
      >
        Süre Uzat
      </button>
        <button type="button" className="btn sm" disabled={busy} onClick={() => setPreviewModal({ open: true, shiftId: s.id })}>Harita / Navigasyon Önizle</button>
    </>
)}
  </td>
  <td>
    <button type="button" className="btn sm" disabled={busy} onClick={() => openOpsEvents(s.id)}>Operasyon Kaydı</button>
  </td>
</tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="muted">Henüz “Liste”ye düşen kayıt yok.</div>
      )}
    </div>
  ) : null}
</div>


        </>
      ) : null}

      

{detailModal ? (
  <div className="modal-backdrop" onClick={() => setDetailModal(null)}>
    <div className="modal card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <b>{detailModal.kind === "vehicle" ? "Araç Bilgileri" : "Sürücü Bilgileri"}</b>
          <div className="muted" style={{ marginTop: 4 }}>
            {detailModal.kind === "vehicle"
              ? detailModal.data?.plate || "Araç"
              : detailModal.data?.fullName || "Sürücü"}
          </div>
        </div>
        <button type="button" onClick={() => setDetailModal(null)}>Kapat</button>
      </div>

      {detailModal.kind === "vehicle" ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <div><b>Plaka:</b> {detailModal.data?.plate || "-"}</div>
          <div><b>Tip / Model:</b> {vehicleMetaLine(detailModal.data) || "-"}</div>
          <div><b>Durum:</b> {detailModal.data?.status || "-"}</div>
          <div><b>Kapasite:</b> {Number.isFinite(detailModal.data?.capacity) ? `${detailModal.data.capacity} koltuk` : "-"}</div>
          <div><b>KM:</b> {Number.isFinite(detailModal.data?.odometerKm) ? `${detailModal.data.odometerKm} km` : "-"}</div>
          <div><b>Hız limiti:</b> {Number.isFinite(detailModal.data?.speedLimitKmh) ? `${detailModal.data.speedLimitKmh} km/s` : "-"}</div>
          <div><b>Renk:</b> {detailModal.data?.color || "-"}</div>
          <div><b>Son km güncelleme:</b> {detailModal.data?.odometerUpdatedAt ? fmtTR(detailModal.data.odometerUpdatedAt) : "-"}</div>
          <div><b>Not:</b> {detailModal.data?.note || "-"}</div>
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <div><b>Ad Soyad:</b> {detailModal.data?.fullName || "-"}</div>
          <div><b>Telefon:</b> {detailModal.data?.phone || "-"}</div>
          <div><b>E-posta:</b> {detailModal.data?.user?.email || "-"}</div>
          <div><b>Cihaz:</b> {detailModal.data?.deviceInfo || "-"}</div>
          <div><b>Bağlı araç:</b> {detailModal.data?.currentVehiclePlate || "-"}</div>
        </div>
      )}
    </div>
  </div>
) : null}

<ShiftOperationEventsModal
  open={opsEventsModal.open}
  shiftId={opsEventsModal.shiftId}
  onClose={() => setOpsEventsModal({ open: false, shiftId: null })}
/>

{/* M74.2.1: Preview modal from Company list */}
{previewModal.open ? (
  <RoutePreviewModal
    open={previewModal.open}
    onClose={() => setPreviewModal({ open: false, shiftId: null })}
    title={previewModal.shiftId ? `Shift #${previewModal.shiftId} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
    shiftId={previewModal.shiftId}
  />
) : null}
{/* ✅ M51: Extend modal */}
{extendModal.open ? (
  <div className="card" style={{ border: "2px solid #ddd" }}>
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 800 }}>Süre Uzat — Shift #{extendModal.shift?.id}</div>
        <div className="muted">Bu talep Room’a gider; kabul edilince vardiya süresi uzar.</div>
      </div>
      <button
        type="button"
        className="btn sm"
        disabled={busy}
        onClick={() => setExtendModal({ open: false, shift: null, endLocal: "", note: "" })}
      >
        Kapat
      </button>
    </div>

    <hr />

    <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
      <div className="col" style={{ minWidth: 240 }}>
        <label className="muted">Yeni Bitiş (Istanbul)</label>
        <input
          type="datetime-local"
          value={extendModal.endLocal}
          onChange={(e) => setExtendModal((p) => ({ ...p, endLocal: e.target.value }))}
        />
      </div>
      <div className="col" style={{ flex: 1, minWidth: 260 }}>
        <label className="muted">Not (opsiyonel)</label>
        <input
          value={extendModal.note}
          onChange={(e) => setExtendModal((p) => ({ ...p, note: e.target.value }))}
          placeholder="opsiyonel"
        />
      </div>
      <button type="button" disabled={busy} onClick={submitExtendRequest}>
        {busy ? "..." : "Talep Gönder"}
      </button>
    </div>
  </div>
) : null}

{/* ✅ M24: Offer modal */}
      {offerModal.open ? (
        <div className="card" style={{ border: "2px solid #ddd" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Teklif Gönder — Shift #{offerModal.shiftId}</div>
              <div className="muted">Birden fazla room seçip tek seferde teklif at. Room puanı listede üstte görünür.</div>
            </div>
            <button type="button" disabled={busy} onClick={() => setOfferModal((p) => ({ ...p, open: false }))}>
              Kapat
            </button>
          </div>

          <hr />

          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Room ara"
              value={offerModal.q}
              onChange={(e) => setOfferModal((p) => ({ ...p, q: e.target.value }))}
              style={{ minWidth: 220 }}
            />
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={offerModal.onlyHub}
                onChange={(e) => setOfferModal((p) => ({ ...p, onlyHub: e.target.checked }))}
              />
              Sadece hub’lı
            </label>
          </div>

          <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto" }}>
            {(rooms || [])
              .filter((r) => {
                if (offerModal.onlyHub && !(r?.hubLat != null && r?.hubLng != null)) return false;
                const q = String(offerModal.q || "").trim().toLowerCase();
                if (!q) return true;
                return String(r?.name || "").toLowerCase().includes(q);
              })
              .map((r) => {
                const score = roomScores[String(r.id)] || null;
                return (
                <label key={r.id} className="muted" style={{
                  display: "grid",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: offerModal.roomIds?.[r.id] ? "rgba(18,183,106,0.05)" : "rgba(255,255,255,0.02)",
                  marginBottom: 8,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(offerModal.roomIds?.[r.id])}
                        onChange={() => toggleOfferRoom(r.id)}
                        style={{ marginTop: 4 }}
                      />
                      <span style={{ display: "grid", gap: 4 }}>
                        <span>
                          <b>{roomLabel(r)}</b> (#{r.id})
                        </span>
                        <span className="muted">{r?.hubLat != null && r?.hubLng != null ? "Hub konumu hazır" : "Hub yok"}</span>
                      </span>
                    </span>
                    <ProviderScoreBadge score={score} prominent showLabel />
                  </div>
                </label>
              );})}
          </div>

          <hr />

          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <div className="col" style={{ minWidth: 180 }}>
              <label className="muted">Company Tutar (₺) (opsiyonel)</label>
              <input
                value={offerModal.amountCompany}
                onChange={(e) => setOfferModal((p) => ({ ...p, amountCompany: e.target.value }))}
                placeholder="örn 25000"
              />
            </div>
            <div className="col" style={{ flex: 1, minWidth: 240 }}>
              <label className="muted">Not (opsiyonel)</label>
              <input
                value={offerModal.noteCompany}
                onChange={(e) => setOfferModal((p) => ({ ...p, noteCompany: e.target.value }))}
                placeholder="opsiyonel"
              />
            </div>
            <button type="button" disabled={busy} onClick={submitOfferModal}>
              {busy ? "..." : "Teklifleri Gönder"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ✅ M24: Offers list modal */}
      {offersModal.open ? (
        <div className="card" style={{ border: "2px solid #ddd" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Teklifler — Shift #{offersModal.shiftId}</div>
              <div className="muted">Birini kabul edince diğerleri otomatik iptal olur{offersModalPkgIds.length > 1 ? ` • Paket: ${offersModalPkgIds.length} shift` : ""}.</div>
            </div>
            <button type="button" disabled={busy} onClick={() => setOffersModal((p) => ({ ...p, open: false }))}>
              Kapat
            </button>
          </div>

          <div className="card" style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Karar Özeti</div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <OfferSignalPill
                label="Karşı teklif"
                value={String((offersModal.items || []).filter((o) => String(o?.status || "").toUpperCase() === "COUNTERED").length)}
                tone={(offersModal.items || []).some((o) => String(o?.status || "").toUpperCase() === "COUNTERED") ? "warn" : "neutral"}
              />
              <OfferSignalPill
                label="Açık teklif"
                value={String((offersModal.items || []).filter((o) => String(o?.status || "").toUpperCase() === "OPEN").length)}
                tone="neutral"
              />
              <OfferSignalPill label="Önerilen" value={String(offersDecisionCards.filter((o) => o.__recommended).length)} tone={offersDecisionCards.some((o) => o.__recommended) ? "good" : "neutral"} />
              <OfferSignalPill label="Toplam" value={String((offersModal.items || []).length)} tone="neutral" />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Otomatik öneri sırası: karar verilebilirlik → room puanı → fiyat farkı → güncellik. Son karar yine sende.
            </div>
            {recommendedOffer ? (
              <div className="row" style={{ marginTop: 10, gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div className="muted">
                  Öne çıkan teklif: {String(recommendedOffer.__recommendationShort || recommendedOffer.__recommendationReason || "Otomatik öneri")}
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {recommendedCanAccept ? (
                    <button type="button" disabled={busy} onClick={() => acceptOffer(recommendedOffer.id)}>
                      Önerileni Kabul Et
                    </button>
                  ) : null}
                  {recommendedCanAccept && offersModalPkgIds.length > 1 ? (
                    <button
                      type="button"
                      disabled={busy}
                      title={`Pakete uygula (${offersModalPkgIds.length} shift)`}
                      onClick={() => acceptOfferPackage(recommendedOffer.roomId)}
                    >
                      Önerileni Pakete Uygula
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {offersDecisionCards.map((o) => {
              const roomId = Number(o.room?.id || o.roomId || 0);
              const offerStatus = String(o.status || "").toUpperCase();
              const canAccept = offerStatus === "COUNTERED";
              const gap = offerGapMeta(o.amountCompany, o.amountRoom);
              const note = String(o.noteRoom || o.noteCompany || "").trim();
              const isRecommended = !!o.__recommended;
              const recommendationReason = String(o.__recommendationReason || "").trim();
              const recommendationShort = String(o.__recommendationShort || recommendationReason || "").trim();
              const recommendationReasons = Array.isArray(o.__recommendationReasons) ? o.__recommendationReasons : [];

              return (
                <div
                  key={o.id}
                  className="card"
                  style={{
                    border: isRecommended
                      ? "1px solid rgba(83,177,253,0.40)"
                      : canAccept
                      ? "1px solid rgba(242,153,74,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isRecommended
                      ? "linear-gradient(180deg, rgba(83,177,253,0.10), rgba(255,255,255,0.02))"
                      : canAccept
                      ? "rgba(242,153,74,0.07)"
                      : "rgba(255,255,255,0.02)",
                    boxShadow: isRecommended ? "0 0 0 1px rgba(83,177,253,0.08) inset" : "none",
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>
                        {o.room ? `${roomLabel(o.room)} (#${o.room.id})` : `Room #${o.roomId}`}
                      </div>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {isRecommended ? <RecommendationBadge reason={recommendationReason} /> : null}
                        <ProviderScoreBadge score={roomScores[String(roomId)] || null} prominent showLabel />
                        <span className="pill" data-status={o.status}>{o.status}</span>
                        <OfferSignalPill label="Karar" value={canAccept ? "Verilebilir" : "Beklemede"} tone={canAccept ? "warn" : "neutral"} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="btn sm" disabled={busy} onClick={() => setPreviewModal({ open: true, shiftId: Number(o.shiftId || offersModal.shiftId || 0) })}>
                        Harita / Navigasyon Önizle
                      </button>
                      <button
                        type="button"
                        disabled={busy || !canAccept}
                        onClick={() => acceptOffer(o.id)}
                      >
                        {isRecommended ? "Önerileni Kabul Et" : "Kabul Et"}
                      </button>
                      {offersModalPkgIds.length > 1 ? (
                        <button
                          type="button"
                          disabled={busy || !canAccept}
                          title={`Pakete uygula (${offersModalPkgIds.length} shift)`}
                          onClick={() => acceptOfferPackage(o.roomId)}
                        >
                          {isRecommended ? "Önerileni Pakete Uygula" : "Paketi Kabul Et"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <OfferSignalPill label="Company" value={o.amountCompany != null ? `${formatTRY(o.amountCompany)} ₺` : "-"} tone="neutral" />
                    <OfferSignalPill label="Room" value={o.amountRoom != null ? `${formatTRY(o.amountRoom)} ₺` : "-"} tone={canAccept ? "warn" : "neutral"} />
                    <OfferSignalPill label={gap.label} value={gap.value} tone={gap.tone} />
                  </div>

                  <RecommendationReasons reasons={isRecommended ? recommendationReasons : []} />
                  <div className="muted" style={{ marginTop: 8 }}>{gap.note}</div>
                  {isRecommended ? (
                    <div className="muted" style={{ marginTop: 6, color: "#b2ddff" }}>
                      <b>Neden önerildi?</b> {recommendationShort || recommendationReason || "Bu vardiya için otomatik öne çıktı."}
                    </div>
                  ) : null}
                  {note ? (
                    <div className="muted" style={{ marginTop: 4 }} title={note}>
                      <b>Not:</b> {note}
                    </div>
                  ) : null}

                  {String(o.status || "").toUpperCase() !== "ACCEPTED" && String(o.status || "").toUpperCase() !== "CANCELLED" ? (
                    <div className="card" style={{ marginTop: 10, border: "1px dashed rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.01)" }}>
                      <div className="muted" style={{ marginBottom: 6 }}>
                        {offersModalPkgIds.length > 1 ? "Bu room için pakete karşı teklif ver." : "Bu teklif için company karşı teklif ver."}
                      </div>
                      <div className="row" style={{ gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                        <div className="col" style={{ minWidth: 160 }}>
                          <label className="muted">Company Karşı Teklif (₺)</label>
                          <input
                            value={offersCounterSel[o.id]?.amountCompany ?? ""}
                            onChange={(e) => setOffersCounter(o.id, { amountCompany: e.target.value })}
                            placeholder="örn 12500"
                            disabled={busy}
                          />
                        </div>
                        <div className="col" style={{ flex: 1, minWidth: 220 }}>
                          <label className="muted">Not</label>
                          <input
                            value={offersCounterSel[o.id]?.noteCompany ?? ""}
                            onChange={(e) => setOffersCounter(o.id, { noteCompany: e.target.value })}
                            placeholder="opsiyonel"
                            disabled={busy}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => (offersModalPkgIds.length > 1 ? companyCounterPackage(o) : companyCounterOffer(o))}
                        >
                          {offersModalPkgIds.length > 1 ? "Pakete Karşı Teklif Ver" : "Karşı Teklif Ver"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}






