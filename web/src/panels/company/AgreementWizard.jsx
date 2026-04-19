import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { companyPath } from "../../utils/paths";
import { useSession } from "../../state/session";
import { ProviderScoreBadge, ProviderScoreCard } from "../../components/ProviderScoreBadge";
import {
  WEEKDAYS,
  DAY_PRESETS,
  DURATION_PRESETS,
  QUICK_DURATION_PRESETS,
  selectedFromMask,
  maskFromSelected,
  weekMaskToText,
  addDaysISO,
} from "../../utils/agreementUi";
import { isoFromTRYmdMin, ymdTR } from "../../utils/time";
import { fetchProviderScoreMap } from "../../utils/providerScores";
import { cachedGet } from "../../utils/uiDataCache";
import { linkAgreementsToOrigin } from "../../utils/agreementOriginLink";

function todayYmd() {
  return ymdTR();
}

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
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
  return isoFromTRYmdMin(ymd, min);
}

function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ✅ M27: preset paketleri (tek tık)
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
    desc: "2 agreement oluşturur (07-09 + 17-19)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
  {
    key: "WK_THREE_SHIFTS",
    title: "Hafta içi • 3 Vardiya",
    desc: "3 agreement oluşturur (07-09 + 12-14 + 17-19)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Öğlen", startMin: 12 * 60, endMin: 14 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
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
    desc: "Elle ayarla (tek agreement)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Özel", startMin: 8 * 60, endMin: 10 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
];

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
        padding: 16,
        overflow: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="card" style={{ maxWidth: 980, margin: "24px auto" }}>
        {children}
      </div>
    </div>
  );
}

function onlyDigits(raw) {
  return String(raw ?? "").replace(/\./g, "").replace(/[^\d]/g, "");
}


function pickPackFirstItem(pack, { startHHMM, endHHMM, direction, pattern }) {
  let it = (pack?.items || [])[0];
  if (pack?.key === "CUSTOM") {
    const sMin = parseHHMM(startHHMM);
    const eMin = parseHHMM(endHHMM);
    if (sMin == null || eMin == null) return null;
    it = { startMin: sMin, endMin: eMin, direction, pattern };
  }
  return it || null;
}

function buildPackPreviewItems(pack, { startHHMM, endHHMM, direction, pattern }) {
  if (pack?.key !== "CUSTOM") return pack?.items || [];
  const first = pickPackFirstItem(pack, { startHHMM, endHHMM, direction, pattern });
  return first ? [{ label: "Özel", ...first }] : [];
}

