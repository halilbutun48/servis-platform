function asPositiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parsePayloadJson(payloadJson) {
  if (!payloadJson) return null;
  if (typeof payloadJson === 'object') return payloadJson;
  if (typeof payloadJson !== 'string') return null;

  try {
    const parsed = JSON.parse(payloadJson);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function toneFromNotification(type, title, message) {
  const text = normalizeText([type, title, message].filter(Boolean).join(' '));
  if (!text) return 'info';
  if (text.includes('offline') || text.includes('ariza') || text.includes('risk') || text.includes('onay bekliyor')) {
    return 'danger';
  }
  if (text.includes('stale') || text.includes('gecikti') || text.includes('yaklasti') || text.includes('degisti') || text.includes('reassign') || text.includes('mola') || text.includes('musait')) {
    return 'warn';
  }
  if (text.includes('recovery') || text.includes('geri geldi') || text.includes('bindi') || text.includes('ulasti') || text.includes('yaklasiyor')) {
    return 'ok';
  }
  return 'info';
}

function buildSpokenText(title, message) {
  const parts = ['Sürücü uyarısı.'];
  if (title) parts.push(title.trim().replace(/\.+$/, '') + '.');
  if (message) parts.push(message.trim());
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function normalizeDriverAwarenessNotification(input = {}) {
  const payload = parsePayloadJson(input?.payloadJson) || parsePayloadJson(input?.payload) || null;
  const scope = String(input?.scope || '').trim().toUpperCase();
  if (scope !== 'DRIVER') return null;

  const type = String(input?.type || payload?.kind || payload?.type || '').trim().toUpperCase();
  const title = String(payload?.title || input?.title || type || 'Sürücü uyarısı').trim() || 'Sürücü uyarısı';
  const message = String(payload?.message || input?.message || '').trim();
  const kind = String(payload?.kind || input?.kind || input?.type || '').trim();
  const createdAt = String(input?.createdAt || payload?.at || payload?.createdAt || '').trim();
  const id = asPositiveInt(input?.id);
  const spokenText = buildSpokenText(title, message);

  return {
    id,
    type,
    scope,
    title,
    message,
    kind,
    createdAt,
    spokenText,
    summary: message ? `${title}: ${message}` : title,
    tone: toneFromNotification(type, title, message),
  };
}

export function buildDriverAwarenessState({
  items = [],
  lastSeenNotificationId = null,
  lastAnnouncedNotificationId = null,
  lastSeenAt = '',
  lastAnnouncedAt = '',
  lastFetchedAt = '',
  updatedAt = '',
} = {}) {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => normalizeDriverAwarenessNotification(item))
        .filter((item) => Boolean(item?.id))
        .sort((a, b) => b.id - a.id || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    : [];

  const latestRelevant = normalizedItems[0] || null;
  const seenId = asPositiveInt(lastSeenNotificationId);
  const announcedId = asPositiveInt(lastAnnouncedNotificationId);
  const unreadItems = seenId ? normalizedItems.filter((item) => item.id > seenId) : normalizedItems;
  const latestRelevantId = latestRelevant?.id ?? null;

  return {
    items: normalizedItems,
    latestRelevant,
    latestRelevantId,
    unreadCount: unreadItems.length,
    hasUnread: unreadItems.length > 0,
    lastSeenNotificationId: seenId,
    lastAnnouncedNotificationId: announcedId,
    lastSeenAt: String(lastSeenAt || ''),
    lastAnnouncedAt: String(lastAnnouncedAt || ''),
    lastFetchedAt: String(lastFetchedAt || ''),
    updatedAt: String(updatedAt || lastFetchedAt || ''),
  };
}

export function getLatestDriverAwarenessNotification(state = {}) {
  return buildDriverAwarenessState(state).latestRelevant;
}

export function markDriverAwarenessSeen(state = {}, notification = null, at = new Date().toISOString()) {
  const current = buildDriverAwarenessState(state);
  const target = normalizeDriverAwarenessNotification(notification) || current.latestRelevant;
  if (!target?.id) return current;

  return buildDriverAwarenessState({
    ...current,
    items: current.items,
    lastSeenNotificationId: target.id,
    lastSeenAt: at,
    lastAnnouncedNotificationId: target.id,
    lastAnnouncedAt: at,
    updatedAt: at,
  });
}

export function markDriverAwarenessAnnounced(state = {}, notification = null, at = new Date().toISOString()) {
  const current = buildDriverAwarenessState(state);
  const target = normalizeDriverAwarenessNotification(notification) || current.latestRelevant;
  if (!target?.id) return current;

  return buildDriverAwarenessState({
    ...current,
    items: current.items,
    lastAnnouncedNotificationId: target.id,
    lastAnnouncedAt: at,
    updatedAt: at,
  });
}
