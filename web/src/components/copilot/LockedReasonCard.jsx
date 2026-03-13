export default function LockedReasonCard({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bu neden kapalı?</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div
  key={`${x.action || 'action'}:${i}`}
  style={{
    border: '1px solid #f04438',
    background: '#fff5f5',
    borderRadius: 12,
    padding: 14
  }}
>
            <div style={{ fontWeight: 700, color: '#101828', fontSize: 15 }}>
  {x.action || '-'}
</div>
            <div style={{ marginTop: 6, color: '#010101', fontSize: 14, lineHeight: 1.5 }}>
  {x.reason || '-'}
</div>
          </div>
        ))}
      </div>
    </div>
  );
}
