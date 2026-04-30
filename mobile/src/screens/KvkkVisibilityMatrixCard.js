import { Text, View } from 'react-native';
import { buildKvkkVisibilityMatrixState } from '../app/kvkkVisibilityMatrixState';
import { Card, Pill, SectionTitle, styles } from './mobileUi';

export default function KvkkVisibilityMatrixCard({ role = 'PERSONEL', roleLive = null }) {
  const matrix = buildKvkkVisibilityMatrixState({ role, roleLive });

  return (
    <Card>
      <SectionTitle title={matrix.title} subtitle={matrix.subtitle} />
      <View style={styles.rowGap}>
        <Pill label={matrix.blockedLabel} tone={matrix.blocked ? 'warn' : 'ok'} />
        <Pill label={`Şu an: ${matrix.currentRole}`} tone="info" />
      </View>
      <Text style={styles.muted}>{matrix.summary}</Text>
      <View style={localStyles.matrixWrap}>
        {matrix.rows.map((row) => (
          <View key={row.role} style={[localStyles.matrixRow, row.current ? localStyles.matrixRowActive : null]}>
            <View style={localStyles.matrixHeader}>
              <Pill label={row.roleLabel} tone={row.current ? 'ok' : 'info'} />
              {row.current ? <Pill label="Şu an bu rol" tone="ok" /> : null}
            </View>
            <Text style={localStyles.matrixVisibility}>{row.visibility}</Text>
            <Text style={localStyles.matrixGate}>{row.gate}</Text>
            <Text style={localStyles.matrixNote}>{row.note}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>Atama yoksa takip yok. Aktif servis yoksa takip yok. KVKK kapalıysa GPS yok.</Text>
    </Card>
  );
}

const localStyles = {
  matrixWrap: {
    gap: 8,
  },
  matrixRow: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 6,
  },
  matrixRowActive: {
    backgroundColor: '#eff6ff',
  },
  matrixHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  matrixVisibility: {
    color: '#0f172a',
    fontWeight: '700',
  },
  matrixGate: {
    color: '#475569',
    lineHeight: 18,
  },
  matrixNote: {
    color: '#64748b',
    lineHeight: 18,
    fontSize: 12,
  },
};
