export default function ButtonGuidesCard({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bu ekrandaki butonlar</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.label || 'button'}:${i}`} style={{ border: '1px solid #d0d5dd', borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 700 }}>{x.label || '-'}</div>
            <div><b>Ne yapar:</b> {x.purpose || '-'}</div>
            <div><b>Ne zaman kullanılır:</b> {x.whenToUse || '-'}</div>
            <div><b>Basınca ne olur:</b> {x.whatHappens || '-'}</div>
            {x.disabledReason ? <div className="muted"><b>Neden kapalı olabilir:</b> {x.disabledReason}</div> : null}
            {x.riskNote ? <div className="muted"><b>Dikkat:</b> {x.riskNote}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
