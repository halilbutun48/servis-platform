import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, TopTabs, fmt, styles } from './mobileUi';
import { humanizeDriverUiText } from './driverUiText';

const COLORS = {
  navy: '#0f172a',
  navySoft: '#1e293b',
  sky: '#dbeafe',
  skySoft: '#eff6ff',
  border: '#dbeafe',
  blue: '#1d4ed8',
  blueSoft: '#dbeafe',
  text: '#0f172a',
  muted: '#475569',
  line: '#cbd5e1',
  green: '#047857',
  greenSoft: '#ecfdf5',
  amber: '#c2410c',
  amberSoft: '#fff7ed',
  red: '#b91c1c',
  redSoft: '#fef2f2',
};

function screenMeta(screen) {
  const key = String(screen || 'today').trim().toLowerCase();
  if (key === 'route') {
    return {
      title: 'Rota',
      subtitle: 'Rota sırası ve navigasyon burada.',
    };
  }
  if (key === 'live') {
    return {
      title: 'Canlı',
      subtitle: "GPS ve konum paylaşımı burada.",
    };
  }
  return {
    title: 'Bugün',
    subtitle: 'Bugünkü görev ve hızlı işlemler burada.',
  };
}

function toneToCardStyle(tone) {
  const key = String(tone || 'info').trim().toLowerCase();
  if (key === 'success' || key === 'ok') return localStyles.statTileSuccess;
  if (key === 'warning' || key === 'warn') return localStyles.statTileWarn;
  if (key === 'danger' || key === 'critical') return localStyles.statTileDanger;
  if (key === 'dark') return localStyles.statTileDark;
  return localStyles.statTileInfo;
}

function toneToTextStyle(tone) {
  const key = String(tone || 'info').trim().toLowerCase();
  if (key === 'success' || key === 'ok') return localStyles.statValueSuccess;
  if (key === 'warning' || key === 'warn') return localStyles.statValueWarn;
  if (key === 'danger' || key === 'critical') return localStyles.statValueDanger;
  if (key === 'dark') return localStyles.statValueDark;
  return localStyles.statValueInfo;
}

function ShellIcon({ symbol, onPress = null, passive = false }) {
  const node = (
    <View style={[localStyles.shellIcon, passive ? localStyles.shellIconPassive : null]}>
      <Text style={[localStyles.shellIconText, passive ? localStyles.shellIconTextPassive : null]}>
        {symbol}
      </Text>
    </View>
  );

  if (!onPress) return node;

  return (
    <Pressable onPress={onPress} style={localStyles.shellIconPressable}>
      {node}
    </Pressable>
  );
}

