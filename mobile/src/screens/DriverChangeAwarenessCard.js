import { Text, View } from 'react-native';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';

function recentTone(item) {
  if (item?.tone === 'danger') return 'danger';
  if (item?.tone === 'warn') return 'warn';
  if (item?.tone === 'ok') return 'ok';
  return 'info';
}

export default function DriverChangeAwarenessCard({
  voiceEnabled = false,
  driverAwareness = null,
  routeOpsBusy = false,
  onSpeakDriverAwareness,
  onAcknowledgeDriverAwareness,
  onRefresh,
}) {
  const latest = driverAwareness?.latestRelevant || null;
  const items = Array.isArray(driverAwareness?.items) ? driverAwareness.items.slice(0, 3) : [];
  const unreadCount = Number(driverAwareness?.unreadCount || 0);
  const latestId = Number(latest?.id || 0) || 0;
  const seenId = Number(driverAwareness?.lastSeenNotificationId || 0) || 0;
  const acknowledged = Boolean(latestId && seenId >= latestId);
  const latestLabel = latest ? (acknowledged ? 'Son uyarı görüldü' : 'Yeni uyarı var') : 'Sürücü uyarısı yok';

  return (
    <Card>
      <SectionTitle
        title="Sürücü değişiklik farkındalığı"
        subtitle="Yeni rota, no-show, bakım ve GPS uyarıları burada görünür. Sesli uyarı açıksa en yeni kayıt otomatik okunur."
      />
      <View style={styles.rowGap}>
        <Pill label={voiceEnabled ? 'Sesli uyarı açık' : 'Sesli uyarı kapalı'} tone={voiceEnabled ? 'ok' : 'warn'} />
        <Pill label={latestLabel} tone={unreadCount > 0 ? 'warn' : 'ok'} />
        <Pill label={latest?.tone === 'danger' ? 'Acil' : latest?.kind || latest?.type || 'DRIVER'} tone={latest?.tone || 'info'} />
      </View>

      {latest ? (
        <>
          <Info label="Son uyarı" value={latest.title || '-'} />
          <Info label="Ayrıntı" value={latest.message || '-'} />
          <Info label="Son güncelleme" value={fmt(latest.createdAt || driverAwareness?.lastFetchedAt || driverAwareness?.updatedAt)} />
          <Info label="Son okuma" value={fmt(driverAwareness?.lastAnnouncedAt)} />
          <Info label="Görüldü" value={fmt(driverAwareness?.lastSeenAt)} />
          <Text style={styles.muted}>Bu kart sürücünün telefon GPS’i, rota değişiklikleri ve operasyon uyarılarını tek yerde toplar.</Text>
        </>
      ) : (
        <EmptyState title="Sürücü uyarısı yok" text="Yeni bir kayıt geldiğinde burada görünür ve sesli uyarı olarak okunur." />
      )}

      <View style={styles.actionsRow}>
        <PrimaryButton title="Son uyarıyı oku" onPress={onSpeakDriverAwareness} disabled={routeOpsBusy || !latest || !onSpeakDriverAwareness} />
        <SecondaryButton title="Gördüm" onPress={onAcknowledgeDriverAwareness} disabled={routeOpsBusy || !latest || !onAcknowledgeDriverAwareness} />
        <SecondaryButton title="Yenile" onPress={onRefresh} disabled={routeOpsBusy || !onRefresh} />
      </View>

      {items.length ? (
        <View style={localStyles.listWrap}>
          <SectionTitle title="Son uyarılar" subtitle="En yeni kayıtlar üstte görünür." />
          {items.map((item) => (
            <View key={`${item.scope || 'DRIVER'}-${item.id}`} style={localStyles.item}>
              <View style={localStyles.itemBody}>
                <Text style={localStyles.itemTitle} numberOfLines={1}>
                  {item.title || item.kind || item.type || 'Sürücü uyarısı'}
                </Text>
                <Text style={localStyles.itemText} numberOfLines={2}>
                  {item.message || 'Ayrıntı yok'}
                </Text>
                <Text style={localStyles.itemMeta}>
                  {item.kind || item.type || 'DRIVER'} • {fmt(item.createdAt)}
                </Text>
              </View>
              <View style={localStyles.itemBadgeWrap}>
                <Pill label={item.tone === 'danger' ? 'Acil' : item.tone === 'warn' ? 'Uyarı' : item.tone === 'ok' ? 'Pozitif' : 'Bilgi'} tone={recentTone(item)} />
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
