import { useEffect, useMemo, useState } from 'react';

const FEEDBACK_LOG_KEY = 'vardis:copilot:chat-feedback-log';
const FEEDBACK_EVENT = 'vardis:copilot-feedback-updated';

function safeReadLog() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEEDBACK_LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarize(log = []) {
  const total = log.length;
  const useful = log.filter((row) => row?.value === 'useful').length;
  const needsWork = log.filter((row) => row?.value === 'needs-work').length;
  const ratio = total ? Math.round((useful / total) * 100) : 0;
  const topLabels = Object.entries(log.reduce((acc, row) => {
    const key = String(row?.questionLabel || row?.questionType || 'Sohbet yardımı');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { total, useful, needsWork, ratio, topLabels };
}

function tone(ratio) {
  if (ratio >= 80) return { background: '#ecfdf3', border: '1px solid #abefc6', color: '#027a48' };
  if (ratio >= 55) return { background: '#fffaeb', border: '1px solid #fedf89', color: '#b54708' };
  return { background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318' };
}

export default function ChatQualitySummary({ messages = [], currentScreenLabel = '' }) {
  const [log, setLog] = useState(() => safeReadLog());

  useEffect(() => {
    const sync = () => setLog(safeReadLog());
    window.addEventListener(FEEDBACK_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FEEDBACK_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const summary = useMemo(() => summarize(log), [log]);
  const latestAssistant = [...messages].reverse().find((row) => row?.role === 'assistant');
  const latestQuality = latestAssistant?.qualityHints || null;
  const latestQuestionLabel = latestAssistant?.questionLabel || '';

  return (
    <div style={{ display: 'grid', gap: 8, borderRadius: 14, padding: 12, background: '#f8fafc', border: '1px solid #d0d5dd' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#101828' }}>Sefer Abi kalite özeti</div>
          <div style={{ fontSize: 12, color: '#475467' }}>Son geri bildirimler ve son cevap kalitesi tek yerde görünür.</div>
        </div>
        <span style={{ borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800, ...tone(summary.ratio) }}>
          İşe yaradı oranı %{summary.ratio}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div style={{ borderRadius: 12, border: '1px solid #d0d5dd', background: '#fff', padding: 10 }}>
          <div style={{ fontSize: 12, color: '#475467' }}>Toplam geri bildirim</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.total}</div>
        </div>
        <div style={{ borderRadius: 12, border: '1px solid #d0d5dd', background: '#fff', padding: 10 }}>
          <div style={{ fontSize: 12, color: '#475467' }}>İşe yaradı</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#027a48' }}>{summary.useful}</div>
        </div>
        <div style={{ borderRadius: 12, border: '1px solid #d0d5dd', background: '#fff', padding: 10 }}>
          <div style={{ fontSize: 12, color: '#475467' }}>Eksik kaldı</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b42318' }}>{summary.needsWork}</div>
        </div>
        <div style={{ borderRadius: 12, border: '1px solid #d0d5dd', background: '#fff', padding: 10 }}>
          <div style={{ fontSize: 12, color: '#475467' }}>Son cevap etiketi</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{latestQuestionLabel || '-'}</div>
          {currentScreenLabel ? <div style={{ fontSize: 12, color: '#475467', marginTop: 4 }}>{currentScreenLabel}</div> : null}
        </div>
      </div>

      {latestQuality ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700, background: latestQuality.actionable ? '#ecfdf3' : '#fffaeb', color: latestQuality.actionable ? '#027a48' : '#b54708' }}>
            {latestQuality.actionable ? 'Aksiyon net' : 'Aksiyon netliği artırılabilir'}
          </span>
          <span style={{ borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700, background: latestQuality.concise ? '#ecfdf3' : '#fffaeb', color: latestQuality.concise ? '#027a48' : '#b54708' }}>
            {latestQuality.concise ? 'Cevap kısa' : 'Cevap kısalabilir'}
          </span>
          <span style={{ borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700, background: latestQuality.hasSupportAction ? '#ecfdf3' : '#fffaeb', color: latestQuality.hasSupportAction ? '#027a48' : '#b54708' }}>
            {latestQuality.hasSupportAction ? 'Destek aksiyonu var' : 'Destek aksiyonu artırılabilir'}
          </span>
        </div>
      ) : null}

      {summary.topLabels.length ? (
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 12, color: '#475467', fontWeight: 700 }}>En sık ölçülen yardım tipleri</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {summary.topLabels.map(([label, count]) => (
              <span key={label} style={{ borderRadius: 999, padding: '4px 8px', border: '1px solid #d0d5dd', background: '#fff', fontSize: 12 }}>
                {label} • {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
