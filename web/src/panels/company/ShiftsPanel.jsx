// web/src/panels/company/ShiftsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { invalidate } from "../../live/bus";

const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

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

export default function CompanyShiftsPanel() {
  const { token, me } = useSession();

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Room teklif kararı butonları için
  const [decidingId, setDecidingId] = useState(null);

  // Decision note input state (shift bazlı)
  const [decisionNoteSel, setDecisionNoteSel] = useState({}); // { [shiftId]: string }
  function setDecisionNote(shiftId, value) {
    setDecisionNoteSel((p) => ({ ...p, [Number(shiftId)]: value }));
  }

  // Pending filtreler
  const [pendingQ, setPendingQ] = useState("");
  const [pendingOnlyRoomOffer, setPendingOnlyRoomOffer] = useState(false);

  // Final liste filtreler
  const [finalQ, setFinalQ] = useState("");
  const [finalStatus, setFinalStatus] = useState("ALL");

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

  // datetime-local (Istanbul local) -> UTC ISO
  const IST_OFFSET_MIN = 180;
  function istanbulLocalToUtcIso(dtLocal) {
    if (!dtLocal) return null;
    const [d, t] = String(dtLocal).split("T");
    if (!d || !t) return null;

    const [Y, M, D] = d.split("-").map(Number);
    const [h, m] = t.split(":").map(Number);
    if (![Y, M, D, h, m].every(Number.isFinite)) return null;

    const utcMs = Date.UTC(Y, M - 1, D, h, m, 0) - IST_OFFSET_MIN * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  // Yeni shift (request) form state
  const [roomId, setRoomId] = useState("1");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [seatDemand, setSeatDemand] = useState("");
  const [offerVehicleId, setOfferVehicleId] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");

  // Karşı teklif UI
  const [offerOpen, setOfferOpen] = useState({});
  const [offerSel, setOfferSel] = useState({});

  const isCompany = String(me?.role || "") === "COMPANY";

  function toggleOffer(shiftId) {
    setOfferOpen((p) => ({ ...p, [shiftId]: !p[shiftId] }));
  }
  function setOfferForShift(shiftId, patch) {
    setOfferSel((prev) => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), ...patch },
    }));
  }

  async function load() {
    setErr("");
    try {
      const roomsPromise = !isCompany ? api("/api/rooms", { token }).catch(() => []) : Promise.resolve([]);

      const [sh, veh, rm] = await Promise.all([
        api("/api/shifts?take=200", { token }),
        api("/api/vehicles", { token }),
        roomsPromise,
      ]);

      const list = Array.isArray(sh) ? sh : sh?.items ?? [];
      const vlist = Array.isArray(veh) ? veh : veh?.items ?? [];
      const rlist = Array.isArray(rm) ? rm : rm?.items ?? [];

      list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

      setItems(list);
      setVehicles(vlist);
      setRooms(rlist);

      setDecisionNoteSel((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const s of list) {
          const sid = Number(s.id);
          if (next[sid] === undefined) {
            next[sid] = "";
            changed = true;
          }
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
  }, [me?.role]);

  useAutoReload("shifts", load);
  useAutoReload("vehicles", load);
  useAutoReload("rooms", load, !isCompany);

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

  const seatN = useMemo(() => (seatDemand ? Number(seatDemand) : null), [seatDemand]);

  const roomOptions = useMemo(() => {
    const baseRooms =
      rooms?.length
        ? rooms
        : Array.from(new Set(vehicles.map((v) => v?.roomId).filter(Boolean).map((x) => Number(x)))).map((id) => ({
            id,
            name: `Room #${id}`,
          }));

    const list = baseRooms.map((r) => {
      const rid = Number(r.id);
      const eligibleCount = vehicles.filter((v) => {
        if (!v?.roomId) return false;
        if (Number(v.roomId) !== rid) return false;
        if (!seatN) return true;
        return Number(v?.capacity || 0) >= seatN;
      }).length;

      return { ...r, eligibleCount };
    });

    const filtered = seatN ? list.filter((r) => r.eligibleCount > 0) : list;
    filtered.sort((a, b) => Number(a.id) - Number(b.id));
    return filtered;
  }, [rooms, vehicles, seatN]);

  useEffect(() => {
    if (!roomOptions.length) return;
    const rid = Number(roomId);
    const ok = roomOptions.some((r) => Number(r.id) === rid);
    if (!ok) setRoomId(String(roomOptions[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatDemand, rooms, vehicles]);

  const filteredVehicles = useMemo(() => {
    const rid = Number(roomId);
    const sd = seatN;

    return vehicles
      .filter((v) => !rid || !v?.roomId || Number(v.roomId) === rid)
      .filter((v) => (sd ? Number(v?.capacity || 0) >= sd : true))
      .sort((a, b) => Number(a?.capacity || 0) - Number(b?.capacity || 0));
  }, [vehicles, roomId, seatN]);

  useEffect(() => {
    if (!offerVehicleId) return;
    const v = vehiclesById.get(Number(offerVehicleId));
    if (!v) {
      setOfferVehicleId("");
      return;
    }

    const rid = Number(roomId);
    if (rid && v?.roomId && Number(v.roomId) !== rid) {
      setOfferVehicleId("");
      return;
    }

    if (seatN && Number(v?.capacity || 0) < seatN) {
      setOfferVehicleId("");
      return;
    }
  }, [roomId, seatN, offerVehicleId, vehiclesById]);

  // offerSel init
  useEffect(() => {
    setOfferSel((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const s of items) {
        const sid = Number(s.id);
        if (next[sid]) continue;

        next[sid] = {
          companyOfferVehicleId: s.companyOfferVehicleId ? String(s.companyOfferVehicleId) : "",
          companyOfferAmount: s.companyOfferAmount != null ? String(s.companyOfferAmount) : "",
          companyOfferNote: s.companyOfferNote ?? "",
        };
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [items]);

  async function createShift(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      const body = {
        roomId: Number(roomId),
        startAt: istanbulLocalToUtcIso(startAt),
        endAt: istanbulLocalToUtcIso(endAt),
        status: "REQUESTED",
      };

      if (offerVehicleId) body.companyOfferVehicleId = Number(offerVehicleId);

      const amt = parseTryInput(offerAmount);
      if (amt != null) body.companyOfferAmount = amt;

      if (offerNote.trim()) body.companyOfferNote = offerNote.trim();

      await api("/api/shifts", { method: "POST", token, body });

      setStartAt("");
      setEndAt("");
      setSeatDemand("");
      setOfferVehicleId("");
      setOfferAmount("");
      setOfferNote("");

      invalidate("shifts");
      await load();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  async function sendCounterOffer(shift) {
    const sid = Number(shift.id);
    const form = offerSel[sid] || {};

    const vRaw = form.companyOfferVehicleId;
    const vId = vRaw ? Number(vRaw) : null;

    const amt = parseTryInput(form.companyOfferAmount);
    const note = trimOrNull(form.companyOfferNote);

    if (vId) {
      const v = vehiclesById.get(Number(vId));
      if (v?.roomId && Number(v.roomId) !== Number(shift.roomId)) {
        setErr("Seçtiğin teklif aracı bu shift’in room’una ait değil.");
        return;
      }
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/company-offer`, {
        method: "PUT",
        token,
        body: {
          companyOfferVehicleId: vId || null,
          companyOfferAmount: amt ?? null,
          companyOfferNote: note || null,
        },
      });

      setOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearCounterOffer(shift) {
    const sid = Number(shift.id);

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}/company-offer`, {
        method: "PUT",
        token,
        body: { companyOfferVehicleId: null, companyOfferAmount: null, companyOfferNote: null },
      });

      setOfferSel((p) => ({
        ...p,
        [sid]: { companyOfferVehicleId: "", companyOfferAmount: "", companyOfferNote: "" },
      }));
      setOfferOpen((p) => ({ ...p, [sid]: false }));
      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Company: kendi talebini iptal et (REQUESTED/DRAFT -> REJECTED)
  async function cancelMyRequest(shift) {
    const sid = Number(shift.id);
    if (!sid) return;

    if (!confirm(`Shift #${sid} talebini iptal etmek istiyor musun? (REJECTED)`)) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${sid}`, {
        method: "PUT",
        token,
        body: { status: "REJECTED" },
      });

      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function decideRoomOffer(shift, decision, noteRaw) {
    const sid = Number(shift.id);
    setDecidingId(sid);
    setErr("");

    const note = trimOrNull(noteRaw);

    try {
      await api(`/api/shifts/${sid}/room-offer-decision`, {
        method: "PUT",
        token,
        body: {
          decision,
          ...(note ? { note } : {}),
        },
      });

      setDecisionNoteSel((p) => ({ ...p, [sid]: "" }));

      invalidate("shifts");
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setDecidingId(null);
    }
  }

  function renderCompanyOfferSummary(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;
    const cAmt = s.companyOfferAmount != null ? Number(s.companyOfferAmount) : null;

    const has = Boolean(ovId || cAmt != null || s.companyOfferNote);
    if (!has) return <span className="muted">-</span>;

    return (
      <div className="muted" title={s.companyOfferNote || ""}>
        <div>
          <b>C→R Araç:</b> {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}
        </div>
        {cAmt != null ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>C→R Tutar:</b> {formatTRY(cAmt)} ₺
          </div>
        ) : null}
        {s.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.companyOfferNote}</div> : null}
      </div>
    );
  }

  function renderRoomOfferSummary(s, canDecide) {
    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;
    const rAmt = s.roomOfferAmount != null ? Number(s.roomOfferAmount) : null;

    const has = Boolean(rvId || rAmt != null || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);
    if (!has) return <span className="muted">-</span>;

    const decision = String(s.roomOfferDecision || "PENDING");
    const decisionAtText = s.roomOfferDecisionAt ? fmtTR(s.roomOfferDecisionAt) : "";

    const sid = Number(s.id);
    const noteVal = decisionNoteSel[sid] ?? "";

    return (
      <div className="muted">
        <div>
          <b>R→C Araç:</b> {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}
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
          {decision !== "PENDING" && decisionAtText ? <span className="muted"> • {decisionAtText}</span> : null}
        </div>

        {decision === "PENDING" ? (
          canDecide ? (
            <div style={{ marginTop: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                <b>Karar Notu (opsiyonel)</b>
              </div>

              <input
                value={noteVal}
                onChange={(e) => setDecisionNote(sid, e.target.value)}
                placeholder="örn. Uygun / Uygun değil, şu yüzden..."
                maxLength={200}
                disabled={busy || decidingId === sid}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy || decidingId === sid} onClick={() => decideRoomOffer(s, "ACCEPTED", noteVal)}>
                  {decidingId === sid ? "..." : "Kabul"}
                </button>
                <button type="button" disabled={busy || decidingId === sid} onClick={() => decideRoomOffer(s, "REJECTED", noteVal)}>
                  {decidingId === sid ? "..." : "Reddet"}
                </button>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 8 }}>
              Bu status’te karar verilemez.
            </div>
          )
        ) : null}

        {s.roomOfferDecisionNote ? (
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Karar Notu:</b> {s.roomOfferDecisionNote}
          </div>
        ) : null}
      </div>
    );
  }

  // Pending vs Final
  const FINAL_STATUSES = useMemo(() => new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]), []);
  const pendingItemsRaw = useMemo(() => items.filter((s) => !FINAL_STATUSES.has(String(s.status))), [items, FINAL_STATUSES]);
  const finalItemsRaw = useMemo(() => items.filter((s) => FINAL_STATUSES.has(String(s.status))), [items, FINAL_STATUSES]);

  // Pending filtre uygula
  const pendingItems = useMemo(() => {
    const q = String(pendingQ || "").trim().toLowerCase();
    return pendingItemsRaw
      .filter((s) => {
        if (!pendingOnlyRoomOffer) return true;
        const hasRoomOffer =
          Boolean(s.roomOfferVehicleId) ||
          s.roomOfferAmount != null ||
          Boolean(s.roomOfferNote) ||
          Boolean(s.roomOfferToDriver) ||
          Boolean(s.roomOfferDriverNote);
        return hasRoomOffer;
      })
      .filter((s) => {
        if (!q) return true;
        const hay = [
          s.id,
          s.status,
          s.roomId,
          s.companyId,
          s.roomOfferNote,
          s.companyOfferNote,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [pendingItemsRaw, pendingQ, pendingOnlyRoomOffer]);

  // Final filtre uygula
  const finalItems = useMemo(() => {
    const q = String(finalQ || "").trim().toLowerCase();
    return finalItemsRaw
      .filter((s) => (finalStatus === "ALL" ? true : String(s.status) === finalStatus))
      .filter((s) => {
        if (!q) return true;
        const hay = [
          s.id,
          s.status,
          s.roomId,
          s.companyId,
          s.roomOfferNote,
          s.companyOfferNote,
          s.vehicle?.plate,
          s.driver?.fullName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [finalItemsRaw, finalQ, finalStatus]);

  const selectedRoom = roomsById.get(Number(roomId)) || roomOptions.find((r) => Number(r.id) === Number(roomId));

  function vehiclesForShiftRoom(shift) {
    const rid = Number(shift.roomId);
    return vehicles
      .filter((v) => !v?.roomId || Number(v.roomId) === rid)
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (COMPANY)</h3>
        <div className="muted">Bekleyen: DRAFT/REQUESTED • Liste: APPROVED/ACTIVE/DONE/REJECTED</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Vardiya Talebi</h3>

        <form onSubmit={createShift} className="grid">
          <div className="col">
            <label className="muted">Kişi sayısı (opsiyonel filtre)</label>
            <input type="number" placeholder="örn. 16" value={seatDemand} onChange={(e) => setSeatDemand(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Room</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {roomOptions.length ? (
                roomOptions.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {roomLabel(r)} (#{r.id}){seatN ? ` • ${r.eligibleCount} araç` : ""}
                  </option>
                ))
              ) : (
                <option value={roomId}>Room #{roomId}</option>
              )}
            </select>
            <div className="muted" style={{ marginTop: 6 }}>
              Seçili room: {selectedRoom ? `${roomLabel(selectedRoom)} (#${selectedRoom.id})` : `#${roomId}`}
            </div>
          </div>

          <div className="col">
            <label className="muted">Start</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">End</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>

          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Teklif Araç (opsiyonel)</label>
            <select value={offerVehicleId} onChange={(e) => setOfferVehicleId(e.target.value)}>
              <option value="">— teklif yok —</option>
              {filteredVehicles.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.plate} • {vehicleMetaLine(v)}
                </option>
              ))}
            </select>
          </div>

          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Company Tutar (₺) (opsiyonel)</label>
            <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="örn. 25000" />
          </div>

          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Teklif Notu (opsiyonel)</label>
            <input value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="örn. Bu vardiya için bu araç uygun" />
          </div>

          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">
              {busy ? "..." : "Request"}
            </button>
          </div>
        </form>
      </div>

      {/* BEKLEYEN */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Bekleyen Talepler</h3>
            <div className="muted">Pazarlık/karar tamamlanmadan “Liste”ye düşmez.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Ara (id/status/note/room)"
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={pendingOnlyRoomOffer}
                onChange={(e) => setPendingOnlyRoomOffer(e.target.checked)}
              />
              Sadece Room teklifi olanlar
            </label>
            <button
              type="button"
              onClick={() => {
                setPendingQ("");
                setPendingOnlyRoomOffer(false);
              }}
            >
              Temizle
            </button>
          </div>
        </div>

        {pendingItems.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Room</th>
                <th>Room Teklifi (R→C)</th>
                <th>Company Teklifi (C→R)</th>
                <th>Karşı Teklif</th>
                <th>İptal</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((s) => {
                const r = roomsById.get(Number(s.roomId));
                const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(s.status));

                const sid = Number(s.id);
                const isOpen = Boolean(offerOpen[sid]);
                const form = offerSel[sid] || {};
                const roomVehicles = vehiclesForShiftRoom(s);

                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>
                      <span className="pill" data-status={s.status}>
                        {s.status}
                      </span>
                    </td>
                    <td className="muted">{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</td>

                    <td>{renderRoomOfferSummary(s, canNegotiate)}</td>
                    <td>{renderCompanyOfferSummary(s)}</td>

                    <td>
                      <button type="button" disabled={busy || !canNegotiate} onClick={() => toggleOffer(sid)}>
                        {isOpen ? "Kapat" : "Karşı Teklif"}
                      </button>

                      {isOpen ? (
                        <div className="card" style={{ marginTop: 8 }}>
                          <div className="muted" style={{ marginBottom: 6 }}>
                            Company teklifini güncelle (C→R)
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            <label className="muted">
                              <div style={{ marginBottom: 4 }}>
                                <b>Teklif Araç (opsiyonel)</b>
                              </div>
                              <select
                                value={form.companyOfferVehicleId || ""}
                                onChange={(e) => setOfferForShift(sid, { companyOfferVehicleId: e.target.value })}
                                disabled={busy}
                              >
                                <option value="">— teklif yok —</option>
                                {roomVehicles.map((v) => (
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
                                value={form.companyOfferAmount ?? ""}
                                onChange={(e) => setOfferForShift(sid, { companyOfferAmount: e.target.value })}
                                placeholder="örn. 25000"
                                disabled={busy}
                              />
                            </label>

                            <label className="muted">
                              <div style={{ marginBottom: 4 }}>
                                <b>Teklif Notu (opsiyonel)</b>
                              </div>
                              <input
                                value={form.companyOfferNote ?? ""}
                                onChange={(e) => setOfferForShift(sid, { companyOfferNote: e.target.value })}
                                placeholder="örn. Bu araçla şu şartla…"
                                disabled={busy}
                              />
                            </label>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button type="button" disabled={busy} onClick={() => sendCounterOffer(s)}>
                                {busy ? "..." : "Gönder"}
                              </button>

                              <button type="button" disabled={busy} onClick={() => clearCounterOffer(s)}>
                                Teklifi Kaldır
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <button type="button" disabled={busy || !canNegotiate} onClick={() => cancelMyRequest(s)}>
                        Talebi İptal Et
                      </button>
                    </td>

                    <td className="muted" title={String(s.startAt)}>{fmtTR(s.startAt)}</td>
                    <td className="muted" title={String(s.endAt)}>{fmtTR(s.endAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted">Bekleyen talep yok.</div>
        )}
      </div>

      {/* LİSTE */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Liste</h3>
            <div className="muted">Sadece APPROVED/ACTIVE/DONE/REJECTED burada görünür.</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)}>
              <option value="ALL">Hepsi</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <input
              placeholder="Ara (id/status/plate/driver/note)"
              value={finalQ}
              onChange={(e) => setFinalQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <button
              type="button"
              onClick={() => {
                setFinalStatus("ALL");
                setFinalQ("");
              }}
            >
              Temizle
            </button>
          </div>
        </div>

        {finalItems.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Room</th>
                <th>Room Teklifi (R→C)</th>
                <th>Company Teklifi (C→R)</th>
                <th>Assigned Vehicle</th>
                <th>Driver</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>

            <tbody>
              {finalItems.map((s) => {
                const r = roomsById.get(Number(s.roomId));
                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>
                      <span className="pill" data-status={s.status}>
                        {s.status}
                      </span>
                    </td>
                    <td className="muted">{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</td>
                    <td>{renderRoomOfferSummary(s, false)}</td>
                    <td>{renderCompanyOfferSummary(s)}</td>
                    <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                    <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
                    <td className="muted" title={String(s.startAt)}>{fmtTR(s.startAt)}</td>
                    <td className="muted" title={String(s.endAt)}>{fmtTR(s.endAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="muted">Henüz “Liste”ye düşen kayıt yok.</div>
        )}
      </div>
    </div>
  );
}
