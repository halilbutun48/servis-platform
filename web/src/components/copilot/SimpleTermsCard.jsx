import { humanizeUserFacingText } from '../../utils/terminology';

export default function SimpleTermsCard({ items }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bu ne demek?</div>
      {Array.isArray(items) && items.length ? (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {items.map((x, i) => (
            <div key={i} style={{ border: "1px solid #d0d5dd", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{humanizeUserFacingText(x.term)}</div>
              <div className="muted" style={{ marginTop: 4 }}>{humanizeUserFacingText(x.meaning)}</div>
            </div>
          ))}
        </div>
      ) : <div className="muted" style={{ marginTop: 8 }}>Terim açıklaması görünmüyor.</div>}
    </div>
  );
}
