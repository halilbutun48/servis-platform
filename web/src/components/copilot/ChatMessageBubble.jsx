import { useMemo, useState } from 'react';
import ChatQuickActions from './ChatQuickActions';

const FEEDBACK_KEY = 'vardis:copilot:chat-feedback';
const FEEDBACK_LOG_KEY = 'vardis:copilot:chat-feedback-log';
const FEEDBACK_EVENT = 'vardis:copilot-feedback-updated';

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

function confidenceLabel(value) {
  const num = Number(value || 0);
  if (num >= 0.75) return 'Net yanıt';
  if (num >= 0.45) return 'Dikkatli yanıt';
  return 'Kontrollü yanıt';
}

function confidenceTone(value) {
  const num = Number(value || 0);
  if (num >= 0.75) return { background: '#ecfdf3', color: '#027a48', border: '1px solid #abefc6' };
  if (num >= 0.45) return { background: '#fffaeb', color: '#b54708', border: '1px solid #fedf89' };
  return { background: '#fef3f2', color: '#b42318', border: '1px solid #fecdca' };
}


function uncertaintyTone(level) {
  const value = String(level || '').toUpperCase();
  if (value === 'LOW') return { background: '#ecfdf3', color: '#027a48', border: '1px solid #abefc6' };
  if (value === 'MEDIUM') return { background: '#fffaeb', color: '#b54708', border: '1px solid #fedf89' };
  return { background: '#fef3f2', color: '#b42318', border: '1px solid #fecdca' };
}

function safeReadFeedback() {
  try {
    return JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) || '{}');
  } catch {
    return {};
  }
}

function feedbackId(message) {
  return [message?.generatedAt || '', message?.screenLabel || '', message?.questionType || '', message?.text || ''].join('|').slice(0, 320);
}

function safeReadFeedbackLog() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEEDBACK_LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFeedbackLog(entry) {
  const prev = safeReadFeedbackLog();
  const next = [entry, ...prev.filter((row) => String(row?.messageId || '') !== String(entry?.messageId || ''))].slice(0, 30);
  try {
    window.localStorage.setItem(FEEDBACK_LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: { count: next.length } }));
  } catch {}
}

