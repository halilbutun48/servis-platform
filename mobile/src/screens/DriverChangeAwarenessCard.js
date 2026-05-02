import { Text, View } from 'react-native';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';

function recentTone(item) {
  const tone = String(item?.tone || '').trim().toLowerCase();
  if (tone === 'danger' || tone === 'critical') return 'critical';
  if (tone === 'warn' || tone === 'warning') return 'warning';
  if (tone === 'ok' || tone === 'success') return 'success';
  if (tone === 'passive') return 'passive';
  return 'info';
}

function toneLabel(tone) {
  const t = String(tone || '').trim().toLowerCase();
  if (t === 'danger' || t === 'critical') return 'Acil';
  if (t === 'warn' || t === 'warning') return 'Uyarı';
  if (t === 'ok' || t === 'success') return 'Pozitif';
  if (t === 'passive') return 'Pasif';
  return 'Bilgi';
}

export default function DriverChangeAwarenessCard({
  voiceEnabled = false,
  driverAwareness = null,
  routeOpsBusy = false,
  onSpeakDriverAwareness,
  onAcknowledgeDriverAwareness,
  onRefresh,
  compact = false,
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
        subtitle={compact ? 'Kısa değişiklik özeti.' : 'Yeni rota, no-show, bakım ve GPS uyarıları burada görünür. Sesli uyarı açıksa en yeni kayıt otomatik okunur.'}
      />
      <View style={styles.rowGap}>
        <Pill label={voiceEnabled ? 'Sesli uyarı açık' : 'Sesli uyarı kapalı'} tone={voiceEnabled ? 'success' : 'passive'} />
        <Pill label={latestLabel} tone={unreadCount > 0 ? 'warning' : 'success'} />
        <Pill label={toneLabel(latest?.tone) === 'Bilgi' ? (latest?.kind || latest?.type || 'DRIVER') : toneLabel(latest?.tone)} tone={latest?.tone || 'info'} />
      </View>

      {latest ? (
        <>
          <Info label="Son uyarı" value={latest.title || '-'} />
          <Info label="Ayrıntı" value={latest.message || '-'} />
          {compact ? null : (
            <>
              <Info label="Son güncelleme" value={fmt(latest.createdAt || driverAwareness?.lastFetchedAt || driverAwareness?.updatedAt)} />
              <Info label="Son okuma" value={fmt(driverAwareness?.lastAnnouncedAt)} />
              <Info label="Görüldü" value={fmt(driverAwareness?.lastSeenAt)} />
              <Text style={styles.muted}>Bu kart sürücünün telefon GPS’i, rota değişiklikleri ve operasyon uyarılarını tek yerde toplar.</Text>
            </>
          )}
        </>
      ) : (
        <EmptyState title="Sürücü uyarısı yok" text="Yeni bir kayıt geldiğinde burada görünür ve sesli uyarı olarak okunur." />
      )}

      <View style={styles.actionsRow}>
        <PrimaryButton title="Son uyarıyı oku" onPress={onSpeakDriverAwareness} disabled={routeOpsBusy || !latest || !onSpeakDriverAwareness} />
        <SecondaryButton title="Gördüm" onPress={onAcknowledgeDriverAwareness} disabled={routeOpsBusy || !latest || !onAcknowledgeDriverAwareness} />
        <SecondaryButton title="Yenile" onPress={onRefresh} disabled={routeOpsBusy || !onRefresh} />
      </View>

      {!compact && items.length ? (
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
                <Pill label={toneLabel(item.tone)} tone={recentTone(item)} />
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
