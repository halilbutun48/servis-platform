export default function PanelSegmentTabs({
  tabs,
  value,
  onChange,
  ariaLabel = "Panel bölümleri",
  compact = false,
  className = "",
}) {
  const items = Array.isArray(tabs) ? tabs : [];

  return (
    <div
      className={`panelSegmentTabs${compact ? " panelSegmentTabs--compact" : ""}${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((tab, index) => {
        const active = String(tab?.key ?? "") === String(value ?? "");
        const badge = tab?.badge == null || tab?.badge === "" ? null : String(tab.badge);

        return (
          <button
            key={String(tab?.key ?? tab?.label ?? index)}
            type="button"
            role="tab"
            aria-selected={active}
            className={`panelSegmentTab${active ? " active" : ""}`}
            onClick={() => onChange?.(tab?.key)}
          >
            <span className="panelSegmentTabLabel">{tab?.label ?? tab?.key ?? "-"}</span>
            {badge ? <span className="panelSegmentTabBadge">{badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
