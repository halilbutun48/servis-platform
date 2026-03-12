export default function StepByStepCard({ steps }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>Adım adım ilerle</div>
      {Array.isArray(steps) && steps.length ? (
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          {steps.map((x, i) => <li key={i} style={{ marginBottom: 6 }}>{x}</li>)}
        </ol>
      ) : <div className="muted" style={{ marginTop: 8 }}>Adım bilgisi görünmüyor.</div>}
    </div>
  );
}
