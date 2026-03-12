export default function CopyOutputsCard({ data, onCopy }) {
  if (!data || typeof data !== 'object') return null;
  const items = [
    { key: 'opsNote', label: 'Operasyon notunu kopyala' },
    { key: 'supportDraft', label: 'Destek metnini kopyala' },
  ].filter((x) => data?.[x.key]);
  if (!items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Hazır metin</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {items.map((x) => (
          <button key={x.key} type="button" onClick={() => onCopy?.(data?.[x.key] || '')}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}
