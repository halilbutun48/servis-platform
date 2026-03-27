// web/src/panels/room/DriversPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
import DriverPenaltyBadge from "../../components/driver/DriverPenaltyBadge";
import DriverPenaltyForm from "../../components/driver/DriverPenaltyForm";

const TABS = [
  { key: "status", label: "Durum" },
  { key: "manage", label: "Yönetim" },
  { key: "shifts", label: "Vardiyalar" },
  { key: "link", label: "Bağlantı" },
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

  // Link tab (driver -> vehicle selection)
  const [focusDriverId, setFocusDriverId] = useState(0);
  const [selVehicleId, setSelVehicleId] = useState("");

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(timer);
  }, [token]); // eslint-disable-line

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

  function driverStatus(driverId) {
    const bv = boundVehicleByDriverId.get(Number(driverId)) ?? null;
    if (!bv) return null;
    const ui = uiStatusFromVehicle(bv);
    return { ui, pillKey: pillKeyFromUi(ui), vehicle: bv };
  }

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
  }, [drivers, q, statusFilter, boundFilter, boundVehicleByDriverId]);

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
  }, [drivers, boundVehicleByDriverId]);

  async function createDriver(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        deviceInfo: deviceInfo.trim(),
      };

      const created = await api("/api/drivers", { method: "POST", token, body });

      setFullName("");
      setPhone("");
      setDeviceInfo("");
      setIssuedCreds(created?.issuedCredentials ? {
        driverId: created?.id,
        fullName: created?.fullName,
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
        fullName: driver.fullName,
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
    const ok = window.confirm(`${driver.fullName} için kayıtlı cihaz bağı ve aktif erişimler sıfırlansın mı?\n\nBu işlemden sonra sürücü yeni cihazda tekrar giriş yapabilir. Gerekirse ardından yeni PIN üret.`);
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
        fullName: String(editForm.fullName || "").trim(),
        phone: String(editForm.phone || "").trim(),
        deviceInfo: String(editForm.deviceInfo || "").trim(),
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
    const ok = window.confirm(`${d.fullName} sürücüsünü silmek istiyor musun? (Aktif vardiya varsa engellenir)`);
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

  // Bind / Unbind uses vehicle endpoint
  async function bindDriverToVehicle(driverId, vehicleId) {
    const bv = boundVehicleByDriverId.get(Number(driverId)) ?? null;
    const target = vehicles.find((x) => Number(x.id) === Number(vehicleId));

    if (!target) {
      setErr("Seçilen araç bulunamadı");
      return;
    }
    if (target.archivedAt) {
      setErr("Arşivli araçta işlem yapılamaz");
      return;
    }

    // if target vehicle already has a different driver, overwrite warning
    const existingDriverId = target.driverId ?? target.driver?.id ?? null;
    if (existingDriverId && Number(existingDriverId) !== Number(driverId)) {
      const ok = window.confirm(`Bu araç zaten başka sürücüye bağlı (#${existingDriverId}). Üzerine yazılsın mı?`);
      if (!ok) return;
    }

    setBusy(true);
    setErr("");
    try {
      // If driver currently bound to a different vehicle, detach first
      if (bv && Number(bv.id) !== Number(vehicleId)) {
        await api(`/api/vehicles/${bv.id}/bind-driver`, {
          method: "PUT",
          token,
          body: { driverId: null },
        });
      }

      await api(`/api/vehicles/${vehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId: Number(driverId) },
      });

      showToast("Bağlandı");
      await load();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function unbindDriver(driverId) {
    const bv = boundVehicleByDriverId.get(Number(driverId)) ?? null;
    if (!bv) {
      setErr("Bu sürücünün bağlı aracı yok");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/vehicles/${bv.id}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId: null },
      });

      showToast("Bağlantı kaldırıldı", "warn");
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

  const focusStat = focusDriver ? driverStatus(focusDriver.id) : null;
  const focusVehicle = focusStat?.vehicle ?? (focusDriver ? boundVehicleByDriverId.get(Number(focusDriver.id)) : null);

  // shifts source: backend fields or boundVehicle.shifts or empty
  const focusShifts = useMemo(() => {
    if (!focusDriver) return [];
    if (focusDriver.currentShift || focusDriver.nextShift) {
      const arr = [];
      if (focusDriver.currentShift) arr.push(focusDriver.currentShift);
      if (focusDriver.nextShift) arr.push(focusDriver.nextShift);
      return arr;
    }
    const bv = focusVehicle;
    return Array.isArray(bv?.shifts) ? bv.shifts : [];
  }, [focusDriver, focusVehicle]);


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

  const focusCurNext = useMemo(() => {
    // if backend already gave current/next use them
    if (focusDriver?.currentShift || focusDriver?.nextShift) {
      return { current: focusDriver.currentShift ?? null, next: focusDriver.nextShift ?? null };
    }
    return pickCurrentNext(focusShifts);
  }, [focusDriver, focusShifts]);

  return (
    <div>
      <div className="card">
        <h3>Drivers</h3>
        <div className="muted">ROOM: sürücü yönetimi + operasyon + bağlantı</div>
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={busy}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? "btn primary" : "btn"}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label className="muted">Ara (ad/telefon/plaka/kod)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ali / 05xx / 34ABC / SRC-000123" />
          </div>

          <div>
            <label className="muted">GPS</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
              <option value="ALL">Hepsi</option>
              <option value="LIVE">ONLINE</option>
              <option value="STALE">STALE</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          </div>

          <div>
            <label className="muted">Bağlantı</label>
            <select value={boundFilter} onChange={(e) => setBoundFilter(e.target.value)} disabled={busy}>
              <option value="ALL">Hepsi</option>
              <option value="BOUND">Bağlı</option>
              <option value="FREE">Boşta</option>
            </select>
          </div>

          <div className="muted" style={{ marginLeft: "auto" }}>
            Toplam {counts.total} • Araca bağlı {counts.bound} • Boşta {counts.free} • Bağlı {counts.connected} • Atanmış {counts.assigned} • Aktif {counts.active} • GPS canlı {counts.live} • STALE {counts.stale} • OFFLINE {counts.offline}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Hızlı Gelmedi Kaydı</h3>
        <div className="muted">İlk 12 sürücü üzerinden hızlı kayıt ekleme</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {filteredDrivers.slice(0, 12).map((d) => (
            <div key={`pen-${d.id}`} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--line, #eee)", paddingBottom: 8 }}>
              <b>{d.fullName}</b>
              <span className="muted">{d.phone || "-"}</span>
              <DriverPenaltyBadge item={penaltiesByDriverId[d.id]} />
              <button type="button" className="btn" onClick={() => setPenaltyOpenDriverId((p) => p === Number(d.id) ? 0 : Number(d.id))}>Gelmedi kaydı</button>
              {penaltyOpenDriverId === Number(d.id) ? <div style={{ width: "100%" }}><DriverPenaltyForm driver={d} busy={busy} onSubmit={(payload) => createNoShow(d, payload)} /></div> : null}
            </div>
          ))}
        </div>
      </div>

      {/* DURUM */}
      {tab === "status" ? (
        <div className="card">
          <h3>Operasyon Durumu</h3>
          <table className="tbl">
            <thead>
              <tr>
                <th>Sürücü</th>
                <th>Telefon</th>
                <th>Bağlantı</th>
                <th>Görev</th>
                <th>Araç</th>
                <th>GPS</th>
                <th>Son GPS</th>
                <th>Konum</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d) => {
                const stat = driverStatus(d.id);
                const bv = stat?.vehicle ?? d?.boundVehicle ?? null;
                const ops = driverOps(d);

                return (
                  <tr key={d.id}>
                    <td>
                      <b>{d.fullName}</b> <DriverPenaltyBadge item={penaltiesByDriverId[d.id]} />
                      <div className="muted">#{d.id}</div>
                    </td>
                    <td>{d.phone}</td>
                    <td>
                      <span className="pill" data-status={connectionBadgeStatus(ops)}>{ops.connectionLabel}</span>
                      <div className="muted">{fmtTR(d?.user?.deviceLastSeenAt)}</div>
                    </td>
                    <td>
                      <span className="pill" data-status={assignmentBadgeStatus(ops)}>{ops.assignmentLabel}</span>
                      <div className="muted">{d?.currentShift ? `Current #${d.currentShift.id}` : d?.nextShift ? `Next #${d.nextShift.id}` : '-'}</div>
                    </td>
                    <td className="muted">{bv ? bv.plate : '-'}</td>
                    <td>
                      <span className="pill" data-status={gpsBadgeStatus(ops, stat)}>{ops.gpsLabel}</span>
                    </td>
                    <td className="muted">{bv?.gpsLast?.at ? fmtTR(bv.gpsLast.at) : '-'}</td>
                    <td className="muted">{bv?.gpsLast?.lat != null && bv?.gpsLast?.lng != null ? `${Number(bv.gpsLast.lat).toFixed(5)}, ${Number(bv.gpsLast.lng).toFixed(5)}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="muted" style={{ marginTop: 8 }}>
            Not: Bağlantı, görev ve GPS durumu artık ayrı gösterilir. GPS yok olması sürücünün giriş yapmadığı anlamına gelmez.
          </div>
        </div>
      ) : null}

{/* YÖNETİM */}
      {tab === "manage" ? (
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
                <div><b>Sürücü:</b> {issuedCreds.fullName || `#${issuedCreds.driverId}`}</div>
                <div style={{ marginTop: 8 }}><b>Sürücü Kodu:</b> {issuedCreds.driverCode || "-"}</div>
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
                    <th>ID</th>
                    <th>Ad Soyad</th>
                    <th>Telefon</th>
                    <th>Sürücü Kodu</th>
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
                      <tr key={d.id}>
                        <td>{d.id}</td>
                        <td><b>{d.fullName}</b></td>
                        <td>{d.phone}</td>
                        <td className="muted">
                          {d.driverCode || "-"}
                          {d.pinTemporary ? <div className="muted">Geçici PIN aktif</div> : null}
                          {d.user?.deviceId ? <div className="muted">Cihaz bağlı</div> : <div className="muted">Cihaz serbest</div>}
                        </td>
                        <td className="muted">{bv ? bv.plate : "-"}</td>
                        <td>
                          {stat ? (
                            <span className="pill" data-status={stat.pillKey}>{stat.ui}</span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="muted">{line}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" disabled={busy} onClick={() => openEdit(d)}>Düzenle</button>
                          <button type="button" disabled={busy} onClick={() => deleteDriver(d)}>Sil</button>
                          <button type="button" disabled={busy} onClick={() => resetPin(d)}>PIN üret</button>
                          <button type="button" disabled={busy} onClick={() => resetDevice(d)}>Cihaz sıfırla</button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setFocusDriverId(Number(d.id));
                              setTab("link");
                            }}
                          >
                            Bağlantı
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="muted" style={{ marginTop: 8 }}>
                Not: Bağlantı ve görev bilgisi sürücü özetinden, GPS bilgisi ise araç telematiğinden türetilir.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* VARDİYALAR */}
      {tab === "shifts" ? (
        <div className="card">
          <h3>Vardiyalar (Sürücü Bazlı)</h3>

          <table className="tbl">
            <thead>
              <tr>
                <th>Sürücü</th>
                <th>Araç</th>
                <th>Current</th>
                <th>Next</th>
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

                const curText = curNext.current
                  ? `${curNext.current.company?.name || "-"} • ${fmtTR(curNext.current.startAt)}–${fmtTR(curNext.current.endAt)} • ${curNext.current.status}`
                  : "-";

                const nextText = curNext.next
                  ? `${curNext.next.company?.name || "-"} • ${fmtTR(curNext.next.startAt)}–${fmtTR(curNext.next.endAt)} • ${curNext.next.status}`
                  : "-";

                return (
                  <tr key={d.id}>
                    <td><b>{d.fullName}</b></td>
                    <td className="muted">{bv ? bv.plate : "-"}</td>
                    <td className="muted">{curText}</td>
                    <td className="muted">{nextText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="muted" style={{ marginTop: 10 }}>
            Geçici not: vardiya listesi şu an bağlı aracın <code>shifts[]</code> alanından okunuyor. Sonraki adımda sürücü bazlı endpoint ile güçlenecek.
          </div>
        </div>
      ) : null}

      {/* BAĞLANTI */}
      {tab === "link" ? (
        <div className="card">
          <h3>Bağlantı (Sürücü ↔ Araç)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            <div>
              <label className="muted">Sürücü</label>
              <select
                value={String(focusDriverId || "")}
                onChange={(e) => setFocusDriverId(Number(e.target.value || 0))}
                disabled={busy}
                style={{ width: "100%" }}
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} (#{d.id})
                  </option>
                ))}
              </select>

              <div className="muted" style={{ marginTop: 10 }}>
                Mevcut araç: <b>{focusVehicle?.plate || "-"}</b>{" "}
                {focusStat ? (
                  <span className="pill" data-status={focusStat.pillKey} style={{ marginLeft: 8 }}>
                    {focusStat.ui}
                  </span>
                ) : null}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy || !focusDriverId || !focusVehicle} onClick={() => unbindDriver(focusDriverId)}>
                  Ayır
                </button>
              </div>

              <div className="muted" style={{ marginTop: 10 }}>
                Current: {focusCurNext.current ? `${focusCurNext.current.company?.name || "-"} • ${fmtTR(focusCurNext.current.startAt)}–${fmtTR(focusCurNext.current.endAt)}` : "-"}
                <br />
                Next: {focusCurNext.next ? `${focusCurNext.next.company?.name || "-"} • ${fmtTR(focusCurNext.next.startAt)}–${fmtTR(focusCurNext.next.endAt)}` : "-"}
              </div>
            </div>

            <div className="card" style={{ margin: 0 }}>
              <h3 style={{ marginTop: 0 }}>Yeni Araç Seç</h3>

              <label className="muted">Araç</label>
              <select
                value={selVehicleId}
                onChange={(e) => setSelVehicleId(e.target.value)}
                disabled={busy}
                style={{ width: "100%" }}
              >
                <option value="">— araç seç —</option>
                {vehicles
                  .filter((v) => !v.archivedAt)
                  .map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.plate} (#{v.id}) {v.driverId ? `• bağlı (#${v.driverId})` : ""}
                    </option>
                  ))}
              </select>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy || !focusDriverId || !selVehicleId}
                  onClick={() => bindDriverToVehicle(focusDriverId, Number(selVehicleId))}
                >
                  Bağla
                </button>
              </div>

              <div className="muted" style={{ marginTop: 10 }}>
                Not: Seçtiğin araç başka sürücüye bağlıysa uyarı verip üzerine yazdırır.
              </div>
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
          <div className="card" style={{ width: "min(820px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3>Sürücü Düzenle</h3>
              <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>
                Kapat
              </button>
            </div>

            <div className="grid" style={{ marginTop: 8 }}>
              <div className="col">
                <label className="muted">Ad Soyad</label>
                <input value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="col">
                <label className="muted">Telefon</label>
                <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="col">
                <label className="muted">Cihaz</label>
                <input value={editForm.deviceInfo} onChange={(e) => setEditForm((p) => ({ ...p, deviceInfo: e.target.value }))} />
              </div>

              <div className="col">
                <label className="muted">Backup sürücü (ops.)</label>
                <select
                  value={String(editForm.backupDriverId ?? "")}
                  onChange={(e) => setEditForm((p) => ({ ...p, backupDriverId: e.target.value }))}
                >
                  <option value="">— seçme —</option>
                  {drivers
                    .filter((x) => Number(x.id) !== Number(editForm.id))
                    .map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.fullName} (#{d.id})
                      </option>
                    ))}
                </select>
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

            <div className="muted" style={{ marginTop: 10 }}>
              Sürücü için giriş modeli artık Sürücü Kodu + PIN. Buradan temel bilgileri düzenlersin; yeni geçici PIN üretme ve cihaz sıfırlama listeden yapılır.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
