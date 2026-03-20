// web/src/panels/room/OffersPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";
import RoutePreviewModal from "../../components/RoutePreviewModal";

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

function formatTRY(amount) {
  if (amount == null) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR").format(n);
}

function pill(status) {
  const s = String(status || "");
  return (
    <span className="pill" data-status={s} title={s}>
      {s}
    </span>
  );
}

function toPositiveIntOrZero(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function shiftRequiredPax(shift) {
  return Math.max(
    toPositiveIntOrZero(shift?.requiredPax),
    toPositiveIntOrZero(shift?.assignmentCount),
    toPositiveIntOrZero(shift?.peopleCount),
    toPositiveIntOrZero(shift?.orgPassengerCount),
    0
  );
}

function vehicleCapacityValue(vehicle) {
  return toPositiveIntOrZero(vehicle?.capacity);
}

function buildCapacityMeta({ shift, vehicle }) {
  const requiredPax = shiftRequiredPax(shift);
  const vehicleCapacity = vehicleCapacityValue(vehicle);
  const missingCapacity = requiredPax > 0 ? Math.max(0, requiredPax - vehicleCapacity) : 0;
  const insufficient = requiredPax > 0 && vehicleCapacity < requiredPax;
  const minVehicleCount = requiredPax > 0 && vehicleCapacity > 0 ? Math.ceil(requiredPax / vehicleCapacity) : null;

  let blockMessage = "";
  if (requiredPax > 0 && vehicle && vehicleCapacity <= 0) {
    blockMessage = `Araç kapasitesi tanımsız. Gerekli yolcu: ${requiredPax}.`;
  } else if (insufficient) {
    blockMessage = `Yetersiz kapasite. Gerekli: ${requiredPax}, araç: ${vehicleCapacity}, eksik: ${missingCapacity}.`;
  }

  return {
    requiredPax,
    vehicleCapacity,
    missingCapacity,
    insufficient,
    minVehicleCount,
    blockMessage,
  };
}

function poolStatusMeta(data) {
  const reason = String(data?.limitingReason || "").toUpperCase();
  if (data?.enoughPoolCapacity) return { key: "OK", label: "HAVUZ YETER" };
  if (reason === "DRIVER_SHORTAGE") return { key: "CAPACITY_INSUFFICIENT", label: "DRIVER YETERSİZ" };
  if (reason === "VEHICLE_CAPACITY") return { key: "REJECTED", label: "ARAÇ YETERSİZ" };
  return { key: "REJECTED", label: "HAVUZ YETMEZ" };
}

function blockedDriverReasonText(d) {
  if (!d) return "";
  if (d.reasonMessage) return String(d.reasonMessage);
  if (d.reasonCode === "DRIVER_SHIFT_CONFLICT") return "Başka vardiya ile çakışıyor";
  if (d.reasonCode === "DRIVER_AGREEMENT_CONFLICT") return "Agreement ile çakışıyor";
  return d.reasonCode ? String(d.reasonCode) : "Bloklu";
}

const FILTERS = [
  { key: "OPEN,COUNTERED", label: "Açık (OPEN+COUNTERED)" },
  { key: "OPEN", label: "Sadece OPEN" },
  { key: "COUNTERED", label: "Sadece COUNTERED" },
  { key: "ACCEPTED", label: "ACCEPTED" },
  { key: "CANCELLED", label: "CANCELLED" },
  { key: "", label: "Tümü" },
];

export default function RoomOffersPanel() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ✅ M46: bulk/package counter (select many offers -> one counter)
  const [sel, setSel] = useState({}); // { [offerId]: true }
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNote, setBulkNote] = useState("");

  // ✅ M30: Accepted offer -> quick approve
  // ✅ M31: Approve + Start (single click)
  const [approveModal, setApproveModal] = useState({
    open: false,
    shiftId: null,
    offerId: null,
    vehicleId: "",
    driverId: "",
  });
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [poolSummary, setPoolSummary] = useState({ status: "idle", data: null, error: "" });
  const poolInflight = useRef(false);

  const [statusFilter, setStatusFilter] = useState("OPEN,COUNTERED");
  const [q, setQ] = useState("");

  // per-offer counter input
  const [counterSel, setCounterSel] = useState({}); // { [offerId]: { amountRoom, noteRoom } }
  const [previewModal, setPreviewModal] = useState({ open: false, shiftId: null });

  function setCounter(offerId, patch) {
    setCounterSel((p) => ({
      ...p,
      [offerId]: { ...(p[offerId] || {}), ...(patch || {}) },
    }));
  }

  async function load() {
    setErr("");
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&take=200` : "?take=200";
      const r = await api.get(`/api/offers/inbox${qs}`);
      setItems(r?.items || []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  async function loadAssets() {
    try {
      const [v, d] = await Promise.all([api.get("/api/vehicles"), api.get("/api/drivers")]);
      setVehicles(Array.isArray(v) ? v : v?.items ?? []);
      setDrivers(Array.isArray(d) ? d : d?.items ?? []);
    } catch {
      setVehicles([]);
      setDrivers([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useAutoReload("offers", load, true);

  const filtered = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();
    if (!qq) return items;
    return (items || []).filter((o) => {
      const shift = o.shift || {};
      const company = shift?.company || {};
      const hay = [
        o.id,
        o.shiftId,
        o.status,
        company?.name,
        shift?.companyId,
        shift?.status, // ✅ shift status searchable
        o.noteCompany,
        o.noteRoom,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q]);

  const selectedIds = useMemo(() => {
    return Object.entries(sel)
      .filter(([, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((x) => Number.isFinite(x) && x > 0);
  }, [sel]);

  function toggleAllFiltered() {
    const next = {};
    for (const o of filtered) {
      if (o.status === "CANCELLED" || o.status === "ACCEPTED") continue;
      next[o.id] = true;
    }
    setSel(next);
  }

  async function onBulkCounter() {
    const ids = selectedIds;
    const amountRoom = bulkAmount == null || bulkAmount === "" ? undefined : Number(bulkAmount);
    const noteRoom = String(bulkNote || "").trim() || undefined;

    if (!ids.length) return setErr("Önce en az 1 teklif seç.");
    if (!Number.isFinite(amountRoom) || amountRoom <= 0) return setErr("Paket karşı teklif amount gerekli.");

    setBusy(true);
    setErr("");
    try {
      await api.post(`/api/offers/bulk-counter`, { offerIds: ids, amountRoom, noteRoom });
      setSel({});
      setBulkAmount("");
      setBulkNote("");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }


  async function acceptCounterOffer(offerId, { navigatePending = true } = {}) {
    const oid = Number(offerId);
    if (!oid) return;
    setBusy(true);
    setErr("");
    try {
      const res = await api.put(`/api/offers/${oid}/room-accept`, {});
      const sid = Number(res?.shift?.id || res?.shiftId || 0);
      await load();
      if (navigatePending && sid > 0) {
        localStorage.setItem("room:focusPendingShiftId", String(sid));
        navigate("/room/shifts");
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function acceptSelectedPackage() {
    const ids = selectedIds;
    if (!ids.length) return setErr("Önce kabul edeceğin teklifleri seç.");
    setBusy(true);
    setErr("");
    try {
      let firstShiftId = 0;
      for (const oid of ids) {
        const res = await api.put(`/api/offers/${oid}/room-accept`, {});
        if (!firstShiftId) firstShiftId = Number(res?.shift?.id || res?.shiftId || 0);
      }
      setSel({});
      await load();
      if (firstShiftId > 0) {
        localStorage.setItem("room:focusPendingShiftId", String(firstShiftId));
        navigate("/room/shifts");
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onCounter(offerId) {
    const st = counterSel[offerId] || {};
    const amountRoom = st.amountRoom == null || st.amountRoom === "" ? undefined : Number(st.amountRoom);
    const noteRoom = String(st.noteRoom || "").trim() || undefined;

    setBusy(true);
    setErr("");
    try {
      await api.put(`/api/offers/${offerId}/counter`, { amountRoom, noteRoom });
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function goShift(shiftId) {
    const sid = Number(shiftId);
    if (!sid) return;
    localStorage.setItem("room:focusShiftId", String(sid));
    navigate("/room/shifts");
  }

  function goPendingShift(shiftId) {
    const sid = Number(shiftId);
    if (!sid) return;
    localStorage.setItem("room:focusPendingShiftId", String(sid));
    navigate("/room/shifts");
  }

  async function openApprove(o) {
    const sid = Number(o?.shiftId);
    if (!sid) return;
    setErr("");
    await loadAssets();
    setApproveModal({ open: true, shiftId: sid, offerId: Number(o?.id) || null, vehicleId: "", driverId: "" });
  }

  async function loadPoolSummary(shiftId, { force = false } = {}) {
    const sid = Number(shiftId || approveModal.shiftId);
    if (!sid) return null;
    if (!force && poolSummary?.status === "ok" && Number(poolSummary?.data?.shiftId) === sid) return poolSummary.data;
    if (poolInflight.current) return null;

    poolInflight.current = true;
    setPoolSummary((prev) => ({ ...prev, status: "loading", error: "" }));
    try {
      const data = await api.get(`/api/availability/pool?shiftId=${sid}`);
      setPoolSummary({ status: "ok", data, error: "" });
      return data;
    } catch (e) {
      const msg = String(e?.message || e || "Havuz özeti alınamadı.");
      setPoolSummary({ status: "error", data: null, error: msg });
      return null;
    } finally {
      poolInflight.current = false;
    }
  }

  async function doApprove({ startAfter = false } = {}) {
    const sid = Number(approveModal.shiftId);
    const vid = Number(approveModal.vehicleId);
    const did = Number(approveModal.driverId);
    if (!sid || !vid || !did) {
      setErr("Approve için vehicle + driver seçmelisin.");
      return;
    }

    const shift = items.find((o) => Number(o?.shiftId) === sid)?.shift || null;
    const vehicle = vehicles.find((v) => Number(v.id) === vid) || null;
    const capacityMeta = buildCapacityMeta({ shift, vehicle });
    if (capacityMeta.blockMessage) {
      setErr(capacityMeta.blockMessage);
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api.put(`/api/shifts/${sid}/approve`, { vehicleId: vid, driverId: did });

      // ✅ M31: tek tık "Onayla + Başlat"
      if (startAfter) {
        await api.post(`/api/shifts/${sid}/start`, {});
      }

      setApproveModal((p) => ({ ...p, open: false }));
      localStorage.setItem("room:focusShiftId", String(sid));
      await load();
      navigate("/room/shifts");
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const sid = Number(approveModal.shiftId || 0);
    if (!approveModal.open || !sid) {
      setPoolSummary({ status: "idle", data: null, error: "" });
      return;
    }

    const modalShift = items.find((o) => Number(o?.shiftId) === sid)?.shift || null;
    const modalVehicle = vehicles.find((v) => Number(v.id) === Number(approveModal.vehicleId)) || null;
    const capacityMeta = buildCapacityMeta({ shift: modalShift, vehicle: modalVehicle });
    if (capacityMeta.insufficient) loadPoolSummary(sid);
  }, [approveModal.open, approveModal.shiftId, approveModal.vehicleId, items, vehicles]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Offers (Gelen Teklifler)</div>
        <div className="muted">Company tarafının gönderdiği market shift teklifleri.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="muted">Toplam: {filtered.length}</div>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Durum
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
                {FILTERS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (company / shiftId / shiftStatus / not...)"
              style={{ minWidth: 240 }}
            />
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn sm ghost" disabled={busy} onClick={toggleAllFiltered} title="OPEN+COUNTERED olanları seçer">
              Hepsini Seç
            </button>
            <input
              value={bulkAmount}
              onChange={(e) => setBulkAmount(e.target.value)}
              placeholder="Paket karşı teklif (₺)"
              style={{ width: 180 }}
            />
            <input
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Paket not (ops)"
              style={{ minWidth: 240 }}
            />
            <button className="btn" disabled={busy || !selectedIds.length} onClick={onBulkCounter}>
              Pakete Counter ({selectedIds.length})
            </button>
            <button className="btn" disabled={busy || !selectedIds.length} onClick={acceptSelectedPackage} title="Seçili company karşı tekliflerini kabul edip ilgili bekleyen taleplere geç">
              Paketi Kabul Et ve Bekleyen Taleplere Geç
            </button>
            <button className="btn" disabled={busy} onClick={load}>
              Yenile
            </button>
          </div>
        </div>
      </div>

      {filtered.map((o) => {
        const shift = o.shift || {};
        const company = shift?.company;
        const c = counterSel[o.id] || {};
        const canCounter = o.status !== "CANCELLED" && o.status !== "ACCEPTED";

        const canQuickApprove = String(o.status) === "ACCEPTED" && ["REQUESTED"].includes(String(shift?.status || ""));

        return (
          <div className="card" key={o.id}>
            <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  Shift #{o.shiftId} — {company?.name || `Company #${shift?.companyId || "?"}`}
                </div>
                <div className="muted">
                  {fmtTR(shift?.startAt)} → {fmtTR(shift?.endAt)}
                </div>
              </div>
              <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }} title="Pakete dahil et">
                  <input
                    type="checkbox"
                    disabled={!canCounter || busy}
                    checked={!!sel[o.id]}
                    onChange={(e) => setSel((p) => ({ ...p, [o.id]: e.target.checked }))}
                  />
                  Seç
                </label>
                {pill(o.status)}
                {pill(shift?.status)}
                <button type="button" className="btn sm" disabled={busy} onClick={() => goShift(o.shiftId)}>
                  Shift’e Git
                </button>
                <button type="button" className="btn sm" disabled={busy} onClick={() => setPreviewModal({ open: true, shiftId: Number(o.shiftId) || null })}>
                  Harita Önizle
                </button>

                {String(o.status || "").toUpperCase() === "COUNTERED" ? (
                  <button type="button" className="btn" disabled={busy} onClick={() => acceptCounterOffer(o.id)} title="Kabul et → ilgili bekleyen talebe geç → araç ve sürücü seç">
                    Kabul Et ve Bekleyen Taleplere Geç
                  </button>
                ) : null}

                {canQuickApprove ? (
                  <button type="button" className="btn" disabled={busy} onClick={() => goPendingShift(o.shiftId)} title="Bekleyen Taleplere git → araç ve sürücü seç → approve et">
                    Bekleyen Taleplere Git
                  </button>
                ) : null}
              </div>
            </div>

            <hr />

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div className="muted">
                Company: <b>{formatTRY(o.amountCompany)}</b>
              </div>
              <div className="muted">
                Room: <b>{formatTRY(o.amountRoom)}</b>
              </div>
            </div>

            {o.noteCompany ? <div className="muted">Not (Company): {o.noteCompany}</div> : null}
            {o.noteRoom ? <div className="muted">Not (Room): {o.noteRoom}</div> : null}

            {canCounter ? (
              <>
                <hr />
                <div className="row" style={{ gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <div className="col" style={{ minWidth: 160 }}>
                    <label className="muted">Karşı Teklif (TL)</label>
                    <input
                      value={c.amountRoom ?? ""}
                      onChange={(e) => setCounter(o.id, { amountRoom: e.target.value })}
                      placeholder="örn 12500"
                    />
                  </div>
                  <div className="col" style={{ flex: 1, minWidth: 220 }}>
                    <label className="muted">Not</label>
                    <input
                      value={c.noteRoom ?? ""}
                      onChange={(e) => setCounter(o.id, { noteRoom: e.target.value })}
                      placeholder="opsiyonel"
                    />
                  </div>
                  <button className="btn" disabled={busy} onClick={() => onCounter(o.id)}>
                    Counter Gönder
                  </button>
                </div>
              </>
            ) : null}
          </div>
        );
      })}

      {previewModal.open ? (
        <RoutePreviewModal
          open={previewModal.open}
          onClose={() => setPreviewModal({ open: false, shiftId: null })}
          title={previewModal.shiftId ? `Shift #${previewModal.shiftId} — Rota/Durak Önizleme` : "Rota/Durak Önizleme"}
          shiftId={previewModal.shiftId}
        />
      ) : null}

      {/* ✅ M30/M31: Quick approve (+ optional start) modal */}
      {approveModal.open ? (() => {
        const modalShift = items.find((o) => Number(o?.shiftId) === Number(approveModal.shiftId))?.shift || null;
        const modalVehicle = vehicles.find((v) => Number(v.id) === Number(approveModal.vehicleId)) || null;
        const capacityMeta = buildCapacityMeta({ shift: modalShift, vehicle: modalVehicle });
        const approveBlocked = busy || capacityMeta.insufficient;
        return (
        <div className="modal-backdrop">
          <div className="modal card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Shift #{approveModal.shiftId} — Onay</div>
              <div className="muted">
                ACCEPTED teklif → bu shift artık senin. Araç + sürücü seçip <b>Onayla</b> veya <b>Onayla + Başlat</b>.
              </div>
            </div>
            <button type="button" className="btn" disabled={busy} onClick={() => setApproveModal((p) => ({ ...p, open: false }))}>
              Kapat
            </button>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Vehicle
              <select
                value={approveModal.vehicleId}
                onChange={(e) => setApproveModal((p) => ({ ...p, vehicleId: e.target.value }))}
                disabled={busy}
              >
                <option value="">Seç…</option>
                {(vehicles || []).filter((v) => !v?.archivedAt).map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.plate} (#{v.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Driver
              <select
                value={approveModal.driverId}
                onChange={(e) => setApproveModal((p) => ({ ...p, driverId: e.target.value }))}
                disabled={busy}
              >
                <option value="">Seç…</option>
                {(drivers || []).map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.fullName} (#{d.id})
                  </option>
                ))}
              </select>
            </label>

            {capacityMeta.requiredPax > 0 ? (
              <div className="card" style={{ marginTop: 8, width: "100%" }}>
                <div className="muted" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span><b>Yolcu:</b> {capacityMeta.requiredPax}</span>
                  <span>• <b>Koltuk:</b> {capacityMeta.vehicleCapacity || "-"}</span>
                  {capacityMeta.insufficient ? <span>• <b>Eksik:</b> {capacityMeta.missingCapacity}</span> : null}
                  {capacityMeta.insufficient && capacityMeta.minVehicleCount ? <span>• <b>Min araç:</b> {capacityMeta.minVehicleCount}</span> : null}
                </div>
                {capacityMeta.blockMessage ? (
                  <div className="muted" style={{ marginTop: 6 }}><b>Kapasite uyarısı:</b> {capacityMeta.blockMessage}</div>
                ) : null}
              </div>
            ) : null}

            {capacityMeta.insufficient ? (
              <div className="card" style={{ marginTop: 8, width: "100%" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div className="muted"><b>Room havuz özeti</b></div>
                  <button type="button" className="btn sm" disabled={busy || poolSummary.status === "loading"} onClick={() => loadPoolSummary(approveModal.shiftId, { force: true })}>
                    {poolSummary.status === "loading" ? "Yükleniyor..." : poolSummary.data ? "Yenile" : "Yükle"}
                  </button>
                </div>
                {poolSummary.data ? (() => {
                  const data = poolSummary.data;
                  const statusMeta = poolStatusMeta(data);
                  const blockedDrivers = Array.isArray(data?.blockedDrivers) ? data.blockedDrivers : [];
                  return (
                    <div className="muted" style={{ marginTop: 6 }}>
                      <div>
                        <b>Durum:</b>{" "}
                        <span className="pill" data-status={statusMeta.key}>{statusMeta.label}</span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <b>Müsait araç:</b> {(data.availableVehicleCount ?? data.vehicles?.filter?.((x) => x.vehicleOk)?.length ?? 0)}/{data.roomVehicleCount ?? 0}
                        {" • "}<b>Eşleşebilir araç:</b> {(data.pairableVehicleCount ?? data.vehicles?.filter?.((x) => x.pairOk)?.length ?? 0)}
                        {" • "}<b>Boş driver:</b> {data.freeDriverCount || 0}
                      </div>
                      <div style={{ marginTop: 4 }}><b>Toplam eşleşebilir koltuk:</b> {data.totalPairCapacity || 0}{!data.enoughPoolCapacity ? ` • Eksik: ${data.missingPoolCapacity || 0}` : ""}</div>
                      {Array.isArray(data?.suggestedCombo?.items) && data.suggestedCombo.items.length ? (
                        <div style={{ marginTop: 4 }}><b>Öneri:</b> {data.suggestedCombo.items.map((x) => `${x.plate} (${x.capacity}${x?.allocatedPax ? ` → ${x.allocatedPax} kişi` : ""})${x?.suggestedDriver?.fullName ? ` → ${x.suggestedDriver.fullName}` : ""}`).join(" + ")}</div>
                      ) : null}
                      {data?.limitingReason === "DRIVER_SHORTAGE" ? (
                        <div style={{ marginTop: 4 }}><b>Driver durumu:</b> Araç kapasitesi havuzda yeterli; ancak en az {data.driverShortageCount || 0} ek boş driver gerekiyor.</div>
                      ) : null}
                      {blockedDrivers.length ? (
                        <div style={{ marginTop: 4 }}><b>Bloklu driverlar:</b> {blockedDrivers.slice(0, 3).map((d) => `${d.fullName} (${blockedDriverReasonText(d)})`).join(" • ")}{blockedDrivers.length > 3 ? ` • +${blockedDrivers.length - 3} daha` : ""}</div>
                      ) : null}
                    </div>
                  );
                })() : poolSummary.status === "error" ? (
                  <div className="muted" style={{ marginTop: 6 }}><b>Hata:</b> {poolSummary.error}</div>
                ) : (
                  <div className="muted" style={{ marginTop: 6 }}>Çoklu araç/driver havuzu yüklenmedi.</div>
                )}
              </div>
            ) : null}

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={approveBlocked} onClick={() => doApprove({ startAfter: false })} title={capacityMeta.blockMessage || ""}>
                {busy ? "..." : "Onayla"}
              </button>
              <button type="button" className="btn primary" disabled={approveBlocked} onClick={() => doApprove({ startAfter: true })} title={capacityMeta.blockMessage || ""}>
                {busy ? "..." : "Onayla + Başlat"}
              </button>
            </div>
          </div>
          </div>
        </div>
        );
      })() : null}
    </div>
  );
}
