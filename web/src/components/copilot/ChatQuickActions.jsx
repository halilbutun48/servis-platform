function tone(accent) {
  if (accent === 'primary') return { background: '#175cd3', color: '#fff', border: '1px solid #175cd3' };
  if (accent === 'warning') return { background: '#fffaeb', color: '#b54708', border: '1px solid #f79009' };
  return {};
}

function actionText(action) {
  const kind = String(action?.actionKind || 'OPEN_ROUTE');
  if (kind === 'OPEN_GUIDE') return action?.label || 'Rehberi aç';
  if (kind === 'ASK') return action?.label || 'Sor';
  if (kind === 'COPY_TEXT') return action?.label || 'Kopyala';
  return action?.label || 'Buradan aç';
}

export default function ChatQuickActions({ actions = [], linkedGuides = [], onOpen, onGuide, onAsk, onCopy }) {
  const hasActions = Array.isArray(actions) && actions.length > 0;
  const hasGuides = Array.isArray(linkedGuides) && linkedGuides.length > 0;
  if (!hasActions && !hasGuides) return null;

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      {hasActions ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((action, i) => {
            const kind = String(action?.actionKind || 'OPEN_ROUTE');
            const click = () => {
              if (kind === 'OPEN_GUIDE') return onGuide?.(action?.guide || action);
              if (kind === 'ASK') return onAsk?.(action?.askText || action?.label || '');
              if (kind === 'COPY_TEXT') return onCopy?.(action?.copyText || '');
              return onOpen?.(action);
            };
            return (
              <button key={`${actionText(action)}:${i}`} type="button" onClick={click} title={action?.reason || ''} style={tone(action?.accent)}>
                {actionText(action)}
              </button>
            );
          })}
        </div>
      ) : null}
      {hasGuides ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {linkedGuides.map((guide, i) => (
            <button key={`${guide?.jobType || 'guide'}:${i}`} type="button" onClick={() => onGuide?.(guide)} title={guide?.reason || ''}>
              {guide?.label || guide?.jobType || 'Rehbere geç'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
