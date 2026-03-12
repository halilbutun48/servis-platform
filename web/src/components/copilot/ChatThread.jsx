import { useEffect, useRef } from 'react';
import ChatMessageBubble from './ChatMessageBubble';

export default function ChatThread({ messages = [], onOpen, onGuide, onAsk, onCopy }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (!Array.isArray(messages) || !messages.length) {
    return <div className="muted">Henüz mesaj yok.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
      {messages.map((message, i) => (
        <ChatMessageBubble key={`${message?.role || 'assistant'}:${i}`} message={message} onOpen={onOpen} onGuide={onGuide} onAsk={onAsk} onCopy={onCopy} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
