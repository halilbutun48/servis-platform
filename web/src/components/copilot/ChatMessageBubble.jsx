import ChatQuickActions from './ChatQuickActions';

function bubbleStyle(role) {
  if (role === 'user') {
    return {
      justifySelf: 'end',
      background: '#175cd3',
      color: '#fff',
      border: '1px solid #175cd3',
    };
  }
  return {
    justifySelf: 'start',
    background: '#f8fafc',
    color: '#101828',
    border: '1px solid #d0d5dd',
  };
}

export default function ChatMessageBubble({ message, onOpen, onGuide }) {
  const role = String(message?.role || 'assistant');
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ maxWidth: '85%', borderRadius: 16, padding: 12, ...bubbleStyle(role) }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6, fontWeight: 700 }}>
          {role === 'user' ? 'Sen' : 'Copilot'}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message?.text || '-'}</div>
        {role !== 'user' && (message?.contextSummary || message?.activeEntityLabel || message?.screenLabel || message?.replyMode || message?.followUpPrompt) ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, display: 'grid', gap: 4 }}>
            {message?.screenLabel ? <div>Ekran: {message.screenLabel}</div> : null}
            {message?.activeEntityLabel ? <div>Seçili kayıt: {message.activeEntityLabel}</div> : null}
            {message?.contextSummary ? <div>{message.contextSummary}</div> : null}
            {message?.replyMode ? <div>Yanıt biçimi: {message.replyMode}</div> : null}
            {message?.roleMode ? <div>Mod: {message.roleMode === 'SIMPLE' ? 'Sade' : 'Operasyon'}</div> : null}
            {message?.followUpPrompt ? <div>{message.followUpPrompt}</div> : null}
          </div>
        ) : null}
      </div>
      {role !== 'user' ? <ChatQuickActions actions={message?.quickActions} linkedGuides={message?.linkedGuides} onOpen={onOpen} onGuide={onGuide} /> : null}
    </div>
  );
}
