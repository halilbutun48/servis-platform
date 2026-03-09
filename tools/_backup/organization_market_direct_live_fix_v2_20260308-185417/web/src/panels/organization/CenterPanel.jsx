import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

export default function OrganizationCenterPanel() {
  const { token } = useSession();
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    if (!token) return;
    try {
      const r = await api('/api/organization/plans', { token });
      setPlans(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setPlans([]);
    }
  }

  useEffect(() => { load(); }, [token]);

  const draft = plans.filter((p) => String(p.status).toUpperCase() === 'DRAFT').length;
  const published = plans.filter((p) => String(p.status).toUpperCase() === 'SHIFT_PUBLISHED').length;
  const totalStops = plans.reduce((a, p) => a + Number(p?.stops?.length || 0), 0);

  function openPlan(id) {
    try { sessionStorage.setItem('organization:selectedPlanId', String(id)); } catch {}
    navigate('/organization/plans');
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="title">Organization — Planlama Merkezi</div>
        <div className="muted">Organization modunda ana operasyon ekranı <b>Yer Planları</b>'dır. Buradan planları görür, seçer ve ilgili ekranlara geçersin.</div>
      </div>
      {err ? <div className="card danger">{err}</div> : null}
      <div className="grid cols-2">
        <div className="card"><div className="muted">Plan sayısı</div><div className="big">{plans.length}</div></div>
        <div className="card"><div className="muted">Taslak plan</div><div className="big">{draft}</div></div>
        <div className="card"><div className="muted">Toplam lokasyon</div><div className="big">{totalStops}</div></div>
        <div className="card"><div className="muted">Markete açılmış plan</div><div className="big">{published}</div></div>
      </div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div className="title">Organization planları</div>
            <div className="muted">Planlar Yer Planları ekranında düzenlenir. Markete Aç = roomId boş request; Room'lara Teklif = seçili room offers akışı.</div>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate('/organization/plans')}>Yer planları</button>
            <button type="button" className="btn" onClick={() => navigate('/organization/shifts')}>Vardiyalar</button>
            <button type="button" className="btn" onClick={() => navigate('/organization/map')}>Harita</button>
          </div>
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Plan</th><th>Tarih</th><th>Durum</th><th>Lokasyon</th><th></th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.title || `Plan #${p.id}`}</td>
                <td>{String(p.planDate || '').slice(0, 10) || '-'}</td>
                <td><span className="pill">{p.status}</span></td>
                <td>{p?.stops?.length || 0}</td>
                <td><button type="button" className="btn sm" onClick={() => openPlan(p.id)}>Aç</button></td>
              </tr>
            ))}
            {!plans.length ? <tr><td colSpan={5} className="muted">Henüz plan yok.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
