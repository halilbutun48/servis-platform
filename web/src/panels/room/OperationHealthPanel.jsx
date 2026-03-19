import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function MetricCard({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 180px" }}>
      <div className="muted" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function DriverRow({ item }) {
  return (
    <tr>
      <td>{item.driverName}</td>
      <td>{item.vehiclePlate}</td>
      <td>{item.liveState}</td>
      <td>{item.gpsReliabilityScore ?? "-"}</td>
      <td>{item.lastGpsAt || "-"}</td>
      <td>{item.permissionState || "-"}</td>
      <td>{item.sessionState || "-"}</td>
      <td>{item.issueSummary || "-"}</td>
    </tr>
  );
}

export default function OperationHealthPanel() {
  const { token, me } = useSession();
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
      { title: "Aktif Sürücü", value: c.activeDrivers ?? "-", note: "Kendi room kapsamın" },
      { title: "Riskli Cihaz", value: c.riskyDevices ?? "-", note: "İzin, session veya GPS sorunu" },
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
        <div className="muted">Kapsam: {summary?.roomLabel || me?.email || "ROOM"}</div>
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
                  <th>Session</th>
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
                <div style={{ fontWeight: 700 }}>{issue.title}</div>
                <div className="muted" style={{ marginTop: 4 }}>{issue.detail}</div>
                <div className="muted" style={{ marginTop: 6 }}>Seviye: {issue.severity}</div>
              </div>
            )) : <div className="muted">Açık sorun yok.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
