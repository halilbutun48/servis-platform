export default function FinanceRiskBadge({ risk, testId }) {
  if (!risk) return null;
  const riskKey = String(risk.status || "GRAY").toLowerCase();
  return (
    <span
      className="finance-risk-badge"
      data-risk={riskKey}
      data-testid={testId}
      role="status"
      aria-label={`${risk.label}. ${risk.description}`}
      title={risk.description}
    >
      <span aria-hidden="true">{risk.icon}</span>
      <span>{risk.label}</span>
    </span>
  );
}
