// web/src/panels/room/ShiftsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";
import RoutePreviewModal from "../../components/RoutePreviewModal";

const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

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

// Istanbul local gösterim
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

function overlaps(aStart, aEnd, bStart, bEnd) {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false;
  return a0 < b1 && b0 < a1; // [a0,a1) with [b0,b1)
}

// api wrapper bazen JSON string message fırlatıyor; normalize edelim
function parsePossibleJson(text) {
  try {
    if (!text) return null;
    const t = String(text).trim();
    if (!t) return null;
    if (t.startsWith("{") || t.startsWith("[")) return JSON.parse(t);
  } catch {}
  return null;
}

function normalizeErr(e) {
  const msg = String(e?.message || e || "");
  const j = parsePossibleJson(msg);
  if (j && typeof j === "object") {
    // {code,message,conflictingShift} veya {error:{...}}
    if (j.code || j.message) return { code: j.code, message: j.message || msg, data: j };
    if (j.error && typeof j.error === "object") {
      return { code: j.error.code, message: j.error.message || msg, data: j.error };
    }
    if (j.error && typeof j.error === "string") {
      const jj = parsePossibleJson(j.error);
      if (jj && typeof jj === "object") return { code: jj.code, message: jj.message || msg, data: jj };
      return { code: null, message: j.error, data: j };
    }
  }
  return { code: null, message: msg, data: null };
}

