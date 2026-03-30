function tone(accent) {
  if (accent === 'primary') return { background: '#175cd3', color: '#fff', border: '1px solid #175cd3' };
  if (accent === 'warning') return { background: '#fffaeb', color: '#b54708', border: '1px solid #f79009' };
  return {};
}

function actionText(action, index = 0) {
  const kind = String(action?.actionKind || 'OPEN_ROUTE');
  if (kind === 'OPEN_GUIDE') return index === 0 ? (action?.label || 'Rehberi aç') : (action?.label || 'Rehberi aç');
  if (kind === 'ASK') return index === 0 ? (action?.label || 'Bunu sor') : (action?.label || 'Bunu sor');
  if (kind === 'COPY_TEXT') return action?.label || 'Metni kopyala';
  return index === 0 ? (action?.label || 'Bu ekrana git') : (action?.label || 'Buraya git');
}

export default function ChatQuickActions({ actions = [], linkedGuides = [], onOpen, onGuide, onAsk, onCopy }) {
  const hasActions = Array.isArray(actions) && actions.length > 0;
  const hasGuides = Array.isArray(linkedGuides) && linkedGuides.length > 0;
  if (!hasActions && !hasGuides) return null;

  const primaryAction = hasActions ? actions[0] : null;
  const secondaryActions = hasActions ? actions.slice(1) : [];

  const runAction = (action) => {
    const kind = String(action?.actionKind || 'OPEN_ROUTE');
    if (kind === 'OPEN_GUIDE') return onGuide?.(action?.guide || action);
    if (kind === 'ASK') return onAsk?.(action?.askText || action?.label || '');
    if (kind === 'COPY_TEXT') return onCopy?.(action?.copyText || '');
    return onOpen?.(action);
  };

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      {primaryAction ? (
        <div>
          <div style={{ fontSize: 12, color: '#475467', fontWeight: 700, marginBottom: 6 }}>Önce bunu yap</div>
          <button type="button" onClick={() => runAction(primaryAction)} title={primaryAction?.reason || ''} style={{ ...tone(primaryAction?.accent || 'primary'), width: '100%' }}>
            {actionText(primaryAction, 0)}
          </button>
          {primaryAction?.reason ? <div style={{ fontSize: 12, color: '#475467', marginTop: 6 }}>{primaryAction.reason}</div> : null}
          {primaryAction?.routeKey ? <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>Açılacak yol: {primaryAction.routeKey}</div> : null}
        </div>
      ) : null}

      {secondaryActions.length ? (
        <div>
          <div style={{ fontSize: 12, color: '#475467', fontWeight: 700, marginBottom: 6 }}>Sonra bunu yapabilirsin</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {secondaryActions.map((action, i) => (
              <div key={`${actionText(action, i + 1)}:${i}`} style={{ display: 'grid', gap: 4 }}>
                <button type="button" onClick={() => runAction(action)} title={action?.reason || ''} style={tone(action?.accent)}>
                  {actionText(action, i + 1)}
                </button>
                {action?.routeKey ? <div style={{ fontSize: 11, color: '#667085' }}>Yol: {action.routeKey}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasGuides ? (
        <div>
          <div style={{ fontSize: 12, color: '#475467', fontWeight: 700, marginBottom: 6 }}>İstersen rehber aç</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {linkedGuides.map((guide, i) => (
              <button key={`${guide?.jobType || 'guide'}:${i}`} type="button" onClick={() => onGuide?.(guide)} title={guide?.reason || ''}>
                {guide?.label || guide?.jobType || 'Rehbere geç'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
