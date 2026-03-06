import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";

// ✅ M59 helpers
function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}
function ShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);
  return (
    <div className="muted" style={{ lineHeight: 1.2 }}>
      <div>Bugün: {tTot ? (tDone + "/" + tTot + " DONE") : "-"}</div>
      <div>Ufuk: {h ? (h + " APPROVED") : "-"}</div>
    </div>
  );
}


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

function ymd(d) {
  return String(d || "").slice(0, 10);
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
  const [shiftStats, setShiftStats] = useState({}); // ✅ M59

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [approveId, setApproveId] = useState(null);
  const [selVehicle, setSelVehicle] = useState("");
  const [selDriver, setSelDriver] = useState("");
  const [conflict, setConflict] = useState(null);

  const [counterId, setCounterId] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  // ✅ M57: agreement extend negotiation (Room side)
  const [extendItems, setExtendItems] = useState([]);
  const [extendCounterId, setExtendCounterId] = useState(null);
  const [extendCounterAmount, setExtendCounterAmount] = useState("");
  const [extendCounterNote, setExtendCounterNote] = useState("");

  const approveTarget = useMemo(() => pending.find((x) => x.id === approveId), [pending, approveId]);
  const counterTarget = useMemo(() => pending.find((x) => x.id === counterId), [pending, counterId]);

  async function loadAll() {
    if (!token) return;
    setErr("");
    try {
      const all = await api("/api/agreements?take=200", { token });
      const items = all?.items ?? [];

      // ✅ M59: shift stats (today/horizon) for UI clarity
      try {
        const ids = items.map((x) => x?.id).filter(Boolean);
        if (ids.length) {
          const st = await api("/api/agreements/shift-stats", { token, method: "POST", body: { agreementIds: ids, horizonDays: 7 } });
          setShiftStats(st?.byId ?? {});
        } else {
          setShiftStats({});
        }
      } catch {
        setShiftStats({});
      }


      // ✅ M58.3: robust extend request detection (handles older/variant field names)
      const extend = items.filter((x) => {
        const es = String(x?.extendStatus || "NONE").toUpperCase();
        const reqEnd = x?.extendRequestedEndDate ?? x?.extendRequestedEndAt ?? x?.extendRequestedEnd ?? null;
        // REQUESTED/COUNTERED are canonical. PENDING is tolerated as alias for safety.
        return !!reqEnd && ["REQUESTED", "COUNTERED", "PENDING"].includes(es);
      });
      setExtendItems(extend);
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

  async function extendDecision(id, decision) {
    setErr("");
    setBusy(true);
    try {
      await api(`/api/agreements/${id}/extend-decision`, { token, method: "PUT", body: { decision } });
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Extend decision failed");
    } finally {
      setBusy(false);
    }
  }

  async function extendCounter() {
    setErr("");
    if (!extendCounterId) return;
    const amount = parseTryInput(extendCounterAmount);
    if (!amount) return setErr("Uzatma karşı teklif amount gerekli");

    setBusy(true);
    try {
      await api(`/api/agreements/${extendCounterId}/extend-counter`, {
        token,
        method: "PUT",
        body: { extendCounterAmount: amount, extendCounterNote: String(extendCounterNote || "").trim() || null },
      });

      setExtendCounterId(null);
      setExtendCounterAmount("");
      setExtendCounterNote("");
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Extend counter failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="card">
      <div className="topbar">
        <div>
          <div className="title">Sözleşmeler (Room)</div>
          <div className="muted">Pending onay (REQUESTED) • Not: Agreement ACTIVE/DONE **zaman bazlıdır** (endDate+endMin). Driver vardiyayı bitirse bile sözleşme endDate geçene kadar ACTIVE kalabilir. + Uzatma talepleri burada. Uzatma için accept/reject/counter yapabilirsin.</div>
        </div>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={loadAll}>
          Yenile
        </button>
      </div>

      {err ? <div className="card err">{String(err)}</div> : null}

      
      <div className="card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Uzatma Talepleri (extend)</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Company uzatma teklifi gönderir → Room: kabul / reddet / karşı teklif.
        </div>

        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Mevcut</th>
                <th>İstenen</th>
                <th>Company Uzatma Teklifi</th>
                <th>Room Counter</th>
                <th>Durum</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {extendItems.map((a) => {
                const ex = String(a.extendStatus || "NONE").toUpperCase();
                const reqEnd = ymd(a.extendRequestedEndDate);
                return (
                  <tr key={"ext-" + a.id}>
                    <td>{a.id}</td>
                    <td className="muted">{ymd(a.startDate)} → {ymd(a.endDate)}</td>
                    <td className="muted">{reqEnd || "-"}</td>
                    <td><OfferCell amount={a.extendOfferAmount} note={a.extendOfferNote} /></td>
                    <td><OfferCell amount={a.extendCounterAmount} note={a.extendCounterNote} /></td>
                    <td className="muted">{ex}</td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn sm" disabled={busy || ex !== "PENDING"} onClick={() => extendDecision(a.id, "ACCEPT")}>
                          Kabul
                        </button>
                        <button type="button" className="btn sm ghost" disabled={busy || ex !== "PENDING"} onClick={() => extendDecision(a.id, "REJECT")}>
                          Reddet
                        </button>
                        <button
                          type="button"
                          className="btn sm ghost"
                          disabled={busy || ex !== "PENDING"}
                          onClick={() => {
                            setExtendCounterId(a.id);
                            setExtendCounterAmount(String(a.extendCounterAmount ?? a.extendOfferAmount ?? a.companyOfferAmount ?? ""));
                            setExtendCounterNote(String(a.extendCounterNote ?? ""));
                          }}
                        >
                          Counter
                        </button>
                        {ex === "COUNTERED" ? <span className="muted" style={{ fontSize: 12 }}>Company kararı bekleniyor…</span> : null}
                      </div>

                      {extendCounterId === a.id ? (
                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          <input
                            className="inp"
                            placeholder="Karşı teklif (₺)"
                            value={extendCounterAmount}
                            onChange={(e) => setExtendCounterAmount(e.target.value)}
                            disabled={busy}
                          />
                          <input
                            className="inp"
                            placeholder="Not (opsiyonel)"
                            value={extendCounterNote}
                            onChange={(e) => setExtendCounterNote(e.target.value)}
                            disabled={busy}
                          />
                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button type="button" className="btn sm" disabled={busy} onClick={extendCounter}>
                              Gönder
                            </button>
                            <button
                              type="button"
                              className="btn sm ghost"
                              disabled={busy}
                              onClick={() => {
                                setExtendCounterId(null);
                                setExtendCounterAmount("");
                                setExtendCounterNote("");
                              }}
                            >
                              Vazgeç
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!extendItems.length ? (
                <tr>
                  <td colSpan={7} className="muted">Uzatma talebi yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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
                <th>Vardiyalar</th>
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
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)} {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>{weekMaskToText(a.weekMask)}</td>
                  <td className="muted">
                    {String(a.direction || "INBOUND")}/{String(a.pattern || "ONE_WAY")}
                  </td>
                  <td><ShiftSummary st={shiftStats?.[a.id]} /></td>
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
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)} {(() => { const endYmd = String(a.endDate || "").slice(0,10); const left = daysLeftYmd(endYmd); return Number.isFinite(left) ? ` (kalan ${left}g)` : ""; })()}
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





