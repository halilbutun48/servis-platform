export default function IfStuckCard({ items, onOpen }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Takıldıysan buraya git</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.problem || 'problem'}:${i}`} style={{ border: '1px solid #d0d5dd', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{x.problem || '-'}</div>
            <div className="muted">{x.advice || '-'}</div>
            {x.routeKey ? <div><button type="button" onClick={() => onOpen?.(x)}>İlgili ekranı aç</button></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
