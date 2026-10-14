const LOCAL_MODEL_TASK_TYPES = new Set([
  'FIELD_LOOKUP',
  'RECORD_DETAILS',
  'SELECTED_RECORD_CONTEXT',
  'RELATION_LOOKUP',
  'COUNT',
  'SITUATION',
  'CLARIFY',
]);

const LOCAL_MODEL_ENTITY_TYPES = new Set([
  'SHIFT',
  'OFFER',
  'AGREEMENT',
  'VEHICLE',
  'DRIVER',
  'PERSONNEL',
  'STUDENT',
  'PARENT',
]);

const LOCAL_MODEL_FIELDS = new Set([
  'STATUS',
  'SERVICE_BUYER_AMOUNT',
  'CARRIER_AMOUNT',
  'AGREEMENT_COMPANY_OFFER_AMOUNT',
  'SHIFT',
  'OFFER',
  'AGREEMENT',
  'VEHICLE',
  'DRIVER',
  'OPERATION_STATUS',
  'PASSENGER_COUNT',
  'BOARDING_COUNT',
  'ALIGHTING_COUNT',
  'DATE',
  'DATE_RANGE',
  'TIME_RANGE',
  'ROUTE',
  'COST',
  'RISK_STATE',
  'QUALITY_STATE',
]);

const LOCAL_MODEL_AMBIGUITIES = new Set(['NONE', 'CLARIFY', 'UNRESOLVED']);

export const LOCAL_MODEL_PROPOSAL_VERSION = 'SEFER-ABI-LOCAL-ADVISORY-V1';

export const LOCAL_MODEL_PROPOSAL_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['version', 'taskType', 'entityType', 'explicitEntityRefs', 'requestedFields', 'ambiguity', 'confidence'],
  properties: {
    version: { const: LOCAL_MODEL_PROPOSAL_VERSION },
    taskType: { enum: [...LOCAL_MODEL_TASK_TYPES] },
    entityType: { anyOf: [{ enum: [...LOCAL_MODEL_ENTITY_TYPES] }, { type: 'null' }] },
    explicitEntityRefs: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'id'],
        properties: {
          type: { enum: [...LOCAL_MODEL_ENTITY_TYPES] },
          id: { type: 'integer', minimum: 1 },
        },
      },
    },
    requestedFields: { type: 'array', items: { enum: [...LOCAL_MODEL_FIELDS] }, maxItems: 8 },
    ambiguity: { enum: [...LOCAL_MODEL_AMBIGUITIES] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
});

const LOCAL_MODEL_DOMAIN_BY_ENTITY = Object.freeze({
  SHIFT: 'SHIFTS',
  OFFER: 'OFFERS',
  AGREEMENT: 'AGREEMENTS',
  VEHICLE: 'VEHICLES',
  DRIVER: 'DRIVERS',
  PERSONNEL: 'PERSONNEL',
  STUDENT: 'PERSONNEL',
  PARENT: 'PERSONNEL',
});

const LOCAL_MODEL_DOMAIN_BY_FIELD = Object.freeze({
  SERVICE_BUYER_AMOUNT: 'OFFERS',
  CARRIER_AMOUNT: 'OFFERS',
  AGREEMENT_COMPANY_OFFER_AMOUNT: 'AGREEMENTS',
  RISK_STATE: 'OFFERS',
  QUALITY_STATE: 'OFFERS',
});

const LOCAL_MODEL_ENTITY_CUES = Object.freeze({
  SHIFT: /\b(?:vardiya|sefer|shift)\p{L}*\b/iu,
  OFFER: /\b(?:teklif|offer|rfq)\p{L}*\b/iu,
  AGREEMENT: /\b(?:sozlesme|sözleşme|anlasma|anlaşma|agreement|contract)\p{L}*\b/iu,
  VEHICLE: /\b(?:arac|araç|vehicle|plaka)\p{L}*\b/iu,
  DRIVER: /\b(?:surucu|sürücü|sofor|şoför|driver)\p{L}*\b/iu,
  PERSONNEL: /\b(?:personel|calisan|çalışan)\p{L}*\b/iu,
  STUDENT: /\b(?:ogrenci|öğrenci|student)\p{L}*\b/iu,
  PARENT: /\b(?:veli|ebeveyn|parent)\p{L}*\b/iu,
});

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function localOnlyUrl(value, { allowDockerHost = false } = {}) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) return true;
    return allowDockerHost && host === 'host.docker.internal';
  } catch {
    return false;
  }
}

