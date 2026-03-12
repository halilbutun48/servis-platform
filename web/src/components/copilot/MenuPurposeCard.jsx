export default function MenuPurposeCard({ data }) {
  if (!data || typeof data !== 'object') return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bu menü ne için var?</div>
      <div className="muted" style={{ marginTop: 8 }}>{data.description || '-'}</div>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {data.forWhom ? <div><b>Kim için:</b> {data.forWhom}</div> : null}
        {data.firstStep ? <div><b>İlk adım:</b> {data.firstStep}</div> : null}
      </div>
    </div>
  );
}
