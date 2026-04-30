import { Pressable, ScrollView, Text, View } from 'react-native';
import BoardingChangeCard from './BoardingChangeCard';
import NotificationCenterCard from './NotificationCenterCard';
import PersonelActivationCard from './PersonelActivationCard';
import ParentActivationCard from './ParentActivationCard';
import LinkAccessCard from './LinkAccessCard';
import KvkkVisibilityMatrixCard from './KvkkVisibilityMatrixCard';
import { Card, EmptyState, Info, Pill, PrimaryButton, RoutePreviewList, SecondaryButton, SectionTitle, ShiftChooser, fmt, styles } from './mobileUi';

const ROLE_COPY = {
  PERSONEL: {
    roleLabel: 'Personel',
    title: 'Personel Canlı Takip',
    subtitle: 'Bağlı servisinizin canlı durumu, sıradaki durak ve ETA bu ekranda görünür.',
    emptyTitle: 'Bugün size atanmış servis bulunmuyor.',
    emptyText: 'Canlı personel takip akışı, bağlı ve aktif servis olduğunda görünür.',
    actionLabel: 'Bugün servisi kullanmayacağım',
    actionNote: 'Bu bildirim operasyon ekibine düşer ve kayıt altına alınır.',
  },
  PARENT: {
    roleLabel: 'Veli',
    title: 'Veli Canlı Takip',
    subtitle: 'Bağlı öğrencinizin servisi, sıradaki durak ve ETA bu ekranda görünür.',
    emptyTitle: 'Bugün öğrenciniz için aktif servis bulunmuyor.',
    emptyText: 'Canlı veli takip akışı, bağlı öğrenci için aktif servis olduğunda görünür.',
    actionLabel: 'Bugün öğrencim servise binmeyecek',
    actionNote: 'Bu bildirim operasyon ekibine düşer ve kayıt altına alınır.',
  },
};

function releaseTone(releaseInfo) {
  if (releaseInfo?.acceptanceBlocking) return 'danger';
  if (Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length) return 'warn';
  return 'ok';
}

function statusTone(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'ACTIVE' || key === 'LIVE' || key === 'OK') return 'ok';
  if (key === 'APPROVED' || key === 'READY') return 'info';
  if (key === 'BLOCKED' || key === 'OFFLINE' || key === 'ENDED') return 'warn';
  return 'info';
}