export default function AgreementWizard({
  rooms = null,
  roomsSupported = true,
  onReloadRooms = null,
  geoNeedsReview = null,
  renderTrigger = null,
  onCreated = null,
  launchPrefill = null,
  autoOpenNonce = 0,
}) {
  const { token, me } = useSession();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // rooms (optional internal load if not passed)
  const [roomsLocal, setRoomsLocal] = useState([]);
  const roomsList = rooms != null ? rooms : roomsLocal;
  const [roomScores, setRoomScores] = useState({});

  const [q, setQ] = useState("");
  const [onlyHub, setOnlyHub] = useState(true);
  const [roomId, setRoomId] = useState("");

  // pack
  const [packKey, setPackKey] = useState("WK_MORNING_EVENING");
  const pack = useMemo(() => PACKS.find((p) => p.key === packKey) || PACKS[0], [packKey]);
  const launchPrefillPackKey = useMemo(() => (launchPrefill ? guessPackKey(launchPrefill) : ""), [launchPrefill]);

  // dates
  const [startDate, setStartDate] = useState(todayYmd());
  const [durationKey, setDurationKey] = useState("2d");
  const durationDays = useMemo(() => {
    const p = DURATION_PRESETS.find((x) => x.key === durationKey) || DURATION_PRESETS.find((x) => x.key === "2d") || DURATION_PRESETS[0];
    return Number(p.days || 30);
  }, [durationKey]);
  const [endDate, setEndDate] = useState(addDaysISO(todayYmd(), 0));

  // days
  const [daysSel, setDaysSel] = useState(() => selectedFromMask(62));
  const weekMask = useMemo(() => maskFromSelected(daysSel), [daysSel]);

  // custom overrides (only used for CUSTOM pack)
  const [startHHMM, setStartHHMM] = useState("08:00");
  const [endHHMM, setEndHHMM] = useState("10:00");
  const [direction, setDirection] = useState("INBOUND");
  const [pattern, setPattern] = useState("ONE_WAY");

  // hub
  const [useRoomHub, setUseRoomHub] = useState(true);
  const [hubLat, setHubLat] = useState("");
  const [hubLng, setHubLng] = useState("");

  // offer
  const [companyOfferAmount, setCompanyOfferAmount] = useState("");
  const [companyOfferNote, setCompanyOfferNote] = useState("");

  // ✅ M30-A: Wizard sonrası tek modal içinde "Market shift + multi-room offers"
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketErr, setMarketErr] = useState("");
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketQ, setMarketQ] = useState("");
  const [marketOnlyHub, setMarketOnlyHub] = useState(true);
  const [marketRoomIds, setMarketRoomIds] = useState({});
  const [marketDate, setMarketDate] = useState(todayYmd());
  const [marketStartHHMM, setMarketStartHHMM] = useState("07:00");
  const [marketEndHHMM, setMarketEndHHMM] = useState("09:00");
  const [marketAmountCompany, setMarketAmountCompany] = useState("");
  const [marketNoteCompany, setMarketNoteCompany] = useState("");
  const [marketDirection, setMarketDirection] = useState("INBOUND");
  const [marketPattern, setMarketPattern] = useState("ONE_WAY");


