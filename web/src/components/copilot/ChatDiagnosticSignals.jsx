function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function chipTexts(signal) {
  const id = normalizeText(signal?.id || signal?.key || '');
  const label = normalizeText(signal?.label || '');
  const value = normalizeText(signal?.value || signal?.text || signal?.status || signal?.summary || '');
  const note = normalizeText(signal?.note || signal?.help || signal?.reason || '');
  const hay = `${id} ${label} ${value} ${note}`.trim();
  const chips = [];

  if (/operationproof|operasyon kaniti|servis kaniti/.test(hay)) chips.push('Operasyon kanıtı var');
  if (/gpssourcevisibility|gps gorunurlugu|konum kaynagi/.test(hay)) {
    chips.push('GPS görünürlüğü kontrol edildi');
    chips.push('Sürücünün telefon GPS’i devrede');
  }
  if (/qualitysignal|kalite sinyali|taslak skor|inceleme karari|denetim izi|saglayici karsilastirma/.test(hay)) chips.push('Kalite sinyali var');
  if (/reviewdecision/.test(hay)) chips.push('İnceleme kararı var');
  if (/reviewhistory/.test(hay)) chips.push('Denetim izi var');
  if (/providercomparison/.test(hay)) chips.push('Sağlayıcı karşılaştırma sinyali var');
  if (/paymentpreviewmissinginfo|eksik bilgi|kontrol gerekli/.test(hay)) chips.push('Hakediş eksik bilgi içeriyor');
  if (/paymentaccountstatus|odeme hesabi/.test(hay)) chips.push('Ödeme hesabı eksik');
  if (/contractshiftgeneration|sozlesme.*vardiya|vardiya uretil/.test(hay)) chips.push('Sözleşme/vardiya üretimi kontrol edildi');
  if (/commissionstatus/.test(hay)) chips.push('Komisyon durumu kontrol edildi');
  if (/settlementstatus/.test(hay)) chips.push('Tahsilat kapalı');
  if (/paymentpreviewstatus/.test(hay) && !chips.length) chips.push('Hakediş önizlemesi var');

  return chips;
}

function buildVisibleChips(signals = []) {
  const seen = new Set();
  const chips = [];
  for (const signal of Array.isArray(signals) ? signals : []) {
    const rows = chipTexts(signal);
    for (const text of rows) {
      const key = normalizeText(text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      chips.push({
        text,
        title: String(signal?.note || signal?.help || signal?.reason || ''),
      });
      if (chips.length >= 5) return chips;
    }
  }
  return chips;
}

export default function ChatDiagnosticSignals({
  title = 'Ekrandan gelen sinyaller',
  signals = [],
  summary = '',
  emptyText = 'Bu ekranda ek kanıt sinyali yok',
  visible = false,
}) {
  const chips = buildVisibleChips(signals);
  if (!visible && !chips.length) return null;

  return (
    <div style={{ marginTop: 10, borderRadius: 12, border: '1px solid #d0d5dd', background: '#fff', padding: 10 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#344054' }}>{title}</div>
        {summary ? <div style={{ fontSize: 12, color: '#475467' }}>Bu cevap ekran verisine dayanıyor.</div> : null}
      </div>

      {chips.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {chips.map((chip) => (
            <span
              key={chip.text}
              title={chip.title}
              style={{
                borderRadius: 999,
                padding: '4px 8px',
                border: '1px solid #c7d7fe',
                background: '#eef4ff',
                color: '#3538cd',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {chip.text}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>{emptyText}</div>
      )}
    </div>
  );
}