function ChildChooser({ children = [], selectedChildId, onSelectChild }) {
  if (!Array.isArray(children) || !children.length) return null;
  return (
    <View style={localStyles.chooserWrap}>
      {children.map((child) => {
        const childId = Number(child?.id || 0) || null;
        if (!childId) return null;
        const active = childId === Number(selectedChildId || 0);
        const companyName = String(child?.company?.name || child?.companyName || '-').trim() || '-';
        return (
          <Pressable
            key={childId}
            style={[localStyles.chooserChip, active ? localStyles.chooserChipActive : null]}
            onPress={() => onSelectChild?.(childId)}
          >
            <Text style={[localStyles.chooserTitle, active ? localStyles.chooserTitleActive : null]} numberOfLines={1}>
              {child?.fullName || `#${childId}`}
            </Text>
            <Text style={[localStyles.chooserMeta, active ? localStyles.chooserMetaActive : null]} numberOfLines={1}>
              {companyName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LiveDetailRows({ role, current }) {
  if (!current) return null;
  const key = String(role || '').trim().toUpperCase();
  const rows = key === 'PARENT'
    ? [
        ['Öğrenci', current.childName || '-'],
        ['Servis', current.vehiclePlate || '-'],
        ['Sıradaki durak', current.nextStop?.name || '-'],
        ['Durağa ETA', current.etaMin != null ? `${current.etaMin} dk` : '-'],
        ['Durağa mesafe', current.etaKm != null ? `${current.etaKm} km` : '-'],
        ['Kalan durak', current.remainingStopsToChild != null ? String(current.remainingStopsToChild) : '-'],
        ['Çocuk durak durumu', current.childStopReached ? 'Servise bindi' : 'Bekleniyor'],
        ['GPS güncelleme', fmt(current.gpsAt)],
      ]
    : [
        ['Servis', current.vehiclePlate || '-'],
        ['Sürücü', current.driverName || '-'],
        ['Rota', current.roomName || '-'],
        ['Sıradaki durak', current.nextStop?.name || '-'],
        ['Durağa ETA', current.etaMin != null ? `${current.etaMin} dk` : '-'],
        ['Durağa mesafe', current.etaKm != null ? `${current.etaKm} km` : '-'],
        ['Kalan durak', current.remainingStops != null ? String(current.remainingStops) : '-'],
        ['GPS güncelleme', fmt(current.gpsAt)],
      ];

  return rows.map(([label, value]) => <Info key={label} label={label} value={value || '-'} />);
}

export default function RoleHomeScreen({
  role = 'PERSONEL',
  me = null,
  health = null,
  deviceId = '',
  apiBaseUrl = '',
  lastSyncAt = '',
  routeOpsBusy = false,
  routeOpsText = '',
  releaseInfo = null,
  roleLive = null,
  boardingChange = null,
  notifications = null,
  selectedShiftId = null,
  selectedChildId = null,
  onRefresh,
  onLogout,
  onSelectShift,
  onSelectChild,
  onReportNoShow,
  onRequestBoardingChange,
  onMarkNotificationsSeen,
}) {
  const key = String(role || '').trim().toUpperCase();
  const copy = ROLE_COPY[key] || ROLE_COPY.PERSONEL;
  const fullName = String(me?.fullName || me?.name || me?.displayName || '-').trim() || '-';
  const healthLabel = health?.ok ? 'UP' : String(health?.status || '-').toUpperCase();
  const current = roleLive?.current || null;
  const items = key === 'PARENT' ? (roleLive?.children || []) : (roleLive?.items || []);
  const actionBusy = Boolean(routeOpsBusy || roleLive?.loading || boardingChange?.loading);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${copy.roleLabel}`} tone="ok" />
          <Pill label={`Sağlık: ${healthLabel}`} tone={health?.ok ? 'ok' : 'warn'} />
          <Pill label={releaseInfo?.acceptanceStatusText || 'READY'} tone={releaseTone(releaseInfo)} />
          {current ? <Pill label={current.statusText || 'Canlı'} tone={statusTone(current.gpsStatus || current.statusText)} /> : null}
        </View>
        {routeOpsText ? <Text style={styles.helper}>{routeOpsText}</Text> : null}
      </Card>

      <Card>
        <SectionTitle title="Oturum özeti" subtitle="Bu ekran giriş ve rol ayrımı için hazır. Canlı servis verisi role göre yüklenir." />
        <Info label="Ad / kullanıcı" value={fullName} />
        <Info label="Rol" value={copy.roleLabel} />
        <Info label="Cihaz" value={deviceId || '-'} />
        <Info label="API" value={apiBaseUrl || '-'} />
        <Info label="Son senkron" value={fmt(lastSyncAt)} />
        <Info label="Release özeti" value={releaseInfo?.acceptanceSummary || '-'} />
      </Card>

      {key === 'PERSONEL' ? <PersonelActivationCard me={me} /> : null}

      {key === 'PARENT' ? (
        <ParentActivationCard roleLive={roleLive} selectedChildId={selectedChildId} />
      ) : null}

      {(key === 'PERSONEL' || key === 'PARENT') ? (
        <LinkAccessCard role={key} roleLive={roleLive} />
      ) : null}

      {(key === 'PERSONEL' || key === 'PARENT') ? (
        <KvkkVisibilityMatrixCard role={key} roleLive={roleLive} />
      ) : null}

      <NotificationCenterCard
        notifications={notifications}
        routeOpsBusy={actionBusy}
        onMarkLatestSeen={onMarkNotificationsSeen}
        onRefresh={onRefresh}
      />

      {key === 'PERSONEL' && items.length ? (
        <Card>
          <SectionTitle title="Servis seçimi" subtitle="Bugün size atanmış servislerden birini seçin." />
          <ShiftChooser shifts={items} selectedShiftId={selectedShiftId || roleLive?.selectedShiftId} onSelectShift={onSelectShift} />
        </Card>
      ) : null}

      {key === 'PARENT' && items.length ? (
        <Card>
          <SectionTitle title="Çocuk seçimi" subtitle="Takip etmek istediğiniz öğrenciyi seçin." />
          <ChildChooser children={items} selectedChildId={selectedChildId || roleLive?.selectedChildId} onSelectChild={onSelectChild} />
        </Card>
      ) : null}

      <Card>
        <SectionTitle
          title={key === 'PARENT' ? 'Veli canlı takip' : 'Personel canlı takip'}
          subtitle={key === 'PARENT'
            ? 'Çocuğunuzun servisi, yaklaşma durumu ve durak ilerlemesi burada görünür.'
            : 'Bağlı servisinizin yaklaşma durumu ve durak ilerlemesi burada görünür.'}
        />
        {routeOpsText && key !== 'PARENT' ? <Text style={styles.helper}>{routeOpsText}</Text> : null}
        {roleLive?.blocked ? <Pill label="KVKK engeli" tone="warn" /> : null}
        {current ? (
          <>
            <View style={styles.rowGap}>
              <Pill label={current.statusText || 'Canlı'} tone={statusTone(current.gpsStatus || current.statusText)} />
              <Pill label={current.gpsStatus || 'UNKNOWN'} tone={current.gpsStatus === 'LIVE' ? 'ok' : current.gpsStatus === 'STALE' ? 'warn' : 'info'} />
              {current.vehiclePlate ? <Pill label={`Araç: ${current.vehiclePlate}`} tone="info" /> : null}
            </View>
            <Info label="Durum" value={current.primaryText || '-'} />
            <Info label="Açıklama" value={current.secondaryText || '-'} />
            <LiveDetailRows role={key} current={current} />
            <Info label="Son senkron" value={fmt(roleLive?.lastSyncAt || lastSyncAt)} />
            <Info label="Ağ durumu" value={roleLive?.netStatus || 'unknown'} />
            {Array.isArray(current.routePreviewStops) && current.routePreviewStops.length ? (
              <RoutePreviewList stops={current.routePreviewStops.slice(0, 8)} />
            ) : (
              <EmptyState title="Durak verisi görünmüyor" text="Canlı takip için rota henüz hazırlanmadı." />
            )}
          </>
        ) : (
          <EmptyState title={copy.emptyTitle} text={copy.emptyText} />
        )}

        <View style={styles.actionsRow}>
          <PrimaryButton title="Yenile" onPress={onRefresh} disabled={actionBusy} />
          {onReportNoShow && current ? (
            <SecondaryButton
              title={copy.actionLabel}
              onPress={() => onReportNoShow({
                childId: key === 'PARENT' ? selectedChildId || roleLive?.selectedChildId || current.childId || null : null,
                reason: copy.actionLabel,
              })}
              disabled={actionBusy}
            />
          ) : null}
          <SecondaryButton title="Güvenli çıkış" onPress={onLogout} disabled={actionBusy} />
        </View>
        {copy.actionNote ? <Text style={styles.muted}>{copy.actionNote}</Text> : null}
      </Card>

      <BoardingChangeCard
        role={key}
        current={current}
        boardingChange={boardingChange}
        routeOpsBusy={actionBusy}
        onRequestBoardingChange={onRequestBoardingChange}
      />

      <Card>
        <SectionTitle title="Hızlı özet" subtitle="Canlı servis bilgisi ve çevrim içi durum." />
        <Info label="Sağlık" value={healthLabel} />
        <Info label="Son senkron" value={fmt(lastSyncAt)} />
        <Info label="API" value={apiBaseUrl || '-'} />
        <Info label="Release özeti" value={releaseInfo?.acceptanceSummary || '-'} />
        {Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? (
          <Text style={styles.muted}>{releaseInfo.acceptanceWarnings.join(' • ')}</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const localStyles = {
  chooserWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chooserChip: {
    minWidth: 120,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    gap: 2,
  },
  chooserChipActive: {
    backgroundColor: '#1d4ed8',
  },
  chooserTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  chooserTitleActive: {
    color: '#fff',
  },
  chooserMeta: {
    color: '#475569',
    fontSize: 12,
  },
  chooserMetaActive: {
    color: '#dbeafe',
  },
};
