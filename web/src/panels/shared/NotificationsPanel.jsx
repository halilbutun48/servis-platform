// web/src/panels/shared/NotificationsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { normalizeNotifV1 } from "../../utils/notificationV1";

function fmt(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fmtAtCompact(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  // daha kısa: DD.MM HH:mm:ss
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}:${ss}`;
}

function fmtAge(ageSec) {
  if (typeof ageSec !== "number" || Number.isNaN(ageSec)) return "";
  const s = Math.max(0, Math.floor(ageSec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function chipClassByValue(v) {
  const x = String(v || "").toUpperCase();
  if (!x) return "chip";
  if (x.includes("OFFLINE") || x === "STALE") return "chip chipDanger";
  if (x.includes("RECOVERY") || x === "LIVE") return "chip chipOk";
  if (x.includes("MAINT")) return "chip chipWarn";
  if (x === "ACCEPTED") return "chip chipOk";
  if (x === "CANCELLED") return "chip chipWarn";
  return "chip";
}

export default function NotificationsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/notifications/my", { token });
      const list = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
      setItems(list);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useAutoReload("notifications", load);

  const rows = useMemo(() => {
    return (items || []).map((n, idx) => {
      const rawPayload = n?.payloadJson ?? n?.payload ?? null;
      const p = normalizeNotifV1(rawPayload);

      const title = p.title || fmt(n?.type) || "-";
      const message = p.message || "";
      const vehicleId = p.vehicleId ?? n?.vehicleId ?? "";
      const atRaw = p.at ?? n?.createdAt ?? "";
      const at = fmtAtCompact(atRaw);

      const payloadPretty = JSON.stringify(p, null, 2);

      return {
        key: n?.id ?? idx,
        id: n?.id ?? "-",
        scope: fmt(n?.scope ?? "-"),
        type: fmt(n?.type ?? "-"),
        title,
        message,
        vehicleId: fmt(vehicleId),
        kind: fmt(p.kind ?? ""),
        status: fmt(p.status ?? ""),
        ageSec: p.ageSec,
        at,
        atRaw: fmt(atRaw),
        payloadPretty,
      };
    });
  }, [items]);

  return (
    <div className="wrap notifWide">
      <style>{`
        .wrap.notifWide { max-width:none !important; width:100% !important; }

        .notifLayout { display:flex; flex-direction:column; gap:12px; min-height: calc(100vh - 120px); }
        .notifTopbar { display:flex; align-items:center; justify-content:space-between; gap:12px; }

        .notifTblCard { flex:1; min-height:420px; overflow:hidden; }
        /* YATAY SCROLL İSTEMİYORUZ -> x hidden */
        .notifTblWrap { height:100%; overflow-y:auto; overflow-x:hidden; }

        .notifTbl { width:100%; border-collapse:collapse; table-layout:fixed; }
        .notifTbl th, .notifTbl td { padding:8px 8px; vertical-align:top; }
        .notifTbl thead th {
          position:sticky; top:0;
          background: rgba(12,18,28,0.92);
          backdrop-filter: blur(6px);
          z-index:1;
        }

        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .nowrap { white-space:nowrap; }
        .ellipsis { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* 2 satır clamp (Message için) */
        .clamp2{
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }

        .chip {
          display:inline-flex; align-items:center; gap:6px;
          padding:3px 8px; border-radius:999px;
          border:1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          font-weight:700; font-size:11px;
          max-width:100%;
        }
        .chipOk { border-color: rgba(46, 204, 113, 0.35); background: rgba(46, 204, 113, 0.12); }
        .chipWarn { border-color: rgba(241, 196, 15, 0.35); background: rgba(241, 196, 15, 0.12); }
        .chipDanger { border-color: rgba(231, 76, 60, 0.35); background: rgba(231, 76, 60, 0.12); }

        /* Daha kompakt kolonlar (yatay taşmayı azaltır) */
        .colId { width:54px; }
        .colType { width:116px; }
        .colScope { width:96px; }
        .colAt { width:120px; }
        .colTitle { width:160px; }
        .colMsg { width:auto; }        /* kalan alan Message */
        .colVehicle { width:68px; }
        .colKind { width:120px; }
        .colStatus { width:110px; }
        .colAge { width:60px; }
        .colPayload { width:72px; }

        /* küçük ekran: bazı kolonları gizle (opsiyonel ama çok işe yarıyor) */
        @media (max-width: 1150px){
          .hideMd { display:none; }
        }
        @media (max-width: 980px){
          .hideSm { display:none; }
        }
      `}</style>

      <div className="notifLayout">
        <div className="card">
          <div className="notifTopbar">
            <div>
              <h3 style={{ margin: 0 }}>Notifications</h3>
              <div className="muted">Son 100 kayıt</div>
            </div>
            <button onClick={load} disabled={busy}>
              {busy ? "..." : "Yenile"}
            </button>
          </div>
        </div>

        {err ? <div className="card err">Hata: {err}</div> : null}

        <div className="card notifTblCard">
          <div className="notifTblWrap">
            {rows.length === 0 ? (
              <div className="muted">Henüz bildirim yok (veya endpoint boş dönüyor).</div>
            ) : (
              <table className="notifTbl">
                <colgroup>
                  <col className="colId" />
                  <col className="colType" />
                  <col className="colScope" />
                  <col className="colAt" />
                  <col className="colTitle" />
                  <col className="colMsg" />
                  <col className="colVehicle" />
                  <col className="colKind" />
                  <col className="colStatus" />
                  <col className="colAge" />
                  <col className="colPayload" />
                </colgroup>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Scope</th>
                    <th>At</th>
                    <th className="hideSm">Title</th>
                    <th>Message</th>
                    <th className="hideMd">Veh</th>
                    <th className="hideMd">Kind</th>
                    <th className="hideSm">Status</th>
                    <th className="hideMd">Age</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="mono nowrap">{r.id}</td>

                      <td>
                        <span className={chipClassByValue(r.type)} title={r.type}>
                          <span className="ellipsis" style={{ maxWidth: 96 }}>{r.type}</span>
                        </span>
                      </td>

                      <td className="mono nowrap">{r.scope}</td>

                      <td className="muted mono nowrap" title={r.atRaw}>
                        {r.at}
                      </td>

                      <td className="hideSm ellipsis" title={r.title}>
                        {r.title}
                      </td>

                      <td className="muted clamp2" title={r.message}>
                        {r.message}
                      </td>

                      <td className="hideMd muted mono nowrap">{r.vehicleId || "-"}</td>

                      <td className="hideMd">
                        {r.kind ? (
                          <span className={chipClassByValue(r.kind)} title={r.kind}>
                            <span className="ellipsis" style={{ maxWidth: 96 }}>{r.kind}</span>
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>

                      <td className="hideSm">
                        {r.status ? (
                          <span className={chipClassByValue(r.status)} title={r.status}>
                            <span className="ellipsis" style={{ maxWidth: 90 }}>{r.status}</span>
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>

                      <td className="hideMd muted mono nowrap" title={typeof r.ageSec === "number" ? `${r.ageSec}s` : ""}>
                        {fmtAge(r.ageSec)}
                      </td>

                      <td>
                        <button style={{ padding: "6px 10px" }} onClick={() => setSelected(r)} title="v1 payload">
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selected ? (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(900px, 95vw)", maxHeight: "85vh", overflow: "auto" }}
          >
            <div className="topbar" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Notification #{selected.id}</h3>
                <div className="muted mono">
                  {selected.type} • {selected.scope} • {selected.at}
                </div>
              </div>
              <button onClick={() => setSelected(null)}>Kapat</button>
            </div>

            <div className="muted" style={{ marginBottom: 8 }}>
              <b>Title:</b> {selected.title || "-"}
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              <b>Message:</b> {selected.message || "-"}
            </div>

            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{selected.payloadPretty}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}