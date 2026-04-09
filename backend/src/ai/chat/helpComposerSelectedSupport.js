import { explainTermsFromText } from '../jobGuide/glossary.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function asText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') return firstNonEmpty(item.text, item.label, item.title, item.action, item.purpose, item.reason, '');
  return String(item || '');
}

function tokenOverlapScore(text, hay) {
  const tokens = normalizeText(text).split(/[^a-z0-9çğıöşü]+/i).filter((x) => x && x.length > 2);
  if (!tokens.length) return 0;
  const target = normalizeText(hay);
  return tokens.reduce((sum, token) => sum + (target.includes(token) ? 1 : 0), 0);
}


function workflowStages(screenDefinition, guide, limit = 5) {
  const screenStages = Array.isArray(screenDefinition?.workflowStages) ? screenDefinition.workflowStages : [];
  if (screenStages.length) return screenStages.slice(0, limit);
  return (Array.isArray(guide?.stepByStep) ? guide.stepByStep : []).slice(0, limit).map((item, idx) => ({
    key: `STEP_${idx + 1}`,
    title: `Adım ${idx + 1}`,
    action: item,
    doneWhen: '',
    ifBlocked: '',
  }));
}

function nextScreens(screenDefinition, limit = 4) {
  const rows = Array.isArray(screenDefinition?.nextScreens) ? screenDefinition.nextScreens : [];
  if (rows.length) return rows.slice(0, limit);
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).slice(0, limit).map((item) => ({
    label: item?.label || '',
    path: item?.path || '',
    reason: item?.purpose || '',
  })).filter((x) => x.label);
}

function dataRules(screenDefinition, guide, limit = 5) {
  const raw = [
    ...(Array.isArray(screenDefinition?.dataRules) ? screenDefinition.dataRules : []),
    ...(Array.isArray(guide?.dataRules) ? guide.dataRules : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, limit);
}

function selectedFieldRows(screenContext) {
  return (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}


function selectedBadgeRows(screenContext) {
  return (Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}


function guideFieldRows(screenDefinition) {
  return (Array.isArray(screenDefinition?.fieldGuides) ? screenDefinition.fieldGuides : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    meaning: firstNonEmpty(row?.meaning, row?.help, ''),
    howToRead: firstNonEmpty(row?.howToRead, ''),
    risk: firstNonEmpty(row?.risk, ''),
    actionHint: firstNonEmpty(row?.actionHint, ''),
  })).filter((row) => row.label);
}


function guideBadgeRows(screenDefinition) {
  return (Array.isArray(screenDefinition?.badgeGuides) ? screenDefinition.badgeGuides : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    meaning: firstNonEmpty(row?.meaning, row?.help, ''),
    howToRead: firstNonEmpty(row?.howToRead, ''),
    risk: firstNonEmpty(row?.risk, ''),
    actionHint: firstNonEmpty(row?.actionHint, ''),
  })).filter((row) => row.label);
}


function findGuideRowByMessage(message, rows) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  const text = normalizeText(message);
  if (!text) return items[0] || null;
  const best = items
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.meaning || ''} ${row?.howToRead || ''} ${row?.risk || ''} ${row?.actionHint || ''}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : null;
}


