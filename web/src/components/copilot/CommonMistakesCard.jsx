import { humanizeUserFacingText } from '../../utils/terminology';

export default function CommonMistakesCard({ items }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Sık hata</div>
      {Array.isArray(items) && items.length ? (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {items.map((x, i) => <li key={i}>{humanizeUserFacingText(x)}</li>)}
        </ul>
      ) : <div className="muted" style={{ marginTop: 8 }}>Sık hata bilgisi görünmüyor.</div>}
    </div>
  );
}
