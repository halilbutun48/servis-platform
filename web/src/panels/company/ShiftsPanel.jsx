// web/src/panels/company/ShiftsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

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

export default function CompanyShiftsPanel() {
  const { token } = useSession();

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // dropdown'lar string sever; gönderirken Number() yapıyoruz
  const [roomId, setRoomId] = useState("1");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // filtre/teklif (yeni shift oluştururken)
  const [seatDemand, setSeatDemand] = useState(""); // opsiyonel filtre
  const [offerVehicleId, setOfferVehicleId] = useState(""); // opsiyonel
  const [offerNote, setOfferNote] = useState(""); // opsiyonel

  // Karşı teklif UI (mevcut shift üstünde offer güncelleme)
  const [offerOpen, setOfferOpen] = useState({}); // { [shiftId]: boolean }
  const [offerSel, setOfferSel] = useState({}); // { [shiftId]: { companyOfferVehicleId, companyOfferNote } }

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
      const [sh, veh, rm] = await Promise.all([
        api("/api/shifts", { token }),
        api("/api/vehicles", { token }),
        api("/api/rooms", { token }).catch(() => []), // endpoint yoksa paneli komple bozmayalım
      ]);

      setItems(Array.isArray(sh) ? sh : (sh?.items ?? []));
      setVehicles(Array.isArray(veh) ? veh : []);
      setRooms(Array.isArray(rm) ? rm : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("shifts", load);
  useAutoReload("vehicles", load);
  useAutoReload("rooms", load);

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

  // room seçenekleri: seatDemand varsa sadece uygun room'lar kalsın
  const roomOptions = useMemo(() => {
    // rooms endpoint yoksa fallback: araçlardan roomId çıkar
    const baseRooms =
      rooms?.length
        ? rooms
        : Array.from(
            new Set(vehicles.map((v) => v?.roomId).filter(Boolean).map((x) => Number(x)))
          ).map((id) => ({ id, name: `Room #${id}` }));

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

  // seatDemand değişince: seçili room artık uygunsuzsa ilk uygun room'a çek
  useEffect(() => {
    if (!roomOptions.length) return;
    const rid = Number(roomId);
    const ok = roomOptions.some((r) => Number(r.id) === rid);
    if (!ok) setRoomId(String(roomOptions[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatDemand, rooms, vehicles]);

  // araç filtresi: seçili room + kapasite (yeni shift request ederken)
  const filteredVehicles = useMemo(() => {
    const rid = Number(roomId);
    const sd = seatN;

    return vehicles
      .filter((v) => !rid || !v?.roomId || Number(v.roomId) === rid)
      .filter((v) => (sd ? Number(v?.capacity || 0) >= sd : true))
      .sort((a, b) => Number(a?.capacity || 0) - Number(b?.capacity || 0));
  }, [vehicles, roomId, seatN]);

  // room veya seat değişince seçili teklif aracı uygunsuzsa temizle
  useEffect(() => {
    if (!offerVehicleId) return;
    const v = vehiclesById.get(Number(offerVehicleId));
    if (!v) { setOfferVehicleId(""); return; }

    const rid = Number(roomId);
    if (rid && v?.roomId && Number(v.roomId) !== rid) { setOfferVehicleId(""); return; }

    if (seatN && Number(v?.capacity || 0) < seatN) { setOfferVehicleId(""); return; }
  }, [roomId, seatN, offerVehicleId, vehiclesById]);

  // Karşı teklif formunu (ilk kez) shift üstündeki mevcut companyOffer* ile initialize et
  useEffect(() => {
    setOfferSel((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const s of items) {
        const sid = Number(s.id);
        if (next[sid]) continue;

        next[sid] = {
          companyOfferVehicleId: s.companyOfferVehicleId ? String(s.companyOfferVehicleId) : "",
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
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      };

      if (offerVehicleId) body.companyOfferVehicleId = Number(offerVehicleId);
      if (offerNote.trim()) body.companyOfferNote = offerNote.trim();

      await api("/api/shifts", { method: "POST", token, body });

      setStartAt("");
      setEndAt("");
      setSeatDemand("");
      setOfferVehicleId("");
      setOfferNote("");

      await load();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  // Mevcut shift üstünde karşı teklif gönder
  async function sendCounterOffer(shift) {
    const sid = Number(shift.id);
    const form = offerSel[sid] || {};

    const vRaw = form.companyOfferVehicleId;
    const vId = vRaw ? Number(vRaw) : null;

    const note = trimOrNull(form.companyOfferNote);

    // araç seçildiyse: seçilen araç bu shift'in roomId'siyle aynı room'da olmalı (UI quick check)
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
          companyOfferNote: note || null,
        },
      });

      setOfferOpen((p) => ({ ...p, [sid]: false }));
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
        body: { companyOfferVehicleId: null, companyOfferNote: null },
      });

      setOfferSel((p) => ({ ...p, [sid]: { companyOfferVehicleId: "", companyOfferNote: "" } }));
      setOfferOpen((p) => ({ ...p, [sid]: false }));
      await load();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Karşı teklif araç listesi: shift.roomId içindeki araçlar (basit)
  function vehiclesForShiftRoom(shift) {
    const rid = Number(shift.roomId);
    return vehicles
      .filter((v) => !v?.roomId || Number(v.roomId) === rid)
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  const selectedRoom =
    roomsById.get(Number(roomId)) || roomOptions.find((r) => Number(r.id) === Number(roomId));

  function renderRoomOfferSummary(s) {
    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;

    const has = Boolean(rvId || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);
    if (!has) return <span className="muted">-</span>;

    return (
      <div className="muted">
        <div>
          <b>R→C Araç:</b>{" "}
          {rvId ? (rv ? `${rv.plate} • ${vehicleMetaLine(rv)}` : `#${rvId}`) : "-"}
        </div>
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
      </div>
    );
  }

  function renderCompanyOfferSummary(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;

    const has = Boolean(ovId || s.companyOfferNote);
    if (!has) return <span className="muted">-</span>;

    return (
      <div className="muted" title={s.companyOfferNote || ""}>
        <div>
          <b>C→R Araç:</b>{" "}
          {ovId ? (ov ? `${ov.plate} • ${vehicleMetaLine(ov)}` : `#${ovId}`) : "-"}
        </div>
        {s.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.companyOfferNote}</div> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (COMPANY)</h3>
        <div className="muted">Shift request → Room approve + pazarlık (Room ↔ Company)</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Vardiya Talebi</h3>

        <form onSubmit={createShift} className="grid">
          <div className="col">
            <label className="muted">Kişi sayısı (opsiyonel filtre)</label>
            <input
              type="number"
              placeholder="örn. 16"
              value={seatDemand}
              onChange={(e) => setSeatDemand(e.target.value)}
            />
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

            {offerVehicleId ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Seçili teklif:{" "}
                {(() => {
                  const v = vehiclesById.get(Number(offerVehicleId));
                  return v ? `${v.plate} • ${vehicleMetaLine(v)}` : `#${offerVehicleId}`;
                })()}
              </div>
            ) : null}
          </div>

          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Teklif Notu (opsiyonel)</label>
            <input
              value={offerNote}
              onChange={(e) => setOfferNote(e.target.value)}
              placeholder="örn. Bu vardiya için bu araç uygun"
            />
          </div>

          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">{busy ? "..." : "Request"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Liste</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Room Teklifi (R→C)</th>
              <th>Company Teklifi (C→R)</th>
              <th>Karşı Teklif</th>
              <th>Assigned Vehicle</th>
              <th>Driver</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>

          <tbody>
            {items.map((s) => {
              const r = roomsById.get(Number(s.roomId));
              const canNegotiate = ["DRAFT", "REQUESTED"].includes(String(s.status));

              const sid = Number(s.id);
              const isOpen = Boolean(offerOpen[sid]);
              const form = offerSel[sid] || {};
              const roomVehicles = vehiclesForShiftRoom(s);

              return (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                  <td className="muted">{r ? `${roomLabel(r)} (#${r.id})` : `#${s.roomId}`}</td>

                  <td>{renderRoomOfferSummary(s)}</td>
                  <td>{renderCompanyOfferSummary(s)}</td>

                  <td>
                    <button type="button" disabled={busy || !canNegotiate} onClick={() => toggleOffer(sid)}>
                      {isOpen ? "Kapat" : "Karşı Teklif"}
                    </button>

                    {!canNegotiate ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Bu status’te teklif güncellenmez.
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className="card" style={{ marginTop: 8 }}>
                        <div className="muted" style={{ marginBottom: 6 }}>
                          Company teklifini güncelle (C→R)
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <label className="muted">
                            <div style={{ marginBottom: 4 }}><b>Teklif Araç (opsiyonel)</b></div>
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
                            <div style={{ marginBottom: 4 }}><b>Teklif Notu (opsiyonel)</b></div>
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

                  <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                  <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
                  <td className="muted">{String(s.startAt)}</td>
                  <td className="muted">{String(s.endAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="muted">
          Not: Bu panel “Karşı Teklif” için <b>PUT /api/shifts/:id/company-offer</b> endpoint’ini çağırır.
          Backend’de yoksa eklemelisin.
        </div>
      </div>
    </div>
  );
}