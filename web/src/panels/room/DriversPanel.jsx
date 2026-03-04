// web/src/panels/room/DriversPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

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

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL|LIVE|STALE|OFFLINE
  const [boundFilter, setBoundFilter] = useState("ALL"); // ALL|BOUND|FREE

  // Create
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      if (!focusDriverId && Array.isArray(d) && d.length) setFocusDriverId(Number(d[0].id));
    } catch (e) {
      setErr(String(e?.payload?.message || e?.message || e));
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

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

  const filteredDrivers = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return (drivers || [])
      .filter((d) => {
        if (!d) return false;

        const name = String(d.fullName || "").toLowerCase();
        const ph = String(d.phone || "").toLowerCase();
        const bv = boundVehicleByDriverId.get(Number(d.id)) ?? null;
        const plate = bv ? String(bv.plate || "").toLowerCase() : "";

        if (qq && !(name.includes(qq) || ph.includes(qq) || plate.includes(qq))) return false;

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
    let online = 0;
    let stale = 0;
    let offline = 0;

    for (const d of drivers) {
      const stat = driverStatus(d.id);
      const bv = boundVehicleByDriverId.get(Number(d.id)) ?? null;
      if (bv) bound++;
      if (stat?.ui === "LIVE") online++;
      if (stat?.ui === "STALE") stale++;
      if (stat?.ui === "OFFLINE") offline++;
    }

    return { total, bound, free: total - bound, online, stale, offline };
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
      if (email.trim() && password.trim()) {
        body.email = email.trim();
        body.password = password.trim();
      }

      await api("/api/drivers", { method: "POST", token, body });

      setFullName("");
      setPhone("");
      setDeviceInfo("");
      setEmail("");
      setPassword("");

      showToast("Sürücü eklendi");
      await load();
    } catch (e2) {
      setErr(String(e2?.payload?.message || e2?.message || e2));
    } finally {
      setBusy(false);
    }
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
      setErr(String(e?.payload?.message || e?.message || e));
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
      setErr(String(e?.payload?.message || e?.message || e));
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
      setErr(String(e?.payload?.message || e?.message || e));
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
      setErr(String(e?.payload?.message || e?.message || e));
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
            <label className="muted">Ara (ad/telefon/plaka)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ali / 05xx / 34ABC..." />
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

          <div>
            <label className="muted">Bağlantı</label>
            <select value={boundFilter} onChange={(e) => setBoundFilter(e.target.value)} disabled={busy}>
              <option value="ALL">Hepsi</option>
              <option value="BOUND">Bağlı</option>
              <option value="FREE">Boşta</option>
            </select>
          </div>

          <div className="muted" style={{ marginLeft: "auto" }}>
            Toplam {counts.total} • Bağlı {counts.bound} • Boşta {counts.free} • ONLINE {counts.online} • STALE {counts.stale} • OFFLINE {counts.offline}
          </div>
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
                <th>Araç</th>
                <th>Durum</th>
                <th>Son GPS</th>
                <th>Hız</th>
                <th>Konum</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d) => {
                const stat = driverStatus(d.id);
                const bv = stat?.vehicle ?? null;

                return (
                  <tr key={d.id}>
                    <td>
                      <b>{d.fullName}</b>
                      <div className="muted">#{d.id}</div>
                    </td>
                    <td>{d.phone}</td>
                    <td className="muted">{bv ? bv.plate : "-"}</td>
                    <td>
                      {stat ? (
                        <span className="pill" data-status={stat.pillKey}>
                          {stat.ui}
                        </span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="muted">{bv?.gpsLast?.at ? String(bv.gpsLast.at) : "-"}</td>
                    <td className="muted">{bv?.gpsLast?.speed != null ? `${bv.gpsLast.speed} km/h` : "-"}</td>
                    <td className="muted">{bv?.gpsLast ? `${bv.gpsLast.lat.toFixed(4)}, ${bv.gpsLast.lng.toFixed(4)}` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* YÖNETİM */}
      {tab === "manage" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.45fr 1fr", // ✅ Yeni sürücü geniş
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
              <div className="col">
                <label className="muted">Cihaz</label>
                <input value={deviceInfo} onChange={(e) => setDeviceInfo(e.target.value)} placeholder="Android / iOS / tracker" />
              </div>

              <div className="col">
                <label className="muted">Login e-posta (ops.)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="driver2@demo.com" />
              </div>
              <div className="col">
                <label className="muted">Login şifre (ops.)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" />
              </div>

              <div className="col" style={{ justifyContent: "end" }}>
                <button disabled={busy} type="submit">{busy ? "..." : "Ekle"}</button>
              </div>
            </form>
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <h3>Liste</h3>
            <table className="tbl" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad Soyad</th>
                  <th>Telefon</th>
                  <th>Login</th>
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

                  // vardiya özet
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
                      <td className="muted">{d.user?.email || "-"}</td>
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
              Not: Durum ve vardiya bilgisi “bağlı araç” üzerinden türetilir.
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
            V1: vardiya listesi “bağlı aracın shifts[]” üzerinden okunuyor. Daha sonra driver bazlı endpoint ile güçlendiririz.
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
              Login email/şifre düzenleme V1’de yok (istersen ayrıca ekleriz).
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
