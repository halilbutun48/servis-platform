const BOARDING_CHANGE_KIND_ORDER = [
  'NO_SHOW',
  'DIFFERENT_STOP',
  'LATE_TO_STOP',
  'PICKUP_FROM_LOCATION',
  'OPERATION_NOTE',
];

const BOARDING_CHANGE_META = {
  NO_SHOW: {
    PERSONEL: {
      label: 'Bugün servisi kullanmayacağım',
      description: 'Bugün için servis kaydını kapatır.',
      tone: 'ok',
      scopeText: 'Hızlı kayıt',
      statusText: 'Kayıtlı',
    },
    PARENT: {
      label: 'Bugün öğrencim servise binmeyecek',
      description: 'Bugün için öğrenci servis kaydını kapatır.',
      tone: 'ok',
      scopeText: 'Hızlı kayıt',
      statusText: 'Kayıtlı',
    },
  },
  DIFFERENT_STOP: {
    PERSONEL: {
      label: 'Farklı duraktan bineceğim',
      description: 'Kayıtlı rota içindeki başka bir durak için talep oluşturur.',
      tone: 'warn',
      scopeText: 'Kayıtlı durak',
      statusText: 'İncelemede',
    },
    PARENT: {
      label: 'Farklı duraktan binecek',
      description: 'Kayıtlı rota içindeki başka bir durak için talep oluşturur.',
      tone: 'warn',
      scopeText: 'Kayıtlı durak',
      statusText: 'İncelemede',
    },
  },
  LATE_TO_STOP: {
    PERSONEL: {
      label: 'Durağa yetişemiyorum',
      description: 'Gecikme bilgisini operasyona iletir.',
      tone: 'warn',
      scopeText: 'Gecikme bildirimi',
      statusText: 'İncelemede',
    },
    PARENT: {
      label: 'Durağa yetişemiyor',
      description: 'Gecikme bilgisini operasyona iletir.',
      tone: 'warn',
      scopeText: 'Gecikme bildirimi',
      statusText: 'İncelemede',
    },
  },
  PICKUP_FROM_LOCATION: {
    PERSONEL: {
      label: 'Konumdan alınmak istiyorum',
      description: 'Rota dışı konum isteğini operasyona iletir.',
      tone: 'danger',
      scopeText: 'Manuel onay',
      statusText: 'İncelemede',
    },
    PARENT: {
      label: 'Konumdan alınmak istiyorum',
      description: 'Rota dışı konum isteğini operasyona iletir.',
      tone: 'danger',
      scopeText: 'Manuel onay',
      statusText: 'İncelemede',
    },
  },
  OPERATION_NOTE: {
    PERSONEL: {
      label: 'Operasyona not gönder',
      description: 'Kısa bir notu operasyona iletir.',
      tone: 'info',
      scopeText: 'Not',
      statusText: 'İletildi',
    },
    PARENT: {
      label: 'Operasyona not gönder',
      description: 'Kısa bir notu operasyona iletir.',
      tone: 'info',
      scopeText: 'Not',
      statusText: 'İletildi',
    },
  },
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase() === 'PARENT' ? 'PARENT' : 'PERSONEL';
}

export function normalizeBoardingChangeKind(value) {
  const raw = normalizeText(value?.kind || value);
  if (!raw) return 'DIFFERENT_STOP';

  switch (raw) {
    case 'no_show':
    case 'no show':
    case 'dont_board':
    case "don't board":
    case 'bugun servisi kullanmayacagim':
    case 'bugun ogrencim servise binmeyecek':
      return 'NO_SHOW';
    case 'different_stop':
    case 'different stop':
    case 'farkli duraktan binecegim':
    case 'farkli duraktan binecek':
      return 'DIFFERENT_STOP';
    case 'late_to_stop':
    case 'late to stop':
    case 'duraga yetisemiyorum':
    case 'duraga yetisemiyor':
      return 'LATE_TO_STOP';
    case 'pickup_from_location':
    case 'pick up from location':
    case 'konumdan alinmak istiyorum':
      return 'PICKUP_FROM_LOCATION';
    case 'operation_note':
    case 'operation note':
    case 'operasyona not gonder':
      return 'OPERATION_NOTE';
    default:
      return BOARDING_CHANGE_KIND_ORDER.includes(raw.toUpperCase()) ? raw.toUpperCase() : 'DIFFERENT_STOP';
  }
}

export function getBoardingChangeMeta(kind, role) {
  const normalizedRole = normalizeRole(role);
  const normalizedKind = normalizeBoardingChangeKind(kind);
  const baseMeta = BOARDING_CHANGE_META[normalizedKind] || BOARDING_CHANGE_META.DIFFERENT_STOP;
  return {
    kind: normalizedKind,
    role: normalizedRole,
    ...baseMeta[normalizedRole],
  };
}

export function listBoardingChangeOptions(role) {
  const normalizedRole = normalizeRole(role);
  return BOARDING_CHANGE_KIND_ORDER
    .filter((kind) => kind !== 'NO_SHOW')
    .map((kind) => ({
      kind,
      ...getBoardingChangeMeta(kind, normalizedRole),
    }));
}

export function buildBoardingChangeState(input = {}) {
  return {
    items: Array.isArray(input?.items) ? input.items.slice(0, 5) : [],
    lastSubmittedAt: String(input?.lastSubmittedAt || ''),
    lastKind: String(input?.lastKind || ''),
    lastLabel: String(input?.lastLabel || ''),
    lastRole: normalizeRole(input?.lastRole || ''),
    lastStatusText: String(input?.lastStatusText || ''),
    lastScopeText: String(input?.lastScopeText || ''),
    lastError: String(input?.lastError || ''),
    loading: Boolean(input?.loading),
    updatedAt: String(input?.updatedAt || ''),
  };
}

export function buildBoardingChangeRequest({
  kind,
  role,
  reason = '',
  childId = null,
  shiftId = null,
  source = 'mobile',
} = {}) {
  const meta = getBoardingChangeMeta(kind, role);
  const createdAt = new Date().toISOString();
  return {
    id: `boarding-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind: meta.kind,
    role: meta.role,
    label: meta.label,
    description: meta.description,
    tone: meta.tone,
    scopeText: meta.scopeText,
    statusText: meta.statusText,
    reason: String(reason || '').trim() || meta.label,
    childId: Number(childId || 0) || null,
    shiftId: Number(shiftId || 0) || null,
    source: String(source || 'mobile'),
    createdAt,
    updatedAt: createdAt,
  };
}

export function appendBoardingChangeRequest(state = {}, request = {}) {
  const prev = buildBoardingChangeState(state);
  const item = buildBoardingChangeRequest(request);
  const items = [item, ...prev.items].slice(0, 5);
  return {
    ...prev,
    items,
    lastSubmittedAt: item.createdAt,
    lastKind: item.kind,
    lastLabel: item.label,
    lastRole: item.role,
    lastStatusText: item.statusText,
    lastScopeText: item.scopeText,
    updatedAt: item.updatedAt,
    lastError: '',
    loading: false,
  };
}
