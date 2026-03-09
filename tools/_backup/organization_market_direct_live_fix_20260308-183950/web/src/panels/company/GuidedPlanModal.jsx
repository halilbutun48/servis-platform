import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import ShiftPeopleTab from "./ShiftPeopleTab";
import { personLabel } from "../../utils/labels";
import {
  WEEKDAYS,
  DURATION_PRESETS,
  QUICK_DURATION_PRESETS,
  weekdayBitFromYmdUTC,
  countMatchingDaysInRange,
  nextYmdMatchingMask,
  selectedFromMask,
  maskFromSelected,
  weekMaskToText,
  addDaysISO,
} from "../../utils/agreementUi";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toHHMM(min) {
  const m = ((Number(min) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseHHMM(s) {
  const t = String(s || "").trim();
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function ymdMinToIso(ymd, min) {
  const m = ((Number(min) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  // Istanbul (+03) -> ISO Z
  return new Date(`${ymd}T${hh}:${mm}:00+03:00`).toISOString();
}

function fmtTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 60,
        padding: 16,
        overflow: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="card" style={{ maxWidth: 1100, margin: "24px auto" }}>
        {children}
      </div>
    </div>
  );
}

// Plan paketleri (tek akış için)
const PACKS = [
  {
    key: "WK_MORNING",
    title: "Hafta içi • Sabah",
    desc: "07:00 → 09:00 (Toplama → Hub)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_EVENING",
    title: "Hafta içi • Akşam",
    desc: "17:00 → 19:00 (Hub → Dağıtım)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_MORNING_EVENING",
    title: "Hafta içi • Sabah + Akşam",
    desc: "2 vardiya taslağı oluşturur (07-09 + 17-19)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
   {
    key: "WK_MORNING_AFTERNOON",
    title: "Hafta içi • Sabah + Öğleden sonra",
    desc: "2 vardiya taslağı oluşturur (06-08 + 15-17)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 6 * 60, endMin: 8 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Öğleden sonra", startMin: 15 * 60, endMin: 17 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
  {
    key: "WK_NIGHT",
    title: "Hafta içi • Gece",
    desc: "23:00 → 01:00 (midnight-cross)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Gece", startMin: 23 * 60, endMin: 1 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "CUSTOM",
    title: "Özel",
    desc: "Elle ayarla",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Özel", startMin: 8 * 60, endMin: 10 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
];

function stepTitle(step, who) {
  if (step === 0) return "1) Şirket konumu";
  if (step === 1) return "2) Plan paketi";
  if (step === 2) return `3) ${who} + Durak`;
  if (step === 3) return "4) Matris/Çöz + Talep gönder";
  return "";
}

export default function GuidedPlanModal({
  open,
  onClose,
  rooms = [],
  roomsSupported = true,
  onReloadRooms = null,
  onAfterCreated = null,
}) {
  const { token, me } = useSession();
  const who = personLabel(me);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // Step-0: hub
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");
  const [addr, setAddr] = useState("");
  const [hubLoaded, setHubLoaded] = useState(false);

  // Step-1: plan
  const [packKey, setPackKey] = useState("WK_MORNING_EVENING");
  const pack = useMemo(() => PACKS.find((p) => p.key === packKey) || PACKS[0], [packKey]);
  const [startDate, setStartDate] = useState(todayYmd());
  const [durationKey, setDurationKey] = useState("2d");
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS.find((x) => x.key === "2d") || DURATION_PRESETS[0];
    return Number(p.days || 30);
  }, [durationKey]);
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 0));
  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);
  const eligibleDaysCount = useMemo(() => countMatchingDaysInRange(startDate, endDate, weekMask), [startDate, endDate, weekMask]);
  const nextValidStart = useMemo(() => nextYmdMatchingMask(startDate, weekMask, 31), [startDate, weekMask]);
  const [customSlots, setCustomSlots] = useState(() => [
    { label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" },
  ]);
  const [draftNote, setDraftNote] = useState("");
  const [draftAmount, setDraftAmount] = useState("");

  const [draftShiftIds, setDraftShiftIds] = useState([]);
  const [draftShifts, setDraftShifts] = useState([]);
  const [osrmBatch, setOsrmBatch] = useState({ running: false, done: 0, total: 0 });
  const [osrmResById, setOsrmResById] = useState({});

  // Step-3: offers
  const [roomQ, setRoomQ] = useState("");
  const [onlyHubRooms, setOnlyHubRooms] = useState(true);
  const [selRoomIds, setSelRoomIds] = useState({});
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [sentOk, setSentOk] = useState(false);

  const roomsFiltered = useMemo(() => {
    const list = Array.isArray(rooms) ? rooms : [];
    const q = String(roomQ || "").trim().toLowerCase();
    return list
      .filter((r) => (onlyHubRooms ? Boolean(r?.hubLat && r?.hubLng) : true))
      .filter((r) => {
        if (!q) return true;
        const hay = `${r?.id ?? ""} ${r?.name ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 220);
  }, [rooms, roomQ, onlyHubRooms]);

  const roomsById = useMemo(() => {
    const m = new Map();
    (rooms || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [rooms]);

  function resetAll() {
    setStep(0);
    setBusy(false);
    setErr("");
    setInfo("");
    setHubLat("");
    setHubLng("");
    setAddr("");
    setHubLoaded(false);
    setPackKey("WK_MORNING_EVENING");
    setStartDate(todayYmd());
    setDurationKey("2d");
    setEndDate(addDaysISO(todayYmd(), 0));
    setDaysSel(selectedFromMask(62));
    setCustomSlots([{ label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" }]);
    setDraftNote("");
    setDraftAmount("");
    setDraftShiftIds([]);
    setDraftShifts([]);
    setOsrmBatch({ running: false, done: 0, total: 0 });
    setOsrmResById({});
    setRoomQ("");
    setOnlyHubRooms(true);
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");
    setSentOk(false);
  }

  // Load hub on open
  useEffect(() => {
    if (!open) return;
    if (!token) return;
    setErr("");
    setInfo("");
    setSentOk(false);

    let alive = true;
    (async () => {
      try {
        const h = await api("/api/company/hub", { token });
        if (!alive) return;
        setHubLat(h?.hubLat == null ? "" : String(h.hubLat));
        setHubLng(h?.hubLng == null ? "" : String(h.hubLng));
        setHubLoaded(true);
      } catch {
        if (!alive) return;
        setHubLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, token]);

  // Sync endDate when start/duration changes
  useEffect(() => {
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, durationDays]);

  function stepItems() {
    if (pack.key !== "CUSTOM") return pack.items;
    const slots = Array.isArray(customSlots) ? customSlots : [];
    if (!slots.length) return [];
    const out = [];
    for (const s of slots) {
      const sMin = parseHHMM(s?.startHHMM);
      const eMin = parseHHMM(s?.endHHMM);
      if (sMin == null || eMin == null) return [];
      out.push({
        label: String(s?.label || "").trim() || "Özel",
        startMin: sMin,
        endMin: eMin,
        direction: s?.direction || "INBOUND",
        pattern: s?.pattern || "ONE_WAY",
      });
    }
    return out;
  }

  async function saveHub() {
    setErr("");
    setInfo("");
    if (!token) return;
    const lat = hubLat === "" ? null : Number(hubLat);
    const lng = hubLng === "" ? null : Number(hubLng);
    if ((lat == null) !== (lng == null)) {
      setErr("Hub lat/lng birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    setBusy(true);
    try {
      await api("/api/company/hub", { token, method: "PUT", body: { hubLat: lat, hubLng: lng } });
      setInfo("✅ Şirket konumu kaydedildi.");
      setStep(1);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function useGeolocation() {
    setErr("");
    setInfo("");
    if (!navigator?.geolocation) {
      setErr("Tarayıcı konum izni desteklemiyor.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setErr("Konum okunamadı.");
          return;
        }
        setHubLat(String(lat));
        setHubLng(String(lng));
        setInfo("✅ Konum alındı. Kaydetmek için 'İleri'ye bas.");
      },
      (e) => {
        setBusy(false);
        setErr(String(e?.message || e || "Konum izni reddedildi"));
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  async function geocodeAddress() {
    setErr("");
    setInfo("");
    if (!token) return;
    const q = String(addr || "").trim();
    if (q.length < 3) {
      setErr("Adres en az 3 karakter olmalı.");
      return;
    }
    setBusy(true);
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      if (r?.ok) {
        setHubLat(String(r.lat));
        setHubLng(String(r.lng));
        setInfo(`✅ Bulundu: ${r.displayName || ""}`);
      } else {
        setErr("Adres bulunamadı.");
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function createDraftShifts() {
    setErr("");
    setInfo("");
    setSentOk(false);
    if (!token) return;

    const lat = hubLat === "" ? null : Number(hubLat);
    const lng = hubLng === "" ? null : Number(hubLng);
    if ((lat == null) !== (lng == null)) {
      setErr("Hub lat/lng birlikte olmalı.");
      return;
    }
    if (lat != null && lng != null && (lat === 0 || lng === 0)) {
      setErr("Hub 0,0 olamaz.");
      return;
    }

    const items = stepItems();
    if (!items.length) {
      setErr("Plan paketi geçersiz.");
      return;
    }

    setBusy(true);
    try {
            const createdIds = [];

      // Multi-day draft generation (inclusive start..end):
      // - respects weekMask (selected weekdays)
      // - creates one shift per (day x slot)
      const ymds = [];
      let cur = String(startDate);
      for (let i = 0; i <= 370; i++) {
        const bit = weekdayBitFromYmdUTC(cur);
        if ((weekMask & bit) !== 0) ymds.push(cur);

        if (cur === endDate) break;
        cur = addDaysISO(cur, 1);
      }

      if (!ymds.length) {
        setErr("Seçili tarih aralığında (gün filtresine göre) vardiya üretilecek gün yok. Başlangıç / günler / süreyi değiştir.");
        return;
      }

      for (const ymd of ymds) {
        for (const it of items) {
          const startAt = ymdMinToIso(ymd, it.startMin);
          const endYmd = it.endMin < it.startMin ? addDaysISO(ymd, 1) : ymd;
          const endAt = ymdMinToIso(endYmd, it.endMin);
          const body = {
            // M34/M35: market shift -> roomId OMIT (roomId optional; null trips zod)
            startAt,
            endAt,
            hubLat: lat,
            hubLng: lng,
            direction: it.direction,
            pattern: it.pattern,
          };
          const amt = parseTryInput(draftAmount);
          if (amt != null) body.companyOfferAmount = amt;
          if (draftNote) body.companyOfferNote = String(draftNote);

          const s = await api("/api/shifts", { token, method: "POST", body });
          if (s?.id) {
            createdIds.push(Number(s.id));
            // Persist plan terms per shift (for later negotiation screens)
            try {
              localStorage.setItem(
                `psv1:planTerms:shift:${Number(s.id)}:v1`,
                JSON.stringify({
                  planStartDate: startDate,
                  planEndDate: endDate,
                  ymd,
                  weekMask,
                  startMin: it.startMin,
                  endMin: it.endMin,
                  direction: it.direction,
                  pattern: it.pattern,
                  hubLat: lat,
                  hubLng: lng,
                })
              );
            } catch {
              // ignore
            }
          }
        }
      }

setDraftShiftIds(createdIds);
      setInfo(`✅ Taslak shift oluşturuldu: ${createdIds.map((x) => "#" + x).join(", ")}`);

      // fetch shifts for Step-2/3
      const list = await api("/api/shifts?take=500&includeDrafts=1&includeStops=1", { token });
      const itemsAll = Array.isArray(list?.items) ? list.items : [];
      const filtered = itemsAll.filter((x) => createdIds.includes(Number(x.id)));
      setDraftShifts(filtered);

      setStep(2);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshDraftShifts() {
    if (!token) return;
    if (!draftShiftIds.length) return;
    try {
      const list = await api("/api/shifts?take=500&includeDrafts=1&includeStops=1", { token });
      const itemsAll = Array.isArray(list?.items) ? list.items : [];
      setDraftShifts(itemsAll.filter((x) => draftShiftIds.includes(Number(x.id))));
    } catch {
      // ignore
    }
  }

  
async function osrmReorderCore(sid) {
  const s = (draftShifts || []).find((x) => Number(x.id) === Number(sid));
  if (!s) return { ok: false, error: "Shift bulunamadı." };

  const stops = Array.isArray(s?.stops) ? s.stops : [];
  if (stops.length < 2) return { ok: false, error: "Sıralama için en az 2 durak gerekir." };

  const hubOk = s?.hubLat != null && s?.hubLng != null;

  const depot = hubOk
    ? { id: "depot", lat: Number(s.hubLat), lng: Number(s.hubLng) }
    : { id: "depot", lat: Number(stops[0].lat), lng: Number(stops[0].lng) };

  const points = [depot, ...stops.map((x) => ({ id: Number(x.id), lat: Number(x.lat), lng: Number(x.lng) }))];

  const t = await api("/api/plan-builder/osrm-table", { token, method: "POST", body: { profile: "driving", points } });
  if (!t?.ok) return { ok: false, error: "OSRM matrisi alınamadı (opsiyonel). Solver/OSRM kapalı olabilir." };

  const solved = await api("/api/plan-builder/solve-vrp", {
    token,
    method: "POST",
    body: {
      durationsSec: t?.durationsSec,
      distancesM: t?.distancesM,
      pointIds: points.map((p) => p.id),
      depotIndex: 0,
      returnToDepot: false,
      preferOrtools: true,
    },
  });

  if (!solved?.ok || !Array.isArray(solved?.orderPointIds)) return { ok: false, error: "Çözüm alınamadı (solver kapalı olabilir)." };

  const orderedStopIds = solved.orderPointIds
    .filter((id) => id !== "depot")
    .map((id) => Number(id))
    .filter(Number.isFinite);

  if (orderedStopIds.length !== stops.length) return { ok: false, error: "Sıralama uyuşmadı (durak sayısı)." };

  await api(`/api/shifts/${Number(sid)}/stops/reorder`, { token, method: "PUT", body: { idsInOrder: orderedStopIds } });

  return { ok: true, solver: solved.solver || null };
}

async function osrmReorder(shiftId) {
  setErr("");
  setInfo("");
  if (!token) return;

  const sid = Number(shiftId);
  if (!Number.isFinite(sid)) return;

  setBusy(true);
  try {
    const res = await osrmReorderCore(sid);
    if (!res.ok) {
      setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: res.error } }));
      setErr(res.error || "Sıralama başarısız.");
      return;
    }
    setOsrmResById((prev) => ({ ...prev, [sid]: { ok: true } }));
    setInfo(`✅ Rota sıralandı (solver: ${res.solver || "-"}).`);
    await refreshDraftShifts();
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setBusy(false);
  }
}

async function osrmReorderAll() {
  setErr("");
  setInfo("");
  if (!token) return;

  const ids = (draftShifts || [])
    .map((x) => Number(x.id))
    .filter(Number.isFinite);

  if (!ids.length) {
    setErr("Taslak shift yok.");
    return;
  }

  setBusy(true);
  setOsrmBatch({ running: true, done: 0, total: ids.length });

  try {
    let okCount = 0;
    let errCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const sid = ids[i];

      try {
        const res = await osrmReorderCore(sid);
        if (res.ok) {
          okCount++;
          setOsrmResById((prev) => ({ ...prev, [sid]: { ok: true } }));
        } else {
          errCount++;
          setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: res.error } }));
        }
      } catch (e) {
        errCount++;
        setOsrmResById((prev) => ({ ...prev, [sid]: { ok: false, error: String(e?.message || e) } }));
      }

      setOsrmBatch({ running: true, done: i + 1, total: ids.length });
    }

    await refreshDraftShifts();
    setInfo(`✅ Hepsi işlendi. OK: ${okCount}, Hata: ${errCount}.`);
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setOsrmBatch((p) => ({ ...p, running: false }));
    setBusy(false);
  }
}

async function sendBulkOffers() {
    setErr("");
    setInfo("");
    if (!token) return;
    if (!draftShiftIds.length) {
      setErr("Önce taslak shift oluşturmalısın.");
      return;
    }

    const roomIds = Object.keys(selRoomIds)
      .filter((k) => selRoomIds[k])
      .map((k) => Number(k))
      .filter(Number.isFinite);
    if (!roomIds.length) {
      setErr("En az 1 room seç.");
      return;
    }

    setBusy(true);
    try {
      const amountCompany = parseTryInput(offerAmount);
      const noteStr = String(offerNote || "").trim();

      const baseBody = { roomIds };
      if (amountCompany != null) baseBody.amountCompany = amountCompany;
      if (noteStr) baseBody.noteCompany = noteStr;

      for (const sid of draftShiftIds) {
        await api(`/api/shifts/${sid}/offers`, {
          token,
          method: "POST",
          body: baseBody,
        });
      }
setSentOk(true);
      setInfo(`✅ Gönderildi (shift sayısı: ${draftShiftIds.length}).`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const planSummary = useMemo(() => {
    const items = stepItems();
    const lines = items.map((it) => `${it.label || ""}: ${toHHMM(it.startMin)} – ${toHHMM(it.endMin)} • ${it.direction} • ${it.pattern}`);
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packKey, customSlots]);

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose?.();
        resetAll();
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Guided Mode — Yeni Plan</div>
          <div className="muted" style={{ marginTop: 4 }}>{stepTitle(step, who)}</div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { onClose?.(); resetAll(); }} disabled={busy}>Kapat</button>
        </div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>{err}</div>
      ) : null}
      {info ? (
        <div className="card" style={{ marginTop: 10, border: "1px solid #2a7" }}>{info}</div>
      ) : null}

      {/* Step-0: Hub */}
      {step === 0 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div className="muted">1. adımda Company kendi lokasyonunu (hub) ayarlar.</div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={useGeolocation} disabled={busy}>Konumumu al</button>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Adresten konum al (örn. Ankara Çankaya ...)"
              style={{ flex: 1, minWidth: 260 }}
              disabled={busy}
            />
            <button type="button" onClick={geocodeAddress} disabled={busy}>Adresten bul</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="muted">Hub lat</label>
              <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
            </div>
            <div>
              <label className="muted">Hub lng</label>
              <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
            </div>
          </div>

          {!hubLoaded ? <div className="muted">Hub okunuyor...</div> : null}

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" onClick={saveHub} disabled={busy}>İleri</button>
          </div>
        </div>
      ) : null}

      {/* Step-1: Plan */}
      {step === 1 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="muted">2. adımda plan paketi seçilir. Bu adım sadece <b>taslak</b> oluşturur; teklif göndermez.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card">
              <div style={{ fontWeight: 800 }}>Plan paketi</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {PACKS.map((p) => (
                  <label key={p.key} className="row" style={{ gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="pack"
                      checked={packKey === p.key}
                      onChange={() => setPackKey(p.key)}
                      disabled={busy}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.title}</div>
                      <div className="muted">{p.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                {pack.key !== "CUSTOM" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => {
                      const src = Array.isArray(pack?.items) ? pack.items : [];
                      const slots = src.map((it, idx) => ({
                        label: String(it?.label || `Vardiya ${idx + 1}`),
                        startHHMM: toHHMM(it.startMin),
                        endHHMM: toHHMM(it.endMin),
                        direction: it?.direction || "INBOUND",
                        pattern: it?.pattern || "ONE_WAY",
                      }));
                      setCustomSlots(slots.length ? slots : [{ label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" }]);
                      setPackKey("CUSTOM");
                    }}
                  >
                    Özele çevir (düzenle)
                  </button>
                ) : null}
              </div>

              {pack.key === "CUSTOM" ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    İpucu: End, Start’tan küçükse “gece vardiyası” sayılır (bir sonraki güne taşar).
                  </div>

                  {(customSlots || []).map((slot, idx) => (
                    <div key={idx} className="card" style={{ padding: 10, border: "1px solid #223" }}>
                      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input
                          value={slot?.label || ""}
                          onChange={(e) =>
                            setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                          }
                          placeholder={`Vardiya ${idx + 1}`}
                          style={{ minWidth: 160, flex: 1 }}
                          disabled={busy}
                        />
                        {(customSlots || []).length > 1 ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setCustomSlots((p) => (p || []).filter((_, i) => i !== idx))}
                            disabled={busy}
                          >
                            Kaldır
                          </button>
                        ) : null}
                      </div>

                      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                        <label className="muted">
                          Start{" "}
                          <input
                            value={slot?.startHHMM || ""}
                            onChange={(e) =>
                              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, startHHMM: e.target.value } : x)))
                            }
                            style={{ width: 120 }}
                            disabled={busy}
                          />
                        </label>
                        <label className="muted">
                          End{" "}
                          <input
                            value={slot?.endHHMM || ""}
                            onChange={(e) =>
                              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, endHHMM: e.target.value } : x)))
                            }
                            style={{ width: 120 }}
                            disabled={busy}
                          />
                        </label>

                        <label className="muted">
                          Direction{" "}
                          <select
                            value={slot?.direction || "INBOUND"}
                            onChange={(e) =>
                              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, direction: e.target.value } : x)))
                            }
                            disabled={busy}
                          >
                            <option value="INBOUND">INBOUND</option>
                            <option value="OUTBOUND">OUTBOUND</option>
                          </select>
                        </label>

                        <label className="muted">
                          Pattern{" "}
                          <select
                            value={slot?.pattern || "ONE_WAY"}
                            onChange={(e) =>
                              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, pattern: e.target.value } : x)))
                            }
                            disabled={busy}
                          >
                            <option value="ONE_WAY">ONE_WAY</option>
                            <option value="LOOP">LOOP</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        setCustomSlots((p) => [
                          ...(p || []),
                          { label: `Vardiya ${(p || []).length + 1}`, startHHMM: "17:00", endHHMM: "19:00", direction: "OUTBOUND", pattern: "ONE_WAY" },
                        ])
                      }
                      disabled={busy || (customSlots || []).length >= 3}
                      title={(customSlots || []).length >= 3 ? "Maksimum 3 vardiya" : "Yeni vardiya ekle"}
                    >
                      + Vardiya ekle
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="card">
              <div style={{ fontWeight: 800 }}>Tarih + günler</div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="muted">Başlangıç</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
                </div>
                <div>
                  <label className="muted">Hızlı süre</label>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {QUICK_DURATION_PRESETS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        className={durationKey === d.key ? "" : "btn"}
                        disabled={busy}
                        onClick={() => setDurationKey(d.key)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    Seçince bitiş otomatik hesaplanır.
                  </div>
                </div>
                <div>
                  <label className="muted">Bitiş (otomatik)</label>
                  <input type="date" value={endDate} readOnly disabled />
                </div>
                <div>
                  <label className="muted">Günler</label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {WEEKDAYS.map((w) => (
                      <label key={w.k} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!daysSel[w.k]}
                          onChange={() => {
                            setDaysSel((p) => ({ ...p, [w.k]: !p[w.k] }));
                          }}
                          disabled={busy}
                        />
                        {w.label}
                      </label>
                    ))}
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>Günler: {weekMaskToText(weekMask)} • weekMask:{weekMask}</div>

                  {eligibleDaysCount === 0 ? (
                    <div className="card err" style={{ marginTop: 8 }}>
                      Seçili tarih aralığında (gün filtresine göre) vardiya üretilecek gün yok. Başlangıç / günler / süreyi değiştir.
                      {nextValidStart ? (
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setStartDate(nextValidStart);
                            }}
                            disabled={busy}
                          >
                            Başlangıcı {nextValidStart} yap
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="muted" style={{ marginTop: 6 }}>
                      Uygun gün sayısı: {eligibleDaysCount}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>Paket özeti</div>
                <ul className="muted" style={{ marginTop: 6 }}>
                  {planSummary.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800 }}>Opsiyonel ayarlar</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="muted">Taslak not (ops.)</label>
                <input value={draftNote} onChange={(e) => setDraftNote(e.target.value)} placeholder="örn. sabah giriş" disabled={busy} />
              </div>
              <div>
                <label className="muted">Taslak tutar (₺) (ops.)</label>
                <input value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} placeholder="örn. 25000" disabled={busy} />
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(0)} disabled={busy}>Geri</button>
            <button type="button" onClick={createDraftShifts} disabled={busy || eligibleDaysCount === 0}>Taslak shift oluştur</button>
          </div>
        </div>
      ) : null}

      {/* Step-2: People + stops */}
      {step === 2 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div className="muted">3. adım: {who} ekle/import → durak üret → önizleme.</div>
          {!draftShiftIds.length ? (
            <div className="card err">Önce taslak shift oluşturmalısın.</div>
          ) : (
            <div className="card">
              <div className="muted">Taslak shift’ler: {draftShiftIds.map((x) => `#${x}`).join(", ")}</div>
              <div className="muted" style={{ marginTop: 4 }}>Not: Bu adım Shift Tools UI’sinin aynısını kullanır.</div>
            </div>
          )}

          <div className="card">
            <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={(draftShifts || []).map((s) => s.id)} />
          </div>

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(1)} disabled={busy}>Geri</button>
            <button type="button" onClick={() => { refreshDraftShifts(); setStep(3); }} disabled={busy}>İleri</button>
          </div>
        </div>
      ) : null}

      {/* Step-3: Solve + offers */}
      {step === 3 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="muted">4. adım: OSRM matrisi (opsiyonel) → çöz → durakları sırala → room’lara toplu teklif gönder.</div>

          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
  <div style={{ fontWeight: 800 }}>Taslak shift’ler</div>
  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
    <button type="button" onClick={osrmReorderAll} disabled={busy || !(draftShifts || []).length}>
      Hepsini OSRM ile sırala
    </button>
  </div>
</div>
{osrmBatch?.running ? (
  <div className="muted" style={{ marginTop: 6 }}>Sıralanıyor: {osrmBatch.done}/{osrmBatch.total}</div>
) : null}

            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table className="tbl" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Durak</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(draftShifts || []).map((s) => (
                    <tr key={s.id}>
                      <td className="muted">#{s.id}</td>
                      <td className="muted">{fmtTR(s.startAt)}</td>
                      <td className="muted">{fmtTR(s.endAt)}</td>
                      <td className="muted">
                        {(() => {
                          const base = Array.isArray(s?.stops) ? s.stops.length : 0;
                          const hasHub = typeof s?.hubLat === "number" && typeof s?.hubLng === "number";
                          return base + (hasHub ? 1 : 0);
                        })()}
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
  <button type="button" onClick={() => osrmReorder(s.id)} disabled={busy}>
    OSRM ile sırala
  </button>
  {osrmResById?.[Number(s.id)]?.ok === true ? (
    <span className="muted">✅</span>
  ) : osrmResById?.[Number(s.id)]?.ok === false ? (
    <span className="muted" title={osrmResById?.[Number(s.id)]?.error || ""}>⚠️</span>
  ) : null}
</div>
                      </td>
                    </tr>
                  ))}
                  {!draftShifts?.length ? (
                    <tr><td colSpan={5} className="muted">Kayıt yok.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>Toplu teklif gönder</div>
                <div className="muted">Seçili room’lara tüm taslak shift’ler için teklif gider.</div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => onReloadRooms?.()} disabled={busy || !roomsSupported}>Room’ları yenile</button>
              </div>
            </div>

            {!roomsSupported ? (
              <div className="muted" style={{ marginTop: 8, color: "#b85" }}>
                /api/rooms endpoint bulunamadı. Önce Room directory (M22+) çalışmalı.
              </div>
            ) : null}

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="muted">Room ara</label>
                <input value={roomQ} onChange={(e) => setRoomQ(e.target.value)} placeholder="name contains" disabled={busy} />
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                  <input type="checkbox" checked={onlyHubRooms} onChange={(e) => setOnlyHubRooms(e.target.checked)} disabled={busy} />
                  Sadece hub’lı
                </label>
                <div className="muted" style={{ marginTop: 8 }}>Toplam room: {(rooms || []).length}</div>
              </div>
              <div>
                <label className="muted">Tutar (₺) (opsiyonel)</label>
                <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="örn. 25000" disabled={busy} />
                <label className="muted" style={{ marginTop: 8 }}>Not (opsiyonel)</label>
                <input value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="örn. sabah giriş" disabled={busy} />
              </div>
            </div>

            <div className="card" style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
              {(roomsFiltered || []).map((r) => (
                <label key={r.id} className="row" style={{ gap: 8, alignItems: "center", padding: "6px 0" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selRoomIds[String(r.id)])}
                    onChange={(e) => setSelRoomIds((p) => ({ ...p, [String(r.id)]: e.target.checked }))}
                    disabled={busy}
                  />
                  <div className="muted">{r.name} #{r.id}</div>
                </label>
              ))}
              {!roomsFiltered.length ? <div className="muted">Room bulunamadı.</div> : null}
            </div>

            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
              {sentOk ? (
                <button type="button" onClick={() => onAfterCreated?.()} disabled={busy}>
                  Bekleyen Talepler’e Git
                </button>
              ) : null}
              <button type="button" onClick={() => { setSelRoomIds({}); setOfferAmount(""); setOfferNote(""); }} disabled={busy}>
                Temizle
              </button>
              <button type="button" onClick={sendBulkOffers} disabled={busy || !roomsSupported}>
                Toplu Teklifleri Gönder
              </button>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(2)} disabled={busy}>Geri</button>
            <button type="button" onClick={() => { onAfterCreated?.(); onClose?.(); resetAll(); }} disabled={busy || !sentOk}>
              Bitir
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
