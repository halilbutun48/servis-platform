import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import NotificationCenterCard from './NotificationCenterCard';
import { StatTile } from './driverPremiumUi';
import { Card, EmptyState, Info, Pill, PrimaryButton, SectionTitle, fmt, isStale, styles } from './mobileUi';
import { resolveMobileRolePremiumSurface } from '../lib/roleSurface';

function CollapsibleSection({
  title,
  subtitle,
  summary = '',
  tone = 'info',
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <Card style={localStyles.sectionCard}>
      <Pressable onPress={() => setOpen((prev) => !prev)} style={localStyles.sectionHeader}>
        <View style={localStyles.sectionHeaderCopy}>
          <SectionTitle title={title} subtitle={subtitle} />
          {summary ? <Text style={localStyles.sectionSummary}>{summary}</Text> : null}
        </View>
        <Pill label={open ? 'Gizle' : 'Aç'} tone={open ? 'passive' : tone} />
      </Pressable>
      {open ? <View style={localStyles.sectionBody}>{children}</View> : null}
    </Card>
  );
}

function countText(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return String(n);
  return '-';
}

function freshnessText(value) {
  if (!value) return 'GPS bekleniyor';
  if (isStale(value)) return 'GPS eski';
  return 'Güncel';
}

function freshnessTone(value) {
  if (value === 'GPS eski') return 'warning';
  if (value === 'GPS bekleniyor') return 'passive';
  return 'success';
}

function buildOverviewStats(key, surface, summary, notifications, lastSyncAt, blocked) {
  const unreadCount = Number(notifications?.unreadCount || 0);
  const hasUnread = Boolean(notifications?.hasUnread || unreadCount > 0);
  const labels = Array.isArray(surface?.statLabels) ? surface.statLabels : [];

  if (key === 'SCHOOL') {
    return [
      {
        label: labels[0] || 'Bugünkü servisler',
        value: countText(summary?.totalShifts ?? summary?.activeShifts),
        note: 'Okul görünümü',
        tone: 'dark',
      },
      {
        label: labels[1] || 'Canlı takip',
        value: countText(summary?.liveVehicles),
        note: 'Anlık görünüm',
        tone: 'info',
      },
      {
        label: labels[2] || 'Bildirimler',
        value: blocked ? 'Kısıtlı' : hasUnread ? `${unreadCount} yeni` : 'Yok',
        note: blocked ? 'Görünürlük sınırlı' : 'Yeni uyarılar',
        tone: blocked ? 'warning' : hasUnread ? 'warning' : 'success',
      },
    ];
  }

  if (key === 'ROOM' || key === 'OPERATION') {
    const totalShifts = Number(summary?.totalShifts ?? summary?.activeShifts ?? 0);
    const activeShifts = Number(summary?.activeShifts ?? 0);
    const completed = summary?.totalShifts != null && summary?.activeShifts != null
      ? Math.max(totalShifts - activeShifts, 0)
      : null;
    const gps = freshnessText(lastSyncAt);

    return [
      {
        label: labels[0] || 'Aktif araç',
        value: countText(summary?.liveVehicles),
        note: 'Canlı görünüm',
        tone: 'dark',
      },
      {
        label: labels[1] || 'Bugünkü görev',
        value: countText(summary?.totalShifts ?? summary?.activeShifts),
        note: 'Planlanan akış',
        tone: 'info',
      },
      {
        label: labels[2] || 'Tamamlanan servis',
        value: completed != null ? String(completed) : '-',
        note: 'Bugün',
        tone: 'success',
      },
      {
        label: labels[3] || 'GPS durumu',
        value: gps,
        note: blocked ? 'Görünürlük sınırlı' : 'Son yenileme',
        tone: freshnessTone(gps),
      },
    ];
  }

  if (key === 'SUPER_ADMIN') {
    return [
      {
        label: labels[0] || 'Aktif servisler',
        value: countText(summary?.activeShifts ?? summary?.totalShifts),
        note: 'Genel görünüm',
        tone: 'dark',
      },
      {
        label: labels[1] || 'Canlı araçlar',
        value: countText(summary?.liveVehicles),
        note: 'Anlık izleme',
        tone: 'info',
      },
      {
        label: labels[2] || 'Bildirimler',
        value: blocked ? 'Kısıtlı' : hasUnread ? `${unreadCount} yeni` : 'Yok',
        note: blocked ? 'Görünürlük sınırlı' : 'Genel akış',
        tone: blocked ? 'warning' : hasUnread ? 'warning' : 'success',
      },
    ];
  }

  return [
    {
      label: labels[0] || 'Bugünkü aktif servisler',
      value: countText(summary?.activeShifts ?? summary?.totalShifts),
      note: 'Kısa görünüm',
      tone: 'dark',
    },
    {
      label: labels[1] || 'Canlı izlenen araçlar',
      value: countText(summary?.liveVehicles),
      note: 'Anlık izleme',
      tone: 'info',
    },
    {
      label: labels[2] || 'Dikkat gerektiren durum',
      value: blocked ? 'Kısıtlı' : hasUnread ? `${unreadCount} yeni` : 'Yok',
      note: blocked ? 'Görünürlük sınırlı' : 'Genel akış',
      tone: blocked ? 'warning' : hasUnread ? 'info' : 'success',
    },
  ];
}

