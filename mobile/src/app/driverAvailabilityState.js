const DRIVER_AVAILABILITY_ORDER = [
  'DRIVING',
  'BREAK',
  'AVAILABLE',
  'READY_FOR_JOB',
  'NOT_AVAILABLE',
  'CLOSED_TODAY',
];

const DRIVER_AVAILABILITY_META = {
  DRIVING: {
    label: 'Görevdeyim',
    description: 'Aktif vardiya içindeyim.',
    tone: 'ok',
  },
  BREAK: {
    label: 'Moladayım',
    description: 'Kısa mola durumundayım.',
    tone: 'warn',
  },
  AVAILABLE: {
    label: 'Müsaitim',
    description: 'Yeni iş almaya hazırım.',
    tone: 'ok',
  },
  READY_FOR_JOB: {
    label: 'Yeni iş alabilirim',
    description: 'Yeni iş önerilerine açığım.',
    tone: 'info',
  },
  NOT_AVAILABLE: {
    label: 'Yeni iş istemiyorum',
    description: 'Bugün yeni iş istemiyorum.',
    tone: 'danger',
  },
  CLOSED_TODAY: {
    label: 'Bugünlük kapat',
    description: 'Bugün için kapattım.',
    tone: 'danger',
  },
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeDriverAvailabilityMode(value) {
  const raw = normalizeText(value?.mode || value);
  if (!raw) return 'DRIVING';

  switch (raw) {
    case 'gorevdeyim':
    case 'driving':
      return 'DRIVING';
    case 'moladayim':
    case 'break':
    case 'paused':
      return 'BREAK';
    case 'musaitim':
    case 'available':
      return 'AVAILABLE';
    case 'yeni is alabilirim':
    case 'ready_for_job':
    case 'ready for job':
    case 'ready':
      return 'READY_FOR_JOB';
    case 'yeni is istemiyorum':
    case 'not_available':
    case 'not available':
      return 'NOT_AVAILABLE';
    case 'bugunluk kapat':
    case 'bugunluk_kapat':
    case 'closed_today':
    case 'closed today':
      return 'CLOSED_TODAY';
    default:
      return DRIVER_AVAILABILITY_ORDER.includes(raw.toUpperCase()) ? raw.toUpperCase() : 'DRIVING';
  }
}

export function buildDriverAvailabilityState(input = {}) {
  const mode = normalizeDriverAvailabilityMode(input);
  const meta = DRIVER_AVAILABILITY_META[mode] || DRIVER_AVAILABILITY_META.DRIVING;

  return {
    mode,
    label: meta.label,
    description: meta.description,
    tone: meta.tone,
    updatedAt: String(input?.updatedAt || ''),
    sourceText: String(input?.sourceText || 'Cihazda saklanır.'),
    updatedBy: String(input?.updatedBy || 'driver'),
  };
}

export function listDriverAvailabilityModes() {
  return DRIVER_AVAILABILITY_ORDER.map((mode) => ({
    mode,
    ...DRIVER_AVAILABILITY_META[mode],
  }));
}
