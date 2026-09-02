import { humanizeUserFacingText } from '../../utils/terminology';

export default function QuickActionsCard({ items, onOpen }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Buradan aç</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.label || 'link'}:${i}`} style={{ border: '1px solid #d0d5dd', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => onOpen?.(x)}>{humanizeUserFacingText(x.label, 'Aç')}</button>
              {x.kind ? <span className="muted">{x.kind === 'PRIMARY' ? 'Ana geçiş' : 'Yardımcı geçiş'}</span> : null}
            </div>
            {x.reason ? <div className="muted">{humanizeUserFacingText(x.reason)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
