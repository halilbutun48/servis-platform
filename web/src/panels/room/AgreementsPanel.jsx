import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";

function ConflictBox({ errObj }) {
  if (!errObj) return null;
  const code = errObj?.code;
  const msg = errObj?.message || errObj?.error || "Conflict";
  const c = errObj?.conflictingAgreement;

  return (
    <div style={{ border: "1px solid #f3c", padding: 10, borderRadius: 10, marginTop: 10 }}>
      <div style={{ fontWeight: 800, color: "#b07" }}>{code || "CONFLICT"}</div>
      <div className="muted" style={{ marginTop: 4 }}>{msg}</div>

      {c ? (
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          <div>conflict agreementId: <b>{c.id}</b></div>
          <div>status: {c.status}</div>
          <div>date: {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}</div>
          <div>time: {toHHMM(c.startMin)} → {toHHMM(c.endMin)}</div>
          <div>days: {weekMaskToText(c.weekMask)} (mask={c.weekMask})</div>
          <div>v:{c.vehicleId ?? "-"} / d:{c.driverId ?? "-"}</div>
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
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [approveId, setApproveId] = useState(null);
  const [selVehicle, setSelVehicle] = useState("");
  const [selDriver, setSelDriver] = useState("");
  const [conflict, setConflict] = useState(null);

  const approveTarget = useMemo(
    () => pending.find((x) => x.id === approveId),
    [pending, approveId]
  );

  async function loadAll() {
    if (!token) return;
    setErr("");
    try {
      const p = await api("/api/agreements?take=100&status=REQUESTED", { token });
      setPending(p?.items ?? []);

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

      // success
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

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Agreements (Room)</h2>

      {err ? <div style={{ color: "crimson" }}>{String(err)}</div> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Pending (REQUESTED)</div>
          <button type="button" disabled={busy} onClick={loadAll}>Yenile</button>
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr className="muted">
                <th align="left">ID</th>
                <th align="left">Date</th>
                <th align="left">Time</th>
                <th align="left">Günler</th>
                <th align="left">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{a.id}</td>
                  <td className="muted">
                    {String(a.startDate).slice(0, 10)} → {String(a.endDate).slice(0, 10)}
                  </td>
                  <td className="muted">
                    {toHHMM(a.startMin)} → {toHHMM(a.endMin)}{" "}
                    {a.endMin < a.startMin ? <span title="midnight">🌙</span> : null}
                  </td>
                  <td className="muted" title={`weekMask=${a.weekMask}`}>
                    {weekMaskToText(a.weekMask)}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setApproveId(a.id);
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
                  <td colSpan={5} className="muted" style={{ paddingTop: 10 }}>
                    Pending yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {approveTarget ? (
          <div style={{ marginTop: 12, borderTop: "1px dashed #ddd", paddingTop: 12 }}>
            <div style={{ fontWeight: 800 }}>Approve Agreement #{approveTarget.id}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Vehicle
                <select
                  value={selVehicle}
                  onChange={(e) => {
                    setSelVehicle(e.target.value);
                    setConflict(null);
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">Seç</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate ?? `#${v.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="muted">
                Driver
                <select
                  value={selDriver}
                  onChange={(e) => {
                    setSelDriver(e.target.value);
                    setConflict(null);
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">Seç</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName ?? `#${d.id}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" disabled={busy} onClick={approve}>
                {busy ? "Onaylanıyor..." : "Onayla"}
              </button>
              <button type="button" disabled={busy} onClick={() => setApproveId(null)}>
                Vazgeç
              </button>
            </div>

            <ConflictBox errObj={conflict} />
          </div>
        ) : null}
      </div>
    </div>
  );
}