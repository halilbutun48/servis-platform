export default function PanelChrome({ title, subtitle, actions, children, style, className = "" }) {
  return (
    <div className={`panelChrome ${className}`.trim()} style={{ display: "grid", gap: 12, minWidth: 0, ...style }}>
      <div className="card panelChromeCard" style={{ minWidth: 0 }}>
        <div className="panelChromeHead">
          <div className="panelChromeTitleBlock" style={{ minWidth: 0 }}>
            <div className="panelTitle">{title}</div>
            {subtitle ? <div className="panelSubtitle" style={{ marginTop: 6 }}>{subtitle}</div> : null}
          </div>
          {actions ? (
            <div className="saActions panelChromeActions" style={{ alignSelf: "flex-start", justifyContent: "flex-end" }}>
              {actions}
            </div>
          ) : null}
        </div>
        {children ? <div style={{ marginTop: 12, minWidth: 0 }}>{children}</div> : null}
      </div>
    </div>
  );
}
