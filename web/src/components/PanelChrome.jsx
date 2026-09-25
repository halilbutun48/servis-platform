export default function PanelChrome({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryActions,
  actions,
  children,
  style,
  className = "",
  headingLevel = 1,
}) {
  const HeadingTag = `h${Math.min(6, Math.max(1, Number(headingLevel) || 1))}`;

  return (
    <div className={`panelChrome ${className}`.trim()} style={{ display: "grid", gap: 10, minWidth: 0, ...style }}>
      <div className="card panelChromeCard" style={{ minWidth: 0 }}>
        <div className="panelChromeHead">
          <div className="panelChromeTitleBlock" style={{ minWidth: 0 }}>
            {eyebrow ? <div className="panelChromeEyebrow">{eyebrow}</div> : null}
            <HeadingTag className="panelTitle">{title}</HeadingTag>
            {subtitle ? <div className="panelSubtitle" style={{ marginTop: 4 }}>{subtitle}</div> : null}
          </div>
          {primaryAction || secondaryActions || actions ? (
            <div className="saActions panelChromeActions" style={{ alignSelf: "flex-start", justifyContent: "flex-end" }}>
              {primaryAction ? <div className="panelChromePrimaryAction" data-panel-primary-action="true">{primaryAction}</div> : null}
              {secondaryActions ? <div className="panelChromeSecondaryActions">{secondaryActions}</div> : null}
              {actions}
            </div>
          ) : null}
        </div>
        {children ? <div style={{ marginTop: 10, minWidth: 0 }}>{children}</div> : null}
      </div>
    </div>
  );
}
