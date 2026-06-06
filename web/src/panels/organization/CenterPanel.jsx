import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import FlowSummaryStrip from "../../components/FlowSummaryStrip";

function fmtDateOnly(v) {
  const s = String(v || "").slice(0, 10);
  return s || "-";
}

function statusLabel(status) {
  const s = String(status || "DRAFT").toUpperCase();
  if (s === "SHIFT_PUBLISHED") return "MARKETE AÇILDI";
  if (s === "AGREEMENT_REQUESTED") return "SÖZLEŞME TALEBİ";
  if (s === "CANCELLED") return "İPTAL";
  return s;
}

export default function OrganizationCenterPanel() {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const r = await api.get("/api/organization/plans");
      setPlans(Array.isArray(r?.items) ? r.items : []);
    } catch {
      setErr("Kurum planları şu anda okunamadı. Yenileyip tekrar deneyin.");
      setPlans([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const items = Array.isArray(plans) ? plans : [];
    return {
      total: items.length,
      draft: items.filter((p) => String(p?.status || "").toUpperCase() === "DRAFT").length,
      published: items.filter((p) => String(p?.status || "").toUpperCase() === "SHIFT_PUBLISHED").length,
      totalStops: items.reduce((sum, p) => sum + Number(p?.stops?.length || 0), 0),
    };
  }, [plans]);

  function openPlan(id) {
    try {
      sessionStorage.setItem("organization:selectedPlanId", String(id));
    } catch { /* no-op: remembered selection is best-effort */ }
    navigate("/organization/plans");
  }

  return (
    <div className="wrap">
      <div className="card">
        <FlowSummaryStrip
          title="Kurum Merkezi"
          description="Operasyonun asıl çalışma ekranı Kurum Planları ekranıdır. Buradan planı açar, markete çıkarır, room&apos;lara fiyatlı teklif yollar ve onay sonrası canlı haritadan takip edersin."
          statusText={busy ? "Yükleniyor" : err ? "Bağlantı okunamadı" : `${stats.total} plan`}
          tone={stats.total ? "success" : "warning"}
          steps={[
            `Taslak ${stats.draft}`,
            `Markete açık ${stats.published}`,
            `Konum ${stats.totalStops}`,
          ]}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 12 }}>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Plan sayısı</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Taslak plan</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.draft}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Toplam konum</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.totalStops}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 12 }}>
            <div className="muted">Markete açılmış plan</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.published}</div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="card err" style={{ marginTop: 12 }}>
          {err}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="title">Hızlı Erişim</div>
            <div className="muted">
              Harita ekranı organization tarafında da company canlı harita yeteneklerini kullanır:
              rota sırası, sıradaki durak, dış navigasyon.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigate("/organization/plans")}>Kurum Planları</button>
            <button type="button" onClick={() => navigate("/organization/shifts")}>Vardiyalar</button>
            <button type="button" onClick={() => navigate("/organization/map")}>Canlı Harita</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="title">Son Planlar</div>
            <div className="muted">Planı açınca Kurum Planları ekranında otomatik seçilir.</div>
          </div>
          <button type="button" onClick={load} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>

        <div className="tableWrap">
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th>Konum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.title || `Plan #${p.id}`}</td>
                  <td>{fmtDateOnly(p.planDate)}</td>
                  <td><span className="pill">{statusLabel(p.status)}</span></td>
                  <td>{p?.stops?.length || 0}</td>
                  <td>
                    <button type="button" className="btn sm" onClick={() => openPlan(p.id)}>
                      Aç
                    </button>
                  </td>
                </tr>
              ))}
              {!plans.length ? (
                <tr>
                  <td colSpan={5} className="muted">Henüz plan yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
