import { Text, View } from 'react-native';
import { listBoardingChangeOptions } from '../app/boardingChangeState';
import { Card, EmptyState, Info, Pill, PrimaryButton, SectionTitle, fmt, styles } from './mobileUi';

function optionTone(option) {
  if (option?.tone === 'danger') return 'danger';
  if (option?.tone === 'warn') return 'warn';
  return 'info';
}

function recentTone(item) {
  if (item?.kind === 'OPERATION_NOTE') return 'info';
  if (item?.kind === 'PICKUP_FROM_LOCATION') return 'danger';
  if (item?.kind === 'NO_SHOW') return 'ok';
  return 'warn';
}

export default function BoardingChangeCard({
  role = 'PERSONEL',
  current = null,
  boardingChange = null,
  routeOpsBusy = false,
  onRequestBoardingChange,
}) {
  const key = String(role || '').trim().toUpperCase() === 'PARENT' ? 'PARENT' : 'PERSONEL';
  const options = listBoardingChangeOptions(key);
  const items = Array.isArray(boardingChange?.items) ? boardingChange.items : [];
  const recent = items.slice(0, 3);
  const nextStopName = current?.nextStop?.name || '-';
  const etaText = current?.etaMin != null ? `${current.etaMin} dk` : '-';
  const distanceText = current?.etaKm != null ? `${current.etaKm} km` : '-';

  return (
    <Card>
      <SectionTitle
        title="Biniş değişikliği"
        subtitle={key === 'PARENT'
          ? 'Bugün öğrencim servise binmeyecek hızlı kayıt üst kartta durur; bu kart farklı durak, gecikme ve rota dışı talepleri toplar.'
          : 'Bugün servisi kullanmayacağım hızlı kayıt üst kartta durur; bu kart farklı durak, gecikme ve rota dışı talepleri toplar.'}
      />
      <View style={styles.rowGap}>
        <Pill label={key === 'PARENT' ? 'Veli akışı' : 'Personel akışı'} tone="ok" />
        <Pill label={boardingChange?.lastSubmittedAt ? 'Son istek kayıtlı' : 'Kayıt bekliyor'} tone={boardingChange?.lastSubmittedAt ? 'info' : 'warn'} />
        <Pill label={current ? `Sıradaki durak: ${nextStopName}` : 'Canlı servis bekleniyor'} tone={current ? 'info' : 'warn'} />
      </View>
      <Info label="Sıradaki durak" value={nextStopName} />
      <Info label="Durağa ETA" value={etaText} />
      <Info label="Durağa mesafe" value={distanceText} />
      <Text style={styles.muted}>Bu aşama mobil yerel istek modelidir; kesinleşen kararlar sonraki halkada backend ve panellere bağlanır.</Text>

      <View style={styles.actionsRow}>
        {options.map((option) => (
          <PrimaryButton
            key={option.kind}
            title={option.label}
            onPress={() => onRequestBoardingChange?.({
              kind: option.kind,
              reason: option.description,
            })}
            disabled={routeOpsBusy}
          />
        ))}
      </View>
      <Text style={styles.helper}>Rota dışı konum isteği manuel inceleme gerektirir; kayıtlı durak akışları daha hafiftir.</Text>

      {recent.length ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <SectionTitle title="Son istekler" subtitle="Yerel kayıtlar son birkaç başlığı gösterir." />
          {recent.map((item) => (
            <View key={item.id} style={localStyles.requestItem}>
              <View style={localStyles.requestBody}>
                <Text style={localStyles.requestTitle} numberOfLines={1}>{item.label || 'Biniş değişikliği'}</Text>
                <Text style={localStyles.requestMeta} numberOfLines={2}>{item.reason || '-'}</Text>
                <Text style={localStyles.requestMeta}>
                  {item.scopeText || 'Kayıt'} • {fmt(item.createdAt)}
                </Text>
              </View>
              <View style={localStyles.requestBadgeWrap}>
                <Pill label={item.statusText || 'Kayıtlı'} tone={recentTone(item)} />
                {item.childId ? <Pill label={`Çocuk: #${item.childId}`} tone="info" /> : null}
                {item.shiftId ? <Pill label={`Vardiya: #${item.shiftId}`} tone="info" /> : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="Henüz biniş değişikliği yok" text="İlk istek gönderildiğinde burada kayıt listesi görünür." />
      )}

      <Text style={styles.muted}>Operasyon notu göndermek için kullanıcıya sade Türkçe ifadeler gösterilir; karmaşık kararlar merkeze bırakılır.</Text>
    </Card>
  );
}

const localStyles = {
  requestItem: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  requestBody: {
    gap: 4,
  },
  requestTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  requestMeta: {
    color: '#475569',
    lineHeight: 18,
    fontSize: 12,
  },
  requestBadgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
};
