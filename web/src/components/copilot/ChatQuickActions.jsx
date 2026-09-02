import { humanizeUserFacingText } from "../../utils/terminology";

function tone(accent) {
  if (accent === "primary") return { background: "#175cd3", color: "#fff", border: "1px solid #175cd3" };
  if (accent === "warning") return { background: "#fffaeb", color: "#b54708", border: "1px solid #f79009" };
  return {};
}

function actionText(action, index = 0) {
  const kind = String(action?.actionKind || "OPEN_ROUTE");
  if (kind === "OPEN_GUIDE") return humanizeUserFacingText(action?.label, "Rehberi aç");
  if (kind === "ASK") return humanizeUserFacingText(action?.label, "Bunu sor");
  if (kind === "COPY_TEXT") return humanizeUserFacingText(action?.label, "Metni kopyala");
  return humanizeUserFacingText(action?.label, index === 0 ? "Bu ekrana git" : "Buraya git");
}

export default function ChatQuickActions({ actions = [], linkedGuides = [], onOpen, onGuide, onAsk, onCopy }) {
  const hasActions = Array.isArray(actions) && actions.length > 0;
  const hasGuides = Array.isArray(linkedGuides) && linkedGuides.length > 0;
  if (!hasActions && !hasGuides) return null;

  const runAction = (action) => {
    const kind = String(action?.actionKind || "OPEN_ROUTE");
    if (kind === "OPEN_GUIDE") return onGuide?.(action?.guide || action);
    if (kind === "ASK") return onAsk?.(action?.askText || action?.label || "");
    if (kind === "COPY_TEXT") return onCopy?.(action?.copyText || "");
    return onOpen?.(action);
  };

  const visibleActions = hasActions ? actions.slice(0, 3) : [];
  const hiddenActionCount = hasActions ? Math.max(actions.length - visibleActions.length, 0) : 0;

  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475467" }}>
        Sonraki adımlar{hiddenActionCount || hasGuides ? ` (${visibleActions.length + hiddenActionCount + (hasGuides ? linkedGuides.length : 0)})` : ""}
      </summary>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {visibleActions.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {visibleActions.map((action, i) => (
              <button key={`${actionText(action, i)}:${i}`} type="button" className="btn sm copilotToolBtn" onClick={() => runAction(action)} title={humanizeUserFacingText(action?.reason, "")} style={tone(action?.accent)}>
                {actionText(action, i)}
              </button>
            ))}
          </div>
        ) : null}
        {hasGuides ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {linkedGuides.slice(0, 2).map((guide, i) => (
                <button key={`${guide?.jobType || "guide"}:${i}`} type="button" className="btn sm copilotToolBtn" onClick={() => onGuide?.(guide)} title={humanizeUserFacingText(guide?.reason, "")}>
                {humanizeUserFacingText(guide?.label || guide?.jobType, "Rehbere geç")}
              </button>
            ))}
          </div>
        ) : null}
        {visibleActions[0]?.reason ? <div style={{ fontSize: 12, color: "#475467" }}>{humanizeUserFacingText(visibleActions[0].reason)}</div> : null}
      </div>
    </details>
  );
}
