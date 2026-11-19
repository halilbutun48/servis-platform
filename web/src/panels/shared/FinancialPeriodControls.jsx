import { financePeriodPresetRange, financePeriodPresetValue } from "./financeFocusContext.js";

const PERIOD_PRESETS = [
  { value: "all", label: "Tüm dönemler" },
  { value: "current-month", label: "Bu ay" },
  { value: "previous-month", label: "Geçen ay" },
  { value: "custom", label: "Özel tarih aralığı" },
];

export default function FinancialPeriodControls({
  periodStart = "",
  periodEnd = "",
  onChange,
  prefix = "",
  compact = false,
  style,
}) {
  const preset = financePeriodPresetValue(periodStart, periodEnd);
  const ariaPrefix = prefix ? `${prefix} ` : "";
  const testPrefix = prefix ? `${prefix}-` : "";

  function applyPreset(value) {
    if (value === "custom") return;
    onChange?.(financePeriodPresetRange(value));
  }

  return (
    <div
      className="financial-period-controls"
      data-testid={`${testPrefix}period-controls`}
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "repeat(3, minmax(0, 1fr))" : "minmax(180px, 0.8fr) repeat(2, minmax(150px, 1fr))",
        gap: 10,
        minWidth: 0,
        ...style,
      }}
    >
      <label className="muted">
        Dönem kısayolu
        <select
          aria-label={`${ariaPrefix}dönem kısayolu`}
          data-testid={`${testPrefix}period-preset`}
          value={preset}
          onChange={(event) => applyPreset(event.target.value)}
          style={{ width: "100%", marginTop: 6 }}
        >
          {PERIOD_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="muted">
        Başlangıç tarihi
        <input
          aria-label={`${ariaPrefix}dönem başlangıcı`}
          data-testid={`${testPrefix}period-start`}
          type="date"
          value={periodStart || ""}
          onChange={(event) => onChange?.({ periodStart: event.target.value || null, periodEnd: periodEnd || null })}
          style={{ width: "100%", marginTop: 6 }}
        />
      </label>
      <label className="muted">
        Bitiş tarihi
        <input
          aria-label={`${ariaPrefix}dönem bitişi`}
          data-testid={`${testPrefix}period-end`}
          type="date"
          value={periodEnd || ""}
          onChange={(event) => onChange?.({ periodStart: periodStart || null, periodEnd: event.target.value || null })}
          style={{ width: "100%", marginTop: 6 }}
        />
      </label>
    </div>
  );
}
