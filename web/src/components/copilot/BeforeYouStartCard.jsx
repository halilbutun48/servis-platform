import { humanizeUserFacingText } from '../../utils/terminology';

function tone(status) {
  if (status === 'OK') return { color: '#027a48', background: '#ecfdf3', border: '1px solid #12b76a' };
  if (status === 'WARN') return { color: '#b54708', background: '#fffaeb', border: '1px solid #f79009' };
  return { color: '#b42318', background: '#fef3f2', border: '1px solid #f04438' };
}

export default function BeforeYouStartCard({ label, state, items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Başlamadan önce kontrol</div>
      <div className="muted" style={{ marginTop: 6 }}>
        <b>{humanizeUserFacingText(label)}</b>{state ? ` • ${humanizeUserFacingText(state)}` : ''}
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {items.map((x, i) => (
          <div key={`${x.label || 'item'}:${i}`} style={{ borderRadius: 10, padding: 10, ...tone(x.status) }}>
            <div style={{ fontWeight: 700 }}>{humanizeUserFacingText(x.label)}</div>
            <div>{humanizeUserFacingText(x.detail)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
