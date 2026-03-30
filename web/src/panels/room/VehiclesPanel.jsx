// web/src/panels/room/VehiclesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { useAutoReload } from "../../live/useAutoReload";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { formatDateTimeTR, formatDateTR, formatTimeTR, isoFromTRDateInput, isoFromTRLocalInput, toDateInputTR, toDatetimeLocalTR } from "../../utils/time";
import { rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";

const VEHICLE_TYPES = [
  { value: "", label: "Seç (opsiyonel)" },
  { value: "MINIBUS", label: "Minibüs" },
  { value: "MIDIBUS", label: "Midibüs" },
  { value: "OTOBUS", label: "Otobüs" },
];

const VEHICLE_TEMPLATES_TR = [
  { id: "mb-travego-15shd", label: "Mercedes-Benz Travego 15 SHD", type: "OTOBUS", capacity: 46, brand: "Mercedes-Benz", model: "Travego 15 SHD" },
  { id: "mb-travego-16shd-2-1", label: "Mercedes-Benz Travego 16 SHD 2+1", type: "OTOBUS", capacity: 41, brand: "Mercedes-Benz", model: "Travego 16 SHD 2+1" },
  { id: "temsa-safir-plus", label: "Temsa Safir Plus", type: "OTOBUS", capacity: 50, brand: "Temsa", model: "Safir Plus" },
  { id: "temsa-safir-plus-vip-13m", label: "Temsa Safir Plus VIP (13 m)", type: "OTOBUS", capacity: 54, brand: "Temsa", model: "Safir Plus VIP (13 m)" },

  { id: "isuzu-novo-s-29", label: "Isuzu Novo S (29)", type: "MIDIBUS", capacity: 29, brand: "Isuzu", model: "Novo S" },
  { id: "otokar-sultan-maxi-31", label: "Otokar Sultan Maxi (31)", type: "MIDIBUS", capacity: 31, brand: "Otokar", model: "Sultan Maxi" },

  { id: "mb-sprinter-16", label: "Mercedes-Benz Sprinter (16)", type: "MINIBUS", capacity: 16, brand: "Mercedes-Benz", model: "Sprinter" },
  { id: "vw-crafter-16", label: "Volkswagen Crafter (16)", type: "MINIBUS", capacity: 16, brand: "Volkswagen", model: "Crafter" },
  { id: "ford-transit-16", label: "Ford Transit (16)", type: "MINIBUS", capacity: 16, brand: "Ford", model: "Transit" },
  { id: "renault-master-16", label: "Renault Master (16)", type: "MINIBUS", capacity: 16, brand: "Renault", model: "Master" },
];

const TABS = [
  { key: "status", label: "Durum" },
  { key: "manage", label: "Yönetim" },
  { key: "assign", label: "Atamalar" },
  { key: "avail", label: "Müsaitlik" },
  { key: "telematics", label: "Telematics" },
  { key: "link", label: "Bağlantı" },
];

function isoToDateInput(v) {
  return toDateInputTR(v);
}
function isoToDatetimeLocal(v) {
  return toDatetimeLocalTR(v);
}
function fmtDate(v) {
  return formatDateTR(v);
}
function hasGpsFix(v) {
  const lat = v?.gpsLast?.lat;
  const lng = v?.gpsLast?.lng;
  return typeof lat === "number" && typeof lng === "number";
}
function gpsAtLabel(v) {
  const at = v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.updatedAt || null;
  if (!at) return "-";
  try {
    return formatDateTimeTR(at);
  } catch {
    return String(at);
  }
}

function normalizeList(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.items)) return resp.items;
  return [];
}

// Hata mesajını tek yerden normalize et
function pickErr(e) {
  const payload = e?.payload;
  const msg =
    payload?.message ||
    payload?.error ||
    e?.message ||
    String(e);
  const status = payload?.status || payload?.httpStatus || e?.status || null;
  const code = payload?.code || e?.code || null;

  return { msg, status, code, payload };
}

