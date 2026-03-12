export default function LockedReasonCard({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bu neden kapalı?</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.action || 'action'}:${i}`} style={{ border: '1px solid #f04438', background: '#fef3f2', borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 700 }}>{x.action || '-'}</div>
            <div className="muted" style={{ marginTop: 4 }}>{x.reason || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
