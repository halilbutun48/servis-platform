// web/src/panels/room/DriversPanel.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import CollapsibleSection from "../../components/CollapsibleSection";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { formatRegionOwnership } from "../../utils/regionOwnership";
import RoomDriversQuickPenaltyCard from "./RoomDriversQuickPenaltyCard";
import RoomDriversStatusTable from "./RoomDriversStatusTable";
import RoomDriversShiftsTable from "./RoomDriversShiftsTable";
import RoomDriversEditModal from "./RoomDriversEditModal";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import ListSelectionBanner from "../../components/ListSelectionBanner";

function upperTr(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : "";
}

function upperTrOrNull(value) {
  const text = String(value ?? "").trim();
  return text ? text.toLocaleUpperCase("tr-TR") : null;
}

function roomDriverVisibleLabel(value, fallback = "Sürücü kaydı") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const normalized = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR");
  if (/(hash|token|debug|raw)/.test(normalized)) return fallback;
  return text;
}

const TABS = [
  { key: "status", label: "Durum" },
  { key: "manage", label: "Yönetim" },
  { key: "shifts", label: "Vardiyalar" },
];

function fmtTR(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(dt);
  }
}

function pickCurrentNext(shifts) {
  const now = new Date();
  const s = Array.isArray(shifts) ? [...shifts] : [];
  s.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const current = s.find((x) => new Date(x.startAt) <= now && new Date(x.endAt) >= now) ?? null;
  const next = s.find((x) => new Date(x.startAt) > now) ?? null;

  return { current, next };
}



function connectionBadgeStatus(ops) {
  return ops.connectionState === "ONLINE" ? "APPROVED" : "PASSIVE";
}

function assignmentBadgeStatus(ops) {
  if (ops.assignmentState === "ACTIVE") return "ACTIVE";
  if (ops.assignmentState === "NONE") return "PASSIVE";
  if (ops.assignmentState === "ASSIGNED_NO_VEHICLE") return "REQUESTED";
  return "APPROVED";
}

function gpsBadgeStatus(ops, stat) {
  if (stat?.pillKey) return stat.pillKey;
  if (ops.gpsUiState === "WAITING") return "REQUESTED";
  if (ops.gpsUiState === "OFFLINE") return "STALE";
  return "PASSIVE";
}

function roomDriverUiLabel(ui) {
  const text = String(ui || "").toUpperCase();
  if (text === "LIVE") return "Canlı";
  if (text === "STALE") return "Düşük canlılık";
  if (text === "OFFLINE") return "Çevrim dışı";
  return text || "-";
}

function getErrMsg(err) {
  const payload = err?.payload || null;
  if (payload?.message) return String(payload.message);
  if (typeof payload?.error === "string") return String(payload.error);
  if (payload?.details?.fieldErrors) {
    for (const key of Object.keys(payload.details.fieldErrors)) {
      const arr = payload.details.fieldErrors[key];
      if (Array.isArray(arr) && arr.length) return String(arr[0]);
    }
  }
  if (payload?.error?.fieldErrors) {
    for (const key of Object.keys(payload.error.fieldErrors)) {
      const arr = payload.error.fieldErrors[key];
      if (Array.isArray(arr) && arr.length) return String(arr[0]);
    }
  }
  return String(err?.message || err || "Bilinmeyen hata");
}