function findGuideByLabel(label, rows) {
  const items = Array.isArray(rows) ? rows : [];
  const target = normalizeText(label);
  if (!target) return null;
  return items
    .map((row) => ({ row, score: tokenOverlapScore(target, `${row?.label || ''} ${row?.meaning || ''} ${row?.howToRead || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || null;
}


function mergeFieldWithGuide(row, screenDefinition) {
  const guide = findGuideByLabel(row?.label, guideFieldRows(screenDefinition));
  if (!guide) return { ...row, meaning: '', howToRead: '', risk: '', actionHint: '' };
  return {
    ...row,
    meaning: guide.meaning || '',
    howToRead: guide.howToRead || '',
    risk: guide.risk || '',
    actionHint: guide.actionHint || '',
    help: firstNonEmpty(row?.help, guide.meaning, guide.howToRead, guide.actionHint, ''),
  };
}


function mergeBadgeWithGuide(row, screenDefinition) {
  const guide = findGuideByLabel(row?.label, guideBadgeRows(screenDefinition));
  if (!guide) return { ...row, meaning: '', howToRead: '', risk: '', actionHint: '' };
  return {
    ...row,
    meaning: guide.meaning || '',
    howToRead: guide.howToRead || '',
    risk: guide.risk || '',
    actionHint: guide.actionHint || '',
    help: firstNonEmpty(row?.help, guide.meaning, guide.actionHint, ''),
  };
}


function isBlankishValue(value) {
  const text = normalizeText(value);
  return !text || ['-', 'yok', 'boş', 'bos', 'null', 'undefined', 'n/a', 'na', 'henüz puan yok'].includes(text);
}


function findSelectedRowByMessage(message, rows) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  const text = normalizeText(message);
  if (!text) return items[0] || null;
  const best = items
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.value || ''} ${row?.help || ''}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : null;
}


function selectedRowReadReply(screenContext, screenDefinition) {
  const fields = selectedFieldRows(screenContext).map((row) => mergeFieldWithGuide(row, screenDefinition));
  const badges = selectedBadgeRows(screenContext).map((row) => mergeBadgeWithGuide(row, screenDefinition));
  const label = firstNonEmpty(screenContext?.selectedLabel, 'Seçili kayıt');
  if (!label || (!fields.length && !badges.length)) return '';
  const fieldText = fields.slice(0, 6).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const badgeText = badges.slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const missing = fields.filter((row) => isBlankishValue(row.value)).map((row) => row.label).slice(0, 4);
  const rowHint = firstNonEmpty(screenDefinition?.rowReadHint, '');
  const riskHints = fields.filter((row) => isBlankishValue(row.value) && row.risk).slice(0, 2).map((row) => `${row.label}: ${row.risk}`);
  return [
    `${label} satırını şöyle oku:`,
    rowHint ? `İpucu: ${rowHint}` : '',
    fieldText ? `Alanlar: ${fieldText}.` : '',
    badgeText ? `Rozetler: ${badgeText}.` : '',
    missing.length ? `Eksik veya boş görünen alanlar: ${missing.join(', ')}.` : '',
    riskHints.length ? `Dikkat: ${riskHints.join(' • ')}.` : '',
  ].filter(Boolean).join(' ');
}


function selectedFieldReply(message, screenContext, screenDefinition) {
  const genericAsk = ['bu sütun ne demek', 'bu sutun ne demek', 'bu kolon ne demek', 'bu alan ne demek'].some((x) => normalizeText(message).includes(normalizeText(x)));
  const selectedRow = findSelectedRowByMessage(message, selectedFieldRows(screenContext)) || (genericAsk ? selectedFieldRows(screenContext)[0] || null : null);
  const selected = selectedRow ? mergeFieldWithGuide(selectedRow, screenDefinition) : null;
  const guide = findGuideRowByMessage(message, guideFieldRows(screenDefinition)) || (genericAsk ? guideFieldRows(screenDefinition)[0] || null : null);
  const row = selected || guide;
  if (!row) return '';
  const facts = structuredFacts(screenContext);
  const parts = [];
  if (facts?.counters && typeof facts.counters === 'object') {
    const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
    if (counterText) parts.push(`Panel verisi: ${counterText}`);
  }
  parts.push(`${row.label}: ${firstNonEmpty(row.value, row.meaning, '-')}.`);
  const meaning = firstNonEmpty(row.help, row.meaning, 'Bu alan seçili kaydın aynı başlıktaki gerçek tablo bilgisidir.');
  if (meaning) parts.push(meaning);
  if (row.howToRead) parts.push(`Nasıl okunur: ${row.howToRead}`);
  if (row.risk) parts.push(`Dikkat: ${row.risk}`);
  if (row.actionHint) parts.push(`Ne yap: ${row.actionHint}`);
  return parts.join(' ').trim();
}


function selectedBadgeReply(message, screenContext, screenDefinition) {
  const genericAsk = ['bu rozet ne demek', 'bu badge ne demek', 'durum rozeti ne demek', 'bu etiket ne demek'].some((x) => normalizeText(message).includes(normalizeText(x)));
  const selectedRow = findSelectedRowByMessage(message, selectedBadgeRows(screenContext)) || (genericAsk ? selectedBadgeRows(screenContext)[0] || null : null);
  const selected = selectedRow ? mergeBadgeWithGuide(selectedRow, screenDefinition) : null;
  const guide = findGuideRowByMessage(message, guideBadgeRows(screenDefinition)) || (genericAsk ? guideBadgeRows(screenDefinition)[0] || null : null);
  const row = selected || guide;
  if (!row) return '';
  const facts = structuredFacts(screenContext);
  const parts = [];
  if (facts?.counters && typeof facts.counters === 'object') {
    const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
    if (counterText) parts.push(`Panel verisi: ${counterText}`);
  }
  parts.push(`${row.label}: ${firstNonEmpty(row.value, row.meaning, '-')}.`);
  const meaning = firstNonEmpty(row.help, row.meaning, 'Bu rozet seçili kaydın mevcut durumunu veya aşamasını kısa gösterir.');
  if (meaning) parts.push(meaning);
  if (row.howToRead) parts.push(`Nasıl okunur: ${row.howToRead}`);
  if (row.actionHint) parts.push(`Ne yap: ${row.actionHint}`);
  if (row.risk) parts.push(`Dikkat: ${row.risk}`);
  return parts.join(' ').trim();
}


function selectedMissingReply(screenContext, screenDefinition) {
  const facts = structuredFacts(screenContext);
  const notes = [];
  const factMissing = Array.isArray(facts?.missing) ? facts.missing.filter(Boolean) : [];
  const factBlockers = Array.isArray(facts?.blockers) ? facts.blockers.filter(Boolean) : [];
  const blocked = structuredActionRows(screenContext, 'blockedActions');
  if (factMissing.length) notes.push(`Eksik görünen alanlar: ${factMissing.join(', ')}.`);
  if (factBlockers.length) notes.push(`Ana blokaj: ${factBlockers.slice(0, 3).join(' • ')}.`);
  if (blocked.length) notes.push(`Kapalı aksiyon ipucu: ${blocked.slice(0, 2).map((row) => `${row.label}${row.reason ? ` (${row.reason})` : ''}`).join(' • ')}.`);
  if (!notes.length) {
    const fields = selectedFieldRows(screenContext).map((row) => mergeFieldWithGuide(row, screenDefinition));
    if (!fields.length) return '';
    const missing = fields.filter((row) => isBlankishValue(row.value));
    const badgeRows = selectedBadgeRows(screenContext).map((row) => mergeBadgeWithGuide(row, screenDefinition));
    const approvedLike = badgeRows.some((row) => ['APPROVED', 'ACCEPTED', 'ACTIVE'].includes(normalizeText(row.value).toUpperCase()));
    if (missing.length) notes.push(`Eksik veya boş alanlar: ${missing.map((row) => row.label).join(', ')}.`);
    const riskNotes = missing.map((row) => firstNonEmpty(row.risk, row.actionHint, '')).filter(Boolean).slice(0, 3);
    if (riskNotes.length) notes.push(`Dikkat: ${riskNotes.join(' • ')}.`);
    if (approvedLike && missing.some((row) => ['araç', 'sürücü', 'surucu'].includes(normalizeText(row.label)))) {
      notes.push('Durum onaylı görünse bile araç veya sürücü boşsa bu kayıt saha için tam hazır sayılmaz.');
    }
  }
  const rules = dataRules(screenDefinition, null, 2);
  if (rules.length) notes.push(`İlgili kural: ${rules[0]}`);
  return notes.join(' ').trim();
}


function selectedTermReply(message, screenContext, screenDefinition) {
  return selectedFieldReply(message, screenContext, screenDefinition) || selectedBadgeReply(message, screenContext, screenDefinition) || '';
}




function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}


function structuredActionRows(screenContext, key) {
  const facts = structuredFacts(screenContext);
  const rows = Array.isArray(facts?.[key]) ? facts[key] : [];
  return rows.map((row) => ({
    actionKey: firstNonEmpty(row?.key, row?.actionKey, ''),
    label: firstNonEmpty(row?.label, row?.title, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, row?.disabledReason, ''),
    purpose: firstNonEmpty(row?.purpose, row?.meaning, ''),
    whenToUse: firstNonEmpty(row?.whenToUse, row?.howToUse, ''),
    whatHappens: firstNonEmpty(row?.whatHappens, row?.result, ''),
    riskNote: firstNonEmpty(row?.riskNote, row?.risk, ''),
    required: Array.isArray(row?.required) ? row.required.filter(Boolean) : [],
    blockedBy: Array.isArray(row?.blockedBy) ? row.blockedBy.filter(Boolean) : [],
    enabled: row?.enabled !== false && key !== 'blockedActions',
  })).filter((row) => row.label);
}


function uiHintRows(screenContext, key) {
  return (Array.isArray(screenContext?.uiHints?.[key]) ? screenContext.uiHints[key] : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.title, row?.text, typeof row === 'string' ? row : ''),
    value: firstNonEmpty(row?.value, row?.text, row?.label, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, ''),
    disabled: Boolean(row?.disabled),
  })).filter((row) => row.label);
}


function findUiRowByMessage(message, rows) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  const text = normalizeText(message);
  if (!text) return items[0] || null;
  const best = items
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.value || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : items[0] || null;
}



function findStructuredActionByMessage(message, screenContext) {
  const rows = [...structuredActionRows(screenContext, 'allowedActions'), ...structuredActionRows(screenContext, 'blockedActions')];
  if (!rows.length) return null;
  const text = normalizeText(message);
  if (!text) return rows[0] || null;
  const best = rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''} ${row?.reason || ''} ${(row?.required || []).join(' ')} ${(row?.blockedBy || []).join(' ')}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : rows[0] || null;
}


function structuredButtonReply(message, screenContext, analysis, options = {}) {
  const action = findStructuredActionByMessage(message, screenContext);
  if (!action) return '';
  const { blockedOnly = false } = options || {};
  if (blockedOnly && action.enabled) return '';
  const parts = [];
  parts.push(`${action.label}: ${firstNonEmpty(action.purpose, action.enabled ? 'Bu aksiyon şu an kullanılabilir görünüyor.' : 'Bu aksiyon şu an pasif görünüyor.')}`);
  parts.push(action.enabled ? 'Şu an kullanılabilir görünüyor.' : 'Şu an pasif görünüyor.');
  if (action.reason) parts.push(`Sebep: ${action.reason}`);
  if (action.whenToUse) parts.push(`Ne zaman: ${action.whenToUse}`);
  if (action.required?.length) parts.push(`Ön koşul: ${action.required.join(' • ')}`);
  if (action.blockedBy?.length && !action.enabled) parts.push(`Eksik/engel: ${action.blockedBy.join(' • ')}`);
  if (action.whatHappens) parts.push(`Sonuç: ${action.whatHappens}`);
  if (action.riskNote) parts.push(`Dikkat: ${action.riskNote}`);
  if (analysis?.nextBestAction) parts.push(`Şimdi yap: ${analysis.nextBestAction}`);
  return parts.join(' ').trim();
}


function disabledButtonReply(message, screenContext, analysis) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: true });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'blockedActions'), ...uiHintRows(screenContext, 'disabledButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an pasif görünüyor.${hit.reason ? ` Sebep: ${hit.reason}` : ''} ${analysis?.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim();
}


function visibleButtonReply(message, screenContext, analysis = null) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: false });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'allowedActions'), ...uiHintRows(screenContext, 'visibleButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an ekranda görünen bir aksiyon. Doğru kayıt seçiliyken bu buton üzerinden ilerlenir.`;
}


function uiSurfaceEvidence(screenContext) {
  const facts = structuredFacts(screenContext);
  const headers = uiHintRows(screenContext, 'tableHeaders').map((row) => row.label).slice(0, 4);
  const modals = uiHintRows(screenContext, 'modalTitles').map((row) => row.label).slice(0, 2);
  const tabs = uiHintRows(screenContext, 'activeTabs').map((row) => row.label).slice(0, 2);
  const parts = [];
  if (facts?.counters && typeof facts.counters === 'object') {
    const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
    if (counterText) parts.push(`Panel verisi: ${counterText}`);
  }
  if (headers.length) parts.push(`Tablo başlıkları: ${headers.join(', ')}`);
  if (modals.length) parts.push(`Açık modal: ${modals.join(', ')}`);
  if (tabs.length) parts.push(`Aktif sekme: ${tabs.join(', ')}`);
  return parts.length ? `UI ipucu: ${parts.join(' • ')}.` : '';
}


function findButtonGuideByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = [...(Array.isArray(guide?.buttonGuides) ? guide.buttonGuides : []), ...(Array.isArray(screenDefinition?.buttonGuides) ? screenDefinition.buttonGuides : [])];
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}


function findWorkflowStageByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = workflowStages(screenDefinition, guide, 8);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.title || ''} ${row?.action || ''} ${row?.doneWhen || ''} ${row?.ifBlocked || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}


function findNextScreenByMessage(message, screenDefinition) {
  const text = normalizeText(message);
  const rows = nextScreens(screenDefinition, 6);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}


function findBestAction(list, message) {
  const text = normalizeText(message);
  const rows = Array.isArray(list) ? list : [];
  if (!text) return rows[0] || null;
  const hit = rows.find((row) => {
    const hay = normalizeText(`${row?.label || ''} ${row?.reason || ''} ${row?.routeKey || ''}`);
    return text.split(/\s+/).some((word) => word && hay.includes(word));
  });
  return hit || rows[0] || null;
}


export {
  selectedFieldRows,
  selectedBadgeRows,
  guideFieldRows,
  guideBadgeRows,
  findGuideRowByMessage,
  findGuideByLabel,
  mergeFieldWithGuide,
  mergeBadgeWithGuide,
  isBlankishValue,
  findSelectedRowByMessage,
  selectedRowReadReply,
  selectedFieldReply,
  selectedBadgeReply,
  selectedMissingReply,
  selectedTermReply,
  structuredFacts,
  structuredActionRows,
  uiHintRows,
  findUiRowByMessage,
  findStructuredActionByMessage,
  structuredButtonReply,
  disabledButtonReply,
  visibleButtonReply,
  uiSurfaceEvidence,
  findButtonGuideByMessage,
  findWorkflowStageByMessage,
  findNextScreenByMessage,
  findBestAction
};
