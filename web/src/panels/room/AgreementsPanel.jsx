import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";

function pill(status) {
  const s = String(status || "").toUpperCase();
  return (
    <span className="pill" data-status={s} title={s}>
      {s}
    </span>
  );
}

function moneyTry(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `₺${n}`;
}

function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function OfferCell({ amount, note }) {
  const a = moneyTry(amount);
  const n = String(note || "").trim();
  return (
    <div title={n || ""}>
      <div style={{ fontWeight: 800 }}>{a}</div>
      {n ? <div className="muted" style={{ fontSize: 12 }}>{n}</div> : null}
    </div>
  );
}

function ConflictBox({ errObj }) {
  if (!errObj) return null;
  const code = errObj?.code;
  const msg = errObj?.message || errObj?.error || "Conflict";
  const c = errObj?.conflictingAgreement;

  return (
    <div className="card" style={{ borderColor: "rgba(239,68,68,.45)", background: "rgba(85,16,20,.25)" }}>
      <div style={{ fontWeight: 900 }}>{code || "CONFLICT"}</div>
      <div className="muted" style={{ marginTop: 6 }}>{msg}</div>

      {c ? (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          <div>
            conflict agreementId: <b>{c.id}</b>
          </div>
          <div>status: {c.status}</div>
          <div>
            date: {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
          </div>
          <div>
            time: {toHHMM(c.startMin)} → {toHHMM(c.endMin)}
          </div>
          <div>
            days: {weekMaskToText(c.weekMask)} (mask={c.weekMask})
          </div>
          <div>
            v:{c.vehicleId ?? "-"} / d:{c.driverId ?? "-"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AgreementsPanel() {
  const { token } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [pending, setPending] = useState([]);
  const [others, setOthers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [approveId, setApproveId] = useState(null);
  const [selVehicle, setSelVehicle] = useState("");
  const [selDriver, setSelDriver] = useState("");
  const [conflict, setConflict] = useState(null);

  const [counterId, setCounterId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  const approveTarget = useMemo(() => pending.find((x) => x.id === approveId), [pending, approveId]);
  const counterTarget = useMemo(() => pending.find((x) => x.id === counterId), [pending, counterId]);

  async function loadAll() {
    if (!token) return;
    setErr("");
    try {
      const all = await api("/api/agreements?take=200", { token });
      const items = all?.items ?? [];
      setPending(items.filter((x) => String(x.status || "").toUpperCase() === "REQUESTED"));
      setOthers(items.filter((x) => String(x.status || "").toUpperCase() !== "REQUESTED"));

      const v = await api("/api/vehicles", { token });
      setVehicles(v?.items ?? v ?? []);

      const d = await api("/api/drivers", { token });
      setDrivers(d?.items ?? d ?? []);
    } catch (e) {
      setErr(e?.message || "Load failed");
    }
  }

  // ✅ WS invalidate → agreements topic gelince reload
  useAutoReload("agreements", loadAll, !!token);

  useEffect(() => {
    if (!token) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function approve() {
    setConflict(null);
    setErr("");

    if (!approveId) return;
    const vehicleId = Number(selVehicle);
    const driverId = Number(selDriver);
    if (!vehicleId || !driverId) return setErr("vehicle+driver seçmelisin");

    setBusy(true);
    try {
      await api(`/api/agreements/${approveId}/approve`, {
        token,
        method: "PUT",
        body: { vehicleId, driverId },
      });

      setApproveId(null);
      setSelVehicle("");
      setSelDriver("");
      await loadAll();
    } catch (e) {
      const status = e?.status ?? null;
      const payload = e?.payload ?? null;

      if (status === 409) {
        setConflict(payload || { code: "CONFLICT", message: e?.message || "Conflict" });
      } else {
        setErr(e?.message || "Approve failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function counter() {
    setErr("");
    if (!counterId) return;
    const amount = parseTryInput(counterAmount);
    if (!amount) return setErr("Karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${counterId}/counter`, {
        token,
        method: "PUT",
        body: { roomOfferAmount: amount, roomOfferNote: String(counterNote || "").trim() || null },
      });

      setCounterId(null);
      setCounterAmount("");
      setCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Counter failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="topbar">
        <div>
          <div className="title">Sözleşmeler (Room)</div>
          <div className="muted">Pending onay (REQUESTED) burada. Süre uzatma (extend) Company tarafındadır.</div>
        </div>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={loadAll}>
          Yenile
        </button>
      </div>

      {err ? <div className="card err">{String(err)}</div> : null}

      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Pending (REQUESTED)</div>
        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Günler</th>
                <th>Dir/Pat</th>
                <th>Hub</th>
                <th>Company Teklif</th>
                <th>Room Karşı</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">
                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}
                  </td>
                  <td className="muted">
                    {typeof a.hubLat === "number" && typeof a.hubLng === "number" ? `${a.hubLat.toFixed(4)}, ${a.hubLng.toFixed(4)}` : "-"}
                  </td>
                  <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                  <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                  <td>
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={busy}
                      onClick={() => {
                        setCounterId(a.id);
                        setApproveId(null);
                        setConflict(null);
                        setCounterAmount(String(a.roomOfferAmount ?? a.companyOfferAmount ?? ""));
                        setCounterNote(String(a.roomOfferNote ?? ""));
                      }}
                    >
                      Counter
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={busy}
                      onClick={() => {
                        setApproveId(a.id);
                        setCounterId(null);
                        setConflict(null);
                      }}
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
              {!pending.length ? (
                <tr>
                  <td colSpan={9} className="muted">Pending yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {counterTarget ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Counter Agreement #{counterTarget.id}</div>

            <div className="muted" style={{ marginTop: 6 }}>
              Company teklif: <b>{moneyTry(counterTarget.companyOfferAmount)}</b>
              {counterTarget.companyOfferNote ? <span> — {counterTarget.companyOfferNote}</span> : null}
            </div>

            <div className="fieldRow" style={{ marginTop: 12 }}>
              <div className="field">
                <div className="muted">Karşı Teklif (₺)</div>
                <input value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="örn: 5000" />
              </div>
              <div className="field" style={{ flex: 2 }}>
                <div className="muted">Not (opsiyonel)</div>
                <input value={counterNote} onChange={(e) => setCounterNote(e.target.value)} placeholder="örn: 3 gün / 2 araç" />
              </div>
            </div>

            <div className="actionsRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm primary" disabled={busy} onClick={counter}>
                {busy ? "Gönderiliyor..." : "Karşı Teklif Gönder"}
              </button>
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy}
                onClick={() => {
                  setCounterId(null);
                  setCounterAmount("");
                  setCounterNote("");
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        ) : null}

        {approveTarget ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900 }}>Approve Agreement #{approveTarget.id}</div>

            <div className="muted" style={{ marginTop: 6 }}>
              Company teklif: <b>{moneyTry(approveTarget.companyOfferAmount)}</b>
              {approveTarget.companyOfferNote ? <span> — {approveTarget.companyOfferNote}</span> : null}
            </div>

            <div className="fieldRow" style={{ marginTop: 12 }}>
              <div className="field">
                <div className="muted">Vehicle</div>
                <select
                  value={selVehicle}
                  onChange={(e) => {
                    setSelVehicle(e.target.value);
                    setConflict(null);
                  }}
                >
                  <option value="">Seç</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ?? `#${v.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="muted">Driver</div>
                <select
                  value={selDriver}
                  onChange={(e) => {
                    setSelDriver(e.target.value);
                    setConflict(null);
                  }}
                >
                  <option value="">Seç</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName ?? `#${d.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actionsRow" style={{ marginTop: 12 }}>
              <button type="button" className="btn sm primary" disabled={busy} onClick={approve}>
                {busy ? "Onaylanıyor..." : "Onayla"}
              </button>
              <button
                type="button"
                className="btn sm ghost"
                disabled={busy}
                onClick={() => {
                  setApproveId(null);
                  setSelVehicle("");
                  setSelDriver("");
                  setConflict(null);
                }}
              >
                Vazgeç
              </button>
            </div>

            <ConflictBox errObj={conflict} />
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Diğer Kayıtlar</div>
          <div className="muted">APPROVED / ACTIVE / DONE / CANCELLED...</div>
        </div>

        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Date</th>
                <th>Time</th>
                <th>Days</th>
                <th>Dir/Pat</th>
                <th>Company Teklif</th>
                <th>Room Karşı</th>
                <th>Vehicle</th>
                <th>Driver</th>
              </tr>
            </thead>
            <tbody>
              {others.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{pill(a.status)}</td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">{String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}</td>
                  <td><OfferCell amount={a.companyOfferAmount} note={a.companyOfferNote} /></td>
                  <td><OfferCell amount={a.roomOfferAmount} note={a.roomOfferNote} /></td>
                  <td className="muted">{a.vehicle?.plate ?? a.vehicleId ?? "-"}</td>
                  <td className="muted">{a.driver?.fullName ?? a.driverId ?? "-"}</td>
                </tr>
              ))}
              {!others.length ? (
                <tr>
                  <td colSpan={10} className="muted">Kayıt yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