export default function RoomShiftsPanel() {
  const { token } = useSession();

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Bekleyen filtreleri
  const [pendingStatus, setPendingStatus] = useState("OPEN"); // OPEN | REQUESTED | DRAFT
  const [pendingQ, setPendingQ] = useState("");
  const [onlyAgreement, setOnlyAgreement] = useState(false);

  // Tüm shifts filtreleri
  const [listStatus, setListStatus] = useState("OPEN"); // OPEN | ALL | REQUESTED | APPROVED | ACTIVE | DONE | REJECTED | DRAFT
  const [listQ, setListQ] = useState("");

  // Tüm shifts: tablo detaylarını satır altında aç/kapat
  const [listExpanded, setListExpanded] = useState({}); // { [shiftId]: bool }

  // Bekleyen satır: seçili araç + seçili driver (approve için)
  const [assignSel, setAssignSel] = useState({}); // { [shiftId]: vehicleIdStr }
  const [driverSel, setDriverSel] = useState({}); // { [shiftId]: driverIdStr }
  const [showAvailableOnly, setShowAvailableOnly] = useState({}); // { [shiftId]: bool }

  // Room karşı teklif UI
  const [roomOfferOpen, setRoomOfferOpen] = useState({}); // { [shiftId]: bool }
  const [roomOfferSel, setRoomOfferSel] = useState({}); // { [shiftId]: { roomOfferVehicleId, roomOfferAmount, roomOfferNote, notifyDriver, driverNote } }

  // M14: uygunluk/çatışma state (shift bazlı)
  // shape: { [sid]: { sig, status, code, message, conflictingShift, source } }
  // status: idle | checking | ok | conflict | error | missing
  const [avail, setAvail] = useState({});
  const availInflight = useRef(new Set());

  // M16: Haritada Önizleme (modal)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewShift, setPreviewShift] = useState(null);
  const [previewStops, setPreviewStops] = useState([]);
  const [previewPeople, setPreviewPeople] = useState([]); // şimdilik boş (backend gelince assignment/personel eklenebilir)
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState("");

  function toggleAvailable(shiftId) {
    setShowAvailableOnly((p) => ({ ...p, [Number(shiftId)]: !p[Number(shiftId)] }));
  }

  function toggleRoomOffer(shiftId) {
    setRoomOfferOpen((p) => ({ ...p, [Number(shiftId)]: !p[Number(shiftId)] }));
  }

  function setRoomOfferForShift(shiftId, patch) {
    setRoomOfferSel((prev) => ({
      ...prev,
      [Number(shiftId)]: { ...(prev[Number(shiftId)] || {}), ...patch },
    }));
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
        conflictingShift: conflictingShift || null,
      };
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
        conflictingShift: conflictingShift || null,
      };
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
    }).toString();

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
          source: "remote",
        };
      }
      // başka payload: {code,message,...}
      if (r.code && (String(r.code).includes("CONFLICT") || String(r.code).includes("OVERLAP"))) {
        return {
          status: "conflict",
          code: r.code,
          message: r.message || "Çakışma.",
          conflictingShift: r.conflictingShift || null,
          source: "remote",
        };
      }
      if (r.code || r.message) {
        return {
          status: "error",
          code: r.code || "REMOTE_ERROR",
          message: r.message || "Availability hata.",
          source: "remote",
        };
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
        [sid]: { sig, status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." },
      }));
      return;
    }

    // inflight tekilleştirme
    const inflightKey = `${sid}|${sig}`;
    if (availInflight.current.has(inflightKey)) return;
    availInflight.current.add(inflightKey);

    setAvail((p) => ({
      ...p,
      [sid]: { sig, status: "checking", code: "CHECKING", message: "Kontrol ediliyor..." },
    }));

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
          source: out.source || "local",
        },
      }));
    } finally {
      availInflight.current.delete(inflightKey);
    }
  }

  function mapStopsResponse(resp) {
    const list = Array.isArray(resp) ? resp : resp?.items ?? resp?.stops ?? [];
    return (list || [])
      .filter((s) => typeof s?.lat === "number" && typeof s?.lng === "number")
      .map((s, i) => ({
        id: String(s.id ?? `stop_${i}`),
        title: String(s.title || s.name || `Durak ${i + 1}`),
        lat: s.lat,
        lng: s.lng,
        count: s.assignmentCount ?? s.count ?? null,
        memberIds: [],
      }));
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
      const [sh, veh, drv, rm] = await Promise.all([
        api("/api/shifts?take=200", { token }),
        api("/api/vehicles", { token }),
        api("/api/drivers", { token }).catch(() => ({ items: [] })), // bazı ortamlarda yoksa kırma
        api("/api/rooms", { token }).catch(() => ({ items: [] })), // ROOM yetkisi var ama yoksa kırma
      ]);

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
      const dlist = Array.isArray(drv) ? drv : drv?.items ?? [];
      const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];

      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

      setItems(list);
      setVehicles(vlist);
      setDrivers(dlist);
      setRooms(rlist);

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
            driverNote: s.roomOfferDriverNote ?? "",
          };
          changed = true;
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
  }, []);

  useAutoReload("shifts", load);
  useAutoReload("vehicles", load);
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

  const listBase = useMemo(() => items.filter((s) => true), [items]);

  const listFiltered = useMemo(() => {
    let arr = [...listBase];

    if (listStatus === "OPEN") {
      arr = arr.filter((s) => !["DONE", "REJECTED"].includes(String(s.status)));
    } else if (listStatus !== "ALL") {
      arr = arr.filter((s) => String(s.status) === listStatus);
    }

    if (onlyAgreement) arr = arr.filter((s) => Number(s.agreementId) > 0);
    arr = arr.filter((s) => matchShift(s, listQ));
    return arr;
  }, [listBase, listStatus, listQ, onlyAgreement]);

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

  function renderCompanyOfferSummary(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;
    const cAmt = s.companyOfferAmount != null ? Number(s.companyOfferAmount) : null;

    const has = Boolean(ovId || cAmt != null || s.companyOfferNote);
    if (!has) return <span className="muted">-</span>;

    return (
      <div className="muted" title={s.companyOfferNote || ""}>
        <div>
          <b>C→R Araç:</b>{" "}
          {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}
        </div>
        {cAmt != null ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>C→R Tutar:</b> {formatTRY(cAmt)} ₺
          </div>
        ) : null}
        {s.companyOfferNote ? (
          <div className="muted" style={{ marginTop: 4 }}>
            {s.companyOfferNote}
          </div>
        ) : null}
      </div>
    );
  }

  function renderRoomOfferSummary(s) {
    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;
    const rAmt = s.roomOfferAmount != null ? Number(s.roomOfferAmount) : null;

    const has = Boolean(
      rvId ||
        rAmt != null ||
        s.roomOfferNote ||
        s.roomOfferToDriver ||
        s.roomOfferDriverNote ||
        s.roomOfferDecision ||
        s.roomOfferDecisionNote
    );
    if (!has) return <span className="muted">-</span>;

    const decision = String(s.roomOfferDecision || "PENDING");
    const decisionAtText = s.roomOfferDecisionAt ? fmtTR(s.roomOfferDecisionAt) : "";

    return (
      <div className="muted">
        <div>
          <b>R→C Araç:</b>{" "}
          {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}
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
          {decision !== "PENDING" && decisionAtText ? (
            <span className="muted"> • {decisionAtText}</span>
          ) : null}
        </div>

        {s.roomOfferDecisionNote ? (
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Karar Notu:</b> {s.roomOfferDecisionNote}
          </div>
        ) : null}
      </div>
    );
  }

  function renderAvailLine(shift, vehicleId, driverId, autoDriverName) {
    const sid = Number(shift.id);
    const a = avail[sid] || null;

    const missing = !vehicleId || !driverId;
    const conflict = a?.status === "conflict";
    const ok = a?.status === "ok";
    const checking = a?.status === "checking";

    const code = a?.code || (missing ? "SELECT_REQUIRED" : null);
    const msg = a?.message || (missing ? "Araç ve driver seç." : "");

    // conflict details
    const cs = a?.conflictingShift || null;
    const csId = cs?.id ? Number(cs.id) : null;
    const csRoom = cs?.roomId ? roomsById.get(Number(cs.roomId)) : null;
    const csCompanyName = cs?.company?.name || (cs?.companyId ? `#${cs.companyId}` : null);
    const csRoomName = csRoom ? roomLabel(csRoom) : (cs?.roomId ? `Room #${cs.roomId}` : null);

    return (
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            <b>Uygunluk:</b>{" "}
            {checking ? (
              <span className="pill" data-status="PENDING">CHECK</span>
            ) : ok ? (
              <span className="pill" data-status="OK">OK</span>
            ) : conflict ? (
              <span className="pill" data-status="REJECTED">{String(code || "CONFLICT")}</span>
            ) : missing ? (
              <span className="pill" data-status="PENDING">SEÇİM</span>
            ) : (
              <span className="pill" data-status="REJECTED">ERROR</span>
            )}
          </span>

          <span className="muted">
            (Araç driver: {autoDriverName})
          </span>

          {msg ? <span className="muted">• {msg}</span> : null}
        </div>

        {conflict && csId ? (
          <div className="card" style={{ padding: 10 }}>
            <div className="muted">
              <b>Çakışan vardiya:</b> #{csId}{" "}
              {cs?.status ? <span className="pill" data-status={cs.status} style={{ marginLeft: 6 }}>{cs.status}</span> : null}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {csCompanyName ? <span><b>Company:</b> {csCompanyName}</span> : null}
              {csRoomName ? <span>{" "}• <b>Room:</b> {csRoomName}</span> : null}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              <b>Zaman:</b> {fmtTR(cs.startAt)} → {fmtTR(cs.endAt)}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  async function approveShift(shift) {
    const sid = Number(shift.id);

    const selV = assignSel[sid] || "";
    const vehicleId = selV ? Number(selV) : null;

    const selD = driverSel[sid] || "";
    const manualDriverId = selD ? Number(selD) : null;

    if (!vehicleId) {
      setErr("Approve için araç seçmelisin.");
      return;
    }

    const v = vehiclesById.get(vehicleId);

    // Öncelik: kullanıcı seçimi → yoksa aracın bağlı driverId'si
    const driverId = manualDriverId ?? (v?.driverId ? Number(v.driverId) : null);

    if (!driverId) {
      setErr("Approve için driver seçmelisin (veya araçta driver bağlı olmalı).");
      return;
    }

    // UI gate: eğer local/remote conflict görüyorsak approve’e izin verme
    const a = avail[sid];
    if (a?.status === "conflict") {
      setErr(a?.message || "Çakışma var. Uygun olmayan driver/araç.");
      return;
    }

    // son bir kez kontrol (seçim yeni ise)
    await checkAvailabilityForShift(shift, vehicleId, driverId);
    const a2 = avail[sid];
    if (a2?.status === "conflict") {
      setErr(a2?.message || "Çakışma var. Uygun olmayan driver/araç.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/approve`, {
        method: "PUT",
        token,
        body: { vehicleId, driverId },
      });

      invalidate("shifts");
      await load();
    } catch (e) {
      const ne = normalizeErr(e);
      // conflict payload gelirse availability panelini de güncelle
      if (ne?.data?.conflictingShift || ne?.data?.code) {
        setAvail((p) => ({
          ...p,
          [sid]: {
            sig: makeSig({ shift, vehicleId, driverId }),
            status: "conflict",
            code: ne.data.code || ne.code || "CONFLICT",
            message: ne.data.message || ne.message || "Çakışma.",
            conflictingShift: ne.data.conflictingShift || null,
            source: "approve",
          },
        }));
      }
      setErr(ne.message);
    } finally {
      setBusy(false);
    }
  }

  async function rejectShift(shift) {
    const sid = Number(shift.id);
    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/reject`, { method: "PUT", token, body: {} });
      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendRoomOffer(shift) {
    const sid = Number(shift.id);
    const form = roomOfferSel[sid] || {};

    const toIntOrNull = (v) => {
      if (v == null) return null;
      if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
      const s = String(v).trim();
      if (!s) return null;
      const digits = s.replace(/[^\d]/g, "");
      if (!digits) return null;
      const n = Number(digits);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const roomOfferVehicleId = toIntOrNull(form.roomOfferVehicleId);
    const roomOfferAmount = toIntOrNull(parseTryInput(form.roomOfferAmount));
    const roomOfferNote = trimOrNull(form.roomOfferNote);

    const notifyDriver = Boolean(form.notifyDriver);
    const driverNote = trimOrNull(form.driverNote);

    if (notifyDriver && !roomOfferVehicleId) {
      setErr("Driver’a ilet seçtiysen teklif aracı seçmelisin.");
      return;
    }

    const hasAny =
      roomOfferVehicleId != null ||
      roomOfferAmount != null ||
      roomOfferNote != null ||
      notifyDriver === true ||
      (notifyDriver && driverNote != null);

    if (!hasAny) {
      setErr("Gönderilecek bir teklif alanı yok. (Araç / tutar / not seç)");
      return;
    }

    const payload = {
      roomOfferVehicleId: roomOfferVehicleId ?? null,
      roomOfferAmount: roomOfferAmount ?? null,
      roomOfferNote: roomOfferNote ?? null,
      notifyDriver: notifyDriver ? true : false,
      driverNote: notifyDriver ? driverNote ?? null : null,
    };

    setBusy(true);
    setErr("");
    try {
      const res = await api(`/api/shifts/${sid}/room-offer`, {
        method: "PUT",
        token,
        body: payload,
      });

      if (res && typeof res === "object" && res.error) {
        throw new Error(res.error);
      }
      if (!res || !res.id) {
        throw new Error("room-offer başarısız: boş response");
      }

      const mismatch =
        (payload.roomOfferNote != null && (res.roomOfferNote ?? null) !== payload.roomOfferNote) ||
        (payload.roomOfferAmount != null && Number(res.roomOfferAmount ?? NaN) !== Number(payload.roomOfferAmount)) ||
        (payload.roomOfferVehicleId != null && Number(res.roomOfferVehicleId ?? NaN) !== Number(payload.roomOfferVehicleId));

      if (mismatch) {
        throw new Error("Backend teklifi kaydetmedi (response mismatch). Network response’u kontrol et.");
      }

      setRoomOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearRoomOffer(shift) {
    const sid = Number(shift.id);
    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/room-offer`, {
        method: "PUT",
        token,
        body: {
          roomOfferVehicleId: null,
          roomOfferAmount: null,
          roomOfferNote: null,
          notifyDriver: false,
          driverNote: null,
        },
      });

      setRoomOfferSel((p) => ({
        ...p,
        [sid]: { roomOfferVehicleId: "", roomOfferAmount: "", roomOfferNote: "", notifyDriver: false, driverNote: "" },
      }));
      setRoomOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (ROOM)</h3>
        <div className="muted">Company request → Room approve (vehicle+driver) + opsiyonel pazarlık</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {/* BEKLEYEN TALEPLER */}
      <div className="card">
        <h3>Bekleyen Talepler</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}>
            <option value="OPEN">Açık (DRAFT + REQUESTED)</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="DRAFT">DRAFT</option>
          </select>

          <input
            value={pendingQ}
            onChange={(e) => setPendingQ(e.target.value)}
            placeholder="Ara (id / company / plate / driver / not)"
            style={{ minWidth: 280 }}
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
              setPendingQ("");
              setOnlyAgreement(false);
            }}
          >
            Temizle
          </button>
        </div>

        {pendingFiltered.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Start</th>
                <th>End</th>
                <th>Harita</th>
                <th>Teklif / Pazarlık</th>
                <th>Vehicle + Driver</th>
                <th>Approve</th>
                <th>Reddet</th>
              </tr>
            </thead>
            <tbody>
              {pendingFiltered.map((s) => {
                const sid = Number(s.id);
                const roomVehicles = vehiclesForRoom(s.roomId);
                const selectedVehicleId = assignSel[sid] || "";
                const vId = selectedVehicleId ? Number(selectedVehicleId) : null;
                const selectedVehicle = vId ? vehiclesById.get(vId) : null;

                const onlyAvail = Boolean(showAvailableOnly[sid]);
                const availVehicles = roomVehicles.filter((v) => isVehicleAvailableForShift(v.id, s));
                const dropdownVehicles = onlyAvail ? availVehicles : roomVehicles;

                const availCount = availVehicles.length;

                const autoDriverId = selectedVehicle?.driverId ? Number(selectedVehicle.driverId) : null;
                const autoDriverName =
                  autoDriverId && driversById.get(autoDriverId)
                    ? driversById.get(autoDriverId).fullName
                    : autoDriverId
                    ? `#${autoDriverId}`
                    : "-";

                const selD = driverSel[sid] ?? "";
                const manualDriverId = selD ? Number(selD) : null;
                const effDriverId = manualDriverId ?? autoDriverId ?? null;

                const a = avail[sid];
                const approveDisabled =
                  busy ||
                  !vId ||
                  !effDriverId ||
                  a?.status === "checking" ||
                  a?.status === "conflict" ||
                  a?.status === "error";

                const offerIsOpen = Boolean(roomOfferOpen[sid]);
                const offerForm = roomOfferSel[sid] || {};
                const offerVehList = roomVehicles;

                return (
                  <tr key={s.id}>
                    <td>
                    {s.id}
                    <AgreementBadge agreementId={s.agreementId} />
                  </td>
                    <td className="muted">{s.company?.name || `#${s.companyId}`}</td>
                    <td className="muted" title={String(s.startAt)}>{fmtTR(s.startAt)}</td>
                    <td className="muted" title={String(s.endAt)}>{fmtTR(s.endAt)}</td>

                    <td>
                      <div style={{ display: "grid", gap: 6 }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openRoutePreview(s)}
                          title="Rota/Durakları haritada önizle"
                        >
                          Haritada Önizle
                        </button>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Önizleme: API <code>/api/shifts/{sid}/route-preview</code>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div>{renderCompanyOfferSummary(s)}</div>

                        <button type="button" disabled={busy} onClick={() => toggleRoomOffer(sid)}>
                          {offerIsOpen ? "Room Teklifi Kapat" : "Room Teklifi (opsiyonel) Aç"}
                        </button>

                        {offerIsOpen ? (
                          <div className="card" style={{ marginTop: 6 }}>
                            <div className="muted" style={{ marginBottom: 6 }}>
                              Room → Company karşı teklif (R→C)
                            </div>

                            <div style={{ display: "grid", gap: 8 }}>
                              <label className="muted">
                                <div style={{ marginBottom: 4 }}>
                                  <b>Teklif Araç (opsiyonel)</b>
                                </div>
                                <select
                                  value={offerForm.roomOfferVehicleId || ""}
                                  onChange={(e) => setRoomOfferForShift(sid, { roomOfferVehicleId: e.target.value })}
                                  disabled={busy}
                                >
                                  <option value="">— teklif yok —</option>
                                  {offerVehList.map((v) => (
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
                                  value={offerForm.roomOfferAmount ?? ""}
                                  onChange={(e) => setRoomOfferForShift(sid, { roomOfferAmount: e.target.value })}
                                  placeholder="örn. 25000"
                                  disabled={busy}
                                />
                              </label>

                              <label className="muted">
                                <div style={{ marginBottom: 4 }}>
                                  <b>Teklif Notu (opsiyonel)</b>
                                </div>
                                <input
                                  value={offerForm.roomOfferNote ?? ""}
                                  onChange={(e) => setRoomOfferForShift(sid, { roomOfferNote: e.target.value })}
                                  placeholder="örn. Şu şartla…"
                                  disabled={busy}
                                />
                              </label>

                              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(offerForm.notifyDriver)}
                                  onChange={(e) => setRoomOfferForShift(sid, { notifyDriver: e.target.checked })}
                                  disabled={busy}
                                />
                                <span>
                                  <b>Driver’a ilet (opsiyonel)</b>
                                </span>
                              </label>

                              {offerForm.notifyDriver ? (
                                <label className="muted">
                                  <div style={{ marginBottom: 4 }}>
                                    <b>Driver Notu (opsiyonel)</b>
                                  </div>
                                  <input
                                    value={offerForm.driverNote ?? ""}
                                    onChange={(e) => setRoomOfferForShift(sid, { driverNote: e.target.value })}
                                    placeholder="örn. Şu duraktan başla…"
                                    disabled={busy}
                                  />
                                </label>
                              ) : null}

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button type="button" disabled={busy} onClick={() => sendRoomOffer(s)}>
                                  {busy ? "..." : "Gönder"}
                                </button>
                                <button type="button" disabled={busy} onClick={() => clearRoomOffer(s)}>
                                  Teklifi Kaldır
                                </button>
                              </div>

                              <div style={{ marginTop: 6 }}>{renderRoomOfferSummary(s)}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "grid", gap: 6 }}>
                        <select
                          value={selectedVehicleId}
                          onChange={async (e) => {
                            const val = e.target.value;
                            setAssignSel((p) => ({ ...p, [sid]: val }));

                            // araç değişince (driver seçilmemişse) araçtaki driver'ı otomatik seç
                            const hadManual = Boolean(driverSel[sid]);
                            if (!hadManual) {
                              const vid = val ? Number(val) : null;
                              const vv = vid ? vehiclesById.get(vid) : null;
                              if (vv?.driverId) {
                                setDriverSel((p) => ({ ...p, [sid]: String(vv.driverId) }));
                              }
                            }
                          }}
                          disabled={busy}
                        >
                          <option value="">— araç seç —</option>
                          {dropdownVehicles.map((v) => (
                            <option key={v.id} value={String(v.id)}>
                              {v.plate} • {vehicleMetaLine(v)} (#{v.id})
                            </option>
                          ))}
                        </select>

                        <div className="row" style={{ marginTop: 6, alignItems: "center" }}>
                          <label className="muted" style={{ minWidth: 80 }}>Driver</label>
                          <select
                            value={driverSel[sid] ?? ""}
                            onChange={(e) => setDriverSel((p) => ({ ...p, [sid]: e.target.value }))}
                            disabled={busy}
                          >
                            <option value="">Seç (opsiyonel)</option>
                            {drivers
                              .filter((d) => !d?.roomId || Number(d.roomId) === Number(s.roomId))
                              .map((d) => (
                                <option key={d.id} value={String(d.id)}>
                                  {d.fullName ||
                                    d.name ||
                                    `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() ||
                                    `#${d.id}`}
                                </option>
                              ))}
                          </select>
                        </div>

                        <button type="button" disabled={busy} onClick={() => toggleAvailable(sid)}>
                          {onlyAvail ? `Tüm Araçları Göster (${roomVehicles.length})` : `Müsait Araçları Göster (${availCount})`}
                        </button>

                        {renderAvailLine(s, vId, effDriverId, autoDriverName)}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        disabled={approveDisabled}
                        onClick={() => approveShift(s)}
                        title={
                          !vId ? "Araç seç" :
                          !effDriverId ? "Driver seç (veya araç driver bağlı olsun)" :
                          a?.status === "checking" ? "Kontrol ediliyor" :
                          a?.status === "conflict" ? "Çakışma var" :
                          a?.status === "error" ? "Uygunluk hatası" :
                          ""
                        }
                      >
                        {busy ? "..." : "Approve"}
                      </button>
                    </td>

                    <td>
                      <button type="button" disabled={busy} onClick={() => rejectShift(s)}>
                        {busy ? "..." : "Reddet"}
                      </button>
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

      {/* TÜM SHIFTS */}
      <div className="card">
        <h3>Tüm Shifts</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <select value={listStatus} onChange={(e) => setListStatus(e.target.value)}>
            <option value="OPEN">Açık</option>
            <option value="ALL">Hepsi</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DONE">DONE</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <input
            value={listQ}
            onChange={(e) => setListQ(e.target.value)}
            placeholder="Ara (id / company / plate / driver / not)"
            style={{ minWidth: 320 }}
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
              setListQ("");
              setListStatus("OPEN");
              setOnlyAgreement(false);
            }}
          >
            Temizle
          </button>
        </div>

        {listFiltered.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 44 }}></th>
                <th>ID</th>
                <th>Status</th>
                <th>Company</th>
                <th>Zaman</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {listFiltered.map((s) => {
                const sid = Number(s.id);
                const isOpen = Boolean(listExpanded[sid]);
                const vehicleLine = s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-");
                const driverLine = s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-");

                return [
                  (
                    <tr key={`s_${sid}`}>
                      <td>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => setListExpanded((p) => ({ ...p, [sid]: !p[sid] }))}
                          title={isOpen ? "Detayı kapat" : "Detayı aç"}
                        >
                          {isOpen ? "−" : "+"}
                        </button>
                      </td>

                      <td>
                        {s.id}
                        <AgreementBadge agreementId={s.agreementId} />
                      </td>

                      <td>
                        <span className="pill" data-status={s.status}>
                          {s.status}
                        </span>
                      </td>

                      <td className="muted">{s.company?.name || `#${s.companyId}`}</td>

                      <td className="muted">
                        <div>{fmtTR(s.startAt)}</div>
                        <div className="muted">→ {fmtTR(s.endAt)}</div>
                      </td>

                      <td className="muted">{vehicleLine}</td>
                      <td className="muted">{driverLine}</td>

                      <td>
                        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <button type="button" className="btn sm" onClick={() => openRoutePreview(s)}>
                            Önizle
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setListExpanded((p) => ({ ...p, [sid]: true }))}
                          >
                            Detay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                  isOpen ? (
                    <tr key={`d_${sid}`}>
                      <td colSpan={8}>
                        <div className="card" style={{ margin: 0 }}>
                          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                            <div className="col">
                              <div style={{ fontWeight: 800 }}>Teklifler</div>

                              <div style={{ marginTop: 10 }}>
                                <b>C→R</b>
                                <div style={{ marginTop: 6 }}>{renderCompanyOfferSummary(s)}</div>
                              </div>

                              <div style={{ marginTop: 12 }}>
                                <b>R→C</b>
                                <div style={{ marginTop: 6 }}>{renderRoomOfferSummary(s)}</div>
                              </div>
                            </div>

                            <div className="col">
                              <div style={{ fontWeight: 800 }}>Özet</div>

                              <div className="muted" style={{ display: "grid", gap: 6, marginTop: 10 }}>
                                <div>
                                  <b>Start:</b> {fmtTR(s.startAt)}
                                </div>
                                <div>
                                  <b>End:</b> {fmtTR(s.endAt)}
                                </div>
                                <div>
                                  <b>Vehicle:</b> {vehicleLine}
                                </div>
                                <div>
                                  <b>Driver:</b> {driverLine}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                <button type="button" className="btn" onClick={() => openRoutePreview(s)}>
                                  Haritada Önizle
                                </button>
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => setListExpanded((p) => ({ ...p, [sid]: false }))}
                                >
                                  Kapat
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted">Kayıt yok.</div>
        )}
      </div>

      {/* Preview error/info (modal dışında küçük banner) */}
      {previewOpen && previewErr ? (
        <div className="card err" style={{ marginTop: 10 }}>
          Harita Önizleme: {previewErr}
        </div>
      ) : null}

      <RoutePreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewShift(null);
          setPreviewStops([]);
          setPreviewPeople([]);
          setPreviewErr("");
          setPreviewLoading(false);
        }}
        title={
          previewShift
            ? `Shift #${previewShift.id} — Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
            : `Harita Önizleme${previewLoading ? " (yükleniyor...)" : ""}`
        }
        shiftId={previewShift?.id}
        stops={previewStops}
        people={previewPeople}
      />
    </div>
  );
}