function guessPackKey(prefill) {
  const direction = String(prefill?.direction || "INBOUND").toUpperCase();
  const pattern = String(prefill?.pattern || "ONE_WAY").toUpperCase();
  const start = String(prefill?.startHHMM || "");
  const end = String(prefill?.endHHMM || "");
  const weekMask = Number(prefill?.weekMask || 0);
  if (pattern !== "ONE_WAY") return "CUSTOM";
  if (weekMask === 31 && direction === "INBOUND" && start === "07:00" && end === "09:00") return "WK_MORNING";
  if (weekMask === 31 && direction === "OUTBOUND" && start === "17:00" && end === "19:00") return "WK_EVENING";
  if (weekMask === 31 && direction === "INBOUND" && start === "23:00" && end === "01:00") return "WK_NIGHT";
  return "CUSTOM";
}

  const roomById = useMemo(() => {
    const m = new Map();
    (roomsList || []).forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [roomsList]);

  const selectedRoomScore = useMemo(() => roomScores[String(roomId)] || null, [roomScores, roomId]);
  const selectedMarketRoomCount = useMemo(() => Object.values(marketRoomIds || {}).filter(Boolean).length, [marketRoomIds]);
  const packPreviewItems = useMemo(
    () => buildPackPreviewItems(pack, { startHHMM, endHHMM, direction, pattern }),
    [pack, startHHMM, endHHMM, direction, pattern]
  );
  const hasCreated = Boolean(okMsg);

  // load rooms internally if needed
  useEffect(() => {
    if (!open) return;
    if (!token) return;
    if (rooms != null) return;

    let alive = true;
    (async () => {
      try {
        const resp = await cachedGet("/api/rooms?take=200", { token, ttlMs: 20000, delayMs: 120 });
        if (!alive) return;
        setRoomsLocal(Array.isArray(resp?.items) ? resp.items : []);
      } catch {
        if (!alive) return;
        setRoomsLocal([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, token, rooms]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !roomsList?.length) {
        if (alive) setRoomScores({});
        return;
      }
      try {
        const nextScores = await fetchProviderScoreMap((roomsList || []).map((r) => r?.id), token);
        if (!alive) return;
        setRoomScores(nextScores);
      } catch {
        if (alive) setRoomScores({});
      }
    })();
    return () => { alive = false; };
  }, [token, roomsList]);

  // apply pack defaults when pack changes
  useEffect(() => {
    const preserveLaunchPrefillCustom =
      packKey === "CUSTOM" &&
      launchPrefillPackKey === "CUSTOM" &&
      Number(launchPrefill?.sourceShiftId || 0) > 0;
    if (preserveLaunchPrefillCustom) return;

    setDaysSel(selectedFromMask(pack.weekMask));
    setDurationKey("2d");
    if (isYmd(startDate)) setEndDate(addDaysISO(startDate, 0));

    const one = pack.items?.[0];
    if (one) {
      setStartHHMM(toHHMM(one.startMin));
      setEndHHMM(toHHMM(one.endMin));
      setDirection(one.direction || "INBOUND");
      setPattern(one.pattern || "ONE_WAY");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packKey, launchPrefillPackKey, launchPrefill?.sourceShiftId]);

  // duration -> endDate autofill (unless user manually edits endDate after)
  useEffect(() => {
    if (!isYmd(startDate)) return;
    setEndDate(addDaysISO(startDate, Math.max(0, durationDays - 1)));
  }, [startDate, durationDays]);

  // room selection -> hub autofill
  useEffect(() => {
    if (!useRoomHub) return;
    const rid = Number(roomId || 0);
    const r = rid ? roomById.get(rid) : null;
    if (!r) return;
    const hasHub = r?.hubLat != null && r?.hubLng != null;
    if (!hasHub) return;

    if (String(hubLat).trim() === "" && String(hubLng).trim() === "") {
      setHubLat(String(r.hubLat));
      setHubLng(String(r.hubLng));
    }
  }, [roomId, useRoomHub, roomById, hubLat, hubLng]);

  const filteredRooms = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    return (roomsList || [])
      .filter((r) => {
        if (onlyHub && !(r?.hubLat != null && r?.hubLng != null)) return false;
        if (!qq) return true;
        const hay = String(r?.name || "").toLowerCase();
        return hay.includes(qq) || String(r?.id || "").includes(qq);
      })
      .slice(0, 120);
  }, [roomsList, q, onlyHub]);


  useEffect(() => {
    if (!launchPrefill) return;

    const next = launchPrefill;
    const nextPackKey = guessPackKey(next);
    setErr("");
    setOkMsg("");
    setPackKey(nextPackKey);
    setOpen(true);

    const timer = window.setTimeout(() => {
      if (next?.roomId) {
        setOnlyHub(false);
        setQ("");
      }
      setRoomId(String(next?.roomId || ""));
      if (next?.startDate) setStartDate(String(next.startDate).slice(0, 10));
      if (next?.durationKey) setDurationKey(String(next.durationKey));
      if (next?.endDate) setEndDate(String(next.endDate).slice(0, 10));
      if (Number(next?.weekMask || 0) > 0) setDaysSel(selectedFromMask(Number(next.weekMask || 0)));
      if (next?.startHHMM) setStartHHMM(String(next.startHHMM));
      if (next?.endHHMM) setEndHHMM(String(next.endHHMM));
      if (next?.direction) setDirection(String(next.direction));
      if (next?.pattern) setPattern(String(next.pattern));

      const hasHub = next?.hubLat != null && next?.hubLng != null;
      setUseRoomHub(!hasHub);
      setHubLat(hasHub ? String(next.hubLat) : "");
      setHubLng(hasHub ? String(next.hubLng) : "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [launchPrefill, autoOpenNonce]);

  const filteredMarketRooms = useMemo(() => {
    const qq = String(marketQ || "").trim().toLowerCase();
    return (roomsList || [])
      .filter((r) => {
        if (marketOnlyHub && !(r?.hubLat != null && r?.hubLng != null)) return false;
        if (!qq) return true;
        const hay = [r?.id, r?.name].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(qq);
      })
      .slice(0, 200);
  }, [roomsList, marketQ, marketOnlyHub]);

  function toggleMarketRoom(roomId) {
    const rid = Number(roomId);
    if (!Number.isFinite(rid) || rid <= 0) return;
    setMarketRoomIds((p) => ({ ...(p || {}), [rid]: !p?.[rid] }));
  }

  function selectAllMarketFiltered() {
    const next = { ...(marketRoomIds || {}) };
    for (const r of filteredMarketRooms) next[Number(r.id)] = true;
    setMarketRoomIds(next);
  }

  function clearMarketSelected() {
    setMarketRoomIds({});
  }

  async function create() {
    setErr("");
    setOkMsg("");

    if (!token) return setErr("Token yok.");
    if (!launchPrefill?.sourceShiftId) return setErr("Doğrudan sözleşme açma kapalı. Önce vardiyada “Sözleşmeye Dönüştür” kullan.");
    if (!roomsSupported) return setErr("Odalar endpointi yok. Önce /api/rooms çalışmalı.");

    const rid = Number(roomId || 0);
    if (!rid) return setErr("Oda seçmelisin.");
    if (!isYmd(startDate) || !isYmd(endDate)) return setErr("Tarih formatı YYYY-MM-DD olmalı.");
    if (!weekMask) return setErr("Gün seçmelisin.");

    const hasHubLat = String(hubLat || "").trim() !== "";
    const hasHubLng = String(hubLng || "").trim() !== "";
    if (hasHubLat !== hasHubLng) return setErr("Hub için lat/lng birlikte girilmeli.");

    let hubLatN = null;
    let hubLngN = null;
    if (hasHubLat) {
      const a = Number(hubLat);
      const b = Number(hubLng);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return setErr("Hub lat/lng sayı olmalı.");
      hubLatN = a;
      hubLngN = b;
    }

    const amt = parseTryInput(companyOfferAmount);
    const note = trimOrNull(companyOfferNote);

    let items = pack.items || [];
    if (pack.key === "CUSTOM") {
      const sMin = parseHHMM(startHHMM);
      const eMin = parseHHMM(endHHMM);
      if (sMin == null || eMin == null) return setErr("Saat formatı HH:MM olmalı.");
      items = [{ label: "Özel", startMin: sMin, endMin: eMin, direction, pattern }];
    }

    if (items.length > 3) return setErr("Sözleşme tarafı günlük en fazla 3 slot destekler.");

    setBusy(true);
    try {
      const body = {
        roomId: rid,
        startDate,
        endDate,
        weekMask,
        items: items.map((it) => ({
          label: it.label || null,
          startMin: it.startMin,
          endMin: it.endMin,
          direction: it.direction,
          pattern: it.pattern,
        })),
        hubLat: hubLatN,
        hubLng: hubLngN,
      };
      if (launchPrefill?.sourceShiftId) body.sourceShiftId = Number(launchPrefill.sourceShiftId || 0);
      if (amt != null) body.companyOfferAmount = amt;
      if (note) body.companyOfferNote = note;

      const r = await api("/api/agreements/bundle", { token, method: "POST", body });
      const createdIds = Array.isArray(r?.createdIds)
        ? r.createdIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
        : [];

      if (!createdIds.length) {
        throw new Error("Sözleşme oluşturulamadı.");
      }

      if (launchPrefill?.sourceShiftId) {
        linkAgreementsToOrigin(createdIds, launchPrefill);
      }
      setOkMsg(`✅ Oluşturuldu: ${createdIds.length} sözleşme (${createdIds.map((x) => `#${x}`).join(", ")})`);
      onCreated?.({
        createdIds,
        createdFromShift: launchPrefill?.sourceShiftId
          ? {
              sourceShiftId: Number(launchPrefill.sourceShiftId || 0),
              sourceSummary: String(launchPrefill?.sourceSummary || ""),
            }
          : null,
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function openMarketFlow() {
    setMarketErr("");
    // Default: wizard startDate + pack first slot
    setMarketDate(startDate);

    const it = pickPackFirstItem(pack, { startHHMM, endHHMM, direction, pattern });
    if (it) {
      setMarketStartHHMM(toHHMM(it.startMin));
      setMarketEndHHMM(toHHMM(it.endMin));
      setMarketDirection(it.direction || "INBOUND");
      setMarketPattern(it.pattern || "ONE_WAY");
    }

    // Default offer: agreement offer values
    setMarketAmountCompany(onlyDigits(companyOfferAmount));
    setMarketNoteCompany(String(companyOfferNote || ""));

    // Select at least the chosen room (so user doesn't start empty)
    const rid = Number(roomId || 0);
    if (rid) setMarketRoomIds((p) => ({ ...(p || {}), [rid]: true }));

    setMarketOpen(true);
  }

  async function createMarketShiftAndSendOffers() {
    setMarketErr("");
    if (!token) return setMarketErr("Token yok.");
    if (!isYmd(marketDate)) return setMarketErr("Tarih formatı YYYY-MM-DD olmalı.");

    const pickedRooms = Object.entries(marketRoomIds || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => Number(k))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!pickedRooms.length) return setMarketErr("En az 1 room seçmelisin.");

    const sMin = parseHHMM(marketStartHHMM);
    const eMin = parseHHMM(marketEndHHMM);
    if (sMin == null || eMin == null) return setMarketErr("Saat formatı HH:MM olmalı.");

    const startAt = ymdMinToIso(marketDate, sMin);
    const endDateForShift = eMin < sMin ? addDaysISO(marketDate, 1) : marketDate;
    const endAt = ymdMinToIso(endDateForShift, eMin);

    // Hub: same as wizard hub fields (lat/lng together)
    const hasHubLat = String(hubLat || "").trim() !== "";
    const hasHubLng = String(hubLng || "").trim() !== "";
    if (hasHubLat !== hasHubLng) return setMarketErr("Hub için lat/lng birlikte girilmeli.");

    let hubLatN = null;
    let hubLngN = null;
    if (hasHubLat) {
      const a = Number(hubLat);
      const b = Number(hubLng);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return setMarketErr("Hub lat/lng sayı olmalı.");
      hubLatN = a;
      hubLngN = b;
    }

    const amt = parseTryInput(marketAmountCompany);
    const note = trimOrNull(marketNoteCompany);

    setMarketBusy(true);
    try {
      // 1) create market shift (roomId=null)
      const sh = await api("/api/shifts", {
        token,
        method: "POST",
        body: {
          startAt,
          endAt,
          hubLat: hubLatN,
          hubLng: hubLngN,
          direction: marketDirection,
          pattern: marketPattern,
        },
      });
      const sid = Number(sh?.id || sh?.shift?.id || 0);
      if (!sid) throw new Error("Shift oluşturulamadı");

      // 2) send offers to selected rooms
      const body = { roomIds: pickedRooms };
      if (amt != null) body.amountCompany = amt;
      if (note) body.noteCompany = note;
      await api(`/api/shifts/${sid}/offers`, { token, method: "POST", body });

      // UX: jump to shifts and auto-open offers list
      localStorage.setItem("company:autoOffersListShiftId", String(sid));
      setMarketOpen(false);
      setOpen(false);
      navigate(companyPath(me, "/shifts"));
    } catch (e) {
      setMarketErr(String(e?.message || e));
    } finally {
      setMarketBusy(false);
    }
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => {
          setErr("");
          setOkMsg("");
          setOpen(true);
        })
      ) : (
        <button
          type="button"
          disabled={!token}
          onClick={() => {
            setErr("");
            setOkMsg("");
            setOpen(true);
          }}
        >
          Hızlı Sözleşme
        </button>
      )}

      <Modal
        open={open}
        onClose={() => {
          if (busy) return;
          setOpen(false);
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div className="title">Hızlı Sözleşme</div>
            <div className="muted">Az tık → preset plan seç → room seç → tarih aralığı → oluştur</div>
          </div>
          <button type="button" disabled={busy} onClick={() => setOpen(false)}>
            Kapat
          </button>
        </div>

        {geoNeedsReview != null && geoNeedsReview > 0 ? (
          <div className="card" style={{ border: "1px solid #f2c" , marginTop: 10 }}>
            <div style={{ fontWeight: 800 }}>⚠ Konum kontrolü gerekli</div>
            <div className="muted">
              {geoNeedsReview} personel konumu için kontrol gerekiyor. Planlama yapmadan önce düzeltmen önerilir.
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" disabled={busy} onClick={() => navigate(companyPath(me, "/georeview"))}>Konum seçiciye git</button>
            </div>
          </div>
        ) : null}

        {err ? (
          <div className="card err" style={{ marginTop: 10 }}>
            {err}
          </div>
        ) : null}
        {okMsg ? (
          <div className="card" style={{ marginTop: 10, border: "1px solid #7c7" }}>
            <div style={{ fontWeight: 800 }}>{okMsg}</div>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={() => navigate(companyPath(me, "/agreements"))}>Sözleşmelere Git</button>
              <button type="button" disabled={busy} onClick={openMarketFlow}>Odalara Teklif Topla</button>
              <button type="button" disabled={busy} onClick={() => setOpen(false)}>Kapat</button>
            </div>
          </div>
        ) : null}

        {/* ✅ M30-A: Market teklif akışı modal */}
        <Modal
          open={marketOpen}
          onClose={() => {
            if (marketBusy) return;
            setMarketOpen(false);
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div className="title">Market Teklif Topla</div>
              <div className="muted">Tek modal: market shift aç → birden fazla room seç → teklifi gönder</div>
            </div>
            <button type="button" disabled={marketBusy} onClick={() => setMarketOpen(false)}>
              Kapat
            </button>
          </div>

          {marketErr ? <div className="card err" style={{ marginTop: 10 }}>{marketErr}</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div className="card">
              <div style={{ fontWeight: 900, marginBottom: 8 }}>1) Zaman</div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <div className="col" style={{ minWidth: 160 }}>
                  <label className="muted">Tarih</label>
                  <input value={marketDate} onChange={(e) => setMarketDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>
                <div className="col" style={{ minWidth: 140 }}>
                  <label className="muted">Başlangıç</label>
                  <input value={marketStartHHMM} onChange={(e) => setMarketStartHHMM(e.target.value)} placeholder="07:00" />
                </div>
                <div className="col" style={{ minWidth: 140 }}>
                  <label className="muted">Bitiş</label>
                  <input value={marketEndHHMM} onChange={(e) => setMarketEndHHMM(e.target.value)} placeholder="09:00" />
                </div>
              </div>

              <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  Yön
                  <select value={marketDirection} onChange={(e) => setMarketDirection(e.target.value)}>
                    <option value="INBOUND">INBOUND</option>
                    <option value="OUTBOUND">OUTBOUND</option>
                  </select>
                </label>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  Desen
                  <select value={marketPattern} onChange={(e) => setMarketPattern(e.target.value)}>
                    <option value="ONE_WAY">ONE_WAY</option>
                    <option value="LOOP">LOOP</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 12, fontWeight: 900 }}>2) Teklif</div>
              <div className="col" style={{ marginTop: 6 }}>
                <label className="muted">Şirket Tutarı (₺) (opsiyonel)</label>
                <input value={marketAmountCompany} onChange={(e) => setMarketAmountCompany(onlyDigits(e.target.value))} placeholder="örn 25000" />
              </div>
              <div className="col" style={{ marginTop: 8 }}>
                <label className="muted">Not (opsiyonel)</label>
                <input value={marketNoteCompany} onChange={(e) => setMarketNoteCompany(e.target.value)} placeholder="opsiyonel" />
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 900, marginBottom: 8 }}>3) Oda seç</div>
              <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  placeholder="Oda ara"
                  value={marketQ}
                  onChange={(e) => setMarketQ(e.target.value)}
                  style={{ minWidth: 220 }}
                />
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={marketOnlyHub} onChange={(e) => setMarketOnlyHub(e.target.checked)} />
                  Sadece hub’lı
                </label>
                <button type="button" disabled={marketBusy} onClick={selectAllMarketFiltered}>Tümünü seç</button>
                <button type="button" disabled={marketBusy} onClick={clearMarketSelected}>Temizle</button>
              </div>

              <div style={{ marginTop: 10, maxHeight: 340, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                {(filteredMarketRooms || []).map((r) => {
                  const score = roomScores[String(r.id)] || null;
                  return (
                  <label
                    key={r.id}
                    className="muted"
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: "10px 12px",
                      borderBottom: "1px solid #f2f2f2",
                      background: marketRoomIds?.[r.id] ? "rgba(18,183,106,0.05)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(marketRoomIds?.[r.id])}
                          onChange={() => toggleMarketRoom(r.id)}
                          disabled={marketBusy}
                          style={{ marginTop: 4 }}
                        />
                        <span style={{ display: "grid", gap: 4 }}>
                          <span>
                            <b>{r.name ?? `Oda #${r.id}`}</b> <span className="muted">(#{r.id})</span>
                          </span>
                          <span className="muted">{r?.hubLat != null && r?.hubLng != null ? "Hub konumu hazır" : "Hub konumu eksik"}</span>
                        </span>
                      </span>
                      <ProviderScoreBadge score={score} prominent showLabel />
                    </div>
                  </label>
                );})}
                {!filteredMarketRooms.length ? <div className="muted" style={{ padding: 10 }}>Oda bulunamadı.</div> : null}
              </div>

              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <div className="muted">
                  Seçili: {selectedMarketRoomCount}
                </div>
                <button type="button" disabled={marketBusy} onClick={createMarketShiftAndSendOffers}>
                  {marketBusy ? "..." : "Shift Aç + Teklif Gönder"}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {!hasCreated ? (
        <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>1) Oda seç</div>
            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                placeholder="Ara (name / id)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={busy}
                style={{ minWidth: 220 }}
              />
              <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={onlyHub} onChange={(e) => setOnlyHub(e.target.checked)} disabled={busy} />
                Sadece hub’lı
              </label>
              {onReloadRooms ? (
                <button type="button" disabled={busy} onClick={onReloadRooms}>Yenile</button>
              ) : null}
            </div>

            <div style={{ marginTop: 10, maxHeight: 340, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              {(filteredRooms || []).map((r) => {
                const score = roomScores[String(r.id)] || null;
                return (
                <label
                  key={r.id}
                  className="muted"
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: "10px 12px",
                    borderBottom: "1px solid #f2f2f2",
                    background: String(roomId) === String(r.id) ? "rgba(18,183,106,0.05)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input
                        type="radio"
                        name="roomPick"
                        checked={String(roomId) === String(r.id)}
                        onChange={() => setRoomId(String(r.id))}
                        disabled={busy}
                        style={{ marginTop: 4 }}
                      />
                      <span style={{ display: "grid", gap: 4 }}>
                        <span>
                          <b>{r.name ?? `Oda #${r.id}`}</b> <span className="muted">(#{r.id})</span>
                        </span>
                        <span className="muted">{r?.hubLat != null && r?.hubLng != null ? "Hub konumu hazır" : "Hub konumu eksik"}</span>
                      </span>
                    </span>
                    <ProviderScoreBadge score={score} prominent showLabel />
                  </div>
                </label>
              );})}
              {!filteredRooms.length ? <div className="muted" style={{ padding: 10 }}>Oda bulunamadı.</div> : null}
            </div>
            <ProviderScoreCard score={selectedRoomScore} />
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>2) Plan paketi seç</div>
            <div className="muted" style={{ marginBottom: 8 }}>En az işlem: sabah+akşam → 2 agreement oluşturur.</div>

            <div style={{ display: "grid", gap: 8 }}>
              {PACKS.map((p) => (
                <label key={p.key} className="muted" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    type="radio"
                    name="packPick"
                    checked={packKey === p.key}
                    onChange={() => setPackKey(p.key)}
                    disabled={busy}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <b>{p.title}</b>
                    <div className="muted" style={{ fontSize: 12 }}>{p.desc}</div>
                  </span>
                </label>
              ))}
            </div>

            <div className="card" style={{ marginTop: 10, border: "1px dashed #ddd" }}>
              <div className="muted">Paket özeti</div>
              <ul className="muted" style={{ marginTop: 6 }}>
                {packPreviewItems.map((it, idx) => (
                  <li key={idx}>
                    <b>{it.label}:</b> {toHHMM(it.startMin)} → {toHHMM(it.endMin)} • {it.direction} • {it.pattern}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>3) Tarih + günler</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="muted">
              Başlangıç
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
            </label>            <div>
              <div className="muted">Hızlı süre</div>
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
                Sözleşme kısa süreli de kullanılabilir. Seçince “Bitiş” otomatik hesaplanır.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <label className="muted">
              Bitiş (otomatik)
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} />
            </label>
            <div />
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {DAY_PRESETS.map((p) => (
                <button key={p.key} type="button" disabled={busy} onClick={() => setDaysSel(selectedFromMask(p.mask))}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              {WEEKDAYS.map((d) => (
                <label key={d.k} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={!!daysSel[d.k]}
                    onChange={(e) => setDaysSel((s) => ({ ...s, [d.k]: e.target.checked }))}
                    disabled={busy}
                  />
                  {d.label}
                </label>
              ))}
            </div>

            <div className="muted" style={{ marginTop: 6 }}>
              Günler: <b>{weekMaskToText(weekMask)}</b> • weekMask: <b>{weekMask}</b>
            </div>
          </div>
        </div>

        <details className="card" style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Opsiyonel ayarlar</summary>

          <div style={{ marginTop: 10 }}>
            <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={useRoomHub} onChange={(e) => setUseRoomHub(e.target.checked)} disabled={busy} />
              Oda hub’ını otomatik kullan
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
              <label className="muted">
                Hub Lat
                <input type="number" step="0.000001" value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
              </label>
              <label className="muted">
                Hub Lng
                <input type="number" step="0.000001" value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
              </label>
            </div>
          </div>

          {packKey === "CUSTOM" ? (
            <div className="card" style={{ marginTop: 10, border: "1px dashed #ddd" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Özel saat / yön</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="muted">
                  Başlangıç (HH:MM)
                  <input value={startHHMM} onChange={(e) => setStartHHMM(e.target.value)} disabled={busy} />
                </label>
                <label className="muted">
                  Bitiş (HH:MM)
                  <input value={endHHMM} onChange={(e) => setEndHHMM(e.target.value)} disabled={busy} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                <label className="muted">
                  Yön
                  <select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={busy}>
                    <option value="INBOUND">INBOUND</option>
                    <option value="OUTBOUND">OUTBOUND</option>
                  </select>
                </label>
                <label className="muted">
                  Desen
                  <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={busy}>
                    <option value="ONE_WAY">ONE_WAY</option>
                    <option value="LOOP">LOOP</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          <div className="card" style={{ marginTop: 10, border: "1px dashed #ddd" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Teklif (opsiyonel)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="muted">
                Şirket Tutarı (₺)
                <input value={companyOfferAmount} onChange={(e) => setCompanyOfferAmount(e.target.value)} placeholder="örn 25000" disabled={busy} />
              </label>
              <label className="muted">
                Not
                <input value={companyOfferNote} onChange={(e) => setCompanyOfferNote(e.target.value)} placeholder="opsiyonel" disabled={busy} />
              </label>
            </div>
          </div>
        </details>

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" disabled={busy || !roomsSupported} onClick={create}>
            {busy ? "Oluşturuluyor..." : `Oluştur (${pack.key === "WK_MORNING_EVENING" ? "2" : String(packPreviewItems.length || 1)})`}
          </button>
          <button type="button" disabled={busy} onClick={() => setOpen(false)}>
            İptal
          </button>
        </div>
        </>
        ) : null}
      </Modal>
    </>
  );
}
