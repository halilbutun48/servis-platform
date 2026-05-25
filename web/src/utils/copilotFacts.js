import {
  getEtaDisplay,
  getGpsAgeText,
  getGpsReliabilityLabel,
  getLiveTrackingSummary,
  isEtaSuspicious,
  normalizeGpsFreshness,
} from "./etaSanity.js";
import { resolvePersonDisplayLabel } from "./labels.js";

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function pushIf(rows, condition, value) {
  if (condition && value) rows.push(value);
}

function actionRule({
  key,
  label,
  enabled,
  reason = '',
  purpose = '',
  whenToUse = '',
  whatHappens = '',
  riskNote = '',
  required = [],
  blockedBy = [],
}) {
  const row = {
    key: key || normalizeText(label).replace(/[^a-z0-9çğıöşü]+/gi, '_'),
    label,
    enabled: Boolean(enabled),
    purpose,
    whenToUse,
    whatHappens,
    riskNote,
    required: (Array.isArray(required) ? required : []).filter(Boolean),
    blockedBy: (Array.isArray(blockedBy) ? blockedBy : []).filter(Boolean),
  };
  if (!enabled) row.reason = reason || 'Bu işlem için ön koşullar tamamlanmamış olabilir.';
  if (enabled && reason) row.reason = reason;
  return row;
}

function splitActions(actions = []) {
  const rows = (Array.isArray(actions) ? actions : []).filter((row) => row && row.label);
  return {
    allowedActions: rows.filter((row) => row.enabled !== false),
    blockedActions: rows.filter((row) => row.enabled === false),
  };
}

function compactText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || '').trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = compactText(value, '');
    if (text) return text;
  }
  return '';
}

function compactList(items = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item);
    if (!text) continue;
    const key = text.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeStatusDisplayText(value) {
  const text = compactText(value, '');
  if (!text) return '';
  const datedRange = text.match(/^(.+?)\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})(?:\s*[-–—]\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|\d{2}:\d{2}))?$/u);
  if (datedRange) {
    const status = compactText(datedRange[1], '');
    const start = compactText(datedRange[2], '');
    const end = compactText(datedRange[3] || '', '');
    if (status && end) return `${status} • ${start} - ${end}`;
    if (status) return `${status} • ${start}`;
  }
  return text
    .replace(/\bengelı\b/gi, 'engeli')
    .replace(/[?？]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*•\s*/g, ' • ')
    .replace(/\s*-\s*/g, ' - ')
    .trim();
}

export const COPILOT_PERSONA = Object.freeze({
  assistantDisplayName: 'Sefer Abi',
  assistantSubtitle: 'Operasyon yardımcısı',
  menuLabel: 'Sefer Abi',
  terminalLabel: 'Sefer Abi Terminali',
  drawerTitle: 'Sefer Abi’ye Sor',
  emptyStateLead: 'Bulunduğun ekranda soru sorabilirsin.',
  emptyStateBody: 'Yazı alanı altta. Hazır öneriler istersen açılır. Seçili kayıt varsa onu da konuşmaya katmaya çalışırım.',
  toneLead: 'Sefer Abi aynı sahayı bilen sakin ve net yardım tonunu taşır.',
  toneRules: [
    'Cıvık değil.',
    'Aşırı samimi değil.',
    'Kısa, doğrudan ve operasyon odaklı.',
    'Teknik iç kodları görünür metne taşımaz.',
  ],
  voiceFamilyNote: 'Web Copilot ve sürücü sesli yardımcı aynı marka sesi ailesindedir.',
  voiceReadoutConfig: Object.freeze({
    lang: 'tr-TR',
    pitch: 0.82,
    rate: 0.92,
    volume: 1,
  }),
  mobileAcceptanceNote: 'Mobil canlı kabul bu milestone içinde değildir; sonraki adımda ayrı değerlendirilir.',
  dispatcherNote: 'Proactive AI dispatcher bu milestone kapsamı dışındadır.',
});

export const COPILOT_TERMINAL = Object.freeze({
  title: 'Sefer Abi Terminali',
  subtitle: 'Operasyon, kalite ve ticari sinyalleri tek ekranda yorumlayan readonly analiz alanı.',
  readonlyBoundary: 'Bu ekran işlem başlatmaz; yalnızca görünür sinyalleri yorumlar.',
  drawerSeparationNote: 'Sağ alttaki Sefer Abi’ye Sor hızlı destek içindir; terminal daha derin analiz yüzeyidir.',
  starterChips: Object.freeze([
    'Bugünkü operasyon risklerini özetle',
    'Ticari akışta eksik var mı?',
    'Kalite sinyallerini açıkla',
    'Sıradaki doğru kontrol ne?',
  ]),
});

export function normalizeCopilotSignal(signal, fallbackId = '') {
  if (!signal) return null;
  if (typeof signal === 'string') {
    const text = compactText(signal);
    if (!text) return null;
    return {
      id: compactText(fallbackId || text || 'signal'),
      label: text,
      value: text,
      note: '',
    };
  }
  if (typeof signal !== 'object') return null;
  const id = compactText(signal.id || signal.key || fallbackId || signal.label || 'signal');
  const label = compactText(signal.label || signal.title || signal.name || id || 'Sinyal');
  const value = compactText(signal.value || signal.text || signal.state || signal.status || signal.summary || '-');
  const note = compactText(signal.note || signal.help || signal.reason || '');
  return {
    id,
    label: label || id,
    value: value || '-',
    note,
  };
}

export function buildCopilotSignalSummary(signals = [], limit = 3) {
  const rows = compactList(
    (Array.isArray(signals) ? signals : [])
      .map((signal) => normalizeCopilotSignal(signal))
      .filter(Boolean)
      .map((signal) => `${signal.label}: ${signal.value}`),
    limit,
  );
  return rows.join(' • ');
}

function signalText(value) {
  return compactText(value, '');
}

function normalizeSignalText(value) {
  return normalizeText(compactText(value, ''));
}

function normalizeEnumKey(value) {
  return String(value || '').trim().toUpperCase();
}

const BOARDING_APPLICATION_STATUS_LABELS = {
  READY: 'Uygulamaya hazır',
  APPLIED: 'Günlük atamaya işlendi',
  NOTE_ONLY: 'Not kaydı',
  NOOP: 'Değişiklik yok',
  BLOCKED: 'Uygulanamadı',
};

function boardingApplicationStatusLabel(value) {
  return BOARDING_APPLICATION_STATUS_LABELS[normalizeEnumKey(value)] || 'Uygulamaya hazır';
}

function scoreSignalTerms(text, terms = []) {
  const normalized = normalizeSignalText(text);
  if (!normalized) return 0;
  let score = 0;
  for (const term of Array.isArray(terms) ? terms : []) {
    const needle = normalizeSignalText(term);
    if (!needle) continue;
    if (normalized.includes(needle)) {
      score += 3;
      continue;
    }
    if (needle.split(' ').some((part) => part && normalized.includes(part))) {
      score += 1;
    }
  }
  return score;
}

function pickSignalNote(id) {
  switch (id) {
    case 'missing-vehicle-driver':
      return 'Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.';
    case 'route-stop':
      return 'Rota ve durak bilgisini birlikte oku.';
    case 'shift-status':
      return 'Durum satırını ve bağlı vardiyayı birlikte kontrol et.';
    case 'live-start':
      return 'Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı akışını birlikte kontrol et.';
    case 'gps-old':
      return 'Son GPS zamanını ve konum kaynağını kontrol et.';
    case 'operation-proof':
      return 'Operasyon kanıtı kartını ve görünürlük satırını aç.';
    case 'contract-shift':
      return 'Sözleşme ile vardiya üretimi bağını kontrol et.';
    case 'payment-info':
      return 'Hakediş önizleme, ödeme hesabı ve komisyonu birlikte oku.';
    case 'kvkk-access':
      return 'Rol ve görünürlük sınırını kontrol et.';
    case 'quality-signal':
      return 'Kanıt, taslak skor ve inceleme kararını birlikte oku.';
    case 'feedback-open':
      return 'Açık veya kritik durumu önce ayır.';
    case 'notification-source':
      return 'Bildirimin bağlı olduğu olay kaydına git.';
    default:
      return '';
  }
}

export function buildLiveFactConfidence({
  screenType = '',
  stage = '',
  readiness = '',
  readinessScore = 0,
  summary = '',
  blockers = [],
  evidence = [],
  selectedRecordStatus = '',
  copilotSignals = [],
  counters = {},
} = {}) {
  const evidenceText = compactList([...compactList(blockers, 4), ...compactList(evidence, 4)], 4).join(' • ');
  const signalCount = Array.isArray(copilotSignals) ? copilotSignals.length : 0;
  const screenTypeKey = normalizeEnumKey(screenType);
  const counterMap = counters && typeof counters === 'object' ? counters : {};
  const missingCount = Number(counterMap.missingCount ?? counterMap.paymentPreviewMissingInfo ?? counterMap.paymentMissingInfo ?? NaN);
  const activeDrivers = Number(counterMap.activeDrivers ?? NaN);
  const riskyDevices = Number(counterMap.riskyDevices ?? NaN);
  const staleOrOffline = Number(counterMap.staleOrOffline ?? NaN);
  const openIssues = Number(counterMap.openIssues ?? NaN);
  const screenSignal = signalCount > 0 || evidenceText ? 'Görünüyor' : 'Sınırlı';
  const selectedSignal = signalText(selectedRecordStatus || stage || readiness || 'Seçili kayıt yok');
  const workflowSignal = /READY/.test(normalizeSignalText(readiness)) || /READY/.test(normalizeSignalText(stage))
    ? 'Hazır'
    : Number.isFinite(Number(readinessScore)) && Number(readinessScore) >= 65
      ? 'Kontrollü'
      : 'Kısmi';
  const combined = normalizeSignalText([screenType, stage, readiness, summary, evidenceText, selectedSignal].join(' '));
  let missingSignal = 'Belirgin eksik yok';
  if (/(kvkk|yetki|erişim|erisim|izin|403|401|permission denied|gizli|görünmüyor|gorunmuyor)/.test(combined)) missingSignal = 'Yetki sınırı';
  else if (/(gps|konum|telefon gps|son gps|offline)/.test(combined)) missingSignal = 'GPS bekleniyor';
  else if (screenTypeKey === 'PAYMENT_READINESS' || screenTypeKey === 'COMMERCIAL_FLOW') {
    if (Number.isFinite(missingCount)) missingSignal = missingCount > 0 ? 'Hakediş eksik bilgi' : 'Belirgin eksik yok';
    else if (/(hakediş|hakedis|ödeme hesabı|odeme hesabi|komisyon|csv|önizleme|onizleme|eksik bilgi)/.test(combined)) missingSignal = 'Hakediş eksik bilgi';
  } else if (screenTypeKey === 'OPERATION_HEALTH') {
    const hasCounts = [activeDrivers, riskyDevices, staleOrOffline, openIssues].some((value) => Number.isFinite(value));
    if (hasCounts && ((Number.isFinite(activeDrivers) && activeDrivers === 0) || (Number.isFinite(riskyDevices) && riskyDevices > 0) || (Number.isFinite(staleOrOffline) && staleOrOffline > 0) || (Number.isFinite(openIssues) && openIssues > 0))) {
      missingSignal = 'Canlılık ve cihaz riski';
    } else if (hasCounts) {
      missingSignal = 'Belirgin eksik yok';
    }
  } else if (/(hakediş|hakedis|ödeme hesabı|odeme hesabi|komisyon|csv|önizleme|onizleme|eksik bilgi)/.test(combined)) missingSignal = 'Hakediş eksik bilgi';
  else if (/(sözleşme|sozlesme|vardiya üretimi|vardiya uretimi|vardiya)/.test(combined)) missingSignal = 'Sözleşme/vardiya kontrolü';
  else if (/(geri bildirim|feedback|açık|acik|kritik|tekrarlayan)/.test(combined)) missingSignal = 'Geri bildirim açık';
  else if (/(bildirim|notification|olay kaynağı|olay kaynagi)/.test(combined)) missingSignal = 'Bildirim kaynağı';
  else if (/(kalite|quality|sağlayıcı|saglayici|provider)/.test(combined)) missingSignal = 'Kalite sinyali';
  else if (/(araç|arac|sürücü|surucu|durak|rota)/.test(combined)) missingSignal = 'Eksik veri';
  const liveStartHint = screenTypeKey === 'SHIFTS'
    && /APPROVED|ACCEPTED|ACTIVE/.test(normalizeSignalText(stage || readiness || selectedSignal))
    && /(araç|arac|sürücü|surucu|durak|gps|operasyon kanıtı|operasyon kaniti)/.test(combined)
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.'
    : '';
  const summaryText = selectedSignal && selectedSignal !== 'Seçili kayıt yok'
    ? `Seçili kayıt: ${selectedSignal}. Ekrandaki sinyal ${screenSignal}. Genel workflow ${workflowSignal}. Eksik sinyal: ${missingSignal}.${liveStartHint ? ` ${liveStartHint}` : ''}`
    : `Ekrandaki sinyal ${screenSignal}. Genel workflow ${workflowSignal}. Eksik sinyal: ${missingSignal}.${liveStartHint ? ` ${liveStartHint}` : ''}`;
  return {
    summary: summaryText,
    rows: [
      normalizeCopilotSignal({
        id: 'screen_signal',
        label: 'Ekrandaki sinyal',
        value: screenSignal,
        note: signalCount ? 'Ekrandan okunan sinyal var.' : 'Sinyal az.',
      }),
      normalizeCopilotSignal({
        id: 'selected_record',
        label: 'Seçili kayıt',
        value: selectedSignal,
        note: selectedSignal && selectedSignal !== 'Seçili kayıt yok' ? 'Seçili satırdan geliyor.' : 'Seçili kayıt görünmüyor.',
      }),
      normalizeCopilotSignal({
        id: 'workflow_signal',
        label: 'Genel workflow',
        value: workflowSignal,
        note: `Durum: ${signalText(readiness || stage || 'REVIEW_NEEDED')}`,
      }),
      normalizeCopilotSignal({
        id: 'missing_signal',
        label: 'Sinyal eksik',
        value: missingSignal,
        note: evidenceText || 'Belirgin boşluk görünmüyor.',
      }),
    ].filter(Boolean),
  };
}

