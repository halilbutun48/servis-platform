import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

const ENTRY_HINT_KEY = "room:operationHealthHint";

function badgeStyle(kind, value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (kind === "live") {
    if (normalized === "LIVE") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "STALE") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
    if (normalized === "OFFLINE") return { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  }
  if (kind === "session") {
    if (normalized === "OK") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "REFRESH_NEEDED") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  }
  if (kind === "permission") {
    if (normalized === "GRANTED") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "DENIED" || normalized === "UNKNOWN") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  }
  if (kind === "severity") {
    if (normalized === "HIGH") return { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
    if (normalized === "MEDIUM") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
    if (normalized === "LOW") return { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  }
  return { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
}

function StatusBadge({ kind, value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        ...badgeStyle(kind, value),
      }}
    >
      {value || "-"}
    </span>
  );
}

function MetricCard({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 180px" }}>
      <div className="muted" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function buildGuideHint(title, detail, extras = {}) {
  return {
    source: "ROOM_OPERATION_HEALTH",
    title: String(title || "Operasyon sağlığı uyarısı"),
    detail: String(detail || ""),
    ...extras,
  };
}

function openRoomCopilotWithHint(hint) {
  try {
    sessionStorage.setItem(ENTRY_HINT_KEY, JSON.stringify(hint));
  } catch {}
  navigate("/room/copilot");
}

function DriverRow({ item }) {
  const issueText = String(item.issueSummary || "").trim();
  return (
    <tr>
      <td>{item.driverName}</td>
      <td>{item.vehiclePlate}</td>
      <td><StatusBadge kind="live" value={item.liveState} /></td>
      <td>{item.gpsReliabilityScore ?? "-"}</td>
      <td>{item.lastGpsAt || "-"}</td>
      <td><StatusBadge kind="permission" value={item.permissionState || "-"} /></td>
      <td><StatusBadge kind="session" value={item.sessionState || "-"} /></td>
      <td>
        <div>{issueText || "-"}</div>
        {issueText ? (
          <button
            type="button"
            style={{ marginTop: 8 }}
            onClick={() =>
              openRoomCopilotWithHint(
                buildGuideHint(
                  item.driverName ? `${item.driverName} için durum özeti` : "Sürücü durum özeti",
                  issueText,
                  {
                    driverName: item.driverName,
                    vehiclePlate: item.vehiclePlate,
                    liveState: item.liveState,
                    sessionState: item.sessionState,
                    permissionState: item.permissionState,
                  }
                )
              )
            }
          >
            Rehberde aç
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export default function OperationHealthPanel() {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, d, i] = await Promise.all([
          api("/api/observability/room/summary", { token }),
          api("/api/observability/room/drivers", { token }),
          api("/api/observability/room/issues", { token }),
        ]);
        if (cancelled) return;
        setSummary(s || null);
        setDrivers(Array.isArray(d?.items) ? d.items : []);
        setIssues(Array.isArray(i?.items) ? i.items : []);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      { title: "Aktif Sürücü", value: c.activeDrivers ?? "-", note: "Kendi operasyon alanınız" },
      { title: "Riskli Cihaz", value: c.riskyDevices ?? "-", note: "İzin, oturum veya GPS sorunu" },
      { title: "Stale / Offline", value: c.staleOrOffline ?? "-", note: "Son konum akışı zayıf" },
      { title: "Açık Sorun", value: c.openIssues ?? "-", note: "Takip edilmesi gereken durum" },
    ];
  }, [summary]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Operasyon Sağlığı</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Room için sürücü, araç ve canlılık görünürlüğü
          </div>
        </div>
        <div className="muted">Kapsam: Kendi operasyon alanınız</div>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {cards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Sorunlu Sürücüler / Canlılık Listesi</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Sürücü</th>
                  <th>Araç</th>
                  <th>Durum</th>
                  <th>GPS Skoru</th>
                  <th>Son Konum</th>
                  <th>İzin</th>
                  <th>Oturum</th>
                  <th>Özet</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((item) => (
                  <DriverRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Açık Sorunlar</div>
          <div style={{ display: "grid", gap: 10 }}>
            {issues.length ? issues.map((issue, idx) => (
              <div key={idx} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{issue.title}</div>
                  <StatusBadge kind="severity" value={issue.severity} />
                </div>
                <div className="muted" style={{ marginTop: 8 }}>{issue.detail}</div>
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => openRoomCopilotWithHint(buildGuideHint(issue.title, issue.detail, { severity: issue.severity }))}
                  >
                    Rehberde ne yapacağımı göster
                  </button>
                </div>
              </div>
            )) : <div className="muted">Açık sorun yok.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