export default function RoleOverviewPremiumCard({
  role = 'COMPANY',
  me = null,
  roleLive = null,
  notifications = null,
  health = null,
  releaseInfo = null,
  lastSyncAt = '',
  routeOpsBusy = false,
  onRefresh,
  onMarkNotificationsSeen,
}) {
  const surface = resolveMobileRolePremiumSurface(role, me?.companyKind);
  const key = String(surface?.key || role || '').trim().toUpperCase();
  const summary = roleLive?.summary || null;
  const blocked = Boolean(roleLive?.blocked);
  const unreadCount = Number(notifications?.unreadCount || 0);
  const hasUnread = Boolean(notifications?.hasUnread || unreadCount > 0);
  const statusText = blocked
    ? 'Görünürlük sınırlı'
    : hasUnread
      ? `${unreadCount || 1} yeni bildirim`
      : 'Özet hazır';
  const statusTone = blocked ? 'warning' : hasUnread ? 'info' : 'success';
  const stats = buildOverviewStats(key, surface, summary, notifications, lastSyncAt || roleLive?.lastSyncAt || '', blocked);
  const detailRows = [
    { label: 'Son güncelleme', value: fmt(lastSyncAt || roleLive?.lastSyncAt || '') },
    { label: 'Sistem', value: health?.ok ? 'Hazır' : 'Dikkat' },
    { label: 'Görünürlük', value: blocked ? 'Daraltıldı' : 'Açık' },
    { label: 'Yayın özeti', value: releaseInfo?.acceptanceSummary || 'Hazır' },
  ];

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card style={localStyles.heroCard}>
        <View style={localStyles.heroTopRow}>
          <View style={localStyles.heroCopy}>
            <Text style={localStyles.heroEyebrow}>{surface.roleLabel || 'Özet'}</Text>
            <Text style={localStyles.heroTitle} numberOfLines={2}>
              {surface.title || 'Özet'}
            </Text>
            <Text style={localStyles.heroSubtitle} numberOfLines={3}>
              {surface.subtitle || 'Mobilde hafif özet görünür.'}
            </Text>
          </View>
          <View style={localStyles.heroBadgeWrap}>
            <Pill label={surface.roleLabel || 'Özet'} tone="info" />
            <Pill label={statusText} tone={statusTone} />
          </View>
        </View>

        <View style={styles.rowGap}>
          <Pill label={surface.primaryActionLabel || 'Web paneli aç'} tone="passive" />
        </View>

        <View style={localStyles.statsGrid}>
          {stats.slice(0, key === 'ROOM' || key === 'OPERATION' ? 4 : 3).map((item, index) => (
            <StatTile
              key={`${item.label || 'stat'}-${index}`}
              label={item.label}
              value={item.value}
              note={item.note}
              tone={item.tone || 'info'}
            />
          ))}
        </View>

        <Text style={styles.muted}>{surface.note || 'Mobilde yalnızca hafif özet görünür.'}</Text>
      </Card>

      <Card style={localStyles.panelCard}>
        <SectionTitle
          title="Web paneli"
          subtitle={surface.webPanelNote || 'Detaylı yönetim için web panelden devam edin.'}
        />
        <Info
          label="Not"
          value={surface.webPanelNote || 'Detaylı yönetim için web panelden devam edin.'}
        />
        <View style={styles.actionsRow}>
          <PrimaryButton
            title={surface.primaryActionLabel || 'Web paneli aç'}
            onPress={onRefresh}
            disabled={routeOpsBusy || !onRefresh}
          />
        </View>
      </Card>

      <CollapsibleSection
        title={surface.notificationTitle || 'Bildirimler'}
        subtitle={surface.notificationSubtitle || 'Güncel uyarılar burada toplanır.'}
        summary={hasUnread ? `${unreadCount} yeni bildirim` : 'Bildirim özeti'}
      >
        {notifications ? (
          <NotificationCenterCard
            notifications={notifications}
            routeOpsBusy={routeOpsBusy}
            onMarkLatestSeen={onMarkNotificationsSeen}
            onRefresh={onRefresh}
            compact
          />
        ) : (
          <EmptyState title="Bildirimler hazır değil" text="Bildirim kartı yüklenemedi." />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={surface.advancedTitle || 'Gelişmiş durum'}
        subtitle={surface.advancedSubtitle || 'Detaylı yönetim web panelde açılır.'}
        summary={blocked ? 'Görünürlük sınırlı.' : 'Mobil özet hazır.'}
      >
        <View style={localStyles.detailRows}>
          {detailRows.map((row) => (
            <Info key={row.label} label={row.label} value={row.value || '-'} />
          ))}
        </View>
      </CollapsibleSection>
    </ScrollView>
  );
}

const localStyles = {
  heroCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroSubtitle: {
    color: '#dbeafe',
    lineHeight: 20,
  },
  heroBadgeWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  panelCard: {
    gap: 10,
  },
  sectionCard: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionSummary: {
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
  },
  sectionBody: {
    gap: 12,
  },
  detailRows: {
    gap: 8,
  },
};
