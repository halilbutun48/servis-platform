export default function MapOperationsDisclosure({ summary, count, children, className = "", copilotTarget = "" }) {
  return (
    <details className={`mapOperationsDisclosure ${className}`.trim()} data-map-disclosure="secondary">
      <summary data-copilot-target={copilotTarget || undefined}>
        <span>{summary}</span>
        {count != null ? <span className="muted mapOperationsDisclosureCount">{count}</span> : null}
      </summary>
      <div className="mapOperationsDisclosureBody">{children}</div>
    </details>
  );
}