export function buildDiagnosticPriority({
  screenType = '',
  stage = '',
  readiness = '',
  selectedRecordStatus = '',
  summary = '',
  blockers = [],
  evidence = [],
  copilotSignals = [],
  counters = {},
} = {}) {
  const signalTextParts = [
    screenType,
    stage,
    readiness,
    selectedRecordStatus,
    summary,
    ...compactList(blockers, 4),
    ...compactList(evidence, 6),
    ...compactList(
      (Array.isArray(copilotSignals) ? copilotSignals : []).map((signal) => {
        const normalized = normalizeCopilotSignal(signal);
        return normalized ? `${normalized.label} ${normalized.value} ${normalized.note}` : '';
      }),
      8,
    ),
  ];
  const text = normalizeSignalText(signalTextParts.join(' '));
  const screenTypeKey = normalizeEnumKey(screenType);
  const counterMap = counters && typeof counters === 'object' ? counters : {};
  const activeDrivers = Number(counterMap.activeDrivers ?? NaN);
  const riskyDevices = Number(counterMap.riskyDevices ?? NaN);
  const staleOrOffline = Number(counterMap.staleOrOffline ?? NaN);
  const openIssues = Number(counterMap.openIssues ?? NaN);
  if (screenTypeKey === 'OPERATION_HEALTH') {
    const hasCounts = [activeDrivers, riskyDevices, staleOrOffline, openIssues].some((value) => Number.isFinite(value));
    const rows = [];
    if (Number.isFinite(activeDrivers)) rows.push(normalizeCopilotSignal({ id: 'active-drivers', label: '1. öncelik', value: activeDrivers === 0 ? 'Aktif sürücü 0' : `Aktif sürücü ${activeDrivers}`, note: activeDrivers === 0 ? 'Canlılık riski görünür.' : 'Canlı sürücü sayısı okunur.' }));
    if (Number.isFinite(riskyDevices)) rows.push(normalizeCopilotSignal({ id: 'risky-devices', label: '2. öncelik', value: riskyDevices > 0 ? 'Riskli cihaz' : 'Riskli cihaz yok', note: riskyDevices > 0 ? 'İzin, oturum veya GPS riski var.' : 'Belirgin cihaz riski görünmüyor.' }));
    if (Number.isFinite(staleOrOffline)) rows.push(normalizeCopilotSignal({ id: 'stale-offline', label: '3. öncelik', value: staleOrOffline > 0 ? 'Stale/offline' : 'Stale/offline yok', note: staleOrOffline > 0 ? 'Canlı konum akışı eski olabilir.' : 'Konum akışı canlı görünüyor.' }));
    if (Number.isFinite(openIssues)) rows.push(normalizeCopilotSignal({ id: 'open-issues', label: '4. öncelik', value: openIssues > 0 ? 'Açık sorun' : 'Açık sorun yok', note: openIssues > 0 ? 'Takip edilmesi gereken durumlar var.' : 'Açık sorun görünmüyor.' }));
    const summaryText = hasCounts
      ? `En olası sıra: Canlılık ve cihaz riski • Riskli cihaz • Stale/offline • Açık sorun`
      : 'Belirgin öncelik ayrımı yok';
    return {
      summary: summaryText,
      rows: rows.slice(0, 4),
    };
  }
  if (screenTypeKey === 'AGREEMENTS') {
    const generatedShiftCount = Number(counterMap.generatedShiftCount ?? counterMap.generatedCount ?? NaN);
    const sourceShiftId = Number(counterMap.sourceShiftId ?? NaN);
    const lastGeneratedShiftId = Number(counterMap.lastGeneratedShiftId ?? NaN);
    const lastGeneratedShiftStatus = normalizeSignalText(counterMap.lastGeneratedShiftStatus ?? '');
    const personelCount = Number(counterMap.personelCount ?? NaN);
    const stopCount = Number(counterMap.stopCount ?? NaN);
    const hasGeneration = Number.isFinite(generatedShiftCount) && generatedShiftCount > 0;
    const rows = [];
    if (Number.isFinite(sourceShiftId) && sourceShiftId > 0) {
      rows.push(normalizeCopilotSignal({
        id: 'source-shift',
        label: '1. öncelik',
        value: `Kaynak vardiya #${sourceShiftId}`,
        note: 'Sözleşmenin üretim kökü okunur.',
      }));
    }
    if (Number.isFinite(generatedShiftCount)) {
      rows.push(normalizeCopilotSignal({
        id: 'generated-count',
        label: '2. öncelik',
        value: hasGeneration ? `Üretilen vardiya ${generatedShiftCount}` : 'Bugün üretim sinyali yok',
        note: hasGeneration ? 'Bugün üretim sinyali var.' : 'Üretim geçmişi kontrol edilmeli.',
      }));
    }
    if (Number.isFinite(lastGeneratedShiftId) && lastGeneratedShiftId > 0) {
      rows.push(normalizeCopilotSignal({
        id: 'last-generated',
        label: '3. öncelik',
        value: `Son üretilen vardiya #${lastGeneratedShiftId}`,
        note: lastGeneratedShiftStatus ? `Durum: ${lastGeneratedShiftStatus}` : 'Son vardiya görünür.',
      }));
    }
    if (Number.isFinite(personelCount)) {
      rows.push(normalizeCopilotSignal({
        id: 'personel-count',
        label: '4. öncelik',
        value: personelCount > 0 ? `Personel ${personelCount}` : 'Personel görünmüyor',
        note: personelCount > 0 ? 'Vardiya personeli okunur.' : 'Personel sayısı boş olabilir.',
      }));
    }
    if (Number.isFinite(stopCount)) {
      rows.push(normalizeCopilotSignal({
        id: 'stop-count',
        label: '5. öncelik',
        value: stopCount > 0 ? `Durak ${stopCount}` : 'Durak görünmüyor',
        note: stopCount > 0 ? 'Vardiya durak sayısı okunur.' : 'Durak sayısı boş olabilir.',
      }));
    }
    const summaryText = hasGeneration
      ? `Bu sözleşme için bugün vardiya üretim sinyali görünüyor. Üretilen vardiya sayısı ${generatedShiftCount}${lastGeneratedShiftId > 0 ? ` • Son üretilen vardiya #${lastGeneratedShiftId}` : ''}`
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
    return {
      summary: summaryText,
      rows: rows.slice(0, 5),
    };
  }
  const readyForLiveStart = screenTypeKey === 'SHIFTS' && /approved/.test(text) && /ready/.test(text) && /(araç|arac|vehicle|sürücü|surucu|driver)/.test(text);
  const candidates = readyForLiveStart
    ? [
      { id: 'live-start', label: 'Canlı başlatma zamanı / aktif durum / GPS / operasyon kanıtı kontrolü', terms: ['canlı başlatma', 'canli baslatma', 'aktif durum', 'approved', 'onaylı', 'onayli', 'ready', 'hazır', 'hazir', 'atanmış', 'atanmis', 'gps', 'operasyon kanıtı', 'operasyon kaniti', 'kanıt', 'kanit', 'başlatma zamanı', 'baslatma zamani'] },
      { id: 'missing-vehicle-driver', label: 'Araç/sürücü bağı görünmüyorsa kontrol et', terms: ['araç', 'sürücü', 'driver', 'vehicle', 'plaka'] },
      { id: 'route-stop', label: 'Rota/durak eksik', terms: ['rota', 'durak', 'route', 'stop'] },
      { id: 'gps-old', label: 'GPS yok/eski', terms: ['gps', 'konum', 'telefon gps', 'son gps', 'offline', 'eski'] },
      { id: 'operation-proof', label: 'Operasyon kanıtı eksik', terms: ['operationproof', 'operasyon kanıtı', 'operasyon kaniti', 'kanıt', 'kanit', 'proof'] },
      { id: 'contract-shift', label: 'Sözleşme/vardiya üretimi yok', terms: ['sözleşme', 'sozlesme', 'vardiya üretimi', 'vardiya uretimi', 'üretildi mi', 'uretildi mi'] },
      { id: 'payment-info', label: 'Hakediş eksik bilgi', terms: ['hakediş', 'hakedis', 'ödeme hesabı', 'odeme hesabi', 'komisyon', 'csv', 'önizleme', 'onizleme', 'eksik bilgi'] },
      { id: 'kvkk-access', label: 'KVKK/yetki nedeniyle görünmüyor', terms: ['kvkk', 'yetki', 'rol', 'görünmüyor', 'gorunmuyor', 'gizli'] },
      { id: 'quality-signal', label: 'Kalite sinyali', terms: ['kalite', 'quality', 'sağlayıcı', 'saglayici', 'provider', 'değerlendirme', 'degerlendirme'] },
      { id: 'feedback-open', label: 'Geri bildirim açık', terms: ['geri bildirim', 'feedback', 'açık', 'acik', 'kritik', 'tekrarlayan'] },
      { id: 'notification-source', label: 'Bildirim kaynağı', terms: ['bildirim', 'notification', 'olay', 'kaynak'] },
    ]
    : [
      { id: 'missing-vehicle-driver', label: 'Eksik araç/sürücü', terms: ['araç', 'sürücü', 'driver', 'vehicle', 'plaka'] },
      { id: 'route-stop', label: 'Rota/durak eksik', terms: ['rota', 'durak', 'route', 'stop'] },
      { id: 'shift-status', label: 'Görev/vardiya durumu uygun değil', terms: ['vardiya', 'shift', 'durum', 'status', 'hazır değil', 'hazir degil'] },
      { id: 'gps-old', label: 'GPS yok/eski', terms: ['gps', 'konum', 'telefon gps', 'son gps', 'offline', 'eski'] },
      { id: 'operation-proof', label: 'Operasyon kanıtı eksik', terms: ['operationproof', 'operasyon kanıtı', 'operasyon kaniti', 'kanıt', 'kanit', 'proof'] },
      { id: 'contract-shift', label: 'Sözleşme/vardiya üretimi yok', terms: ['sözleşme', 'sozlesme', 'vardiya üretimi', 'vardiya uretimi', 'üretildi mi', 'uretildi mi'] },
      { id: 'payment-info', label: 'Hakediş eksik bilgi', terms: ['hakediş', 'hakedis', 'ödeme hesabı', 'odeme hesabi', 'komisyon', 'csv', 'önizleme', 'onizleme', 'eksik bilgi'] },
      { id: 'kvkk-access', label: 'KVKK/yetki nedeniyle görünmüyor', terms: ['kvkk', 'yetki', 'rol', 'görünmüyor', 'gorunmuyor', 'gizli'] },
      { id: 'quality-signal', label: 'Kalite sinyali', terms: ['kalite', 'quality', 'sağlayıcı', 'saglayici', 'provider', 'değerlendirme', 'degerlendirme'] },
      { id: 'feedback-open', label: 'Geri bildirim açık', terms: ['geri bildirim', 'feedback', 'açık', 'acik', 'kritik', 'tekrarlayan'] },
      { id: 'notification-source', label: 'Bildirim kaynağı', terms: ['bildirim', 'notification', 'olay', 'kaynak'] },
    ];
  const boostedIds = new Set(
    screenTypeKey === 'PAYMENT_READINESS'
      ? ['payment-info', 'contract-shift', 'shift-status', 'kvkk-access']
      : screenTypeKey === 'TRUST_QUALITY'
        ? ['quality-signal', 'feedback-open', 'operation-proof']
        : screenTypeKey === 'FEEDBACK'
          ? ['feedback-open', 'notification-source', 'kvkk-access']
          : screenTypeKey === 'MAP'
            ? ['gps-old', 'missing-vehicle-driver', 'route-stop']
            : screenTypeKey === 'SHIFTS'
              ? (readyForLiveStart ? ['live-start', 'gps-old', 'missing-vehicle-driver', 'operation-proof'] : ['missing-vehicle-driver', 'route-stop', 'shift-status', 'operation-proof'])
              : screenTypeKey === 'COMMERCIAL_FLOW'
                ? ['payment-info', 'contract-shift', 'shift-status']
                : [],
  );
  const ranked = candidates
    .map((candidate, index) => {
      const keywordScore = scoreSignalTerms(text, candidate.terms);
      const screenScore = readyForLiveStart
        ? (candidate.id === 'live-start' ? 8 : candidate.id === 'missing-vehicle-driver' ? -4 : boostedIds.has(candidate.id) ? 2 : 0)
        : (boostedIds.has(candidate.id) ? 2 : 0);
      return {
        ...candidate,
        index,
        score: keywordScore + screenScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = ranked.slice(0, 4);
  const prioritySummary = picked.length
    ? `En olası sıra: ${picked.map((item) => item.label).join(' • ')}`
    : 'Belirgin öncelik ayrımı yok';
  const selectedLead = screenTypeKey === 'MAP' && selectedRecordStatus
    ? `Seçili araç ${selectedRecordStatus}`
    : '';
  return {
    summary: selectedLead ? `${selectedLead} • ${prioritySummary}` : prioritySummary,
    rows: picked.map((item, idx) => normalizeCopilotSignal({
      id: item.id,
      label: `${idx + 1}. öncelik`,
      value: item.label,
      note: pickSignalNote(item.id),
    })).filter(Boolean),
  };
}

export function buildActionSimulationWording({
  screenType = '',
  diagnosticPriority = null,
  roleBoundary = '',
  counters = {},
} = {}) {
  const topPriority = compactText(diagnosticPriority?.rows?.[0]?.value || diagnosticPriority?.rows?.[0]?.label || '', '');
  const normalizedScreenType = normalizeEnumKey(screenType);
  const counterMap = counters && typeof counters === 'object' ? counters : {};
  const activeDrivers = Number(counterMap.activeDrivers ?? NaN);
  const riskyDevices = Number(counterMap.riskyDevices ?? NaN);
  const staleOrOffline = Number(counterMap.staleOrOffline ?? NaN);
  const openIssues = Number(counterMap.openIssues ?? NaN);
  let text = 'En güçlü sinyali doğrula, sonra ilgili ekranı aç.';
  if (normalizedScreenType === 'SHIFTS') {
    text = 'Önerilen adım: canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.';
  } else if (normalizedScreenType === 'PAYMENT_READINESS' || normalizedScreenType === 'COMMERCIAL_FLOW') {
    text = 'Hakediş / kanıt önizlemesini, eksik bilgi ve kalite sinyaliyle birlikte kontrol et. Ödeme başlatılmaz.';
  } else if (normalizedScreenType === 'TRUST_QUALITY') {
    text = 'Kanıt, taslak skor, inceleme kararı ve denetim izini birlikte kontrol et; kesin sıralama yapma.';
  } else if (normalizedScreenType === 'FEEDBACK') {
    text = 'Açık veya kritik kaydı ve sorumlu rolü kontrol et; yönetim aksiyonu yapma.';
  } else if (normalizedScreenType === 'MAP' || normalizedScreenType === 'OPERATION_PROOF') {
    text = 'Önerilen adım: araç, sürücü, rota/durak, araç GPS’i ve Sürücünün telefon GPS’i sinyalini birlikte kontrol et.';
  } else if (normalizedScreenType === 'BOARDING_ROUTE_IMPACT_PREVIEW') {
    text = 'Önerilen adım: rota etkisini önizle, kişi/durak/km/süre/kapasite farkını kontrol et ve değişiklik uygulama.';
  } else if (normalizedScreenType === 'AGREEMENTS') {
    text = 'Üretim geçmişini aç, bugünkü vardiyalar listesini kontrol et ve son üretilen vardiyayı doğrula.';
  } else if (normalizedScreenType === 'KVKK' || normalizedScreenType === 'ROLE_HELP') {
    text = 'Rol ve görünürlük sınırını kontrol et; yetkisiz yönetim aksiyonu önermem.';
  } else if (normalizedScreenType === 'OPERATION_HEALTH') {
    const hasCounts = [activeDrivers, riskyDevices, staleOrOffline, openIssues].some((value) => Number.isFinite(value));
    text = hasCounts
      ? 'Riskli cihazı aç, stale/offline satırını kontrol et ve açık sorunları sırala.'
      : 'Açık sorun, riskli cihaz, aktif sürücü ve stale/offline satırlarını birlikte kontrol et.';
  } else if (topPriority) {
    text = `${topPriority.toLocaleLowerCase('tr-TR')} kontrol edilir, sonra uygun ekran açılır.`;
  }
  if (roleBoundary) {
    text += ' Bu rolde yönetim aksiyonu önermem.';
  }
  return text.trim();
}

function normalizeVisibleActionSimulationText(value) {
  return compactText(value, '')
    .replace(/^(?:Önerilen adım|Öneri)\s*:\s*/i, '')
    .replace(/^(?:Önerilen adım|Öneri)\s+/i, '')
    .trim();
}

function buildReadonlyCopilotFacts({
  screenType = '',
  stage = '',
  readiness = 'REVIEW_NEEDED',
  readinessScore = 0,
  summary = '',
  blockers = [],
  evidence = [],
  nextBestAction = '',
  safestNextStep = '',
  compareHint = '',
  counters = {},
  copilotSignals = [],
  boundaryNotes = [],
  selectedRecordStatus = '',
  liveFactConfidence = null,
  diagnosticPriority = null,
  actionSimulation = '',
}) {
  const signals = (Array.isArray(copilotSignals) ? copilotSignals : [])
    .map((signal, idx) => normalizeCopilotSignal(signal, `signal_${idx + 1}`))
    .filter(Boolean)
    .slice(0, 8);
  const selectedRecordStatusText = normalizeStatusDisplayText(compactText(selectedRecordStatus, compactText(stage || readiness || summary || 'Seçili kayıt yok', 'Seçili kayıt yok')));
  const liveFactConfidenceValue = liveFactConfidence && typeof liveFactConfidence === 'object'
    ? {
      summary: compactText(liveFactConfidence.summary || ''),
      rows: Array.isArray(liveFactConfidence.rows)
        ? liveFactConfidence.rows.map((row, idx) => normalizeCopilotSignal(row, `live_fact_${idx + 1}`)).filter(Boolean)
        : [],
    }
    : buildLiveFactConfidence({
      screenType: compactText(screenType, 'SCREEN'),
      stage,
      readiness,
      readinessScore,
      summary,
      blockers,
      evidence,
      selectedRecordStatus: selectedRecordStatusText,
      copilotSignals: signals,
      counters,
    });
  const diagnosticPriorityValue = diagnosticPriority && typeof diagnosticPriority === 'object'
    ? {
      summary: compactText(diagnosticPriority.summary || ''),
      rows: Array.isArray(diagnosticPriority.rows)
        ? diagnosticPriority.rows.map((row, idx) => normalizeCopilotSignal(row, `diagnostic_${idx + 1}`)).filter(Boolean)
        : [],
    }
    : buildDiagnosticPriority({
      screenType: compactText(screenType, 'SCREEN'),
      stage,
      readiness,
      selectedRecordStatus: selectedRecordStatusText,
      summary,
      blockers,
      evidence,
      copilotSignals: signals,
      counters,
    });
  const actionSimulationText = compactText(
    normalizeVisibleActionSimulationText(
      actionSimulation
      || buildActionSimulationWording({
        screenType: compactText(screenType, 'SCREEN'),
        stage,
        readiness,
        selectedRecordStatus: selectedRecordStatusText,
        diagnosticPriority: diagnosticPriorityValue,
        counters,
      }),
    ),
    '',
  );
  return {
    screenType: compactText(screenType, 'SCREEN'),
    stage: compactText(stage, '-'),
    readiness: compactText(readiness, 'REVIEW_NEEDED'),
    readinessScore: Number.isFinite(Number(readinessScore)) ? Number(readinessScore) : 0,
    selectedRecordStatus: selectedRecordStatusText,
    liveFactConfidence: liveFactConfidenceValue,
    diagnosticPriority: diagnosticPriorityValue,
    actionSimulation: actionSimulationText,
    blockers: compactList(blockers, 5),
    evidence: compactList(evidence, 6),
    nextBestAction: compactText(nextBestAction),
    safestNextStep: compactText(safestNextStep),
    compareHint: compactText(compareHint),
    counters: Object.fromEntries(
      Object.entries(counters && typeof counters === 'object' ? counters : {})
        .map(([key, value]) => [key, value == null || value === '' ? 0 : value]),
    ),
    copilotSignals: signals,
    copilotSummary: compactList([
      summary,
      buildCopilotSignalSummary(signals, 3),
      selectedRecordStatusText,
      liveFactConfidenceValue?.summary || '',
      diagnosticPriorityValue?.summary || '',
      ...compactList(boundaryNotes, 3),
    ], 3).join(' • '),
    copilotBoundary: compactList(boundaryNotes, 4),
  };
}

export function buildOperationsCopilotFacts({
  operationProofSummary,
  auditCount = 0,
  notificationCount = 0,
  eventCount = 0,
}) {
  const statusText = compactText(operationProofSummary?.statusText || operationProofSummary?.summaryText || operationProofSummary?.title || operationProofSummary?.status || 'Bekliyor', 'Bekliyor');
  const summaryText = compactText(operationProofSummary?.summaryText || operationProofSummary?.visibilityNote || operationProofSummary?.nextAction || '', '');
  const nonFinalText = compactText(operationProofSummary?.nonFinalText || 'Hakediş için nihai karar değildir.', 'Hakediş için nihai karar değildir.');
  const gpsVisibility = compactText(
    operationProofSummary?.visibilityNote
    || (Array.isArray(operationProofSummary?.signals) && operationProofSummary.signals.some((signal) => /gps|telefon/i.test(compactText(signal?.id || signal?.label || signal?.value || ''))) ? 'Görünüyor' : 'Kontrol gerekli'),
    'Kontrol gerekli',
  );
  const blockerText = compactList(
    [
      ...(Array.isArray(operationProofSummary?.checklist) ? operationProofSummary.checklist.filter((row) => row && row.done === false).map((row) => row?.note || row?.label || '') : []),
      operationProofSummary?.nextAction || '',
      summaryText,
    ],
    3,
  ).join(' • ');
  return buildReadonlyCopilotFacts({
    screenType: 'OPERATION_PROOF',
    stage: statusText,
    readiness: /READY|EVIDENCE_READY|COMPLETED|REVIEWED/.test(statusText.toUpperCase()) ? 'READY' : /PARTIAL|NEEDS_REVIEW|NOT_READY/.test(statusText.toUpperCase()) ? 'REVIEW_NEEDED' : 'REVIEW_NEEDED',
    readinessScore: /READY|EVIDENCE_READY|COMPLETED|REVIEWED/.test(statusText.toUpperCase()) ? 86 : /PARTIAL|NEEDS_REVIEW/.test(statusText.toUpperCase()) ? 58 : 40,
    summary: summaryText || nonFinalText,
    blockers: blockerText ? [blockerText] : [],
    evidence: [
      `operasyon kanıtı: ${statusText}`,
      `gpsSourceVisibility: ${gpsVisibility}`,
      `audit/notification/event: ${auditCount}/${notificationCount}/${eventCount}`,
    ],
    nextBestAction: compactText(operationProofSummary?.nextAction || 'İlk bakılacak yer: Servis Kanıtı kartı.', 'İlk bakılacak yer: Servis Kanıtı kartı.'),
    safestNextStep: 'Önce Servis Kanıtı kartındaki durum ve eksik/engel satırını oku.',
    compareHint: 'Servis Kanıtı operasyon görünürlüğü sağlar; hakediş için nihai karar değildir.',
    counters: {
      auditCount: Number(auditCount || 0),
      notificationCount: Number(notificationCount || 0),
      eventCount: Number(eventCount || 0),
    },
    copilotSignals: [
      { id: 'operationProof', label: 'Servis kanıtı', value: statusText, note: nonFinalText },
      { id: 'gpsSourceVisibility', label: 'GPS görünürlüğü', value: gpsVisibility, note: 'Sürücünün telefon GPS’i ve araç görünürlüğü okunur.' },
      { id: 'operationProofBlocker', label: 'Eksik / engel', value: blockerText || 'Yok', note: summaryText || nonFinalText },
      { id: 'auditSummary', label: 'Denetim / bildirim / olay', value: `${auditCount} / ${notificationCount} / ${eventCount}`, note: 'Son denetim, bildirim ve olay özetleri.' },
    ],
    boundaryNotes: [nonFinalText, 'Sürücünün telefon GPS’i güvenli sinyal olarak görünür.'],
  });
}

export function buildOperationHealthCopilotFacts({
  summary,
  copilotDriver,
  copilotIssue,
}) {
  const counters = {
    activeDrivers: Number(summary?.cards?.activeDrivers || 0),
    riskyDevices: Number(summary?.cards?.riskyDevices || 0),
    staleOrOffline: Number(summary?.cards?.staleOrOffline || 0),
    openIssues: Number(summary?.cards?.openIssues || 0),
  };
  const hasSignal = [counters.activeDrivers, counters.riskyDevices, counters.staleOrOffline, counters.openIssues].some((value) => Number.isFinite(value));
  const summaryText = hasSignal
    ? `Şimdi: En kritik sorun canlılık ve cihaz riski. Aktif sürücü ${Number.isFinite(counters.activeDrivers) ? counters.activeDrivers : 0}, riskli cihaz ${Number.isFinite(counters.riskyDevices) ? counters.riskyDevices : 0}, stale/offline ${Number.isFinite(counters.staleOrOffline) ? counters.staleOrOffline : 0} ve açık sorun ${Number.isFinite(counters.openIssues) ? counters.openIssues : 0} görünüyor.`
    : 'Şimdi: Bu ekranda somut operasyon sağlığı sinyali görünmüyor; açık sorun, riskli cihaz, aktif sürücü ve stale/offline satırlarını kontrol et.';
  return buildReadonlyCopilotFacts({
    screenType: 'OPERATION_HEALTH',
    stage: String(summary?.status || 'ROOM_VIEW').toUpperCase(),
    readiness: counters.openIssues > 0 || counters.riskyDevices > 0 || counters.staleOrOffline > 0 ? 'REVIEW_NEEDED' : 'READY',
    readinessScore: counters.openIssues > 0 ? 44 : (counters.riskyDevices > 0 || counters.staleOrOffline > 0 ? 58 : 83),
    summary: summaryText,
    blockers: [
      counters.openIssues > 0 ? 'Açık sorunlar kapatılmadan saha güveni düşer.' : '',
      counters.riskyDevices > 0 ? 'Riskli cihazlar var.' : '',
      counters.staleOrOffline > 0 ? 'Stale veya offline kayıtlar var.' : '',
    ].filter(Boolean),
    evidence: [
      `Aktif sürücü: ${counters.activeDrivers}`,
      `Riskli cihaz: ${counters.riskyDevices}`,
      `Stale/offline: ${counters.staleOrOffline}`,
      `Açık sorun: ${counters.openIssues}`,
      copilotDriver?.driverName ? `Örnek sürücü: ${copilotDriver.driverName}` : '',
      copilotIssue?.title ? `Örnek sorun: ${copilotIssue.title}` : '',
    ].filter(Boolean),
    nextBestAction: counters.openIssues > 0
      ? 'Riskli cihazı aç, stale/offline satırını kontrol et ve açık sorunları sırala.'
      : 'Aktif sürücü, riskli cihaz, stale/offline ve açık sorun sayısını birlikte kontrol et.',
    safestNextStep: 'En risksiz adım, önce riskli cihaz ve stale/offline satırını açmaktır.',
    compareHint: 'Operasyon sağlığı canlılık ve risk okuması içindir; tek başına işlem kararı değildir.',
    counters,
    selectedRecordStatus: `Aktif sürücü ${counters.activeDrivers} • Riskli cihaz ${counters.riskyDevices} • Stale/offline ${counters.staleOrOffline} • Açık sorun ${counters.openIssues}`,
    copilotSignals: [
      { id: 'activeDrivers', label: 'Aktif sürücü', value: String(counters.activeDrivers), note: 'Canlı görünen sürücü sayısı.' },
      { id: 'riskyDevices', label: 'Riskli cihaz', value: String(counters.riskyDevices), note: 'İzin, oturum veya GPS riski taşıyan cihaz sayısı.' },
      { id: 'staleOrOffline', label: 'Stale / Offline', value: String(counters.staleOrOffline), note: 'Canlı konum akışı zayıf olan kayıt sayısı.' },
      { id: 'openIssues', label: 'Açık sorun', value: String(counters.openIssues), note: 'Takip edilmesi gereken sorun sayısı.' },
      copilotDriver?.driverName ? { id: 'sampleDriver', label: 'Örnek sürücü', value: copilotDriver.driverName, note: copilotDriver?.liveState || 'Canlı durum' } : null,
      copilotIssue?.title ? { id: 'sampleIssue', label: 'Örnek sorun', value: copilotIssue.title, note: copilotIssue?.severity || 'Önem seviyesi' } : null,
    ].filter(Boolean),
    boundaryNotes: ['Bu ekran operasyon sağlığı içindir.'],
  });
}

export function buildTrustQualityCopilotFacts({
  proofSummary,
  draftScoreSummary,
  reviewDecisionSummary,
  reviewHistorySummary,
  providerSignal,
  summary,
  evaluation,
}) {
  const proofStatus = compactText(proofSummary?.statusText || proofSummary?.summaryText || proofSummary?.title || proofSummary?.status || 'Bekliyor', 'Bekliyor');
  const draftBand = compactText(draftScoreSummary?.scoreBand || draftScoreSummary?.status || draftScoreSummary?.title || 'NO_SCORE', 'NO_SCORE');
  const draftScore = draftScoreSummary?.draftScore != null ? `${Number(draftScoreSummary.draftScore)} / 100` : 'Skor yok';
  const reviewStatus = compactText(reviewDecisionSummary?.reviewStatus || reviewDecisionSummary?.status || reviewDecisionSummary?.title || 'REVIEW_PENDING', 'REVIEW_PENDING');
  const historyText = compactText(reviewHistorySummary?.latestDecision?.statusText || reviewHistorySummary?.summaryText || reviewHistorySummary?.title || 'Henüz geçmiş yok.', 'Henüz geçmiş yok.');
  const providerCompare = compactText(providerSignal?.summary || summary?.summaryText || 'Sağlayıcı karşılaştırması için hazırlık', 'Sağlayıcı karşılaştırması için hazırlık');
  const nonFinal = compactText(draftScoreSummary?.nonFinalText || reviewDecisionSummary?.nonFinalText || reviewHistorySummary?.nonFinalText || 'Bu bilgi kesin kalite puanı değildir.', 'Bu bilgi kesin kalite puanı değildir.');
  return buildReadonlyCopilotFacts({
    screenType: 'TRUST_QUALITY',
    stage: reviewStatus,
    readiness: /REVIEWED|READY_FOR_REVIEW/.test(reviewStatus.toUpperCase()) ? 'READY' : 'REVIEW_NEEDED',
    readinessScore: /REVIEWED|READY_FOR_REVIEW/.test(reviewStatus.toUpperCase()) ? 82 : 54,
    summary: providerCompare,
    blockers: [nonFinal, 'Sağlayıcı sıralaması değildir.'],
    evidence: [
      `qualitySignal: ${draftBand}`,
      `draftScore: ${draftScore}`,
      `reviewDecision: ${reviewStatus}`,
      `reviewHistory: ${historyText}`,
    ],
    nextBestAction: compactText(reviewDecisionSummary?.nextAction || draftScoreSummary?.nextAction || 'Önce kanıt, taslak skor ve inceleme kararını birlikte oku.', 'Önce kanıt, taslak skor ve inceleme kararını birlikte oku.'),
    safestNextStep: 'Önce kanıt özetini aç, sonra taslak skor ve karar geçmişine geç.',
    compareHint: compactText(providerCompare || 'Taslak skor ile inceleme kararı birlikte okunur.', 'Taslak skor ile inceleme kararı birlikte okunur.'),
    counters: {
      proofChecklist: Array.isArray(proofSummary?.checklist) ? proofSummary.checklist.length : 0,
      draftChecklist: Array.isArray(draftScoreSummary?.checklist) ? draftScoreSummary.checklist.length : 0,
      reviewChecklist: Array.isArray(reviewDecisionSummary?.checklist) ? reviewDecisionSummary.checklist.length : 0,
      historyItems: Array.isArray(reviewHistorySummary?.items) ? reviewHistorySummary.items.length : 0,
      evaluationFields: Array.isArray(evaluation?.fields) ? evaluation.fields.length : 0,
    },
    copilotSignals: [
      { id: 'operationProof', label: 'Servis kanıtı', value: proofStatus, note: 'Kalite değerlendirmesine yardımcı olur.' },
      { id: 'qualitySignal', label: 'Kalite sinyali', value: `${draftBand} • ${draftScore}`, note: nonFinal },
      { id: 'reviewDecision', label: 'İnceleme kararı', value: reviewStatus, note: reviewDecisionSummary?.paymentImpactText || 'Hakediş veya komisyon hesabını etkilemez.' },
      { id: 'reviewHistory', label: 'Denetim izi', value: historyText, note: reviewHistorySummary?.paymentImpactText || 'Bu geçmiş kesin kalite puanı değildir.' },
      { id: 'providerComparison', label: 'Sağlayıcı karşılaştırma', value: providerCompare, note: 'Sağlayıcı sıralaması değildir.' },
    ],
    boundaryNotes: [nonFinal, 'Sağlayıcı sıralaması değildir.', reviewDecisionSummary?.paymentImpactText || 'Bu bilgi hakediş veya komisyon hesabını etkilemez.'],
  });
}

export function buildCommercialCoreCopilotFacts({
  paymentPreviewSummary,
  paymentBackbone,
  settings,
  settlementStatus,
  accountStatus,
  operationProofSummary,
  paymentSourcesMeta,
  lifecycle,
}) {
  const previewTitle = compactText(paymentPreviewSummary?.title || paymentPreviewSummary?.summaryText || 'Hakediş önizlemesi', 'Hakediş önizlemesi');
  const previewStatus = compactText(paymentPreviewSummary?.statusText || paymentPreviewSummary?.status || 'Taslak', 'Taslak');
  const previewReason = compactText(paymentPreviewSummary?.detailReason || paymentPreviewSummary?.summaryText || paymentPreviewSummary?.nextAction || 'Önizleme verisi okunuyor.', 'Önizleme verisi okunuyor.');
  const settlementText = compactText(settlementStatus?.summaryText || settlementStatus?.status || 'Kontrol gerekli', 'Kontrol gerekli');
  const commissionText = compactText(
    paymentBackbone?.activeRule ? `${paymentBackbone.activeRule.paymentMode || 'OFF'} • ${paymentBackbone.activeRule.commissionBps != null ? `${Number(paymentBackbone.activeRule.commissionBps)} bps` : '-'}` : 'Komisyon kuralı tanımlı değil',
    'Komisyon kuralı tanımlı değil',
  );
  const accountText = compactText(
    paymentPreviewSummary?.paymentAccountStatus || accountStatus?.summaryText || accountStatus?.summary || settings?.globalRule?.paymentMode || 'Eksik bilgi',
    'Eksik bilgi',
  );
  const serviceProofText = compactText(
    operationProofSummary?.summaryText || operationProofSummary?.statusText || operationProofSummary?.title || 'Servis kanıtı kontrol gerekli',
    'Servis kanıtı kontrol gerekli',
  );
  const contractShiftText = compactText(
    paymentPreviewSummary?.contractOrShiftSummary || lifecycle?.summary || operationProofSummary?.summaryText || 'Sözleşmeden vardiya üretimi ayrıca kontrol edilmeli.',
    'Sözleşmeden vardiya üretimi ayrıca kontrol edilmeli.',
  );
  const missingCount = Number(paymentPreviewSummary?.missingCount || 0);
  const reviewCount = Number(paymentPreviewSummary?.reviewCount || 0);
  const missingInfoText = missingCount > 0 ? `${missingCount} / ${reviewCount}` : 'Belirgin eksik yok';
  const missingInfoNote = missingCount > 0
    ? previewReason
    : 'Eksik bilgi 0 görünüyor; ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini kontrol et.';
  const contractShiftNote = /üretim sinyali/i.test(contractShiftText) || /vardiya üretildi/i.test(contractShiftText)
    ? 'Bu sözleşme için bugünkü vardiya üretim sinyali görünüyor.'
    : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const csvBoundary = compactText(paymentPreviewSummary?.nonFinalText || 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.', 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.');
  const auditSummary = compactText(paymentSourcesMeta?.summary || 'Önizleme kaynakları özetleniyor.', 'Önizleme kaynakları özetleniyor.');
  return buildReadonlyCopilotFacts({
    screenType: 'PAYMENT_READINESS',
    stage: previewStatus,
    readiness: /READY|PREVIEW_READY|EVIDENCE_READY/.test(previewStatus.toUpperCase()) ? 'READY' : /NEEDS_REVIEW|PARTIAL|MISSING|EKSIK/.test(previewStatus.toUpperCase()) ? 'REVIEW_NEEDED' : 'REVIEW_NEEDED',
    readinessScore: /READY|PREVIEW_READY|EVIDENCE_READY/.test(previewStatus.toUpperCase()) ? 80 : /NEEDS_REVIEW|PARTIAL/.test(previewStatus.toUpperCase()) ? 56 : 40,
    summary: `${previewTitle} • ${previewStatus}`,
    blockers: [previewReason, csvBoundary],
    selectedRecordStatus: compactText(`${previewStatus} • Eksik bilgi ${missingCount} • Ödeme hesabı: ${accountText} • ${csvBoundary} • Servis kanıtı: ${serviceProofText}`, previewStatus),
    evidence: [
      `hakediş önizleme: ${previewStatus}`,
      `komisyon: ${commissionText}`,
      `ödeme hesabı: ${accountText}`,
      `servis kanıtı: ${serviceProofText}`,
      `sözleşme / vardiya: ${contractShiftText}`,
      `settlement: ${settlementText}`,
      `kaynak özeti: ${auditSummary}`,
    ],
    nextBestAction: compactText(paymentPreviewSummary?.nextAction || (missingCount > 0
      ? 'Önce hazır görünen kayıtları doğrula, sonra CSV taslağını indir.'
      : 'Eksik bilgi 0 görünüyor; ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini kontrol et.'), 'Önce hazır görünen kayıtları doğrula, sonra CSV taslağını indir.'),
    safestNextStep: missingCount > 0
      ? 'Önce hakediş önizleme kartındaki neden hazır / neden eksik satırını oku.'
      : 'Önce ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini birlikte kontrol et.',
    compareHint: 'Hakediş önizlemesi yalnızca kontrol içindir; ödeme başlatılmaz.',
    counters: {
      previewCount: Number(paymentPreviewSummary?.totalDraftCount || paymentBackbone?.cards?.commercialSources || 0),
      readyCount: Number(paymentPreviewSummary?.readyCount || 0),
      missingCount: Number(paymentPreviewSummary?.missingCount || 0),
      reviewCount: Number(paymentPreviewSummary?.reviewCount || 0),
      sourceCount: Number(paymentSourcesMeta?.summary?.total || paymentSourcesMeta?.total || 0),
    },
    copilotSignals: [
      { id: 'paymentPreviewStatus', label: 'Hakediş önizleme', value: previewStatus, note: previewReason },
      { id: 'paymentPreviewMissingInfo', label: 'Eksik / kontrol gerekli', value: missingInfoText, note: missingInfoNote },
      { id: 'commissionStatus', label: 'Komisyon durumu', value: commissionText, note: 'Aktif ödeme kapalı; sadece hazırlık görünümü.' },
      { id: 'paymentAccountStatus', label: 'Ödeme hesabı durumu', value: accountText, note: 'Eksik bilgi veya kontrol gerekli olabilir.' },
      { id: 'serviceProofStatus', label: 'Servis kanıtı', value: serviceProofText, note: 'Readonly önizleme ve kanıt durumu birlikte okunur.' },
      { id: 'settlementStatus', label: 'Settlement durumu', value: settlementText, note: 'Aktif ödeme kapalı; sadece kapanış hazırlığı görünür.' },
      { id: 'contractShiftGeneration', label: 'Sözleşme / vardiya', value: contractShiftText || contractShiftNote, note: contractShiftNote },
    ],
    boundaryNotes: [csvBoundary, 'Ödeme başlatılmaz.', 'Sadece önizleme verisi indirilir.', auditSummary, `Servis kanıtı: ${serviceProofText}`],
  });
}

export function buildGeoReviewFacts({ selected, counts, scopeMode = 'ALL', hasPlanningScope = false }) {
  const hasCoordinates = Number.isFinite(Number(selected?.homeLat)) && Number.isFinite(Number(selected?.homeLng));
  const hasAddress = Boolean(String(selected?.homeAddress || '').trim());
  const status = String(selected?.geoStatus || '').toUpperCase();
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasCoordinates, 'Koordinat yok');
  pushIf(missing, !hasAddress, 'Adres yok');
  pushIf(blockers, !hasCoordinates && !hasAddress, 'Adres ve koordinat birlikte boş; bu kayıt üretime hazır değil.');
  pushIf(blockers, status === 'FAILED', 'Konum üretimi başarısız görünüyor; önce neden alanını okuyup yeniden üretmek gerekir.');
  const canSave = hasCoordinates;
  const actions = [
    actionRule({
      key: 'geo_open_big_map',
      label: 'Büyük Haritada İşaretle',
      enabled: true,
      purpose: 'Küçük önizleme yerine rahat seçim yapmak için büyük harita modalını açar.',
      whenToUse: 'Adres güven vermiyorsa veya lat/lon elle düzeltilecekse kullanılır.',
      whatHappens: 'Büyük haritada pin seçilir; OK Yap ile küçük önizlemeye dönülür.',
      riskNote: 'OK Yap tek başına veritabanına yazmaz; dönüşten sonra Kaydet gerekir.',
    }),
    actionRule({
      key: 'geo_save',
      label: 'Kaydet',
      enabled: canSave,
      reason: 'Kaydetmeden önce lat/lon üretmek veya büyük haritada işaretlemek gerekir.',
      purpose: 'Seçili kişideki koordinatı veritabanına sabitler.',
      whenToUse: 'Sağ panelde doğru kişi seçiliyken ve koordinat görünüyorken kullanılır.',
      whatHappens: 'Mevcut kişideki lat/lon kalıcı hale gelir.',
      riskNote: 'Yanlış kişi seçiliyse doğru koordinat yanlış kayda yazılabilir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_save_next',
      label: 'Kaydet + Sonraki',
      enabled: canSave,
      reason: 'Seri ilerlemek için önce mevcut kişi kaydının koordinatı oluşmalı.',
      purpose: 'Koordinatı kaydeder ve listedeki bir sonraki kişiye geçer.',
      whenToUse: 'Seri kontrol yaparken ve mevcut kayıt doğrulanmışken kullanılır.',
      whatHappens: 'Mevcut kayıt kaydedilir; sonra sıradaki satır seçili hale gelir.',
      riskNote: 'Seçim state’i doğru taşınmıyorsa hangi kişinin seçili olduğuna yeniden bakmak gerekir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_clear_addresses',
      label: 'Tüm Adresleri Temizle',
      enabled: true,
      purpose: 'KVKK için geçici adres metnini toplu temizler.',
      whenToUse: 'Lat/lon üretimi bittiğinde ve metin adres artık gerekmiyorsa kullanılır.',
      whatHappens: 'Görünür kapsamdaki adres metinleri temizlenir; lat/lon kalır.',
      riskNote: 'Adres silindikten sonra metin adres üstünden yeniden üretim yapmak zorlaşır.',
    }),
    actionRule({
      key: 'geo_clear_phones',
      label: 'Tüm Telefonları Temizle',
      enabled: true,
      purpose: 'KVKK için gereksiz telefon bilgisini toplu temizler.',
      whenToUse: 'Telefonun operasyon için artık gerekmediği durumda kullanılır.',
      whatHappens: 'Görünür kapsamdaki telefon alanları temizlenir.',
      riskNote: 'Telefon tekrar gerekecekse önce dış kaynaktan doğrulama gerekir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'GEOREVIEW',
    stage: status || '-',
    readinessScore: canSave ? 82 : 38,
    readiness: canSave ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing,
    blockers,
    ...actionMatrix,
    counters: {
      visible: Number(counts?.visible || 0),
      ok: Number(counts?.ok || 0),
      review: Number(counts?.review || 0),
      failed: Number(counts?.failed || 0),
      noCoord: Number(counts?.noCoord || 0),
      planningScope: hasPlanningScope ? (scopeMode === 'SESSION' ? 'SESSION' : 'ALL') : 'ALL',
    },
    evidence: [
      `Durum: ${status || '-'}`,
      `Koordinat: ${hasCoordinates ? `${Number(selected?.homeLat).toFixed(5)}, ${Number(selected?.homeLng).toFixed(5)}` : 'Yok'}`,
      `Adres: ${hasAddress ? 'Var' : 'Yok'}`,
      `Görünür kayıt: ${Number(counts?.visible || 0)}`,
    ],
    reasoningLead: canSave
      ? 'Bu kayıtta ana karar, koordinatın doğru kişide sabitlenip sabitlenmediğidir.'
      : 'Bu kayıtta ana blokaj koordinat eksikliği tarafında görünüyor.',
    nextBestAction: canSave
      ? 'Önce seçili kişi adını doğrula. Sonra Kaydet ile sabitle; seri gidiyorsan Kaydet + Sonraki kullan.'
      : hasAddress
        ? 'Önce büyük haritada pin koy veya adresten bul ile lat/lon üret. Sonra Kaydet de.'
        : 'Önce büyük haritada işaretle. Sonra OK ile dönüp Kaydet de.',
    safestNextStep: 'En risksiz adım, sağ panelde seçili kişi adı ile listede seçili satırın aynı olduğunu doğrulamaktır.',
    compareHint: 'OK Yap yalnız büyük harita seçim modalını onaylar; Kaydet veritabanına yazar.',
  };
}

export function buildShiftFacts({ shift, itemCount = 0 }) {
  const status = String(shift?.status || '-').toUpperCase();
  const hasVehicle = Boolean(shift?.vehicle?.plate || Number(shift?.vehicleId || 0));
  const hasDriver = Boolean(shift?.driver?.fullName || Number(shift?.driverId || 0));
  const stopCount = Array.isArray(shift?.stops) ? shift.stops.length : 0;
  const offerCount = Number(shift?.offers?.length || shift?.openOfferCount || 0);
  const approvedLike = ['APPROVED', 'ACCEPTED', 'ACTIVE'].includes(status);
  const readyForLiveStart = approvedLike && hasVehicle && hasDriver && stopCount > 0;
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasVehicle, 'Araç yok');
  pushIf(missing, !hasDriver, 'Sürücü yok');
  pushIf(missing, stopCount <= 0, 'Durak yok');
  pushIf(blockers, approvedLike && (!hasVehicle || !hasDriver), 'Durum onaylı görünse de araç veya sürücü boş; saha için tam hazır değil.');
  pushIf(blockers, offerCount > 0 && !approvedLike, 'Teklif/karar tarafı açık görünüyor; atama yorumu erken olabilir.');
  const actions = [
    actionRule({
      key: 'shift_open_list',
      label: 'Listeyi aç',
      enabled: Boolean(shift?.id),
      reason: 'Önce seçili bir vardiya gerekir.',
      purpose: 'Seçili vardiyanın detay veya bağlı akış ekranını açar.',
      whenToUse: 'Satır seçiliyse ve detay okumak gerekiyorsa kullanılır.',
      whatHappens: 'İlgili vardiya için daha detaylı görünüm veya bağlı liste açılır.',
      required: ['Seçili vardiya'],
    }),
    actionRule({
      key: 'shift_open_offers',
      label: 'Teklifleri aç',
      enabled: offerCount > 0,
      reason: 'Bu kayıtta görünen açık teklif yok.',
      purpose: 'Bu vardiyaya bağlı teklif veya karar akışını açar.',
      whenToUse: 'Karar kapanmadıysa ve room/company teklifi incelenecekse kullanılır.',
      whatHappens: 'Teklif listesi veya teklif modalı açılır.',
      required: ['Görünen teklif olmalı'],
      blockedBy: offerCount > 0 ? [] : ['Açık teklif yok'],
    }),
    actionRule({
      key: 'shift_assign_vehicle',
      label: 'Araç ata',
      enabled: Boolean(shift?.id) && !hasVehicle,
      reason: 'Araç alanı zaten doluysa yeniden araç ata öncelikli değildir.',
      purpose: 'Vardiyaya araç bağı ekler veya eksik aracı tamamlatır.',
      whenToUse: 'Araç alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya araç seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasVehicle ? [] : ['Araç zaten bağlı'],
    }),
    actionRule({
      key: 'shift_assign_driver',
      label: 'Sürücü ata',
      enabled: Boolean(shift?.id) && !hasDriver,
      reason: 'Sürücü alanı zaten doluysa bu adım zorunlu değildir.',
      purpose: 'Vardiyaya sürücü bağı ekler veya eksik sürücüyü tamamlatır.',
      whenToUse: 'Sürücü alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya sürücü seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasDriver ? [] : ['Sürücü zaten bağlı'],
    }),
    actionRule({
      key: 'shift_operate',
      label: 'Operasyona geç',
      enabled: approvedLike && hasVehicle && hasDriver && stopCount > 0,
      reason: offerCount > 0 && !approvedLike
        ? 'Teklif/karar tarafı kapanmadan operasyon yorumu erken olur.'
        : stopCount <= 0
          ? 'Durak olmadan operasyon güvenilir ilerlemez.'
          : (!hasVehicle || !hasDriver)
            ? 'Araç ve sürücü bağı tamamlanmadan operasyona geçmek risklidir.'
            : 'Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı akışını ayrıca kontrol et.',
      purpose: 'Vardiyayı saha akışına taşımak için son hazırlık kontrolünü temsil eder.',
      whenToUse: 'Durum onaylı, araç-sürücü dolu ve duraklar hazır olduğunda anlamlıdır.',
      whatHappens: 'Kayıt operasyon veya canlı takip tarafında okunabilir hale gelir.',
      riskNote: 'Durum onaylı olsa bile araç veya sürücü boşsa sahada zincir kırılır.',
      required: ['Durum onaylı olmalı', 'Araç bağlı olmalı', 'Sürücü bağlı olmalı', 'Durak olmalı'],
      blockedBy: [
        ...(!approvedLike ? ['Durum henüz onaylı değil'] : []),
        ...(!hasVehicle ? ['Araç yok'] : []),
        ...(!hasDriver ? ['Sürücü yok'] : []),
        ...(stopCount <= 0 ? ['Durak yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  const gpsSource = compactText(shift?.vehicle?.gpsLast?.sourceLabel || shift?.vehicle?.gpsState?.sourceLabel || shift?.vehicle?.gpsSourceLabel || shift?.gpsSourceLabel || '', '');
  const gpsState = compactText(shift?.vehicle?.gpsState?.lastUiStatus || shift?.vehicle?.gpsState?.status || shift?.gpsStatus || shift?.vehicle?.gpsLast?.status || '', '');
  const proofState = compactText(shift?.operationProofStatus || shift?.proofStatus || shift?.serviceProofStatus || '', '');
  const boardingChangeEffects = Array.isArray(shift?.boardingChangeEffects) ? shift.boardingChangeEffects : [];
  const boardingChangeSummary = shift?.boardingChangeSummary || null;
  const routeRefresh = shift?.routeRefresh || null;
  const routeRefreshState = compactText(routeRefresh?.routeRefreshState || shift?.boardingChangeRouteRefreshState || '', '');
  const routeRefreshLabel = compactText(routeRefresh?.routeRefreshLabel || shift?.boardingChangeRouteRefreshLabel || boardingChangeSummary?.label || '', '');
  const routeRefreshNote = compactText(routeRefresh?.routeRefreshNote || shift?.boardingChangeRouteRefreshNote || shift?.routeNotice || '', '');
  const hasBoardingChangeVisibility = boardingChangeEffects.length > 0 || (routeRefreshState && routeRefreshState !== 'NONE');
  const liveStartHint = readyForLiveStart
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.'
    : '';
  const selectedRecordStatus = [
    `Durum: ${status}`,
    `Araç: ${hasVehicle ? (shift?.vehicle?.plate || `#${shift?.vehicleId}`) : 'Yok'}`,
    `Sürücü: ${hasDriver ? (shift?.driver?.fullName || `#${shift?.driverId}`) : 'Yok'}`,
    `Durak: ${stopCount}`,
    gpsSource ? `Kaynak: ${gpsSource}` : '',
    gpsState ? `GPS: ${gpsState}` : '',
    proofState ? `Operasyon kanıtı: ${proofState}` : '',
    `Açık teklif: ${offerCount}`,
    hasBoardingChangeVisibility && boardingChangeSummary?.label ? `Günlük değişiklik: ${boardingChangeSummary.label}` : '',
    hasBoardingChangeVisibility && routeRefreshLabel ? `Rota güncellemesi: ${routeRefreshLabel}` : '',
    hasBoardingChangeVisibility && routeRefreshNote ? `Rota notu: ${routeRefreshNote}` : '',
  ].filter(Boolean).join(' • ');
  const readonlyFacts = buildReadonlyCopilotFacts({
    screenType: 'SHIFTS',
    stage: status,
    readinessScore: approvedLike && hasVehicle && hasDriver ? (stopCount > 0 ? 88 : 74) : 42,
    readiness: approvedLike && hasVehicle && hasDriver && stopCount > 0 ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    summary: hasBoardingChangeVisibility
      ? `Günlük değişiklik görünür${routeRefreshLabel ? ` • ${routeRefreshLabel}` : ''}`
      : readyForLiveStart ? `Canlı başlatma kontrolü gerekli. ${liveStartHint}` : approvedLike ? 'Vardiya hazır' : blockers.length ? 'Vardiya blokajı' : 'Vardiya kontrol altında',
    blockers,
    evidence: [
      `Durum: ${status}`,
      `Araç: ${hasVehicle ? (shift?.vehicle?.plate || `#${shift?.vehicleId}`) : 'Yok'}`,
      `Sürücü: ${hasDriver ? (shift?.driver?.fullName || `#${shift?.driverId}`) : 'Yok'}`,
      `Durak: ${stopCount}`,
      proofState ? `Operasyon kanıtı: ${proofState}` : '',
      `Teklif: ${offerCount}`,
      hasBoardingChangeVisibility && routeRefreshLabel ? `Rota güncellemesi: ${routeRefreshLabel}` : '',
      hasBoardingChangeVisibility && routeRefreshNote ? `Rota notu: ${routeRefreshNote}` : '',
      readyForLiveStart ? 'Canlı başlatma kontrolü: gerekli' : '',
    ],
    nextBestAction: hasBoardingChangeVisibility
      ? (routeRefreshState === 'REQUESTED' || routeRefreshState === 'READY'
        ? 'Rota güncellemesi bekliyor; sürücü rota ekranında görünürlüğü doğrula.'
        : 'Günlük değişikliği sürücü rota ekranında doğrula.')
      : blockers.length
        ? (offerCount > 0 && !approvedLike ? 'Önce teklif kararını kapat. Sonra araç ve sürücü alanlarını tekrar kontrol et.' : 'Önce araç ve sürücü bağını tamamla. Sonra durak ve sonraki adım alanlarını yeniden oku.')
        : (readyForLiveStart ? 'Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı akışını birlikte kontrol et.' : 'Önce seçili vardiyanın araç, sürücü ve durak alanlarını birlikte kontrol et.'),
    safestNextStep: hasBoardingChangeVisibility
      ? 'En risksiz adım, günlük değişiklik ve rota notunu sürücü rota ekranında doğrulamaktır.'
      : readyForLiveStart ? 'En risksiz adım, canlı başlatma zamanı ile GPS ve operasyon kanıtı akışını doğrulamaktır.' : 'En risksiz adım, seçili satırda araç ve sürücü gerçekten dolu mu onu doğrulamaktır.',
    compareHint: hasBoardingChangeVisibility
      ? 'Günlük atama etkisi kalıcı atama değildir; rota notu ve sürücü görünürlüğü birlikte okunur.'
      : readyForLiveStart ? 'APPROVED ile canlı başlatma aynı şey değildir; aktif durum, GPS ve operasyon kanıtı ayrıca okunur.' : 'APPROVED ile tam atama aynı şey değildir; araç veya sürücü boşsa iş saha için eksiktir.',
    counters: { visible: Number(itemCount || 0), offers: offerCount, stops: stopCount },
    selectedRecordStatus,
    copilotSignals: [
      { id: 'shiftStatus', label: 'Durum', value: status, note: approvedLike ? 'Onaylı görünüyor.' : 'Önce durumu kontrol et.' },
      { id: 'shiftVehicle', label: 'Araç', value: hasVehicle ? (shift?.vehicle?.plate || `#${shift?.vehicleId}`) : 'Yok', note: hasVehicle ? 'Araç bağlı.' : 'Araç eksik.' },
      { id: 'shiftDriver', label: 'Sürücü', value: hasDriver ? (shift?.driver?.fullName || `#${shift?.driverId}`) : 'Yok', note: hasDriver ? 'Sürücü bağlı.' : 'Sürücü eksik.' },
      { id: 'shiftStops', label: 'Durak', value: String(stopCount), note: stopCount > 0 ? 'Durak var.' : 'Durak eksik.' },
      { id: 'shiftOffers', label: 'Açık teklif', value: String(offerCount), note: offerCount > 0 ? 'Teklif açık olabilir.' : 'Açık teklif yok.' },
      hasBoardingChangeVisibility ? { id: 'boardingChangeSummary', label: 'Günlük değişiklik', value: boardingChangeSummary?.label || 'Yok', note: boardingChangeSummary?.note || 'Sadece günlük etki.' } : null,
      hasBoardingChangeVisibility ? { id: 'boardingRouteRefresh', label: 'Rota güncellemesi', value: routeRefreshLabel || routeRefreshState || 'Yok', note: routeRefreshNote || 'Sürücü rota ekranında görünür.' } : null,
      readyForLiveStart ? { id: 'liveStartCheck', label: 'Canlı başlatma', value: 'Kontrol gerekli', note: 'Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı birlikte okunur.' } : null,
    ],
    boundaryNotes: [
      hasBoardingChangeVisibility ? 'Bu sadece günlük atama etkisidir; kalıcı rota değişmez.' : '',
      hasBoardingChangeVisibility && routeRefreshNote ? routeRefreshNote : '',
      offerCount > 0 && !approvedLike ? 'Teklif/karar akışı açık olabilir.' : '',
    ],
  });
  return {
    ...readonlyFacts,
    missing,
    blockers,
    reasoningLead: blockers.length
      ? 'Bu vardiyada ana blokaj atama veya teklif tarafında görünüyor.'
      : hasBoardingChangeVisibility
        ? 'Bu vardiyada kabul edilmiş günlük biniş değişikliği var; sürücü rota ekranında görünürlüğü ayrıca kontrol edilir.'
        : 'Bu vardiyada önce durum, sonra araç-sürücü bağı ve durak hazır mı ona bakılır.',
    ...actionMatrix,
  };
}

export function buildBoardingRouteImpactCopilotFacts({
  preview = null,
  request = null,
} = {}) {
  const routeImpact = preview && typeof preview === 'object' ? preview : null;
  const requestApplicationStatus = compactText(request?.boardingChangeApplicationStatus || routeImpact?.applicationStatus || '', '');
  const requestApplicationText = compactText(request?.boardingChangeApplicationText || routeImpact?.applicationText || '', '');
  const requestApplicationBoundaryNote = compactText(request?.boardingChangeApplicationBoundaryNote || routeImpact?.applicationBoundaryNote || '', '');
  const requestApplicationState = compactText(request?.boardingChangeApplicationState || routeImpact?.applicationState || '', '');
  const requestRouteRefreshState = compactText(request?.boardingChangeRouteRefreshState || routeImpact?.routeRefreshState || '', '');
  const requestRouteRefreshLabel = compactText(request?.boardingChangeRouteRefreshLabel || routeImpact?.routeRefreshLabel || '', '');
  const requestRouteRefreshNote = compactText(request?.boardingChangeRouteRefreshNote || routeImpact?.routeRefreshNote || '', '');
  const requestDecisionOwnerLabel = compactText(request?.decisionOwnerLabel || routeImpact?.decisionOwnerLabel || '', '');
  const requestDecisionOwnerNote = compactText(request?.decisionOwnerNote || routeImpact?.decisionOwnerNote || '', '');
  const hasApplicationContext = Boolean(requestApplicationStatus || requestApplicationText || requestApplicationBoundaryNote || requestApplicationState);
  const applicationStateKey = normalizeEnumKey(requestApplicationStatus || requestApplicationState);
  const applicationStatusLabel = requestApplicationStatus ? boardingApplicationStatusLabel(requestApplicationStatus) : '';
  const isAppliedApplication = applicationStateKey === 'APPLIED';
  const previewOnlyNote = hasApplicationContext
    ? (requestApplicationBoundaryNote
      || requestRouteRefreshNote
      || (isAppliedApplication
        ? 'Değişiklik günlük atamaya işlendi. Sürücü rotası henüz yenilenmedi.'
        : 'Bu değişiklik kabul edilmiş ve günlük atamaya işlenebilir. Bu işlem sürücü rotasını yenilemez.'))
    : compactText(routeImpact?.previewOnlyNote || 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'Bu sadece önizlemedir. Rota/atama uygulanmadı.');
  const changeTypeLabel = compactText(routeImpact?.changeTypeLabel || 'Biniş değişikliği önizlemesi', 'Biniş değişikliği önizlemesi');
  const personLabel = compactText(resolvePersonDisplayLabel(routeImpact, request, 'Seçili kişi'), 'Seçili kişi');
  const oldStopLabel = compactText(routeImpact?.oldStopLabel || '-', '-');
  const newStopLabel = compactText(routeImpact?.newStopLabel || '-', '-');
  const currentPeopleCount = Number(routeImpact?.currentPeopleCount ?? 0);
  const previewPeopleCount = Number(routeImpact?.previewPeopleCount ?? currentPeopleCount);
  const currentStopCount = Number(routeImpact?.currentStopCount ?? 0);
  const previewStopCount = Number(routeImpact?.previewStopCount ?? currentStopCount);
  const currentDistanceKm = Number(routeImpact?.currentDistanceKm ?? 0);
  const previewDistanceKm = Number(routeImpact?.previewDistanceKm ?? currentDistanceKm);
  const distanceDeltaKm = Number(routeImpact?.distanceDeltaKm ?? Number((previewDistanceKm - currentDistanceKm).toFixed(2)));
  const currentDurationMin = Number(routeImpact?.currentDurationMin ?? 0);
  const previewDurationMin = Number(routeImpact?.previewDurationMin ?? currentDurationMin);
  const durationDeltaMin = Number(routeImpact?.durationDeltaMin ?? (previewDurationMin - currentDurationMin));
  const capacityImpact = routeImpact?.capacityImpact && typeof routeImpact.capacityImpact === 'object'
    ? routeImpact.capacityImpact
    : { capacity: null, currentLoad: currentPeopleCount, previewLoad: previewPeopleCount, delta: previewPeopleCount - currentPeopleCount, availableBefore: null, availableAfter: null, status: 'UNKNOWN' };
  const reliability = routeImpact?.reliability && typeof routeImpact.reliability === 'object'
    ? routeImpact.reliability
    : { ok: false, displayMode: 'unavailable', label: 'ETA hesaplanamıyor', note: 'ETA hesaplanamıyor', reason: 'ROUTE_DATA_MISSING' };
  const summary = compactText(
    requestApplicationText
    || routeImpact?.summaryLine
    || (hasApplicationContext
      ? `${changeTypeLabel} • ${personLabel} • ${applicationStatusLabel || 'Kabul edilen değişiklik'}`
      : `${changeTypeLabel} • ${personLabel} • Km farkı ${distanceDeltaKm.toFixed(2)} • Süre farkı ${durationDeltaMin} dk`),
    '',
  );
  const evidence = [
    `Değişiklik: ${changeTypeLabel}`,
    `Kişi: ${personLabel}`,
    `Eski durak: ${oldStopLabel}`,
    `Yeni/geçici durak: ${newStopLabel}`,
    `Kişi farkı: ${previewPeopleCount - currentPeopleCount}`,
    `Durak farkı: ${previewStopCount - currentStopCount}`,
    `Km farkı: ${distanceDeltaKm.toFixed(2)} km`,
    `Süre farkı: ${durationDeltaMin} dk`,
    `Kapasite: ${capacityImpact.availableAfter != null ? `${capacityImpact.availableAfter} boş` : 'Bilinmiyor'}`,
  ];
  if (hasApplicationContext) {
    evidence.unshift(
      `Uygulama durumu: ${applicationStatusLabel || requestApplicationState || 'Kabul edilen değişiklik'}`,
    );
    if (requestRouteRefreshState || requestRouteRefreshLabel || requestRouteRefreshNote) {
      evidence.push(`Rota güncellemesi: ${requestRouteRefreshLabel || requestRouteRefreshState || 'Bekliyor'}`);
      if (requestRouteRefreshNote) evidence.push(`Rota notu: ${requestRouteRefreshNote}`);
    }
    if (requestApplicationText) evidence.push(`Uygulama özeti: ${requestApplicationText}`);
    if (requestApplicationBoundaryNote) evidence.push(`Sınır: ${requestApplicationBoundaryNote}`);
    if (requestDecisionOwnerLabel || requestDecisionOwnerNote) {
      evidence.push(`Karar sahibi: ${requestDecisionOwnerLabel || 'Oda'}`);
      if (requestDecisionOwnerNote) evidence.push(`Karar notu: ${requestDecisionOwnerNote}`);
    }
  }
  const copilotSignals = [
    { id: 'boarding-change-type', label: 'Değişiklik tipi', value: changeTypeLabel, note: hasApplicationContext ? (requestApplicationBoundaryNote || previewOnlyNote) : previewOnlyNote },
    { id: 'boarding-person', label: 'Etkilenen kişi', value: personLabel, note: 'Seçili kişi üzerinden okunur.' },
    { id: 'boarding-stops', label: 'Duraklar', value: `${oldStopLabel} → ${newStopLabel}`, note: 'Eski ve yeni/geçici durak birlikte okunur.' },
    { id: 'boarding-distance', label: 'Km etkisi', value: `${distanceDeltaKm.toFixed(2)} km`, note: 'Yaklaşık rota farkı.' },
    { id: 'boarding-duration', label: 'Süre etkisi', value: `${durationDeltaMin} dk`, note: 'ETA güncel değilse kesin bilgi gibi okunmaz.' },
    { id: 'boarding-capacity', label: 'Kapasite etkisi', value: capacityImpact.status || 'UNKNOWN', note: `Önceki yük ${currentPeopleCount}, önizleme yükü ${previewPeopleCount}.` },
    { id: 'boarding-reliability', label: 'Güvenilirlik', value: reliability.label || 'ETA hesaplanamıyor', note: reliability.note || 'ETA hesaplanamıyor' },
    { id: 'boarding-decision-owner', label: 'Karar sahibi', value: requestDecisionOwnerLabel || 'Oda', note: requestDecisionOwnerNote || 'Oda tarafında karar bekliyor.' },
  ];
  if (hasApplicationContext) {
    copilotSignals.unshift(
      { id: 'boarding-application-status', label: 'Uygulama durumu', value: applicationStatusLabel || requestApplicationState || 'Uygulamaya hazır', note: requestApplicationText || requestApplicationBoundaryNote || 'Kabul edilen değişiklik.' },
      { id: 'boarding-application-boundary', label: 'Sınır', value: isAppliedApplication ? 'Günlük atamaya işlendi' : 'Günlük atamaya işlenebilir', note: requestApplicationBoundaryNote || 'Sürücü rotası yenilenmez.' },
      { id: 'boarding-route-refresh', label: 'Rota güncellemesi', value: requestRouteRefreshLabel || requestRouteRefreshState || (isAppliedApplication ? 'Görünür' : 'Bekliyor'), note: requestRouteRefreshNote || 'Sürücü rota ekranında görünür; SMS/push yok.' },
    );
  }
  const actionSimulation = hasApplicationContext
    ? (isAppliedApplication
      ? (requestRouteRefreshNote || requestApplicationText || 'Değişiklik günlük atamaya işlendi. Sürücü rotası henüz yenilenmedi.')
      : (requestApplicationBoundaryNote || requestRouteRefreshNote || 'Bu değişiklik kabul edilmiş. Günlük atamaya işlenebilir; sürücü rotası yenilenmez.'))
    : (routeImpact?.previewOnlyNote
      ? `${previewOnlyNote} Rota etkisini önizle, ardından uygulama yapma.`
      : 'Bu sadece önizlemedir. Rota/atama uygulanmadı.');
  const screenType = hasApplicationContext ? 'BOARDING_CHANGE_APPLICATION' : 'BOARDING_ROUTE_IMPACT_PREVIEW';
  const stage = hasApplicationContext
    ? compactText(requestApplicationStatus || requestApplicationState || request?.requestKind || routeImpact?.changeType || 'ACCEPTED', 'ACCEPTED')
    : compactText(routeImpact?.changeType || request?.requestKind || 'TEMPORARY_BOARDING_NOTE', 'TEMPORARY_BOARDING_NOTE');
  const readiness = hasApplicationContext
    ? (isAppliedApplication ? 'APPLIED' : 'READY')
    : 'PREVIEW_ONLY';
  const readinessScore = hasApplicationContext
    ? (isAppliedApplication ? 90 : 84)
    : (reliability?.ok ? 78 : 52);
  const nextBestAction = hasApplicationContext
    ? (isAppliedApplication
      ? 'Sürücü rota ekranında görünürlüğü doğrula.'
      : 'Kabul edilen değişikliği uygula.')
    : (routeImpact?.nextBestAction || 'Önizleme kartını doğrula.');
  const safestNextStep = hasApplicationContext
    ? (requestApplicationBoundaryNote || previewOnlyNote)
    : previewOnlyNote;
  const boundaryNotes = hasApplicationContext
    ? [
      requestApplicationBoundaryNote || requestRouteRefreshNote || 'Bu işlem sadece günlük atama etkisi uygular. Sürücü rotası yenilenmez.',
      isAppliedApplication ? 'Sürücü rotası henüz yenilenmedi.' : 'Driver route refresh sonraki milestone kapsamındadır.',
    ]
    : [
      previewOnlyNote,
      'StopAssignment yazılmaz.',
      'Yazma yok.',
    ];
  const readonlyFacts = buildReadonlyCopilotFacts({
    screenType,
    stage,
    readiness,
    readinessScore,
    summary,
    blockers: Array.isArray(routeImpact?.warnings) ? routeImpact.warnings : [],
    evidence,
    nextBestAction,
    safestNextStep,
    compareHint: 'Kişi, durak, km, süre ve kapasite farkını birlikte oku.',
    counters: {
      currentPeopleCount,
      previewPeopleCount,
      currentStopCount,
      previewStopCount,
      currentDistanceKm,
      previewDistanceKm,
      distanceDeltaKm,
      currentDurationMin,
      previewDurationMin,
      durationDeltaMin,
      capacity: Number(capacityImpact.capacity ?? NaN),
    },
    copilotSignals,
    boundaryNotes,
    selectedRecordStatus: applicationStatusLabel || requestRouteRefreshLabel || reliability?.label || 'Önizleme',
    liveFactConfidence: {
      summary: routeImpact?.summaryLine || summary,
      rows: copilotSignals.slice(0, 4),
    },
    diagnosticPriority: {
      summary: requestRouteRefreshNote || previewOnlyNote,
      rows: copilotSignals.slice(0, 3),
    },
    actionSimulation,
  });
  return {
    ...readonlyFacts,
    preview: routeImpact,
    requestId: request?.id ?? null,
    requestKind: request?.requestKind || request?.kind || '',
    changeType: hasApplicationContext ? (request?.requestKind || request?.kind || routeImpact?.changeType || 'ACCEPTED') : (routeImpact?.changeType || request?.requestKind || request?.kind || 'TEMPORARY_BOARDING_NOTE'),
    changeTypeLabel,
    personLabel,
    oldStopLabel,
    newStopLabel,
    currentPeopleCount,
    previewPeopleCount,
    currentStopCount,
    previewStopCount,
    currentDistanceKm,
    previewDistanceKm,
    distanceDeltaKm,
    currentDurationMin,
    previewDurationMin,
    durationDeltaMin,
    capacityImpact,
    reliability,
    warnings: Array.isArray(routeImpact?.warnings) ? routeImpact.warnings : [],
    nextBestAction,
    previewOnlyNote,
    summaryLine: routeImpact?.summaryLine || requestApplicationText || summary,
    applicationStatus: requestApplicationStatus,
    applicationStatusLabel,
    applicationState: hasApplicationContext ? (isAppliedApplication ? 'APPLIED' : 'READY') : '',
    applicationText: requestApplicationText,
    applicationBoundaryNote: requestApplicationBoundaryNote || requestRouteRefreshNote || previewOnlyNote,
  };
}

export function buildMapFacts({ selected, selectedShift, selectedNext, selectedEta, selectedStats, gpsStatus, gpsAge, vehicleCount = 0 }) {
  const status = String(selectedShift?.status || '-').toUpperCase();
  const gpsInput = {
    gpsStatus,
    gpsAge,
    gpsLast: selected?.gpsLast,
    gpsState: selected?.gpsState,
    status: gpsStatus,
  };
  const gpsFreshness = normalizeGpsFreshness(gpsInput);
  const gpsFresh = gpsFreshness.isFresh;
  const nextReady = Boolean(selectedNext?.name);
  const etaReady = Number.isFinite(Number(selectedEta)) && gpsFresh;
  const gpsLabel = getGpsReliabilityLabel(gpsInput);
  const gpsAgeValue = getGpsAgeText(gpsInput);
  const etaValue = getEtaDisplay({
    ...gpsInput,
    etaMinutes: selectedEta,
    selectedEta,
    nextStopName: selectedNext?.name,
  });
  const liveSummary = getLiveTrackingSummary({
    ...gpsInput,
    etaMinutes: selectedEta,
    selectedEta,
    nextStopName: selectedNext?.name,
  });
  const hasShift = Boolean(selectedShift?.id);
  const hasSelectedVehicle = Boolean(selected?.id || selected?.plate);
  const totalStops = Number(selectedStats?.total || 0);
  const boardingChangeEffects = Array.isArray(selectedShift?.boardingChangeEffects) ? selectedShift.boardingChangeEffects : [];
  const boardingChangeSummary = selectedShift?.boardingChangeSummary || null;
  const routeRefresh = selectedShift?.routeRefresh || null;
  const routeRefreshState = compactText(routeRefresh?.routeRefreshState || selectedShift?.boardingChangeRouteRefreshState || '', '');
  const routeRefreshLabel = compactText(routeRefresh?.routeRefreshLabel || selectedShift?.boardingChangeRouteRefreshLabel || boardingChangeSummary?.label || '', '');
  const routeRefreshNote = compactText(routeRefresh?.routeRefreshNote || selectedShift?.boardingChangeRouteRefreshNote || selectedShift?.routeNotice || '', '');
  const hasBoardingChangeVisibility = boardingChangeEffects.length > 0 || (routeRefreshState && routeRefreshState !== 'NONE');
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasSelectedVehicle, 'Seçili araç yok');
  pushIf(missing, !nextReady, 'Sıradaki durak yok');
  pushIf(missing, !etaReady, 'ETA yok');
  pushIf(blockers, !hasSelectedVehicle, "Önce marker'dan araç seçilmeden bu kaydı başka ekranla karşılaştırmak erken olur.");
  pushIf(blockers, !gpsFresh, 'Son GPS güncel görünmüyor; canlı karar vermeden önce veri akışı doğrulanmalı.');
  pushIf(blockers, hasSelectedVehicle && !hasShift, 'Araç seçili olsa bile bağlı aktif vardiya görünmüyor.');
  const actions = [
    actionRule({
      key: 'map_show_all',
      label: 'Tümünü Göster',
      enabled: true,
      purpose: 'Haritayı tüm rota ve araç görünümüyle yeniden çerçeveler.',
      whenToUse: 'Manuel sürükleme sonrası harita dağınık kaldıysa kullanılır.',
      whatHappens: 'Harita görünümü tekrar genel kapsama alınır.',
    }),
    actionRule({
      key: 'map_next_navigation',
      label: 'Sonraki durağa navigasyon',
      enabled: nextReady,
      reason: 'Önce sıradaki durak oluşmalı.',
      purpose: 'Sıradaki durak için dış navigasyonu başlatır.',
      whenToUse: 'Sıradaki durak net ve GPS canlı ise kullanılır.',
      whatHappens: 'Haritadan dış navigasyon uygulamasına geçilir.',
      required: ['Sıradaki durak olmalı'],
      blockedBy: nextReady ? [] : ['Sıradaki durak yok'],
    }),
    actionRule({
      key: 'map_open_full_route',
      label: 'Tam rotayı dış navigasyonda aç',
      enabled: hasShift,
      reason: 'Önce vardiya ve rota görünmeli.',
      purpose: 'Bağlı vardiyanın tam rota çizgisini dış navigasyona verir.',
      whenToUse: 'Aktif vardiya ve rota bağının doğrulandığı durumda kullanılır.',
      whatHappens: 'Tam rota dış navigasyon uygulamasında açılır.',
      required: ['Bağlı vardiya'],
      blockedBy: hasShift ? [] : ['Bağlı vardiya yok'],
    }),
    actionRule({
      key: 'map_eta_follow',
      label: 'ETA takibi',
      enabled: etaReady && gpsFresh,
      reason: !gpsFresh ? 'GPS eskiyse ETA güven vermeyebilir.' : 'ETA bilgisi güncel değil.',
      purpose: 'ETA zincirinin güvenilir okunup okunmadığını temsil eder.',
      whenToUse: 'Canlı konum akışı sürüyor ve sonraki durak doluysa anlamlıdır.',
      whatHappens: 'Kullanıcı ETA ve kalan durak bilgisini karar için baz alır.',
      required: ['GPS güncel olmalı', 'ETA görünmeli'],
      blockedBy: [
        ...(!gpsFresh ? ['Son GPS eski'] : []),
        ...(!etaReady ? ['ETA yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  const selectedRecordStatus = [
    `Araç: ${selected?.plate || `#${selected?.id || '-'}`}`,
    `GPS: ${gpsLabel}`,
    `Son GPS: ${gpsAgeValue}`,
    `Sıradaki durak: ${selectedNext?.name || 'Yok'}`,
    `ETA: ${etaValue}`,
    hasBoardingChangeVisibility && boardingChangeSummary?.label ? `Günlük değişiklik: ${boardingChangeSummary.label}` : '',
    hasBoardingChangeVisibility && routeRefreshLabel ? `Rota güncellemesi: ${routeRefreshLabel}` : '',
    hasBoardingChangeVisibility && routeRefreshNote ? `Rota notu: ${routeRefreshNote}` : '',
  ].join(' • ');
  const readonlyFacts = buildReadonlyCopilotFacts({
    screenType: 'MAP',
    stage: status,
    readinessScore: hasSelectedVehicle && gpsFresh && nextReady ? 84 : 46,
    readiness: hasSelectedVehicle && gpsFresh && nextReady ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    summary: hasBoardingChangeVisibility
      ? `Günlük değişiklik görünür${routeRefreshLabel ? ` • ${routeRefreshLabel}` : ''}`
      : hasSelectedVehicle ? liveSummary : 'Araç seçimi gerekiyor',
    blockers,
    evidence: [
      `Araç: ${selected?.plate || `#${selected?.id || '-'}`}`,
      `GPS: ${gpsLabel}`,
      `Son GPS: ${gpsAgeValue}`,
      `Sıradaki durak: ${selectedNext?.name || 'Yok'}`,
      `ETA: ${etaValue}`,
      `Kalan durak: ${Number(selectedStats?.remaining || 0)}`,
      hasBoardingChangeVisibility && routeRefreshLabel ? `Rota güncellemesi: ${routeRefreshLabel}` : '',
      hasBoardingChangeVisibility && routeRefreshNote ? `Rota notu: ${routeRefreshNote}` : '',
    ],
    nextBestAction: !hasSelectedVehicle
      ? "Önce marker'a tıklayıp aracı seç. Sonra üst kartta Shift, Son GPS ve Sıradaki durak dolu mu bak."
      : hasBoardingChangeVisibility
        ? (routeRefreshState === 'REQUESTED' || routeRefreshState === 'READY'
          ? 'Rota güncellemesi bekliyor; sürücü rota ekranında görünürlüğü doğrula.'
          : 'Günlük değişikliği sürücü rota ekranında doğrula.')
        : blockers.length
        ? (!gpsFresh ? 'Önce Son GPS zamanını kontrol et. Sonra aynı kaydı Vardiyalar ekranında açıp atama/rota bağını doğrula.' : 'Önce bağlı vardiyayı açıp rota ve durak bilgisini kontrol et.')
        : 'Önce seçili araç için Son GPS, ETA ve kalan durak sayısını birlikte kontrol et.',
    safestNextStep: !hasSelectedVehicle
      ? "En risksiz adım, önce marker'dan doğru aracı seçmektir."
      : hasBoardingChangeVisibility
        ? 'En risksiz adım, günlük değişiklik ve rota notunu sürücü rota ekranında doğrulamaktır.'
        : 'En risksiz adım, doğru aracı seçip Son GPS eski mi değil mi onu doğrulamaktır.',
    compareHint: hasBoardingChangeVisibility
      ? 'Günlük biniş değişikliği kalıcı rota değişikliği değildir; rota notu ve sürücü görünürlüğü birlikte okunur.'
      : 'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; görsel yorumla canlı karar yorumunu karıştırmamak gerekir.',
    counters: {
      vehicles: Number(vehicleCount || 0),
      totalStops: Number(selectedStats?.total || 0),
      remainingStops: Number(selectedStats?.remaining || 0),
      completedStops: Number(selectedStats?.completed || 0),
    },
    selectedRecordStatus,
    copilotSignals: [
      { id: 'selectedVehicle', label: 'Araç', value: selected?.plate || `#${selected?.id || '-'}`, note: hasSelectedVehicle ? 'Seçili araç var.' : 'Araç seçili değil.' },
      { id: 'gpsAge', label: 'Son GPS', value: gpsAgeValue, note: gpsFresh ? 'GPS canlı görünüyor.' : gpsFreshness.isOffline ? 'GPS çevrim dışı.' : 'GPS güncel değil.' },
      { id: 'nextStop', label: 'Sıradaki durak', value: selectedNext?.name || 'Yok', note: nextReady ? 'Sıradaki durak var.' : 'Sıradaki durak yok.' },
      { id: 'eta', label: 'ETA', value: etaValue, note: etaReady ? (isEtaSuspicious(selectedEta, gpsInput) ? 'ETA olağan dışı yüksek.' : 'ETA okunuyor.') : 'ETA güvenilir değil.' },
      { id: 'shiftLink', label: 'Bağlı vardiya', value: hasShift ? 'Var' : 'Yok', note: hasShift ? 'Vardiya bağı görünüyor.' : 'Vardiya bağı görünmüyor.' },
      hasBoardingChangeVisibility ? { id: 'boardingChangeSummary', label: 'Günlük değişiklik', value: boardingChangeSummary?.label || 'Yok', note: boardingChangeSummary?.note || 'Sadece günlük etki.' } : null,
      hasBoardingChangeVisibility ? { id: 'boardingRouteRefresh', label: 'Rota güncellemesi', value: routeRefreshLabel || routeRefreshState || 'Yok', note: routeRefreshNote || 'Sürücü rota ekranında görünür.' } : null,
    ],
    boundaryNotes: [
      hasBoardingChangeVisibility ? 'Bu sadece günlük atama etkisidir; kalıcı rota değişmez.' : '',
      hasBoardingChangeVisibility && routeRefreshNote ? routeRefreshNote : '',
      !gpsFresh ? 'GPS kaynağı güncel olmayabilir.' : '',
    ],
  });
  const contextSummary = firstNonEmpty(
    readonlyFacts.copilotSummary,
    readonlyFacts.summary,
    selectedRecordStatus,
    '',
  );
  return {
    hasSelectedVehicle,
    hasShift,
    gpsFresh,
    etaReady,
    nextReady,
    totalStops,
    emptyState: !hasSelectedVehicle || (!hasShift && totalStops <= 0 && !nextReady),
    missing,
    blockers,
    ...readonlyFacts,
    selectedRecordSummary: selectedRecordStatus,
    helpContextSummary: contextSummary,
    contextSummary,
    reasoningLead: !hasSelectedVehicle
      ? 'Bu haritada önce seçili araç oluşmadan sonraki ekran kararı vermek erken olur.'
      : hasBoardingChangeVisibility
        ? 'Bu haritada günlük biniş değişikliği görünür; rota notu ve sürücü görünürlüğü birlikte okunur.'
        : blockers.length
        ? 'Bu haritadaki ana sorun canlılık veya rota bağının eksik görünmesi.'
        : 'Bu haritada önce canlılık, sonra sıradaki durak ve ETA birlikte okunmalı.',
    ...actionMatrix,
  };
}

export function buildParentLiveNoVehicleFacts({
  selected,
  schoolName = '',
  regionLabel = '',
  vehicleCount = 0,
  reasonText = 'Bu çocuk için şu an canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür.',
  headerText = 'Şu an: Canlı',
} = {}) {
  const childLabel = firstNonEmpty(selected?.fullName, selected?.name, `#${selected?.id || '-'}`);
  const school = firstNonEmpty(schoolName, selected?.company?.name, 'DemoOkul');
  const region = firstNonEmpty(regionLabel, selected?.company ? '' : '#1');
  const summary = [
    headerText,
    `Çocuk: ${childLabel}`,
    'Araç: 0',
    `Okul/Şirket: ${school}`,
    `Bölge: ${region}`,
    reasonText,
  ].filter(Boolean).join(' • ');
  const selectedRecordStatus = [
    `Çocuk: ${childLabel}`,
    'Araç: 0',
    `Okul/Şirket: ${school}`,
    `Bölge: ${region}`,
    'Canlı araç görünmüyor',
  ].join(' • ');
  return {
    selectedRecordType: 'studentService',
    selectedRecordId: Number(selected?.id || 0) || 0,
    selectedRecordLabel: `Bugünkü servis • ${childLabel}`,
    selectedRecordStatus,
    selectedRecordSummary: summary,
    selectedSummary: summary,
    helpContextSummary: summary,
    contextSummary: summary,
    copilotSummary: summary,
    summary,
    fields: [
      { label: 'Çocuk', value: childLabel, help: 'Seçili öğrenciyi güvenli şekilde gösterir.' },
      { label: 'Araç', value: '0', help: 'Canlı araç olmadığını gösterir.' },
      { label: 'Okul/Şirket', value: school, help: 'Bağlı kurum bilgisini gösterir.' },
      { label: 'Bölge', value: region, help: 'Bağlı bölge bilgisini gösterir.' },
      { label: 'Canlı araç', value: 'Görünmüyor', help: reasonText },
      { label: 'Canlı konum', value: 'Yok', help: 'Canlı konum henüz görünmüyor.' },
    ],
    badges: [
      { label: 'Canlı araç', value: 'Yok', help: 'Bu çocuk için canlı araç görünmüyor.' },
      { label: 'Araç ataması', value: 'Gerekli', help: 'Araç ataması gerekiyorsa canlı görünürlük oluşur.' },
      { label: 'Servis saati', value: 'Aktif vardiya gerekli', help: 'Canlı konum için aktif vardiya saat aralığı gerekir.' },
    ],
    facts: {
      selectedRecordType: 'studentService',
      selectedRecordId: Number(selected?.id || 0) || 0,
      selectedRecordLabel: `Bugünkü servis • ${childLabel}`,
      selectedRecordStatus,
      vehicleCount: Number(vehicleCount || 0),
      liveVehicleVisible: false,
      noLiveVehicle: true,
      childLabel,
      schoolName: school,
      regionLabel: region,
      helpContextSummary: summary,
      contextSummary: summary,
      selectedRecordSummary: summary,
      copilotSummary: summary,
    },
  };
}

export function buildCommercialFlowFacts({ selectedItem, marketCount = 0, acceptedCount = 0, listCount = 0 }) {
  const status = String(selectedItem?.statusLabel || '-').toUpperCase();
  const section = String(selectedItem?.section || 'market');
  const isMarket = section === 'market';
  const isPending = section === 'pending';
  const isList = section === 'list';
  const contractProductionSeen = Boolean(selectedItem?.shiftId) || /(üret|uret|vardiya|sinyal|görün|gorun)/i.test(String(selectedItem?.shiftStatus || selectedItem?.contractShiftStatus || selectedItem?.nextStep || ''));
  const contractProductionText = contractProductionSeen
    ? 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.'
    : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const blockers = [];
  pushIf(blockers, isMarket, 'Ticari karar henüz market/pazarlık tarafında; operasyon yorumu erken olabilir.');
  pushIf(blockers, isPending, 'Pazarlık bitmiş olsa bile operasyon bağlantısı ayrıca doğrulanmalıdır.');
  const actions = [
    actionRule({
      key: 'commercial_open_market',
      label: 'Marketi aç',
      enabled: isMarket,
      reason: 'Kayıt market aşamasında değil.',
      purpose: 'Pazarlık ve teklif karşılaştırma tarafını açar.',
      whenToUse: 'Kayıt hâlâ market bölümündeyse kullanılır.',
      whatHappens: 'Market satırları veya ilgili teklif görünümü açılır.',
      blockedBy: isMarket ? [] : ['Kayıt market aşamasında değil'],
    }),
    actionRule({
      key: 'commercial_open_pending',
      label: 'Bekleyeni aç',
      enabled: isPending,
      reason: 'Kayıt kabul edilmiş bekleyen aşamada değil.',
      purpose: 'Kabul edilmiş ama operasyona tam bağlanmamış kayıtları açar.',
      whenToUse: 'Kayıt pending/bekleyen bölümündeyse kullanılır.',
      whatHappens: 'Bekleyenler görünümü açılır.',
      blockedBy: isPending ? [] : ['Kayıt bekleyen aşamada değil'],
    }),
    actionRule({
      key: 'commercial_open_list',
      label: 'Listeyi aç',
      enabled: isList || Boolean(selectedItem?.shiftId),
      reason: 'Bağlı vardiya görünmüyor.',
      purpose: 'Bağlı operasyon veya vardiya listesini açar.',
      whenToUse: 'Kayıt operasyon/liste tarafına geçtiyse kullanılır.',
      whatHappens: 'Bağlı vardiya veya operasyon kaydı açılır.',
      blockedBy: isList || selectedItem?.shiftId ? [] : ['Bağlı vardiya yok'],
    }),
  ];
  const actionMatrix = splitActions(actions);
  const selectedRecordStatus = [
    `Karşı taraf: ${selectedItem?.counterparty || '-'}`,
    `Akış: ${selectedItem?.flowLabel || '-'}`,
    `Durum: ${status}`,
    `Sonraki adım: ${selectedItem?.nextStep || '-'}`,
  ].join(' • ');
  const readonlyFacts = buildReadonlyCopilotFacts({
    screenType: 'COMMERCIAL_FLOW',
    stage: `${section}:${status}`,
    readinessScore: isList ? 82 : isPending ? 61 : 39,
    readiness: isList ? 'READY' : isPending ? 'REVIEW_NEEDED' : 'NOT_READY',
    summary: isList ? 'Operasyon listesi' : isPending ? 'Bekleyen akış' : 'Market aşaması',
    blockers,
    evidence: [
      `Karşı taraf: ${selectedItem?.counterparty || '-'}`,
      `Akış: ${selectedItem?.flowLabel || '-'}`,
      `Durum: ${status}`,
      `Sonraki adım: ${selectedItem?.nextStep || '-'}`,
      contractProductionText,
    ],
    nextBestAction: isMarket
      ? 'Önce Marketi aç veya teklif tarafını tamamla. Sonra operasyon hazırlığına bak.'
      : isPending
        ? contractProductionSeen
          ? 'İlgili sözleşmeyi aç ve bugünkü vardiyaları kontrol et.'
          : 'Üretim geçmişini veya bugünkü vardiyalar listesini kontrol et.'
        : contractProductionSeen
          ? 'İlgili sözleşmeyi aç ve bugünkü vardiyaları kontrol et.'
          : 'Üretim geçmişini veya bugünkü vardiyalar listesini kontrol et.',
    safestNextStep: contractProductionSeen
      ? 'İlgili sözleşmeyi aç ve bugünkü vardiyaları kontrol et.'
      : 'Üretim geçmişini veya bugünkü vardiyalar listesini kontrol et.',
    compareHint: 'Marketi aç pazarlık tarafını gösterir; Listeyi aç operasyon tarafına götürür.',
    counters: { market: Number(marketCount || 0), accepted: Number(acceptedCount || 0), list: Number(listCount || 0) },
    selectedRecordStatus,
    copilotSignals: [
      { id: 'counterparty', label: 'Karşı taraf', value: selectedItem?.counterparty || '-', note: isMarket ? 'Pazarlık tarafı.' : 'Akış tarafı.' },
      { id: 'flow', label: 'Akış', value: selectedItem?.flowLabel || '-', note: 'Ticari akış etiketi.' },
      { id: 'section', label: 'Bölüm', value: section, note: isList ? 'Liste tarafı.' : isPending ? 'Bekleyen tarafı.' : 'Market tarafı.' },
      { id: 'status', label: 'Durum', value: status, note: selectedItem?.nextStep || 'Durum satırı.' },
      { id: 'linkedShift', label: 'Bağlı vardiya', value: selectedItem?.shiftId ? `#${selectedItem.shiftId}` : 'Yok', note: contractProductionText },
    ],
    boundaryNotes: [isMarket ? 'Ticari karar henüz operasyon tarafına inmemiş olabilir.' : ''],
  });
  return {
    missing: [],
    blockers,
    ...readonlyFacts,
    reasoningLead: isMarket
      ? 'Bu kayıt hâlâ ticari pazarlık tarafında görünüyor.'
      : contractProductionSeen
        ? contractProductionText
        : isPending
          ? 'Bu kayıt kabul edilmiş ama operasyon hazırlığı ayrıca kontrol edilmelidir.'
          : 'Bu kayıt operasyon tarafına geçmiş görünüyor.',
    ...actionMatrix,
  };
}

export function buildServiceEvaluationFacts({ item, summary }) {
  const status = String(item?.statusLabel || '-').toUpperCase();
  const evalStatus = String(item?.evaluationStatus || '-').toUpperCase();
  const hasProviderScore = Number(item?.providerScore?.evaluationCount || 0) > 0;
  const canEvaluate = /BEK|PENDING|DEĞERLENDIR|DEGERLENDIR/.test(evalStatus) || /DONE|COMPLETED/.test(status);
  const blockers = [];
  pushIf(blockers, !/DONE|COMPLETED|ACTIVE|APPROVED/.test(status), 'Hizmet operasyon durumu değerlendirme için net görünmüyor.');
  pushIf(blockers, !canEvaluate, 'Değerlendirme durumu henüz puan vermeye açık görünmüyor.');
  const actions = [
    actionRule({
      key: 'service_evaluate',
      label: 'Değerlendir',
      enabled: canEvaluate,
      reason: 'Bu kayıt için değerlendirme akışı açık görünmüyor.',
      purpose: 'Seçili hizmet için puan ve kısa değerlendirme kaydı açar.',
      whenToUse: 'Hizmet tamamlandıysa ve değerlendirme rozeti uygunsa kullanılır.',
      whatHappens: 'Puan ve not kaydı alınır.',
      blockedBy: canEvaluate ? [] : ['Değerlendirme durumu açık değil'],
    }),
    actionRule({
      key: 'service_open_services',
      label: 'Hizmetleri aç',
      enabled: true,
      purpose: 'Bağlı hizmet veya operasyon kayıtlarını açar.',
      whenToUse: 'Sonucun kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'İlgili hizmet listesi açılır.',
    }),
    actionRule({
      key: 'service_open_agreements',
      label: 'Sözleşmeleri aç',
      enabled: true,
      purpose: 'Bağlı sözleşme veya ilişkiyi doğrulamak için ilgili görünümü açar.',
      whenToUse: 'Hizmetin ticari kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'Sözleşme tarafına geçilir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  const providerScoreText = hasProviderScore ? `${Number(item?.providerScore?.averageScore || 0).toFixed(1)} ★ (${item?.providerScore?.evaluationCount || 0})` : 'Henüz puan yok';
  const copilotSignals = [
    { id: 'qualitySignal', label: 'Kalite sinyali', value: `${status} • ${evalStatus}`, note: 'Bu kayıt kalite değerlendirmesine yardımcı olur.' },
    { id: 'providerComparison', label: 'Sağlayıcı karşılaştırma', value: providerScoreText, note: 'Sağlayıcı sıralaması değildir.' },
    { id: 'contractShiftGeneration', label: 'Sözleşme / vardiya', value: item?.contractShiftStatus || item?.shiftStatus || 'Kontrol gerekli', note: 'Sözleşmeden vardiya üretimi ayrıca okunur.' },
  ];
  const copilotSummary = [
    item?.providerName || null,
    item?.serviceLabel || null,
    item?.statusLabel || null,
    item?.evaluationStatus || null,
    providerScoreText,
  ].filter(Boolean).join(' • ');
  return {
    screenType: 'SERVICE_EVALUATION',
    stage: `${status}:${evalStatus}`,
    readinessScore: canEvaluate ? 79 : 44,
    readiness: canEvaluate ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing: [],
    blockers,
    ...actionMatrix,
    counters: {
      completedServices: Number(summary?.cards?.completedServices || 0),
      pendingEvaluation: Number(summary?.cards?.pendingEvaluation || 0),
      activeServices: Number(summary?.cards?.activeServices || 0),
    },
    evidence: [
      `Sağlayıcı: ${item?.providerName || '-'}`,
      `Hizmet: ${item?.serviceLabel || '-'}`,
      `Durum: ${status}`,
      `Değerlendirme: ${evalStatus}`,
      `Sağlayıcı puanı: ${hasProviderScore ? `${Number(item?.providerScore?.averageScore || 0).toFixed(1)} ★` : 'Henüz puan yok'}`,
    ],
    reasoningLead: canEvaluate
      ? 'Bu kayıtta ana karar, değerlendirmenin gerçekten açılıp açılmayacağı tarafında.'
      : 'Bu kayıtta değerlendirme akışı henüz net hazır görünmüyor.',
    nextBestAction: canEvaluate
      ? 'Önce hizmet satırını aç. Sonra Değerlendir ile kısa puan ve notu kaydet.'
      : 'Önce hizmetin operasyon durumu ve değerlendirme rozetini kontrol et. Gerekirse Hizmetleri aç ile bağlı kayda git.',
    safestNextStep: 'En risksiz adım, seçili hizmet satırında değerlendirme rozetini ve tarih bilgisini birlikte doğrulamaktır.',
    compareHint: 'Durum rozeti hizmetin operasyon halini, Değerlendirme rozeti puan verilebilir mi bilgisini gösterir.',
    copilotSignals,
    copilotSummary,
    boundaryNotes: [
      'Bu bilgi kesin kalite puanı değildir.',
      'Sağlayıcı sıralaması değildir.',
    ],
  };
}

function selectionStarterText(selection = null) {
  if (!selection || typeof selection !== 'object') return '';
  const rows = [
    selection.label,
    selection.summary,
    selection.selectedLabel,
    selection.selectedSummary,
    selection.selectedRecordLabel,
    selection.selectedRecordSummary,
    selection.selectedRecordStatus,
    selection.helpContextSummary,
    selection.contextSummary,
    selection.copilotSummary,
    selection?.facts?.summary,
    selection?.facts?.copilotSummary,
    selection?.facts?.helpContextSummary,
    selection?.facts?.contextSummary,
    selection?.facts?.seferScoreSummaryText,
    selection?.facts?.seferScoreStatus,
    selection?.facts?.seferScoreNextAction,
    selection?.facts?.seferScorePreview?.summaryText,
    selection?.facts?.seferScorePreview?.safeExplanation,
    selection?.facts?.seferScorePreview?.previewOnlyNote,
    selection?.facts?.qualityPaymentBridgeSummaryText,
    selection?.facts?.qualityPaymentBridgeStatus,
    selection?.facts?.qualityPaymentBridgeSettlementReadiness,
    selection?.facts?.qualityPaymentBridgeImpactStatus,
    selection?.facts?.qualityPaymentBridgeImpactReason,
    selection?.facts?.qualityPaymentBridgeNextAction,
    selection?.facts?.qualityPaymentBridgePreview?.summaryText,
    selection?.facts?.qualityPaymentBridgePreview?.previewOnlyNote,
    selection?.selectedRecord?.label,
    selection?.selectedRecord?.summary,
    selection?.selectedRecord?.status,
    selection?.selectedRecord?.vehiclePlate,
    selection?.selectedRecord?.plate,
    selection?.selectedRecord?.gpsStatus,
    selection?.selectedRecord?.gpsState,
    selection?.selectedRecord?.lastGps,
    selection?.selectedRecord?.eta,
    selection?.selectedRecord?.nextStop,
    selection?.selectedRecord?.serviceStatus,
    selection?.selectedRecord?.operationProofStatus,
    ...(Array.isArray(selection.fields)
      ? selection.fields.map((field) => `${field?.label || ''}: ${field?.value || ''}`)
      : []),
    ...(Array.isArray(selection.badges)
      ? selection.badges.map((badge) => `${badge?.label || ''}: ${badge?.value || ''}`)
      : []),
    ...(Array.isArray(selection.selectedFields)
      ? selection.selectedFields.map((field) => `${field?.label || ''}: ${field?.value || ''}`)
      : []),
    ...(Array.isArray(selection.selectedBadges)
      ? selection.selectedBadges.map((badge) => `${badge?.label || ''}: ${badge?.value || ''}`)
      : []),
  ];
  return compactList(rows, 24).join(' • ');
}

function includesAny(text, terms = []) {
  const haystack = normalizeText(text);
  if (!haystack) return false;
  return (Array.isArray(terms) ? terms : []).some((term) => {
    const needle = normalizeText(term);
    return needle && haystack.includes(needle);
  });
}

function pushUniqueChip(rows, value) {
  const text = compactText(value, '');
  if (!text) return;
  if (rows.some((item) => normalizeText(item) === normalizeText(text))) return;
  rows.push(text);
}

function finalizeStarterChips(primary = [], fallback = []) {
  const rows = [];
  for (const value of Array.isArray(primary) ? primary : []) pushUniqueChip(rows, value);
  if (rows.length) return rows.slice(0, 4);
  for (const value of Array.isArray(fallback) ? fallback : []) pushUniqueChip(rows, value);
  return rows.slice(0, 3);
}

export function buildCopilotStarterChips({
  screenPath = '',
  selection = null,
} = {}) {
  const path = compactText(screenPath, '').split('?')[0];
  const selectionText = selectionStarterText(selection);
  const fallback = ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?'];

  const isBoardingApplication = selection?.facts?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || selection?.liveFacts?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || selection?.structuredFacts?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || selection?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || includesAny(selectionText, ['günlük atamaya işlendi', 'günlük atamaya işlenebilir', 'kabul edilen değişiklik', 'sürücü rotası yenilenmedi', 'sürücü rotası yenilenmez', 'sadece günlük atama etkisi', 'uygulama durumu']);
  const isBoardingPreview = selection?.facts?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || selection?.liveFacts?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || selection?.structuredFacts?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || selection?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || includesAny(selectionText, ['rota etkisi', 'biniş değişikliği', 'bugün binmezse', 'farklı duraktan', 'geçici durak', 'rota/atama uygulanmadı', 'km farkı', 'süre artar mı', 'kapasite etkisi']);
  const isDynamicSavingsPreview = selection?.facts?.dynamicSavingsPreviewText
    || selection?.facts?.dynamicSavingsSummaryText
    || selection?.liveFacts?.dynamicSavingsPreviewText
    || selection?.structuredFacts?.dynamicSavingsPreviewText
    || selection?.screenType === 'DYNAMIC_SAVINGS_PREVIEW'
    || includesAny(selectionText, ['tasarruf', 'tasarruf önizlemesi', 'tasarruf onizlemesi', 'km tasarrufu', 'süre tasarrufu', 'sure tasarrufu', 'yaklaşık maliyet', 'yaklasik maliyet', 'maliyet etkisi', 'readonly önizleme', 'readonly onizleme']);
  const isSeferScorePreview = Boolean(
    selection?.facts?.seferScorePreview
    || selection?.liveFacts?.seferScorePreview
    || selection?.structuredFacts?.seferScorePreview
    || selection?.facts?.seferScoreSummaryText
    || selection?.facts?.seferScoreStatus
    || selection?.facts?.seferScoreNextAction
    || includesAny(selectionText, ['sefer puanı', 'sefer puani', 'readonly kalite puanı', 'readonly kalite puani', 'sefer score', 'kalite puanı neden düşük', 'kalite puani neden düşük', 'eksik sinyaller', 'sefer puanı nasıl yükselir', 'sefer puani nasil yukselir'])
  );
  const isQualityPaymentBridgePreview = Boolean(
    selection?.facts?.qualityPaymentBridgePreview
    || selection?.liveFacts?.qualityPaymentBridgePreview
    || selection?.structuredFacts?.qualityPaymentBridgePreview
    || selection?.facts?.qualityPaymentBridgeSummaryText
    || selection?.facts?.qualityPaymentBridgeStatus
    || selection?.facts?.qualityPaymentBridgeNextAction
    || includesAny(selectionText, ['hakediş için kalite/kanıt hazırlık önizlemesi', 'readonly önizleme', 'ödeme başlatılmaz', 'tahsilat/fatura oluşturulmaz', 'kanıt eksikleri', 'hakediş etkisi', 'kalite durumu'])
  );
  const isDriverToday = path.includes('/driver/today');
  const isDriverRouteOrMap = path.includes('/driver/route') || path.includes('/driver/map');
  if (isDynamicSavingsPreview) {
    return finalizeStarterChips([
      'Tasarruf hesabını göster',
      'Km / süre farkını açıkla',
      'Kapasite etkisini göster',
      'Yaklaşık maliyet etkisini açıkla',
    ], fallback);
  }
  if (isSeferScorePreview) {
    return finalizeStarterChips([
      'Bu tedarikçinin SeferPuanı kaç?',
      'Kalite puanı neden düşük?',
      'Eksik sinyalleri göster',
      'SeferPuanı nasıl yükselir?',
    ], fallback);
  }
  if (isQualityPaymentBridgePreview) {
    return finalizeStarterChips([
      'Kanıt eksiklerini göster',
      'Hakediş etkisini açıkla',
      'Ödeme başlatılabilir mi?',
      'Sıradaki doğru işlem ne?',
    ], fallback);
  }
  if (isBoardingApplication) {
    return finalizeStarterChips(
      (isDriverToday || isDriverRouteOrMap)
        ? [
          'Sürücü rota ekranında görünür mü?',
          'Rota güncellemesi bekliyor mu?',
          'Bu sadece günlük atama mı?',
          'Sürücüye gönderildi mi?',
        ]
        : [
          'Bu değişiklik uygulamaya hazır mı?',
          'Günlük atamaya işlenir mi?',
          'Sürücü rotası yenilenir mi?',
          'Bu sadece günlük atama mı?',
        ],
      fallback,
    );
  }
  const isRoomMap = path.includes('/room/map') || path.includes('/company/map') || path.includes('/school/map') || path.includes('/organization/map');
  const isRoomOperationHealth = path.includes('/room/operation-health');
  const isSuperAdminOps = path.includes('/superadmin/observability') || path.includes('/superadmin/operations');
  const isAgreementSurface = path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements');
  const isAgreementRouteRefresh = isAgreementSurface && Boolean(
    selection?.facts?.routeRefreshState
    || selection?.liveFacts?.routeRefreshState
    || selection?.structuredFacts?.routeRefreshState
    || selection?.facts?.routeRefreshLabel
    || selection?.liveFacts?.routeRefreshLabel
    || selection?.structuredFacts?.routeRefreshLabel
    || includesAny(selectionText, [
      'rota güncelleme',
      'rota guncelleme',
      'rota değişikliği',
      'rota degisikligi',
      'eski rota',
      'yeni rota',
      'teklif mi',
      'kabul mü',
      'kabul mu',
      'karşı teklif',
      'karsi teklif',
      'uygulanan rota',
      'rota geçmişi',
      'rota gecmisi',
    ]),
  );
  const isCommercialSurface = path.includes('/company/commercial-flow') || path.includes('/superadmin/commercial-core') || path.includes('/room/commercial-flow');
  const isCompanyShifts = path.includes('/company/shifts') || path.includes('/school/shifts') || path.includes('/organization/shifts');
  const isCompanyQuality = path.includes('/company/service-evaluation') || path.includes('/school/service-evaluation') || path.includes('/organization/service-evaluation');
  const isPersonelLive = path.includes('/personel/live') || path.includes('/personel/my');
  const isParentLive = path.includes('/parent/live');
  if (isBoardingPreview) {
    return finalizeStarterChips([
      'Rota etkisini özetle',
      'Kişi/durak farkını açıkla',
      'Km/süre farkını göster',
      'Bu sadece önizleme mi?',
    ], fallback);
  }

  const hasVehicleSignal = includesAny(selectionText, [
    'araç',
    'vehicle',
    'plaka',
    'gps',
    'son gps',
    'eta',
    'durak',
    'rota',
    'canlı takip',
    'canlı konum',
  ]) || Boolean(selection?.selectedRecord?.vehiclePlate || selection?.selectedRecord?.plate || selection?.selectedRecordType === 'vehicle' || selection?.entityType === 'vehicle');
  const hasServiceSignal = includesAny(selectionText, [
    'servis',
    'bugünkü servis',
    'öğrenci servisi',
    'öğrencinin servisi',
    'myride',
    'yolculuk',
  ]) || Boolean(['serviceride', 'studentservice', 'studentride', 'rideservice'].includes(normalizeText(selection?.selectedRecordType || selection?.entityType || '')));
  const hasNoLiveVehicle = Boolean(
    selection?.facts?.noLiveVehicle
    || selection?.facts?.liveVehicleVisible === false
    || Number(selection?.facts?.vehicleCount || selection?.vehicleCount || NaN) === 0
    || includesAny(selectionText, ['canlı araç görünmüyor', 'araç yok', 'araç: 0', 'canlı araç yok']),
  );

  let chips = [];
  if (isRoomMap) {
    chips = ['Bu araç neden görünmüyor?', 'Son GPS ne zaman geldi?', 'Sürücünün telefon GPS’i devrede mi?', 'Araç bağlantısı var mı?'];
  } else if (isRoomOperationHealth) {
    chips = ['Riskli cihazları göster', 'Stale/offline satırını aç', 'Açık sorunları sırala', 'Aktif sürücü durumunu sor'];
  } else if (isSuperAdminOps) {
    chips = ['Riskleri sırala', 'GPS görünürlüğünü kontrol et', 'Açık sorunları göster', 'Sıradaki doğru işlem ne?'];
  } else if (isAgreementRouteRefresh) {
    chips = ['Bu sözleşmede rota değişikliği var mı?', 'Room’a rota güncelleme talebi gitti mi?', 'Eski rota ile yeni rota farkı ne?', 'Teklif mi, kabul mü?'];
  } else if (isDynamicSavingsPreview) {
    chips = ['Tasarruf hesabını göster', 'Km / süre farkını açıkla', 'Kapasite etkisini göster', 'Yaklaşık maliyet etkisini açıkla'];
  } else if (isAgreementSurface) {
    chips = isSeferScorePreview
      ? ['Bu tedarikçinin SeferPuanı kaç?', 'Kalite puanı neden düşük?', 'Eksik sinyalleri göster', 'SeferPuanı nasıl yükselir?']
      : isQualityPaymentBridgePreview
      ? ['Kanıt eksiklerini göster', 'Hakediş etkisini açıkla', 'Ödeme başlatılabilir mi?', 'Sıradaki doğru işlem ne?']
      : ['Bugün vardiya üretildi mi?', 'Üretilen vardiyaları göster', 'Sözleşme üretim durumunu açıkla', 'Son üretilen vardiya hangisi?'];
  } else if (isCommercialSurface) {
    chips = isSeferScorePreview
      ? ['Bu tedarikçinin SeferPuanı kaç?', 'Kalite puanı neden düşük?', 'Eksik sinyalleri göster', 'SeferPuanı nasıl yükselir?']
      : isQualityPaymentBridgePreview
      ? ['Kanıt eksiklerini göster', 'Hakediş etkisini açıkla', 'Ödeme başlatılabilir mi?', 'Sıradaki doğru işlem ne?']
      : ['Bu hakediş neden hazır değil?', 'Ödeme hesabı eksik mi?', 'Komisyon durumu ne?', 'Hakediş önizlemesini açıkla'];
  } else if (isCompanyShifts) {
    chips = ['Bu vardiya neden başlayamıyor?', 'Atama eksik mi?', 'Sıradaki doğru işlem ne?', 'Sözleşmeye bağlı mı?'];
  } else if (isCompanyQuality) {
    chips = ['Değerlendirme bekleyen var mı?', 'Kanıt eksikleri neler?', 'İnceleme kararı ne?', 'Sıradaki işlem ne?'];
  } else if (isPersonelLive) {
    chips = hasServiceSignal || hasVehicleSignal || selectionText
      ? ['Servis neden görünmüyor?', 'Son GPS ne zaman geldi?', 'Araç nerede?', 'Sürücünün telefon GPS’i devrede mi?']
      : ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?'];
  } else if (isParentLive) {
    if (hasNoLiveVehicle || (!hasVehicleSignal && !hasServiceSignal && !selectionText)) {
      chips = ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
    } else if (hasVehicleSignal || hasServiceSignal || selectionText) {
      chips = ['Servis neden görünmüyor?', 'ETA nedir?', 'Son GPS ne zaman geldi?', 'Araç bağlantısı var mı?'];
    }
  } else if (isDriverToday) {
    chips = ['Görev neden başlamıyor?', 'Başlatma zamanı uygun mu?', 'Araç ve rota hazır mı?', 'GPS ve başlatma kanıtını kontrol et'];
  } else if (isDriverRouteOrMap) {
    chips = ['Sıradaki durak ne?', 'Rota neden görünmüyor?', 'GPS durumu ne?', 'Başlatma adımı ne?'];
  }

  if (!chips.length) {
    chips = fallback;
  } else {
    chips = finalizeStarterChips(chips, fallback);
  }

  if (!chips.length) chips = fallback.slice(0, 3);
  return chips.slice(0, 4);
}
