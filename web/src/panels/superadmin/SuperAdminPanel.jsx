import { useEffect, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";

function copyText(s) {
  const v = String(s ?? "");
  if (!v) return;
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(v).catch(() => {});
  else window.prompt("Kopyala:", v);
}

function Pill({ children, status }) {
  return (
    <span className="pill" data-status={status || "ROLE"}>
      {children}
    </span>
  );
}

const DEMO_PASSWORD = "demo123";
const DEMO_ACCOUNTS = [
  { email: "superadmin@demo.com", role: "SUPER_ADMIN", name: "Super Admin", scope: "-" },
  { email: "company@demo.com", role: "COMPANY", name: "Company Operator", scope: "Company #1 DemoCompany" },
  { email: "room@demo.com", role: "ROOM", name: "Room Operator", scope: "Room #1 DemoRoom" },
  { email: "driver@demo.com", role: "DRIVER", name: "Driver One", scope: "Room #1" },
  { email: "personel@demo.com", role: "PERSONEL", name: "Personel One", scope: "Company #1" },
  { email: "parent@demo.com", role: "PARENT", name: "DemoParent", scope: "Parent" },
  { email: "school@demo.com", role: "COMPANY", name: "School Operator", scope: "Company #2 DemoOkul (SCHOOL)" },
  { email: "organization@demo.com", role: "COMPANY", name: "Organization Operator", scope: "Company #3 DemoOrganizasyon (ORGANIZATION)" },
];

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
        {/* Quick */}
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
          <button className="btn sm" onClick={() => navigate("/superadmin/observability")}>Gözlemleme</button>
          <button className="btn sm" onClick={() => navigate("/superadmin/logexport")}>Log Export</button>
          </div>
          {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
        </div>

        {/* Summary */}
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

        {/* Demo accounts */}
        <div
          style={{
            flex: "1 1 320px",
            padding: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Demo Accounts (seed)</div>
            <button className="btn sm" onClick={() => copyText(DEMO_ACCOUNTS.map((a) => a.email).join("\n"))}>
              Mailleri Kopyala
            </button>
          </div>

          <div className="muted" style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>
              Şifre: <b>{DEMO_PASSWORD}</b>
            </span>
            <button className="btn sm" onClick={() => copyText(DEMO_PASSWORD)}>
              Şifreyi Kopyala
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {DEMO_ACCOUNTS.map((a) => (
              <div
                key={a.email}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <code style={{ opacity: 0.9 }}>{a.email}</code>
                    <Pill status="ROLE">{a.role}</Pill>
                  </div>
                  <div className="muted" style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                    {a.name} • {a.scope}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn sm" onClick={() => copyText(a.email)}>
                    Kopyala
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Not: Bu liste seed ile birlikte gelir. Prod ortamda demo hesapları kullanmayın.
          </div>
        </div>
      </div>
    </div>
  );
}
