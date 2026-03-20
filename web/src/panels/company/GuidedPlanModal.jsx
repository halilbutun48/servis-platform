import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../api";
import { useSession } from "../../state/session";
import ShiftPeopleTab from "./ShiftPeopleTab";
import { personLabel } from "../../utils/labels";
import { buildGoogleNavUrl } from "../../utils/navigation";
import { ProviderScoreBadge } from "../../components/ProviderScoreBadge";
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
import { formatDateTimeTR, isoFromTRYmdMin, ymdTR } from "../../utils/time";

function todayYmd() {
  return ymdTR();
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

function fmtTR(iso) {
  if (!iso) return "-";
  return formatDateTimeTR(iso);
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
      <div
        className="card"
        style={{
          width: "min(1680px, calc(100vw - 12px))",
          maxWidth: "min(1680px, calc(100vw - 12px))",
          height: "min(95vh, 1080px)",
          maxHeight: "min(95vh, 1080px)",
          margin: "6px auto",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
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


function packTitleForMode(pack, organization) {
  if (!organization) return pack?.title || "";
  const map = {
    WK_MORNING: "Sabah toplama turu",
    WK_EVENING: "Akşam dönüş turu",
    WK_MORNING_EVENING: "Gidiş + dönüş",
    WK_MORNING_AFTERNOON: "Sabah + öğleden sonra turu",
    WK_NIGHT: "Gece turu",
    CUSTOM: "Özel plan",
  };
  return map[pack?.key] || pack?.title || "";
}

function packDescForMode(pack, organization) {
  if (!organization) return pack?.desc || "";
  const map = {
    WK_MORNING: "Sabah tek tur. Toplanma noktasından çıkıp ziyaret akışını başlatır.",
    WK_EVENING: "Akşam tek tur. Dönüş ya da kapanış akışı için uygundur.",
    WK_MORNING_EVENING: "Aynı gün gidiş + dönüş için 2 taslak oluşturur.",
    WK_MORNING_AFTERNOON: "Sabah çıkış, öğleden sonra devam / dönüş için 2 taslak oluşturur.",
    WK_NIGHT: "Gece başlayan tur veya etkinlik çıkışı için uygundur.",
    CUSTOM: "Saatleri ve tur tipini elle düzenle.",
  };
  return map[pack?.key] || pack?.desc || "";
}

function directionLabel(direction, organization) {
  if (!organization) return direction || "-";
  return String(direction || "").toUpperCase() === "OUTBOUND" ? "Dağıtım / dönüş" : "Toplama / gidiş";
}

function patternLabel(pattern, organization) {
  if (!organization) return pattern || "-";
  return String(pattern || "").toUpperCase() === "LOOP" ? "Başlangıç noktasına dön" : "Son noktada bitir";
}

function emptyDestination() {
  return { title: "", address: "", lat: "", lng: "", status: "idle", foundText: "" };
}

function coordNum(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function hasCoord(lat, lng) {
  return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9);
}

function fmtCoord(v) {
  const n = coordNum(v);
  return n == null ? "" : String(n);
}

function MapPickEvents({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng?.lat, e.latlng?.lng);
    },
  });
  return null;
}

function stepTitle(step, who, organization) {
  if (organization) {
    if (step === 0) return "1) Toplanma noktası";
    if (step === 1) return "2) Plan paketi";
    if (step === 2) return "3) Kişi sayısı + yerler";
    if (step === 3) return "4) Ön izleme + teklif";
    return "";
  }
  if (step === 0) return "1) Şirket konumu";
  if (step === 1) return "2) Plan paketi";
  if (step === 2) return `3) ${who} + Durak`;
  if (step === 3) return "4) Ön izleme + teklif";
  return "";
}


const GUIDED_TEMP_STORAGE_KEY = "psv1:guidedTempShiftIds:v1";

function readGuidedTempShiftIds() {
  try {
    const raw = localStorage.getItem(GUIDED_TEMP_STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function writeGuidedTempShiftIds(ids) {
  try {
    const clean = Array.isArray(ids) ? ids.map((x) => Number(x)).filter(Number.isFinite) : [];
    if (!clean.length) {
      localStorage.removeItem(GUIDED_TEMP_STORAGE_KEY);
      return;
    }
    localStorage.setItem(GUIDED_TEMP_STORAGE_KEY, JSON.stringify(Array.from(new Set(clean))));
  } catch {
    // ignore local draft tracking errors
  }
}

function clearPlanTermsForShiftIds(ids) {
  try {
    (Array.isArray(ids) ? ids : [])
      .map((x) => Number(x))
      .filter(Number.isFinite)
      .forEach((sid) => localStorage.removeItem(`psv1:planTerms:shift:${sid}:v1`));
  } catch {
    // ignore local cleanup errors
  }
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
  const organization = me?.companyKind === "ORGANIZATION";

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
  const [durationKey, setDurationKey] = useState("1d");
  const durationOptions = useMemo(() => [{ key: "1d", label: "1 gün", days: 1 }, ...QUICK_DURATION_PRESETS], []);
  const durationDays = useMemo(() => {
    const p = durationOptions.find((x) => x.key === durationKey) || durationOptions[0] || { days: 1 };
    return Number(p.days || 1);
  }, [durationKey, durationOptions]);
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
  const [orgEstimatedPax, setOrgEstimatedPax] = useState("");
  const [orgGatheringName, setOrgGatheringName] = useState("");
  const [orgReturnType, setOrgReturnType] = useState("RETURN_TO_START");
  const [orgDestinations, setOrgDestinations] = useState([emptyDestination()]);
  const [mapPickIdx, setMapPickIdx] = useState(null);
  const [mapPickPoint, setMapPickPoint] = useState(null);

  const [draftShiftIds, setDraftShiftIds] = useState([]);
  const [draftShifts, setDraftShifts] = useState([]);
  const [osrmBatch, setOsrmBatch] = useState({ running: false, done: 0, total: 0 });
  const [osrmResById, setOsrmResById] = useState({});

  // Step-3: offers
  const [roomQ, setRoomQ] = useState("");
  const [onlyHubRooms, setOnlyHubRooms] = useState(false);
  const [selRoomIds, setSelRoomIds] = useState({});
  const [roomScores, setRoomScores] = useState({});
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [sentOk, setSentOk] = useState(false);
  const [companyGeoGate, setCompanyGeoGate] = useState({ blocking: false, ready: true, geoStats: { ok: 0, review: 0, failed: 0, total: 0 }, stopSummary: null });

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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !Array.isArray(rooms) || !rooms.length) {
        if (alive) setRoomScores({});
        return;
      }
      try {
        const pairs = await Promise.all(
          rooms.map(async (r) => {
            try {
              const score = await api(`/api/trust-quality/provider-score/${r.id}`, { token });
              return [String(r.id), score];
            } catch {
              return [String(r.id), null];
            }
          })
        );
        if (!alive) return;
        setRoomScores(Object.fromEntries(pairs));
      } catch {
        if (alive) setRoomScores({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, rooms]);

  const selectedRoomIds = useMemo(
    () =>
      Object.keys(selRoomIds)
        .filter((k) => selRoomIds[k])
        .map((k) => Number(k))
        .filter(Number.isFinite),
    [selRoomIds]
  );

  const selectedRoomCount = selectedRoomIds.length;

  const orgFilledDestinations = useMemo(
    () => (orgDestinations || []).filter((d) => String(d?.title || d?.address || "").trim()),
    [orgDestinations]
  );

  const orgDestinationAudit = useMemo(() => {
    const items = (orgDestinations || [])
      .map((d, idx) => {
        const label = String(d?.title || d?.address || "").trim();
        const lat = coordNum(d?.lat);
        const lng = coordNum(d?.lng);
        return {
          idx,
          label: label || `Yer ${idx + 1}`,
          lat,
          lng,
          hasCoord: hasCoord(lat, lng),
        };
      })
      .filter((x) => Boolean(x.label));
    return {
      total: items.length,
      ready: items.filter((x) => x.hasCoord).length,
      missing: items.filter((x) => !x.hasCoord),
      ok: items.length > 0 && items.every((x) => x.hasCoord),
    };
  }, [orgDestinations]);

  const orgDraftCompletion = useMemo(() => {
    if (!organization) return { ready: true, reasons: [], badShiftIds: [], expectedStops: 0 };
    const reasons = [];
    const expectedStops = orgDestinationAudit.total;
    if (!expectedStops) reasons.push("En az 1 gidilecek yer ekle.");
    if (!orgDestinationAudit.ok) {
      reasons.push(`Koordinatı eksik yerler: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}`);
    }
    const badShiftIds = (draftShifts || [])
      .filter((s) => {
        const validStops = (Array.isArray(s?.stops) ? s.stops : []).filter((st) => hasCoord(coordNum(st?.lat), coordNum(st?.lng)));
        return validStops.length < expectedStops;
      })
      .map((s) => Number(s.id))
      .filter(Number.isFinite);
    if (draftShiftIds.length && badShiftIds.length) {
      reasons.push(`Eksik duraklı taslak shift: ${badShiftIds.map((id) => `#${id}`).join(", ")}`);
    }
    return {
      ready: reasons.length === 0 && draftShiftIds.length > 0,
      reasons,
      badShiftIds,
      expectedStops,
    };
  }, [organization, orgDestinationAudit, draftShifts, draftShiftIds]);

  function setDestinationField(idx, field, value) {
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]: value,
              ...((field === "title" || field === "address") ? { status: "idle", foundText: "", lat: "", lng: "" } : {}),
            }
          : item
      )
    );
  }

  function setDestinationCoordField(idx, field, value) {
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, [field]: value };
        const lat = coordNum(field === "lat" ? value : next.lat);
        const lng = coordNum(field === "lng" ? value : next.lng);
        if (hasCoord(lat, lng)) {
          return {
            ...next,
            lat: fmtCoord(lat),
            lng: fmtCoord(lng),
            status: "manual",
            foundText: "Koordinat hazır",
          };
        }
        if (String(item?.status || "") === "manual") {
          return { ...next, status: "idle", foundText: "" };
        }
        return next;
      })
    );
  }

  function openDestinationMapPicker(idx) {
    const item = (orgDestinations || [])[idx] || {};
    const lat = coordNum(item?.lat);
    const lng = coordNum(item?.lng);
    const hubLatNum = coordNum(hubLat);
    const hubLngNum = coordNum(hubLng);
    const base = hasCoord(lat, lng)
      ? [lat, lng]
      : hasCoord(hubLatNum, hubLngNum)
      ? [hubLatNum, hubLngNum]
      : [41.0082, 28.9784];
    setMapPickIdx(idx);
    setMapPickPoint(base);
  }

  function applyDestinationMapPoint() {
    if (mapPickIdx == null || !Array.isArray(mapPickPoint)) return;
    const [lat, lng] = mapPickPoint;
    setOrgDestinations((prev) =>
      (prev || []).map((item, i) =>
        i === mapPickIdx
          ? {
              ...item,
              lat: fmtCoord(lat),
              lng: fmtCoord(lng),
              status: "manual",
              foundText: "Haritadan seçildi",
            }
          : item
      )
    );
    setMapPickIdx(null);
    setMapPickPoint(null);
  }

  function openDestinationNavigation(dest) {
    const lat = coordNum(dest?.lat);
    const lng = coordNum(dest?.lng);
    if (!hasCoord(lat, lng)) {
      setErr("Navigasyon için yer koordinatı gerekli.");
      return;
    }
    const hLat = coordNum(hubLat);
    const hLng = coordNum(hubLng);
    const url = buildGoogleNavUrl({
      origin: hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null,
      destination: { lat, lng },
    });
    if (!url) {
      setErr("Navigasyon linki oluşturulamadı.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openShiftNavigation(shift) {
    const stops = (Array.isArray(shift?.stops) ? shift.stops : [])
      .map((s) => ({ lat: coordNum(s?.lat), lng: coordNum(s?.lng) }))
      .filter((x) => hasCoord(x.lat, x.lng));
    if (!stops.length) {
      setErr("Navigasyon için en az 1 durak gerekli.");
      return;
    }
    const hLat = coordNum(shift?.hubLat);
    const hLng = coordNum(shift?.hubLng);
    let origin = hasCoord(hLat, hLng) ? { lat: hLat, lng: hLng } : null;
    let destination = null;
    let waypoints = [];
    const loop = String(shift?.pattern || "").toUpperCase() === "LOOP";
    if (loop && origin) {
      destination = origin;
      waypoints = stops;
    } else if (origin) {
      destination = stops[stops.length - 1] || null;
      waypoints = stops.slice(0, -1);
    } else {
      if (stops.length < 2) {
        setErr("Navigasyon için hub veya en az 2 durak gerekli.");
        return;
      }
      origin = stops[0];
      destination = stops[stops.length - 1];
      waypoints = stops.slice(1, -1);
    }
    const url = buildGoogleNavUrl({ origin, destination, waypoints });
    if (!url) {
      setErr("Navigasyon linki oluşturulamadı.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function addDestination() {
    setOrgDestinations((prev) => [...(prev || []), emptyDestination()]);
  }

  function removeDestination(idx) {
    setOrgDestinations((prev) => {
      const next = (prev || []).filter((_, i) => i !== idx);
      return next.length ? next : [emptyDestination()];
    });
  }

  function moveDestination(idx, dir) {
    setOrgDestinations((prev) => {
      const next = [...(prev || [])];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return next;
      const tmp = next[idx];
      next[idx] = next[to];
      next[to] = tmp;
      return next;
    });
  }

  async function geocodeDestination(idx) {
    setErr("");
    setInfo("");
    if (!token) return;
    const item = (orgDestinations || [])[idx];
    const q = String(item?.address || item?.title || "").trim();
    if (q.length < 3) {
      setErr("Yer için en az 3 karakterlik ad veya adres gir.");
      return;
    }
    setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "loading", foundText: "" } : x)));
    try {
      const r = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
      if (r?.ok) {
        setOrgDestinations((prev) =>
          (prev || []).map((x, i) =>
            i === idx
              ? {
                  ...x,
                  lat: String(r.lat),
                  lng: String(r.lng),
                  status: "ok",
                  foundText: String(r.displayName || q),
                  title: String(x.title || "").trim() || String(r.displayName || q).split(",")[0],
                }
              : x
          )
        );
      } else {
        setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: "Bulunamadı" } : x)));
      }
    } catch (e) {
      setOrgDestinations((prev) => (prev || []).map((x, i) => (i === idx ? { ...x, status: "error", foundText: String(e?.message || e || "Bulunamadı") } : x)));
    }
  }

  function orgNoteSummary() {
    const pax = String(orgEstimatedPax || "").trim();
    const gathering = String(orgGatheringName || "").trim();
    const places = orgFilledDestinations.map((d) => String(d.title || d.address || "").trim()).filter(Boolean);
    const returnText = orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir";
    const parts = [];
    if (gathering) parts.push(`Toplanma: ${gathering}`);
    if (pax) parts.push(`Tahmini kişi: ${pax}`);
    if (places.length) parts.push(`Yerler: ${places.join(" → ")}`);
    parts.push(`Dönüş: ${returnText}`);
    return `[Gezi planı] ${parts.join(" | ")}`;
  }


  async function cleanupDraftShifts(idsInput = draftShiftIds, opts = {}) {
    const ids = Array.from(new Set((Array.isArray(idsInput) ? idsInput : []).map((x) => Number(x)).filter(Number.isFinite)));
    if (!ids.length) {
      writeGuidedTempShiftIds([]);
      if (!opts.keepState) {
        setDraftShiftIds([]);
        setDraftShifts([]);
        setOsrmResById({});
      }
      return;
    }

    if (token) {
      for (const sid of ids) {
        try {
          await api(`/api/shifts/${sid}/guided-temp`, { token, method: "DELETE" });
        } catch {
          // ignore cleanup errors; temp cleanup is best-effort
        }
      }
    }

    clearPlanTermsForShiftIds(ids);
    writeGuidedTempShiftIds([]);

    if (!opts.keepState) {
      setDraftShiftIds([]);
      setDraftShifts([]);
      setOsrmResById({});
    }
  }

  function resetAll(opts = {}) {
    if (!opts.skipCleanup && !sentOk && draftShiftIds.length) {
      void cleanupDraftShifts(draftShiftIds, { keepState: true });
    }
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
    setDurationKey("1d");
    setEndDate(addDaysISO(todayYmd(), 0));
    setDaysSel(selectedFromMask(62));
    setCustomSlots([{ label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" }]);
    setDraftNote("");
    setDraftAmount("");
    setOrgEstimatedPax("");
    setOrgGatheringName("");
    setOrgReturnType("RETURN_TO_START");
    setOrgDestinations([emptyDestination()]);
    setMapPickIdx(null);
    setMapPickPoint(null);
    setDraftShiftIds([]);
    setDraftShifts([]);
    setOsrmBatch({ running: false, done: 0, total: 0 });
    setOsrmResById({});
    setCompanyGeoGate({ blocking: false, ready: true, geoStats: { ok: 0, review: 0, failed: 0, total: 0 }, stopSummary: null });
    setRoomQ("");
    setOnlyHubRooms(false);
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
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");

    let alive = true;
    (async () => {
      const lingeringIds = readGuidedTempShiftIds();
      if (lingeringIds.length) {
        await cleanupDraftShifts(lingeringIds, { keepState: true });
      }
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


  useEffect(() => {
    if (!open) return;
    if (step !== 3) return;
    setSelRoomIds({});
    setOfferAmount("");
    setOfferNote("");
    setSentOk(false);
  }, [open, step, draftShiftIds.join("|")]);

  useEffect(() => {
    const keys = new Set((durationOptions || []).map((x) => x.key));
    if (!keys.has(durationKey)) setDurationKey((durationOptions[0] || {}).key || "1d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

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
      setInfo(organization ? "✅ Toplanma noktası kaydedildi." : "✅ Şirket konumu kaydedildi.");
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
        setInfo(organization ? "✅ Toplanma noktası konumu alındı. Kaydetmek için 'İleri'ye bas." : "✅ Konum alındı. Kaydetmek için 'İleri'ye bas.");
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
    if (organization) {
      if (!String(orgEstimatedPax || "").trim()) {
        setErr("Tahmini kişi sayısını gir.");
        return;
      }
      if (!orgFilledDestinations.length) {
        setErr("En az 1 gidilecek yer ekle.");
        return;
      }
      if (!orgDestinationAudit.ok) {
        setErr(`Koordinatı eksik yerler var: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}. Adresten bul, manuel lat/lng gir veya haritadan seç.`);
        return;
      }
    }

    setBusy(true);
    try {
      if (draftShiftIds.length) {
        await cleanupDraftShifts(draftShiftIds);
      }
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
          const noteParts = [];
          if (draftNote) noteParts.push(String(draftNote).trim());
          if (organization) noteParts.push(orgNoteSummary());
          const body = {
            status: "DRAFT",
            // M34/M35: market shift -> roomId OMIT (roomId optional; null trips zod)
            startAt,
            endAt,
            hubLat: lat,
            hubLng: lng,
            direction: it.direction,
            pattern: organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern,
          };
          const amt = parseTryInput(draftAmount);
          if (amt != null) body.companyOfferAmount = amt;
          if (noteParts.length) body.companyOfferNote = noteParts.filter(Boolean).join("\n");
          if (organization) {
            const pax = Number(orgEstimatedPax || 0);
            if (Number.isFinite(pax) && pax > 0) body.requiredPax = pax;
            const stopDrafts = [];
            for (let idx = 0; idx < orgFilledDestinations.length; idx++) {
              const dest = orgFilledDestinations[idx];
              let stopName = String(dest?.title || dest?.address || `Yer ${idx + 1}`).trim();
              let stopLat = dest?.lat === "" ? null : Number(dest?.lat);
              let stopLng = dest?.lng === "" ? null : Number(dest?.lng);
              if (!(Number.isFinite(stopLat) && Number.isFinite(stopLng))) {
                const q = String(dest?.address || dest?.title || "").trim();
                if (q.length >= 3) {
                  try {
                    const geo = await api("/api/geocode", { token, method: "POST", body: { q, country: "tr" } });
                    if (geo?.ok) {
                      stopLat = Number(geo.lat);
                      stopLng = Number(geo.lng);
                      stopName = stopName || String(geo.displayName || q).split(",")[0];
                    }
                  } catch {
                    // ignore individual destination geocode errors; continue with others
                  }
                }
              }
              if (Number.isFinite(stopLat) && Number.isFinite(stopLng)) {
                stopDrafts.push({
                  name: stopName || `Yer ${idx + 1}`,
                  lat: stopLat,
                  lng: stopLng,
                  order: stopDrafts.length + 1,
                  type: "MANUAL",
                });
              }
            }
            if (stopDrafts.length) body.stops = stopDrafts;
          }

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
                  pattern: organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern,
                  hubLat: lat,
                  hubLng: lng,
                  organization: organization ? {
                    gatheringName: orgGatheringName,
                    estimatedPax: Number(orgEstimatedPax || 0) || null,
                    returnType: orgReturnType,
                    places: orgFilledDestinations.map((d) => ({ title: d.title, address: d.address })),
                  } : null,
                })
              );
            } catch {
              // ignore
            }
          }
        }
      }

      setDraftShiftIds(createdIds);
      writeGuidedTempShiftIds(createdIds);
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
      returnToDepot: String(s?.pattern || "").toUpperCase() === "LOOP",
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

    const roomIds = selectedRoomIds;
    if (!roomIds.length) {
      setErr("En az 1 room seç.");
      return;
    }
    if (organization && !orgDraftCompletion.ready) {
      setErr(`Markete göndermek için plan tamamlanmalı: ${orgDraftCompletion.reasons.join(" • ")}`);
      return;
    }
    if (!organization && companyGeoGate.blocking) {
      setErr(`Markete göndermek için tüm kişi kayıtları koordinatlı olmalı. Review: ${Number(companyGeoGate?.geoStats?.review || 0)} • Failed: ${Number(companyGeoGate?.geoStats?.failed || 0)}`);
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
      writeGuidedTempShiftIds([]);
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
    const lines = items.map((it) => {
      const p = organization ? (orgReturnType === "RETURN_TO_START" ? "LOOP" : "ONE_WAY") : it.pattern;
      return `${it.label || ""}: ${toHHMM(it.startMin)} – ${toHHMM(it.endMin)}${organization ? ` • ${patternLabel(p, organization)}` : ` • ${directionLabel(it.direction, organization)} • ${patternLabel(p, organization)}`}`;
    });
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packKey, customSlots, organization, orgReturnType]);

  return (
    <>
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
          <div className="muted" style={{ marginTop: 4 }}>{stepTitle(step, who, organization)}</div>
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
          <div className="muted">{organization ? "1. adımda gezi için toplanma noktasını ayarla. Bu nokta turun başlangıç merkezi olur." : "1. adımda Company kendi lokasyonunu (hub) ayarlar."}</div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={useGeolocation} disabled={busy}>Konumumu al</button>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder={organization ? "Toplanma noktası adresi (örn. Denizli Forum önü)" : "Adresten konum al (örn. Ankara Çankaya ...)"}
              style={{ flex: 1, minWidth: 260 }}
              disabled={busy}
            />
            <button type="button" onClick={geocodeAddress} disabled={busy}>Adresten bul</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="muted">{organization ? "Toplanma lat" : "Hub lat"}</label>
              <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} disabled={busy} />
            </div>
            <div>
              <label className="muted">{organization ? "Toplanma lng" : "Hub lng"}</label>
              <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} disabled={busy} />
            </div>
          </div>

          {!hubLoaded ? <div className="muted">Hub okunuyor...</div> : null}

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" onClick={saveHub} disabled={busy}>{organization ? "Toplanma noktasını kaydet" : "İleri"}</button>
          </div>
        </div>
      ) : null}

      {/* Step-1: Plan */}
      {step === 1 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="muted">{organization ? "2. adımda gezi akışını seçersin. Bu adım sadece taslak plan oluşturur; teklif henüz gönderilmez." : "2. adımda plan paketi seçilir. Bu adım sadece taslak oluşturur; teklif göndermez."}</div>

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
                      <div style={{ fontWeight: 700 }}>{packTitleForMode(p, organization)}</div>
                      <div className="muted">{packDescForMode(p, organization)}</div>
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
                            <option value="INBOUND">{organization ? "Toplama / gidiş" : "INBOUND"}</option>
                            <option value="OUTBOUND">{organization ? "Dağıtım / dönüş" : "OUTBOUND"}</option>
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
                            <option value="ONE_WAY">{organization ? "Son noktada bitir" : "ONE_WAY"}</option>
                            <option value="LOOP">{organization ? "Başlangıç noktasına dön" : "LOOP"}</option>
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
                    {durationOptions.map((d) => (
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
                    Varsayılan olarak aynı gün başlar; süre seçince bitiş otomatik hesaplanır.
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
                  <div className="muted" style={{ marginTop: 6 }}>{organization ? `Seçilen günler: ${weekMaskToText(weekMask)}` : `Günler: ${weekMaskToText(weekMask)} • weekMask:${weekMask}`}</div>

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
                <div style={{ fontWeight: 700 }}>{organization ? "Plan özeti" : "Paket özeti"}</div>
                <ul className="muted" style={{ marginTop: 6 }}>
                  {planSummary.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {organization ? (
            <div className="card">
              <div style={{ fontWeight: 800 }}>Organizasyon detayları</div>
              <div className="muted" style={{ marginTop: 4 }}>
                Gezi planını burada kurarsın. Tahmini kişi sayısı, toplanma noktası, gidilecek yerler ve dönüş tipi aynı yerde kalır.
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="muted">Tahmini kişi sayısı</label>
                  <input
                    value={orgEstimatedPax}
                    onChange={(e) => setOrgEstimatedPax(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="örn. 48"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="muted">Toplanma noktası adı</label>
                  <input
                    value={orgGatheringName}
                    onChange={(e) => setOrgGatheringName(e.target.value)}
                    placeholder="örn. Denizli Forum önü"
                    disabled={busy}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>Gidilecek yerler</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Her yer ayrı satır olsun. Böylece tek tek düzeltmek, bulmak ve sırayı değiştirmek kolay olur.
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Hazır konum: <b>{orgDestinationAudit.ready}</b> / {orgDestinationAudit.total || 0}
                  {orgDestinationAudit.missing.length ? ` • Eksik konum: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}` : ""}
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {(orgDestinations || []).map((dest, idx) => (
                    <div key={idx} className="card" style={{ padding: 10, border: "1px solid #223" }}>
                      <div className="row" style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>Yer {idx + 1}</div>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <button type="button" className="btn sm" onClick={() => moveDestination(idx, -1)} disabled={busy || idx === 0}>Yukarı</button>
                          <button type="button" className="btn sm" onClick={() => moveDestination(idx, 1)} disabled={busy || idx === (orgDestinations || []).length - 1}>Aşağı</button>
                          <button type="button" className="btn sm" onClick={() => removeDestination(idx)} disabled={busy}>Sil</button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label className="muted">Yer adı</label>
                          <input
                            value={dest?.title || ""}
                            onChange={(e) => setDestinationField(idx, "title", e.target.value)}
                            placeholder="örn. Pamukkale"
                            disabled={busy}
                          />
                        </div>
                        <div>
                          <label className="muted">Adres / açıklama</label>
                          <input
                            value={dest?.address || ""}
                            onChange={(e) => setDestinationField(idx, "address", e.target.value)}
                            placeholder="örn. Pamukkale Travertenleri giriş"
                            disabled={busy}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label className="muted">Lat (manuel / fallback)</label>
                          <input
                            value={dest?.lat || ""}
                            onChange={(e) => setDestinationCoordField(idx, "lat", e.target.value)}
                            placeholder="örn. 37.7765"
                            disabled={busy}
                          />
                        </div>
                        <div>
                          <label className="muted">Lng (manuel / fallback)</label>
                          <input
                            value={dest?.lng || ""}
                            onChange={(e) => setDestinationCoordField(idx, "lng", e.target.value)}
                            placeholder="örn. 29.0864"
                            disabled={busy}
                          />
                        </div>
                      </div>

                      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                        <button type="button" className="btn sm" onClick={() => geocodeDestination(idx)} disabled={busy}>Bul</button>
                        <button type="button" className="btn sm" onClick={() => openDestinationMapPicker(idx)} disabled={busy}>Haritadan seç</button>
                        {hasCoord(coordNum(dest?.lat), coordNum(dest?.lng)) ? (
                          <button type="button" className="btn sm" onClick={() => openDestinationNavigation(dest)} disabled={busy}>Navigasyonda aç</button>
                        ) : null}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {dest?.status === "ok"
                            ? `✅ ${dest?.foundText || "Bulundu"}`
                            : dest?.status === "manual"
                            ? `📍 ${dest?.foundText || "Koordinat hazır"}`
                            : dest?.status === "error"
                            ? `⚠ ${dest?.foundText || "Bulunamadı"}`
                            : dest?.status === "loading"
                            ? "Bulunuyor..."
                            : "Henüz aranmadı"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                  <button type="button" className="btn" onClick={addDestination} disabled={busy}>+ Yer ekle</button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="muted">Dönüş tipi</label>
                <select value={orgReturnType} onChange={(e) => setOrgReturnType(e.target.value)} disabled={busy}>
                  <option value="RETURN_TO_START">Başlangıç noktasına dön</option>
                  <option value="END_AT_LAST_STOP">Son noktada bitir</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(0)} disabled={busy}>Geri</button>
            <button type="button" onClick={createDraftShifts} disabled={busy || eligibleDaysCount === 0}>Taslak shift oluştur</button>
          </div>
        </div>
      ) : null}

      {/* Step-2: People + stops */}
      {step === 2 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div className="muted">{organization ? "3. adım: Yerleri ve kişi sayısını son kez kontrol et. Kişi/import bölümü Organization için opsiyoneldir." : `3. adım: ${who} ekle/import → durak üret → önizleme.`}</div>
          {!draftShiftIds.length ? (
            <div className="card err">Önce taslak shift oluşturmalısın.</div>
          ) : (
            <div className="card">
              <div className="muted">Taslak shift’ler: {draftShiftIds.map((x) => `#${x}`).join(", ")}</div>
              <div className="muted" style={{ marginTop: 4 }}>Not: Bu adım Shift Tools UI’sinin aynısını kullanır.</div>
            </div>
          )}

          {organization ? (
            <>
              <div className="card">
                <div style={{ fontWeight: 800 }}>Plan özeti</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Toplanma: <b>{orgGatheringName || "-"}</b> • Tahmini kişi: <b>{orgEstimatedPax || "-"}</b> • Dönüş: <b>{orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir"}</b>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Yerler: {orgFilledDestinations.length ? orgFilledDestinations.map((d) => d.title || d.address).join(" → ") : "Henüz yer girilmedi"}
                </div>
              </div>
              <details className="card">
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Opsiyonel kişi / import alanı</summary>
                <div className="muted" style={{ marginTop: 6 }}>
                  Organization için bu bölüm zorunlu değil. Sadece kişi listesi de taşımak istersen kullan.
                </div>
                <div style={{ marginTop: 10 }}>
                  <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={(draftShifts || []).map((s) => s.id)} />
                </div>
              </details>
            </>
          ) : (
            <div className="card">
              <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={(draftShifts || []).map((s) => s.id)} guidedMode hideGeoReviewLinks onSummaryChange={setCompanyGeoGate} />
            </div>
          )}

          {!organization && companyGeoGate.blocking ? (
            <div className="card" style={{ border: "1px solid #b85" }}>
              <div style={{ fontWeight: 800 }}>⚠ Guided Mode kilidi</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Review veya eksik koordinatlı kişi varken sonraki adıma geçilmez ve markete gönderim açılmaz.
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Review: <b>{Number(companyGeoGate?.geoStats?.review || 0)}</b> • Failed: <b>{Number(companyGeoGate?.geoStats?.failed || 0)}</b>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Düzeltmeyi bu ekranda yap. Guided Mode içinden dış Geo Review ekranına çıkış kapalı tutulur.
              </div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep(1)} disabled={busy}>Geri</button>
            <button type="button" onClick={() => { refreshDraftShifts(); setStep(3); }} disabled={busy || (!organization && companyGeoGate.blocking)}>İleri</button>
          </div>
        </div>
      ) : null}

      {/* Step-3: Solve + offers */}
      {step === 3 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div className="muted">{organization ? "4. adım: Ön izle, rota sırasını iyileştir ve plan tamamsa uygun room'lara teklif gönder. Eksik koordinat varsa markete düşmez." : "4. adım: Ön izleme al → rota sırasını iyileştir → uygun room'lara teklif gönder."}</div>

          {organization ? (
            <div className="card" style={{ border: orgDraftCompletion.ready ? "1px solid #2a7" : "1px solid #b85" }}>
              <div style={{ fontWeight: 800 }}>{orgDraftCompletion.ready ? "✅ Markete gönderime hazır" : "⚠ Plan henüz tam değil"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {orgDraftCompletion.ready
                  ? `Tahmini kişi: ${Number(orgEstimatedPax || 0) || 0} • Tüm yerler koordinatlı • Taslak shift'lerde ${orgDraftCompletion.expectedStops} ziyaret noktası hazır.`
                  : orgDraftCompletion.reasons.join(" • ")}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Not: Organization işlerinde plan tam oluşmadan markete düşmez.
              </div>
            </div>
          ) : null}

          {!organization ? (
            <div className="card" style={{ border: companyGeoGate.blocking ? "1px solid #b85" : "1px solid #2a7" }}>
              <div style={{ fontWeight: 800 }}>{companyGeoGate.blocking ? "⚠ Company planı henüz tam değil" : "✅ Company planı markete hazır"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {companyGeoGate.blocking
                  ? `Review: ${Number(companyGeoGate?.geoStats?.review || 0)} • Failed: ${Number(companyGeoGate?.geoStats?.failed || 0)}. Eksik koordinatlı kişi varken taslak shift REQUESTED'a çevrilmez.`
                  : `Kişi kayıtları koordinatlı. Review: ${Number(companyGeoGate?.geoStats?.review || 0)} • Failed: ${Number(companyGeoGate?.geoStats?.failed || 0)}`}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Not: Guided Mode içinde dış Geo Review ekranına çıkış kapalıdır; düzeltmeyi Step-3'e geçmeden önce aynı ekranda yap.
              </div>
            </div>
          ) : null}

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
  <button type="button" onClick={() => openShiftNavigation(s)} disabled={busy}>
    Navigasyon
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

            {!sentOk ? (
            <>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="muted">Room ara</label>
                <input value={roomQ} onChange={(e) => setRoomQ(e.target.value)} placeholder="name contains" disabled={busy} />
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                  <input type="checkbox" checked={onlyHubRooms} onChange={(e) => setOnlyHubRooms(e.target.checked)} disabled={busy} />
                  Sadece hub’lı
                </label>
                <div className="muted" style={{ marginTop: 8 }}>Toplam room: {(rooms || []).length} • Seçili: {selectedRoomCount}</div>
              </div>
              <div>
                <label className="muted">Tutar (₺) (opsiyonel)</label>
                <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="örn. 25000" disabled={busy} />
                <label className="muted" style={{ marginTop: 8 }}>Not (opsiyonel)</label>
                <input value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="örn. sabah giriş" disabled={busy} />
              </div>
            </div>

            <div className="card" style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
              {(roomsFiltered || []).map((r) => {
                const score = roomScores[String(r.id)] || null;
                return (
                  <label
                    key={r.id}
                    className="row"
                    style={{
                      gap: 8,
                      alignItems: "stretch",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: selRoomIds[String(r.id)] ? "rgba(18,183,106,0.05)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(selRoomIds[String(r.id)])}
                        onChange={(e) => setSelRoomIds((p) => ({ ...p, [String(r.id)]: e.target.checked }))}
                        disabled={busy}
                        style={{ marginTop: 4 }}
                      />
                      <span style={{ display: "grid", gap: 4 }}>
                        <span className="muted"><b>{r.name}</b> #{r.id}</span>
                        <span className="muted">{r?.hubLat != null && r?.hubLng != null ? "Hub konumu hazır" : "Hub konumu eksik"}</span>
                      </span>
                    </span>
                    <ProviderScoreBadge score={score} prominent showLabel />
                  </label>
                );
              })}
              {!roomsFiltered.length ? <div className="muted">Room bulunamadı.</div> : null}
            </div>

            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => {
                const next = {};
                for (const room of roomsFiltered || []) next[String(room.id)] = true;
                setSelRoomIds(next);
              }} disabled={busy || !roomsFiltered.length}>
                Hepsini Seç
              </button>
              <button type="button" onClick={() => { setSelRoomIds({}); setOfferAmount(""); setOfferNote(""); }} disabled={busy}>
                Temizle
              </button>
              <button type="button" onClick={sendBulkOffers} disabled={busy || !roomsSupported || selectedRoomCount < 1 || (organization && !orgDraftCompletion.ready) || (!organization && companyGeoGate.blocking)}>
                Toplu Teklifleri Gönder
              </button>
            </div>
            </>
            ) : (
              <div className="muted" style={{ marginTop: 10 }}>Teklifler gönderildi. Bu adım tamamlandı; devam etmek için Bitir'e bas.</div>
            )}
          </div>

          <div className="row" style={{ justifyContent: sentOk ? "flex-end" : "space-between", gap: 10, flexWrap: "wrap" }}>
            {!sentOk ? (
              <button type="button" onClick={() => setStep(2)} disabled={busy}>Geri</button>
            ) : null}
            <button type="button" onClick={() => { onAfterCreated?.(); onClose?.(); resetAll(); }} disabled={busy || !sentOk}>
              Bitir
            </button>
          </div>
        </div>
      ) : null}
    </Modal>

    <Modal
      open={mapPickIdx != null}
      onClose={() => {
        setMapPickIdx(null);
        setMapPickPoint(null);
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Haritadan nokta seç</div>
        <div className="muted">Haritada bir noktaya tıkla. Seçilen koordinat ilgili yer kartına yazılır.</div>
        <div style={{ height: 360, width: "100%", border: "1px solid #223", borderRadius: 12, overflow: "hidden" }}>
          {Array.isArray(mapPickPoint) ? (
            <MapContainer center={mapPickPoint} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapPickEvents onPick={(lat, lng) => setMapPickPoint([lat, lng])} />
              <CircleMarker center={mapPickPoint} radius={9} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.7 }} />
            </MapContainer>
          ) : null}
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lat</label>
            <input value={fmtCoord(mapPickPoint?.[0])} readOnly />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="muted">Lng</label>
            <input value={fmtCoord(mapPickPoint?.[1])} readOnly />
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setMapPickIdx(null);
              setMapPickPoint(null);
            }}
          >
            Vazgeç
          </button>
          <button type="button" onClick={applyDestinationMapPoint} disabled={!Array.isArray(mapPickPoint)}>
            Bu noktayı kullan
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
