export default function MapOperationsDisclosure({ summary, count, children, className = "" }) {
  return (
    <details className={`mapOperationsDisclosure ${className}`.trim()} data-map-disclosure="secondary">
      <summary>
        <span>{summary}</span>
        {count != null ? <span className="muted mapOperationsDisclosureCount">{count}</span> : null}
      </summary>
      <div className="mapOperationsDisclosureBody">{children}</div>
    </details>
  );
}
