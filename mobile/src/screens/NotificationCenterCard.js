import { Text, View } from 'react-native';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';
import { humanizeDriverUiText } from './driverUiText';

function statusTone(item) {
  const tone = String(item?.tone || '').trim().toLowerCase();
  if (tone === 'danger' || tone === 'critical') return 'critical';
  if (tone === 'warn' || tone === 'warning') return 'warning';
  if (tone === 'ok' || tone === 'success') return 'success';
  if (tone === 'passive') return 'passive';
  return 'info';
}

export default function NotificationCenterCard({
  notifications = null,
  routeOpsBusy = false,
  onMarkLatestSeen,
  onRefresh,
}) {
  const latest = notifications?.latestRelevant || null;
  const items = Array.isArray(notifications?.items) ? notifications.items.slice(0, 4) : [];
  const unreadCount = Number(notifications?.unreadCount || 0);
  const seenId = Number(notifications?.lastSeenNotificationId || 0) || 0;
  const latestId = Number(latest?.id || 0) || 0;
  const isLatestSeen = Boolean(latestId && seenId >= latestId);
  const title = notifications?.title || 'Bildirimler';
  const subtitle = notifications?.surfaceHint || 'Son bildirimler burada görünür.';
  const actionLabel = notifications?.actionLabel || 'Son bildirimi gördüm';

  return (
    <Card>
      <SectionTitle title={title} subtitle={subtitle} />
      <View style={styles.rowGap}>
        <Pill label={unreadCount > 0 ? `${unreadCount} yeni` : 'Yeni yok'} tone={unreadCount > 0 ? 'warning' : 'passive'} />
        <Pill label={isLatestSeen ? 'Son bildirim okundu' : 'Son bildirim yeni'} tone={isLatestSeen ? 'success' : 'warning'} />
        {latest ? <Pill label={humanizeDriverUiText(latest.intentLabel || latest.type || 'Bildirim', 'Bildirim')} tone={statusTone(latest)} /> : null}
      </View>

      {latest ? (
        <>
          <Info label="Son bildirim" value={latest.title || '-'} />
          <Info label="Ayrıntı" value={latest.message || '-'} />
          <Info label="Tür" value={humanizeDriverUiText(latest.intentLabel || latest.type || '-', 'Bildirim')} />
          <Info label="Son alım" value={fmt(notifications?.lastFetchedAt)} />
          <Info label="Son okuma" value={fmt(notifications?.lastSeenAt)} />
          <Text style={styles.muted}>{notifications?.summary || 'En yeni kayıtlar üstte listelenir.'}</Text>
        </>
      ) : (
        <EmptyState title={notifications?.emptyTitle || 'Gösterilecek bildirim yok'} text={notifications?.emptyText || 'Yeni kayıt geldiğinde burada görünür.'} />
      )}

      <View style={styles.actionsRow}>
        <PrimaryButton
          title={actionLabel}
          onPress={() => onMarkLatestSeen?.(latest)}
          disabled={routeOpsBusy || !latest || !onMarkLatestSeen}
        />
        <SecondaryButton title="Yenile" onPress={onRefresh} disabled={routeOpsBusy || !onRefresh} />
      </View>

      {items.length ? (
        <View style={localStyles.listWrap}>
          <SectionTitle title="Son kayıtlar" subtitle="En yeni bildirimler üstte görünür." />
          {items.map((item) => (
            <View key={`${item.scope || 'ALL'}-${item.id}`} style={localStyles.item}>
              <View style={localStyles.itemBody}>
                <Text style={localStyles.itemTitle} numberOfLines={1}>
                  {item.title || item.intentLabel || 'Bildirim'}
                </Text>
                <Text style={localStyles.itemText} numberOfLines={2}>
                  {item.message || 'Ayrıntı yok'}
                </Text>
                <Text style={localStyles.itemMeta}>
                  {humanizeDriverUiText(item.intentLabel || item.type || 'Genel', 'Genel')} • {item.scopeLabel || 'Genel'} • {fmt(item.createdAt)}
                </Text>
              </View>
              <View style={localStyles.itemBadgeWrap}>
                <Pill label={item.read ? 'Okundu' : 'Yeni'} tone={item.read ? 'success' : 'warning'} />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const localStyles = {
  listWrap: {
    gap: 10,
    marginTop: 4,
  },
  item: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  itemBody: {
    gap: 4,
  },
  itemTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  itemText: {
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  itemBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
};
