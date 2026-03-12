export default function DoneChecklistCard({ items }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Bittiğini nasıl anlarsın?</div>
      {Array.isArray(items) && items.length ? (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      ) : <div className="muted" style={{ marginTop: 8 }}>Tamamlanma işareti görünmüyor.</div>}
    </div>
  );
}