export default function DriversPanel() {
  const { token } = useSession();

  const [tab, setTab] = useState("status");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState(null); // {kind,text}
  function showToast(text, kind = "ok") {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2800);
  }

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [penaltiesByDriverId, setPenaltiesByDriverId] = useState({});
  const [penaltyOpenDriverId, setPenaltyOpenDriverId] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL|LIVE|STALE|OFFLINE (GPS)
  const [boundFilter, setBoundFilter] = useState("ALL"); // ALL|BOUND|FREE
  const [statusColFilter, setStatusColFilter] = useState({
    driver: "",
    phone: "",
    connection: "ALL",
    task: "ALL",
    vehicle: "",
    gps: "ALL",
  });

  // Create
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [issuedCreds, setIssuedCreds] = useState(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: 0,
    fullName: "",
    phone: "",
    deviceInfo: "",
    backupDriverId: "",
  });

  const [focusDriverId, setFocusDriverId] = useState(0);

  function clearStatusColumnFilters() {
    setStatusColFilter({
      driver: "",
      phone: "",
      connection: "ALL",
      task: "ALL",
      vehicle: "",
      gps: "ALL",
    });
  }

  const load = useCallback(async () => {
    setErr("");
    try {
      // Drivers router now returns boundVehicle/currentShift/nextShift too,
      // but UI also works even if those fields are missing (fallback via /api/vehicles).
      const [d, v] = await Promise.all([api("/api/drivers", { token }), api("/api/vehicles", { token })]);
      setDrivers(Array.isArray(d) ? d : []);
      setVehicles(Array.isArray(v) ? v : []);
      const penaltyPairs = await Promise.all((Array.isArray(d) ? d.slice(0, 20) : []).map(async (row) => { try { const r = await api(`/api/penalties/drivers/${row.id}`, { token }); const items = Array.isArray(r?.items) ? r.items : []; return [Number(row.id), items.find((x) => x?.isActive || x?.effectiveStatus === "ACTIVE") || items[0] || null]; } catch { return [Number(row.id), null]; } }));
      setPenaltiesByDriverId(Object.fromEntries(penaltyPairs));

      if (!focusDriverId && Array.isArray(d) && d.length) setFocusDriverId(Number(d[0].id));
    } catch (e) {
      setErr(getErrMsg(e));
    }
  }, [token, focusDriverId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(timer);
  }, [token, load]);

  useAutoReload("drivers", load);
  useAutoReload("vehicles", (detail) => {
    const m = detail?.payload?.msg;
    const ev = m?._event;

    if (ev === "vehicle:status") {
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid) || !st) return;

      setVehicles((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) => {
          if (Number(v?.id) !== vid) return v;
          return { ...v, gpsState: { ...(v?.gpsState || {}), lastUiStatus: st } };
        })
      );
      return;
    }

    if (ev === "vehicle:update") {
      const action = String(m?.action || "");
      if (action === "deleted") {
        const vid = Number(m?.vehicleId);
        if (!Number.isFinite(vid)) return;
        setVehicles((prev) => (Array.isArray(prev) ? prev.filter((x) => Number(x?.id) !== vid) : []));
        return;
      }

      const veh = m?.vehicle || null;
      if (veh && typeof veh === "object") {
        const vid = Number(veh.id || m?.vehicleId);
        if (!Number.isFinite(vid)) return;

        setVehicles((prev) => {
          const arr = Array.isArray(prev) ? [...prev] : [];
          const idx = arr.findIndex((x) => Number(x?.id) === vid);

          if (veh?.archivedAt) {
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

  const boundVehicleByDriverId = useMemo(() => {
    const m = new Map();

    // Prefer backend-provided boundVehicle if exists
    for (const d of drivers) {
      if (d?.boundVehicle?.id) m.set(Number(d.id), d.boundVehicle);
    }

    // Fallback: derive from vehicles list
    for (const v of vehicles) {
      const did = v.driverId ?? v.driver?.id ?? null;
      if (!did) continue;
      if (v.archivedAt) continue;
      if (!m.has(Number(did))) m.set(Number(did), v);
    }

    return m;
  }, [drivers, vehicles]);

  const driverStatus = useCallback((driverId) => {
    const bv = boundVehicleByDriverId.get(Number(driverId)) ?? null;
    if (!bv) return null;
    const ui = uiStatusFromVehicle(bv);
    return { ui, uiLabel: roomDriverUiLabel(ui), pillKey: pillKeyFromUi(ui), vehicle: bv };
  }, [boundVehicleByDriverId]);

  function driverOps(d) {
    const ops = d?.ops || {};
    return {
      connectionState: String(ops.connectionState || 'OFFLINE').toUpperCase(),
      connectionLabel: String(ops.connectionLabel || 'Bagli degil'),
      assignmentState: String(ops.assignmentState || 'NONE').toUpperCase(),
      assignmentLabel: String(ops.assignmentLabel || 'Gorev yok'),
      gpsUiState: String(ops.gpsUiState || 'IDLE').toUpperCase(),
      gpsLabel: String(ops.gpsLabel || 'GPS pasif'),
    };
  }

  const filteredDrivers = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return (drivers || [])
      .filter((d) => {
        if (!d) return false;

        const name = String(d.fullName || "").toLowerCase();
        const ph = String(d.phone || "").toLowerCase();
        const bv = boundVehicleByDriverId.get(Number(d.id)) ?? null;
        const plate = bv ? String(bv.plate || "").toLowerCase() : "";
        const code = String(d.driverCode || "").toLowerCase();

        if (qq && !(name.includes(qq) || ph.includes(qq) || plate.includes(qq) || code.includes(qq))) return false;

        const stat = driverStatus(d.id);
        const isBound = Boolean(bv);

        if (boundFilter === "BOUND" && !isBound) return false;
        if (boundFilter === "FREE" && isBound) return false;

        if (statusFilter !== "ALL") {
          if (!stat) return false;
          if (stat.ui !== statusFilter) return false;
        }
        return true;
      })
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [drivers, q, statusFilter, boundFilter, boundVehicleByDriverId, driverStatus]);

  const visibleStatusDrivers = useMemo(() => {
    return filteredDrivers.filter((d) => {
      const stat = driverStatus(d.id);
      const bv = stat?.vehicle ?? d?.boundVehicle ?? boundVehicleByDriverId.get(Number(d.id)) ?? null;
      const ops = driverOps(d);

      if (!includesFilter([d?.fullName, d?.driverCode, d?.id], statusColFilter.driver)) return false;
      if (!includesFilter([d?.phone], statusColFilter.phone)) return false;
      if (!includesFilter([bv?.plate], statusColFilter.vehicle)) return false;

      if (statusColFilter.connection !== "ALL" && String(ops.connectionState || "").toUpperCase() !== statusColFilter.connection) return false;
      if (statusColFilter.task !== "ALL" && String(ops.assignmentState || "").toUpperCase() !== statusColFilter.task) return false;
      if (statusColFilter.gps !== "ALL" && String(ops.gpsUiState || "").toUpperCase() !== statusColFilter.gps) return false;

      return true;
    });
  }, [filteredDrivers, statusColFilter, boundVehicleByDriverId, driverStatus]);

  const counts = useMemo(() => {
    let total = drivers.length;
    let bound = 0;
    let connected = 0;
    let assigned = 0;
    let active = 0;
    let live = 0;
    let stale = 0;
    let offline = 0;

    for (const d of drivers) {
      const stat = driverStatus(d.id);
      const bv = boundVehicleByDriverId.get(Number(d.id)) ?? null;
      const ops = driverOps(d);
      if (bv) bound++;
      if (ops.connectionState === "ONLINE") connected++;
      if (["ASSIGNED", "ASSIGNED_NO_VEHICLE"].includes(ops.assignmentState)) assigned++;
      if (ops.assignmentState === "ACTIVE") active++;
      if (stat?.ui === "LIVE") live++;
      if (stat?.ui === "STALE") stale++;
      if (stat?.ui === "OFFLINE") offline++;
    }

    return { total, bound, free: total - bound, connected, assigned, active, live, stale, offline };
  }, [drivers, boundVehicleByDriverId, driverStatus]);

  async function createDriver(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        fullName: upperTr(fullName),
        phone: phone.trim(),
        deviceInfo: upperTr(deviceInfo),
      };

      const created = await api("/api/drivers", { method: "POST", token, body });

      setFullName("");
      setPhone("");
      setDeviceInfo("");
      setIssuedCreds(created?.issuedCredentials ? {
        driverId: created?.id,
        fullName: roomDriverVisibleLabel(created?.fullName),
        ...created.issuedCredentials,
      } : null);

      showToast("Sürücü eklendi");
      await load();
    } catch (e2) {
      setErr(getErrMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  async function resetPin(driver) {
    if (!driver?.id) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api(`/api/drivers/${driver.id}/reset-pin`, { method: "POST", token, body: {} });
      setIssuedCreds(r?.issuedCredentials ? {
        driverId: driver.id,
        fullName: roomDriverVisibleLabel(driver.fullName),
        ...r.issuedCredentials,
      } : null);
      showToast("Yeni geçici PIN üretildi", "warn");
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetDevice(driver) {
    if (!driver?.id) return;
    const ok = window.confirm(`${roomDriverVisibleLabel(driver.fullName)} için kayıtlı cihaz bağı ve aktif erişimler sıfırlansın mı?\n\nBu işlemden sonra sürücü yeni cihazda tekrar giriş yapabilir. Gerekirse ardından yeni PIN üret.`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      const r = await api(`/api/drivers/${driver.id}/reset-device`, { method: "POST", token, body: {} });
      setIssuedCreds(null);
      showToast(r?.hadDeviceBinding ? "Cihaz bağı sıfırlandı" : "Kayıtlı cihaz bağı yoktu, erişim sıfırlandı", "warn");
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function copyIssuedCreds() {
    if (!issuedCreds?.driverCode || !issuedCreds?.temporaryPin) return;
    const text = `Sürücü Kodu: ${issuedCreds.driverCode}
Geçici PIN: ${issuedCreds.temporaryPin}`;
    navigator.clipboard?.writeText(text).then(() => showToast("Giriş bilgileri kopyalandı")).catch(() => showToast("Kopyalama açılamadı", "warn"));
  }

  function openEdit(d) {
    setErr("");
    setEditForm({
      id: d.id,
      fullName: d.fullName || "",
      phone: d.phone || "",
      deviceInfo: d.deviceInfo || "",
      backupDriverId: d.backupDriver?.id ? String(d.backupDriver.id) : "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm.id) return;
    setBusy(true);
    setErr("");
    try {
      const body = {
        fullName: upperTr(editForm.fullName),
        phone: String(editForm.phone || "").trim(),
        deviceInfo: upperTrOrNull(editForm.deviceInfo),
        backupDriverId: editForm.backupDriverId ? Number(editForm.backupDriverId) : null,
      };

      await api(`/api/drivers/${editForm.id}`, { method: "PUT", token, body });

      setEditOpen(false);
      showToast("Güncellendi");
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDriver(d) {
    const ok = window.confirm(`${roomDriverVisibleLabel(d.fullName)} sürücüsünü silmek istiyor musun? (Aktif vardiya varsa engellenir)`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/drivers/${d.id}`, { method: "DELETE", token });
      showToast("Silindi");
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const focusDriver = useMemo(
    () => drivers.find((x) => Number(x.id) === Number(focusDriverId)) ?? null,
    [drivers, focusDriverId]
  );
  const focusDriverLabel = roomDriverVisibleLabel(focusDriver?.fullName);

  useEffect(() => {
    if (!focusDriver) {
      clearCopilotSelection('/room/drivers');
      return;
    }
    const stat = driverStatus(focusDriver.id);
    const ops = stat || {};
    const boundVehicle = focusDriver?.boundVehicle || vehicles.find((v) => Number(v?.driverId || 0) === Number(focusDriver?.id || 0)) || null;
    setCopilotSelection({
      scopeKey: '/room/drivers',
      entityType: 'driver',
      entityId: Number(focusDriver?.id || 1105) || 1105,
      label: focusDriverLabel,
      summary: [focusDriverLabel, boundVehicle?.plate, ops?.assignmentState].filter(Boolean).join(' • '),
      fields: [
      { label: 'Ad Soyad', value: focusDriverLabel, help: 'Seçili sürücüyü gösterir.' },
        { label: 'Telefon', value: focusDriver?.phone || '-', help: 'Sürücünün telefon bilgisini gösterir.' },
        { label: 'Bölge', value: formatRegionOwnership(focusDriver?.regionOwnership), help: 'Sürücünün bağlı olduğu il / ilçe bilgisini gösterir.' },
        { label: 'Bağlı Araç', value: boundVehicle?.plate || '-', help: 'Sürücüye bağlı aracı gösterir.' },
        { label: 'Atama', value: ops?.assignmentState || '-', help: 'Sürücünün atama durumunu gösterir.' },
        { label: 'Eşleşme', value: ops?.connectionState || '-', help: 'Sürücünün araç eşleşme durumunu gösterir.' },
      ],
      badges: [
        { label: 'GPS', value: ops?.gpsUiState || '-', help: 'GPS görünürlüğünü gösterir.' },
      ],
      facts: { screenType: 'DRIVERS', stage: ops?.assignmentState || '-', nextBestAction: boundVehicle ? 'Önce bağlı araç ve atama durumunu oku. Sonra vardiya veya bağlantı sekmesine geç.' : 'Önce araca bağlı mı kontrol et. Sonra bağlantı ve GPS durumunu oku.' },
    });
  }, [focusDriver, focusDriverLabel, vehicles, driverStatus]);

  const focusStat = focusDriver ? driverStatus(focusDriver.id) : null;
  const focusOps = focusDriver ? driverOps(focusDriver) : null;
  const focusVehicle = focusStat?.vehicle ?? (focusDriver ? boundVehicleByDriverId.get(Number(focusDriver.id)) : null);


  async function createNoShow(driver, payload) {
    if (!driver?.id) return;
    setBusy(true);
    setErr("");
    try {
      await api.post('/api/penalties/no-show', { driverId: Number(driver.id), durationDays: Number(payload.durationDays || 1), reason: payload.reason || '' }, { token });
      setPenaltyOpenDriverId(0);
      showToast('Gelmedi kaydı eklendi', 'warn');
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const driverSummary = useMemo(() => {
    const total = Array.isArray(filteredDrivers) ? filteredDrivers.length : 0;
    const live = Array.isArray(visibleStatusDrivers) ? visibleStatusDrivers.length : 0;
    const bound = Array.isArray(filteredDrivers)
      ? filteredDrivers.filter((d) => Boolean(boundVehicleByDriverId.get(Number(d.id)))).length
      : 0;
    return { total, live, bound };
  }, [filteredDrivers, visibleStatusDrivers, boundVehicleByDriverId]);

  return (
    <div className="roomCriticalFixScope">
      <div className="card">
        <h3>Drivers</h3>
        <div className="muted">ROOM: sürücü yönetimi + operasyon + bağlantı</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div className="card">
          <div className="muted">Seçili sürücü</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{focusDriverLabel || "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Araç: {focusVehicle?.plate || "-"}</div>
        </div>
        <div className="card">
          <div className="muted">Operasyon özet</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{driverSummary.total} sürücü</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Canlı: {driverSummary.live} • Bağlı: {driverSummary.bound}</div>
        </div>
        <div className="card">
          <div className="muted">Bağlı araç</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{focusVehicle?.plate || "Bağlı araç yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Bağlı araç: <b>{focusVehicle?.plate || "-"}</b>
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {focusVehicle
              ? `Bağlı sürücü: ${focusDriverLabel || "-"}`
              : "Sürücü seçilince bağlı araç burada görünür."}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {focusVehicle
              ? `Readonly özet • ${focusStat ? `Durum: ${focusStat.uiLabel}` : "Eşleşme okunuyor"}`
              : "Araç bağlantısını Araçlar ekranında yönet."}
          </div>
          <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => navigate("/room/vehicles")}>
            Araç bağlantısını Araçlar ekranında yönet
          </button>
        </div>
      </div>

      {toast ? (
        <div className={`card ${toast.kind === "err" ? "err" : ""}`} style={{ borderLeft: "6px solid", padding: "10px 12px" }}>
          <b>{toast.kind === "warn" ? "⚠️ " : "✅ "}</b>
          {toast.text}
        </div>
      ) : null}

      {err ? <div className="card err">{err}</div> : null}

      {/* Tabs */}
      <div className="card">
        <PanelSegmentTabs
          ariaLabel="Sürücü bölümleri"
          tabs={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setErr("");
          }}
          compact
        />

        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label className="muted">Ara (ad/telefon/plaka/kod)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ali / 05xx / 34ABC / SRC-000123" />
          </div>

          <div>
            <label className="muted">GPS</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
              <option value="ALL">Hepsi</option>
              <option value="LIVE">Canlı</option>
              <option value="STALE">Düşük canlılık</option>
              <option value="OFFLINE">Çevrim dışı</option>
            </select>
          </div>

          <div>
            <label className="muted">Eşleşme</label>
            <select value={boundFilter} onChange={(e) => setBoundFilter(e.target.value)} disabled={busy}>
              <option value="ALL">Hepsi</option>
              <option value="BOUND">Bağlı</option>
              <option value="FREE">Boşta</option>
            </select>
          </div>

          <div className="muted" style={{ marginLeft: "auto" }}>
            Toplam {counts.total} • Araca bağlı {counts.bound} • Boşta {counts.free} • Bağlı {counts.connected} • Atanmış {counts.assigned} • Aktif {counts.active} • GPS canlı {counts.live} • Düşük canlılık {counts.stale} • Çevrim dışı {counts.offline}
          </div>
        </div>
        <ListSelectionBanner
          selectedLabel={focusDriverLabel || ""}
          selectedSummary={[focusVehicle?.plate, focusOps?.assignmentState, focusOps?.gpsLabel].filter(Boolean).join(" • ")}
          visibleCount={tab === "status" ? visibleStatusDrivers.length : filteredDrivers.length}
          totalCount={drivers.length}
          filterValue={`${q} ${statusFilter} ${boundFilter} ${statusColFilter.driver} ${statusColFilter.phone} ${statusColFilter.connection} ${statusColFilter.task} ${statusColFilter.vehicle} ${statusColFilter.gps}`.trim()}
          onClearFilter={() => { setQ(""); setStatusFilter("ALL"); setBoundFilter("ALL"); clearStatusColumnFilters(); }}
          helper="Copilot seçili sürücüyü kullanır."
        />
      </div>

      <RoomDriversQuickPenaltyCard
        filteredDrivers={filteredDrivers}
        focusDriverId={focusDriverId}
        setFocusDriverId={setFocusDriverId}
        penaltiesByDriverId={penaltiesByDriverId}
        penaltyOpenDriverId={penaltyOpenDriverId}
        setPenaltyOpenDriverId={setPenaltyOpenDriverId}
        busy={busy}
        createNoShow={createNoShow}
        displayDriverName={roomDriverVisibleLabel}
      />

      {/* DURUM */}
      {tab === "status" ? (
        <RoomDriversStatusTable
          visibleStatusDrivers={visibleStatusDrivers}
          focusDriverId={focusDriverId}
          setFocusDriverId={setFocusDriverId}
          statusColFilter={statusColFilter}
          setStatusColFilter={setStatusColFilter}
          clearStatusColumnFilters={clearStatusColumnFilters}
          driverStatus={driverStatus}
          penaltiesByDriverId={penaltiesByDriverId}
          fmtTR={fmtTR}
          driverOps={driverOps}
          connectionBadgeStatus={connectionBadgeStatus}
          assignmentBadgeStatus={assignmentBadgeStatus}
          gpsBadgeStatus={gpsBadgeStatus}
          displayDriverName={roomDriverVisibleLabel}
        />
      ) : null}

{/* YÖNETİM */}
      {tab === "manage" ? (
        <CollapsibleSection
          title="Yönetim detayları"
          subtitle="Yeni sürücü formu, giriş bilgileri ve liste işlemleri."
          badge={`${filteredDrivers.length}`}
          defaultOpen={false}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.45fr 1fr",
              gap: 12,
              alignItems: "start",
            }}
          >
          <div className="card">
            <h3>Yeni Sürücü</h3>
            <form onSubmit={createDriver} className="grid">
              <div className="col">
                <label className="muted">Ad Soyad</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ali Veli" />
              </div>
              <div className="col">
                <label className="muted">Telefon</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx..." />
              </div>
              <div className="col" style={{ gridColumn: "1 / -1" }}>
                <div className="muted">
                  Kaydedince sistem sürücü için otomatik <b>Sürücü Kodu</b> ve <b>Geçici PIN</b> üretir.
                  Sürücü girişte bunları kullanır.
                </div>
              </div>

              <div className="col" style={{ justifyContent: "end" }}>
                <button disabled={busy} type="submit">{busy ? "..." : "Ekle"}</button>
              </div>
            </form>
          </div>

          <div>
            {issuedCreds ? (
              <div className="card" style={{ marginBottom: 12, borderLeft: "5px solid #2563eb" }}>
                <h3 style={{ marginTop: 0 }}>Giriş Bilgileri</h3>
                <div><b>Sürücü:</b> {roomDriverVisibleLabel(issuedCreds.fullName) || "Sürücü kaydı"}</div>
                <div style={{ marginTop: 8 }}><b>Sistem kanıtı:</b> Hazır</div>
                <div style={{ marginTop: 4 }}><b>Geçici PIN:</b> {issuedCreds.temporaryPin || "-"}</div>
                <div className="muted" style={{ marginTop: 8 }}>
                  İlk girişte sürücü kendi yeni PIN'ini belirler.
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={copyIssuedCreds}>Kopyala</button>
                </div>
              </div>
            ) : null}

            <div className="card" style={{ overflowX: "auto" }}>
              <h3>Liste</h3>
              <table className="tbl" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Kayıt</th>
                    <th>Ad Soyad</th>
                    <th>Telefon</th>
                    <th>Sistem kanıtı</th>
                    <th>Araç</th>
                    <th>Durum</th>
                    <th>Vardiya</th>
                    <th>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((d) => {
                    const stat = driverStatus(d.id);
                    const bv = stat?.vehicle ?? null;

                    const shifts = d.currentShift || d.nextShift ? [] : (Array.isArray(bv?.shifts) ? bv.shifts : []);
                    const curNext = d.currentShift || d.nextShift
                      ? { current: d.currentShift ?? null, next: d.nextShift ?? null }
                      : pickCurrentNext(shifts);

                    const line = curNext.current
                      ? `Şimdi: ${curNext.current.company?.name || "-"} (${fmtTR(curNext.current.startAt)}–${fmtTR(curNext.current.endAt)})`
                      : curNext.next
                        ? `Sonra: ${curNext.next.company?.name || "-"} (${fmtTR(curNext.next.startAt)}–${fmtTR(curNext.next.endAt)})`
                        : "-";

                    return (
                      <tr key={d.id} data-selected={Number(focusDriverId || 0) === Number(d.id || 0) ? "true" : undefined} onClick={() => setFocusDriverId(Number(d.id) || 0)} style={rowSelectionStyle(Number(focusDriverId || 0) === Number(d.id || 0))}>
                        <td title="Sürücü kaydı">Sürücü kaydı</td>
                        <td><b>{roomDriverVisibleLabel(d.fullName)}</b></td>
                        <td>{d.phone}</td>
                        <td className="muted">
                          <span className="pill" data-status="APPROVED">Sistem kanıtı hazır</span>
                          {d.pinTemporary ? <div className="muted">Geçici PIN aktif</div> : null}
                          {d.user?.deviceId ? <div className="muted">Cihaz bağlı</div> : <div className="muted">Cihaz serbest</div>}
                        </td>
                        <td className="muted">{bv ? bv.plate : "-"}</td>
                        <td>
                          {stat ? (
                            <span className="pill" data-status={stat.pillKey}>{stat.uiLabel}</span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="muted">{line}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); setFocusDriverId(Number(d.id) || 0); openEdit(d); }}>Düzenle</button>
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); setFocusDriverId(Number(d.id) || 0); deleteDriver(d); }}>Sil</button>
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); setFocusDriverId(Number(d.id) || 0); resetPin(d); }}>PIN üret</button>
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); setFocusDriverId(Number(d.id) || 0); resetDevice(d); }}>Cihaz sıfırla</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="muted" style={{ marginTop: 8 }}>
                Not: Eşleşme ve görev bilgisi sürücü özetinden, GPS bilgisi ise araç telematiğinden türetilir.
              </div>
            </div>
          </div>
          </div>
        </CollapsibleSection>
      ) : null}

      {/* VARDİYALAR */}
      {tab === "shifts" ? (
        <RoomDriversShiftsTable
          filteredDrivers={filteredDrivers}
          focusDriverId={focusDriverId}
          setFocusDriverId={setFocusDriverId}
          driverStatus={driverStatus}
          fmtTR={fmtTR}
          pickCurrentNext={pickCurrentNext}
          rowSelectionStyle={rowSelectionStyle}
          displayDriverName={roomDriverVisibleLabel}
        />
      ) : null}

      {/* EDIT MODAL */}
      <RoomDriversEditModal
        editOpen={editOpen}
        busy={busy}
        setEditOpen={setEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        drivers={drivers}
        saveEdit={saveEdit}
        displayDriverName={roomDriverVisibleLabel}
      />
    </div>
  );
}
