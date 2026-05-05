import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { RouteMiniMapCard, StatTile } from './driverPremiumUi';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, ShiftChooser, styles } from './mobileUi';

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

function gpsToneFromText(text) {
  const value = String(text || '').trim();
  if (!value) return 'passive';
  if (value === 'GPS eski') return 'warning';
  if (value === 'GPS bekleniyor') return 'passive';
  return 'success';
}

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

export default function RoleLivePremiumCard({
  role = 'PERSONEL',
  me = null,
  roleLive = null,
  premiumSurface = null,
  premiumView = null,
  notifications = null,
  boardingChange = null,
  selectedShiftId = null,
  selectedChildId = null,
  routeOpsBusy = false,
  onRefresh,
  onSelectShift,
  onSelectChild,
  onReportNoShow,
  onRequestBoardingChange,
  onMarkNotificationsSeen,
  legacyCards = null,
  legacyLabels = null,
}) {
  const key = String(role || '').trim().toUpperCase() === 'PARENT' ? 'PARENT' : 'PERSONEL';
  const surface = premiumSurface || {};
  const view = premiumView || {};
  const current = view.current || roleLive?.current || null;
  const routeSummary = view.routeSummary || {};
  const routePreviewStops = Array.isArray(view.routePreviewStops) ? view.routePreviewStops : [];
  const heroStats = Array.isArray(view.stats) ? view.stats : [];
  const detailRows = Array.isArray(view.detailRows) ? view.detailRows : [];
  const roleTitle = surface.title || (key === 'PARENT' ? 'Öğrencimin servisi' : 'Bugünkü servis');
  const roleSubtitle = surface.subtitle || 'Servis akışı ve kritik bilgiler tek yerde.';
  const roleBadge = surface.roleLabel || (key === 'PARENT' ? 'Veli' : 'Personel');
  const gpsTone = gpsToneFromText(view.gpsText);
  const NotificationCard = legacyCards?.NotificationCenterCard || null;
  const PersonelActivation = legacyCards?.PersonelActivationCard || null;
  const ParentActivation = legacyCards?.ParentActivationCard || null;
  const LinkAccess = legacyCards?.LinkAccessCard || null;
  const KvkkMatrix = legacyCards?.KvkkVisibilityMatrixCard || null;
  const BoardingChange = legacyCards?.BoardingChangeCard || null;
  const legacySummaryTitle = legacyLabels?.operationSummaryTitle || surface.advancedSubtitle || 'Kısa operasyon özeti';
  const selectionTitle = surface.selectionTitle || (key === 'PARENT' ? 'Çocuk seçimi' : 'Servis seçimi');
  const selectionSubtitle = legacyLabels?.selectionSubtitle || surface.selectionSubtitle || '';
  const noShowLabel = surface.secondaryActionLabel || (key === 'PARENT' ? 'Bugün öğrencim servise binmeyecek' : 'Bugün servisi kullanmayacağım');
  const noShowActionEnabled = key === 'PERSONEL'
    ? Boolean(onReportNoShow)
    : Boolean(onReportNoShow && nextChildId);
  const boardingChangeLabel = surface.secondaryActionAltLabel || (key === 'PERSONEL' ? 'Farklı duraktan bineceğim' : '');
  const boardingChangeEnabled = Boolean(onRequestBoardingChange && boardingChangeLabel);
  const nextChildId = Number(selectedChildId || roleLive?.selectedChildId || current?.childId || 0) || null;
  // Personel canlı takip
  // Veli canlı takip
  // GPS güncelleme

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card style={localStyles.heroCard}>
        <View style={localStyles.heroTopRow}>
          <View style={localStyles.heroCopy}>
            <Text style={localStyles.heroEyebrow}>{roleTitle}</Text>
            <Text style={localStyles.heroTitle} numberOfLines={2}>
              {view.heroText || (key === 'PARENT' ? 'Servis yaklaşıyor' : 'Servisim yaklaşıyor')}
            </Text>
            <Text style={localStyles.heroSubtitle} numberOfLines={3}>
              {roleSubtitle}
            </Text>
          </View>
          <View style={localStyles.heroBadgeWrap}>
            <Pill label={roleBadge} tone="info" />
            <Pill label={view.statusText || 'Canlı takip'} tone={view.statusTone || 'info'} />
            {roleLive?.blocked ? <Pill label="KVKK kapalı" tone="warning" /> : null}
          </View>
        </View>

        <View style={styles.rowGap}>
          <Pill label={surface.legacySubtitle || legacyLabels?.liveTitle || 'Canlı takip'} tone="passive" />
          {view.gpsText ? <Pill label={view.gpsText} tone={gpsTone} /> : null}
        </View>

        <View style={localStyles.statsGrid}>
          {heroStats.slice(0, 3).map((item, index) => (
            <StatTile
              key={`${item.label || 'stat'}-${index}`}
              label={item.label}
              value={item.value}
              note={item.note}
              tone={item.tone || 'info'}
            />
          ))}
        </View>

        <View style={styles.actionsRow}>
          <PrimaryButton title={surface.primaryActionLabel || 'Canlı takip'} onPress={onRefresh} disabled={routeOpsBusy || !onRefresh} />
          <SecondaryButton
            title={noShowLabel}
            onPress={() => onReportNoShow?.({
              childId: key === 'PARENT' ? nextChildId : null,
              reason: noShowLabel,
            })}
            disabled={routeOpsBusy || !noShowActionEnabled}
          />
          {boardingChangeEnabled ? (
            <SecondaryButton
              title={boardingChangeLabel}
              onPress={() => onRequestBoardingChange?.({
                kind: 'DIFFERENT_STOP',
                reason: boardingChangeLabel,
              })}
              disabled={routeOpsBusy || !boardingChangeEnabled}
            />
          ) : null}
        </View>
      </Card>

      <RouteMiniMapCard
        title={surface.routePreviewTitle || 'Temsilî rota özeti'}
        subtitle={surface.routePreviewSubtitle || 'Gerçek yol ve trafik için navigasyonu açın.'}
        stops={routePreviewStops}
        nextStopId={current?.nextStop?.id || null}
        routeSummary={routeSummary}
      />

      <CollapsibleSection
        title={surface.notificationTitle || 'Bildirimler'}
        subtitle={surface.notificationSubtitle || 'Güncel bildirimler burada toplanır.'}
        summary={view.statusText || 'Bildirim özeti'}
      >
        {NotificationCard ? (
          <NotificationCard
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
        title={surface.serviceDetailsTitle || (key === 'PARENT' ? 'Öğrenci / servis detayları' : 'Servis detayları')}
        subtitle={surface.serviceDetailsSubtitle || legacyLabels?.serviceDetailsSubtitle || ''}
        summary={legacySummaryTitle}
      >
        <SectionTitle title={selectionTitle} subtitle={selectionSubtitle} />
        {key === 'PERSONEL' ? (
          <ShiftChooser
            shifts={Array.isArray(roleLive?.items) ? roleLive.items : []}
            selectedShiftId={selectedShiftId || roleLive?.selectedShiftId}
            onSelectShift={onSelectShift}
          />
        ) : (
          <ChildChooser
            children={Array.isArray(roleLive?.children) ? roleLive.children : []}
            selectedChildId={selectedChildId || roleLive?.selectedChildId}
            onSelectChild={onSelectChild}
          />
        )}

        <View style={localStyles.detailRows}>
          {detailRows.map((row) => (
            <Info key={row.label} label={row.label} value={row.value || '-'} />
          ))}
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        title={surface.advancedTitle || 'Gelişmiş durum'}
        subtitle={legacySummaryTitle}
        summary={roleLive?.blocked ? 'KVKK kapalıysa görünürlük sınırları daralır.' : 'Teknik ve operasyon kartları burada toplanır.'}
      >
        {key === 'PERSONEL' && PersonelActivation ? <PersonelActivation me={me} /> : null}
        {key === 'PARENT' && ParentActivation ? <ParentActivation roleLive={roleLive} selectedChildId={selectedChildId} /> : null}
        {LinkAccess ? <LinkAccess role={key} roleLive={roleLive} /> : null}
        {KvkkMatrix ? <KvkkMatrix role={key} roleLive={roleLive} /> : null}
        {BoardingChange ? (
          <BoardingChange
            role={key}
            current={current}
            boardingChange={boardingChange}
            routeOpsBusy={routeOpsBusy}
            onRequestBoardingChange={onRequestBoardingChange}
          />
        ) : null}
      </CollapsibleSection>

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
  detailRows: {
    gap: 8,
  },
};