export function isLocalSemanticProposalEnabled({ env = process.env } = {}) {
  const maintenance = String(env?.LOCAL_MAINTENANCE_MODE || '').trim() === '1'
    && String(env?.LOCAL_MAINTENANCE_SCOPE || '').trim().toUpperCase() === 'DEMO_FIXTURE_ONLY';
  const enabled = String(env?.SEFER_ABI_LOCAL_MODEL_ENABLED || '').trim() === '1';
  return enabled && maintenance && localOnlyUrl(env?.SEFER_ABI_LOCAL_MODEL_URL, {
    allowDockerHost: String(env?.SEFER_ABI_LOCAL_MODEL_ALLOW_DOCKER_HOST || '').trim() === '1',
  });
}

function normalizeRef(value) {
  const type = String(value?.type || '').trim().toUpperCase();
  const id = Number(value?.id || 0);
  return LOCAL_MODEL_ENTITY_TYPES.has(type) && Number.isInteger(id) && id > 0
    ? { type, id }
    : null;
}

export function validateLocalSemanticProposal(value) {
  const errors = [];
  if (!value || typeof value !== 'object') errors.push('PROPOSAL_OBJECT_REQUIRED');
  if (value?.version !== LOCAL_MODEL_PROPOSAL_VERSION) errors.push('INVALID_VERSION');
  if (!LOCAL_MODEL_TASK_TYPES.has(value?.taskType)) errors.push('INVALID_TASK_TYPE');
  if (value?.entityType !== null && !LOCAL_MODEL_ENTITY_TYPES.has(value?.entityType)) errors.push('INVALID_ENTITY_TYPE');
  if (!Array.isArray(value?.explicitEntityRefs) || value.explicitEntityRefs.length > 2) errors.push('INVALID_ENTITY_REFS');
  const refs = Array.isArray(value?.explicitEntityRefs) ? value.explicitEntityRefs.map(normalizeRef) : [];
  if (refs.some((ref) => !ref)) errors.push('INVALID_ENTITY_REF');
  const fields = Array.isArray(value?.requestedFields) ? value.requestedFields.map((field) => String(field || '').trim().toUpperCase()) : [];
  if (!Array.isArray(value?.requestedFields) || fields.some((field) => !LOCAL_MODEL_FIELDS.has(field))) errors.push('INVALID_REQUESTED_FIELD');
  if (!LOCAL_MODEL_AMBIGUITIES.has(value?.ambiguity)) errors.push('INVALID_AMBIGUITY');
  const confidence = Number(value?.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push('INVALID_CONFIDENCE');
  if (value?.taskType === 'FIELD_LOOKUP' && fields.length === 0) errors.push('FIELD_LOOKUP_REQUIRES_FIELDS');
  if (value?.ambiguity === 'NONE' && !value?.entityType && refs.length === 0 && fields.length === 0) errors.push('EMPTY_RESOLVED_PROPOSAL');
  if (refs.length > 1 && new Set(refs.map((ref) => ref.type)).size > 1) errors.push('MIXED_ENTITY_TYPES');
  if (value?.entityType && refs.some((ref) => ref.type !== value.entityType)) errors.push('ENTITY_TYPE_REF_MISMATCH');
  if (errors.length) return { valid: false, errors, proposal: null };
  return {
    valid: true,
    errors: [],
    proposal: {
      version: LOCAL_MODEL_PROPOSAL_VERSION,
      authority: 'ADVISORY',
      taskType: value.taskType,
      entityType: value.entityType || refs[0]?.type || null,
      explicitEntityRefs: refs,
      requestedFields: [...new Set(fields)],
      ambiguity: value.ambiguity,
      confidence,
      safety: Object.freeze({ actionPolicy: 'READ_ONLY', writeBoundary: 'NO_BUSINESS_WRITE' }),
    },
  };
}

function hasNumericToken(text, id) {
  return new RegExp(`(?:^|\\D)${Number(id)}(?:$|\\D)`, 'u').test(text);
}

function proposalMatchesExplicitText(proposal, message) {
  const text = normalizeText(message);
  const refs = proposal?.explicitEntityRefs || [];
  if (!refs.length) return false;
  return refs.every((ref) => {
    if (!hasNumericToken(text, ref.id)) return false;
    const cue = LOCAL_MODEL_ENTITY_CUES[ref.type];
    if (!cue?.test(text)) return false;
    const lexical = {
      SHIFT: 'vardiya|sefer|shift',
      OFFER: 'teklif|offer|rfq',
      AGREEMENT: 'sozlesme|anlasma|agreement|contract',
      VEHICLE: 'arac|plaka|vehicle',
      DRIVER: 'surucu|sofor|driver',
      PERSONNEL: 'personel|calisan',
      STUDENT: 'ogrenci|student',
      PARENT: 'veli|ebeveyn|parent',
    }[ref.type] || '';
    const escapedId = String(Number(ref.id));
    return new RegExp(`(?:\\b(?:${lexical})\\p{L}*\\s*#?${escapedId}\\b|\\b#?${escapedId}\\s+(?:numarali|numarasi|no)\\s+(?:${lexical})\\p{L}*\\b)`, 'iu').test(text);
  });
}

export function applyLocalSemanticProposal({ shape, proposal, message } = {}) {
  if (!shape || !proposal || proposal.authority !== 'ADVISORY') return shape;
  if (proposal.ambiguity !== 'NONE' || proposal.confidence < 0.75) return shape;
  if (!proposalMatchesExplicitText(proposal, message)) return shape;
  const baseTask = String(shape.taskType || '').toUpperCase();
  const baseEligible = !baseTask
    || baseTask === 'CLARIFY'
    || (baseTask === 'FIELD_LOOKUP'
      && (!Array.isArray(shape.requestedFields) || !shape.requestedFields.length));
  if (!baseEligible) return shape;
  const ref = proposal.explicitEntityRefs[0];
  const fields = proposal.requestedFields.map((key) => ({
    key,
    domain: LOCAL_MODEL_DOMAIN_BY_FIELD[key] || LOCAL_MODEL_DOMAIN_BY_ENTITY[ref.type] || null,
  }));
  return {
    ...shape,
    taskType: proposal.taskType,
    confidence: Math.max(Number(shape.confidence || 0), proposal.confidence),
    ambiguity: null,
    domain: LOCAL_MODEL_DOMAIN_BY_ENTITY[ref.type] || shape.domain || null,
    targetEntityType: ref.type,
    explicitEntityReference: { type: ref.type, id: ref.id, source: 'LOCAL_MODEL_ADVISORY' },
    requestedFields: fields,
    requestedFieldsAuthoritative: fields.length > 0,
    explicitTaskIntent: true,
    explicitUserTarget: true,
    localSemanticProposal: {
      authority: 'ADVISORY',
      version: LOCAL_MODEL_PROPOSAL_VERSION,
      confidence: proposal.confidence,
      validated: true,
    },
  };
}

export function buildLocalSemanticProposalPrompt({ message, screenContext = null, conversationState = null } = {}) {
  const selected = screenContext?.selectedEntityId && screenContext?.selectedEntityType
    ? { type: String(screenContext.selectedEntityType).toUpperCase(), id: Number(screenContext.selectedEntityId) }
    : null;
  const lastReferent = conversationState?.uniqueDiscourseReferent?.type && conversationState?.uniqueDiscourseReferent?.id
    ? { type: String(conversationState.uniqueDiscourseReferent.type).toUpperCase(), id: Number(conversationState.uniqueDiscourseReferent.id) }
    : null;
  return {
    system: [
      'Sen SeferPakt icin yalniz yerel calisan bir semantic advisory oneri ureticisisin.',
      'Yalniz asagidaki JSON semasina uygun JSON dondur.',
      'Yetki verme, tenant karari verme, veritabanina erisme, islem yazma veya cevap uretme.',
      'Acik bir kayit turu ve numarasi yoksa explicitEntityRefs bos olmali ve ambiguity CLARIFY olmalidir.',
      'Modelin onerisi kanonik kurallar ve server-side authorization tarafindan dogrulanmadan kullanilmayacaktir.',
      'Alan esleme: durum=STATUS, arac=VEHICLE, surucu=DRIVER, vardiya veya sefer=SHIFT, teklif=OFFER, sozlesme=AGREEMENT, operasyon durumu=OPERATION_STATUS, binen=BOARDING_COUNT, inen=ALIGHTING_COUNT.',
      'Ornek: "123 numarali vardiyanin durumu nedir" -> taskType FIELD_LOOKUP, entityType SHIFT, explicitEntityRefs SHIFT 123, requestedFields STATUS, ambiguity NONE.',
      'Ornek: "Teklif 456\'nin durumu nedir" -> taskType FIELD_LOOKUP, entityType OFFER, explicitEntityRefs OFFER 456, requestedFields STATUS, ambiguity NONE.',
      'Ornek: "123 icin hangi teklif kabul edildi" -> explicitEntityRefs bos, requestedFields bos, ambiguity CLARIFY; sayiyi tek basina teklif ID sayma.',
      JSON.stringify(LOCAL_MODEL_PROPOSAL_SCHEMA),
    ].join(' '),
    user: JSON.stringify({
      message: String(message || ''),
      screen: { path: screenContext?.path || '', role: screenContext?.role || '' },
      selectedRecord: selected,
      previousReferent: lastReferent,
    }),
  };
}

async function fetchJson(url, body, { fetchImpl = globalThis.fetch, timeoutMs = 20_000 } = {}) {
  if (typeof fetchImpl !== 'function') return { ok: false, status: 'FETCH_UNAVAILABLE' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: `HTTP_${response.status}` };
    return { ok: true, body: await response.json() };
  } catch (error) {
    return { ok: false, status: error?.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_FAILED' };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestLocalSemanticProposal({ message, _user, screenContext, conversationState, env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 20_000 } = {}) {
  if (!isLocalSemanticProposalEnabled({ env })) return { status: 'DISABLED', proposal: null, latencyMs: 0 };
  const baseUrl = String(env?.SEFER_ABI_LOCAL_MODEL_URL || '').trim();
  const allowDockerHost = String(env?.SEFER_ABI_LOCAL_MODEL_ALLOW_DOCKER_HOST || '').trim() === '1';
  if (!localOnlyUrl(baseUrl, { allowDockerHost })) return { status: 'NON_LOCAL_ENDPOINT', proposal: null, latencyMs: 0 };
  const prompt = buildLocalSemanticProposalPrompt({ message, screenContext, conversationState });
  const llamaPrompt = [
    `<|im_start|>system\n${prompt.system}<|im_end|>`,
    `<|im_start|>user\n${prompt.user}<|im_end|>`,
    '<|im_start|>assistant\n',
  ].join('\n');
  const started = performance.now();
  const result = await fetchJson(new URL('/completion', baseUrl), {
    prompt: llamaPrompt,
    temperature: 0,
    seed: 1,
    n_predict: 220,
    json_schema: LOCAL_MODEL_PROPOSAL_SCHEMA,
    cache_prompt: false,
    stream: false,
  }, { fetchImpl, timeoutMs });
  const latencyMs = Math.round(performance.now() - started);
  if (!result.ok) return { status: result.status, proposal: null, latencyMs };
  const content = result.body?.content;
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    return { status: 'INVALID_JSON', proposal: null, latencyMs };
  }
  const validation = validateLocalSemanticProposal(parsed);
  return validation.valid
    ? { status: 'VALID', proposal: validation.proposal, latencyMs }
    : { status: 'INVALID_PROPOSAL', proposal: null, latencyMs, errors: validation.errors };
}

export { LOCAL_MODEL_ENTITY_TYPES, LOCAL_MODEL_FIELDS, LOCAL_MODEL_TASK_TYPES };
import { performance } from 'node:perf_hooks';
