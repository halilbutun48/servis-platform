
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
  const published = plans.filter((p) => String(p.status).toUpperCase() === 'PUBLISHED').length;
  const totalStops = plans.reduce((a, p) => a + Number(p?._count?.stops || p?.stops?.length || 0), 0);

  return (
    <div className="stack">
      <div className="card">
        <div className="title">Organization — Planlama Merkezi</div>
        <div className="muted">Personel listesi yerine gidilecek yerler listesi ile çalışan organization modu. Plan oluştur → lokasyon ekle → taslak shift üret → operasyonu mevcut ROOM/DRIVER akışıyla yürüt.</div>
      </div>

      {err ? <div className="card" style={{ color: 'crimson' }}>{err}</div> : null}

      <div className="grid cols-3">
        <div className="card"><div className="muted">Plan sayısı</div><div className="title">{plans.length}</div></div>
        <div className="card"><div className="muted">Taslak plan</div><div className="title">{draft}</div></div>
        <div className="card"><div className="muted">Toplam lokasyon</div><div className="title">{totalStops}</div></div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="title">Organization planları</div>
            <div className="muted">Published planlar vardiya akışına taslak shift olarak aktarılır.</div>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => navigate('/organization/plans')}>Yer planları</button>
            <button type="button" className="btn" onClick={() => navigate('/organization/shifts')}>Vardiyalar</button>
          </div>
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Plan</th><th>Tarih</th><th>Durum</th><th>Lokasyon</th><th></th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{String(p.eventDate || p.startAt || '').slice(0, 10) || '-'}</td>
                <td><span className="pill">{p.status}</span></td>
                <td>{p?._count?.stops || p?.stops?.length || 0}</td>
                <td><button type="button" className="btn sm" onClick={() => navigate('/organization/plans?id=' + p.id)}>Aç</button></td>
              </tr>
            ))}
            {!plans.length ? <tr><td colSpan={5} className="muted">Henüz plan yok.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
