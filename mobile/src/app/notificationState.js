function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanText(value, fallback = '') {
  const text = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  return text || fallback || '';
}

function fold(text) {
  return cleanText(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .toLowerCase();
}

export const NOTIFICATION_ROLE_MESSAGES = {
  DRIVER: [
    'Yeni görev atandı.',
    'Bir yolcu bugün binmeyecek.',
    'Bir yolcu farklı duraktan binecek.',
    'Sıradaki durakta değişiklik var.',
    'Yeni onaylı biniş noktası eklendi.',
  ],
  PERSONEL: [
    'Servisiniz durağınıza yaklaştı.',
    'Servisiniz yaklaşık 500 m uzakta.',
    'Yaklaşık 2 dk kaldı.',
    'Servisiniz durağınıza ulaştı.',
    'Bugün servisi kullanmayacağınız bildirildi.',
  ],
  PARENT: [
    'Servis durağınıza yaklaştı.',
    'Servis yaklaşık 500 m uzakta.',
    'Yaklaşık 2 dk kaldı.',
    'Çocuğunuz servise bindi.',
    'Çocuğunuz okula ulaştı.',
    'Bugün öğrencinizin servise binmeyeceği bildirildi.',
  ],
  OPERATION: [
    'Yeni biniş değişikliği var.',
    'Riskli konum isteği var.',
    'Sürücü müsait oldu.',
    'Sürücü molaya çıktı.',
    'Sürücü yeni iş alabilir.',
  ],
};

const ROLE_COPY = {
  DRIVER: {
    title: 'Sürücü Bildirimleri',
    subtitle: 'Yeni görev, biniş değişikliği ve operasyon uyarıları burada toplanır.',
    emptyTitle: 'Gösterilecek sürücü bildirimi yok',
    emptyText: 'Yeni görev ya da operasyon uyarısı geldiğinde burada görünür.',
    actionLabel: 'Son bildirimi gördüm',
    summary: 'Sürücü için en yeni bildirimler burada tutulur.',
  },
  PERSONEL: {
    title: 'Personel Bildirimleri',
    subtitle: 'Servis yaklaşması, durağa varış ve bugünkü kullanım durumu burada görünür.',
    emptyTitle: 'Gösterilecek personel bildirimi yok',
    emptyText: 'Servisiniz için yeni bir kayıt geldiğinde burada görünür.',
    actionLabel: 'Son bildirimi gördüm',
    summary: 'Personel servisinizle ilgili en yeni bildirimler burada görünür.',
  },
  PARENT: {
    title: 'Veli Bildirimleri',
    subtitle: 'Servis yaklaşması, çocuğunuzun binişi ve varış bilgileri burada görünür.',
    emptyTitle: 'Gösterilecek veli bildirimi yok',
    emptyText: 'Çocuğunuzun servisi için yeni bir kayıt geldiğinde burada görünür.',
    actionLabel: 'Son bildirimi gördüm',
    summary: 'Bağlı öğrenciniz için en yeni bildirimler burada görünür.',
  },
  OPERATION: {
    title: 'Operasyon Bildirimleri',
    subtitle: 'Biniş değişikliği, riskli istek ve sürücü durumları burada toplanır.',
    emptyTitle: 'Gösterilecek operasyon bildirimi yok',
    emptyText: 'Operasyonla ilgili yeni bir kayıt geldiğinde burada görünür.',
    actionLabel: 'Son bildirimi gördüm',
    summary: 'Operasyon akışına ait en yeni bildirimler burada görünür.',
  },
  DEFAULT: {
    title: 'Bildirimler',
    subtitle: 'Rolünüze ait son bildirimler burada görünür.',
    emptyTitle: 'Gösterilecek bildirim yok',
    emptyText: 'Yeni kayıt geldiğinde burada görünür.',
    actionLabel: 'Son bildirimi gördüm',
    summary: 'En yeni kayıtlar üstte listelenir.',
  },
};

function resolveRoleKey(role) {
  const key = String(role || '').trim().toUpperCase();
  if (key === 'DRIVER' || key === 'PERSONEL' || key === 'PARENT') return key;
  if (key === 'ROOM' || key === 'COMPANY' || key === 'SUPER_ADMIN' || key === 'OPERATION') return 'OPERATION';
  return 'DEFAULT';
}

function resolveNotificationScopeLabel(scope = '') {
  switch (String(scope || '').trim().toUpperCase()) {
    case 'DRIVER':
      return 'Sürücü';
    case 'PERSONEL':
    case 'USER':
      return 'Kişisel';
    case 'PARENT':
      return 'Veli';
    case 'ROOM':
      return 'Oda';
    case 'COMPANY':
      return 'Şirket';
    default:
      return 'Genel';
  }
}

function resolveNotificationIntentLabel({ type = '', title = '', message = '', scope = '' } = {}) {
  const text = fold([type, title, message, scope].filter(Boolean).join(' '));
  if (text.includes('no show') || text.includes('binmeyecek') || text.includes('today will not board')) return 'Biniş';
  if (text.includes('farkli durak') || text.includes('farkli duraktan') || text.includes('boarding point') || text.includes('binis noktasi')) return 'Durak';
  if (text.includes('gorev') || text.includes('task') || text.includes('vardiya') || text.includes('shift')) return 'Görev';
  if (text.includes('yaklasti') || text.includes('500 m') || text.includes('2 dk') || text.includes('ulasti')) return 'Yaklaşma';
  if (text.includes('musait') || text.includes('molaya') || text.includes('yeni is alabilir') || text.includes('yeni iş alabilir')) return 'Durum';
  if (text.includes('risk') || text.includes('operasyon') || text.includes('inspection') || text.includes('alarm')) return 'Operasyon';
  return 'Genel';
}

function resolveNotificationTone({ type = '', title = '', message = '' } = {}) {
  const text = fold([type, title, message].filter(Boolean).join(' '));
  if (text.includes('kritik') || text.includes('riskli') || text.includes('uyari') || text.includes('alarm') || text.includes('acil') || text.includes('blocked')) return 'danger';
  if (text.includes('yaklasti') || text.includes('bekliyor') || text.includes('molaya') || text.includes('gecikti')) return 'warn';
  if (text.includes('bindi') || text.includes('ulasti') || text.includes('atandi') || text.includes('hazir') || text.includes('ready')) return 'ok';
  return 'info';
}

function normalizePayload(input = {}) {
  if (isPlainObject(input?.payloadJson)) return input.payloadJson;
  if (isPlainObject(input?.payload)) return input.payload;
  return {};
}

export function normalizeNotificationItem(input = {}) {
  const payload = normalizePayload(input);
  const id = positiveInt(input?.id || payload?.id);
  if (!id) return null;

  const type = cleanText(input?.type || payload?.type || payload?.kind || input?.kind || 'BİLDİRİM').toUpperCase();
  const scope = cleanText(input?.scope || payload?.scope || '').toUpperCase();
  const title = cleanText(
    input?.title ||
      payload?.title ||
      payload?.heading ||
      payload?.subject ||
      payload?.label ||
      type ||
      'Bildirim',
    'Bildirim'
  );
  const message = cleanText(
    input?.message ||
      payload?.message ||
      payload?.summary ||
      payload?.body ||
      payload?.text ||
      '',
    ''
  );
  const createdAt = cleanText(input?.createdAt || payload?.createdAt || input?.at || '');
  const dedupeKey = cleanText(input?.dedupeKey || payload?.dedupeKey || '');

  return {
    id,
    type,
    scope,
    scopeLabel: resolveNotificationScopeLabel(scope),
    title,
    message,
    createdAt,
    dedupeKey,
    intentLabel: resolveNotificationIntentLabel({ type, title, message, scope }),
    tone: resolveNotificationTone({ type, title, message }),
    read: false,
  };
}

export function getNotificationSurfaceCopy(role = 'DEFAULT') {
  return ROLE_COPY[resolveRoleKey(role)] || ROLE_COPY.DEFAULT;
}

export function buildNotificationCenterState({
  role = 'DEFAULT',
  items = [],
  lastSeenNotificationId = null,
  lastSeenAt = '',
  lastFetchedAt = '',
} = {}) {
  const copy = getNotificationSurfaceCopy(role);
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => normalizeNotificationItem(item))
        .filter(Boolean)
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    : [];
  const seenId = positiveInt(lastSeenNotificationId);
  const itemsWithReadState = normalizedItems.map((item) => ({
    ...item,
    read: Boolean(seenId && Number(item.id || 0) <= seenId),
    statusText: seenId && Number(item.id || 0) <= seenId ? 'Okundu' : 'Yeni',
  }));
  const unreadItems = itemsWithReadState.filter((item) => !item.read);

  return {
    role: resolveRoleKey(role),
    title: copy.title,
    subtitle: copy.subtitle,
    emptyTitle: copy.emptyTitle,
    emptyText: copy.emptyText,
    actionLabel: copy.actionLabel,
    summary: copy.summary,
    surfaceLabel: copy.title,
    surfaceHint: copy.subtitle,
    items: itemsWithReadState,
    unreadItems,
    unreadCount: unreadItems.length,
    hasUnread: unreadItems.length > 0,
    latestRelevant: itemsWithReadState[0] || null,
    lastSeenNotificationId: seenId,
    lastSeenAt: cleanText(lastSeenAt, ''),
    lastFetchedAt: cleanText(lastFetchedAt, ''),
  };
}

export function getLatestNotificationCenterItem(state = {}) {
  const current = buildNotificationCenterState(state);
  return current.latestRelevant || null;
}

export function markNotificationCenterSeen(state = {}, notification = null, at = new Date().toISOString()) {
  const current = buildNotificationCenterState(state);
  const target = normalizeNotificationItem(notification) || current.latestRelevant;
  if (!target?.id) return current;
  return buildNotificationCenterState({
    ...current,
    items: current.items,
    lastSeenNotificationId: target.id,
    lastSeenAt: at,
  });
}