// Driver label: isim + telefon (varsa)
function fmtDriverHuman(d) {
  if (!d) return "-";
  const name =
    d.fullName ||
    [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
    (d.id ? `#${d.id}` : "-");
  const phone = d.phone || d.tel || d.mobile || d.gsm || "";
  return phone ? `${name} • ${phone}` : name;
}


// Shift label helpers (Atamalar / Müsaitlik)
function fmtTR(dt) {
  if (!dt) return "-";
  try {
    return formatDateTimeTR(dt);
  } catch {
    return String(dt);
  }
}
function fmtHm(dt) {
  if (!dt) return "-";
  try {
    return formatTimeTR(dt);
  } catch {
    return String(dt);
  }
}
function shiftWindowLabel(s) {
  if (!s) return "-";
  return `${fmtHm(s.startAt)}–${fmtHm(s.endAt)}`;
}
function pickCurrentShift(shifts, now = new Date()) {
  const arr = Array.isArray(shifts) ? shifts : [];
  // prefer ACTIVE if any
  const active = arr.find((x) => x?.status === "ACTIVE" && new Date(x.endAt).getTime() > now.getTime());
  if (active) return active;
  return arr.find((x) => {
    const st = new Date(x.startAt).getTime();
    const en = new Date(x.endAt).getTime();
    return ["APPROVED", "ACTIVE"].includes(x?.status) && st <= now.getTime() && en > now.getTime();
  }) || null;
}
function pickNextShift(shifts, now = new Date()) {
  const arr = (Array.isArray(shifts) ? shifts : [])
    .filter((x) => x && new Date(x.endAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // next = first that starts after now; fallback: soonest future (including APPROVED)
  return arr.find((x) => new Date(x.startAt).getTime() > now.getTime()) || null;
}
function conflictCodeLabel(payload) {
  if (!payload) return "CONFLICT";
  return payload.code || payload.kind || payload.error || "CONFLICT";
}

// --- Mini accordion helpers (Atamalar) ---
function expKey(vehicleId, which) {
  return `${vehicleId}:${which}`; // which = "cur" | "next"
}

function toggleExp(setter, key) {
  setter((prev) => ({ ...prev, [key]: !prev[key] }));
}

function shiftOneLine(s) {
  if (!s) return "—";
  const start = new Date(s.startAt);
  const end = new Date(s.endAt);
  const hhmm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const win = `${hhmm(start)}–${hhmm(end)}`;
  const st = s.status || "";
  return `#${s.id} ${st} • ${win}`;
}

function ShiftCompact({ s, open, onToggle }) {
  if (!s) return <span className="muted">—</span>;

  const companyName = s.company?.name || (s.companyId ? `company#${s.companyId}` : "");
  const hasAgreement = Number(s.agreementId) > 0;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span><b>{shiftOneLine(s)}</b></span>
        <span className="pill" data-status={s.status === "ACTIVE" ? "BUSY" : "OK"}>{s.status}</span>
        {hasAgreement ? <span className="pill" data-status="AGREEMENT">Agreement #{s.agreementId}</span> : null}
        <button
          type="button"
          onClick={onToggle}
          style={{ padding: "2px 8px", fontSize: 12 }}
          title="Detay göster/gizle"
        >
          {open ? "Gizle" : "Detay"}
        </button>
      </div>

      {open ? (
        <div className="muted" style={{ fontSize: 12, display: "grid", gap: 4 }}>
          <div>{companyName ? `${companyName} • ` : ""}{shiftWindowLabel(s)}</div>
          <div>start: {fmtTR(s.startAt)} • end: {fmtTR(s.endAt)}</div>
          {s.roomId ? <div>roomId: {s.roomId}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

// --- Selection helpers (Müsaitlik) ---
function toggleSel(setter, id) {
  setter((prev) => ({ ...prev, [id]: !prev[id] }));
}

function setSelMany(setter, ids, val) {
  setter((prev) => {
    const next = { ...prev };
    for (const id of ids) {
      if (val) next[id] = true;
      else delete next[id];
    }
    return next;
  });
}


export default function VehiclesPanel() {
  const { token } = useSession();

  const [tab, setTab] = useState("status");

  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // toast
  const [toast, setToast] = useState(null); // { kind:"ok"|"warn"|"err", text }
  function showToast(text, kind = "ok") {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2800);
  }

  // Yönetim sekmesi: arşiv göster
  const [showArchived, setShowArchived] = useState(false);

  // Durum filtresi
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL|LIVE|STALE|OFFLINE
  const [plateQuery, setPlateQuery] = useState("");

  // CREATE template selector
  const [templateId, setTemplateId] = useState("");

  // core (CREATE)
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [speedLimitKmh, setSpeedLimitKmh] = useState(80);

  // meta (CREATE)
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [note, setNote] = useState("");

  // dates / km (CREATE)
  const [inspectionDueAt, setInspectionDueAt] = useState("");
  const [lastServiceAt, setLastServiceAt] = useState("");
  const [lastServiceKm, setLastServiceKm] = useState("");
  const [serviceIntervalKm, setServiceIntervalKm] = useState(15000);
  const [odometerKm, setOdometerKm] = useState("");

  // legacy
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState("");

  // Bind tab
  const [bindSel, setBindSel] = useState({});
  const [focusVehicleId, setFocusVehicleId] = useState(0);



// Atamalar/Müsaitlik
const [assignRangeDays, setAssignRangeDays] = useState(7);

// Atamalar filters
const [assignQuery, setAssignQuery] = useState("");
const [assignFilter, setAssignFilter] = useState("ALL"); // ALL | HAS_CURRENT | HAS_NEXT | AGREEMENT_ONLY
const [assignSort, setAssignSort] = useState("PLATE_ASC"); // PLATE_ASC | PLATE_DESC | CURRENT_SOON | NEXT_SOON

// Müsaitlik filters
const [availQuery, setAvailQuery] = useState("");
const [availFilter, setAvailFilter] = useState("ALL"); 
// ALL | ONLY_CONFLICT | ONLY_OK | ONLY_UNCHECKED | ONLY_WITH_DRIVER

// Availability (custom window)
const [availStartAt, setAvailStartAt] = useState(() => toDatetimeLocalTR(new Date())); // datetime-local (TR)
const [availEndAt, setAvailEndAt] = useState(() => {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return toDatetimeLocalTR(d);
});
const [availBusy, setAvailBusy] = useState(false);
const [availMap, setAvailMap] = useState({}); // { [vehicleId]: { vehicleOk, vehicleConflict, driverOk, driverConflict } }

// Atamalar: mini-accordion (Şu an / Sıradaki)
const [shiftExp, setShiftExp] = useState({}); // { "vehicleId:cur": true }

// Müsaitlik: selection (checkbox)
const [availSel, setAvailSel] = useState({}); // { [vehicleId]: true }
  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState("");
  const [editForm, setEditForm] = useState({
    id: 0,
    plate: "",
    capacity: 16,
    speedLimitKmh: 80,
    type: "",
    brand: "",
    model: "",
    modelYear: "",
    color: "",
    vin: "",
    note: "",
    inspectionDueAt: "",
    lastServiceAt: "",
    lastServiceKm: "",
    serviceIntervalKm: 15000,
    odometerKm: "",
    nextMaintenanceAt: "",
  });


  // Telematics
  const [deviceItems, setDeviceItems] = useState([]);
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceSaving, setDeviceSaving] = useState(false);
  const [deviceDrafts, setDeviceDrafts] = useState({});
  const [deviceForm, setDeviceForm] = useState({ vendor: "GENERIC", serial: "", label: "" });
  const [tokenReveal, setTokenReveal] = useState(null); // { kind, id, serial, token }

  function applyTemplate(tid) {
    setTemplateId(tid);
    const t = VEHICLE_TEMPLATES_TR.find((x) => x.id === tid);
    if (!t) return;
    setType(t.type);
    setCapacity(t.capacity);
    setBrand(t.brand);
    setModel(t.model);
  }

  function applyEditTemplate(tid) {
    setEditTemplateId(tid);
    const t = VEHICLE_TEMPLATES_TR.find((x) => x.id === tid);
    if (!t) return;
    setEditForm((p) => ({
      ...p,
      type: t.type,
      capacity: t.capacity,
      brand: t.brand,
      model: t.model,
    }));
  }

  async function load(opts = {}) {
    try {
      const includeArchived = opts.includeArchived ?? showArchived;
      const path = includeArchived ? "/api/vehicles?includeArchived=1" : "/api/vehicles";
      const [v, d] = await Promise.all([api(path, { token }), api("/api/drivers", { token })]);

      const vv = normalizeList(v);
      const dd = normalizeList(d);

      setItems(vv);
      setDrivers(dd);

      if (!focusVehicleId && vv.length) setFocusVehicleId(Number(vv[0].id));
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", (detail) => {
    const m = detail?.payload?.msg;
    const ev = m?._event;

    // ✅ vehicle:status spam'inde HTTP reload yapma → state patch
    if (ev === "vehicle:status") {
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid) || !st) return;

      setItems((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) => {
          if (Number(v?.id) !== vid) return v;
          return { ...v, gpsState: { ...(v?.gpsState || {}), lastUiStatus: st } };
        })
      );
      return;
    }

    // ✅ vehicle:update (ROOM action) → eğer payload'da vehicle snapshot geldiyse patch
    if (ev === "vehicle:update") {
      const action = String(m?.action || "");

      if (action === "deleted") {
        const vid = Number(m?.vehicleId);
        if (!Number.isFinite(vid)) return;
        setItems((prev) => (Array.isArray(prev) ? prev.filter((x) => Number(x?.id) !== vid) : []));
        return;
      }

      const veh = m?.vehicle || null;
      if (veh && typeof veh === "object") {
        const vid = Number(veh.id || m?.vehicleId);
        if (!Number.isFinite(vid)) return;

        setItems((prev) => {
          const arr = Array.isArray(prev) ? [...prev] : [];
          const idx = arr.findIndex((x) => Number(x?.id) === vid);

          const isArchived = Boolean(veh?.archivedAt);
          if (!showArchived && isArchived) {
            if (idx >= 0) arr.splice(idx, 1);
            return arr;
          }

          if (idx >= 0) arr[idx] = { ...arr[idx], ...veh };
          else arr.push(veh);
          arr.sort((a, b) => Number(a?.id) - Number(b?.id));
          return arr;
        });
        return;
      }

      load();
      return;
    }

    load();
  });
  useAutoReload("drivers", () => load());

  useEffect(() => {
    if (tab === "manage") load({ includeArchived: showArchived });
  }, [showArchived, tab]); // eslint-disable-line

  // ✅ Mini polish: Link tabına girince (ve link tabındayken araç değişince) driver seçimini temizle
  useEffect(() => {
    if (tab !== "link") return;
    if (!focusVehicleId) return;
    setBindSel((p) => ({ ...p, [focusVehicleId]: "" }));
  }, [tab, focusVehicleId]);


  function makeDeviceDrafts(rows) {
    const next = {};
    (Array.isArray(rows) ? rows : []).forEach((x) => {
      next[x.id] = {
        label: x?.label || "",
        status: x?.status || "ACTIVE",
      };
    });
    return next;
  }

  async function loadDevices({ silent = false } = {}) {
    if (!silent) setDeviceBusy(true);
    try {
      const resp = await api("/api/telematics/devices", { token });
      const rows = normalizeList(resp);
      setDeviceItems(rows);
      setDeviceDrafts(makeDeviceDrafts(rows));
      setDeviceLoaded(true);
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihaz listesi alınamadı"));
      showToast("Telematics cihaz listesi alınamadı", "err");
    } finally {
      if (!silent) setDeviceBusy(false);
    }
  }

  useEffect(() => {
    if (tab !== "telematics") return;
    if (deviceLoaded) return;
    loadDevices();
  }, [tab, deviceLoaded]); // eslint-disable-line

  async function createDevice(e) {
    e.preventDefault();
    if (!focusVehicleId) {
      setErr("Telematics için önce araç seçmelisin.");
      return;
    }
    setDeviceSaving(true);
    setErr("");
    try {
      const resp = await api("/api/telematics/devices", {
        method: "POST",
        token,
        body: {
          vehicleId: Number(focusVehicleId),
          vendor: String(deviceForm.vendor || "GENERIC").trim().toUpperCase(),
          serial: String(deviceForm.serial || "").trim(),
          label: String(deviceForm.label || "").trim() || undefined,
        },
      });
      setTokenReveal({
        kind: "create",
        id: resp?.id,
        serial: resp?.serial,
        token: resp?.token || "",
      });
      setDeviceForm((p) => ({ ...p, serial: "", label: "" }));
      showToast("Telematics cihazı eklendi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihazı eklenemedi"));
      showToast("Telematics cihazı eklenemedi", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function saveDevice(id) {
    const draft = deviceDrafts?.[id] || {};
    setDeviceSaving(true);
    setErr("");
    try {
      await api(`/api/telematics/devices/${id}`, {
        method: "PATCH",
        token,
        body: {
          label: draft.label,
          status: draft.status,
        },
      });
      showToast("Telematics cihazı güncellendi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihazı güncellenemedi"));
      showToast("Telematics cihazı güncellenemedi", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function rotateDeviceToken(id) {
    setDeviceSaving(true);
    setErr("");
    try {
      const resp = await api(`/api/telematics/devices/${id}/rotate`, {
        method: "POST",
        token,
        body: {},
      });
      const found = (Array.isArray(deviceItems) ? deviceItems : []).find((x) => Number(x.id) === Number(id));
      setTokenReveal({
        kind: "rotate",
        id,
        serial: found?.serial || "",
        token: resp?.token || "",
      });
      showToast("Device token yenilendi", "warn");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Token rotate başarısız"));
      showToast("Token rotate başarısız", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function copyToken(value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      showToast("Token panoya kopyalandı");
    } catch {
      showToast("Token kopyalanamadı", "warn");
    }
  }

  async function createVehicle(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        plate: plate.trim(),
        capacity: Number(capacity),
        speedLimitKmh: Number(speedLimitKmh),
      };

      if (type) body.type = type;
      if (brand.trim()) body.brand = brand.trim();
      if (model.trim()) body.model = model.trim();
      if (String(modelYear).trim()) body.modelYear = Number(modelYear);
      if (color.trim()) body.color = color.trim();
      if (vin.trim()) body.vin = vin.trim();
      if (note.trim()) body.note = note.trim();

      if (inspectionDueAt) body.inspectionDueAt = isoFromTRDateInput(inspectionDueAt);
      if (lastServiceAt) body.lastServiceAt = isoFromTRDateInput(lastServiceAt);
      if (String(lastServiceKm).trim()) body.lastServiceKm = Number(lastServiceKm);
      if (serviceIntervalKm) body.serviceIntervalKm = Number(serviceIntervalKm);
      if (String(odometerKm).trim()) body.odometerKm = Number(odometerKm);

      if (nextMaintenanceAt) body.nextMaintenanceAt = isoFromTRLocalInput(nextMaintenanceAt);

      await api("/api/vehicles", { method: "POST", token, body });

      setTemplateId("");
      setPlate("");
      showToast("Araç eklendi");
      await load();
    } catch (e2) {
      const { msg } = pickErr(e2);
      setErr(String(msg));
      showToast("Araç eklenemedi", "err");
    } finally {
      setBusy(false);
    }
  }

  // driver lookup map (telefon vs için)
  const driversById = useMemo(() => {
    const m = new Map();
    (drivers || []).forEach((d) => m.set(Number(d.id), d));
    return m;
  }, [drivers]);

  // Driver -> bağlı araç haritası (aktif araçlar üzerinden)
  const driverBoundMap = useMemo(() => {
    const m = new Map();
    (items || []).forEach((v) => {
      if (v?.archivedAt) return;
      const did = Number(v?.driverId || v?.driver?.id || 0);
      if (!did) return;
      m.set(did, { vehicleId: Number(v.id), plate: v.plate });
    });
    return m;
  }, [items]);

  const focusVehicle = useMemo(
    () => items.find((x) => Number(x.id) === Number(focusVehicleId)),
    [items, focusVehicleId]
  );

  const focusArchived = Boolean(focusVehicle?.archivedAt);

  const focusDriverId = Number(focusVehicle?.driver?.id || focusVehicle?.driverId || 0);
  const focusDriverObj =
    focusVehicle?.driver ||
    (focusDriverId ? driversById.get(focusDriverId) : null);

  const focusDriverLabel = focusDriverObj
    ? fmtDriverHuman(focusDriverObj)
    : (focusDriverId ? `#${focusDriverId}` : "-");

  const focusHasDriver = Boolean(focusDriverId);

  useEffect(() => {
    if (!focusVehicle) {
      clearCopilotSelection('/room/vehicles');
      return;
    }
    const ui = uiStatusFromVehicle(focusVehicle) || {};
    setCopilotSelection({
      scopeKey: '/room/vehicles',
      entityType: 'vehicle',
      entityId: Number(focusVehicle?.id || 1104) || 1104,
      label: focusVehicle?.plate || `Araç #${focusVehicle?.id || '-'}`,
      summary: [focusVehicle?.plate, focusVehicle?.brand, focusVehicle?.model, focusVehicle?.type].filter(Boolean).join(' • '),
      fields: [
        { label: 'Plaka', value: focusVehicle?.plate || '-', help: 'Seçili aracın plakasını gösterir.' },
        { label: 'Tip', value: focusVehicle?.type || '-', help: 'Araç tipini gösterir.' },
        { label: 'Kapasite', value: String(focusVehicle?.capacity || '-'), help: 'Araç kapasitesini gösterir.' },
        { label: 'Sürücü', value: focusDriverLabel || '-', help: 'Araca bağlı sürücüyü gösterir.' },
        { label: 'Durum', value: ui?.label || '-', help: 'Aracın operasyon/GPS durumunu gösterir.' },
      ],
      badges: [
        { label: 'Bağ', value: focusHasDriver ? 'Sürücü bağlı' : 'Sürücü yok', help: 'Araç-sürücü bağının olup olmadığını gösterir.' },
      ],
      facts: { screenType: 'VEHICLES', stage: pillKeyFromUi(ui), nextBestAction: focusHasDriver ? 'Önce GPS ve durum satırını oku. Sonra gerekiyorsa telematics veya atama sekmesine geç.' : 'Önce sürücü bağı var mı kontrol et. Sonra durum alanını oku.' },
    });
  }, [focusVehicle, focusDriverLabel, focusHasDriver]);

  const selectedDriverId = Number(bindSel?.[focusVehicleId] || 0);
  const selectedBound = selectedDriverId ? driverBoundMap.get(selectedDriverId) : null;
  const selectedBoundOther =
    selectedBound && Number(selectedBound.vehicleId) !== Number(focusVehicleId);


  const telematicsRows = useMemo(
    () => (Array.isArray(deviceItems) ? deviceItems.filter((x) => Number(x?.vehicleId) === Number(focusVehicleId)) : []),
    [deviceItems, focusVehicleId]
  );

  const telematicsCounts = useMemo(() => {
    const out = {};
    (Array.isArray(deviceItems) ? deviceItems : []).forEach((x) => {
      const key = Number(x?.vehicleId || 0);
      if (!key) return;
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }, [deviceItems]);

  function driverOptionLabel(d) {
    const bound = driverBoundMap.get(Number(d.id));
    const suffix = bound ? ` • bağlı: ${bound.plate}` : "";
    return `${d.fullName}${suffix}`;
  }

  async function bindDriver(vehicleId) {
    const sel = bindSel?.[vehicleId] ?? "";
    const driverId = Number(sel || 0);
    if (!driverId) {
      setErr("Bağlamak için driver seçmelisin.");
      return;
    }

    // UI-side conflict gate: başka araca bağlıysa bind denemesini engelle
    const bound = driverBoundMap.get(driverId);
    const isOther = bound && Number(bound.vehicleId) !== Number(vehicleId);
    if (isOther) {
      setErr(`Bu sürücü zaten başka araca bağlı: ${bound.plate}. Transfer kullan.`);
      showToast("Sürücü başka araca bağlı", "warn");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/vehicles/${vehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId },
      });
      showToast("Sürücü bağlandı");
      setBindSel((p) => ({ ...p, [vehicleId]: "" }));
      await load();
    } catch (e) {
      const { msg, code, status, payload } = pickErr(e);

      // Backend spesifik kod
      if (code === "DRIVER_ALREADY_BOUND") {
        const cv = payload?.conflictingVehicle;
        const detail = cv?.plate ? ` (Bağlı araç: ${cv.plate})` : "";
        setErr(`${msg}${detail}`);
        showToast("Sürücü başka araca bağlı", "warn");
        return;
      }

      // 409 vb: netleştir
      if (Number(status) === 409) {
        setErr(`Uygun değil (409): ${msg}`);
        showToast("Uygun değil", "warn");
        return;
      }

      setErr(String(msg));
      showToast("Bağlama başarısız", "err");
    } finally {
      setBusy(false);
    }
  }

  async function unbindDriver(vehicleId) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/vehicles/${vehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId: null },
      });
      showToast("Bağlantı kaldırıldı", "warn");
      await load();
    } catch (e) {
      const { msg, status } = pickErr(e);
      if (Number(status) === 409) setErr(`Uygun değil (409): ${msg}`);
      else setErr(String(msg));
      showToast("Ayırma başarısız", "err");
    } finally {
      setBusy(false);
    }
  }

  async function transferDriver(toVehicleId, driverId, fromVehicleId) {
    const fromPlate = items.find((x) => Number(x.id) === Number(fromVehicleId))?.plate || `#${fromVehicleId}`;
    const toPlate = items.find((x) => Number(x.id) === Number(toVehicleId))?.plate || `#${toVehicleId}`;

    // ✅ Mini polish: daha net confirm metni
    const ok = window.confirm(
      `Sürücü şu an "${fromPlate}" aracına bağlı.\n` +
      `Yeni araç: "${toPlate}"\n\n` +
      `Onaylarsan şu adımlar uygulanacak:\n` +
      `1) "${fromPlate}" aracından ayrılacak\n` +
      `2) "${toPlate}" aracına bağlanacak\n\n` +
      `Devam edilsin mi?`
    );
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/vehicles/${fromVehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId: null },
      });

      await api(`/api/vehicles/${toVehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId },
      });

      showToast("Transfer tamamlandı", "warn");
      setBindSel((p) => ({ ...p, [toVehicleId]: "" }));
      await load();
    } catch (e) {
      const { msg, status } = pickErr(e);
      if (Number(status) === 409) setErr(`Uygun değil (409): ${msg}`);
      else setErr(String(msg));
      showToast("Transfer başarısız", "err");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(v) {
    if (v.archivedAt) {
      setErr("Arşivli araç düzenlenemez.");
      return;
    }

    setErr("");
    setEditTemplateId("");

    setEditForm({
      id: v.id,

      plate: v.plate ?? "",
      capacity: Number(v.capacity ?? 16),
      speedLimitKmh: Number(v.speedLimitKmh ?? 80),

      type: v.type ?? "",
      brand: v.brand ?? "",
      model: v.model ?? "",
      modelYear: v.modelYear != null ? String(v.modelYear) : "",
      color: v.color ?? "",
      vin: v.vin ?? "",
      note: v.note ?? "",

      inspectionDueAt: isoToDateInput(v.inspectionDueAt),
      lastServiceAt: isoToDateInput(v.lastServiceAt),
      lastServiceKm: v.lastServiceKm != null ? String(v.lastServiceKm) : "",
      serviceIntervalKm: v.serviceIntervalKm != null ? Number(v.serviceIntervalKm) : 15000,
      odometerKm: v.odometerKm != null ? String(v.odometerKm) : "",

      nextMaintenanceAt: v.nextMaintenanceAt ? isoToDatetimeLocal(v.nextMaintenanceAt) : "",
    });

    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm.id) return;

    setBusy(true);
    setErr("");
    try {
      const body = {
        plate: String(editForm.plate || "").trim(),
        capacity: Number(editForm.capacity),
        speedLimitKmh: Number(editForm.speedLimitKmh),

        type: editForm.type || null,
        brand: editForm.brand?.trim() || null,
        model: editForm.model?.trim() || null,
        modelYear: String(editForm.modelYear).trim() ? Number(editForm.modelYear) : null,
        color: editForm.color?.trim() || null,
        vin: editForm.vin?.trim() || null,
        note: editForm.note?.trim() || null,

        inspectionDueAt: editForm.inspectionDueAt ? isoFromTRDateInput(editForm.inspectionDueAt) : null,
        lastServiceAt: editForm.lastServiceAt ? isoFromTRDateInput(editForm.lastServiceAt) : null,
        lastServiceKm: String(editForm.lastServiceKm).trim() ? Number(editForm.lastServiceKm) : null,
        serviceIntervalKm: editForm.serviceIntervalKm ? Number(editForm.serviceIntervalKm) : null,
        odometerKm: String(editForm.odometerKm).trim() ? Number(editForm.odometerKm) : null,

        nextMaintenanceAt: editForm.nextMaintenanceAt ? isoFromTRLocalInput(editForm.nextMaintenanceAt) : null,
      };

      await api(`/api/vehicles/${editForm.id}`, { method: "PUT", token, body });

      setEditOpen(false);
      showToast("Araç güncellendi");
      await load();
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg));
      showToast("Güncelleme başarısız", "err");
    } finally {
      setBusy(false);
    }
  }

  async function deleteVehicle(v) {
    if (v.archivedAt) {
      setErr("Arşivli araçta işlem yapılmaz.");
      return;
    }

    const ok = window.confirm(`${v.plate} aracını silmek/arşivlemek istiyor musun? (Shift bağlıysa otomatik arşivlenir)`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      const resp = await api(`/api/vehicles/${v.id}`, { method: "DELETE", token });

      if (resp?.archived === true) showToast("Arşivlendi (shift bağlı)", "warn");
      else showToast("Silindi");

      await load();
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg));
      showToast("Silme/arşivleme başarısız", "err");
    } finally {
      setBusy(false);
    }
  }

  const statusRows = useMemo(() => {
    const q = String(plateQuery || "").trim().toLowerCase();
    return items
      .filter((v) => !v.archivedAt) // Durum sekmesi: varsayılan sadece aktif
      .map((v) => {
        const ui = uiStatusFromVehicle(v); // LIVE|STALE|OFFLINE
        const pillKey = pillKeyFromUi(ui);
        return { v, ui, pillKey };
      })
      .filter(({ v, ui }) => {
        if (statusFilter !== "ALL" && ui !== statusFilter) return false;
        if (q && !String(v.plate || "").toLowerCase().includes(q)) return false;
        return true;
      });
  }, [items, statusFilter, plateQuery]);
const assignRows = useMemo(() => {
  const now = new Date();
  const q = String(assignQuery || "").trim().toLowerCase();
  const maxMs = assignRangeDays * 24 * 60 * 60 * 1000;

  const rows = (items || [])
    .filter((v) => !v.archivedAt)
    .filter((v) => (q ? String(v.plate || "").toLowerCase().includes(q) : true))
    .map((v) => {
      const shifts = Array.isArray(v.shifts) ? v.shifts : [];
      const cur = pickCurrentShift(shifts, now);
      const next = pickNextShift(shifts, now);
      const nextInRange = next && (new Date(next.startAt).getTime() - now.getTime() <= maxMs);
      const hasAgreement = Boolean(cur?.agreementId || next?.agreementId);
      return { v, cur, next: nextInRange ? next : null, hasAgreement };
    })
    .filter((r) => {
      if (assignFilter === "HAS_CURRENT") return Boolean(r.cur);
      if (assignFilter === "HAS_NEXT") return Boolean(r.next);
      if (assignFilter === "AGREEMENT_ONLY") return Boolean(r.hasAgreement);
      return true;
    });

  rows.sort((a, b) => {
    if (assignSort === "PLATE_DESC") return String(b.v.plate || "").localeCompare(String(a.v.plate || ""), "tr");
    if (assignSort === "CURRENT_SOON") {
      const at = a.cur ? new Date(a.cur.startAt).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.cur ? new Date(b.cur.startAt).getTime() : Number.POSITIVE_INFINITY;
      return at - bt;
    }
    if (assignSort === "NEXT_SOON") {
      const at = a.next ? new Date(a.next.startAt).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.next ? new Date(b.next.startAt).getTime() : Number.POSITIVE_INFINITY;
      return at - bt;
    }
    return String(a.v.plate || "").localeCompare(String(b.v.plate || ""), "tr");
  });

  return rows;
}, [items, assignQuery, assignFilter, assignSort, assignRangeDays]);

const availRows = useMemo(() => {
  const q = String(availQuery || "").trim().toLowerCase();

  const rows = (items || [])
    .filter((v) => !v.archivedAt)
    .filter((v) => (q ? String(v.plate || "").toLowerCase().includes(q) : true))
    .map((v) => {
      const row = availMap?.[v.id] || null;
      const now = new Date();
      const cur = pickCurrentShift(v.shifts, now);
      const quickBusy = Boolean(cur);
      const vehicleOk = row ? row.vehicleOk : null;
      const driverOk = row ? row.driverOk : null;
      const hasDriver = Boolean(v.driverId || v.driver?.id || v.driver);

      const anyConflict =
        row ? (row.vehicleOk === false || (hasDriver && row.driverOk === false)) : false;
      const allOk =
        row ? (row.vehicleOk === true && (!hasDriver || row.driverOk === true)) : false;

      return { v, row, quickBusy, hasDriver, anyConflict, allOk };
    })
    .filter((r) => {
      if (availFilter === "ONLY_WITH_DRIVER") return r.hasDriver;
      if (availFilter === "ONLY_UNCHECKED") return !r.row;
      if (availFilter === "ONLY_CONFLICT") return r.anyConflict;
      if (availFilter === "ONLY_OK") return r.allOk;
      return true;
    });

  // Premium: meşguller üstte, sonra plaka
  rows.sort((a, b) => {
    if (a.quickBusy !== b.quickBusy) return a.quickBusy ? -1 : 1;
    return String(a.v.plate || "").localeCompare(String(b.v.plate || ""), "tr");
  });

  return rows;
}, [items, availMap, availQuery, availFilter]);

async function checkAvailabilityAll(onlySelected = false) {
  const startIso = isoFromTRLocalInput(availStartAt);
  const endIso = isoFromTRLocalInput(availEndAt);

  if (!startIso || !endIso) { showToast("start/end seç", "warn"); return; }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    showToast("end > start olmalı", "warn");
    return;
  }

  // görünür liste = filtrelenmiş availRows
  const visible = (availRows || []).map((r) => r.v);
  const visibleIds = visible.map((v) => Number(v.id));
  const selectedIds = visibleIds.filter((id) => !!availSel[id]);

  let targetIds;
  if (onlySelected) {
    if (!selectedIds.length) {
      showToast("Seçili araç yok", "warn");
      return;
    }
    targetIds = selectedIds;
  } else {
    // seçili varsa seçiliyi, yoksa görünürlerin hepsini kontrol et
    targetIds = selectedIds.length ? selectedIds : visibleIds;
  }

  const vlist = visible.filter((v) => targetIds.includes(Number(v.id)));

  setAvailBusy(true);
  setErr("");

  try {
    const payload = {
      startAt: startIso,
      endAt: endIso,
      vehicleIds: targetIds,
    };

    const resp = await api("/api/availability/bulk", { method: "POST", body: payload, token });

    const next = {};
    for (const it of resp?.items || []) {
      next[it.vehicleId] = {
        vehicleOk: it.vehicleOk !== false,
        vehicleConflict: it.vehicleConflict || null,
        driverOk: it.driverId ? it.driverOk !== false : true,
        driverConflict: it.driverConflict || null,
      };
    }

    // selection modunda eski sonuçları koru
    setAvailMap((prev) => ({ ...prev, ...next }));
    showToast(`Müsaitlik güncellendi (${Object.keys(next).length})`, "ok");
  } catch (e) {
    const ne = pickErr(e);
    setErr(ne.msg || "Müsaitlik kontrolü başarısız");
    showToast("Müsaitlik kontrolü başarısız", "err");
  } finally {
    setAvailBusy(false);
  }
}

  return (
    <div>
      <div className="card">
        <h3>Vehicles</h3>
        <div className="muted">ROOM: günlük izleme + yönetim</div>
      </div>

      {toast ? (
        <div className={`card ${toast.kind === "err" ? "err" : ""}`} style={{ borderLeft: "6px solid", padding: "10px 12px" }}>
          <b>{toast.kind === "warn" ? "⚠️ " : toast.kind === "err" ? "❌ " : "✅ "}</b>
          {toast.text}
        </div>
      ) : null}

      {err ? <div className="card err">{err}</div> : null}

      {/* Tabs */}
      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={busy}
              onClick={() => {
                setTab(t.key);
                setErr("");
                // Link tabına geçince (focusVehicleId varsa) seçim temizlenir; useEffect zaten yapıyor.
              }}
              className={tab === t.key ? "btn primary" : "btn"}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* DURUM */}
      {tab === "status" ? (
        <div className="card">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <label className="muted">Plaka ara</label>
              <input value={plateQuery} onChange={(e) => setPlateQuery(e.target.value)} placeholder="34 ABC..." />
            </div>
            <div>
              <label className="muted">Durum</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
                <option value="ALL">Hepsi</option>
                <option value="LIVE">ONLINE</option>
                <option value="STALE">STALE</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </div>
            <div className="muted" style={{ marginLeft: "auto" }}>
              Toplam: {statusRows.length} • Seçili: <b>{focusVehicle?.plate || '-'}</b>
            </div>
          </div>

          <table className="tbl" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Durum</th>
                <th>Son GPS</th>
                <th>Hız</th>
                <th>Konum</th>
                <th>GPS Status</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map(({ v, ui, pillKey }) => {
                const hasGps = hasGpsFix(v);
                return (
                  <tr key={v.id} onClick={() => setFocusVehicleId(Number(v.id) || 0)} style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}>
                    <td>
                      <div>{v.plate}</div>
                      {!hasGps ? <div className="muted" style={{ fontSize: 12 }}>📡 GPS yok</div> : null}
                    </td>
                    <td>
                      <span className="pill" data-status={pillKey}>
                        {ui}
                      </span>
                    </td>
                    <td className="muted">{gpsAtLabel(v)}</td>
                    <td className="muted">{v.gpsLast?.speed != null ? `${v.gpsLast.speed} km/h` : "-"}</td>
                    <td className="muted">
                      {hasGps ? `${v.gpsLast.lat.toFixed(4)}, ${v.gpsLast.lng.toFixed(4)}` : "📡 GPS yok"}
                    </td>
                    <td className="muted">{v.gpsLast?.status ? String(v.gpsLast.status) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="muted" style={{ marginTop: 8 }}>
            Not: Araç haritada marker olarak görünmesi için en az 1 kez GPS (lat/lng) gelmelidir.
          </div>
        </div>
      ) : null}

      {/* YÖNETİM */}
      {tab === "manage" ? (
        <div>
          <div className="card">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(Boolean(e.target.checked))}
                disabled={busy}
              />
              <span>Arşivi göster</span>
            </label>
            <div className="muted" style={{ marginTop: 6 }}>
              Kapalıyken arşivli araçlar listelenmez. Açınca arşiv dahil tüm araçlar gelir.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.95fr 1.75fr",
              gap: 12,
              alignItems: "start",
            }}
          >
            {/* SOL: Yeni Araç */}
            <div className="card">
              <h3>Yeni Araç</h3>

              <form onSubmit={createVehicle} className="grid">
                <div className="col" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted">Hazır Şablon (TR)</label>
                  <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">— Şablon seç (opsiyonel) —</option>
                    {VEHICLE_TEMPLATES_TR.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} • {t.type} • {t.capacity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label className="muted">Plaka</label>
                  <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="34 ABC 123" />
                </div>

                <div className="col">
                  <label className="muted">Kapasite</label>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>

                <div className="col">
                  <label className="muted">Tip</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label className="muted">Hız limit</label>
                  <input type="number" value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} />
                </div>

                <div className="col">
                  <label className="muted">Muayene</label>
                  <input type="date" value={inspectionDueAt} onChange={(e) => setInspectionDueAt(e.target.value)} />
                </div>

                <div className="col">
                  <label className="muted">Km</label>
                  <input type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} placeholder="123456" />
                </div>

                <div className="col">
                  <label className="muted">Marka</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ford" />
                </div>

                <div className="col">
                  <label className="muted">Model</label>
                  <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Transit" />
                </div>

                <div className="col">
                  <label className="muted">Model yılı</label>
                  <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder="2021" />
                </div>

                <div className="col">
                  <label className="muted">Son bakım</label>
                  <input type="date" value={lastServiceAt} onChange={(e) => setLastServiceAt(e.target.value)} />
                </div>

                <div className="col">
                  <label className="muted">Son bakım km</label>
                  <input type="number" value={lastServiceKm} onChange={(e) => setLastServiceKm(e.target.value)} placeholder="110000" />
                </div>

                <div className="col">
                  <label className="muted">Bakım periyodu</label>
                  <input type="number" value={serviceIntervalKm} onChange={(e) => setServiceIntervalKm(e.target.value)} />
                </div>

                <div className="col">
                  <label className="muted">Renk</label>
                  <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Beyaz" />
                </div>

                <div className="col">
                  <label className="muted">VIN</label>
                  <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Şasi No" />
                </div>

                <div className="col" style={{ gridColumn: "1 / -1" }}>
                  <label className="muted">Not</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Araçla ilgili not..." />
                </div>

                <div className="col" style={{ justifyContent: "end" }}>
                  <button disabled={busy} type="submit">
                    {busy ? "..." : "Ekle"}
                  </button>
                </div>
              </form>
            </div>

            {/* SAĞ: Liste */}
            <div className="card" style={{ overflowX: "auto" }}>
              <h3>Liste</h3>

              <table className="tbl" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Plaka</th>
                    <th>Kapasite</th>
                    <th>Tip</th>
                    <th>Hız limit</th>
                    <th>Muayene</th>
                    <th>Km / Bakım</th>
                    <th>Not</th>
                    <th>Aktif sürücü</th>
                    <th>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((v) => {
                    const nextKm = v.lastServiceKm != null && v.serviceIntervalKm != null ? v.lastServiceKm + v.serviceIntervalKm : null;
                    const remainingKm = nextKm != null && v.odometerKm != null ? nextKm - v.odometerKm : null;

                    const drvId = Number(v.driver?.id || v.driverId || 0);
                    const drvObj = v.driver || (drvId ? driversById.get(drvId) : null);
                    const driverLabel = drvObj ? fmtDriverHuman(drvObj) : (drvId ? `#${drvId}` : "-");

                    const isArchived = Boolean(v.archivedAt);
                    const hasDriver = Boolean(drvId);
                    const gpsOk = hasGpsFix(v);

                    return (
                      <tr key={v.id} onClick={() => setFocusVehicleId(Number(v.id) || 0)} style={{ ...rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0)), ...(isArchived ? { opacity: 0.65 } : {}) }}>
                        <td title={!gpsOk ? "GPS verisi yok (haritada görünmez)" : ""}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span>{v.plate}</span>
                            {isArchived ? (
                              <span className="pill" data-status="PASSIVE">
                                ARCHIVED
                              </span>
                            ) : null}
                          </div>

                          {!gpsOk ? (
                            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                              📡 GPS yok
                            </div>
                          ) : null}
                        </td>

                        <td className="muted">{v.capacity}</td>
                        <td className="muted">{v.type ?? "-"}</td>
                        <td className="muted">{v.speedLimitKmh ?? "-"}</td>
                        <td className="muted">{fmtDate(v.inspectionDueAt)}</td>

                        <td className="muted">
                          {v.odometerKm != null ? `${v.odometerKm} km` : "-"}
                          {remainingKm != null ? ` • kalan ${remainingKm} km` : ""}
                        </td>

                        <td className="muted">{v.note ? String(v.note) : "-"}</td>

                        <td>
                          <div className="muted">{driverLabel}{drvId ? ` (id=${drvId})` : ""}</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                            <button
                              type="button"
                              disabled={busy || isArchived}
                              onClick={() => {
                                setFocusVehicleId(Number(v.id));
                                setTab("link");
                                setErr("");
                                // bindSel temizliği useEffect ile otomatik
                              }}
                            >
                              Bağlantı
                            </button>

                            <button
                              type="button"
                              disabled={busy || isArchived || !hasDriver}
                              onClick={() => unbindDriver(v.id)}
                              title="Bağlantıyı kaldır"
                            >
                              Ayır
                            </button>
                          </div>
                        </td>

                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" disabled={busy || isArchived} onClick={(e) => { e.stopPropagation(); setFocusVehicleId(Number(v.id) || 0); openEdit(v); }}>
                            Düzenle
                          </button>

                          <button type="button" disabled={busy || isArchived} onClick={() => deleteVehicle(v)}>
                            Sil/Arşivle
                          </button>
<button type="button" disabled={busy} onClick={() => navigate(`/shared/logs?kind=bundle_vehicle&targetType=vehicle&targetId=${v.id}&format=txt`)}>
  Log TXT
</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="muted" style={{ marginTop: 8 }}>
                “Sil/Arşivle”: Shift bağlıysa backend arşivler, değilse siler.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      
{/* ATAMALAR */}
{tab === "assign" ? (
  <div className="card">
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ marginBottom: 0 }}>Atamalar</h3>
        <div className="muted" style={{ marginTop: 6 }}>
          Araç bazlı <b>mevcut</b> ve <b>sıradaki</b> shift özeti. (Kaynak: <code>/api/vehicles</code> içindeki APPROVED/ACTIVE shifts)
        </div>
      </div>
      <div style={{ marginLeft: "auto" }} className="muted">
        Gösterilen: <b>{assignRows.length}</b>
      </div>
    </div>

    {/* Filters */}
    <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 12 }}>
      <div style={{ minWidth: 240 }}>
        <label className="muted">Plaka ara</label>
        <input value={assignQuery} onChange={(e) => setAssignQuery(e.target.value)} placeholder="34ABC123" />
      </div>

      <div>
        <label className="muted">Filtre</label>
        <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
          <option value="ALL">Hepsi</option>
          <option value="HAS_CURRENT">Sadece “Şu an” olanlar</option>
          <option value="HAS_NEXT">Sadece “Sıradaki” olanlar</option>
          <option value="AGREEMENT_ONLY">Sadece Agreement olanlar</option>
        </select>
      </div>

      <div>
        <label className="muted">Sıralama</label>
        <select value={assignSort} onChange={(e) => setAssignSort(e.target.value)}>
          <option value="PLATE_ASC">Plaka (A→Z)</option>
          <option value="PLATE_DESC">Plaka (Z→A)</option>
          <option value="CURRENT_SOON">Şu an (yakın başlama)</option>
          <option value="NEXT_SOON">Sıradaki (yakın başlama)</option>
        </select>
      </div>

      <div>
        <label className="muted">Pencere</label>
        <select value={assignRangeDays} onChange={(e) => setAssignRangeDays(Number(e.target.value || 7))}>
          <option value={1}>Bugün</option>
          <option value={3}>3 gün</option>
          <option value={7}>7 gün</option>
          <option value={14}>14 gün</option>
        </select>
      </div>

      <button type="button" disabled={busy} onClick={() => load()}>
        Yenile
      </button>
    </div>

    {/* Table */}
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table className="table" style={{ width: "100%", minWidth: 1180, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "29%" }} />
          <col style={{ width: "29%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Şu an</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Sıradaki</th>
          </tr>
        </thead>
        <tbody>
          {assignRows.map(({ v, cur, next }) => (
            <tr key={v.id} onClick={() => setFocusVehicleId(Number(v.id) || 0)} style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}>
              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{v.plate}</b>
                  <span className="muted">#{v.id}</span>
                </div>
              </td>

              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                {v.driver ? <span>{fmtDriverHuman(v.driver)}</span> : <span className="muted">Bağlı sürücü yok</span>}
              </td>

              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                <ShiftCompact
                  s={cur}
                  open={!!shiftExp[expKey(v.id, "cur")]}
                  onToggle={() => toggleExp(setShiftExp, expKey(v.id, "cur"))}
                />
              </td>

              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                <ShiftCompact
                  s={next}
                  open={!!shiftExp[expKey(v.id, "next")]}
                  onToggle={() => toggleExp(setShiftExp, expKey(v.id, "next"))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
      Not: Bu tablo <code>/api/vehicles</code> içindeki <b>APPROVED/ACTIVE</b> shifts set’ini kullanır. REQUESTED (henüz atanmadı) burada görünmez.
    </div>
  </div>
) : null}
{/* MÜSAİTLİK */}
{tab === "avail" ? (
  <div className="card">
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ marginBottom: 0 }}>Müsaitlik</h3>
        <div className="muted" style={{ marginTop: 6 }}>
          Seçilen zaman penceresinde araç/sürücü uygunluğu. (Kaynak: <code>/api/availability/bulk</code> — agreement-first)
        </div>
      </div>
      <div style={{ marginLeft: "auto" }} className="muted">
        Gösterilen: <b>{availRows.length}</b> • Seçili: <b>{availRows.filter((r) => !!availSel[r.v.id]).length}</b>
      </div>
    </div>

    {/* Controls + Filters */}
    <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginTop: 12 }}>
      <div style={{ minWidth: 240 }}>
        <label className="muted">Plaka ara</label>
        <input value={availQuery} onChange={(e) => setAvailQuery(e.target.value)} placeholder="34ABC123" disabled={availBusy} />
      </div>

      <div>
        <label className="muted">Filtre</label>
        <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value)} disabled={availBusy}>
          <option value="ALL">Hepsi</option>
          <option value="ONLY_UNCHECKED">Sadece kontrol edilmemiş</option>
          <option value="ONLY_OK">Sadece OK</option>
          <option value="ONLY_CONFLICT">Sadece CONFLICT</option>
          <option value="ONLY_WITH_DRIVER">Sadece sürücüsü bağlı</option>
        </select>
      </div>

      <div>
        <label className="muted">Start</label>
        <input type="datetime-local" value={availStartAt} onChange={(e) => setAvailStartAt(e.target.value)} disabled={availBusy} />
      </div>

      <div>
        <label className="muted">End</label>
        <input type="datetime-local" value={availEndAt} onChange={(e) => setAvailEndAt(e.target.value)} disabled={availBusy} />
      </div>

      <button type="button" disabled={availBusy || busy} onClick={() => checkAvailabilityAll(false)}>
        {availBusy ? "Kontrol..." : "Tümünü Kontrol Et"}
      </button>

      <button type="button" disabled={availBusy || busy} onClick={() => checkAvailabilityAll(true)} title="Sadece seçili araçları kontrol eder">
        Seçiliyi Kontrol Et
      </button>

      <button
        type="button"
        disabled={availBusy || busy}
        onClick={() => setSelMany(setAvailSel, availRows.map((r) => r.v.id), true)}
      >
        Hepsini Seç
      </button>

      <button type="button" disabled={availBusy || busy} onClick={() => setAvailSel({})}>
        Seçimi Temizle
      </button>

      <button type="button" disabled={availBusy || busy} onClick={() => setAvailMap({})}>
        Sonuçları Temizle
      </button>
    </div>

    {/* Table */}
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table className="table" style={{ width: "100%", minWidth: 1180, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "24%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ padding: "12px 10px", textAlign: "left" }}>
              <input
                type="checkbox"
                title="Görünenlerin hepsini seç/çöz"
                checked={availRows.length > 0 && availRows.every((r) => !!availSel[r.v.id])}
                onChange={(e) => setSelMany(setAvailSel, availRows.map((r) => r.v.id), e.target.checked)}
                disabled={availBusy}
              />
            </th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Araç uygun mu?</th>
            <th style={{ padding: "12px 14px", textAlign: "left" }}>Sürücü uygun mu?</th>
          </tr>
        </thead>
        <tbody>
          {availRows.map(({ v, row, quickBusy, hasDriver }) => {
            const vOk = row ? row.vehicleOk : null;
            const dOk = row ? row.driverOk : null;

            const vCode = row?.vehicleConflict ? conflictCodeLabel(row.vehicleConflict) : null;
            const dCode = row?.driverConflict ? conflictCodeLabel(row.driverConflict) : null;

            const vHint =
              row?.vehicleConflict?.conflictingAgreementId
                ? `A#${row.vehicleConflict.conflictingAgreementId}`
                : row?.vehicleConflict?.conflictingShiftId
                ? `S#${row.vehicleConflict.conflictingShiftId}`
                : "";
            const dHint =
              row?.driverConflict?.conflictingAgreementId
                ? `A#${row.driverConflict.conflictingAgreementId}`
                : row?.driverConflict?.conflictingShiftId
                ? `S#${row.driverConflict.conflictingShiftId}`
                : "";

            return (
              <tr key={v.id} onClick={() => setFocusVehicleId(Number(v.id) || 0)} style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}>
                <td style={{ padding: "12px 10px", verticalAlign: "top" }}>
                  <input
                    type="checkbox"
                    checked={!!availSel[v.id]}
                    onChange={() => toggleSel(setAvailSel, v.id)}
                    disabled={availBusy}
                  />
                </td>

                <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <b>{v.plate}</b>
                    <span className="muted">#{v.id}</span>
                    {quickBusy ? (
                      <span className="pill" data-status="BUSY" title="Şu an shift var">Şu an meşgul</span>
                    ) : (
                      <span className="pill" data-status="FREE" title="Şu an shift yok">Şu an müsait</span>
                    )}
                  </div>
                </td>

                <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                  {v.driver ? fmtDriverHuman(v.driver) : <span className="muted">Bağlı sürücü yok</span>}
                </td>

                <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                  {vOk == null ? (
                    <span className="muted">Kontrol edilmedi</span>
                  ) : vOk ? (
                    <span className="pill" data-status="OK">OK</span>
                  ) : (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="pill" data-status="CONFLICT">CONFLICT: {vCode}</span>
                      {vHint ? <span className="muted" style={{ fontSize: 12 }}>{vHint}</span> : null}
                    </div>
                  )}
                </td>

                <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                  {hasDriver ? (
                    dOk == null ? (
                      <span className="muted">Kontrol edilmedi</span>
                    ) : dOk ? (
                      <span className="pill" data-status="OK">OK</span>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="pill" data-status="CONFLICT">CONFLICT: {dCode}</span>
                        {dHint ? <span className="muted" style={{ fontSize: 12 }}>{dHint}</span> : null}
                      </div>
                    )
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
      İpucu: Agreement → Daily Shift (M18) aynı pencereye shift ürettiyse bile <code>/api/availability/bulk</code> önce agreement conflict döner (deterministik).
    </div>
  </div>
) : null}

      {/* TELEMATICS */}
      {tab === "telematics" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.45fr", gap: 12, alignItems: "start" }}>
          <div className="card">
            <h3>Telematics Device Yönetimi</h3>
            <div className="muted">ROOM &gt; Vehicles içinde araç bazlı GPS cihazı yönetimi</div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div>
                <label className="muted">Araç</label>
                <select
                  value={String(focusVehicleId || "")}
                  onChange={(e) => {
                    const nextId = Number(e.target.value || 0);
                    setFocusVehicleId(nextId);
                    setErr("");
                  }}
                  disabled={busy || deviceBusy || deviceSaving}
                >
                  {items.map((v) => (
                    <option key={v.id} value={v.id} disabled={Boolean(v.archivedAt)}>
                      {v.plate} (#{v.id}){v.archivedAt ? " • ARCHIVED" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={createDevice} style={{ display: "grid", gap: 10 }}>
                <div>
                  <label className="muted">Provider</label>
                  <select
                    value={deviceForm.vendor}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, vendor: e.target.value }))}
                    disabled={deviceSaving || focusArchived}
                  >
                    <option value="GENERIC">GENERIC</option>
                    <option value="TRACCAR">TRACCAR</option>
                  </select>
                </div>

                <div>
                  <label className="muted">Serial</label>
                  <input
                    value={deviceForm.serial}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, serial: e.target.value }))}
                    placeholder="örn: TRK-34-0001"
                    disabled={deviceSaving || focusArchived}
                  />
                </div>

                <div>
                  <label className="muted">Label (opsiyonel)</label>
                  <input
                    value={deviceForm.label}
                    onChange={(e) => setDeviceForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="örn: Ön cam cihazı"
                    disabled={deviceSaving || focusArchived}
                  />
                </div>

                <button
                  type="submit"
                  disabled={deviceSaving || focusArchived || !focusVehicleId || !String(deviceForm.serial || "").trim()}
                >
                  Device ekle
                </button>
              </form>

              <div className="muted" style={{ fontSize: 12 }}>
                Not: Create / update / rotate işlemleri step-up write guard altındadır. Ham token sadece create/rotate anında bir kez gösterilir.
              </div>
            </div>

            {tokenReveal?.token ? (
              <div className="card" style={{ marginTop: 12, padding: "10px 12px", borderLeft: "6px solid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{tokenReveal.kind === "rotate" ? "Yeni device token" : "Yeni device token (ilk ve tek gösterim)"}</b>
                  <button type="button" onClick={() => copyToken(tokenReveal.token)}>Kopyala</button>
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  Device #{tokenReveal.id || "-"}{tokenReveal.serial ? ` • ${tokenReveal.serial}` : ""}
                </div>
                <textarea readOnly value={tokenReveal.token} rows={4} style={{ marginTop: 8, width: "100%" }} />
              </div>
            ) : null}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>Araç cihazları</h3>
                <div className="muted">Seçili araç: <b>{focusVehicle?.plate || "-"}</b> • Toplam cihaz: {telematicsCounts[Number(focusVehicleId)] || 0}</div>
              </div>
              <button type="button" disabled={deviceBusy || deviceSaving} onClick={() => loadDevices()}>
                Yenile
              </button>
            </div>

            {focusArchived ? (
              <div className="card" style={{ marginTop: 12 }}>
                Arşivli araçta telematics yönetimi kapalıdır.
              </div>
            ) : null}

            {!focusArchived && !telematicsRows.length ? (
              <div className="muted" style={{ marginTop: 12 }}>
                Bu araç için telematics cihazı yok.
              </div>
            ) : null}

            {!focusArchived && telematicsRows.length ? (
              <table className="tbl" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vendor</th>
                    <th>Serial</th>
                    <th>Label</th>
                    <th>Durum</th>
                    <th>Son Seen</th>
                    <th>Son Ingest</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {telematicsRows.map((d) => {
                    const draft = deviceDrafts?.[d.id] || { label: d.label || "", status: d.status || "ACTIVE" };
                    return (
                      <tr key={d.id}>
                        <td>#{d.id}</td>
                        <td>{d.vendor || "-"}</td>
                        <td><code>{d.serial}</code></td>
                        <td style={{ minWidth: 180 }}>
                          <input
                            value={draft.label}
                            onChange={(e) => setDeviceDrafts((prev) => ({ ...prev, [d.id]: { ...draft, label: e.target.value } }))}
                            placeholder="label"
                            disabled={deviceSaving}
                          />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          <select
                            value={draft.status}
                            onChange={(e) => setDeviceDrafts((prev) => ({ ...prev, [d.id]: { ...draft, status: e.target.value } }))}
                            disabled={deviceSaving}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        </td>
                        <td>{fmtTR(d.lastSeenAt)}</td>
                        <td>{fmtTR(d.lastIngestAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" disabled={deviceSaving} onClick={() => saveDevice(d.id)}>
                              Kaydet
                            </button>
                            <button type="button" className="btn" disabled={deviceSaving} onClick={() => rotateDeviceToken(d.id)}>
                              Token rotate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            <div className="muted" style={{ marginTop: 12, fontSize: 12, display: "grid", gap: 4 }}>
              <div><code>POST /api/telematics/push</code> → device token ile direkt cihaz push</div>
              <div><code>POST /api/telematics/vendor/:provider</code> → vendor cloud webhook</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* BAĞLANTI */}
      {tab === "link" ? (
        <div className="card">
          <h3>Bağlantı (Araç ↔ Sürücü)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            {/* Sol: Seçim + bind */}
            <div>
              <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                <div style={{ minWidth: 220 }}>
                  <label className="muted">Araç</label>
                  <select
                    value={String(focusVehicleId || "")}
                    onChange={(e) => {
                      const nextId = Number(e.target.value || 0);
                      setFocusVehicleId(nextId);
                      setErr("");
                      // ✅ araç değişince de boşla (useEffect de yapıyor ama deterministic kalsın)
                      if (nextId) setBindSel((p) => ({ ...p, [nextId]: "" }));
                    }}
                    disabled={busy}
                  >
                    {items.map((v) => (
                      <option key={v.id} value={v.id} disabled={Boolean(v.archivedAt)}>
                        {v.plate} (#{v.id}){v.archivedAt ? " • ARCHIVED" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 260 }}>
                  <label className="muted">Yeni Sürücü</label>
                  <select
                    value={String(bindSel[focusVehicleId] ?? "")}
                    onChange={(e) => setBindSel((prev) => ({ ...prev, [focusVehicleId]: e.target.value }))}
                    disabled={busy || focusArchived}
                  >
                    <option value="">Driver seç</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {driverOptionLabel(d)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !focusVehicleId ||
                    !bindSel[focusVehicleId] ||
                    focusArchived ||
                    selectedBoundOther
                  }
                  onClick={() => bindDriver(focusVehicleId)}
                  title={selectedBoundOther ? "Driver başka araca bağlı. Transfer kullan." : ""}
                >
                  Bağla
                </button>

                {selectedBoundOther ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || focusArchived}
                    onClick={() => transferDriver(focusVehicleId, selectedDriverId, selectedBound.vehicleId)}
                    title="Driver başka araca bağlıysa: önce ayır, sonra bağla"
                  >
                    Transfer
                  </button>
                ) : null}
              </div>

              {selectedBoundOther ? (
                <div className="card" style={{ marginTop: 10, padding: "10px 12px", borderLeft: "6px solid" }}>
                  <b>⚠️ Bu driver başka araca bağlı:</b>{" "}
                  <span className="muted">{selectedBound?.plate}</span>
                  <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                    Kural gereği aynı anda tek araçta olabilir. “Transfer” ile otomatik taşıyabilirsin.
                  </div>
                </div>
              ) : null}

              <div className="muted" style={{ marginTop: 10 }}>
                Not: Arşivli araçta bind/ayır yapılmaz.
              </div>
            </div>

            {/* Sağ: Mevcut bağlantı */}
            <div className="card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Mevcut Bağlantı</h3>
              <div className="muted">Seçili araç: <b>{focusVehicle?.plate || "-"}</b></div>

              <div style={{ marginTop: 10 }}>
                <div className="muted">Aktif sürücü</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  <b>{focusDriverLabel}</b>
                  {focusHasDriver ? <span className="muted">(id={focusDriverId})</span> : null}

                  <button
                    type="button"
                    disabled={busy || focusArchived || !focusHasDriver}
                    onClick={() => unbindDriver(focusVehicleId)}
                  >
                    Bağlantıyı kaldır (Ayır)
                  </button>
                </div>
              </div>

              {focusVehicle && !hasGpsFix(focusVehicle) ? (
                <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                  📡 GPS yok — bu araç haritada marker olarak görünmez.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* EDIT MODAL */}
      {editOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
            background: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="card" style={{ width: "min(980px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3>Düzenle</h3>
              <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>
                Kapat
              </button>
            </div>

            <div className="grid" style={{ marginTop: 8 }}>
              <div className="col" style={{ gridColumn: "1 / -1" }}>
                <label className="muted">Hazır Şablon (TR) (opsiyonel)</label>
                <select value={editTemplateId} onChange={(e) => applyEditTemplate(e.target.value)}>
                  <option value="">— Şablon seç —</option>
                  {VEHICLE_TEMPLATES_TR.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} • {t.type} • {t.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col">
                <label className="muted">Plaka</label>
                <input value={editForm.plate} onChange={(e) => setEditForm((p) => ({ ...p, plate: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Kapasite</label>
                <input type="number" value={editForm.capacity} onChange={(e) => setEditForm((p) => ({ ...p, capacity: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Araç tipi</label>
                <select value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col">
                <label className="muted">Marka</label>
                <input value={editForm.brand} onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Model</label>
                <input value={editForm.model} onChange={(e) => setEditForm((p) => ({ ...p, model: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Model yılı</label>
                <input type="number" value={editForm.modelYear} onChange={(e) => setEditForm((p) => ({ ...p, modelYear: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Hız limiti (km/h)</label>
                <input type="number" value={editForm.speedLimitKmh} onChange={(e) => setEditForm((p) => ({ ...p, speedLimitKmh: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Muayene bitiş</label>
                <input type="date" value={editForm.inspectionDueAt} onChange={(e) => setEditForm((p) => ({ ...p, inspectionDueAt: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Güncel km</label>
                <input type="number" value={editForm.odometerKm} onChange={(e) => setEditForm((p) => ({ ...p, odometerKm: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Son bakım tarihi</label>
                <input type="date" value={editForm.lastServiceAt} onChange={(e) => setEditForm((p) => ({ ...p, lastServiceAt: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Son bakım km</label>
                <input type="number" value={editForm.lastServiceKm} onChange={(e) => setEditForm((p) => ({ ...p, lastServiceKm: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Bakım periyodu (km)</label>
                <input type="number" value={editForm.serviceIntervalKm} onChange={(e) => setEditForm((p) => ({ ...p, serviceIntervalKm: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Renk</label>
                <input value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">VIN</label>
                <input value={editForm.vin} onChange={(e) => setEditForm((p) => ({ ...p, vin: e.target.value }))} />
              </div>

              <div className="col" style={{ gridColumn: "1 / -1" }}>
                <label className="muted">Not</label>
                <input value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
              </div>

              <div className="col" style={{ display: "flex", gap: 8, justifyContent: "end" }}>
                <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>
                  İptal
                </button>
                <button type="button" disabled={busy} onClick={saveEdit}>
                  {busy ? "..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}