export function StatTile({ label, value, note = '', tone = 'info' }) {
  return (
    <View style={[localStyles.statTile, toneToCardStyle(tone)]}>
      <Text style={[localStyles.statLabel, tone === 'dark' ? localStyles.statLabelDark : null]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[localStyles.statValue, toneToTextStyle(tone)]} numberOfLines={1}>
        {value || '-'}
      </Text>
      {note ? (
        <Text style={[localStyles.statNote, tone === 'dark' ? localStyles.statNoteDark : null]} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function QuickActionsGrid({ actions = [] }) {
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean).slice(0, 4) : [];
  if (!safeActions.length) return null;
  return (
    <View style={localStyles.quickGrid}>
      {safeActions.map((action, index) => {
        const disabled = Boolean(action?.disabled);
        const tone = String(action?.tone || '').trim().toLowerCase();
        return (
          <Pressable
            key={`${action?.title || 'action'}-${index}`}
            onPress={action?.onPress}
            disabled={disabled || !action?.onPress}
            style={[
              localStyles.quickTile,
              action?.active ? localStyles.quickTileActive : null,
              tone === 'dark' ? localStyles.quickTileDark : null,
              tone === 'success' ? localStyles.quickTileSuccess : null,
              tone === 'warning' ? localStyles.quickTileWarning : null,
              tone === 'danger' ? localStyles.quickTileDanger : null,
              disabled ? localStyles.quickTileDisabled : null,
            ]}
          >
            <Text
              style={[
                localStyles.quickTitle,
                action?.active ? localStyles.quickTitleActive : null,
                tone === 'dark' ? localStyles.quickTitleDark : null,
              ]}
              numberOfLines={2}
            >
              {action?.title || 'İşlem'}
            </Text>
            <Text
              style={[
                localStyles.quickSubtitle,
                action?.active ? localStyles.quickSubtitleActive : null,
                tone === 'dark' ? localStyles.quickSubtitleDark : null,
              ]}
              numberOfLines={2}
            >
              {action?.subtitle || 'Hızlı eylem'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HeroShiftCard({
  title = 'Bugünkü Vardiya',
  subtitle = 'Bugünün rotası, görev ilerlemesi ve kısa özet tek kartta.',
  activeShift = null,
  routeSummary = {},
  nextStop = null,
  stats = [],
  statusLabel = '',
  statusTone = 'info',
  footer = '',
}) {
  const shiftLabel = activeShift ? `#${activeShift.id} • ${humanizeDriverUiText(activeShift.status || '-', 'Bilinmiyor')}` : 'Görev yok';
  const statusText = statusLabel || (routeSummary.completed ? 'Tamamlandı' : routeSummary.paused ? 'Duraklatıldı' : activeShift ? 'Hazır' : 'Bekliyor');
  const derivedStats = useMemo(() => {
    if (Array.isArray(stats) && stats.length) return stats;
    return [
      { label: 'Sıradaki durak', value: nextStop?.name || '-', note: nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '', tone: 'info' },
      { label: 'Kalan km', value: routeSummary.remainingKm != null ? `${routeSummary.remainingKm} km` : '-', note: 'Güncel rota', tone: 'success' },
      { label: 'Kalan durak', value: routeSummary.remainingStops != null ? String(routeSummary.remainingStops) : '-', note: 'Yol akışı', tone: 'warning' },
      { label: 'Kalan yolcu', value: routeSummary.remainingPassengers != null ? String(routeSummary.remainingPassengers) : '-', note: 'Dolu/boş' },
    ];
  }, [nextStop?.etaMin, nextStop?.name, routeSummary.remainingKm, routeSummary.remainingPassengers, routeSummary.remainingStops, routeSummary.completed, routeSummary.paused, stats]);

  return (
    <Card style={localStyles.heroCard}>
      <View style={localStyles.heroTopRow}>
        <View style={localStyles.heroCopy}>
          <Text style={localStyles.heroEyebrow}>{title}</Text>
          <Text style={localStyles.heroTitle} numberOfLines={2}>
            {shiftLabel}
          </Text>
          <Text style={localStyles.heroSubtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        </View>
        <View style={localStyles.heroBadgeWrap}>
          <Pill label={statusText} tone={statusTone} />
        </View>
      </View>

      <View style={localStyles.heroPills}>
        {activeShift ? <Pill label={`Başlangıç: ${fmt(activeShift.startAt)}`} tone="info" /> : null}
        {activeShift ? <Pill label={`Bitiş: ${fmt(activeShift.endAt)}`} tone="passive" /> : null}
        {nextStop ? <Pill label={`Sıradaki: ${nextStop.name || '-'}`} tone="success" /> : null}
      </View>

      <View style={localStyles.statsGrid}>
        {derivedStats.slice(0, 4).map((item, index) => (
          <StatTile
            key={`${item.label || 'stat'}-${index}`}
            label={item.label}
            value={item.value}
            note={item.note}
            tone={item.tone || 'info'}
          />
        ))}
      </View>

      {footer ? <Text style={localStyles.heroFooter}>{footer}</Text> : null}
    </Card>
  );
}

export function RouteMiniMapCard({
  title = 'Mini rota önizlemesi',
  subtitle = 'Temsilî rota önizlemesi. Gerçek yol ve trafik için navigasyonu açın.',
  stops = [],
  nextStopId = null,
  routeSummary = {},
}) {
  const previewStops = Array.isArray(stops) ? stops.slice(0, 5) : [];
  const remainingStops = routeSummary.remainingStops != null ? routeSummary.remainingStops : previewStops.length;
  const activeIndex = previewStops.findIndex((stop) => Number(stop?.id || 0) === Number(nextStopId || 0));

  return (
    <Card style={localStyles.mapCard}>
      <SectionTitle title={title} subtitle={subtitle} />
      {previewStops.length ? (
        <View style={localStyles.routeStrip}>
          {previewStops.map((stop, index) => {
            const active = Number(stop?.id || 0) === Number(nextStopId || 0) || index === activeIndex;
            const last = index === previewStops.length - 1;
            return (
              <View key={`${stop.id}-${index}`} style={localStyles.routeNodeWrap}>
                <View style={[localStyles.routeNode, active ? localStyles.routeNodeActive : null]}>
                  <Text style={[localStyles.routeNodeText, active ? localStyles.routeNodeTextActive : null]}>
                    {stop.order != null ? stop.order : index + 1}
                  </Text>
                </View>
                {!last ? <View style={[localStyles.routeLine, active ? localStyles.routeLineActive : null]} /> : null}
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState title="Mini rota yok" text="Temsilî rota önizlemesi hazırlanıyor." />
      )}

      <View style={localStyles.mapMetaRow}>
        <StatTile label="Kalan durak" value={remainingStops != null ? String(remainingStops) : '-'} tone="info" />
        <StatTile label="Tahmini varış" value={routeSummary.remainingRouteEtaMin != null ? `${routeSummary.remainingRouteEtaMin} dk` : '-'} tone="success" />
        <StatTile label="Toplam km" value={routeSummary.remainingKm != null ? `${routeSummary.remainingKm} km` : '-'} tone="warning" />
      </View>
    </Card>
  );
}

export function RouteNavigationCard({
  title = 'Navigasyon',
  subtitle = 'Temsilî rota önizlemesi var. Gerçek yol ve trafik için navigasyonu açın.',
  nextStop = null,
  routeSummary = {},
  onOpenRoute,
  onOpenNextStopNavigation,
  onOpenFullRoute,
  primaryActionLabel = 'Navigasyonu aç',
  nextStopActionLabel = 'Sıradaki durağa git',
  fullRouteActionLabel = 'Tüm rotayı aç',
}) {
  const hasNextStopCoords = nextStop?.lat != null && nextStop?.lng != null;
  const actionDisabled = !onOpenRoute && !onOpenNextStopNavigation && !onOpenFullRoute;
  const actions = [
    onOpenRoute ? { title: primaryActionLabel, onPress: onOpenRoute, tone: 'dark', disabled: !hasNextStopCoords } : null,
    onOpenNextStopNavigation ? { title: nextStopActionLabel, onPress: onOpenNextStopNavigation, disabled: !hasNextStopCoords } : null,
    onOpenFullRoute ? { title: fullRouteActionLabel, onPress: onOpenFullRoute } : null,
  ].filter(Boolean);

  return (
    <Card style={localStyles.routeNavCard}>
      <SectionTitle title={title} subtitle={subtitle} />
      <View style={localStyles.routeNavStats}>
        <StatTile
          label="Sıradaki durak"
          value={nextStop?.name || '-'}
          note={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : 'Hazır'}
          tone="dark"
        />
        <StatTile
          label="Tahmini varış"
          value={routeSummary.remainingRouteEtaMin != null ? `${routeSummary.remainingRouteEtaMin} dk` : '-'}
          note="Gerçek yol için navigasyon"
          tone="info"
        />
        <StatTile
          label="Kalan mesafe"
          value={routeSummary.remainingKm != null ? `${routeSummary.remainingKm} km` : '-'}
          note="Kuş uçuşu önizleme değil"
          tone="success"
        />
      </View>
      <View style={localStyles.routeNavBanner}>
        <Text style={localStyles.routeNavBannerText}>
          Bu kart durak sırasını özetler. Gerçek yol ve trafik bilgisi navigasyonda açılır.
        </Text>
      </View>
      <View style={localStyles.routeNavPrimary}>
        <PrimaryButton title={primaryActionLabel} onPress={onOpenRoute} disabled={!onOpenRoute || !hasNextStopCoords} />
      </View>
      {actions.length ? (
        <View style={localStyles.routeNavActions}>
          {actions
            .filter((action) => action.title !== 'Navigasyonu aç')
            .map((action) => (
              <SecondaryButton
                key={action.title}
                title={action.title}
                onPress={action.onPress}
                disabled={Boolean(action.disabled) || actionDisabled}
              />
            ))}
        </View>
      ) : null}
    </Card>
  );
}

export function RouteVoiceSupportCard({
  voiceEnabled = false,
  nextStop = null,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
}) {
  return (
    <Card style={localStyles.routeVoiceCard}>
      <SectionTitle
        title="Sesli destek"
        subtitle="Navigasyon açıkken uygulama servis operasyon uyarılarını sesli hatırlatır."
      />
      <View style={localStyles.routeVoiceMeta}>
        <Pill label={voiceEnabled ? 'Sesli destek açık' : 'Sesli destek kapalı'} tone={voiceEnabled ? 'success' : 'passive'} />
      </View>
      <View style={localStyles.routeVoiceStats}>
        <Info label="Sıradaki durak" value={nextStop?.name || '-'} />
        <Info label="Tahmini varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
      </View>
      <View style={localStyles.routeVoiceActions}>
        <PrimaryButton title={voiceEnabled ? 'Sesli desteği kapat' : 'Sesli desteği aç'} onPress={onToggleVoiceGuidance} />
        <SecondaryButton title="Sıradaki durağı oku" onPress={onSpeakNextStop} disabled={!nextStop || !onSpeakNextStop} />
        <SecondaryButton title="Tahmini varışı oku" onPress={onSpeakEta} disabled={!nextStop || !onSpeakEta} />
      </View>
    </Card>
  );
}

export function StopListCard({
  title = 'Durak listesi',
  subtitle = 'İlk duraklar burada görünür.',
  stops = [],
  nextStopId = null,
  onOpenFullRoute,
}) {
  const items = Array.isArray(stops) ? stops.slice(0, 5) : [];
  const visibleCount = items.length;
  return (
    <Card style={localStyles.stopListCard}>
      <SectionTitle title={title} subtitle={subtitle} />
      {items.length ? (
        <View style={localStyles.stopList}>
          {items.map((stop, index) => {
            const active = Number(stop?.id || 0) === Number(nextStopId || 0);
            return (
              <View key={`${stop.id}-${index}`} style={localStyles.stopItem}>
                <View style={localStyles.stopIndexWrap}>
                  <Text style={localStyles.stopIndex}>{stop.order != null ? stop.order : index + 1}</Text>
                </View>
                <View style={localStyles.stopBody}>
                  <View style={localStyles.stopHeaderRow}>
                    <Text style={localStyles.stopTitle} numberOfLines={1}>{stop.name || `Durak ${index + 1}`}</Text>
                    <Pill label={active ? 'Sıradaki' : (stop.state || 'Bekliyor')} tone={active ? 'success' : 'info'} />
                  </View>
                  <Text style={localStyles.stopMeta} numberOfLines={2}>
                    {stop.passengerCount != null ? `${stop.passengerCount} kişi` : 'Yolcu bilgisi yok'}
                    {stop.etaMin != null ? ` • ${stop.etaMin} dk` : ''}
                    {stop.remainingKm != null ? ` • ${stop.remainingKm} km` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState title="Durak listesi boş" text="Bu vardiya için durak oluşturulmamış." />
      )}

      {visibleCount > 0 && onOpenFullRoute ? (
        <View style={localStyles.stopFooter}>
          <SecondaryButton title="Tümünü gör" onPress={onOpenFullRoute} />
        </View>
      ) : null}
    </Card>
  );
}

export function GpsSourceStatusCard({
  title = "Konum ve GPS durumu",
  subtitle = "Araç GPS'i, sürücünün telefon GPS'i ve bekleyen durumlar.",
  sourceCards = [],
  primaryActionLabel = "Sürücünün telefon GPS'ini başlat",
  primaryAction,
  secondaryActionLabel = 'Durumu tazele',
  secondaryAction,
  openSettingsLabel = 'Ayarlara git',
  onOpenSettings,
  warningText = '',
  summaryItems = [],
  footer = '',
}) {
  const cards = Array.isArray(sourceCards) ? sourceCards.filter(Boolean).slice(0, 3) : [];
  return (
    <Card style={localStyles.gpsCard}>
      <SectionTitle title={title} subtitle={subtitle} />
      {cards.length ? (
        <View style={localStyles.sourceGrid}>
          {cards.map((item, index) => {
            const active = Boolean(item?.active);
            const tone = String(item?.tone || '').trim().toLowerCase();
            return (
              <View
                key={`${item?.key || 'source'}-${index}`}
                style={[
                  localStyles.sourceCard,
                  active ? localStyles.sourceCardActive : null,
                  tone === 'warning' ? localStyles.sourceCardWarn : null,
                  tone === 'success' ? localStyles.sourceCardSuccess : null,
                ]}
              >
                <Text style={localStyles.sourceTitle} numberOfLines={1}>{item?.title || 'Kaynak'}</Text>
                <Text style={localStyles.sourceSubtitle} numberOfLines={2}>{item?.subtitle || 'Ayrıntı yok'}</Text>
                <Pill label={item?.badge || (active ? 'Aktif' : 'Bekliyor')} tone={active ? 'ok' : tone === 'warning' ? 'warn' : 'info'} />
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={localStyles.gpsSummaryRow}>
        {Array.isArray(summaryItems) ? summaryItems.slice(0, 4).map((item, index) => (
          <StatTile
            key={`${item.label || 'gps'}-${index}`}
            label={item.label}
            value={item.value}
            note={item.note}
            tone={item.tone || 'info'}
          />
        )) : null}
      </View>

      {warningText ? <View style={localStyles.bannerWarn}><Text style={localStyles.bannerWarnText}>{warningText}</Text></View> : null}
      {footer ? <Text style={localStyles.heroFooter}>{footer}</Text> : null}

      <View style={localStyles.actionsStack}>
        {primaryActionLabel ? <PrimaryButton title={primaryActionLabel} onPress={primaryAction} disabled={!primaryAction} /> : null}
        <View style={localStyles.actionsRow}>
          {secondaryActionLabel ? <SecondaryButton title={secondaryActionLabel} onPress={secondaryAction} disabled={!secondaryAction} /> : null}
          {onOpenSettings ? <SecondaryButton title={openSettingsLabel} onPress={onOpenSettings} disabled={!onOpenSettings} /> : null}
        </View>
      </View>
    </Card>
  );
}

export function DriverDiagnosticsCard({
  title = 'Gelişmiş durum',
  subtitle = 'Teknik ayrıntılar burada gizli tutulur.',
  summary = '',
  items = [],
  footer = '',
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <Card style={localStyles.diagnosticsCard}>
      <Pressable onPress={() => setOpen((prev) => !prev)} style={localStyles.diagnosticsHeader}>
        <View style={localStyles.diagnosticsHeaderCopy}>
          <Text style={localStyles.diagnosticsTitle}>{title}</Text>
          <Text style={localStyles.diagnosticsSubtitle}>{subtitle}</Text>
        </View>
        <Pill label={open ? 'Gizle' : 'Aç'} tone="passive" />
      </Pressable>

      {summary ? <View style={localStyles.bannerInfo}><Text style={localStyles.bannerInfoText}>{summary}</Text></View> : null}

      {open && safeItems.length ? (
        <View style={localStyles.diagnosticsList}>
          {safeItems.map((item, index) => (
            <Info
              key={`${item.label || 'diag'}-${index}`}
              label={item.label}
              value={item.value}
            />
          ))}
        </View>
      ) : null}

      {open && footer ? <Text style={localStyles.heroFooter}>{footer}</Text> : null}
    </Card>
  );
}

export function DriverAppHeader({
  me = null,
  screen = 'today',
  onOpenToday,
  onOpenRoute,
  onOpenLive,
  onOpenMenu = null,
  onOpenNotifications = null,
}) {
  const meta = screenMeta(screen);
  const fullName = String(me?.fullName || me?.name || me?.displayName || 'Sürücü').trim() || 'Sürücü';
  const greeting = meta.title === 'Bugün'
    ? `Günaydın, ${fullName}`
    : meta.title === 'Rota'
      ? `Rota hazır, ${fullName}`
      : `Konum takibi hazır, ${fullName}`;

  return (
    <View style={localStyles.headerWrap}>
      <Card style={localStyles.headerCard}>
        <View style={localStyles.headerTopBar}>
          <ShellIcon symbol="☰" onPress={onOpenMenu} passive={!onOpenMenu} />
          <View style={localStyles.headerTabsWrap}>
            <TopTabs current={String(screen || 'today').toLowerCase()} onToday={onOpenToday} onRoute={onOpenRoute} onLive={onOpenLive} variant="dark" />
          </View>
          <ShellIcon symbol="◌" onPress={onOpenNotifications} passive={!onOpenNotifications} />
        </View>

        <Text style={localStyles.headerGreeting} numberOfLines={1}>
          {greeting}
        </Text>
        <Text style={localStyles.headerSubtitle} numberOfLines={2}>
          {meta.subtitle}
        </Text>
      </Card>
    </View>
  );
}

export function DriverBottomTabBar({
  current = 'today',
  onToday,
  onRoute,
  onLive,
  onNotifications,
  onProfile,
}) {
  const items = [
    { key: 'today', label: 'Bugün', symbol: '◧', onPress: onToday, passive: false },
    { key: 'route', label: 'Rota', symbol: '▭', onPress: onRoute, passive: false },
    { key: 'live', label: 'Canlı', symbol: '◉', onPress: onLive, passive: false },
    { key: 'notifications', label: 'Bildirimler', symbol: '✉', onPress: onNotifications, passive: true },
    { key: 'profile', label: 'Profil', symbol: '◔', onPress: onProfile, passive: true },
  ];

  return (
    <View style={localStyles.bottomWrap}>
      {items.map((item) => {
        const active = current === item.key;
        const disabled = item.passive || !item.onPress;
        return (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            disabled={disabled}
            style={[
              localStyles.bottomItem,
              active ? localStyles.bottomItemActive : null,
              disabled ? localStyles.bottomItemPassive : null,
            ]}
          >
            <Text style={[localStyles.bottomIcon, active ? localStyles.bottomIconActive : null]}>
              {item.symbol}
            </Text>
            <Text style={[localStyles.bottomLabel, active ? localStyles.bottomLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PremiumDivider() {
  return <View style={localStyles.divider} />;
}

const localStyles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navySoft,
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
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroFooter: {
    color: '#bfdbfe',
    lineHeight: 19,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statTile: {
    flexBasis: '48%',
    minHeight: 86,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
  },
  statTileInfo: {
    backgroundColor: COLORS.skySoft,
    borderColor: COLORS.border,
  },
  statTileSuccess: {
    backgroundColor: COLORS.greenSoft,
    borderColor: '#bbf7d0',
  },
  statTileWarn: {
    backgroundColor: COLORS.amberSoft,
    borderColor: '#fed7aa',
  },
  statTileDanger: {
    backgroundColor: COLORS.redSoft,
    borderColor: '#fecaca',
  },
  statTileDark: {
    backgroundColor: COLORS.navySoft,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statLabelDark: {
    color: '#cbd5e1',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  statValueInfo: {
    color: COLORS.blue,
  },
  statValueSuccess: {
    color: COLORS.green,
  },
  statValueWarn: {
    color: COLORS.amber,
  },
  statValueDanger: {
    color: COLORS.red,
  },
  statValueDark: {
    color: '#fff',
  },
  statNote: {
    color: COLORS.muted,
    fontSize: 11,
  },
  statNoteDark: {
    color: '#cbd5e1',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTile: {
    flexBasis: '48%',
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
    gap: 6,
  },
  quickTileSuccess: {
    backgroundColor: COLORS.greenSoft,
    borderColor: '#bbf7d0',
  },
  quickTileWarning: {
    backgroundColor: COLORS.amberSoft,
    borderColor: '#fed7aa',
  },
  quickTileDanger: {
    backgroundColor: COLORS.redSoft,
    borderColor: '#fecaca',
  },
  quickTileDark: {
    backgroundColor: COLORS.navySoft,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickTileDisabled: {
    opacity: 0.55,
  },
  quickTileActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#f8fbff',
  },
  quickTitle: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  quickTitleActive: {
    color: COLORS.blue,
  },
  quickTitleDark: {
    color: '#fff',
  },
  quickSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  quickSubtitleActive: {
    color: COLORS.blue,
  },
  quickSubtitleDark: {
    color: '#cbd5e1',
  },
  mapCard: {
    gap: 12,
  },
  routeStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
    paddingVertical: 4,
  },
  routeNodeWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minWidth: 52,
  },
  routeNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.skySoft,
    borderWidth: 2,
    borderColor: COLORS.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNodeActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  routeNodeText: {
    color: COLORS.blue,
    fontWeight: '800',
  },
  routeNodeTextActive: {
    color: '#fff',
  },
  routeLine: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.border,
    marginTop: 16,
  },
  routeLineActive: {
    backgroundColor: COLORS.blue,
  },
  mapMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopListCard: {
    gap: 12,
  },
  stopList: {
    gap: 10,
  },
  stopItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.skySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopIndexWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stopIndex: {
    color: COLORS.blue,
    fontWeight: '800',
  },
  stopBody: {
    flex: 1,
    gap: 4,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  stopTitle: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '800',
  },
  stopMeta: {
    color: COLORS.muted,
    lineHeight: 18,
    fontSize: 12,
  },
  stopFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  gpsCard: {
    gap: 12,
  },
  sourceGrid: {
    gap: 8,
  },
  sourceCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    backgroundColor: COLORS.skySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourceCardActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  sourceCardWarn: {
    backgroundColor: COLORS.amberSoft,
    borderColor: '#fed7aa',
  },
  sourceCardSuccess: {
    backgroundColor: COLORS.greenSoft,
    borderColor: '#bbf7d0',
  },
  sourceTitle: {
    color: COLORS.text,
    fontWeight: '800',
  },
  sourceSubtitle: {
    color: COLORS.muted,
    lineHeight: 18,
    fontSize: 12,
  },
  gpsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bannerWarn: {
    borderRadius: 14,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
  },
  bannerWarnText: {
    color: COLORS.amber,
    lineHeight: 19,
  },
  bannerInfo: {
    borderRadius: 14,
    backgroundColor: COLORS.skySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  bannerInfoText: {
    color: COLORS.blue,
    lineHeight: 19,
  },
  actionsStack: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diagnosticsCard: {
    gap: 12,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  diagnosticsHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  diagnosticsTitle: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 17,
  },
  diagnosticsSubtitle: {
    color: COLORS.muted,
    lineHeight: 18,
    fontSize: 12,
  },
  diagnosticsList: {
    gap: 8,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  headerCard: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navySoft,
    gap: 12,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  headerTabsWrap: {
    flex: 1,
  },
  shellIconPressable: {
    borderRadius: 16,
  },
  shellIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  shellIconPassive: {
    opacity: 0.72,
  },
  shellIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 20,
  },
  shellIconTextPassive: {
    color: '#dbeafe',
  },
  headerSubtitle: {
    color: '#dbeafe',
    lineHeight: 19,
    fontSize: 13,
  },
  headerGreeting: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  bottomWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  bottomItem: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 1,
  },
  bottomItemActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  bottomItemPassive: {
    opacity: 0.58,
  },
  bottomIcon: {
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 16,
  },
  bottomIconActive: {
    color: '#fff',
  },
  bottomLabel: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  bottomLabelActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  routeNavCard: {
    gap: 12,
  },
  routeNavStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeNavBanner: {
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
  },
  routeNavBannerText: {
    color: COLORS.muted,
    lineHeight: 18,
  },
  routeNavPrimary: {
    marginTop: 2,
  },
  routeNavActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeVoiceCard: {
    gap: 12,
  },
  routeVoiceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeVoiceStats: {
    gap: 8,
  },
  routeVoiceActions: {
    gap: 8,
  },
});
