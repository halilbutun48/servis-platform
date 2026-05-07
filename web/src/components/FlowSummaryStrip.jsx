export default function FlowSummaryStrip({
  title,
  description,
  steps = [],
  statusText,
  tone = "info",
  className = "",
  style,
}) {
  const visibleSteps = Array.isArray(steps)
    ? steps.map((step, index) => {
        if (typeof step === "string") return { id: `${index}:${step}`, label: step };
        return {
          id: step?.id || `${index}:${step?.label || step?.text || "step"}`,
          label: step?.label || step?.text || "-",
        };
      }).filter((step) => Boolean(step.label))
    : [];

  return (
    <section
      className={`flow-summary-strip ${className}`.trim()}
      style={style}
    >
      <div className="flow-summary-head">
        <div className="flow-summary-copy">
          <div className="panelSectionTitle">{title}</div>
          {description ? <div className="panelMeta" style={{ marginTop: 4 }}>{description}</div> : null}
        </div>
        {statusText ? (
          <span className="flow-summary-status" data-tone={tone}>
            {statusText}
          </span>
        ) : null}
      </div>

      {visibleSteps.length ? (
        <div className="flow-summary-steps">
          {visibleSteps.map((step) => (
            <span key={step.id} className="flow-summary-chip">
              {step.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
