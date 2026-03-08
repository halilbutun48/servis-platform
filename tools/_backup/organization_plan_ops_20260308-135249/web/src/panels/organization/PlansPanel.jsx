
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultForm() {
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return { name: '', eventDate: String(now.toISOString()).slice(0,10), startAt: toLocalInputValue(now.toISOString()), endAt: toLocalInputValue(later.toISOString()), direction: 'OUTBOUND', hubLat: '', hubLng: '', note: '' };
}

export default function OrganizationPlansPanel() {
  const { token } = useSession();
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [stopForm, setStopForm] = useState({ name: '', address: '', lat: '', lng: '', orderHint: 1, passengerCount: 1, note: '' });
  const [err, setErr] = useState('');
  const selected = useMemo(() => plans.find((p) => p.id === selectedId) || null, [plans, selectedId]);

  async function load() {
    if (!token) return;
    const r = await api('/api/organization/plans', { token });
    const items = Array.isArray(r?.items) ? r.items : [];
    setPlans(items);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }

  useEffect(() => { load().catch((e) => setErr(String(e?.message || e))); }, [token]);

  async function createPlan() {
    setErr('');
    try {
      await api('/api/organization/plans', { method: 'POST', token, body: { ...form, hubLat: form.hubLat === '' ? null : Number(form.hubLat), hubLng: form.hubLng === '' ? null : Number(form.hubLng), eventDate: form.eventDate || null, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() } });
      setForm(defaultForm());
      await load();
    } catch (e) { setErr(String(e?.message || e)); }
  }

  async function addStop() {
    if (!selected) return;
    setErr('');
    try {
      await api(`/api/organization/plans/${selected.id}/stops/upsert`, { method: 'POST', token, body: { items: [{ ...stopForm, lat: Number(stopForm.lat), lng: Number(stopForm.lng), orderHint: Number(stopForm.orderHint), passengerCount: Number(stopForm.passengerCount) }] } });
      setStopForm({ name: '', address: '', lat: '', lng: '', orderHint: (selected?.stops?.length || 0) + 1, passengerCount: 1, note: '' });
      await load();
    } catch (e) { setErr(String(e?.message || e)); }
  }

  async function publishPlan() {
    if (!selected) return;
    setErr('');
    try {
      await api(`/api/organization/plans/${selected.id}/publish-draft`, { method: 'POST', token, body: {} });
      await load();
    } catch (e) { setErr(String(e?.message || e)); }
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="title">Organization yer planları</div>
        <div className="muted">Her plan, gidilecek yerler listesini ve bu listenin vardiyaya dönüştürülen taslak rotasını temsil eder.</div>
      </div>
      {err ? <div className="card" style={{ color: 'crimson' }}>{err}</div> : null}
      <div className="grid cols-2">
        <div className="card">
          <div className="title">Yeni plan</div>
          <div className="row"><input placeholder="Plan adı" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
          <div className="row"><input type="date" value={form.eventDate} onChange={(e) => setForm((s) => ({ ...s, eventDate: e.target.value }))} /><select value={form.direction} onChange={(e) => setForm((s) => ({ ...s, direction: e.target.value }))}><option value="OUTBOUND">OUTBOUND</option><option value="INBOUND">INBOUND</option></select></div>
          <div className="row"><input type="datetime-local" value={form.startAt} onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value }))} /><input type="datetime-local" value={form.endAt} onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value }))} /></div>
          <div className="row"><input placeholder="Hub lat" value={form.hubLat} onChange={(e) => setForm((s) => ({ ...s, hubLat: e.target.value }))} /><input placeholder="Hub lng" value={form.hubLng} onChange={(e) => setForm((s) => ({ ...s, hubLng: e.target.value }))} /></div>
          <textarea rows={3} placeholder="Not" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          <div className="row" style={{ marginTop: 10 }}><button type="button" className="btn" onClick={createPlan}>Plan oluştur</button></div>
        </div>
        <div className="card">
          <div className="title">Plan listesi</div>
          <div className="stack" style={{ maxHeight: 420, overflow: 'auto' }}>
            {plans.map((p) => (
              <button key={p.id} type="button" className={selectedId === p.id ? 'btn sm' : 'btn sm ghost'} onClick={() => setSelectedId(p.id)} style={{ justifyContent: 'space-between' }}>
                <span>{p.name}</span><span>{p.status}</span>
              </button>
            ))}
            {!plans.length ? <div className="muted">Henüz plan yok.</div> : null}
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="title">Seçili plan</div>
              <div className="muted">{selected ? `${selected.name} • ${selected.status}` : 'Plan seçilmedi'}</div>
            </div>
            {selected ? <button type="button" className="btn" onClick={publishPlan}>Taslak shift üret</button> : null}
          </div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>#</th><th>Lokasyon</th><th>Kişi</th><th>Koordinat</th></tr></thead>
            <tbody>
              {(selected?.stops || []).map((s) => (
                <tr key={s.id}><td>{s.orderHint}</td><td><div>{s.name}</div><div className="muted">{s.address || '-'}</div></td><td>{s.passengerCount}</td><td>{s.lat}, {s.lng}</td></tr>
              ))}
              {!selected?.stops?.length ? <tr><td colSpan={4} className="muted">Lokasyon yok.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="title">Lokasyon ekle</div>
          <div className="row"><input placeholder="Lokasyon adı" value={stopForm.name} onChange={(e) => setStopForm((s) => ({ ...s, name: e.target.value }))} /><input placeholder="Adres" value={stopForm.address} onChange={(e) => setStopForm((s) => ({ ...s, address: e.target.value }))} /></div>
          <div className="row"><input placeholder="Lat" value={stopForm.lat} onChange={(e) => setStopForm((s) => ({ ...s, lat: e.target.value }))} /><input placeholder="Lng" value={stopForm.lng} onChange={(e) => setStopForm((s) => ({ ...s, lng: e.target.value }))} /></div>
          <div className="row"><input placeholder="Sıra" value={stopForm.orderHint} onChange={(e) => setStopForm((s) => ({ ...s, orderHint: e.target.value }))} /><input placeholder="Kişi sayısı" value={stopForm.passengerCount} onChange={(e) => setStopForm((s) => ({ ...s, passengerCount: e.target.value }))} /></div>
          <textarea rows={3} placeholder="Not" value={stopForm.note} onChange={(e) => setStopForm((s) => ({ ...s, note: e.target.value }))} />
          <div className="row" style={{ marginTop: 10 }}><button type="button" className="btn" disabled={!selected} onClick={addStop}>Lokasyon ekle</button></div>
        </div>
      </div>
    </div>
  );
}
