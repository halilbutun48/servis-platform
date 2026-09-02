import { humanizeUserFacingText } from '../../utils/terminology';

export default function ScreenMenusCard({ items, onOpen }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>İlgili menüler</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.label || 'menu'}:${i}`} style={{ border: '1px solid #d0d5dd', borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => onOpen?.({ routeKey: x.path, label: `${x.label} ekranını aç` })}>{humanizeUserFacingText(x.label, 'Menü')}</button>
            </div>
            <div className="muted">{humanizeUserFacingText(x.purpose)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
