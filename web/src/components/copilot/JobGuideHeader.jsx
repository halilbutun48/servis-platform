export default function JobGuideHeader({ result }) {
  if (!result) return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <div className="title" style={{ fontSize: 16 }}>Bu iş ne?</div>
        <div className="muted" style={{ marginTop: 6 }}>{result.jobPurpose || result.plainSummary || "-"}</div>
      </div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12 }}>
          <div className="title" style={{ fontSize: 15 }}>Şimdi bunu yap</div>
          <div className="muted" style={{ marginTop: 6 }}>{result.whatToDoNow || "-"}</div>
        </div>
        <div style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12 }}>
          <div className="title" style={{ fontSize: 15 }}>Sonra bunu yap</div>
          <div className="muted" style={{ marginTop: 6 }}>{result.whatToDoNext || "-"}</div>
        </div>
        <div style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12 }}>
          <div className="title" style={{ fontSize: 15 }}>Bunu yapma</div>
          <div className="muted" style={{ marginTop: 6 }}>{result.doNotDo || "-"}</div>
        </div>
      </div>
    </div>
  );
}
