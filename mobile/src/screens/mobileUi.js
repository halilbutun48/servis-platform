import { Pressable, StyleSheet, Text, View } from 'react-native';

export function isStale(value) {
  if (!value) return false;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms > 90000;
}

export function fmt(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  } catch {
    return String(value);
  }
}

export function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, subtitle }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'info' }) {
  const resolvedTone = resolveTone(tone);
  return (
    <View style={[styles.pill, resolvedTone === 'info' ? styles.pillInfo : resolvedTone === 'warning' ? styles.pillWarn : resolvedTone === 'success' ? styles.pillOk : resolvedTone === 'critical' ? styles.pillDanger : resolvedTone === 'passive' ? styles.pillPassive : null]}>
      <Text style={[styles.pillText, resolvedTone === 'info' ? styles.pillInfoText : resolvedTone === 'warning' ? styles.pillWarnText : resolvedTone === 'success' ? styles.pillOkText : resolvedTone === 'critical' ? styles.pillDangerText : resolvedTone === 'passive' ? styles.pillPassiveText : null]}>{label}</Text>
    </View>
  );
}

function resolveTone(tone) {
  const t = String(tone || 'info').trim().toLowerCase();
  if (t === 'ok' || t === 'success' || t === 'tamam' || t === 'normal') return 'success';
  if (t === 'warn' || t === 'warning' || t === 'dikkat') return 'warning';
  if (t === 'danger' || t === 'critical' || t === 'kritik') return 'critical';
  if (t === 'passive' || t === 'muted' || t === 'waiting' || t === 'pending') return 'passive';
  return 'info';
}

export function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, disabled = false, tone = 'default' }) {
  return (
    <Pressable style={[styles.secondaryButton, tone === 'danger' ? styles.secondaryButtonDanger : null, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.secondaryButtonText, tone === 'danger' ? styles.secondaryButtonDangerText : null]}>{title}</Text>
    </Pressable>
  );
}

export function TopTabs({ current = 'today', onToday, onRoute, onLive }) {
  const items = [
    { key: 'today', label: 'Bugün', onPress: onToday },
    { key: 'route', label: 'Rota', onPress: onRoute },
    { key: 'live', label: 'Canlı', onPress: onLive },
  ];
  return (
    <View style={styles.tabWrap}>
      {items.map((item) => {
        const active = current === item.key;
        return (
          <Pressable key={item.key} style={[styles.tabItem, active ? styles.tabItemActive : null]} onPress={item.onPress}>
            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ShiftChooser({ shifts = [], selectedShiftId, onSelectShift }) {
  if (!Array.isArray(shifts) || !shifts.length) return null;
  return (
    <View style={styles.shiftChooserWrap}>
      {shifts.map((shift) => {
        const shiftId = Number(shift?.id || 0) || null;
        if (!shiftId) return null;
        const active = shiftId === Number(selectedShiftId || 0);
        const status = String(shift?.status || '-').toUpperCase();
        return (
          <Pressable key={shiftId} style={[styles.shiftChip, active ? styles.shiftChipActive : null]} onPress={() => onSelectShift?.(shiftId)}>
            <Text style={[styles.shiftChipTitle, active ? styles.shiftChipTitleActive : null]}>#{shiftId}</Text>
            <Text style={[styles.shiftChipMeta, active ? styles.shiftChipMetaActive : null]}>{status}</Text>
            <Text style={[styles.shiftChipMeta, active ? styles.shiftChipMetaActive : null]} numberOfLines={1}>{fmt(shift?.startAt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RoutePreviewList({ stops = [] }) {
  return (
    <View style={styles.routePreviewWrap}>
      {stops.map((stop, index) => (
        <View key={`${stop.id}-${index}`} style={styles.routePreviewItem}>
          <View style={styles.routePreviewBadge}><Text style={styles.routePreviewBadgeText}>{stop.order ?? index + 1}</Text></View>
          <View style={styles.routePreviewBody}>
            <Text style={styles.routePreviewTitle}>{stop.name || `Durak ${index + 1}`}</Text>
            <Text style={styles.routePreviewMeta}>
              {stop.passengerCount != null ? `${stop.passengerCount} kişi` : 'Yolcu bilgisi yok'}
              {stop.remainingKm != null ? ` • ${stop.remainingKm} km` : ''}
              {stop.etaMin != null ? ` • ${stop.etaMin} dk` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ title, text }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 21,
  },
  sectionTitleWrap: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    color: '#64748b',
    lineHeight: 18,
    fontSize: 12,
  },
  error: {
    color: '#b91c1c',
    lineHeight: 20,
  },
  muted: {
    color: '#475569',
    lineHeight: 21,
  },
  helper: {
    color: '#64748b',
    lineHeight: 20,
    fontSize: 13,
  },
  rowGap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOk: {
    backgroundColor: '#ecfdf5',
  },
  pillInfo: {
    backgroundColor: '#eff6ff',
  },
  pillWarn: {
    backgroundColor: '#fff7ed',
  },
  pillDanger: {
    backgroundColor: '#fef2f2',
  },
  pillPassive: {
    backgroundColor: '#e2e8f0',
  },
  pillText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 12,
  },
  pillOkText: {
    color: '#047857',
  },
  pillInfoText: {
    color: '#1d4ed8',
  },
  pillWarnText: {
    color: '#c2410c',
  },
  pillDangerText: {
    color: '#b91c1c',
  },
  pillPassiveText: {
    color: '#475569',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: '#64748b',
    flex: 1,
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonDanger: {
    backgroundColor: '#fee2e2',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  secondaryButtonDangerText: {
    color: '#b91c1c',
  },
  routePreviewWrap: {
    gap: 10,
  },
  routePreviewItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  routePreviewBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  routePreviewBadgeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  routePreviewBody: {
    flex: 1,
    gap: 3,
  },
  routePreviewTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  routePreviewMeta: {
    color: '#475569',
    lineHeight: 19,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  docList: {
    gap: 8,
  },
  docItem: {
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  docTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  docSummary: {
    color: '#475569',
    lineHeight: 19,
  },
  tabWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  tabItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: '#0f172a',
  },
  tabText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  shiftChooserWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shiftChip: {
    minWidth: 120,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    gap: 2,
  },
  shiftChipActive: {
    backgroundColor: '#1d4ed8',
  },
  shiftChipTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  shiftChipTitleActive: {
    color: '#fff',
  },
  shiftChipMeta: {
    color: '#475569',
    fontSize: 12,
  },
  shiftChipMetaActive: {
    color: '#dbeafe',
  },
  emptyWrap: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  emptyText: {
    color: '#475569',
    lineHeight: 20,
  },
  stopCard: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  stopTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  stopTitle: {
    color: '#0f172a',
    fontWeight: '700',
    flex: 1,
  },
  stopMeta: {
    color: '#475569',
    lineHeight: 19,
    fontSize: 13,
  },
});
