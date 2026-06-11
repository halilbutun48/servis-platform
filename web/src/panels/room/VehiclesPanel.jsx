// web/src/panels/room/VehiclesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useRoomVehicleTelematics } from "./useRoomVehicleTelematics";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CollapsibleSection from "../../components/CollapsibleSection";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { isoFromTRDateInput, isoFromTRLocalInput, toDatetimeLocalTR } from "../../utils/time";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import {
  VEHICLE_TEMPLATES_TR,
  TABS,
  buildVehicleCopilotSelection,
  fmtDriverHuman,
  hasGpsFix,
  isoToDateInput,
  isoToDatetimeLocal,
  normalizeList,
  pickCurrentShift,
  pickNextShift,
  pickRoomVehicleError as pickErr,
} from "./roomVehiclesPanelUtils";
import {
  RoomVehicleStatusSection,
  RoomVehicleAssignmentsSection,
  RoomVehicleAvailabilitySection,
  RoomVehicleTelematicsSection,
  RoomVehicleLinkSection,
  RoomVehicleEditModal,
  RoomVehicleManageSection,
} from "./roomVehiclesPanelSections";

function upperTr(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : "";
}

function upperTrOrNull(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : null;
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
  const [nextMaintenanceAt] = useState("");

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

  // ✅ Mini polish: Link tabına girince seçili aracın mevcut sürücüsünü önceden doldur
  useEffect(() => {
    if (tab !== "link") return;
    if (!focusVehicleId) return;
    const currentVehicle = items.find((x) => Number(x?.id) === Number(focusVehicleId)) || null;
    const nextDriverId = Number(currentVehicle?.driver?.id || currentVehicle?.driverId || 0);
    setBindSel((p) => {
      const nextValue = nextDriverId ? String(nextDriverId) : "";
      if (String(p?.[focusVehicleId] || "") === nextValue) return p;
      return { ...p, [focusVehicleId]: nextValue };
    });
  }, [tab, focusVehicleId, items]);


  async function createVehicle(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        plate: upperTr(plate),
        capacity: Number(capacity),
        speedLimitKmh: Number(speedLimitKmh),
      };

      if (type) body.type = type;
      if (brand.trim()) body.brand = upperTr(brand);
      if (model.trim()) body.model = upperTr(model);
      if (String(modelYear).trim()) body.modelYear = Number(modelYear);
      if (color.trim()) body.color = upperTr(color);
      if (vin.trim()) body.vin = upperTr(vin);
      if (note.trim()) body.note = upperTr(note);

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
  const focusUi = useMemo(() => uiStatusFromVehicle(focusVehicle) || {}, [focusVehicle]);

  const {
    deviceBusy,
    deviceSaving,
    deviceDrafts,
    setDeviceDrafts,
    deviceForm,
    setDeviceForm,
    telematicsRows = [],
    telematicsCounts = {},
    createDevice,
    saveDevice,
    rotateDeviceToken,
    loadDevices,
  } = useRoomVehicleTelematics({
    tab,
    focusVehicleId,
    token,
    apiFn: api,
    normalizeList,
    pickErr,
    setErr,
    showToast,
  });

  const vehicleSummary = useMemo(() => {
    const total = Array.isArray(items) ? items.length : 0;
    const archived = Array.isArray(items) ? items.filter((v) => Boolean(v?.archivedAt)).length : 0;
    const gpsReady = Array.isArray(items) ? items.filter((v) => hasGpsFix(v)).length : 0;
    const telematicsTotal = Object.values(telematicsCounts || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
    return { total, archived, gpsReady, telematicsTotal };
  }, [items, telematicsCounts]);

  useEffect(() => {
    if (!focusVehicle) {
      clearCopilotSelection("/room/vehicles");
      return;
    }
    const ui = uiStatusFromVehicle(focusVehicle) || {};
    setCopilotSelection(buildVehicleCopilotSelection({ focusVehicle, focusDriverLabel, focusHasDriver, ui }));
  }, [focusVehicle, focusDriverLabel, focusHasDriver]);

  const selectedDriverId = Number(bindSel?.[focusVehicleId] || focusDriverId || 0);
  const selectedBound = selectedDriverId ? driverBoundMap.get(selectedDriverId) : null;
  const selectedBoundOther =
    selectedBound && Number(selectedBound.vehicleId) !== Number(focusVehicleId);


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
        plate: upperTr(editForm.plate),
        capacity: Number(editForm.capacity),
        speedLimitKmh: Number(editForm.speedLimitKmh),

        type: editForm.type || null,
        brand: upperTrOrNull(editForm.brand),
        model: upperTrOrNull(editForm.model),
        modelYear: String(editForm.modelYear).trim() ? Number(editForm.modelYear) : null,
        color: upperTrOrNull(editForm.color),
        vin: upperTrOrNull(editForm.vin),
        note: upperTrOrNull(editForm.note),

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div className="card">
          <div className="muted">Seçili araç</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{focusVehicle?.plate || "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>{focusDriverLabel || "Sürücü yok"}{focusHasDriver ? " • bağlı" : ""}</div>
        </div>
        <div className="card">
          <div className="muted">Filo özet</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{vehicleSummary.total} araç</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>GPS hazır: {vehicleSummary.gpsReady} • Arşiv: {vehicleSummary.archived}</div>
        </div>
        <div className="card">
          <div className="muted">Telematics</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{vehicleSummary.telematicsTotal} cihaz</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Seçili araç cihaz sayısı: {telematicsCounts[Number(focusVehicleId)] || 0}</div>
        </div>
      </div>

      {toast ? (
        <div className={`card ${toast.kind === "err" ? "err" : ""}`} style={{ borderLeft: "6px solid", padding: "10px 12px" }}>
          <b>{toast.kind === "warn" ? "⚠️ " : toast.kind === "err" ? "❌ " : "✅ "}</b>
          {toast.text}
        </div>
      ) : null}

      {err ? <div className="card err">{err}</div> : null}

      <PanelSegmentTabs
        ariaLabel="Araç bölümleri"
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setErr("");
        }}
        compact
      />

      {/* DURUM */}
      {tab === "status" ? (
        <RoomVehicleStatusSection
          plateQuery={plateQuery}
          setPlateQuery={setPlateQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          busy={busy}
          focusVehicle={focusVehicle}
          focusUi={focusUi}
          focusDriverLabel={focusDriverLabel}
          statusRows={statusRows}
          items={items}
          focusVehicleId={focusVehicleId}
          onSelectVehicle={setFocusVehicleId}
        />
      ) : null}

      {/* YÖNETİM */}
      {tab === "manage" ? (
        <RoomVehicleManageSection
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          templateId={templateId}
          applyTemplate={applyTemplate}
          plate={plate}
          setPlate={setPlate}
          capacity={capacity}
          setCapacity={setCapacity}
          type={type}
          setType={setType}
          speedLimitKmh={speedLimitKmh}
          setSpeedLimitKmh={setSpeedLimitKmh}
          inspectionDueAt={inspectionDueAt}
          setInspectionDueAt={setInspectionDueAt}
          odometerKm={odometerKm}
          setOdometerKm={setOdometerKm}
          brand={brand}
          setBrand={setBrand}
          model={model}
          setModel={setModel}
          modelYear={modelYear}
          setModelYear={setModelYear}
          lastServiceAt={lastServiceAt}
          setLastServiceAt={setLastServiceAt}
          lastServiceKm={lastServiceKm}
          setLastServiceKm={setLastServiceKm}
          serviceIntervalKm={serviceIntervalKm}
          setServiceIntervalKm={setServiceIntervalKm}
          color={color}
          setColor={setColor}
          vin={vin}
          setVin={setVin}
          note={note}
          setNote={setNote}
          createVehicle={createVehicle}
          busy={busy}
          items={items}
          focusVehicle={focusVehicle}
          focusDriverLabel={focusDriverLabel}
          focusVehicleId={focusVehicleId}
          setFocusVehicleId={setFocusVehicleId}
          setTab={setTab}
          setErr={setErr}
          openEdit={openEdit}
          deleteVehicle={deleteVehicle}
          unbindDriver={unbindDriver}
          driversById={driversById}
        />
      ) : null}

      
{/* ATAMALAR */}
{tab === "assign" ? (
        <RoomVehicleAssignmentsSection
          assignRows={assignRows}
          assignQuery={assignQuery}
          setAssignQuery={setAssignQuery}
          assignFilter={assignFilter}
          setAssignFilter={setAssignFilter}
          assignSort={assignSort}
          setAssignSort={setAssignSort}
          assignRangeDays={assignRangeDays}
          setAssignRangeDays={setAssignRangeDays}
          busy={busy}
          onReload={load}
          focusVehicleId={focusVehicleId}
          onSelectVehicle={setFocusVehicleId}
          shiftExp={shiftExp}
          setShiftExp={setShiftExp}
        />
      ) : null}
{/* MÜSAİTLİK */}
{tab === "avail" ? (
        <RoomVehicleAvailabilitySection
          availRows={availRows}
          availSel={availSel}
          setAvailSel={setAvailSel}
          availQuery={availQuery}
          setAvailQuery={setAvailQuery}
          availFilter={availFilter}
          setAvailFilter={setAvailFilter}
          availStartAt={availStartAt}
          setAvailStartAt={setAvailStartAt}
          availEndAt={availEndAt}
          setAvailEndAt={setAvailEndAt}
          availBusy={availBusy}
          busy={busy}
          checkAvailabilityAll={checkAvailabilityAll}
          setAvailMap={setAvailMap}
          focusVehicleId={focusVehicleId}
          onSelectVehicle={setFocusVehicleId}
        />
      ) : null}

      {/* TELEMATICS */}
      {tab === "telematics" ? (
        <CollapsibleSection
          title="GPS eşleştirme detayları"
          subtitle="Onaylı provider, matching alanları ve son veri görünümü."
          badge={telematicsCounts[Number(focusVehicleId)] || 0}
          defaultOpen
          compact
        >
          <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>
            Erişim görünürlüğü güvenli sınırda tutulur.
          </div>
          <RoomVehicleTelematicsSection
            focusVehicleId={focusVehicleId}
            setFocusVehicleId={setFocusVehicleId}
            setErr={setErr}
            busy={busy}
            deviceBusy={deviceBusy}
            deviceSaving={deviceSaving}
            items={items}
            deviceForm={deviceForm}
            setDeviceForm={setDeviceForm}
            focusArchived={focusArchived}
            createDevice={createDevice}
            focusVehicle={focusVehicle}
            telematicsCounts={telematicsCounts}
            loadDevices={loadDevices}
            telematicsRows={telematicsRows}
            deviceDrafts={deviceDrafts}
            setDeviceDrafts={setDeviceDrafts}
            saveDevice={saveDevice}
            rotateDeviceToken={rotateDeviceToken}
          />
        </CollapsibleSection>
      ) : null}

      {/* BAĞLANTI */}
      {tab === "link" ? (
        <CollapsibleSection
          title="Araç bağlantısı detayları"
          subtitle="Sürücü eşleme, transfer ve ayırma akışı."
          badge={focusHasDriver ? "aktif" : "boş"}
          defaultOpen
          compact
        >
          <RoomVehicleLinkSection
            focusVehicleId={focusVehicleId}
            setFocusVehicleId={setFocusVehicleId}
            setErr={setErr}
            setBindSel={setBindSel}
            bindSel={bindSel}
            busy={busy}
            items={items}
            focusArchived={focusArchived}
            drivers={drivers}
            driverOptionLabel={driverOptionLabel}
            selectedBoundOther={selectedBoundOther}
            bindDriver={bindDriver}
            selectedDriverId={selectedDriverId}
            selectedBound={selectedBound}
            transferDriver={transferDriver}
            focusVehicle={focusVehicle}
            focusDriverLabel={focusDriverLabel}
            focusHasDriver={focusHasDriver}
            focusDriverId={focusDriverId}
            unbindDriver={unbindDriver}
          />
        </CollapsibleSection>
      ) : null}

      {/* EDIT MODAL */}
      {editOpen ? (
        <RoomVehicleEditModal
          editOpen={editOpen}
          busy={busy}
          setEditOpen={setEditOpen}
          editTemplateId={editTemplateId}
          applyEditTemplate={applyEditTemplate}
          editForm={editForm}
          setEditForm={setEditForm}
          saveEdit={saveEdit}
        />
      ) : null}
    </div>
  );
}
