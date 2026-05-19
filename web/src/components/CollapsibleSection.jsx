import { useId, useState } from "react";

export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  compact = false,
  rightAction = null,
  "data-testid": dataTestId,
}) {
  const panelId = useId();
  const [open, setOpen] = useState(() => Boolean(defaultOpen));

  const badgeLabel = badge == null || badge === "" ? null : String(badge);

  return (
    <section
      className={`collapsibleSection${compact ? " collapsibleSection--compact" : ""}${open ? " is-open" : ""}`}
      data-testid={dataTestId || undefined}
    >
      <div className="collapsibleSectionHead">
        <button
          type="button"
          className="collapsibleSectionToggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
        >
          <div className="collapsibleSectionHeadMain">
            <div className="collapsibleSectionTitleRow">
              <span className="collapsibleSectionTitle">{title}</span>
              {badgeLabel ? <span className="collapsibleSectionBadge">{badgeLabel}</span> : null}
            </div>
            {subtitle ? <div className="collapsibleSectionSubtitle">{subtitle}</div> : null}
          </div>
          <span className="collapsibleSectionChevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
        </button>

        {rightAction ? <div className="collapsibleSectionRightAction">{rightAction}</div> : null}
      </div>

      {open ? (
        <div id={panelId} className="collapsibleSectionBody">
          {children}
        </div>
      ) : null}
    </section>
  );
}
