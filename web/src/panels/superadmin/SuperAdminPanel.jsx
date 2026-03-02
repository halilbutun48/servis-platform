import { useEffect, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

export default function SuperAdminPanel() {
  const { me, token } = useSession();
  const [stats, setStats] = useState({
    companies: null,
    rooms: null,
    vehicles: null,
    drivers: null,
    companiesTotal: null,
    roomsTotal: null,
    vehiclesTotal: null,
    driversTotal: null,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadStats() {
    setBusy(true);
    setErr("");
    try {
      const s = await api("/api/admin/stats", { token });
      setStats({
        companies: s?.companies ?? null,
        rooms: s?.rooms ?? null,
        vehicles: s?.vehicles ?? null,
        drivers: s?.drivers ?? null,
        companiesTotal: s?.companiesTotal ?? null,
        roomsTotal: s?.roomsTotal ?? null,
        vehiclesTotal: s?.vehiclesTotal ?? null,
        driversTotal: s?.driversTotal ?? null,
      });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadStats();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fmtActiveTotal = (active, total) => {
    if (active == null && total == null) return "-";
    if (total == null) return String(active ?? "-");
    return `${active ?? "-"} / ${total}`;
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>SUPER_ADMIN</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            {me?.email} • {me?.role}
          </div>
        </div>
        <div className="saActions" style={{ alignSelf: "flex-start" }}>
          <button className="btn sm" disabled={busy} onClick={loadStats}>
            Özeti Yenile
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Hızlı erişim</div>
          <div className="saActions">
            <button className="btn sm" onClick={() => navigate("/superadmin/companies")}>Şirketler</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/rooms")}>Room’lar</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/users")}>Kullanıcılar</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/regions")}>İller</button>
            <button className="btn sm" onClick={() => navigate("/superadmin/audit")}>Audit</button>
          </div>
          {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
        </div>

        <div
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Özet</div>

          <div style={{ opacity: 0.9 }}>Şirket (aktif/toplam): {fmtActiveTotal(stats.companies, stats.companiesTotal)}</div>
          <div style={{ opacity: 0.9, marginTop: 6 }}>Room (aktif/toplam): {fmtActiveTotal(stats.rooms, stats.roomsTotal)}</div>
          <div style={{ opacity: 0.9, marginTop: 6 }}>Araç sayısı: {stats.vehiclesTotal ?? stats.vehicles ?? "-"}</div>
          <div style={{ opacity: 0.9, marginTop: 6 }}>Şoför sayısı: {stats.driversTotal ?? stats.drivers ?? "-"}</div>

          <div className="muted" style={{ marginTop: 10 }}>
            Not: Özet “aktif” sayıları DELETED (soft delete) kayıtları hariç tutar.
          </div>
        </div>
      </div>
    </div>
  );
}
