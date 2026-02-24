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

  // Top tabs
  const [topTab, setTopTab] = useState("request"); // request | templates | plan | tools

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // ✅ M24: Market shift (room seçmeden) + multi-room offers
  const [marketMode, setMarketMode] = useState(false);
  const [marketQ, setMarketQ] = useState("");
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

  // Room teklif kararı butonları için
  const [decidingId, setDecidingId] = useState(null);

  // Decision note input state (shift bazlı)
  const [decisionNoteSel, setDecisionNoteSel] = useState({}); // { [shiftId]: string }
  function setDecisionNote(shiftId, value) {
    setDecisionNoteSel((p) => ({ ...p, [Number(shiftId)]: value }));
  }

  // Pending filtreler
  const [pendingQ, setPendingQ] = useState("");
  const [applyToast, setApplyToast] = useState(null); // { ids:number[] }
  const marketSectionRef = useRef(null);
  const marketSearchRef = useRef(null);

  function focusMarketById(id) {
    if (!id) return;
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
  setTopTab("request");
  const k = `${tpl.id}::${Number(itemIndex) || 0}`;
  setSelectedTemplateId(k);
  const it = (tpl?.items || [])[Number(itemIndex) || 0];
  applyTemplateItemToRequest(tpl, it);
}

function usePlanDraftToRequest(draft) {
  // draft: {startAtLocal,endAtLocal,seatDemand,templateKey,marketMode}
  setTopTab("request");
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

      await api("/api/shifts", { method: "POST", token, body });

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
    return pendingItemsRaw
        .filter((s) => (!onlyAgreement ? true : Number(s.agreementId) > 0))
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
  }, [pendingItemsRaw, pendingQ, pendingOnlyRoomOffer, onlyAgreement]);

  // ✅ M24: Market filtre
  const marketItems = useMemo(() => {
    const q = String(marketQ || "").trim().toLowerCase();
    return (marketItemsRaw || [])
      .filter((s) => (onlyAgreement ? Number(s.agreementId) > 0 : true))
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.status, s.companyId].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [marketItemsRaw, marketQ, onlyAgreement]);

  // Final filtre uygula
  const finalItems = useMemo(() => {
    const q = String(finalQ || "").trim().toLowerCase();
    return finalItemsRaw
        .filter((s) => (!onlyAgreement ? true : Number(s.agreementId) > 0))
        .filter((s) => (finalStatus === "ALL" ? true : String(s.status) === finalStatus))
      .filter((s) => {
        if (!q) return true;
        const hay = [s.id, s.status, s.roomId, s.companyId, s.roomOfferNote, s.companyOfferNote, s.vehicle?.plate, s.driver?.fullName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [finalItemsRaw, finalQ, finalStatus, onlyAgreement]);

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


      {/* Top Tabs */}
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={topTab === "request" ? "btn primary" : "btn"} disabled={busy} onClick={() => setTopTab("request")}>
            Manuel Talep
          </button>
          <button type="button" className={topTab === "templates" ? "btn primary" : "btn"} disabled={busy} onClick={() => setTopTab("templates")}>
            Vardiya Şablonları
          </button>
          <button type="button" className={topTab === "plan" ? "btn primary" : "btn"} disabled={busy} onClick={() => setTopTab("plan")}>
            Plan Builder
          </button>
          <button type="button" className={topTab === "tools" ? "btn primary" : "btn"} disabled={busy} onClick={() => setTopTab("tools")}>
            Shift Tools
          </button>
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          {topTab === "request"
            ? "Manuel vardiya talebi oluştur. İstersen şablon seçerek Start/End'i otomatik doldur."
            : topTab === "templates"
            ? "Preset’ler sabit. Custom şablon ekleyip Manuel Talep ekranında seçebilirsin (company bazlı tarayıcıda saklanır)."
            : topTab === "plan"
            ? "Stage-0: kişi sayısı + kapasite → araç sayısı ve geohash cluster. İstersen tek tıkla Manuel Talep’e aktar, istersen Stage-3 ile direkt N market shift üret."
            : "Shift seç → personel ekle/import → durak üret (preview) → rota/durak önizleme (mini-map)."}
        </div>
      </div>

      {/* TAB: Manuel Talep */}
      {topTab === "request" ? (
        <div className="card">
          <h3>Manuel Vardiya Talebi</h3>

          <form onSubmit={createShift} className="grid">
            <div className="col">
              <label className="muted">Vardiya türü (şablon)</label>
              <select value={selectedTemplateId} onChange={(e) => onSelectTemplate(e.target.value)} disabled={busy}>
                <option value="">— Şablon seç (opsiyonel) —</option>
                {templateOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label} ({o.item.startHHMM}–{o.item.endHHMM})
                    {o.tpl.kind === "PRESET" ? " • PRESET" : ""}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Not: “Gece” gibi vardiyalarda End, otomatik olarak bir sonraki güne taşınır.
              </div>
            </div>

            <div className="col">
              <label className="muted">Kişi sayısı (opsiyonel filtre)</label>
              <input type="number" placeholder="örn. 16" value={seatDemand} onChange={(e) => setSeatDemand(e.target.value)} disabled={busy} />
            </div>

            <div className="col">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <label className="muted">Room</label>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }} title="Market shift: room seçmeden oluştur, sonra birden fazla room'a teklif gönder">
                  <input type="checkbox" checked={marketMode} onChange={(e) => setMarketMode(e.target.checked)} disabled={busy} />
                  Market
                </label>
              </div>
              <input
                value={roomQ}
                onChange={(e) => setRoomQ(e.target.value)}
                placeholder="Room ara (name contains)"
                disabled={busy || marketMode}
                style={{ marginBottom: 6 }}
              />
              {marketMode ? (
                <div className="card" style={{ marginTop: 6 }}>
                  <div className="muted">
                    Market shift: Room seçmeden talep açılır. Sonra <b>Teklif Gönder</b> ile birden fazla room’a teklif atabilirsin.
                  </div>
                </div>
              ) : (
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={busy}>
                  {roomOptions.length ? (
                    roomOptions.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {roomLabel(r)} (#{r.id})
                        {r?.hubLat != null && r?.hubLng != null ? "" : " • (Hub yok)"}
                        {seatN && !isCompany ? ` • ${r.eligibleCount} araç` : ""}
                      </option>
                    ))
                  ) : (
                    <option value={roomId}>Room #{roomId}</option>
                  )}
                </select>
              )}
              <div className="muted" style={{ marginTop: 6 }}>
                {marketMode ? (
                  <span>Room: <b>—</b> (Market)</span>
                ) : (
                  <>
                    Seçili room: {selectedRoom ? `${roomLabel(selectedRoom)} (#${selectedRoom.id})` : `#${roomId}`}
                    {selectedRoom ? (
                      selectedRoom?.hubLat != null && selectedRoom?.hubLng != null ? (
                        <span>
                          {" "}• hub: {Number(selectedRoom.hubLat).toFixed(6)}, {Number(selectedRoom.hubLng).toFixed(6)}
                        </span>
                      ) : (
                        <span style={{ color: "#b85" }}>{" "}• hub yok</span>
                      )
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="col">
              <label className="muted">Start</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} disabled={busy} />
            </div>

            <div className="col">
              <label className="muted">End</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} disabled={busy} />
            </div>

            {!marketMode ? (
              <>
                <div className="col" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted">Teklif Araç (opsiyonel)</label>
                  <select value={offerVehicleId} onChange={(e) => setOfferVehicleId(e.target.value)} disabled={busy}>
                    <option value="">— teklif yok —</option>
                    {filteredVehicles.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.plate} • {vehicleMetaLine(v)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted">Company Tutar (₺) (opsiyonel)</label>
                  <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="örn. 25000" disabled={busy} />
                </div>

                <div className="col" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted">Teklif Notu (opsiyonel)</label>
                  <input value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="örn. Bu vardiya için bu araç uygun" disabled={busy} />
                </div>
              </>
            ) : (
              <div className="col" style={{ gridColumn: "1 / -1" }}>
                <div className="muted">Market shift’te teklif (tutar/not) room bazlı gönderilir.</div>
              </div>
            )}

            <div className="col" style={{ justifyContent: "end" }}>
              <button disabled={busy} type="submit">
                {busy ? "..." : "Request"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* TAB: Vardiya Şablonları */}
      {topTab === "templates" ? (
        <ShiftTemplatesPanel
          busy={busy}
          allTemplates={allTemplates}
          customTemplates={customTemplates}
          setCustomTemplates={setCustomTemplates}
          onUseTemplate={useTemplateFromList}
          setErr={setErr}
        />
      ) : null}

      {/* TAB: Plan Builder (Stage-0) */}
      {topTab === "plan" ? (
        <PlanBuilderPanel
          token={token}
          templateOptions={templateOptions}
          onUseDraft={usePlanDraftToRequest}
          onAfterApply={async (created) => {
            const okIds = (created || []).filter((x) => x && x.ok && x.shiftId).map((x) => Number(x.shiftId)).filter(Boolean);
            if (okIds.length) {
              setApplyToast({ ids: okIds });
              focusMarketById(okIds[0]);
            }
            invalidate("shifts");
            invalidate("offers");
            await load();
          }}
        />
      ) : null}

      {/* TAB: Shift Tools */}
      {topTab === "tools" ? (
        <ShiftPeopleTab token={token} me={me} shifts={items} roomsById={roomsById} />
      ) : null}

      {/* BEKLEYEN */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Bekleyen Talepler</h3>
            <div className="muted">Pazarlık/karar tamamlanmadan “Liste”ye düşmez.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Ara (id/status/note/room)"
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
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

        {/* ✅ M24: Market shifts (room seçilmemiş) */}
        {marketItems.length ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="row" ref={marketSectionRef} style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Market Shifts</div>
                <div className="muted">Room seçilmemiş talepler. Teklifi birden fazla room’a gönder.</div>
              </div>
              <input
                ref={marketSearchRef}
                placeholder="Ara (id/status)"
                value={marketQ}
                onChange={(e) => setMarketQ(e.target.value)}
                style={{ minWidth: 220 }}
              />
            </div>

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
          </div>
        ) : null}

        {pendingItems.length ? (
          <table className="tbl">
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
                                placeholder="örn. Bu araçla şu şartla…"
                                disabled={busy}
                              />
                            </label>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button type="button" disabled={busy} onClick={() => sendCounterOffer(s)}>
                                {busy ? "..." : "Gönder"}
                              </button>

                              <button type="button" disabled={busy} onClick={() => clearCounterOffer(s)}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted">Bekleyen talep yok.</div>
        )}
      </div>

      {/* LİSTE */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Liste</h3>
            <div className="muted">Sadece APPROVED/ACTIVE/DONE/REJECTED burada görünür.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)}>
              <option value="ALL">Hepsi</option>
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
          <table className="tbl">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted">Henüz “Liste”ye düşen kayıt yok.</div>
        )}
      </div>

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
                      disabled={busy || o.status === "CANCELLED" || o.status === "ACCEPTED"}
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
