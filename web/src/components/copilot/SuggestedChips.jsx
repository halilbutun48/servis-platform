export default function SuggestedChips({ items = [], busy = false, onPick }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <button key={`${item}:${i}`} type="button" onClick={() => onPick?.(item)} disabled={busy}>
          {item}
        </button>
      ))}
    </div>
  );
}
