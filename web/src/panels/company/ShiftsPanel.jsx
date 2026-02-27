// web/src/panels/company/ShiftsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";
import ShiftPeopleTab from "./ShiftPeopleTab";
import ShiftTemplatesPanel, { PRESET_TEMPLATES, DEFAULT_WEEKMASK, DEFAULT_DURATION_KEY } from "./ShiftTemplatesPanel";
import PlanBuilderPanel from "./PlanBuilderPanel";

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
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDaysYmd(ymd, deltaDays) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayYmdLocal();
  const Y = Number(m[1]);
  const M = Number(m[2]);
  const D = Number(m[3]);
  const dt = new Date(Y, M - 1, D, 12, 0, 0);
  dt.setDate(dt.getDate() + Number(deltaDays || 0));
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}





export default function CompanyShiftsPanel() {
  const { token, me } = useSession();

  const LS_LAST_ROOM = "company:lastRoomId";

  // Page tabs (Create vs Track)
  const [mainTab, setMainTab] = useState("track"); // create | track
  const [trackTab, setTrackTab] = useState("pending"); // market | pending | list

  // Create flow (no new wizard; in-page steps)
  const [createStep, setCreateStep] = useState("request"); // request | people | plan
  const [showTemplatesMgr, setShowTemplatesMgr] = useState(false);
    // Create flow (Plan Builder time range comes from Step-1)
  const [pbDate, setPbDate] = useState(() => todayYmdLocal());
  const [pbTplKey, setPbTplKey] = useState("");
  const [lastCreatedShiftId, setLastCreatedShiftId] = useState(0);


  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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

  // M51: Shift süre uzatma (Company → Room talep)
  const [extendModal, setExtendModal] = useState({ open: false, shift: null, endLocal: "", note: "" });

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

  // Track tab değişince ilgili accordion içeriğini açık tut
  useEffect(() => {
    if (mainTab !== "track") return;
    if (trackTab === "market") ensureAcc("market");
    if (trackTab === "pending") ensureAcc("pending");
    if (trackTab === "list") ensureAcc("list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, trackTab]);


  const [pendingOnlyRoomOffer, setPendingOnlyRoomOffer] = useState(false);
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

  // datetime-local (Istanbul local) -> UTC ISO
  const IST_OFFSET_MIN = 180;
  function istanbulLocalToUtcIso(dtLocal) {
    if (!dtLocal) return null;
    const [d, t] = String(dtLocal).split("T");
    if (!d || !t) return null;

    const [Y, M, D] = d.split("-").map(Number);
    const [h, m] = t.split(":").map(Number);
    if (![Y, M, D, h, m].every(Number.isFinite)) return null;

    const utcMs = Date.UTC(Y, M - 1, D, h, m, 0) - IST_OFFSET_MIN * 60 * 1000;
    return new Date(utcMs).toISOString();
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
  const nextIso = new Date(baseEnd + 60 * 60 * 1000).toISOString();
  setExtendModal({
    open: true,
    shift,
    endLocal: utcIsoToIstanbulLocalInput(nextIso),
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
  // draft: {startAtLocal,endAtLocal,seatDemand,templateKey,marketMode}
  setMainTab("create");
  setCreateStep("request");
  setShowTemplatesMgr(false);
  setSelectedTemplateId(String(draft?.templateKey || ""));
  setStartAt(String(draft?.startAtLocal || ""));
  setEndAt(String(draft?.endAtLocal || ""));
  setSeatDemand(draft?.seatDemand != null ? String(draft.seatDemand) : "");
  setMarketMode(Boolean(draft?.marketMode));

  // Clear direct-offer fields (Plan Builder genelde market akışını hedefler)
  setOfferVehicleId("");
  setOfferAmount("");
  setOfferNote("");
}

  // Karşı teklif UI
  const [offerOpen, setOfferOpen] = useState({});
  const [offerSel, setOfferSel] = useState({});

  const isCompany = String(me?.role || "") === "COMPANY";

  function toggleOffer(shiftId) {
    setOfferOpen((p) => ({ ...p, [shiftId]: !p[shiftId] }));
  }
  function setOfferForShift(shiftId, patch) {
    setOfferSel((prev) => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), ...patch },
    }));
  }

  async function load() {
    setErr("");
    try {
      // M22: Company can also read room directory
      const roomsPromise = api("/api/rooms?take=500", { token }).catch(() => ({ items: [] }));

      const [sh, veh, rm] = await Promise.all([
        api("/api/shifts?take=200", { token }),
        api("/api/vehicles", { token }),
        roomsPromise,
      ]);

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
      const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];

      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

      setItems(list);
      setVehicles(vlist);
      setRooms(rlist);

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
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role]);

  // M28: after wizard creates a market shift, open offer modal automatically
  useEffect(() => {
    const raw = localStorage.getItem("company:autoOfferShiftId");
    if (!raw) return;
    localStorage.removeItem("company:autoOfferShiftId");
    const sid = Number(raw);
    if (!sid) return;
    openOfferModalForShift(sid);
  }, [rooms.length]);

  // ✅ M30-A: AgreementWizard market flow -> open offers list automatically
  useEffect(() => {
    const raw = localStorage.getItem("company:autoOffersListShiftId");
    if (!raw) return;
    localStorage.removeItem("company:autoOffersListShiftId");
    const sid = Number(raw);
    if (!sid) return;
    // delay so modal has token + room list ready
    setTimeout(() => openOffersModalForShift(sid), 120);
  }, [rooms.length]);

  useAutoReload("shifts", load);
  useAutoReload("vehicles", load);
  useAutoReload("rooms", load);

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

  const seatN = useMemo(() => (seatDemand ? Number(seatDemand) : null), [seatDemand]);

  const roomOptions = useMemo(() => {
    const baseRoomsRaw =
      rooms?.length
        ? rooms
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
  }, [rooms, vehicles, seatN, roomQ, isCompany]);

  useEffect(() => {
    if (!roomOptions.length) return;
    const rid = Number(roomId);
    const ok = roomOptions.some((r) => Number(r.id) === rid);
    if (!ok) setRoomId(String(roomOptions[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomOptions, roomId]);

  // persist last selected room for COMPANY
  useEffect(() => {
    if (!isCompany) return;
    try {
      if (roomId) localStorage.setItem(LS_LAST_ROOM, String(roomId));
    } catch {}
  }, [roomId, isCompany]);

  const filteredVehicles = useMemo(() => {
    const rid = Number(roomId);
    const sd = seatN;

    return vehicles
      .filter((v) => !rid || !v?.roomId || Number(v.roomId) === rid)
      .filter((v) => (sd ? Number(v?.capacity || 0) >= sd : true))
      .sort((a, b) => Number(a?.capacity || 0) - Number(b?.capacity || 0));
  }, [vehicles, roomId, seatN]);

  useEffect(() => {
    if (!offerVehicleId) return;
    const v = vehiclesById.get(Number(offerVehicleId));
    if (!v) {
      setOfferVehicleId("");
      return;
    }

    const rid = Number(roomId);
    if (rid && v?.roomId && Number(v.roomId) !== rid) {
      setOfferVehicleId("");
      return;
    }

    if (seatN && Number(v?.capacity || 0) < seatN) {
      setOfferVehicleId("");
      return;
    }
  }, [roomId, seatN, offerVehicleId, vehiclesById]);

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

      // Flow: after create, jump to Personel step
      setMainTab("create");
      setCreateStep("people");
      setShowTemplatesMgr(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}

    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  // ✅ M24: Market offers
  function openOfferModalForShift(shiftId) {
    setOfferModal({
      open: true,
      shiftId: Number(shiftId),
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
      await api(`/api/shifts/${shiftId}/offers`, {
        method: "POST",
        token,
        body: { roomIds, amountCompany: amountCompany ?? null, noteCompany: noteCompany ?? null },
      });

      setOfferModal((p) => ({ ...p, open: false }));
      invalidate("offers");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function openOffersModalForShift(shiftId) {
    const sid = Number(shiftId);
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

      // Flow: after create, jump to Personel step
      setMainTab("create");
      setCreateStep("people");
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

      // Flow: after create, jump to Personel step
      setMainTab("create");
      setCreateStep("people");
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

      // Flow: after create, jump to Personel step
      setMainTab("create");
      setCreateStep("people");
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

      // Flow: after create, jump to Personel step
      setMainTab("create");
      setCreateStep("people");
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

  function renderRoomOfferSummary(s, canDecide) {
    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;
    const rAmt = s.roomOfferAmount != null ? Number(s.roomOfferAmount) : null;

    const has = Boolean(rvId || rAmt != null || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);
    if (!has) return <span className="muted">-</span>;

    const decision = String(s.roomOfferDecision || "PENDING");
    const decisionAtText = s.roomOfferDecisionAt ? fmtTR(s.roomOfferDecisionAt) : "";

    const sid = Number(s.id);
    const noteVal = decisionNoteSel[sid] ?? "";

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
          <b>Karar:</b>{" "}
          {decision === "PENDING" ? (
            <span className="muted">PENDING</span>
          ) : (
            <span className="pill" data-status={decision}>
              {decision}
            </span>
          )}
          {decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}
        </div>

        {decision === "PENDING" ? (
          canDecide ? (
            <div style={{ marginTop: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                <b>Karar Notu (opsiyonel)</b>
              </div>

              <input
                value={noteVal}
                onChange={(e) => setDecisionNote(sid, e.target.value)}
                placeholder="örn. Uygun / Uygun değil, şu yüzden..."
                maxLength={200}
                disabled={busy || decidingId === sid}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy || decidingId === sid} onClick={() => decideRoomOffer(s, "ACCEPTED", noteVal)}>
                  {decidingId === sid ? "..." : "Kabul"}
                </button>
                <button type="button" disabled={busy || decidingId === sid} onClick={() => decideRoomOffer(s, "REJECTED", noteVal)}>
                  {decidingId === sid ? "..." : "Reddet"}
                </button>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 8 }}>
              Bu status’te karar verilemez.
            </div>
          )
        ) : null}

        {s.roomOfferDecisionNote ? (
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Karar Notu:</b> {s.roomOfferDecisionNote}
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
    () => items.filter((s) => !FINAL_STATUSES.has(String(s.status)) && s.roomId != null && s.roomId !== ""),
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

  const selectedRoom = roomsById.get(Number(roomId)) || roomOptions.find((r) => Number(r.id) === Number(roomId));

  function vehiclesForShiftRoom(shift) {
    const rid = Number(shift.roomId);
    return vehicles
      .filter((v) => !v?.roomId || Number(v.roomId) === rid)
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (COMPANY)</h3>
        <div className="muted">Bekleyen: DRAFT/REQUESTED • Liste: APPROVED/ACTIVE/DONE/REJECTED</div>
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


      {/* Page Tabs: Create vs Track */}
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={mainTab === "create" ? "btn primary" : "btn"}
            disabled={busy}
            onClick={() => setMainTab("create")}
            title="Manuel talep / şablon / plan builder / shift tools"
          >
            Oluştur
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
          {mainTab === "create"
            ? "Talep oluşturma akışı (Manuel/Şablon/Plan Builder/Tools)."
            : "Takip akışı (Hızlı filtre + Market/Bekleyen/Liste)."}
        </div>
      </div>

            {mainTab === "create" ? (
        <>
          <div className="card">
            <div
              className="row"
              style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>Oluşturma Akışı</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  1) Şablon/Talep → 2) Personel → 3) Plan &amp; Market
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={createStep === "request" ? "btn primary" : "btn"}
                  disabled={busy}
                  onClick={() => setCreateStep("request")}
                  title="Şablon seç / talep oluştur"
                >
                  1) Şablon / Talep
                </button>
                <button
                  type="button"
                  className={createStep === "people" ? "btn primary" : "btn"}
                  disabled={busy}
                  onClick={() => setCreateStep("people")}
                  title="Personel ekle/import + durak üret"
                >
                  2) Personel
                </button>
                <button
                  type="button"
                  className={createStep === "plan" ? "btn primary" : "btn"}
                  disabled={busy}
                  onClick={() => setCreateStep("plan")}
                  title="Matris → çöz → market shift üret"
                >
                  3) Plan &amp; Market
                </button>
              </div>
            </div>
          </div>

          {/* STEP 1: Şablon / Zaman */}
          {createStep === "request" ? (
            <>
              <div className="card">
                <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Şablon &amp; Zaman</div>
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                      Ana akış: 1) Şablon/Zaman → 2) Personel (Tools) → 3) Plan Builder (Matris/Çöz/Market).
                    </div>
                  </div>
                  <button type="button" className="btn" disabled={busy} onClick={() => setShowTemplatesMgr((v) => !v)}>
                    {showTemplatesMgr ? "Kapat" : "Şablonları Yönet"}
                  </button>
                </div>
              </div>

              {showTemplatesMgr ? (
                <ShiftTemplatesPanel
                  busy={busy}
                  allTemplates={allTemplates}
                  customTemplates={customTemplates}
                  setCustomTemplates={setCustomTemplates}
                  onUseTemplate={useTemplateFromList}
                  setErr={setErr}
                />
              ) : null}

              <div className="card">
                <div className="grid">
                  <div className="col">
                    <label className="muted">Tarih</label>
                    <input type="date" value={pbDate} onChange={(e) => setPbDate(e.target.value)} disabled={busy} />
                  </div>
                  <div className="col">
                    <label className="muted">Şablon item</label>
                    <select value={pbTplKey} onChange={(e) => setPbTplKey(e.target.value)} disabled={busy}>
                      <option value="">— seç —</option>
                      {(templateOptions || []).map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label} ({o.item.startHHMM}–{o.item.endHHMM})
                          {o.tpl.kind === "PRESET" ? " • PRESET" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                      Seçim sonucu: Start={pbRange?.startAtLocal || "—"} • End={pbRange?.endAtLocal || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="muted">Sonraki adım: Personel ekle/import → durak üret → önizle.</div>
                  <button type="button" className="btn primary" disabled={busy || !pbOk} onClick={() => setCreateStep("people")}>
                    Sonraki → Personel
                  </button>
                </div>
                {!pbOk ? <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>Devam etmek için tarih + şablon seç.</div> : null}
              </div>

              

              {/* Manuel Talep kaldırıldı (M51) */}



            </>
          ) : null}

{/* STEP 2: Personel */}
          {createStep === "people" ? (
            <>
              <div className="card">
                <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Personel (Shift Tools)</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      Shift seç → personel ekle/import → durak üret (preview) → rota/durak önizleme.
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn" disabled={busy} onClick={() => setCreateStep("request")}>
                      ← Geri
                    </button>
                    <button type="button" className="btn primary" disabled={busy} onClick={() => setCreateStep("plan")}>
                      Sonraki → Plan &amp; Market
                    </button>
                  </div>
                </div>
              </div>

              <ShiftPeopleTab token={token} me={me} shifts={items} roomsById={roomsById} preferredShiftId={lastCreatedShiftId} />
            </>
          ) : null}

          {/* STEP 3: Plan & Market */}
          {createStep === "plan" ? (
            <>
              <div className="card">
                <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Plan Builder</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      Matris → çöz → N market shift üret. Zaman aralığı Step-1’den gelir (Şablon & Zaman).
                    </div>
                  </div>
                  <button type="button" className="btn" disabled={busy} onClick={() => setCreateStep("people")}>
                    ← Geri
                  </button>
                </div>
              </div>

              <PlanBuilderPanel
                token={token}
                templateOptions={templateOptions}
                rangeOverride={pbRange}
                directionOverride={pbSelected?.item?.direction}
                patternOverride={pbSelected?.item?.pattern}
                hideDraftTransferUI
                onAfterApply={async (created) => {
                  const okIds = (created || [])
                    .filter((x) => x && x.ok && x.shiftId)
                    .map((x) => Number(x.shiftId))
                    .filter(Boolean);
                  if (okIds.length) {
                    setApplyToast({ ids: okIds });
                    setLastCreatedShiftId(okIds[0]);
                    setShowTemplatesMgr(false);
                  }
                  invalidate("shifts");
                  invalidate("offers");
                  await load();
                }}
              />
            </>
          ) : null}
        </>
      ) : null}


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
            Market <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{marketItems.length}</span>
          </button>
          <button type="button" className={trackTab === "pending" ? "btn primary" : "btn"} onClick={() => setTrackTab("pending")}>
            Bekleyen <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{pendingItems.length}</span>
          </button>
          <button type="button" className={trackTab === "list" ? "btn primary" : "btn"} onClick={() => setTrackTab("list")}>
            Liste <span className="pill" data-status="COUNT" style={{ marginLeft: 8 }}>{finalItems.length}</span>
          </button>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Market: room seçilmemiş talepler • Bekleyen: pazarlık/karar • Liste: APPROVED/ACTIVE/DONE/REJECTED
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
              <tr key={s.id}>
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
              <th>Karşı Teklif</th>
              <th>İptal</th>
              <th>Start</th>
              <th>End</th>
              <th>Uzat</th>
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
                <tr key={s.id}>
                  <td>
                    {s.id}
                    <AgreementBadge agreementId={s.agreementId} />
                  </td>
                  <td>
                    <span className="pill" data-status={s.status}>
                      {s.status}
                    </span>
                  </td>
                  <td className="muted">{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</td>

                  <td>{renderRoomOfferSummary(s, canNegotiate)}</td>
                  <td>{renderCompanyOfferSummary(s)}</td>

                  <td>
                    <button type="button" disabled={busy || !canNegotiate} onClick={() => toggleOffer(sid)}>
                      {isOpen ? "Kapat" : "Karşı Teklif"}
                    </button>

                    {isOpen ? (
                      <div className="card" style={{ marginTop: 8 }}>
                        <div className="muted" style={{ marginBottom: 6 }}>
                          Company teklifini güncelle (C→R)
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <label className="muted">
                            <div style={{ marginBottom: 4 }}>
                              <b>Teklif Araç (opsiyonel)</b>
                            </div>
                            <select
                              value={form.companyOfferVehicleId || ""}
                              onChange={(e) => setOfferForShift(sid, { companyOfferVehicleId: e.target.value })}
                              disabled={busy}
                            >
                              <option value="">— teklif yok —</option>
                              {roomVehicles.map((v) => (
                                <option key={v.id} value={String(v.id)}>
                                  {v.plate} • {vehicleMetaLine(v)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="muted">
                            <div style={{ marginBottom: 4 }}>
                              <b>Teklif Tutar (₺) (opsiyonel)</b>
                            </div>
                            <input
                              value={form.companyOfferAmount ?? ""}
                              onChange={(e) => setOfferForShift(sid, { companyOfferAmount: e.target.value })}
                              placeholder="örn. 25000"
                              disabled={busy}
                            />
                          </label>

                          <label className="muted">
                            <div style={{ marginBottom: 4 }}>
                              <b>Teklif Notu (opsiyonel)</b>
                            </div>
                            <input
                              value={form.companyOfferNote ?? ""}
                              onChange={(e) => setOfferForShift(sid, { companyOfferNote: e.target.value })}
                              placeholder="örn. Yakın zamanda başlayabiliriz"
                              maxLength={200}
                              disabled={busy}
                            />
                          </label>

                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button type="button" disabled={busy} onClick={() => upsertCompanyOffer(sid)}>
                              Kaydet
                            </button>
                            <button type="button" disabled={busy} onClick={() => removeCompanyOffer(sid)}>
                              Teklifi Kaldır
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
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
      <button
        type="button"
        disabled={busy || !(String(s.status || "").toUpperCase() === "APPROVED" || String(s.status || "").toUpperCase() === "ACTIVE")}
        onClick={() => openExtendModal(s)}
      >
        Süre Uzat
      </button>
    )}
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
            </tr>
          </thead>

          <tbody>
            {finalItems.map((s) => {
              const r = roomsById.get(Number(s.roomId));
              return (
                <tr key={s.id}>
                  <td>
                    {s.id}
                    <AgreementBadge agreementId={s.agreementId} />
                  </td>
                  <td>
                    <span className="pill" data-status={s.status}>
                      {s.status}
                    </span>
                  </td>
                  <td className="muted">{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</td>
                  <td>{renderRoomOfferSummary(s, false)}</td>
                  <td>{renderCompanyOfferSummary(s)}</td>
                  <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                  <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
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
      <button
        type="button"
        disabled={busy || !(String(s.status || "").toUpperCase() === "APPROVED" || String(s.status || "").toUpperCase() === "ACTIVE")}
        onClick={() => openExtendModal(s)}
      >
        Süre Uzat
      </button>
    )}
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
              <div className="muted">Birden fazla room seçip tek seferde teklif at.</div>
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
              .map((r) => (
                <label key={r.id} className="muted" style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(offerModal.roomIds?.[r.id])}
                    onChange={() => toggleOfferRoom(r.id)}
                  />
                  <span>
                    <b>{roomLabel(r)}</b> (#{r.id})
                    {r?.hubLat != null && r?.hubLng != null ? "" : " • hub yok"}
                  </span>
                </label>
              ))}
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
              <div className="muted">Birini kabul edince diğerleri otomatik iptal olur.</div>
            </div>
            <button type="button" disabled={busy} onClick={() => setOffersModal((p) => ({ ...p, open: false }))}>
              Kapat
            </button>
          </div>

          <table className="tbl" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Status</th>
                <th>Company</th>
                <th>Room</th>
                <th>Accept</th>
              </tr>
            </thead>
            <tbody>
              {(offersModal.items || []).map((o) => (
                <tr key={o.id}>
                  <td className="muted">{o.room ? `${roomLabel(o.room)} (#${o.room.id})` : `#${o.roomId}`}</td>
                  <td><span className="pill" data-status={o.status}>{o.status}</span></td>
                  <td className="muted">{formatTRY(o.amountCompany)}</td>
                  <td className="muted">{formatTRY(o.amountRoom)}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busy || o.status !== "COUNTERED"}
                      onClick={() => acceptOffer(o.id)}
                    >
                      Kabul Et
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