function SectionCard({ section, onAsk }) {
  if (!section) return null;
  return (
    <div style={{ borderRadius: 12, border: '1px solid #d0d5dd', padding: 10, background: '#fff' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#344054', marginBottom: 6 }}>{section.title || '-'}</div>
      {section.text ? <div style={{ fontSize: 13, lineHeight: 1.45 }}>{section.text}</div> : null}
      {section.hint ? <div style={{ fontSize: 12, color: '#475467', marginTop: 6 }}>{section.hint}</div> : null}
      {Array.isArray(section.items) && section.items.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {section.items.map((item, i) => (
            <button key={`${item}:${i}`} type="button" onClick={() => onAsk?.(item)} style={{ fontSize: 12 }}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ChatMessageBubble({ message, onOpen, onGuide, onAsk, onCopy }) {
  const role = String(message?.role || 'assistant');
  const isSimpleMode = String(message?.roleMode || '') === 'SIMPLE';
  const messageId = useMemo(() => feedbackId(message), [message]);
  const [feedback, setFeedback] = useState(() => safeReadFeedback()[messageId] || '');

  const handleFeedback = (value) => {
    if (role === 'user') return;
    const current = safeReadFeedback();
    current[messageId] = value;
    try {
      window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(current));
    } catch {}
    writeFeedbackLog({
      messageId,
      value,
      generatedAt: message?.generatedAt || new Date().toISOString(),
      questionType: message?.questionType || '',
      questionLabel: message?.questionLabel || '',
      screenLabel: message?.screenLabel || '',
      intentConfidence: Number(message?.intentConfidence || 0),
      uncertaintyLevel: message?.uncertaintyMeta?.cautionLevel || '',
      textPreview: String(message?.text || '').slice(0, 180),
    });
    setFeedback(value);
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ maxWidth: '85%', borderRadius: 16, padding: 12, ...bubbleStyle(role) }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6, fontWeight: 700 }}>
          {role === 'user' ? 'Sen' : 'Copilot'}
        </div>

        {role !== 'user' ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {message?.questionLabel ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', background: '#eef4ff', color: '#3538cd', border: '1px solid #c7d7fe', fontSize: 12, fontWeight: 700 }}>
                {message.questionLabel}
              </span>
            ) : null}
            {message?.intentConfidence ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, ...confidenceTone(message.intentConfidence) }}>
                {confidenceLabel(message.intentConfidence)}
              </span>
            ) : null}
            {message?.uncertaintyMeta?.label ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700, ...uncertaintyTone(message?.uncertaintyMeta?.cautionLevel) }}>
                {message.uncertaintyMeta.label}
              </span>
            ) : null}
            {message?.continuity?.sameEntity ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: 12, fontWeight: 700 }}>
                Aynı kayıt
              </span>
            ) : message?.continuity?.isFollowUp ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', background: '#f4f3ff', color: '#6941c6', border: '1px solid #d9d6fe', fontSize: 12, fontWeight: 700 }}>
                Devam sorusu
              </span>
            ) : null}
            {message?.routePlan?.primaryRouteLabel ? (
              <span style={{ borderRadius: 999, padding: '2px 8px', background: '#eff8ff', color: '#175cd3', border: '1px solid #b2ddff', fontSize: 12, fontWeight: 700 }}>
                Hedef ekran: {message.routePlan.primaryRouteLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message?.text || '-'}</div>

        {role !== 'user' && Array.isArray(message?.responseSections) && message.responseSections.length ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {message.responseSections.slice(0, isSimpleMode ? 2 : 4).map((section, i) => (
              <SectionCard key={`${section?.kind || 'section'}:${i}`} section={section} onAsk={onAsk} />
            ))}
          </div>
        ) : null}

        {role !== 'user' && Array.isArray(message?.suggestedChips) && message.suggestedChips.length ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Sonra şunu da sorabilirsin</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {message.suggestedChips.slice(0, isSimpleMode ? 3 : 4).map((chip, i) => (
                <button key={`${chip}:${i}`} type="button" onClick={() => onAsk?.(chip)} style={{ fontSize: 12 }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {role !== 'user' && (message?.contextSummary || message?.activeEntityLabel || message?.screenLabel || message?.replyMode || message?.followUpPrompt) ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, display: 'grid', gap: 4 }}>
            {!isSimpleMode && message?.screenLabel ? <div>Bakılan ekran: {message.screenLabel}</div> : null}
            {!isSimpleMode && message?.activeEntityLabel ? <div>Bakılan kayıt: {message.activeEntityLabel}</div> : null}
            {message?.contextSummary ? <div>{message.contextSummary}</div> : null}
            {!isSimpleMode && message?.roleMode ? <div>Mod: {message.roleMode === 'SIMPLE' ? 'Sade anlatım' : 'Operasyon anlatımı'}</div> : null}
            {message?.followUpPrompt ? <div>{isSimpleMode ? `İpucu: ${message.followUpPrompt}` : message.followUpPrompt}</div> : null}
          </div>
        ) : null}
      </div>

      {role !== 'user' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {message?.actionPlanLabel ? <div style={{ fontSize: 12, color: '#475467', fontWeight: 700 }}>{message.actionPlanLabel}</div> : null}
          <button type="button" onClick={() => handleFeedback('useful')} style={{ fontSize: 12 }}>
            {feedback === 'useful' ? 'İşe yaradı ✓' : 'İşe yaradı'}
          </button>
          <button type="button" onClick={() => handleFeedback('needs-work')} style={{ fontSize: 12 }}>
            {feedback === 'needs-work' ? 'Eksik kaldı ✓' : 'Eksik kaldı'}
          </button>
        </div>
      ) : null}

      {role !== 'user' ? <ChatQuickActions actions={message?.quickActions} linkedGuides={message?.linkedGuides} onOpen={onOpen} onGuide={onGuide} onAsk={onAsk} onCopy={onCopy} /> : null}
    </div>
  );
}
