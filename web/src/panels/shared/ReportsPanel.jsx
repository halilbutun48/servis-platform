import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";

const TABS = [
  ["shifts", "Vardiyalar"],
  ["drivers", "Sürücüler"],
  ["vehicles", "Araçlar"],
  ["stops", "Duraklar"],
];

function fmtDateInput(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPanel() {
  const { token, me } = useSession();
  const [tab, setTab] = useState('shifts');
  const [from, setFrom] = useState(fmtDateInput(Date.now() - 7*24*60*60*1000));
  const [to, setTo] = useState(fmtDateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState({});

  async function load(activeTab = tab) {
    setLoading(true); setErr('');
    try {
      const q = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const json = await api.get(`/api/reports/${activeTab}/summary${q}`, { token });
      setData((p) => ({ ...p, [activeTab]: json }));
    } catch (e) { setErr(String(e?.message || e)); } finally { setLoading(false); }
  }
  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line

  const rows = Array.isArray(data?.[tab]?.rows) ? data[tab].rows : [];
  const headers = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);
  const base = me?.role === 'ROOM' ? '/room' : me?.companyKind === 'SCHOOL' ? '/school' : me?.companyKind === 'ORGANIZATION' ? '/organization' : '/company';

  return (
    <div>
      <div className="card">
        <h3>Raporlar</h3>
        <div className="muted">Operasyon özeti ve CSV dışa aktarma</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'end' }}>
          {TABS.map(([k, label]) => <button key={k} type="button" className={tab === k ? 'btn primary' : 'btn'} onClick={() => setTab(k)}>{label}</button>)}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <div><label className="muted">Başlangıç</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="muted">Bitiş</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <button className="btn" onClick={() => load(tab)} disabled={loading}>Yenile</button>
            {(tab === 'shifts' || tab === 'drivers') ? <a className="btn" href={`/api/reports/${tab}/export.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`} target="_blank" rel="noreferrer">CSV indir</a> : null}
          </div>
        </div>
      </div>
      {err ? <div className="card err">{err}</div> : null}
      <div className="card">
        <div className="muted">Rol: {me?.role} • Ekran: {base}/reports</div>
        <div style={{ marginTop: 8 }}>Toplam kayıt: <b>{Number(data?.[tab]?.total || 0)}</b></div>
      </div>
      <div className="card">
        {loading ? <div>Yükleniyor...</div> : rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((row, idx) => <tr key={idx}>{headers.map((h) => <td key={h}>{typeof row[h] === 'boolean' ? (row[h] ? 'Evet' : 'Hayır') : String(row[h] ?? '')}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : <div className="muted">Kayıt yok.</div>}
      </div>
    </div>
  );
}
