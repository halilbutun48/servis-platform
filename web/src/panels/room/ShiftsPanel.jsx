// web/src/panels/room/ShiftsPanel.jsx
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

function toMs(x) {
  const d = x ? new Date(x) : null;
  const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  return t;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

export default function RoomShiftsPanel() {
  const { token } = useSession();

  const [shifts, setShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const requested = useMemo(() => shifts.filter((s) => s.status === "REQUESTED"), [shifts]);

  const vehiclesById = useMemo(() => {
    const m = new Map();
    for (const v of vehicles) m.set(v.id, v);
    return m;
  }, [vehicles]);

  const driversById = useMemo(() => {
    const m = new Map();
    for (const d of drivers) m.set(d.id, d);
    return m;
  }, [drivers]);

  async function loadAll() {
    setErr("");
    try {
      const [s, v, d] = await Promise.all([
        api("/api/shifts", { token }),
        api("/api/vehicles", { token }),
        api("/api/drivers", { token }),
      ]);

      setShifts(Array.isArray(s) ? s : []);
      setVehicles(Array.isArray(v) ? v : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line

  useAutoReload("shifts", loadAll);
  useAutoReload("vehicles", loadAll);
  useAutoReload("drivers", loadAll);

  // approve state: sadece vehicleId tutuyoruz
  const [approveSel, setApproveSel] = useState({});
  function setSel(shiftId, patch) {
    setApproveSel((prev) => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), ...patch },
    }));
  }

  // ROOM teklif state (opsiyonel pazarlık)
  const [roomOfferOpen, setRoomOfferOpen] = useState({}); // { [shiftId]: boolean }
  function toggleRoomOffer(shiftId) {
    setRoomOfferOpen((p) => ({ ...p, [shiftId]: !p[shiftId] }));
  }

  // form değerleri: { roomOfferVehicleId, roomOfferNote, notifyDriver, driverNote }
  const [roomOfferSel, setRoomOfferSel] = useState({});
  function setRoomOffer(shiftId, patch) {
    setRoomOfferSel((prev) => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), ...patch },
    }));
  }

  // Teklif araç varsa: default seçili araç = offered vehicle
  useEffect(() => {
    setApproveSel((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const s of requested) {
        const sid = s.id;
        const cur = next[sid] || {};
        if (!cur.vehicleId && s.companyOfferVehicleId) {
          next[sid] = { ...cur, vehicleId: String(s.companyOfferVehicleId) };
          changed = true;
        } else if (!next[sid]) {
          next[sid] = cur;
        }
      }
      return changed ? next : prev;
    });
  }, [requested]);

  // Room teklif formunu (ilk kez) shift üstündeki mevcut değerlerle initialize et
  useEffect(() => {
    setRoomOfferSel((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const s of requested) {
        const sid = s.id;
        if (next[sid]) continue;

        const fallbackVehicleId =
          (approveSel?.[sid]?.vehicleId ? String(approveSel[sid].vehicleId) : "") ||
          (s.roomOfferVehicleId ? String(s.roomOfferVehicleId) : "") ||
          "";

        next[sid] = {
          roomOfferVehicleId: fallbackVehicleId, // string
          roomOfferNote: s.roomOfferNote ?? "",
          notifyDriver: Boolean(s.roomOfferToDriver),
          driverNote: s.roomOfferDriverNote ?? "",
        };
        changed = true;
      }

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  // “müsait araç” = aynı saat aralığında başka APPROVED shift'e atanmış araç değil
  function availableVehiclesForShift(shift) {
    const aStart = toMs(shift.startAt);
    const aEnd = toMs(shift.endAt);

    const busyIds = new Set(
      shifts
        .filter((x) => x.vehicleId && x.status === "APPROVED")
        .filter((x) => overlaps(aStart, aEnd, toMs(x.startAt), toMs(x.endAt)))
        .map((x) => Number(x.vehicleId))
    );

    return vehicles
      .filter((v) => !busyIds.has(v.id))
      .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
  }

  // aç/kapa “müsait araçlar” listesi
  const [openAvail, setOpenAvail] = useState({});
  function toggleAvail(shiftId) {
    setOpenAvail((p) => ({ ...p, [shiftId]: !p[shiftId] }));
  }

  function driverLabelForVehicleId(vehicleId) {
    const v = vehicleId ? vehiclesById.get(Number(vehicleId)) : null;
    const did = v?.driverId || v?.driver?.id || null;
    const d = did ? driversById.get(Number(did)) : null;
    return d ? d.fullName : did ? `#${did}` : "-";
  }

  async function approveShift(shiftId) {
    const sel = approveSel[shiftId] || {};
    if (!sel.vehicleId) {
      setErr("Approve için vehicle seçmelisin.");
      return;
    }

    // UX: seçilen araçta driver bağlı mı? (backend zaten kontrol ediyor ama UI hızlı uyarı)
    const v = vehiclesById.get(Number(sel.vehicleId));
    const did = v?.driverId || v?.driver?.id || null;
    if (!did) {
      setErr("Seçtiğin araçta driver bağlı değil. Önce Vehicles panelinden araca driver bağla.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${shiftId}/approve`, {
        method: "POST",
        token,
        body: { vehicleId: Number(sel.vehicleId) }, // ✅ driver yok
      });
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // 3.2) Room teklif gönder handler
  async function sendRoomOffer(shift) {
    const shiftId = shift.id;
    const form = roomOfferSel[shiftId] || {};

    const roomOfferVehicleIdRaw = form.roomOfferVehicleId;
    const roomOfferVehicleId = roomOfferVehicleIdRaw ? Number(roomOfferVehicleIdRaw) : null;

    const roomOfferNote = trimOrNull(form.roomOfferNote);
    const notifyDriver = Boolean(form.notifyDriver);
    const driverNote = trimOrNull(form.driverNote);

    // notifyDriver true ise: araç + driver olmalı (backend de kontrol ediyor ama UI hızlı uyarı)
    if (notifyDriver) {
      if (!roomOfferVehicleId) {
        setErr("Driver’a ilet için bir araç seçmelisin.");
        return;
      }
      const v = vehiclesById.get(Number(roomOfferVehicleId));
      const did = v?.driverId || v?.driver?.id || null;
      if (!did) {
        setErr("Seçtiğin araçta driver bağlı değil. Driver’a ilet için önce araca driver bağla.");
        return;
      }
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${shiftId}/room-offer`, {
        method: "PUT",
        token,
        body: {
          roomOfferVehicleId: roomOfferVehicleId || undefined,
          roomOfferNote: roomOfferNote || undefined,
          notifyDriver: notifyDriver || undefined,
          driverNote: notifyDriver ? driverNote || undefined : undefined,
        },
      });

      // UI: kapat + refresh
      setRoomOfferOpen((p) => ({ ...p, [shiftId]: false }));
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // 3.3) renderOfferCell(s) içinde Company teklifinin altına “Room Teklifi” UI
  function renderOfferCell(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;

    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;

    const hasCompanyOffer = Boolean(ovId || s.companyOfferNote);
    const hasRoomOffer = Boolean(rvId || s.roomOfferNote || s.roomOfferToDriver || s.roomOfferDriverNote);

    const isOpen = Boolean(roomOfferOpen[s.id]);
    const form = roomOfferSel[s.id] || {};

    // Room teklifinde araç listesi: müsait araçlar (pazarlık için de mantıklı)
    const avail = availableVehiclesForShift(s);

    return (
      <div className="muted">
        {/* COMPANY → ROOM */}
        {hasCompanyOffer ? (
          <div>
            {ovId ? (
              <div>
                <b>Company Teklifi (Araç):</b>{" "}
                {ov ? `${ov.plate}${vehicleMetaLine(ov) ? ` • ${vehicleMetaLine(ov)}` : ""}` : `#${ovId}`}
              </div>
            ) : null}

            {s.companyOfferNote ? (
              <div className="muted" style={{ marginTop: 6 }}>
                <b>Company Not:</b> {s.companyOfferNote}
              </div>
            ) : null}

            {ovId ? (
              <button
                type="button"
                disabled={busy}
                style={{ marginTop: 6 }}
                onClick={() => setSel(s.id, { vehicleId: String(ovId) })}
                title="Teklif edilen aracı seç"
              >
                Teklifi Uygula
              </button>
            ) : null}
          </div>
        ) : (
          <div className="muted">Company teklifi yok.</div>
        )}

        {/* ROOM → COMPANY (mevcut teklif özeti) */}
        {hasRoomOffer ? (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(255,255,255,0.12)" }}>
            <div>
              <b>Room Teklifi (Mevcut):</b>{" "}
              {rvId ? (rv ? `${rv.plate}${vehicleMetaLine(rv) ? ` • ${vehicleMetaLine(rv)}` : ""}` : `#${rvId}`) : "-"}
            </div>

            {s.roomOfferNote ? (
              <div className="muted" style={{ marginTop: 6 }}>
                <b>Room Not:</b> {s.roomOfferNote}
              </div>
            ) : null}

            {s.roomOfferToDriver ? (
              <div className="muted" style={{ marginTop: 6 }}>
                <b>Driver’a iletildi:</b> evet{s.roomOfferDriverNote ? ` • ${s.roomOfferDriverNote}` : ""}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ROOM teklif formu (opsiyonel) */}
        <div style={{ marginTop: 10 }}>
          <button type="button" disabled={busy} onClick={() => toggleRoomOffer(s.id)}>
            {isOpen ? "Room Teklifi Kapat" : "Room Teklifi (opsiyonel) Aç"}
          </button>

          {isOpen ? (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="muted" style={{ marginBottom: 6 }}>
                Company’e karşı teklif (istersen driver’a da iletebilirsin)
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label className="muted">
                  <div style={{ marginBottom: 4 }}><b>Teklif Araç (opsiyonel)</b></div>
                  <select
                    value={form.roomOfferVehicleId || ""}
                    onChange={(e) => setRoomOffer(s.id, { roomOfferVehicleId: e.target.value })}
                    disabled={busy}
                  >
                    <option value="">(Araç seçmeden de not gönderebilirsin)</option>
                    {avail.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate}{vehicleMetaLine(v) ? ` • ${vehicleMetaLine(v)}` : ""} (#{v.id})
                      </option>
                    ))}
                  </select>
                  <div className="muted" style={{ marginTop: 6 }}>
                    <b>Driver (auto):</b>{" "}
                    {form.roomOfferVehicleId ? driverLabelForVehicleId(form.roomOfferVehicleId) : "-"}
                  </div>
                </label>

                <label className="muted">
                  <div style={{ marginBottom: 4 }}><b>Room Not (opsiyonel)</b></div>
                  <textarea
                    rows={2}
                    value={form.roomOfferNote ?? ""}
                    onChange={(e) => setRoomOffer(s.id, { roomOfferNote: e.target.value })}
                    placeholder="Örn: Bu araç uygundur, şu koşulla…"
                    disabled={busy}
                  />
                </label>

                <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.notifyDriver)}
                    onChange={(e) => setRoomOffer(s.id, { notifyDriver: e.target.checked })}
                    disabled={busy}
                  />
                  <span><b>Driver’a da ilet (opsiyonel)</b></span>
                </label>

                {Boolean(form.notifyDriver) ? (
                  <label className="muted">
                    <div style={{ marginBottom: 4 }}><b>Driver Not (opsiyonel)</b></div>
                    <textarea
                      rows={2}
                      value={form.driverNote ?? ""}
                      onChange={(e) => setRoomOffer(s.id, { driverNote: e.target.value })}
                      placeholder="Örn: Şu saatte hazır ol…"
                      disabled={busy}
                    />
                    <div className="muted" style={{ marginTop: 6 }}>
                      Not: Driver’a iletmek için seçilen araçta driver bağlı olmalı.
                    </div>
                  </label>
                ) : null}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" disabled={busy} onClick={() => sendRoomOffer(s)}>
                    {busy ? "..." : "Room Teklifini Gönder"}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setRoomOffer(s.id, {
                        roomOfferVehicleId: "",
                        roomOfferNote: "",
                        notifyDriver: false,
                        driverNote: "",
                      })
                    }
                    title="Formu temizle"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderOfferCellCompact(s) {
    const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
    const ov = ovId ? vehiclesById.get(ovId) : null;

    const rvId = s.roomOfferVehicleId ? Number(s.roomOfferVehicleId) : null;
    const rv = rvId ? vehiclesById.get(rvId) : null;

    const companyLine = ovId
      ? ov
        ? `${ov.plate}${vehicleMetaLine(ov) ? ` • ${vehicleMetaLine(ov)}` : ""}`
        : `#${ovId}`
      : "-";

    const roomLine = rvId
      ? rv
        ? `${rv.plate}${vehicleMetaLine(rv) ? ` • ${vehicleMetaLine(rv)}` : ""}`
        : `#${rvId}`
      : "-";

    return (
      <div className="muted" title={s.companyOfferNote || ""}>
        <div><b>C→R:</b> {companyLine}</div>
        {s.companyOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.companyOfferNote}</div> : null}

        <div style={{ marginTop: 6 }}><b>R→C:</b> {roomLine}</div>
        {s.roomOfferNote ? <div className="muted" style={{ marginTop: 4 }}>{s.roomOfferNote}</div> : null}
        {s.roomOfferToDriver ? (
          <div className="muted" style={{ marginTop: 4 }}>
            <b>R→D:</b> evet{s.roomOfferDriverNote ? ` • ${s.roomOfferDriverNote}` : ""}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (ROOM)</h3>
        <div className="muted">Company request → Room approve (vehicle) + opsiyonel pazarlık</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Bekleyen Talepler</h3>

        {requested.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Start</th>
                <th>End</th>
                <th>Teklif / Pazarlık</th>
                <th>Vehicle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requested.map((s) => {
                const avail = availableVehiclesForShift(s);

                const selectedVid = approveSel[s.id]?.vehicleId || "";
                const selectedDriver = selectedVid ? driverLabelForVehicleId(selectedVid) : "-";

                const ovId = s.companyOfferVehicleId ? Number(s.companyOfferVehicleId) : null;
                const offeredAvailable = ovId ? avail.some((v) => v.id === ovId) : true;

                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td className="muted">{s.company?.name || s.companyId}</td>
                    <td className="muted">{String(s.startAt)}</td>
                    <td className="muted">{String(s.endAt)}</td>

                    <td>{renderOfferCell(s)}</td>

                    <td>
                      <select
                        value={selectedVid}
                        onChange={(e) => setSel(s.id, { vehicleId: e.target.value })}
                      >
                        <option value="">Seç</option>

                        {/* offered araç müsait değilse bile bilgi amaçlı dursun */}
                        {ovId && !offeredAvailable ? (
                          <option value={ovId} disabled>
                            TEKLİF #{ovId} (müsait değil)
                          </option>
                        ) : null}

                        {avail.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate}
                            {vehicleMetaLine(v) ? ` • ${vehicleMetaLine(v)}` : ""} (#{v.id})
                          </option>
                        ))}
                      </select>

                      <div className="muted" style={{ marginTop: 6 }}>
                        <b>Driver (auto):</b> {selectedDriver}
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <button type="button" onClick={() => toggleAvail(s.id)} disabled={busy}>
                          {openAvail[s.id]
                            ? `Müsait Araçları Gizle (${avail.length})`
                            : `Müsait Araçları Göster (${avail.length})`}
                        </button>
                      </div>

                      {openAvail[s.id] ? (
                        <div className="card" style={{ marginTop: 8 }}>
                          <div className="muted" style={{ marginBottom: 6 }}>
                            Müsait araçlar (tıkla seç):
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            {avail.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                disabled={busy}
                                onClick={() => setSel(s.id, { vehicleId: String(v.id) })}
                                title="Bu aracı seç"
                              >
                                {v.plate}
                                {vehicleMetaLine(v) ? ` • ${vehicleMetaLine(v)}` : ""} (#{v.id})
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <button disabled={busy} onClick={() => approveShift(s.id)}>
                        {busy ? "..." : "Approve"}
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

      <div className="card">
        <h3>Tüm Shifts</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Company</th>
              <th>Teklifler</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  <span className="pill" data-status={s.status}>
                    {s.status}
                  </span>
                </td>
                <td className="muted">{s.company?.name || s.companyId}</td>

                <td>{renderOfferCellCompact(s)}</td>

                <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
                <td className="muted">{String(s.startAt)}</td>
                <td className="muted">{String(s.endAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}