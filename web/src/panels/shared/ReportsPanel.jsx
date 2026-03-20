import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { formatDateTimeTR, ymdTR } from "../../utils/time";

const TABS = [
  ["shifts", "Vardiyalar"],
  ["drivers", "Sürücüler"],
  ["vehicles", "Araçlar"],
  ["stops", "Duraklar"],
];

const SHIFT_COLUMNS = [
  ["id", "ID"],
  ["status", "Durum"],
  ["companyName", "Şirket"],
  ["roomName", "Oda"],
  ["vehiclePlate", "Araç"],
  ["driverName", "Sürücü"],
  ["startAt", "Başlangıç"],
  ["endAt", "Bitiş"],
  ["direction", "Yön"],
  ["pattern", "Pattern"],
  ["stopCount", "Durak"],
  ["personCount", "Kişi"],
  ["requiredPax", "Gerekli Kapasite"],
  ["splitTotal", "Paket"],
  ["createdAt", "Oluşturma"],
];

function fmtDateInput(d) {
  return ymdTR(d);
}

function fmtCellDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return formatDateTimeTR(d);
}

function normalizeShiftRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    status: row.status || '-',
    companyName: row.company?.name || (row.companyId ? `#${row.companyId}` : '-'),
    roomName: row.room?.name || (row.roomId ? `#${row.roomId}` : '-'),
    vehiclePlate: row.vehicle?.plate || '-',
    driverName: row.driver?.fullName || '-',
    startAt: fmtCellDate(row.startAt),
    endAt: fmtCellDate(row.endAt),
    direction: row.direction || '-',
    pattern: row.pattern || '-',
    stopCount: Array.isArray(row.stops) ? row.stops.length : 0,
    personCount: Array.isArray(row.people) ? row.people.length : 0,
    requiredPax: Math.max(Number(row.requiredPaxOverride || 0), Array.isArray(row.people) ? row.people.length : 0, 0),
    splitTotal: Number(row.splitTotal || 0) || '-',
    createdAt: fmtCellDate(row.createdAt),
  }));
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

  const rawRows = Array.isArray(data?.[tab]?.rows) ? data[tab].rows : [];
  const rows = useMemo(() => (tab === 'shifts' ? normalizeShiftRows(rawRows) : rawRows), [tab, rawRows]);
  const headers = useMemo(() => {
    if (tab === 'shifts') return SHIFT_COLUMNS.map(([key, label]) => ({ key, label }));
    return rows.length ? Object.keys(rows[0]).map((key) => ({ key, label: key })) : [];
  }, [tab, rows]);
  const base = me?.role === 'ROOM' ? '/room' : me?.companyKind === 'SCHOOL' ? '/school' : me?.companyKind === 'ORGANIZATION' ? '/organization' : '/company';
  const wideDataTab = tab === 'shifts';
  const tableMinWidth = wideDataTab
    ? Math.max(headers.length * 160, 1900)
    : Math.max(headers.length * 180, 1100);

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
      <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? <div>Yükleniyor...</div> : rows.length ? (
          <div style={{ display: 'block', width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6 }}>
            <table className="tbl" style={{ minWidth: `${tableMinWidth}px`, width: wideDataTab ? 'max-content' : '100%' }}>
              <thead>
                <tr>
                  {headers.map(({ key, label }) => (
                    <th key={key} style={{ whiteSpace: 'nowrap' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {headers.map(({ key }) => (
                      <td key={key} style={{ whiteSpace: 'nowrap' }}>
                        {typeof row[key] === 'boolean' ? (row[key] ? 'Evet' : 'Hayır') : String(row[key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="muted">Kayıt yok.</div>}
      </div>
    </div>
  );
}
