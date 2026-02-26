// web/src/panels/room/OffersPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAutoReload } from "../../live/useAutoReload";
import { navigate } from "../../router";

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

  const [statusFilter, setStatusFilter] = useState("OPEN,COUNTERED");
  const [q, setQ] = useState("");

  // per-offer counter input
  const [counterSel, setCounterSel] = useState({}); // { [offerId]: { amountRoom, noteRoom } }

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

  async function onCounter(offerId) {
    const st = counterSel[offerId] || {};
    const amountRoom = st.amountRoom == null || st.amountRoom === "" ? null : Number(st.amountRoom);
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

  async function openApprove(o) {
    const sid = Number(o?.shiftId);
    if (!sid) return;
    setErr("");
    await loadAssets();
    setApproveModal({ open: true, shiftId: sid, offerId: Number(o?.id) || null, vehicleId: "", driverId: "" });
  }

  async function doApprove({ startAfter = false } = {}) {
    const sid = Number(approveModal.shiftId);
    const vid = Number(approveModal.vehicleId);
    const did = Number(approveModal.driverId);
    if (!sid || !vid || !did) {
      setErr("Approve için vehicle + driver seçmelisin.");
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
          <button className="btn" disabled={busy} onClick={load}>
            Yenile
          </button>
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
                {pill(o.status)}
                {pill(shift?.status)}
                <button type="button" className="btn sm" disabled={busy} onClick={() => goShift(o.shiftId)}>
                  Shift’e Git
                </button>

                {canQuickApprove ? (
                  <button type="button" className="btn" disabled={busy} onClick={() => openApprove(o)} title="Araç+sürücü seç → Onayla (+Start)">
                    Hızlı Onayla
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

      {/* ✅ M30/M31: Quick approve (+ optional start) modal */}
      {approveModal.open ? (
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

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={busy} onClick={() => doApprove({ startAfter: false })}>
                {busy ? "..." : "Onayla"}
              </button>
              <button type="button" className="btn primary" disabled={busy} onClick={() => doApprove({ startAfter: true })}>
                {busy ? "..." : "Onayla + Başlat"}
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
