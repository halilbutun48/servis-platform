export default function ChatQuickActions({ actions = [], linkedGuides = [], onOpen, onGuide }) {
  const hasActions = Array.isArray(actions) && actions.length > 0;
  const hasGuides = Array.isArray(linkedGuides) && linkedGuides.length > 0;
  if (!hasActions && !hasGuides) return null;

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      {hasActions ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((action, i) => (
            <button key={`${action?.label || 'action'}:${i}`} type="button" onClick={() => onOpen?.(action)}>
              {action?.label || 'Buradan aç'}
            </button>
          ))}
        </div>
      ) : null}
      {hasGuides ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {linkedGuides.map((guide, i) => (
            <button key={`${guide?.jobType || 'guide'}:${i}`} type="button" onClick={() => onGuide?.(guide)}>
              {guide?.label || guide?.jobType || 'Rehbere geç'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
