import { useState } from 'react';

export default function ChatInputBox({ busy = false, onSend }) {
  const [value, setValue] = useState('');

  function submit() {
    const text = String(value || '').trim();
    if (!text || busy) return;
    onSend?.(text);
    setValue('');
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Sorunu kısa yaz. Örnek: neden kapalı, bu buton ne yapar, şimdi ne yapacağım"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={submit} disabled={busy || !String(value || '').trim()}>
          {busy ? 'Gönderiliyor...' : 'Gönder'}
        </button>
        <span className="muted">Enter gönderir. Shift+Enter yeni satır açar.</span>
      </div>
    </div>
  );
}
